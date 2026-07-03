// Growth lever #2 — anonymous "taste" quiz before the login gate.
//
// Behavioural data: 133 visitors hit /login in 14 days, 24 of them bailed
// *mid-mock* at the gate. Gating at peak intent leaks intent. This serves a
// short, client-graded quiz from the validated pool with NO login and NO
// persistence — a taste that ends on a sign-in CTA. Used by the exam-hub
// diagnostic (/exams/[code]/quiz) and per-topic quiz
// (/exams/[code]/topics/[code]/quiz).
//
// SERVER-ONLY. Answers + solutions are embedded for instant client grading;
// these are practice questions already previewed publicly on topic pages, so
// the marginal exposure is acceptable for the conversion win.

import { prisma } from "@/lib/db/prisma";

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
}

export async function getAnonQuiz(opts: {
  examCode: string;
  topicCode?: string;
  count?: number;
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

  const pool = await prisma.question.findMany({
    where: {
      examId: exam.id,
      validated: true,
      type: "MCQ",
      ...(topicIds ? { topicId: { in: topicIds } } : {}),
    },
    select: {
      id: true,
      body: true,
      options: true,
      answerKey: true,
      solution: true,
      difficulty: true,
      topic: { select: { name: true, code: true } },
    },
    take: 80,
  });
  if (pool.length === 0) return null;

  // Shuffle so repeat visits vary; Math.random is fine in a server route.
  const picked = pool
    .map((q) => ({ q, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, opts.count ?? 5)
    .map(({ q }) => q);

  return {
    examCode: exam.code,
    examShort: exam.shortName,
    examName: exam.name,
    scopeLabel,
    topicCode,
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
