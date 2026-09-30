// Words for the one-time "Your Shishya is ready" strip (30 Sep 2026, sign-up
// build 2; src/components/WelcomeStripPanel.tsx). en / hi / te, English for
// every other locale (the src/lib/ui-locale-copy.ts pattern).
//
// Honesty (founder rule): every line says only what the product does today —
//   • "{exam} is now your exam": the goal createUser enrolled
//     (src/lib/signup-profile.ts); HomeForYou, the dashboard, pickDailyFive
//     (src/lib/study-day-five.ts) and plain /chat all start from the active
//     enrolment. 30 Sep 2026 (review): the headline names Daily 5 only when
//     the exam HAS practice (examNoDaily otherwise — 24 of 192 live exams
//     had none on 30 Sep, and pickDailyFive skips them), and "Choose your exam"
//     (noExam) never promises it, since the pick can be such an exam;
//   • weak topics: a finished mock updates WeaknessMap; the signed-in exam
//     tutor reads it (src/lib/ai/tools.ts get_my_mastery);
//   • mocks and scores stay in the account (Attempt rows, /dashboard);
//   • Daily 5: /today, and the daily-five cron mails an account with an
//     active real-exam enrolment on mornings after a visit in the last 3
//     days (src/app/api/cron/daily-five/route.ts) — shown only when the
//     goal exam has practice (a set to serve) and that mail can reach the
//     account; every marketing mail carries an
//     unsubscribe link (src/lib/email.ts). Not "one tap": the link opens a
//     confirm page;
//   • a guest chat is named only when it was imported AND this browser can
//     reopen it (the chat page restores it — src/lib/guest-chat-carry.ts);
//     tutor chats in general are NOT claimed "saved" — there is no list to
//     reopen them yet;
//   • challenges and alerts only when the account holds some.
// No numbers, no rank, no "seconds".

import type { CopyLocale } from "@/lib/ui-locale-copy";

export interface WelcomeStripCopy {
  title: string;
  /** "{exam} is now your exam — …" (the goal exam has practice). */
  exam: string;
  /** The same without Daily 5: the goal exam has no practice to serve. */
  examNoDaily: string;
  noExam: string;
  change: string;
  /** The same search when no exam is set yet. */
  pick: string;
  more: string;
  weak: string;
  mocks: string;
  /** Daily 5 line, split around the "Today" link. */
  dailyA: string;
  dailyLink: string;
  dailyB: string;
  /** The imported guest chat, before its "continue" link. */
  chat: string;
  chatOnly: string;
  chatLink: string;
  challenges: string;
  alerts: string;
  close: string;
  changeLabel: string;
  changePlaceholder: string;
  changeLoading: string;
  changeNone: string;
  /** "Saved — {exam} is your exam now." */
  changeSaved: string;
  changeFailed: string;
}

const EN: WelcomeStripCopy = {
  title: "Your Shishya is ready",
  exam: "{exam} is now your exam — your home page, dashboard, Daily 5 and tutor start from it.",
  examNoDaily: "{exam} is now your exam — your home page, dashboard and tutor start from it.",
  noExam: "Choose your exam, or just start any mock — your home page, dashboard and tutor then start from that exam.",
  change: "Change exam",
  pick: "Choose your exam",
  more: "What is kept for you",
  weak: "Weak topics — every mock you finish updates them, and the tutor works on them.",
  mocks: "Your mocks and scores stay in your account.",
  dailyA: "Daily 5 — five questions picked for you on ",
  dailyLink: "Today",
  dailyB: ", and an email on mornings after you visit. Every email has an unsubscribe link.",
  chat: "Your guest chat with the tutor is in your account — ",
  chatOnly: "Your guest chat with the tutor is saved to your account — ",
  chatLink: "continue it",
  challenges: "Your challenge links — you get an email when a friend plays.",
  alerts: "Your exam alerts are linked to this account.",
  close: "Close",
  changeLabel: "Your exam",
  changePlaceholder: "Type your exam, e.g. SSC CGL, NEET, UPSC",
  changeLoading: "Loading exams…",
  changeNone: "No exam matches — try another name.",
  changeSaved: "Saved — {exam} is your exam now.",
  changeFailed: "Could not change it. Try again.",
};

const HI: WelcomeStripCopy = {
  title: "आपका Shishya तैयार है",
  exam: "{exam} अब आपकी परीक्षा है — आपका होम पेज, डैशबोर्ड, Daily 5 और ट्यूटर इसी से शुरू होते हैं।",
  examNoDaily: "{exam} अब आपकी परीक्षा है — आपका होम पेज, डैशबोर्ड और ट्यूटर इसी से शुरू होते हैं।",
  noExam: "अपनी परीक्षा चुनिए, या कोई भी मॉक शुरू कीजिए — फिर आपका होम पेज, डैशबोर्ड और ट्यूटर उसी परीक्षा से शुरू होंगे।",
  change: "परीक्षा बदलें",
  pick: "अपनी परीक्षा चुनें",
  more: "आपके लिए क्या रखा गया है",
  weak: "कमज़ोर टॉपिक — हर पूरा किया गया मॉक इन्हें अपडेट करता है, और ट्यूटर इन्हीं पर काम करता है।",
  mocks: "आपके मॉक और स्कोर आपके अकाउंट में रहते हैं।",
  dailyA: "Daily 5 — ",
  dailyLink: "आज",
  dailyB: " पेज पर आपके लिए चुने गए पाँच प्रश्न, और आपके आने के बाद वाली सुबहों में एक ईमेल। हर ईमेल में अनसब्सक्राइब लिंक होता है।",
  chat: "ट्यूटर से आपकी गेस्ट बातचीत आपके अकाउंट में है — ",
  chatOnly: "ट्यूटर से आपकी गेस्ट बातचीत आपके अकाउंट में सेव हो गई है — ",
  chatLink: "उसे जारी रखें",
  challenges: "आपके चैलेंज लिंक — कोई दोस्त खेले तो आपको ईमेल मिलेगा।",
  alerts: "आपके परीक्षा अलर्ट इस अकाउंट से जुड़ गए हैं।",
  close: "बंद करें",
  changeLabel: "आपकी परीक्षा",
  changePlaceholder: "अपनी परीक्षा लिखें, जैसे SSC CGL, NEET, UPSC",
  changeLoading: "परीक्षाएँ लोड हो रही हैं…",
  changeNone: "कोई परीक्षा नहीं मिली — दूसरा नाम लिखें।",
  changeSaved: "सेव हो गया — अब {exam} आपकी परीक्षा है।",
  changeFailed: "बदल नहीं पाए। फिर से कोशिश करें।",
};

