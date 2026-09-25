// How many questions a custom mock can really hold, and a title that never
// claims more (25 Sep 2026).
//
// The September read: 232 of 370 builder mocks came back short for 84 of
// 123 builder students (they asked for 9,860 questions and got 6,316). A
// topic is listed once it holds 3 validated questions (median per topic:
// SBI Clerk 9, IBPS Clerk 9, APPSC G2 4, UKSSSC 2), so students chose 25 or
// 50 from topics that could never fill them, and nothing said so before the
// build. A free-text mock titled "25Q" held 3 questions.
//
// This file is the arithmetic both sides share:
//   - the build-mock page / BuilderForm shows "N questions available" for
//     the selected topics AT the chosen difficulty, greys out sizes that
//     cannot be filled, and offers "All N" instead;
//   - /api/mocks/custom and /api/mocks title the mock from the questions
//     actually picked and say plainly when fewer were available;
//   - the free-text path hands the model the questions of the topics the
//     student named first (rankByInstruction).
//
// Pure: no prisma / server imports — BuilderForm (client) and vitest import
// it.

/** The builder's size choices. */
export const BUILDER_SIZES = [10, 25, 50] as const;
export type BuilderSize = (typeof BUILDER_SIZES)[number];

/** Below this many questions /api/mocks/custom refuses to build (422). */
export const MIN_MOCK_QUESTIONS = 5;
/** The builder's largest set. */
export const MAX_BUILDER_QUESTIONS = 50;

export type BuilderDifficulty = "MIXED" | "EASY" | "HARD";

/** Validated questions per difficulty (one topic, or a sum). */
export interface DiffCounts {
  EASY: number;
  MEDIUM: number;
  HARD: number;
}

export const ZERO_COUNTS: Readonly<DiffCounts> = Object.freeze({ EASY: 0, MEDIUM: 0, HARD: 0 });

export function sumCounts(list: readonly DiffCounts[]): DiffCounts {
  const out: DiffCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const c of list) {
    out.EASY += c.EASY;
    out.MEDIUM += c.MEDIUM;
    out.HARD += c.HARD;
  }
  return out;
}

export interface Availability {
  /** Questions a set at this difficulty can draw from. */
  total: number;
  /** Of those, at the chosen level itself (all of them for MIXED). */
  strict: number;
  /** MEDIUM questions the set may also draw on (EASY / HARD only). The
   *  number of the pool, not of how many a set uses — see levelMix. */
  fallback: number;
}

/** The pool /api/mocks/custom draws from, as a number: MIXED = every
 *  difficulty; EASY / HARD = that level first, then MEDIUM when it runs out
 *  (the API's strict + fallback tiers). Never more than it can pick. */
export function availableFor(c: DiffCounts, difficulty: BuilderDifficulty): Availability {
  if (difficulty === "MIXED") {
    const total = c.EASY + c.MEDIUM + c.HARD;
    return { total, strict: total, fallback: 0 };
  }
  const strict = difficulty === "EASY" ? c.EASY : c.HARD;
  return { total: strict + c.MEDIUM, strict, fallback: c.MEDIUM };
}

// 25 Sep 2026: the builder's Easy / Hard note first said "4 hard questions
// first, then 35 medium ones" — 35 was every MEDIUM question in the
// selection, not the number the set uses, and "hard first" is not the API's
// order: /api/mocks/custom takes every question the student has NOT
// answered (never-shown chosen level, never-shown MEDIUM, then shown-but-
// unanswered of both) before any answered one, so a student who answered
// the 4 hard questions gets 25 medium. The page cannot see which questions
// were only shown, nor the per-topic even split, so the note states bounds
// that always hold: at most `maxStrict` at the chosen level, at least
// `minMedium` MEDIUM.

/** What an EASY / HARD set can hold at the chosen level. */
export interface LevelMix {
  /** Questions the set holds. */
  size: number;
  /** Chosen-level questions in the selection. */
  strictTotal: number;
  /** Of those, answered by the student in the window (0 when not measured). */
  strictAnswered: number;
  /** The most chosen-level questions the set can hold. */
  maxStrict: number;
  /** The fewest MEDIUM questions it will hold (size − maxStrict). */
  minMedium: number;
  /** True when answered chosen-level questions lower maxStrict: unanswered
   *  MEDIUM questions are picked before them. */
  answeredFirst: boolean;
}

