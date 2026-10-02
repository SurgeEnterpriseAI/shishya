// POST /api/explain — generate a step-by-step explanation for a question.
// Body: { questionId, studentChosen?, detailLevel? }
//
// 2 Oct 2026 (honest words, no provider text): when the Anthropic credit is
// empty the model call fails with HTTP 400 "Your credit balance is too low …
// Plans & Billing". The catch below read any `status === 400` as one of our
// own validation errors and returned its message, so students saw the
// provider's billing text under the Explain button (about 5 per outage). Now
// the classifier runs first: an AI-unavailable failure answers 503
// { code: "ai-unavailable", error: <the fixed line> } and writes one analytics
// row (never for a Class 1-7 question); only OUR validation errors still
// return their message; any other error is logged and answered 500.
// Helper: src/lib/ai/unavailable-reply.ts. Lines: src/lib/ai-unavailable-copy.ts.

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { explainSolution } from "@/lib/ai";
import { bad, notFound, ok, serverError, unauth, parseBody } from "@/lib/http";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { getLocale } from "@/lib/i18n-server";
import { explainUnavailableLine } from "@/lib/ai-unavailable-copy";
import {
  aiUnavailableReason,
  aiUnavailableReply,
  examCodeOfQuestion,
  isOwnBadRequest,
  recordAiUnavailable,
  requestIdentity,
  schoolBandOfExamCode,
} from "@/lib/ai/unavailable-reply";

const Body = z.object({
  questionId: z.string(),
  studentChosen: z.string().nullable().optional(),
  detailLevel: z.enum(["BRIEF", "STANDARD", "DEEP"]).optional(),
});

export async function POST(req: Request) {
  // Known to the catch: who asked, and which question (set as the try reaches them).
  let userId: string | null = null;
  let asked: { id: string; hasSolution: boolean } | null = null;
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    userId = session.user.id;
    const rl = await checkRateLimit("explain", session.user.id);
    if (!rl.ok) return rateLimited(rl);
    const body = await parseBody(req, Body);

    const q = await prisma.question.findUnique({ where: { id: body.questionId } });
    if (!q) return notFound("question");
    asked = { id: q.id, hasSolution: typeof q.solution === "string" && q.solution.trim().length > 0 };

    // Cookie-first locale (set by the per-question LangSwitcher); fall
    // back to the user's stored preferredLang for older sessions. The
    // explainer treats `language` as a free-form locale code so all 19
    // i18n locales (incl. Konkani, Assamese, Sanskrit, etc.) work —
    // Claude will produce an answer in that language regardless of
    // whether the Prisma Language enum has it.
    const cookieLocale = await getLocale();
    const user = cookieLocale === "en"
      ? await prisma.user.findUnique({ where: { id: session.user.id } })
      : null;
    const language = (cookieLocale && cookieLocale !== "en"
      ? cookieLocale
      : (user?.preferredLang ?? "EN")) as any;

    const explanation = await explainSolution({
      question: {
        id: q.id,
        topicId: q.topicId,
        topicCode: "", // not used by explainer
        difficulty: q.difficulty,
        body: q.body,
        options: q.options as any,
        answerKey: q.answerKey,
        solution: q.solution,
        language: q.language as any,
      },
      studentChosen: body.studentChosen ?? null,
      language,
      detailLevel: body.detailLevel ?? "STANDARD",
    });

    return ok({ explanation });
  } catch (err: any) {
    // 2 Oct 2026: classify BEFORE the status check — the empty-balance error
    // is a 400 too, and its message is the provider's billing text.
    const reason = aiUnavailableReason(err);
    if (reason) {
      console.error("[explain] AI unavailable:", reason, err?.status ?? "", String(err?.message ?? "").slice(0, 200));
      const hasSolution = asked?.hasSolution ?? true;
      recordAiUnavailable({
        feature: "explain",
        reason,
        userId,
        ...requestIdentity(req),
        alt: hasSolution ? "solution" : null,
        // No row for a Class 1-7 question, or when the question's scope cannot be read.
        school: schoolBandOfExamCode(asked ? await examCodeOfQuestion(asked.id) : null),
      });
      return aiUnavailableReply("explain", explainUnavailableLine(hasSolution));
    }
    // Only our own validation errors carry a message for the student.
    if (isOwnBadRequest(err)) return bad(err.message);
    return serverError(err);
  }
}
