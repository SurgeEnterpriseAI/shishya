// The home page's copy in the reader's language (26 Sep 2026, "Doors").
//
// Founder's idea, 26 Sep 2026: Shishya is ONE free platform for anyone who is
// studying — school (any government board), plus-one / plus-two, graduation,
// post-graduation, PhD, and competitive or government exams. These are
// INDEPENDENT sections, not a sequence: a person at any stage of life comes
// and uses the section for their stage. It sits beside the teaching they
// already get; it is their own place to practise.
//
// Same pattern as src/lib/home-strip-copy.ts (a per-locale map, no dictionary
// import): the /hi and /te twins of "/" read these; every other locale reads
// English. Rules carried into every locale:
//   • a section shown as available exists; graduation / PG / PhD study is
//     "being built" and links nowhere;
//   • no typed count anywhere — {n} placeholders take the live values the
//     page loads (portalStats.examCount, CAREERS.length, INDIAN_LANGUAGE_COUNT);
//   • nothing reads as a journey: no "then", "next step", "after that"
//     between sections (tests/unit/home-doors.test.ts pins this).

import type { Locale } from "@/lib/i18n";
import { homeCopyLocale, type HomeCopyLocale } from "@/lib/home-strip-copy";

export interface HomeDoorsCopy {
  hero: { h1: string; tagline: string; ask: string };
  /** Section jump-pills under the hero sentence — short, one line each. */
  pills: { school: string; entrance: string; government: string; college: string; careers: string };
  kicker: { label: string; line: string };
  doors: {
    school: { title: string; body: string; being: string; cbse: string; classTile: string; icse: string; all: string };
    entrance: { title: string; body: string; olympiads: string; browse: string };
    // 26 Sep 2026 (review): no count on the Government door — the catalogue
    // count is government AND entrance exams; it sits on finder.browse.
    government: { title: string; body: string; banking: string; state: string; all: string };
    college: { title: string; body: string; colleges: string; scholarships: string; distance: string };
    careers: { title: string; count: string; body: string; paths: string; map: string; internships: string };
    soon: { title: string; tag: string; body: string };
  };
  /** finder.browse carries {n}: the live catalogue count (portalStats.examCount). */
  finder: { kicker: string; h2: string; sub: string; mostTaken: string; finder: string; browse: string };
  rails: { vacancies: string; findMine: string };
  how: {
    h2: string;
    lead: string;
    s1t: string;
    s1b: string;
    s2t: string;
    s2b: string;
    s3t: string;
    s3b: string;
    s4t: string;
    s4b: string;
    ask: string;
  };
  signin: { cta: string; line: string; back: string };
  foot: { mentor: string };
}

