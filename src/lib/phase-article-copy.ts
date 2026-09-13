// Phase-article page copy that only claims what the tracker supports
// (6 Sep 2026 review: /live said "{exam} is happening today" and
// /reactions said "{exam} is done" on every day of the year, and a stale
// placeholder row once gave CDS a false "live today" page).
//
// examDayClaim() reads the shared exam-week state machine (typed rows +
// the exam's official portal) and reduces it to the three things the
// copy may assert: the paper is being held today (live), the paper has
// been held (held), or the exam is in its run-up week (runUp) — each ONLY
// on an announced (official / reported) date. Everything else falls back
// to the dated form "the {date (tier)} paper", and to a neutral line when
// the tracker holds no typed exam day at all. Pure, no DB; the page
// routes and PhaseArticleView share it so the <title> and the tagline can
// never disagree.
//
// Exam night (13 Sep 2026): /live and /reactions now LEAD with the
// first-party block from src/lib/exam-night-facts.ts (poll, tally from
// n >= 10, answer-key / result status, official question paper, indicative
// cutoff page link, estimator, PYQ-pattern link, next stage, alerts) and
// render the public-discussion article only below it, when it passes the
// strict gate. Those routes pass an ExamNightSummary — what the page
// ACTUALLY renders — and the tagline / title / description name exactly
// those things and nothing else ("rate the paper in one tap" only when the
// poll mounts, "shift-wise analysis" only when the article renders). No
// copy here names a "declared" or "official" cutoff: the page prints none
// (ExamResult.cutoffNote is a model-written expectation, review 13 Sep
// 2026). Without a summary the older copy is returned unchanged.
//
// A passed estimate (an expected-tier exam day already behind us) is dated
// "{day} (was expected — not confirmed)", never "(expected)" as if still
// to come (founder rule, 11 Sep 2026). A row in another calendar year, or
// more than 60 days behind us, carries its year ("14 Sept 2025 (official)")
// so last cycle's sitting never reads as this year's paper.

import { computeExamWeekState } from "@/lib/exam-week";
import { buildTimeline, type SourceTier, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import { tk, type StringKey } from "@/lib/i18n";

const TIER_KEY: Record<SourceTier, StringKey> = {
  official: "ew.tier.official",
  reported: "ew.tier.reported",
  expected: "ew.tier.expected",
};

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
/** A row further behind today than this prints its year. */
export const DATE_YEAR_AFTER_PAST_DAYS = 60;

/**
 * Day label of a tracker row in IST — "13 Sept", the same format as
 * exam-week's dateWithTier — plus the year when the row's IST year is not
 * today's, or the row is more than DATE_YEAR_AFTER_PAST_DAYS behind us
 * ("14 Sept 2025", "1 Jun 2026"). Outside exam week the sitting a page talks
 * about can be last cycle's; without the year it reads as the next one.
 * "Today" is derived from the row's own daysFromToday, so the label follows
 * the clock the timeline was built with (tests pass a fixed now).
 */
export function rowDayLabel(row: Pick<TimelineRow, "date" | "daysFromToday">, locale: string = "en"): string {
  const ist = new Date(row.date.getTime() + IST_OFFSET_MS);
  const todayYear = new Date(ist.getTime() - row.daysFromToday * DAY_MS).getUTCFullYear();
  const withYear = ist.getUTCFullYear() !== todayYear || row.daysFromToday < -DATE_YEAR_AFTER_PAST_DAYS;
  return ist.toLocaleDateString(locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  });
}

/** "13 Sept (official)" — or, for a passed estimate, "6 Sept (was expected
 *  — not confirmed)"; with the year per rowDayLabel. Callers supply the
 *  localised tier / passed words. */
export function datedWithTier(row: TimelineRow, tierWord: string, passedWord: string, locale: string = "en"): string {
  return `${rowDayLabel(row, locale)} (${row.passedEstimate ? passedWord : tierWord})`;
}

export type ArticlePhase = "CHECKLIST" | "LIVE" | "REACTIONS";

export interface ExamDayClaim {
  /** The exam-day row the copy refers to: the exam-week focus, else the
   *  nearest typed exam day (next upcoming, else the most recent). */
  row: TimelineRow | null;
  /** "13 Sep (official)" for `row`, or null. */
  dated: string | null;
  /** The paper is being held today (today-am / today-pm) on an announced date. */
  live: boolean;
  /** The paper has been held (today-pm / post) on an announced date. */
  held: boolean;
  /** Exam day is within the run-up (week / eve), any tier — the date itself carries the tier word. */
  runUp: boolean;
}