/** Bounds on an EASY / HARD set of `size`, or null when it will hold no
 *  MEDIUM question for certain (or MIXED, where there is no fallback).
 *  `answered` = the student's answered counts in the selection per
 *  difficulty, null when not measured (anonymous, or the query failed) —
 *  the bounds then use the bank alone and still hold. */
export function levelMix(
  c: DiffCounts,
  answered: DiffCounts | null,
  difficulty: BuilderDifficulty,
  size: number,
): LevelMix | null {
  if (difficulty === "MIXED") return null;
  const { strict, fallback } = availableFor(c, difficulty);
  const n = Math.max(0, Math.min(size, strict + fallback));
  const aS = answered ? Math.max(0, Math.min(strict, difficulty === "EASY" ? answered.EASY : answered.HARD)) : 0;
  const aM = answered ? Math.max(0, Math.min(fallback, answered.MEDIUM)) : 0;
  const uS = strict - aS;
  const uM = fallback - aM;
  // An answered question enters only once every unanswered one (both
  // levels) is in; answered chosen-level ones go before answered MEDIUM.
  const answeredSlots = Math.max(0, n - uS - uM);
  const maxStrict = Math.min(n, uS + Math.min(aS, answeredSlots));
  const minMedium = n - maxStrict;
  if (minMedium <= 0) return null;
  return {
    size: n,
    strictTotal: strict,
    strictAnswered: aS,
    maxStrict,
    minMedium,
    answeredFirst: maxStrict < Math.min(n, strict),
  };
}

/** Which Easy / Hard note the builder shows for a LevelMix. */
export type LevelNote = "short" | "none" | "answered" | "answeredNone";

export function levelNote(m: LevelMix): LevelNote {
  if (m.answeredFirst) return m.maxStrict === 0 ? "answeredNone" : "answered";
  return m.maxStrict === 0 ? "none" : "short";
}

/** A size chip: one of BUILDER_SIZES, or "all" (= every available question,
 *  offered when the selection holds fewer than the largest size). */
export type SizePick = BuilderSize | "all";

/** The number of questions the set will really hold for a pick. */
export function effectiveSize(pick: SizePick, available: number): number {
  const want = pick === "all" ? MAX_BUILDER_QUESTIONS : pick;
  return Math.max(0, Math.min(want, available));
}

export interface SizeChoice {
  pick: SizePick;
  /** Questions this chip builds. */
  size: number;
  /** False when the selection cannot fill it (the chip is greyed out). */
  fits: boolean;
}

/** The size chips for a selection: 10 / 25 / 50, each marked whether it
 *  fits, plus "All N" when 5 <= N < 50 and N is not already a chip. */
export function sizeChoices(available: number): SizeChoice[] {
  const out: SizeChoice[] = BUILDER_SIZES.map((s) => ({ pick: s, size: s, fits: s <= available }));
  const sizes: readonly number[] = BUILDER_SIZES;
  if (available >= MIN_MOCK_QUESTIONS && available < MAX_BUILDER_QUESTIONS && !sizes.includes(available)) {
    out.push({ pick: "all", size: available, fits: true });
  }
  return out;
}

/** The largest builder size the selection fills, or null. */
export function largestFittingSize(available: number): BuilderSize | null {
  let best: BuilderSize | null = null;
  for (const s of BUILDER_SIZES) if (s <= available) best = s;
  return best;
}

/** "1 question" / "18 questions". */
export function questionsLabel(n: number): string {
  return `${n} ${n === 1 ? "question" : "questions"}`;
}

// A question-count claim inside a title: "25Q", "(25 Qs)", "25-question",
// "25 Questions", "10 MCQs", "25 प्रश्न", "25 सवाल", "25 ప్రశ్నలు". 1-3 digits
// so a year ("2024 questions") is left alone.
const COUNT_CLAIM_LATIN = /[([]?\s*\b\d{1,3}\s*[-–—]?\s*(?:questions?|ques|qs?|mcqs?)(?![a-z])\.?\s*[)\]]?/gi;
const COUNT_CLAIM_INDIC = /[([]?\s*\b\d{1,3}\s*[-–—]?\s*(?:प्रश्नों|प्रश्न|सवालों|सवाल|ప్రశ్నలు|ప్రశ్న)\s*[)\]]?/gu;
const EDGE_SEPARATORS = /^[\s\-–—·:|,]+|[\s\-–—·:|,]+$/g;

