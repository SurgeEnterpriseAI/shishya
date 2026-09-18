// Exam-night first-party facts for /exams/[code]/live and /reactions
// (13 Sep 2026).
//
// Audit 11 Sep 2026: both pages were empty states on exam night — the
// first REACTIONS summariser attempt is 07:00 IST on D+1 — while their
// titles matched exactly what students search the evening of a paper. The
// pages now LEAD with a deterministic block built here from our own rows,
// and render the model's public-discussion article only below it, and only
// when it clears passesStrictArticleGate:
//
//   • the "how was the paper?" poll — only on an ANNOUNCED (official /
//     reported) exam day, once the first sitting is over (examDayPollOpen)
//     on exam day, that night, inside a window and in the post week
//   • the tally — counts only from n >= VERDICT_MIN_N (publicTally); below
//     the floor nothing but n leaves the server, and the poll itself prints
//     "be among the first"
//   • answer-key / result status from the tracker — every date with its
//     tier word, "not announced yet" when the tracker holds no row, a passed
//     estimate reads "was expected — not confirmed"
//   • OFFICIAL question-paper rows, linked to the conducting body's notice
//   • the score-estimator link ONLY when markingSchemeStatable(exam, the
//     exam-day row in focus) — the same row the estimator page judges
//   • the indicative /cutoff page link, labelled "estimate, not official",
//     only when that page renders (rank bands exist)
//   • the PYQ-pattern link ("modelled on", never "real questions"), the
//     full-length pattern paper (only when the sitting is the stored
//     pattern's stage — fullPaperFitsSitting, 16 Sep 2026), the next stage
//     with its tier, the alert box
//
// No "last declared cutoff" line (review, 13 Sep 2026). The only per-result
// cutoff text we hold is ExamResult.cutoffNote, which the results extractor
// writes as "1-2 honest sentences on cutoff expectation"
// (src/lib/results-extract.ts) — a model summary of a news item, not a
// declared figure. A word filter cannot turn that into an official number:
// "the General cutoff should be in the 140-150 range" and "Candidates who
// qualify Tier 2 will be called for document verification" both passed one
// and were printed as "Last declared cutoff … (official)". So it is not
// read, not printed, not named in the tagline / <title> and not in the share
// text. A typed, sourced cutoff field is the prerequisite for that line.
//
// Dates: every date carries its tier word (datedWithTier) and its year when
// the row is in another calendar year or more than 60 days behind us
// (rowDayLabel) — outside exam week the sitting in focus can be last
// cycle's paper, which must never read as this year's. The multi-day
// window line renders only while neither end of the window is a passed
// estimate; otherwise the exam-day line, which says "was expected — not
// confirmed", stands alone.
//
// No per-student model calls; no model calls at all. The DB reads sit in
// one 2-minute unstable_cache per exam (plus the shared 15-minute tracker
// cache); everything that depends on the clock is computed outside it.
// buildExamNightFacts is pure and unit-tested
// (tests/unit/exam-night-facts*.test.ts).

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import {
  alertCopyPhase,
  computeExamWeekState,
  examDayPollOpen,
  type ExamWeekPhase,
  type ExamWeekState,
} from "@/lib/exam-week";
import {
  buildTimeline,
  focusExamRow,
  PASSED_ESTIMATE_TEXT,
  type SourceTier,
  type TimelineInput,
  type TimelineRow,
} from "@/lib/exam-timeline";
import { getVerdictTally, publicTally, VERDICT_MIN_N, type VerdictTally } from "@/lib/exam-verdict";
import { fillTemplate, tk, type StringKey } from "@/lib/i18n";
import {
  declaredStages,
  fullPaperFitsSitting,
  markingSchemeStatable,
  sittingExamName,
  sittingStageLabel,
} from "@/lib/marking-scheme";
import { passesStrictArticleGate } from "@/lib/phase-article-strict-gate";
import { alertPhase, getExamWeekInputs } from "@/lib/exam-week-inputs";
import {
  datedWithTier,
  phaseArticleMeta,
  rowDayLabel,
  type ExamDayClaim,
  type ExamNightSummary,
  type PhaseArticleMeta,
} from "@/lib/phase-article-copy";

