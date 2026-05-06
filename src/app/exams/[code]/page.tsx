// /exams/:code — exam landing page (bilingual).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { StartMockButton } from "./StartMockButton";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/exams`);
  const userId = session.user.id;
  const { code } = await params;
  const { locale, t } = await getT();

  const exam = await prisma.exam.findUnique({
    where: { code },
    include: {
      subjects: {
        orderBy: { orderIdx: "asc" },
        include: {
          topics: {
            where: { parentId: null },
            orderBy: { orderIdx: "asc" },
            include: { children: true },
          },
        },
      },
    },
  });
  if (!exam) notFound();

  const [enrollment, weakness, recent, validatedQuestionCount] = await Promise.all([
    prisma.enrollment.findUnique({
      where: { userId_examId: { userId, examId: exam.id } },
    }),
    prisma.weaknessMap.findMany({
      where: { userId, examId: exam.id },
      include: { topic: true },
      orderBy: { masteryScore: "asc" },
      take: 5,
    }),
    prisma.attempt.findMany({
      where: { userId, mock: { examId: exam.id } },
      include: { mock: true },
      orderBy: { startedAt: "desc" },
      take: 3,
    }),
    prisma.question.count({ where: { examId: exam.id, validated: true } }),
  ]);

  const isEnrolled = !!enrollment;
  const hasContent = validatedQuestionCount > 0;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/dashboard" className="hover:text-ink-800">{t("nav.dashboard")}</Link> · {t("nav.exams")} · {exam.shortName}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{exam.shortName}</h1>
        <p className="mt-1 text-sm text-ink-600">{exam.name}</p>
        <p className="mt-4 max-w-3xl text-sm text-ink-700">{exam.description}</p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-600">
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.totalQuestions} {t("exam.totalQs")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.totalMarks} {t("exam.marks")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.durationMin} {t("exam.minutes")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">
            {t("exam.negative")}: {exam.negativeMark === 0 ? t("exam.no.negative") : `−${exam.negativeMark}`}
          </span>
        </div>

        {/* Action panel */}
        <div className="mt-8 rounded-md border border-ink-200 bg-white p-6">
          {!hasContent ? (
            <p className="text-sm text-ink-600">{t("exam.no.content")}</p>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {isEnrolled ? t("exam.action.continue") : t("exam.action.start")}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {isEnrolled ? t("exam.action.continue.body") : t("exam.action.start.body")}
                </p>
              </div>
              <StartMockButton
                examCode={exam.code}
                hasHistory={isEnrolled && recent.length > 0}
                labels={{
                  adaptive: t("exam.cta.adaptive"),
                  diagnostic: t("exam.cta.diagnostic"),
                  firstDiagnostic: t("exam.cta.firstDiagnostic"),
                  building: t("exam.cta.building"),
                }}
              />
            </div>
          )}
        </div>

        {/* Weakness map */}
        {weakness.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.weakest")}</h2>
            <ul className="mt-3 space-y-2">
              {weakness.map((w) => (
                <li key={w.id} className="rounded-md border border-ink-200 bg-white p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-ink-900">{w.topic.name}</p>
                    <p className="text-xs text-ink-500">
                      {w.correctCount}/{w.attemptsCount}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full bg-saffron-500"
                      style={{ width: `${Math.round(w.masteryScore * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Syllabus */}
        <section id="syllabus" className="mt-10 scroll-mt-20">
          <h2 className="text-base font-semibold text-ink-800">{t("exam.syllabus")}</h2>
          <div className="mt-4 space-y-6">
            {exam.subjects.map((s) => (
              <div key={s.id}>
                <h3 className="text-sm font-semibold text-ink-900">{s.name}</h3>
                <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {s.topics.map((tp) => (
                    <li
                      key={tp.id}
                      className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700"
                    >
                      <p className="font-medium text-ink-800">{tp.name}</p>
                      {tp.description && (
                        <p className="mt-0.5 text-xs text-ink-500 line-clamp-2">{tp.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
