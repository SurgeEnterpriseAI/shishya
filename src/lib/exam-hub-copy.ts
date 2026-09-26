// Exam hub (/exams/{code}) and its FAQ in the reader's language
// (16 Sep 2026).
//
// The hub is a twin (/hi/exams/X, /te/exams/X) and the lines changed in the
// 11-16 Sep waves were hard-coded English: the signed-out coach CTA, the
// exam-week rehearsal banner, the score-calculator pill, the language line,
// the PYQ-pattern note and the four ExamFaq answers.
//
// The strings live here, not in src/lib/i18n.ts (another surface owns the
// dictionary this wave), as a per-locale map — the NAV_TODAY_BY_LOCALE
// pattern in src/lib/study-day-copy.ts. Only the type import touches
// @/lib/i18n. English is the default everywhere and is byte-identical to the
// pre-16-Sep page; tests/unit/i18n-b-surfaces-copy.test.ts pins it.
//
// Honesty carried into every locale, never softened:
//   • questions are written with AI to follow each exam's syllabus topics
//     on Shishya and re-checked when a student reports one (27 Sep 2026: it
//     said "from the official syllabus and notification", but the question
//     generators read the Subject / Topic tree in Shishya's DB, not an
//     official document — the wording wave 2 uses on /mock-tests) — never
//     "verified by students who cleared the exam", never "validated by an
//     admin team" (the pre-26-Sep wording; live questions are not passed by
//     an admin);
//   • the automated answer check (three independent AI solves and an
//     examiner — scripts/verify-question-bank.ts) is claimed only for the
//     questions it actually passed, exam by exam (faqCountAnswer below).
//     26 Sep 2026 (repair): the free answer said every question was
//     "answer-checked … before they go live", but 157 validated questions
//     on 55 real exams carried no answer-check record (validated at insert
//     or in bulk — system:pyq-pattern, system:bulk, sme-bulk), and pickers
//     serve every validated question. The count answer now prints the
//     split from src/lib/exam-answer-check.ts — "every one of them has
//     passed", or "has passed N of them; for the remaining M, that check has
//     not run yet" — and, when that read fails, no check claim at all
//     (tests/unit/exam-hub-copy.test.ts);
//   • PYQ sets are "PYQ-pattern … not the paper itself", with the N-of-M
//     depth against the real paper's count;
//   • the conducting body's own papers are the "official" ones;
//   • no countdown pressure, no counters, no social proof.
//
// NOTE (seam): src/lib/twin-localisation.ts scores the hub twin from the
// i18n keys the page names and its hard-coded English. Strings moved here
// are invisible to that measure, so the hub twin verdict stays "not
// localised" until TWIN_CHROME.hub is re-measured. Nothing on the page
// changes for an English visitor meanwhile.

import type { Locale } from "@/lib/i18n";

export type HubCopyLocale = "en" | "hi" | "te";

export function hubCopyLocale(locale: Locale | string | null | undefined): HubCopyLocale {
  return locale === "hi" || locale === "te" ? locale : "en";
}

/** Dict-free {placeholder} fill — same shape as fillTemplate in @/lib/i18n. */
export function fillHub(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m,
  );
}

/**
 * The FAQ count answer (26 Sep 2026, repair). `count` is the hub's validated
 * count; `unchecked` is how many of those carry no answer-check pass record
 * (src/lib/exam-answer-check.ts), or null when that read failed. Only the
 * questions the check passed are ever called checked:
 *   • null (or nothing passed)  → faqCountA, no check claim;
 *   • 0 unchecked              → faqCountCheckedA, "every one of them";
 *   • some unchecked           → faqCountPartA, "{checked} … the remaining {unchecked}".
 */
export function faqCountAnswer(
  C: Pick<ExamHubCopy, "faqCountA" | "faqCountCheckedA" | "faqCountPartA">,
  v: { count: number; unchecked: number | null; short: string },
): string {
  const fmt = (n: number) => n.toLocaleString("en-IN");
  const count = Math.max(0, Math.floor(v.count));
  const base = { count: fmt(count), short: v.short };
  if (v.unchecked === null || !Number.isFinite(v.unchecked)) return fillHub(C.faqCountA, base);
  // The two counts come from caches filled at different moments; never let
  // the split claim more unchecked questions than the count holds.
  const unchecked = Math.min(count, Math.max(0, Math.floor(v.unchecked)));
  const checked = count - unchecked;
  if (checked === 0) return fillHub(C.faqCountA, base);
  if (unchecked === 0) return fillHub(C.faqCountCheckedA, base);
  return fillHub(C.faqCountPartA, { ...base, checked: fmt(checked), unchecked: fmt(unchecked) });
}

