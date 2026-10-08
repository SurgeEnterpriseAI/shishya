// The guest tutor's first-answer sign-up card (8 Oct 2026 — founder: "target
// that group as well: free sign-ups after the first question").
//
// WHY (the read of 8 Oct 2026, SELECT-only, scripts/tmp-su8-r2-*.ts):
//   • real guest askers (tutor rows that carry the shishya_anon cookie) are
//     flat — 29 different browsers in each of the last two weeks, about 4 a
//     day; 72% ask ONE question, and of the 16 askers who made an account in
//     30 days, 12 did so after exactly one question, 11 within 5 minutes of it;
//   • the chat's own sign-up buttons brought about 0.2 sign-ups a day: in 14
//     days 2 banner presses and 2 save-card presses for 52 answered askers.
//     The save card came up at the END of the scrolling message pane when the
//     first reply finished — under what the pane showed (the pane follows the
//     stream on every new piece of text, and the card arrives after the last
//     one), so a long first answer hid it — and its line was "Save this chat";
//   • askers who came from a guest quiz's result made an account at 47% (7 of
//     15); from a topic page, 8% (1 of 13).
//
// WHAT. While the guest's FIRST answered turn is the latest turn, the save
// card's place (under that answer, the end of the pane) holds this card
// instead — one invitation a screen (guestChatOffer):
//   • a reason line tied to what they asked and true of this exam
//     (firstAnswerVariant → FIRST_ANSWER_COPY, en / hi / te; hi and te for the
//     founder's review):
//       "quiz"      — the first question is the guest quiz's own seed ("I just
//                     took a quick … quiz for … and scored N/5", src/components/
//                     AnonQuizPlayer.tsx) on an exam the page says can serve
//                     practice: "You scored N/5. Sign up free for more {exam}
//                     tests — …";
//       "practice"  — any other first question, same exam condition;
//       "chatsExam" — an exam the page did not show can serve practice: the
//                     save card's own promise (chats saved from then on);
//       "chats"     — the general chat, an olympiad, or an exam the page said
//                     nothing about (the page's facts failed to load): no exam named;
//   • the shared white "Sign up with Google" button (door "chat-first-answer";
//     its tooltip is the save card's entry, src/lib/signup-place.ts), whose
//     link returns to this chat with the door named in the callback
//     (src/lib/signin-cta.ts loginHrefWithDoor), so the SIGNUP row carries
//     props.door = "chat-first-answer";
//   • the age small print (the B6 door's — nudgeBarCopy privacy).
// The card is brought into view when it comes up (the pane already follows
// the reply to its end on every piece of text; this is one more step of the
// same scroll). From the SECOND answer on, the save card comes back at the
// end, unchanged. Never in a school chat, never after the under-13 line, never
// while a reply streams, never while the B6 unanswered-question door is up
// (no answer has finished then — the two cannot meet), and never on a kids'
// exam chat (SOF / Silverzone / NSTSE / JNVST — chatQuestionDoorAllowed):
// there the save card stays exactly as it was (the founder's open olympiad
// decision of 7 Oct 2026 — this build adds nothing there).
//
// HONEST WORDS — each promise and the code that makes it true:
//   "each score is kept"            — Attempt rows (prisma/schema.prisma
//                                     "model Attempt"); tests and mocks are for
//                                     members only (POST /api/mocks → 401).
//                                     The "quiz" line says "each NEW score"
//                                     (review, 8 Oct 2026): the guest quiz's own
//                                     score is never an Attempt — at most its
//                                     answers reach weak topics, and only from
//                                     the hub / dashboard / mock page
//                                     (src/lib/quiz-carry.ts), never from /chat;
//   "this tutor then sees your
//    mistakes and weak topics"      — a signed-in EXAM chat has the tools
//                                     get_attempt_mistakes / get_my_mastery
//                                     (src/lib/ai/tools.ts; src/lib/tutor-turn.ts:
//                                     tools only for a signed-in exam chat);
//                                     "then": once there is a test to read;
//   "more {exam} tests"             — only where the page said the exam can
//                                     serve a paper ("canServe": 5+ checked
//                                     questions, src/lib/signup-place.ts rule 4);
//   "your chats from now on are
//    saved, to reopen later"        — signed-in chats are stored (ChatSession)
//                                     and listed on /chat for 14 days
//                                     (src/lib/recent-chats.ts). Never "this chat
//                                     is saved" (the carry of a guest chat is
//                                     best-effort — SIGNUP_PLACE_BANNED_WORDS).
//
// COUNTED like a door: ONE { cta: "signin-door", action: "shown", surface:
// "chat-first-answer", examCode, variant, impression: true } once at least
// half of the card is on screen (src/app/chat/FirstAnswerOffer.tsx), and
// "signin-click" with the same surface on a press (SignInLink). A tutor door's
// "shown" row is an IMPRESSION, not a press (signin-cta.ts doorShownIsPress).
//
// Pure: no React, no DOM (the beacon helper goes through src/lib/cta-beacon.ts,
// best-effort). Tests: tests/unit/chat-first-answer.test.ts.

