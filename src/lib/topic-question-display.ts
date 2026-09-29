// Which practice questions a topic page prints in full, and in what order
// (29 Sep 2026).
//
// Why: a person who searches "percentage questions for SSC CGL with
// solutions" landed on a page that showed five question stems cut to three
// lines, with no options and no answers. The page now prints up to ten
// questions whole: stem, every option, the answer and the worked solution.
// Printing a question in full makes any fault in it public, so only
// questions that pass every rule below are shown; the quiz keeps its own
// (wider) picker.
//
// Rules (the page standard of 29 Sep 2026, section 5):
//   1. Checked: the answer check's own record says ACCEPT, all three solves
//      agreed, the examiner's confidence is 0.9 or more, and the key was not
//      changed by the check (a changed key can leave the old working in the
//      solution). Not tagged rejected. One correct option.
//   2. Whole: 2–6 options, each with text and its own letter; the key is one
//      of them; the solution shows working (not just a letter).
//   3. The stem agrees with itself: a stem that says "five words are
//      suggested" carries five options; a letter code "CAT is coded as DBU"
//      keeps one shift (a shift broken at exactly one letter is a typo in the
//      stem, and the question cannot be solved as printed).
//   4. No twins: the same stem twice shows once; the same stem with new
//      numbers shows at most twice; and at most two questions of one kind
//      (the row's first tag), so ten questions are not one question ten
//      times.
//   5. Order: one of each kind first, then easy to hard, fixed by id so the
//      page reads the same on every visit. No more than three in a row with
//      the same correct letter — by moving questions, never options.
//
// Pure: no React, no DB. tests/unit/topic-question-display.test.ts pins it.

export interface QuestionOption {
  key: string;
  text: string;
}

export interface QuestionRow {
  id: string;
  type: string;
  difficulty: string;
  body: string;
  options: unknown;
  answerKey: string;
  solution: string;
  tags: string[];
  validatedBy: string | null;
  metadata: unknown;
}

export interface ShownQuestion {
  id: string;
  difficulty: string;
  body: string;
  options: QuestionOption[];
  answerKey: string;
  solution: string;
}

export const MAX_SHOWN_QUESTIONS = 10;
const MIN_CONFIDENCE = 0.9;
const MIN_SOLUTION_CHARS = 40;
const MAX_SAME_LETTER_RUN = 3;
const MAX_SAME_KIND_WITH_NEW_NUMBERS = 2;

export function readOptions(raw: unknown): QuestionOption[] | null {
  if (!Array.isArray(raw)) return null;
  const out: QuestionOption[] = [];
  for (const o of raw) {
    if (!o || typeof o !== "object") return null;
    const key = String((o as { key?: unknown }).key ?? "").trim();
    const text = String((o as { text?: unknown }).text ?? "").trim();
    if (!key || !text) return null;
    out.push({ key, text });
  }
  if (out.length < 2 || out.length > 6) return null;
  if (new Set(out.map((o) => o.key)).size !== out.length) return null;
  return out;
}

/** The answer check's record on the row says the stored key stands. */
export function passedAnswerCheck(q: Pick<QuestionRow, "validatedBy" | "metadata">): boolean {
  if (!q.validatedBy || !q.validatedBy.startsWith("factory:")) return false;
  const v = (q.metadata as { factoryVerify?: Record<string, unknown> } | null)?.factoryVerify;
  if (!v || typeof v !== "object") return false;
  if (v.decision !== "ACCEPT") return false;
  if (v.keyCorrected === true) return false;
  if (Number(v.agreement) !== 1) return false;
  return Number(v.confidence) >= MIN_CONFIDENCE;
}

const NUMBER_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };

/** "five words are suggested", "out of the four alternatives" — the count the stem promises, if it names one. */
export function promisedOptionCount(body: string): number | null {
  const m = /\b(two|three|four|five|six|[2-6])\s+(?:words|options|alternatives|choices|responses)\b/i.exec(body);
  if (!m) return null;
  const w = m[1].toLowerCase();
  return NUMBER_WORDS[w] ?? Number(w);
}

/**
 * A letter code in the stem ("CAT is coded as DBU") whose shift is the same
 * for every letter but one. A steady shift broken at exactly one place is a
 * typo; a code with a changing shift (+1, +2, +3) or no steady shift is a
 * different kind of question and is left alone.
 */
export function hasBrokenLetterShift(body: string): boolean {
  const re = /\b([A-Z]{4,})\b[^.?!]{0,40}?\b(?:coded|written)\s+as\s+['"“]?([A-Z]{4,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const [, word, code] = m;
    if (word.length !== code.length) continue;
    const shifts = [...word].map((c, i) => (code.charCodeAt(i) - c.charCodeAt(0) + 26) % 26);
    const count = new Map<number, number>();
    for (const s of shifts) count.set(s, (count.get(s) ?? 0) + 1);
    if (count.size !== 2) continue;
    const [a, b] = [...count.values()].sort((x, y) => y - x);
    if (b === 1 && a >= 3) return true;
  }
  return false;
}