export function examDayClaim(rows: TimelineInput[], officialUrl: string | null, now: Date = new Date()): ExamDayClaim {
  const typed = rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
  const state = computeExamWeekState(typed, officialUrl, now);
  let row = state.focus;
  if (!row) {
    const exams = buildTimeline(typed, now, officialUrl).filter((r) => r.kind === "EXAM");
    row = exams.find((r) => r.daysFromToday >= 0) ?? exams[exams.length - 1] ?? null;
  }
  const announced = state.tier != null && state.tier !== "expected";
  return {
    row,
    dated: row ? datedWithTier(row, tk(TIER_KEY[row.tier]), tk("tracker.passedEstimate")) : null,
    // "window" is deliberately in NEITHER claim (review, 6 Sep): a window is
    // any chain of typed exam days ≤14 days apart, so a window day is a day
    // with NO sitting — "{exam} is happening today" is false, and "{exam} is
    // done" is false too while later shifts are still to be sat. Those days
    // fall through to the dated wording ("the {exam} paper on {date (tier)}"),
    // which stays true on every day of the window.
    live: announced && (state.phase === "today-am" || state.phase === "today-pm"),
    held: announced && (state.phase === "today-pm" || state.phase === "post"),
    runUp: state.phase === "week" || state.phase === "eve",
  };
}

/** What the /live or /reactions page renders — built by
 *  buildExamNightFacts (src/lib/exam-night-facts.ts). Every flag gates one
 *  phrase of the copy. */
export interface ExamNightSummary {
  /** The "how was the paper?" poll mounts. */
  poll: boolean;
  /** The tally is shown (n >= 10). */
  tally: boolean;
  /** Answer-key / result status lines from the tracker render. */
  keyStatus: boolean;
  /** An OFFICIAL question-paper row is linked. */
  questionPaper: boolean;
  /** The indicative /cutoff page is linked (labelled estimate, not official).
   *  The only cutoff the copy may name — never a "declared" or "official"
   *  one (ExamResult.cutoffNote is a model-written expectation). */
  cutoffEstimate: boolean;
  /** The score-estimator link renders. */
  estimator: boolean;
  /** The PYQ-pattern link renders. */
  pyq: boolean;
  /** The next stage (with its tier) renders. */
  nextStage: boolean;
  /** The public-discussion article renders below the facts. */
  article: boolean;
}

