// School content — reply parsers and the copy heuristic (26 Sep 2026).
//
// Pure: what scripts/school-content-batch.ts does with a model reply before
// anything is persisted.
//
//   parseSchoolNotes   — a Phase N reply → validated markdown or a list of
//                        reasons. Checks, in order: word count within the
//                        class bounds; every required heading present in
//                        order (content-prompts.ts NOTES_HEADINGS); no link
//                        other than the official chapter PDF; no copy
//                        suspect (below); the official link section is
//                        normalised to exactly our link line (appended when
//                        the model left it out — the URL is ours, not the
//                        model's, so this is normalisation, not repair).
//   parseSchoolMcqSet  — a Phase G reply → CandidateQuestion[] in the
//                        factory's shape (coerceCandidate), each screened by
//                        candidateSuspects; then the difficulty mix and the
//                        count. strictMix (attempt 1) requires the exact
//                        4/4/2; attempt 2 accepts any mix of ≥ MIN_VALID so a
//                        one-off label does not cost the whole set twice.
//   copySuspects       — the "does this look copied from the textbook"
//                        heuristic. It cannot compare against the book (we
//                        never hold its text); it catches the SHAPE of a
//                        copy: references to the book's numbered apparatus
//                        ("Exercise 1.1", "Fig. 3.2", "Activity 4.5",
//                        "Example 2.3", "Table 1.2", "see page 42"), wording
//                        that points at the book ("in the textbook", "the
//                        book says", "NCERT exercise"), and any quotation of
//                        12 or more words (our notes quote nothing — the
//                        prompts forbid quotation marks). A hit rejects the
//                        reply (notes) or drops the question; the runner
//                        feeds the reasons into the one retry's prompt.
//   candidateSuspects  — copySuspects + the honest-label patterns for one
//                        question (body, options, solution).
//   dedupeCandidates   — near-duplicate stems within a chapter (the four
//                        sets of a chapter run in parallel) and against the
//                        chapter's existing questions.

import { extractText, parseJson } from "../ai/client";
import { coerceCandidate } from "../ai/factory/generator";
import type { CandidateQuestion } from "../ai/factory/types";
import type { Difficulty } from "../ai/types";
import { type DifficultyMix, MCQ_SET_MIX, NOTES_HEADINGS, NOTES_OPTIONAL_HEADINGS, OFFICIAL_LINK_PREFIX, type SchoolChapter, classPersona } from "./content-prompts";
import type Anthropic from "@anthropic-ai/sdk";

// ── Copy heuristic ──────────────────────────────────────────────────────

/**
 * Textbook apparatus and pointers. Each entry: the pattern and what it catches
 * (documented for the review).
 *
 * 26 Sep 2026 (review): every pattern needs the TEXTBOOK'S shape, not a word
 * that school word problems use all the time. NCERT numbers its figures,
 * activities, examples and tables "n.n" (Fig. 3.2, Activity 4.5), so the
 * integer forms "Figure 1" / "Activity 1" — which our own notes may use for
 * their own examples — no longer count. A page pointer is "see page 42",
 * "(page 42)", "p. 42" / "pp. 12-14", not "read up to page 40" or "reads 20
 * pages from the book" (a Class 6 staple). A pointer at the book needs the
 * textbook named (textbook / NCERT book / this book / the chapter PDF), not a
 * bare "book", which is what the word problems say.
 */
