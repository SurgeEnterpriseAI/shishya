// Study groups — storage and this week's board (14 Sep 2026). SERVER ONLY.
// Rules and labels: src/lib/study-group.ts; tables:
// scripts/create-study-group-tables.ts (raw SQL).
//
// 16 Sep 2026 — the maker hears when a friend joins (notifyGroupOwner, run
// after the join response): an in-app notification always, a phone
// notification at most once per 20 min per group to devices the maker turned
// on (addGroupWatch), an email at most once per 6 h per group. The caps are
// StudyGroup."lastPushAt" / "lastEmailAt", claimed atomically like
// src/lib/challenge-db.ts does; they, the StudyGroupWatch table and the
// STUDY_GROUP_JOINED enum value come from scripts/create-study-group-notify.ts.
// Until that script has run, push and email are skipped (never sent
// uncapped), the in-app row is stored as ADMIN_MESSAGE, and the maker's
// phone-notification button stays hidden (GroupBoard.watchReady) — it could
// only fail.

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createNotification } from "@/lib/db/notifications";
import { sendEmail } from "@/lib/email";
import { tk, type StringKey } from "@/lib/i18n";
import { isAllowedPushEndpoint } from "@/lib/push-alert-rules";
import { istDay, istDayStartUtc, loadStudyDays } from "@/lib/study-day";
import { pushConfigured, sendPush } from "@/lib/web-push";
import {
  GROUP_MAX_MEMBERS,
  GROUP_TOKEN_RE,
  STUDY_GROUP_EMAIL_GAP_MS,
  STUDY_GROUP_PUSH_GAP_MS,
  USER_MAX_GROUPS,
  boardName,
  groupJoinChannels,
  groupJoinEmail,
  groupJoinEmailSince,
  groupJoinNotice,
  groupJoinPush,
  groupWatchWelcomePush,
  istWeekStart,
  newGroupToken,
  ownerNoticeLocale,
  rankBoard,
  sanitizeGroupName,
  shouldTellOwner,
  type BoardRow,
} from "@/lib/study-group";

export interface GroupSummary {
  id: string;
  token: string;
  name: string;
  ownerUserId: string;
  members: number;
}

/** An open (not archived) group by its invite token, with its member count. */
export async function findGroup(token: string): Promise<GroupSummary | null> {
  if (!GROUP_TOKEN_RE.test(token)) return null;
  const rows = await prisma.$queryRaw<GroupSummary[]>`
    SELECT g.id, g.token, g.name, g."ownerUserId",
      (SELECT COUNT(*)::int FROM "StudyGroupMember" m WHERE m."groupId" = g.id AND m."leftAt" IS NULL) AS members
    FROM "StudyGroup" g
    WHERE g.token = ${token} AND g."archivedAt" IS NULL
    LIMIT 1`;
  return rows[0] ? { ...rows[0], members: Number(rows[0].members) } : null;
}

export async function isMember(groupId: string, userId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM "StudyGroupMember"
    WHERE "groupId" = ${groupId} AND "userId" = ${userId} AND "leftAt" IS NULL`;
  return Number(rows[0]?.n ?? 0) > 0;
}

async function openGroupCount(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM "StudyGroupMember" m JOIN "StudyGroup" g ON g.id = m."groupId"
    WHERE m."userId" = ${userId} AND m."leftAt" IS NULL AND g."archivedAt" IS NULL`;
  return Number(rows[0]?.n ?? 0);
}

export type GroupResult =
  | { ok: true; token: string }
  | { ok: false; status: number; error: "invalid-name" | "limit" | "not-found" | "full" };

