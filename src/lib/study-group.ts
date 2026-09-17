// Study groups (14 Sep 2026) — friends' weekly board. Pure rules and labels;
// storage and the board read are src/lib/study-group-db.ts, the invite page
// src/app/g/[token], the dashboard card src/components/StudyGroupsCard.tsx.
//
// What a group is for: a student makes one, shares /g/{token} in a WhatsApp
// prep group, friends sign in and join, and the dashboard shows who studied
// on the most days this week (IST, Monday to Sunday), then who practised the
// most questions. Honesty and privacy rules:
//   • No scores. Different people take different papers, so a score board
//     would compare nothing; study days use the one definition in
//     src/lib/study-day.ts (test, tutor, written answer, finished topic).
//   • Members see a member's first name and those two numbers — nothing else,
//     and the invite page says so before anyone joins. A non-member with the
//     link sees the group's name and member count only.
//   • Leaving removes a member from the board at once.
//   • When a friend joins, the group's maker is told their first name
//     (16 Sep 2026) — on Shishya always, on a phone they turned on at most
//     once per 20 minutes per group, by email at most once per 6 hours per
//     group (opt-out respected). The invite page says so before anyone
//     joins. No counts, no pressure copy.

import type { StringKey } from "@/lib/i18n";
import { CHALLENGE_TOKEN_RE, canNotifyAgain, randomChallengeString } from "@/lib/challenge";
import { clipText, type PushPayload } from "@/lib/push-alert-rules";

export const GROUP_TOKEN_RE = CHALLENGE_TOKEN_RE;
export const newGroupToken = () => randomChallengeString(10);

export const GROUP_NAME_MAX = 40;
export const GROUP_MAX_MEMBERS = 50;
/** Groups one student can be in at once (made or joined). */
export const USER_MAX_GROUPS = 10;
/** At most one phone notification per group to its maker in this window (16 Sep 2026). */
export const STUDY_GROUP_PUSH_GAP_MS = 20 * 60 * 1000;
/** At most one "a friend joined" email per group in this window; it lists everyone new since the last one. */
export const STUDY_GROUP_EMAIL_GAP_MS = 6 * 60 * 60 * 1000;

/** A typed group name: letters and digits in any script, spaces and . ' & ( ) + # - — collapsed, trimmed, capped. */
export function sanitizeGroupName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}\s.'&()+#-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const capped = Array.from(cleaned).slice(0, GROUP_NAME_MAX).join("").trim();
  return /[\p{L}\p{N}]/u.test(capped) ? capped : null;
}

/** First word of the account name as members see it (any script), capped; null when there is none. */
export function boardName(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  if (!/\p{L}/u.test(first)) return null;
  return Array.from(first).slice(0, 20).join("");
}

/** Monday of the IST week holding IST day index `day` (src/lib/study-day.ts istDay). Day 0, 1 Jan 1970, was a Thursday. */
export function istWeekStart(day: number): number {
  const dow = (((day + 4) % 7) + 7) % 7; // 0 = Sunday
  return day - ((dow + 6) % 7);
}

export interface MemberWeek {
  userId: string;
  name: string | null;
  /** IST days this week with study activity (0–7). */
  days: number;
  /** Questions answered in submitted tests this week. */
  questions: number;
  joinedAt: Date;
}

export interface BoardRow {
  rank: number;
  name: string | null;
  days: number;
  questions: number;
  isYou: boolean;
  /** Joined in the last 24 hours. */
  isNew: boolean;
}

/** Most study days first, then most questions; equal pairs share a rank (1, 1, 3); earlier joiners list first within a tie. */
export function rankBoard(members: readonly MemberWeek[], viewerId: string, now: Date = new Date()): BoardRow[] {
  const sorted = [...members].sort(
    (a, b) => b.days - a.days || b.questions - a.questions || a.joinedAt.getTime() - b.joinedAt.getTime(),
  );
  let rank = 0;
  let prev: MemberWeek | null = null;
  return sorted.map((m, i) => {
    if (!prev || prev.days !== m.days || prev.questions !== m.questions) rank = i + 1;
    prev = m;
    return {
      rank,
      name: m.name,
      days: m.days,
      questions: m.questions,
      isYou: m.userId === viewerId,
      isNew: now.getTime() - m.joinedAt.getTime() < 86_400_000,
    };
  });
}

// ── Labels (translated) ────────────────────────────────────────────────────

