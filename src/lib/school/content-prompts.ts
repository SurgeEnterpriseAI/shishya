// School content — prompt builders (26 Sep 2026).
//
// Pure: the exact messages.create bodies scripts/school-content-batch.ts
// submits through the Message Batches API for one NCERT chapter — a notes
// request (Phase N) and a 10-question MCQ set request (Phase G) — so the
// tests can read every rule the founder set for school content straight out
// of the prompt text:
//
//   1. LINK the official textbook, never copy it. The model gets the chapter
//      IDENTITY only (class, subject, book, chapter number and title, the
//      official PDF URL to cite). No textbook text is fetched, stored or fed
//      to it (NCERT is CC BY-NC-ND: no derivatives — data/curriculum/README.md
//      "Link, never copy"), and COPYRIGHT_RULE tells it to write from its own
//      understanding of what that class studies under that title and never
//      to reproduce, closely paraphrase, translate or quote the book or its
//      exercises. Our notes and questions are our own text.
//   2. Every question is answer-checked before it can be served: the MCQ
//      builder produces exactly the factory generator's JSON shape
//      (GENERATOR_OUTPUT_SCHEMA), rows land validated:false, and
//      scripts/verify-question-bank.ts is the firewall.
//   3. Class-appropriate: classPersona(cls) differs per class (reading level,
//      sentence length, the maths a student of that class has, the kind of
//      examples) and is printed into both system prompts.
//   4. Honest labels: HONEST_LABEL_RULE — an AI question is never called an
//      NCERT exercise, textbook question, board question or previous-year
//      question; the parser (content-parse.ts) rejects such wording.
//   5. Nothing child-facing here: the runner writes content only.
//
// Notes structure = scripts/generate-topic-notes.ts's six sections, reworded
// for school and with a seventh, fixed section that carries the official link
// ("Read the chapter in the official NCERT book: <url>").

import type { MessageParams } from "../ai/client";
import { GENERATOR_OUTPUT_SCHEMA } from "../ai/factory/generator";
import { modelFor } from "../ai/router";
import type { Difficulty } from "../ai/types";

/** Bumped whenever a prompt below changes; written into every note's provenance and every question's metadata.
 *  v2 (26 Sep 2026 review): no quotation marks, the Common-mistakes form without quotes, a retry-feedback block. */
export const NOTES_PROMPT_VERSION = "school-notes-v2";
export const MCQ_PROMPT_VERSION = "school-mcq-v2";

/** Classes the personas below are written for (the first build slice: NCERT 6-10 Maths and Science). */
export const SCHOOL_CLASSES_SUPPORTED: readonly number[] = [6, 7, 8, 9, 10];

/** One chapter as the runner resolves it: DB Topic + the spine's book/chapter identity + the KnowledgeSource link. */
export interface SchoolChapter {
  topicId: string;
  examCode: string;
  /** Class number (6-10). */
  cls: number;
  /** Subject.name, e.g. "Mathematics". */
  subject: string;
  /** NCERT book code, e.g. fegp1. */
  bookCode: string;
  /** Book title as NCERT's index lists it, e.g. "Ganita Prakash". */
  bookTitle: string;
  /** Chapter number as printed ("1"), or null when NCERT prints none. */
  chapterNumber: string | null;
  /** What NCERT calls the unit: chapter / unit / lesson … */
  chapterKind: string;
  /** Topic.code, e.g. fegp1.ch01. */
  topicCode: string;
  /** Chapter title (Topic.name). */
  title: string;
  /** The official NCERT chapter PDF (KnowledgeSource.url), the only link the notes may carry. */
  officialUrl: string;
}

// ── The rules, as prompt text ────────────────────────────────────────────

export const COPYRIGHT_RULE = `Copyright rule (absolute): NCERT textbooks are copyrighted and licensed CC BY-NC-ND — no derivative works. You have NOT been given the textbook and must not try to recall its exact text. Write from your own understanding of what a student of this class studies under this chapter title. Do NOT reproduce, closely paraphrase, translate, summarise or quote the textbook's sentences, its examples, activities, figures or exercise questions. Do NOT refer to the book's numbered items (no "Exercise 1.1", "Fig. 3.2", "Activity 4.5", "Example 2.3", "Table 1.2", page numbers) and do not say "in the textbook". Invent your own examples, numbers, names and situations. The only place the book appears is the official link you are asked to cite.`;

