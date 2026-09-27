// The free sign-up offer, and where it may appear (27 Sep 2026).
//
// Founder direction (27 Sep 2026, evening — refines the morning's content
// first): content is always shown first, with no gate; AND a free sign-up
// offer appears everywhere, in every flow, except on school pages below
// Class 8 (children under 13: content only, no sign-in, no data). The offer
// says what an account really does — Shishya remembers the student and the
// site follows what they did before — and what we take: only the name, email
// and profile picture Google shares. Goal named by the founder: 100 sign-ups
// a day across schools, colleges, entrance and government exams (a target,
// not a promise).
//
// Every point below is true today:
//   • home + dashboard pick up where you left off — HomeForYou on the home
//     page (src/components/home/HomeForYou.tsx) and the dashboard;
//   • the tutor uses your weak topics — signed-in exam chats read the
//     student's WeaknessMap (src/lib/ai/tools.ts);
//   • mocks, scores and chats are saved; a free day-by-day plan — /coach;
//   • a daily 5 picked for the student (/today, src/lib/study-day-five.ts)
//     and the study streak (src/lib/db/streak.ts). (Date alerts are NOT
//     listed: any visitor can subscribe on a tracker without an account.)
//
// Pure: copy + path rules, imported by client islands and tests.

export type PitchLocale = "en" | "hi" | "te";

export interface SignupPitchCopy {
  title: string;
  lead: string;
  points: string[];
  privacy: string;
  cta: string;
  later: string;
  /** one line, for tight spots (a result screen, a chat card) */
  short: string;
}

const EN: SignupPitchCopy = {
  title: "Make Shishya yours — free",
  lead: "Sign in once and Shishya remembers you. Every visit picks up from what you did last:",
  points: [
    "Your home page and dashboard open where you left off — your exams, your last mock, your class.",
    "The AI tutor knows your weak topics and helps you on exactly those.",
    "Your mocks, scores and chats are saved, with a free day-by-day plan for your exam.",
    "A daily set of 5 questions picked for you, and your study streak.",
  ],
  privacy: "Free. One tap with Google — we get only your name, email and profile picture. No password, no phone number, no payment. For students 13 and above.",
  cta: "Sign in free with Google →",
  later: "Maybe later",
  short: "Sign in free and Shishya remembers you — your exams, weak topics, saved results and a personal plan.",
};

const HI: SignupPitchCopy = {
  title: "Shishya को अपना बनाइए — मुफ़्त",
  lead: "एक बार साइन इन कीजिए, Shishya आपको याद रखेगा। हर बार वहीं से शुरू जहाँ आपने छोड़ा था:",
  points: [
    "आपका होम पेज और डैशबोर्ड वहीं खुलते हैं जहाँ आपने छोड़ा — आपकी परीक्षाएँ, आपका पिछला मॉक, आपकी कक्षा।",
    "AI ट्यूटर आपके कमज़ोर टॉपिक जानता है और ठीक उन्हीं पर मदद करता है।",
    "आपके मॉक, स्कोर और बातचीत सेव रहते हैं, और आपकी परीक्षा के लिए मुफ़्त रोज़-ब-रोज़ प्लान।",
    "आपके लिए चुने गए रोज़ के 5 प्रश्न, और आपकी पढ़ाई की स्ट्रीक।",
  ],
  privacy: "मुफ़्त। Google से एक टैप — हमें केवल आपका नाम, ईमेल और प्रोफ़ाइल फ़ोटो मिलती है। न पासवर्ड, न फ़ोन नंबर, न भुगतान। 13 साल और उससे बड़े विद्यार्थियों के लिए।",
  cta: "Google से मुफ़्त साइन इन →",
  later: "बाद में",
  short: "मुफ़्त साइन इन कीजिए, Shishya आपको याद रखेगा — आपकी परीक्षाएँ, कमज़ोर टॉपिक, सेव परिणाम और आपका अपना प्लान।",
};