export const STUDY_GROUP_I18N_KEYS = [
  "sg.card.title",
  "sg.card.intro",
  "sg.create.placeholder",
  "sg.create.button",
  "sg.create.creating",
  "sg.create.error",
  "sg.limit",
  "sg.board.week",
  "sg.board.colDays",
  "sg.board.colQuestions",
  "sg.board.you",
  "sg.board.member",
  "sg.board.new",
  "sg.board.note",
  "sg.board.alone",
  "sg.invite.label",
  "sg.invite.text",
  "sg.leave",
  "sg.leave.confirm",
  "sg.join.title",
  "sg.join.members",
  "sg.join.what",
  "sg.join.button",
  "sg.join.joining",
  "sg.join.signin",
  "sg.join.already",
  "sg.join.open",
  "sg.join.full",
  "sg.join.error",
  // Telling the maker a friend joined (16 Sep 2026). The notify / push /
  // mail keys are used on the server only; listed here so the i18n key test
  // holds them to en + hi + te.
  "sg.watch.button",
  "sg.watch.on",
  "sg.watch.denied",
  "sg.notify.title",
  "sg.notify.titleFriend",
  "sg.notify.body",
  "sg.push.welcomeTitle",
  "sg.push.welcomeBody",
  "sg.mail.intro",
  "sg.mail.cta",
  "sg.mail.footer",
] as const satisfies readonly StringKey[];

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export interface StudyGroupLabels {
  title: string;
  intro: string;
  placeholder: string;
  create: string;
  creating: string;
  createError: string;
  limit: string;
  week: string;
  colDays: string;
  colQuestions: string;
  you: string;
  member: string;
  isNew: string;
  note: string;
  alone: string;
  inviteLabel: string;
  /** {name} {url} */
  inviteText: string;
  leave: string;
  leaveConfirm: string;
  whatsapp: string;
  copy: string;
  copied: string;
  more: string;
  /** The maker's "tell me on this phone when a friend joins" button (16 Sep 2026). */
  watchButton: string;
  watchBusy: string;
  watchOn: string;
  watchDenied: string;
  watchError: string;
}

export function studyGroupLabels(t: (key: StringKey) => string): StudyGroupLabels {
  return {
    title: t("sg.card.title"),
    intro: t("sg.card.intro"),
    placeholder: t("sg.create.placeholder"),
    create: t("sg.create.button"),
    creating: t("sg.create.creating"),
    createError: t("sg.create.error"),
    limit: fill(t("sg.limit"), { max: USER_MAX_GROUPS }),
    week: t("sg.board.week"),
    colDays: t("sg.board.colDays"),
    colQuestions: t("sg.board.colQuestions"),
    you: t("sg.board.you"),
    member: t("sg.board.member"),
    isNew: t("sg.board.new"),
    note: t("sg.board.note"),
    alone: t("sg.board.alone"),
    inviteLabel: t("sg.invite.label"),
    inviteText: t("sg.invite.text"),
    leave: t("sg.leave"),
    leaveConfirm: t("sg.leave.confirm"),
    whatsapp: t("challenge.share.whatsapp"),
    copy: t("challenge.share.copy"),
    copied: t("challenge.share.copied"),
    more: t("challenge.share.more"),
    watchButton: t("sg.watch.button"),
    watchBusy: t("challenge.watch.busy"),
    watchOn: t("sg.watch.on"),
    watchDenied: t("sg.watch.denied"),
    watchError: t("challenge.watch.error"),
  };
}

// ── "A friend joined your group" (16 Sep 2026) ─────────────────────────────
// Pure: which channels a join may use and what each one says. Sending and
// the atomic cap claims are notifyGroupOwner in src/lib/study-group-db.ts.

export type NoticeLocale = "en" | "hi" | "te";

/** Notes to a group's maker use their account language where Shishya has this copy (en, hi, te); otherwise English. */
export function ownerNoticeLocale(preferredLang: string | null | undefined): NoticeLocale {
  const l = (preferredLang ?? "").toLowerCase();
  return l === "hi" || l === "te" ? l : "en";
}

/** A join tells the maker only when someone else joined and both are still in the group. */
export function shouldTellOwner(p: { ownerUserId: string; joinerUserId: string; ownerIsMember: boolean; joinerIsMember: boolean }): boolean {
  return p.ownerUserId !== p.joinerUserId && p.ownerIsMember && p.joinerIsMember;
}

/**
 * The channels one join may use. In-app always. Push and email need their
 * cap columns (`capsReady` — false until scripts/create-study-group-notify.ts
 * has run, so nothing is ever sent uncapped), the gap since the last one,
 * and a device the maker turned on / an email address. The caller still
 * claims each slot atomically before sending.
 */