import {
  CHAT_FIRST_ANSWER_DOOR,
  chatQuestionDoorAllowed,
  isKidsExamCode,
  loginHrefWithDoor,
  signinDoorShownBeacon,
} from "@/lib/signin-cta";
import type { SignUpPractice } from "@/lib/signup-place";

export { CHAT_FIRST_ANSWER_DOOR };

// ── Which card, if any ──────────────────────────────────────────────────

/** The one guest invitation inside the message pane: the first-answer card,
 *  the save card, or none. */
export type GuestChatOffer = "first-answer" | "save" | null;

export interface OfferMessage {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
}

/** Which card the guest's message pane shows (see the header). "save" is
 *  exactly where the save card showed before this build (a finished reply,
 *  nothing streaming), except while the first answered turn is the latest. */
export function guestChatOffer(a: {
  /** A guest chat (the page passed guestSignInHref). */
  guest: boolean;
  school: boolean;
  under13: boolean;
  /** A reply is streaming. */
  busy: boolean;
  /** The B6 unanswered-question door is on screen. */
  questionDoorUp: boolean;
  /** The chat's exam; null = the general chat. */
  examCode: string | null;
  messages: readonly OfferMessage[];
}): GuestChatOffer {
  if (!a.guest || a.school || a.under13 || a.busy || a.questionDoorUp) return null;
  let finished = 0;
  let last: OfferMessage | null = null;
  for (const m of a.messages) {
    if (m.role !== "assistant") continue;
    last = m;
    if (m.content && !m.failed) finished += 1;
  }
  if (finished === 0) return null;
  const firstIsLatest = finished === 1 && !!last && !!last.content && !last.failed;
  return firstIsLatest && chatQuestionDoorAllowed(a.examCode) ? "first-answer" : "save";
}

/** The guest's first question in this chat (the seed, when one opened it). */
export function firstQuestionOf(messages: readonly OfferMessage[]): string | null {
  const m = messages.find((x) => x.role === "user" && x.content.trim());
  return m ? m.content : null;
}

// ── What the card says ──────────────────────────────────────────────────

export type FirstAnswerVariant = "quiz" | "practice" | "chatsExam" | "chats";

export interface FirstAnswerView {
  variant: FirstAnswerVariant;
  /** The exam's short name — "quiz", "practice" and "chatsExam" only. */
  exam?: string;
  /** The guest quiz's score — "quiz" only. */
  score?: number;
  total?: number;
}

/** The guest quiz's tutor seed (src/components/AnonQuizPlayer.tsx tutorSeed;
 *  the same template src/lib/tutor-templates.ts lists). */
const QUIZ_SEED = /^I just took a quick .{1,120}? quiz for .{1,80}? and scored (\d{1,3})\/(\d{1,3})(?!\d)/u;

/** The score in the guest quiz's seed, or null for any other question. */
export function quizSeedScore(text: string | null | undefined): { score: number; total: number } | null {
  if (typeof text !== "string") return null;
  const m = QUIZ_SEED.exec(text.trim());
  if (!m) return null;
  const score = Number(m[1]);
  const total = Number(m[2]);
  if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || total > 100 || score > total) return null;
  return { score, total };
}

/** An exam's short name fit to print, or "" (never a raw template hole). */
function cleanExam(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.replace(/\s+/g, " ").trim();
  return s.length > 0 && s.length <= 60 && !/[{}<>]/.test(s) ? s : "";
}

/** What the page said about its exam (src/components/ExamSignUpContext.tsx →
 *  src/lib/use-signup-words.ts useSignUpPageData), as this rule reads it. */
export interface FirstAnswerPage {
  code?: string | null;
  practice?: SignUpPractice | null;
  olympiad?: boolean | null;
}

/** The card's variant (see the header). FAILS CLOSED: an exam is named only
 *  when the server page passed its short name AND the page's facts are for
 *  this exam and say it is not an olympiad; tests are promised only for
 *  "canServe". */
export function firstAnswerVariant(f: {
  examCode: string | null;
  /** The exam's short name the server page passed (examShortName). */
  exam: string | null | undefined;
  page: FirstAnswerPage | null | undefined;
  firstQuestion: string | null | undefined;
}): FirstAnswerView {
  if (f.examCode == null || isKidsExamCode(f.examCode)) return { variant: "chats" };
  const exam = cleanExam(f.exam);
  const page = f.page && f.page.code === f.examCode ? f.page : null;
  if (!exam || !page || page.olympiad !== false) return { variant: "chats" };
  if (page.practice === "canServe") {
    const s = quizSeedScore(f.firstQuestion);
    return s ? { variant: "quiz", exam, score: s.score, total: s.total } : { variant: "practice", exam };
  }
  return { variant: "chatsExam", exam };
}

