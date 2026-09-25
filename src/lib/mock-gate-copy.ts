// The mock gate's words, in the student's language (25 Sep 2026): the
// signed-out /mocks/[id] page, the guest-quiz section it shares with the
// signed-out /build-mock page, and the signed-in "full paper or warm up
// first?" choice. en, hi and te with the English fallback of
// src/lib/ui-locale-copy.ts; the server pages pass getT()'s locale in.
//
// Reused, not copied: the Google button's label is login.continue and the
// reassurance line is login.freeLine — the /login page's own keys.
//
// Honesty, in every language:
//   • {n} and {min} are always filled from the mock itself (its question
//     list and the timer the player runs) or from the warm-up's real
//     request (src/lib/mock-gate.ts) — never a typed number.
//   • The guest quiz saves nothing to an account, so no line here says it
//     does; after sign-in the MOCK saves score and weak topics (true of every
//     attempt). No rank claim: a rank exists only for some papers.
//   • The quiz-end button says it goes back to this mock, not that the mock
//     starts: a paper-length mock first asks full-or-warm-up.
//   • The warm-up is the hub diagnostic: a separate set, NOT part of the
//     paper. 25 Sep 2026 (review): no subject or difficulty claim —
//     ruleBasedDiagnostic (src/lib/ai/generator.ts) gives floor(5 / subjects)
//     per subject, so an exam with more than 5 subjects (32 of the 118 exams
//     with a 50+ question public mock, e.g. UP_UPSSSC_PET 16, MP_RAEO 17)
//     only ever draws from its first five, and /api/mocks tops a short set
//     up from any subject and difficulty. "Across all its subjects" was false
//     there, and "mostly easy and medium" is not guaranteed after a top-up.
//   • The note says how to get back to the paper: Back from the warm-up's
//     result returns to the choice (router.push in, results replace the
//     player — src/lib/mock-gate.ts WARMUP_RETURN_KEY). The results page
//     itself does not link to the paper, so no line says it does.
//   • 25 Sep 2026 (integration): the choice calls it "this mock", never
//     "the full paper". 18 of the 761 public 50+ question mocks that get
//     the choice are titled as part of a paper — 16 "2025 PYQ-pattern set
//     (120 of 200 questions)" and AP AMVI's two "Paper-I/II practice set" —
//     and the hub already says such a set is "not a full paper".
//
// Product names stay in Latin script: Shishya, Google.

import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export interface MockGateCopy {
  /** "{exam} mock test" — the kicker above the mock's title. */
  kicker: string;
  /** "{n} questions · {min} min" */
  size: string;
  /** Under the size, above the Google button. */
  body: string;
  /** Guest-quiz section. */
  quizHeading: string;
  /** "Try {n} {exam} questions now — …" */
  quizLine: string;
  /** "Try {n} questions now →" */
  quizStart: string;
  /** The quiz result screen's Google button on the mock gate. */
  quizEndSignIn: string;
  /** The same button on the build-mock gate. */
  buildQuizEndSignIn: string;
  /** Signed-in choice. */
  choiceHeading: string;
  choiceLine: string;
  /** "Start this mock — {n} questions · {min} min" */
  choiceFull: string;
  /** "Warm up with a short set first — {n} questions · {min} min" */
  choiceShort: string;
  /** "{exam}", "{n}" — what the warm-up is and how to get back to the paper. */
  choiceShortNote: string;
  /** Replaces choiceLine when the student comes Back from the warm-up. */
  choiceBackLine: string;
  choiceStarting: string;
}