export const COPY_PATTERNS: ReadonlyArray<{ re: RegExp; why: string }> = [
  { re: /\b(?:Exercise|Exercises|Ex\.)\s*\d+(?:\.\d+)?\b/i, why: "exercise reference (Exercise 1.1)" },
  { re: /\bFig(?:ure|\.)\s*\d+\.\d+\b/i, why: "figure reference (Fig. 3.2)" },
  { re: /\bActivity\s*\d+\.\d+\b/i, why: "activity reference (Activity 4.5)" },
  { re: /\bExample\s*\d+\.\d+\b/i, why: "textbook-numbered example (Example 2.3)" },
  { re: /\bTable\s*\d+\.\d+\b/i, why: "textbook-numbered table (Table 1.2)" },
  { re: /(?:\b(?:see|refer to|turn to|given on|shown on|explained on|discussed on|found on)\s+|\(\s*)(?:page|pg\.?)\s*\d+\b|\bpp?\.\s*\d+\b/i, why: "page reference (see page 42)" },
  {
    re: /\b(?:in|from|see|refer to|as (?:given|shown|stated|explained|described|defined) in|according to)\s+(?:(?:the\s+|your\s+)?(?:text\s?book|NCERT (?:text\s?book|book|text)|chapter PDF)|this book)\b/i,
    why: "points at the textbook",
  },
  { re: /\bthe (?:text\s?book|book|chapter PDF) (?:says|states|gives|defines|mentions|shows|explains)\b/i, why: "quotes the textbook indirectly" },
  { re: /\bNCERT\s+(?:exercise|question|example|activity|text|solution)s?\b/i, why: "NCERT apparatus" },
  { re: /\bQ(?:uestion)?\.?\s*\d+\s*(?:\([a-z]\))?\s*(?:of|in|from)\s+(?:the\s+)?(?:exercise|text\s?book|book|chapter)\b/i, why: "exercise question reference" },
];

/** A quotation of QUOTE_WORDS or more words: our notes quote nothing (the prompts say so), so this is the shape of a lifted sentence. */
export const QUOTE_WORDS = 12;
/**
 * One quotation: an opening quote at a word boundary (start of line, after
 * whitespace or a bracket), no line break inside, and a closing quote followed
 * by the end, whitespace or punctuation. 26 Sep 2026 (review): the earlier
 * form started a match at ANY quote character — including the closing quote
 * of a short "term" — and let the span cross lines, so the text BETWEEN two
 * ordinary one-word quotations was reported as a lifted quotation.
 */
const QUOTED = /(?:^|[\s(\[])["“„]([^"“”„\n]+?)["”](?=$|[\s.,;:!?)\]])/gm;

/** Every copy-suspect snippet in `text` (empty = clean). */
export function copySuspects(text: string): string[] {
  const out: string[] = [];
  for (const { re, why } of COPY_PATTERNS) {
    const m = re.exec(text);
    if (m) out.push(`${why}: "${m[0].trim().slice(0, 60)}"`);
  }
  for (const m of text.matchAll(QUOTED)) {
    const words = m[1].split(/\s+/).filter(Boolean).length;
    if (words >= QUOTE_WORDS) out.push(`quotation of ${words} words: "${m[1].slice(0, 60)}…"`);
  }
  return out;
}

/**
 * Wording that would mislabel an AI question (founder rule 4).
 * 26 Sep 2026 (review): a label names a SOURCE — NCERT, the textbook, a board,
 * CBSE/ICSE, a previous year — not the word "examination": "In an examination
 * paper of 30 questions, Arjun answered 24" is a Class 6 percentage problem,
 * not a claim of provenance. Likewise "marks given in the examination" is
 * not "appeared in the 2019 examination".
 */
export const HONEST_LABEL_PATTERNS: ReadonlyArray<{ re: RegExp; why: string }> = [
  { re: /\b(?:NCERT|text\s?book|board|CBSE|ICSE|previous[- ]year|PYQ)\s+(?:exercise|question|paper|problem)s?\b/i, why: "labels the question as a book/board question" },
  { re: /\b(?:asked|appeared|came)\s+in\s+(?:the\s+|a\s+|an\s+)?(?:\d{4}|board|CBSE|ICSE|exam|examination|previous)/i, why: "claims an exam appearance" },
  { re: /\bthis question (?:is|was) (?:from|taken|adapted)\b/i, why: "claims a source" },
];

/** Copy suspects + honest-label suspects across a candidate's text (empty = clean). */
export function candidateSuspects(c: CandidateQuestion): string[] {
  const text = [c.body, ...c.options.map((o) => o.text), c.solution].join("\n");
  const out = copySuspects(text);
  for (const { re, why } of HONEST_LABEL_PATTERNS) {
    const m = re.exec(text);
    if (m) out.push(`${why}: "${m[0].slice(0, 60)}"`);
  }
  return out;
}

// ── Notes ───────────────────────────────────────────────────────────────

export interface NotesCheck {
  ok: boolean;
  /** The markdown to store (normalised: fences stripped, link line present) — meaningful only when ok. */
  content: string;
  words: number;
  reasons: string[];
}

/** Slack around the persona's word range: a class-6 note may run a little short, a class-10 one a little long. */
export const NOTES_WORDS_SLACK = 0.35;

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const URL_RE = /https?:\/\/[^\s)>\]]+/g;

/** Index of heading `h` at a line start at or after `from`, or -1. */
function findHeading(content: string, h: string, from: number): number {
  let i = content.indexOf(h, from);
  while (i >= 0) {
    if (i === 0 || content[i - 1] === "\n") return i;
    i = content.indexOf(h, i + 1);
  }
  return -1;
}

function stripFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i.exec(t);
  return m ? m[1].trim() : t;
}