export interface ExamHubCopy {
  /** Pills and banners. */
  scoreCalc: string;
  rehearsalKicker: string;
  rehearsalOpen: string;
  rehearsalSoon: string;
  /** Signed-out coach CTA — split so <strong>Shishya</strong> stays bold. */
  coachTitle: string;
  coachBodyA: string;
  coachBodyB: string;
  coachButton: string;
  /** Custom mock builder line. */
  buildMock: string;
  langLine: string;
  /** Previous-papers section. */
  pyqNote: string;
  pyqSet: string;
  pyqSetNoTotal: string;
  pyqPaperYear: string;
  pyqPaperThat: string;
  /** ExamFaq. */
  faqHeading: string;
  faqFreeQ: string;
  faqFreeA: string;
  faqCountQ: string;
  /** Count answer when the answer-check split could not be read — no check claim. */
  faqCountA: string;
  /** Count answer when every validated question of the exam passed the answer check. */
  faqCountCheckedA: string;
  /** Count answer when some did not: {checked} passed, {unchecked} not run yet. */
  faqCountPartA: string;
  faqPyqQ: string;
  faqPyqOfficialA: string;
  faqPyqA: string;
  faqYearOne: string;
  faqYearMany: string;
  faqLengthQ: string;
  faqLengthA: string;
  durHourOne: string;
  durHourMany: string;
  durMinutes: string;
  durJoin: string;
}

