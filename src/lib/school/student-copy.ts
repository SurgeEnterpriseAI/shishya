// Student-mode copy (26 Sep 2026) — every sentence the Class 8-12 sign-in /
// tutor / practice entry and the school results page print, in one file, so
// tests/unit/schooling-honesty.test.ts and tests/unit/school-student-mode.test.ts
// can read the whole voice of student mode.
//
// Rules (founder decisions 26 + 27 Sep 2026; Anthropic usage policy for minors):
//   • the age line "for students 13 and above" at EVERY sign-in entry and on
//     the tutor entry, and a plain line for anyone younger (the notes and
//     the practice on the page with a parent);
//   • no age or role question is asked, anywhere (27 Sep 2026, founder:
//     content first — the one-time age-band card is gone); the tutor needs
//     no sign-in, and sign-in is offered only AFTER the practice, to save it;
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

/** The one age line every school sign-in entry carries. */
export const AGE_LINE = "For students 13 and above.";

/** The visible "you are talking to an AI" line at the tutor entry. */
export const AI_TUTOR_LINE = "You will be talking to an AI tutor, not a person. It explains in simple steps and gives hints before answers, and you can send it up to 20 messages a day.";

/** The honest label for account practice. */
export const PRACTICE_LABEL = "Shishya's own questions, answer-checked before they are shown — not taken from the NCERT book or any board paper.";

export const STUDENT_ENTRY_COPY = {
  // Anyone on a Class 8-12 chapter page (27 Sep 2026, founder: content first) — the tutor needs no sign-in and asks nothing first.
  guestHeading: "Ask the AI tutor about this chapter",
  guestBody: `No sign-in needed — it helps with your studies only. ${AGE_LINE}`,
  // 27 Sep 2026 (review): the practice clause only on a chapter that has the
  // guest practice (5+ checked questions); every other chapter gets the plain line.
  under13: "Younger than 13? Read this page with a parent.",
  under13Practice: "Younger than 13? Read this page and try its practice with a parent.",
  // Guest, after the practice on the page (the "save" slot): sign-in only to keep practice in an account.
  saveBody: `Want your practice kept? Sign in with Google to practise this chapter with your score saved to your account. ${AGE_LINE}`,
  // 2 Oct 2026: the link under it is the one shared "Sign up with Google"
  // button (src/components/SignUpButton.tsx); "saveLink" is gone.
  // Class page (CBSE / NCERT classes with a chapter map only — CISCE has no
  // chapter pages to open). "Practise" only when at least one chapter of the
  // class has checked practice; NCERT Class 11-12 have none yet.
  classHeading: (cls: number, hasPractice = false) => `Class ${cls} students: ${hasPractice ? "practise and " : ""}ask the AI tutor`,
  classGuest: `Open any chapter below to read it or ask the AI tutor about it — no sign-in needed. ${AGE_LINE}`,
  classGuestPractice: `Open any chapter below to read it, ask the AI tutor about it, or try its practice where it has some — no sign-in needed. ${AGE_LINE}`,
  classSignedIn: "You are signed in. Open any chapter below to ask the AI tutor about it.",
  classSignedInPractice: "You are signed in. Open any chapter below to practise it (where it has practice) or to ask the AI tutor about it.",
  // Signed in (chapter page)
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
// school-only account (a class-container enrolment and no real-exam
// enrolment; 27 Sep 2026: marked by the school context, no band needed) sees its
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