const TE: WelcomeStripCopy = {
  title: "మీ Shishya సిద్ధంగా ఉంది",
  exam: "{exam} ఇప్పుడు మీ పరీక్ష — మీ హోమ్ పేజీ, డ్యాష్‌బోర్డ్, Daily 5, ట్యూటర్ దీని నుంచే మొదలవుతాయి.",
  examNoDaily: "{exam} ఇప్పుడు మీ పరీక్ష — మీ హోమ్ పేజీ, డ్యాష్‌బోర్డ్, ట్యూటర్ దీని నుంచే మొదలవుతాయి.",
  noExam: "మీ పరీక్షను ఎంచుకోండి, లేదా ఏదైనా మాక్ మొదలుపెట్టండి — తర్వాత మీ హోమ్ పేజీ, డ్యాష్‌బోర్డ్, ట్యూటర్ ఆ పరీక్ష నుంచే మొదలవుతాయి.",
  change: "పరీక్ష మార్చండి",
  pick: "మీ పరీక్ష ఎంచుకోండి",
  more: "మీ కోసం ఏమి ఉంచాం",
  weak: "బలహీన టాపిక్‌లు — మీరు పూర్తి చేసే ప్రతి మాక్ వాటిని అప్‌డేట్ చేస్తుంది, ట్యూటర్ వాటిపైనే పని చేస్తుంది.",
  mocks: "మీ మాక్‌లు, స్కోర్లు మీ అకౌంట్‌లో ఉంటాయి.",
  dailyA: "Daily 5 — ",
  dailyLink: "ఈరోజు",
  dailyB: " పేజీలో మీ కోసం ఎంచుకున్న ఐదు ప్రశ్నలు, మీరు వచ్చిన తర్వాతి ఉదయాల్లో ఒక ఈమెయిల్. ప్రతి ఈమెయిల్‌లో అన్‌సబ్‌స్క్రైబ్ లింక్ ఉంటుంది.",
  chat: "ట్యూటర్‌తో మీ గెస్ట్ చాట్ మీ అకౌంట్‌లో ఉంది — ",
  chatOnly: "ట్యూటర్‌తో మీ గెస్ట్ చాట్ మీ అకౌంట్‌లో సేవ్ అయింది — ",
  chatLink: "కొనసాగించండి",
  challenges: "మీ ఛాలెంజ్ లింక్‌లు — స్నేహితుడు ఆడినప్పుడు మీకు ఈమెయిల్ వస్తుంది.",
  alerts: "మీ పరీక్ష అలర్ట్‌లు ఈ అకౌంట్‌కు లింక్ అయ్యాయి.",
  close: "మూసివేయండి",
  changeLabel: "మీ పరీక్ష",
  changePlaceholder: "మీ పరీక్ష పేరు టైప్ చేయండి, ఉదా. SSC CGL, NEET, UPSC",
  changeLoading: "పరీక్షలు లోడ్ అవుతున్నాయి…",
  changeNone: "ఏ పరీక్షా సరిపోలలేదు — మరో పేరు ప్రయత్నించండి.",
  changeSaved: "సేవ్ అయింది — ఇప్పుడు {exam} మీ పరీక్ష.",
  changeFailed: "మార్చలేకపోయాం. మళ్లీ ప్రయత్నించండి.",
};

export const WELCOME_STRIP_COPY: Readonly<Record<CopyLocale, WelcomeStripCopy>> = { en: EN, hi: HI, te: TE };

/** Replace {exam} (the only placeholder these lines use). */
export function withExam(line: string, exam: string): string {
  return line.split("{exam}").join(exam);
}

/** The strip's first line. 30 Sep 2026 (review): "Daily 5" only for an exam
 *  with practice — the headline used to promise it for every goal. */
export function welcomeStripHeadline(
  c: WelcomeStripCopy,
  now: { exam: { shortName: string } | null; practice: boolean },
  saved: boolean,
): string {
  if (!now.exam) return c.noExam;
  if (saved) return withExam(c.changeSaved, now.exam.shortName);
  return withExam(now.practice ? c.exam : c.examNoDaily, now.exam.shortName);
}

/** The ticked lines the strip shows, in order — only what is true for this
 *  account (pure, so the tests can pin it). */
export function welcomeStripPoints(i: {
  dailyFiveEmail: boolean;
  hasExam: boolean;
  chatHref: string | null;
  challenges: number;
  alerts: number;
}): ("weak" | "mocks" | "daily" | "chat" | "challenges" | "alerts")[] {
  const out: ("weak" | "mocks" | "daily" | "chat" | "challenges" | "alerts")[] = ["weak", "mocks"];
  if (i.hasExam && i.dailyFiveEmail) out.push("daily");
  if (i.chatHref) out.push("chat");
  if (i.challenges > 0) out.push("challenges");
  if (i.alerts > 0) out.push("alerts");
  return out;
}
