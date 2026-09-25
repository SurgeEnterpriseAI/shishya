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
//   • the marking scheme (and the score-estimator link) is printed only
//     when src/lib/marking-scheme.ts can state ONE scheme for the exam-day
//     row in focus (11 Sep 2026) — SBI PO's stored row is the Prelims
//     pattern while its 12 Sep sitting is Mains; CDS scores its papers
//     unequally. For those the block says "not stated" and why.
//   • the cutoff line and the IndexNow /cutoff URL only when the cutoff page
//     renders (16 Sep 2026, src/lib/exam-page-gates.ts): MP_RAEO and KA_KSRP
//     have no rank bands, and the block told answer engines "indicative
//     cutoff (estimate from score bands)" with a link to a 404.
// No model calls anywhere in this file.

import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_WHERE, REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { computeExamWeekState, istDay, type ExamWeekPhase, type ExamWeekState } from "@/lib/exam-week";
import { PASSED_ESTIMATE_TEXT, type TimelineRow } from "@/lib/exam-timeline";
import { markingSchemeVerdict, type MarkingSchemeVerdict } from "@/lib/marking-scheme";
import { sourceHostLabel } from "@/lib/official-source";
import { getVerdictTallyRange, emptyTally, tallyLine, type VerdictTally } from "@/lib/exam-verdict-tally";
import { VERDICT_MIN_N } from "@/lib/exam-verdict";
import { examWeekUrls, phaseArticleUrl, SITE_ORIGIN } from "@/lib/indexnow";
import { isRealArticle, realSourceCount } from "@/lib/phase-article-quality";
import type { ExamPageGates } from "@/lib/exam-page-gates";

/** The Exam row's marking numbers — what markingSchemeVerdict judges. */
export interface ExamWeekScheme {
  totalQuestions: number;
  scoredQuestions: number | null;
  totalMarks: number;
  marksPerQ: number;
  negativeMark: number;
  description: string;
}

export interface ExamWeekExam {
  id: string;
  code: string;
  shortName: string;
  name: string;
  officialUrl: string | null;
  state: ExamWeekState;
  scheme: ExamWeekScheme;
}

/** Can ONE marking scheme be stated for the exam-day row in focus? The
 *  same call the score-estimate page makes, so the AEO block and the page
 *  can never disagree about a sitting. */
