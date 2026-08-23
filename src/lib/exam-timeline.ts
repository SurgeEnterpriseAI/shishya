// Exam tracker timeline — turns ExamImportantDate rows into the ordered,
// status-tagged timeline the /exams/[code]/updates page and the
// /exam-calendar page render. Pure functions, no DB.
//
// Honesty model (23 Aug 2026): a row is OFFICIAL only when the generator
// could cite an official/reliable notice (confidence = "official" AND a
// url). Everything else is EXPECTED — a typical-cycle estimate that the
// UI must label as such, never present as the date. Rows written before
// the tracker fields existed (kind/confidence NULL) are classified from
// their label and treated as expected.

import { kindFromLabel, type DateKind } from "@/lib/ai/exam-info";
import { istDayNumber } from "@/lib/exam-phase";

export type { DateKind };

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
  label: string;
  date: Date;
  /** ISO calendar day (YYYY-MM-DD) of the IST date. */
  day: string;
  isExamDay: boolean;
  /** Dated by a cited official/reliable notice. */
  official: boolean;
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

export function resolveKind(r: { kind?: string | null; label: string; isExamDay: boolean }): DateKind {
  const k = (r.kind ?? "").toUpperCase();
  if (k && k in KIND_ORDER) return k as DateKind;
  return kindFromLabel(r.label, r.isExamDay);
}

export function isoDay(d: Date): string {
  // The stored value is midnight-UTC of the IST calendar day (repo-wide
  // convention) — format in UTC so the day never shifts.
  return d.toISOString().slice(0, 10);
}

/** Build the ordered timeline. Sorted by date, then by cycle order. */
export function buildTimeline(rows: TimelineInput[], now: Date = new Date()): TimelineRow[] {
  const today = istDayNumber(now);
  const out: TimelineRow[] = rows.map((r) => {
    const date = r.date instanceof Date ? r.date : new Date(r.date);
    const kind = resolveKind({ kind: r.kind, label: r.label, isExamDay: r.isExamDay });
    const url = r.url && /^https?:\/\//i.test(r.url) ? r.url : r.source && /^https?:\/\//i.test(r.source) ? r.source : null;
    const official = (r.confidence ?? "").toLowerCase() === "official" && !!url;
    const delta = istDayNumber(date) - today;
    return {
      id: r.id,
      kind,
      label: r.label,
      date,
      day: isoDay(date),
      isExamDay: r.isExamDay || kind === "EXAM",
      official,
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
  const nextExam = timeline.find((r) => r.kind === "EXAM" && r.status !== "done") ?? null;
  return { next, last, nextExam };
}

/** Cycle year to show in titles: year of the next exam day, else the
 *  latest upcoming row, else the current year. */
export function cycleYear(timeline: TimelineRow[], now: Date = new Date()): number {
  const { nextExam, next } = stageOf(timeline);
  const ref = nextExam ?? next;
  return ref ? ref.date.getUTCFullYear() : now.getUTCFullYear();
}

/** First row of a kind that is not done (for the "key dates" strip). */
export function upcomingOfKind(timeline: TimelineRow[], kind: DateKind): TimelineRow | null {
  return timeline.find((r) => r.kind === kind && r.status !== "done") ?? null;
}

/** Latest row of a kind regardless of status. */
export function latestOfKind(timeline: TimelineRow[], kind: DateKind): TimelineRow | null {
  const rows = timeline.filter((r) => r.kind === kind);
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
