// scripts/fix-bank-items-10-2026.ts — six bank questions whose key, codes,
// options or solution are wrong (13 Oct 2026).
//
// Why: the signed-in tutor reads bank rows verbatim. find_questions_on_topic
// serves the stem, options and key; get_attempt_mistakes hands Claude the
// stored key and solution, and Claude repeats them to the student (the
// 13 Oct 2026 tutor audit, fault 6). Four rows came from that audit; two
// more from a no-AI brute force over every letter-pair question in the bank
// the same day (all read with SELECT only).
//
//   group         row (exam, topic)                         what is wrong → what this does
//   document      cmp09eg1m02fvwf3zi8j7ebpg                 'DOCUMENT' letter pairs, keyed C (Two). All 28 pairs
//                 IBPS_CLERK reason.alphabet_test           checked: none qualifies, either direction → key A
//                                                           (None), solution rebuilt from the count. All 9 answers
//                                                           given were marked wrong; the 4 that chose A were right.
//   coding        cmp01irog00z9tefluqzo6472                 Sentence 1 printed as 'T8 N10 S6 H6'. The rule the
//                 SBI_PO reason.coding_decoding             other two sentences follow (last letter + number of
//                                                           letters) gives 'R8 N12 S6 H6': customer is R8 in
//                                                           sentence 3, satisfaction has 12 letters. By
//                                                           elimination N10 could be satisfaction or drives. →
//                                                           the two codes and the asked code fixed (N12); key B
//                                                           kept; solution rewritten. (Kept, not withdrawn: it
//                                                           sits in 6 SBI PO full mocks.)
//   asafjah       cmusm3nbn002p4rfzgrfdws5u                 "originally a viceroy under which emperor" is
//                 TS_POLICE_PC ts.state.history             Farrukhsiyar (1713); the key C, Muhammad Shah, fits
//                                                           only "before declaring independence" (1724). The
//                                                           solution says Muhammad Shah appointed him in 1713;
//                                                           Muhammad Shah reigned from 1719. → withdrawn
//                                                           (validated false, tag "rejected"); solution
//                                                           rewritten for past reviews. In no system mock.
//   flora         cmp1cj3m703npwsoxo5rh5gf1                 Stem "incident … of 1956"; solution "16 January 1956
//                 MH_MPSC_GROUP_C mh.unification            … over 100 killed in this firing". The Flora Fountain
//                                                           firing was on 21 Nov 1955; 106 is the whole
//                                                           agitation's toll. → year taken out of the stem, key B
//                                                           kept, solution rewritten.
//   constitution  cmp035161000nwf3zurs62qpi                 'CONSTITUTION', both directions: 9 pairs (6 forward
//                 SBI_PO reason.alphabet_test               only); options Two–Five, keyed Five (side-by-side
//                                                           pairs only — the answer check "corrected" it to that
//                                                           on 26 Sep). → option D reads "More than five" (true
//                                                           under either convention), key D kept.
//   president     cmozyhvfe000bteflzwfjjuk1                 'PRESIDENT': 2 pairs (P-S, D-E) either way; options
//                 UP_POLICE_CONSTABLE reason.alphabet_test  3–6, keyed 3 (the answer check's "R-T" pair does not
//                                                           exist). → option A reads "2", key A kept.
//
// References for the two history rows (read 13 Oct 2026):
//   Asaf Jah I — en.wikipedia.org/wiki/Asaf_Jah_I (Farrukhsiyar made him
//   viceroy of the Deccan with the title Nizam-ul-Mulk in 1713; grand wazir
//   under Muhammad Shah in 1722; beat Mubariz Khan in 1724) and
//   /wiki/Battle_of_Shakar_Kheda (11 Oct 1724, Muhammad Shah reigning).
//   Flora Fountain — /wiki/Samyukta_Maharashtra_Movement ("On 21 November
//   1955, demonstrators were fired upon by the police at Flora Fountain";
//   "106 people were shot by security forces during the period of agitation
//   and at different places"), /wiki/Hutatma_Chowk (fountain built 1864).
//
// The write, per row, in one transaction:
//   • the question's fields (stem, options, key, solution; validated + tag
//     "rejected" for a withdrawal) with metadata.bankFix (by, at, why, the
//     previous key / stem / options / solution), plus metadata.rekeyedBy /
//     rekeyedFrom on a re-key and rejectedBy / rejectedWhy on a withdrawal —
//     the conventions of scripts/tmp-datafix-sbi-q-fix-sep24.ts and
//     tmp-datafix-withdraw-nsejs-oct02.ts. A question is never deleted.
//   • its cached translations (QuestionTranslation) are removed: each one
//     translates the OLD stem / solution (the hi row of 'DOCUMENT' even
//     concludes "None" against key C; the mr row of the Flora question asks
//     for "a demand for police firing"). The next reader in that language
//     gets a fresh translation of the fixed row (the translate routes fill
//     a missing cache row); until then the question shows in English. These
//     cache rows are the ONLY delete, each one logged whole for the undo.
//     --keep-translations leaves them (the dry run says which stay stale).
//   Past attempts keep their stored grades (Attempt.answers.correct); the
//   solution's "Correction (13 Oct 2026)" line tells a past taker what
//   changed. Topic pages re-read within 10 minutes (ISR); the dry run prints
//   the URLs for IndexNow after the apply.
//
// Guards: dry run by default (prints every change, every new solution and a
// brute-force report of all letter-pair questions); --apply needs --only
// <group,…|all>; unknown flags are refused. Each row is found by its exact
// stem within its exam and topic — never by id alone — and must still have
// the options and key read on 13 Oct; a row missing, matched twice, held by
// another id or changed since is printed and skipped. Each plan re-runs its
// own check (the brute force, the coding rule) and is skipped if that fails.
// The undo log (status "pending") is on disk before the first write; every
// row is re-read inside the transaction and the run stops if anything changed
// since the plan.
//
// Undo: --apply writes data/fix-logs/fix-bank-items-10-2026.<only>.<time>.json
// with every row before and after and every removed translation; --undo
// <file> is a dry run of the undo; --undo <file> --apply puts the questions
// back and re-creates the removed translations (one already re-made in that
// language is kept, not overwritten).
//
// Not done here (reported in the dry run): letter-pair questions already out
// of every pool (validated false) with a wrong key or no correct option, and
// ones whose key depends on the counting convention.
//
// USAGE (from the repo root; .env.local is PRODUCTION):
//   npx tsx --env-file=.env.local scripts/fix-bank-items-10-2026.ts                          # dry run, all six
//   npx tsx --env-file=.env.local scripts/fix-bank-items-10-2026.ts --apply --only all       # or --only document,flora
//   npx tsx --env-file=.env.local scripts/fix-bank-items-10-2026.ts --apply --only all --keep-translations
//   npx tsx --env-file=.env.local scripts/fix-bank-items-10-2026.ts --undo data/fix-logs/<file>.json [--apply]
//
// Tests: tests/unit/fix-bank-items-10-2026.test.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Prisma } from "@prisma/client";
import { WITHDRAWN_TAG } from "../src/lib/question-withdrawn";

