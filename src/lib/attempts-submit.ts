// Server-side pure helpers for the batched submit (audit 11 Sep 2026).
//
// The player now sends ONE submit payload carrying every answer + timing.
// The server treats it as authoritative for WHAT was chosen, and grades it
// itself against the answer key via scoreAttempt — the single grader in
// this codebase. A client can never send a score, a `correct` flag or
// `marks`: anything of the sort is stripped before grading.
//
// Idempotency without a schema change (prisma migrate is not allowed):
// "same payload → same result" and "different payload after grading → 409"
// are derived by comparing the payload's `chosen` per question against the
// persisted graded answers (samePayloadAsGraded). Timings and review marks
// never change a grade, so a resubmit that differs only there is the same
// submission.

import { z } from "zod";
import { scoreAttempt, type ScoringInput, type ScoringResult } from "@/lib/scoring";
import type { AnswerRecord } from "@/lib/attempts-sync";

export const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1),
  chosen: z.string().max(40).nullable(),
  timeSec: z.number().min(0).transform((n) => Math.min(n, 86400)),
  marked: z.boolean().optional().default(false),
  updatedAt: z.number().int().nonnegative().optional(),
});

/** `{}` and `{ auto: true }` (legacy callers, ExpiredAttemptGate) stay valid. */
export const SubmitBodySchema = z.object({
  auto: z.boolean().optional(),
  answers: z.array(SubmitAnswerSchema).max(500).optional(),
});

export type SubmitBody = z.infer<typeof SubmitBodySchema>;

/** "" is "unanswered" everywhere else (page.tsx treats it so) — make it null
 *  before it reaches the grader, which would otherwise mark "" wrong. */
export function normaliseChosen(c: string | null | undefined): string | null {
  if (c == null) return null;
  const t = c.trim();
  return t === "" ? null : t;
}

function toRecord(a: AnswerRecord): AnswerRecord {
  const rec: AnswerRecord = {
    questionId: a.questionId,
    chosen: normaliseChosen(a.chosen),
    timeSec: Number.isFinite(a.timeSec) && a.timeSec > 0 ? a.timeSec : 0,
    marked: a.marked === true,
  };
  if (typeof a.updatedAt === "number" && Number.isFinite(a.updatedAt)) rec.updatedAt = a.updatedAt;
  return rec;
}

/**
 * Start from what the server stored during the attempt; every payload record
 * for a question in this mock REPLACES the stored one (the device the
 * student finished on is authoritative). Payload ids not in the mock are
 * dropped and returned so the route can log them. Output is ordered by
 * questionIds; questions with nothing on either side are omitted (the
 * grader scores them as skipped).
 */
export function mergeAuthoritative(
  stored: AnswerRecord[],
  payload: AnswerRecord[] | undefined,
  questionIds: string[],
): { answers: AnswerRecord[]; dropped: string[] } {
  const inMock = new Set(questionIds);
  const byId = new Map<string, AnswerRecord>();
  for (const a of stored ?? []) {
    if (a && typeof a.questionId === "string" && inMock.has(a.questionId)) byId.set(a.questionId, toRecord(a));
  }
  const dropped = new Set<string>();
  for (const p of payload ?? []) {
    if (!p || typeof p.questionId !== "string") continue;
    if (!inMock.has(p.questionId)) {
      dropped.add(p.questionId);
      continue;
    }
    byId.set(p.questionId, toRecord(p));
  }
  const answers: AnswerRecord[] = [];
  for (const qid of questionIds) {
    const a = byId.get(qid);
    if (a) answers.push(a);
  }
  return { answers, dropped: [...dropped] };
}

export interface GradeInput {
  questionIds: string[];
  questionsById: ScoringInput["questionsById"];
  stored: AnswerRecord[];
  payload?: AnswerRecord[];
  marksPerQ: number;
  negativeMark: number;
}

/**
 * Grade a submission. Wraps scoreAttempt (never a second grading rule) and
 * strips anything a client might have attached — `correct`, `marks`, a
 * score — before the grader sees it.
 */
export function gradeSubmission(
  input: GradeInput,
): ScoringResult & { answersUsed: AnswerRecord[]; dropped: string[] } {
  const { answers, dropped } = mergeAuthoritative(input.stored, input.payload, input.questionIds);
  const submittedAnswers = answers.map((a) => ({
    questionId: a.questionId,
    chosen: a.chosen,
    timeSec: a.timeSec,
    marked: a.marked,
  }));
  const result = scoreAttempt({
    questionIds: input.questionIds,
    questionsById: input.questionsById,
    submittedAnswers,
    marksPerQ: input.marksPerQ,
    negativeMark: input.negativeMark,
  });
  return { ...result, answersUsed: answers, dropped };
}

/**
 * Is this payload the same submission the server already graded?
 * Compares `chosen` per question in the mock; a missing payload row and a
 * null chosen are the same thing (unanswered). `payload` undefined (a bare
 * legacy resubmit) is always "same" — there is nothing to contradict.
 */
export function samePayloadAsGraded(
  graded: Array<{ questionId: string; chosen: string | null }>,
  payload: AnswerRecord[] | undefined,
  questionIds: string[],
): boolean {
  if (!payload) return true;
  const g = new Map<string, string | null>();
  for (const a of graded ?? []) {
    if (a && typeof a.questionId === "string") g.set(a.questionId, normaliseChosen(a.chosen));
  }
  const p = new Map<string, string | null>();
  for (const a of payload) {
    if (a && typeof a.questionId === "string") p.set(a.questionId, normaliseChosen(a.chosen));
  }
  for (const qid of questionIds) {
    if ((g.get(qid) ?? null) !== (p.get(qid) ?? null)) return false;
  }
  return true;
}
