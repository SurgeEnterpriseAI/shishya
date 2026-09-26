// Search lexicon (26 Sep 2026) — DATA ONLY. The words a student types for a
// class, a chapter, a board, a subject, a page of an exam (cutoff, admit card,
// PYQ …), a section (colleges, scholarships, careers …), a state, or a
// language — in English, romanised Hindi / Marathi / Telugu and the native
// scripts. src/lib/search/parse.ts compiles these tables; each phrase is
// normalised with normaliseQuery() at load, so write it as a student would.
//
// Sources: the 218 distinct typed /ask queries and 24 SEARCH_MISS strings of
// 31 Jul-26 Sep 2026 (read-only probe), the 283 typed tutor queries of the same
// window, the date-kind table in src/lib/ai/exam-info.ts kindFromLabel, and the
// alias / state tables in src/lib/exam-aliases.ts. Add a word when the search
// miss log shows students typing it — never a guess about a page.

import type { DocKind, ExamIntent, SearchSection } from "./types";

export type Phrase<V> = readonly [phrase: string, value: V];

// ── 1. Language requests: used up as the language, never a search word ──
export const LANG_REQUEST: readonly Phrase<string>[] = [
  ["in hindi", "hi"], ["hindi me", "hi"], ["hindi mein", "hi"], ["hindi mai", "hi"], ["hindi mei", "hi"], ["hindi m", "hi"],
  ["hindi medium", "hi"], ["hindi me btao", "hi"], ["हिंदी में", "hi"], ["हिन्दी में", "hi"], ["हिंदी मे", "hi"], ["हिंदी माध्यम", "hi"],
  ["in telugu", "te"], ["telugu lo", "te"], ["telugulo", "te"], ["telugu medium", "te"], ["తెలుగులో", "te"], ["తెలుగు లో", "te"], ["తెలుగు మీడియం", "te"],
  ["in marathi", "mr"], ["marathit", "mr"], ["marathi madhe", "mr"], ["marathi medium", "mr"], ["मराठीत", "mr"], ["मराठी मध्ये", "mr"],
  ["in tamil", "ta"], ["tamil la", "ta"], ["tamil medium", "ta"], ["தமிழில்", "ta"],
  ["in kannada", "kn"], ["kannada dalli", "kn"], ["kannada medium", "kn"], ["ಕನ್ನಡದಲ್ಲಿ", "kn"],
  ["in bengali", "bn"], ["in bangla", "bn"], ["বাংলায়", "bn"],
  ["in gujarati", "gu"], ["gujarati ma", "gu"], ["ગુજરાતીમાં", "gu"],
  ["in punjabi", "pa"], ["in odia", "or"], ["in malayalam", "ml"], ["in urdu", "ur"],
  ["in english", "en"], ["english medium", "en"],
];

// ── 2. School classes ────────────────────────────────────────────────────
/** A class word followed by 1-12: "class 9", "std 10", "कक्षा 6", "10 తరగతి" (either order). */
export const CLASS_WORDS: readonly string[] = [
  "class", "cls", "std", "standard", "grade", "kaksha", "kaksa", "klass", "कक्षा", "इयत्ता", "क्लास", "తరగతి", "క్లాస్", "வகுப்பு", "ತರಗತಿ",
];
/** "10th", "10वीं", "10వ" — an ordinal class (or, next to pass / after, a qualifier). */
export const ORDINAL_SUFFIX_RE = /^(\d{1,2})(st|nd|rd|th|वीं|वी|वां|वा|वें|वे|వ|వది|ஆம்)$/;
/** Class names written as words. */
export const CLASS_NUMBER_WORDS: Readonly<Record<string, number>> = {
  tenth: 10, twelfth: 12, twelth: 12, eleventh: 11, ninth: 9, eighth: 8, seventh: 7, sixth: 6, fifth: 5, fourth: 4, third: 3,
  dasvi: 10, dasvin: 10, dasveen: 10, dasvi_: 10, barvi: 12, barahvi: 12, barvin: 12, barhvi: 12, gyarvi: 11, gyarahvi: 11, gyarvin: 11,
  nauvi: 9, nauvin: 9, nouvi: 9, aathvi: 8, athvi: 8, satvi: 7, saatvi: 7, chhathi: 6, chhati: 6, chathi: 6, panchvi: 5, paanchvi: 5,
  // 26 Sep 2026 (search fixer): the same words in Devanagari and Telugu (a class only beside a school word; a qualifier beside पास / పాస్).
  "दसवीं": 10, "दसवी": 10, "बारहवीं": 12, "बारहवी": 12, "పదవ": 10, "పదో": 10,
};
/** Board-local class names (Karnataka PUC, Telugu-state Intermediate, Kerala / TN "plus two", Maharashtra FYJC / SYJC, HSC). */
export const CLASS_PHRASES: readonly Phrase<number>[] = [
  ["sslc", 10], ["matric", 10], ["matriculation", 10],
  ["inter 1st year", 11], ["inter first year", 11], ["intermediate 1st year", 11], ["intermediate first year", 11],
  ["1st puc", 11], ["first puc", 11], ["puc 1", 11], ["plus one", 11], ["plus 1", 11], ["fyjc", 11],
  ["inter 2nd year", 12], ["inter second year", 12], ["intermediate 2nd year", 12], ["intermediate second year", 12],
  ["2nd puc", 12], ["second puc", 12], ["puc 2", 12], ["plus two", 12], ["plus 2", 12], ["syjc", 12], ["hsc", 12],
];
/** 26 Sep 2026 (search fixer): "matric", "matriculation" and "sslc" name Class 10 only
 *  beside a school word (a subject, chapter or board) and never beside a
 *  scholarship, job or exam-page word — "post matric scholarship" is the NSP
 *  scholarship and "sslc result" is not a CBSE page. parse.ts gates these. */
export const CONDITIONAL_CLASS_WORDS: readonly string[] = ["sslc", "matric", "matriculation"];
/** Words that make "10th" / "12th" a QUALIFIER ("10th pass", "after 12th", "12th ke baad"), never a class. */
// 26 Sep 2026 (search fixer): "पास" / "పాస్" too — "सरकारी नौकरी 10वीं पास" is a qualifier, not two unknown words.
export const QUALIFIER_AFTER: readonly string[] = ["pass", "paas", "passed", "pas", "passout", "level", "qualification", "qualified", "पास", "पास्ड", "పాస్"];
export const QUALIFIER_BEFORE: readonly string[] = ["after", "with", "baad", "bad"];
export const QUALIFIER_TAIL: readonly string[] = ["ke baad", "ke bad", "k baad", "के बाद", "తర్వాత", "ke baad kya"];
/** Level phrases that are a qualification, not an exam name. */
export const STAGE_PHRASES: readonly Phrase<"after-10" | "after-12" | "after-grad">[] = [
  ["intermediate level", "after-12"], ["12th level", "after-12"], ["10th level", "after-10"], ["matric level", "after-10"],
  ["graduate level", "after-grad"], ["graduation level", "after-grad"],
  // 26 Sep 2026 (search fixer): board-local names of the pass level.
  ["matric pass", "after-10"], ["matriculation pass", "after-10"], ["sslc pass", "after-10"], ["inter pass", "after-12"], ["intermediate pass", "after-12"],
];
export const GRAD_STAGE: readonly string[] = ["after graduation", "graduation pass", "graduate", "graduates", "after degree", "graduation ke baad", "ग्रेजुएशन के बाद"];

