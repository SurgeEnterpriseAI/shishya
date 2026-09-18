// The words on the way INTO a quiz or a mock, in the student's language
// (16 Sep 2026 — i18n.10): the two anonymous quiz pages, the full-mock
// warning dialog, the hub mock button's two errors, the custom-mock
// builder's headings and the tutor's guest save nudge.
//
// The two quiz pages and the builder are server components with getT(), so
// they pass their locale in. StartFullMockButton and StartMockButton are
// client islands whose server callers live in files this partition does not
// own; they read the shishya-lang cookie after mount
// (src/lib/ui-locale-copy.ts). Both only show these words after a click, so
// the cookie is read long before anything is painted.
//
// Honesty, unchanged in every language:
//   • "in the pattern of the {paper}-question paper" must stay a PATTERN
//     claim — a 20-question set is never called the real paper (15 Sep 2026).
//   • "PYQ-pattern practice" keeps "pattern": these are questions built to
//     the previous years' pattern, not the original questions.
//   • "checked questions" stays — the builder's gate counts validated
//     questions, and the empty state says so plainly.
//   • The two quiz headers say "in the {exam} pattern" / "{exam}-pattern
//     questions", never "real {exam} questions": the quiz draws from every
//     validated MCQ of the exam, whatever its source (src/lib/anon-quiz.ts),
//     not from original papers. Same wording as the cutoff page's nudge that
//     links here (cutoff.nudge.body, 11 Sep 2026). English changed with hi
//     and te in the review pass of this wave; both pages are noindex.
//
// Product names stay in Latin script: Shishya, PYQ.

import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

// ── /exams/[code]/quiz ───────────────────────────────────────────────────

export interface ExamQuizCopy {
  crumb: string;
  none: string;
  explore: string;
  /** "{exam} — free {n}-question quiz" */
  h1: string;
  replay: string;
  fresh: string;
}

const EXAM_QUIZ: Readonly<Record<CopyLocale, ExamQuizCopy>> = {
  en: {
    crumb: "Free quiz",
    none: "No quiz questions here yet.",
    explore: "Explore {code} on Shishya →",
    h1: "{exam} — free {n}-question quiz",
    replay:
      "Same {n} questions as the link you opened, in the same order — no signup, instant scoring and solutions.",
    fresh:
      "No signup needed. Answer {n} questions in the {exam} pattern, get instant scoring and solutions, then unlock full mocks and your weak-topic map for free.",
  },
  hi: {
    crumb: "मुफ़्त क्विज़",
    none: "यहाँ अभी कोई क्विज़ सवाल नहीं है।",
    explore: "Shishya पर {code} देखें →",
    h1: "{exam} — {n} सवालों की मुफ़्त क्विज़",
    replay: "आपने जो लिंक खोला उसके वही {n} सवाल, उसी क्रम में — कोई साइन-अप नहीं, तुरंत स्कोर और हल।",
    fresh:
      "साइन-अप की ज़रूरत नहीं। {exam} के पैटर्न के {n} सवाल हल करें, तुरंत स्कोर और हल पाएँ, फिर पूरे मॉक और अपना कमज़ोर-टॉपिक मैप मुफ़्त में खोलें।",
  },
  te: {
    crumb: "ఉచిత క్విజ్",
    none: "ఇక్కడ ఇంకా క్విజ్ ప్రశ్నలు లేవు.",
    explore: "Shishya లో {code} చూడండి →",
    h1: "{exam} — {n} ప్రశ్నల ఉచిత క్విజ్",
    replay: "మీరు తెరిచిన లింక్‌లోని అవే {n} ప్రశ్నలు, అదే వరుసలో — సైన్-అప్ అక్కర్లేదు, వెంటనే స్కోరు, సొల్యూషన్లు.",
    fresh:
      "సైన్-అప్ అవసరం లేదు. {exam} పద్ధతిలో {n} ప్రశ్నలు రాయండి, వెంటనే స్కోరు, సొల్యూషన్లు పొందండి, తర్వాత పూర్తి మాక్‌లు, మీ బలహీన-టాపిక్ మ్యాప్ ఉచితంగా తెరవండి.",
  },
};

