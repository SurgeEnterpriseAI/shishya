// Words for the two next steps under a result (18 Sep 2026): the setup card
// and the "ask the AI tutor" line shown when nothing was answered wrong.
// English, Hindi, Telugu; other locales read English (pickCopy).
//
// Honesty — the card says only what the wizard's answers do TODAY:
//   • picked exams become Enrollments (src/app/api/me/onboarding-profile),
//     which is what the dashboard lists and what every email keys on;
//   • the language is stored as preferredLang and mirrored to the UI cookie —
//     the site, the AI tutor and translated questions follow it.
// The state answer only pre-selects the language step; nothing else reads it
// yet, so the card does NOT promise personalised state exams or a
// personalised hub (the 23 Aug strip did). No time claim, no counter, no
// "students like you". The tutor is called an AI tutor.
//   • Settings re-runs the wizard: stage, state and language change, exams can
//     be ADDED. Nothing on the site removes an Enrollment today (0 of 1,574
//     rows inactive, 18 Sep 2026), so the card does not say "change any of it".
// Product names stay in Latin script: Shishya, AI.

import { fillTemplate } from "@/lib/i18n";
import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export interface ResultsNextStepCopy {
  setupHeading: string;
  setupBody: string;
  setupButton: string;
  setupNote: string;
  /** Shown once, when the wizard hands the student back to this result. */
  setupSaved: string;
  /** {exam} = the exam's short name. */
  askText: string;
  askLink: string;
}

const COPY: Readonly<Record<CopyLocale, ResultsNextStepCopy>> = {
  en: {
    setupHeading: "Finish your setup — 4 quick questions",
    setupBody:
      "Your stage, state, language and target exams. The exams you pick are added to your dashboard and to the emails Shishya sends you, and your language is used for the site, the AI tutor and the questions that have a translation. You can change your stage, state and language, and add exams, later in Settings.",
    setupButton: "Finish setup →",
    setupNote: "You come back to this result afterwards.",
    setupSaved: "Setup saved. You can run it again anytime from Settings.",
    askText: "Have a question about {exam} — a topic, the syllabus, how to plan your preparation?",
    askLink: "Ask the AI tutor →",
  },
  hi: {
    setupHeading: "अपना सेटअप पूरा करें — 4 छोटे सवाल",
    setupBody:
      "आपका स्तर, राज्य, भाषा और लक्ष्य परीक्षाएँ। जो परीक्षाएँ आप चुनेंगे वे आपके डैशबोर्ड में और Shishya के भेजे ईमेल में जुड़ जाएँगी, और आपकी भाषा साइट, AI ट्यूटर और उन प्रश्नों में इस्तेमाल होगी जिनका अनुवाद उपलब्ध है। बाद में सेटिंग्स से स्तर, राज्य और भाषा बदल सकते हैं और परीक्षाएँ जोड़ सकते हैं।",
    setupButton: "सेटअप पूरा करें →",
    setupNote: "इसके बाद आप इसी परिणाम पर लौट आएँगे।",
    setupSaved: "सेटअप सेव हो गया। इसे सेटिंग्स से कभी भी दोबारा कर सकते हैं।",
    askText: "{exam} के बारे में कोई सवाल है — कोई टॉपिक, सिलेबस, या तैयारी की योजना?",
    askLink: "AI ट्यूटर से पूछें →",
  },
  te: {
    setupHeading: "మీ సెటప్ పూర్తి చేయండి — 4 చిన్న ప్రశ్నలు",
    setupBody:
      "మీ దశ, రాష్ట్రం, భాష, లక్ష్య పరీక్షలు. మీరు ఎంచుకున్న పరీక్షలు మీ డాష్‌బోర్డ్‌లోకి, Shishya పంపే ఈమెయిల్స్‌లోకి చేరతాయి; మీ భాష సైట్‌కు, AI ట్యూటర్‌కు, అనువాదం ఉన్న ప్రశ్నలకు వర్తిస్తుంది. తర్వాత సెట్టింగ్స్‌లో దశ, రాష్ట్రం, భాష మార్చుకోవచ్చు, పరీక్షలను జోడించవచ్చు.",
    setupButton: "సెటప్ పూర్తి చేయండి →",
    setupNote: "ఆ తర్వాత మీరు ఇదే ఫలితానికి తిరిగి వస్తారు.",
    setupSaved: "సెటప్ సేవ్ అయింది. సెట్టింగ్స్ నుంచి ఎప్పుడైనా మళ్లీ చేయవచ్చు.",
    askText: "{exam} గురించి ఏదైనా సందేహం ఉందా — ఒక టాపిక్, సిలబస్, లేదా ప్రిపరేషన్ ప్లాన్?",
    askLink: "AI ట్యూటర్‌ను అడగండి →",
  },
};

export function resultsNextStepCopy(locale: string | null | undefined): ResultsNextStepCopy {
  return pickCopy(COPY, locale);
}

/** The ask-the-tutor sentence with the exam's short name filled in. */
export function askTutorText(locale: string | null | undefined, examShort: string): string {
  return fillTemplate(resultsNextStepCopy(locale).askText, { exam: examShort });
}