export const HOME_DOORS_COPY: Readonly<Record<HomeCopyLocale, HomeDoorsCopy>> = {
  en: {
    hero: {
      // 26 Sep 2026 (founder): "One smart place to study"; the tagline says it is
      // free and names both halves — Indian education and government jobs.
      // Graduation/PG/PhD study stays out of the promise until those pages exist.
      h1: "One smart place to study",
      tagline: "A free platform for Indian education — school, +1/+2, entrance exams and college — and for government jobs, from preparation to the latest updates.",
      ask: "Stuck on something? Ask Shishya — free, no sign-in →",
    },
    pills: { school: "School", entrance: "Entrance", government: "Government", college: "College", careers: "Careers" },
    kicker: { label: "Sections", line: "Use any one, any time. There is no order." },
    doors: {
      school: {
        title: "School",
        body: "CBSE chapters with the official NCERT book. ICSE and ISC subjects with the official syllabus. Every other board's official links.",
        being: "Notes and practice: being written.",
        cbse: "CBSE · tap your class",
        classTile: "Class {n}",
        icse: "ICSE / ISC",
        all: "All boards →",
      },
      entrance: {
        title: "Entrance exams",
        // 26 Sep 2026 (review): CLAT is not named — it has no exam row, so
        // /exams/CLAT is a 404. The body ends "Tap your exam:" because this
        // door has no whole-card link; its chips are the section.
        body: "After Class 10 or 12 — JEE, NEET, CUET, NDA, olympiads and more. Mocks, past-year practice, cutoffs. Tap your exam:",
        olympiads: "Olympiads",
        browse: "Browse all →",
      },
      government: {
        title: "Government exams",
        // "past-year practice", not "past papers": official papers exist for
        // ~30 exams; PYQ-pattern practice by year is what every page has.
        body: "SSC, banking, railways, state PSCs, police, teaching, UPSC. Mocks in the real pattern, past-year practice, cutoffs, a day-by-day plan.",
        banking: "Banking",
        state: "State exams",
        all: "All exams →",
      },
      college: {
        title: "College & scholarships",
        body: "Colleges by stream and state, with cutoffs and placements. Scholarships you can apply for. Open and distance learning.",
        colleges: "Colleges",
        scholarships: "Scholarships",
        distance: "Distance learning",
      },
      careers: {
        title: "Careers",
        count: "{n} paths",
        body: "Career paths with pay, entry routes and growth. Every government job on one map.",
        paths: "Career paths",
        map: "Govt jobs map",
        internships: "Internships",
      },
      soon: {
        title: "Graduation, PG & PhD",
        tag: "Being built",
        body: "Study sections for degree courses, post-graduation and research. Not open yet — nothing to click here.",
      },
    },
    finder: {
      kicker: "Government and entrance exams",
      h2: "Find your exam",
      // 26 Sep 2026 (review): no "every" — of 180 exam pages, 12 have no mock
      // yet (the search box marks them "Coming"), 2 no cutoff, 139 no notes;
      // dates hold for all. The finder is the government-job finder
      // (/find-your-exam matches no admission test), so it says so.
      sub: "Exam pages carry free mocks, past-year practice, cutoffs and dates — notes where written.",
      mostTaken: "Most taken",
      finder: "Not sure which government exam? Find yours in 2 minutes — no sign-in →",
      browse: "Browse all {n} exams →",
    },
    rails: { vacancies: "Government vacancies", findMine: "Find mine" },
    // 26 Sep 2026 (review): four things that are true in every section — the
    // College and Careers doors have no chapters, questions or plans, and
    // school practice is being written, so the steps name where practice
    // lives (exam pages) instead of promising it everywhere.
    how: {
      h2: "How Shishya works",
      lead: "The same in every section.",
      s1t: "Open your section",
      s1b: "Shishya sits beside the teaching you already get. It is your own place to study, not a replacement.",
      s2t: "Read free, no account",
      s2b: "Official books and syllabi, exam dates and cutoffs, colleges and career paths — open to anyone, nothing to pay.",
      s3t: "Ask when stuck",
      s3b: "Shishya's tutor explains in your language. No sign-in needed.",
      s4t: "Practise and keep score",
      s4b: "Exam pages carry mocks and past-year sets, each answer checked. Sign in free to save scores, see weak topics and get a day-by-day plan. School practice: being written.",
      ask: "Stuck at any step? Ask Shishya's tutor — {n} Indian languages, no sign-in →",
    },
    signin: {
      cta: "Sign in free",
      line: "Scores and rank saved · weak topics tracked · a day-by-day plan to exam day · in your language",
      back: "Welcome back — Today's 5 →",
    },
    foot: { mentor: "Cleared an exam? Mentor the next batch →" },
  },
  hi: {
    hero: {
      h1: "पढ़ाई की एक स्मार्ट जगह",
      tagline: "भारतीय शिक्षा के लिए एक मुफ़्त प्लेटफ़ॉर्म — स्कूल, 11वीं-12वीं, प्रवेश परीक्षाएं और कॉलेज — और सरकारी नौकरियों के लिए, तैयारी से लेकर ताज़ा अपडेट तक।",
      ask: "कहीं अटक गए? Shishya से पूछिए — मुफ़्त, बिना साइन-इन →",
    },
    pills: { school: "स्कूल", entrance: "प्रवेश परीक्षा", government: "सरकारी परीक्षा", college: "कॉलेज", careers: "करियर" },
    kicker: { label: "सेक्शन", line: "कोई भी, कभी भी। इनमें कोई क्रम नहीं है।" },
    doors: {
      school: {
        title: "स्कूल",
        body: "CBSE के हर अध्याय के साथ आधिकारिक NCERT किताब। ICSE और ISC के विषय आधिकारिक सिलेबस के साथ। बाकी हर बोर्ड के आधिकारिक लिंक।",
        being: "नोट्स और अभ्यास: लिखे जा रहे हैं।",
        cbse: "CBSE · अपनी कक्षा चुनिए",
        classTile: "कक्षा {n}",
        icse: "ICSE / ISC",
        all: "सभी बोर्ड →",
      },
      entrance: {
        title: "प्रवेश परीक्षाएं",
        body: "कक्षा 10 या 12 के बाद — JEE, NEET, CUET, NDA, ओलंपियाड और भी। मॉक, पिछले सालों का अभ्यास, कटऑफ। अपनी परीक्षा चुनिए:",
        olympiads: "ओलंपियाड",
        browse: "सभी देखें →",
      },
      government: {
        title: "सरकारी परीक्षाएं",
        body: "SSC, बैंकिंग, रेलवे, राज्य PSC, पुलिस, शिक्षण, UPSC। असली पैटर्न में मॉक, पिछले सालों का अभ्यास, कटऑफ, रोज़-ब-रोज़ प्लान।",
        banking: "बैंकिंग",
        state: "राज्य की परीक्षाएं",
        all: "सभी परीक्षाएं →",
      },
      college: {
        title: "कॉलेज और स्कॉलरशिप",
        body: "स्ट्रीम और राज्य के हिसाब से कॉलेज, कटऑफ और प्लेसमेंट के साथ। स्कॉलरशिप जिनके लिए आप आवेदन कर सकते हैं। ओपन और दूरस्थ शिक्षा।",
        colleges: "कॉलेज",
        scholarships: "स्कॉलरशिप",
        distance: "दूरस्थ शिक्षा",
      },
      careers: {
        title: "करियर",
        count: "{n} रास्ते",
        body: "हर करियर का वेतन, प्रवेश का रास्ता और आगे की बढ़त। हर सरकारी नौकरी एक ही नक्शे पर।",
        paths: "करियर के रास्ते",
        map: "सरकारी नौकरी का नक्शा",
        internships: "इंटर्नशिप",
      },
      soon: {
        title: "ग्रेजुएशन, PG और PhD",
        tag: "बन रहा है",
        body: "डिग्री कोर्स, पोस्ट-ग्रेजुएशन और रिसर्च के लिए पढ़ाई के सेक्शन। अभी खुले नहीं — यहाँ क्लिक करने को कुछ नहीं है।",
      },
    },
    finder: {
      kicker: "सरकारी और प्रवेश परीक्षाएं",
      h2: "अपनी परीक्षा ढूँढिए",
      sub: "परीक्षा पेज पर मुफ़्त मॉक, पिछले सालों का अभ्यास, कटऑफ और तारीख़ें — नोट्स जहाँ लिखे गए हैं।",
      mostTaken: "सबसे ज़्यादा दी जाने वाली",
      finder: "पता नहीं कौन-सी सरकारी परीक्षा? 2 मिनट में अपनी ढूँढिए — बिना साइन-इन →",
      browse: "सभी {n} परीक्षाएं देखें →",
    },
    rails: { vacancies: "सरकारी रिक्तियां", findMine: "मेरी ढूँढें" },
    how: {
      h2: "Shishya कैसे काम करता है",
      lead: "हर सेक्शन में एक जैसा।",
      s1t: "अपना सेक्शन खोलिए",
      s1b: "Shishya आपकी मौजूदा पढ़ाई के साथ चलता है। यह आपकी अपनी पढ़ाई की जगह है, उसका विकल्प नहीं।",
      s2t: "मुफ़्त पढ़िए, बिना खाते के",
      s2b: "आधिकारिक किताबें और सिलेबस, परीक्षा की तारीख़ें और कटऑफ, कॉलेज और करियर के रास्ते — सबके लिए खुले, कुछ भी देना नहीं।",
      s3t: "अटकें तो पूछिए",
      s3b: "Shishya का ट्यूटर आपकी भाषा में समझाता है। साइन-इन की ज़रूरत नहीं।",
      s4t: "अभ्यास कीजिए, स्कोर रखिए",
      s4b: "परीक्षा पेज पर मॉक और पिछले सालों के सेट, हर जवाब जाँचा हुआ। मुफ़्त साइन-इन से स्कोर सेव, कमज़ोर टॉपिक और रोज़-ब-रोज़ प्लान। स्कूल का अभ्यास: लिखा जा रहा है।",
      ask: "कहीं भी अटकें? Shishya के ट्यूटर से पूछिए — {n} भारतीय भाषाओं में, बिना साइन-इन →",
    },
    signin: {
      cta: "मुफ़्त साइन-इन",
      line: "स्कोर और रैंक सेव · कमज़ोर टॉपिक पर नज़र · परीक्षा के दिन तक रोज़-ब-रोज़ प्लान · आपकी भाषा में",
      back: "वापसी पर स्वागत — आज के 5 →",
    },
    foot: { mentor: "परीक्षा पास कर चुके हैं? अगले बैच के मेंटर बनिए →" },
  },
  te: {
    hero: {
      h1: "చదువుకు ఒకే స్మార్ట్ చోటు",
      tagline: "భారతీయ విద్యకు ఉచిత వేదిక — స్కూల్, ఇంటర్, ప్రవేశ పరీక్షలు, కాలేజీ — ప్రభుత్వ ఉద్యోగాలకు కూడా, తయారీ నుంచి తాజా అప్‌డేట్‌ల వరకు.",
      ask: "ఎక్కడైనా ఆగిపోయారా? Shishyaను అడగండి — ఉచితం, సైన్-ఇన్ అక్కర్లేదు →",
    },
    pills: { school: "స్కూల్", entrance: "ప్రవేశ పరీక్షలు", government: "ప్రభుత్వ పరీక్షలు", college: "కాలేజీ", careers: "కెరీర్" },
    kicker: { label: "విభాగాలు", line: "ఏదైనా ఒకటి, ఎప్పుడైనా. వీటికి వరుస లేదు." },
    doors: {
      school: {
        title: "స్కూల్",
        body: "CBSE ప్రతి అధ్యాయానికి అధికారిక NCERT పుస్తకం. ICSE, ISC సబ్జెక్టులకు అధికారిక సిలబస్. మిగతా ప్రతి బోర్డుకు అధికారిక లింకులు.",
        being: "నోట్స్, సాధన: రాస్తున్నాం.",
        cbse: "CBSE · మీ తరగతి నొక్కండి",
        classTile: "తరగతి {n}",
        icse: "ICSE / ISC",
        all: "అన్ని బోర్డులు →",
      },
      entrance: {
        title: "ప్రవేశ పరీక్షలు",
        body: "10 లేదా 12వ తరగతి తర్వాత — JEE, NEET, CUET, NDA, ఒలింపియాడ్‌లు, ఇంకా ఎన్నో. మాక్‌లు, గత సంవత్సరాల సాధన, కటాఫ్‌లు. మీ పరీక్ష నొక్కండి:",
        olympiads: "ఒలింపియాడ్‌లు",
        browse: "అన్నీ చూడండి →",
      },
      government: {
        title: "ప్రభుత్వ పరీక్షలు",
        body: "SSC, బ్యాంకింగ్, రైల్వే, రాష్ట్ర PSCలు, పోలీస్, టీచింగ్, UPSC. అసలు ప్యాటర్న్‌లో మాక్‌లు, గత సంవత్సరాల సాధన, కటాఫ్‌లు, రోజువారీ ప్లాన్.",
        banking: "బ్యాంకింగ్",
        state: "రాష్ట్ర పరీక్షలు",
        all: "అన్ని పరీక్షలు →",
      },
      college: {
        title: "కాలేజీ, స్కాలర్‌షిప్‌లు",
        body: "స్ట్రీమ్, రాష్ట్రం వారీగా కాలేజీలు, కటాఫ్‌లు, ప్లేస్‌మెంట్లతో. మీరు దరఖాస్తు చేయగల స్కాలర్‌షిప్‌లు. ఓపెన్, దూరవిద్య.",
        colleges: "కాలేజీలు",
        scholarships: "స్కాలర్‌షిప్‌లు",
        distance: "దూరవిద్య",
      },
      careers: {
        title: "కెరీర్",
        count: "{n} మార్గాలు",
        body: "ప్రతి కెరీర్‌కు జీతం, ప్రవేశ మార్గం, ఎదుగుదల. ప్రతి ప్రభుత్వ ఉద్యోగం ఒకే మ్యాప్‌లో.",
        paths: "కెరీర్ మార్గాలు",
        map: "ప్రభుత్వ ఉద్యోగాల మ్యాప్",
        internships: "ఇంటర్న్‌షిప్‌లు",
      },
      soon: {
        title: "గ్రాడ్యుయేషన్, PG, PhD",
        tag: "నిర్మాణంలో ఉంది",
        body: "డిగ్రీ కోర్సులు, పోస్ట్-గ్రాడ్యుయేషన్, పరిశోధన కోసం చదువు విభాగాలు. ఇంకా తెరవలేదు — ఇక్కడ క్లిక్ చేయడానికి ఏమీ లేదు.",
      },
    },
    finder: {
      kicker: "ప్రభుత్వ, ప్రవేశ పరీక్షలు",
      h2: "మీ పరీక్షను కనుక్కోండి",
      sub: "పరీక్ష పేజీల్లో ఉచిత మాక్‌లు, గత సంవత్సరాల సాధన, కటాఫ్‌లు, తేదీలు — నోట్స్ రాసిన చోట.",
      mostTaken: "ఎక్కువ మంది రాసేవి",
      finder: "ఏ ప్రభుత్వ పరీక్ష అని తెలియదా? 2 నిమిషాల్లో మీది కనుక్కోండి — సైన్-ఇన్ అక్కర్లేదు →",
      browse: "అన్ని {n} పరీక్షలు చూడండి →",
    },
    rails: { vacancies: "ప్రభుత్వ ఖాళీలు", findMine: "నావి కనుక్కోండి" },
    how: {
      h2: "Shishya ఎలా పనిచేస్తుంది",
      lead: "ప్రతి విభాగంలో ఒకేలా.",
      s1t: "మీ విభాగం తెరవండి",
      s1b: "మీకు ఇప్పటికే అందుతున్న బోధనకు Shishya తోడుగా ఉంటుంది. ఇది మీ సొంత చదువు చోటు, దానికి బదులు కాదు.",
      s2t: "ఉచితంగా చదవండి, ఖాతా అక్కర్లేదు",
      s2b: "అధికారిక పుస్తకాలు, సిలబస్‌లు, పరీక్ష తేదీలు, కటాఫ్‌లు, కాలేజీలు, కెరీర్ మార్గాలు — అందరికీ తెరిచి ఉన్నాయి, చెల్లించాల్సింది ఏమీ లేదు.",
      s3t: "ఆగిపోతే అడగండి",
      s3b: "Shishya ట్యూటర్ మీ భాషలో వివరిస్తుంది. సైన్-ఇన్ అక్కర్లేదు.",
      s4t: "సాధన చేయండి, స్కోరు ఉంచుకోండి",
      s4b: "పరీక్ష పేజీల్లో మాక్‌లు, గత సంవత్సరాల సెట్లు, ప్రతి జవాబు సరిచూసినదే. ఉచిత సైన్-ఇన్‌తో స్కోర్లు సేవ్, బలహీన టాపిక్‌లు, రోజువారీ ప్లాన్. స్కూల్ సాధన: రాస్తున్నాం.",
      ask: "ఎక్కడైనా ఆగిపోయారా? Shishya ట్యూటర్‌ను అడగండి — {n} భారతీయ భాషల్లో, సైన్-ఇన్ అక్కర్లేదు →",
    },
    signin: {
      cta: "ఉచిత సైన్-ఇన్",
      line: "స్కోర్లు, ర్యాంకు సేవ్ · బలహీన టాపిక్‌లపై దృష్టి · పరీక్ష రోజు వరకు రోజువారీ ప్లాన్ · మీ భాషలో",
      back: "మళ్ళీ స్వాగతం — ఈరోజు 5 →",
    },
    foot: { mentor: "పరీక్ష పాసయ్యారా? తర్వాతి బ్యాచ్‌కు మెంటర్ అవ్వండి →" },
  },
};

export function homeDoorsCopy(locale: Locale | string | null | undefined): HomeDoorsCopy {
  return HOME_DOORS_COPY[homeCopyLocale(locale)];
}