export const EXAM_HUB_COPY: Readonly<Record<HubCopyLocale, ExamHubCopy>> = {
  en: {
    scoreCalc: "Score calculator",
    rehearsalKicker: "Exam-week rehearsal",
    rehearsalOpen: "open now, closes {time} IST on exam eve",
    rehearsalSoon: "opens soon, closes {time} IST on exam eve",
    coachTitle: "Free {short} mock tests and previous year paper practice — start now.",
    coachBodyA: "Full-length mocks with instant scoring and solutions, PYQ-pattern papers, topic-wise tests and Ask ",
    coachBodyB:
      "when you're stuck. Your scores, rank and a free day-by-day plan are saved to your account. All free, no credit card. Content is AI-drafted and checked against the official notification.",
    coachButton: "Sign in free — start practising →",
    buildMock: "Build your own mock — pick exact topics →",
    langLine: "· every mock readable in हिंदी + {n} languages inside the test",
    pyqNote:
      "Previous year paper practice: each year is a set of PYQ-pattern questions — freshly worded in the pattern of that year's paper, not the paper itself. Every card shows how many it holds against the real paper's count.",
    pyqSet: "{held} PYQ-pattern questions modelled on {paper} (which had {total})",
    pyqSetNoTotal: "{held} PYQ-pattern questions modelled on {paper}",
    pyqPaperYear: "the {year} paper",
    pyqPaperThat: "that year's paper",
    faqHeading: "{short} — Frequently asked questions",
    faqFreeQ: "Is Shishya free for {short} preparation?",
    faqFreeA:
      "Yes. Every {short} mock test, PYQ-pattern paper and study tool on Shishya is completely free — no subscription and no credit card. Questions are written with AI to follow each exam's syllabus topics on Shishya, and re-checked whenever a student reports one.",
    faqCountQ: "How many {short} practice questions does Shishya have?",
    faqCountA:
      "Shishya has {count} {short} practice questions, written with AI (any question a student reports is re-checked), available as adaptive mock tests with a worked solution for every question.",
    faqCountCheckedA:
      "Shishya has {count} {short} practice questions, written with AI; every one of them has passed an automated answer check (three independent AI solves and an examiner), and any question a student reports is re-checked. They are available as adaptive mock tests with a worked solution for every question.",
    faqCountPartA:
      "Shishya has {count} {short} practice questions, written with AI. The automated answer check (three independent AI solves and an examiner) has passed {checked} of them; for the remaining {unchecked}, that check has not run yet. Any question a student reports is re-checked. They are available as adaptive mock tests with a worked solution for every question.",
    faqPyqQ: "Are {short} previous year question papers available?",
    faqPyqOfficialA:
      "Yes. The official {short} previous year papers the conducting body published are linked on this page, and Shishya has free PYQ-pattern practice papers covering {range} ({n} {yearWord}) — questions freshly worded in the pattern of each year's paper, not the paper itself; each year's page shows how many questions it holds against the real paper's count. Each is a timed practice set with full solutions.",
    faqPyqA:
      "Shishya has free {short} previous year paper practice: PYQ-pattern papers covering {range} ({n} {yearWord}) — questions freshly worded in the pattern of each year's paper, not the paper itself; each year's page shows how many questions it holds against the real paper's count. Each is a timed practice set with full solutions.",
    faqYearOne: "year",
    faqYearMany: "years",
    faqLengthQ: "How long is the {short} exam?",
    faqLengthA:
      "The {name} ({short}) runs for {dur}. Shishya's mock tests mirror this duration so you can practise under real exam-time pressure.",
    durHourOne: "{h} hour",
    durHourMany: "{h} hours",
    durMinutes: "{m} minutes",
    durJoin: "{hours} {minutes}",
  },
  hi: {
    scoreCalc: "स्कोर कैलकुलेटर",
    rehearsalKicker: "परीक्षा-सप्ताह रिहर्सल",
    rehearsalOpen: "अभी खुला है, परीक्षा से एक दिन पहले {time} IST पर बंद",
    rehearsalSoon: "जल्द खुलेगा, परीक्षा से एक दिन पहले {time} IST पर बंद",
    coachTitle: "मुफ़्त {short} मॉक टेस्ट और पिछले साल के पेपर का अभ्यास — अभी शुरू करें।",
    coachBodyA:
      "पूरी लंबाई के मॉक, तुरंत स्कोर और हल के साथ; PYQ-पैटर्न पेपर, टॉपिक-वार टेस्ट, और अटकने पर पूछिए ",
    coachBodyB:
      "से। आपके स्कोर, रैंक और एक मुफ़्त रोज़-ब-रोज़ प्लान आपके अकाउंट में सेव रहते हैं। सब मुफ़्त, कोई क्रेडिट कार्ड नहीं। सामग्री AI से तैयार है और आधिकारिक अधिसूचना से मिलाकर जाँची जाती है।",
    coachButton: "मुफ़्त साइन इन करें — अभ्यास शुरू करें →",
    buildMock: "अपना मॉक खुद बनाएँ — ठीक वही टॉपिक चुनें →",
    langLine: "· हर मॉक टेस्ट के अंदर हिंदी + {n} भाषाओं में पढ़ा जा सकता है",
    pyqNote:
      "पिछले साल के पेपर की प्रैक्टिस: हर साल का सेट PYQ-पैटर्न सवालों का है — उस साल के पेपर के पैटर्न पर नए सिरे से लिखे गए, पेपर खुद नहीं। हर कार्ड बताता है कि असली पेपर के मुक़ाबले उसमें कितने सवाल हैं।",
    pyqSet: "{paper} के पैटर्न पर बने {held} PYQ-पैटर्न सवाल (उस पेपर में {total} थे)",
    pyqSetNoTotal: "{paper} के पैटर्न पर बने {held} PYQ-पैटर्न सवाल",
    pyqPaperYear: "{year} के पेपर",
    pyqPaperThat: "उस साल के पेपर",
    faqHeading: "{short} — अक्सर पूछे जाने वाले सवाल",
    faqFreeQ: "क्या {short} की तैयारी के लिए Shishya मुफ़्त है?",
    faqFreeA:
      "हाँ। Shishya पर हर {short} मॉक टेस्ट, PYQ-पैटर्न पेपर और स्टडी टूल पूरी तरह मुफ़्त है — न कोई सब्सक्रिप्शन, न क्रेडिट कार्ड। सवाल Shishya पर हर परीक्षा के सिलेबस के टॉपिक के हिसाब से AI से लिखे जाते हैं, और कोई छात्र किसी सवाल की शिकायत करे तो उसे दोबारा जाँचा जाता है।",
    faqCountQ: "Shishya पर {short} के कितने प्रैक्टिस सवाल हैं?",
    faqCountA:
      "Shishya पर {short} के {count} प्रैक्टिस सवाल हैं, जो AI से लिखे गए हैं (किसी सवाल की शिकायत आने पर उसे दोबारा जाँचा जाता है); ये एडेप्टिव मॉक टेस्ट के रूप में मिलते हैं और हर सवाल का हल दिया रहता है।",
    faqCountCheckedA:
      "Shishya पर {short} के {count} प्रैक्टिस सवाल हैं, जो AI से लिखे गए हैं; हर सवाल एक स्वचालित जाँच (तीन अलग-अलग AI हल और एक परीक्षक) में पास हुआ है, और किसी सवाल की शिकायत आने पर उसे दोबारा जाँचा जाता है। ये एडेप्टिव मॉक टेस्ट के रूप में मिलते हैं और हर सवाल का हल दिया रहता है।",
    faqCountPartA:
      "Shishya पर {short} के {count} प्रैक्टिस सवाल हैं, जो AI से लिखे गए हैं। स्वचालित जाँच (तीन अलग-अलग AI हल और एक परीक्षक) में इनमें से {checked} सवाल पास हुए हैं; बाकी {unchecked} पर यह जाँच अभी नहीं चली है। किसी सवाल की शिकायत आने पर उसे दोबारा जाँचा जाता है। ये एडेप्टिव मॉक टेस्ट के रूप में मिलते हैं और हर सवाल का हल दिया रहता है।",
    faqPyqQ: "क्या {short} के पिछले साल के प्रश्नपत्र उपलब्ध हैं?",
    faqPyqOfficialA:
      "हाँ। परीक्षा कराने वाली संस्था ने जो आधिकारिक {short} पिछले साल के पेपर प्रकाशित किए हैं, वे इसी पेज पर लिंक किए गए हैं, और Shishya पर {range} ({n} {yearWord}) के मुफ़्त PYQ-पैटर्न प्रैक्टिस पेपर हैं — हर साल के पेपर के पैटर्न पर नए सिरे से लिखे गए सवाल, पेपर खुद नहीं; हर साल का पेज बताता है कि असली पेपर के मुक़ाबले उसमें कितने सवाल हैं। हर सेट हल सहित एक टाइम्ड प्रैक्टिस सेट है।",
    faqPyqA:
      "Shishya पर {short} के पिछले साल के पेपर की मुफ़्त प्रैक्टिस है: {range} ({n} {yearWord}) के PYQ-पैटर्न पेपर — हर साल के पेपर के पैटर्न पर नए सिरे से लिखे गए सवाल, पेपर खुद नहीं; हर साल का पेज बताता है कि असली पेपर के मुक़ाबले उसमें कितने सवाल हैं। हर सेट हल सहित एक टाइम्ड प्रैक्टिस सेट है।",
    faqYearOne: "साल",
    faqYearMany: "साल",
    faqLengthQ: "{short} परीक्षा कितनी देर की होती है?",
    faqLengthA:
      "{name} ({short}) {dur} की होती है। Shishya के मॉक टेस्ट यही अवधि रखते हैं, ताकि आप असली परीक्षा के समय-दबाव में अभ्यास कर सकें।",
    durHourOne: "{h} घंटा",
    durHourMany: "{h} घंटे",
    durMinutes: "{m} मिनट",
    durJoin: "{hours} {minutes}",
  },
  te: {
    scoreCalc: "స్కోరు కాలిక్యులేటర్",
    rehearsalKicker: "పరీక్ష వారం రిహార్సల్",
    rehearsalOpen: "ఇప్పుడు తెరిచి ఉంది, పరీక్ష ముందు రోజు {time} IST కి ముగుస్తుంది",
    rehearsalSoon: "త్వరలో తెరుచుకుంటుంది, పరీక్ష ముందు రోజు {time} IST కి ముగుస్తుంది",
    coachTitle: "ఉచిత {short} మాక్ టెస్టులు, గత సంవత్సరాల పేపర్ల సాధన — ఇప్పుడే మొదలుపెట్టండి.",
    coachBodyA:
      "వెంటనే స్కోరు, పరిష్కారాలతో పూర్తి నిడివి మాక్‌లు, PYQ-ప్యాటర్న్ పేపర్లు, టాపిక్-వారీ టెస్టులు, ఆగిపోయినప్పుడు అడగడానికి ",
    coachBodyB:
      "ఉంది. మీ స్కోర్లు, ర్యాంకు, ఉచిత రోజువారీ ప్లాన్ మీ అకౌంట్‌లో సేవ్ అవుతాయి. అంతా ఉచితం, క్రెడిట్ కార్డ్ అవసరం లేదు. కంటెంట్ AI రూపొందించినది, అధికారిక నోటిఫికేషన్‌తో సరిచూసినది.",
    coachButton: "ఉచితంగా సైన్ ఇన్ చేయండి — సాధన మొదలుపెట్టండి →",
    buildMock: "మీ సొంత మాక్ తయారుచేయండి — కావలసిన టాపిక్‌లు ఎంచుకోండి →",
    // "हिंदी + {n}" = Hindi plus {n} OTHER languages (OTHER_INDIAN_LANGUAGE_COUNT);
    // "including Hindi" would understate the count.
    langLine: "· ప్రతి మాక్‌ను టెస్ట్ లోపల హిందీ + మరో {n} భాషల్లో చదవుకోవచ్చు",
    pyqNote:
      "గత సంవత్సరాల ప్రశ్నపత్రాల ప్రాక్టీస్: ప్రతి సంవత్సరం ఒక PYQ-ప్యాటర్న్ ప్రశ్నల సెట్ — ఆ సంవత్సరం పేపర్ ప్యాటర్న్‌లో కొత్తగా రాసినవి, పేపర్ మాత్రం కాదు. అసలు పేపర్‌తో పోలిస్తే ఎన్ని ప్రశ్నలు ఉన్నాయో ప్రతి కార్డు చూపుతుంది.",
    pyqSet: "{paper} ప్యాటర్న్‌లో రూపొందించిన {held} PYQ-ప్యాటర్న్ ప్రశ్నలు (ఆ పేపర్‌లో {total} ఉన్నాయి)",
    pyqSetNoTotal: "{paper} ప్యాటర్న్‌లో రూపొందించిన {held} PYQ-ప్యాటర్న్ ప్రశ్నలు",
    pyqPaperYear: "{year} పేపర్",
    pyqPaperThat: "ఆ సంవత్సరం పేపర్",
    faqHeading: "{short} — తరచుగా అడిగే ప్రశ్నలు",
    faqFreeQ: "{short} సన్నద్ధతకు Shishya ఉచితమా?",
    faqFreeA:
      "అవును. Shishyaలో ప్రతి {short} మాక్ టెస్ట్, PYQ-ప్యాటర్న్ పేపర్, స్టడీ టూల్ పూర్తిగా ఉచితం — సబ్‌స్క్రిప్షన్ లేదు, క్రెడిట్ కార్డ్ లేదు. ప్రశ్నలను Shishyaలోని ప్రతి పరీక్ష సిలబస్ టాపిక్‌లకు అనుగుణంగా AI రాస్తుంది; ఏ ప్రశ్నపైనైనా విద్యార్థి ఫిర్యాదు చేస్తే దాన్ని మళ్లీ సరిచూస్తారు.",
    faqCountQ: "Shishyaలో {short} ప్రాక్టీస్ ప్రశ్నలు ఎన్ని ఉన్నాయి?",
    faqCountA:
      "Shishyaలో {count} {short} ప్రాక్టీస్ ప్రశ్నలు ఉన్నాయి — AI రాసినవి (విద్యార్థి ఫిర్యాదు చేసిన ప్రశ్నను మళ్లీ సరిచూస్తారు); ఇవి అడాప్టివ్ మాక్ టెస్టులుగా లభిస్తాయి, ప్రతి ప్రశ్నకు వివరణాత్మక సమాధానం ఉంటుంది.",
    faqCountCheckedA:
      "Shishyaలో {count} {short} ప్రాక్టీస్ ప్రశ్నలు ఉన్నాయి — AI రాసినవి; ప్రతి ప్రశ్నను ఒక ఆటోమేటిక్ తనిఖీ (మూడు వేర్వేరు AI పరిష్కారాలు, ఒక ఎగ్జామినర్) ఆమోదించింది, విద్యార్థి ఫిర్యాదు చేసిన ప్రశ్నను మళ్లీ సరిచూస్తారు. ఇవి అడాప్టివ్ మాక్ టెస్టులుగా లభిస్తాయి, ప్రతి ప్రశ్నకు వివరణాత్మక సమాధానం ఉంటుంది.",
    faqCountPartA:
      "Shishyaలో {count} {short} ప్రాక్టీస్ ప్రశ్నలు ఉన్నాయి — AI రాసినవి. ఆటోమేటిక్ తనిఖీ (మూడు వేర్వేరు AI పరిష్కారాలు, ఒక ఎగ్జామినర్) వీటిలో {checked} ప్రశ్నలను ఆమోదించింది; మిగతా {unchecked} ప్రశ్నలకు ఆ తనిఖీ ఇంకా జరగలేదు. విద్యార్థి ఫిర్యాదు చేసిన ప్రశ్నను మళ్లీ సరిచూస్తారు. ఇవి అడాప్టివ్ మాక్ టెస్టులుగా లభిస్తాయి, ప్రతి ప్రశ్నకు వివరణాత్మక సమాధానం ఉంటుంది.",
    faqPyqQ: "{short} గత సంవత్సరాల ప్రశ్నపత్రాలు అందుబాటులో ఉన్నాయా?",
    faqPyqOfficialA:
      "అవును. పరీక్ష నిర్వహించే సంస్థ ప్రచురించిన అధికారిక {short} గత సంవత్సరాల పేపర్లు ఈ పేజీలోనే లింక్ చేసి ఉన్నాయి, అలాగే Shishyaలో {range} ({n} {yearWord}) కోసం ఉచిత PYQ-ప్యాటర్న్ ప్రాక్టీస్ పేపర్లు ఉన్నాయి — ప్రతి సంవత్సరం పేపర్ ప్యాటర్న్‌లో కొత్తగా రాసిన ప్రశ్నలు, పేపర్ మాత్రం కాదు; అసలు పేపర్‌తో పోలిస్తే ఎన్ని ప్రశ్నలు ఉన్నాయో ప్రతి సంవత్సరం పేజీ చూపుతుంది. ప్రతి సెట్ పూర్తి వివరణలతో కూడిన టైమ్డ్ ప్రాక్టీస్ సెట్.",
    faqPyqA:
      "Shishyaలో {short} గత సంవత్సరాల ప్రశ్నపత్రాల ఉచిత ప్రాక్టీస్ ఉంది: {range} ({n} {yearWord}) కోసం PYQ-ప్యాటర్న్ పేపర్లు — ప్రతి సంవత్సరం పేపర్ ప్యాటర్న్‌లో కొత్తగా రాసిన ప్రశ్నలు, పేపర్ మాత్రం కాదు; అసలు పేపర్‌తో పోలిస్తే ఎన్ని ప్రశ్నలు ఉన్నాయో ప్రతి సంవత్సరం పేజీ చూపుతుంది. ప్రతి సెట్ పూర్తి వివరణలతో కూడిన టైమ్డ్ ప్రాక్టీస్ సెట్.",
    faqYearOne: "సంవత్సరం",
    faqYearMany: "సంవత్సరాలు",
    faqLengthQ: "{short} పరీక్ష ఎంత సేపు ఉంటుంది?",
    faqLengthA:
      "{name} ({short}) {dur} పాటు ఉంటుంది. Shishya మాక్ టెస్టులు ఇదే నిడివిని పాటిస్తాయి, తద్వారా అసలు పరీక్ష సమయ ఒత్తిడిలో మీరు సాధన చేయవచ్చు.",
    durHourOne: "{h} గంట",
    durHourMany: "{h} గంటలు",
    durMinutes: "{m} నిమిషాలు",
    durJoin: "{hours} {minutes}",
  },
};

export function examHubCopy(locale: Locale | string | null | undefined): ExamHubCopy {
  return EXAM_HUB_COPY[hubCopyLocale(locale)];
}

/** "2 hours 30 minutes" / "90 minutes" in the reader's language. */
export function hubDuration(C: ExamHubCopy, durationMin: number): string {
  const h = Math.floor(durationMin / 60);
  const m = durationMin % 60;
  if (h <= 0) return fillHub(C.durMinutes, { m });
  const hours = fillHub(h > 1 ? C.durHourMany : C.durHourOne, { h });
  return m ? fillHub(C.durJoin, { hours, minutes: fillHub(C.durMinutes, { m }) }) : hours;
}
