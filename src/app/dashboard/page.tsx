// /dashboard — student home after sign-in. Bilingual.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { ExamPicker, type ExamCard } from "@/components/ExamPicker";
import { computeExamTags, TAG_ORDER } from "@/lib/exam-tags";
import { buildCuratedSections, buildStateInfo } from "@/lib/exam-browse";

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
      orderBy: [{ candidatesPerYear: "desc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        shortName: true,
        name: true,
        category: true,
        candidatesPerYear: true,
        state: true,
        _count: {
          select: {
            questions: { where: { validated: true } },
            mocks: { where: { userId: null } },
          },
        },
      },
    }),
  ]);

  const enrolledIds = new Set(enrollments.map((e) => e.examId));
  const otherExamCards: ExamCard[] = allExams
    .filter((e) => !enrolledIds.has(e.id))
    .map((e) => ({
      code: e.code,
      name: e.name,
      shortName: e.shortName,
      category: e.category,
      candidatesPerYear: e.candidatesPerYear,
      state: e.state ?? null,
      live: ((e._count?.questions ?? 0) > 0) || ((e._count?.mocks ?? 0) > 0),
      tags: computeExamTags({
        code: e.code,
        category: e.category,
        state: e.state ?? null,
        candidatesPerYear: e.candidatesPerYear,
      }),
    }));
  const stateInfo = buildStateInfo(otherExamCards);
  const featuredSections = buildCuratedSections(otherExamCards, t);

  const catLabels: Record<string, string> = {
    GOVT_JOBS:      t("land.cat.GOVT_JOBS"),
    BANKING:        t("land.cat.BANKING"),
    CIVIL_SERVICES: t("land.cat.CIVIL_SERVICES"),
    MEDICAL:        t("land.cat.MEDICAL"),
    ENGINEERING:    t("land.cat.ENGINEERING"),
    TEACHING:       t("land.cat.TEACHING"),
    UNIVERSITY:     t("land.cat.UNIVERSITY"),
    MBA:            t("land.cat.MBA"),
    LAW:            t("land.cat.LAW"),
    DEFENCE:        t("land.cat.DEFENCE"),
    OLYMPIAD:       t("land.cat.OLYMPIAD"),
    STATE_LEVEL:    t("land.cat.STATE_LEVEL"),
  };
  const tagLabels: Record<string, string> = {
    popular:        t("land.tag.popular"),
    national:       t("land.tag.national"),
    state:          t("land.tag.state"),
    govt:           t("land.tag.govt"),
    engineering:    t("land.tag.engineering"),
    medical:        t("land.tag.medical"),
    teaching:       t("land.tag.teaching"),
    banking:        t("land.tag.banking"),
    olympiad:       t("land.tag.olympiad"),
    civil_services: t("land.tag.civil_services"),
    mba:            t("land.tag.mba"),
    law:            t("land.tag.law"),
    police:         t("land.tag.police"),
    university:     t("land.tag.university"),
    polytechnic:    t("land.tag.polytechnic"),
    defence:        t("land.tag.defence"),
  };

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

        {/* Other exams — curated browse (search + chips + state grid) */}
        {otherExamCards.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("dash.explore")}</h2>
            <div className="mt-4">
              <ExamPicker
                exams={otherExamCards}
                states={stateInfo}
                featured={featuredSections}
                signedIn={true}
                labels={{
                  searchPlaceholder: t("land.search.placeholder"),
                  searchLabel: t("land.search.label"),
                  noResults: t("land.no.results"),
                  catAll: t("land.cat.all"),
                  catLabels,
                  tagLabels,
                  tagOrder: [...TAG_ORDER],
                  statusLive: t("land.status.live"),
                  statusComing: t("land.status.coming"),
                  candidatesPerYear: t("land.candidates"),
                  pickState: t("land.pickState"),
                  pickStateBack: t("land.pickStateBack"),
                  examsConductedBy: t("land.examsConductedBy"),
                  seeAll: t("land.seeAll"),
                  browseAllExams: t("land.browseAllExams"),
                }}
              />
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