const TE: SignupPitchCopy = {
  title: "Shishya ను మీదిగా చేసుకోండి — ఉచితం",
  lead: "ఒక్కసారి సైన్ ఇన్ చేస్తే Shishya మిమ్మల్ని గుర్తుంచుకుంటుంది. ప్రతిసారీ మీరు ఆపిన చోటు నుంచే:",
  points: [
    "మీ హోమ్ పేజీ, డ్యాష్‌బోర్డ్ మీరు ఆపిన చోటే తెరుచుకుంటాయి — మీ పరీక్షలు, మీ చివరి మాక్, మీ తరగతి.",
    "AI ట్యూటర్‌కు మీ బలహీన టాపిక్‌లు తెలుసు, సరిగ్గా వాటిపైనే సహాయం చేస్తుంది.",
    "మీ మాక్‌లు, స్కోర్లు, చాట్‌లు సేవ్ అవుతాయి; మీ పరీక్షకు ఉచిత రోజువారీ ప్లాన్.",
    "మీ కోసం ఎంచుకున్న రోజువారీ 5 ప్రశ్నలు, మీ చదువు స్ట్రీక్.",
  ],
  privacy: "ఉచితం. Google తో ఒక్క ట్యాప్ — మాకు మీ పేరు, ఈమెయిల్, ప్రొఫైల్ ఫోటో మాత్రమే వస్తాయి. పాస్‌వర్డ్ లేదు, ఫోన్ నంబర్ లేదు, చెల్లింపు లేదు. 13 ఏళ్లు, ఆపై వయసు విద్యార్థుల కోసం.",
  cta: "Google తో ఉచితంగా సైన్ ఇన్ →",
  later: "తర్వాత",
  short: "ఉచితంగా సైన్ ఇన్ చేస్తే Shishya మిమ్మల్ని గుర్తుంచుకుంటుంది — మీ పరీక్షలు, బలహీన టాపిక్‌లు, సేవ్ అయిన ఫలితాలు, మీ సొంత ప్లాన్.",
};

export function signupPitchCopy(locale: string | null | undefined): SignupPitchCopy {
  return locale === "hi" ? HI : locale === "te" ? TE : EN;
}

/** School pages a child under 13 may be reading: Class 1-7 pages, and the
 *  class-agnostic school pages (/schooling and a board's hub, which list
 *  every class). No sign-up offer, ever (founder: "except school below 8th"). */
export function isChildSchoolPath(p: string | null | undefined): boolean {
  if (typeof p !== "string") return false;
  const path = p.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/schooling") return true;
  if (/^\/schooling\/[^/]+$/.test(path)) return true; // a board hub
  return /^\/schooling\/[^/]+\/class-[1-7](?:\/|$)/.test(path);
}

/** Where the site-wide offer (card and timed sheet) may show to a guest. */
export function pitchAllowedPath(p: string | null | undefined): boolean {
  if (typeof p !== "string" || !p.startsWith("/")) return false;
  if (isChildSchoolPath(p)) return false;
  return !(
    p.startsWith("/login") ||
    p.startsWith("/logout") ||
    p.startsWith("/onboarding") ||
    p.startsWith("/admin") ||
    p.startsWith("/mocks/") || // a paper in progress — its result offers sign-in itself
    p.startsWith("/attempts/") ||
    p.startsWith("/i/") ||
    p.startsWith("/join/") ||
    p.startsWith("/aptitude") ||
    p.startsWith("/dashboard") ||
    p.startsWith("/me") ||
    p === "/chat" ||
    p.startsWith("/chat?") || // the chat has its own after-value card
    p.startsWith("/chat/")
  );
}

/** Sign-in link that brings the student back to this page. */
export function signupHref(pathWithQuery: string): string {
  const back = pathWithQuery && pathWithQuery.startsWith("/") ? pathWithQuery : "/";
  return `/login?callbackUrl=${encodeURIComponent(back)}&from=pitch`;
}
