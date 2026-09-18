// The PYQ year page in the reader's language (16 Sep 2026).
//
// /exams/{code}/pyq/{year} is a twin (/hi and /te serve the same route), and
// its whole body was English — including the both-names wording added on
// 15 Sep (29be7df, src/lib/pyq-naming.ts). That wording is the page's
// honesty, so every locale carries it with the SAME force:
//   • "previous year paper" — the search phrase, and the literal name of the
//     conducting body's own published paper where we link one;
//   • "PYQ-pattern" practice — what Shishya's own set is;
//   • "not the original questions, which Shishya does not reproduce";
//   • the N-of-M depth ("{n} questions modelled on the {year} paper, which
//     had {m}") is never rounded away or dropped;
//   • "official" stays "official" (आधिकारिक / అధికారిక).
// Nothing here may say Shishya HAS the paper.
//
// Strings live here, not in src/lib/i18n.ts (another surface owns the
// dictionary this wave), as a per-locale map — the NAV_TODAY_BY_LOCALE
// pattern in src/lib/study-day-copy.ts. Only the type import touches
// @/lib/i18n, so no bundle can pull the dictionary in through this file.
//
// English is the default for every helper and is byte-identical to the
// 15 Sep page; tests/unit/i18n-b-surfaces-copy.test.ts pins it, and
// tests/unit/pyq-naming.test.ts keeps pinning the English helpers.

import type { Locale } from "@/lib/i18n";

export type PyqCopyLocale = "en" | "hi" | "te";

export function pyqCopyLocale(locale: Locale | string | null | undefined): PyqCopyLocale {
  return locale === "hi" || locale === "te" ? locale : "en";
}

/** Dict-free {placeholder} fill — same shape as fillTemplate in @/lib/i18n. */
export function fillPyq(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m,
  );
}

export interface PyqYearCopy {
  /** Breadcrumb label for the empty-year page. */
  crumb: string;
  /** H1, both names (pyqYearH1 renders the English one). */
  h1Official: string;
  h1Practice: string;
  /** "{n} PYQ-pattern questions modelled on the {year} paper (which had {m})". */
  modelled: string;
  /** The freshly-worded / not-the-original-questions paragraph. */
  freshNote: string;
  /** Official paper block. */
  officialHeading: string;
  scannedPdf: string;
  pdf: string;
  /** WhatsApp / copy share message. */
  sharePartial: string;
  shareFull: string;
  /** Signed-out call to action. */
  ctaPartial: string;
  ctaFull: string;
  ctaBody: string;
  ctaSignIn: string;
  ctaQuiz: string;
  /** Ask Shishya block. */
  tutorHeading: string;
  tutorBody: string;
  tutorButton: string;
  tutorSeed: string;
  /** PulseAsk demand prompt for a thin year. */
  pulsePrompt: string;
  pulseYes: string;
  pulseEnough: string;
}

// The tutor seed is the message the "Ask Shishya" button sends for the
// student, and it stays English in every locale (16 Sep 2026, review fix).
// src/lib/tutor-templates.ts recognises Shishya's own prompts by their fixed
// wording so demand mining (src/lib/demand-mine.ts) does not count a button
// as a student's request; it knows this English sentence only. A Hindi or
// Telugu seed would land on /admin/demand as one identical "request" per
// click. The reply language does not depend on the seed — /api/chat takes it
// from the reader's saved language or language cookie. Translate the seed
// only together with a matching pattern (and test row) in tutor-templates.ts.
const TUTOR_SEED =
  "I'm solving PYQ-pattern questions modelled on the {short} {year} paper. Explain the questions and concepts I'm stuck on, step by step.";

