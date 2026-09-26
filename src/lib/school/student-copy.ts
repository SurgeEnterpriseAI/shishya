// Student-mode copy (26 Sep 2026) — every sentence the Class 8-12 sign-in /
// tutor / practice entry and the school results page print, in one file, so
// tests/unit/schooling-honesty.test.ts and tests/unit/school-student-mode.test.ts
// can read the whole voice of student mode.
//
// Rules (founder decision 26 Sep 2026; Anthropic usage policy for minors):
//   • the age line "for students 13 and above" at EVERY sign-in entry, and a
//     plain line for anyone younger (notes and no-account practice with a
//     parent — no account needed);
//   • the tutor is always called an AI tutor, and the entry says so in one
//     visible line before the student opens it;
//   • practice = "Shishya's own questions, answer-checked" — never an NCERT
//     exercise or a board question; counts are the computed numbers;
//   • no leaderboard, streak, challenge, share, teacher or coach word.
// The school pages are English-only (src/lib/school/copy.ts), so the entry's
// words are English; the results page speaks the site's three languages
// (en / hi / te, pickCopy) like every other results-page line.

import { fillTemplate } from "@/lib/i18n";
import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";
import type { SchoolBand } from "./student-classes";

/** The one age line every school sign-in entry carries. */
export const AGE_LINE = "For students 13 and above.";

/** The visible "you are talking to an AI" line at the tutor entry. */
export const AI_TUTOR_LINE = "You will be talking to an AI tutor, not a person. It explains in simple steps and gives hints before answers, and you can send it up to 20 messages a day.";

/** The honest label for account practice. */
export const PRACTICE_LABEL = "Shishya's own questions, answer-checked before they are shown — not taken from the NCERT book or any board paper.";

export const STUDENT_ENTRY_COPY = {
  // Signed out (chapter page)
  signedOutHeading: "Practise this chapter and ask the AI tutor",
  signedOutBody: `Sign in with Google to practise this chapter with Shishya's own answer-checked questions and to ask the AI tutor about it, step by step. ${AGE_LINE}`,
  signInButton: "Sign in to practise and ask the tutor →",
  under13: "Younger than 13? Use the notes and the practice on this page with a parent — no account is needed for those.",
  // Signed out (class page)
  classHeading: (cls: number) => `Class ${cls} students: practise and ask the AI tutor`,
  classBody: `Sign in with Google, then open any chapter of this class to practise it with Shishya's own answer-checked questions and to ask the AI tutor about it. ${AGE_LINE}`,
  classSignedIn: "You are signed in. Open any chapter below to practise it or to ask the AI tutor about it.",
  // Age band card
  bandHeading: "One thing before you start",
  bandBody: `Shishya's tutor and practice are for students 13 and above. Tell Shishya who you are — it is saved to your account once. ${AGE_LINE}`,
  bandOption: (band: SchoolBand, cls: number): string => {
    switch (band) {
      case "STUDENT_13_17":
        return `I am a student aged 13 to 17, in Class ${cls}`;
      case "STUDENT_18":
        return "I am a student aged 18 or older";
      case "PARENT":
        return "I am a parent";
      case "TEACHER":
        return "I am a teacher";
    }
  },
  bandContinue: "Continue →",
  bandSaving: "Saving…",
  // 26 Sep 2026 (integrator): the account's name and picture come from the
  // Google sign-in above this card, so the promise is about the tutor.
  bandNote: "The tutor never asks for your school, address, phone number or photos. Younger than 13? Use the notes and the practice on this page with a parent — no account is needed for those.",
  bandPick: "Pick one to continue.",
  // Ready
  readyHeading: "Practise and ask the AI tutor",
  practiceButton: (n: number) => `Practise this chapter — ${n} ${n === 1 ? "question" : "questions"} →`,
  practiceBuilding: "Building your set…",
  practiceHonesty: `${PRACTICE_LABEL} Your score is saved to your account.`,
  noPractice: "Practice questions for this chapter are not ready yet. The AI tutor is.",
  tutorButton: "Ask the AI tutor about this chapter →",
  aiLine: AI_TUTOR_LINE,
  error: "That did not work. Please try again.",
} as const;

// ── Results page (school attempt) ───────────────────────────────────