export function examQuizCopy(locale: string | null | undefined): ExamQuizCopy {
  return pickCopy(EXAM_QUIZ, locale);
}

// ── /exams/[code]/topics/[topicCode]/quiz ────────────────────────────────

export interface TopicQuizCopy {
  topicFallback: string;
  crumb: string;
  none: string;
  back: string;
  /** "{scope} — quick quiz" */
  h1: string;
  replay: string;
  fresh: string;
}

const TOPIC_QUIZ: Readonly<Record<CopyLocale, TopicQuizCopy>> = {
  en: {
    topicFallback: "Topic",
    crumb: "Quiz",
    none: "No questions for this topic yet.",
    back: "← Back to the notes",
    h1: "{scope} — quick quiz",
    replay:
      "Same {n} questions as the link you opened, in the same order. Instant scoring and solutions, no signup.",
    fresh:
      "{n} {exam}-pattern questions on {scope}. Instant scoring and solutions, no signup — see where you stand in a few minutes.",
  },
  hi: {
    topicFallback: "टॉपिक",
    crumb: "क्विज़",
    none: "इस टॉपिक के लिए अभी कोई सवाल नहीं है।",
    back: "← नोट्स पर वापस",
    h1: "{scope} — झटपट क्विज़",
    replay: "आपने जो लिंक खोला उसके वही {n} सवाल, उसी क्रम में। तुरंत स्कोर और हल, कोई साइन-अप नहीं।",
    fresh:
      "{scope} पर {exam} के पैटर्न के {n} सवाल। तुरंत स्कोर और हल, कोई साइन-अप नहीं — कुछ ही मिनटों में देखें आप कहाँ हैं।",
  },
  te: {
    topicFallback: "టాపిక్",
    crumb: "క్విజ్",
    none: "ఈ టాపిక్‌కు ఇంకా ప్రశ్నలు లేవు.",
    back: "← నోట్స్‌కు తిరిగి",
    h1: "{scope} — త్వరిత క్విజ్",
    replay: "మీరు తెరిచిన లింక్‌లోని అవే {n} ప్రశ్నలు, అదే వరుసలో. వెంటనే స్కోరు, సొల్యూషన్లు, సైన్-అప్ అక్కర్లేదు.",
    fresh:
      "{scope} పై {exam} పద్ధతిలో {n} ప్రశ్నలు. వెంటనే స్కోరు, సొల్యూషన్లు, సైన్-అప్ అక్కర్లేదు — కొన్ని నిమిషాల్లో మీరు ఎక్కడ ఉన్నారో చూడండి.",
  },
};

export function topicQuizCopy(locale: string | null | undefined): TopicQuizCopy {
  return pickCopy(TOPIC_QUIZ, locale);
}

// ── Full-mock warning dialog (PYQ year page) ─────────────────────────────

export interface FullMockCopy {
  headsUp: string;
  close: string;
  /** "{q} questions · {m} minutes" */
  qMin: string;
  fullLength: string;
  patternSet: string;
  clockNote: string;
  warmupNote: string;
  warmupCta: string;
  startFull: string;
  startSet: string;
  cancel: string;
}

