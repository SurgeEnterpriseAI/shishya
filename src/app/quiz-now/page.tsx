// /quiz-now?examCode=X — direct, chat-free path into a warmup mock.
//
// Why a separate route: the AI tutor takes 3-8s to respond even after
// our latency fix. For brand-new signups picking an exam from the
// First-Time Dashboard, every extra second of "Thinking..." kills the
// conversion. This route builds a 10-Q warmup deterministically
// (no LLM call), saves the Mock, redirects straight to /mocks/[id].
// End-to-end ~1-2 seconds.
//
// The AI-tutor chat path remains available as a secondary option for
// students who want to talk to Shishya before taking a quiz.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createAdaptiveQuiz } from "@/lib/ai/adaptive-quiz";

export const dynamic = "force-dynamic";

export default async function QuizNowPage({
  searchParams,
}: {
  searchParams: Promise<{ examCode?: string; topic?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    const params = await searchParams;
    const back = `/quiz-now?examCode=${params.examCode ?? ""}${params.topic ? `&topic=${params.topic}` : ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  }

  const { examCode, topic } = await searchParams;
  if (!examCode) redirect("/dashboard?explore=1");

  // createAdaptiveQuiz now skips the slow full-mock generation, so this
  // resolves in ~1s (one Prisma read, rule-based 10-Q selection, one
  // Prisma write). If something goes wrong (e.g. exam has no validated
  // questions yet), the helper throws — we catch and fall back to the
  // exam landing page so the student still gets somewhere useful.
  try {
    const quiz = await createAdaptiveQuiz(session.user.id, examCode, topic);
    redirect(quiz.warmupUrl);
  } catch (err: any) {
    // NEXT_REDIRECT is how the redirect() above signals — let it through.
    if ((err as Error)?.message === "NEXT_REDIRECT") throw err;
    console.error("[quiz-now] failed to build warmup", err);
    redirect(`/exams/${examCode}?warmup-error=1`);
  }
}