export interface SchoolResultsCopy {
  schoolPages: string;
  /** Under the score, when something was answered wrong. {n} = wrong count. */
  mistakesHeading: string;
  mistakesBody: string;
  mistakesButton: string;
  /** When nothing was wrong. {chapter} */
  askText: string;
  askLink: string;
  aiLine: string;
  honesty: string;
  backToChapter: string;
  practiseAgain: string;
  /** Per-topic row link text. */
  topicAsk: string;
}

const RESULTS: Readonly<Record<CopyLocale, SchoolResultsCopy>> = {
  en: {
    schoolPages: "School",
    mistakesHeading: "Go through your {n} wrong {answers} with the AI tutor",
    mistakesBody: "The AI tutor explains each one in simple steps — a hint first, then the working.",
    mistakesButton: "Explain my mistakes →",
    askText: "Have a question about {chapter}?",
    askLink: "Ask the AI tutor →",
    aiLine: "You will be talking to an AI tutor, not a person.",
    honesty: "These practice questions are Shishya's own, answer-checked before they are shown — not taken from the NCERT book or any board paper.",
    backToChapter: "← Back to the chapter",
    practiseAgain: "Practise this chapter again →",
    topicAsk: "Ask the AI tutor about this",
  },
  hi: {
    schoolPages: "स्कूल",
    mistakesHeading: "अपने {n} गलत {answers} AI ट्यूटर के साथ समझें",
    mistakesBody: "AI ट्यूटर हर एक को आसान चरणों में समझाता है — पहले संकेत, फिर पूरा हल।",
    mistakesButton: "मेरी गलतियाँ समझाओ →",
    askText: "{chapter} के बारे में कोई सवाल है?",
    askLink: "AI ट्यूटर से पूछें →",
    aiLine: "आप एक AI ट्यूटर से बात करेंगे, किसी व्यक्ति से नहीं।",
    honesty: "ये अभ्यास प्रश्न Shishya के अपने हैं, दिखाने से पहले इनके उत्तर जाँचे गए हैं — ये NCERT की किताब या किसी बोर्ड पेपर से नहीं लिए गए।",
    backToChapter: "← अध्याय पर वापस",
    practiseAgain: "इस अध्याय का फिर से अभ्यास करें →",
    topicAsk: "इस बारे में AI ट्यूटर से पूछें",
  },
  te: {
    schoolPages: "స్కూల్",
    mistakesHeading: "మీ {n} తప్పు {answers} AI ట్యూటర్‌తో అర్థం చేసుకోండి",
    mistakesBody: "AI ట్యూటర్ ప్రతి దాన్ని సులభమైన దశల్లో వివరిస్తుంది — ముందు సూచన, తర్వాత పరిష్కారం.",
    mistakesButton: "నా తప్పులు వివరించు →",
    askText: "{chapter} గురించి ఏదైనా ప్రశ్న ఉందా?",
    askLink: "AI ట్యూటర్‌ను అడగండి →",
    aiLine: "మీరు మాట్లాడేది AI ట్యూటర్‌తో, మనిషితో కాదు.",
    honesty: "ఈ అభ్యాస ప్రశ్నలు Shishya సొంతవి, చూపించే ముందు జవాబులు తనిఖీ చేయబడ్డాయి — NCERT పుస్తకం నుంచి గానీ, ఏ బోర్డు పేపర్ నుంచి గానీ తీసుకున్నవి కావు.",
    backToChapter: "← అధ్యాయానికి తిరిగి వెళ్లండి",
    practiseAgain: "ఈ అధ్యాయాన్ని మళ్లీ సాధన చేయండి →",
    topicAsk: "దీని గురించి AI ట్యూటర్‌ను అడగండి",
  },
};

export function schoolResultsCopy(locale: string | null | undefined): SchoolResultsCopy {
  return pickCopy(RESULTS, locale);
}

/** "Go through your 3 wrong answers …" with the count and its plural filled in. */
export function schoolMistakesHeading(locale: string | null | undefined, n: number): string {
  const c = schoolResultsCopy(locale);
  const answers = locale === "hi" ? "उत्तर" : locale === "te" ? "జవాబులు" : n === 1 ? "answer" : "answers";
  return fillTemplate(c.mistakesHeading, { n, answers });
}

/** The seed the school results page opens the tutor with: the chapter, the
 *  wrong count and the weakest chapter pieces — hint-first, no exam framing,
 *  no personal detail. */
