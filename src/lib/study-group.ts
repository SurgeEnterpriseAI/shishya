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

import type { StringKey } from "@/lib/i18n";
import { CHALLENGE_TOKEN_RE, randomChallengeString } from "@/lib/challenge";

export const GROUP_TOKEN_RE = CHALLENGE_TOKEN_RE;
export const newGroupToken = () => randomChallengeString(10);

export const GROUP_NAME_MAX = 40;
export const GROUP_MAX_MEMBERS = 50;
/** Groups one student can be in at once (made or joined). */
export const USER_MAX_GROUPS = 10;

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
  };
}