// ── 3. Chapters ──────────────────────────────────────────────────────────
export const CHAPTER_WORDS: readonly string[] = [
  "chapter", "chap", "ch", "lesson", "unit", "adhyay", "adhyaya", "paath", "अध्याय", "पाठ", "प्रकरण", "అధ్యాయం", "అధ్యాయము", "పాఠం", "పాఠము",
];

// ── 4. Boards: /schooling/{slug} ─────────────────────────────────────────
export const BOARD_PHRASES: readonly Phrase<string>[] = [
  ["cbse", "cbse"], ["ncert", "cbse"], ["सीबीएसई", "cbse"], ["एनसीईआरटी", "cbse"], ["central board", "cbse"],
  ["icse", "icse-cisce"], ["isc", "icse-cisce"], ["cisce", "icse-cisce"],
  ["nios", "nios"], ["open school", "nios"],
  ["igcse", "cambridge-igcse"], ["cambridge igcse", "cambridge-igcse"], ["cambridge board", "cambridge-igcse"], ["a levels", "cambridge-igcse"],
  ["international baccalaureate", "ib"], ["ib board", "ib"],
  ["tn state board", "tn-state-board"], ["tamil nadu state board", "tn-state-board"], ["samacheer", "tn-state-board"], ["samacheer kalvi", "tn-state-board"],
  ["maharashtra board", "mh-ssc-hsc"], ["msbshse", "mh-ssc-hsc"],
  ["up board", "up-board"], ["upmsp", "up-board"],
  ["karnataka puc", "ka-puc"], ["kseeb", "ka-sslc"], ["karnataka sslc", "ka-sslc"],
  ["wbbse", "wb-wbbse"], ["wbchse", "wb-wbchse"],
  ["bieap", "ap-bie"], ["ap bie", "ap-bie"], ["ap intermediate", "ap-bie"],
  ["tsbie", "ts-bie"], ["ts bie", "ts-bie"], ["tgbie", "ts-bie"], ["telangana intermediate", "ts-bie"],
  ["kerala dhse", "kl-dhse"], ["dhse", "kl-dhse"],
  ["gseb", "gj-gseb"], ["gujarat board", "gj-gseb"],
  ["rbse", "rj-rbse"], ["rajasthan board", "rj-rbse"],
  ["mp board", "mp-mpbse"], ["mpbse", "mp-mpbse"],
  ["bseb", "bihar-bseb"], ["bihar board", "bihar-bseb"],
  ["pseb board", "pb-pseb"], ["punjab board", "pb-pseb"],
];
/** A state's own board when a school query names the state but no board: [state, board for classes ≤10, board for 11-12]. */
export const STATE_SCHOOL_BOARD: Readonly<Record<string, readonly [string, string]>> = {
  KA: ["ka-sslc", "ka-puc"], TN: ["tn-state-board", "tn-state-board"], MH: ["mh-ssc-hsc", "mh-ssc-hsc"], UP: ["up-board", "up-board"],
  WB: ["wb-wbbse", "wb-wbchse"], AP: ["ap-bie", "ap-bie"], TS: ["ts-bie", "ts-bie"], KL: ["kl-dhse", "kl-dhse"], GJ: ["gj-gseb", "gj-gseb"],
  RJ: ["rj-rbse", "rj-rbse"], MP: ["mp-mpbse", "mp-mpbse"], BR: ["bihar-bseb", "bihar-bseb"], PB: ["pb-pseb", "pb-pseb"],
};

// ── 5. School subjects (canonical English → how students write it) ───────
export const SUBJECT_PHRASES: readonly Phrase<string>[] = [
  ["maths", "mathematics"], ["math", "mathematics"], ["mathematics", "mathematics"], ["ganit", "mathematics"], ["गणित", "mathematics"],
  ["గణితం", "mathematics"], ["గణితము", "mathematics"], ["లెక్కలు", "mathematics"], ["ಗಣಿತ", "mathematics"], ["கணிதம்", "mathematics"], ["গণিত", "mathematics"],
  ["science", "science"], ["sci", "science"], ["vigyan", "science"], ["विज्ञान", "science"], ["సైన్స్", "science"], ["విజ్ఞాన శాస్త్రం", "science"], ["విజ్ఞానశాస్త్రం", "science"],
  ["அறிவியல்", "science"], ["ವಿಜ್ಞಾನ", "science"], ["বিজ্ঞান", "science"],
  ["social science", "social science"], ["social studies", "social science"], ["social", "social science"], ["sst", "social science"],
  ["samajik vigyan", "social science"], ["सामाजिक विज्ञान", "social science"], ["సాంఘిక శాస్త్రం", "social science"], ["సోషల్", "social science"],
  ["evs", "evs"], ["environmental studies", "evs"], ["world around us", "evs"], ["paryavaran", "evs"], ["पर्यावरण", "evs"], ["పరిసరాల విజ్ఞానం", "evs"],
  ["physics", "physics"], ["bhautiki", "physics"], ["भौतिकी", "physics"], ["भौतिक विज्ञान", "physics"], ["భౌతిక శాస్త్రం", "physics"],
  ["chemistry", "chemistry"], ["rasayan", "chemistry"], ["rasayan vigyan", "chemistry"], ["रसायन", "chemistry"], ["रसायन विज्ञान", "chemistry"], ["రసాయన శాస్త్రం", "chemistry"],
  ["biology", "biology"], ["bio", "biology"], ["jeev vigyan", "biology"], ["जीव विज्ञान", "biology"], ["जीवविज्ञान", "biology"], ["జీవశాస్త్రం", "biology"], ["జీవ శాస్త్రం", "biology"],
  ["accountancy", "accountancy"], ["accounts", "accountancy"], ["account", "accountancy"],
  ["business studies", "business studies"], ["bst", "business studies"],
  ["economics", "economics"], ["eco", "economics"], ["arthshastra", "economics"], ["अर्थशास्त्र", "economics"], ["అర్థశాస్త్రం", "economics"],
  ["history", "history"], ["itihas", "history"], ["इतिहास", "history"], ["చరిత్ర", "history"],
  ["geography", "geography"], ["geo", "geography"], ["bhugol", "geography"], ["भूगोल", "geography"], ["భూగోళం", "geography"], ["భూగోళ శాస్త్రం", "geography"],
  ["political science", "political science"], ["polity", "political science"], ["civics", "political science"], ["pol sci", "political science"],
  ["rajniti vigyan", "political science"], ["राजनीति विज्ञान", "political science"],
  ["psychology", "psychology"], ["sociology", "sociology"], ["home science", "home science"],
  ["computer science", "computer science"], ["computer", "computer science"], ["computers", "computer science"], ["cs", "computer science"],
  ["informatics practices", "informatics practices"], ["ip", "informatics practices"],
  ["biotechnology", "biotechnology"], ["biotech", "biotechnology"],
  ["fine art", "fine art"], ["fine arts", "fine art"], ["arts", "arts"], ["art", "arts"], ["drawing", "arts"],
  ["physical education", "physical education"], ["pe", "physical education"], ["sports", "physical education"],
  ["sanskrit", "sanskrit"], ["संस्कृत", "sanskrit"], ["urdu", "urdu"],
  ["english", "english"], ["अंग्रेजी", "english"], ["अंग्रेज़ी", "english"], ["ఇంగ్లీష్", "english"], ["ఆంగ్లం", "english"],
  ["hindi", "hindi"], ["हिंदी", "hindi"], ["हिन्दी", "hindi"], ["హిందీ", "hindi"],
  ["applied mathematics", "applied mathematics"], ["applied maths", "applied mathematics"], ["commerce", "commerce"],
  ["skill education", "skill education"], ["vocational", "vocational education"], ["ict", "ict"], ["sangeet", "sangeet"], ["music", "sangeet"],
];
/** Canonical subject → the normalised Subject.name it lands on, in priority
 *  order (a class subject whose name equals a key or starts with "key ").
 *  Checked against the DB spine in tests/unit/search-resolver.test.ts. */
