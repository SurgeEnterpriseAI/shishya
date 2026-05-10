// Mock Generator
// ──────────────
// Builds a mock test for the student. Two strategies:
//  1. Rule-based selection (fast, deterministic) — covers most cases.
//  2. LLM-assisted selection (when the request is conversational, e.g.
//     "give me a tough mock focusing on what I got wrong last week").
//
// The LLM never invents questions. It only picks IDs from `availableQuestions`
// (the candidate pool fetched from DB by topic/difficulty filters).

import { callClaude, cachedSystem, extractText, TOKEN_LIMITS } from "./client";
import { PLATFORM_PERSONA, ANSWER_FORMAT_RULES, syllabusBlock, studentStateBlock } from "./prompts";
import type {
  Difficulty,
  GenerateMockInput,
  GenerateMockOutput,
  QuestionRef,
} from "./types";

export async function generateMock(input: GenerateMockInput): Promise<GenerateMockOutput> {
  const { request } = input;

  switch (request.type) {
    case "DIAGNOSTIC":
      return ruleBasedDiagnostic(input);
    case "ADAPTIVE":
      return llmAdaptive(input);
    case "TOPIC":
      return ruleBasedTopic(input);
    case "SUBJECT":
      return ruleBasedSubject(input);
    case "FULL":
      return ruleBasedFull(input);
    case "REVISION":
      return ruleBasedRevision(input);
    case "USER_REQUEST":
      return llmFromUserRequest(input);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC — even spread across all subjects, mostly EASY/MEDIUM
// ─────────────────────────────────────────────────────────────────────────
function ruleBasedDiagnostic(input: GenerateMockInput): GenerateMockOutput {
  const { availableQuestions, syllabus, request } = input as GenerateMockInput & {
    request: Extract<GenerateMockInput["request"], { type: "DIAGNOSTIC" }>;
  };

  const targetCount = request.questionCount;
  const subjects = syllabus.subjects;

  // Even split, then top up from the largest subject
  const perSubject = Math.floor(targetCount / subjects.length);
  const remainder = targetCount - perSubject * subjects.length;

  const picked: QuestionRef[] = [];
  for (let i = 0; i < subjects.length; i++) {
    const s = subjects[i];
    const pool = availableQuestions.filter((q) =>
      s.topics.some((t) => q.topicCode === t.code || q.topicCode.startsWith(t.code + "."))
    );
    const want = perSubject + (i < remainder ? 1 : 0);
    picked.push(...pickByDifficulty(pool, want, { EASY: 0.5, MEDIUM: 0.4, HARD: 0.1 }));
  }

  return finalize(picked, {
    title: `Diagnostic Mock — ${syllabus.examShortName}`,
    rationale: "A balanced mock to map your current strengths and weaknesses across all subjects.",
    durationMin: estimateDuration(picked.length),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// TOPIC — drill on one topic
// ─────────────────────────────────────────────────────────────────────────
function ruleBasedTopic(input: GenerateMockInput): GenerateMockOutput {
  const { availableQuestions, request, syllabus } = input as GenerateMockInput & {
    request: Extract<GenerateMockInput["request"], { type: "TOPIC" }>;
  };
  const pool = availableQuestions.filter(
    (q) => q.topicCode === request.topicCode || q.topicCode.startsWith(request.topicCode + ".")
  );
  const mix = request.difficulty
    ? ({ [request.difficulty]: 1 } as Record<Difficulty, number>)
    : ({ EASY: 0.3, MEDIUM: 0.5, HARD: 0.2 } as Record<Difficulty, number>);
  const picked = pickByDifficulty(pool, request.questionCount, mix);

  return finalize(picked, {
    title: `Topic drill — ${request.topicCode}`,
    rationale: `Focused practice on ${request.topicCode}.`,
    durationMin: estimateDuration(picked.length),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// SUBJECT — full subject test
// ─────────────────────────────────────────────────────────────────────────
function ruleBasedSubject(input: GenerateMockInput): GenerateMockOutput {
  const { availableQuestions, syllabus, request } = input as GenerateMockInput & {
    request: Extract<GenerateMockInput["request"], { type: "SUBJECT" }>;
  };
  const subject = syllabus.subjects.find((s) => s.code === request.subjectCode);
  if (!subject) throw new Error(`Unknown subject ${request.subjectCode}`);
  const pool = availableQuestions.filter((q) =>
    subject.topics.some((t) => q.topicCode === t.code || q.topicCode.startsWith(t.code + "."))
  );
  const picked = pickByDifficulty(pool, request.questionCount, {
    EASY: 0.3,
    MEDIUM: 0.5,
    HARD: 0.2,
  });
  return finalize(picked, {
    title: `${subject.name} — Subject Test`,
    rationale: `All-topic practice within ${subject.name}.`,
    durationMin: estimateDuration(picked.length),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// FULL — mirrors real exam structure (count + duration come from exam config,
// passed in via syllabus.subjects weights — caller should pass questionCount).
// ─────────────────────────────────────────────────────────────────────────
function ruleBasedFull(input: GenerateMockInput): GenerateMockOutput {
  const { availableQuestions, syllabus } = input;
  // Distribute by subject weights
  const totalWeight = syllabus.subjects.reduce((s, x) => s + x.weight, 0);
  const TOTAL = 100; // default; caller should override via studentState.examConfig

  const picked: QuestionRef[] = [];
  for (const s of syllabus.subjects) {
    const want = Math.round((s.weight / totalWeight) * TOTAL);
    const pool = availableQuestions.filter((q) =>
      s.topics.some((t) => q.topicCode === t.code || q.topicCode.startsWith(t.code + "."))
    );
    picked.push(...pickByDifficulty(pool, want, { EASY: 0.25, MEDIUM: 0.5, HARD: 0.25 }));
  }
  return finalize(picked, {
    title: `Full Mock — ${syllabus.examShortName}`,
    rationale: "Full-length mock with subject distribution mirroring the real exam.",
    durationMin: estimateDuration(picked.length),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// REVISION — student's past mistakes
// (caller supplies past-wrong question IDs via availableQuestions filter)
// ─────────────────────────────────────────────────────────────────────────
function ruleBasedRevision(input: GenerateMockInput): GenerateMockOutput {
  const { availableQuestions, request } = input as GenerateMockInput & {
    request: Extract<GenerateMockInput["request"], { type: "REVISION" }>;
  };
  const picked = availableQuestions.slice(0, request.questionCount);
  return finalize(picked, {
    title: "Revision Mock — your past mistakes",
    rationale: "Re-attempt the questions you got wrong. Mastery comes from closing the same loop twice.",
    durationMin: estimateDuration(picked.length),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// ADAPTIVE — LLM picks from candidate pool based on student weaknesses
// ─────────────────────────────────────────────────────────────────────────
async function llmAdaptive(input: GenerateMockInput): Promise<GenerateMockOutput> {
  const { studentState, syllabus, availableQuestions, request } = input as GenerateMockInput & {
    request: Extract<GenerateMockInput["request"], { type: "ADAPTIVE" }>;
  };

  const systemBlocks = cachedSystem(PLATFORM_PERSONA, ANSWER_FORMAT_RULES, syllabusBlock(syllabus));
  // Keep candidate pool compact — top 200 by relevance (weakest topics first)
  const pool = availableQuestions.slice(0, 200);

  const userPrompt = `${studentStateBlock(studentState)}

Build an ADAPTIVE mock of ${request.questionCount} questions tailored to this student's weaknesses.

Candidate question pool (id|topicCode|difficulty):
${pool.map((q) => `${q.id}|${q.topicCode}|${q.difficulty}`).join("\n")}

Return STRICT JSON:
{
  "questionIds": ["...", "..."],     // exactly ${request.questionCount} ids drawn from the pool
  "rationale": "2–3 sentences on why these are the right questions for this student today",
  "topicMix": { "topic.code": count, ... },
  "difficultyMix": { "EASY": n, "MEDIUM": n, "HARD": n }
}

Rules:
- Bias selection toward topics with mastery <60%.
- Mix difficulties; do not pick all HARD even if weak.
- Exactly ${request.questionCount} unique ids from the pool. No invented ids.`;

  const { response } = await callClaude({
    system: systemBlocks,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: TOKEN_LIMITS.generator,
  });

  const parsed = safeParseJson(extractText(response));
  // Validate ids exist in pool — drop invalids and top up if short
  const validIds = new Set(pool.map((q) => q.id));
  const cleanIds: string[] = (parsed.questionIds ?? []).filter((id: string) => validIds.has(id));
  const needed = request.questionCount - cleanIds.length;
  if (needed > 0) {
    const extras = pool.filter((q) => !cleanIds.includes(q.id)).slice(0, needed);
    cleanIds.push(...extras.map((q) => q.id));
  }
  const finalIds = cleanIds.slice(0, request.questionCount);

  const finalRefs = pool.filter((q) => finalIds.includes(q.id));
  return finalize(finalRefs, {
    title: `Adaptive Mock — ${syllabus.examShortName}`,
    rationale: parsed.rationale ?? "Targeted at your current weak topics.",
    durationMin: request.durationMin ?? estimateDuration(finalIds.length),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// USER_REQUEST — free-form instruction → LLM picks
// ─────────────────────────────────────────────────────────────────────────
async function llmFromUserRequest(input: GenerateMockInput): Promise<GenerateMockOutput> {
  const { studentState, syllabus, availableQuestions, request } = input as GenerateMockInput & {
    request: Extract<GenerateMockInput["request"], { type: "USER_REQUEST" }>;
  };

  const systemBlocks = cachedSystem(PLATFORM_PERSONA, ANSWER_FORMAT_RULES, syllabusBlock(syllabus));
  const pool = availableQuestions.slice(0, 200);

  const userPrompt = `${studentStateBlock(studentState)}

The student asked: "${request.instruction}"

Build a mock of ${request.questionCount} questions that best satisfies this request, choosing strictly from the pool below.

Pool (id|topicCode|difficulty):
${pool.map((q) => `${q.id}|${q.topicCode}|${q.difficulty}`).join("\n")}

Return STRICT JSON:
{
  "title": "short title for the mock",
  "questionIds": [...],
  "rationale": "why these match the request",
  "topicMix": {...},
  "difficultyMix": {...}
}

Only use ids from the pool.`;

  const { response } = await callClaude({
    system: systemBlocks,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: TOKEN_LIMITS.generator,
  });
  const parsed = safeParseJson(extractText(response));
  const validIds = new Set(pool.map((q) => q.id));
  const cleanIds: string[] = (parsed.questionIds ?? []).filter((id: string) => validIds.has(id));
  const finalRefs = pool.filter((q) => cleanIds.includes(q.id));

  return finalize(finalRefs, {
    title: parsed.title ?? "Custom Mock",
    rationale: parsed.rationale ?? request.instruction,
    durationMin: estimateDuration(finalRefs.length),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function pickByDifficulty(
  pool: QuestionRef[],
  count: number,
  mix: Partial<Record<Difficulty, number>>
): QuestionRef[] {
  if (pool.length === 0) return [];
  const totalRatio = (mix.EASY ?? 0) + (mix.MEDIUM ?? 0) + (mix.HARD ?? 0) || 1;
  const want: Record<Difficulty, number> = {
    EASY: Math.round(((mix.EASY ?? 0) / totalRatio) * count),
    MEDIUM: Math.round(((mix.MEDIUM ?? 0) / totalRatio) * count),
    HARD: Math.round(((mix.HARD ?? 0) / totalRatio) * count),
  };
  // Adjust rounding error
  while (want.EASY + want.MEDIUM + want.HARD < count) want.MEDIUM++;
  while (want.EASY + want.MEDIUM + want.HARD > count) want.MEDIUM--;

  const byDiff: Record<Difficulty, QuestionRef[]> = { EASY: [], MEDIUM: [], HARD: [] };
  for (const q of pool) byDiff[q.difficulty].push(q);

  const picked: QuestionRef[] = [];
  for (const d of ["EASY", "MEDIUM", "HARD"] as Difficulty[]) {
    const need = want[d];
    const bucket = shuffle(byDiff[d]).slice(0, need);
    picked.push(...bucket);
  }
  // Top up from any difficulty if some bucket was short
  if (picked.length < count) {
    const extras = pool.filter((q) => !picked.includes(q));
    picked.push(...shuffle(extras).slice(0, count - picked.length));
  }
  return picked.slice(0, count);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function estimateDuration(count: number): number {
  // ~1.2 minutes per Q is reasonable for SSC-style; tune per exam later.
  return Math.max(10, Math.round(count * 1.2));
}

function finalize(
  refs: QuestionRef[],
  meta: { title: string; rationale: string; durationMin: number }
): GenerateMockOutput {
  const topicMix: Record<string, number> = {};
  const difficultyMix: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const r of refs) {
    topicMix[r.topicCode] = (topicMix[r.topicCode] ?? 0) + 1;
    difficultyMix[r.difficulty] = (difficultyMix[r.difficulty] ?? 0) + 1;
  }
  return {
    title: meta.title,
    rationale: meta.rationale,
    questionIds: refs.map((r) => r.id),
    durationMin: meta.durationMin,
    topicMix,
    difficultyMix,
  };
}

function safeParseJson(text: string): any {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}
