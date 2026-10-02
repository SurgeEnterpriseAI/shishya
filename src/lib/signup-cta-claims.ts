// The proof tables for the "Sign up with Google" explanation (2 Oct 2026).
//
// TEST-ONLY: tests/unit/signup-cta.test.ts, signup-everywhere.test.ts,
// signup-sentences.test.ts and signup-places.test.ts are the importers. They
// were in src/lib/signup-cta-copy.ts, which the header loads on every page
// (Class 1-7 pages included); nothing a browser runs needs them, so they live
// here and a test pins that no file under src/ imports this module (page
// weight is the first suspect for a sign-up dip).
//
// What they pin (2 Oct 2026, later — the explanation is a table of 76 entries
// now, src/data/signup-places/, one per placement):
//   • every entry says exactly the claims listed for it here — the tooltip
//     and the caption together, in English — and each claim is recognised by
//     the words it is said with (SIGNUP_CLAIM_SAYS_EN). Add a promise to a
//     sentence and the test fails until the promise is listed;
//   • every claim names code that makes it true today
//     (SIGNUP_CLAIM_PROOF: a file and a text in it). Change the product and
//     the test fails;
//   • what an entry says is NOT kept (a college, a job, the scholarship
//     star's list) is pinned the other way round (SIGNUP_NOT_KEPT_PINS): the
//     test fails the day such a table or route appears, so the sentence is
//     read again when that ships;
//   • no entry, in any language, uses a word the product cannot back
//     (SIGNUP_PLACE_BANNED_WORDS).
// The sentences were written from the code and reviewed for honesty on
// 2 Oct 2026; each entry's conditions (which exam, which practice, which
// page) are enforced by src/lib/signup-place.ts and pinned by
// tests/unit/signup-places.test.ts.

import type { SignUpReason } from "@/lib/signup-cta-copy";
import type { SignUpPlaceKey } from "@/lib/signup-place";

/** What a sentence promises or states. Each one is pinned to code (SIGNUP_CLAIM_PROOF). */
export type SignUpClaim =
  | "google-only-no-forms"
  | "returning-member"
  | "exam-set-up"
  | "exam-chosen-later"
  | "scores-kept"
  | "weak-topics"
  | "mocks-timed"
  | "quiz-carried"
  | "hub-autostart"
  | "new-questions-first"
  | "mistake-notebook"
  | "daily-five-streak"
  | "tutor-reads-papers"
  | "tutor-memory"
  | "chats-saved"
  | "chats-recent-listed"
  | "tutor-recent-questions"
  | "topic-read-marks"
  | "topic-test-saved"
  | "shift-day"
  | "coach-today"
  | "challenge-links-moved"
  | "challenge-mail-possible"
  | "home-for-you"
  | "dashboard-yours"
  | "answers-saved-as-you-go"
  | "returns-where-said"
  | "school-practice-saved"
  | "class-on-dashboard"
  | "class-chat-saved"
  | "group-board"
  | "discussion-notice"
  | "ideas-upvote"
  | "idea-built-notice"
  | "fact-confirm-counted"
  | "batch-shares"
  | "vouch-needs-credential"
  | "live-standing"
  | "builder"
  | "welcome-strip-change"
  | "open-without-account"
  | "not-kept";

