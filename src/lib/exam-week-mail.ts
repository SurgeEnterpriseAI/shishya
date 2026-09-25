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
import { REAL_EXAM_SQL } from "@/lib/db/exam-scope";
import { tk, type Locale, type StringKey } from "@/lib/i18n";
import { computeExamWeekState, dateWithTier, examRowOrder, isOpenEndedRow, istDay, type ExamWeekState } from "@/lib/exam-week";
import { applyShiftDay } from "@/lib/exam-week-student";
import { buildTimeline, type SourceTier, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import { fullPaperFitsSitting } from "@/lib/marking-scheme";

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
  /** Exam.name — carries the stage the stored pattern describes ("SBI
   *  Probationary Officer (Prelims)"), for fullPaperFitsSitting. */
  name: string;
  category: string;
  state: string | null;
  officialUrl: string | null;
}

export interface ExamBundle {
  meta: ExamMeta;
  rows: DateRow[];
}

/** Active exams + ALL their live tracker rows, keyed by exam id. Rows come
 *  back by date then id (16 Sep 2026) — the row picks themselves are
 *  order-independent (examRowOrder), this only keeps the payload stable. */
// 25 Sep 2026: "active exams" = real exams (src/lib/db/exam-scope.ts) here and
// in every exam-week selection below — school class containers never mail.
export async function loadExamBundles(examIds: string[]): Promise<Map<string, ExamBundle>> {
  const out = new Map<string, ExamBundle>();
  const ids = Array.from(new Set(examIds)).filter(Boolean);
  if (ids.length === 0) return out;
  const metas = await prisma.$queryRaw<ExamMeta[]>`
    SELECT e.id AS "examId", e.code, e."shortName" AS short, e.name, e.category::text AS category, e.state, el."officialUrl"
    FROM "Exam" e
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE ${REAL_EXAM_SQL} AND e.id IN (${Prisma.join(ids)})`.catch((err) => {
    console.error("[exam-week-mail] exam meta failed", err);
    return [] as ExamMeta[];
  });
  for (const m of metas) out.set(m.examId, { meta: m, rows: [] });
  if (out.size === 0) return out;
  const rows = await prisma.$queryRaw<DateRow[]>`
    SELECT id, "examId", label, date, "isExamDay", kind, confidence, url, source, notes
    FROM "ExamImportantDate"
    WHERE "archivedAt" IS NULL AND "examId" IN (${Prisma.join(Array.from(out.keys()))})
    ORDER BY date ASC, id ASC`.catch((err) => {
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

/** /exams/{code}/checklist — since 13 Sep 2026 the page is built from stored
 *  facts for every exam (src/lib/exam-checklist.ts), so it no longer waits
 *  for a cited article. SCHOOL_BOARD containers have no checklist page, and
 *  an unreadable exam row falls back to the hub. */
export async function checklistLink(examId: string, code: string): Promise<{ url: string; isArticle: boolean }> {
  const hub = `https://shishya.in/exams/${code}`;
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { category: true } }).catch(() => null);
  return exam && String(exam.category).toUpperCase() !== "SCHOOL_BOARD"
    ? { url: `${hub}/checklist`, isArticle: true }
    : { url: hub, isArticle: false };
}

/** /mocks/{id} of the exam's system full-pattern paper when one exists,
 *  else the hub (the hub lists whatever mocks the exam has). */
export async function fullPaperLink(examId: string, code: string): Promise<{ url: string; isMock: boolean }> {
  const hub = `https://shishya.in/exams/${code}`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Mock"
    WHERE "examId" = ${examId} AND "userId" IS NULL AND "generatedBy" LIKE 'system:full-pattern%'
    ORDER BY "createdAt" DESC LIMIT 1`.catch(() => [] as { id: string }[]);
  return rows[0] ? { url: `https://shishya.in/mocks/${rows[0].id}`, isMock: true } : { url: hub, isMock: false };
}

// ── "Never name a finished exam" (play 10, wave 2) ────────────────────

export interface ExamDoneState {
  /** true = the exam's last ANNOUNCED exam day (typed rows, official /
   *  reported) is in the past — at most `lookbackDays` ago — and no typed
   *  exam day exists in the next `lookaheadDays`. An expected-tier date
   *  never finishes an exam (an estimate proves nothing happened), and a
   *  last day older than the lookback is a previous cycle, not "just done". */
  done: boolean;
  /** Last exam day of the finished window (null when not done). */
  lastDay: TimelineRow | null;
  /** Days since that last day (IST), null when not done. */
  daysSince: number | null;
}

export function examDoneState(
  rows: TimelineInput[],
  officialUrl: string | null | undefined,
  now: Date,
  opts: { lookbackDays?: number; lookaheadDays?: number } = {},
): ExamDoneState {
  const lookback = opts.lookbackDays ?? 60;
  const lookahead = opts.lookaheadDays ?? 60;
  const typed = rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
  const examDays = buildTimeline(typed, now, officialUrl)
    .filter((r) => r.kind === "EXAM")
    .sort(examRowOrder)
    .map((r) => ({ row: r, day: istDay(r.date) }));
  const NOT_DONE: ExamDoneState = { done: false, lastDay: null, daysSince: null };
  if (examDays.length === 0) return NOT_DONE;
  const today = istDay(now);
  const future = examDays.filter((e) => e.day >= today && dayDiff(today, e.day) <= lookahead);
  if (future.length > 0) return NOT_DONE;
  const past = examDays.filter((e) => e.day < today);
  // Best row of the latest past day (examRowOrder puts it first on its day).
  const lastPastDay = past.length ? past[past.length - 1].day : null;
  const last = past.find((e) => e.day === lastPastDay);
  if (!last || last.row.tier === "expected") return NOT_DONE;
  const daysSince = dayDiff(last.day, today);
  if (daysSince > lookback) return NOT_DONE;
  // An announced start row whose end date is not announced (MP RAEO, 17 Sep
  // 2026) is not a finished exam in the week after it — the same rule the
  // state machine applies (ExamWeekState.openEnded), so a routine mail does
  // not roll a student over to the next exam while shifts may still run.
  const OPEN_END_DAYS = 7;
  if (daysSince <= OPEN_END_DAYS && past.some((e) => e.day === last.day && e.row.tier !== "expected" && isOpenEndedRow(e.row))) {
    return NOT_DONE;
  }
  return { done: true, lastDay: last.row, daysSince };
}

/** "category|state" — the key the next-in-track cache is keyed by. */
export function trackKey(meta: Pick<ExamMeta, "category" | "state">): string {
  return `${meta.category}|${meta.state ?? ""}`;
}

/** The next exam for one student: the earliest candidate they are already
 *  enrolled in, else the earliest in the track, else null. */
export function pickNextInTrack(candidates: NextExam[], enrolledExamIds: Iterable<string>, excludeExamId?: string): NextExam | null {
  const mine = new Set(enrolledExamIds);
  const pool = candidates.filter((c) => c.examId !== excludeExamId);
  return pool.find((c) => mine.has(c.examId)) ?? pool[0] ?? null;
}

/** Which exam a routine mail (win-back, Daily-5, coach morning) may name. */
export type MailExam =
  | { mode: "same"; examId: string; code: string; short: string }
  | { mode: "next"; examId: string; code: string; short: string; when: string; row: TimelineRow; done: { examId: string; code: string; short: string } }
  | { mode: "generic"; done: { examId: string; code: string; short: string } };

/**
 * Resolve the exam a routine mail addresses, from the student's active
 * enrollments (newest first). The newest enrollment whose exam is NOT
 * finished is named as-is. An enrollment created AFTER its exam's last day
 * is next-cycle prep and is named as-is too. When every enrollment is on a
 * finished exam, the mail rolls over to the next exam in the newest one's
 * track (7–60 days out, the student's own enrollments first) with its date
 * and tier word; with no candidate it goes generic (no exam name).
 * `nextInTrack` is called at most once per track per run (caller caches).
 */
export async function resolveMailExam(
  enrollments: { examId: string; code: string; short: string; createdAt: Date }[],
  bundles: Map<string, ExamBundle>,
  now: Date,
  nextInTrack: (meta: ExamMeta) => Promise<NextExam[]>,
): Promise<MailExam | null> {
  if (enrollments.length === 0) return null;
  let newestDone: ExamBundle | null = null;
  for (const en of enrollments) {
    const bundle = bundles.get(en.examId);
    // Unknown exam (inactive / not loaded): nothing says it is finished.
    if (!bundle) return { mode: "same", examId: en.examId, code: en.code, short: en.short };
    const st = examDoneState(bundle.rows, bundle.meta.officialUrl, now);
    const enrolledAfter = st.lastDay ? istDay(en.createdAt) > istDay(st.lastDay.date) : false;
    if (!st.done || enrolledAfter) {
      return { mode: "same", examId: bundle.meta.examId, code: bundle.meta.code, short: bundle.meta.short };
    }
    newestDone = newestDone ?? bundle;
  }
  const done = newestDone!;
  const doneRef = { examId: done.meta.examId, code: done.meta.code, short: done.meta.short };
  const candidates = await nextInTrack(done.meta);
  const next = pickNextInTrack(candidates, enrollments.map((e) => e.examId), done.meta.examId);
  if (!next) return { mode: "generic", done: doneRef };
  return { mode: "next", examId: next.examId, code: next.code, short: next.short, when: whenWithTier(next.row), row: next.row, done: doneRef };
}

// ── Exam-week line for the routine mails (Daily-5, coach morning) ─────

export interface ExamWeekMailLine {
  phase: "week" | "eve";
  daysTo: number;
  tier: SourceTier;
  /** IST day ("YYYY-MM-DD") the line counts to — the student's own shift
   *  day when they picked one, else the window's first day. Callers that
   *  print a countdown of their own (coach-morning reads CoachPlan.examDate)
   *  compare it before printing both, so one mail can never carry two
   *  different exam days. */
  focusDay: string;
  text: string;
  html: string;
}

/**
 * One English line for a mail whose addressed exam is in phase week / eve:
 * "Exam in N days (tier): checklist · full-length paper · no new topics
 * tonight". The checklist link is /exams/{code}/checklist (checklistLink);
 * the paper link is the
 * system full-pattern mock when one exists, else the hub. Null outside
 * week / eve.
 *
 * `studentDay` (Enrollment.shiftDate as "YYYY-MM-DD", or a coach plan's own
 * exam day) re-keys the line on the day THAT student sits the paper —
 * through the same applyShiftDay() the hub block uses (wave 2). Without it
 * a 15 Sep shift inside the 12–25 Sep CGL window would read "exam tomorrow,
 * 12 Sep" on 11 Sep while the hub says 15 Sep. Ignored (base window state
 * kept) when the day is not one of this window's ANNOUNCED exam days.
 */
export async function examWeekMailLine(
  bundle: ExamBundle,
  now: Date,
  studentDay?: string | null,
): Promise<ExamWeekMailLine | null> {
  const { meta, rows } = bundle;
  const state = applyShiftDay(computeExamWeekState(rows, meta.officialUrl, now), studentDay, now);
  if ((state.phase !== "week" && state.phase !== "eve") || !state.focus || state.daysTo == null || !state.focusDay) return null;
  const tier = state.focus.tier;
  // The real-pattern paper only when the sitting is the stored pattern's
  // stage (16 Sep 2026): IBPS PO, MPSC Rajyaseva, GPSC Class 1-2 and MZ PSC
  // students were about to get the Prelims paper in their Mains run-up. The
  // hub fallback prints "practice on the hub".
  const paperFits = fullPaperFitsSitting({ code: meta.code, name: meta.name, shortName: meta.short }, state.focus);
  const [checklist, paper] = await Promise.all([
    checklistLink(meta.examId, meta.code),
    paperFits ? fullPaperLink(meta.examId, meta.code) : Promise.resolve({ url: `https://shishya.in/exams/${meta.code}`, isMock: false }),
  ]);
  const when = state.daysTo === 1 ? "tomorrow" : `in ${state.daysTo} days`;
  const head = `${meta.short} exam ${when}, ${whenWithTier(state.focus)}`;
  const checklistLabel = checklist.isArticle ? "last-minute checklist" : `${meta.short} hub`;
  const paperLabel = paper.isMock ? "full-length paper (real pattern)" : "practice on the hub";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const text = `🎯 ${head}: ${checklistLabel} ${checklist.url} · ${paperLabel} ${paper.url} · no new topics tonight.`;
  const html = `<div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:13px;font-weight:700;margin:0 0 4px;color:#0f172a;">🎯 ${esc(head)}</p>
      <p style="font-size:12px;line-height:1.7;margin:0;color:#334155;">
        📋 <a href="${esc(checklist.url)}" style="color:#c2410c;font-weight:600;text-decoration:none;">${esc(checklistLabel)}</a> ·
        📝 <a href="${esc(paper.url)}" style="color:#c2410c;font-weight:600;text-decoration:none;">${esc(paperLabel)}</a> ·
        😴 no new topics tonight
      </p>
    </div>`;
  return { phase: state.phase, daysTo: state.daysTo, tier, focusDay: state.focusDay, text, html };
}

// ── Shift-day helpers (Enrollment.shiftDate, wave 2) ──────────────────

/** True when `day` (IST "YYYY-MM-DD") lies inside the state's exam window
 *  (first exam day ≤ day ≤ last exam day) and the window is ANNOUNCED
 *  (its first row is official / reported — never an estimate). */
export function windowContainsDay(state: ExamWeekState, day: string): boolean {
  if (state.phase === "none" || state.windowDays.length === 0) return false;
  const days = state.windowDays.map((r) => istDay(r.date)).sort();
  const first = state.windowDays.find((r) => istDay(r.date) === days[0]) ?? state.windowDays[0];
  if (first.tier === "expected") return false;
  return day >= days[0] && day <= days[days.length - 1];
}

/** Tier fragment for a date the STUDENT chose inside an announced window,
 *  e.g. "your shift day, window official" — the window's tier travels with it. */
export function shiftTierWord(windowTier: SourceTier, locale: Locale = "en"): string {
  return `your shift day, window ${tierWord(windowTier, locale)}`;
}

/** First typed EXAM / INTERVIEW row dated strictly after `afterDay` — the
 *  "next stage" a cleared candidate moves to. Null = not announced. */
export function nextStageAfter(timeline: TimelineRow[], afterDay: string): TimelineRow | null {
  return timeline.find((r) => (r.kind === "EXAM" || r.kind === "INTERVIEW") && istDay(r.date) > afterDay) ?? null;
}

/** The tracker's next `n` dated rows on/after `fromDay`, skipping the
 *  exam-day rows of the window itself (those are the exam, not "next"). */
export function nextTrackerRows(timeline: TimelineRow[], fromDay: string, exclude: Iterable<string>, n = 2): TimelineRow[] {
  const skip = new Set(exclude);
  // Never list another EXAM row as "after the exam" — on the coach-plan
  // path (tracker disagrees) that would print a contradicting exam date.
  return timeline.filter((r) => !skip.has(r.id) && r.kind !== "EXAM" && istDay(r.date) >= fromDay).slice(0, n);
}

/** First row of `kind` dated on/after `fromDay`; null when the tracker
 *  has none (callers print "not announced yet"). */
export function rowOnOrAfter(timeline: TimelineRow[], kind: TimelineRow["kind"], fromDay: string): TimelineRow | null {
  return timeline.find((r) => r.kind === kind && istDay(r.date) >= fromDay) ?? null;
}

/** Best exam-day row on a given IST day, if any — tier, then the earliest
 *  first shift, then id (examRowOrder, 16 Sep 2026), so the eve / day-after
 *  mails name the same sitting the hub and the checklist do. */
export function examRowOnDay(timeline: TimelineRow[], day: string): TimelineRow | null {
  const hits = timeline.filter((r) => r.kind === "EXAM" && istDay(r.date) === day);
  hits.sort(examRowOrder);
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
    JOIN "Exam" e ON e.id = d."examId" AND ${REAL_EXAM_SQL}
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

// ── Plan date vs announced date (11 Sep 2026, first real exam weekend) ──
//
// The coach-plan mail paths honoured the student's OWN typed exam date. The
// data said that was wrong: of every coach plan within three days of an
// announced exam day, all eight disagreed in the same direction — the plan
// was one to three days EARLY — and the eve cron mailed "exam tomorrow" on
// the wrong night (an NDA student with plan date 12 Sep got the eve on the
// 11th; the official paper is the 13th). An official or reported tracker
// row beats a typed date. The student's date only stands when the tracker
// holds nothing announced within three days of it.

/** IST "YYYY-MM-DD" of every official/reported EXAM row in a timeline. */
export function announcedExamDays(timeline: TimelineRow[]): string[] {
  return [...new Set(timeline.filter((r) => r.kind === "EXAM" && r.tier !== "expected").map((r) => istDay(r.date)))].sort();
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(day + "T00:00:00Z") + n * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Which coach-plan dates should be treated AS `target`?
 *
 * A plan date's EFFECTIVE day is the nearest announced exam day within `tol`
 * days of it, else the plan date itself. This returns every plan date within
 * ±tol of `target` whose effective day IS `target` — so a mail keyed on
 * "tomorrow" reaches the student whose plan says the 12th when the paper is
 * announced for the 13th, on the 12th's evening, and NOT on the 11th's.
 */
export function acceptedPlanDays(announced: string[], target: string, tol = 3): string[] {
  const out: string[] = [];
  for (let k = -tol; k <= tol; k++) {
    const d = addDays(target, k);
    let best: string | null = null;
    let bestDist = tol + 1;
    for (const a of announced) {
      const dist = Math.abs(dayDiff(d, a));
      if (dist <= tol && dist < bestDist) {
        best = a;
        bestDist = dist;
      }
    }
    if ((best ?? d) === target) out.push(d);
  }
  return out;
}