export const SUBJECT_TARGETS: Readonly<Record<string, readonly string[]>> = {
  mathematics: ["mathematics"],
  science: ["science", "science physics chemistry biology"],
  "social science": ["social science", "social studies", "history civics and geography"],
  evs: ["the world around us", "environmental studies evs"],
  physics: ["physics", "science physics chemistry biology"],
  chemistry: ["chemistry", "science physics chemistry biology"],
  biology: ["biology", "science physics chemistry biology"],
  accountancy: ["accountancy"],
  "business studies": ["business studies"],
  economics: ["economics"],
  history: ["history", "history civics and geography"],
  geography: ["geography", "history civics and geography"],
  "political science": ["political science", "history civics and geography"],
  psychology: ["psychology"],
  sociology: ["sociology"],
  "home science": ["home science"],
  "computer science": ["computer science", "computer applications", "computer studies", "informatics practices", "ict"],
  "informatics practices": ["informatics practices"],
  biotechnology: ["biotechnology"],
  "fine art": ["fine art", "art", "arts", "arts education"],
  arts: ["arts", "art", "fine art", "arts education"],
  "physical education": ["physical education and well being", "health and physical education", "physical education"],
  sanskrit: ["sanskrit"],
  urdu: ["urdu"],
  english: ["english", "english or modern english"],
  hindi: ["hindi"],
  "applied mathematics": ["applied mathematics"],
  commerce: ["commerce", "business studies"],
  "skill education": ["skill education"],
  "vocational education": ["vocational education"],
  ict: ["ict", "computer applications", "computer studies"],
  sangeet: ["sangeet", "music hindustani carnatic or western"],
};
/** Where a subject the class does not teach points instead ("class 6 physics" → Science). */
export const SUBJECT_NEAREST: Readonly<Record<string, string>> = {
  physics: "science", chemistry: "science", biology: "science", evs: "science",
  history: "social science", geography: "social science", "political science": "social science", economics: "social science",
  "computer science": "ict", "fine art": "arts", arts: "fine art",
};
/** Subject words that, next to an exam's name, ask for its subject-wise tests ("ibps clerk math questions"). */
export const EXAM_SUBJECT_WORDS: readonly string[] = [
  "math", "maths", "mathematics", "quant", "quantitative", "aptitude", "arithmetic", "arthmetic", "reasoning", "english", "hindi", "gk", "ga", "gs",
  "general", "knowledge", "awareness", "studies", "science", "physics", "chemistry", "biology", "history", "geography", "polity", "economics",
  "economy", "computer", "di", "interpretation", "data", "static", "current", "affairs", "cdp", "pedagogy", "evs", "sanskrit", "urdu", "tamil",
  "telugu", "kannada", "marathi", "punjabi", "language", "numerical", "ability", "mental", "arts", "social",
];

