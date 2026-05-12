// Short-TTL cache for the /admin/insights operator dashboard.
//
// The page used to fire ~35 Prisma queries on every refresh, which with
// connection_limit=1 + Asia-region DB latency easily hit 5-10s. Admins
// don't need sub-second freshness; 30 seconds is more than fine for the
// growth/engagement/coverage panels. The "Active right now" panel
// stays uncached so /admin/insights still gives a live signal of online
// students.

import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

const TTL = 30; // seconds

interface ExamShortMeta {
  id: string;
  code: string;
  shortName: string;
}

export const getInsightsBulk = unstable_cache(
  async () => {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const since = (days: number) => new Date(now.getTime() - days * dayMs);
    const day1 = since(1);
    const day7 = since(7);
    const day30 = since(30);

    const safe = async <T,>(fn: () => Promise<T>, fb: T) => {
      try {
        return await fn();
      } catch (err) {
        console.error("[insights-cache] subquery failed", (err as Error)?.message);
        return fb;
      }
    };

    const [
      signupsToday,
      activeUsersToday,
      mocksSubmittedToday,
      chatMsgsToday,
      totalUsers,
      usersLast7d,
      usersLast30d,
      attempts7d,
      attempts30d,
      chatMsgs7d,
      chatMsgs30d,
      dauArr,
      wauArr,
      mauArr,
      totalExams,
      activeExams,
      totalQuestions,
      validatedQuestions,
      pendingAiQuestions,
      totalSystemMocks,
      topicsTotal,
      topicsWithNotes,
      assistantMsgsToday,
      assistantMsgs7d,
      assistantMsgs30d,
      usersWithEnrollment,
      usersWithMockSubmit,
      usersWithChat,
    ] = await Promise.all([
      safe(() => prisma.user.count({ where: { createdAt: { gte: day1 } } }), 0),
      safe(
        () =>
          prisma.attempt
            .groupBy({ by: ["userId"], where: { startedAt: { gte: day1 } } })
            .then((rows) => rows.length),
        0,
      ),
      safe(
        () =>
          prisma.attempt.count({
            where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { gte: day1 } },
          }),
        0,
      ),
      safe(() => prisma.chatMessage.count({ where: { createdAt: { gte: day1 } } }), 0),
      safe(() => prisma.user.count(), 0),
      safe(() => prisma.user.count({ where: { createdAt: { gte: day7 } } }), 0),
      safe(() => prisma.user.count({ where: { createdAt: { gte: day30 } } }), 0),
      safe(
        () =>
          prisma.attempt.count({
            where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { gte: day7 } },
          }),
        0,
      ),
      safe(
        () =>
          prisma.attempt.count({
            where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { gte: day30 } },
          }),
        0,
      ),
      safe(() => prisma.chatMessage.count({ where: { createdAt: { gte: day7 } } }), 0),
      safe(() => prisma.chatMessage.count({ where: { createdAt: { gte: day30 } } }), 0),
      safe(
        () =>
          prisma.attempt
            .groupBy({ by: ["userId"], where: { startedAt: { gte: day1 } } })
            .then((r) => r.length),
        0,
      ),
      safe(
        () =>
          prisma.attempt
            .groupBy({ by: ["userId"], where: { startedAt: { gte: day7 } } })
            .then((r) => r.length),
        0,
      ),
      safe(
        () =>
          prisma.attempt
            .groupBy({ by: ["userId"], where: { startedAt: { gte: day30 } } })
            .then((r) => r.length),
        0,
      ),
      safe(() => prisma.exam.count(), 0),
      safe(() => prisma.exam.count({ where: { active: true } }), 0),
      safe(() => prisma.question.count(), 0),
      safe(() => prisma.question.count({ where: { validated: true } }), 0),
      safe(
        () => prisma.question.count({ where: { source: "AI_GENERATED", validated: false } }),
        0,
      ),
      safe(() => prisma.mock.count({ where: { userId: null } }), 0),
      safe(() => prisma.topic.count(), 0),
      safe(() => prisma.topic.count({ where: { notes: { not: null } } }), 0),
      safe(
        () =>
          prisma.chatMessage.count({ where: { role: "ASSISTANT", createdAt: { gte: day1 } } }),
        0,
      ),
      safe(
        () =>
          prisma.chatMessage.count({ where: { role: "ASSISTANT", createdAt: { gte: day7 } } }),
        0,
      ),
      safe(
        () =>
          prisma.chatMessage.count({ where: { role: "ASSISTANT", createdAt: { gte: day30 } } }),
        0,
      ),
      safe(
        () => prisma.enrollment.groupBy({ by: ["userId"] }).then((r) => r.length),
        0,
      ),
      safe(
        () =>
          prisma.attempt
            .groupBy({
              by: ["userId"],
              where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
            })
            .then((r) => r.length),
        0,
      ),
      safe(
        () => prisma.chatSession.groupBy({ by: ["userId"] }).then((r) => r.length),
        0,
      ),
    ]);

    return {
      signupsToday,
      activeUsersToday,
      mocksSubmittedToday,
      chatMsgsToday,
      totalUsers,
      usersLast7d,
      usersLast30d,
      attempts7d,
      attempts30d,
      chatMsgs7d,
      chatMsgs30d,
      dauArr,
      wauArr,
      mauArr,
      totalExams,
      activeExams,
      totalQuestions,
      validatedQuestions,
      pendingAiQuestions,
      totalSystemMocks,
      topicsTotal,
      topicsWithNotes,
      assistantMsgsToday,
      assistantMsgs7d,
      assistantMsgs30d,
      usersWithEnrollment,
      usersWithMockSubmit,
      usersWithChat,
    };
  },
  ["admin-insights-bulk-v1"],
  { revalidate: TTL, tags: ["admin-insights"] },
);
