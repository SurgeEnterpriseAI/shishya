// POST /api/mocks/[id]/translate
//
// Returns the questions of a mock translated into the requested locale.
// Hits the QuestionTranslation cache first for each questionId; only the
// misses go to Anthropic via translateBatch(). Newly translated rows are
// persisted so the next caller for the same (questionId, locale) is free.
//
// Body: { locale: "hi" | "te" | ... }
// Response: { questions: [{ id, body, options }, ...], locale }
//
// 27 Sep 2026 (security): no `solution` in the response. This route needs
// no sign-in and runs DURING a mock, so returning the explanation let anyone
// read every answer before submitting. The player only ever used body and
// options; translated solutions are still cached (upsertTranslation) for
// the attempt-owned results route (/api/attempts/[id]/translate).
//
// 2 Oct 2026 (honest words, no provider text): when every batch failed, this
// route appended the first error's message to its 503 — on an empty Anthropic
// credit that is the provider's "Your credit balance is too low … Plans &
// Billing", shown in the mock player under the language menu (about 39
// translations per outage). The reply is now a fixed line: code
// "ai-unavailable" when the AI was unavailable, a plain "could not be
// translated" line otherwise. The provider's detail stays in the server log
// (the console.error below). A request whose translation failed because the
// AI was unavailable writes one analytics row (never for a Class 1-7 mock).
// Helper: src/lib/ai/unavailable-reply.ts. Lines: src/lib/ai-unavailable-copy.ts.

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { bad, notFound, ok, parseBody, serverError } from "@/lib/http";
import { locales, type Locale } from "@/lib/i18n";
import { translateBatch, MAX_BATCH_SIZE } from "@/lib/ai/translator";
import { findTranslations, upsertTranslation } from "@/lib/db/questionTranslations";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { AI_UNAVAILABLE_COPY } from "@/lib/ai-unavailable-copy";
import {
  aiUnavailableReason,
  aiUnavailableReply,
  examCodeOfMock,
  isOwnBadRequest,
  recordAiUnavailable,
  requestIdentity,
  schoolBandOfExamCode,
} from "@/lib/ai/unavailable-reply";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  locale: z.enum(locales as unknown as [string, ...string[]]),
  // Optional subset — translate only these question IDs (must belong to
  // the mock). Used by the client to lazy-translate a window around the
  // student's current question instead of the whole mock upfront, which
  // for a 100-question mock would blow Vercel's 60-second runtime limit.
  questionIds: z.array(z.string()).max(20).optional(),
});

// Server-side hard cap on uncached questions translated per request.
// 8 = 2 parallel batches of 4 (MAX_BATCH_SIZE), each ~10-15s on Haiku,
// so we sit comfortably under Vercel's 60s function timeout even when
// every question is a cache miss. The client requests more chunks via
// the `questionIds` param as the student navigates.
const PER_REQUEST_MISS_CAP = 8;

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

    // If the client supplied a narrowed list, intersect with the mock's
    // question set so callers can't sneak unrelated question IDs in.
    const allQids = mock.questionIds;
    const qIds = body.questionIds
      ? body.questionIds.filter((qid) => allQids.includes(qid))
      : allQids;
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
        }));
      return ok({ locale, questions: out });
    }

    // The first batch error: it decides WHICH fixed line the student reads
    // when every batch fails (AI unavailable, or not). Its text is logged
    // below and never returned (2 Oct 2026).
    let firstBatchError: any = null;

    // 1) Cache lookup.
    const cached = await findTranslations(qIds, locale);

    // 2) Fetch source for misses — capped at PER_REQUEST_MISS_CAP so we
    // never bust the 60s Vercel runtime. The client polls again with a
    // narrower `questionIds` payload as the student navigates.
    const missIds = qIds.filter((qid) => !cached.has(qid)).slice(0, PER_REQUEST_MISS_CAP);
    if (missIds.length > 0) {
      const sources = await prisma.question.findMany({
        where: { id: { in: missIds } },
        select: { id: true, body: true, options: true, solution: true },
      });

      // 3) Translate in batches — IN PARALLEL. A 100-question mock would
      // otherwise serialise 4× ~5s Anthropic calls = 20s of waiting. Firing
      // all batches at once cuts wall-time to one batch's latency (~5-8s).
      // Anthropic's rate limit on Tier 4 lets us comfortably parallelise 4-5
      // concurrent requests; we cap at MAX_PARALLEL_BATCHES to stay safe.
      const MAX_PARALLEL_BATCHES = 5;
      const batches: typeof sources[] = [];
      for (let i = 0; i < sources.length; i += MAX_BATCH_SIZE) {
        batches.push(sources.slice(i, i + MAX_BATCH_SIZE));
      }
      for (let i = 0; i < batches.length; i += MAX_PARALLEL_BATCHES) {
        const wave = batches.slice(i, i + MAX_PARALLEL_BATCHES);
        // allSettled — a single batch failing (e.g. JSON truncation on a
        // passage-heavy reading-comprehension chunk) shouldn't kill the
        // whole request. The failed batch's questions just stay in the
        // source language; the rest of the mock gets translated.
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
          const reason = (f as PromiseRejectedResult).reason;
          // Log enough to debug — Anthropic SDK errors carry useful
          // detail in .message / .status / .error fields.
          console.error("[mocks/translate] batch failed", {
            message: reason?.message,
            status: reason?.status,
            type: reason?.error?.type,
            error: reason?.error?.error,
          });
          firstBatchError = firstBatchError ?? reason;
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
                console.error("[mocks/translate] upsert failed", t.id, err);
              }
            }),
          );
        }
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
      }));

    // 2 Oct 2026: a batch that failed because the AI was unavailable is one
    // failed AI request by a person — one analytics row, whether or not some
    // questions came from the store. Read on this failure path only: who
    // asked, and the mock's exam (no row for Class 1-7).
    const unavailable = firstBatchError ? aiUnavailableReason(firstBatchError) : null;
    if (unavailable) {
      const session = await auth().catch(() => null);
      recordAiUnavailable({
        feature: "translate",
        reason: unavailable,
        userId: session?.user?.id ?? null,
        ...requestIdentity(req),
        school: schoolBandOfExamCode(await examCodeOfMock(mock.id)),
      });
    }

    // Silent-failure guard: if the caller asked us to translate some
    // questions and we couldn't translate ANY of them (every batch
    // failed — the AI unavailable, malformed JSON), answer 503 with a
    // fixed line so the player can say so. Never the error's own text:
    // on an empty credit that is the provider's billing message. The
    // detail for debugging is in the server log above.
    const requestedMissCount = qIds.filter((qid) => !cached.has(qid)).length;
    if (requestedMissCount === qIds.length && qIds.length > 0) {
      if (unavailable) return aiUnavailableReply("translate");
      return bad(AI_UNAVAILABLE_COPY.translationFailed, 503);
    }

    return ok({ locale, questions });
  } catch (err: any) {
    // Only our own validation errors carry a message for the student (2 Oct 2026).
    if (isOwnBadRequest(err)) return bad(err.message);
    return serverError(err);
  }
}
