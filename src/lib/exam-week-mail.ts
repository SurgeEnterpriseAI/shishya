// Exam Week Mode — mail-side helpers shared by the exam-eve and
// exam-day-after crons (6 Sep 2026). Deterministic DB reads + pure text
// helpers; no LLM anywhere on this path.
//
// Honesty rules (founder): every date a mail prints goes through
// whenWithTier() so the tier word is never dropped; answer-key / result
// lines are only ever what the tracker holds ("not announced yet" when it
// holds nothing); the exam-eve decision is the SAME state machine every
// other exam-week surface reads (src/lib/exam-week.ts), so the mail can
// never disagree with the hub block about which day is the exam.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { tk, type Locale, type StringKey } from "@/lib/i18n";
import { computeExamWeekState, dateWithTier, istDay, type ExamWeekState } from "@/lib/exam-week";
import { buildTimeline, type SourceTier, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;
const TIER_RANK: Record<SourceTier, number> = { official: 0, reported: 1, expected: 2 };

const TIER_KEY: Record<SourceTier, StringKey> = {
  official: "ew.tier.official",
  reported: "ew.tier.reported",
  expected: "ew.tier.expected",
};

/** Localised tier word ("official" / "reported" / "expected"). */
export function tierWord(tier: SourceTier, locale: Locale = "en"): string {
  return tk(TIER_KEY[tier], locale);
}

/** "13 Sep (official)" — the only way a mail may print a tracker date. */
export function whenWithTier(row: TimelineRow, locale: Locale = "en"): string {
  return dateWithTier(row, tierWord(row.tier, locale), locale);
}

/** "13 Sep" — plain IST calendar day, for templates that add the tier themselves. */
export function plainDay(d: Date, locale: Locale = "en"): string {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return shifted.toLocaleDateString(locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "{key}: {text}" — the tracker's row with its tier, or "not announced yet". */
export function statusLine(key: "ew.post.key" | "ew.post.result", row: TimelineRow | null, locale: Locale = "en"): string {
  return fill(tk(key, locale), { text: row ? whenWithTier(row, locale) : tk("ew.post.notAnnounced", locale) });
}

export function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function dayDiff(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(toDay + "T00:00:00Z") - Date.parse(fromDay + "T00:00:00Z")) / DAY_MS);
}

// ── DB shapes ─────────────────────────────────────────────────────────

/** Raw ExamImportantDate row as the crons select it (archived rows excluded). */
export interface DateRow extends TimelineInput {
  id: string;
  examId: string;
  label: string;
  date: Date;
  isExamDay: boolean;
  kind: string | null;
  confidence: string | null;
  url: string | null;
  source: string | null;
  notes: string | null;
}

export interface ExamMeta {
  examId: string;
  code: string;
  short: string;
  category: string;
  state: string | null;
  officialUrl: string | null;
}

export interface ExamBundle {
  meta: ExamMeta;
  rows: DateRow[];
}

/** Active exams + ALL their live tracker rows, keyed by exam id. */
export async function loadExamBundles(examIds: string[]): Promise<Map<string, ExamBundle>> {
  const out = new Map<string, ExamBundle>();
  const ids = Array.from(new Set(examIds)).filter(Boolean);
  if (ids.length === 0) return out;
  const metas = await prisma.$queryRaw<ExamMeta[]>`
    SELECT e.id AS "examId", e.code, e."shortName" AS short, e.category::text AS category, e.state, el."officialUrl"
    FROM "Exam" e
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE e.active = TRUE AND e.id IN (${Prisma.join(ids)})`.catch((err) => {
    console.error("[exam-week-mail] exam meta failed", err);
    return [] as ExamMeta[];
  });
  for (const m of metas) out.set(m.examId, { meta: m, rows: [] });
  if (out.size === 0) return out;
  const rows = await prisma.$queryRaw<DateRow[]>`
    SELECT id, "examId", label, date, "isExamDay", kind, confidence, url, source, notes
    FROM "ExamImportantDate"
    WHERE "archivedAt" IS NULL AND "examId" IN (${Prisma.join(Array.from(out.keys()))})
    ORDER BY date ASC`.catch((err) => {
    console.error("[exam-week-mail] tracker rows failed", err);
    return [] as DateRow[];
  });
  for (const r of rows) out.get(r.examId)?.rows.push(r);
  return out;
}

// ── Exam-eve decision ─────────────────────────────────────────────────

export type EveDecision =
  | { ok: true; eveRow: TimelineRow; state: ExamWeekState; timeline: TimelineRow[] }
  | { ok: false; reason: string; state: ExamWeekState; timeline: TimelineRow[] };

/**
 * Should the exam-eve mail go out for this exam at instant `now`?
 *
 *   • the shared state machine must say phase === "eve" (the earliest
 *     exam-day row of the window is tomorrow, IST);
 *   • that row must be an ANNOUNCED date (official / reported) — an
 *     "exam is tomorrow" mail on an estimate is a broken promise;
 *   • the calendar must not contradict itself: a contradiction is ONLY
 *     another TYPED exam row (kind = 'EXAM', legacy untyped rows are
 *     ignored) of a strictly HIGHER tier within ±30 days that names a
 *     different date. Same-tier rows on other days are a multi-day /
 *     multi-shift window (SSC CGL, MPESB, SBI Clerk, RRB NTPC) and are
 *     exactly what the old "any other exam row" guard wrongly blocked.
 */
export function examEveDecision(rows: TimelineInput[], officialUrl: string | null | undefined, now: Date): EveDecision {
  const state = computeExamWeekState(rows, officialUrl, now);
  const timeline = buildTimeline(rows, now, officialUrl);
  if (state.phase !== "eve") return { ok: false, reason: `phase:${state.phase}`, state, timeline };
  const eveRow = state.windowDays[0];
  const tomorrow = istDay(new Date(now.getTime() + DAY_MS));
  if (!eveRow || istDay(eveRow.date) !== tomorrow) {
    return { ok: false, reason: "no exam-day row dated tomorrow", state, timeline };
  }
  if (eveRow.tier === "expected") {
    return { ok: false, reason: "tomorrow's row is an estimate (expected tier), not an announced date", state, timeline };
  }
  const typedExam = new Set(rows.filter((r) => (r.kind ?? "").toUpperCase() === "EXAM").map((r) => r.id));
  const eveDay = istDay(eveRow.date);
  const clash = timeline.find((r) => {
    if (r.id === eveRow.id || !typedExam.has(r.id)) return false;
    if (TIER_RANK[r.tier] >= TIER_RANK[eveRow.tier]) return false;
    const day = istDay(r.date);
    return day !== eveDay && Math.abs(dayDiff(eveDay, day)) <= 30;
  });
  if (clash) {
    return {
      ok: false,
      reason: `contradicted by higher-tier "${clash.label}" on ${istDay(clash.date)} (${clash.tier})`,
      state,
      timeline,
    };
  }
  return { ok: true, eveRow, state, timeline };
}

// ── Mail content pieces ───────────────────────────────────────────────

/** /exams/{code}/checklist only when a live CHECKLIST article cites ≥2
 *  sources; otherwise the exam hub (never a thin or absent article). */
export async function checklistLink(examId: string, code: string): Promise<{ url: string; isArticle: boolean }> {
  const hub = `https://shishya.in/exams/${code}`;
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT (CASE WHEN jsonb_typeof("sourcesScraped") = 'array' THEN jsonb_array_length("sourcesScraped") ELSE 0 END)::int AS n
    FROM "ExamPhaseArticle"
    WHERE "examId" = ${examId} AND phase = 'CHECKLIST' AND "archivedAt" IS NULL
    ORDER BY "lastUpdatedAt" DESC LIMIT 1`.catch(() => [] as { n: number }[]);
  const n = Number(rows[0]?.n ?? 0);
  return n >= 2 ? { url: `${hub}/checklist`, isArticle: true } : { url: hub, isArticle: false };
}

/** The tracker's next `n` dated rows on/after `fromDay`, skipping the
 *  exam-day rows of the window itself (those are the exam, not "next"). */
export function nextTrackerRows(timeline: TimelineRow[], fromDay: string, exclude: Iterable<string>, n = 2): TimelineRow[] {
  const skip = new Set(exclude);
  return timeline.filter((r) => !skip.has(r.id) && istDay(r.date) >= fromDay).slice(0, n);
}

/** First row of `kind` dated on/after `fromDay`; null when the tracker
 *  has none (callers print "not announced yet"). */
export function rowOnOrAfter(timeline: TimelineRow[], kind: TimelineRow["kind"], fromDay: string): TimelineRow | null {
  return timeline.find((r) => r.kind === kind && istDay(r.date) >= fromDay) ?? null;
}

/** Best-tier exam-day row on a given IST day, if any. */
export function examRowOnDay(timeline: TimelineRow[], day: string): TimelineRow | null {
  const hits = timeline.filter((r) => r.kind === "EXAM" && istDay(r.date) === day);
  hits.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
  return hits[0] ?? null;
}

export interface NextExam {
  examId: string;
  code: string;
  short: string;
  row: TimelineRow;
}

/** Other active exams in the same category + state with an exam day 7–60
 *  days out, earliest first, one per exam, each with its own tier. */
export async function nextExamsInTrack(meta: ExamMeta, now: Date): Promise<NextExam[]> {
  const rows = await prisma.$queryRaw<(DateRow & { code: string; short: string; officialUrl: string | null })[]>`
    SELECT d.id, d."examId", e.code, e."shortName" AS short, el."officialUrl",
           d.label, d.date, d."isExamDay", d.kind, d.confidence, d.url, d.source, d.notes
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId" AND e.active = TRUE
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE d."archivedAt" IS NULL
      AND (d."isExamDay" = TRUE OR d.kind = 'EXAM')
      AND e.category::text = ${meta.category}
      AND e.state IS NOT DISTINCT FROM ${meta.state}::text
      AND e.id <> ${meta.examId}
      AND d.date >= NOW() + INTERVAL '7 days'
      AND d.date <= NOW() + INTERVAL '60 days'
    ORDER BY d.date ASC
    LIMIT 30`.catch((err) => {
    console.error("[exam-week-mail] next-in-track failed", err);
    return [] as (DateRow & { code: string; short: string; officialUrl: string | null })[];
  });
  const seen = new Set<string>();
  const out: NextExam[] = [];
  for (const r of rows) {
    if (seen.has(r.examId)) continue;
    seen.add(r.examId);
    const row = buildTimeline([r], now, r.officialUrl)[0];
    if (row) out.push({ examId: r.examId, code: r.code, short: r.short, row });
  }
  return out;
}