export const LOG_DIR = "data/fix-logs";
export const LOG_STEM = "fix-bank-items-10-2026";
export const TAG = "datafix:fix-bank-items-10-2026";
export const SITE = "https://shishya.in";
export const FIX_DAY = "13 Oct 2026";

export interface Option {
  key: string;
  text: string;
}

// ── Letter pairs, brute force (pure) ─────────────────────────────────────

export interface LetterPair {
  a: string;
  i: number; // 1-based position in the word
  b: string;
  j: number;
  /** Letters between them in the word. */
  wordBetween: number;
  /** Letters between them in the alphabet. */
  alphaBetween: number;
  direction: "forward" | "backward";
}

const alphaNo = (c: string) => c.charCodeAt(0) - 64;

/** Every pair of positions in `word` with as many letters between them in the
 *  word as in the alphabet. "forward": the later letter is also later in the
 *  alphabet (D…E); "backward": earlier (O…N). Repeated letters are separate
 *  positions, as the exams count them. */
export function letterPairs(word: string): { all: LetterPair[]; forward: LetterPair[]; backward: LetterPair[] } {
  const w = word.toUpperCase();
  const all: LetterPair[] = [];
  for (let i = 0; i < w.length; i++) {
    for (let j = i + 1; j < w.length; j++) {
      const d = alphaNo(w[j]) - alphaNo(w[i]);
      if (Math.abs(d) !== j - i) continue;
      all.push({ a: w[i], i: i + 1, b: w[j], j: j + 1, wordBetween: j - i - 1, alphaBetween: Math.abs(d) - 1, direction: d > 0 ? "forward" : "backward" });
    }
  }
  return { all, forward: all.filter((p) => p.direction === "forward"), backward: all.filter((p) => p.direction === "backward") };
}