export function groupJoinChannels(p: {
  now: Date;
  capsReady: boolean;
  lastPushAt: Date | string | null | undefined;
  lastEmailAt: Date | string | null | undefined;
  hasWatches: boolean;
  ownerHasEmail: boolean;
}): { inApp: true; push: boolean; email: boolean } {
  return {
    inApp: true,
    push: p.capsReady && p.hasWatches && canNotifyAgain(p.lastPushAt, p.now, STUDY_GROUP_PUSH_GAP_MS),
    email: p.capsReady && p.ownerHasEmail && canNotifyAgain(p.lastEmailAt, p.now, STUDY_GROUP_EMAIL_GAP_MS),
  };
}

/**
 * Who a join email lists as new: members who joined after the previous
 * email. With no previous email (a group's first, or joins from before
 * scripts/create-study-group-notify.ts ran) only the last 6 hours — a member
 * who joined last week is not "new" (16 Sep 2026).
 */
export function groupJoinEmailSince(lastEmailAt: Date | string | null | undefined, now: Date): Date {
  return lastEmailAt ? new Date(lastEmailAt) : new Date(now.getTime() - STUDY_GROUP_EMAIL_GAP_MS);
}

type T = (key: StringKey) => string;

/** '{name} joined your study group "{group}"' — or "A friend …" when the joiner's account has no name. */
function joinTitle(t: T, joinerName: string | null, group: string): string {
  return joinerName ? fill(t("sg.notify.title"), { name: joinerName, group }) : fill(t("sg.notify.titleFriend"), { group });
}

/** The in-app notification (one per joiner per group — the caller's dedupKey). */
export function groupJoinNotice(t: T, p: { joinerName: string | null; group: string }): { title: string; body: string; link: string } {
  return { title: joinTitle(t, p.joinerName, p.group), body: t("sg.notify.body"), link: "/dashboard#study-groups" };
}

/** The phone notification to the maker. */
export function groupJoinPush(t: T, p: { token: string; joinerName: string | null; group: string }): PushPayload {
  return {
    title: clipText(joinTitle(t, p.joinerName, p.group), 72),
    body: clipText(t("sg.notify.body"), 140),
    url: "/dashboard?utm_source=push&utm_medium=study-group#study-groups",
    tag: `study-group-${p.token}`,
  };
}

/** The one confirmation when the maker turns on phone notifications for a group. */
export function groupWatchWelcomePush(t: T, p: { token: string; group: string }): PushPayload {
  return {
    title: clipText(fill(t("sg.push.welcomeTitle"), { group: p.group }), 72),
    body: clipText(t("sg.push.welcomeBody"), 140),
    url: "/dashboard?utm_source=push&utm_medium=study-group-welcome#study-groups",
    tag: `study-group-${p.token}`,
  };
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);

/** Names listed in one email; the dashboard board shows everyone. */
export const GROUP_JOIN_EMAIL_MAX_NAMES = 20;

/**
 * Email to the maker: the first names of everyone who joined since the last
 * one (newest first; "A friend" for an account with no name). No totals.
 */
export function groupJoinEmail(
  t: T,
  p: {
    group: string;
    /** Board names, newest first. */
    joiners: (string | null)[];
  },
): { subject: string; text: string; html: string } {
  const url = "https://shishya.in/dashboard#study-groups";
  const friend = t("challenge.aFriend");
  const names = p.joiners.slice(0, GROUP_JOIN_EMAIL_MAX_NAMES).map((n) => n ?? friend);
  const cut = p.joiners.length > names.length;
  const subject = clipText(joinTitle(t, p.joiners[0] ?? null, p.group), 110);
  const intro = fill(t("sg.mail.intro"), { group: p.group });
  const text = `${intro}

${names.map((n) => `• ${n}`).join("\n")}${cut ? "\n…" : ""}

${t("sg.notify.body")}
${t("sg.mail.cta")} ${url}

— Shishya
(${t("sg.mail.footer")})`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:18px;">${esc(subject)}</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0 6px;">${esc(intro)}</p>
    <ul style="font-size:14px;line-height:1.7;margin:0 0 14px;padding-left:20px;">${names.map((n) => `<li>${esc(n)}</li>`).join("")}${cut ? "<li>…</li>" : ""}</ul>
    <p style="font-size:14px;line-height:1.6;margin:0 0 14px;">${esc(t("sg.notify.body"))}</p>
    <a href="${url}"
       style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">
      ${esc(t("sg.mail.cta"))}
    </a>
    <p style="font-size:11px;color:#94a3b8;margin:18px 0 0;">${esc(t("sg.mail.footer"))}</p>
  </div>
</body></html>`;
  return { subject, text, html };
}