/** The file and the text in it that make each claim true. The test reads them. */
export const SIGNUP_CLAIM_PROOF: Readonly<Record<SignUpClaim, readonly { file: string; has: string }[]>> = {
  // Google is the only way in, and the dashboard asks a new account nothing first.
  "google-only-no-forms": [
    { file: "src/lib/auth.ts", has: "GoogleProvider({" },
    { file: "src/app/dashboard/page.tsx", has: "Onboarding is NO LONGER a hard gate." },
  ],
  // /login's "Welcome back" card: the same button signs a member in.
  "returning-member": [{ file: "src/lib/login-intent.ts", has: '"return"' }],
  // The exam of the page a sign-up returns to becomes an active enrolment.
  "exam-set-up": [
    { file: "src/lib/signup-goal.ts", has: "export function signupGoalOf(" },
    { file: "src/lib/signup-profile.ts", has: "ensureEnrollment" },
  ],
  // Without an exam goal: the one-time strip, and the dashboard's picker.
  "exam-chosen-later": [
    { file: "src/lib/welcome-strip-copy.ts", has: "export const WELCOME_STRIP_COPY" },
    { file: "src/app/dashboard/page.tsx", has: "<QuickStartDiagnostic" },
  ],
  "scores-kept": [{ file: "prisma/schema.prisma", has: "model Attempt {" }],
  "weak-topics": [{ file: "prisma/schema.prisma", has: "model WeaknessMap {" }],
  // A whole paper needs an account, and no paper under five questions is served.
  "mocks-timed": [
    { file: "src/app/mocks/[id]/page.tsx", has: "<MockGate" },
    { file: "src/lib/guest-paper.ts", has: "GUEST_WHOLE_PAPER_OPEN: boolean = false" },
    { file: "src/lib/served-paper.ts", has: "MIN_SERVED_QUESTIONS = 5" },
  ],
  // The last guest quiz is re-graded into the new account's weak topics.
  "quiz-carried": [{ file: "src/lib/quiz-carry.ts", has: "export const QUIZ_STASH_KEY" }],
  // The hub box returns to ?start=practice, which starts the five-question test once.
  "hub-autostart": [
    { file: "src/lib/signin-cta.ts", has: "export function hubAutoStart(" },
    { file: "src/app/exams/[code]/StartMockButton.tsx", has: "hubAutoStart(startParam, hasHistory)" },
  ],
  // The sets Shishya builds put unseen questions first (exam sets and school chapter sets).
  "new-questions-first": [
    { file: "src/lib/answered-questions.ts", has: "getSeenHistory" },
    { file: "src/lib/school/student-db.ts", has: 'import { getSeenHistory } from "@/lib/answered-questions";' },
  ],
  "mistake-notebook": [{ file: "src/app/revision/page.tsx", has: "QuestionBookmark" }],
  "daily-five-streak": [
    { file: "src/lib/study-day-five.ts", has: "export async function pickDailyFive(" },
    { file: "src/lib/db/streak.ts", has: "STREAK_MILESTONES" },
  ],
  // A signed-in exam chat can look up the student's attempts, weak topics and mistakes.
  "tutor-reads-papers": [{ file: "src/lib/ai/tools.ts", has: "get_attempt_mistakes" }],
  // (The reason line "startExam" only: "the AI tutor remembers where you left off".)
  "tutor-memory": [{ file: "src/lib/tutor-memory.ts", has: "export const MEMORY_WINDOW_DAYS" }],
  "chats-saved": [{ file: "src/lib/recent-chats.ts", has: "export const RECENT_CHATS_DAYS" }],
  "chats-recent-listed": [
    { file: "src/lib/recent-chats.ts", has: "export const RECENT_CHATS_DAYS = 14;" },
    { file: "src/app/chat/page.tsx", has: "listRecentChats(" },
  ],
  "tutor-recent-questions": [{ file: "src/lib/tutor-memory.ts", has: "export const MEMORY_WINDOW_DAYS = 30;" }],
  // Only on a topic page with notes (the panel), and on the syllabus that reads the same marks.
  "topic-read-marks": [
    { file: "src/app/exams/[code]/topics/[topicCode]/page.tsx", has: "<TopicMasteryPanel" },
    { file: "src/app/exams/[code]/syllabus/SyllabusProgress.tsx", has: "export function SyllabusProgress(" },
  ],
  "topic-test-saved": [{ file: "src/app/exams/[code]/topics/[topicCode]/TopicQuizButton.tsx", has: 'request: { type: "TOPIC"' }],
  // The shift-day picker: exam week, a window of more than one announced day.
  "shift-day": [{ file: "src/components/ExamWeekBlock.tsx", has: "shiftDays.length > 1" }],
  "coach-today": [{ file: "src/lib/coach-plan.ts", has: "export async function computeCoachPlan(" }],
  "challenge-links-moved": [{ file: "src/lib/signup-profile.ts", has: "linkGuestChallenges" }],
  "challenge-mail-possible": [{ file: "src/lib/challenge-db.ts", has: "challengePlayEmail" }],
  "home-for-you": [{ file: "src/components/home/HomeForYou.tsx", has: "export async function HomeForYou(" }],
  "dashboard-yours": [{ file: "src/app/dashboard/page.tsx", has: 'redirect(loginRedirectPath("/dashboard", sp))' }],
  // Answers are written as the student goes; once the time is up only submit or discard.
  "answers-saved-as-you-go": [
    { file: "src/app/api/attempts/[id]/answer/route.ts", has: "export async function POST(" },
    { file: "src/app/mocks/[id]/page.tsx", has: "ExpiredAttemptGate" },
  ],
  // A door's sentence is shown only where its link returns where the sentence says.
  "returns-where-said": [
    { file: "src/lib/signup-place.ts", has: "const DOOR_RETURNS" },
    { file: "src/lib/mock-gate.ts", has: "export function gateCallbackPath(" },
  ],
  "school-practice-saved": [{ file: "src/lib/school/student-copy.ts", has: "Your score is saved to your account." }],
  "class-on-dashboard": [
    { file: "src/lib/auth.ts", has: "const schoolSignIn = isSchoolSignInCallback(signInCallback);" },
    { file: "src/lib/school/student-copy.ts", has: 'heading: "Your classes"' },
  ],
  "class-chat-saved": [{ file: "src/app/chat/page.tsx", has: "const schoolRecent = await recentFor(" }],
  "group-board": [{ file: "src/lib/study-group.ts", has: "export const GROUP_MAX_MEMBERS" }],
  "discussion-notice": [{ file: "src/app/api/discussions/[id]/messages/route.ts", has: "await createNotification({" }],
  "ideas-upvote": [{ file: "src/app/api/feedback/[id]/upvote/route.ts", has: "export async function POST(" }],
  "idea-built-notice": [{ file: "src/lib/feature-requests-ship.ts", has: "export async function deliverShipNotice(" }],
  // A confirmation writes a count on the member — no badge.
  "fact-confirm-counted": [{ file: "src/app/api/facts/[id]/verify/route.ts", has: '"verificationCount" = "verificationCount" + 1' }],
  "batch-shares": [{ file: "src/app/join/[inviteCode]/page.tsx", has: "By joining you share your name, email and progress data with the" }],
  "vouch-needs-credential": [{ file: "src/app/community-vouching/[domain]/page.tsx", has: "canVouch = (rows[0]?.n ?? 0n) > 0n;" }],
  "live-standing": [{ file: "src/lib/live-test.ts", has: "export const LIVE_TEST_QUESTIONS" }],
  "builder": [{ file: "src/app/api/mocks/custom/route.ts", has: "export async function POST(" }],
  "welcome-strip-change": [{ file: "src/app/api/me/welcome/route.ts", has: "export async function POST(" }],
  // Reading is not gated (the wall is off) and the tutor answers a guest.
  "open-without-account": [
    { file: "src/lib/soft-wall.ts", has: "SOFT_WALL_ON: boolean = false" },
    { file: "src/app/chat/page.tsx", has: "Anonymous tutor — UNGATED" },
  ],
  // What an entry says is NOT kept: pinned the other way round (SIGNUP_NOT_KEPT_PINS).
  "not-kept": [{ file: "src/components/SaveScholarshipButton.tsx", has: "localStorage" }],
};

