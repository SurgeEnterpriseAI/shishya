// /dashboard — student home after sign-in. Bilingual.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  const userId = session.user.id;
  const { t } = await getT();

  const [enrollments, recentAttempts, allExams] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId, active: true },
      include: { exam: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attempt.findMany({
      where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
      include: { mock: { include: { exam: { select: { code: true, shortName: true } } } } },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
    prisma.exam.findMany({
      where: { active: true },
      orderBy: { candidatesPerYear: "desc" },
      select: { id: true, code: true, shortName: true, name: true, category: true },
    }),
  ]);

  const enrolledIds = new Set(enrollments.map((e) => e.examId));
  const otherExams = allExams.filter((e) => !enrolledIds.has(e.id));

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">
              {t("dash.welcome")} {session.user.name?.split(" ")[0] ?? "Shishya"}.
            </h1>
            <p className="mt-1 text-sm text-ink-600">{t("dash.subtitle")}</p>
          </div>
          {enrollments.length > 0 && (
            <Link href="/chat" className="btn-secondary !py-2 !px-4 text-xs sm:text-sm">
              {t("nav.tutor")}
            </Link>
          )}
        </div>

        {/* Enrolled exams */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-ink-800">{t("dash.your.exams")}</h2>
          {enrollments.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500">
              {t("dash.no.enrollments")}
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {enrollments.map((e) => (
                <li
                  key={e.id}
                  className="rounded-md border border-ink-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-semibold text-ink-900">{e.exam.shortName}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{e.exam.name}</p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/exams/${e.exam.code}`}
                      className="btn-primary !py-1.5 !px-3 text-xs"
                    >
                      {t("dash.continue")}
                    </Link>
                    <Link
                      href={`/exams/${e.exam.code}#syllabus`}
                      className="btn-secondary !py-1.5 !px-3 text-xs"
                    >
                      {t("dash.syllabus")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent attempts */}
        {recentAttempts.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("dash.recent")}</h2>
            <ul className="mt-3 divide-y divide-ink-200 overflow-hidden rounded-md border border-ink-200 bg-white">
              {recentAttempts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/attempts/${a.id}/results`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-ink-50/60"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-900">{a.mock.title}</p>
                      <p className="text-xs text-ink-500">
                        {a.mock.exam.shortName} ·{" "}
                        {new Date(a.startedAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink-900">
                        {a.scorePct?.toFixed(1)}%
                      </p>
                      <p className="text-xs text-ink-500">
                        {a.scoreRaw?.toFixed(0)}/{a.scoreMax?.toFixed(0)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Other exams */}
        {otherExams.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("dash.explore")}</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {otherExams.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/exams/${e.code}`}
                    className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-4 py-3 hover:border-saffron-400 hover:shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-900">{e.shortName}</p>
                      <p className="text-xs text-ink-500">{e.category.replace("_", " ").toLowerCase()}</p>
                    </div>
                    <span className="text-saffron-600">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </main>
  );
}