/** Make a group with its maker as the first member. */
export async function createGroup(userId: string, rawName: unknown): Promise<GroupResult> {
  const name = sanitizeGroupName(rawName);
  if (!name) return { ok: false, status: 400, error: "invalid-name" };
  if ((await openGroupCount(userId)) >= USER_MAX_GROUPS) return { ok: false, status: 409, error: "limit" };
  const id = randomUUID();
  const token = newGroupToken();
  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO "StudyGroup" (id, token, name, "ownerUserId", "createdAt")
      VALUES (${id}, ${token}, ${name}, ${userId}, NOW())`,
    prisma.$executeRaw`
      INSERT INTO "StudyGroupMember" (id, "groupId", "userId", "joinedAt")
      VALUES (${randomUUID()}, ${id}, ${userId}, NOW())`,
  ]);
  return { ok: true, token };
}

export type JoinResult =
  | { ok: true; token: string; groupId: string; /** True only when this call added the member (a new join or a rejoin). */ joined: boolean }
  | { ok: false; status: number; error: "not-found" | "full" | "limit" };

/** Join, or rejoin after leaving. Already a member → ok, nothing changes (joined: false). */
export async function joinGroup(userId: string, token: string): Promise<JoinResult> {
  const g = await findGroup(token);
  if (!g) return { ok: false, status: 404, error: "not-found" };
  if (await isMember(g.id, userId)) return { ok: true, token: g.token, groupId: g.id, joined: false };
  if (g.members >= GROUP_MAX_MEMBERS) return { ok: false, status: 409, error: "full" };
  if ((await openGroupCount(userId)) >= USER_MAX_GROUPS) return { ok: false, status: 409, error: "limit" };
  // The WHERE makes a double tap race-free: only the call that actually
  // (re)adds the member counts as a join, so the maker is told once.
  const added = await prisma.$executeRaw`
    INSERT INTO "StudyGroupMember" (id, "groupId", "userId", "joinedAt")
    VALUES (${randomUUID()}, ${g.id}, ${userId}, NOW())
    ON CONFLICT ("groupId", "userId") DO UPDATE SET "leftAt" = NULL, "joinedAt" = NOW()
    WHERE "StudyGroupMember"."leftAt" IS NOT NULL`;
  return { ok: true, token: g.token, groupId: g.id, joined: added > 0 };
}

/** Leave: the member disappears from the board at once. */
export async function leaveGroup(userId: string, token: string): Promise<GroupResult> {
  const g = await findGroup(token);
  if (!g) return { ok: false, status: 404, error: "not-found" };
  await prisma.$executeRaw`
    UPDATE "StudyGroupMember" SET "leftAt" = NOW()
    WHERE "groupId" = ${g.id} AND "userId" = ${userId} AND "leftAt" IS NULL`;
  return { ok: true, token: g.token };
}

export interface GroupBoard {
  token: string;
  name: string;
  rows: BoardRow[];
  /** The viewer made this group (the phone-notification button is theirs). */
  isOwner: boolean;
  /** The maker can turn on phone notifications for this group right now:
   *  web push is configured and StudyGroupWatch exists. False for members. */
  watchReady: boolean;
}

let watchSchemaReady = false;
/** Web push is configured and scripts/create-study-group-notify.ts has run
 *  (StudyGroupWatch and the "lastPushAt" cap exist). Until then the maker's
 *  button is hidden: its sign-up could only answer 503 after the phone had
 *  already asked for notification permission (16 Sep 2026). Once true it
 *  stays true for the warm instance; while false it is re-checked per call. */
async function groupWatchReady(): Promise<boolean> {
  if (!pushConfigured()) return false;
  if (watchSchemaReady) return true;
  try {
    const rows = await prisma.$queryRaw<{ ready: boolean }[]>`
      SELECT (to_regclass('"StudyGroupWatch"') IS NOT NULL
        AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'StudyGroup' AND column_name = 'lastPushAt')) AS ready`;
    watchSchemaReady = rows[0]?.ready === true;
  } catch {
    watchSchemaReady = false;
  }
  return watchSchemaReady;
}

/** The viewer's open groups (most recently joined first) with this IST week's board. */
export async function loadStudyGroupBoards(userId: string, now: Date = new Date()): Promise<GroupBoard[]> {
  const groups = await prisma.$queryRaw<{ id: string; token: string; name: string; ownerUserId: string }[]>`
    SELECT g.id, g.token, g.name, g."ownerUserId"
    FROM "StudyGroupMember" m JOIN "StudyGroup" g ON g.id = m."groupId"
    WHERE m."userId" = ${userId} AND m."leftAt" IS NULL AND g."archivedAt" IS NULL
    ORDER BY m."joinedAt" DESC`;
  if (groups.length === 0) return [];
  const members = await prisma.$queryRaw<{ groupId: string; userId: string; name: string | null; joinedAt: Date }[]>`
    SELECT m."groupId", m."userId", u.name, m."joinedAt"
    FROM "StudyGroupMember" m JOIN "User" u ON u.id = m."userId"
    WHERE m."groupId" IN (${Prisma.join(groups.map((g) => g.id))}) AND m."leftAt" IS NULL`;
  const weekStart = istWeekStart(istDay(now));
  const since = istDayStartUtc(weekStart);
  const ids = [...new Set(members.map((m) => m.userId))];
  const [days, answered, watchReady] = await Promise.all([
    loadStudyDays(ids, since),
    ids.length === 0
      ? Promise.resolve([] as { userId: string; n: number }[])
      : prisma.$queryRaw<{ userId: string; n: number }[]>`
          SELECT a."userId", COUNT(*)::int AS n
          FROM "Attempt" a
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(a.answers::jsonb) = 'array' THEN a.answers::jsonb ELSE '[]'::jsonb END
          ) e
          WHERE a."userId" IN (${Prisma.join(ids)})
            AND a.status IN ('SUBMITTED', 'AUTO_SUBMITTED')
            AND a."finishedAt" >= ${since}
            AND e->>'chosen' IS NOT NULL
          GROUP BY a."userId"`,
    groups.some((g) => g.ownerUserId === userId) ? groupWatchReady() : Promise.resolve(false),
  ]);
  const questions = new Map(answered.map((r) => [r.userId, Number(r.n)]));
  return groups.map((g) => ({
    token: g.token,
    name: g.name,
    isOwner: g.ownerUserId === userId,
    watchReady: g.ownerUserId === userId && watchReady,
    rows: rankBoard(
      members
        .filter((m) => m.groupId === g.id)
        .map((m) => ({
          userId: m.userId,
          name: boardName(m.name),
          days: [...(days.get(m.userId) ?? [])].filter((d) => d >= weekStart).length,
          questions: questions.get(m.userId) ?? 0,
          joinedAt: new Date(m.joinedAt),
        })),
      userId,
      now,
    ),
  }));
}

// ── "A friend joined your group" (16 Sep 2026) ─────────────────────────────

type Fail = { ok: false; status: number; error: string };

let notifySchemaWarned = false;
/** One log per warm instance while scripts/create-study-group-notify.ts hasn't run. */
function warnNotifySchema(what: string, err: unknown): void {
  if (notifySchemaWarned) return;
  notifySchemaWarned = true;
  console.warn(`[study-groups] ${what} unavailable (run scripts/create-study-group-notify.ts?):`, (err as Error)?.message);
}

/** Take one notification slot atomically: true for exactly one caller per gap; false when the column is missing. */
async function claimGroupSlot(groupId: string, column: "lastPushAt" | "lastEmailAt", gapMs: number): Promise<boolean> {
  const minutes = Math.round(gapMs / 60_000);
  try {
    const rows =
      column === "lastPushAt"
        ? await prisma.$queryRaw<{ id: string }[]>`
            UPDATE "StudyGroup" SET "lastPushAt" = NOW()
            WHERE id = ${groupId} AND ("lastPushAt" IS NULL OR "lastPushAt" <= NOW() - (${minutes} * INTERVAL '1 minute'))
            RETURNING id`
        : await prisma.$queryRaw<{ id: string }[]>`
            UPDATE "StudyGroup" SET "lastEmailAt" = NOW()
            WHERE id = ${groupId} AND ("lastEmailAt" IS NULL OR "lastEmailAt" <= NOW() - (${minutes} * INTERVAL '1 minute'))
            RETURNING id`;
    return rows.length > 0;
  } catch (err) {
    warnNotifySchema(`StudyGroup."${column}"`, err);
    return false;
  }
}

function noticeT(preferredLang: string | null | undefined): (key: StringKey) => string {
  const loc = ownerNoticeLocale(preferredLang);
  return (key) => tk(key, loc);
}

/**
 * Tell a group's maker that a friend joined. Runs after the join response
 * (src/app/api/study-groups/[token]/join/route.ts, only when the call really
 * added the member); never throws.
 *   • In-app: always — one per joiner per group (dedupKey).
 *   • Phone: devices the maker turned on, at most once per 20 min per group.
 *   • Email: a maker with an email address, at most once per 6 h per group,
 *     listing the first names of everyone who joined since the previous one;
 *     sendEmail drops it for an opted-out maker and adds the unsubscribe
 *     footer. Its first send per warm instance also sends the founder a
 *     '[wave: study-group-join]' copy (src/lib/email.ts).
 * Copy is in the maker's account language (en / hi / te, else English).
 */
export async function notifyGroupOwner(groupId: string, joinerUserId: string): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<
      {
        token: string;
        name: string;
        ownerUserId: string;
        ownerEmail: string | null;
        ownerLang: string | null;
        joinerName: string | null;
        ownerIn: boolean;
        joinerIn: boolean;
      }[]
    >`
      SELECT g.token, g.name, g."ownerUserId", o.email AS "ownerEmail", o."preferredLang"::text AS "ownerLang",
        j.name AS "joinerName",
        EXISTS (SELECT 1 FROM "StudyGroupMember" m WHERE m."groupId" = g.id AND m."userId" = g."ownerUserId" AND m."leftAt" IS NULL) AS "ownerIn",
        EXISTS (SELECT 1 FROM "StudyGroupMember" m WHERE m."groupId" = g.id AND m."userId" = ${joinerUserId} AND m."leftAt" IS NULL) AS "joinerIn"
      FROM "StudyGroup" g
      JOIN "User" o ON o.id = g."ownerUserId"
      JOIN "User" j ON j.id = ${joinerUserId}
      WHERE g.id = ${groupId} AND g."archivedAt" IS NULL
      LIMIT 1`;
    const g = rows[0];
    if (
      !g ||
      !shouldTellOwner({ ownerUserId: g.ownerUserId, joinerUserId, ownerIsMember: g.ownerIn === true, joinerIsMember: g.joinerIn === true })
    ) {
      return;
    }
    const t = noticeT(g.ownerLang);
    const joinerName = boardName(g.joinerName);

    // In-app, always.
    const notice = groupJoinNotice(t, { joinerName, group: g.name });
    const row = { userId: g.ownerUserId, ...notice, dedupKey: `sg-join:${groupId}:${joinerUserId}` };
    if (!(await createNotification({ ...row, type: "STUDY_GROUP_JOINED" }))) {
      // The enum value isn't in the database yet — same row, labelled by its
      // dedupKey on /me/notifications.
      await createNotification({ ...row, type: "ADMIN_MESSAGE" });
    }

    // The caps. Without their columns nothing else is sent.
    let caps: { lastPushAt: Date | null; lastEmailAt: Date | null } | null = null;
    try {
      const c = await prisma.$queryRaw<{ lastPushAt: Date | null; lastEmailAt: Date | null }[]>`
        SELECT "lastPushAt", "lastEmailAt" FROM "StudyGroup" WHERE id = ${groupId} LIMIT 1`;
      caps = c[0] ?? null;
    } catch (err) {
      warnNotifySchema("StudyGroup caps", err);
    }
    const now = new Date();
    let watches: { id: string; endpoint: string; p256dh: string; auth: string }[] = [];
    if (caps && pushConfigured()) {
      try {
        watches = await prisma.$queryRaw<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`
          SELECT id, endpoint, p256dh, auth FROM "StudyGroupWatch"
          WHERE "groupId" = ${groupId} AND "unsubscribedAt" IS NULL`;
      } catch (err) {
        warnNotifySchema("StudyGroupWatch", err);
      }
    }
    const plan = groupJoinChannels({
      now,
      capsReady: caps !== null,
      lastPushAt: caps?.lastPushAt,
      lastEmailAt: caps?.lastEmailAt,
      hasWatches: watches.length > 0,
      ownerHasEmail: !!g.ownerEmail,
    });

    if (plan.push && (await claimGroupSlot(groupId, "lastPushAt", STUDY_GROUP_PUSH_GAP_MS))) {
      const payload = groupJoinPush(t, { token: g.token, joinerName, group: g.name });
      for (const w of watches) {
        const outcome = await sendPush(w, payload);
        if (outcome === "gone") {
          await prisma.$executeRaw`UPDATE "StudyGroupWatch" SET "unsubscribedAt" = NOW() WHERE id = ${w.id}`;
        } else if (outcome === "failed") {
          await prisma.$executeRaw`
            UPDATE "StudyGroupWatch"
            SET "failCount" = "failCount" + 1,
                "unsubscribedAt" = CASE WHEN "failCount" + 1 >= 5 THEN NOW() ELSE "unsubscribedAt" END
            WHERE id = ${w.id}`;
        }
      }
    }

    if (plan.email && g.ownerEmail) {
      // Read who is new BEFORE claiming the slot: the claim moves lastEmailAt.
      // No previous email → only the last 6 h (members from before are not "new").
      const since = groupJoinEmailSince(caps?.lastEmailAt, now);
      const joiners = await prisma.$queryRaw<{ name: string | null }[]>`
        SELECT u.name FROM "StudyGroupMember" m JOIN "User" u ON u.id = m."userId"
        WHERE m."groupId" = ${groupId} AND m."leftAt" IS NULL AND m."userId" <> ${g.ownerUserId} AND m."joinedAt" > ${since}
        ORDER BY m."joinedAt" DESC
        LIMIT 50`;
      if (joiners.length > 0 && (await claimGroupSlot(groupId, "lastEmailAt", STUDY_GROUP_EMAIL_GAP_MS))) {
        const mail = groupJoinEmail(t, { group: g.name, joiners: joiners.map((j) => boardName(j.name)) });
        await sendEmail({ to: g.ownerEmail, ...mail, tag: "study-group-join", unsubUserId: g.ownerUserId });
      }
    }
  } catch (err) {
    console.error("[study-groups] notify failed:", (err as Error)?.message);
  }
}

/** Turn on phone notifications for "a friend joined" on this device — the
 *  group's maker only (by session). The first sign-up from a device sends one
 *  confirmation, which also proves the subscription works. */
export async function addGroupWatch(
  userId: string,
  token: string,
  sub: { endpoint: string; p256dh: string; auth: string },
): Promise<{ ok: true; fresh: boolean } | Fail> {
  if (!pushConfigured()) return { ok: false, status: 503, error: "Phone notifications are not available right now." };
  const g = await findGroup(token);
  if (!g) return { ok: false, status: 404, error: "not-found" };
  if (g.ownerUserId !== userId) {
    return { ok: false, status: 403, error: "Only the person who made this group can turn on its notifications." };
  }
  if (!isAllowedPushEndpoint(sub.endpoint)) {
    return { ok: false, status: 400, error: "This browser's notifications are not supported yet." };
  }
  let rows: { fresh: boolean }[];
  try {
    rows = await prisma.$queryRaw<{ fresh: boolean }[]>`
      INSERT INTO "StudyGroupWatch" (id, "groupId", endpoint, p256dh, auth, "createdAt")
      VALUES (${randomUUID()}, ${g.id}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, NOW())
      ON CONFLICT ("groupId", endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        "unsubscribedAt" = NULL,
        "failCount" = 0
      RETURNING (xmax = 0) AS fresh`;
  } catch (err) {
    warnNotifySchema("StudyGroupWatch", err);
    return { ok: false, status: 503, error: "Phone notifications are not available right now." };
  }
  const fresh = rows[0]?.fresh === true;
  if (fresh) {
    const lang = await prisma.$queryRaw<{ l: string | null }[]>`
      SELECT "preferredLang"::text AS l FROM "User" WHERE id = ${userId} LIMIT 1`.catch(() => []);
    const outcome = await sendPush(sub, groupWatchWelcomePush(noticeT(lang[0]?.l), { token: g.token, group: g.name }));
    if (outcome !== "sent") {
      await prisma.$executeRaw`
        UPDATE "StudyGroupWatch" SET "unsubscribedAt" = NOW() WHERE "groupId" = ${g.id} AND endpoint = ${sub.endpoint}`.catch(() => {});
      return {
        ok: false,
        status: outcome === "gone" ? 410 : 502,
        error:
          outcome === "gone"
            ? "This browser turned the notification off. Please try again."
            : "Couldn't reach this browser's notification service. Please try again.",
      };
    }
  }
  return { ok: true, fresh };
}
