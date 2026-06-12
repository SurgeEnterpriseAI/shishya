// Public surface of the student model (psychometrics engine).
//
// IRT (2PL) ability + online item calibration, FSRS spaced-repetition
// scheduling, and CAT max-information item selection. Pure math lives in
// irt/fsrs/select; apply.ts persists one scored attempt's worth of updates.
//
// This replaces the flat WeaknessMap.masteryScore as the *engine*;
// WeaknessMap remains the UI-facing projection.

export {
  pCorrect,
  itemInformation,
  updateOnResponse,
  seedItemFromDifficulty,
  thetaToMastery,
  type ItemParams,
  type AbilityParams,
  type UpdateResult,
} from "./irt";
export {
  initialState,
  review,
  retrievability,
  nextIntervalDays,
  ratingFromAccuracy,
  type MemoryState,
  type Rating,
} from "./fsrs";
export { selectItems, selectAdaptiveSet, type CandidateItem, type SelectOpts } from "./select";
export {
  applyAttemptPsychometrics,
  type ApplyArgs,
  type ApplySummary,
  type ScoredAnswer,
  type QuestionMeta,
} from "./apply";
export { tryCatAdaptiveMock, type CatMockArgs } from "./cat-mock";