export type ExamNightPhase = "LIVE" | "REACTIONS";

export interface ExamNightExam {
  id: string;
  code: string;
  shortName: string;
  name: string;
  active: boolean;
  totalQuestions: number;
  scoredQuestions: number | null;
  totalMarks: number;
  marksPerQ: number;
  description: string;
}

/** The cached, clock-independent DB reads. */
export interface ExamNightRaw {
  /** Subject names for the hardest-section chips (max 6). */
  subjects: string[];
  /** Latest PYQ-pattern year with its validated question count. */
  pyq: { year: number; count: number } | null;
  /** The exam's system full-length pattern paper, when one exists. */
  fullMockId: string | null;
  /** /exams/[code]/cutoff renders (rank bands exist) — it 404s otherwise. */
  hasCutoffPage: boolean;
  /** Does the ACTIVE article of each phase pass passesStrictArticleGate? */
  strictArticle: Record<ExamNightPhase, boolean>;
}

export interface ExamNightInput extends ExamNightRaw {
  exam: ExamNightExam;
  /** ExamImportantDate rows (archived excluded; untyped rows are ignored). */
  rows: TimelineInput[];
  /** ExamEligibility.officialUrl. */
  officialUrl: string | null;
  /** Raw tally for the poll day, or null. Shaped through publicTally here. */
  tally: VerdictTally | null;
  phase: ExamNightPhase;
}

export interface ExamNightFormat {
  /** Localised tier word ("official" / "रिपोर्टेड" …). */
  tierWord: (tier: SourceTier) => string;
  /** Localised "was expected — not confirmed". */
  passedWord?: string;
  locale?: string;
  now?: Date;
}

/** A tracker row ready to print: the date ALWAYS carries its tier word. */
export interface DatedFact {
  id: string;
  label: string;
  /** IST calendar day "YYYY-MM-DD". */
  day: string;
  /** "13 Sept (official)", "6 Sept (was expected — not confirmed)", or with
   *  the year for a row in another year / long past ("14 Sept 2025 (official)"). */
  dated: string;
  url: string | null;
  official: boolean;
  tier: SourceTier;
  passedEstimate: boolean;
}

export interface ExamNightFactsView {
  state: ExamWeekState;
  /** The exam day the page talks about is announced (official / reported). */
  announced: boolean;
  /** The exam-day row in focus (exam-week focus, else the next / last typed exam day). */
  examDay: DatedFact | null;
  /** The stage the exam day IS when it differs from the stage the exam's
   *  record describes ("Mains" on UPSC Prelims' 21 Aug row), else null —
   *  printed next to the date so the day never reads as this page's stage. */
  examDayStage: string | null;
  /** Multi-day window: from / to day labels and the tier text. Null when
   *  either end is a passed estimate (the exam-day line renders instead). */
  window: { from: string; to: string; tier: string } | null;
  /** Exam day, before the first sitting is over: "all the best" only. */
  pollPending: boolean;
  /** The poll mounts: IST day key + the dated label for its share line. */
  poll: { examDate: string; examDayLabel: string; morning: boolean } | null;
  /** PUBLIC tally (split zeroed below the floor), only when the poll mounts. */
  tally: VerdictTally | null;
  /** n >= VERDICT_MIN_N. */
  tallyShown: boolean;
  /** Hardest-section votes — empty below the floor. */
  hardestSections: { label: string; n: number }[];
  sections: string[];
  /** The answer-key / result status lines render (a typed exam day exists). */
  keyStatus: boolean;
  answerKey: DatedFact | null;
  result: DatedFact | null;
  /** OFFICIAL question-paper rows with a URL, this sitting onwards. */
  questionPapers: DatedFact[];
  nextStage: DatedFact | null;
  /** The score-estimator link may render. */
  estimator: boolean;
  /** The indicative /cutoff page link renders (labelled estimate, not official). */
  hasCutoffPage: boolean;
  pyq: { year: number; count: number; total: number } | null;
  /** The system full-pattern paper — null when the sitting in focus is
   *  another stage than the stored pattern (fullPaperFitsSitting). */
  fullMockId: string | null;
  /** Phase the alert box may act on (expected days never get key copy; an
   *  open-ended window gets the post week's key copy — alertCopyPhase). */
  alertPhase: ExamWeekPhase;
  /** What the page renders, for the tagline / metadata. */
  summary: ExamNightSummary;
}

