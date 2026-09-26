// State exam pages in the reader's language (16 Sep 2026).
//
// /exams/state and /exams/state/{slug} were written English-only on 15 Sep
// (SEO/AEO wave 1), including their /hi and /te twin URLs — the middleware
// accepts /hi/exams/state/maharashtra and the page rendered English.
// The pages pick the language from an optional `lang` route param, never
// from cookies or headers, so they stay prerendered; the Hindi and Telugu
// bodies reach readers once a cached [lang] twin route passes that param
// (see the header of src/app/exams/state/[slug]/page.tsx).
//
// The strings live here rather than in src/lib/i18n.ts (the dictionary is
// owned by another surface this wave), as a plain per-locale map — the
// NAV_TODAY_BY_LOCALE pattern in src/lib/study-day-copy.ts. Only the type
// import touches @/lib/i18n, so nothing here can drag the dictionary into a
// bundle.
//
// English output is byte-identical to the 15 Sep pages: en is the default
// for every helper, and tests/unit/i18n-b-surfaces-copy.test.ts pins it.
// 26 Sep 2026 (the only change since): 28 state exams are admission tests
// (src/lib/exam-kind.ts STATE_CET_CODES), so a state with one is titled
// "government and entrance exams" (h1Entrance) and lists them in their own
// group (admissionHeading); the index heading and intro count both kinds;
// and the "Also for {state} students" links (src/lib/state-exam-sections.ts)
// have their labels here. Written in hi / te by hand — no machine
// translation.
//
// Honesty carried into every locale (never softened):
//   • a date is "official" (the conducting body's own notice) or "reported"
//     (announced, cited via a secondary source) — estimates never appear on
//     these pages, and the "no date announced" line says the tracker's own
//     dates are estimates;
//   • questions are in English, READABLE in other languages inside a test —
//     the pre-15-Sep copy claimed they were "available in" those languages;
//   • apply only on the conducting body's own website;
//   • a group heading names the category and nothing more: "Teaching exams"
//     holds the TETs — eligibility tests, not recruitment — so its Hindi and
//     Telugu labels say "teaching", never "teacher recruitment" (review fix).
//
// The state's own name follows the reader's script where Shishya holds it —
// Hindi for every state, Telugu only for the Telugu-speaking states — the
// same rule src/components/StateExamsLink.tsx uses.

import type { Locale } from "@/lib/i18n";
import type { ExamType } from "@/lib/state-exams";

export type StateCopyLocale = "en" | "hi" | "te";

export function stateCopyLocale(locale: Locale | string | null | undefined): StateCopyLocale {
  return locale === "hi" || locale === "te" ? locale : "en";
}

/** Dict-free {placeholder} fill — same shape as fillTemplate in @/lib/i18n. */
export function fillState(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m,
  );
}

export interface StateCopy {
  /** Breadcrumb + shared link labels. */
  home: string;
  examsByState: string;
  allStates: string;
  browseAll: string;
  examCalendar: string;
  findExam: string;
  jobsMap: string;
  /** /exams/state/{slug} */
  h1: string;
  /** H1 for a state with at least one admission test (26 Sep 2026). */
  h1Entrance: string;
  /** The two groups on a state with admission tests (26 Sep 2026). */
  recruitmentHeading: string;
  admissionHeading: string;
  /** "Also for {state} students" block (26 Sep 2026). */
  alsoHeading: string;
  alsoColleges: string;
  alsoBoard: string;
  alsoScholarshipMatch: string;
  /** {n} {state} {pageWord}{types} + the free / languages sentences. */
  intro: string;
  examPageOne: string;
  examPageMany: string;
  cardMeta: string;
  langNotStated: string;
  upcomingHeading: string;
  noneAnnounced: string;
  tierLegend: string;
  applyHeading: string;
  applyNote: string;
  faqHeading: string;
  /** /exams/state */
  indexH1: string;
  indexIntro: string;
  indexExamOne: string;
  indexExamMany: string;
  /** stateFaq() in src/lib/state-exams.ts — visible and in the FAQPage JSON-LD. */
  faqWhichQ: string;
  faqWhichA: string;
  faqWhichMore: string;
  faqNextQ: string;
  faqNextRow: string;
  faqNextNone: string;
  faqApplyQ: string;
  faqApplyA: string;
  tierOfficialLong: string;
  tierReportedLong: string;
  /** Joiner for "A, B and C". */
  listAnd: string;
  /** Full stop between and after the "next exam" rows (Hindi ends with "।"). */
  sentenceEnd: string;
  /** PersonalisedHub's "your state" card. */
  hubPinned: string;
  hubStateLine: string;
  hubCardTitle: string;
  hubCardBody: string;
  /** Group headings, one per ExamType. */
  types: Record<ExamType, string>;
  /** The same types as a bare list for the intro sentence (no "exams"). */
  typeShort: Record<ExamType, string>;
}

