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
import { Student360View } from "@/components/Student360View";
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

  const p = await buildStudent360(userId);
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
      <Student360View p={p} viewer="self" />
      <div className="mt-6">
        <MentorRequestCard examCode={p.exam?.code ?? null} existing={existing} />
      </div>
      <p className="mt-6 text-xs text-ink-400">
        This report is private to you. It is shown to a mentor only if you explicitly choose to share it above.
      </p>
    </main>
  );
}