const DAY_MS = 86_400_000;
/** Same gap computeExamWeekState uses to separate stages. */
const STAGE_GAP_DAYS = 14;

const POLL_PHASES: ReadonlySet<ExamWeekPhase> = new Set<ExamWeekPhase>(["today-pm", "window", "post"]);

function dayDiff(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(toDay + "T00:00:00Z") - Date.parse(fromDay + "T00:00:00Z")) / DAY_MS);
}

/**
 * May the poll mount now, and for which day? Mirrors ExamWeekBlock: never
 * on an expected-tier day; on exam day once the first sitting is over
 * (examDayPollOpen); that night, inside a multi-day window and in the
 * post week. Null otherwise.
 */
export function examNightPollDay(
  state: ExamWeekState,
  now: Date = new Date(),
): { day: string; morning: boolean } | null {
  if (!state.focus || !state.focusDay) return null;
  if (state.tier == null || state.tier === "expected") return null;
  if (state.phase === "today-am") return examDayPollOpen(state, now) ? { day: state.focusDay, morning: true } : null;
  return POLL_PHASES.has(state.phase) ? { day: state.focusDay, morning: false } : null;
}

// ── The shaping ───────────────────────────────────────────────────────

export function buildExamNightFacts(input: ExamNightInput, fmt: ExamNightFormat): ExamNightFactsView {
  const now = fmt.now ?? new Date();
  const locale = fmt.locale ?? "en";
  const passedWord = fmt.passedWord ?? PASSED_ESTIMATE_TEXT;
  const typed = input.rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
  const state = computeExamWeekState(typed, input.officialUrl, now);
  const timeline = buildTimeline(typed, now, input.officialUrl);

  const fact = (r: TimelineRow): DatedFact => ({
    id: r.id,
    label: r.label,
    day: r.day,
    dated: datedWithTier(r, fmt.tierWord(r.tier), passedWord, locale),
    url: r.url,
    official: r.official,
    tier: r.tier,
    passedEstimate: r.passedEstimate,
  });

  // The sitting in question: the exam-week focus, else the next / most
  // recent typed exam day — the same row the score-estimate page judges.
  const anchor = state.focus ?? focusExamRow(timeline);
  const announced = !!anchor && anchor.tier !== "expected";
  const startDay = state.windowDays[0]?.day ?? anchor?.day ?? null;
  const endDay = state.windowEnd?.day ?? anchor?.day ?? null;

  // Answer key / result: exactly the state machine's rows inside exam week;
  // outside it, the same rule (first row of the kind on/after the sitting).
  const firstOfKind = (kind: "ANSWER_KEY" | "RESULT") =>
    startDay ? (timeline.find((r) => r.kind === kind && r.day >= startDay) ?? null) : null;
  const answerKeyRow = state.phase !== "none" ? state.answerKey : firstOfKind("ANSWER_KEY");
  const resultRow = state.phase !== "none" ? state.result : firstOfKind("RESULT");
  const nextStageRow =
    state.phase !== "none"
      ? state.nextStage
      : endDay
        ? (timeline.find((r) => r.kind === "EXAM" && dayDiff(endDay, r.day) > STAGE_GAP_DAYS) ?? null)
        : null;

  // Question papers: OFFICIAL rows only (the conducting body's own site),
  // with a link, from this sitting on.
  const questionPapers = timeline
    .filter((r) => r.kind === "QUESTION_PAPER" && r.tier === "official" && !!r.url && (!startDay || r.day >= startDay))
    .map(fact);

  // Multi-day window line. Its template ("{from} to {to} ({tier})") prints
  // bare tier words, which would call a gone expected day "(expected)" — so
  // it renders only while NEITHER end is a passed estimate (announced
  // windows, or an expected window still ahead). Otherwise the exam-day
  // line, dated "was expected — not confirmed", stands alone.
  const days = state.windowDays;
  const distinct = new Set(days.map((r) => r.day));
  const windowFirst = days[0] ?? null;
  const windowLast = state.windowEnd ?? days[days.length - 1] ?? null;
  const windowView =
    distinct.size > 1 && windowFirst && windowLast && !windowFirst.passedEstimate && !windowLast.passedEstimate
      ? {
          from: rowDayLabel(windowFirst, locale),
          to: rowDayLabel(windowLast, locale),
          tier:
            windowFirst.tier === windowLast.tier
              ? fmt.tierWord(windowLast.tier)
              : `${fmt.tierWord(windowFirst.tier)} / ${fmt.tierWord(windowLast.tier)}`,
        }
      : null;

  // Poll + tally (floor).
  const pollDay = examNightPollDay(state, now);
  const poll =
    pollDay && state.focus
      ? {
          examDate: pollDay.day,
          examDayLabel: datedWithTier(state.focus, fmt.tierWord(state.focus.tier), passedWord, locale),
          morning: pollDay.morning,
        }
      : null;
  const pollPending = !poll && state.phase === "today-am" && announced;
  const tally = poll ? publicTally(input.tally ?? { n: 0, easy: 0, moderate: 0, tough: 0, sections: [] }) : null;
  const tallyShown = !!tally && tally.n >= VERDICT_MIN_N;

  // Estimator: only when ONE marking scheme can be stated for the sitting.
  const { exam } = input;
  const estimator =
    !!anchor &&
    markingSchemeStatable(
      {
        totalQuestions: exam.totalQuestions,
        scoredQuestions: exam.scoredQuestions,
        totalMarks: exam.totalMarks,
        marksPerQ: exam.marksPerQ,
        description: exam.description,
        code: exam.code,
        name: exam.name,
        shortName: exam.shortName,
      },
      { rowLabel: anchor.label, rowDate: anchor.date },
    );

  const pyq = input.pyq && input.pyq.count > 0 ? { ...input.pyq, total: exam.totalQuestions } : null;
  const hasCutoffPage = input.hasCutoffPage && exam.active;
  const nextStage = nextStageRow ? fact(nextStageRow) : null;

  return {
    state,
    announced,
    examDay: anchor ? fact(anchor) : null,
    examDayStage: anchor ? sittingStageLabel(exam, anchor.label) : null,
    window: windowView,
    pollPending,
    poll,
    tally,
    tallyShown,
    hardestSections: tallyShown && tally ? tally.sections : [],
    sections: input.subjects,
    keyStatus: !!anchor,
    answerKey: answerKeyRow ? fact(answerKeyRow) : null,
    result: resultRow ? fact(resultRow) : null,
    questionPapers,
    nextStage,
    estimator,
    hasCutoffPage,
    pyq,
    // The real-pattern paper follows the STORED pattern: not for a sitting
    // of another stage (16 Sep 2026: /exams/LA_LPSC/live, UPSC_PRELIMS and
    // IBPS_PO offered the Prelims paper for a Mains row, in every phase).
    fullMockId: input.fullMockId && fullPaperFitsSitting(exam, anchor) ? input.fullMockId : null,
    alertPhase: alertCopyPhase(alertPhase(state), state),
    summary: {
      poll: !!poll,
      tally: tallyShown,
      keyStatus: !!anchor,
      questionPaper: questionPapers.length > 0,
      cutoffEstimate: hasCutoffPage,
      estimator,
      pyq: !!pyq,
      nextStage: !!nextStage,
      article: input.strictArticle[input.phase],
    },
  };
}

