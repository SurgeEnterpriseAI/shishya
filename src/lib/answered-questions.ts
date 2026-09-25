// DB side of "seen = answered" (25 Sep 2026). Server only. Pure helpers
// (SeenHistory, the pickers) are in src/lib/question-pick.ts.
//
// Why: src/lib/seen-questions.ts counts a question as seen when it was in
// ANY mock the student opened in the window — answered or not. The
// September read found 41 of 313 repeat mocks re-served only questions the
// student had never answered (mocks left at question 1), and the builder's
// "seen N of M" counted them too. Here:
//   answered — Attempt.answers holds a saved choice for it (a non-empty
//              `chosen`), in an attempt started inside the window, and the
//              id is one of that attempt's mock's questions (the answer
//              route does not check membership, so we do).
//   shown    — it was in the mock of an attempt started inside the window
//              but never answered in the window.
// The pickers take answered as "seen" (repeats, bank numbers) and put shown
// after every never-shown question and before any answered one.
//
// Cost: ONE query per call, bounded by the student's own attempts in the
// window (Attempt(userId, mockId) index → Mock primary key), exactly like
// getSeenQuestions; the answers array of each attempt is read once. The
// cutoff is bound as a JS Date (never an interval string — known Prisma
// trap).
//
// Failure contract (same as seen-questions.ts): NULL on any DB error,
// never an empty result. An empty history means "answered nothing", which
// callers turn into "answered 0 of M" — a number we would not have. Pickers
// use `history ?? new Map()` so a DB blip still builds a mock without
// exclusion, and report no bank numbers.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { seenCutoff } from "@/lib/seen-questions";
import type { SeenHistory, SeenMap } from "@/lib/question-pick";
import type { DiffCounts } from "@/lib/mock-fill";

// The window's attempts on this exam, and the answered ids per attempt.
// `chosen` is a string for MCQ; JSON null (and "") means not answered.
function attemptsCte(userId: string, examId: string, cutoff: Date): Prisma.Sql {
  return Prisma.sql`
    att AS (
      SELECT a."startedAt" AS at, a.answers::jsonb AS answers, m."questionIds" AS qids
      FROM "Attempt" a
      JOIN "Mock" m ON m.id = a."mockId"
      WHERE a."userId" = ${userId}
        AND m."examId" = ${examId}
        AND a."startedAt" >= ${cutoff}
    ),
    answered AS (
      SELECT e->>'questionId' AS qid, MAX(att.at) AS at
      FROM att
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(att.answers) = 'array' THEN att.answers ELSE '[]'::jsonb END
      ) AS e
      WHERE NULLIF(NULLIF(btrim(e->>'chosen'), ''), '[]') IS NOT NULL
        AND (e->>'questionId') = ANY(att.qids)
      GROUP BY 1
    )`;
}

/** answered / shown-only maps for this student on this exam in the window.
 *  NULL on any DB error (see header). */
export async function getSeenHistory(
  userId: string,
  examId: string,
  cutoff: Date = seenCutoff(),
): Promise<SeenHistory | null> {
  try {
    const rows = await prisma.$queryRaw<{ questionId: string; shownAt: Date | string; answeredAt: Date | string | null }[]>`
      WITH ${attemptsCte(userId, examId, cutoff)},
      shown AS (
        SELECT u.qid, MAX(att.at) AS at
        FROM att
        CROSS JOIN LATERAL unnest(att.qids) AS u(qid)
        GROUP BY u.qid
      )
      SELECT s.qid AS "questionId", s.at AS "shownAt", an.at AS "answeredAt"
      FROM shown s
      LEFT JOIN answered an ON an.qid = s.qid`;
    return historyFromRows(rows);
  } catch (err) {
    console.error("[shishya] getSeenHistory failed — picking without seen-exclusion, no bank numbers:", err);
    return null;
  }
}

/** Rows → SeenHistory. An answered id never appears in `shown`. Exported
 *  for tests. */
export function historyFromRows(
  rows: readonly { questionId: string; shownAt: Date | string; answeredAt: Date | string | null }[],
): SeenHistory {
  const answered: SeenMap = new Map();
  const shown: SeenMap = new Map();
  for (const r of rows) {
    if (r.answeredAt != null) answered.set(r.questionId, new Date(r.answeredAt).getTime());
    else shown.set(r.questionId, new Date(r.shownAt).getTime());
  }
  return { answered, shown };
}

/** Build-mock page: how many VALIDATED (not withdrawn) questions of each
 *  topic this student has ANSWERED in the window, per difficulty.
 *  topicId -> counts. One query. NULL on DB error so the page hides the
 *  answered copy instead of asserting "answered 0 of M". pyqOnly (the
 *  builder's ?pyq=1 mode): PYQ-pattern questions only. */
export async function getAnsweredCountByTopic(
  userId: string,
  examId: string,
  cutoff: Date = seenCutoff(),
  opts: { pyqOnly?: boolean } = {},
): Promise<Map<string, DiffCounts> | null> {
  try {
    const rows = await prisma.$queryRaw<{ topicId: string; difficulty: string; n: number | bigint }[]>`
      WITH ${attemptsCte(userId, examId, cutoff)}
      SELECT q."topicId" AS "topicId", q.difficulty::text AS difficulty, COUNT(DISTINCT q.id)::int AS n
      FROM answered an
      JOIN "Question" q ON q.id = an.qid
        AND q.validated = TRUE
        AND NOT ('rejected' = ANY(q.tags))
        ${opts.pyqOnly ? Prisma.sql`AND q.source = 'PYQ'` : Prisma.empty}
      GROUP BY 1, 2`;
    const out = new Map<string, DiffCounts>();
    for (const r of rows) {
      const c = out.get(r.topicId) ?? { EASY: 0, MEDIUM: 0, HARD: 0 };
      if (r.difficulty === "EASY" || r.difficulty === "MEDIUM" || r.difficulty === "HARD") c[r.difficulty] += Number(r.n);
      out.set(r.topicId, c);
    }
    return out;
  } catch (err) {
    console.error("[shishya] getAnsweredCountByTopic failed — answered copy hidden:", err);
    return null;
  }
}