/** The quoted word a letter-pair stem asks about ("…in the word 'DOCUMENT'…"). */
export function pairWordOf(body: string): string | null {
  const m = body.match(/\bword\s+['‘"]?([A-Z]{3,})['’"]?/);
  return m ? m[1] : null;
}

export type PairDirection = "both" | "forward" | "unspecified";
export function pairDirectionOf(body: string): PairDirection {
  if (/both\s+(?:the\s+)?forward\s+and\s+backward/i.test(body)) return "both";
  if (/forward\s+direction\s+only|only\s+in\s+the\s+forward|same\s+order/i.test(body)) return "forward";
  return "unspecified";
}

const NUMBER_WORDS: Record<string, number> = { none: 0, zero: 0, nil: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
/** What an option says the count is: an exact number, "more than n", or null (not a count). */
export function optionCount(text: string): { exact: number } | { moreThan: number } | null {
  const s = text.trim().toLowerCase();
  if (/^\d+$/.test(s)) return { exact: Number(s) };
  if (s in NUMBER_WORDS) return { exact: NUMBER_WORDS[s] };
  const m = s.match(/^more than (\w+)$/);
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
    return n === undefined ? null : { moreThan: n };
  }
  return null;
}
export function optionsMatching(options: readonly Option[], count: number): string[] {
  return options
    .filter((o) => {
      const c = optionCount(o.text);
      return c ? ("exact" in c ? c.exact === count : count > c.moreThan) : false;
    })
    .map((o) => o.key);
}

export type PairVerdictKind = "ok" | "wrong-key" | "no-option" | "two-options" | "convention" | "not-a-count";
export interface PairVerdict {
  word: string;
  direction: PairDirection;
  both: number;
  forwardOnly: number;
  kind: PairVerdictKind;
  /** The one option the count supports, when it is unambiguous. */
  correctKey: string | null;
  note: string;
}

/** The brute-force verdict on a stored letter-pair question. Unambiguous only
 *  when the stem names the direction, or both conventions pick the same
 *  options; otherwise "convention" (reported, never written). */
export function pairVerdict(q: { body: string; options: readonly Option[]; answerKey: string }): PairVerdict | null {
  const word = pairWordOf(q.body);
  if (!word) return null;
  const direction = pairDirectionOf(q.body);
  const p = letterPairs(word);
  const both = p.all.length;
  const forwardOnly = p.forward.length;
  const base = { word, direction, both, forwardOnly };
  if (q.options.some((o) => optionCount(o.text) === null)) return { ...base, kind: "not-a-count", correctKey: null, note: "an option is not a count" };
  const byBoth = optionsMatching(q.options, both);
  const byForward = optionsMatching(q.options, forwardOnly);
  let keys: string[];
  if (direction === "both") keys = byBoth;
  else if (direction === "forward") keys = byForward;
  else if (byBoth.join() === byForward.join()) keys = byBoth;
  else {
    const fits = [byBoth.includes(q.answerKey) ? "both-directions count" : "", byForward.includes(q.answerKey) ? "forward-only count" : ""].filter(Boolean).join(" and ");
    return { ...base, kind: "convention", correctKey: null, note: `direction not stated; both directions → ${byBoth.join("") || "no option"}, forward only → ${byForward.join("") || "no option"}; key ${q.answerKey} fits ${fits || "neither"}` };
  }
  if (keys.length === 0) return { ...base, kind: "no-option", correctKey: null, note: "no option matches the count" };
  if (keys.length > 1) return { ...base, kind: "two-options", correctKey: null, note: `options ${keys.join(", ")} all match` };
  return { ...base, kind: keys[0] === q.answerKey ? "ok" : "wrong-key", correctKey: keys[0], note: keys[0] === q.answerKey ? "key matches the count" : `count supports ${keys[0]}, key is ${q.answerKey}` };
}

const plural = (n: number, one: string, many: string = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A worked solution from the brute force: the letters numbered, the rule,
 *  every qualifying pair (or, when none qualifies, every pair checked), the
 *  answer and the correction line. */
export function pairSolution(word: string, direction: PairDirection, answer: Option, correction: string): string {
  const w = word.toUpperCase();
  const p = letterPairs(w);
  const lines: string[] = [];
  lines.push(`Answer: ${answer.key} (${answer.text}).`);
  lines.push("");
  lines.push(`Number the letters of ${w} and write each one's place in the alphabet: ${[...w].map((c, k) => `${c}(${k + 1})=${alphaNo(c)}`).join(", ")}.`);
  lines.push("");
  lines.push(
    "A pair counts when it has as many letters between it in the word as in the alphabet" +
      (direction === "forward" ? ", in the same order (forward)." : ", read in either direction: forward (like D…E) or backward (like O…N)."),
  );
  lines.push("");
  if (p.all.length === 0) {
    lines.push(`Check every pair (${(w.length * (w.length - 1)) / 2} of them), counting letters between in the word and in the alphabet:`);
    for (let i = 0; i < w.length - 1; i++) {
      const rest = [...w].slice(i + 1);
      const inWord = rest.map((_, k) => k);
      const inAlpha = rest.map((c) => Math.abs(alphaNo(c) - alphaNo(w[i])) - 1);
      lines.push(`- ${w[i]}(${i + 1}) with ${rest.join(", ")}: in the word ${inWord.join(", ")}; in the alphabet ${inAlpha.join(", ")}.`);
    }
    lines.push("No pair has the same number in both. So there is no such pair.");
  } else {
    lines.push(`Checking every pair, these ${plural(p.all.length, "pair")} qualify:`);
    for (const x of p.all) {
      lines.push(`- ${x.a}(${x.i}) and ${x.b}(${x.j}): ${plural(x.wordBetween, "letter")} between in the word, ${x.alphaBetween} in the alphabet (${x.direction}).`);
    }
    lines.push(`Every other pair has a different number of letters between in the word and in the alphabet. So there are ${p.all.length} such pairs.`);
    if (direction !== "forward" && p.forward.length !== p.all.length) {
      lines.push(`(Counting the forward direction only would give ${p.forward.length}.)`);
    } else if (direction === "unspecified") {
      lines.push("(Counting the forward direction only gives the same pairs.)");
    }
  }
  lines.push("");
  lines.push(`Correction (${FIX_DAY}): ${correction}`);
  return lines.join("\n");
}

// ── Letter + number coding (pure) ────────────────────────────────────────

/** The SBI PO rule: last letter of the word + its number of letters. */
export function lastLetterCode(word: string): string {
  return `${word.slice(-1).toUpperCase()}${word.length}`;
}
export interface CodedSentence {
  words: string[];
  codes: string[];
}
export function codedSentences(body: string): CodedSentence[] {
  return [...body.matchAll(/'([a-z][a-z ]*)' is coded as '([A-Z0-9 ]+)'/gi)].map((m) => ({ words: m[1].trim().split(/\s+/), codes: m[2].trim().split(/\s+/) }));
}
/** Every printed code that breaks the rule (codes are printed in word order). */
export function codingRuleBreaks(body: string): { word: string; printed: string; rule: string }[] {
  const out: { word: string; printed: string; rule: string }[] = [];
  for (const s of codedSentences(body)) {
    s.words.forEach((word, k) => {
      if (s.codes[k] !== lastLetterCode(word)) out.push({ word, printed: s.codes[k] ?? "(none)", rule: lastLetterCode(word) });
    });
  }
  return out;
}
/** The code the stem asks about ("What does 'N12' stand for"). */
export function askedCode(body: string): string | null {
  return body.match(/What does '([A-Z0-9]+)' stand for/)?.[1] ?? null;
}

// ── The six rows ─────────────────────────────────────────────────────────

export const GROUPS = ["document", "coding", "asafjah", "flora", "constitution", "president"] as const;
export type Group = (typeof GROUPS)[number];

export interface Target {
  group: Group;
  /** The row read on 13 Oct 2026 (printed; another id holding the stem is a problem). */
  id: string;
  exam: string;
  topic: string;
  /** Exact stem, options and key as read on 13 Oct 2026. */
  body: string;
  options: Option[];
  answerKey: string;
  action: "fix" | "withdraw";
  newBody?: string;
  newOptions?: Option[];
  newAnswerKey?: string;
  solution: string;
  why: string;
  /** The plan's own re-check: null when sound, else the reason to skip. */
  check: () => string | null;
}

const DOCUMENT_BODY =
  "How many such pairs of letters are there in the word 'DOCUMENT' each of which has as many letters between them in the word (in both forward and backward directions) as they have between them in the English alphabetical series?";
const DOCUMENT_OPTIONS: Option[] = [
  { key: "A", text: "None" },
  { key: "B", text: "One" },
  { key: "C", text: "Two" },
  { key: "D", text: "Three" },
];

const CODING_BODY =
  "In a certain code language, 'customer satisfaction drives growth' is coded as 'T8 N10 S6 H6', 'growth requires continuous effort' is coded as 'H6 S8 S10 T6', and 'effort brings customer loyalty' is coded as 'T6 S6 R8 Y7'. What does 'N10' stand for in that code language?";
const CODING_NEW_BODY =
  "In a certain code language, 'customer satisfaction drives growth' is coded as 'R8 N12 S6 H6', 'growth requires continuous effort' is coded as 'H6 S8 S10 T6', and 'effort brings customer loyalty' is coded as 'T6 S6 R8 Y7'. What does 'N12' stand for in that code language?";
const CODING_OPTIONS: Option[] = [
  { key: "A", text: "customer" },
  { key: "B", text: "satisfaction" },
  { key: "C", text: "drives" },
  { key: "D", text: "continuous" },
];
const CODING_SOLUTION = [
  "Answer: B (satisfaction).",
  "",
  "The rule: each word is coded as its LAST letter followed by the number of letters in it.",
  "- Sentence 2: growth → H6, requires → S8, continuous → S10, effort → T6 (H6 S8 S10 T6).",
  "- Sentence 3: effort → T6, brings → S6, customer → R8, loyalty → Y7 (T6 S6 R8 Y7).",
  "- Sentence 1: customer → R8, satisfaction → N12, drives → S6, growth → H6 (R8 N12 S6 H6).",
  "",
  "N12 is a 12-letter word ending in N: satisfaction.",
  "",
  "Check with the shared words: growth is in sentences 1 and 2, and H6 is the only code they share; effort is in sentences 2 and 3, and T6 is the only code they share. Sentences 1 and 3 share customer (R8) but also S6, because drives and brings both end in s and have 6 letters, so here the rule, not the shared codes alone, settles each word. N12 appears only in sentence 1, where satisfaction is the only word ending in N.",
  "",
  "Not A (customer = R8), not C (drives = S6), not D (continuous = S10, and it is not in sentence 1).",
  "",
  `Correction (${FIX_DAY}): until this date sentence 1 was printed as 'T8 N10 S6 H6' and the question asked for 'N10'. Those two codes broke the rule the other sentences follow (customer is R8 in sentence 3, and satisfaction has 12 letters, not 10), so they were corrected to R8 and N12. The answer, B, is unchanged.`,
].join("\n");

const ASAFJAH_BODY =
  "The Nizam-ul-Mulk Asaf Jah I founded the Asaf Jahi dynasty in 1724. He was originally a viceroy under which Mughal emperor before declaring independence?";
const ASAFJAH_OPTIONS: Option[] = [
  { key: "A", text: "Aurangzeb" },
  { key: "B", text: "Bahadur Shah I" },
  { key: "C", text: "Muhammad Shah" },
  { key: "D", text: "Farrukhsiyar" },
];
const ASAFJAH_SOLUTION = [
  `Keyed C (Muhammad Shah), but the question can be read two ways, so it was withdrawn from practice on ${FIX_DAY}.`,
  "",
  "The facts:",
  "- Mir Qamar-ud-din Khan (Chin Qilich Khan) was first made viceroy (subahdar) of the Deccan in 1713 by Emperor Farrukhsiyar, who gave him the title Nizam-ul-Mulk.",
  "- Muhammad Shah became emperor in 1719. Under him the Nizam won back control of the Deccan in 1720 and was the empire's wazir (prime minister) from 1722.",
  "- In 1724 he returned to the Deccan and defeated Mubariz Khan at Shakar Kheda. That victory is taken as the founding of the Asaf Jahi state of Hyderabad. Muhammad Shah then recognised him as viceroy of the Deccan and gave him the title Asaf Jah.",
  "",
  "Why it is ambiguous: \"originally a viceroy under\" points to Farrukhsiyar (D), who first appointed him in 1713; \"before declaring independence\" points to Muhammad Shah (C), the emperor he served and broke away from in 1724.",
  "",
  "To remember: first appointed by Farrukhsiyar (1713); founded the dynasty under Muhammad Shah (1724). Aurangzeb died in 1707 and Bahadur Shah I in 1712, so A and B are wrong either way.",
  "",
  `Correction (${FIX_DAY}): the earlier solution said Muhammad Shah appointed him viceroy of the Deccan in 1713. Muhammad Shah reigned from 1719; the 1713 appointment was Farrukhsiyar's.`,
].join("\n");

const FLORA_BODY =
  "The Flora Fountain incident (also called Hutatma Chowk incident) of 1956 was a significant event in the Samyukta Maharashtra Movement. What was the primary cause of this incident?";
const FLORA_NEW_BODY =
  "The police firing on protesters at Flora Fountain in Bombay (the square now called Hutatma Chowk) was a significant event in the Samyukta Maharashtra Movement. What was the primary cause of this incident?";
const FLORA_OPTIONS: Option[] = [
  { key: "A", text: "Protest against land acquisition policies" },
  { key: "B", text: "Demand for a separate Marathi-speaking state and police firing on protesters" },
  { key: "C", text: "Opposition to the merger of princely states" },
  { key: "D", text: "Workers' strike for better wages" },
];
const FLORA_SOLUTION = [
  "Answer: B.",
  "",
  "On 21 November 1955, police opened fire on a march of the Samyukta Maharashtra movement at Flora Fountain in Bombay. The marchers were demanding a separate Marathi-speaking state of Maharashtra that included Bombay, against the proposal to keep Bombay city out of it. In January 1956, after the Centre announced that Bombay city would be centrally administered, there were more protests and more police firing across the city.",
  "",
  "In all, 106 people were killed in police firing during the agitation; the movement honours them as its martyrs (hutatme). That total covers the whole agitation, not one day. The square at Flora Fountain (the fountain itself was built in 1864) was renamed Hutatma Chowk, Martyrs' Square, in their memory, and Maharashtra was formed on 1 May 1960 with Bombay as its capital.",
  "",
  "Why not the others: the protest was about the linguistic state, not land acquisition (A), the merger of princely states (C) or wages (D).",
  "",
  `Correction (${FIX_DAY}): the earlier version called it the incident "of 1956" and said it happened on 16 January 1956 with over 100 people killed in that firing. The Flora Fountain firing was on 21 November 1955; 106 is the total for the whole agitation.`,
].join("\n");

const CONSTITUTION_BODY =
  "How many such pairs of letters are there in the word 'CONSTITUTION' which have as many letters between them in the word (both forward and backward) as they have between them in the English alphabet?";
const CONSTITUTION_OPTIONS: Option[] = [
  { key: "A", text: "Two" },
  { key: "B", text: "Three" },
  { key: "C", text: "Four" },
  { key: "D", text: "Five" },
];
const CONSTITUTION_NEW_OPTIONS: Option[] = [...CONSTITUTION_OPTIONS.slice(0, 3), { key: "D", text: "More than five" }];

const PRESIDENT_BODY = "How many pairs of letters are there in the word 'PRESIDENT' which have as many letters between them in the word as in the English alphabet?";
const PRESIDENT_OPTIONS: Option[] = [
  { key: "A", text: "3" },
  { key: "B", text: "4" },
  { key: "C", text: "5" },
  { key: "D", text: "6" },
];
const PRESIDENT_NEW_OPTIONS: Option[] = [{ key: "A", text: "2" }, ...PRESIDENT_OPTIONS.slice(1)];

/** After-state check for a letter-pair row: the brute force must give exactly the planned key. */
function pairCheck(body: string, options: readonly Option[], answerKey: string): string | null {
  const v = pairVerdict({ body, options, answerKey });
  if (!v) return "no word found in the stem";
  return v.kind === "ok" ? null : `after the fix the brute force says ${v.kind} (${v.note})`;
}

export const TARGETS: readonly Target[] = [
  {
    group: "document",
    id: "cmp09eg1m02fvwf3zi8j7ebpg",
    exam: "IBPS_CLERK",
    topic: "reason.alphabet_test",
    body: DOCUMENT_BODY,
    options: DOCUMENT_OPTIONS,
    answerKey: "C",
    action: "fix",
    newAnswerKey: "A",
    solution: pairSolution(
      "DOCUMENT",
      "both",
      { key: "A", text: "None" },
      `this question was keyed C (Two) until this date, and its old solution named C-E and M-N, which its own working had shown do not qualify. No pair qualifies, so the answer is A (None). If you chose A before ${FIX_DAY}, your answer was right.`,
    ),
    why: "All 28 pairs of DOCUMENT checked: none has as many letters between it in the word as in the alphabet, either direction. Keyed C (Two); the right answer is A (None).",
    check: () => pairCheck(DOCUMENT_BODY, DOCUMENT_OPTIONS, "A"),
  },
  {
    group: "coding",
    id: "cmp01irog00z9tefluqzo6472",
    exam: "SBI_PO",
    topic: "reason.coding_decoding",
    body: CODING_BODY,
    options: CODING_OPTIONS,
    answerKey: "B",
    action: "fix",
    newBody: CODING_NEW_BODY,
    solution: CODING_SOLUTION,
    why: "Sentence 1's codes T8 and N10 break the last-letter + length rule the other sentences follow (customer = R8, satisfaction = N12); by elimination N10 could be satisfaction or drives. Codes corrected to R8 N12 and the question asks for N12; key B unchanged.",
    check: () => {
      const breaks = codingRuleBreaks(CODING_NEW_BODY);
      if (breaks.length) return `the new stem still breaks the rule: ${breaks.map((b) => `${b.word} ${b.printed}≠${b.rule}`).join(", ")}`;
      const asked = askedCode(CODING_NEW_BODY);
      const holders = codedSentences(CODING_NEW_BODY).flatMap((s) => s.words.filter((w, k) => s.codes[k] === asked));
      if (new Set(holders).size !== 1 || holders[0] !== "satisfaction") return `the asked code ${asked} is held by ${[...new Set(holders)].join(", ") || "no word"}`;
      return null;
    },
  },
  {
    group: "asafjah",
    id: "cmusm3nbn002p4rfzgrfdws5u",
    exam: "TS_POLICE_PC",
    topic: "ts.state.history",
    body: ASAFJAH_BODY,
    options: ASAFJAH_OPTIONS,
    answerKey: "C",
    action: "withdraw",
    solution: ASAFJAH_SOLUTION,
    why: "Ambiguous: \"originally a viceroy under\" is Farrukhsiyar (1713), the key Muhammad Shah fits only \"before declaring independence\" (1724); the old solution's \"appointed by Muhammad Shah in 1713\" is false (he reigned from 1719).",
    check: () => null,
  },
  {
    group: "flora",
    id: "cmp1cj3m703npwsoxo5rh5gf1",
    exam: "MH_MPSC_GROUP_C",
    topic: "mh.unification",
    body: FLORA_BODY,
    options: FLORA_OPTIONS,
    answerKey: "B",
    action: "fix",
    newBody: FLORA_NEW_BODY,
    solution: FLORA_SOLUTION,
    why: "The Flora Fountain firing was on 21 Nov 1955, not in 1956 / on 16 Jan 1956; 106 is the toll of the whole agitation, not of that firing. Year taken out of the stem; key B unchanged.",
    check: () => null,
  },
  {
    group: "constitution",
    id: "cmp035161000nwf3zurs62qpi",
    exam: "SBI_PO",
    topic: "reason.alphabet_test",
    body: CONSTITUTION_BODY,
    options: CONSTITUTION_OPTIONS,
    answerKey: "D",
    action: "fix",
    newOptions: CONSTITUTION_NEW_OPTIONS,
    solution: pairSolution(
      "CONSTITUTION",
      "both",
      { key: "D", text: "More than five" },
      "option D used to read \"Five\", which counts only the pairs of letters standing side by side. Pairs further apart also qualify (C and N, O and T, O and U, N and T), so D now reads \"More than five\". The answer is D either way.",
    ),
    why: "Both directions: 9 pairs (6 forward only); no option was right (Two–Five, keyed Five = side-by-side pairs only). Option D now reads \"More than five\", true under either convention.",
    check: () => pairCheck(CONSTITUTION_BODY, CONSTITUTION_NEW_OPTIONS, "D"),
  },
  {
    group: "president",
    id: "cmozyhvfe000bteflzwfjjuk1",
    exam: "UP_POLICE_CONSTABLE",
    topic: "reason.alphabet_test",
    body: PRESIDENT_BODY,
    options: PRESIDENT_OPTIONS,
    answerKey: "A",
    action: "fix",
    newOptions: PRESIDENT_NEW_OPTIONS,
    solution: pairSolution(
      "PRESIDENT",
      "unspecified",
      { key: "A", text: "2" },
      "option A used to read 3, and the old solution counted a third pair it did not name (an R-T pair does not qualify: R and T have 6 letters between them in the word but 1 in the alphabet). The count is 2 in either direction, so option A now reads 2.",
    ),
    why: "Only P-S and D-E qualify (either direction): 2. Options were 3–6, keyed 3. Option A now reads 2.",
    check: () => pairCheck(PRESIDENT_BODY, PRESIDENT_NEW_OPTIONS, "A"),
  },
];

// ── Rows, fields, selection ──────────────────────────────────────────────

export interface Row {
  id: string;
  body: string;
  options: unknown;
  answerKey: string;
  solution: string;
  validated: boolean;
  tags: string[];
  metadata: unknown;
  exam: { code: string };
  topic: { code: string };
}
export const ROW_SELECT = {
  id: true,
  body: true,
  options: true,
  answerKey: true,
  solution: true,
  validated: true,
  tags: true,
  metadata: true,
  exam: { select: { code: true } },
  topic: { select: { code: true } },
} as const;

export interface Fields {
  body: string;
  options: unknown;
  answerKey: string;
  solution: string;
  validated: boolean;
  tags: string[];
  metadata: unknown;
}
export const fieldsOf = (r: Pick<Row, keyof Fields>): Fields => ({
  body: r.body,
  options: r.options,
  answerKey: r.answerKey,
  solution: r.solution,
  validated: r.validated,
  tags: [...(r.tags ?? [])],
  metadata: r.metadata ?? null,
});

/** JSON with object keys sorted, so a jsonb round trip (which reorders keys)
 *  does not read as a change. */
export function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]])) : x,
  );
}
export const sameFields = (a: Fields, b: Fields) => canonical(a) === canonical(b);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export interface TargetPick {
  target: Target;
  row: Row;
}

