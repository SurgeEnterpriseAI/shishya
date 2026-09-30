// The live stats strip's pure logic (26 Sep 2026) — labels, the ordered
// item table, the poll merge. Split out of LiveCounters.tsx so the unit
// test can import it (vitest runs with tsconfig jsx: preserve, so a .tsx
// island cannot be imported by a test). No React, no DOM, no DB.
//
// Rules the table implements (founder brief, 26 Sep 2026):
//   • every label describes exactly what LIVE_COUNT_DEFINITIONS
//     (src/lib/live-counts-server.ts) says the field counts — the people
//     counter reads "learners" (founder's word, 26 Sep 2026) and counts
//     the people LIVE_COUNT_DEFINITIONS.uniqueVisitors defines;
//   • nothing typed: values come from the poll reply only;
//   • a counter that reads wrong at 0 ("0 active now") is hidden only at 0.
//   • 30 Sep 2026 (founder): the strip shows only counters that move EVERY
//     day, each with its own "+N today" (sign-ups: "+N this week") — so
//     learners, live tests and exam goals gained a today pill, and the
//     catalogue counts that move only when a batch runs (exams, practice
//     questions, topic notes, school chapters, languages) left the strip.
//     They stay in the API and on /shishya-in-numbers.
//   • 30 Sep 2026 (founder): the learners are also shown by section on a
//     third sm+ row — govt exam aspirants, school students, entrance
//     aspirants, scholarship & college seekers, PG entrance aspirants, NET
//     aspirants, general pages only — each learner in exactly one
//     group (src/lib/learner-sections.ts). Review the same day: labels name
//     what people look at ("PG entrance aspirants", "NET aspirants",
//     "general pages only"), a group under K_MIN (20) people is not shown
//     (the public-count floor), row 3 shows from lg only, and its "+N today"
//     pills from 1800 px only — seven groups with pills do not fit a laptop
//     line (measured); below 1800 px the pill is the item's title instead.
//
// Layout (26 Sep 2026 review — the first cut wrapped to 3–7 lines, 113–193 px
// of sticky band on desktop/tablet and 3 lines on phones). The height is now
// fixed by construction, never by how the words happen to wrap:
//   • phones (< sm): PHONE_KEYS only — exactly four, a 2 × 2 grid, so
//     always two lines; no pills;
//   • sm and up: two single-line rows (ROW 1 = people and what they did,
//     ROW 2 = depth of use), pills on; lg and up: ROW 3 = learners by
//     section (30 Sep 2026), its pills from 1800 px only. A
//     row that is wider than the screen scrolls sideways inside its line
//     instead of wrapping. Measured on shishya.in's own fonts, rows 1-2
//     fit whole at >= 1366 px in en and hi and at >= 1536 px in te, even
//     with every growing counter at 10x today's value
//     (tests/unit/live-counters-strip.test.ts pins the width budget);
//   • no emoji icons any more: at ~24 px each they cost a whole counter's
//     width per row, and the bold number already leads every item.

import { formatCount } from "@/lib/live-counters";
import { K_MIN } from "@/lib/public-stats";
// Type-only: erased at build, so the client bundle never sees Prisma.
import type { LiveCounts } from "@/lib/live-counts-server";

/** Every LiveCounts field — typed against the server interface so a new
 *  field cannot be forgotten here (tests pin it equals the API shape). */
const COUNT_KEY_SET: Record<keyof LiveCounts, true> = {
  activeNow: true,
  totalPageViews: true,
  pageViewsToday: true,
  uniqueVisitors: true,
  uniqueVisitorsToday: true,
  learnersGovt: true,
  learnersGovtToday: true,
  learnersSchool: true,
  learnersSchoolToday: true,
  learnersEntrance: true,
  learnersEntranceToday: true,
  learnersCollege: true,
  learnersCollegeToday: true,
  learnersGraduate: true,
  learnersGraduateToday: true,
  learnersPostgraduate: true,
  learnersPostgraduateToday: true,
  learnersExploring: true,
  learnersExploringToday: true,
  walkIns: true,
  mocksTaken: true,
  mocksToday: true,
  totalSignups: true,
  signupsLast7Days: true,
  signupsToday: true,
  tutorQuestions: true,
  tutorQuestionsToday: true,
  questionsAnswered: true,
  questionsAnsweredToday: true,
  liveTestsTaken: true,
  liveTestsToday: true,
  examGoals: true,
  examGoalsToday: true,
  exams: true,
  practiceQuestions: true,
  topicNotes: true,
  schoolChapters: true,
  languages: true,
};
export const LIVE_COUNT_KEYS = Object.keys(COUNT_KEY_SET) as Array<keyof LiveCounts>;

