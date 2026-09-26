// Copy for site-wide search (26 Sep 2026): the home search strip, the /ask
// results page and landing, and the AI answer panel — English, Hindi and
// Telugu, picked like the home copy (homeCopyLocale; other locales read
// English). Kept here, never in src/lib/i18n.ts.
//
// Honesty rules for every string: no typed counts ("170+ exams"), no
// "AI-powered", "trusted by", "expert-curated" or "verified by students";
// the AI is called an AI; a page that is not ready says so.

import { homeCopyLocale } from "@/lib/home-strip-copy";
import type { AskStatusKey } from "@/lib/ask-stream";
import type { Outcome, PageStatus, SearchNotice, SearchSection } from "@/lib/search/types";

export interface SearchCopy {
  /** 26 Sep 2026 (founder): what the empty box says first — type anything,
   *  we take you to your page. Alternates with the examples below. */
  prompt: string;
  /** Rotating examples in the strip — each resolves to `expect` (tested). */
  placeholder: { text: string; section: SearchSection; expect: Outcome }[];
  /** "Try" rows the dropdown shows before the index has loaded. */
  tryRows: { q: string; section: SearchSection }[];
  helper: string;
  submit: string;
  understood: string;
  bestMatch: string;
  askRow: string;
  askRowSub: string;
  opening: string;
  askInstead: string;
  getAnswer: string;
  answerTitle: string;
  answerTag: string;
  openNext: string;
  pagesUsed: string;
  web: string;
  footnote: string;
  stages: string[];
  rateLimited: string;
  failed: string;
  unavailable: string;
  sections: Record<SearchSection, string>;
  badges: Record<PageStatus, string>;
  notices: Record<SearchNotice, string>;
  hubH1: string;
  hubSub: string;
  resultsFor: string;
  noResults: string;
  closest: string;
  quickLinks: string;
  browseSection: string;
  askMore: string;
  directoryTitle: string;
  /** Example searches per section on the /ask landing (linked straight to the page each opens). */
  directory: { section: SearchSection; examples: string[] }[];
  /** 26 Sep 2026 (UI builder): the search strip's own lines
   *  (src/components/search/SearchStrip.tsx). `seeAll` carries {q}, filled
   *  in the strip as plain text (the client never imports this module's
   *  values, so the three locales' copy stays out of its bundle). */
  strip: {
    inputLabel: string;
    tryTitle: string;
    recentTitle: string;
    clearRecent: string;
    clearInput: string;
    loading: string;
    openKey: string;
    seeAll: string;
    shortcut: string;
  };
  /** 26 Sep 2026 (streaming builder): the streamed AI answer on /ask
   *  (src/app/ask/AskAnswer.tsx, /api/ask SSE). `status` lines are picked by
   *  the server for its status frames; `{x}` is a Shishya page or exam name
   *  taken from the index, never the question's words. */
  stream: {
    status: Record<AskStatusKey, string>;
    writing: string;
    linksSoon: string;
    stop: string;
    stopped: string;
    retry: string;
    official: string;
    otherSite: string;
  };
}

