// The home page's strips and rails in the reader's language (16 Sep 2026).
//
// "/" is a twin (/hi and /te), but its exam-calendar rail, the "Exams today"
// strip, the feature cards and the stats band were English for every
// visitor — the first screen a Hindi or Telugu aspirant sees.
//
// The strings live here, not in src/lib/i18n.ts (another surface owns the
// dictionary this wave), as a per-locale map — the NAV_TODAY_BY_LOCALE
// pattern in src/lib/study-day-copy.ts. Only the type import touches
// @/lib/i18n, so the dictionary never rides along. The calendar rail (a
// client island) takes its labels as plain props and imports only its
// English default from src/lib/calendar-rail-copy.ts — never this file, so
// the Hindi and Telugu copy below stays out of the browser bundle.
//
// Honesty carried into every locale, never softened:
//   • the strip shows ANNOUNCED dates only and says so, with each date's
//     source tier;
//   • an estimated exam day reads "(expected)" before the day and
//     "was expected — not confirmed" after it — never a bare date;
//   • the stats band numbers come from the live catalogue count, and the
//     labels claim nothing the number does not say;
//   • the PYQ card says "PYQ-pattern … modelled on each year's paper";
//   • a seed thread is labelled "Starter question · Shishya", never shown
//     as a student's post.
//
// English is the default for every entry and is byte-identical to the
// pre-16-Sep page; tests/unit/i18n-b-surfaces-copy.test.ts pins it.

import type { Locale } from "@/lib/i18n";
import { CALENDAR_RAIL_EN, type CalendarRailLabels } from "@/lib/calendar-rail-copy";

export type { CalendarRailLabels };

export type HomeCopyLocale = "en" | "hi" | "te";

export function homeCopyLocale(locale: Locale | string | null | undefined): HomeCopyLocale {
  return locale === "hi" || locale === "te" ? locale : "en";
}

/** Dict-free {placeholder} fill — same shape as fillTemplate in @/lib/i18n. */
export function fillHome(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m,
  );
}

export interface HomeStripCopy {
  /** ExamsTodayStrip. */
  examsToday: string;
  examsThisWeek: string;
  announcedOnly: string;
  tomorrow: string;
  inDays: string;
  pollPill: string;
  checklistToday: string;
  checklistWeek: string;
  moreOnCalendar: string;
  /** Mobile inline rail on "/". */
  calendarKicker: string;
  datesCount: string;
  replyOne: string;
  replyMany: string;
  /** Discussion labels (i18n.14) — the home rail's seed disclosure, and the
   *  same three labels the /discussions pages use, kept together so that
   *  partition can reuse them. */
  starterQuestion: string;
  shishyaAi: string;
  aiReply: string;
  anonymous: string;
  /** Signed-out sign-up block on "/". */
  signupCta: string;
  signupLine: string;
  /** PortalStatsBand. */
  statsKicker: string;
  statExams: string;
  statQuestions: string;
  statNotes: string;
  statLanguages: string;
  statFree: string;
  /** HomeFeatureCards. */
  featKicker: string;
  featHeading: string;
  featSub: string;
  featCoachTitle: string;
  featCoachBody: string;
  featPyqTitle: string;
  featPyqBody: string;
  featAdaptiveTitle: string;
  featAdaptiveBody: string;
  featWeaknessTitle: string;
  featWeaknessBody: string;
  featTutorTitle: string;
  featTutorBody: string;
  /** The calendar rail. */
  rail: CalendarRailLabels;
}