export function isShowable(q: QuestionRow): boolean {
  if (q.type !== "MCQ") return false;
  if (q.tags.includes("rejected")) return false;
  if (!passedAnswerCheck(q)) return false;
  const options = readOptions(q.options);
  if (!options) return false;
  const key = q.answerKey.trim();
  if (!options.some((o) => o.key === key)) return false;
  if (!q.body.trim()) return false;
  const solution = q.solution.trim();
  if (solution.length < MIN_SOLUTION_CHARS) return false;
  const promised = promisedOptionCount(q.body);
  if (promised !== null && promised !== options.length) return false;
  if (hasBrokenLetterShift(q.body)) return false;
  return true;
}

/** The stem without currency marks, punctuation and case. */
export function stemKey(body: string): string {
  return body
    .toLowerCase()
    .replace(/(?:₹|rs\.?|inr)\s*/g, "")
    .replace(/(\d),(?=\d)/g, "$1")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
/** The same, with every number replaced: two stems that differ only in their numbers share this key. */
export function kindKey(body: string): string {
  return stemKey(body).replace(/\d+(?:\s\d+)*/g, "#");
}

const STOP_WORDS = new Set(["the", "a", "an", "of", "on", "at", "for", "is", "in", "to", "and", "or", "by", "it", "its", "be", "are", "was", "will", "with", "as", "that", "this", "what", "which", "how", "find"]);
/** The words of a stem, without its numbers and small words. */
export function kindWords(body: string): Set<string> {
  return new Set(kindKey(body).split(" ").filter((w) => w.length > 1 && w !== "#" && !STOP_WORDS.has(w)));
}
/** Two stems are one kind of question when 60% of their words are shared — the same question in other words. */
export function sameKind(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared) >= 0.6;
}

const DIFFICULTY_ORDER: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };

/** Up to ten questions a topic page prints in full, in the order it prints them. */
export function pickShownQuestions(rows: readonly QuestionRow[], max: number = MAX_SHOWN_QUESTIONS): ShownQuestion[] {
  const ok = rows.filter(isShowable).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Twins: one of an identical stem, at most two of a stem that differs only in its numbers.
  const seenStem = new Set<string>();
  const kindCount = new Map<string, number>();
  const tagCount = new Map<string, number>();
  const groups: { words: Set<string>; n: number }[] = [];
  const unique: QuestionRow[] = [];
  for (const q of ok) {
    const s = stemKey(q.body);
    if (seenStem.has(s)) continue;
    const k = kindKey(q.body);
    const n = kindCount.get(k) ?? 0;
    if (n >= MAX_SAME_KIND_WITH_NEW_NUMBERS) continue;
    const tag = q.tags[0] ?? null;
    const tn = tag === null ? 0 : (tagCount.get(tag) ?? 0);
    if (tn >= MAX_SAME_KIND_WITH_NEW_NUMBERS) continue;
    // The same question in other words ("on a certain sum" / "on a sum of money").
    const words = kindWords(q.body);
    const group = groups.find((g) => sameKind(g.words, words));
    if (group && group.n >= MAX_SAME_KIND_WITH_NEW_NUMBERS) continue;
    if (group) group.n++;
    else groups.push({ words, n: 1 });
    seenStem.add(s);
    kindCount.set(k, n + 1);
    if (tag !== null) tagCount.set(tag, tn + 1);
    unique.push(q);
  }

  // One of each kind first (a row's first tag names its kind), then the rest; each part easy to hard, then by id.
  const byLevel = (a: QuestionRow, b: QuestionRow) =>
    (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const sorted = [...unique].sort(byLevel);
  const firstOfKind: QuestionRow[] = [];
  const rest: QuestionRow[] = [];
  const kinds = new Set<string>();
  for (const q of sorted) {
    const kind = q.tags[0] ?? kindKey(q.body);
    if (kinds.has(kind)) rest.push(q);
    else {
      kinds.add(kind);
      firstOfKind.push(q);
    }
  }
  const ordered = [...firstOfKind, ...rest].slice(0, max);

  // No more than three in a row with the same correct letter: pull the next question with another letter forward.
  const out: QuestionRow[] = [];
  const pool = [...ordered];
  while (pool.length) {
    const run = out.slice(-MAX_SAME_LETTER_RUN);
    const blocked = run.length === MAX_SAME_LETTER_RUN && run.every((q) => q.answerKey.trim() === run[0].answerKey.trim()) ? run[0].answerKey.trim() : null;
    const i = blocked === null ? 0 : pool.findIndex((q) => q.answerKey.trim() !== blocked);
    out.push(pool.splice(i === -1 ? 0 : i, 1)[0]);
  }

  return out.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    body: q.body.trim(),
    options: readOptions(q.options)!,
    answerKey: q.answerKey.trim(),
    solution: q.solution.trim(),
  }));
}