function listJoin(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Long-form list of what the page holds, for the tagline / descriptions. */
function onThisPage(phase: "LIVE" | "REACTIONS", sm: ExamNightSummary): string[] {
  const parts: string[] = [];
  if (sm.poll) {
    parts.push(sm.tally ? "rate the paper in one tap (no login) and see how other students rated it" : "rate the paper in one tap (no login)");
  }
  if (sm.keyStatus) parts.push("answer-key and result status from the tracker, every date with its source tier");
  if (sm.questionPaper) parts.push("the official question paper");
  if (sm.cutoffEstimate) parts.push("an indicative cutoff estimate (not official)");
  if (sm.estimator) parts.push("a score estimator for when the answer key is out");
  if (sm.nextStage) parts.push("the next stage's date");
  if (sm.pyq) parts.push("PYQ-pattern practice");
  if (sm.article) {
    parts.push(
      phase === "LIVE"
        ? "difficulty and shift-by-shift notes compiled from public student discussion"
        : "student consensus compiled from public discussion after the paper",
    );
  }
  parts.push("free email alerts");
  return parts;
}

/** Short list for <title>: at most three things the page renders. */
function titleParts(phase: "LIVE" | "REACTIONS", sm: ExamNightSummary): string {
  const parts: string[] = [];
  if (sm.poll) parts.push(phase === "LIVE" ? "rate the paper's difficulty" : "rate the paper");
  if (sm.keyStatus) parts.push(phase === "LIVE" ? "answer key status" : "answer key & result status");
  if (sm.article) parts.push(phase === "LIVE" ? "shift-wise analysis" : "student verdict");
  if (sm.questionPaper) parts.push("official question paper");
  if (parts.length === 0) parts.push("dates with source tier", "free alerts");
  return parts.slice(0, 3).join(", ");
}

export interface PhaseArticleCopy {
  /** Pill text; only LIVE swaps it ("Live — exam day" is itself a claim). */
  badge: string;
  badgeColor: string;
  /** Stable section name for breadcrumbs / JSON-LD (never phase-dependent). */
  label: string;
  /** Under the H1. */
  tagline: string;
  /** H1 when no real article exists. */
  fallbackTitle: string;
  /** Body when no real article exists. */
  emptyBody: string;
}

export function phaseArticleCopy(
  phase: ArticlePhase,
  examShort: string,
  claim: ExamDayClaim,
  summary?: ExamNightSummary,
): PhaseArticleCopy {
  const s = examShort;
  const paper = claim.dated ? `the ${s} paper on ${claim.dated}` : `${s}`;
  if (summary && (phase === "LIVE" || phase === "REACTIONS")) return examNightCopy(phase, s, claim, summary);
  if (phase === "LIVE") {
    return {
      badge: claim.live ? "🔴 Live — exam day" : "📝 Exam-day analysis",
      badgeColor: claim.live ? "bg-rose-100 text-rose-900 border-rose-300" : "bg-ink-100 text-ink-800 border-ink-300",
      label: "Live — exam day",
      tagline: claim.live
        ? `${s} is happening today. Live difficulty and shift-by-shift analysis, compiled from public student discussion (Reddit, news, YouTube comments) during the exam window.`
        : `Exam-day coverage for ${paper}: difficulty and shift-by-shift analysis, compiled from public student discussion during the exam window.${claim.dated ? "" : " No typed exam date is on our tracker yet."}`,
      fallbackTitle: claim.live ? `${s} — live exam-day analysis` : `${s} — exam-day analysis${claim.dated ? ` (${claim.dated} paper)` : ""}`,
      emptyBody: `Live coverage for ${s} appears once students step out of the centre and real reactions exist in public discussion — first impressions, difficulty signals, section-wise complaints. Nothing is published before that, and never from fewer than two cited sources.`,
    };
  }
  if (phase === "REACTIONS") {
    return {
      badge: "📊 Post-exam reactions",
      badgeColor: "bg-sky-100 text-sky-900 border-sky-300",
      label: "Post-exam reactions",
      tagline: claim.held
        ? `${s} is done — here's the verdict. Student consensus on difficulty, expected cutoff, answer-key analysis and "did you get Q-34?" threads.`
        : `Post-exam reactions for ${paper}: student consensus on difficulty, expected cutoff and answer-key analysis, compiled from public discussion after the paper.`,
      fallbackTitle: claim.held ? `${s} — post-exam reactions` : `${s} — post-exam reactions${claim.dated ? ` (${claim.dated} paper)` : ""}`,
      emptyBody: `Post-exam analysis for ${s} is compiled from public student discussion after the paper — expected cutoff, difficulty breakdown, answer-key analysis. It appears here once real reactions exist (at least two cited sources), not before.`,
    };
  }
  return {
    badge: "📋 Last-minute checklist",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    label: "Last-minute checklist",
    tagline: claim.runUp && claim.dated
      ? `${s} is on ${claim.dated}. Here's the cheat-sheet to revise — what to carry, last-mile topics, formulae, mock targets.`
      : `Last-minute checklist for ${paper} — what to carry, last-mile topics, formulae, mock targets.`,
    fallbackTitle: `${s} — last-minute checklist${claim.dated ? ` (exam ${claim.dated})` : ""}`,
    emptyBody: `We're putting together the last-minute checklist for ${s}. Check back closer to the exam date — we compile it from the official notice and past papers as the date nears.`,
  };
}

/** Exam-night copy: the lead sentence is the claim (today / held / dated),
 *  the rest names only what the page renders. */
function examNightCopy(phase: "LIVE" | "REACTIONS", s: string, claim: ExamDayClaim, sm: ExamNightSummary): PhaseArticleCopy {
  const noDate = `No typed ${s} exam date is on our tracker yet.`;
  const holds = `On this page: ${listJoin(onThisPage(phase, sm))}.`;
  // With nothing above the article but the facts block, the empty state is
  // not rendered on these routes (hideEmpty); this text is only a fallback.
  const emptyBody = `The write-up compiled from public student discussion appears here once it cites at least two real sources and names the ${s} paper.`;
  if (phase === "LIVE") {
    const lead = claim.live ? `${s} is happening today, ${claim.dated}.` : claim.dated ? `The ${s} paper on ${claim.dated}.` : noDate;
    return {
      badge: claim.live ? "🔴 Live — exam day" : "📝 Exam day",
      badgeColor: claim.live ? "bg-rose-100 text-rose-900 border-rose-300" : "bg-ink-100 text-ink-800 border-ink-300",
      label: "Live — exam day",
      tagline: `${lead} ${holds}`,
      fallbackTitle: claim.live ? `${s} — exam day today` : `${s} — exam day${claim.dated ? ` (${claim.dated} paper)` : ""}`,
      emptyBody,
    };
  }
  const reacts = sm.poll || sm.tally || sm.article;
  const lead = claim.held ? `The ${s} paper on ${claim.dated} has been held.` : claim.dated ? `The ${s} paper on ${claim.dated}.` : noDate;
  return {
    badge: reacts ? "📊 Post-exam reactions" : "📊 After the paper",
    badgeColor: "bg-sky-100 text-sky-900 border-sky-300",
    label: "Post-exam reactions",
    tagline: `${lead} ${holds}`,
    fallbackTitle: claim.held ? `${s} — after the ${claim.dated} paper` : `${s} — after the paper${claim.dated ? ` (${claim.dated} paper)` : ""}`,
    emptyBody,
  };
}

export interface PhaseArticleMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
}