export const HOME_STRIP_COPY: Readonly<Record<HomeCopyLocale, HomeStripCopy>> = {
  en: {
    examsToday: "Exams today",
    examsThisWeek: "Exams this week",
    announcedOnly: "Announced dates only · every date with its source tier",
    tomorrow: "tomorrow",
    inDays: "in {n} days",
    pollPill: "Done with your paper? Tell us how it was →",
    checklistToday: "Timings & what to carry",
    checklistWeek: "Checklist",
    moreOnCalendar: "+{n} more on the exam calendar →",
    calendarKicker: "Exam calendar",
    datesCount: "{n} dates",
    replyOne: "reply",
    replyMany: "replies",
    starterQuestion: "Starter question · Shishya",
    shishyaAi: "Shishya AI",
    aiReply: "AI reply · not a student",
    anonymous: "Anonymous",
    signupCta: "Free sign-up — start prepping",
    signupLine: "Free day-by-day plan to exam day · scores and rank saved · one email on result day · in your language",
    statsKicker: "Everything you need to crack it — in one free place",
    statExams: "Govt & entrance exams",
    statQuestions: "Practice questions",
    statNotes: "Free study notes",
    statLanguages: "Indian languages",
    statFree: "Always free",
    featKicker: "How Shishya helps you crack it",
    // Was "The six tools you'll actually use" over five cards (16 Sep 2026,
    // review fix): the heading states no count, so it cannot go stale when a
    // card is added or removed. Hindi and Telugu below say the same.
    featHeading: "The tools you'll actually use",
    featSub: "Every prep step a serious aspirant needs, on one free platform — curated for your exam, in your language.",
    featCoachTitle: "Your personal coach",
    featCoachBody:
      "A day-by-day plan to your exam date, rebuilt every morning around what you actually did. Miss a day and it re-organises — no backlog, no guilt.",
    featPyqTitle: "Previous year papers",
    featPyqBody:
      "PYQ-pattern papers for every exam — questions modelled on each year's paper, organised by year and topic. Practise the pattern that actually appears.",
    featAdaptiveTitle: "Adaptive mocks",
    featAdaptiveBody:
      "Each next mock targets the topics you got wrong last time. Less time on what you've already mastered, more on what's blocking your score.",
    featWeaknessTitle: "Weakness map",
    featWeaknessBody:
      "Per-topic mastery score that updates with every attempt. See exactly which 3 topics deserve tomorrow's hour — no vague percentile.",
    featTutorTitle: "AI tutor on tap",
    featTutorBody:
      "Ask Shishya anything — knows your syllabus, your weak topics and every mock you've taken. Answers in English or your language.",
    rail: CALENDAR_RAIL_EN,
  },
  hi: {
    examsToday: "आज की परीक्षाएं",
    examsThisWeek: "इस हफ़्ते की परीक्षाएं",
    announcedOnly: "सिर्फ़ घोषित तारीख़ें · हर तारीख़ के साथ उसका स्रोत-स्तर",
    tomorrow: "कल",
    inDays: "{n} दिन में",
    pollPill: "पेपर हो गया? बताइए कैसा रहा →",
    checklistToday: "समय और क्या साथ ले जाना है",
    checklistWeek: "चेकलिस्ट",
    moreOnCalendar: "एग्ज़ाम कैलेंडर पर {n} और →",
    calendarKicker: "एग्ज़ाम कैलेंडर",
    datesCount: "{n} तारीख़ें",
    replyOne: "जवाब",
    replyMany: "जवाब",
    starterQuestion: "शुरुआती सवाल · Shishya",
    shishyaAi: "Shishya AI",
    aiReply: "AI का जवाब · किसी छात्र का नहीं",
    anonymous: "गुमनाम",
    signupCta: "मुफ़्त साइन-अप — तैयारी शुरू करें",
    signupLine:
      "परीक्षा के दिन तक मुफ़्त रोज़-ब-रोज़ प्लान · स्कोर और रैंक सेव · रिज़ल्ट वाले दिन एक ईमेल · आपकी भाषा में",
    statsKicker: "क्रैक करने के लिए जो चाहिए, सब एक मुफ़्त जगह पर",
    statExams: "सरकारी और प्रवेश परीक्षाएं",
    statQuestions: "प्रैक्टिस सवाल",
    statNotes: "मुफ़्त स्टडी नोट्स",
    statLanguages: "भारतीय भाषाएं",
    statFree: "हमेशा मुफ़्त",
    featKicker: "Shishya आपकी तैयारी में कैसे मदद करता है",
    featHeading: "वे टूल जो आप सच में इस्तेमाल करेंगे",
    featSub:
      "गंभीर अभ्यर्थी को तैयारी के हर कदम पर जो चाहिए, सब एक मुफ़्त प्लेटफ़ॉर्म पर — आपकी परीक्षा के हिसाब से, आपकी भाषा में।",
    featCoachTitle: "आपका निजी कोच",
    featCoachBody:
      "परीक्षा की तारीख़ तक का रोज़-ब-रोज़ प्लान, जो हर सुबह इस आधार पर फिर से बनता है कि आपने असल में क्या किया। एक दिन छूट जाए तो प्लान खुद बदल जाता है — न बैकलॉग, न अपराधबोध।",
    featPyqTitle: "पिछले साल के पेपर",
    featPyqBody:
      "हर परीक्षा के लिए PYQ-पैटर्न पेपर — हर साल के पेपर के पैटर्न पर बने सवाल, साल और टॉपिक के हिसाब से। जो पैटर्न सच में आता है, उसी का अभ्यास करें।",
    featAdaptiveTitle: "एडेप्टिव मॉक",
    featAdaptiveBody:
      "हर अगला मॉक उन्हीं टॉपिक पर ज़ोर देता है जो पिछली बार ग़लत हुए। जो आपको आता है उस पर कम समय, जो स्कोर रोक रहा है उस पर ज़्यादा।",
    featWeaknessTitle: "कमज़ोरी का नक्शा",
    featWeaknessBody:
      "हर टॉपिक पर पकड़ का स्कोर, जो हर अटेम्प्ट के साथ बदलता है। साफ़ दिखता है कि कल का एक घंटा किन 3 टॉपिक को देना है — कोई गोल-मोल परसेंटाइल नहीं।",
    featTutorTitle: "AI ट्यूटर, जब चाहें",
    featTutorBody:
      "Shishya से कुछ भी पूछें — आपका सिलेबस, आपके कमज़ोर टॉपिक और आपके सारे मॉक उसे पता हैं। जवाब अंग्रेज़ी में या आपकी भाषा में।",
    rail: {
      heading: "एग्ज़ाम कैलेंडर",
      all: "सभी",
      sections: "एग्ज़ाम कैलेंडर सेक्शन",
      browseAll: "सारी परीक्षा तारीख़ें देखें →",
      tabConcluded: "हो चुकीं",
      tabUpcoming: "आगामी",
      tabPast: "पुरानी",
      emptyConcluded: "पिछले 7 दिनों में कोई परीक्षा नहीं हुई।",
      emptyUpcoming: "आगे की कोई तारीख़ घोषित नहीं है।",
      emptyPast: "पुरानी परीक्षाओं का विश्लेषण यहाँ दिखेगा।",
      today: "आज",
      examDay: "परीक्षा का दिन",
      wasExpected: "अनुमानित थी — पुष्टि नहीं हुई",
      expected: "(अनुमानित)",
      chipChecklist:
        "आख़िरी वक़्त की चेकलिस्ट — क्या साथ ले जाना है, एडमिट कार्ड, पेपर का पैटर्न, और हर तारीख़ उसके स्रोत-स्तर के साथ।",
      chipLive: "परीक्षा का दिन — समय ट्रैकर पर है; अपनी शिफ़्ट ख़त्म होने के बाद परीक्षा पेज पर पेपर को रेट करें।",
      chipReactions: "छात्रों का फ़ैसला और आंसर-की की स्थिति, जैसे ही छात्र पेपर को रेट करते हैं।",
    },
  },
  te: {
    examsToday: "ఈరోజు పరీక్షలు",
    examsThisWeek: "ఈ వారం పరీక్షలు",
    announcedOnly: "ప్రకటించిన తేదీలు మాత్రమే · ప్రతి తేదీతో దాని మూల స్థాయి",
    tomorrow: "రేపు",
    inDays: "{n} రోజుల్లో",
    pollPill: "పేపర్ అయిపోయిందా? ఎలా ఉందో చెప్పండి →",
    checklistToday: "సమయాలు, ఏమి తీసుకెళ్లాలి",
    checklistWeek: "చెక్‌లిస్ట్",
    moreOnCalendar: "ఎగ్జామ్ క్యాలెండర్‌లో మరో {n} →",
    calendarKicker: "ఎగ్జామ్ క్యాలెండర్",
    datesCount: "{n} తేదీలు",
    replyOne: "స్పందన",
    replyMany: "స్పందనలు",
    starterQuestion: "ప్రారంభ ప్రశ్న · Shishya",
    shishyaAi: "Shishya AI",
    aiReply: "AI సమాధానం · విద్యార్థిది కాదు",
    anonymous: "అజ్ఞాత",
    signupCta: "ఉచిత సైన్-అప్ — సన్నద్ధత మొదలుపెట్టండి",
    signupLine:
      "పరీక్ష రోజు వరకు ఉచిత రోజువారీ ప్లాన్ · స్కోర్లు, ర్యాంకు సేవ్ · ఫలితం రోజున ఒక ఈమెయిల్ · మీ భాషలో",
    statsKicker: "సాధించడానికి కావలసినవన్నీ — ఒకే ఉచిత చోట",
    statExams: "ప్రభుత్వ, ప్రవేశ పరీక్షలు",
    statQuestions: "ప్రాక్టీస్ ప్రశ్నలు",
    statNotes: "ఉచిత స్టడీ నోట్స్",
    statLanguages: "భారతీయ భాషలు",
    statFree: "ఎప్పుడూ ఉచితం",
    featKicker: "Shishya మీకు ఎలా సాయపడుతుంది",
    featHeading: "మీరు నిజంగా వాడే టూల్స్",
    featSub:
      "సీరియస్ అభ్యర్థికి ప్రతి సన్నద్ధత దశలో కావలసినవన్నీ ఒకే ఉచిత ప్లాట్‌ఫామ్‌లో — మీ పరీక్షకు తగినట్టు, మీ భాషలో.",
    featCoachTitle: "మీ సొంత కోచ్",
    featCoachBody:
      "మీ పరీక్ష తేదీ వరకు రోజువారీ ప్లాన్, మీరు నిజంగా ఏం చేశారో దాని ఆధారంగా ప్రతి ఉదయం కొత్తగా తయారవుతుంది. ఒక రోజు తప్పిపోతే ప్లాన్ తానే సర్దుకుంటుంది — బ్యాక్‌లాగ్ లేదు, అపరాధ భావన లేదు.",
    featPyqTitle: "గత సంవత్సరాల ప్రశ్నపత్రాలు",
    featPyqBody:
      "ప్రతి పరీక్షకు PYQ-ప్యాటర్న్ పేపర్లు — ప్రతి సంవత్సరం పేపర్ ప్యాటర్న్‌లో రూపొందించిన ప్రశ్నలు, సంవత్సరం, టాపిక్ వారీగా. నిజంగా వచ్చే ప్యాటర్న్‌నే సాధన చేయండి.",
    featAdaptiveTitle: "అడాప్టివ్ మాక్‌లు",
    featAdaptiveBody:
      "తర్వాతి ప్రతి మాక్ గత సారి మీరు తప్పు చేసిన టాపిక్‌లపైనే దృష్టి పెడుతుంది. వచ్చినదానిపై తక్కువ సమయం, స్కోరును ఆపుతున్నదానిపై ఎక్కువ.",
    featWeaknessTitle: "బలహీనతల మ్యాప్",
    featWeaknessBody:
      "ప్రతి అటెంప్ట్‌తో మారే టాపిక్ వారీ పట్టు స్కోరు. రేపటి గంట ఏ 3 టాపిక్‌లకు ఇవ్వాలో స్పష్టంగా తెలుస్తుంది — అస్పష్టమైన పర్సంటైల్ కాదు.",
    featTutorTitle: "ఎప్పుడైనా AI ట్యూటర్",
    featTutorBody:
      "Shishyaని ఏదైనా అడగండి — మీ సిలబస్, మీ బలహీన టాపిక్‌లు, మీరు రాసిన ప్రతి మాక్ దానికి తెలుసు. ఇంగ్లిష్‌లో లేదా మీ భాషలో సమాధానాలు.",
    rail: {
      heading: "ఎగ్జామ్ క్యాలెండర్",
      all: "అన్నీ",
      sections: "ఎగ్జామ్ క్యాలెండర్ విభాగాలు",
      browseAll: "అన్ని పరీక్ష తేదీలు చూడండి →",
      tabConcluded: "ముగిసినవి",
      tabUpcoming: "రాబోయేవి",
      tabPast: "పాతవి",
      emptyConcluded: "గత 7 రోజుల్లో ఏ పరీక్షా ముగియలేదు.",
      emptyUpcoming: "రాబోయే తేదీలు ఏవీ ప్రకటించలేదు.",
      emptyPast: "పాత పరీక్షల విశ్లేషణ ఇక్కడ కనిపిస్తుంది.",
      today: "ఈరోజు",
      examDay: "పరీక్ష రోజు",
      wasExpected: "అంచనా మాత్రమే — ధ్రువీకరించలేదు",
      expected: "(అంచనా)",
      chipChecklist:
        "చివరి నిమిషం చెక్‌లిస్ట్ — ఏమి తీసుకెళ్లాలి, అడ్మిట్ కార్డ్, పేపర్ ప్యాటర్న్, ప్రతి తేదీ దాని మూల స్థాయితో.",
      chipLive: "పరీక్ష రోజు — సమయాలు ట్రాకర్‌లో ఉన్నాయి; మీ షిఫ్ట్ ముగిశాక పరీక్ష పేజీలో పేపర్‌కు రేటింగ్ ఇవ్వండి.",
      chipReactions: "విద్యార్థులు పేపర్‌కు రేటింగ్ ఇచ్చాక వారి తీర్పు, ఆన్సర్ కీ స్థితి.",
    },
  },
};

export function homeStripCopy(locale: Locale | string | null | undefined): HomeStripCopy {
  return HOME_STRIP_COPY[homeCopyLocale(locale)];
}

export function calendarRailLabels(locale: Locale | string | null | undefined): CalendarRailLabels {
  return homeStripCopy(locale).rail;
}