const EN: SearchCopy = {
  // 26 Sep 2026 (UI builder): the rotation covers all five sections and
  // several scripts (Hindi, Telugu, Marathi) — each example is tested to land
  // on its page (direct) or on a list, never on the AI, on both the browser's
  // lite index and the server's deep index (tests/unit/search-strip.test.ts).
  placeholder: [
    { text: "class 9 science chapter 3", section: "school", expect: "direct" },
    { text: "SSC CGL cutoff", section: "government", expect: "direct" },
    { text: "NEET syllabus", section: "entrance", expect: "direct" },
    { text: "IIT Madras placements", section: "college", expect: "direct" },
    { text: "how to become a pilot", section: "careers", expect: "direct" },
    { text: "कक्षा 6 गणित", section: "school", expect: "direct" },
    { text: "తెలంగాణ పోలీస్ కానిస్టేబుల్ హాల్ టికెట్", section: "government", expect: "direct" },
    { text: "PM YASASVI scholarship", section: "college", expect: "direct" },
    { text: "CUET UG", section: "entrance", expect: "direct" },
    { text: "एमपीएससी गट क मॉक टेस्ट", section: "government", expect: "direct" },
    { text: "software engineer salary", section: "careers", expect: "direct" },
    // 27 Sep 2026 (wave 2 search): opens /scholarships/for/girls, the list built for it (was a list of rows).
    { text: "scholarships for girls", section: "college", expect: "direct" },
  ],
  tryRows: [
    { q: "class 10 maths chapter 3", section: "school" },
    { q: "neet syllabus", section: "entrance" },
    { q: "mpsc group c", section: "government" },
    { q: "colleges in karnataka", section: "college" },
    { q: "software engineer salary", section: "careers" },
  ],
  prompt: "Type what you want to learn — we'll take you to your page",
  helper: "Any class, exam, college or career, in any language. We open your page and you learn from there, with Shishya's AI tutor one tap away. No page yet? The AI answers and points you to one.",
  submit: "Search",
  understood: "We read",
  bestMatch: "Best match",
  askRow: "Ask Shishya's AI",
  askRowSub: "When no page fits, the AI answers from Shishya's data and points to our pages",
  opening: "Opening",
  askInstead: "Ask instead",
  getAnswer: "Get Shishya's answer",
  answerTitle: "Shishya's answer",
  answerTag: "AI answer · checks Shishya's data first · web parts marked tentative",
  openNext: "Open next",
  pagesUsed: "Pages on Shishya for this",
  web: "From the web (tentative)",
  // 26 Sep 2026 (integrator): the footnote shows under every answer, web
  // parts included — it no longer says every date and number comes from
  // Shishya's pages. The book-only badge no longer claims notes are being
  // written for each of the ~1,100 book-only chapters; it says what is true.
  // The "ready" badge is "Ready on Shishya": ready means notes OR at least 5
  // checked questions (and every topic-note page), never both for sure. The
  // no-page notice no longer says "for this exam" — it also shows on school
  // searches such as "cbse class 12 result".
  footnote: "AI answers can be wrong. Check dates and numbers on the linked Shishya page or the official notice before you act.",
  stages: ["Checking Shishya's pages…", "Reading the exam and school data…", "Writing your answer…"],
  rateLimited: "You've asked a lot in the last hour. Try again a little later, or open one of the pages above.",
  failed: "The answer engine hiccuped. Open a page above, or try again.",
  unavailable: "The AI answer is not available here. Open one of the pages above.",
  sections: {
    school: "School",
    entrance: "Entrance exams",
    government: "Government exams",
    college: "College & scholarships",
    careers: "Careers",
    more: "More on Shishya",
  },
  badges: { ready: "Ready on Shishya", "book-only": "Book link only · notes not ready yet", coming: "Coming", "sign-in": "Sign in to use" },
  notices: {
    "book-only": "Some chapter pages here have the official book link only — Shishya's notes and practice for them are not ready yet.",
    "being-built": "Study help for graduation, PG and PhD is being built. These are the closest pages Shishya has today.",
    "no-ai-young-class": "For Classes 1–7 Shishya shows pages only — no AI answers.",
    "no-page-for-intent": "Shishya does not have that page yet — here is the closest one.",
    "not-in-catalogue": "Shishya has no page for part of this search yet. These are the closest pages.",
    "chapter-ambiguous": "More than one book of this subject has that chapter number — pick the one you mean.",
    "school-route-only": "For school subjects the AI points you to the right class, subject and chapter pages; it does not teach from the textbook.",
  },
  hubH1: "Search or ask Shishya",
  hubSub: "One search for every section — school, entrance and government exams, colleges and scholarships, careers. Type in any language.",
  resultsFor: "Results for",
  noResults: "No page on Shishya fits this search yet.",
  closest: "Closest pages",
  quickLinks: "Also for this exam",
  browseSection: "Browse the section",
  askMore: "Ask Shishya's AI about this",
  directoryTitle: "What you can search",
  directory: [
    { section: "school", examples: ["class 9 science chapter 3", "कक्षा 6 गणित", "icse class 10 maths"] },
    { section: "entrance", examples: ["neet syllabus", "jee main", "cuet ug"] },
    { section: "government", examples: ["SSC CGL cutoff", "mpsc group c", "sarkari naukri bihar"] },
    { section: "college", examples: ["IIT Madras placements", "colleges in karnataka", "pm yasasvi"] },
    { section: "careers", examples: ["how to become a pilot", "software engineer salary", "ielts"] },
  ],
  strip: {
    inputLabel: "Search Shishya — a class, exam, college or career, in any language",
    tryTitle: "Try",
    recentTitle: "Your recent searches",
    clearRecent: "Clear",
    clearInput: "Clear the search",
    loading: "Loading Shishya's pages…",
    openKey: "Open",
    seeAll: "See every page for “{q}”",
    shortcut: "Press / to search",
  },
  stream: {
    status: {
      question: "Reading your question…",
      page: "Reading Shishya's {x} page…",
      examPages: "Checking which {x} pages Shishya has…",
      exams: "Searching Shishya's exams…",
      pages: "Finding the right pages on Shishya…",
      topics: "Looking through Shishya's topic notes…",
      guides: "Reading Shishya's exam guides and news…",
      vacancies: "Checking the vacancy figures Shishya tracks…",
      web: "Checking official sources on the web…",
      thinking: "Putting your answer together…",
    },
    writing: "Writing the answer…",
    linksSoon: "Links appear when the answer is complete.",
    stop: "Stop",
    stopped: "Stopped. The answer above is incomplete, and its links were not checked.",
    retry: "Try again",
    official: "Official",
    otherSite: "Other site — confirm on the official site",
  },
};