type Lang = "en" | "hi" | "te";

/** The reason lines (8 Oct 2026; hi and te: founder review). {exam}, {score}
 *  and {total} are filled by firstAnswerReason. */
export const FIRST_ANSWER_COPY: Readonly<Record<Lang, Readonly<Record<FirstAnswerVariant, string>>>> = {
  en: {
    quiz: "You scored {score}/{total}. Sign up free for more {exam} tests — each new score is kept, and this tutor then sees your mistakes and weak topics.",
    practice: "Sign up free to practise {exam} with tests — each score is kept, and this tutor then sees your mistakes and weak topics.",
    chatsExam: "Sign up free and your {exam} chats from now on are saved, to reopen later.",
    chats: "Sign up free and your chats with the tutor from now on are saved, to reopen later.",
  },
  hi: {
    quiz: "आपका स्कोर {score}/{total} रहा। {exam} के और टेस्ट के लिए मुफ़्त साइन अप करें — हर नया स्कोर सेव रहता है, और फिर यह ट्यूटर आपकी ग़लतियाँ और कमज़ोर टॉपिक देखता है।",
    practice: "{exam} के टेस्ट से अभ्यास करने के लिए मुफ़्त साइन अप करें — हर स्कोर सेव रहता है, और फिर यह ट्यूटर आपकी ग़लतियाँ और कमज़ोर टॉपिक देखता है।",
    chatsExam: "मुफ़्त साइन अप करें — अब से आपकी {exam} बातचीत सेव रहेगी, ताकि बाद में दोबारा खोल सकें।",
    chats: "मुफ़्त साइन अप करें — अब से ट्यूटर से आपकी बातचीत सेव रहेगी, ताकि बाद में दोबारा खोल सकें।",
  },
  te: {
    quiz: "మీ స్కోర్ {score}/{total}. మరిన్ని {exam} టెస్ట్‌ల కోసం ఉచితంగా సైన్ అప్ చేయండి — ప్రతి కొత్త స్కోర్ సేవ్ అవుతుంది, ఆ తర్వాత ఈ ట్యూటర్ మీ తప్పులు, బలహీన టాపిక్‌లను చూస్తుంది.",
    practice: "{exam} టెస్ట్‌లతో సాధన చేయడానికి ఉచితంగా సైన్ అప్ చేయండి — ప్రతి స్కోర్ సేవ్ అవుతుంది, ఆ తర్వాత ఈ ట్యూటర్ మీ తప్పులు, బలహీన టాపిక్‌లను చూస్తుంది.",
    chatsExam: "ఉచితంగా సైన్ అప్ చేయండి — ఇకపై మీ {exam} చాట్‌లు సేవ్ అవుతాయి, తర్వాత మళ్లీ తెరవవచ్చు.",
    chats: "ఉచితంగా సైన్ అప్ చేయండి — ఇకపై ట్యూటర్‌తో మీ చాట్‌లు సేవ్ అవుతాయి, తర్వాత మళ్లీ తెరవవచ్చు.",
  },
};

function lang(l: string | null | undefined): Lang {
  return l === "hi" || l === "te" ? l : "en";
}

/** The card's reason line in the chat's UI language. A variant whose value is
 *  missing falls back to the line that needs none ("chats") — never a hole. */
export function firstAnswerReason(locale: string | null | undefined, view: FirstAnswerView): string {
  const copy = FIRST_ANSWER_COPY[lang(locale)];
  const exam = cleanExam(view.exam);
  const quizOk = view.variant === "quiz" && exam && Number.isInteger(view.score) && Number.isInteger(view.total);
  const v: FirstAnswerVariant =
    view.variant === "chats" || ((view.variant === "practice" || view.variant === "chatsExam") && exam) || quizOk ? view.variant : "chats";
  // Function replacements: a "$" in a value is never read as a pattern.
  return copy[v]
    .replace("{exam}", () => exam)
    .replace("{score}", () => String(view.score ?? ""))
    .replace("{total}", () => String(view.total ?? ""));
}

// ── The link and the count ──────────────────────────────────────────────

/** The card's /login link: the chat's own (it returns here), with the door
 *  named in the callback and in ?from= (src/lib/signin-cta.ts loginHrefWithDoor). */
export function firstAnswerHref(guestSignInHref: string): string {
  return loginHrefWithDoor(guestSignInHref, CHAT_FIRST_ANSWER_DOOR);
}

/** The card's one "shown" row — an impression (see the header). Best-effort. */
export function firstAnswerShownBeacon(examCode: string | null, variant: FirstAnswerVariant): void {
  signinDoorShownBeacon(CHAT_FIRST_ANSWER_DOOR, { examCode, variant, impression: true });
}
