// Dashboard and results cards in the student's language (16 Sep 2026 —
// i18n.8): the invite card, the Daily-5 card, the All-India rank block and
// the share-your-score block.
//
// None of these pages is a /hi or /te twin, so the locale comes from
// getT() / getLocale() (URL header → shishya-lang cookie → preferredLang).
// The server pages pass it down; DailyFiveCard, whose server caller lives
// in a file this partition does not own, reads the cookie after mount
// (src/lib/ui-locale-copy.ts).
//
// Honesty, unchanged in every language:
//   • The invite message carries the student's OWN number and promises
//     nothing — no reward, no counter, no "N friends joined".
//   • The rank block says what the rank is of ("of {n} who took this
//     rehearsal" / "of {n} across India"), never a bare rank.
//   • "no signup wall to try" stays a statement about trying, not a claim
//     that the whole product is account-free.
//
// Product names stay in Latin script: Shishya, WhatsApp, PYQ.

import { fillTemplate } from "@/lib/i18n";
import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

// ── Invite friends ───────────────────────────────────────────────────────

export interface InviteCopy {
  /** "{name} here — " (empty when the account has no name). */
  who: string;
  free: string;
  msgPersonalBest: string;
  msgFirstMock: string;
  msgExam: string;
  msgGeneric: string;
  headingMoment: string;
  headingDefault: string;
  bodyPersonalBest: string;
  bodyFirstMock: string;
  bodyDefault: string;
  shareLabel: string;
}

const INVITE: Readonly<Record<CopyLocale, InviteCopy>> = {
  en: {
    who: "{name} here — ",
    free: "free mock tests, previous-year papers & an AI tutor in your own language",
    msgPersonalBest: "{who}I just hit my personal best{score} on a {exam} mock on Shishya — {free}. Study with me:",
    msgFirstMock: "{who}I just took my first {exam} mock on Shishya — {free}. Take yours and let's compare:",
    msgExam: "{who}I'm prepping for {exam} free on Shishya — {free}, all free. Study with me:",
    msgGeneric: "{who}I'm prepping on Shishya — {free} for government exams. Study with me:",
    headingMoment: "📣 Bring your batch along",
    headingDefault: "📣 Prep is easier with your batch",
    bodyPersonalBest:
      "A good day to invite a friend or your WhatsApp study group — they get the same free mocks, papers and tutor. No signup wall to try.",
    bodyFirstMock:
      "Baseline set — invite a friend or your WhatsApp study group to take theirs. Same free mocks, papers and tutor; no signup wall to try.",
    bodyDefault:
      "Invite a friend or your WhatsApp study group — everyone gets the same free mocks, papers and tutor. No signup wall to try.",
    shareLabel: "Invite:",
  },
  hi: {
    who: "मैं {name} — ",
    // No आपकी here: the messages address the friend as तुम ("तुम भी दो",
    // "मेरे साथ पढ़ो"), and one WhatsApp line must not mix the two.
    free: "मुफ़्त मॉक टेस्ट, पिछले साल के पेपर और अपनी भाषा में AI ट्यूटर",
    msgPersonalBest:
      "{who}मैंने अभी Shishya पर {exam} मॉक में अपना अब तक का सबसे अच्छा स्कोर{score} बनाया — {free}। मेरे साथ पढ़ो:",
    msgFirstMock: "{who}मैंने अभी Shishya पर अपना पहला {exam} मॉक दिया — {free}। तुम भी दो, फिर मिलाकर देखते हैं:",
    // Worded around the verb so the line is right whoever sends it — Hindi
    // first-person verbs are gendered ("कर रहा/रही हूँ"), and a slash reads
    // like a form, not like a message a student would type.
    msgExam: "{who}मेरी {exam} की तैयारी Shishya पर मुफ़्त में चल रही है — {free}, सब मुफ़्त। मेरे साथ पढ़ो:",
    msgGeneric: "{who}मेरी तैयारी Shishya पर चल रही है — सरकारी परीक्षाओं के लिए {free}। मेरे साथ पढ़ो:",
    headingMoment: "📣 अपने बैच को भी साथ लाओ",
    headingDefault: "📣 अपने बैच के साथ तैयारी आसान है",
    bodyPersonalBest:
      "आज का दिन किसी दोस्त या अपने WhatsApp स्टडी ग्रुप को बुलाने के लिए अच्छा है — उन्हें भी वही मुफ़्त मॉक, पेपर और ट्यूटर मिलेंगे। आज़माने के लिए साइन-अप ज़रूरी नहीं।",
    bodyFirstMock:
      "आपका बेसलाइन बन गया — किसी दोस्त या अपने WhatsApp स्टडी ग्रुप को भी उनका मॉक देने के लिए बुलाएँ। वही मुफ़्त मॉक, पेपर और ट्यूटर; आज़माने के लिए साइन-अप ज़रूरी नहीं।",
    bodyDefault:
      "किसी दोस्त या अपने WhatsApp स्टडी ग्रुप को बुलाएँ — सबको वही मुफ़्त मॉक, पेपर और ट्यूटर मिलते हैं। आज़माने के लिए साइन-अप ज़रूरी नहीं।",
    shareLabel: "बुलाएँ:",
  },
  te: {
    who: "నేను {name} — ",
    // No మీ here, for the same reason: the messages say నువ్వూ / చదువు.
    free: "ఉచిత మాక్ టెస్ట్‌లు, గత సంవత్సరాల ప్రశ్నపత్రాలు, సొంత భాషలో AI ట్యూటర్",
    msgPersonalBest:
      "{who}నేను ఇప్పుడే Shishya లో {exam} మాక్‌లో నా అత్యుత్తమ స్కోరు{score} సాధించాను — {free}. నాతో కలిసి చదువు:",
    msgFirstMock: "{who}నేను ఇప్పుడే Shishya లో నా మొదటి {exam} మాక్ రాశాను — {free}. నువ్వూ రాయి, పోల్చుకుందాం:",
    msgExam: "{who}నేను Shishya లో {exam} కోసం ఉచితంగా ప్రిపేర్ అవుతున్నాను — {free}, అంతా ఉచితం. నాతో కలిసి చదువు:",
    msgGeneric: "{who}నేను Shishya లో ప్రిపేర్ అవుతున్నాను — ప్రభుత్వ పరీక్షల కోసం {free}. నాతో కలిసి చదువు:",
    headingMoment: "📣 మీ బ్యాచ్‌ని కూడా తీసుకురండి",
    headingDefault: "📣 మీ బ్యాచ్‌తో కలిసి ప్రిపరేషన్ సులభం",
    bodyPersonalBest:
      "ఒక స్నేహితుడిని లేదా మీ WhatsApp స్టడీ గ్రూప్‌ని పిలవడానికి ఇది మంచి రోజు — వాళ్లకూ అవే ఉచిత మాక్‌లు, ప్రశ్నపత్రాలు, ట్యూటర్ వస్తాయి. ప్రయత్నించడానికి సైన్-అప్ అక్కర్లేదు.",
    bodyFirstMock:
      "మీ బేస్‌లైన్ సిద్ధమైంది — ఒక స్నేహితుడిని లేదా మీ WhatsApp స్టడీ గ్రూప్‌ని కూడా వాళ్ల మాక్ రాయమని పిలవండి. అవే ఉచిత మాక్‌లు, ప్రశ్నపత్రాలు, ట్యూటర్; ప్రయత్నించడానికి సైన్-అప్ అక్కర్లేదు.",
    bodyDefault:
      "ఒక స్నేహితుడిని లేదా మీ WhatsApp స్టడీ గ్రూప్‌ని పిలవండి — అందరికీ అవే ఉచిత మాక్‌లు, ప్రశ్నపత్రాలు, ట్యూటర్ లభిస్తాయి. ప్రయత్నించడానికి సైన్-అప్ అక్కర్లేదు.",
    shareLabel: "పిలవండి:",
  },
};