export const STATE_COPY: Readonly<Record<StateCopyLocale, StateCopy>> = {
  en: {
    home: "Home",
    examsByState: "Exams by state",
    allStates: "All states",
    browseAll: "Browse all exams",
    examCalendar: "Exam calendar",
    findExam: "Which exam suits me?",
    jobsMap: "Government jobs map",
    h1: "{state} Government Exams {year}",
    h1Entrance: "{state} Government and Entrance Exams {year}",
    recruitmentHeading: "Government recruitment exams",
    admissionHeading: "Admission tests (state CETs)",
    alsoHeading: "Also for {state} students",
    alsoColleges: "Colleges in {state} — NIRF {year} rankings",
    alsoBoard: "{board} — official board links",
    alsoScholarshipMatch: "Find scholarships you may qualify for",
    intro:
      "Shishya has {n} {state} {pageWord}{types}. Each is free: mock tests in the real pattern, the syllabus, cutoffs and an exam tracker that labels every date official, reported or expected. Questions are in English and can be read in {lang} and other Indian languages inside any test.",
    examPageOne: "exam page",
    examPageMany: "exam pages",
    cardMeta: "{n} questions · {min} min · {langs}",
    langNotStated: "language not stated",
    upcomingHeading: "Upcoming announced dates",
    noneAnnounced:
      "No {state} date on Shishya's tracker is announced for the next {days} days. Each exam's tracker page lists its expected dates, marked as estimates.",
    tierLegend: "Official = the conducting body's own notice · reported = announced, cited via a secondary source.",
    applyHeading: "Where to apply",
    applyNote: "Apply only on the conducting body's own website.",
    faqHeading: "Questions students ask",
    indexH1: "Government and entrance exams by state",
    indexIntro:
      "{govCount} state government exams and {entCount} state entrance tests across {stateCount} states and union territories. Each state page lists its exams on Shishya, dates announced by the conducting body or reported with a source, where to apply, and free mock tests, syllabus and cutoffs.",
    indexExamOne: "exam",
    indexExamMany: "exams",
    faqWhichQ: "Which {state} government exams can I prepare for on Shishya?",
    faqWhichA:
      "Shishya has {n} {state} {pageWord}: {list}{more}. Each is free, with mock tests, the syllabus, cutoffs and an exam tracker: {url}",
    faqWhichMore: ", and {n} more",
    faqNextQ: "When is the next {state} government exam?",
    faqNextRow: "{exam}: {label} on {date} ({tier})",
    faqNextNone:
      "No {state} exam date on Shishya's tracker has been announced for the next {days} days. Each exam's tracker page lists its expected dates, marked as estimates.",
    faqApplyQ: "Where do I apply for {state} government exams?",
    faqApplyA: "Apply only on the conducting body's own website: {list}.",
    tierOfficialLong: "official — the conducting body's notice",
    tierReportedLong: "reported — announced, cited via a secondary source",
    listAnd: "and",
    sentenceEnd: ".",
    hubPinned: "Pinned for {state}",
    hubStateLine: "Government exams for {state} on Shishya.",
    hubCardTitle: "{state} government exams",
    hubCardBody: "Every {state} exam on Shishya, with announced dates and free mock tests.",
    types: {
      PSC: "PSC exams",
      "Staff selection": "Staff selection exams",
      Police: "Police exams",
      Teaching: "Teaching exams",
      Entrance: "Entrance exams",
      Other: "Other exams",
    },
    typeShort: {
      PSC: "PSC",
      "Staff selection": "Staff selection",
      Police: "Police",
      Teaching: "Teaching",
      Entrance: "Entrance",
      Other: "Other",
    },
  },
  hi: {
    home: "होम",
    examsByState: "राज्यवार परीक्षाएं",
    allStates: "सभी राज्य",
    browseAll: "सभी परीक्षाएं देखें",
    examCalendar: "एग्ज़ाम कैलेंडर",
    findExam: "मेरे लिए कौन-सी परीक्षा सही है?",
    jobsMap: "सरकारी नौकरियों का मैप",
    h1: "{state} सरकारी परीक्षाएं {year}",
    h1Entrance: "{state} सरकारी और प्रवेश परीक्षाएं {year}",
    recruitmentHeading: "सरकारी भर्ती परीक्षाएं",
    admissionHeading: "प्रवेश परीक्षाएं (राज्य CET)",
    alsoHeading: "{state} के छात्रों के लिए और भी",
    alsoColleges: "{state} के कॉलेज — NIRF {year} रैंकिंग",
    alsoBoard: "{board} — बोर्ड के आधिकारिक लिंक",
    alsoScholarshipMatch: "अपने लिए स्कॉलरशिप खोजें",
    intro:
      "Shishya पर {state} की {n} {pageWord}{types}। हर पेज मुफ़्त है: असली पैटर्न के मॉक टेस्ट, सिलेबस, कट-ऑफ़, और एक एग्ज़ाम ट्रैकर जो हर तारीख़ को आधिकारिक, रिपोर्टेड या अनुमानित बताता है। सवाल अंग्रेज़ी में हैं और किसी भी टेस्ट के अंदर {lang} तथा दूसरी भारतीय भाषाओं में पढ़े जा सकते हैं।",
    examPageOne: "परीक्षा का पेज है",
    examPageMany: "परीक्षाओं के पेज हैं",
    cardMeta: "{n} सवाल · {min} मिनट · {langs}",
    langNotStated: "भाषा नहीं बताई गई",
    upcomingHeading: "आगे की घोषित तारीख़ें",
    noneAnnounced:
      "अगले {days} दिनों के लिए Shishya के ट्रैकर पर {state} की कोई तारीख़ घोषित नहीं है। हर परीक्षा का ट्रैकर पेज उसकी अनुमानित तारीख़ें दिखाता है, जिन पर अनुमान का लेबल लगा रहता है।",
    tierLegend: "आधिकारिक = परीक्षा कराने वाली संस्था का अपना नोटिस · रिपोर्टेड = घोषित, किसी दूसरे स्रोत के हवाले से।",
    applyHeading: "आवेदन कहाँ करें",
    applyNote: "आवेदन सिर्फ़ परीक्षा कराने वाली संस्था की अपनी वेबसाइट पर ही करें।",
    faqHeading: "छात्र जो सवाल पूछते हैं",
    indexH1: "राज्यवार सरकारी और प्रवेश परीक्षाएं",
    indexIntro:
      "{stateCount} राज्यों और केंद्र शासित प्रदेशों की {govCount} राज्य सरकारी परीक्षाएं और {entCount} राज्य प्रवेश परीक्षाएं। हर राज्य का पेज बताता है कि Shishya पर उसकी कौन-सी परीक्षाएं हैं, कौन-सी तारीख़ें संस्था ने घोषित कीं या स्रोत के हवाले से रिपोर्ट हुईं, आवेदन कहाँ करना है, और मुफ़्त मॉक टेस्ट, सिलेबस और कट-ऑफ़।",
    indexExamOne: "परीक्षा",
    indexExamMany: "परीक्षाएं",
    faqWhichQ: "Shishya पर {state} की कौन-कौन सी सरकारी परीक्षाओं की तैयारी कर सकते हैं?",
    faqWhichA:
      "Shishya पर {state} की {n} {pageWord}: {list}{more}। हर पेज मुफ़्त है — मॉक टेस्ट, सिलेबस, कट-ऑफ़ और एग्ज़ाम ट्रैकर के साथ: {url}",
    faqWhichMore: ", और {n} अन्य",
    faqNextQ: "{state} की अगली सरकारी परीक्षा कब है?",
    faqNextRow: "{exam}: {label}, {date} को ({tier})",
    faqNextNone:
      "अगले {days} दिनों के लिए Shishya के ट्रैकर पर {state} की कोई परीक्षा तारीख़ घोषित नहीं हुई है। हर परीक्षा का ट्रैकर पेज उसकी अनुमानित तारीख़ें दिखाता है, जिन पर अनुमान का लेबल लगा रहता है।",
    faqApplyQ: "{state} की सरकारी परीक्षाओं के लिए आवेदन कहाँ करें?",
    faqApplyA: "आवेदन सिर्फ़ परीक्षा कराने वाली संस्था की अपनी वेबसाइट पर करें: {list}।",
    tierOfficialLong: "आधिकारिक — संस्था का अपना नोटिस",
    tierReportedLong: "रिपोर्टेड — घोषित, किसी दूसरे स्रोत के हवाले से",
    listAnd: "और",
    sentenceEnd: "।",
    hubPinned: "{state} के लिए पिन किया गया",
    hubStateLine: "Shishya पर {state} की सरकारी परीक्षाएं।",
    hubCardTitle: "{state} सरकारी परीक्षाएं",
    hubCardBody: "Shishya पर {state} की हर परीक्षा, घोषित तारीख़ों और मुफ़्त मॉक टेस्ट के साथ।",
    types: {
      PSC: "PSC परीक्षाएं",
      "Staff selection": "स्टाफ़ सिलेक्शन परीक्षाएं",
      Police: "पुलिस भर्ती परीक्षाएं",
      Teaching: "शिक्षण परीक्षाएं",
      Entrance: "प्रवेश परीक्षाएं",
      Other: "अन्य परीक्षाएं",
    },
    typeShort: {
      PSC: "PSC",
      "Staff selection": "स्टाफ़ सिलेक्शन",
      Police: "पुलिस भर्ती",
      Teaching: "शिक्षण",
      Entrance: "प्रवेश",
      Other: "अन्य",
    },
  },
  te: {
    home: "హోమ్",
    examsByState: "రాష్ట్రాల వారీగా పరీక్షలు",
    allStates: "అన్ని రాష్ట్రాలు",
    browseAll: "అన్ని పరీక్షలు చూడండి",
    examCalendar: "ఎగ్జామ్ క్యాలెండర్",
    findExam: "నాకు ఏ పరీక్ష సరిపోతుంది?",
    jobsMap: "ప్రభుత్వ ఉద్యోగాల మ్యాప్",
    h1: "{state} ప్రభుత్వ పరీక్షలు {year}",
    h1Entrance: "{state} ప్రభుత్వ, ప్రవేశ పరీక్షలు {year}",
    recruitmentHeading: "ప్రభుత్వ నియామక పరీక్షలు",
    admissionHeading: "ప్రవేశ పరీక్షలు (రాష్ట్ర CETలు)",
    alsoHeading: "{state} విద్యార్థుల కోసం ఇంకా",
    alsoColleges: "{state} కాలేజీలు — NIRF {year} ర్యాంకింగ్‌లు",
    alsoBoard: "{board} — బోర్డు అధికారిక లింకులు",
    alsoScholarshipMatch: "మీకు సరిపోయే స్కాలర్‌షిప్‌లు వెతకండి",
    intro:
      "Shishyaలో {state} {n} {pageWord}{types}. ప్రతి పేజీ ఉచితం: అసలు పేపర్ పద్ధతిలో మాక్ టెస్టులు, సిలబస్, కటాఫ్‌లు, ప్రతి తేదీని అధికారిక, నివేదిత లేదా అంచనా అని చెప్పే ఎగ్జామ్ ట్రాకర్. ప్రశ్నలు ఇంగ్లిష్‌లో ఉంటాయి, ఏ టెస్ట్ లోపలైనా వాటిని {lang} సహా ఇతర భారతీయ భాషల్లో చదవుకోవచ్చు.",
    examPageOne: "పరీక్ష పేజీ ఉంది",
    examPageMany: "పరీక్షల పేజీలు ఉన్నాయి",
    cardMeta: "{n} ప్రశ్నలు · {min} నిమిషాలు · {langs}",
    langNotStated: "భాష పేర్కొనలేదు",
    upcomingHeading: "ప్రకటించిన రాబోయే తేదీలు",
    noneAnnounced:
      "రాబోయే {days} రోజులకు Shishya ట్రాకర్‌లో {state} తేదీ ఏదీ ప్రకటించలేదు. ప్రతి పరీక్ష ట్రాకర్ పేజీ దాని అంచనా తేదీలను చూపుతుంది, వాటిపై అంచనా అనే గుర్తు ఉంటుంది.",
    tierLegend: "అధికారిక = పరీక్ష నిర్వహించే సంస్థ సొంత నోటీసు · నివేదిత = ప్రకటించబడింది, ద్వితీయ మూలం ఆధారంగా.",
    applyHeading: "ఎక్కడ దరఖాస్తు చేయాలి",
    applyNote: "పరీక్ష నిర్వహించే సంస్థ సొంత వెబ్‌సైట్‌లో మాత్రమే దరఖాస్తు చేయండి.",
    faqHeading: "విద్యార్థులు అడిగే ప్రశ్నలు",
    indexH1: "రాష్ట్రాల వారీగా ప్రభుత్వ, ప్రవేశ పరీక్షలు",
    indexIntro:
      "{stateCount} రాష్ట్రాలు, కేంద్రపాలిత ప్రాంతాల్లోని {govCount} రాష్ట్ర ప్రభుత్వ పరీక్షలు, {entCount} రాష్ట్ర ప్రవేశ పరీక్షలు. ప్రతి రాష్ట్ర పేజీలో Shishyaలో ఉన్న ఆ రాష్ట్ర పరీక్షలు, సంస్థ ప్రకటించిన లేదా మూలంతో నివేదించిన తేదీలు, ఎక్కడ దరఖాస్తు చేయాలి, ఉచిత మాక్ టెస్టులు, సిలబస్, కటాఫ్‌లు ఉంటాయి.",
    indexExamOne: "పరీక్ష",
    indexExamMany: "పరీక్షలు",
    faqWhichQ: "Shishyaలో {state} ఏ ప్రభుత్వ పరీక్షలకు సిద్ధం కావచ్చు?",
    faqWhichA:
      "Shishyaలో {state} {n} {pageWord}: {list}{more}. ప్రతి పేజీ ఉచితం — మాక్ టెస్టులు, సిలబస్, కటాఫ్‌లు, ఎగ్జామ్ ట్రాకర్‌తో: {url}",
    faqWhichMore: ", మరో {n}",
    faqNextQ: "{state} తదుపరి ప్రభుత్వ పరీక్ష ఎప్పుడు?",
    faqNextRow: "{exam}: {label}, {date}న ({tier})",
    faqNextNone:
      "రాబోయే {days} రోజులకు Shishya ట్రాకర్‌లో {state} పరీక్ష తేదీ ఏదీ ప్రకటించలేదు. ప్రతి పరీక్ష ట్రాకర్ పేజీ దాని అంచనా తేదీలను చూపుతుంది, వాటిపై అంచనా అనే గుర్తు ఉంటుంది.",
    faqApplyQ: "{state} ప్రభుత్వ పరీక్షలకు ఎక్కడ దరఖాస్తు చేయాలి?",
    faqApplyA: "పరీక్ష నిర్వహించే సంస్థ సొంత వెబ్‌సైట్‌లో మాత్రమే దరఖాస్తు చేయండి: {list}.",
    tierOfficialLong: "అధికారిక — సంస్థ సొంత నోటీసు",
    tierReportedLong: "నివేదిత — ప్రకటించబడింది, ద్వితీయ మూలం ఆధారంగా",
    listAnd: "మరియు",
    sentenceEnd: ".",
    hubPinned: "{state} కోసం పిన్ చేసినవి",
    hubStateLine: "Shishyaలో {state} ప్రభుత్వ పరీక్షలు.",
    hubCardTitle: "{state} ప్రభుత్వ పరీక్షలు",
    hubCardBody: "Shishyaలో {state} ప్రతి పరీక్ష, ప్రకటించిన తేదీలు, ఉచిత మాక్ టెస్టులతో.",
    types: {
      PSC: "PSC పరీక్షలు",
      "Staff selection": "స్టాఫ్ సెలక్షన్ పరీక్షలు",
      Police: "పోలీస్ పరీక్షలు",
      Teaching: "బోధన పరీక్షలు",
      Entrance: "ప్రవేశ పరీక్షలు",
      Other: "ఇతర పరీక్షలు",
    },
    typeShort: {
      PSC: "PSC",
      "Staff selection": "స్టాఫ్ సెలక్షన్",
      Police: "పోలీస్",
      Teaching: "బోధన",
      Entrance: "ప్రవేశం",
      Other: "ఇతర",
    },
  },
};