/** How an English entry says each claim (a regular expression, matched without
 *  regard to case over the tooltip and the caption together). The test checks
 *  an entry says exactly the claims listed for it — no more, no fewer.
 *  "google-only-no-forms" is NOT "one tap": the route is the button, Google's
 *  account chooser and, on a first sign-in, Google's share screen. */
export const SIGNUP_CLAIM_SAYS_EN: Readonly<Record<SignUpClaim, string | null>> = {
  "google-only-no-forms": "no forms",
  "returning-member": "Continue with the Google account you used before",
  "exam-set-up": "set up as your exam|becomes your exam|is your exam, with|as your exam\\.|Set \\{exam\\}, then",
  "exam-chosen-later": "choose (?:your|the|one of these) (?:entrance )?exams?|asks you once to choose|the exam you choose|Pick your exam|an exam you choose|you choose your exam|Choose the exam",
  "scores-kept": "(?<!never )\\bscores?\\b",
  "weak-topics": "weak topics",
  "mocks-timed": "\\bmocks?\\b|timed test|against the clock|live paper|papers you write|whole paper",
  "quiz-carried": "added to your (?:account's )?weak topics",
  "hub-autostart": "starter test opens by itself|test opens for you",
  "new-questions-first": "questions you have not answered|new (?:ones|questions) first",
  "mistake-notebook": "Mistake Notebook|notebook fills by itself|wrong answers are collected",
  "daily-five-streak": "five questions (?:a|for the) day|streak",
  "tutor-reads-papers": "look up your results|works from your own",
  // Said by the reason line "startExam" only — no entry of the table says it.
  "tutor-memory": null,
  "chats-saved": "chats?\\b[^.]*\\b(?:saved|kept)|(?:saved|keep)[^.]*\\bchats?\\b|ask the AI tutor[^.]*saved|questions[^.]*\\bare saved|AI tutor chats",
  "chats-recent-listed": "recent (?:AI tutor )?chats|recent ones are listed",
  "tutor-recent-questions": "has your recent questions",
  "topic-read-marks": "marks (?:each topic|it as read|the topic as read|the topics you have read)|marked read|Topics you read are marked",
  "topic-test-saved": "topic tests? (?:keep|saves?)|test on this topic",
  "shift-day": "shift day",
  "coach-today": "tasks for today|today's tasks",
  "challenge-links-moved": "challenge links[^.]*move into your account",
  "challenge-mail-possible": "can email you when a friend plays",
  "home-for-you": "'For you' section",
  "dashboard-yours": "dashboard (?:starts|and the home page)|stays on your dashboard|your own dashboard|land on your dashboard, where",
  "answers-saved-as-you-go": "answers are saved as you go",
  "returns-where-said": "come straight back|you return|come back to these same results|land on its page|land on the \\{exam\\} page|Back to the builder|land on your dashboard",
  "school-practice-saved": "Practise this chapter|chapter practice",
  "class-on-dashboard": "class is kept on your dashboard",
  "class-chat-saved": "class chat",
  "group-board": "study group|join the group|friends' group",
  "discussion-notice": "notification on Shishya when someone replies",
  "ideas-upvote": "upvote",
  "idea-built-notice": "told when the team marks",
  "fact-confirm-counted": "confirmations are counted on your profile|Confirm, flag or correct",
  "batch-shares": "shares your name, email and progress",
  "vouch-needs-credential": "verified Domain Experts|verified credential",
  "live-standing": "where you stand among those who wrote the same paper",
  "builder": "build this mock|make your own \\{exam\\} mock|Build your own|builder",
  "welcome-strip-change": "a strip on the page lets you change it",
  "open-without-account": "needs? no account|without an account|Ask as a guest|asking as a guest|free to read",
  "not-kept":
    "does not save or shortlist|no saved list yet|stores nothing about a job|is not carried|not saved to an account|not carried over|No plan exists until|gone when the page reloads|stay in this browser|nothing else about them is stored|have no saved practice|stays empty until|only marks it in this browser",
};