export function inviteCopy(locale: string | null | undefined): InviteCopy {
  return pickCopy(INVITE, locale);
}

/** The one WhatsApp line the invite card sends. English output is
 *  byte-identical to the literals it replaced. */
export function inviteMessage(
  locale: string | null | undefined,
  p: {
    firstName: string | null;
    examShort: string | null;
    moment?: "personal-best" | "first-mock";
    scoreDisplay?: string | null;
  },
): string {
  const C = inviteCopy(locale);
  const who = p.firstName ? fillTemplate(C.who, { name: p.firstName }) : "";
  const score = p.scoreDisplay ? ` (${p.scoreDisplay})` : "";
  const vars = { who, score, exam: p.examShort ?? "", free: C.free };
  if (p.moment === "personal-best" && p.examShort) return fillTemplate(C.msgPersonalBest, vars);
  if (p.moment === "first-mock" && p.examShort) return fillTemplate(C.msgFirstMock, vars);
  if (p.examShort) return fillTemplate(C.msgExam, vars);
  return fillTemplate(C.msgGeneric, vars);
}

// ── Daily 5 ──────────────────────────────────────────────────────────────

export interface DailyFiveCopy {
  eyebrow: string;
  /** "5 quick questions on {topic} ({exam})" */
  titleTopic: string;
  titleExam: string;
  subRotated: string;
  subNormal: string;
  streakActive: string;
  streakKeep: string;
  streakNone: string;
  building: string;
  start: string;
  errBuild: string;
  errNetwork: string;
}

