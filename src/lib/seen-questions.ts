// DB side of seen-exclusion (server only). Pure helpers are in
// src/lib/question-pick.ts.
//
// Source of truth for "seen": Attempt → Mock.questionIds. Every path
// that shows a question creates an Attempt first (src/app/mocks/[id]/
// page.tsx creates the row, then renders ALL of the mock's questions),
// so any attempt — IN_PROGRESS, ABANDONED, SUBMITTED, AUTO_SUBMITTED —
// means the student had every question of that mock on screen. The
// old helper read the answers JSON of submitted attempts only, so an
// opened-but-abandoned mock counted as never seen; that is one reason
// students saw the same questions again.
//
// Cost: ONE query per call, bounded by the caller's own attempts in the
// window — Attempt(userId, mockId) index → Mock primary key → unnest of
// that mock's ids, grouped in the DB. No new index needed. The cutoff is
// bound as a JS Date (never an interval string — known Prisma trap).
//
// Failure contract: both helpers return NULL (never an empty map) when
// the query fails. An empty map means "this student has seen nothing",
// which callers turn into "You have seen 0 of M" — a number we do not
// have. Pickers use `seen ?? new Map()` so a DB blip still produces a
// mock (without exclusion), but they must report no bank numbers and
// persist no config.seen; the build-mock page hides all seen copy.

import { prisma } from "@/lib/db/prisma";
import { SEEN_WINDOW_DAYS, type SeenMap } from "@/lib/question-pick";

export function seenCutoff(now: number = Date.now()): Date {
  return new Date(now - SEEN_WINDOW_DAYS * 86_400_000);
}

/** questionId -> last time the student opened a mock containing it, for
 *  this exam, inside the window. NULL on any DB error: the caller picks
 *  without exclusion (`seen ?? new Map()`) and reports no seen numbers,
 *  because an empty map would read as "seen 0 of M" — an invented fact. */
export async function getSeenQuestions(
  userId: string,
  examId: string,
  cutoff: Date = seenCutoff(),
): Promise<SeenMap | null> {
  try {
    const rows = await prisma.$queryRaw<{ questionId: string; lastSeenAt: Date | string }[]>`
      SELECT u.qid AS "questionId", MAX(a."startedAt") AS "lastSeenAt"
      FROM "Attempt" a
      JOIN "Mock" m ON m.id = a."mockId"
      CROSS JOIN LATERAL unnest(m."questionIds") AS u(qid)
      WHERE a."userId" = ${userId}
        AND m."examId" = ${examId}
        AND a."startedAt" >= ${cutoff}
      GROUP BY u.qid`;
    const map: SeenMap = new Map();
    for (const r of rows) map.set(r.questionId, new Date(r.lastSeenAt).getTime());
    return map;
  } catch (err) {
    console.error("[shishya] getSeenQuestions failed — picking without seen-exclusion, no bank numbers:", err);
    return null;
  }
}

/** Build-mock page: how many VALIDATED questions of each topic the student
 *  has seen in the window. topicId -> count. One query. NULL on DB error
 *  so the page hides the seen copy instead of asserting "seen 0 of M". */
export async function getSeenCountByTopic(
  userId: string,
  examId: string,
  cutoff: Date = seenCutoff(),
): Promise<Map<string, number> | null> {
  try {
    const rows = await prisma.$queryRaw<{ topicId: string; seen: number | bigint }[]>`
      SELECT q."topicId" AS "topicId", COUNT(DISTINCT q.id)::int AS seen
      FROM "Attempt" a
      JOIN "Mock" m ON m.id = a."mockId"
      CROSS JOIN LATERAL unnest(m."questionIds") AS u(qid)
      JOIN "Question" q ON q.id = u.qid AND q.validated = TRUE
      WHERE a."userId" = ${userId}
        AND m."examId" = ${examId}
        AND a."startedAt" >= ${cutoff}
      GROUP BY q."topicId"`;
    return new Map(rows.map((r) => [r.topicId, Number(r.seen)]));
  } catch (err) {
    console.error("[shishya] getSeenCountByTopic failed — seen copy hidden:", err);
    return null;
  }
}
