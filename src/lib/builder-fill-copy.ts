// The custom mock builder's availability and answered-question lines, in
// the student's language (25 Sep 2026).
//
// Two changes landed together:
//   - "seen" now means ANSWERED (src/lib/answered-questions.ts). The old
//     build.seen.* / build.topic.* / build.built.repeats strings in
//     src/lib/i18n.ts say "seen" and "(any mock you opened … counts)",
//     which is no longer what the numbers count, so the build-mock page
//     passes these instead.
//   - the builder shows how many questions a selection really holds at the
//     chosen difficulty, greys out sizes it cannot fill and offers "All N"
//     (src/lib/mock-fill.ts); these are that copy.
//
// Templates keep {placeholders} and BuilderForm fills them with real
// numbers only. "mock" stays in Latin script in Telugu, as in the builder's
// other build.* strings.

import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export interface BuilderFillCopy {
  /** {seen} {total} {days} */
  answeredLine: string;
  /** {unseen} {size} {repeats} */
  answeredShort: string;
  /** {total} {days} */
  answeredExhausted: string;
  /** Chip tooltip. {seen} {n} {days} */
  topicAnsweredTitle: string;
  /** Chip count. {new} {n} */
  topicNotAnsweredOf: string;
  /** {count} {repeats} {days} {seen} {size} */
  builtRepeats: string;
  /** {count} {requested} */
  builtShort: string;
  /** Size chip holding every available question. {n} */
  sizeAll: string;
  /** Tooltip of a size the selection cannot fill. {n} */
  sizeTooBig: string;
  /** {n} {count} */
  onlyAvailable: string;
  /** {n} {min} {mixed} */
  tooFew: string;
  // Easy / Hard notes (src/lib/mock-fill.ts levelMix / levelNote). Bounds
  // only — "at least {medium} … medium" — never "hard first": the API takes
  // every unanswered question, whatever the level, before an answered one.
  /** Easy, too few easy questions: {strict} {medium} {size} */
  fallbackEasy: string;
  /** Hard, too few hard questions: {strict} {medium} {size} */
  fallbackHard: string;
  /** Easy, no easy questions: {size} */
  fallbackNoneEasy: string;
  /** Hard, no hard questions: {size} */
  fallbackNoneHard: string;
  /** Easy, answered easy ones go after unanswered medium: {answered} {total} {medium} {size} */
  fallbackAnsweredEasy: string;
  /** Hard, answered hard ones go after unanswered medium: {answered} {total} {medium} {size} */
  fallbackAnsweredHard: string;
  /** As fallbackAnsweredEasy, no easy question left in the set: {answered} {total} {size} */
  fallbackAnsweredNoneEasy: string;
  /** As fallbackAnsweredHard, no hard question left in the set: {answered} {total} {size} */
  fallbackAnsweredNoneHard: string;
}