const DAILY_FIVE: Readonly<Record<CopyLocale, DailyFiveCopy>> = {
  en: {
    eyebrow: "☀️ Today's 5 · your daily plan",
    titleTopic: "5 quick questions on {topic} ({exam})",
    titleExam: "5 quick questions for {exam}",
    subRotated: "~3 minutes on one of your weakest topics — questions you haven't seen yet.",
    subNormal: "~3 minutes on your weakest area.",
    streakActive: "🔥 {n}-day streak — already active today, make it count.",
    streakKeep: "🔥 Keep your {n}-day streak alive.",
    streakNone: "Do it daily — small reps are how toppers are made.",
    building: "Building…",
    start: "Start today's 5 →",
    errBuild: "Couldn't build today's 5 — try again.",
    errNetwork: "Network hiccup — try again.",
  },
  hi: {
    eyebrow: "☀️ आज के 5 · आपका रोज़ का प्लान",
    titleTopic: "{topic} पर 5 झटपट सवाल ({exam})",
    titleExam: "{exam} के लिए 5 झटपट सवाल",
    subRotated: "आपके सबसे कमज़ोर टॉपिक में से एक पर ~3 मिनट — वे सवाल जो आपने अब तक नहीं देखे।",
    subNormal: "आपके सबसे कमज़ोर हिस्से पर ~3 मिनट।",
    streakActive: "🔥 {n} दिन की स्ट्रीक — आज सक्रिय हो चुके हैं, इसे सार्थक बनाएँ।",
    streakKeep: "🔥 अपनी {n} दिन की स्ट्रीक बनाए रखें।",
    streakNone: "रोज़ करें — छोटे-छोटे अभ्यास से ही टॉपर बनते हैं।",
    building: "बन रहा है…",
    start: "आज के 5 शुरू करें →",
    errBuild: "आज के 5 नहीं बन सके — फिर कोशिश करें।",
    errNetwork: "नेटवर्क में दिक्कत — फिर कोशिश करें।",
  },
  te: {
    eyebrow: "☀️ ఈరోజు 5 · మీ రోజువారీ ప్లాన్",
    titleTopic: "{topic} పై 5 చిన్న ప్రశ్నలు ({exam})",
    titleExam: "{exam} కోసం 5 చిన్న ప్రశ్నలు",
    subRotated: "మీ బలహీనమైన టాపిక్‌లలో ఒకదానిపై ~3 నిమిషాలు — మీరు ఇంకా చూడని ప్రశ్నలు.",
    subNormal: "మీ బలహీనమైన విభాగంపై ~3 నిమిషాలు.",
    streakActive: "🔥 {n} రోజుల స్ట్రీక్ — ఈరోజు ఇప్పటికే యాక్టివ్, దాన్ని ఉపయోగపడేలా చేసుకోండి.",
    streakKeep: "🔥 మీ {n} రోజుల స్ట్రీక్‌ను కొనసాగించండి.",
    streakNone: "రోజూ చేయండి — చిన్న చిన్న సాధనతోనే టాపర్లు తయారవుతారు.",
    building: "తయారవుతోంది…",
    start: "ఈరోజు 5 మొదలుపెట్టండి →",
    errBuild: "ఈరోజు 5 తయారు కాలేదు — మళ్లీ ప్రయత్నించండి.",
    errNetwork: "నెట్‌వర్క్ సమస్య — మళ్లీ ప్రయత్నించండి.",
  },
};

export function dailyFiveCopy(locale: string | null | undefined): DailyFiveCopy {
  return pickCopy(DAILY_FIVE, locale);
}

// ── All-India rank block on the results page ─────────────────────────────

export interface RankBlockCopy {
  /** "Rank #{rank}" / "🇮🇳 All-India Rank #{rank}" */
  rehearsalRank: string;
  airRank: string;
  /** "of {of} who took this rehearsal" / "of {of} across India" */
  rehearsalOf: string;
  airOf: string;
  rehearsalNote: string;
  airNote: string;
  nextLive: string;
}

