// Invented exam counts in stored topic notes (29 Sep 2026).
//
// The May–September 2026 topic notes were written by AI from the topic title
// and a one-line scope (scripts/generate-topic-notes.ts). The prompt asked
// "where it fits in the exam", and the model answered with numbers nobody
// counted: "Expect 4–6 questions directly from this topic in most papers",
// "typically carries 2–3 questions", "can secure you 5–6 easy marks". No
// paper was read. Founder rule: nothing invented — so these sentences are
// not shown.
//
// This is a render-time filter: the stored text is not changed. It removes a
// whole sentence (or list item, or table row) when the sentence says how
// many questions or marks the EXAM gives the topic. It is built to leave the
// lesson alone: a sentence that only uses the words inside the teaching — "a
// test has 20 questions of 2 marks each", a marking rubric, the 40:60
// formative–summative split, a time target — has no exam claim and stays.
// When in doubt it keeps the sentence; the rewrite of the notes replaces the
// text itself.
//
// Pure: no React, no DB. Used by the English and Hindi topic pages;
// tests/unit/note-claims.test.ts pins both the cuts and the keeps.

/** "4", "4-6", "4–6", "4 to 6", "8+": one to three digits, never part of a year, a decimal, a fraction or a rupee sum. */
const RANGE = String.raw`(?<![\d.,/₹])\d{1,3}(?:\s*(?:[-–—]|to|or)\s*\d{1,3})?\s*\+?`;
const ADJ = String.raw`(?:direct|easy|straightforward|scoring|sure[- ]shot|guaranteed|factual|conceptual|comprehension|application[- ]based|objective)`;

/** "4–6 questions", "2-3 direct questions", "5 marks", "5-question set", "15-mark component" — not "1857 marks the first…". */
const COUNT = new RegExp(String.raw`${RANGE}[\s-]*(?:${ADJ}\s+)?(?:questions?|mcqs?|marks?)\b(?!\s+(?:the|a|an|its|his|her|their|our)\b)`, "i");
/** "70% of all questions", "10–15% of the paper". */
const SHARE = new RegExp(String.raw`${RANGE}\s*%\s*(?:of\s+)?(?:all\s+|the\s+|total\s+)*(?:questions|marks|paper|exam)\b`, "i");

