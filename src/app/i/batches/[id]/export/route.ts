// GET /i/batches/[id]/export — the data-ownership promise, executable.
//
// "Your student list exports whenever you ask — even if you leave."
// One click on the batch page downloads a CSV of every active student
// with their progress stats. No gate beyond the educator's own session
// + batch ownership: their students, their data.

import { prisma } from "@/lib/db/prisma";
import { requireInstitutionSession } from "@/lib/institution-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: string | number | null): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  let institution;
  try {
    ({ institution } = await requireInstitutionSession());
  } catch {
    return new Response("unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const batch = await prisma.batch.findUnique({
    where: { id },
    select: {
      name: true,
      course: { select: { institutionId: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        orderBy: { enrolledAt: "asc" },
        select: { enrolledAt: true, user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!batch || batch.course.institutionId !== institution.id) {
    return new Response("not found", { status: 404 });
  }

  const ids = batch.enrollments.map((e) => e.user.id);
  type Stat = { userId: string; total: bigint; wk: bigint; avgPct: number | null; lastAt: Date | null };
  const stats: Stat[] = ids.length
    ? await prisma.$queryRaw<Stat[]>`
        SELECT "userId", COUNT(*) AS total,
               COUNT(*) FILTER (WHERE "finishedAt" > NOW() - INTERVAL '7 days') AS wk,
               AVG("scorePct") AS "avgPct", MAX("finishedAt") AS "lastAt"
        FROM "Attempt"
        WHERE "userId" = ANY(${ids}) AND status IN ('SUBMITTED', 'AUTO_SUBMITTED')
        GROUP BY "userId"
      `.catch(() => [])
    : [];
  const by = new Map(stats.map((s) => [s.userId, s]));

  const rows = [
    ["name", "email", "joined", "mocks_total", "mocks_last7d", "avg_score_pct", "last_active"],
    ...batch.enrollments.map((e) => {
      const s = by.get(e.user.id);
      return [
        e.user.name ?? "",
        e.user.email,
        e.enrolledAt.toISOString().slice(0, 10),
        Number(s?.total ?? 0),
        Number(s?.wk ?? 0),
        s?.avgPct != null ? Math.round(s.avgPct) : "",
        s?.lastAt ? new Date(s.lastAt).toISOString().slice(0, 10) : "",
      ];
    }),
  ];
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const fname = `${batch.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-students.csv`;

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
