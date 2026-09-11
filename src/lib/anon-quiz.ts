// Growth lever #2 — anonymous "taste" quiz before the login gate.
//
// Behavioural data: 133 visitors hit /login in 14 days, 24 of them bailed
// *mid-mock* at the gate. Gating at peak intent leaks intent. This serves a
// short, client-graded quiz from the validated pool with NO login and NO
// persistence — a taste that ends on a sign-in CTA. Used by the exam-hub
// diagnostic (/exams/[code]/quiz) and per-topic quiz
// (/exams/[code]/topics/[code]/quiz).
//
// 11 Sep 2026 signup-leak audit:
//   • `count` is now 5..10 (ANON_QUIZ_MAX) — the cutoff-page nudge sends
//     landers to a 10-question sample (?n=10&from=cutoff).
//   • `ids` = a deterministic replay set (?set=id1,id2,…) for the "try the
//     same 5" WhatsApp share. The server checks every id belongs to the
//     exam's validated MCQ pool, keeps the caller's order, caps at 10, and
//     falls back to a random set when none survive — a stale or tampered
//     link still lands on a working quiz.
//   • getAnonCutoffRows() serves the category cutoff table (the /cutoff
//     page's own data source) for the from=cutoff result screen.
//
// SERVER-ONLY. Answers + solutions are embedded for instant client grading;
// these are practice questions already previewed publicly on topic pages, so
// the marginal exposure is acceptable for the conversion win.

import { prisma } from "@/lib/db/prisma";
import { parseCategoryCutoff } from "@/lib/category-cutoff";

export const ANON_QUIZ_MIN = 5;
export const ANON_QUIZ_MAX = 10;

export interface AnonQuizQuestion {
  id: string;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  difficulty: string;
  topicName: string;
  topicCode: string;
}

export interface AnonQuiz {
  examCode: string;
  examShort: string;
  examName: string;
  scopeLabel: string; // "UP TET" (exam) or "Ratio & Proportion" (topic)
  topicCode: string | null;
  questions: AnonQuizQuestion[];
  /** True when the questions came from a shared ?set= link (same
   *  questions, same order) rather than a random draw. */
  replay: boolean;
}

/** ?n= → a question count inside [ANON_QUIZ_MIN, ANON_QUIZ_MAX]. Anything
 *  unparseable gives the default. */
export function clampAnonQuizCount(raw: string | string[] | undefined, fallback = ANON_QUIZ_MIN): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = v ? Number.parseInt(v, 10) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(ANON_QUIZ_MAX, Math.max(ANON_QUIZ_MIN, n));
}

// Question ids are cuids (25 chars, [a-z0-9]); the pattern is deliberately
// a little wider so a future id format doesn't silently break replays, but
// tight enough that nothing but an id gets near the query.
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** ?set=id1,id2,… → de-duplicated ids in the caller's order, capped at
 *  ANON_QUIZ_MAX. Empty array when absent or nothing looks like an id. */
export function parseAnonQuizSet(raw: string | string[] | undefined): string[] {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return [];
  const out: string[] = [];
  for (const part of v.split(",")) {
    const id = part.trim();
    if (ID_RE.test(id) && !out.includes(id)) out.push(id);
    if (out.length >= ANON_QUIZ_MAX) break;
  }
  return out;
}

export async function getAnonQuiz(opts: {
  examCode: string;
  topicCode?: string;
  count?: number;
  /** Replay set — see parseAnonQuizSet(). Validated against the exam. */
  ids?: string[];
}): Promise<AnonQuiz | null> {
  const exam = await prisma.exam.findUnique({
    where: { code: opts.examCode },
    select: { id: true, code: true, shortName: true, name: true, active: true },
  });
  if (!exam || !exam.active) return null;

  let topicIds: string[] | undefined;
  let scopeLabel = exam.shortName;
  let topicCode: string | null = null;
  if (opts.topicCode) {
    const topic = await prisma.topic.findFirst({
      where: { code: opts.topicCode, subject: { examId: exam.id } },
      select: { id: true, name: true, code: true, children: { select: { id: true } } },
    });
    if (!topic) return null;
    topicIds = [topic.id, ...topic.children.map((c) => c.id)];
    scopeLabel = topic.name;
    topicCode = topic.code;
  }

  const select = {
    id: true,
    body: true,
    options: true,
    answerKey: true,
    solution: true,
    difficulty: true,
    topic: { select: { name: true, code: true } },
  } as const;

  // Replay: the shared ids, in the shared order, but only those that are
  // this exam's validated MCQs (a set is never restricted to the topic —
  // the link already came from someone who saw these exact questions).
  const wanted = (opts.ids ?? []).slice(0, ANON_QUIZ_MAX);
  let picked: {
    id: string;
    body: string;
    options: unknown;
    answerKey: string;
    solution: string;
    difficulty: string;
    topic: { name: string; code: string };
  }[] = [];
  let replay = false;
  if (wanted.length > 0) {
    const found = await prisma.question.findMany({
      where: { examId: exam.id, id: { in: wanted }, validated: true, type: "MCQ" },
      select,
    });
    const byId = new Map(found.map((q) => [q.id, q]));
    picked = wanted.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => Boolean(q));
    replay = picked.length > 0;
  }

  if (!replay) {
    const pool = await prisma.question.findMany({
      where: {
        examId: exam.id,
        validated: true,
        type: "MCQ",
        ...(topicIds ? { topicId: { in: topicIds } } : {}),
      },
      select,
      take: 80,
    });
    if (pool.length === 0) return null;

    // Shuffle so repeat visits vary; Math.random is fine in a server route.
    const count = Math.min(ANON_QUIZ_MAX, Math.max(ANON_QUIZ_MIN, opts.count ?? ANON_QUIZ_MIN));
    picked = pool
      .map((q) => ({ q, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .slice(0, count)
      .map(({ q }) => q);
  }

  return {
    examCode: exam.code,
    examShort: exam.shortName,
    examName: exam.name,
    scopeLabel,
    topicCode,
    replay,
    questions: picked.map((q) => ({
      id: q.id,
      body: q.body,
      options: (q.options as { key: string; text: string }[]) ?? [],
      answerKey: q.answerKey,
      solution: q.solution,
      difficulty: q.difficulty,
      topicName: q.topic.name,
      topicCode: q.topic.code,
    })),
  };
}

/** The exam's category-wise cutoff table — the SAME row /exams/[code]/cutoff
 *  renders (ExamCategoryCutoff, one markdown block per exam), parsed into
 *  header + rows + source notes. Null when the exam has none, so the quiz
 *  result screen simply omits the block. Raw SQL keeps this independent of
 *  client typegen, exactly like the cutoff page. */
export async function getAnonCutoffRows(
  examCode: string,
): Promise<{ table: string[][]; notes: string[] } | null> {
  const rows = await prisma
    .$queryRaw<{ content: string }[]>`
      SELECT c.content FROM "ExamCategoryCutoff" c
      JOIN "Exam" e ON e.id = c."examId"
      WHERE e.code = ${examCode} LIMIT 1
    `.catch(() => [] as { content: string }[]);
  const parsed = parseCategoryCutoff(rows[0]?.content);
  // Header + at least one category row, else nothing worth showing.
  if (parsed.table.length < 2) return null;
  return { table: parsed.table, notes: parsed.notes.slice(0, 3) };
}
