// /admin — landing page with quick stats + entry to question review queue.
// Server Component. Gates on requireAdmin.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";

export default async function AdminHome() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const [
    totalQuestions,
    validatedQuestions,
    pendingAi,
    totalUsers,
    totalAttempts,
    perExam,
  ] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { validated: true } }),
    prisma.question.count({ where: { source: "AI_GENERATED", validated: false } }),
    prisma.user.count(),
    prisma.attempt.count({ where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } }),
    prisma.exam.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-10">
        <h1 className="text-2xl font-bold text-ink-900">Admin · Content review</h1>
        <p className="mt-1 text-sm text-ink-600">
          Validate AI-generated questions before they reach students.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Total questions" value={totalQuestions} />
          <Stat label="Validated" value={validatedQuestions} accent="ok" />
          <Stat label="Pending AI review" value={pendingAi} accent="warn" />
          <Stat label="Users" value={totalUsers} />
          <Stat label="Submitted attempts" value={totalAttempts} />
        </div>

        <div className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">Per exam</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {perExam.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{e.shortName}</p>
                  <p className="text-xs text-ink-500">{e._count.questions} questions</p>
                </div>
                <Link
                  href={`/admin/questions?examCode=${e.code}&validated=false`}
                  className="rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium hover:bg-ink-50"
                >
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/admin/analytics"
            className="btn-primary !py-2 !px-4 text-sm"
          >
            Analytics dashboard →
          </Link>
          <Link
            href="/admin/insights"
            className="btn-secondary !py-2 !px-4 text-sm"
          >
            Shishya insights
          </Link>
          <Link
            href="/admin/questions?source=AI_GENERATED&validated=false"
            className="btn-secondary !py-2 !px-4 text-sm"
          >
            Review pending AI questions
          </Link>
          <Link
            href="/admin/coverage"
            className="btn-secondary !py-2 !px-4 text-sm"
          >
            Content coverage
          </Link>
          <Link
            href="/admin/sme-stats"
            className="btn-secondary !py-2 !px-4 text-sm"
          >
            SME acceptance stats
          </Link>
          <Link
            href="/admin/questions"
            className="btn-secondary !py-2 !px-4 text-sm"
          >
            Browse all questions
          </Link>
        </div>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "ok" | "warn";
}) {
  const colour =
    accent === "ok"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : accent === "warn"
      ? "text-amber-800 bg-amber-50 border-amber-200"
      : "text-ink-800 bg-white border-ink-200";
  return (
    <div className={`rounded-md border p-4 ${colour}`}>
      <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString("en-IN")}</p>
      <p className="mt-0.5 text-xs">{label}</p>
    </div>
  );
}
