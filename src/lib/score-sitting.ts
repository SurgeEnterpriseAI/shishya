// Which sitting a score estimate is about, and whether ONE marking scheme
// can be stated for it (14 Sep 2026). Moved out of
// /exams/[code]/score-estimate so the score-entry API applies exactly the
// same gate as the page; the reasoning behind the gate is in
// src/lib/marking-scheme.ts.

import { computeExamWeekState } from "@/lib/exam-week";
import { buildTimeline, focusExamRow, type TimelineRow } from "@/lib/exam-timeline";
import type { ExamWeekInputs } from "@/lib/exam-week-inputs";
import { markingSchemeVerdict, type MarkingSchemeInput, type MarkingSchemeVerdict } from "@/lib/marking-scheme";

/** An official answer key keeps "where do I stand" open this long after it is published. */
export const ANSWER_KEY_FRESH_DAYS = 45;

/**
 * The sitting the page talks about — the exam-week focus row (inside the
 * ±7-day window) or else the next / just-held typed exam day on the
 * tracker — and whether the stored marking scheme can be stated for it.
 * Shared by generateMetadata and the page so the <title> can never promise
 * a calculator the body refuses.
 */
export function sittingVerdict(exam: MarkingSchemeInput, inputs: ExamWeekInputs, now: Date = new Date()) {
  const state = computeExamWeekState(inputs.rows, inputs.officialUrl, now);
  const typed = inputs.rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
  const sitting = state.focus ?? focusExamRow(buildTimeline(typed, now, inputs.officialUrl));
  const verdict = markingSchemeVerdict(exam, { rowLabel: sitting?.label, rowDate: sitting?.date });
  return { state, sitting, verdict };
}

/**
 * The sitting candidates can compare scores for RIGHT NOW, or null:
 *   • from the evening of the exam through the post-exam week, the exam
 *     day in focus; or
 *   • once that window has closed, the latest held exam day — but only
 *     while an OFFICIAL answer key published on or after it is under
 *     ANSWER_KEY_FRESH_DAYS old (the moment candidates actually count).
 * The marking scheme must be statable for that sitting's own stage label,
 * otherwise scores could not be compared honestly and there is no list.
 */
export function standingSitting(
  exam: MarkingSchemeInput,
  inputs: ExamWeekInputs,
  now: Date = new Date(),
): { row: TimelineRow; verdict: MarkingSchemeVerdict } | null {
  const state = computeExamWeekState(inputs.rows, inputs.officialUrl, now);
  let row: TimelineRow | null = null;
  if (state.focus && (state.phase === "today-pm" || state.phase === "window" || state.phase === "post")) {
    row = state.focus;
  } else {
    const typed = inputs.rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
    const timeline = buildTimeline(typed, now, inputs.officialUrl);
    const held = timeline.filter((r) => r.kind === "EXAM" && r.status === "done");
    const last = held[held.length - 1] ?? null;
    const t = now.getTime();
    const freshKey =
      last !== null &&
      timeline.some(
        (r) =>
          r.kind === "ANSWER_KEY" &&
          r.tier === "official" &&
          r.date.getTime() >= last.date.getTime() &&
          r.date.getTime() <= t &&
          t - r.date.getTime() <= ANSWER_KEY_FRESH_DAYS * 86_400_000,
      );
    row = freshKey ? last : null;
  }
  if (!row) return null;
  const verdict = markingSchemeVerdict(exam, { rowLabel: row.label, rowDate: row.date });
  return verdict.ok ? { row, verdict } : null;
}
