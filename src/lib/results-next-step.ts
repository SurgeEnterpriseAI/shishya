// What a student is offered right under the score (18 Sep 2026). Pure — no
// imports, no DB — so the rules are unit-tested (tests/unit/results-next-step.test.ts).
//
// Measured on new accounts, 1-10 Sep vs 12-17 Sep 2026 (first 24 h):
//   • The setup wizard has no door: 2 of 295 and 0 of 99 new accounts ever
//     opened /onboarding; of 239 who saw a results page un-set-up, 1 opened
//     it within 30 minutes. The one-line strip above the score did nothing.
//   • The results page IS the tutor's door: the first tutor question of a new
//     account came from "Explain my mistakes" for 91 of 157 askers (before)
//     and 20 of 37 (after); the dashboard sent 1 of 161 /chat openers.
//     Use of that card on a first attempt with wrong answers went 84/160
//     (52.5%) → 18/53 (34.0%). (Results-page seed only — the anonymous quiz
//     seed also starts "I just took a" and is not counted.)
// So: a real setup card below the score, and on a student's first-ever
// attempt the tutor card comes before the challenge and invite cards.

/** The setup card is offered on a student's first few results only. */
export const SETUP_CARD_MAX_ATTEMPTS = 3;

export interface ResultsNextStepInput {
  /** User.onbCompletedAt is set. null = the account row could not be read. */
  setupDone: boolean | null;
  /** The student's submitted attempts, this one included. */
  submittedAttempts: number;
  /** Submitted attempts that finished BEFORE this one. null = unknown. */
  earlierAttempts: number | null;
  /** Answered and wrong in this attempt. */
  wrongCount: number;
  /** The page's own rule for leading with the challenge card (score 40+, a link can be made). */
  challengeFirst: boolean;
}

export interface ResultsNextStep {
  /** This attempt is the student's first finished one (stable on later re-views). */
  firstEver: boolean;
  showSetupCard: boolean;
  /** "mistakes" = the Explain-my-mistakes card; "ask" = the one-line offer when nothing was wrong. */
  tutor: "mistakes" | "ask";
  /** Where the leading challenge card goes: before the tutor card (the 18 Sep order) or after it. */
  challengeSlot: "before-tutor" | "after-tutor" | "none";
  /** The first-mock invite card leaves the space above the score and follows the tutor card. */
  inviteBelowTutor: boolean;
}

export function resultsNextStep(input: ResultsNextStepInput): ResultsNextStep {
  const firstEver = input.earlierAttempts === 0;
  return {
    firstEver,
    showSetupCard:
      input.setupDone === false &&
      Number.isFinite(input.submittedAttempts) &&
      input.submittedAttempts <= SETUP_CARD_MAX_ATTEMPTS,
    tutor: input.wrongCount > 0 ? "mistakes" : "ask",
    challengeSlot: !input.challengeFirst ? "none" : firstEver ? "after-tutor" : "before-tutor",
    inviteBelowTutor: firstEver,
  };
}

// Attempt ids are cuids (lower-case letters and digits). Anything else —
// a slash, a dot, a colon, a percent sign, a second path — is refused.
const ATTEMPT_ID = /^[a-z0-9]{8,40}$/i;

/** Where the setup wizard sends a student who came from a results page.
 *  The path is BUILT here from a checked id, never taken from the URL, so
 *  it is always same-origin and always a results page. The results page
 *  itself checks the attempt belongs to the viewer. */
export function resultsReturnPath(from: unknown, attemptId: unknown): string | null {
  if (from !== "results") return null;
  if (typeof attemptId !== "string" || !ATTEMPT_ID.test(attemptId)) return null;
  return `/attempts/${attemptId}/results`;
}

/** The setup card's link: the wizard, told which result to come back to. */
export function setupHref(attemptId: string): string {
  return ATTEMPT_ID.test(attemptId)
    ? `/onboarding?from=results&attempt=${attemptId}`
    : "/onboarding?from=results";
}
