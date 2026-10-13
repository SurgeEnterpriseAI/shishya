// Night pre-translation (13 Oct 2026): which questions Surge's server should
// translate next, and storing what it got right. See translateBatchLocal in
// ai/translator.ts for why this runs at night on our own server.
//
// Work = (language, exam) pairs students really asked for in the last 30
// days (QuestionTranslation rows, at least 5), times that exam's questions
// served in attempts in the last 30 days, most-served first, not yet in the
// cache. 60% of the questions served in a month go to more than one student
// (13 Oct read: 8,794 of 14,785), so a question translated tonight is
// usually asked for again.
//
// Only the languages the eval passed (Tamil, Telugu, Gujarati, Kannada);
// PRETRANSLATE_LOCALES overrides. A question whose local translation fails
// the check is marked in Question.metadata.pretranslateReject[locale] and
// not tried again; Haiku translates it live if a student asks.

import { prisma } from "@/lib/db/prisma";
import { MAX_BATCH_SIZE, translateBatchLocal } from "@/lib/ai/translator";
import { upsertTranslation } from "@/lib/db/questionTranslations";

export const PRETRANSLATE_LOCALES = (process.env.PRETRANSLATE_LOCALES ?? "ta,te,gu,kn")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const PRETRANSLATE_GENERATOR = "local-qwen27b/translator-v1";

export interface PretranslateBatch {
  locale: string;
  questions: Array<{ id: string; body: string; options: Array<{ key: string; text: string }>; solution: string }>;
}

/** The next batches to translate, best first (at most `maxQuestions` questions). */
export async function pickPretranslateWork(maxQuestions: number): Promise<PretranslateBatch[]> {
  if (!PRETRANSLATE_LOCALES.length || maxQuestions <= 0) return [];
  const rows = await prisma.$queryRawUnsafe<Array<{ locale: string; id: string }>>(
    `WITH demand AS (
        SELECT qt.locale, qu."examId", count(*)::int AS n
          FROM "QuestionTranslation" qt JOIN "Question" qu ON qu.id = qt."questionId"
         WHERE qt."createdAt" >= now() - interval '30 days' AND qt.locale = ANY($1::text[])
         GROUP BY 1, 2 HAVING count(*) >= 5
     ), served AS (
        SELECT qid, count(*)::int AS c
          FROM (SELECT unnest(m."questionIds") AS qid
                  FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
                 WHERE a."createdAt" >= now() - interval '30 days') x
         GROUP BY qid
     )
     SELECT d.locale, q.id
       FROM demand d
       JOIN "Question" q ON q."examId" = d."examId"
       JOIN served s ON s.qid = q.id
      WHERE q.language = 'EN'
        AND q.body !~ '[ऀ-෿]'
        AND (q.metadata -> 'pretranslateReject' -> d.locale) IS NULL
        AND NOT EXISTS (SELECT 1 FROM "QuestionTranslation" t WHERE t."questionId" = q.id AND t.locale = d.locale)
      ORDER BY s.c * d.n DESC, q.id
      LIMIT $2`,
    PRETRANSLATE_LOCALES,
    maxQuestions,
  );
  if (!rows.length) return [];
  const qs = await prisma.question.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.id))] } },
    select: { id: true, body: true, options: true, solution: true },
  });
  const byId = new Map(qs.map((q) => [q.id, q]));
  const byLocale = new Map<string, PretranslateBatch["questions"]>();
  for (const r of rows) {
    const q = byId.get(r.id);
    if (!q || !Array.isArray(q.options)) continue;
    const list = byLocale.get(r.locale) ?? [];
    list.push({ id: q.id, body: q.body, options: q.options as any, solution: q.solution ?? "" });
    byLocale.set(r.locale, list);
  }
  // Interleave languages so one busy language never starves the others.
  const batches: PretranslateBatch[] = [];
  const queues = [...byLocale].map(([locale, list]) => ({ locale, list }));
  while (queues.some((x) => x.list.length)) {
    for (const x of queues) {
      if (!x.list.length) continue;
      batches.push({ locale: x.locale, questions: x.list.splice(0, MAX_BATCH_SIZE) });
    }
  }
  return batches;
}

/** Translate one batch on our server and store the clean questions. */
export async function runPretranslateBatch(b: PretranslateBatch): Promise<{ stored: number; rejected: number; ms: number }> {
  const r = await translateBatchLocal({ locale: b.locale as any, questions: b.questions });
  for (const t of r.accepted) {
    await upsertTranslation({ questionId: t.id, locale: b.locale, body: t.body, options: t.options, solution: t.solution, generator: PRETRANSLATE_GENERATOR });
  }
  for (const x of r.rejected) {
    await prisma.$executeRawUnsafe(
      `UPDATE "Question"
          SET metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{pretranslateReject}',
                COALESCE(metadata -> 'pretranslateReject', '{}'::jsonb) || jsonb_build_object($2::text, $3::text),
                true)
        WHERE id = $1`,
      x.id,
      b.locale,
      `${new Date().toISOString().slice(0, 10)} ${x.reason}`,
    );
  }
  if (r.rejected.length) console.warn(`[pretranslate] ${b.locale}: ${r.rejected.length} of ${b.questions.length} not stored (${r.rejected.map((x) => x.reason).join("; ")})`);
  return { stored: r.accepted.length, rejected: r.rejected.length, ms: r.latencyMs };
}
