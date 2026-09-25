// The paper an attempt actually had (25 Sep 2026).
//
// A shared (system) mock can change after students have taken it: a data fix
// swaps a faulty question out at its slot (scripts/tmp-datafix-sbi-q-fix-sep24.ts,
// scripts/tmp-datafix-sysmock-unvalidated-sep25.ts), and a PYQ year page
// re-syncs its mock when that year's validated PYQs change. The results page,
// the result card and "challenge a friend" read the mock's CURRENT
// questionIds, so a past taker's review showed a question they never saw (as
// skipped) and dropped their own answer to the one they had. Probe, 25 Sep:
// 61 of 844 finished attempts on system mocks no longer matched their mock's
// current paper (PYQ year sets that grew or shrank after they were taken,
// and the SBI Clerk swap of 24 Sep).
//
// Two sources of truth, no schema change:
//  1. A graded attempt's `answers` IS its paper. Submit (scoreAttempt) writes
//     one record per question it graded, in paper order, each carrying
//     `correct` and `marks` — every finished attempt on 25 Sep but one
//     ungraded list from May (5,062). When the list is graded, its ids are
//     the paper.
//  2. A slot swap is logged on the mock: config.slotSwaps = [{ slot, from, to,
//     at }]. An attempt that STARTED before the swap and was graded after it
//     (an unfinished attempt submitted later from the time-up screen) was
//     graded with `to` unanswered: it never saw `to`, it had `from`. So
//     `from` is its question there — shown unanswered, which is what the
//     grade counted (the data fix never swaps a slot that an unfinished
//     attempt has answered). A `to` the student did answer was seen, and stays.
// Anything else (an ungraded legacy list) keeps the mock's current order, as
// before.
//
// Pure — no DB. Tests: tests/unit/attempt-paper.test.ts

/** One logged slot swap on a shared mock (Mock.config.slotSwaps). */
export interface SlotSwap {
  /** 0-based index in Mock.questionIds. */
  slot: number;
  /** The question taken out. */
  from: string;
  /** The question put in its place. */
  to: string;
  /** ISO time of the swap. */
  at: string;
  /** Who swapped it (a data-fix tag). */
  by?: string;
}

export const SLOT_SWAPS_KEY = "slotSwaps";

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** The swaps logged on a mock's config — malformed entries are ignored. */
export function readSlotSwaps(config: unknown): SlotSwap[] {
  const raw = isObj(config) ? config[SLOT_SWAPS_KEY] : undefined;
  if (!Array.isArray(raw)) return [];
  const out: SlotSwap[] = [];
  for (const s of raw) {
    if (!isObj(s)) continue;
    const { slot, from, to, at, by } = s;
    if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 0) continue;
    if (typeof from !== "string" || !from || typeof to !== "string" || !to || from === to) continue;
    if (typeof at !== "string" || !Number.isFinite(new Date(at).getTime())) continue;
    out.push(typeof by === "string" ? { slot, from, to, at, by } : { slot, from, to, at });
  }
  return out;
}

/** The mock's config with `add` appended to its swap log (other keys untouched). */
export function withSlotSwaps(config: unknown, add: readonly SlotSwap[]): Record<string, unknown> {
  const base = isObj(config) ? { ...config } : {};
  const prev = Array.isArray(base[SLOT_SWAPS_KEY]) ? (base[SLOT_SWAPS_KEY] as unknown[]) : [];
  base[SLOT_SWAPS_KEY] = [...prev, ...add];
  return base;
}

type AnswerLike = { questionId?: unknown; chosen?: unknown; correct?: unknown; marks?: unknown };

/** True when `answers` is the list submit graded: every record has a question id, `correct` and `marks`. */
export function isGradedAnswerList(answers: unknown): answers is { questionId: string; chosen?: unknown; correct: boolean; marks: number }[] {
  return (
    Array.isArray(answers) &&
    answers.length > 0 &&
    answers.every(
      (a: AnswerLike | null) =>
        !!a && typeof a.questionId === "string" && typeof a.correct === "boolean" && typeof a.marks === "number",
    )
  );
}

function answeredIds(answers: unknown): Set<string> {
  const out = new Set<string>();
  if (!Array.isArray(answers)) return out;
  for (const a of answers as (AnswerLike | null)[]) {
    if (!a || typeof a.questionId !== "string") continue;
    if (typeof a.chosen === "string" && a.chosen.trim() !== "") out.add(a.questionId);
  }
  return out;
}

/**
 * The question ids of the paper this attempt had, in order.
 *   questionIds — the mock's current Mock.questionIds;
 *   answers     — Attempt.answers;
 *   startedAt   — Attempt.startedAt (needed for the swap log);
 *   config      — Mock.config (holds the swap log).
 */
export function attemptPaperIds(input: {
  questionIds: readonly string[];
  answers: unknown;
  startedAt?: Date | string | null;
  config?: unknown;
}): string[] {
  const paper = isGradedAnswerList(input.answers)
    ? input.answers.map((a) => a.questionId)
    : [...input.questionIds];

  const started = input.startedAt == null ? Number.NaN : new Date(input.startedAt).getTime();
  if (!Number.isFinite(started)) return paper;
  const swaps = readSlotSwaps(input.config)
    .filter((s) => new Date(s.at).getTime() > started)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  if (swaps.length === 0) return paper;
  const answered = answeredIds(input.answers);
  // Newest first, so a slot swapped twice walks back to what this attempt had.
  for (const s of swaps) {
    const k = paper.indexOf(s.to);
    if (k < 0 || answered.has(s.to) || paper.includes(s.from)) continue;
    paper[k] = s.from;
  }
  return paper;
}