const RANK_BLOCK: Readonly<Record<CopyLocale, RankBlockCopy>> = {
  en: {
    rehearsalRank: "Rank #{rank}",
    airRank: "🇮🇳 All-India Rank #{rank}",
    rehearsalOf: "of {of} who took this rehearsal",
    airOf: "of {of} across India",
    rehearsalNote: "Same paper for everyone who takes it before it closes.",
    airNote: "Same paper, same day, whole country.",
    nextLive: "Next live test →",
  },
  hi: {
    rehearsalRank: "रैंक #{rank}",
    airRank: "🇮🇳 अखिल भारतीय रैंक #{rank}",
    rehearsalOf: "उन {of} में से जिन्होंने यह रिहर्सल दी",
    airOf: "पूरे भारत के {of} में से",
    rehearsalNote: "बंद होने से पहले जो भी देगा, सबका पेपर यही होगा।",
    airNote: "एक ही पेपर, एक ही दिन, पूरा देश।",
    nextLive: "अगला लाइव टेस्ट →",
  },
  te: {
    rehearsalRank: "ర్యాంక్ #{rank}",
    airRank: "🇮🇳 అఖిల భారత ర్యాంక్ #{rank}",
    rehearsalOf: "ఈ రిహార్సల్ రాసిన {of} మందిలో",
    airOf: "భారతదేశం అంతటా {of} మందిలో",
    rehearsalNote: "మూసివేయక ముందు రాసే అందరికీ ఇదే ప్రశ్నపత్రం.",
    airNote: "ఒకే ప్రశ్నపత్రం, ఒకే రోజు, దేశం మొత్తం.",
    nextLive: "తదుపరి లైవ్ టెస్ట్ →",
  },
};

export function rankBlockCopy(locale: string | null | undefined): RankBlockCopy {
  return pickCopy(RANK_BLOCK, locale);
}

// ── Share your score ─────────────────────────────────────────────────────

export interface ShareScoreCopy {
  kicker: string;
  heading: string;
  sub: string;
  whatsapp: string;
  copy: string;
  copied: string;
  more: string;
  /** The WhatsApp / copy message. \n is a real newline in the message. */
  message: string;
  nativeTitle: string;
}

const SHARE_SCORE: Readonly<Record<CopyLocale, ShareScoreCopy>> = {
  en: {
    kicker: "🔥 Share your score",
    heading: "Tell your prep group you took this mock",
    sub: "One tap → WhatsApp message pre-filled with your score and the link. Friends who click see your card and can try 5 questions without signing in.",
    whatsapp: "Share on WhatsApp",
    copy: "Copy link",
    copied: "Copied ✓",
    more: "More…",
    message:
      "I just scored {score} on a {exam} mock at Shishya 🎯\n\nFree mocks, PYQ, AI tutor — see where YOU stand (5 questions, no sign-in):\n{link}",
    nativeTitle: "Scored {score} on {exam} — Shishya",
  },
  hi: {
    kicker: "🔥 अपना स्कोर शेयर करें",
    heading: "अपने प्रेप ग्रुप को बताएँ कि आपने यह मॉक दिया",
    sub: "एक टैप → WhatsApp संदेश आपके स्कोर और लिंक के साथ पहले से भरा हुआ। जो दोस्त क्लिक करेंगे उन्हें आपका कार्ड दिखेगा और वे बिना साइन इन किए 5 सवाल आज़मा सकेंगे।",
    whatsapp: "WhatsApp पर शेयर करें",
    copy: "लिंक कॉपी करें",
    copied: "कॉपी हो गया ✓",
    more: "और…",
    message:
      "मैंने अभी Shishya पर {exam} मॉक में {score} स्कोर किया 🎯\n\nमुफ़्त मॉक, PYQ, AI ट्यूटर — देखो तुम कहाँ हो (5 सवाल, बिना साइन-इन):\n{link}",
    nativeTitle: "{exam} में {score} स्कोर — Shishya",
  },
  te: {
    kicker: "🔥 మీ స్కోరు షేర్ చేయండి",
    heading: "మీరు ఈ మాక్ రాశారని మీ ప్రిపరేషన్ గ్రూప్‌కు చెప్పండి",
    sub: "ఒక్క ట్యాప్ → మీ స్కోరు, లింక్‌తో WhatsApp సందేశం ముందే నింపబడుతుంది. క్లిక్ చేసిన స్నేహితులకు మీ కార్డ్ కనిపిస్తుంది, సైన్ ఇన్ లేకుండా 5 ప్రశ్నలు ప్రయత్నించవచ్చు.",
    whatsapp: "WhatsApp లో షేర్ చేయండి",
    copy: "లింక్ కాపీ చేయండి",
    copied: "కాపీ అయింది ✓",
    more: "మరిన్ని…",
    message:
      "నేను ఇప్పుడే Shishya లో {exam} మాక్‌లో {score} స్కోరు చేశాను 🎯\n\nఉచిత మాక్‌లు, PYQ, AI ట్యూటర్ — నువ్వు ఎక్కడ ఉన్నావో చూడు (5 ప్రశ్నలు, సైన్-ఇన్ అవసరం లేదు):\n{link}",
    nativeTitle: "{exam} లో {score} స్కోరు — Shishya",
  },
};

export function shareScoreCopy(locale: string | null | undefined): ShareScoreCopy {
  return pickCopy(SHARE_SCORE, locale);
}