export interface StripLabels {
  /** "active now" — i18n live.activeNow */
  activeNow?: string;
  /** "page views" — live.pageViews */
  pageViews?: string;
  /** "learners" — live.visitors (distinct people who came to Shishya;
   *  the founder's word, 26 Sep 2026) */
  visitors?: string;
  /** "mock exams taken" — live.mocksTaken */
  mocksTaken?: string;
  /** "signed up" — live.signedUp */
  signedUp?: string;
  /** "AI tutor questions" — live.tutorQuestions */
  tutorQuestions?: string;
  /** "questions answered" — live.questionsAnswered */
  questionsAnswered?: string;
  /** "live tests taken" — live.liveTests */
  liveTests?: string;
  /** "exam goals set" — live.examGoals */
  examGoals?: string;
  /** "exams" — live.exams */
  exams?: string;
  /** "practice questions" — live.questions */
  questions?: string;
  /** "topic notes" — live.notes */
  notes?: string;
  /** "school chapters" — live.schoolChapters */
  schoolChapters?: string;
  /** "languages" — live.languages */
  languages?: string;
  /** "+{n} today" pill — live.today */
  today?: string;
  /** Row 3 lead "Learners by section" — live.sec.lead */
  secLead?: string;
  /** live.sec.govt */
  secGovt?: string;
  /** live.sec.school */
  secSchool?: string;
  /** live.sec.entrance */
  secEntrance?: string;
  /** live.sec.college */
  secCollege?: string;
  /** live.sec.graduate */
  secGraduate?: string;
  /** live.sec.postgraduate */
  secPostgraduate?: string;
  /** live.sec.exploring */
  secExploring?: string;
  /** "+{n} this week" pill — live.thisWeek */
  thisWeek?: string;
  /** Legacy fields (before 26 Sep 2026). Accepted so older callers still
   *  compile; NOT rendered — /for/[persona] passes "preparing now" /
   *  "in a mock right now" / "helped till now" for all-time counts. */
  preparingNow?: string;
  inMockNow?: string;
  totalEver?: string;
  activeDiscussions?: string;
}

export type LabelKey = Exclude<keyof StripLabels, "preparingNow" | "inMockNow" | "totalEver" | "activeDiscussions">;

/** English defaults — the same words as i18n live.* in en. */
export const STRIP_DEFAULT_LABELS: Record<LabelKey, string> = {
  activeNow: "active now",
  pageViews: "page views",
  visitors: "learners",
  mocksTaken: "mock exams taken",
  signedUp: "signed up",
  tutorQuestions: "AI tutor questions",
  questionsAnswered: "questions answered",
  liveTests: "live tests taken",
  examGoals: "exam goals set",
  exams: "exams",
  questions: "practice questions",
  notes: "topic notes",
  schoolChapters: "school chapters",
  languages: "languages",
  today: "+{n} today",
  thisWeek: "+{n} this week",
  secLead: "Learners by section",
  secGovt: "govt exam aspirants",
  secSchool: "school students",
  secEntrance: "entrance aspirants",
  secCollege: "scholarship & college seekers",
  secGraduate: "PG entrance aspirants",
  secPostgraduate: "NET aspirants",
  secExploring: "general pages only",
};

/** "+{n} today" → "+54 today". Local so the client island never imports
 *  the i18n module (the whole dictionary). */
export function fillN(template: string, n: number): string {
  return template.replace(/\{n\}/g, formatCount(n));
}

export interface StripItem {
  key: keyof LiveCounts;
  value: number;
  label: string;
  /** "+N today" / "+N this week" — from sm only */
  pill?: string;
  /** One of the four phone cells (PHONE_KEYS); everything shows from sm. */
  phone: boolean;
  /** sm+ row: 1 = people and what they did, 2 = depth of use, 3 = learners by section (lg+). */
  row: 1 | 2 | 3;
  /** Row 3: the pill shows from 1800 px only (below that it is the item's title). */
  pillWide?: boolean;
}

/** The phone grid's four cells, in reading order (2 × 2 → always exactly
 *  two lines). The founder's named counters: people who came, mock exams
 *  taken, AI tutor questions, sign-ups. None of them is ever hidden at 0,
 *  so the grid is always full (pinned in tests). */
export const PHONE_KEYS: ReadonlyArray<keyof LiveCounts> = ["uniqueVisitors", "mocksTaken", "tutorQuestions", "totalSignups"];

/** Counters that read wrong at 0 ("0 active now", "0 live tests taken")
 *  and are legitimately 0 early: rendered only when positive. Nothing
 *  else is ever hidden. */
export const HIDDEN_WHEN_ZERO: ReadonlySet<keyof LiveCounts> = new Set([
  "activeNow",
  "liveTestsTaken",
  "examGoals",
]);

/** Learner groups show only from K_MIN (20) people — the public-count floor
 *  (src/lib/public-stats.ts): one anonymous page view is not "a group". */
