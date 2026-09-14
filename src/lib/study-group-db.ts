// Study groups — storage and this week's board (14 Sep 2026). SERVER ONLY.
// Rules and labels: src/lib/study-group.ts; tables:
// scripts/create-study-group-tables.ts (raw SQL).

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { istDay, istDayStartUtc, loadStudyDays } from "@/lib/study-day";
import {
  GROUP_MAX_MEMBERS,
  GROUP_TOKEN_RE,
  USER_MAX_GROUPS,
  boardName,
  istWeekStart,
  newGroupToken,
  rankBoard,
  sanitizeGroupName,
  type BoardRow,
} from "@/lib/study-group";

export interface GroupSummary {
  id: string;
  token: string;
  name: string;
  members: number;
}

/** An open (not archived) group by its invite token, with its member count. */
export async function findGroup(token: string): Promise<GroupSummary | null> {
  if (!GROUP_TOKEN_RE.test(token)) return null;
  const rows = await prisma.$queryRaw<GroupSummary[]>`
    SELECT g.id, g.token, g.name,
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

/** Join, or rejoin after leaving. Already a member → ok, nothing changes. */
export async function joinGroup(userId: string, token: string): Promise<GroupResult> {
  const g = await findGroup(token);
  if (!g) return { ok: false, status: 404, error: "not-found" };
  if (await isMember(g.id, userId)) return { ok: true, token: g.token };
  if (g.members >= GROUP_MAX_MEMBERS) return { ok: false, status: 409, error: "full" };
  if ((await openGroupCount(userId)) >= USER_MAX_GROUPS) return { ok: false, status: 409, error: "limit" };
  await prisma.$executeRaw`
    INSERT INTO "StudyGroupMember" (id, "groupId", "userId", "joinedAt")
    VALUES (${randomUUID()}, ${g.id}, ${userId}, NOW())
    ON CONFLICT ("groupId", "userId") DO UPDATE SET "leftAt" = NULL, "joinedAt" = NOW()`;
  return { ok: true, token: g.token };
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
}

/** The viewer's open groups (most recently joined first) with this IST week's board. */
export async function loadStudyGroupBoards(userId: string, now: Date = new Date()): Promise<GroupBoard[]> {
  const groups = await prisma.$queryRaw<{ id: string; token: string; name: string }[]>`
    SELECT g.id, g.token, g.name
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
  const [days, answered] = await Promise.all([
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
  ]);
  const questions = new Map(answered.map((r) => [r.userId, Number(r.n)]));
  return groups.map((g) => ({
    token: g.token,
    name: g.name,
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