const HI: SearchCopy = {
  ...EN,
  // 26 Sep 2026 (UI builder): Devanagari first, all five sections, Marathi
  // and Telugu beside Hindi; each tested like the English ones.
  placeholder: [
    { text: "एसएससी सीजीएल कटऑफ", section: "government", expect: "direct" },
    { text: "कक्षा 10 गणित अध्याय 3", section: "school", expect: "direct" },
    { text: "नीट सिलेबस", section: "entrance", expect: "direct" },
    { text: "यूपी पुलिस सिपाही", section: "government", expect: "direct" },
    { text: "कर्नाटक के कॉलेज", section: "college", expect: "direct" },
    { text: "ias officer kaise bane", section: "careers", expect: "direct" },
    { text: "करंट अफेयर्स", section: "government", expect: "direct" },
    { text: "एमपीएससी गट क मॉक टेस्ट", section: "government", expect: "direct" },
    { text: "IIT Madras placements", section: "college", expect: "direct" },
    { text: "जेईई मेन", section: "entrance", expect: "direct" },
    { text: "తెలంగాణ పోలీస్ కానిస్టేబుల్", section: "government", expect: "direct" },
    // 27 Sep 2026 (wave 2 search): opens /scholarships/for/girls (was a list of rows).
    { text: "लड़कियों के लिए छात्रवृत्ति", section: "college", expect: "direct" },
  ],
  tryRows: [
    { q: "कक्षा 10 गणित अध्याय 3", section: "school" },
    { q: "नीट सिलेबस", section: "entrance" },
    { q: "एसएससी सीजीएल कटऑफ", section: "government" },
    { q: "कर्नाटक के कॉलेज", section: "college" },
    { q: "ias officer kaise bane", section: "careers" },
  ],
  prompt: "जो सीखना है, लिखिए — हम आपके पेज तक ले जाएंगे",
  helper: "कोई भी कक्षा, परीक्षा, कॉलेज या करियर — किसी भी भाषा में। हम आपका पेज खोलते हैं और आप वहीं से सीखते हैं, शिष्य का AI ट्यूटर एक टैप दूर। पेज नहीं है? AI जवाब देगा और सही पेज बताएगा।",
  submit: "खोजें",
  understood: "हमने समझा",
  bestMatch: "सबसे सही पेज",
  askRow: "शिष्य के AI से पूछें",
  askRowSub: "जब कोई पेज फिट न हो, AI शिष्य के डेटा से जवाब देता है और हमारे पेज बताता है",
  opening: "खुल रहा है",
  askInstead: "इसके बजाय पूछें",
  getAnswer: "शिष्य का जवाब देखें",
  answerTitle: "शिष्य का जवाब",
  answerTag: "AI जवाब · पहले शिष्य का डेटा देखता है · वेब वाले हिस्से अस्थायी बताए जाते हैं",
  openNext: "आगे खोलें",
  pagesUsed: "इसके लिए शिष्य के पेज",
  web: "वेब से (अस्थायी)",
  footnote: "AI जवाब गलत हो सकते हैं। कुछ करने से पहले तारीखें और आंकड़े दिए गए शिष्य पेज या आधिकारिक सूचना पर जांच लें।",
  stages: ["शिष्य के पेज देख रहे हैं…", "परीक्षा और स्कूल का डेटा पढ़ रहे हैं…", "जवाब लिख रहे हैं…"],
  rateLimited: "पिछले एक घंटे में आपने बहुत पूछा है। थोड़ी देर बाद फिर कोशिश करें, या ऊपर का कोई पेज खोलें।",
  failed: "जवाब देने में दिक्कत आई। ऊपर का कोई पेज खोलें या फिर कोशिश करें।",
  unavailable: "यहाँ AI जवाब उपलब्ध नहीं है। ऊपर का कोई पेज खोलें।",
  sections: {
    school: "स्कूल",
    entrance: "प्रवेश परीक्षाएं",
    government: "सरकारी परीक्षाएं",
    college: "कॉलेज और छात्रवृत्ति",
    careers: "करियर",
    more: "शिष्य पर और",
  },
  badges: { ready: "शिष्य पर तैयार", "book-only": "सिर्फ़ किताब का लिंक · नोट्स अभी तैयार नहीं", coming: "जल्द", "sign-in": "इस्तेमाल के लिए साइन इन करें" },
  notices: {
    "book-only": "यहाँ कुछ अध्याय पेजों पर अभी सिर्फ़ आधिकारिक किताब का लिंक है — शिष्य के नोट्स और अभ्यास अभी तैयार नहीं हैं।",
    "being-built": "ग्रेजुएशन, पीजी और पीएचडी की पढ़ाई का सेक्शन बन रहा है। आज शिष्य पर सबसे नज़दीकी पेज ये हैं।",
    "no-ai-young-class": "कक्षा 1–7 के लिए शिष्य सिर्फ़ पेज दिखाता है — AI जवाब नहीं।",
    "no-page-for-intent": "शिष्य पर वह पेज अभी नहीं है — सबसे नज़दीकी पेज यह है।",
    "not-in-catalogue": "इस खोज के एक हिस्से का पेज अभी शिष्य पर नहीं है। सबसे नज़दीकी पेज ये हैं।",
    "chapter-ambiguous": "इस विषय की एक से ज़्यादा किताबों में यह अध्याय नंबर है — अपनी किताब चुनें।",
    "school-route-only": "स्कूल विषयों में AI सही कक्षा, विषय और अध्याय के पेज बताता है; वह किताब से पढ़ाता नहीं।",
  },
  hubH1: "शिष्य पर खोजें या पूछें",
  hubSub: "हर सेक्शन के लिए एक खोज — स्कूल, प्रवेश और सरकारी परीक्षाएं, कॉलेज और छात्रवृत्ति, करियर। किसी भी भाषा में लिखें।",
  resultsFor: "खोज",
  noResults: "इस खोज के लिए अभी शिष्य पर कोई पेज नहीं है।",
  closest: "सबसे नज़दीकी पेज",
  quickLinks: "इस परीक्षा के और पेज",
  browseSection: "पूरा सेक्शन देखें",
  askMore: "इस बारे में शिष्य के AI से पूछें",
  directoryTitle: "आप क्या खोज सकते हैं",
  strip: {
    inputLabel: "शिष्य पर खोजें — कक्षा, परीक्षा, कॉलेज या करियर, किसी भी भाषा में",
    tryTitle: "ये आज़माएं",
    recentTitle: "आपकी हाल की खोजें",
    clearRecent: "हटाएं",
    clearInput: "खोज मिटाएं",
    loading: "शिष्य के पेज लोड हो रहे हैं…",
    openKey: "खोलें",
    seeAll: "“{q}” के सभी पेज देखें",
    shortcut: "खोजने के लिए / दबाएं",
  },
  stream: {
    status: {
      question: "आपका सवाल पढ़ रहे हैं…",
      page: "शिष्य का {x} पेज पढ़ रहे हैं…",
      examPages: "देख रहे हैं कि शिष्य पर {x} के कौन-से पेज हैं…",
      exams: "शिष्य की परीक्षाएं खोज रहे हैं…",
      pages: "शिष्य पर सही पेज ढूंढ रहे हैं…",
      topics: "शिष्य के टॉपिक नोट्स देख रहे हैं…",
      guides: "शिष्य की परीक्षा गाइड और खबरें पढ़ रहे हैं…",
      vacancies: "शिष्य के रिक्तियों के आंकड़े देख रहे हैं…",
      web: "वेब पर आधिकारिक स्रोत देख रहे हैं…",
      thinking: "आपका जवाब तैयार कर रहे हैं…",
    },
    writing: "जवाब लिख रहे हैं…",
    linksSoon: "जवाब पूरा होने पर लिंक दिखेंगे।",
    stop: "रोकें",
    stopped: "रोक दिया। ऊपर का जवाब अधूरा है, और उसके लिंक जांचे नहीं गए।",
    retry: "फिर कोशिश करें",
    official: "आधिकारिक",
    otherSite: "दूसरी साइट — आधिकारिक साइट पर पुष्टि करें",
  },
};