const COPY: Readonly<Record<CopyLocale, BuilderFillCopy>> = {
  en: {
    answeredLine: "You have answered {seen} of the {total} questions in this selection in the last {days} days.",
    answeredShort:
      "Only {unseen} you have not answered are left — a {size}-question set will repeat about {repeats} you have answered, the longest-ago first.",
    answeredExhausted:
      "You have answered all {total} questions in this selection in the last {days} days. This set will repeat them, the longest-ago first — add more topics, or try a subject test on the exam page.",
    topicAnsweredTitle: "{seen} of {n} answered in the last {days} days",
    topicNotAnsweredOf: "{new} unanswered of {n}",
    builtRepeats:
      "Built: {count} questions — {repeats} of them you have answered in the last {days} days ({seen} of the {size} questions in this bank answered).",
    builtShort: "Only {count} questions were available for these topics, so this mock has {count}, not {requested}.",
    sizeAll: "All {n}",
    sizeTooBig: "Only {n} questions available",
    onlyAvailable: "Only {n} questions are available for this selection — the mock will have {n}, not {count}.",
    tooFew: "Only {n} questions are available for this selection — a mock needs at least {min}. Add another topic, or choose {mixed}.",
    fallbackEasy: "Easy: this selection has only {strict} easy questions, so at least {medium} of these {size} will be medium.",
    fallbackHard: "Hard: this selection has only {strict} hard questions, so at least {medium} of these {size} will be medium.",
    fallbackNoneEasy: "Easy: this selection has no easy questions, so all {size} will be medium.",
    fallbackNoneHard: "Hard: this selection has no hard questions, so all {size} will be medium.",
    fallbackAnsweredEasy:
      "Easy: questions you have not answered come first, whatever the level, and you have answered {answered} of the {total} easy ones here — so at least {medium} of these {size} will be medium.",
    fallbackAnsweredHard:
      "Hard: questions you have not answered come first, whatever the level, and you have answered {answered} of the {total} hard ones here — so at least {medium} of these {size} will be medium.",
    fallbackAnsweredNoneEasy:
      "Easy: questions you have not answered come first, whatever the level, and you have answered {answered} of the {total} easy ones here — so all {size} will be medium.",
    fallbackAnsweredNoneHard:
      "Hard: questions you have not answered come first, whatever the level, and you have answered {answered} of the {total} hard ones here — so all {size} will be medium.",
  },
  hi: {
    answeredLine: "इस चयन के {total} सवालों में से {seen} का जवाब आप पिछले {days} दिनों में दे चुके हैं।",
    answeredShort:
      "बिना जवाब दिए सिर्फ़ {unseen} सवाल बचे हैं — {size} सवालों के सेट में लगभग {repeats} ऐसे सवाल दोहराए जाएँगे जिनका जवाब आप दे चुके हैं, सबसे पुराने पहले।",
    answeredExhausted:
      "इस चयन के सभी {total} सवालों का जवाब आप पिछले {days} दिनों में दे चुके हैं। इस सेट में वही सवाल दोहराए जाएँगे, सबसे पुराने पहले — और टॉपिक जोड़ें, या परीक्षा पेज पर सब्जेक्ट टेस्ट आज़माएँ।",
    topicAnsweredTitle: "पिछले {days} दिनों में {n} में से {seen} का जवाब दिया",
    topicNotAnsweredOf: "{n} में से {new} बिना जवाब",
    builtRepeats:
      "तैयार: {count} सवाल — इनमें से {repeats} का जवाब आप पिछले {days} दिनों में दे चुके हैं (इस बैंक के {size} सवालों में से {seen} का जवाब दिया)।",
    builtShort: "इन टॉपिक में सिर्फ़ {count} सवाल उपलब्ध थे, इसलिए इस मॉक में {requested} नहीं, {count} सवाल हैं।",
    sizeAll: "सभी {n}",
    sizeTooBig: "सिर्फ़ {n} सवाल उपलब्ध",
    onlyAvailable: "इस चयन में सिर्फ़ {n} सवाल उपलब्ध हैं — मॉक में {count} नहीं, {n} सवाल होंगे।",
    tooFew: "इस चयन में सिर्फ़ {n} सवाल उपलब्ध हैं — मॉक के लिए कम से कम {min} चाहिए। कोई और टॉपिक जोड़ें, या {mixed} चुनें।",
    fallbackEasy: "आसान: इस चयन में सिर्फ़ {strict} आसान सवाल हैं, इसलिए इन {size} में से कम से कम {medium} मध्यम होंगे।",
    fallbackHard: "कठिन: इस चयन में सिर्फ़ {strict} कठिन सवाल हैं, इसलिए इन {size} में से कम से कम {medium} मध्यम होंगे।",
    fallbackNoneEasy: "आसान: इस चयन में कोई आसान सवाल नहीं है, इसलिए सभी {size} मध्यम होंगे।",
    fallbackNoneHard: "कठिन: इस चयन में कोई कठिन सवाल नहीं है, इसलिए सभी {size} मध्यम होंगे।",
    fallbackAnsweredEasy:
      "आसान: जिन सवालों का जवाब आपने नहीं दिया, वे पहले आते हैं, स्तर चाहे जो हो — और यहाँ के {total} आसान सवालों में से {answered} का जवाब आप दे चुके हैं, इसलिए इन {size} में से कम से कम {medium} मध्यम होंगे।",
    fallbackAnsweredHard:
      "कठिन: जिन सवालों का जवाब आपने नहीं दिया, वे पहले आते हैं, स्तर चाहे जो हो — और यहाँ के {total} कठिन सवालों में से {answered} का जवाब आप दे चुके हैं, इसलिए इन {size} में से कम से कम {medium} मध्यम होंगे।",
    fallbackAnsweredNoneEasy:
      "आसान: जिन सवालों का जवाब आपने नहीं दिया, वे पहले आते हैं, स्तर चाहे जो हो — और यहाँ के {total} आसान सवालों में से {answered} का जवाब आप दे चुके हैं, इसलिए सभी {size} मध्यम होंगे।",
    fallbackAnsweredNoneHard:
      "कठिन: जिन सवालों का जवाब आपने नहीं दिया, वे पहले आते हैं, स्तर चाहे जो हो — और यहाँ के {total} कठिन सवालों में से {answered} का जवाब आप दे चुके हैं, इसलिए सभी {size} मध्यम होंगे।",
  },
  te: {
    answeredLine: "ఈ ఎంపికలోని {total} ప్రశ్నల్లో {seen} ప్రశ్నలకు మీరు గత {days} రోజుల్లో జవాబు ఇచ్చారు.",
    answeredShort:
      "మీరు జవాబు ఇవ్వనివి {unseen} మాత్రమే మిగిలాయి — {size} ప్రశ్నల సెట్‌లో మీరు జవాబు ఇచ్చినవి సుమారు {repeats} మళ్లీ వస్తాయి, అన్నిటికంటే పాతవి మొదట.",
    answeredExhausted:
      "ఈ ఎంపికలోని మొత్తం {total} ప్రశ్నలకూ గత {days} రోజుల్లో మీరు జవాబు ఇచ్చారు. ఈ సెట్‌లో అవే మళ్లీ వస్తాయి, అన్నిటికంటే పాతవి మొదట — మరిన్ని టాపిక్‌లు జోడించండి, లేదా పరీక్ష పేజీలో సబ్జెక్ట్ టెస్ట్ ప్రయత్నించండి.",
    topicAnsweredTitle: "గత {days} రోజుల్లో {n} లో {seen} కి జవాబు ఇచ్చారు",
    topicNotAnsweredOf: "{n} లో {new} జవాబు ఇవ్వనివి",
    builtRepeats:
      "సిద్ధం: {count} ప్రశ్నలు — వాటిలో {repeats} కి మీరు గత {days} రోజుల్లో జవాబు ఇచ్చారు (ఈ బ్యాంక్‌లోని {size} ప్రశ్నల్లో {seen} కి జవాబు ఇచ్చారు).",
    builtShort: "ఈ టాపిక్‌లలో {count} ప్రశ్నలు మాత్రమే అందుబాటులో ఉన్నాయి, అందుకే ఈ mock లో {requested} కాదు, {count} ప్రశ్నలు ఉన్నాయి.",
    sizeAll: "మొత్తం {n}",
    sizeTooBig: "{n} ప్రశ్నలు మాత్రమే అందుబాటులో",
    onlyAvailable: "ఈ ఎంపికలో {n} ప్రశ్నలు మాత్రమే అందుబాటులో ఉన్నాయి — mock లో {count} కాదు, {n} ప్రశ్నలు ఉంటాయి.",
    tooFew: "ఈ ఎంపికలో {n} ప్రశ్నలు మాత్రమే అందుబాటులో ఉన్నాయి — mock కు కనీసం {min} కావాలి. మరో టాపిక్ జోడించండి, లేదా {mixed} ఎంచుకోండి.",
    fallbackEasy: "సులభం: ఈ ఎంపికలో {strict} సులభమైన ప్రశ్నలు మాత్రమే ఉన్నాయి, అందుకే ఈ {size} లో కనీసం {medium} మధ్యస్థ ప్రశ్నలు ఉంటాయి.",
    fallbackHard: "కఠినం: ఈ ఎంపికలో {strict} కఠినమైన ప్రశ్నలు మాత్రమే ఉన్నాయి, అందుకే ఈ {size} లో కనీసం {medium} మధ్యస్థ ప్రశ్నలు ఉంటాయి.",
    fallbackNoneEasy: "సులభం: ఈ ఎంపికలో సులభమైన ప్రశ్నలు లేవు, అందుకే మొత్తం {size} మధ్యస్థ ప్రశ్నలే ఉంటాయి.",
    fallbackNoneHard: "కఠినం: ఈ ఎంపికలో కఠినమైన ప్రశ్నలు లేవు, అందుకే మొత్తం {size} మధ్యస్థ ప్రశ్నలే ఉంటాయి.",
    fallbackAnsweredEasy:
      "సులభం: స్థాయి ఏదైనా, మీరు జవాబు ఇవ్వని ప్రశ్నలే ముందు వస్తాయి — ఇక్కడి {total} సులభమైన ప్రశ్నల్లో {answered} కి మీరు జవాబు ఇచ్చారు, అందుకే ఈ {size} లో కనీసం {medium} మధ్యస్థ ప్రశ్నలు ఉంటాయి.",
    fallbackAnsweredHard:
      "కఠినం: స్థాయి ఏదైనా, మీరు జవాబు ఇవ్వని ప్రశ్నలే ముందు వస్తాయి — ఇక్కడి {total} కఠినమైన ప్రశ్నల్లో {answered} కి మీరు జవాబు ఇచ్చారు, అందుకే ఈ {size} లో కనీసం {medium} మధ్యస్థ ప్రశ్నలు ఉంటాయి.",
    fallbackAnsweredNoneEasy:
      "సులభం: స్థాయి ఏదైనా, మీరు జవాబు ఇవ్వని ప్రశ్నలే ముందు వస్తాయి — ఇక్కడి {total} సులభమైన ప్రశ్నల్లో {answered} కి మీరు జవాబు ఇచ్చారు, అందుకే మొత్తం {size} మధ్యస్థ ప్రశ్నలే ఉంటాయి.",
    fallbackAnsweredNoneHard:
      "కఠినం: స్థాయి ఏదైనా, మీరు జవాబు ఇవ్వని ప్రశ్నలే ముందు వస్తాయి — ఇక్కడి {total} కఠినమైన ప్రశ్నల్లో {answered} కి మీరు జవాబు ఇచ్చారు, అందుకే మొత్తం {size} మధ్యస్థ ప్రశ్నలే ఉంటాయి.",
  },
};

export function builderFillCopy(locale: string | null | undefined): BuilderFillCopy {
  return pickCopy(COPY, locale);
}
