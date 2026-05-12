// POST /api/attempts/[id]/translate
//
// Translates the questions of a specific attempt (used by results / review
// pages where the route key is the attempt id rather than the mock id).
// Delegates to the same cache + translator pipeline used by mocks.

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { bad, notFound, ok, parseBody, serverError } from "@/lib/http";
import { locales, type Locale } from "@/lib/i18n";
import { translateBatch, MAX_BATCH_SIZE } from "@/lib/ai/translator";
import { findTranslations, upsertTranslation } from "@/lib/db/questionTranslations";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  locale: z.enum(locales as unknown as [string, ...string[]]),
  questionIds: z.array(z.string()).max(20).optional(),
});

// Hard cap on per-request uncached translations, see mocks/translate route.
const PER_REQUEST_MISS_CAP = 20;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await parseBody(req, Body);
    const locale = body.locale as Locale;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const rl = await checkRateLimit("explain", ip);
    if (!rl.ok) return rateLimited(rl);

    const attempt = await prisma.attempt.findUnique({
      where: { id },
      select: {
        id: true,
        mock: { select: { questionIds: true } },
      },
    });
    if (!attempt) return notFound("attempt");

    const allQids = attempt.mock.questionIds ?? [];
    const qIds = body.questionIds
      ? body.questionIds.filter((qid) => allQids.includes(qid))
      : allQids;
    if (qIds.length === 0) return ok({ locale, questions: [] });

    if (locale === "en") {
      const qs = await prisma.question.findMany({
        where: { id: { in: qIds } },
        select: { id: true, body: true, options: true, solution: true },
      });
      const out = qIds
        .map((qid) => qs.find((q) => q.id === qid))
        .filter((q): q is NonNullable<typeof q> => !!q)
        .map((q) => ({
          id: q.id,
          body: q.body,
          options: Array.isArray(q.options) ? q.options : [],
          solution: q.solution,
        }));
      return ok({ locale, questions: out });
    }

    const cached = await findTranslations(qIds, locale);
    const missIds = qIds.filter((qid) => !cached.has(qid)).slice(0, PER_REQUEST_MISS_CAP);
    if (missIds.length > 0) {
      const sources = await prisma.question.findMany({
        where: { id: { in: missIds } },
        select: { id: true, body: true, options: true, solution: true },
      });
      // Parallelise batches — same reasoning as /api/mocks/[id]/translate.
      const MAX_PARALLEL_BATCHES = 5;
      const batches: typeof sources[] = [];
      for (let i = 0; i < sources.length; i += MAX_BATCH_SIZE) {
        batches.push(sources.slice(i, i + MAX_BATCH_SIZE));
      }
      for (let i = 0; i < batches.length; i += MAX_PARALLEL_BATCHES) {
        const wave = batches.slice(i, i + MAX_PARALLEL_BATCHES);
        const results = await Promise.allSettled(
          wave.map((slice) =>
            translateBatch({
              locale,
              questions: slice.map((q) => ({
                id: q.id,
                body: q.body,
                options: Array.isArray(q.options) ? (q.options as any) : [],
                solution: q.solution,
              })),
            }),
          ),
        );
        const ok = results
          .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof translateBatch>>> => r.status === "fulfilled")
          .map((r) => r.value);
        for (const f of results.filter((r) => r.status === "rejected")) {
          console.error("[attempts/translate] batch failed", (f as PromiseRejectedResult).reason);
        }
        for (const { translated } of ok) {
          await Promise.all(
            translated.map(async (t) => {
              cached.set(t.id, {
                questionId: t.id,
                locale,
                body: t.body,
                options: t.options,
                solution: t.solution,
              });
              try {
                await upsertTranslation({
                  questionId: t.id,
                  locale,
                  body: t.body,
                  options: t.options,
                  solution: t.solution,
                  generator: "claude-sonnet-4-5/translator-v1",
                });
              } catch (err) {
                console.error("[attempts/translate] upsert failed", t.id, err);
              }
            }),
          );
        }
      }
    }

    const questions = qIds
      .map((qid) => cached.get(qid))
      .filter((q): q is NonNullable<typeof q> => !!q)
      .map((q) => ({
        id: q.questionId,
        body: q.body,
        options: q.options,
        solution: q.solution,
      }));

    return ok({ locale, questions });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}
