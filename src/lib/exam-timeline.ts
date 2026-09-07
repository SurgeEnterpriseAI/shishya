// Exam tracker timeline — turns ExamImportantDate rows into the ordered,
// status-tagged timeline the /exams/[code]/updates page and the
// /exam-calendar page render. Pure functions, no DB.
//
// Honesty model (23 Aug 2026, tiered 29 Aug 2026): every row carries a
// source tier derived from its cited domain (src/lib/official-source.ts):
//   official — announced + cited on the conducting body's own site; the
//              only tier that earns the gold badge and structured data
//   reported — announced, but cited via a secondary source (news /
//              coaching portal); real, labelled with its provenance
//   expected — a typical-cycle estimate the UI must label as such
// Rows written before the tracker fields existed (kind/confidence NULL)
// are classified from their label and treated as expected.

import { kindFromLabel, type DateKind } from "@/lib/ai/exam-info";
import { istDayNumber } from "@/lib/exam-phase";
import { sourceTier, type SourceTier } from "@/lib/official-source";

export type { DateKind, SourceTier };

export type TimelineStatus = "done" | "today" | "upcoming";

export interface TimelineInput {
  id: string;
  label: string;
  date: Date | string;
  isExamDay: boolean;
  kind?: string | null;
  confidence?: string | null;
  url?: string | null;
  notes?: string | null;
  source?: string | null;
}

export interface TimelineRow {
  id: string;
  kind: DateKind;
  /** True when `kind` came from the row's own kind column; false when it
   *  was GUESSED from the label (legacy rows written before the column
   *  existed). A guess must never outrank a declared value — see
   *  rowsOfKind(). */
  kindDeclared: boolean;
  label: string;
  date: Date;
  /** ISO calendar day (YYYY-MM-DD) of the IST date. */
  day: string;
  isExamDay: boolean;
  /** Gold tier only: announced AND cited on the conducting body's own
   *  site. The only rows that may enter schema.org structured data. */
  official: boolean;
  /** official | reported (announced via secondary source) | expected. */
  tier: SourceTier;
  url: string | null;
  notes: string | null;
  status: TimelineStatus;
  /** IST calendar-day delta from today (negative = past). */
  daysFromToday: number;
}

const KIND_ORDER: Record<DateKind, number> = {
  NOTIFICATION: 0,
  APPLICATION_START: 1,
  CORRECTION_WINDOW: 2,
  APPLICATION_END: 3,
  ADMIT_CARD: 4,
  EXAM: 5,
  ANSWER_KEY: 6,
  RESULT: 7,
  INTERVIEW: 8,
  OTHER: 9,
};

export const KIND_ICON: Record<DateKind, string> = {
  NOTIFICATION: "📢",
  APPLICATION_START: "📝",
  APPLICATION_END: "⏳",
  CORRECTION_WINDOW: "✏️",
  ADMIT_CARD: "🎫",
  EXAM: "🎯",
  ANSWER_KEY: "🔑",
  RESULT: "🏁",
  INTERVIEW: "🗣️",
  OTHER: "📌",
};

/** Resolve a row's kind AND say where it came from: `declared` means the
 *  row's own kind column held it, otherwise it was inferred from the
 *  label (ExamImportantDate.kind is NULL on legacy rows). */
export function resolveKindInfo(r: { kind?: string | null; label: string; isExamDay: boolean }): {
  kind: DateKind;
  declared: boolean;
} {
  const k = (r.kind ?? "").toUpperCase();
  if (k && k in KIND_ORDER) return { kind: k as DateKind, declared: true };
  return { kind: kindFromLabel(r.label, r.isExamDay), declared: false };
}

export function resolveKind(r: { kind?: string | null; label: string; isExamDay: boolean }): DateKind {
  return resolveKindInfo(r).kind;
}

export function isoDay(d: Date): string {
  // The stored value is midnight-UTC of the IST calendar day (repo-wide
  // convention) — format in UTC so the day never shifts.
  return d.toISOString().slice(0, 10);
}

/** Build the ordered timeline. Sorted by date, then by cycle order.
 *  `officialUrl` (the exam's portal from ExamEligibility) widens the
 *  gold tier to that portal's domain even off-government TLDs. */