/** One row per target, or a problem line: missing, already fixed, matched
 *  twice, held by another id, changed since the 13 Oct read, or failing its
 *  own re-check — printed and skipped, never guessed. `rows` are the rows
 *  whose stem equals a target's old or new stem. */
export function selectTargets(rows: readonly Row[], groups: readonly Group[]): { picks: TargetPick[]; problems: string[] } {
  const picks: TargetPick[] = [];
  const problems: string[] = [];
  for (const t of TARGETS.filter((x) => groups.includes(x.group))) {
    const inPlace = (r: Row) => r.exam.code === t.exam && r.topic.code === t.topic;
    const found = rows.filter((r) => inPlace(r) && r.body === t.body);
    const say = (s: string) => problems.push(`${t.group}: ${s} — skipped`);
    if (found.length === 0) {
      const fixed = t.newBody ? rows.filter((r) => inPlace(r) && r.body === t.newBody) : [];
      say(fixed.length ? `the new stem is already in place (${fixed.map((r) => r.id).join(", ")}): already fixed?` : `no ${t.exam} ${t.topic} row with the stem read on 13 Oct (missing or edited)`);
      continue;
    }
    if (found.length > 1) {
      say(`${found.length} rows match the stem (${found.map((r) => r.id).join(", ")}), never guessed`);
      continue;
    }
    const r = found[0];
    if (r.id !== t.id) {
      say(`the stem is held by ${r.id}, not ${t.id} as read on 13 Oct`);
      continue;
    }
    if (canonical(r.options) !== canonical(t.options) || r.answerKey !== t.answerKey) {
      say(`options or key changed since the 13 Oct read (key ${r.answerKey}, options ${JSON.stringify(r.options)})`);
      continue;
    }
    if (t.action === "withdraw" && (!r.validated || (r.tags ?? []).includes(WITHDRAWN_TAG))) {
      say(`already out of the pools (validated ${r.validated}, tags ${JSON.stringify(r.tags)})`);
      continue;
    }
    if (r.solution === t.solution) {
      say("the new solution is already in place: already fixed?");
      continue;
    }
    const bad = t.check();
    if (bad) {
      say(`its own re-check failed: ${bad}`);
      continue;
    }
    picks.push({ target: t, row: r });
  }
  return { picks, problems };
}

