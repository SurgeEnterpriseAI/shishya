// Server reads for the guest paper (27 Sep 2026) — see src/lib/guest-paper.ts.
// READ-ONLY: nothing here writes. The page and the grade route both call
// loadGuestPaper, so the paper a guest sees is the paper that is graded
// (the served list, src/lib/served-paper.ts).

import { prisma } from "@/lib/db/prisma";
import { canServePaper, honestMockTitle, servedPaperIds } from "@/lib/served-paper";
import { mockDurationMin } from "@/lib/mock-gate";
import { isGuestPaperMock } from "@/lib/guest-paper";

export interface GuestPaperQuestion {
  id: string;
  type: string;
  difficulty: string;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  topicId: string;
  topic: { code: string; name: string };
  language: string;
}

export interface GuestPaper {
  mockId: string;
  title: string;
  examCode: string;
  examShort: string;
  durationMin: number;
  marksPerQ: number;
  negativeMark: number;
  /** served questions, in paper order */
  questions: GuestPaperQuestion[];
}

export type GuestPaperLoad =
  | { ok: true; paper: GuestPaper }
  | { ok: false; reason: "not_found" | "not_available" | "too_short"; examCode?: string; examShort?: string; title?: string };

export async function loadGuestPaper(mockId: string): Promise<GuestPaperLoad> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(mockId)) return { ok: false, reason: "not_found" };
  const mock = await prisma.mock.findUnique({
    where: { id: mockId },
    select: {
      id: true,
      title: true,
      userId: true,
      generatedBy: true,
      questionIds: true,
      config: true,
      exam: { select: { code: true, shortName: true, marksPerQ: true, negativeMark: true } },
    },
  });
  if (!mock) return { ok: false, reason: "not_found" };
  if (!isGuestPaperMock(mock)) return { ok: false, reason: "not_available", examCode: mock.exam.code, examShort: mock.exam.shortName, title: mock.title };
  const rows = await prisma.question.findMany({
    where: { id: { in: mock.questionIds } },
    select: {
      id: true,
      type: true,
      difficulty: true,
      body: true,
      options: true,
      answerKey: true,
      solution: true,
      validated: true,
      tags: true,
      topicId: true,
      language: true,
      topic: { select: { code: true, name: true } },
    },
  });
  const byId = new Map(rows.map((q) => [q.id, q]));
  const paperIds = servedPaperIds(mock, byId);
  if (!canServePaper(paperIds)) return { ok: false, reason: "too_short", examCode: mock.exam.code, examShort: mock.exam.shortName, title: mock.title };
  const questions: GuestPaperQuestion[] = [];
  for (const id of paperIds) {
    const q = byId.get(id);
    if (!q) continue;
    questions.push({
      id: q.id,
      type: String(q.type),
      difficulty: String(q.difficulty),
      body: q.body,
      options: Array.isArray(q.options) ? (q.options as { key: string; text: string }[]) : [],
      answerKey: q.answerKey,
      solution: q.solution,
      topicId: q.topicId,
      topic: q.topic,
      language: String(q.language),
    });
  }
  return {
    ok: true,
    paper: {
      mockId: mock.id,
      title: honestMockTitle(mock.title, mock.questionIds.length, questions.length),
      examCode: mock.exam.code,
      examShort: mock.exam.shortName,
      durationMin: mockDurationMin(mock.config),
      marksPerQ: mock.exam.marksPerQ,
      negativeMark: mock.exam.negativeMark,
      questions,
    },
  };
}
