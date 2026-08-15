// /me/report — the aspirant's own Student-360: everything Shishya has
// learned about their preparation, on one honest screen, plus the
// consent-gated "talk to a mentor" funnel. The same data a mentor will
// see IF the student chooses to share it — no hidden asymmetry.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { buildStudent360 } from "@/lib/student-360";
import { buildWeekCompare } from "@/lib/student-week-compare";
import { Student360View } from "@/components/Student360View";
import { WeekCompareView } from "@/components/WeekCompareView";
import { MentorRequestCard } from "@/components/MentorRequestCard";

export const metadata: Metadata = {
  title: "My preparation report — Shishya",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login?callbackUrl=/me/report");

  const [p, wk] = await Promise.all([buildStudent360(userId), buildWeekCompare(userId)]);
  if (!p) redirect("/dashboard");

  const reqRows = await prisma.$queryRaw<any[]>`
    SELECT r.status, r."meetUrl", r."sessionNote", ma.name AS mentor_name
    FROM "MentorSessionRequest" r
    LEFT JOIN "MentorApplication" ma ON ma.id = r."mentorId"
    WHERE r."userId" = ${userId}
    ORDER BY r."createdAt" DESC LIMIT 1`;
  const existing = reqRows[0]
    ? {
        status: reqRows[0].status,
        meetUrl: reqRows[0].meetUrl ?? null,
        mentorName: reqRows[0].mentor_name ?? null,
        sessionNote: reqRows[0].sessionNote ?? null,
      }
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-ink-500 hover:text-ink-700">← Dashboard</Link>
      </div>
      {/* Take-it-with-you row: the dated report and today's personalised
          study pack, both saveable as PDF. Quiet buttons, no popups. */}
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/me/report/print"
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 hover:border-saffron-400 hover:bg-saffron-50">
          📥 Download today&apos;s status report
        </Link>
        <Link href="/me/report/pack"
          className="rounded-lg border border-saffron-300 bg-saffron-50/60 px-3 py-2 text-sm font-medium text-ink-800 hover:border-saffron-400">
          📚 Today&apos;s study pack — built for your weak areas
        </Link>
      </div>

      <Student360View p={p} viewer="self" />

      <div className="mt-6 rounded-lg border border-ink-100 bg-white p-4">
        <WeekCompareView wk={wk} />
      </div>

      {/* No coach plan yet → explain, gently, how this report gets
          richer: a plan + daily grind = trend lines, mastery movement,
          a day-by-day path. Never a popup, never guilt — an invitation. */}
      {!p.plan && (
        <Link
          href="/coach"
          className="mt-6 block rounded-xl border border-saffron-300 bg-saffron-50/60 p-4 transition-colors hover:border-saffron-400"
        >
          <p className="text-sm text-ink-800">
            🎯 This report grows with you. Take a{" "}
            <span className="font-semibold">free day-by-day coach plan</span> and practice a little
            daily — your score trend, subject mastery and study rhythm fill in, and every morning
            the plan re-arranges around the days you have left.
          </p>
          <p className="mt-1 text-right text-sm font-bold text-saffron-700">Build my plan →</p>
        </Link>
      )}

      <div className="mt-6">
        <MentorRequestCard examCode={p.exam?.code ?? null} existing={existing} />
      </div>
      <p className="mt-6 text-xs text-ink-400">
        This report is private to you. It is shown to a mentor only if you explicitly choose to share it above.
      </p>
    </main>
  );
}
