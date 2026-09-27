// The guest paper's own lines (27 Sep 2026) — en, hi, te; other locales use
// English. The player's shared lines (Q of, mark, submit, confirm) come from
// src/lib/i18n.ts player.* like the signed-in player.

export type GuestPaperLocale = "en" | "hi" | "te";

export interface GuestPaperCopy {
  guestLine: string;
  timeUpTitle: string;
  timeUpBody: string;
  seeScore: string;
  startAgain: string;
  gradeFailed: string;
  retry: string;
  scoreTitle: string;
  correct: string;
  wrong: string;
  skipped: string;
  negativeNote: string;
  notSaved: string;
  signIn: string;
  signInNote: string;
  topicsTitle: string;
  practiseTopic: string;
  reviewTitle: string;
  yourAnswer: string;
  notAnswered: string;
  rightAnswer: string;
  explanation: string;
  askTutor: string;
  backToExam: string;
  showAll: string;
}

const EN: GuestPaperCopy = {
  guestLine: "No sign-in needed. Your answers stay on this device until you submit.",
  timeUpTitle: "Time is up on this paper",
  timeUpBody: "You answered {n} of {total} before the time ran out.",
  seeScore: "See my score",
  startAgain: "Start again",
  gradeFailed: "Could not check your answers just now. They are still here.",
  retry: "Try again",
  scoreTitle: "Your score",
  correct: "correct",
  wrong: "wrong",
  skipped: "skipped",
  negativeNote: "{neg} is taken off for each wrong answer.",
  notSaved: "This result is shown only here — it is not saved.",
  signIn: "Sign in free to keep your results",
  signInNote: "Shishya then remembers you — your exams, weak topics, saved results and a personal plan. We get only your name, email and profile picture from Google. For students 13 and above.",
  topicsTitle: "By topic (weakest first)",
  practiseTopic: "Ask the tutor",
  reviewTitle: "Review every question",
  yourAnswer: "Your answer",
  notAnswered: "Not answered",
  rightAnswer: "Correct answer",
  explanation: "Explanation",
  askTutor: "Ask Shishya about this question →",
  backToExam: "Back to {exam}",
  showAll: "Show all {n} questions",
};

const HI: GuestPaperCopy = {
  guestLine: "साइन-इन की ज़रूरत नहीं। सबमिट करने तक आपके जवाब इसी डिवाइस पर रहते हैं।",
  timeUpTitle: "इस पेपर का समय पूरा हो गया",
  timeUpBody: "समय खत्म होने से पहले आपने {total} में से {n} प्रश्नों के जवाब दिए।",
  seeScore: "मेरा स्कोर देखें",
  startAgain: "फिर से शुरू करें",
  gradeFailed: "अभी आपके जवाब जाँच नहीं पाए। आपके जवाब यहीं सुरक्षित हैं।",
  retry: "फिर कोशिश करें",
  scoreTitle: "आपका स्कोर",
  correct: "सही",
  wrong: "गलत",
  skipped: "छोड़े",
  negativeNote: "हर गलत जवाब पर {neg} अंक कटते हैं।",
  notSaved: "यह परिणाम केवल यहीं दिखता है — सेव नहीं होता।",
  signIn: "अपने परिणाम रखने के लिए मुफ़्त साइन इन करें",
  signInNote: "फिर Shishya आपको याद रखता है — आपकी परीक्षाएँ, कमज़ोर टॉपिक, सेव परिणाम और आपका प्लान। Google से हमें केवल आपका नाम, ईमेल और प्रोफ़ाइल फ़ोटो मिलती है। 13 साल और उससे बड़े विद्यार्थियों के लिए।",
  topicsTitle: "टॉपिक के अनुसार (सबसे कमज़ोर पहले)",
  practiseTopic: "ट्यूटर से पूछें",
  reviewTitle: "हर प्रश्न देखें",
  yourAnswer: "आपका जवाब",
  notAnswered: "जवाब नहीं दिया",
  rightAnswer: "सही जवाब",
  explanation: "व्याख्या",
  askTutor: "इस प्रश्न के बारे में Shishya से पूछें →",
  backToExam: "{exam} पर वापस",
  showAll: "सभी {n} प्रश्न दिखाएँ",
};

const TE: GuestPaperCopy = {
  guestLine: "సైన్-ఇన్ అవసరం లేదు. సబ్మిట్ చేసే వరకు మీ సమాధానాలు ఈ పరికరంలోనే ఉంటాయి.",
  timeUpTitle: "ఈ పేపర్ సమయం ముగిసింది",
  timeUpBody: "సమయం ముగిసే ముందు మీరు {total} లో {n} ప్రశ్నలకు సమాధానం ఇచ్చారు.",
  seeScore: "నా స్కోర్ చూడండి",
  startAgain: "మళ్ళీ మొదలుపెట్టండి",
  gradeFailed: "ఇప్పుడే మీ సమాధానాలు చెక్ చేయలేకపోయాం. అవి ఇక్కడే ఉన్నాయి.",
  retry: "మళ్ళీ ప్రయత్నించండి",
  scoreTitle: "మీ స్కోర్",
  correct: "సరైనవి",
  wrong: "తప్పు",
  skipped: "వదిలేసినవి",
  negativeNote: "ప్రతి తప్పు సమాధానానికి {neg} మార్కులు తగ్గుతాయి.",
  notSaved: "ఈ ఫలితం ఇక్కడ మాత్రమే కనిపిస్తుంది — సేవ్ కాదు.",
  signIn: "మీ ఫలితాలు ఉంచుకోవడానికి ఉచితంగా సైన్ ఇన్ చేయండి",
  signInNote: "అప్పుడు Shishya మిమ్మల్ని గుర్తుంచుకుంటుంది — మీ పరీక్షలు, బలహీన టాపిక్‌లు, సేవ్ అయిన ఫలితాలు, మీ ప్లాన్. Google నుంచి మాకు మీ పేరు, ఈమెయిల్, ప్రొఫైల్ ఫోటో మాత్రమే వస్తాయి. 13 ఏళ్లు, ఆపై వయసు విద్యార్థుల కోసం.",
  topicsTitle: "టాపిక్ వారీగా (బలహీనమైనవి ముందు)",
  practiseTopic: "ట్యూటర్‌ను అడగండి",
  reviewTitle: "ప్రతి ప్రశ్నను చూడండి",
  yourAnswer: "మీ సమాధానం",
  notAnswered: "సమాధానం ఇవ్వలేదు",
  rightAnswer: "సరైన సమాధానం",
  explanation: "వివరణ",
  askTutor: "ఈ ప్రశ్న గురించి Shishya ను అడగండి →",
  backToExam: "{exam} కు తిరిగి",
  showAll: "మొత్తం {n} ప్రశ్నలు చూపించు",
};

export function guestPaperCopy(locale: string): GuestPaperCopy {
  return locale === "hi" ? HI : locale === "te" ? TE : EN;
}