const COPY: Readonly<Record<CopyLocale, MockGateCopy>> = {
  en: {
    kicker: "{exam} mock test",
    size: "{n} questions · {min} min",
    body: "One Google sign-in (5 seconds, no password) brings you straight back to this mock. Your score and weak topics are saved.",
    quizHeading: "Not ready to sign in?",
    quizLine: "Try {n} {exam} questions now — no sign-in. Each answer shows its solution.",
    quizStart: "Try {n} questions now →",
    quizEndSignIn: "Sign in with Google — back to this mock →",
    buildQuizEndSignIn: "Sign in with Google — build your mock →",
    choiceHeading: "How do you want to start?",
    choiceLine: "You're signed in. The clock starts only when you pick one.",
    choiceFull: "Start this mock — {n} questions · {min} min",
    choiceShort: "Warm up with a short set first — {n} questions · {min} min",
    choiceShortNote:
      "A separate {n}-question {exam} set, not part of this mock. When its result shows, press Back to come here and start this mock.",
    choiceBackLine: "Warm-up done? This mock is still here — the clock starts only when you tap it.",
    choiceStarting: "Starting…",
  },
  hi: {
    kicker: "{exam} मॉक टेस्ट",
    size: "{n} प्रश्न · {min} मिनट",
    body: "एक बार Google से साइन इन करें (5 सेकंड, कोई पासवर्ड नहीं) — आप सीधे इसी मॉक पर लौट आएँगे। आपका स्कोर और कमज़ोर टॉपिक सेव रहेंगे।",
    quizHeading: "अभी साइन इन नहीं करना?",
    quizLine: "अभी {exam} के {n} प्रश्न आज़माएँ — बिना साइन इन। हर उत्तर के साथ उसका हल दिखता है।",
    quizStart: "अभी {n} प्रश्न आज़माएँ →",
    quizEndSignIn: "Google से साइन इन करें — वापस इसी मॉक पर →",
    buildQuizEndSignIn: "Google से साइन इन करें — अपना मॉक बनाएँ →",
    choiceHeading: "आप कैसे शुरू करना चाहेंगे?",
    choiceLine: "आप साइन इन हो गए हैं। घड़ी तभी चलेगी जब आप इनमें से एक चुनेंगे।",
    choiceFull: "यह मॉक शुरू करें — {n} प्रश्न · {min} मिनट",
    choiceShort: "पहले एक छोटे सेट से वार्म-अप करें — {n} प्रश्न · {min} मिनट",
    choiceShortNote:
      "{exam} के {n} प्रश्नों का एक अलग सेट, इस मॉक का हिस्सा नहीं। उसका रिज़ल्ट दिखने पर Back दबाएँ — आप यहीं लौटकर यह मॉक शुरू कर सकेंगे।",
    choiceBackLine: "वार्म-अप हो गया? यह मॉक यहीं है — घड़ी तभी चलेगी जब आप उसे चुनेंगे।",
    choiceStarting: "शुरू हो रहा है…",
  },
  te: {
    kicker: "{exam} మాక్ టెస్ట్",
    size: "{n} ప్రశ్నలు · {min} నిమిషాలు",
    body: "ఒకసారి Googleతో sign in చేయండి (5 సెకన్లు, పాస్‌వర్డ్ లేదు) — నేరుగా ఇదే మాక్‌కు తిరిగి వస్తారు. మీ స్కోర్, బలహీన టాపిక్‌లు సేవ్ అవుతాయి.",
    quizHeading: "ఇప్పుడే sign in చేయాలని లేదా?",
    quizLine: "ఇప్పుడే {n} {exam} ప్రశ్నలు ప్రయత్నించండి — sign in అవసరం లేదు. ప్రతి జవాబుతో దాని పరిష్కారం కనిపిస్తుంది.",
    quizStart: "ఇప్పుడే {n} ప్రశ్నలు ప్రయత్నించండి →",
    quizEndSignIn: "Googleతో sign in చేయండి — తిరిగి ఇదే మాక్‌కు →",
    buildQuizEndSignIn: "Googleతో sign in చేయండి — మీ మాక్ తయారు చేసుకోండి →",
    choiceHeading: "ఎలా మొదలుపెట్టాలనుకుంటున్నారు?",
    choiceLine: "మీరు sign in అయ్యారు. మీరు ఒకటి ఎంచుకున్నప్పుడే టైమర్ మొదలవుతుంది.",
    choiceFull: "ఈ మాక్ మొదలుపెట్టండి — {n} ప్రశ్నలు · {min} నిమిషాలు",
    choiceShort: "ముందు చిన్న సెట్‌తో వార్మ్-అప్ చేయండి — {n} ప్రశ్నలు · {min} నిమిషాలు",
    choiceShortNote:
      "{exam} {n} ప్రశ్నల వేరే సెట్, ఈ మాక్‌లో భాగం కాదు. దాని ఫలితం కనిపించాక Back నొక్కండి — ఇక్కడికే తిరిగి వచ్చి ఈ మాక్ మొదలుపెట్టవచ్చు.",
    choiceBackLine: "వార్మ్-అప్ అయిందా? ఈ మాక్ ఇక్కడే ఉంది — మీరు దాన్ని ఎంచుకున్నప్పుడే టైమర్ మొదలవుతుంది.",
    choiceStarting: "మొదలవుతోంది…",
  },
};

export function mockGateCopy(locale: string | null | undefined): MockGateCopy {
  return pickCopy(COPY, locale);
}

/** For tests: every locale's map. */
export const MOCK_GATE_COPY = COPY;