// ── 6. Exam pages (intents) ──────────────────────────────────────────────
export interface IntentValue {
  intent: ExamIntent;
  dateKind?: string;
}
const D = (dateKind: string): IntentValue => ({ intent: "dates", dateKind });
const I = (intent: ExamIntent): IntentValue => ({ intent });
export const INTENT_PHRASES: readonly Phrase<IntentValue>[] = [
  // Dates and the tracker (the words of kindFromLabel, plus Hindi / Telugu).
  ["admit card", D("ADMIT_CARD")], ["admitcard", D("ADMIT_CARD")], ["admit", D("ADMIT_CARD")], ["hall ticket", D("ADMIT_CARD")], ["hallticket", D("ADMIT_CARD")],
  ["call letter", D("ADMIT_CARD")], ["e admit", D("ADMIT_CARD")], ["एडमिट कार्ड", D("ADMIT_CARD")], ["प्रवेश पत्र", D("ADMIT_CARD")], ["हॉल टिकट", D("ADMIT_CARD")],
  ["हाल टिकट", D("ADMIT_CARD")], ["హాల్ టికెట్", D("ADMIT_CARD")], ["హాల్ టికెట్లు", D("ADMIT_CARD")], ["హాల్టికెట్", D("ADMIT_CARD")], ["ప్రవేశ పత్రం", D("ADMIT_CARD")],
  ["result", D("RESULT")], ["results", D("RESULT")], ["merit list", D("RESULT")], ["scorecard", D("RESULT")], ["score card", D("RESULT")], ["final result", D("RESULT")],
  ["रिजल्ट", D("RESULT")], ["रिज़ल्ट", D("RESULT")], ["परिणाम", D("RESULT")], ["नतीजा", D("RESULT")], ["ఫలితాలు", D("RESULT")], ["ఫలితం", D("RESULT")], ["రిజల్ట్", D("RESULT")],
  ["notification", D("NOTIFICATION")], ["notifications", D("NOTIFICATION")], ["notice", D("NOTIFICATION")], ["advertisement", D("NOTIFICATION")], ["advt", D("NOTIFICATION")],
  ["अधिसूचना", D("NOTIFICATION")], ["नोटिफिकेशन", D("NOTIFICATION")], ["నోటిఫికేషన్", D("NOTIFICATION")],
  ["answer key", D("ANSWER_KEY")], ["answerkey", D("ANSWER_KEY")], ["आंसर की", D("ANSWER_KEY")], ["उत्तर कुंजी", D("ANSWER_KEY")], ["ఆన్సర్ కీ", D("ANSWER_KEY")],
  ["last date", D("APPLICATION")], ["apply", D("APPLICATION")], ["apply online", D("APPLICATION")], ["application", D("APPLICATION")], ["application form", D("APPLICATION")],
  ["form", D("APPLICATION")], ["registration", D("APPLICATION")], ["आवेदन", D("APPLICATION")], ["దరఖాస్తు", D("APPLICATION")],
  ["exam date", D("EXAM")], ["exam dates", D("EXAM")], ["date", D("EXAM")], ["dates", D("EXAM")], ["schedule", D("EXAM")], ["kab", D("EXAM")], ["kab hai", D("EXAM")],
  ["kab hoga", D("EXAM")], ["kab hogi", D("EXAM")], ["कब", D("EXAM")], ["कब है", D("EXAM")], ["तारीख", D("EXAM")], ["परीक्षा तिथि", D("EXAM")], ["తేదీ", D("EXAM")], ["పరీక్ష తేదీ", D("EXAM")],
  // Syllabus, pattern, vacancies (the hub carries pattern and vacancies).
  ["syllabus", I("syllabus")], ["सिलेबस", I("syllabus")], ["पाठ्यक्रम", I("syllabus")], ["సిలబస్", I("syllabus")],
  ["exam pattern", I("hub")], ["paper pattern", I("hub")], ["pattern", I("hub")], ["पैटर्न", I("hub")], ["परीक्षा पैटर्न", I("hub")], ["ప్యాటర్న్", I("hub")],
  ["vacancy", I("hub")], ["vacancies", I("hub")], ["रिक्तियां", I("hub")], ["ఖాళీలు", I("hub")],
  // Cutoff.
  ["cutoff", I("cutoff")], ["cut off", I("cutoff")], ["cutoffs", I("cutoff")], ["cut offs", I("cutoff")], ["qualifying marks", I("cutoff")], ["passing marks", I("cutoff")],
  ["minimum marks", I("cutoff")], ["safe score", I("cutoff")], ["कटऑफ", I("cutoff")], ["कट ऑफ", I("cutoff")], ["कटॉफ", I("cutoff")], ["కటాఫ్", I("cutoff")], ["కట్ ఆఫ్", I("cutoff")],
  // Previous-year papers.
  ["pyq", I("pyq")], ["pyqs", I("pyq")], ["previous year", I("pyq")], ["previous years", I("pyq")], ["previous year paper", I("pyq")], ["previous year papers", I("pyq")],
  ["previous year question", I("pyq")], ["previous year questions", I("pyq")], ["previous question paper", I("pyq")], ["previous papers", I("pyq")], ["previous paper", I("pyq")],
  ["previous questions papers", I("pyq")], ["old paper", I("pyq")], ["old papers", I("pyq")], ["old question paper", I("pyq")], ["paper old", I("pyq")], ["past paper", I("pyq")],
  ["past papers", I("pyq")], ["question paper", I("pyq")], ["question papers", I("pyq")], ["solved paper", I("pyq")], ["पिछले वर्ष", I("pyq")], ["पिछले साल", I("pyq")],
  ["प्रश्न पत्र", I("pyq")], ["प्रश्नपत्र", I("pyq")], ["पुराने पेपर", I("pyq")], ["पेपर", I("pyq")], ["పాత ప్రశ్నపత్రాలు", I("pyq")], ["ప్రశ్నపత్రం", I("pyq")], ["ప్రశ్న పత్రం", I("pyq")],
  // Practice.
  ["mock", I("mocks")], ["mocks", I("mocks")], ["mock test", I("mocks")], ["mock tests", I("mocks")], ["mock exam", I("mocks")], ["test series", I("mocks")],
  ["practice", I("mocks")], ["practise", I("mocks")], ["practice set", I("mocks")], ["practise set", I("mocks")], ["practice test", I("mocks")], ["questions", I("mocks")],
  ["question", I("mocks")], ["quiz", I("mocks")], ["test", I("mocks")], ["tests", I("mocks")], ["mcq", I("mocks")], ["sample paper", I("mocks")], ["sample papers", I("mocks")],
  ["model paper", I("mocks")], ["model papers", I("mocks")], ["prashn", I("mocks")], ["prashan", I("mocks")], ["prashna", I("mocks")], ["prashnon", I("mocks")],
  ["मॉक", I("mocks")], ["मॉक टेस्ट", I("mocks")], ["मोक टेस्ट", I("mocks")], ["टेस्ट", I("mocks")], ["प्रश्न", I("mocks")], ["प्रश्नोत्तरी", I("mocks")], ["अभ्यास", I("mocks")],
  ["సాధన", I("mocks")], ["ప్రాక్టీస్", I("mocks")], ["మాక్ టెస్ట్", I("mocks")], ["మాక్", I("mocks")], ["ప్రశ్నలు", I("mocks")], ["టెస్ట్", I("mocks")],
  ["subject wise", I("subject-tests")], ["subjectwise", I("subject-tests")], ["sectional", I("subject-tests")], ["section wise", I("subject-tests")], ["sectional test", I("subject-tests")],
  ["topic wise", I("build-mock")], ["topicwise", I("build-mock")], ["chapter wise", I("build-mock")], ["chapterwise", I("build-mock")], ["chapter test", I("build-mock")],
  ["custom mock", I("build-mock")], ["build mock", I("build-mock")], ["own mock", I("build-mock")], ["create mock", I("build-mock")], ["mock builder", I("build-mock")],
  ["topics", I("topics")], ["topic list", I("topics")], ["notes", I("topics")], ["study material", I("topics")], ["study materials", I("topics")], ["pdf", I("topics")],
  ["नोट्स", I("topics")], ["अध्ययन सामग्री", I("topics")], ["నోట్స్", I("topics")],
  ["tricks", I("tricks")], ["trick", I("tricks")], ["shortcut", I("tricks")], ["shortcuts", I("tricks")], ["short tricks", I("tricks")], ["mnemonics", I("tricks")],
  ["ट्रिक", I("tricks")], ["ट्रिक्स", I("tricks")], ["ట్రిక్స్", I("tricks")],
  ["strategy", I("guide")], ["preparation strategy", I("guide")], ["how to crack", I("guide")], ["how to prepare", I("guide")], ["how to clear", I("guide")], ["guide", I("guide")],
  ["tips", I("guide")], ["booklist", I("guide")], ["book list", I("guide")], ["best books", I("guide")], ["books", I("guide")], ["study plan", I("guide")], ["रणनीति", I("guide")],
  ["what to carry", I("checklist")], ["documents required", I("checklist")], ["documents", I("checklist")], ["reporting time", I("checklist")], ["checklist", I("checklist")],
  ["dress code", I("checklist")],
  ["score calculator", I("score")], ["marks calculator", I("score")], ["response sheet", I("score")], ["score estimate", I("score")], ["calculate score", I("score")],
  ["calculate marks", I("score")], ["rank predictor", I("score")], ["marks vs rank", I("score")],
  ["eligibility", I("eligibility")], ["eligible", I("eligibility")], ["eligibilty", I("eligibility")], ["age limit", I("eligibility")], ["age relaxation", I("eligibility")],
  ["upper age", I("eligibility")], ["qualification", I("eligibility")], ["educational qualification", I("eligibility")], ["patrata", I("eligibility")], ["yogyata", I("eligibility")],
  ["पात्रता", I("eligibility")], ["योग्यता", I("eligibility")], ["आयु सीमा", I("eligibility")], ["उम्र सीमा", I("eligibility")], ["అర్హత", I("eligibility")], ["అర్హతలు", I("eligibility")],
  ["వయో పరిమితి", I("eligibility")], ["వయస్సు పరిమితి", I("eligibility")],
  ["salary", I("salary")], ["salaries", I("salary")], ["starting salary", I("salary")], ["pay", I("salary")], ["pay scale", I("salary")], ["in hand", I("salary")], ["inhand", I("salary")],
  ["in hand salary", I("salary")], ["pay level", I("salary")], ["वेतन", I("salary")], ["सैलरी", I("salary")], ["तनख्वाह", I("salary")], ["జీతం", I("salary")], ["వేతనం", I("salary")], ["శాలరీ", I("salary")],
  ["exam day", I("live")], ["paper review", I("live")], ["today exam", I("live")], ["exam today", I("live")],
  // 26 Sep 2026 (search fixer): the all-India live tests are practice; resolve.ts also lists the /live-test page beside the exam.
  ["live test", I("mocks")], ["live tests", I("mocks")], ["live mock", I("mocks")], ["live mocks", I("mocks")],
  ["paper analysis", I("reactions")], ["analysis", I("reactions")], ["reactions", I("reactions")], ["after the paper", I("reactions")], ["student reactions", I("reactions")],
  ["how was the paper", I("reactions")],
];
/** 26 Sep 2026 (search fixer): the exam-page words a school class / subject / chapter page answers
 *  (its practice, notes, chapter-wise tests, chapter list). Any other page word next to a school
 *  query — result, admit card, date, cutoff, previous papers, sample paper — has no school page:
 *  the resolver lists the class / board page with "no-page-for-intent" instead of opening it. */