const FULL_MOCK: Readonly<Record<CopyLocale, FullMockCopy>> = {
  en: {
    headsUp: "Heads up",
    close: "Close",
    qMin: "{q} questions · {m} minutes",
    fullLength: "This is a full-length timed mock.",
    patternSet: "This is a {q}-question timed set in the pattern of the {paper}-question paper.",
    clockNote: "The clock starts when you click Start and you can't pause it.",
    warmupNote:
      "If you've never taken a {exam} mock here before, try a quick 10-question warmup first — Shishya picks your weakest topic, adapts to you, and gets you ready for the full mock.",
    warmupCta: "Take a 10-Q warmup first →",
    startFull: "Start the full {q}-Q mock anyway",
    startSet: "Start the {q}-question set anyway",
    cancel: "Cancel",
  },
  hi: {
    headsUp: "ध्यान दें",
    close: "बंद करें",
    qMin: "{q} सवाल · {m} मिनट",
    fullLength: "यह पूरी लंबाई का टाइम्ड मॉक है।",
    patternSet: "यह {paper} सवालों के पेपर के पैटर्न पर बना {q} सवालों का टाइम्ड सेट है।",
    clockNote: "घड़ी तभी शुरू हो जाती है जब आप Start दबाते हैं, और आप उसे रोक नहीं सकते।",
    warmupNote:
      "अगर आपने यहाँ पहले कभी {exam} मॉक नहीं दिया, तो पहले 10 सवालों का झटपट वार्मअप आज़माएँ — Shishya आपका सबसे कमज़ोर टॉपिक चुनता है, आपके हिसाब से ढलता है और आपको पूरे मॉक के लिए तैयार करता है।",
    warmupCta: "पहले 10 सवालों का वार्मअप लें →",
    startFull: "फिर भी पूरा {q} सवालों का मॉक शुरू करें",
    startSet: "फिर भी {q} सवालों का सेट शुरू करें",
    cancel: "रद्द करें",
  },
  te: {
    headsUp: "గమనిక",
    close: "మూసివేయి",
    qMin: "{q} ప్రశ్నలు · {m} నిమిషాలు",
    fullLength: "ఇది పూర్తి నిడివి గల టైమ్డ్ మాక్.",
    patternSet: "ఇది {paper} ప్రశ్నల ప్రశ్నపత్రం పద్ధతిలో తయారైన {q} ప్రశ్నల టైమ్డ్ సెట్.",
    clockNote: "మీరు Start నొక్కగానే గడియారం మొదలవుతుంది, దాన్ని ఆపలేరు.",
    warmupNote:
      "మీరు ఇక్కడ ఇంతకు ముందు {exam} మాక్ రాయకపోతే, ముందు 10 ప్రశ్నల త్వరిత వార్మప్ ప్రయత్నించండి — Shishya మీ బలహీనమైన టాపిక్‌ను ఎంచుకుని, మీకు తగ్గట్టు మారి, పూర్తి మాక్‌కు సిద్ధం చేస్తుంది.",
    warmupCta: "ముందు 10 ప్రశ్నల వార్మప్ చేయండి →",
    startFull: "అయినా పూర్తి {q} ప్రశ్నల మాక్ మొదలుపెట్టండి",
    startSet: "అయినా {q} ప్రశ్నల సెట్ మొదలుపెట్టండి",
    cancel: "రద్దు",
  },
};

export function fullMockCopy(locale: string | null | undefined): FullMockCopy {
  return pickCopy(FULL_MOCK, locale);
}

// ── Hub mock button errors ───────────────────────────────────────────────

export interface MockStartCopy {
  errStart: string;
  errNetwork: string;
}

const MOCK_START: Readonly<Record<CopyLocale, MockStartCopy>> = {
  en: { errStart: "Could not start mock", errNetwork: "Network hiccup — try again." },
  hi: { errStart: "मॉक शुरू नहीं हो सका", errNetwork: "नेटवर्क में दिक्कत — फिर कोशिश करें।" },
  te: { errStart: "మాక్ మొదలవలేదు", errNetwork: "నెట్‌వర్క్ సమస్య — మళ్లీ ప్రయత్నించండి." },
};

export function mockStartCopy(locale: string | null | undefined): MockStartCopy {
  return pickCopy(MOCK_START, locale);
}

// ── /exams/[code]/build-mock ─────────────────────────────────────────────

export interface BuildMockCopy {
  crumb: string;
  h1: string;
  h1Pyq: string;
  intro: string;
  loadFailed: string;
  /** Empty builder, split around the link to the exam page. */
  emptyBefore: string;
  emptyLink: string;
  emptyAfter: string;
}

