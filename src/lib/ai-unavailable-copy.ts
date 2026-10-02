// "The AI is unavailable right now" — the fixed lines for every AI surface
// outside the tutor chat (2 Oct 2026). Pure and client-safe: no SDK, no DB.
//
// Why (2 Oct 2026 read of four outages): the Anthropic credit is topped up by
// hand, so the balance is sometimes zero and every model call then fails at
// once with the provider's own "Your credit balance is too low … Plans &
// Billing". Explain and the mock player's translation printed that text to
// students; fresh questions said "Try again in a moment", free-text mocks and
// the adaptive branch said "a few minutes" (the outages ran 5 h 14 min to
// 11 h 21 min), the essay evaluator said "Network hiccup".
//
// Rules for every line here:
//   • "unavailable right now" ONLY in a line used when the AI was the cause
//     (src/lib/ai/tutor-failure.ts classifyTutorFailure); a failure that was
//     ours gets the plain "could not" line beside it;
//   • never "busy", "updating", "hiccup", "a few minutes", "in a moment", and
//     never the provider's name or text;
//   • name something that works without the AI; promise nothing the system
//     does not do (no "we will answer it later" here — only the chat keeps a
//     question, and the chat says so itself).
// The tutor chat's own lines stay in src/lib/tutor-unavailable.ts; the /ask
// lines (English, Hindi, Telugu) in src/lib/search-copy.ts.
// The server half (the 503 reply, the analytics row): src/lib/ai/unavailable-reply.ts.
// Tests: tests/unit/ai-unavailable-reply.test.ts

/** The stable code on a reply whose cause was the AI being unavailable. */
export const AI_UNAVAILABLE_CODE = "ai-unavailable" as const;

export function isAiUnavailableCode(code: unknown): code is typeof AI_UNAVAILABLE_CODE {
  return code === AI_UNAVAILABLE_CODE;
}

/** The feature label on the analytics row of a failed AI request (props.feature). */
export type AiUnavailableFeature = "explain" | "translate" | "fresh" | "ask" | "custom-mock" | "mock" | "essay" | "tutor" | "tutor-guest";

/** The fixed English lines. `…Failed` lines are for a failure that was NOT the AI being unavailable. */
export const AI_UNAVAILABLE_COPY = {
  /** E1 — Explain, Deep explanation, "Ask Shishya why". Promises nothing itself: the chat says whether a question is saved. */
  explain:
    'The AI explanation is unavailable right now. The checked solution is above. To ask about it, tap "Ask Shishya about this Q". The chat tells you if your question is saved for a later answer.',
  /** E1 for a question with no stored solution: the "solution is above" sentence is left out. */
  explainNoSolution:
    'The AI explanation is unavailable right now. To ask about this question, tap "Ask Shishya about this Q". The chat tells you if your question is saved for a later answer.',
  /** Explain, any other failure (2 Oct 2026 review: the page printed the reply's bare "INTERNAL_ERROR"). */
  explainFailed: "The explanation could not be made this time.",
  /** F0 — fresh questions on the results page. */
  fresh: "Fresh AI questions are unavailable right now. A topic test from the checked question bank works without the AI.",
  freshFailed: "Fresh questions could not be made this time. A topic test from the checked question bank works without the AI.",
  /** M1 — a mock built from a typed instruction, AI unavailable. */
  customMock:
    'Mocks built from a typed instruction need the AI, which is unavailable right now. "Build my own mock" works without it: pick topics and size.',
  /** M1b — the same request, any other failure. */
  customMockFailed: 'That mock could not be built. "Build my own mock" works: pick topics and size.',
  /** M2 — any other mock that needed the AI (the adaptive branch falls back by rule before this). */
  mock: "The AI is unavailable right now. A topic test or the diagnostic works without it.",
  mockFailed: "That mock could not be built. A topic test or the diagnostic works without the AI.",
  /** DS — essay evaluation. The draft lives only in the open page, so the line says to keep it open or copy it. */
  essay: "AI evaluation is unavailable right now. Your answer is still in the box. Keep this page open or copy it, and press Evaluate again later.",
  essayFailed: "The evaluation did not work this time. Your answer is still in the box.",
  /** Question translation (the mock player and the results page), when NO question could be translated:
   *  every question on the page is then in English, and the line says so. */
  translation: "Translation is unavailable right now, so the questions are shown in English.",
  /** Either translation route, when the cause was not the AI being unavailable. */
  translationFailed: "These questions could not be translated this time, so they are shown in English.",
  /** The bare fact, for a surface that passed no line of its own (/ask and the chat always pass theirs). */
  generic: "The AI is unavailable right now. Pages, papers and practice tests work without it.",
} as const;

/** The explain line for a question (E1; without "the solution is above" when none is stored). */
export function explainUnavailableLine(hasSolution: boolean): string {
  return hasSolution ? AI_UNAVAILABLE_COPY.explain : AI_UNAVAILABLE_COPY.explainNoSolution;
}

/**
 * RT — a PARTLY translated page: `language` is the language's own name ("हिन्दी").
 * 2 Oct 2026 (review): no surface shows this line yet. Both translate routes
 * answer 503 only when no question has a translation — every question is then
 * in English and the line is AI_UNAVAILABLE_COPY.translation. When some are
 * stored the routes answer 200 and the page shows no line; build 6 gives that
 * case this one. Kept (and kept under the copy test) so the words are ready.
 */
export function resultsTranslationUnavailableLine(language: string | null | undefined): string {
  const name = (language ?? "").trim() || "that language";
  return `Translation is unavailable right now. Questions with a stored translation are shown in ${name}; the others stay in English.`;
}

/**
 * A reply's `error` text is shown to a student only when it is a sentence of
 * ours (a validation message, "question not found", one of the fixed lines
 * above). A bare code word — "INTERNAL_ERROR" from src/lib/http.ts
 * serverError, "RATE_LIMITED" from src/lib/rate-limit.ts — or an empty text
 * gets `fallback` instead (2 Oct 2026 review: a provider 400 about one
 * request now answers 500 INTERNAL_ERROR, and the results page printed that
 * word).
 */
export function sentenceOr(message: unknown, fallback: string): string {
  const s = typeof message === "string" ? message.trim() : "";
  return !s || /^[A-Z0-9_]+$/.test(s) ? fallback : s;
}

/** Every fixed line in this file (the copy test reads this list). */
export function allAiUnavailableLines(): string[] {
  return [...Object.values(AI_UNAVAILABLE_COPY), resultsTranslationUnavailableLine("हिन्दी"), resultsTranslationUnavailableLine(null)];
}