// ── Translations (the cache this script clears) ──────────────────────────

export interface TrRow {
  id: string;
  questionId: string;
  locale: string;
  body: string;
  options: unknown;
  solution: string;
  hints: unknown;
  generator: string | null;
  createdAt: string;
}
export const TR_SELECT = { id: true, questionId: true, locale: true, body: true, options: true, solution: true, hints: true, generator: true, createdAt: true } as const;
export const trOf = (r: Omit<TrRow, "createdAt"> & { createdAt: Date | string }): TrRow => ({
  id: r.id,
  questionId: r.questionId,
  locale: r.locale,
  body: r.body,
  options: r.options,
  solution: r.solution,
  hints: r.hints ?? null,
  generator: r.generator ?? null,
  createdAt: new Date(r.createdAt).toISOString(),
});
export const sameTr = (a: TrRow, b: TrRow) => canonical(a) === canonical(b);

// ── Plan ─────────────────────────────────────────────────────────────────

export interface Planned {
  group: Group;
  questionId: string;
  exam: string;
  topic: string;
  action: Target["action"];
  before: Fields;
  after: Fields;
  /** Cached translations removed with the fix (whole rows, for the undo). */
  translations: TrRow[];
  why: string;
}

export function afterFields(t: Target, before: Fields, now: Date): Fields {
  const meta: Record<string, unknown> = isObj(before.metadata) ? { ...before.metadata } : {};
  const bankFix: Record<string, unknown> = { by: TAG, at: now.toISOString(), group: t.group, why: t.why, prevAnswerKey: before.answerKey, prevSolution: before.solution };
  if (t.newBody) bankFix.prevBody = before.body;
  if (t.newOptions) bankFix.prevOptions = before.options;
  meta.bankFix = bankFix;
  if (t.newAnswerKey && t.newAnswerKey !== before.answerKey) {
    meta.rekeyedBy = TAG;
    meta.rekeyedFrom = before.answerKey;
  }
  const after: Fields = {
    ...before,
    body: t.newBody ?? before.body,
    options: t.newOptions ?? before.options,
    answerKey: t.newAnswerKey ?? before.answerKey,
    solution: t.solution,
    metadata: meta,
  };
  if (t.action === "withdraw") {
    after.validated = false;
    after.tags = before.tags.includes(WITHDRAWN_TAG) ? [...before.tags] : [...before.tags, WITHDRAWN_TAG];
    meta.rejectedBy = TAG;
    meta.rejectedWhy = t.why;
  }
  return after;
}