export function examWeekSchemeVerdict(ex: ExamWeekExam): MarkingSchemeVerdict {
  return markingSchemeVerdict(
    { ...ex.scheme, code: ex.code, name: ex.name, shortName: ex.shortName },
    { rowLabel: ex.state.focus?.label, rowDate: ex.state.focus?.date },
  );
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
      // 25 Sep 2026: real exams only — exam week is a recruitment /
      // entrance-exam state machine; school class containers never enter it.
      exam: { ...REAL_EXAM_WHERE, ...(opts.examCode ? { code: opts.examCode } : {}) },
    },
    select: { examId: true },
    distinct: ["examId"],
  });
  if (hits.length === 0) return [];
  const ids = hits.map((h) => h.examId);

  const [exams, rows, elig] = await Promise.all([
    prisma.exam.findMany({
      where: { ...NOT_SCHOOL_WHERE, id: { in: ids } },
      select: {
        id: true,
        code: true,
        shortName: true,
        name: true,
        totalQuestions: true,
        scoredQuestions: true,
        totalMarks: true,
        marksPerQ: true,
        negativeMark: true,
        description: true,
      },
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
    out.push({
      id: e.id,
      code: e.code,
      shortName: e.shortName,
      name: e.name,
      officialUrl,
      state,
      scheme: {
        totalQuestions: e.totalQuestions,
        scoredQuestions: e.scoredQuestions,
        totalMarks: e.totalMarks,
        marksPerQ: e.marksPerQ,
        negativeMark: e.negativeMark,
        description: e.description,
      },
    });
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
 *  cutoff (only when `gates.cutoff` — the page 404s without rank bands),
 *  checklist / exam-day / after-the-paper pages, hi/te twins (the caller
 *  gates them — gateTwinUrls), plus any REAL phase-article URL, once. */
export function examWeekIndexNowUrls(
  ex: ExamWeekExam,
  articles: RealPhaseArticle[],
  gates: Pick<ExamPageGates, "cutoff">,
): string[] {
  return [...new Set([...examWeekUrls(ex.code, gates), ...articles.map((a) => phaseArticleUrl(ex.code, a.slug))])];
}

// ── "## Exam week" block (context.md / llms-full.txt) ──────────────────

/** "YYYY-MM-DD (tier — provenance)" — every date leaves with its tier
 *  word; a passed estimate additionally says so (11 Sep 2026): the date
 *  went by and nothing was announced, so it is not a concluded milestone. */
function dateTier(r: TimelineRow): string {
  if (r.tier === "official") return `${r.day} (official — conducting body's notice: ${r.url ?? ""})`;
  if (r.tier === "reported") return `${r.day} (reported — announced, cited via ${sourceHostLabel(r.url ?? "")}: ${r.url ?? ""})`;
  return r.passedEstimate
    ? `${r.day} (expected — estimate from previous cycles, NOT announced; ${PASSED_ESTIMATE_TEXT}: the estimated date has passed and nothing was announced, so do not treat it as having happened)`
    : `${r.day} (expected — estimate from previous cycles, NOT announced)`;
}

const NOT_ANNOUNCED = "not announced yet — the conducting body has not published a date; do not infer one";

/**
 * Body lines of the "## Exam week" block for one exam (the caller adds the
 * heading). English only — consumed by machine-readable files, not pages.
 * `cutoffPage`: the exam's /cutoff renders (exam-page-gates `cutoff`); the
 * cutoff line is printed only when it is exactly `true`, so a caller that
 * does not know (or whose gate read failed) prints no link to a 404.
 */
export function examWeekAeoLines(
  ex: ExamWeekExam,
  opts: { articles?: RealPhaseArticle[]; tally?: VerdictTally | null; now?: Date; site?: string; cutoffPage?: boolean } = {},
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
      // An "expected" date is an estimate — never assert the paper was held.
      L.push(
        s.tier === "expected"
          ? `- Status: expected exam day is today (estimate — the conducting body has not announced it; the paper may not have been held) — ${dateTier(s.focus)}`
          : `- Status: the paper was held today — ${dateTier(s.focus)}`,
      );
      break;
    case "window":
      // An open-ended window (16 Sep 2026, MP RAEO): the start is announced,
      // the end is not — never print a from-to range or "inside the window".
      L.push(
        s.openEnded
          ? `- Status: exam began ${dateTier(first)}; the conducting body has not announced the end date — later shifts may still be running`
          : `- Status: multi-day exam window in progress — ${dateTier(first)} to ${dateTier(last)}; today is inside the window`,
      );
      break;
    case "post": {
      const ago = Math.max(1, Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(last.day + "T00:00:00Z")) / DAY_MS));
      const agoText = `${ago} day${ago === 1 ? "" : "s"} ago`;
      L.push(
        s.tier === "expected"
          ? `- Status: expected exam day was ${agoText} (estimate — not announced; whether the paper was held is unconfirmed) — ${dateTier(last)}`
          : multiDay
            ? `- Status: exam window ended ${agoText} — ${dateTier(first)} to ${dateTier(last)}`
            : `- Status: paper held ${agoText} — ${dateTier(last)}`,
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

  if (opts.cutoffPage === true) {
    L.push(`- Category-wise indicative cutoff (estimate from score bands, NOT official; the official cutoff comes with the result):${site}/exams/${ex.code}/cutoff`);
  }
  // No hi/te suffix (13 Sep 2026, index shape): most tracker twins are
  // English bodies that canonicalise to this URL (src/lib/twin-localisation.ts).
  L.push(
    `- Exam tracker (every milestone with its source tier, free email alerts for official answer key / result): ${site}/exams/${ex.code}/updates`,
  );
  // The three exam-week pages lead with facts built from our own rows
  // (13 Sep 2026: src/lib/exam-checklist.ts, src/lib/exam-night-facts.ts),
  // so every exam-week exam gets them; a REAL public-discussion article on
  // the same page adds its source count.
  const articleNote = (slug: string): string => {
    const a = (opts.articles ?? []).find((x) => x.slug === slug);
    return a
      ? ` — the page also carries an article compiled from public student discussion (${a.sources} cited sources, updated ${a.lastUpdatedAt.toISOString().slice(0, 10)})`
      : "";
  };
  L.push(
    `- Last-minute checklist (exam-day timing with its source tier, what to carry, the marking scheme only when one can be stated for this sitting)${articleNote("checklist")}: ${phaseArticleUrl(ex.code, "checklist")}`,
  );
  L.push(
    `- Exam-day page (the exam day with its source tier, a one-tap "how was the paper?" rating once the paper has started on an announced day, answer-key / result status from the tracker)${articleNote("live")}: ${phaseArticleUrl(ex.code, "live")}`,
  );
  L.push(
    `- After-the-paper page (self-reported difficulty ratings, counts shown only from ${VERDICT_MIN_N} ratings and never a cutoff prediction; answer-key / result status from the tracker)${articleNote("reactions")}: ${phaseArticleUrl(ex.code, "reactions")}`,
  );

  // Marking scheme for THIS sitting (11 Sep 2026). The arithmetic and the
  // estimator link appear only when one scheme can be stated for the
  // exam-day row in focus; otherwise the block says so and why, so an
  // answer engine cannot lift "+1 per correct, −0.25 per wrong" off a
  // Prelims row and hand it to a Mains candidate on exam night.
  const verdict = examWeekSchemeVerdict(ex);
  if (verdict.ok) {
    L.push(
      `- Score estimator (marking-scheme arithmetic from the answer key: correct × ${fmtNum(ex.scheme.marksPerQ)} − wrong × ${fmtNum(ex.scheme.negativeMark)}; nothing stored, no prediction): ${site}/exams/${ex.code}/score-estimate`,
    );
  } else {
    L.push(
      `- Marking scheme for this sitting: not stated — ${verdict.reason} Shishya prints no per-question arithmetic and offers no score estimator for this sitting; take the scheme from the conducting body's notice and do not infer one from the pattern figures.`,
    );
  }

  L.push(
    "- Tier words: official = conducting body's own notice linked · reported = announced, cited via a secondary source · expected = estimate from previous cycles, NOT announced. Cite the tier with the date.",
  );
  return L;
}

/** 1 → "1", 0.333 → "0.33", 0.25 → "0.25". */
function fmtNum(n: number): string {
  return String(Number(n.toFixed(2)));
}
