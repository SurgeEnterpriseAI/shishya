// GET /api/admin/aptitude — list Surge aptitude attempts for review.
// Bearer ${CRON_SECRET} auth (same pattern as the other admin routes).
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        "https://shishya.in/api/admin/aptitude?passed=1&limit=100"
//
// Query params:
//   passed=1   → only shortlisted (cleared the cutoff)
//   limit=N    → cap rows (default 200, max 1000)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const onlyPassed = url.searchParams.get("passed") === "1";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 1000);

  const where = onlyPassed ? { passed: true } : {};
  const [rows, total, passedCount] = await Promise.all([
    prisma.surgeAptitudeAttempt.findMany({
      where,
      orderBy: [{ passed: "desc" }, { percent: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true, name: true, email: true, phone: true,
        score: true, total: true, percent: true, passed: true,
        sections: true, durationSec: true, createdAt: true,
      },
    }),
    prisma.surgeAptitudeAttempt.count(),
    prisma.surgeAptitudeAttempt.count({ where: { passed: true } }),
  ]);

  return Response.json({
    ok: true,
    summary: { totalAttempts: total, passed: passedCount, passRate: total ? Math.round((passedCount / total) * 100) : 0 },
    count: rows.length,
    attempts: rows,
  });
}
