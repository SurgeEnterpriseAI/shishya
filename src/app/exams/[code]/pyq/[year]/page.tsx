// /exams/:code/pyq/:year — PYQ paper landing page.
// Find-or-create a system Mock for this exam+year and offer "Start paper" CTA
// pointing to /mocks/[id]. Idempotent.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function PYQYearPage({
  params,
}: {
  params: Promise<{ code: string; year: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/exams`);
  const { code, year } = await params;
  const yearNum = parseInt(year, 10);
  if (!Number.isFinite(yearNum)) notFound();
  const { t } = await getT();

  const exam = await prisma.exam.findUnique({ where: { code } });
  if (!exam) notFound();

  const questions = await prisma.question.findMany({
    where: { examId: exam.id, source: "PYQ", pyqYear: yearNum, validated: true },
    include: { topic: { include: { subject: true } } },
    orderBy: { id: "asc" },
  });

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section className="container-prose py-10">
          <p className="text-xs text-ink-500">
            <Link href={`/exams/${code}`} className="hover:text-ink-800">{exam.shortName}</Link> · PYQ · {yearNum}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">{exam.shortName} — {yearNum}</h1>
          <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
            {t("exam.pyq.empty")}
          </p>
        </section>
      </main>
    );
  }

  // Find-or-create a system Mock backed by these question ids.
  const generatedBy = `system:pyq:${code}:${yearNum}`;
  let mock = await prisma.mock.findFirst({
    where: { examId: exam.id, userId: null, generatedBy },
  });

  if (!mock) {
    mock = await prisma.mock.create({
      data: {
        examId: exam.id,
        userId: null,
        type: "FULL",
        title: `${exam.shortName} — ${yearNum} (Previous Year)`,
        questionIds: questions.map((q) => q.id),
        generatedBy,
        config: {
          source: "PYQ",
          year: yearNum,
          durationMin: exam.durationMin,
          count: questions.length,
        } as any,
      },
    });
  } else if (mock.questionIds.length !== questions.length) {
    // Keep the mock in sync if PYQs were added/removed for this year.
    mock = await prisma.mock.update({
      where: { id: mock.id },
      data: { questionIds: questions.map((q) => q.id) },
    });
  }

  // Group preview by subject for the landing card.
  const bySubject = new Map<string, { name: string; count: number }>();
  for (const q of questions) {
    const subj = q.topic.subject;
    const cur = bySubject.get(subj.code) ?? { name: subj.name, count: 0 };
    cur.count += 1;
    bySubject.set(subj.code, cur);
  }
  const subjectRows = [...bySubject.entries()];

  // Has the user already attempted this paper?
  const userAttempt = await prisma.attempt.findFirst({
    where: { mockId: mock.id, userId: session.user.id },
    orderBy: { startedAt: "desc" },
    select: { id: true, status: true, scorePct: true, finishedAt: true },
  });

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${code}`} className="hover:text-ink-800">{exam.shortName}</Link> · {t("exam.pyq.title")} · {yearNum}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{exam.shortName} — {yearNum}</h1>
        <p className="mt-1 text-sm text-ink-600">
          {t("exam.pyq.title")} · {questions.length} {t("exam.pyq.questions")} · {exam.durationMin} {t("exam.minutes")}
        </p>

        <div className="mt-6 rounded-md border border-ink-200 bg-white p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {userAttempt?.status === "SUBMITTED" || userAttempt?.status === "AUTO_SUBMITTED"
                  ? t("exam.pyq.retake")
                  : userAttempt?.status === "IN_PROGRESS"
                  ? t("exam.pyq.resume")
                  : t("exam.pyq.start")}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {userAttempt?.scorePct != null
                  ? `${t("exam.rank.bestScore")}: ${userAttempt.scorePct.toFixed(1)}%`
                  : t("exam.pyq.startBody")}
              </p>
            </div>
            <Link href={`/mocks/${mock.id}`} className="btn-primary">
              {userAttempt?.status === "IN_PROGRESS" ? t("exam.pyq.resumeBtn") : t("exam.pyq.startBtn")}
            </Link>
          </div>

          {userAttempt && (userAttempt.status === "SUBMITTED" || userAttempt.status === "AUTO_SUBMITTED") && (
            <div className="mt-4 border-t border-ink-100 pt-3">
              <Link
                href={`/attempts/${userAttempt.id}/results`}
                className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
              >
                {t("exam.mocks.review")} →
              </Link>
            </div>
          )}
        </div>

        {subjectRows.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.pyq.breakdown")}</h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {subjectRows.map(([code, { name, count }]) => (
                <li key={code} className="rounded-md border border-ink-200 bg-white p-3">
                  <p className="text-sm font-medium text-ink-900">{name}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{count} {t("exam.pyq.questions")}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </main>
  );
}