export const HONEST_LABEL_RULE = `Honest labels: these are Shishya's own practice questions written by an AI. Never call a question an NCERT exercise, a textbook question, a board question, a CBSE question or a previous-year question, and never claim it appeared in any examination.`;

export const OFFICIAL_LINK_PREFIX = "Read the chapter in the official NCERT book: ";

/** The one line the notes must end with (also what the parser checks for). */
export function officialLinkLine(ch: Pick<SchoolChapter, "officialUrl">): string {
  return `${OFFICIAL_LINK_PREFIX}${ch.officialUrl}`;
}

// ── Class personas ──────────────────────────────────────────────────────

export interface ClassPersona {
  cls: number;
  /** Who is reading. */
  learner: string;
  /** Sentence and vocabulary rules. */
  language: string;
  /** The mathematics this class has (what a question may assume). */
  maths: string;
  /** The science register this class has. */
  science: string;
  /** Where examples come from. */
  examples: string;
  /** Target length of the notes in words. */
  notesWords: [number, number];
}

const PERSONAS: Record<number, ClassPersona> = {
  6: {
    cls: 6,
    learner: "an 11-year-old in Class 6, the first year of middle school, reading on their own after school",
    language: "Short sentences (under 18 words). Everyday words. Introduce every new term with a one-line meaning before using it. One idea per paragraph.",
    maths: "whole numbers, simple fractions and decimals, basic shapes, measurement and simple data; a letter or a box may stand for an unknown but there is no algebra beyond that",
    science: "observations, simple activities, sorting and naming things, everyday phenomena; no chemical formulas or equations",
    examples: "home, school, the playground, the local market, cricket scores, pocket money in rupees, festivals, the monsoon",
    notesWords: [600, 1000],
  },
  7: {
    cls: 7,
    learner: "a 12-year-old in Class 7",
    language: "Short sentences (under 20 words). Plain words; define a term the first time it appears.",
    maths: "integers, fractions and decimals in all four operations, simple equations in one variable, ratio and percentage, basic geometry and perimeter/area of simple shapes",
    science: "simple cause and effect, classification, everyday materials and processes; a chemical name may appear but no balanced equations",
    examples: "daily life, school, sport, shopping in rupees, weather, plants and animals around an Indian town",
    notesWords: [650, 1050],
  },
  8: {
    cls: 8,
    learner: "a 13-year-old in Class 8",
    language: "Clear sentences (under 24 words). Correct terms, each explained once in plain words.",
    maths: "algebraic expressions, linear equations in one variable, exponents, square and cube roots, percentages and simple interest, quadrilaterals, mensuration, data handling",
    science: "simple mechanisms and reasons, properties of materials, basic chemical reactions described in words, force, pressure, sound, light, cells",
    examples: "everyday Indian settings, simple experiments a student can picture, sport, travel, money in rupees",
    notesWords: [700, 1100],
  },
  9: {
    cls: 9,
    learner: "a 14-year-old in Class 9, the first year of secondary school",
    language: "Precise sentences (under 28 words). Formal definitions stated exactly, then explained in plain words.",
    maths: "real numbers, polynomials, linear equations in two variables, coordinate geometry, Euclid's geometry, triangles and quadrilaterals, circles, surface areas and volumes, statistics and probability, with multi-step reasoning",
    science: "matter and its particle nature, atoms and molecules, cell structure, tissues, motion, force and Newton's laws, gravitation, work and energy, sound, with standard notation and word or symbol equations",
    examples: "measurements and experiments a student can picture, real quantities with units, Indian everyday contexts",
    notesWords: [750, 1150],
  },
  10: {
    cls: 10,
    learner: "a 15-year-old in Class 10 preparing for the Class 10 board examination",
    language: "Precise, formal sentences (under 30 words) with exact definitions, statements of results and, where the chapter has them, short proofs or derivations, each followed by a plain-words explanation.",
    maths: "real numbers, polynomials, pairs of linear equations, quadratic equations, arithmetic progressions, triangles, coordinate geometry, trigonometry, circles, areas and volumes, statistics and probability, with multi-step reasoning",
    science: "chemical reactions with balanced equations, acids, bases and salts, metals, carbon compounds, life processes, control and coordination, reproduction, heredity, light, electricity, magnetism, the environment, with standard notation",
    // 26 Sep 2026 review: was "board-examination-style situations" — the persona must not nudge the model into board/exam wording that the honest-label check rejects.
    examples: "real quantities with units, Indian everyday contexts, and multi-step situations that need two ideas of the chapter at once",
    notesWords: [800, 1200],
  },
};