const BUILD_MOCK: Readonly<Record<CopyLocale, BuildMockCopy>> = {
  en: {
    crumb: "Build your own mock",
    h1: "Build your own {exam} mock",
    h1Pyq: "Topic-wise {exam} PYQ-pattern practice",
    intro:
      "Pick exactly the topics you want — today polity, tomorrow number system — choose the size and difficulty, and attempt it like any mock: timed, scored, full solutions, weak-topic analysis. Questions can be read in Hindi and {n} other languages inside the test.",
    loadFailed: "The topic list couldn't be loaded just now — please refresh the page.",
    emptyBefore:
      "No {exam} topic has {min} or more checked questions yet, so a topic-wise mock can't be built for this exam. Dates, notifications and results are on the ",
    emptyLink: "{exam} exam page",
    emptyAfter: ".",
  },
  hi: {
    crumb: "अपना मॉक बनाएँ",
    h1: "अपना {exam} मॉक बनाएँ",
    h1Pyq: "{exam} टॉपिक-वार PYQ-पैटर्न अभ्यास",
    intro:
      "ठीक वही टॉपिक चुनें जो आप चाहते हैं — आज पॉलिटी, कल नंबर सिस्टम — साइज़ और कठिनाई चुनें, और इसे किसी भी मॉक की तरह दें: टाइम्ड, स्कोर, पूरे हल, कमज़ोर-टॉपिक विश्लेषण। टेस्ट के अंदर सवाल हिंदी और {n} अन्य भाषाओं में पढ़े जा सकते हैं।",
    loadFailed: "टॉपिक सूची अभी लोड नहीं हो सकी — कृपया पेज रिफ़्रेश करें।",
    emptyBefore:
      "{exam} के किसी भी टॉपिक में अभी {min} या उससे ज़्यादा जाँचे गए सवाल नहीं हैं, इसलिए इस परीक्षा के लिए टॉपिक-वार मॉक नहीं बनाया जा सकता। तारीखें, नोटिफिकेशन और रिज़ल्ट ",
    emptyLink: "{exam} परीक्षा पेज",
    emptyAfter: " पर हैं।",
  },
  te: {
    crumb: "మీ సొంత మాక్ తయారు చేసుకోండి",
    h1: "మీ సొంత {exam} మాక్ తయారు చేసుకోండి",
    // "PYQ-ప్యాటర్న్" is the site's Telugu term — the mode toggle and the
    // "not the original papers" note under this h1 (build.mode.pyq,
    // build.pyq.note) use it, so the heading names the same thing.
    h1Pyq: "{exam} టాపిక్-వారీ PYQ-ప్యాటర్న్ ప్రాక్టీస్",
    intro:
      "మీకు కావలసిన టాపిక్‌లనే ఎంచుకోండి — ఈరోజు పాలిటీ, రేపు నంబర్ సిస్టమ్ — సైజు, కష్టతనం ఎంచుకుని, ఏ మాక్‌లాగే రాయండి: టైమ్డ్, స్కోరు, పూర్తి సొల్యూషన్లు, బలహీన-టాపిక్ విశ్లేషణ. టెస్ట్ లోపల ప్రశ్నలను హిందీలో, మరో {n} భాషల్లో చదవవచ్చు.",
    loadFailed: "టాపిక్ జాబితా ఇప్పుడే లోడ్ కాలేదు — దయచేసి పేజీని రిఫ్రెష్ చేయండి.",
    emptyBefore:
      "{exam} లోని ఏ టాపిక్‌కూ ఇంకా {min} లేదా అంతకంటే ఎక్కువ తనిఖీ చేసిన ప్రశ్నలు లేవు, అందుకే ఈ పరీక్షకు టాపిక్-వారీ మాక్ తయారు చేయలేము. తేదీలు, నోటిఫికేషన్లు, ఫలితాలు ",
    emptyLink: "{exam} పరీక్ష పేజీ",
    emptyAfter: "లో ఉన్నాయి.",
  },
};

export function buildMockCopy(locale: string | null | undefined): BuildMockCopy {
  return pickCopy(BUILD_MOCK, locale);
}

// ── ExamPicker ───────────────────────────────────────────────────────────

export interface ExamPickerCopy {
  alreadyYours: string;
}

const EXAM_PICKER: Readonly<Record<CopyLocale, ExamPickerCopy>> = {
  en: { alreadyYours: "Already one of your exams:" },
  hi: { alreadyYours: "यह पहले से आपकी परीक्षाओं में है:" },
  te: { alreadyYours: "ఇది ఇప్పటికే మీ పరీక్షల్లో ఒకటి:" },
};

export function examPickerCopy(locale: string | null | undefined): ExamPickerCopy {
  return pickCopy(EXAM_PICKER, locale);
}