export function parseSchoolNotes(text: string, ch: SchoolChapter): NotesCheck {
  const reasons: string[] = [];
  let content = stripFence(text);
  const words = countWords(content);
  const [lo, hi] = classPersona(ch.cls).notesWords;
  const min = Math.round(lo * (1 - NOTES_WORDS_SLACK));
  const max = Math.round(hi * (1 + NOTES_WORDS_SLACK));
  if (words < min) reasons.push(`too short: ${words} words (min ${min})`);
  if (words > max) reasons.push(`too long: ${words} words (max ${max})`);

  // headings, each at a line start, in order
  let cursor = 0;
  for (const h of NOTES_HEADINGS) {
    const pos = findHeading(content, h, cursor);
    if (pos < 0) {
      if (!NOTES_OPTIONAL_HEADINGS.has(h)) reasons.push(`missing or out-of-order heading: ${h}`);
      continue;
    }
    cursor = pos + h.length;
  }

  // links: only the official chapter PDF
  const urls = [...content.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;:]+$/, ""));
  const foreign = [...new Set(urls.filter((u) => u !== ch.officialUrl))];
  if (foreign.length) reasons.push(`link other than the official chapter PDF: ${foreign.slice(0, 2).join(", ")}`);

  for (const s of copySuspects(content)) reasons.push(`copy suspect — ${s}`);

  // The link section is ours (fixed heading, one fixed line), so normalise
  // rather than reject: whatever the model put under the last heading — the
  // exact line, a markdown link "[book](url)", a sentence around it — becomes
  // exactly the link line (26 Sep 2026 review: the markdown-link form used to
  // get a second copy of the URL appended). A missing section is appended.
  const linkLine = `${OFFICIAL_LINK_PREFIX}${ch.officialUrl}`;
  const heading = NOTES_HEADINGS[NOTES_HEADINGS.length - 1];
  const at = findHeading(content, heading, 0);
  content = at < 0 ? `${content.trimEnd()}\n\n${heading}\n${linkLine}` : `${content.slice(0, at + heading.length).trimEnd()}\n${linkLine}`;
  return { ok: reasons.length === 0, content, words, reasons };
}

// ── MCQ sets ────────────────────────────────────────────────────────────

export interface McqSetCheck {
  ok: boolean;
  candidates: CandidateQuestion[];
  /** Candidates dropped and why (shape, copy suspect, label). */
  dropped: Array<{ index: number; reason: string }>;
  mix: DifficultyMix;
  reasons: string[];
}

/** Attempt 2 keeps a set with at least this many clean questions, whatever the mix. */
export const MCQ_MIN_VALID = 6;

