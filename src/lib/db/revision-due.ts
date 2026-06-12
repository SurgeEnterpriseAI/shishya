// "What should I revise today" — read model over ReviewState (FSRS).
//
// Returns the topics whose memory is due (or nearly due) for review, with a
// computed retrievability so the UI can say "you've likely forgotten ~40%
// of Profit & Loss". Powers the dashboard revision card and the tutor's
// suggestions.

import { prisma } from "@/lib/db/prisma";
import { retrievability } from "@/lib/psychometrics";

export interface DueTopic {
  topicId: string;
  topicCode: string;
  topicName: string;
  subjectName: string;
  examCode: string;
  due: Date;
  overdueDays: number; // negative = due in the future (within the horizon)
  /** Estimated probability the student still remembers this topic (0..1). */
  retention: number;
  reps: number;
  lapses: number;
}

export async function getDueRevisions(
  userId: string,
  opts: { examCode?: string; horizonDays?: number; limit?: number } = {},
): Promise<DueTopic[]> {
  const horizonDays = opts.horizonDays ?? 1; // include topics due within a day
  const limit = Math.min(opts.limit ?? 8, 25);
  const now = new Date();
  const horizon = new Date(now.getTime() + horizonDays * 86_400_000);

  const rows = await prisma.reviewState.findMany({
    where: {
      userId,
      due: { lte: horizon },
      ...(opts.examCode ? { exam: { code: opts.examCode } } : {}),
    },
    orderBy: { due: "asc" },
    take: limit,
    include: {
      topic: { select: { id: true, code: true, name: true, subject: { select: { name: true } } } },
      exam: { select: { code: true } },
    },
  });

  return rows.map((r) => {
    const elapsedDays = r.lastReview
      ? Math.max(0, (now.getTime() - r.lastReview.getTime()) / 86_400_000)
      : 0;
    return {
      topicId: r.topic.id,
      topicCode: r.topic.code,
      topicName: r.topic.name,
      subjectName: r.topic.subject.name,
      examCode: r.exam.code,
      due: r.due,
      overdueDays: Math.round((now.getTime() - r.due.getTime()) / 86_400_000),
      retention: Math.round(retrievability(elapsedDays, r.stability) * 100) / 100,
      reps: r.reps,
      lapses: r.lapses,
    };
  });
}