/** WhatsApp / copy text for the block's share control — names only what
 *  the page renders, and never a cutoff. English unless the caller passes
 *  the reader's translator (16 Sep 2026: a Hindi reader's forward to a
 *  Hindi group was an English sentence); ShareExamButton's own chrome is
 *  still English. The date carries the sitting's stage when it is another
 *  stage's day, as the block does (16 Sep 2026: "UPSC Prelims (21 Aug
 *  (official) Mains)", not a bare Mains date under a Prelims name). */
export function examNightShareMessage(
  examShort: string,
  facts: Pick<ExamNightFactsView, "examDay" | "summary"> & Partial<Pick<ExamNightFactsView, "examDayStage">>,
  t: (key: StringKey) => string = (key) => tk(key, "en"),
): string {
  const s = facts.summary;
  const parts: string[] = [];
  if (s.poll) parts.push(t("ew.night.share.poll"));
  if (s.keyStatus) parts.push(t("ew.night.share.key"));
  if (parts.length === 0) parts.push(t("ew.night.share.default"));
  const joined = parts.join(", ");
  if (!facts.examDay) return fillTemplate(t("ew.night.share.line"), { exam: examShort, parts: joined });
  const when = `${facts.examDay.dated}${facts.examDayStage ? ` ${facts.examDayStage}` : ""}`;
  return fillTemplate(t("ew.night.share.lineDated"), { exam: examShort, when, parts: joined });
}

