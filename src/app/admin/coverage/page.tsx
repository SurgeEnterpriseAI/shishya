// /admin/coverage — content depth dashboard.
// Per exam: subjects, topics, validated questions, PYQs by year, system mocks.
// Helps prioritise which exams need more SME content.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";

// 163 exams × per-exam fan-out used to fire 800+ Prisma queries through a
// single pgbouncer-pooled connection and time out. The body below now
// aggregates everything in ~5 groupBy queries total. Keeping the explicit
// runtime + maxDuration in case content grows beyond what one connection
// can serve within the default 10s limit.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export default async function AdminCoveragePage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const [exams, topicAgg, validatedAgg, pyqAgg, pyqYearAgg, systemMockAgg] =
    await Promise.all([
      prisma.exam.findMany({
        orderBy: { code: "asc" },
        select: {
          id: true,
          code: true,
          shortName: true,
          category: true,
          _count: { select: { subjects: true, questions: true, mocks: true } },
        },
      }),
      // Topics per exam — joined through subject.examId.
      prisma.$queryRawUnsafe<Array<{ examId: string; count: bigint }>>(
        `SELECT s."examId" AS "examId", COUNT(t.id)::bigint AS count
           FROM "Topic" t
           JOIN "Subject" s ON s.id = t."subjectId"
          GROUP BY s."examId"`
      ),
      prisma.question.groupBy({
        by: ["examId"],
        where: { validated: true },
        _count: { _all: true },
      }),
      prisma.question.groupBy({
        by: ["examId"],
        where: { source: "PYQ" },
        _count: { _all: true },
      }),
      prisma.question.groupBy({
        by: ["examId", "pyqYear"],
        where: { source: "PYQ", pyqYear: { not: null } },
        _count: { _all: true },
      }),
      prisma.mock.groupBy({
        by: ["examId"],
        where: { userId: null },
        _count: { _all: true },
      }),
    ]);

  const topicByExam = new Map(topicAgg.map((r) => [r.examId, Number(r.count)]));
  const validatedByExam = new Map(validatedAgg.map((r) => [r.examId, r._count._all]));
  const pyqByExam = new Map(pyqAgg.map((r) => [r.examId, r._count._all]));
  const systemMockByExam = new Map(systemMockAgg.map((r) => [r.examId, r._count._all]));
  const pyqYearByExam = new Map<string, Array<{ pyqYear: number; _count: number }>>();
  for (const r of pyqYearAgg) {
    if (r.pyqYear === null) continue;
    const arr = pyqYearByExam.get(r.examId) ?? [];
    arr.push({ pyqYear: r.pyqYear, _count: r._count._all });
    pyqYearByExam.set(r.examId, arr);
  }

  const rows = exams.map((e) => ({
    ...e,
    topicCount: topicByExam.get(e.id) ?? 0,
    validatedCount: validatedByExam.get(e.id) ?? 0,
    pyqCount: pyqByExam.get(e.id) ?? 0,
    pyqYears: (pyqYearByExam.get(e.id) ?? []).sort(
      (a, b) => b.pyqYear - a.pyqYear,
    ),
    systemMockCount: systemMockByExam.get(e.id) ?? 0,
  }));

  // Summary: how many exams have non-zero everything?
  const summary = {
    examsTotal: rows.length,
    examsWithSyllabus: rows.filter((r) => r.topicCount > 0).length,
    examsWithQuestions: rows.filter((r) => r.validatedCount > 0).length,
    examsWithPYQ: rows.filter((r) => r.pyqCount > 0).length,
    examsWithMocks: rows.filter((r) => r.systemMockCount > 0).length,
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">Admin</Link> · Content coverage
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Content coverage</h1>
        <p className="mt-1 text-sm text-ink-600">
          What's seeded per exam. Use this to prioritise the next batches of PYQ ingestion + SME validation.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Exams" value={summary.examsTotal} />
          <Stat label="With syllabus" value={summary.examsWithSyllabus} accent={summary.examsWithSyllabus === summary.examsTotal ? "ok" : undefined} />
          <Stat label="With questions" value={summary.examsWithQuestions} accent={summary.examsWithQuestions > 0 ? "ok" : "warn"} />
          <Stat label="With PYQs" value={summary.examsWithPYQ} accent={summary.examsWithPYQ > 0 ? "ok" : "warn"} />
          <Stat label="With mocks" value={summary.examsWithMocks} accent={summary.examsWithMocks > 0 ? "ok" : "warn"} />
        </div>

        <div className="mt-8 overflow-x-auto rounded-md border border-ink-200 bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-ink-200 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium text-right">Subjects</th>
                <th className="px-4 py-3 font-medium text-right">Topics</th>
                <th className="px-4 py-3 font-medium text-right">Validated Qs</th>
                <th className="px-4 py-3 font-medium text-right">PYQs</th>
                <th className="px-4 py-3 font-medium">PYQ years</th>
                <th className="px-4 py-3 font-medium text-right">System mocks</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const stale = r.topicCount === 0 || r.validatedCount === 0;
                return (
                  <tr key={r.code} className="border-b border-ink-100 last:border-b-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900">{r.shortName}</p>
                      <p className="text-xs text-ink-500">{r.code}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.topicCount === 0 ? "—" : r._count.subjects}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.topicCount === 0 ? (
                        <span className="text-amber-700">empty</span>
                      ) : (
                        r.topicCount
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${r.validatedCount === 0 ? "text-amber-700" : ""}`}>
                      {r.validatedCount}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${r.pyqCount === 0 ? "text-amber-700" : ""}`}>
                      {r.pyqCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-600">
                      {r.pyqYears.length === 0 ? (
                        <span className="text-amber-700">none</span>
                      ) : (
                        r.pyqYears.map((y) => `${y.pyqYear} (${y._count})`).join(", ")
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${r.systemMockCount === 0 ? "text-amber-700" : ""}`}>
                      {r.systemMockCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/questions?examCode=${r.code}`}
                        className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-ink-500">
          Amber values flag rows that need attention. PYQs and system mocks are seeded via
          <code className="mx-1 rounded bg-ink-100 px-1 py-0.5">seed/pyqs/</code>
          and
          <code className="mx-1 rounded bg-ink-100 px-1 py-0.5">seed/mocks/</code>.
        </p>
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
    <div className={`rounded-md border p-3 ${colour}`}>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs">{label}</p>
    </div>
  );
}
