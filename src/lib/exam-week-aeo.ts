// Exam Week Mode — the deterministic DB reads behind every NON-page
// surface (6 Sep 2026): the "## Exam week" block in context.md and
// llms-full.txt, the daily IndexNow ?scope=examweek submission, and the
// phase-article cron's candidate list. All of them ask the same question —
// "which exams are inside [-7, +7] days of a TYPED exam-day row, and what
// phase is today in IST?" — and get the answer from the shared state
// machine in src/lib/exam-week.ts, so no surface can drift.
//
// Honesty rules enforced here (founder):
//   • typed rows only (kind IS NOT NULL) — legacy untyped rows never put an
//     exam into exam week (the CDS false "live today" page came from one)
//   • every date printed carries its tier word; answer-key / result read
//     "not announced yet" when the tracker has no row — never a guess
//   • phase articles are linked only when REAL (>= 2 cited sources, not a
//     placeholder — src/lib/phase-article-quality.ts)
//   • the verdict tally line appears only from n >= 10 and is never called
//     a prediction
// No model calls anywhere in this file.

import { prisma } from "@/lib/db/prisma";
import { computeExamWeekState, istDay, type ExamWeekPhase, type ExamWeekState } from "@/lib/exam-week";
import type { TimelineRow } from "@/lib/exam-timeline";
import { sourceHostLabel } from "@/lib/official-source";
import { getVerdictTallyRange, emptyTally, tallyLine, type VerdictTally } from "@/lib/exam-verdict-tally";
import { examWeekUrls, phaseArticleUrl, SITE_ORIGIN } from "@/lib/indexnow";
import { isRealArticle, realSourceCount } from "@/lib/phase-article-quality";

export interface ExamWeekExam {
  id: string;
  code: string;
  shortName: string;
  name: string;
  officialUrl: string | null;
  state: ExamWeekState;
}

export interface RealPhaseArticle {
  slug: string;
  phase: string;
  title: string;
  sources: number;
  lastUpdatedAt: Date;
}

const DAY_MS = 86_400_000;
// SQL pre-filter slack around the state machine's [-7, +7] day window.
const PREFILTER_DAYS = 9;

export const ACTIVE_EXAM_WEEK_PHASES: ReadonlySet<ExamWeekPhase> = new Set<ExamWeekPhase>([
  "week",
  "eve",
  "today-am",
  "today-pm",
  "window",
  "post",
]);

/**
 * Every active exam currently in an exam-week phase (week … post).
 * Pre-filters in SQL to exams with a typed, non-archived EXAM row within
 * ±9 days, then hands ALL of each exam's typed rows to the state machine
 * (it needs the answer-key / result / next-stage rows too).
 */
export async function loadExamWeekExams(opts: { examCode?: string; now?: Date } = {}): Promise<ExamWeekExam[]> {
  const now = opts.now ?? new Date();
  const from = new Date(now.getTime() - PREFILTER_DAYS * DAY_MS);
  const to = new Date(now.getTime() + PREFILTER_DAYS * DAY_MS);

  const hits = await prisma.examImportantDate.findMany({
    where: {
      archivedAt: null,
      kind: "EXAM",
      date: { gte: from, lte: to },
      exam: { active: true, ...(opts.examCode ? { code: opts.examCode } : {}) },
    },
    select: { examId: true },
    distinct: ["examId"],
  });
  if (hits.length === 0) return [];
  const ids = hits.map((h) => h.examId);

  const [exams, rows, elig] = await Promise.all([
    prisma.exam.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, shortName: true, name: true },
    }),
    prisma.examImportantDate.findMany({
      where: { examId: { in: ids }, archivedAt: null, kind: { not: null } },
      select: {
        id: true,
        examId: true,
        label: true,
        date: true,
        isExamDay: true,
        kind: true,
        confidence: true,
        url: true,
        notes: true,
        source: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.examEligibility.findMany({
      where: { examId: { in: ids } },
      select: { examId: true, officialUrl: true },
    }),
  ]);

  const rowsByExam = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = rowsByExam.get(r.examId) ?? [];
    list.push(r);
    rowsByExam.set(r.examId, list);
  }
  const officialByExam = new Map(elig.map((e) => [e.examId, e.officialUrl ?? null]));

  const out: ExamWeekExam[] = [];
  for (const e of exams) {
    const officialUrl = officialByExam.get(e.id) ?? null;
    const state = computeExamWeekState(rowsByExam.get(e.id) ?? [], officialUrl, now);
    if (!ACTIVE_EXAM_WEEK_PHASES.has(state.phase)) continue;
    out.push({ id: e.id, code: e.code, shortName: e.shortName, name: e.name, officialUrl, state });
  }
  out.sort((a, b) => a.code.localeCompare(b.code));
  return out;
}