export const SCHOOL_PAGE_INTENTS: readonly ExamIntent[] = ["hub", "mocks", "subject-tests", "build-mock", "topics", "syllabus", "guide", "tricks"];
/** Words that, beside a school query, ask for the board's own papers (the board page links them). */
export const BOARD_PAPER_WORDS: readonly string[] = ["sample paper", "sample papers", "model paper", "model papers", "date sheet", "datesheet", "time table", "timetable"];
/** Bare "paper" / "papers" beside an exam asks for its previous papers ("hssc cet 2024 paper"), like "पेपर". */
export const PAPER_WORDS: readonly string[] = ["paper", "papers"];
/** An intent with no exam named opens (or lists) a site page. `direct` only where the page IS the answer. */
export const INTENT_LANDING: Readonly<Partial<Record<ExamIntent | "RESULT", { path: string; direct: boolean }>>> = {
  dates: { path: "/exam-calendar", direct: true },
  RESULT: { path: "/results", direct: true },
  eligibility: { path: "/find-your-exam", direct: true },
  mocks: { path: "/live-test", direct: false },
  pyq: { path: "/exams/browse", direct: false },
  syllabus: { path: "/exams/browse", direct: false },
  cutoff: { path: "/colleges/cutoffs", direct: false },
  salary: { path: "/careers", direct: false },
  guide: { path: "/coach", direct: false },
};

// ── 7. Sections ──────────────────────────────────────────────────────────
export interface SectionValue {
  section: SearchSection;
  kind?: DocKind;
  aspect?: "placements" | "fees" | "admission";
}
export const SECTION_PHRASES: readonly Phrase<SectionValue>[] = [
  ["college", { section: "college", kind: "college" }], ["colleges", { section: "college", kind: "college" }], ["university", { section: "college", kind: "college" }],
  ["universities", { section: "college", kind: "college" }], ["campus", { section: "college", kind: "college" }], ["कॉलेज", { section: "college", kind: "college" }],
  ["कालेज", { section: "college", kind: "college" }], ["महाविद्यालय", { section: "college", kind: "college" }], ["కాలేజీ", { section: "college", kind: "college" }],
  ["కాలేజీలు", { section: "college", kind: "college" }], ["కళాశాల", { section: "college", kind: "college" }], ["విశ్వవిద్యాలయం", { section: "college", kind: "college" }],
  ["placement", { section: "college", kind: "college", aspect: "placements" }], ["placements", { section: "college", kind: "college", aspect: "placements" }],
  ["package", { section: "college", kind: "college", aspect: "placements" }], ["average package", { section: "college", kind: "college", aspect: "placements" }],
  ["highest package", { section: "college", kind: "college", aspect: "placements" }], ["lpa", { section: "college", kind: "college", aspect: "placements" }],
  ["fees", { section: "college", kind: "college", aspect: "fees" }], ["fee structure", { section: "college", kind: "college", aspect: "fees" }],
  ["admission", { section: "college", kind: "college", aspect: "admission" }], ["admissions", { section: "college", kind: "college", aspect: "admission" }],
  ["scholarship", { section: "college", kind: "scholarship" }], ["scholarships", { section: "college", kind: "scholarship" }], ["chhatravriti", { section: "college", kind: "scholarship" }],
  ["chatravriti", { section: "college", kind: "scholarship" }], ["छात्रवृत्ति", { section: "college", kind: "scholarship" }], ["स्कॉलरशिप", { section: "college", kind: "scholarship" }],
  ["స్కాలర్షిప్", { section: "college", kind: "scholarship" }], ["స్కాలర్షిప్స్", { section: "college", kind: "scholarship" }], ["ఉపకార వేతనం", { section: "college", kind: "scholarship" }],
  ["fellowship", { section: "college", kind: "scholarship" }], ["fellowships", { section: "college", kind: "scholarship" }], ["stipend", { section: "college", kind: "scholarship" }],
  ["वजीफा", { section: "college", kind: "scholarship" }],
  ["career", { section: "careers", kind: "career" }], ["careers", { section: "careers", kind: "career" }], ["career options", { section: "careers", kind: "career" }],
  ["how to become", { section: "careers", kind: "career" }], ["how to be", { section: "careers", kind: "career" }], ["how can i become", { section: "careers", kind: "career" }],
  ["kaise bane", { section: "careers", kind: "career" }], ["kaise banu", { section: "careers", kind: "career" }], ["kaise bante hai", { section: "careers", kind: "career" }],
  ["कैसे बनें", { section: "careers", kind: "career" }], ["कैसे बने", { section: "careers", kind: "career" }], ["ఎలా అవ్వాలి", { section: "careers", kind: "career" }],
  ["ఎలా అవుతారు", { section: "careers", kind: "career" }], ["scope", { section: "careers", kind: "career" }], ["future scope", { section: "careers", kind: "career" }],
  ["want to become", { section: "careers", kind: "career" }], ["become", { section: "careers", kind: "career" }],
  ["sarkari naukri", { section: "government" }], ["sarkari job", { section: "government" }], ["sarkari jobs", { section: "government" }], ["govt job", { section: "government" }],
  ["govt jobs", { section: "government" }], ["government job", { section: "government" }], ["government jobs", { section: "government" }], ["सरकारी नौकरी", { section: "government" }],
  ["सरकारी नौकरियां", { section: "government" }], ["ప్రభుత్వ ఉద్యోగం", { section: "government" }], ["ప్రభుత్వ ఉద్యోగాలు", { section: "government" }],
  ["study abroad", { section: "more", kind: "abroad-country" }], ["abroad", { section: "more", kind: "abroad-country" }], ["videsh", { section: "more", kind: "abroad-country" }],
  ["foreign university", { section: "more", kind: "abroad-university" }], ["ms in", { section: "more", kind: "abroad-country" }], ["विदेश", { section: "more", kind: "abroad-country" }],
  ["entrance exam", { section: "entrance" }], ["entrance exams", { section: "entrance" }], ["entrance test", { section: "entrance" }], ["entrance", { section: "entrance" }],
  ["प्रवेश परीक्षा", { section: "entrance" }], ["ప్రవేశ పరీక్ష", { section: "entrance" }],
  ["school", { section: "school" }], ["schools", { section: "school" }], ["schooling", { section: "school" }], ["textbook", { section: "school" }], ["textbooks", { section: "school" }],
  ["स्कूल", { section: "school" }], ["पाठशाला", { section: "school" }], ["పాఠశాల", { section: "school" }], ["స్కూల్", { section: "school" }],
];
/** Scholarship filters. */
export const GENDER_F_WORDS: readonly string[] = ["girl", "girls", "women", "woman", "female", "ladies", "beti", "betiyon", "ladki", "ladkiyon", "लड़कियों", "लड़की", "बेटी", "महिला", "బాలికలు", "అమ్మాయిలు", "మహిళలు"];
export const CATEGORY_WORDS: Readonly<Record<string, string>> = {
  sc: "SC", st: "ST", obc: "OBC", bc: "OBC", ebc: "OBC", ews: "EWS", minority: "MIN", minorities: "MIN", muslim: "MIN", christian: "MIN", sikh: "MIN", general: "GEN",
  gen: "GEN", ur: "GEN", unreserved: "GEN",
};
export const LEVEL_WORDS: Readonly<Record<string, string>> = { ug: "UG", pg: "PG", phd: "PHD", diploma: "DIPLOMA", graduation: "UG", engineering: "UG", medical: "UG" };

