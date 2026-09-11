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

import { computeExamWeekState, dateWithTier } from "@/lib/exam-week";
import { buildTimeline, type SourceTier, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import { tk, type StringKey } from "@/lib/i18n";

const TIER_KEY: Record<SourceTier, StringKey> = {
  official: "ew.tier.official",
  reported: "ew.tier.reported",
  expected: "ew.tier.expected",
};

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
    dated: row ? dateWithTier(row, tk(TIER_KEY[row.tier])) : null,
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

export function phaseArticleCopy(phase: ArticlePhase, examShort: string, claim: ExamDayClaim): PhaseArticleCopy {
  const s = examShort;
  const paper = claim.dated ? `the ${s} paper on ${claim.dated}` : `${s}`;
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

export interface PhaseArticleMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
}

/** <title> / description for the /live and /reactions routes — same
 *  honesty rule as the tagline: "today" / "done" only when the tracker
 *  says so on an announced date; otherwise the dated paper. */
export function phaseArticleMeta(phase: ArticlePhase, exam: { shortName: string; name: string }, claim: ExamDayClaim): PhaseArticleMeta {
  const s = exam.shortName;
  const paper = claim.dated ? ` — ${claim.dated} paper` : "";
  if (phase === "LIVE") {
    return claim.live
      ? {
          title: `${s} live analysis today — difficulty, shift-wise, answer key | Shishya`,
          description: `Live ${exam.name} coverage today (${claim.dated}) — students' first reactions and shift-by-shift difficulty, compiled from public discussion during the exam window.`,
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
    ogDescription: `Last-mile revision for ${exam.name}. Free, verified, in your language.`,
  };
}