/** Active phase articles that pass the quality gate, keyed by examId. */
export async function loadRealPhaseArticles(examIds: string[]): Promise<Map<string, RealPhaseArticle[]>> {
  const map = new Map<string, RealPhaseArticle[]>();
  if (examIds.length === 0) return map;
  const arts = await prisma.examPhaseArticle
    .findMany({
      where: { examId: { in: examIds }, archivedAt: null },
      select: { examId: true, slug: true, phase: true, title: true, bodyMarkdown: true, sourcesScraped: true, lastUpdatedAt: true },
      orderBy: { lastUpdatedAt: "desc" },
    })
    .catch(() => []);
  for (const a of arts) {
    if (!isRealArticle(a)) continue;
    const list = map.get(a.examId) ?? [];
    if (list.some((x) => x.slug === a.slug)) continue; // newest active per slug
    list.push({ slug: a.slug, phase: String(a.phase), title: a.title, sources: realSourceCount(a.sourcesScraped), lastUpdatedAt: a.lastUpdatedAt });
    map.set(a.examId, list);
  }
  return map;
}

// The state machine treats exam days <= 14 days apart as ONE window; in the
// post phase it anchors on the last exam day still inside [-7, +7], so the
// earlier days of a long CBT window (SSC-style 12–25 Sep) fall out of
// windowDays. Votes were keyed to whichever focus day was current when
// they were cast, so the tally pools the same 14-day span backwards.
const WINDOW_GAP_DAYS = 14;

function shiftDay(iso: string, days: number): string {
  return new Date(Date.parse(iso + "T00:00:00Z") + days * DAY_MS).toISOString().slice(0, 10);
}

/** Pooled verdict tally over the exam's window (a multi-day window that
 *  is still open also pools today, so a vote cast on a shift day that has
 *  no tracker row of its own still counts). */
export async function loadExamWeekTally(ex: ExamWeekExam, now: Date = new Date()): Promise<VerdictTally> {
  const days = ex.state.windowDays.map((r) => r.day).sort();
  const first = days[0] ?? ex.state.focusDay;
  let to = days[days.length - 1] ?? ex.state.focusDay;
  if (!first || !to) return emptyTally();
  const today = istDay(now);
  if (ex.state.phase === "window" && today > to) to = today;
  return getVerdictTallyRange(ex.id, shiftDay(first, -WINDOW_GAP_DAYS), to);
}

/** URL set to submit to IndexNow for one exam in exam week: hub, tracker,
 *  cutoff, hi/te twins, plus any REAL phase-article URLs. */
export function examWeekIndexNowUrls(ex: ExamWeekExam, articles: RealPhaseArticle[] = []): string[] {
  return [...examWeekUrls(ex.code), ...articles.map((a) => phaseArticleUrl(ex.code, a.slug))];
}

// ── "## Exam week" block (context.md / llms-full.txt) ──────────────────

/** "YYYY-MM-DD (tier — provenance)" — every date leaves with its tier word. */
function dateTier(r: TimelineRow): string {
  if (r.tier === "official") return `${r.day} (official — conducting body's notice: ${r.url ?? ""})`;
  if (r.tier === "reported") return `${r.day} (reported — announced, cited via ${sourceHostLabel(r.url ?? "")}: ${r.url ?? ""})`;
  return `${r.day} (expected — estimate from previous cycles, NOT announced)`;
}

const NOT_ANNOUNCED = "not announced yet — the conducting body has not published a date; do not infer one";

