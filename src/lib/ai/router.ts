// Model router — picks the right Claude tier per task.
//
// Cost is not the primary driver here: the point is to use a stronger model
// where correctness matters (verification, hard-problem solving) and a faster
// one where the task is mechanical (tagging, classification, translation).
// The verification firewall depends on the *verifier* being at least as
// capable as the *generator* — keep `strong` >= `standard` in capability.
//
// All ids are env-overridable so ops can pin/upgrade models without a deploy.

export const MODELS = {
  /** High-volume, mechanical work: tagging, difficulty labels, translation, classification. */
  fast: process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-4-5-20251001",
  /** Default tier: tutoring, explanation, first-pass question generation. */
  standard: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929",
  /** Verification firewall + hard-problem solving — checks the standard tier's work. */
  strong: process.env.ANTHROPIC_MODEL_STRONG ?? "claude-opus-4-8",
} as const;

export type ModelTier = keyof typeof MODELS;

/** Map a pipeline task to a tier. Centralised so policy lives in one place. */
export const TASK_TIER: Record<string, ModelTier> = {
  generate: "standard",
  solve: "strong", // blind solver should be strong so it can catch the generator
  verify: "strong", // adjudicator — the firewall
  calibrate: "fast",
  tag: "fast",
  translate: "fast",
  tutor: "standard",
  explain: "standard",
};

export function modelFor(task: keyof typeof TASK_TIER): string {
  return MODELS[TASK_TIER[task] ?? "standard"];
}
