// POST /api/attempts/:id/answer — record answers during the attempt.
// We accept partial submissions so the UI can save progress as the student answers.
//
// Body is either ONE answer (legacy shape, kept for compatibility) or a
// batch `{ answers: [...] }` of 1..200 — the player flushes its whole dirty
// set in one request, so a 4G blink retries one call instead of N, and a
// 100-Q resume is one UPDATE instead of 100 lambdas each rewriting the
// answers jsonb (audit 11 Sep 2026).
//
// The response echoes `acked: [{ questionId, updatedAt }]` — the exact
// versions that were persisted — so the client can drop from its dirty set
// only what the server really has, and keep anything edited since.

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, ok, serverError, unauth, parseBody } from "@/lib/http";

const Single = z.object({
  questionId: z.string().min(1),
  chosen: z.string().max(40).nullable(),
  timeSec: z.number().min(0).transform((n) => Math.min(n, 86400)),
  marked: z.boolean().optional(),
  // Client-generated stamp of the last change. Stored as sent, never
  // overwritten with server time: the player's mount-merge compares client
  // stamps against client stamps, and a server-stamped row would make every
  // on-device answer look stale after a resume.
  updatedAt: z.number().int().nonnegative().optional(),
});
const Body = z.union([Single, z.object({ answers: z.array(Single).min(1).max(200) })]);

/** Stable code the player recognises: not found, not yours, or no longer
 *  IN_PROGRESS (submitted / auto-submitted / abandoned). */
import { ATTEMPT_NOT_WRITABLE } from "@/lib/attempts-sync";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const { id } = await ctx.params;
    const body = await parseBody(req, Body);

    // Normalise to a list; de-dupe by questionId keeping the LAST occurrence
    // (the newest version the client queued).
    const list = "answers" in body ? body.answers : [body];
    const byId = new Map<
      string,
      { questionId: string; chosen: string | null; timeSec: number; marked: boolean; updatedAt: number }
    >();
    const now = Date.now();
    for (const a of list) {
      byId.set(a.questionId, {
        questionId: a.questionId,
        chosen: a.chosen,
        timeSec: a.timeSec,
        marked: a.marked ?? false,
        updatedAt: a.updatedAt ?? now,
        // 'correct' is computed only at submit, not here.
      });
    }
    const records = [...byId.values()];
    const recordsJson = JSON.stringify(records);

    // Single round-trip: merge these answers into the stored list and
    // atomically update — all in one UPDATE. Previously we did findUnique →
    // mutate JSON in JS → update, which cost ~2× Asia-DB latency (1.6s+).
    // With 100 saves per long mock that was a major contributor to
    // mock-taking sluggishness.
    //
    // 26 Sep 2026: an attempt now starts with its paper persisted as one
    // skeleton row per served question, each carrying its `slot`
    // (src/lib/served-paper.ts). The old UPDATE dropped every row for the
    // saved ids and appended the new records, which would have lost the
    // slot (and the paper's order) on the first save. Now a saved record is
    // merged INTO its existing row in place (elem || rec: the new chosen /
    // timeSec / marked / updatedAt win, the row's slot stays), rows keep
    // their order, and only a record for a question with no row yet (an
    // attempt started before the paper was persisted) is appended.
    //
    // Authorisation: the WHERE clause includes userId + status check, so
    // the row only updates for the legitimate owner of an in-progress
    // attempt. If 0 rows match (wrong user, already submitted, or no
    // such attempt) updateCount === 0 and we surface that as a 400.
    const updated = await prisma.$executeRaw(Prisma.sql`
      UPDATE "Attempt"
      SET "answers" = (
        SELECT COALESCE(
          jsonb_agg(CASE WHEN n.rec IS NULL THEN o.elem ELSE o.elem || n.rec END ORDER BY o.ord),
          '[]'::jsonb)
          FROM jsonb_array_elements(COALESCE("answers", '[]'::jsonb)) WITH ORDINALITY AS o(elem, ord)
          LEFT JOIN jsonb_array_elements(${recordsJson}::jsonb) AS n(rec)
            ON n.rec->>'questionId' = o.elem->>'questionId'
      ) || (
        SELECT COALESCE(jsonb_agg(n.rec), '[]'::jsonb)
          FROM jsonb_array_elements(${recordsJson}::jsonb) AS n(rec)
         WHERE NOT EXISTS (
           SELECT 1 FROM jsonb_array_elements(COALESCE("answers", '[]'::jsonb)) AS o(elem)
            WHERE o.elem->>'questionId' = n.rec->>'questionId')
      ),
          "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "userId" = ${session.user.id}
        AND "status" = 'IN_PROGRESS'
    `);

    if (updated === 0) {
      return bad(ATTEMPT_NOT_WRITABLE);
    }
    return ok({
      saved: true,
      acked: records.map((r) => ({ questionId: r.questionId, updatedAt: r.updatedAt })),
    });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}