/** The persona for a class; throws for a class this slice has no persona for. */
export function classPersona(cls: number): ClassPersona {
  const p = PERSONAS[cls];
  if (!p) throw new Error(`school content: no persona for Class ${cls} (supported: ${SCHOOL_CLASSES_SUPPORTED.join(", ")})`);
  return p;
}

function subjectRegister(p: ClassPersona, subject: string): string {
  return /math/i.test(subject) ? `Mathematics at this class means: ${p.maths}.` : /science/i.test(subject) ? `Science at this class means: ${p.science}.` : `Keep every idea within what Class ${p.cls} studies in ${subject}.`;
}

/** One-line chapter identity, e.g. "NCERT Class 6 · Mathematics · Ganita Prakash · Chapter 1: Patterns in Mathematics". */
export function chapterIdentity(ch: SchoolChapter): string {
  const kind = ch.chapterKind ? ch.chapterKind[0].toUpperCase() + ch.chapterKind.slice(1) : "Chapter";
  const num = ch.chapterNumber ? `${kind} ${ch.chapterNumber}: ` : "";
  return `NCERT Class ${ch.cls} · ${ch.subject} · ${ch.bookTitle} · ${num}${ch.title}`;
}

function chapterBlock(ch: SchoolChapter): string {
  const kind = ch.chapterKind ? ch.chapterKind[0].toUpperCase() + ch.chapterKind.slice(1) : "Chapter";
  return `# Chapter
- Curriculum: NCERT (the textbooks CBSE and the NCERT-adopting state boards use)
- Class: ${ch.cls}
- Subject: ${ch.subject}
- Book: ${ch.bookTitle} (NCERT code ${ch.bookCode})
- ${ch.chapterNumber ? `${kind} ${ch.chapterNumber}: ` : `${kind}: `}${ch.title}
- Topic code: \`${ch.topicCode}\`
- Official chapter PDF (cite this link; it was not fetched and you must not reproduce it): ${ch.officialUrl}`;
}

// ── Phase N: notes ──────────────────────────────────────────────────────

/** Section headings, in order; the parser requires all but "Formulas and facts to remember". */
export const NOTES_HEADINGS = [
  "## What this chapter is about",
  "## Key ideas",
  "## Formulas and facts to remember",
  "## Worked examples",
  "## Common mistakes",
  "## Quick revision",
  "## Read the official chapter",
] as const;

export const NOTES_OPTIONAL_HEADINGS: ReadonlySet<string> = new Set(["## Formulas and facts to remember"]);

/** max_tokens for a notes reply: scripts/generate-topic-notes.ts uses 4000 for 600-1200 words. */
export const NOTES_MAX_TOKENS = 4000;

