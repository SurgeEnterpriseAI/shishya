// The proof tables for the "Sign up with Google" explanation (2 Oct 2026).
//
// TEST-ONLY: tests/unit/signup-cta.test.ts is the one importer. They were in
// src/lib/signup-cta-copy.ts, which the header loads on every page (Class
// 1-7 pages included); nothing a browser runs needs them, so they live here
// and that test also pins that no file under src/ imports this module (page
// weight is the first suspect for a sign-up dip).
//
// What they pin: every sentence of the explanation — the full one (tooltip)
// and the short one (the caption on a touch screen) — says exactly the claims
// listed for its variant, and every claim names code that makes it true
// today. Change the product or the words and the test fails.

import type { SignUpExplainVariant } from "@/lib/signup-cta-copy";

/** What a sentence promises. Each one is pinned to code (SIGNUP_CLAIM_PROOF). */
export type SignUpClaim = "google-only-no-forms" | "exam-set-up" | "tests-saved" | "tutor-memory" | "chats-saved" | "school-practice-saved" | "guest-chat-kept";

/** The claims of the full sentence (the tooltip). */
export const SIGNUP_EXPLAIN_CLAIMS: Readonly<Record<SignUpExplainVariant, readonly SignUpClaim[]>> = {
  exam: ["google-only-no-forms", "exam-set-up", "tests-saved", "tutor-memory"],
  examNoPractice: ["google-only-no-forms", "exam-set-up", "tutor-memory"],
  general: ["google-only-no-forms", "tests-saved", "chats-saved", "tutor-memory"],
  school: ["google-only-no-forms", "school-practice-saved"],
  tutor: ["google-only-no-forms", "guest-chat-kept", "tutor-memory"],
};

/** The claims of the short caption — always a subset of the full sentence's. */
export const SIGNUP_SHORT_CLAIMS: Readonly<Record<SignUpExplainVariant, readonly SignUpClaim[]>> = {
  exam: ["google-only-no-forms", "exam-set-up"],
  examNoPractice: ["google-only-no-forms", "exam-set-up"],
  general: ["google-only-no-forms", "tests-saved", "chats-saved"],
  school: ["google-only-no-forms", "school-practice-saved"],
  tutor: ["google-only-no-forms", "guest-chat-kept"],
};

/** The file and the text in it that make each claim true. The test reads them. */
export const SIGNUP_CLAIM_PROOF: Readonly<Record<SignUpClaim, readonly { file: string; has: string }[]>> = {
  "google-only-no-forms": [
    { file: "src/lib/auth.ts", has: "GoogleProvider({" },
    { file: "src/app/dashboard/page.tsx", has: "Onboarding is NO LONGER a hard gate." },
  ],
  "exam-set-up": [
    { file: "src/lib/signup-goal.ts", has: "export function signupGoalOf(" },
    { file: "src/lib/signup-profile.ts", has: "ensureEnrollment" },
  ],
  "tests-saved": [
    { file: "prisma/schema.prisma", has: "model Attempt {" },
    { file: "prisma/schema.prisma", has: "model WeaknessMap {" },
  ],
  "tutor-memory": [{ file: "src/lib/tutor-memory.ts", has: "export const MEMORY_WINDOW_DAYS" }],
  "chats-saved": [{ file: "src/lib/recent-chats.ts", has: "export const RECENT_CHATS_DAYS" }],
  "school-practice-saved": [{ file: "src/lib/school/student-copy.ts", has: "Your score is saved to your account." }],
  "guest-chat-kept": [{ file: "src/lib/guest-chat-carry.ts", has: "export const GUEST_CHAT_KEY" }],
};

/** The English phrase each claim is said with in the FULL sentence (the test
 *  checks a variant says exactly the claims it lists — no more, no fewer).
 *  "google-only-no-forms" is NOT "one tap": the route is the button, Google's
 *  account chooser and, on a first sign-in, Google's share screen. */
export const SIGNUP_CLAIM_PHRASE_EN: Readonly<Record<SignUpClaim, string>> = {
  "google-only-no-forms": "Sign up with your Google account, no forms.",
  "exam-set-up": "{exam} is set up",
  "tests-saved": "tests and progress are saved",
  "tutor-memory": "the AI tutor",
  "chats-saved": "tutor chats are saved",
  "school-practice-saved": "chapter practice and scores are saved",
  "guest-chat-kept": "This chat is saved to your account",
};

/** The English phrase each claim is said with in the SHORT caption; null =
 *  the caption never makes that claim (the tutor's memory is the tooltip's). */
export const SIGNUP_CLAIM_SHORT_PHRASE_EN: Readonly<Record<SignUpClaim, string | null>> = {
  "google-only-no-forms": "No forms.",
  "exam-set-up": "{exam} is set up as your exam",
  "tests-saved": "Your tests",
  "tutor-memory": null,
  "chats-saved": "tutor chats are saved",
  "school-practice-saved": "practice scores are saved",
  "guest-chat-kept": "This chat is saved to your account",
};

/** Words the explanation may never use (founder brief said "super
 *  intelligence"; the product has an AI tutor, so that is what we say).
 *  "one tap": more than one tap in both arms of the skip-/login test. */
export const SIGNUP_BANNED_WORDS: readonly string[] = [
  "superintelligence",
  "super intelligence",
  "super-intelligence",
  "everything changes",
  "fully personalised",
  "fully personalized",
  "guarantee",
  "one tap",
  "एक टैप",
  "ఒక్క ట్యాప్",
];