/**
 * Body lines of the "## Exam week" block for one exam (the caller adds the
 * heading). English only — consumed by machine-readable files, not pages.
 */
export function examWeekAeoLines(
  ex: ExamWeekExam,
  opts: { articles?: RealPhaseArticle[]; tally?: VerdictTally | null; now?: Date; site?: string } = {},
): string[] {
  const s = ex.state;
  const site = opts.site ?? SITE_ORIGIN;
  const now = opts.now ?? new Date();
  const today = istDay(now);
  const L: string[] = [];
  if (!s.focus || s.phase === "none") return L;

  const days = s.windowDays.map((r) => r.day).sort();
  const first = s.windowDays.find((r) => r.day === days[0]) ?? s.focus;
  const last = s.windowEnd ?? s.focus;
  const multiDay = days.length > 1 && days[0] !== days[days.length - 1];

  L.push(`- As of: ${today} (IST)`);
  switch (s.phase) {
    case "week":
      L.push(`- Status: exam day is in ${s.daysTo} days — ${dateTier(s.focus)}`);
      break;
    case "eve":
      L.push(`- Status: exam day is tomorrow — ${dateTier(s.focus)}`);
      break;
    case "today-am":
      L.push(`- Status: exam day is today — ${dateTier(s.focus)}`);
      break;
    case "today-pm":
      L.push(`- Status: the paper was held today — ${dateTier(s.focus)}`);
      break;
    case "window":
      L.push(`- Status: multi-day exam window in progress — ${dateTier(first)} to ${dateTier(last)}; today is inside the window`);
      break;
    case "post": {
      const ago = Math.max(1, Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(last.day + "T00:00:00Z")) / DAY_MS));
      L.push(
        multiDay
          ? `- Status: exam window ended ${ago} day${ago === 1 ? "" : "s"} ago — ${dateTier(first)} to ${dateTier(last)}`
          : `- Status: paper held ${ago} day${ago === 1 ? "" : "s"} ago — ${dateTier(last)}`,
      );
      break;
    }
  }
  if (multiDay && s.phase !== "window" && s.phase !== "post") {
    L.push(`- Exam window: ${dateTier(first)} to ${dateTier(last)}`);
  }
  L.push(`- Answer key: ${s.answerKey ? `${s.answerKey.label} — ${dateTier(s.answerKey)}` : NOT_ANNOUNCED}`);
  L.push(`- Result: ${s.result ? `${s.result.label} — ${dateTier(s.result)}` : NOT_ANNOUNCED}`);
  if (s.nextStage) L.push(`- Next stage: ${s.nextStage.label} — ${dateTier(s.nextStage)}`);

  const tl = tallyLine(opts.tally);
  if (tl) {
    L.push(`- ${tl} (self-reported on Shishya after the paper; a mood reading, not a cutoff prediction)`);
    const secs = opts.tally?.sections ?? [];
    if (secs.length) L.push(`- Hardest section (self-reported): ${secs.map((x) => `${x.label} (${x.n})`).join(", ")}`);
  }

  L.push(`- Category-wise cutoff — last cycle's official cutoff + this cycle's expected range: ${site}/exams/${ex.code}/cutoff`);
  L.push(
    `- Exam tracker (every milestone with its source tier, free email alerts for official answer key / result): ${site}/exams/${ex.code}/updates · Hindi: ${site}/hi/exams/${ex.code}/updates · Telugu: ${site}/te/exams/${ex.code}/updates`,
  );
  for (const a of opts.articles ?? []) {
    const what =
      a.slug === "checklist"
        ? "Last-minute checklist"
        : a.slug === "live"
          ? "Exam-day paper analysis (from public student discussion)"
          : a.slug === "reactions"
            ? "Student verdict & expected cutoff (from public student discussion)"
            : a.title;
    L.push(`- ${what} — ${a.sources} cited sources, updated ${a.lastUpdatedAt.toISOString().slice(0, 10)}: ${phaseArticleUrl(ex.code, a.slug)}`);
  }
  L.push(
    "- Tier words: official = conducting body's own notice linked · reported = announced, cited via a secondary source · expected = estimate from previous cycles, NOT announced. Cite the tier with the date.",
  );
  return L;
}