export function plan(picks: readonly TargetPick[], translations: ReadonlyMap<string, TrRow[]>, now: Date, keepTranslations: boolean): Planned[] {
  return picks.map(({ target, row }) => {
    const before = fieldsOf(row);
    return {
      group: target.group,
      questionId: row.id,
      exam: target.exam,
      topic: target.topic,
      action: target.action,
      before,
      after: afterFields(target, before, now),
      translations: keepTranslations ? [] : [...(translations.get(row.id) ?? [])],
      why: target.why,
    };
  });
}

/** Topic pages that can print these questions (ISR 10 min), for IndexNow after the apply. */
export function indexNowUrls(planned: readonly Pick<Planned, "exam" | "topic">[]): string[] {
  const out = new Set<string>();
  for (const p of planned) {
    out.add(`${SITE}/exams/${p.exam}/topics/${p.topic}`);
    out.add(`${SITE}/hi/exams/${p.exam}/topics/${p.topic}`);
  }
  return [...out];
}

// ── CLI ──────────────────────────────────────────────────────────────────

export interface Cli {
  apply: boolean;
  groups: Group[];
  only: string;
  undoFile: string | null;
  log: string | null;
  keepTranslations: boolean;
}

/** Parse argv (without node and the script). Refuses unknown flags, a flag
 *  without its value, an unknown group, and --apply without --only. */
export function parseCli(argv: readonly string[]): Cli {
  const known = new Set(["--apply", "--only", "--undo", "--log", "--keep-translations"]);
  const takesValue = new Set(["--only", "--undo", "--log"]);
  const values: Record<string, string> = {};
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!known.has(a)) throw new Error(`unknown argument ${JSON.stringify(a)} — allowed: ${[...known].join(" ")}`);
    if (takesValue.has(a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      values[a] = v;
      i++;
    } else flags.add(a);
  }
  const apply = flags.has("--apply");
  const keepTranslations = flags.has("--keep-translations");
  const undoFile = values["--undo"] ?? null;
  if (undoFile) {
    if (values["--only"] || keepTranslations) throw new Error("--undo takes the log file only (the log says which rows it changed)");
    return { apply, groups: [], only: "all", undoFile, log: null, keepTranslations: false };
  }
  const raw = values["--only"] ?? (apply ? "" : "all");
  if (!raw) throw new Error(`--apply needs --only all | ${GROUPS.join(",")} (say which rows)`);
  const groups = raw === "all" ? [...GROUPS] : raw.split(",").map((s) => s.trim());
  for (const g of groups) if (!(GROUPS as readonly string[]).includes(g)) throw new Error(`unknown group ${JSON.stringify(g)} — groups: ${GROUPS.join(", ")} (or all)`);
  return { apply, groups: groups as Group[], only: raw, undoFile: null, log: values["--log"] ?? null, keepTranslations };
}

// ── Write ────────────────────────────────────────────────────────────────

export interface LogEntry {
  group: Group;
  questionId: string;
  exam: string;
  topic: string;
  before: Fields;
  after: Fields;
  translations: TrRow[];
  why: string;
}
export interface LogFile {
  script: string;
  kind: "apply" | "undo";
  startedAt: string;
  status: "pending" | "applied" | "failed";
  only: string;
  undoOf?: string;
  entries: LogEntry[];
  error?: string;
}

/** The part of the Prisma client this script uses. The only delete is on
 *  the translation cache; a question is only ever updated. */
