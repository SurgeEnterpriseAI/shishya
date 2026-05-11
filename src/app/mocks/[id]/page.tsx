// /mocks/:id — mock test player wrapper.
// Server component: gates auth, loads mock, then hands off to client player.

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { MockPlayer } from "./MockPlayer";

export default async function MockPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/dashboard`);
  const userId = session.user.id;
  const { id } = await params;

  const mock = await prisma.mock.findUnique({
    where: { id },
    include: { exam: { select: { code: true, shortName: true, marksPerQ: true, negativeMark: true } } },
  });
  if (!mock) notFound();
  if (mock.userId && mock.userId !== userId) redirect("/dashboard");

  const questions = await prisma.question.findMany({
    where: { id: { in: mock.questionIds } },
    include: { topic: { select: { code: true, name: true } } },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));
  const orderedQs = mock.questionIds
    .map((qid) => byId.get(qid))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => ({
      id: q.id,
      type: q.type,
      difficulty: q.difficulty,
      body: q.body,
      options: q.options as { key: string; text: string }[],
      topic: q.topic,
      language: q.language,
    }));

  // Find or create the in-progress attempt for this mock + user
  let attempt = await prisma.attempt.findFirst({
    where: { mockId: mock.id, userId, status: "IN_PROGRESS" },
  });
  if (!attempt) {
    attempt = await prisma.attempt.create({
      data: { mockId: mock.id, userId, status: "IN_PROGRESS", answers: [] },
    });
  }

  const durationMin = ((mock.config as any)?.durationMin as number | undefined) ?? 30;
  const config = mock.config as any;
  const { t } = await getT();

  return (
    <MockPlayer
      mock={{
        id: mock.id,
        title: mock.title,
        rationale: config?.rationale ?? null,
        examCode: mock.exam.code,
        examShort: mock.exam.shortName,
        durationMin,
        marksPerQ: mock.exam.marksPerQ,
        negativeMark: mock.exam.negativeMark,
      }}
      attemptId={attempt.id}
      startedAt={attempt.startedAt.toISOString()}
      questions={orderedQs}
      existingAnswers={(attempt.answers as any[]) ?? []}
      labels={{
        qOf: t("player.q.of"),
        mark: t("player.mark"),
        marked: t("player.marked"),
        prev: t("player.prev"),
        saveNext: t("player.saveNext"),
        reviewSubmit: t("player.reviewSubmit"),
        submitMock: t("player.submitMock"),
        sumAnswered: t("player.summary.answered"),
        sumMarked: t("player.summary.marked"),
        sumLeft: t("player.summary.left"),
        confirmTitle: t("player.confirm.title"),
        confirmBodyPrefix: t("player.confirm.body.prefix"),
        confirmBodyOf: t("player.confirm.body.of"),
        confirmBodyNote: t("player.confirm.body.note"),
        confirmKeep: t("player.confirm.keep"),
        confirmSubmit: t("player.confirm.submit"),
        confirmSubmitting: t("player.confirm.submitting"),
        submittingHint: t("player.submitting.hint"),
        marksPerQ: t("exam.marks"),
        negativeNone: t("exam.no.negative"),
      }}
    />
  );
}
