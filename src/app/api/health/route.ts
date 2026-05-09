// GET /api/health — operational health endpoint for uptime monitors
// (UptimeRobot, BetterUptime, Vercel cron, etc.) and on-call dashboards.
//
// Returns:
//   200 + { status: "ok",  ... }   when everything is reachable
//   503 + { status: "degraded", ... } when DB or AI is down (still respond
//        with a payload so monitors can read which subsystem failed)
//
// We probe the database with a 1-row count (cheap, ~5ms on Neon) and the
// Anthropic key by checking it's configured (we don't burn an API call on
// every health check — that would be wasteful and rate-limit-prone).

import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

// Always dynamic — never cache health responses.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {};

  // ── DB reachability ──────────────────────────────────────────────────
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    checks.db = {
      ok: false,
      latencyMs: Date.now() - dbStart,
      detail: String(err?.message ?? err).slice(0, 200),
    };
  }

  // ── Anthropic configuration (presence-only; no API call) ─────────────
  checks.anthropic = {
    ok: Boolean(process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-")),
    detail: process.env.ANTHROPIC_API_KEY ? undefined : "ANTHROPIC_API_KEY missing",
  };

  // ── Auth configuration (presence-only) ───────────────────────────────
  checks.auth = {
    ok: Boolean(
      process.env.NEXTAUTH_SECRET &&
      process.env.NEXTAUTH_URL &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
    ),
    detail: !process.env.NEXTAUTH_SECRET ? "NEXTAUTH_SECRET missing"
      : !process.env.NEXTAUTH_URL ? "NEXTAUTH_URL missing"
      : !process.env.GOOGLE_CLIENT_ID ? "GOOGLE_CLIENT_ID missing"
      : !process.env.GOOGLE_CLIENT_SECRET ? "GOOGLE_CLIENT_SECRET missing"
      : undefined,
  };

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? "ok" : "degraded";
  const httpStatus = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      checks,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      region: process.env.VERCEL_REGION ?? "local",
      totalLatencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status: httpStatus, headers: { "cache-control": "no-store" } }
  );
}
