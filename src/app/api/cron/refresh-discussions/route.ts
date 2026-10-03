// GET /api/cron/refresh-discussions
//
// NOT scheduled since 2 Oct 2026: its vercel.json cron entry and the GitHub
// Actions step that also called it were removed (8 seed threads, 0 replies,
// 12 page views in ten days; one model call a run from a credit balance
// that is topped up by hand). Check: tests/unit/spend-schedules.test.ts
//
// RETIRED 3 Oct 2026: Shishya no longer writes discussion threads. The job
// asked the model for 6-8 "starter questions" in a student's first person
// and deleted every isSeed row on each run — study rooms included, and,
// since the 34 seed-script threads were marked isSeed = TRUE that day
// (scripts/mark-seeded-discussions.ts), those too. The route stays so a
// manual call with the cron secret gets a plain answer: 410 Gone. It reads
// and writes nothing and calls no model. The seed helper
// (src/lib/ai/seed-discussions.ts) and the three seed/discussions*.ts
// scripts are deleted. Checks: tests/unit/discussion-honesty.test.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ error: "retired 3 Oct 2026 — Shishya no longer writes discussion threads" }),
    { status: 410, headers: { "content-type": "application/json" } },
  );
}