/**
 * The /live and /reactions <title> / description claim, stage-aware (16 Sep
 * 2026). examDayClaim names the exam-week focus row's date as "the {exam}
 * paper", so /exams/UPSC_PRELIMS/live read "UPSC Prelims exam day — 21 Aug
 * (official) paper" while 21 Aug is "Mains exam begins", and IBPS PO's 4 Oct
 * row is Mains too. When the row's stage differs from the exam record's, the
 * date keeps its tier word and gains the row's stage ("21 Aug (official)
 * Mains"). The "today" / "held" claims drop only when the SHORT name itself
 * names a stage ("UPSC Prelims" is neither being held nor done on a Mains
 * day). A short name without one ("IBPS PO", "MPSC Rajyaseva") is true of
 * the Mains day as well, so "IBPS PO exam today" stays (review, 16 Sep 2026).
 */
export function stageAwareClaim(
  exam: { code?: string | null; name?: string | null; shortName?: string | null },
  claim: ExamDayClaim,
): ExamDayClaim {
  const stage = claim.row ? sittingStageLabel(exam, claim.row.label) : null;
  if (!stage) return claim;
  const dated = claim.dated ? `${claim.dated} ${stage}` : null;
  if (declaredStages(exam.shortName).size === 0) return { ...claim, dated };
  return { ...claim, dated, live: false, held: false };
}

/**
 * The /live and /reactions <title> / description, stage-aware (16 Sep 2026).
 * Title and og from stageAwareClaim. The description names the exam in
 * FULL, and Exam.name carries the record's stage ("IBPS Probationary
 * Officer (Prelims)"), so on another stage's day it gets the re-staged name
 * and the plain date: "IBPS Probationary Officer (Mains) is being held
 * today, 4 Oct (reported)" — never "(Prelims) is being held today", never
 * "Mains" twice.
 */
export function stageAwarePhaseMeta(
  phase: "LIVE" | "REACTIONS",
  exam: { code?: string | null; name: string; shortName: string },
  claim: ExamDayClaim,
  summary: ExamNightSummary,
): PhaseArticleMeta {
  const staged = stageAwareClaim(exam, claim);
  const meta = phaseArticleMeta(phase, exam, staged, summary);
  if (staged === claim || !claim.row) return meta;
  const name = sittingExamName(exam, claim.row.label);
  if (!name || name === exam.name) return meta;
  const described = phaseArticleMeta(phase, { shortName: exam.shortName, name }, { ...staged, dated: claim.dated }, summary);
  return { ...meta, description: described.description };
}