/** Graduation / PG / PhD study help is being built (26 Sep 2026): no section yet. */
export const BEING_BUILT_ALWAYS: readonly string[] = ["semester", "sem", "phd", "mphil", "doctorate", "graduation notes", "degree notes", "university exam", "degree exam"];
export const DEGREE_WORDS: readonly string[] = ["btech", "be", "bsc", "ba", "bcom", "bca", "msc", "ma", "mcom", "mtech", "mca", "bed", "degree", "graduation", "pg", "masters", "ug"];
export const STUDY_WORDS: readonly string[] = ["notes", "syllabus", "subject", "subjects", "semester", "sem", "lecture", "lectures", "unit", "units", "book", "books", "topics", "question", "questions"];
/** 26 Sep 2026 (search fixer): a college degree beside "colleges" names a college stream page ("mba colleges" → management). */
export const DEGREE_STREAM: Readonly<Record<string, string>> = {
  mba: "management", pgdm: "management", bba: "management", mbbs: "medical", bds: "medical", btech: "engineering", mtech: "engineering",
  llb: "law", llm: "law", bpharm: "pharmacy", mpharm: "pharmacy", barch: "architecture",
};
/** Section words that ask for many colleges, not one ("law colleges in delhi"). */
export const PLURAL_COLLEGE_WORDS: readonly string[] = ["colleges", "universities", "कॉलेजों", "कालेजों", "కాలేజీలు", "కళాశాలలు"];

// ── 8. States ────────────────────────────────────────────────────────────
/** Search-only abbreviations: they name a state ONLY next to a role, exam or
 *  section word ("up police" → UP; "sign up" stays two words). */
export const STATE_ABBR: Readonly<Record<string, string>> = {
  up: "UP", ap: "AP", ts: "TS", tg: "TS", mp: "MP", tn: "TN", hp: "HP", jk: "JK", wb: "WB", uk: "UK", kl: "KL", mh: "MH", rj: "RJ",
  br: "BR", hr: "HR", gj: "GJ", od: "OD", pb: "PB", cg: "CG", jh: "JH", "यूपी": "UP", "एमपी": "MP", "ఏపీ": "AP", "టీఎస్": "TS", "टीएस": "TS",
};
/** Typed spellings of state names (from the ask log). */
export const STATE_TYPOS: Readonly<Record<string, string>> = {
  uttrakhand: "UK", uttarkhand: "UK", uttaranchal: "UK", karanataka: "KA", karnatak: "KA", telengana: "TS", telagana: "TS", maharastra: "MH",
  rajsthan: "RJ", chattisgarh: "CG", tamilnadu: "TN", "tamil nadu": "TN", odisa: "OD", orisa: "OD", panjab: "PB", hariyana: "HR", bihaar: "BR",
  "andhra pradesh": "AP", "himachal pradesh": "HP", "arunachal pradesh": "AR", "west bengal": "WB", "jammu kashmir": "JK", "jammu and kashmir": "JK",
};
/** Words that let a 2-letter abbreviation name a state. */
export const ROLE_WORDS: readonly string[] = [
  "police", "constable", "pc", "si", "dsp", "teacher", "tet", "ctet", "pet", "cet", "psc", "pcs", "ssc", "sssc", "sssb", "ssb", "esb", "prb", "lprb", "board",
  "group", "clerk", "patwari", "lekhpal", "vdo", "vro", "vra", "amvi", "aee", "ae", "je", "forest", "guard", "anganwadi", "nurse", "nursing", "polytechnic",
  "polycet", "eamcet", "eapcet", "icet", "lawcet", "edcet", "iti", "jobs", "job", "naukri", "bharti", "sarkari", "govt", "government", "exam", "exams",
  "pariksha", "college", "colleges", "university", "scholarship", "scholarships", "recruitment", "vacancy", "vacancies", "notification", "syllabus",
  "cutoff", "pyq", "mock", "test", "class", "state", "naukari", "tgt", "pgt", "army", "railway", "bank", "gk", "current", "sachivalayam", "inspector", "officer",
];