export const PYQ_YEAR_COPY: Readonly<Record<PyqCopyLocale, PyqYearCopy>> = {
  en: {
    crumb: "PYQ",
    h1Official: "{short} {year} previous year paper · official paper and PYQ-pattern practice",
    h1Practice: "{short} {year} previous year paper practice · PYQ-pattern set",
    modelled: "{n} PYQ-pattern questions modelled on the {year} paper (which had {m})",
    freshNote:
      "Every question here is freshly worded in the pattern of the {year} paper — same topics, style and difficulty — not the original questions, which Shishya does not reproduce.",
    officialHeading: "The original {year} paper, as {publisher} published it",
    scannedPdf: "scanned PDF",
    pdf: "PDF",
    sharePartial: "{short} {year}: {modelled} — solve them free on Shishya, instant score:",
    shareFull: "{short} {year}: {modelled} — solve them free on Shishya, full-length timed mock, instant score:",
    ctaPartial: "Solve these {n} {year}-pattern questions as a timed mock — free",
    ctaFull: "Solve this {year}-pattern paper as a full-length timed mock — free",
    ctaBody: "{modelled} · instant scoring · topic-wise analysis. Sign in free to attempt and track your progress.",
    ctaSignIn: "Sign in free & start →",
    ctaQuiz: "or try a 5-question quiz first — no signup",
    tutorHeading: "Stuck on a question from this set?",
    tutorBody:
      "Ask Shishya — your free AI tutor — to explain any {short} {year}-pattern question, concept, or shortcut, step by step, in your language.",
    tutorButton: "Ask Shishya about this set →",
    tutorSeed: TUTOR_SEED,
    pulsePrompt:
      "Want a full-length {short} {year}-pattern paper? This page has {n} pattern questions; the real paper had {m}.",
    pulseYes: "Yes, need the full-length paper",
    pulseEnough: "This sampler is enough",
  },
  hi: {
    crumb: "PYQ",
    h1Official: "{short} {year} का पिछले साल का पेपर · आधिकारिक पेपर और PYQ-पैटर्न प्रैक्टिस",
    h1Practice: "{short} {year} पिछले साल के पेपर की प्रैक्टिस · PYQ-पैटर्न सेट",
    modelled: "{year} के पेपर के पैटर्न पर बने {n} PYQ-पैटर्न सवाल (उस पेपर में {m} सवाल थे)",
    freshNote:
      "यहाँ का हर सवाल {year} के पेपर के पैटर्न पर नए सिरे से लिखा गया है — वही टॉपिक, वही शैली और वही कठिनाई — ये असली सवाल नहीं हैं, Shishya असली सवाल दोबारा प्रकाशित नहीं करता।",
    officialHeading: "{year} का असली पेपर, जैसा {publisher} ने प्रकाशित किया",
    scannedPdf: "स्कैन किया हुआ PDF",
    pdf: "PDF",
    sharePartial: "{short} {year}: {modelled} — Shishya पर मुफ़्त हल करें, तुरंत स्कोर:",
    shareFull: "{short} {year}: {modelled} — Shishya पर मुफ़्त हल करें, पूरी लंबाई का टाइम्ड मॉक, तुरंत स्कोर:",
    ctaPartial: "{year} के पैटर्न के ये {n} सवाल टाइम्ड मॉक की तरह हल करें — मुफ़्त",
    ctaFull: "{year} के पैटर्न का यह पेपर पूरी लंबाई के टाइम्ड मॉक की तरह हल करें — मुफ़्त",
    ctaBody:
      "{modelled} · तुरंत स्कोरिंग · टॉपिक-वाइज़ विश्लेषण। हल करने और अपनी प्रगति देखने के लिए मुफ़्त साइन इन करें।",
    ctaSignIn: "मुफ़्त साइन इन करें और शुरू करें →",
    ctaQuiz: "या पहले 5 सवालों की क्विज़ आज़माएँ — बिना साइन-अप",
    tutorHeading: "इस सेट का कोई सवाल अटका रहा है?",
    tutorBody:
      "Shishya से पूछें — आपका मुफ़्त AI ट्यूटर — {short} {year} के पैटर्न का कोई भी सवाल, कॉन्सेप्ट या शॉर्टकट आपकी भाषा में, कदम-दर-कदम समझाएगा।",
    tutorButton: "इस सेट के बारे में Shishya से पूछें →",
    tutorSeed: TUTOR_SEED,
    pulsePrompt:
      "क्या आपको {short} {year} के पैटर्न का पूरी लंबाई का पेपर चाहिए? इस पेज पर {n} पैटर्न सवाल हैं; असली पेपर में {m} थे।",
    pulseYes: "हाँ, पूरी लंबाई का पेपर चाहिए",
    pulseEnough: "यह सैंपलर काफ़ी है",
  },
  te: {
    crumb: "PYQ",
    h1Official: "{short} {year} గత సంవత్సరం ప్రశ్నపత్రం · అధికారిక పేపర్ మరియు PYQ-ప్యాటర్న్ ప్రాక్టీస్",
    h1Practice: "{short} {year} గత సంవత్సరం ప్రశ్నపత్రం ప్రాక్టీస్ · PYQ-ప్యాటర్న్ సెట్",
    modelled: "{year} పేపర్ ప్యాటర్న్‌లో రూపొందించిన {n} PYQ-ప్యాటర్న్ ప్రశ్నలు (ఆ పేపర్‌లో {m} ప్రశ్నలు ఉన్నాయి)",
    freshNote:
      "ఇక్కడ ఉన్న ప్రతి ప్రశ్న {year} పేపర్ ప్యాటర్న్‌లో కొత్తగా రాసినది — అవే టాపిక్‌లు, అదే శైలి, అదే కఠినత — ఇవి అసలు ప్రశ్నలు కాదు, Shishya అసలు ప్రశ్నలను ఎక్కడా తిరిగి ప్రచురించదు.",
    officialHeading: "{year} అసలు పేపర్, {publisher} ప్రచురించిన విధంగా",
    scannedPdf: "స్కాన్ చేసిన PDF",
    pdf: "PDF",
    sharePartial: "{short} {year}: {modelled} — Shishyaలో ఉచితంగా సాల్వ్ చేయండి, వెంటనే స్కోరు:",
    shareFull: "{short} {year}: {modelled} — Shishyaలో ఉచితంగా సాల్వ్ చేయండి, పూర్తి నిడివి టైమ్డ్ మాక్, వెంటనే స్కోరు:",
    ctaPartial: "{year} ప్యాటర్న్‌లోని ఈ {n} ప్రశ్నలను టైమ్డ్ మాక్‌గా సాల్వ్ చేయండి — ఉచితం",
    ctaFull: "{year} ప్యాటర్న్ పేపర్‌ను పూర్తి నిడివి టైమ్డ్ మాక్‌గా సాల్వ్ చేయండి — ఉచితం",
    ctaBody:
      "{modelled} · వెంటనే స్కోరింగ్ · టాపిక్ వారీ విశ్లేషణ. రాయడానికి, మీ పురోగతిని చూడటానికి ఉచితంగా సైన్ ఇన్ చేయండి.",
    ctaSignIn: "ఉచితంగా సైన్ ఇన్ చేసి మొదలుపెట్టండి →",
    ctaQuiz: "లేదా ముందు 5 ప్రశ్నల క్విజ్ ప్రయత్నించండి — సైన్-అప్ అవసరం లేదు",
    tutorHeading: "ఈ సెట్‌లో ఏదైనా ప్రశ్న దగ్గర ఆగిపోయారా?",
    tutorBody:
      "Shishyaని అడగండి — మీ ఉచిత AI ట్యూటర్ — {short} {year} ప్యాటర్న్‌లోని ఏ ప్రశ్ననైనా, కాన్సెప్ట్‌నైనా, షార్ట్‌కట్‌నైనా మీ భాషలో దశలవారీగా వివరిస్తుంది.",
    tutorButton: "ఈ సెట్ గురించి Shishyaని అడగండి →",
    tutorSeed: TUTOR_SEED,
    pulsePrompt:
      "{short} {year} ప్యాటర్న్‌లో పూర్తి నిడివి పేపర్ కావాలా? ఈ పేజీలో {n} ప్యాటర్న్ ప్రశ్నలు ఉన్నాయి; అసలు పేపర్‌లో {m} ఉన్నాయి.",
    pulseYes: "అవును, పూర్తి నిడివి పేపర్ కావాలి",
    pulseEnough: "ఈ శాంపిలర్ సరిపోతుంది",
  },
};

export function pyqYearCopy(locale: Locale | string | null | undefined): PyqYearCopy {
  return PYQ_YEAR_COPY[pyqCopyLocale(locale)];
}