export function buildTimeline(rows: TimelineInput[], now: Date = new Date(), officialUrl?: string | null): TimelineRow[] {
  const today = istDayNumber(now);
  const out: TimelineRow[] = rows.map((r) => {
    const date = r.date instanceof Date ? r.date : new Date(r.date);
    const { kind, declared } = resolveKindInfo({ kind: r.kind, label: r.label, isExamDay: r.isExamDay });
    const url = r.url && /^https?:\/\//i.test(r.url) ? r.url : r.source && /^https?:\/\//i.test(r.source) ? r.source : null;
    const tier = sourceTier(r.confidence, url, officialUrl);
    const delta = istDayNumber(date) - today;
    return {
      id: r.id,
      kind,
      kindDeclared: declared,
      label: r.label,
      date,
      day: isoDay(date),
      // resolveKind already folds a legacy isExamDay=true with no kind into
      // EXAM; a row with a valid non-EXAM kind is never an exam day.
      isExamDay: kind === "EXAM",
      official: tier === "official",
      tier,
      url,
      notes: r.notes ?? null,
      status: delta < 0 ? "done" : delta === 0 ? "today" : "upcoming",
      daysFromToday: delta,
    };
  });
  out.sort((a, b) => a.date.getTime() - b.date.getTime() || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  return out;
}

/** The row that best answers "what's next?" — today's row, else the
 *  nearest upcoming; the most recent done row as context. */
export function stageOf(timeline: TimelineRow[]): { next: TimelineRow | null; last: TimelineRow | null; nextExam: TimelineRow | null } {
  const next = timeline.find((r) => r.status === "today") ?? timeline.find((r) => r.status === "upcoming") ?? null;
  const done = timeline.filter((r) => r.status === "done");
  const last = done.length ? done[done.length - 1] : null;
  // Same declared-beats-inferred rule the key-dates helpers use: an exam
  // day the tracker actually typed outranks one guessed from a legacy
  // row's label, so the status strip and the EXAM card cannot name two
  // different days for the same exam.
  const nextExam =
    timeline.find((r) => r.kind === "EXAM" && r.kindDeclared && r.status !== "done") ??
    timeline.find((r) => r.kind === "EXAM" && r.status !== "done") ??
    null;
  return { next, last, nextExam };
}

/** Cycle year to show in titles: year of the next exam day, else the
 *  latest upcoming row, else the current year. */
export function cycleYear(timeline: TimelineRow[], now: Date = new Date()): number {
  const { nextExam, next } = stageOf(timeline);
  const ref = nextExam ?? next;
  return ref ? ref.date.getUTCFullYear() : now.getUTCFullYear();
}

/** Rows of one kind — but an INFERRED kind never outranks a DECLARED one
 *  (7 Sep 2026). SSC CGL's May seed row "Tier 1 result announcement"
 *  (kind NULL, guessed RESULT, 16 Sep) was answering the result question
 *  ahead of the exam's own declared RESULT row (15 Dec), because it is
 *  earlier. When any row of this kind carries a declared kind we trust
 *  only those; when none do, every row stays in play, so exams whose rows
 *  are all legacy behave exactly as before. */
function rowsOfKind(timeline: TimelineRow[], kind: DateKind): TimelineRow[] {
  const rows = timeline.filter((r) => r.kind === kind);
  const declared = rows.filter((r) => r.kindDeclared);
  return declared.length ? declared : rows;
}

const OUTCOME_KINDS: DateKind[] = ["ANSWER_KEY", "RESULT"];

/** An answer key or result cannot be published before the exam it reports
 *  on. A still-to-come outcome row dated before EVERY exam day on the
 *  tracker belongs to no exam we know of, so it must not be offered as
 *  the answer to "when is the result?" — it stays in the timeline list,
 *  which students legitimately read as history.
 *
 *  Compared against the EARLIEST exam day rather than the next upcoming
 *  one on purpose: in a multi-stage exam a Tier-1 result genuinely falls
 *  before the Tier-2 exam day, and that row must keep showing. Rows
 *  already past, and exams with no exam day on record, are untouched. */
function outcomeBeforeAnyExam(timeline: TimelineRow[], row: TimelineRow): boolean {
  if (row.status === "done" || !OUTCOME_KINDS.includes(row.kind)) return false;
  const examDays = timeline.filter((r) => r.kind === "EXAM").map((r) => r.day);
  // ISO day strings compare lexicographically.
  return examDays.length > 0 && examDays.every((d) => d > row.day);
}

/** First row of a kind that is not done (for the "key dates" strip). */
export function upcomingOfKind(timeline: TimelineRow[], kind: DateKind): TimelineRow | null {
  return rowsOfKind(timeline, kind).find((r) => r.status !== "done" && !outcomeBeforeAnyExam(timeline, r)) ?? null;
}

/** Latest row of a kind regardless of status. */
export function latestOfKind(timeline: TimelineRow[], kind: DateKind): TimelineRow | null {
  const rows = rowsOfKind(timeline, kind).filter((r) => !outcomeBeforeAnyExam(timeline, r));
  return rows.length ? rows[rows.length - 1] : null;
}

export function fmtDay(d: Date, locale: "en" | "hi" | "te" | string = "en", withWeekday = false): string {
  const tag = locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN";
  return d.toLocaleDateString(tag, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withWeekday ? { weekday: "short" as const } : {}),
  });
}

/** Regex used by the alert cron + calendar page to spot "material"
 *  news headlines (the kinds a subscriber asked to be told about). */
export const MATERIAL_NEWS_RE =
  /admit card|hall ticket|notification|result|answer key|exam date|postpon|reschedul|date sheet|cut ?off|merit list|scorecard|application (window|date|last date)|apply online|registration/i;