// ── 9. Cross-script role words and observed typos → one canonical form ────
export const CANON: Readonly<Record<string, string>> = {
  "पुलिस": "police", "पोलीस": "police", "పోలీస్": "police", "పోలీసు": "police", "போலீஸ்": "police", "ಪೊಲೀಸ್": "police", "পুলিশ": "police",
  "ਪੁਲਿਸ": "police", "પોલીસ": "police", "ପୋଲିସ": "police", "പോലീസ്": "police",
  "सिपाही": "constable", "कांस्टेबल": "constable", "कॉन्स्टेबल": "constable", "आरक्षी": "constable", "आरक्षक": "constable", "కానిస్టేబుల్": "constable",
  "காவலர்": "constable", "ಕಾನ್ಸ್ಟೇಬಲ್": "constable", sipahi: "constable", sipai: "constable",
  "दरोगा": "si", "दारोगा": "si", daroga: "si", darogha: "si", "उपनिरीक्षक": "si", "एसआई": "si", "ఎస్ఐ": "si",
  "शिक्षक": "teacher", "टीचर": "teacher", "अध्यापक": "teacher", "ఉపాధ్యాయ": "teacher", "ఉపాధ్యాయుడు": "teacher", "టీచర్": "teacher", "ஆசிரியர்": "teacher",
  "ಶಿಕ್ಷಕ": "teacher", "শিক্ষক": "teacher", "ଶିକ୍ଷକ": "teacher", shikshak: "teacher", adhyapak: "teacher",
  "रेलवे": "railway", "రైల్వే": "railway", "ரயில்வே": "railway", railways: "railway", rail: "railway",
  "बैंक": "bank", "బ్యాంక్": "bank", "బ్యాంకు": "bank",
  "గ్రూప్": "group", "గ్రూపు": "group", "ग्रुप": "group", "गट": "group", gurup: "group", grup: "group", groop: "group", grp: "group",
  "पटवारी": "patwari", "लेखपाल": "lekhpal", "नीट": "neet", "నీట్": "neet", "टेट": "tet", "టెట్": "tet", "सीटेट": "ctet", "ఎంసెట్": "eamcet",
  "ఎప్సెట్": "eapcet", "ఐసెట్": "icet", "सेना": "army", "फौज": "army", fauj: "army", "नौसेना": "navy", "वायुसेना": "air force",
  "क्लर्क": "clerk", "క్లర్క్": "clerk", "अधिकारी": "officer", "सहायक": "assistant", "कनिष्ठ": "junior", "वरिष्ठ": "senior",
  "इंस्पेक्टर": "inspector", "ఇన్స్పెక్టర్": "inspector", "मेन": "main", "मेंस": "mains", "మెయిన్": "main", "एडवांस्ड": "advanced", "అడ్వాన్స్డ్": "advanced",
  "इंजीनियरिंग": "engineering", "ఇంజనీరింగ్": "engineering", "मेडिकल": "medical", "మెడికల్": "medical", "यूनिवर्सिटी": "university",
  conistable: "constable", costable: "constable", constabale: "constable", constabel: "constable", consteble: "constable", conistabel: "constable",
  sequre: "square", geopgraphy: "geography", gepgraoghy: "geography", gepgrapghy: "geography", geograoght: "geography", geograophy: "geography",
  currenat: "current", curent: "current", accoutant: "accountant", olympaid: "olympiad", olympaids: "olympiads", exma: "exam", exans: "exams",
  examz: "exams", mcqs: "mcq", naukari: "naukri", nokri: "naukri", naukariyan: "naukri", naukriyan: "naukri", upp: "up police", ques: "question", polytecnic: "polytechnic", arthmetic: "arithmetic", avarage: "average", praactice: "practice",
};

// ── 10. Default family: a bare family name opens its main exam ───────────
/** Tested: an explicit "neet pg" / "jee advanced" always wins over the default. */
export const DEFAULT_FAMILY: Readonly<Record<string, string>> = {
  neet: "NEET_UG", jee: "JEE_MAIN", upsc: "UPSC_PRELIMS", ias: "UPSC_PRELIMS", "upsc cse": "UPSC_PRELIMS", "civil services": "UPSC_PRELIMS",
};

// ── 11. Soft words: help ranking, never block a direct open ──────────────
/** Soft words that say nothing about WHICH page ("exam", "tayari", "full"):
 *  an unmatched one costs nothing. The rest (clerk, officer, junior, state …)
 *  tell exams apart, so a page that lacks them ranks lower. */
export const FILLER_SOFT_WORDS: readonly string[] = [
  "exam", "exams", "examination", "pariksha", "recruitment", "bharti", "bharati", "भरती", "भर्ती", "tayari", "taiyari", "preparation", "prepare", "prep",
  "job", "jobs", "naukri", "services", "service", "india", "indian", "all", "official", "full", "prelims", "prelim", "mains", "primary", "section",
  "subject", "subjects", "post", "posts", "level", "study", "परीक्षा", "పరీక్ష", "ఎగ్జామ్", "नौकरी", "ఉద్యోగం", "ఉద్యోగాలు",
  // 26 Sep 2026 (search fixer): words that never name a different page ("ssc cgl expected cutoff marks", "resume format for freshers").
  "students", "student", "freshers", "fresher", "marks", "expected", "category", "course", "courses",
];
export const SOFT_WORDS: readonly string[] = [
  "assistant", "asst", "junior", "senior", "clerk", "officer", "officers", "post", "posts", "level", "recruitment", "exam", "exams", "examination",
  "pariksha", "bharti", "bharati", "भरती", "भर्ती", "tayari", "taiyari", "preparation", "prepare", "prep", "job", "jobs", "naukri", "services", "service",
  "state", "india", "indian", "all", "official", "full", "prelims", "prelim", "mains", "primary", "section", "subject", "subjects", "study",
  "परीक्षा", "పరీక్ష", "ఎగ్జామ్", "नौकरी", "ఉద్యోగం", "ఉద్యోగాలు",
  "students", "student", "freshers", "fresher", "marks", "expected", "category", "course", "courses",
];

// ── 12. Stop words (English and romanised fillers) ───────────────────────
export const STOP_WORDS: readonly string[] = [
  "i", "im", "am", "want", "wanna", "need", "give", "me", "please", "pls", "plz", "show", "find", "get", "share", "tell", "the", "a", "an", "for", "of", "to",
  "about", "on", "in", "is", "are", "was", "be", "my", "can", "could", "you", "your", "and", "with", "from", "at", "by", "it", "this", "that", "these",
  "those", "any", "some", "list", "details", "detail", "info", "information", "complete", "online", "free", "best", "top", "latest", "new", "now",
  "also", "only", "there", "do", "does", "did", "will", "would", "should", "shall", "may", "much", "many", "some", "its", "so", "if", "then", "than",
  "hai", "h", "hain", "ka", "ki", "ke", "ko", "se", "me", "mein", "mai", "mujhe", "muje", "mujhko", "mere", "mera", "meri", "karni", "karna", "krna",
  "kre", "kare", "karo", "chahiye", "chaiye", "chahie", "dijiye", "dijie", "dedo", "de", "batao", "bataiye", "wala", "wali", "vale", "wale", "liye",
  "lie", "kosam", "kavali", "cheppandi", "cheppu", "baddal", "sathi", "pahije", "aahe", "ahe", "la", "ni", "nu", "na", "par", "pe", "aur", "ya", "or", "bhi",
  "sirf", "hetu", "m", "uske", "iske", "unka", "uska", "iska", "wo", "ye", "yeh", "vo", "something", "anything", "thing", "venum", "vendum", "beku", "kar", "sakte", "sakta", "milega", "milegi", "hoga", "hogi", "raha", "rahi", "wise", "where", "attend",
  "मुझे", "मेरे", "मेरा", "मेरी", "का", "की", "के", "को", "से", "में", "है", "हैं", "चाहिए", "दो", "दीजिए", "लिए", "और", "या", "भी", "नाकु", "నాకు",
  "కావాలి", "కోసం", "లో", "గురించి", "ఇవ్వండి", "please", "sir", "mam", "madam", "hello", "hi", "hii", "hey",
];

