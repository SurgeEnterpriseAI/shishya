// The tutor entry on the life-stage pages (30 Sep 2026, P1 build 1, spec §5).
//
// P1 adds no chat code: the entry is a seeded link into the general tutor,
// /chat?general=1&seed=… — the same shape src/lib/landing-actions.ts builds
// (its `chat` one-liner is module-private, so the shape is repeated here and
// tests/unit/stage-tutor.test.ts pins it). chat-seed-once already stops a
// seed being sent twice.
//
// Seeds are questions in the student's own voice: no facts, no numbers other
// than class numbers, at most TUTOR_SEED_MAX characters. The tutor explains;
// the line under the button tells the reader to confirm dates and rules on
// the official site.
//
// Children: no tutor entry for a stage that may include Class 1-8 readers
// ("school", and /career-map's "Class 1-8" row, which maps to it), and none
// for any node reached from a Class 1-7 page (ctx.fromClass). Exams and
// careers have their own tutors on their own pages, so they get none here.
//
// P1b (after sign-up wave 2): a `stage` param and a stage-context block for
// the general tutor. Not in builds 1-3.
//
// Pure.

import { findCourseFamily, findStage, findStreamOption, type PathNodeId, type StreamOptionSlug } from "@/data/paths";
import { fillCopy, pathCopy } from "./copy";

export const TUTOR_SEED_MAX = 280;

/** The youngest class whose pages may carry a tutor entry (13+; Class 1-7 never). */
export const TUTOR_MIN_CLASS = 8;

export interface StageTutorContext {
  /** The class of the page the reader came from, when it is a school page. */
  fromClass?: number | null;
  locale?: string | null;
}

/** The general-tutor link for a seed (landing-actions.ts shape). */
export function generalTutorHref(seed: string): string {
  return `/chat?general=1&seed=${encodeURIComponent(seed)}`;
}

/** The student-voice question for a node, or null when the node gets no tutor entry. */
export function stageTutorSeed(id: PathNodeId | string, ctx: StageTutorContext = {}): string | null {
  if (ctx.fromClass != null && ctx.fromClass < TUTOR_MIN_CLASS) return null;
  const copy = pathCopy(ctx.locale).tutor;
  const [kind, ...rest] = id.split(":");
  const key = rest.join(":");
  let seed: string | null = null;
  if (kind === "stage") {
    const stage = findStage(key);
    if (!stage || stage.mayIncludeChildren) return null;
    seed = copy.seedStage[stage.id as keyof typeof copy.seedStage] ?? null;
  } else if (kind === "stream") {
    const option = findStreamOption(key);
    if (!option) return null;
    seed = fillCopy(copy.seedStream, { option: pathCopy(ctx.locale).stream.short[option.slug as StreamOptionSlug] });
  } else if (kind === "course") {
    const family = findCourseFamily(key);
    if (!family) return null;
    seed = fillCopy(copy.seedCourse[family.after], { family: family.name });
  }
  if (!seed) return null;
  return seed.length <= TUTOR_SEED_MAX ? seed : null;
}

/** /chat?general=1&seed=… for a stage, stream option or course family; null
 *  for a child-capable stage, a Class 1-7 context, or any other node. */
export function stageTutorHref(id: PathNodeId | string, ctx: StageTutorContext = {}): string | null {
  const seed = stageTutorSeed(id, ctx);
  return seed ? generalTutorHref(seed) : null;
}

/** Button text and the line under it (spec §5). */
export function stageTutorLabels(locale?: string | null): { button: string; line: string } {
  const t = pathCopy(locale).tutor;
  return { button: t.button, line: t.line };
}