export function stateCopy(locale: Locale | string | null | undefined): StateCopy {
  return STATE_COPY[stateCopyLocale(locale)];
}

/** The state's name in the reader's script where Shishya holds it: Hindi for
 *  every state, Telugu only for the Telugu-speaking states (StateExamsLink). */
export function stateDisplayName(
  st: { name: string; hindiName: string; nativeName: string; languages: readonly string[] },
  locale: Locale | string | null | undefined,
): string {
  const lc = stateCopyLocale(locale);
  if (lc === "hi") return st.hindiName;
  if (lc === "te" && st.languages[0] === "TE") return st.nativeName;
  return st.name;
}

/** The line under the heading: the state's other names. Under an English
 *  heading it is "native · Hindi" (one name when they are the same), exactly
 *  as before; under a Hindi or Telugu heading it is whichever of the English,
 *  native and Hindi names the heading did not already use. */
export function stateOtherNames(
  st: { name: string; hindiName: string; nativeName: string; languages: readonly string[] },
  locale: Locale | string | null | undefined,
): string {
  const shown = stateDisplayName(st, locale);
  if (shown === st.name) return st.nativeName === st.hindiName ? st.hindiName : `${st.nativeName} · ${st.hindiName}`;
  return [...new Set([st.name, st.nativeName, st.hindiName])].filter((n) => n !== shown).join(" · ");
}