export interface TxDb {
  question: {
    findUnique(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
  questionTranslation: {
    findUnique(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    delete(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
  };
}
export interface Db {
  question: TxDb["question"] & { findMany(args: unknown): Promise<unknown[]> };
  questionTranslation: TxDb["questionTranslation"] & { findMany(args: unknown): Promise<unknown[]> };
  mock: { findMany(args: unknown): Promise<unknown[]> };
  $transaction<T>(fn: (tx: TxDb) => Promise<T>, opts?: { timeout?: number }): Promise<T>;
}

/** Prisma writes a JSON null as Prisma.DbNull, never as plain null. */
const jsonOrDbNull = (v: unknown) => (v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue));
export const updateData = (f: Fields) => ({
  body: f.body,
  options: f.options as Prisma.InputJsonValue,
  answerKey: f.answerKey,
  solution: f.solution,
  validated: f.validated,
  tags: { set: f.tags },
  metadata: jsonOrDbNull(f.metadata),
});
const readQuestion = async (db: TxDb, id: string) => (await db.question.findUnique({ where: { id }, select: ROW_SELECT })) as Row | null;
const readTr = async (db: TxDb, id: string) => {
  const r = (await db.questionTranslation.findUnique({ where: { id }, select: TR_SELECT })) as (Omit<TrRow, "createdAt"> & { createdAt: Date | string }) | null;
  return r ? trOf(r) : null;
};

export function writeLog(path: string, log: LogFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(log, null, 1));
}

/** Writes the plan in one transaction. The log (status "pending") is on disk
 *  before the first write; a write error or a row changed since the plan
 *  marks it "failed" and rethrows (nothing is written). */
export async function applyPlanned(db: Db, planned: readonly Planned[], logPath: string, only: string, say: (s: string) => void = console.log) {
  const entries: LogEntry[] = planned.map((p) => ({ group: p.group, questionId: p.questionId, exam: p.exam, topic: p.topic, before: p.before, after: p.after, translations: p.translations, why: p.why }));
  const log: LogFile = { script: LOG_STEM, kind: "apply", startedAt: new Date().toISOString(), status: "pending", only, entries };
  writeLog(logPath, log); // before any write: if this throws, nothing is written
  try {
    await db.$transaction(
      async (tx) => {
        for (const p of planned) {
          const now = await readQuestion(tx, p.questionId);
          if (!now || !sameFields(fieldsOf(now), p.before)) throw new Error(`question ${p.questionId} [${p.group}] changed since the plan — nothing written; re-run the dry run`);
          await tx.question.update({ where: { id: p.questionId }, data: updateData(p.after) });
          for (const t of p.translations) {
            const cur = await readTr(tx, t.id);
            if (!cur || !sameTr(cur, t)) throw new Error(`translation ${t.id} (${t.locale}) of ${p.questionId} changed since the plan — nothing written; re-run the dry run`);
            await tx.questionTranslation.delete({ where: { id: t.id } });
          }
        }
      },
      { timeout: 60_000 },
    );
    log.status = "applied";
  } catch (e) {
    log.status = "failed";
    log.error = (e as Error).message;
  }
  try {
    writeLog(logPath, log);
  } catch (e) {
    say(`Could not write the log (${(e as Error).message}); here it is:\n${JSON.stringify(log, null, 1)}`);
  }
  if (log.status === "failed") throw new Error(log.error);
  say(`\nAPPLIED ${entries.length} question fix(es), ${entries.reduce((n, e) => n + e.translations.length, 0)} cached translation(s) removed. Undo log: ${logPath}`);
  say(`Undo: npx tsx --env-file=.env.local scripts/${LOG_STEM}.ts --undo ${logPath.replace(/\\/g, "/")} --apply`);
}

/** Puts an applied log back: each question to its `before` (only if it still
 *  holds `after`), each removed translation re-created (unless one was made
 *  again in that language since). Dry run unless `apply`; the undo writes
 *  its own log first. */
export async function undo(db: Db, file: string, apply: boolean, logDir: string = LOG_DIR, say: (s: string) => void = console.log): Promise<{ restored: number; recreated: number; problems: string[] }> {
  const log = JSON.parse(readFileSync(file, "utf8")) as LogFile;
  // "pending": the run stopped between its commit and the log's last write.
  // Safe to undo — each row is restored only if it still holds `after`.
  if (log.script !== LOG_STEM || log.kind !== "apply" || (log.status !== "applied" && log.status !== "pending")) throw new Error(`${file} is not an applied log of ${LOG_STEM}`);
  say(`UNDO of ${file} (${log.entries.length} entries, ${log.status} ${log.startedAt}). ${apply ? "APPLY" : "DRY RUN"}\n`);
  if (log.status === "pending") say("  (the log says pending: the run may have stopped after its commit; only rows that still hold the logged change are restored)\n");
  const steps: { entry: LogEntry; current: Fields; recreate: TrRow[] }[] = [];
  const problems: string[] = [];
  for (const e of [...log.entries].reverse()) {
    const r = await readQuestion(db, e.questionId);
    if (!r) {
      problems.push(`${e.questionId} [${e.group}]: question not found — skipped`);
      continue;
    }
    const current = fieldsOf(r);
    if (!sameFields(current, e.after)) {
      problems.push(`${e.questionId} [${e.group}]: changed since this script wrote it — skipped, check by hand`);
      continue;
    }
    const recreate: TrRow[] = [];
    for (const t of e.translations) {
      const again = await db.questionTranslation.findFirst({ where: { questionId: t.questionId, locale: t.locale }, select: { id: true } });
      if (again) problems.push(`${e.questionId} [${e.group}] ${t.locale}: translated again since the fix — the new translation is kept`);
      else recreate.push(t);
    }
    steps.push({ entry: e, current, recreate });
  }
  for (const s of steps) {
    say(`  RESTORE ${s.entry.exam} ${s.entry.questionId} [${s.entry.group}]`);
    for (const k of Object.keys(s.current) as (keyof Fields)[]) {
      if (canonical(s.current[k]) !== canonical(s.entry.before[k])) say(`      ${k}: ${short(s.current[k])} → ${short(s.entry.before[k])}`);
    }
    for (const t of s.recreate) say(`      re-create translation ${t.locale} (${t.id})`);
  }
  for (const p of problems) say(`  ! ${p}`);
  if (!apply) {
    say("\nDry run — re-run with --apply to write.");
    return { restored: 0, recreated: 0, problems };
  }
  const logPath = join(logDir, `${LOG_STEM}.undo.${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const undoLog: LogFile = {
    script: LOG_STEM,
    kind: "undo",
    startedAt: new Date().toISOString(),
    status: "pending",
    only: log.only,
    undoOf: file,
    entries: steps.map((s) => ({ ...s.entry, before: s.current, after: s.entry.before, translations: s.recreate, why: `undo of ${file}` })),
  };
  writeLog(logPath, undoLog);
  try {
    await db.$transaction(
      async (tx) => {
        for (const s of steps) {
          const r = await readQuestion(tx, s.entry.questionId);
          if (!r || !sameFields(fieldsOf(r), s.current)) throw new Error(`question ${s.entry.questionId} changed during the undo — nothing written`);
          await tx.question.update({ where: { id: s.entry.questionId }, data: updateData(s.entry.before) });
          for (const t of s.recreate) {
            await tx.questionTranslation.create({
              data: {
                id: t.id,
                questionId: t.questionId,
                locale: t.locale,
                body: t.body,
                options: t.options as Prisma.InputJsonValue,
                solution: t.solution,
                hints: jsonOrDbNull(t.hints),
                generator: t.generator,
                createdAt: new Date(t.createdAt),
              },
            });
          }
        }
      },
      { timeout: 60_000 },
    );
    undoLog.status = "applied";
  } catch (e) {
    undoLog.status = "failed";
    undoLog.error = (e as Error).message;
  }
  writeLog(logPath, undoLog);
  if (undoLog.status === "failed") throw new Error(undoLog.error);
  const recreated = steps.reduce((n, s) => n + s.recreate.length, 0);
  say(`\nUNDONE ${steps.length} question(s), ${recreated} translation(s) re-created. Log: ${logPath}`);
  return { restored: steps.length, recreated, problems };
}

// ── Run ──────────────────────────────────────────────────────────────────

function short(v: unknown, max = 160): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  const one = (s ?? "null").replace(/\s+/g, " ");
  return JSON.stringify(one.length > max ? `${one.slice(0, max)}…` : one);
}

interface MockUse {
  id: string;
  title: string;
  userId: string | null;
  questionIds: string[];
  _count: { attempts: number };
}

/** The bank's letter-pair questions and the brute force's verdict on each
 *  (printed only; the targets above are the rows it writes). */
export async function pairReport(db: Db, say: (s: string) => void): Promise<Record<string, number>> {
  const rows = (await db.question.findMany({
    where: { AND: [{ body: { contains: "pair", mode: "insensitive" } }, { OR: [{ body: { contains: "alphabet", mode: "insensitive" } }, { body: { contains: "between them", mode: "insensitive" } }] }] },
    select: { id: true, body: true, options: true, answerKey: true, validated: true, tags: true, exam: { select: { code: true } } },
    orderBy: { id: "asc" },
  })) as { id: string; body: string; options: unknown; answerKey: string; validated: boolean; tags: string[]; exam: { code: string } }[];
  const tally: Record<string, number> = {};
  say(`\nLETTER-PAIR QUESTIONS IN THE BANK, brute force (${rows.length} rows whose stem names pairs and the alphabet):`);
  for (const r of rows) {
    const options = Array.isArray(r.options) ? (r.options as Option[]) : [];
    const v = pairVerdict({ body: r.body, options, answerKey: r.answerKey });
    if (!v) continue;
    const served = r.validated && !(r.tags ?? []).includes(WITHDRAWN_TAG);
    const target = TARGETS.find((t) => t.id === r.id);
    // A stem that does not name the direction is read both ways by the
    // exams' usual convention; a key that fits that count is left as it is.
    const usual = v.kind === "convention" && optionsMatching(options, v.both).includes(r.answerKey);
    const bucket = `${usual ? "ok (usual both-directions count)" : v.kind}${served ? "" : " (not served)"}`;
    tally[bucket] = (tally[bucket] ?? 0) + 1;
    const fate = target ? `→ group ${target.group}` : v.kind === "ok" || usual ? "" : served ? "→ NOT in this script (read it by hand)" : "→ not served; left";
    say(`  ${v.kind.padEnd(11)} ${served ? "served    " : "not served"} ${r.exam.code.padEnd(20)} ${v.word.padEnd(13)} ${v.direction.padEnd(11)} both ${String(v.both).padStart(2)} fwd ${String(v.forwardOnly).padStart(2)} key ${r.answerKey} ${r.id} ${v.kind === "ok" ? "" : v.note} ${fate}`);
  }
  say(`  tally: ${Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
  return tally;
}

export interface RunOpts {
  now?: Date;
  say?: (s: string) => void;
  logDir?: string;
}

export async function run(argv: readonly string[], db: Db, opts: RunOpts = {}): Promise<{ planned: Planned[]; problems: string[]; applied: boolean }> {
  const cli = parseCli(argv);
  const say = opts.say ?? console.log;
  const logDir = opts.logDir ?? LOG_DIR;
  if (cli.undoFile) {
    if (!existsSync(cli.undoFile)) throw new Error(`no such log: ${cli.undoFile}`);
    await undo(db, cli.undoFile, cli.apply, logDir, say);
    return { planned: [], problems: [], applied: cli.apply };
  }
  const now = opts.now ?? new Date();
  const targets = TARGETS.filter((t) => cli.groups.includes(t.group));
  const bodies = [...new Set(targets.flatMap((t) => [t.body, ...(t.newBody ? [t.newBody] : [])]))];
  const rows = (await db.question.findMany({ where: { body: { in: bodies } }, select: ROW_SELECT, orderBy: { id: "asc" } })) as Row[];
  const { picks, problems } = selectTargets(rows, cli.groups);
  const trByQ = new Map<string, TrRow[]>();
  for (const p of picks) {
    const trs = (await db.questionTranslation.findMany({ where: { questionId: p.row.id }, select: TR_SELECT, orderBy: { locale: "asc" } })) as (Omit<TrRow, "createdAt"> & { createdAt: Date | string })[];
    trByQ.set(p.row.id, trs.map(trOf));
  }
  const planned = plan(picks, trByQ, now, cli.keepTranslations);

  say(`Bank fixes (13 Oct 2026 tutor audit, fault 6) — groups: ${cli.only}. ${cli.apply ? "APPLY" : "DRY RUN (nothing is written)"}${cli.keepTranslations ? " — translations kept" : ""}`);
  say(`Planned ${planned.length}; problems ${problems.length}.\n`);
  for (const p of planned) {
    const t = TARGETS.find((x) => x.group === p.group)!;
    const mocks = (await db.mock.findMany({ where: { questionIds: { has: p.questionId } }, select: { id: true, title: true, userId: true, questionIds: true, _count: { select: { attempts: true } } } })) as MockUse[];
    const sys = mocks.filter((m) => m.userId === null);
    say(`── [${p.group}] ${p.action === "withdraw" ? "WITHDRAW + REWRITE SOLUTION" : "FIX"} ${p.exam} ${p.topic} ${p.questionId}`);
    say(`   why: ${p.why}`);
    for (const k of ["body", "options", "answerKey", "validated", "tags"] as const) {
      if (canonical(p.before[k]) !== canonical(p.after[k])) say(`   ${k}: ${short(p.before[k], 400)}\n      → ${short(p.after[k], 400)}`);
    }
    say(`   metadata adds: ${Object.keys(p.after.metadata as object).filter((k) => !isObj(p.before.metadata) || !(k in p.before.metadata)).join(", ")}`);
    say(`   solution (old): ${short(p.before.solution, 300)}`);
    say(`   solution (new):\n${t.solution.split("\n").map((l) => `      | ${l}`).join("\n")}`);
    say(`   used in: ${sys.length} system mock(s)${sys.length ? ` (${sys.map((m) => `"${m.title}" slot ${m.questionIds.indexOf(p.questionId) + 1}, ${m._count.attempts} attempt(s)`).join("; ")})` : ""}, ${mocks.length - sys.length} personal mock(s)`);
    if (p.action === "withdraw" && sys.length) say(`   ! withdrawn: these system papers serve one question fewer until scripts/tmp-datafix-sysmock-unvalidated-sep25.ts refills the slot (hand-checked replacement).`);
    const trs = trByQ.get(p.questionId) ?? [];
    if (!trs.length) say("   translations: none cached");
    else if (cli.keepTranslations) say(`   translations KEPT (stale — they translate the old text): ${trs.map((x) => `${x.locale} (${x.generator ?? "?"}, ${x.createdAt.slice(0, 10)})`).join(", ")}`);
    else say(`   translations removed (re-translated from the fixed row on the next read): ${trs.map((x) => `${x.locale} ${x.id} (${x.generator ?? "?"}, ${x.createdAt.slice(0, 10)})`).join(", ")}`);
    say("");
  }
  for (const p of problems) say(`  ! ${p}`);

  await pairReport(db, say);

  say(`\nINDEXNOW after the apply (topic pages that can print these questions; ${indexNowUrls(planned).length} URLs):`);
  for (const u of indexNowUrls(planned)) say(`  ${u}`);
  say("");

  if (!cli.apply) {
    say(`Dry run — nothing written. Write with --apply --only all (or a comma list of: ${GROUPS.join(", ")}); add --keep-translations to leave the cached translations.`);
    return { planned, problems, applied: false };
  }
  if (planned.length === 0) {
    say("Nothing to write.");
    return { planned, problems, applied: false };
  }
  const logPath = cli.log ?? join(logDir, `${LOG_STEM}.${cli.only.replace(/[^a-z,]/g, "").replace(/,/g, "+")}.${now.toISOString().replace(/[:.]/g, "-")}.json`);
  await applyPlanned(db, planned, logPath, cli.only, say);
  return { planned, problems, applied: true };
}

async function main() {
  const { prisma } = await import("../src/lib/db/prisma");
  try {
    await run(process.argv.slice(2), prisma as unknown as Db);
  } finally {
    await prisma.$disconnect();
  }
}

if (/fix-bank-items-10-2026\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