export function schoolMistakesSeed(i: { chapterName: string; cls: number; wrong: number; weakest: string[] }): string {
  return (
    `I practised "${i.chapterName}" (Class ${i.cls}) and got ${i.wrong} ${i.wrong === 1 ? "question" : "questions"} wrong` +
    (i.weakest.length ? ` — mostly on ${i.weakest.join(", ")}` : "") +
    `. Go through my mistakes one at a time: give me a hint first, then show the working step by step.`
  );
}

// ── Per-question review (school attempt) ────────────────────────────
// 26 Sep 2026 (fixer): the review component
// (src/app/attempts/[id]/results/ResultsReview.tsx) is English-only like
// every line it prints. On a school attempt it shows Shishya's own solution
// and ONE AI entry per question — the school tutor, chapter-scoped, hint
// first — and none of the exam pieces: no "Explain (AI)" (POST /api/explain
// runs the exam explainer outside the school persona and the 20-a-day cap),
// no expert call, no exam mistake notebook.

export const SCHOOL_REVIEW_COPY = {
  /** Above the list when something was answered wrong or skipped. */
  toReview: (n: number) => `${n} to look at again — open any question to see its solution, or ask the AI tutor about it.`,
  askTutor: "Ask the AI tutor about this question →",
  aiLine: "You will be talking to an AI tutor, not a person.",
} as const;

/** The seed one question's "Ask the AI tutor" opens with: the chapter, the
 *  question (Shishya's own text, never a textbook's) and what was picked —
 *  hint-first, no exam framing, no personal detail. */
export function schoolQuestionSeed(i: { chapterName: string; cls: number; index: number; chosen: string | null; answerKey: string; body: string }): string {
  const body = i.body.length > 200 ? `${i.body.slice(0, 200)}…` : i.body;
  return (
    `On question ${i.index + 1} of my "${i.chapterName}" (Class ${i.cls}) practice ` +
    (i.chosen ? `I picked ${i.chosen} but the answer was ${i.answerKey}.` : `I skipped it; the answer was ${i.answerKey}.`) +
    ` The question was: "${body}". Give me a hint first, then show the working step by step.`
  );
}

// ── Dashboard (school-only account) ─────────────────────────────────
// 26 Sep 2026 (fixer): /dashboard is bilingual (en / hi / te), so its school
// block speaks the three languages like the results page does. A
// school-only account (band declared, no real-exam enrolment) sees its
// classes and its recent practice — never a streak, group, Daily-5, coach
// or invite piece.

export interface SchoolDashboardCopy {
  heading: string;
  body: string;
  /** {board} {n} */
  classLabel: string;
  open: string;
  recent: string;
  allClasses: string;
  aiLine: string;
}

const DASHBOARD: Readonly<Record<CopyLocale, SchoolDashboardCopy>> = {
  en: {
    heading: "Your classes",
    body: "Open your class, pick a chapter, and practise it or ask the AI tutor about it.",
    classLabel: "{board} Class {n}",
    open: "Open →",
    recent: "Your recent practice",
    allClasses: "All school classes →",
    aiLine: RESULTS.en.aiLine,
  },
  hi: {
    heading: "आपकी कक्षाएँ",
    body: "अपनी कक्षा खोलें, कोई अध्याय चुनें, और उसका अभ्यास करें या AI ट्यूटर से उसके बारे में पूछें।",
    classLabel: "{board} कक्षा {n}",
    open: "खोलें →",
    recent: "आपका हालिया अभ्यास",
    allClasses: "सभी स्कूल कक्षाएँ →",
    aiLine: RESULTS.hi.aiLine,
  },
  te: {
    heading: "మీ తరగతులు",
    body: "మీ తరగతిని తెరిచి, ఒక అధ్యాయాన్ని ఎంచుకుని, దాన్ని సాధన చేయండి లేదా దాని గురించి AI ట్యూటర్‌ను అడగండి.",
    classLabel: "{board} తరగతి {n}",
    open: "తెరవండి →",
    recent: "మీ ఇటీవలి సాధన",
    allClasses: "అన్ని స్కూల్ తరగతులు →",
    aiLine: RESULTS.te.aiLine,
  },
};

export function schoolDashboardCopy(locale: string | null | undefined): SchoolDashboardCopy {
  return pickCopy(DASHBOARD, locale);
}
