// The words of the results page's "fresh questions" card (6 Oct 2026).
//
// The card used to promise "Brand-new questions, tuned to your level … Made
// for you in a few seconds": the AI wrote them on the press. Those sets were
// never answer-checked, so since 26 Sep none could be served. A fresh set is
// now picked from the exam's answer-checked questions the student has not
// seen (src/lib/fresh-set.ts), so the card says that, and when fewer than
// five are left it says how many the student has practised instead of
// opening an empty mock.
//
// en is the founder's wording for the too-few line. hi and te are kept simple
// and close to the English — FOUNDER REVIEW: not checked by a native speaker.
// The card follows the visitor's UI language, read after mount
// (clientUiLocale, src/lib/ui-locale-copy.ts). Topic and exam names stay as
// stored (English).
//
// Pure and client-safe (no Prisma): FreshQuestionsButton imports it.
// Tests: tests/unit/fresh-checked-set.test.ts

import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export interface FreshSetCopy {
  eyebrow: string;
  /** "{count}", "{topic}" */
  title: string;
  /** "{topic}" */
  body: string;
  /** "{count}" */
  button: string;
  busy: string;
  /** "{n}" seen (in any opened mock) of "{m}" answer-checked questions for "{exam}". */
  tooFew: string;
  /** When the exam has no answer-checked question at all: "{exam}". */
  tooFewNone: string;
  topicsLink: string;
  pyqLink: string;
  /** Any failure (the server's own words are never shown). */
  failed: string;
  network: string;
}

const COPY: Readonly<Record<CopyLocale, FreshSetCopy>> = {
  en: {
    eyebrow: "✦ Want more practice?",
    title: "Get {count} fresh questions on {topic}",
    body: "Answer-checked questions you have not seen yet — {topic} first, then the rest of the exam. Ready at once.",
    button: "Get {count} fresh →",
    busy: "Picking your questions…",
    tooFew:
      "You have already seen {n} of the {m} answer-checked questions for {exam} in your mocks. More are added after they pass the answer check.",
    tooFewNone: "There are no answer-checked questions for {exam} right now. More are added after they pass the answer check.",
    topicsLink: "Topic quizzes →",
    pyqLink: "Previous-year papers →",
    failed: "Your set could not be made this time. Please try again.",
    network: "The connection dropped. Please try again.",
  },
  hi: {
    eyebrow: "✦ और अभ्यास चाहिए?",
    title: "{topic} पर {count} नए प्रश्न लें",
    body: "उत्तर-जाँच में पास हुए वे प्रश्न जो आपने अभी तक नहीं देखे — पहले {topic}, फिर परीक्षा के बाकी विषय। तुरंत तैयार।",
    button: "{count} नए प्रश्न →",
    busy: "आपके प्रश्न चुने जा रहे हैं…",
    tooFew:
      "आप {exam} के {m} उत्तर-जाँचे प्रश्नों में से {n} अपने मॉक में पहले ही देख चुके हैं। नए प्रश्न उत्तर-जाँच में पास होने के बाद जोड़े जाते हैं।",
    tooFewNone: "अभी {exam} के लिए कोई उत्तर-जाँचा प्रश्न नहीं है। नए प्रश्न उत्तर-जाँच में पास होने के बाद जोड़े जाते हैं।",
    topicsLink: "टॉपिक क्विज़ →",
    pyqLink: "पिछले वर्षों के पेपर →",
    failed: "आपका सेट इस बार नहीं बन सका। कृपया फिर से कोशिश करें।",
    network: "कनेक्शन टूट गया। कृपया फिर से कोशिश करें।",
  },
  te: {
    eyebrow: "✦ ఇంకా ప్రాక్టీస్ కావాలా?",
    title: "{topic} పై {count} కొత్త ప్రశ్నలు పొందండి",
    body: "జవాబు తనిఖీలో పాస్ అయిన, మీరు ఇంకా చూడని ప్రశ్నలు — మొదట {topic}, తర్వాత పరీక్షలోని మిగతా అంశాలు. వెంటనే సిద్ధం.",
    button: "{count} కొత్త ప్రశ్నలు →",
    busy: "మీ ప్రశ్నలు ఎంచుకుంటున్నాం…",
    tooFew:
      "{exam} కోసం జవాబు తనిఖీ అయిన {m} ప్రశ్నల్లో {n} మీరు ఇప్పటికే మీ మాక్‌లలో చూశారు. కొత్త ప్రశ్నలు జవాబు తనిఖీలో పాస్ అయిన తర్వాత జోడిస్తాం.",
    tooFewNone: "ప్రస్తుతం {exam} కోసం జవాబు తనిఖీ అయిన ప్రశ్నలు లేవు. కొత్త ప్రశ్నలు జవాబు తనిఖీలో పాస్ అయిన తర్వాత జోడిస్తాం.",
    topicsLink: "టాపిక్ క్విజ్‌లు →",
    pyqLink: "గత సంవత్సరాల పేపర్లు →",
    failed: "ఈసారి మీ సెట్ తయారు కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.",
    network: "కనెక్షన్ తెగిపోయింది. దయచేసి మళ్ళీ ప్రయత్నించండి.",
  },
};

export function freshSetCopy(locale: string | null | undefined): FreshSetCopy {
  return pickCopy(COPY, locale);
}

/** Fill "{name}" slots; a missing value leaves the slot as it is. */
export function fillFresh(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

/** The too-few line: practised {n} of {m} for {exam}, or the "none yet" line when the exam has none. */
export function tooFewLine(copy: FreshSetCopy, n: number, m: number, exam: string): string {
  return m > 0 ? fillFresh(copy.tooFew, { n, m, exam }) : fillFresh(copy.tooFewNone, { exam });
}

/** For tests: every locale's map. */
export const FRESH_SET_COPY = COPY;