// ── DB loader ─────────────────────────────────────────────────────────

/** Exam row the block needs, by code. Null when unknown. */
export async function loadExamNightExam(code: string): Promise<ExamNightExam | null> {
  return prisma.exam
    .findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        shortName: true,
        name: true,
        active: true,
        totalQuestions: true,
        scoredQuestions: true,
        totalMarks: true,
        marksPerQ: true,
        description: true,
      },
    })
    .catch(() => null);
}

const loadExamNightRaw = unstable_cache(
  async (examId: string, shortName: string, name: string): Promise<ExamNightRaw> => {
    const [subjects, pyqRows, fullMock, bands, articles] = await Promise.all([
      prisma.subject
        .findMany({ where: { examId }, orderBy: { orderIdx: "asc" }, select: { name: true }, take: 6 })
        .then((s) => s.map((x) => x.name.trim()).filter(Boolean))
        .catch(() => [] as string[]),
      prisma
        .$queryRaw<{ year: number; n: number }[]>`
          SELECT "pyqYear" AS year, COUNT(*)::int AS n
          FROM "Question"
          WHERE "examId" = ${examId} AND source = 'PYQ' AND validated = TRUE AND "pyqYear" IS NOT NULL
          GROUP BY "pyqYear"
          ORDER BY "pyqYear" DESC
          LIMIT 1`
        .catch(() => [] as { year: number; n: number }[]),
      prisma.mock
        .findFirst({
          where: { examId, userId: null, generatedBy: { startsWith: "system:full-pattern" } },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
        .catch(() => null),
      prisma.examRankBand.count({ where: { examId, archivedAt: null } }).catch(() => 0),
      prisma.examPhaseArticle
        .findMany({
          where: { examId, phase: { in: ["LIVE", "REACTIONS"] }, archivedAt: null },
          orderBy: { lastUpdatedAt: "desc" },
          select: { phase: true, bodyMarkdown: true, sourcesScraped: true },
        })
        .catch(() => [] as { phase: string; bodyMarkdown: string; sourcesScraped: unknown }[]),
    ]);
    // The newest active row per phase — the one PhaseArticleView renders.
    const strict = (phase: ExamNightPhase) => {
      const a = articles.find((x) => x.phase === phase);
      return !!a && passesStrictArticleGate(a, { shortName, name });
    };
    const top = pyqRows[0];
    return {
      subjects,
      pyq: top ? { year: Number(top.year), count: Number(top.n) } : null,
      fullMockId: fullMock?.id ?? null,
      hasCutoffPage: bands > 0,
      strictArticle: { LIVE: strict("LIVE"), REACTIONS: strict("REACTIONS") },
    };
  },
  // v2: the cutoff-note read was removed from the cached shape.
  ["exam-night-facts-v2"],
  { revalidate: 120, tags: ["exam-shared"] },
);

// Two minutes, like the cutoff page's tally cache: the count only shows
// from n >= 10, and exam-night landers must not each hit the poll table.
const loadExamNightTally = unstable_cache(
  (examId: string, day: string) => getVerdictTally(examId, day),
  ["exam-night-tally-v1"],
  { revalidate: 120 },
);

/** Everything the block renders, for one exam and page. */
export async function loadExamNightFacts(
  exam: ExamNightExam,
  phase: ExamNightPhase,
  fmt: ExamNightFormat,
): Promise<ExamNightFactsView> {
  const now = fmt.now ?? new Date();
  const [inputs, raw] = await Promise.all([
    getExamWeekInputs(exam.id),
    loadExamNightRaw(exam.id, exam.shortName, exam.name),
  ]);
  const pollDay = examNightPollDay(computeExamWeekState(inputs.rows, inputs.officialUrl, now), now);
  const tally = pollDay ? await loadExamNightTally(exam.id, pollDay.day).catch(() => null) : null;
  return buildExamNightFacts(
    { ...raw, exam, rows: inputs.rows, officialUrl: inputs.officialUrl, tally, phase },
    { ...fmt, now },
  );
}