/** Says it outright: how much the exam asks from the topic. */
const STRONG_CUE =
  /\b(?:expect(?:ed|s)?|typical(?:ly)?|usually|generally|normally|regularly|consistent(?:ly)?|reliabl[ey]|annually|every (?:year|exam|paper|cycle)|each (?:year|exam|paper)|per (?:exam|paper|year|tier|shift)|in (?:the|most|every|each|recent|previous|past) (?:exams?|papers?|years?|shifts?)|most [^.]{0,30}? papers|appear(?:s|ing)?|asked|carr(?:y|ies|ying)|account(?:s|ing)? for|contribut(?:e|es|ing)|constitut(?:e|es|ing)|compris(?:e|es|ing)|yield(?:s|ing)?|fetch(?:es)?|guarantee[sd]?|weightage|exam weight|direct questions?|directly (?:test|address|from)|come(?:s)? (?:directly )?from|from this (?:topic|chapter|section|area|unit|domain|subtopic)|(?:questions?|marks?) on this topic|source of|you(?:'ll|’ll| will) (?:see|face|encounter|find|get)|high(?:est)?[- ](?:yield|weightage))\b/i;
/** Weaker words: they count only next to a word for the exam or its paper. */
const WEAK_CUE =
  /\b(?:secur(?:e|es|ed|ing)|ensur(?:e|es)|forms?|includes?|dedicat(?:es|ed)|allocat(?:es|ed)|allot(?:s|ted)|helps? you (?:answer|handle|attempt)|worth|scor(?:e|es|ing)|pickups?|segment|chunk|component|edge in|make the difference)\b/i;
const EXAM_WORD =
  /\b(?:exams?|papers?|prelims|mains|tier|section|portion|cut-?offs?|syllabus|topic|[A-Z]{2,}\s?TET|TET|CTET|SSC|IBPS|SBI|RRB|UPSC|[A-Z]{2,5}PSC|NDA|NSO|IMO|IOQM|CET)\b/;

/** The lesson itself: marking schemes, the formative–summative split, worked sums, time targets. */
const LESSON_CONTENT =
  /\b(?:formative|summative|FA\d?|SA\d?|CCE|blueprint|rubric|marking scheme|unit test|written test|class test|internal assessment|council|(?:a|one) (?:\w+ )?(?:teacher|student|learner|child))\b|^\W*(?:question|example|scenario|case|q\d*)\b\W|\d\s*[=×÷]\s*\d|[×÷₹]/i;
/** A time target for the student ("aim to solve a 5-question set in under 5 minutes") is advice, not a count. */
const TIME_ADVICE = /\b(?:minutes?|mins?|seconds?|hours?)\b/i;
const ADVICE_VERB = /\b(?:aim|target|practi[cs]e|solve|finish|allocate|spend|read|attempt)\b/i;
const OUTRIGHT = /\b(?:weightage|exam weight|from this (?:topic|chapter|section|area|unit|domain|subtopic)|(?:questions?|marks?) on this topic)\b/i;
/** "Expect 3–5 questions…" is the claim itself, whatever the topic is about. */
const EXPECT = /\bexpect(?:ed|s)?\b/i;
/** "a reliable 3–5 mark block", "this 2–3 mark topic", "a 15-mark component". */
const SIZED_TOPIC = /\d[\s-]*(?:marks?|questions?)[\s-]+(?:topic|section|segment|block|chunk|component|area|pickups?)\b/i;

/** Hindi notes are translations of the same sentences. */
const HI_COUNT = /(?<![\d.,/₹])[0-9०-९]{1,3}\s*(?:[-–—]|से)?\s*[0-9०-९]{0,3}\s*%?\s*(?:सीधे\s+)?(?:प्रश्न|प्रश्नों|सवाल|सवालों|अंक|अंकों|marks?|questions?)/i;
const HI_CUE = /(?:आमतौर|सामान्यत|प्रायः|अक्सर|हर साल|प्रत्येक वर्ष|हर परीक्षा|परीक्षा में|पेपर में|पूछे जाते|पूछा जाता|आते हैं|आता है|लेकर आता|वेटेज|भारांक|अपेक्षा|उम्मीद|इस (?:टॉपिक|विषय|अध्याय|खंड) से|इसी से)/;
const HI_LESSON = /(?:रचनात्मक|योगात्मक|सतत|CCE|[=×÷₹])/;

export function isInventedCountSentence(sentence: string): boolean {
  const s = sentence.replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
  if (s.length < 12) return false;
  if (/[ऀ-ॿ]/.test(s)) return HI_COUNT.test(s) && HI_CUE.test(s) && !HI_LESSON.test(s);
  const hasCount = COUNT.test(s) || SHARE.test(s);
  if (!hasCount) return false;
  if (EXPECT.test(s)) return true;
  if (LESSON_CONTENT.test(s)) return false;
  if (OUTRIGHT.test(s)) return true;
  const strong = STRONG_CUE.test(s);
  if (TIME_ADVICE.test(s) && ADVICE_VERB.test(s) && !strong) return false;
  if (strong || SIZED_TOPIC.test(s)) return true;
  return WEAK_CUE.test(s) && EXAM_WORD.test(s);
}

const SENTENCE_END = /(?<=[.?!।]["”')]?)\s+(?=[A-Z"'“(\[*ऀ-ॿ])/;

/** Sentences of a note, line by line. A decimal point does not end a sentence. */
export function splitNoteSentences(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) for (const part of line.split(SENTENCE_END)) if (part.trim()) out.push(part);
  return out;
}

const FENCE = /^\s*```/;
const LIST_ITEM = /^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/;
const HEADING = /^\s*#{1,6}\s/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^\s*\|?\s*:?-{3,}/;

/**
 * The note without the sentences that state an invented exam count.
 * Line by line: a heading is kept; a table row or list item that is such a
 * claim goes whole; in a paragraph only the claiming sentences go. Code
 * fences are not touched. If nothing matches, the same string comes back.
 */
export function stripInventedCounts(markdown: string): string {
  if (!markdown) return markdown;
  const nl = markdown.includes("\r\n") ? "\r\n" : "\n";
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let inFence = false;
  let changed = false;
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence || !line.trim() || HEADING.test(line) || TABLE_RULE.test(line)) {
      out.push(line);
      continue;
    }
    if (TABLE_ROW.test(line)) {
      if (isInventedCountSentence(line.replace(/\|/g, " "))) changed = true;
      else out.push(line);
      continue;
    }
    const item = LIST_ITEM.exec(line);
    const lead = item ? item[1] : (/^\s*(?:>\s*)?/.exec(line)?.[0] ?? "");
    const body = item ? item[2] : line.slice(lead.length);
    const sentences = body.split(SENTENCE_END);
    const kept = sentences.filter((s) => !isInventedCountSentence(s));
    if (kept.length === sentences.length) {
      out.push(line);
      continue;
    }
    changed = true;
    const rest = kept.join(" ").trim();
    // A list item or paragraph left with only a label ("**Weightage:**") goes too.
    if (rest.replace(/[*_:\-–—\s]/g, "").length < 12) continue;
    out.push(lead + rest);
  }
  if (!changed) return markdown;
  // No run of three blank lines where a paragraph was removed.
  return out.join(nl).replace(/(?:\r?\n){3,}/g, nl + nl);
}