export function notesSystemPrompt(cls: number, subject: string): string {
  const p = classPersona(cls);
  return `You write original study notes for Indian school students. This chapter is NCERT Class ${cls} ${subject}.

Who is reading: ${p.learner}. ${p.language}
${subjectRegister(p, subject)}
Examples come from ${p.examples}. Every worked example must be one a Class ${cls} student can follow with what this class knows — not a competitive-exam problem.

Style:
- Plain English. Indian spellings and units (rupees, metres, kilograms).
- Plain-text maths: write x², 3/4, 2 × 5, not LaTeX or code.
- ${p.notesWords[0]}–${p.notesWords[1]} words in total. Clear beats long.
- Only content you are sure is correct at this class level. If unsure, leave it out rather than guess.
- No claims about examinations, marks or what is important for boards.
- No quotation marks anywhere: state definitions, rules, results and a student's wrong thinking directly, never as a quoted sentence.

${COPYRIGHT_RULE}

Output strict markdown with these sections, in this exact order, each starting with the heading shown:

## What this chapter is about
2–3 short paragraphs: what the chapter teaches, why a Class ${cls} student meets it now, what they should be able to do afterwards.

## Key ideas
4–8 bullet points, each 1–2 sentences: the ideas a student must hold.

## Formulas and facts to remember
For mathematics: the formulas and rules, each with a one-line meaning. For science: 5–8 facts, definitions or laws to remember.

## Worked examples
2–3 short examples of your own invention, each solved step by step at Class ${cls} level.

## Common mistakes
3–5 mistakes a Class ${cls} student makes on this chapter, each on one line in the form: the wrong thinking → the fix (plain words, no quotation marks).

## Quick revision
3–6 one-line takeaways a student would write on a revision card.

## Read the official chapter
Exactly one line, the link line given in the task. Nothing else in this section.`;
}

/**
 * The block a retried request carries (26 Sep 2026 review): the runner
 * resubmits a rejected reply once, and an identical prompt would be a coin
 * flip — the model is told what our checker refused and why, so the second
 * reply is a correction, not a repeat.
 */
export function retryFeedbackBlock(reasons: string | undefined): string {
  const r = (reasons ?? "").trim();
  if (!r) return "";
  return `

# Your previous reply was rejected by our checker
Reasons: ${r}
Write the whole reply again from scratch and fix every reason above. Keep every other rule.`;
}

export function notesUserPrompt(ch: SchoolChapter, opts: { retryFeedback?: string } = {}): string {
  return `Write the study notes for this chapter.

${chapterBlock(ch)}

Decide what a Class ${ch.cls} ${ch.subject} student studies under this chapter title from the title, the class and the subject alone, and write it in your own words.

End with the section "## Read the official chapter" containing exactly this line and nothing else:
${officialLinkLine(ch)}${retryFeedbackBlock(opts.retryFeedback)}`;
}

/** The messages.create body of one notes request (model, max_tokens, system, messages — the shape callClaude sends, no cache_control: the per-class system block sits under Sonnet's 1,024-token cache minimum, so a cache marker would only mislead the estimate). */
export function buildSchoolNotesRequest(ch: SchoolChapter, opts: { model?: string; retryFeedback?: string } = {}): MessageParams {
  return {
    model: opts.model ?? modelFor("generate"),
    max_tokens: NOTES_MAX_TOKENS,
    system: [{ type: "text", text: notesSystemPrompt(ch.cls, ch.subject) }],
    messages: [{ role: "user", content: notesUserPrompt(ch, { retryFeedback: opts.retryFeedback }) }],
  };
}

// ── Phase G: MCQ sets ───────────────────────────────────────────────────

export type DifficultyMix = Record<Difficulty, number>;

/** Questions per request: a bad reply loses ten, not forty. */
export const MCQ_SET_SIZE = 10;
/** Sets per chapter: 4 × 10 = the 40-question target. */
export const MCQ_SETS_PER_CHAPTER = 4;
/** Per-set mix; four sets give the chapter's 16 EASY / 16 MEDIUM / 8 HARD. */
export const MCQ_SET_MIX: DifficultyMix = { EASY: 4, MEDIUM: 4, HARD: 2 };
export const MCQ_CHAPTER_MIX: DifficultyMix = { EASY: 16, MEDIUM: 16, HARD: 8 };
/** max_tokens for a 10-question set: the fresh-questions ledger averages ~2,450 output tokens for a set of this size; 6,000 leaves room for long solutions without paying for filler on the estimate. */
export const MCQ_MAX_TOKENS = 6000;

/** The four sets of one chapter run in parallel inside one batch, so no set can see the others. Each set gets its own angle to keep the forty questions from overlapping. */
export const MCQ_SET_ANGLES: readonly string[] = [
  "core meanings and definitions: what the ideas of this chapter are and how to recognise them",
  "doing it: calculations, procedures and direct applications of the chapter's methods",
  "reasoning: why a method works, what changes when a condition changes, spotting a wrong step",
  "mixed revision across the whole chapter, including the common mistakes a student makes",
];