const TE: SearchCopy = {
  ...EN,
  // 26 Sep 2026 (UI builder): Telugu script first, romanised Telugu-style
  // abbreviations and Hindi beside it, all five sections; each tested.
  placeholder: [
    { text: "10వ తరగతి గణితం", section: "school", expect: "direct" },
    { text: "తెలంగాణ పోలీస్ కానిస్టేబుల్ హాల్ టికెట్", section: "government", expect: "direct" },
    { text: "నీట్ సిలబస్", section: "entrance", expect: "direct" },
    { text: "ఇంజనీరింగ్ కాలేజీలు", section: "college", expect: "direct" },
    { text: "ఏపీ పోలీస్", section: "government", expect: "direct" },
    { text: "how to become a pilot", section: "careers", expect: "direct" },
    { text: "జేఈఈ మెయిన్", section: "entrance", expect: "direct" },
    { text: "ts pc hall ticket", section: "government", expect: "direct" },
    { text: "లెక్కలు 9వ తరగతి", section: "school", expect: "direct" },
    { text: "PM YASASVI scholarship", section: "college", expect: "direct" },
    { text: "कक्षा 6 गणित", section: "school", expect: "direct" },
    // 27 Sep 2026 (wave 2 search): opens /scholarships/for/girls (was a list of rows).
    { text: "scholarships for girls", section: "college", expect: "direct" },
  ],
  tryRows: [
    { q: "10వ తరగతి గణితం", section: "school" },
    { q: "నీట్ సిలబస్", section: "entrance" },
    { q: "తెలంగాణ పోలీస్ కానిస్టేబుల్", section: "government" },
    { q: "ఇంజనీరింగ్ కాలేజీలు", section: "college" },
    { q: "software engineer salary", section: "careers" },
  ],
  prompt: "ఏం నేర్చుకోవాలో టైప్ చేయండి — మీ పేజీకి తీసుకెళ్తాం",
  helper: "ఏ తరగతి, పరీక్ష, కాలేజీ లేదా కెరీర్ అయినా — ఏ భాషలోనైనా. మీ పేజీ తెరుస్తాం, అక్కడి నుంచి నేర్చుకోండి; శిష్య AI ట్యూటర్ ఒక్క ట్యాప్ దూరంలో. పేజీ లేదా? AI సమాధానం ఇచ్చి సరైన పేజీ చూపిస్తుంది.",
  submit: "వెతకండి",
  understood: "మేము అర్థం చేసుకున్నది",
  bestMatch: "సరైన పేజీ",
  askRow: "శిష్య AIని అడగండి",
  askRowSub: "ఏ పేజీ సరిపోకపోతే, AI శిష్య డేటాతో సమాధానం ఇచ్చి మా పేజీలు చూపిస్తుంది",
  opening: "తెరుస్తోంది",
  askInstead: "బదులుగా అడగండి",
  getAnswer: "శిష్య సమాధానం చూడండి",
  answerTitle: "శిష్య సమాధానం",
  answerTag: "AI సమాధానం · ముందుగా శిష్య డేటా చూస్తుంది · వెబ్ భాగాలు తాత్కాలికమని గుర్తించబడతాయి",
  openNext: "తర్వాత తెరవండి",
  pagesUsed: "దీనికి శిష్య పేజీలు",
  web: "వెబ్ నుండి (తాత్కాలికం)",
  footnote: "AI సమాధానాలు తప్పు కావచ్చు. ఏదైనా చేసే ముందు తేదీలు, సంఖ్యలను లింక్ ఇచ్చిన శిష్య పేజీలో లేదా అధికారిక ప్రకటనలో చూసుకోండి.",
  stages: ["శిష్య పేజీలు చూస్తోంది…", "పరీక్ష, పాఠశాల డేటా చదువుతోంది…", "సమాధానం రాస్తోంది…"],
  rateLimited: "గత గంటలో మీరు చాలా అడిగారు. కొద్దిసేపటి తర్వాత మళ్ళీ ప్రయత్నించండి, లేదా పైన ఉన్న ఒక పేజీ తెరవండి.",
  failed: "సమాధానంలో సమస్య వచ్చింది. పైన ఉన్న పేజీ తెరవండి, లేదా మళ్ళీ ప్రయత్నించండి.",
  unavailable: "ఇక్కడ AI సమాధానం అందుబాటులో లేదు. పైన ఉన్న పేజీ తెరవండి.",
  sections: {
    school: "పాఠశాల",
    entrance: "ప్రవేశ పరీక్షలు",
    government: "ప్రభుత్వ పరీక్షలు",
    college: "కాలేజీలు & స్కాలర్‌షిప్‌లు",
    careers: "కెరీర్లు",
    more: "శిష్యలో మరిన్ని",
  },
  badges: { ready: "శిష్యలో సిద్ధం", "book-only": "పుస్తకం లింక్ మాత్రమే · నోట్స్ ఇంకా సిద్ధం కాలేదు", coming: "త్వరలో", "sign-in": "వాడటానికి సైన్ ఇన్ చేయండి" },
  notices: {
    "book-only": "ఇక్కడ కొన్ని అధ్యాయ పేజీల్లో ప్రస్తుతం అధికారిక పుస్తకం లింక్ మాత్రమే ఉంది — శిష్య నోట్స్, సాధన ఇంకా సిద్ధం కాలేదు.",
    "being-built": "డిగ్రీ, పీజీ, పీహెచ్‌డీ చదువు విభాగం తయారవుతోంది. ఈ రోజు శిష్యలో దగ్గరి పేజీలు ఇవి.",
    "no-ai-young-class": "1–7 తరగతులకు శిష్య పేజీలు మాత్రమే చూపిస్తుంది — AI సమాధానాలు ఉండవు.",
    "no-page-for-intent": "శిష్యలో ఆ పేజీ ఇంకా లేదు — దగ్గరి పేజీ ఇది.",
    "not-in-catalogue": "ఈ వెతుకులాటలో ఒక భాగానికి శిష్యలో ఇంకా పేజీ లేదు. దగ్గరి పేజీలు ఇవి.",
    "chapter-ambiguous": "ఈ సబ్జెక్టులో ఒకటి కంటే ఎక్కువ పుస్తకాల్లో ఆ అధ్యాయ సంఖ్య ఉంది — మీ పుస్తకం ఎంచుకోండి.",
    "school-route-only": "పాఠశాల సబ్జెక్టులకు AI సరైన తరగతి, సబ్జెక్టు, అధ్యాయ పేజీలు చూపిస్తుంది; పుస్తకం నుండి బోధించదు.",
  },
  hubH1: "శిష్యలో వెతకండి లేదా అడగండి",
  hubSub: "ప్రతి విభాగానికి ఒకే వెతుకులాట — పాఠశాల, ప్రవేశ, ప్రభుత్వ పరీక్షలు, కాలేజీలు, స్కాలర్‌షిప్‌లు, కెరీర్లు. ఏ భాషలోనైనా టైప్ చేయండి.",
  resultsFor: "వెతుకులాట",
  noResults: "ఈ వెతుకులాటకు శిష్యలో ఇంకా పేజీ లేదు.",
  closest: "దగ్గరి పేజీలు",
  quickLinks: "ఈ పరీక్షకు మరిన్ని పేజీలు",
  browseSection: "విభాగం మొత్తం చూడండి",
  askMore: "దీని గురించి శిష్య AIని అడగండి",
  directoryTitle: "మీరు ఏమి వెతకవచ్చు",
  strip: {
    inputLabel: "శిష్యలో వెతకండి — తరగతి, పరీక్ష, కాలేజీ లేదా కెరీర్, ఏ భాషలోనైనా",
    tryTitle: "ఇవి ప్రయత్నించండి",
    recentTitle: "మీ ఇటీవలి వెతుకులాటలు",
    clearRecent: "తొలగించు",
    clearInput: "వెతుకులాట తుడిచివేయండి",
    loading: "శిష్య పేజీలు లోడ్ అవుతున్నాయి…",
    openKey: "తెరవండి",
    seeAll: "“{q}” కోసం అన్ని పేజీలు చూడండి",
    shortcut: "వెతకడానికి / నొక్కండి",
  },
  stream: {
    status: {
      question: "మీ ప్రశ్న చదువుతోంది…",
      page: "శిష్య {x} పేజీ చదువుతోంది…",
      examPages: "శిష్యలో {x} పేజీలు ఏవి ఉన్నాయో చూస్తోంది…",
      exams: "శిష్య పరీక్షలు వెతుకుతోంది…",
      pages: "శిష్యలో సరైన పేజీలు వెతుకుతోంది…",
      topics: "శిష్య టాపిక్ నోట్స్ చూస్తోంది…",
      guides: "శిష్య పరీక్ష గైడ్‌లు, వార్తలు చదువుతోంది…",
      vacancies: "శిష్య ట్రాక్ చేసే ఖాళీల సంఖ్యలు చూస్తోంది…",
      web: "వెబ్‌లో అధికారిక మూలాలు చూస్తోంది…",
      thinking: "మీ సమాధానం సిద్ధం చేస్తోంది…",
    },
    writing: "సమాధానం రాస్తోంది…",
    linksSoon: "సమాధానం పూర్తయ్యాక లింకులు కనిపిస్తాయి.",
    stop: "ఆపండి",
    stopped: "ఆపివేయబడింది. పై సమాధానం అసంపూర్ణం, దాని లింకులు తనిఖీ కాలేదు.",
    retry: "మళ్ళీ ప్రయత్నించండి",
    official: "అధికారిక",
    otherSite: "ఇతర సైట్ — అధికారిక సైట్‌లో నిర్ధారించుకోండి",
  },
};

export function searchCopy(locale: string | null | undefined): SearchCopy {
  const l = homeCopyLocale(locale);
  return l === "hi" ? HI : l === "te" ? TE : EN;
}

/** Where the strip's form submits: the /ask route of the page's own locale twin. */
export function askBaseFor(locale: string | null | undefined): "/ask" | "/hi/ask" | "/te/ask" {
  const l = homeCopyLocale(locale);
  return l === "hi" ? "/hi/ask" : l === "te" ? "/te/ask" : "/ask";
}