export function difficultyMix(cs: ReadonlyArray<{ difficulty: Difficulty }>): DifficultyMix {
  const mix: DifficultyMix = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const c of cs) mix[c.difficulty] += 1;
  return mix;
}

export function sameMix(a: DifficultyMix, b: DifficultyMix): boolean {
  return a.EASY === b.EASY && a.MEDIUM === b.MEDIUM && a.HARD === b.HARD;
}

export function parseSchoolMcqSet(
  text: string,
  opts: { expectedMix?: DifficultyMix; strictMix: boolean; minValid?: number } = { strictMix: true },
): McqSetCheck {
  const expected = opts.expectedMix ?? MCQ_SET_MIX;
  const minValid = opts.minValid ?? MCQ_MIN_VALID;
  const reasons: string[] = [];
  let parsed: unknown;
  try {
    parsed = parseJson<unknown>(text);
  } catch (e) {
    return { ok: false, candidates: [], dropped: [], mix: { EASY: 0, MEDIUM: 0, HARD: 0 }, reasons: [String((e as Error)?.message ?? e).split("\n")[0].slice(0, 160)] };
  }
  if (!Array.isArray(parsed)) return { ok: false, candidates: [], dropped: [], mix: { EASY: 0, MEDIUM: 0, HARD: 0 }, reasons: ["not a JSON array"] };

  const candidates: CandidateQuestion[] = [];
  const dropped: McqSetCheck["dropped"] = [];
  parsed.forEach((raw, index) => {
    const c = coerceCandidate(raw);
    if (!c) {
      dropped.push({ index, reason: "shape" });
      return;
    }
    const suspects = candidateSuspects(c);
    if (suspects.length) {
      dropped.push({ index, reason: suspects[0] });
      return;
    }
    candidates.push(c);
  });

  const want = expected.EASY + expected.MEDIUM + expected.HARD;
  const mix = difficultyMix(candidates);
  if (parsed.length !== want) reasons.push(`expected ${want} questions, got ${parsed.length}`);
  if (dropped.length) reasons.push(`${dropped.length} dropped (${dropped.map((d) => d.reason.split(":")[0]).join(", ")})`);
  if (opts.strictMix) {
    if (!sameMix(mix, expected)) reasons.push(`difficulty mix ${mix.EASY}/${mix.MEDIUM}/${mix.HARD} ≠ ${expected.EASY}/${expected.MEDIUM}/${expected.HARD}`);
    return { ok: reasons.length === 0 && candidates.length === want, candidates, dropped, mix, reasons };
  }
  const ok = candidates.length >= minValid;
  if (!ok) reasons.push(`only ${candidates.length} clean questions (min ${minValid})`);
  return { ok, candidates, dropped, mix, reasons };
}

/** Text of one reply (the batch result's Message) — the runner passes this to the parsers. */
export function replyText(message: Anthropic.Messages.Message): string {
  return extractText(message);
}

// ── Duplicates ──────────────────────────────────────────────────────────

/** Lower-case, letters/digits only, spaces collapsed: "What is 12 × 12?" and "what is 12 x 12" collide. */
export function normaliseStem(body: string): string {
  return body
    .toLowerCase()
    .replace(/[×x]/g, "x")
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function dedupeCandidates(
  cs: CandidateQuestion[],
  existingStems: Iterable<string> = [],
): { kept: CandidateQuestion[]; dropped: Array<{ candidate: CandidateQuestion; reason: string }> } {
  const seen = new Set<string>();
  for (const s of existingStems) seen.add(normaliseStem(s));
  const kept: CandidateQuestion[] = [];
  const dropped: Array<{ candidate: CandidateQuestion; reason: string }> = [];
  for (const c of cs) {
    const key = normaliseStem(c.body);
    if (seen.has(key)) {
      dropped.push({ candidate: c, reason: "duplicate stem" });
      continue;
    }
    seen.add(key);
    kept.push(c);
  }
  return { kept, dropped };
}