export function mcqSystemPrompt(cls: number, subject: string): string {
  const p = classPersona(cls);
  return `You write original multiple-choice practice questions for Indian school students. This chapter is NCERT Class ${cls} ${subject}.

Who answers them: ${p.learner}. ${p.language}
${subjectRegister(p, subject)}
Every question must read like a Class ${cls} question — never like a competitive-exam (SSC, JEE, NEET) question. Examples come from ${p.examples}.

Each question:
- Tests one idea from this chapter clearly. No trick questions, no negatives like "which is NOT" unless the idea needs it.
- Has exactly 4 options labelled A, B, C, D with exactly one unambiguously correct answer; the wrong options are mistakes a Class ${cls} student really makes.
- Has a worked solution in your own words that a Class ${cls} student can follow step by step (3–6 short sentences), ending with why the correct option is right.
- Uses plain-text maths ("x² + 1", "3/4"), no LaTeX.
- Matches the requested difficulty: EASY = one direct step a Class ${cls} student does at once; MEDIUM = 2–3 steps; HARD = combines two ideas of this chapter or needs careful reasoning — still Class ${cls} level, not beyond it.
- Stays strictly within this chapter at this class. Never invents facts, exam years or answer keys.
- Uses no quotation marks: a statement to judge is written directly as an option, never as a quoted sentence.
- Never produces harmful, biased or controversial content.

${COPYRIGHT_RULE}

${HONEST_LABEL_RULE}

${GENERATOR_OUTPUT_SCHEMA}`;
}

/** The notes block: Shishya's OWN notes (Phase N output), which the founder's rule allows as grounding; the textbook never is. */
function notesBlock(notes: string): string {
  return `# Shishya's own study notes for this chapter (written by us, not the textbook — ground every question in these)\n${notes.slice(0, 7000)}`;
}

export function mcqUserPrompt(ch: SchoolChapter, notes: string, setIndex: number, mix: DifficultyMix = MCQ_SET_MIX, opts: { retryFeedback?: string } = {}): string {
  const count = mix.EASY + mix.MEDIUM + mix.HARD;
  const angle = MCQ_SET_ANGLES[setIndex % MCQ_SET_ANGLES.length];
  return `Generate exactly ${count} questions on this chapter. This is set ${setIndex + 1} of ${MCQ_SETS_PER_CHAPTER}; its angle: ${angle}.

${chapterBlock(ch)}

${notesBlock(notes)}

# Difficulty distribution (exact)
- EASY: ${mix.EASY} · MEDIUM: ${mix.MEDIUM} · HARD: ${mix.HARD}

# Tags
Give each question 1–3 short kebab-case tags naming the idea it tests (e.g. "prime-numbers", "perimeter").

Return the JSON array only.${retryFeedbackBlock(opts.retryFeedback)}`;
}

/** The messages.create body of one 10-question set request, in the factory generator's output shape. */
export function buildSchoolMcqRequest(
  ch: SchoolChapter,
  notes: string,
  setIndex: number,
  opts: { model?: string; mix?: DifficultyMix; retryFeedback?: string } = {},
): MessageParams {
  return {
    model: opts.model ?? modelFor("generate"),
    max_tokens: MCQ_MAX_TOKENS,
    system: [{ type: "text", text: mcqSystemPrompt(ch.cls, ch.subject) }],
    messages: [{ role: "user", content: mcqUserPrompt(ch, notes, setIndex, opts.mix, { retryFeedback: opts.retryFeedback }) }],
  };
}

/** Placeholder notes of a typical length for the dry-run estimate of Phase G before Phase N has run (the 26 Sep 2026 TopicTeachingNote average is ~1,020 words). */
export function placeholderNotes(ch: SchoolChapter, words = 1000): string {
  const line = `${ch.title} at Class ${ch.cls} level: an idea, a rule and a worked example written in plain words for a student of this class. `;
  const perLine = line.split(/\s+/).filter(Boolean).length;
  return `## What this chapter is about\n${line.repeat(Math.ceil(words / perLine))}`;
}
