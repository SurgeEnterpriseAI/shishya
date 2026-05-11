// POST /api/mocks/[id]/translate
//
// Returns the questions of a mock translated into the requested locale.
// Hits the QuestionTranslation cache first for each questionId; only the
// misses go to Anthropic via translateBatch(). Newly translated rows are
// persisted so the next caller for the same (questionId, locale) is free.
//
// Body: { locale: "hi" | "te" | ... }
// Response: { questions: [{ id, body, options, solution }, ...], locale }

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
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await parseBody(req, Body);
    const locale = body.locale as Locale;

    // Rate-limit: translation is one of the heaviest user-triggered AI calls
    // on the platform. Reuse the explain bucket (~20/min/user) for parity.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const rl = await checkRateLimit("explain", ip);
    if (!rl.ok) return rateLimited(rl);

    const mock = await prisma.mock.findUnique({
      where: { id },
      select: { id: true, questionIds: true },
    });
    if (!mock) return notFound("mock");

    const qIds = mock.questionIds;
    if (qIds.length === 0) {
      return ok({ locale, questions: [] });
    }

    // Identity case: nothing to translate.
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

    // 1) Cache lookup.
    const cached = await findTranslations(qIds, locale);

    // 2) Fetch source for misses.
    const missIds = qIds.filter((qid) => !cached.has(qid));
    if (missIds.length > 0) {
      const sources = await prisma.question.findMany({
        where: { id: { in: missIds } },
        select: { id: true, body: true, options: true, solution: true },
      });

      // 3) Translate in batches.
      for (let i = 0; i < sources.length; i += MAX_BATCH_SIZE) {
        const slice = sources.slice(i, i + MAX_BATCH_SIZE).map((q) => ({
          id: q.id,
          body: q.body,
          options: Array.isArray(q.options) ? (q.options as any) : [],
          solution: q.solution,
        }));
        const { translated } = await translateBatch({ locale, questions: slice });

        // 4) Persist + populate cache map.
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
              console.error("[mocks/translate] upsert failed", t.id, err);
            }
          }),
        );
      }
    }

    // 5) Compose response in original question order.
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
