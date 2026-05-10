// /exams/:code/attempts — full history of the user's attempts for this exam.
// Server component. Sorts most recent first.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function AttemptsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/exams`);
  const userId = session.user.id;
  const { code } = await params;
  const { t } = await getT();

  const exam = await prisma.exam.findUnique({ where: { code } });
  if (!exam) notFound();

  const attempts = await prisma.attempt.findMany({
    where: { userId, mock: { examId: exam.id } },
    include: { mock: { select: { title: true, type: true } } },
    orderBy: { startedAt: "desc" },
  });

  const submittedScores = attempts
    .filter((a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED")
    .map((a) => a.scorePct ?? 0);
  const best = submittedScores.length ? Math.max(...submittedScores) : null;
  const avg = submittedScores.length
    ? submittedScores.reduce((s, x) => s + x, 0) / submittedScores.length
    : null;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${code}`} className="hover:text-ink-800">{exam.shortName}</Link> · {t("exam.mocks.allAttempts")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">{t("exam.mocks.allAttempts")}</h1>
        <p className="mt-1 text-sm text-ink-600">{exam.shortName}</p>

        {attempts.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500">
            {t("attempts.empty")}
          </p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label={t("attempts.total")} value={attempts.length.toString()} />
              <Stat label={t("exam.rank.bestScore")} value={best != null ? `${best.toFixed(1)}%` : "—"} accent="ok" />
              <Stat label={t("attempts.average")} value={avg != null ? `${avg.toFixed(1)}%` : "—"} />
            </div>

            <div className="mt-6 overflow-x-auto rounded-md border border-ink-200 bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-ink-200 bg-ink-50/60 text-left text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("attempts.date")}</th>
                    <th className="px-4 py-3 font-medium">{t("attempts.mock")}</th>
                    <th className="px-4 py-3 font-medium">{t("attempts.type")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("exam.rank.score")}</th>
                    <th className="px-4 py-3 font-medium">{t("attempts.status")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const submitted = a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED";
                    return (
                      <tr key={a.id} className="border-b border-ink-100 last:border-b-0">
                        <td className="px-4 py-3 text-ink-700">
                          {a.startedAt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-ink-900">{a.mock.title}</td>
                        <td className="px-4 py-3 text-xs uppercase tracking-wide text-ink-500">{a.mock.type}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {submitted ? `${a.scorePct?.toFixed(1) ?? "—"}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={a.status} t={t} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {submitted ? (
                            <Link
                              href={`/attempts/${a.id}/results`}
                              className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
                            >
                              {t("exam.mocks.review")} →
                            </Link>
                          ) : a.status === "IN_PROGRESS" ? (
                            <Link
                              href={`/mocks/${a.mockId}`}
                              className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
                            >
                              {t("exam.pyq.resumeBtn")} →
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "ok" }) {
  const colour = accent === "ok"
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-ink-800 bg-white border-ink-200";
  return (
    <div className={`rounded-md border p-4 ${colour}`}>
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function StatusPill({ status, t }: { status: string; t: (k: any) => string }) {
  if (status === "SUBMITTED" || status === "AUTO_SUBMITTED") {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200">
        {t("attempts.status.done")}
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
        {t("attempts.status.inprogress")}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
      {status}
    </span>
  );
}