/** <title> / description for the /live and /reactions routes — same
 *  honesty rule as the tagline: "today" / "done" only when the tracker
 *  says so on an announced date; otherwise the dated paper. With a summary,
 *  every phrase after the claim is something the page renders. */
export function phaseArticleMeta(
  phase: ArticlePhase,
  exam: { shortName: string; name: string },
  claim: ExamDayClaim,
  summary?: ExamNightSummary,
): PhaseArticleMeta {
  const s = exam.shortName;
  const paper = claim.dated ? ` — ${claim.dated} paper` : "";
  if (summary && (phase === "LIVE" || phase === "REACTIONS")) {
    const holds = listJoin(onThisPage(phase, summary));
    const holdsSentence = `On this page: ${holds}.`;
    if (phase === "LIVE") {
      const head = claim.live ? `${s} exam today` : `${s} exam day${paper}`;
      return {
        title: `${head} — ${titleParts("LIVE", summary)} | Shishya`,
        description: `${claim.live ? `${exam.name} is being held today, ${claim.dated}.` : claim.dated ? `${exam.name}, ${claim.dated} paper.` : `${exam.name} exam day.`} ${holdsSentence}`,
        ogTitle: `${s} — ${claim.live ? "exam today" : `exam day${paper}`}`,
        ogDescription: holdsSentence,
      };
    }
    const head = claim.held ? `${s} after the paper, ${claim.dated}` : `${s} post-exam${paper}`;
    return {
      title: `${head} — ${titleParts("REACTIONS", summary)} | Shishya`,
      description: `${claim.held ? `The ${exam.name} paper on ${claim.dated} has been held.` : claim.dated ? `${exam.name}, ${claim.dated} paper.` : `${exam.name}, after the paper.`} ${holdsSentence}`,
      ogTitle: `${s} — ${claim.held ? "after the paper" : `post-exam${paper}`}`,
      ogDescription: holdsSentence,
    };
  }
  if (phase === "LIVE") {
    return claim.live
      ? {
          title: `${s} live analysis today — difficulty, shift-wise, answer key | Shishya`,
          description: `Live ${exam.name} coverage today, ${claim.dated}: students' first reactions and shift-by-shift difficulty, compiled from public discussion during the exam window.`,
          ogTitle: `${s} — Live exam-day analysis`,
          ogDescription: `Live ${exam.name} difficulty today, shift-by-shift, from public student discussion.`,
        }
      : {
          title: `${s} exam-day analysis${paper} — difficulty, shift-wise, answer key | Shishya`,
          description: `${exam.name} exam-day coverage${claim.dated ? ` for the ${claim.dated} paper` : ""} — students' first reactions and shift-by-shift difficulty, compiled from public discussion during the exam window.`,
          ogTitle: `${s} — Exam-day analysis${paper}`,
          ogDescription: `${exam.name} difficulty, shift-by-shift, from public student discussion during the exam window.`,
        };
  }
  if (phase === "REACTIONS") {
    return claim.held
      ? {
          title: `${s} — student verdict, expected cutoff, answer key | Shishya`,
          description: `What ${exam.name} candidates are saying after the ${claim.dated} paper: difficulty verdict, expected cutoff, answer-key analysis — compiled from public student discussion.`,
          ogTitle: `${s} — Post-exam reactions`,
          ogDescription: `Student verdict, expected cutoff, answer-key analysis for ${exam.name}.`,
        }
      : {
          title: `${s} post-exam reactions${paper} — student verdict, expected cutoff, answer key | Shishya`,
          description: `${exam.name} post-exam reactions${claim.dated ? ` for the ${claim.dated} paper` : ""}: difficulty verdict, expected cutoff, answer-key analysis — compiled from public student discussion after the paper.`,
          ogTitle: `${s} — Post-exam reactions${paper}`,
          ogDescription: `Student verdict, expected cutoff, answer-key analysis for ${exam.name}, once the paper is held.`,
        };
  }
  return {
    title: `${s} last-minute checklist — what to revise, what to carry | Shishya`,
    description: `${claim.runUp && claim.dated ? `${exam.name} is on ${claim.dated}.` : `Last-minute checklist for ${exam.name}${claim.dated ? ` (exam ${claim.dated})` : ""}.`} Last-mile revision topics, formulae sheet, what to carry to the centre, mock-score targets.`,
    ogTitle: `${s} — Last-minute checklist`,
    ogDescription: `Last-mile revision for ${exam.name}. Free, in your language.`,
  };
}
