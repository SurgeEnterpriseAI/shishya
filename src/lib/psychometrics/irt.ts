// Item Response Theory (2PL) — the core of the student model.
//
// Each student has a latent ability θ per subject; each question has a
// difficulty b and discrimination a. P(correct) follows the 2PL logistic.
// Both sides update online, Elo-style, after every answer: the student's θ
// moves toward the evidence, and the item's b is calibrated by how real
// students actually perform on it (the data flywheel — at scale the bank
// calibrates itself).
//
// Everything here is pure math — persistence lives in apply.ts.

export interface ItemParams {
  /** Difficulty on the logit scale, roughly -3 (trivial) .. +3 (brutal). */
  b: number;
  /** Discrimination — how sharply the item separates ability levels. */
  a: number;
  /** How many recorded responses this item has (drives calibration K decay). */
  attempts: number;
}

export interface AbilityParams {
  theta: number;
  /** Standard error of θ — starts ~1, shrinks with evidence. */
  se: number;
  attempts: number;
}

/** 2PL probability that a student at ability θ answers the item correctly. */
export function pCorrect(theta: number, item: { a: number; b: number }): number {
  return 1 / (1 + Math.exp(-item.a * (theta - item.b)));
}

/** Fisher information of an item at ability θ (used by CAT selection). */
export function itemInformation(theta: number, item: { a: number; b: number }): number {
  const p = pCorrect(theta, item);
  return item.a * item.a * p * (1 - p);
}

// Learning rates. Student K is larger early (fast convergence from the
// diagnostic) and floors so a student can always move. Item K is smaller —
// items see many students, so they should drift slowly and stably.
const STUDENT_K_MAX = 0.5;
const STUDENT_K_MIN = 0.12;
const ITEM_K_MAX = 0.25;
const ITEM_K_MIN = 0.02;

function studentK(attempts: number): number {
  return Math.max(STUDENT_K_MIN, STUDENT_K_MAX / Math.sqrt(1 + attempts / 10));
}

function itemK(attempts: number): number {
  return Math.max(ITEM_K_MIN, ITEM_K_MAX / Math.sqrt(1 + attempts / 30));
}

export interface UpdateResult {
  ability: AbilityParams;
  item: ItemParams;
  /** Model's pre-update predicted P(correct) — log it for calibration evals. */
  predicted: number;
}

/**
 * Online update after one response. `correct` is the observed outcome.
 * Surprise (observed − predicted) moves both θ and b in opposite directions,
 * scaled by their learning rates and the item's discrimination.
 */
export function updateOnResponse(
  ability: AbilityParams,
  item: ItemParams,
  correct: boolean,
): UpdateResult {
  const predicted = pCorrect(ability.theta, item);
  const surprise = (correct ? 1 : 0) - predicted;

  const kS = studentK(ability.attempts);
  const kI = itemK(item.attempts);

  const newTheta = clamp(ability.theta + kS * item.a * surprise, -4, 4);
  // Item difficulty moves OPPOSITE to the student's surprise: if students
  // keep beating it, it's easier than we thought (b goes down).
  const newB = clamp(item.b - kI * surprise, -4, 4);

  // SE shrinks with information gained from this observation.
  const info = itemInformation(ability.theta, item);
  const newSe = Math.max(0.18, Math.sqrt(1 / (1 / (ability.se * ability.se) + info)));

  return {
    ability: { theta: newTheta, se: newSe, attempts: ability.attempts + 1 },
    item: { b: newB, a: item.a, attempts: item.attempts + 1 },
    predicted,
  };
}

/** Seed an item's difficulty from the content-factory verifier's label. */
export function seedItemFromDifficulty(label: "EASY" | "MEDIUM" | "HARD"): ItemParams {
  const b = label === "EASY" ? -1 : label === "HARD" ? 1 : 0;
  return { b, a: 1, attempts: 0 };
}

/**
 * Project θ onto a 0..1 mastery scale for UI compatibility (WeaknessMap).
 * 0.5 = average ability; ±2 logits ≈ the practical floor/ceiling.
 */
export function thetaToMastery(theta: number): number {
  return clamp(1 / (1 + Math.exp(-theta)), 0.02, 0.98);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