// ── 13. Question shape ───────────────────────────────────────────────────
export const QUESTION_WORDS: readonly string[] = [
  "what", "why", "how", "when", "which", "who", "whom", "whose", "explain", "meaning", "define", "definition", "solve", "difference", "kya", "kyu", "kyon",
  "kyun", "kaise", "kese", "kaun", "kon", "kaha", "kahan", "kitna", "kitni", "kitne", "कितना", "कितनी", "कितने", "ఎంత", "क्या", "कैसे", "क्यों", "कौन", "कहाँ", "कहां", "ఏమిటి", "ఏమి", "ఎలా", "ఎందుకు", "ఎప్పుడు",
  "ఎవరు", "ఏది", "எப்படி", "என்ன", "ಏನು", "ಹೇಗೆ",
];
/** A concept doubt, not a page: "what is photosynthesis", "explain", "kya hota hai", "samjhao". */
export const DOUBT_PHRASES: readonly string[] = [
  "what is", "what are", "what does", "what do", "how does", "how do", "how is", "why is", "why do", "why does", "explain", "meaning", "define", "definition",
  "solve", "prove", "derive", "difference between", "teach me", "teach", "samjhao", "samjhaiye", "samjha", "samjhana", "kya hai", "kya hota", "kya hote",
  "kya hoti", "matlab", "arth", "मतलब", "क्या है", "क्या होता", "क्या होती", "समझाइए", "समझाओ", "అర్థం", "వివరించండి", "ఏమిటి",
];
export const FIRST_PERSON_PHRASES: readonly string[] = [
  "i am", "i m", "im", "am i", "can i", "should i", "will i", "i have", "i got", "i scored", "my", "mera", "meri", "mere", "mai", "mujhe", "muje", "are you", "can you", "do you", "could you", "will you", "would you", "मैं",
  "मेरा", "मेरी", "मुझे", "నేను", "నాకు",
];
export const COMPARE_PHRASES: readonly string[] = ["vs", "versus", "which is better", "better", "difference between", "compare", "comparison", "which", "should"];

// ── College names: the city a college is still called by ────────────────
export const CITY_SYNONYMS: readonly (readonly [string, string])[] = [
  ["madras", "chennai"], ["bombay", "mumbai"], ["calcutta", "kolkata"], ["bangalore", "bengaluru"], ["trichy", "tiruchirappalli"],
  ["varanasi", "banaras"], ["varanasi", "benaras"], ["allahabad", "prayagraj"], ["gurgaon", "gurugram"], ["baroda", "vadodara"], ["trivandrum", "thiruvananthapuram"],
];
/** 26 Sep 2026 (search fixer): what students call a scholarship when its own
 *  title does not hold it as a whole name ("post matric scholarship sc st",
 *  "पोस्ट मैट्रिक छात्रवृत्ति"). Keyed by scholarship id; index-core.ts adds them. */
export const SCHOLARSHIP_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "nsp-post-matric": ["post matric", "पोस्ट मैट्रिक"],
  "nsp-pre-matric": ["pre matric", "pre matric scholarship", "प्री मैट्रिक"],
  // 26 Sep 2026 (integrator): students type "NMMS" (the exam's name); the
  // scheme's id and title say NMMSS — the proof run's resolver miss.
  nmmss: ["nmms", "nmms scholarship", "एनएमएमएस"],
};
/** College branch words. */
export const BRANCH_SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  cse: ["cse", "cs", "computer science", "computer science engineering", "computer", "comp sci"],
  ee: ["ee", "electrical", "electrical engineering"],
  eee: ["eee", "electrical", "electrical and electronics"],
  ece: ["ece", "electronics", "electronics and communication"],
  mech: ["mech", "mechanical", "mechanical engineering"],
  civil: ["civil", "civil engineering"],
  chem: ["chemical", "chemical engineering"],
  aero: ["aero", "aerospace", "aeronautical"],
  mbbs: ["mbbs", "medicine"],
  pgp: ["pgp", "mba"],
  pgpx: ["pgpx", "executive mba"],
  "ba-llb": ["ba llb", "llb", "law"],
  law: ["law", "llb"],
  "math-cs": ["mathematics and computing", "math cs", "mnc"],
};

// ── 14. Calendar, current affairs and months (26 Sep 2026, discoverability G2) ──
// "upsc calendar 2026", "upcoming government exams 2026", "current affairs
// today", "current affairs september 2026": each names a site page (the exam
// calendar, the daily current affairs, a monthly capsule) that token scoring
// alone left as a list. resolve.ts reads these; a capsule opens only when the
// index holds that month (a page.tsx that renders).
/** Words that ask for the exam calendar. */
export const CALENDAR_WORDS: readonly string[] = ["calendar", "calender", "calendars", "कैलेंडर", "कैलेण्डर", "క్యాలెండర్"];
/** "upcoming government exams" — the calendar's upcoming dates. */
export const UPCOMING_WORDS: readonly string[] = ["upcoming", "आगामी", "రాబోయే"];
/** Words that may sit beside a calendar / upcoming word without naming another page. */
export const CALENDAR_SIDE_WORDS: readonly string[] = [
  "exam", "exams", "examination", "examinations", "government", "govt", "sarkari", "central", "competitive", "recruitment", "list", "all",
  "annual", "yearly", "full", "new", "परीक्षा", "परीक्षाएं", "सरकारी", "పరీక్ష", "పరీక్షలు", "ప్రభుత్వ",
];
/** The phrases that name current affairs (any script). */
export const CURRENT_AFFAIRS_PHRASES: readonly string[] = [
  "current affairs", "current affair", "करंट अफेयर्स", "करेंट अफेयर्स", "समसामयिकी", "samsamayiki", "కరెంట్ అఫైర్స్", "వర్తమాన వ్యవహారాలు",
];
/** Words that ask for today's current affairs ("current affairs today", "aaj ka current affairs"). */
export const TODAY_WORDS: readonly string[] = ["today", "todays", "aaj", "daily", "latest", "आज", "ताजा", "ఈరోజు", "నేటి", "gk"];
/** Words that may sit beside a month in a capsule ask ("current affairs capsule september 2026"). */
export const CAPSULE_SIDE_WORDS: readonly string[] = ["capsule", "monthly", "month", "gk", "magazine", "compilation", "मासिक", "నెలవారీ"];
/** Month names → 1-12 (English, short forms, Hindi, Telugu). */
export const MONTH_WORDS: Readonly<Record<string, number>> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sept: 9, sep: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
  "जनवरी": 1, "फरवरी": 2, "मार्च": 3, "अप्रैल": 4, "मई": 5, "जून": 6, "जुलाई": 7, "अगस्त": 8, "सितंबर": 9, "सितम्बर": 9, "अक्टूबर": 10, "नवंबर": 11, "नवम्बर": 11,
  "दिसंबर": 12, "दिसम्बर": 12,
  "జనవరి": 1, "ఫిబ్రవరి": 2, "మార్చి": 3, "ఏప్రిల్": 4, "మే": 5, "జూన్": 6, "జూలై": 7, "ఆగస్టు": 8, "సెప్టెంబర్": 9, "అక్టోబర్": 10, "నవంబర్": 11, "డిసెంబర్": 12,
};
/** English month names, for capsule page titles and match keys (index-core.ts). */
export const MONTH_NAMES: readonly string[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