const NF = "google-only-no-forms" as const;

/** The claims of each entry of the table — its tooltip and its caption
 *  together. An entry used where an exam's practice is not known, or known
 *  to be none (the ".noPractice" and ".unknown" entries, the plain tutor and
 *  poll entries), lists no mock, score, daily-five or notebook claim. */
export const SIGNUP_PLACE_CLAIMS: Readonly<Record<SignUpPlaceKey, readonly SignUpClaim[]>> = {
  "family.home": [NF, "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "home-for-you"],
  "family.exam.practice": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed"],
  "family.exam.noPractice": [NF, "exam-set-up", "chats-saved", "home-for-you", "dashboard-yours"],
  "family.exam.unknown": [NF, "exam-set-up", "chats-saved", "chats-recent-listed", "home-for-you", "dashboard-yours"],
  "family.examPath": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "dashboard-yours"],
  "family.examOlympiad": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "dashboard-yours"],
  "family.examSyllabus.practice": [NF, "exam-set-up", "scores-kept", "topic-read-marks", "topic-test-saved"],
  "family.examSyllabus.noPractice": [NF, "exam-set-up", "chats-saved", "topic-read-marks"],
  "family.examTopic.practice": [NF, "exam-set-up", "scores-kept", "topic-read-marks", "topic-test-saved"],
  "family.examTopic.noPractice": [NF, "exam-set-up", "topic-read-marks"],
  "family.examTopic.testOnly": [NF, "exam-set-up", "scores-kept", "mocks-timed", "topic-test-saved"],
  "family.examUpdates.practice": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "shift-day", "dashboard-yours", "open-without-account"],
  "family.examUpdates.noPractice": [NF, "exam-set-up", "chats-saved", "shift-day", "dashboard-yours", "open-without-account"],
  "family.examCutoff.practice": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "open-without-account"],
  "family.examGuide.practice": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "daily-five-streak"],
  "family.examTricks.practice": [NF, "scores-kept", "mocks-timed", "new-questions-first", "mistake-notebook"],
  "family.examNews.practice": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "home-for-you", "dashboard-yours"],
  "family.examChecklist.practice": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "shift-day"],
  "family.examList": [NF, "exam-set-up", "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed"],
  "family.college": [NF, "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed", "open-without-account", "not-kept"],
  "family.colleges": [NF, "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "open-without-account"],
  "family.scholarship": [NF, "chats-saved", "chats-recent-listed", "open-without-account", "not-kept"],
  "family.scholarships": [NF, "chats-saved", "chats-recent-listed", "open-without-account", "not-kept"],
  "family.career": [NF, "exam-chosen-later", "scores-kept", "mocks-timed", "chats-saved", "chats-recent-listed"],
  "family.careers": [NF, "scores-kept", "mocks-timed", "chats-saved", "chats-recent-listed", "open-without-account"],
  "family.currentAffairs": [NF, "scores-kept", "mocks-timed", "chats-saved", "chats-recent-listed", "open-without-account"],
  "family.jobs": [NF, "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed", "open-without-account", "not-kept"],
  "family.examCalendar": [NF, "exam-set-up", "exam-chosen-later", "shift-day", "dashboard-yours", "open-without-account"],
  "family.stageHub": [NF, "scores-kept", "mocks-timed", "chats-saved", "chats-recent-listed", "tutor-recent-questions"],
  "family.streamOption": [NF, "chats-saved", "chats-recent-listed", "open-without-account"],
  "family.schoolCbse": [NF, "scores-kept", "new-questions-first", "school-practice-saved", "class-on-dashboard", "open-without-account"],
  "family.schoolOtherBoard": [NF, "scores-kept", "school-practice-saved", "open-without-account", "not-kept"],
  "family.schoolChat": [NF, "chats-saved", "chats-recent-listed", "class-chat-saved", "not-kept"],
  "family.fallback": [NF, "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "chats-recent-listed", "open-without-account"],
  "door.hub-box": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "hub-autostart"],
  "door.hub-try-one": [NF, "scores-kept", "weak-topics", "mocks-timed", "new-questions-first"],
  "door.pyq-year": [NF, "exam-set-up", "scores-kept", "mocks-timed"],
  "door.quiz-end": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "quiz-carried"],
  "door.build-mock-form": [NF, "scores-kept", "mocks-timed", "new-questions-first", "builder"],
  "door.mock-gate": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "answers-saved-as-you-go", "returns-where-said"],
  "door.mock-gate.unnamed": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "answers-saved-as-you-go", "returns-where-said"],
  "door.mock-gate-quiz-end": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "quiz-carried", "returns-where-said"],
  "door.build-gate-quiz-end": [NF, "scores-kept", "weak-topics", "mocks-timed", "quiz-carried", "returns-where-said", "builder"],
  "door.cutoff-nudge": [NF, "scores-kept", "mocks-timed", "returns-where-said", "open-without-account"],
  "door.verdict-poll": [NF, "exam-set-up", "chats-saved", "home-for-you", "dashboard-yours", "open-without-account"],
  "door.challenge-end": [NF, "exam-set-up", "scores-kept", "mocks-timed", "challenge-links-moved", "challenge-mail-possible"],
  "family.challengeLink": [NF, "scores-kept", "mocks-timed", "challenge-links-moved", "challenge-mail-possible", "open-without-account"],
  "family.groupInvite": [NF, "returns-where-said", "group-board"],
  "family.discussions": [NF, "returns-where-said", "discussion-notice", "open-without-account"],
  "door.live-test": [NF, "scores-kept", "mocks-timed", "returns-where-said", "live-standing"],
  "door.live-test.unnamed": [NF, "scores-kept", "mocks-timed", "returns-where-said", "live-standing"],
  "door.guest-paper": [NF, "scores-kept", "weak-topics", "mocks-timed", "not-kept"],
  "door.chat-banner.exam.practice": [NF, "weak-topics", "mocks-timed", "tutor-reads-papers", "chats-saved", "chats-recent-listed", "open-without-account"],
  "door.chat-banner.exam": [NF, "exam-set-up", "chats-saved", "chats-recent-listed", "tutor-recent-questions", "open-without-account"],
  "door.chat-banner.general": [NF, "chats-saved", "chats-recent-listed", "tutor-recent-questions", "open-without-account", "not-kept"],
  "door.chat-save.exam.practice": [NF, "weak-topics", "mocks-timed", "tutor-reads-papers", "chats-saved", "open-without-account"],
  "door.chat-save.exam": [NF, "exam-set-up", "chats-saved", "chats-recent-listed", "tutor-recent-questions", "open-without-account"],
  "door.chat-save.general": [NF, "chats-saved", "chats-recent-listed", "tutor-recent-questions", "open-without-account", "not-kept"],
  "door.school-save": [NF, "scores-kept", "school-practice-saved", "not-kept"],
  "door.home-signin": [NF, "exam-chosen-later", "weak-topics", "daily-five-streak", "chats-saved", "chats-recent-listed", "dashboard-yours"],
  "door.home-vacancies": [NF, "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "dashboard-yours", "returns-where-said"],
  "door.coach-start": [NF, "weak-topics", "coach-today", "not-kept"],
  "door.coach-start.exam": [NF, "exam-set-up", "weak-topics", "coach-today"],
  "door.revision-start": [NF, "mocks-timed", "mistake-notebook", "not-kept"],
  "door.finder-save": [NF, "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed", "returns-where-said", "not-kept"],
  "door.finder-start": [NF, "exam-set-up", "scores-kept", "weak-topics", "mocks-timed", "returns-where-said", "welcome-strip-change"],
  "door.persona-card": [NF, "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "open-without-account"],
  "door.batch-join": [NF, "returns-where-said", "batch-shares"],
  "door.group-join": [NF, "returns-where-said", "group-board"],
  "door.discussion-reply": [NF, "returns-where-said", "discussion-notice", "open-without-account"],
  "door.ideas-upvote": [NF, "returns-where-said", "ideas-upvote", "idea-built-notice", "open-without-account"],
  "door.vouch": [NF, "returns-where-said", "vouch-needs-credential"],
  "door.verify-fact": [NF, "returns-where-said", "fact-confirm-counted"],
  "door.login.default": [NF, "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "dashboard-yours", "returns-where-said"],
  "door.login.returning": ["returning-member", "weak-topics", "mocks-timed", "chats-saved"],
  "door.soft-wall": [NF, "exam-chosen-later", "scores-kept", "weak-topics", "mocks-timed", "chats-saved", "chats-recent-listed"],
};

/** Claims an entry may make only for an exam that can serve a mock, or as a
 *  conditional ("where it has practice …"). The entries a placement takes
 *  when the practice value is "none" or not known list none of them. */
export const SIGNUP_PRACTICE_CLAIMS: readonly SignUpClaim[] = ["scores-kept", "weak-topics", "mocks-timed", "daily-five-streak", "mistake-notebook", "hub-autostart", "quiz-carried", "tutor-reads-papers", "topic-test-saved"];

/** NEGATIVE claims, pinned the other way round: an entry says an account does
 *  NOT save or shortlist a college, stores nothing about a job, and that the
 *  scholarship star has no saved list. The test fails the day a model or a
 *  route of one of these names appears — read the entry again then.
 *  (prisma/schema.prisma model names, and paths under src/app/api.) */
export const SIGNUP_NOT_KEPT_PINS: readonly { says: string; in: readonly SignUpPlaceKey[]; noModel: string; noRoute: string }[] = [
  { says: "does not save or shortlist a college", in: ["family.college"], noModel: "(?:Saved|Shortlisted?)College|CollegeShortlist|CollegeSave", noRoute: "colleges?/(?:save|saved|shortlist)|(?:saved|shortlisted)-?colleges?" },
  { says: "there is no saved list yet", in: ["family.scholarship"], noModel: "SavedScholarship|ScholarshipSave|ScholarshipBookmark", noRoute: "scholarships?/(?:save|saved)|saved-?scholarships?" },
  { says: "an account stores nothing about a job", in: ["family.jobs"], noModel: "SavedJob|JobAlert|JobBookmark|SavedVacancy|VacancyAlert", noRoute: "jobs?/(?:save|saved|alerts?)|saved-?jobs?|job-alerts?" },
];

/** The reason lines beside buttons whose old label carried the reason
 *  (signUpReason, 2 Oct 2026): the claims each makes — the same list, no new
 *  kind of promise — and the English words it says them with. */
export const SIGNUP_REASON_CLAIMS: Readonly<Record<SignUpReason, { claims: readonly SignUpClaim[]; says: string; needs: { file: string; has: string } }>> = {
  // "to write this paper": a guest cannot open a mock — the page shows the sign-in gate.
  writePaper: { claims: ["scores-kept"], says: "your score is saved to your account", needs: { file: "src/app/mocks/[id]/page.tsx", has: "<MockGate" } },
  // Shown by the cutoff page only where the exam has practice.
  fullMocks: { claims: ["scores-kept", "mocks-timed"], says: "full mocks with your scores saved", needs: { file: "src/app/exams/[code]/cutoff/page.tsx", has: "<AnonExamNudge" } },
  // The home page's vacancies rail: the general caption's two claims after the rail's own question
  // (the link returns to /dashboard — no exam is named).
  vacancies: { claims: ["scores-kept", "chats-saved"], says: "Your tests and tutor chats are saved", needs: { file: "src/components/VacancyExplorer.tsx", has: 'signUpReason(locale, "vacancies")' } },
  // The hub's "try one question" card: mocks are Attempt rows (ADAPTIVE is a mock kind), weak topics the WeaknessMap.
  tryOne: { claims: ["scores-kept", "mocks-timed", "weak-topics"], says: "adaptive mocks with your scores saved", needs: { file: "prisma/schema.prisma", has: "ADAPTIVE // AI-generated based on weakness map" } },
  // /find-your-exam's bottom card: the sentence the old tooltip and this line shared, kept word for word.
  startExam: { claims: ["google-only-no-forms", "exam-set-up", "tutor-memory"], says: "{exam} is set up as your exam the moment you sign up", needs: { file: "src/app/find-your-exam/page.tsx", has: 'signUpReason("en", "startExam")' } },
};

/** Words the explanation may never use (founder brief said "super
 *  intelligence"; the product has an AI tutor, so that is what we say).
 *  "one tap": more than one tap in both arms of the skip-/login test.
 *  Lower case: the tests compare against lower-cased text. */
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

/** … and what no entry of the TABLE may say, in any of its three languages
 *  (2 Oct 2026, the honesty review): no mastery or percentage, no "knows
 *  you", no mentor, no nightly rebuild, no "unlock", no "All-India" (live
 *  papers have had very few writers), and never "this chat is saved" (no
 *  carried guest chat has been seen in production). Lower case. These are not
 *  in SIGNUP_BANNED_WORDS because that list is also run over pages whose own
 *  words are not part of this change (/live-test says "All-India" itself). */
export const SIGNUP_PLACE_BANNED_WORDS: readonly string[] = [
  ...SIGNUP_BANNED_WORDS,
  "mastery",
  "knows you",
  "remembers everything",
  "mentor will",
  "every night",
  "unlock",
  "all-india",
  "this chat is saved",
  "instantly",
  "#1",
];