/** A title with every question-count claim removed (the model-written
 *  free-text titles carried "25Q" over a 3-question set). */
export function stripCountClaims(title: string): string {
  return title
    .replace(COUNT_CLAIM_LATIN, " ")
    .replace(COUNT_CLAIM_INDIC, " ")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.:;)\]])/g, "$1")
    .replace(EDGE_SEPARATORS, "")
    .trim();
}

/** The title a mock is stored with: any count claim removed, then the
 *  number it really holds — "SBI Clerk — Custom: Arithmetic · 18 questions".
 *  `fallback` is used when nothing is left after stripping. */
export function titleWithCount(title: string, count: number, fallback = "Custom mock"): string {
  const base = stripCountClaims(title) || fallback;
  return `${base} · ${questionsLabel(count)}`;
}

/** The plain sentence for a set that came back smaller than asked, or null
 *  when it did not. Real numbers only. */
export function shortfallLine(requested: number, got: number, scope = "these topics"): string | null {
  if (!(got < requested)) return null;
  return `Only ${questionsLabel(got)} ${got === 1 ? "was" : "were"} available for ${scope}, so this mock has ${got}, not ${requested}.`;
}

/** The tutor's warmup size (src/lib/ai/adaptive-quiz.ts asks for
 *  min(10, topic bank)). */
export const TUTOR_WARMUP_SIZE = 10;

/** The chat tutor's warmup reply, with one plain sentence added when the
 *  warmup holds fewer than TUTOR_WARMUP_SIZE questions. Unchanged
 *  otherwise. */
export function warmupReplyWithSize(message: string, count: number, topic: string): string {
  if (count >= TUTOR_WARMUP_SIZE) return message;
  return `${message}\n\nThis warmup has ${questionsLabel(count)}, not ${TUTOR_WARMUP_SIZE}: only ${count} could be drawn on ${topic} right now.`;
}

// ── Free-text requests ───────────────────────────────────────────────────
// The model that reads a free-text request ("Percentage ka mock test") sees
// at most 120 candidates (src/lib/ai/generator.ts), taken in pool order. A
// student whose topic's questions sat past the first 120 got a 3-question
// set. rankByInstruction moves the questions of the topics the request
// names to the front — it never drops or adds a question.

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "about", "some", "all", "any", "only",
  "mock", "mocks", "test", "tests", "question", "questions", "quiz", "paper", "papers",
  "give", "make", "create", "want", "need", "please", "practice", "practise",
  "topic", "topics", "wise", "based", "level", "difficulty", "hard", "easy", "medium",
  "mcq", "mcqs", "pyq", "pyqs", "exam", "set", "sets", "mujhe", "chahiye", "karo",
]);

function words(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  // "percent" ~ "percentage", "ratios" ~ "ratio": a shared stem of 4+.
  return Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a));
}

/** How many distinct request words a topic's name/code matches. */
export function instructionScore(instruction: string, topicText: string): number {
  const want = [...new Set(words(instruction))];
  const have = words(topicText);
  let n = 0;
  for (const w of want) if (have.some((h) => wordsMatch(w, h))) n++;
  return n;
}

/** Stable re-order: questions of the topics the request names first (most
 *  matched words first), everything else after in its original order.
 *  `topicText(topicCode)` returns the topic's name (and anything else to
 *  match on); the code itself is always matched too. */
export function rankByInstruction<T extends { topicCode: string }>(
  pool: readonly T[],
  instruction: string,
  topicText: (topicCode: string) => string,
): T[] {
  const scores = new Map<string, number>();
  const scoreOf = (code: string) => {
    let s = scores.get(code);
    if (s === undefined) {
      s = instructionScore(instruction, `${topicText(code)} ${code.replace(/[._-]+/g, " ")}`);
      scores.set(code, s);
    }
    return s;
  };
  const indexed = pool.map((q, i) => ({ q, i, s: scoreOf(q.topicCode) }));
  if (!indexed.some((x) => x.s > 0)) return [...pool];
  indexed.sort((a, b) => b.s - a.s || a.i - b.i);
  return indexed.map((x) => x.q);
}