export const SECTION_FLOOR = K_MIN;
const SECTION_KEYS: ReadonlySet<keyof LiveCounts> = new Set([
  "learnersGovt",
  "learnersSchool",
  "learnersEntrance",
  "learnersCollege",
  "learnersGraduate",
  "learnersPostgraduate",
  "learnersExploring",
]);

/** The strip's items, in order, from a counts reply and the caller's
 *  labels (English defaults fill any gap). Pure — tests pin the table. */
export function buildStripItems(c: LiveCounts, labels: StripLabels = {}, opts: { sections?: boolean } = {}): StripItem[] {
  const sections = opts.sections ?? true;
  const L: Record<LabelKey, string> = { ...STRIP_DEFAULT_LABELS };
  for (const k of Object.keys(STRIP_DEFAULT_LABELS) as LabelKey[]) {
    const v = labels[k];
    if (typeof v === "string" && v.trim()) L[k] = v;
  }
  const today = (todayCount: number) => (todayCount > 0 ? fillN(L.today, todayCount) : undefined);
  const n = (v: number | undefined) => v ?? 0;
  const all: Array<Omit<StripItem, "phone">> = [
    // Row 1 — people and what they did. Lead with the real-time pulse
    // when anyone's live, then the founder's named counters.
    { key: "activeNow", value: c.activeNow, label: L.activeNow, row: 1 },
    { key: "uniqueVisitors", value: c.uniqueVisitors, label: L.visitors, pill: today(c.uniqueVisitorsToday), row: 1 },
    { key: "mocksTaken", value: c.mocksTaken, label: L.mocksTaken, pill: today(c.mocksToday), row: 1 },
    { key: "tutorQuestions", value: c.tutorQuestions, label: L.tutorQuestions, pill: today(c.tutorQuestionsToday), row: 1 },
    { key: "totalSignups", value: c.totalSignups, label: L.signedUp, pill: c.signupsLast7Days > 0 ? fillN(L.thisWeek, c.signupsLast7Days) : undefined, row: 1 },
    // Row 2 — depth of use. Page views moved here on 30 Sep 2026 so row 1
    // keeps its measured width now that learners carries a pill too.
    { key: "totalPageViews", value: c.totalPageViews, label: L.pageViews, pill: today(c.pageViewsToday), row: 2 },
    { key: "questionsAnswered", value: c.questionsAnswered, label: L.questionsAnswered, pill: today(c.questionsAnsweredToday), row: 2 },
    { key: "liveTestsTaken", value: c.liveTestsTaken, label: L.liveTests, pill: today(c.liveTestsToday), row: 2 },
    { key: "examGoals", value: c.examGoals, label: L.examGoals, pill: today(c.examGoalsToday), row: 2 },
    // Row 3 — who the learners are, one group per learner, largest sections first, "general pages only" last.
    { key: "learnersGovt", value: n(c.learnersGovt), label: L.secGovt, pill: today(n(c.learnersGovtToday)), row: 3, pillWide: true },
    { key: "learnersSchool", value: n(c.learnersSchool), label: L.secSchool, pill: today(n(c.learnersSchoolToday)), row: 3, pillWide: true },
    { key: "learnersEntrance", value: n(c.learnersEntrance), label: L.secEntrance, pill: today(n(c.learnersEntranceToday)), row: 3, pillWide: true },
    { key: "learnersCollege", value: n(c.learnersCollege), label: L.secCollege, pill: today(n(c.learnersCollegeToday)), row: 3, pillWide: true },
    { key: "learnersGraduate", value: n(c.learnersGraduate), label: L.secGraduate, pill: today(n(c.learnersGraduateToday)), row: 3, pillWide: true },
    { key: "learnersPostgraduate", value: n(c.learnersPostgraduate), label: L.secPostgraduate, pill: today(n(c.learnersPostgraduateToday)), row: 3, pillWide: true },
    { key: "learnersExploring", value: n(c.learnersExploring), label: L.secExploring, pill: today(n(c.learnersExploringToday)), row: 3, pillWide: true },
  ];
  return all
    .filter((it) => (it.row === 3 ? sections && it.value >= SECTION_FLOOR : it.value > 0 || !HIDDEN_WHEN_ZERO.has(it.key)))
    .map((it) => ({ ...it, phone: PHONE_KEYS.includes(it.key) }));
}

/** A poll reply over the last-known counts: a field the reply lacks (or
 *  that is not a finite number) keeps its previous value, 0 before any reply. */
export function mergeCounts(prev: LiveCounts | null, data: Partial<LiveCounts>): LiveCounts {
  const out = {} as LiveCounts;
  for (const k of LIVE_COUNT_KEYS) {
    const v = data[k];
    out[k] = typeof v === "number" && Number.isFinite(v) ? v : (prev?.[k] ?? 0);
  }
  return out;
}
