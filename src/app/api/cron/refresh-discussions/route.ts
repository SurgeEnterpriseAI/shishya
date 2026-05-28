// GET /api/cron/refresh-discussions
//
// Keeps the homepage right-rail (DiscussionsSidebar) feeling alive by
// seeding 6-8 plausible "sample" discussion threads for the most-
// imminent upcoming exam — but ONLY when the rail would otherwise
// look thin. Real user-created threads are never touched.
//
// FLOW
//   1. Find the exam-day row closest to "now" in IST (within ±3 days).
//   2. Count NON-SEED threads that are either (a) exam-tagged to that
//      exam or (b) created in the last 7 days globally.
//   3. If that count is < 8, pretend the rail is "thin" — delete any
//      existing isSeed=true threads, then ask Claude for 6-8 fresh
//      titles for the top exam, and insert them with isSeed=true.
//   4. If the rail already has enough real activity, no Claude call,
//      just prune any old seed threads so we never accumulate.
//
// Idempotent: re-running the endpoint produces the same set of seed
// threads modulo Claude's randomness, never accumulates.

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { generateSeedThreads } from "@/lib/ai/seed-discussions";

const ACTIVITY_THRESHOLD = 8; // skip seeding when real rail already has ≥ N threads
const DAY = 86_400_000;

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

  const started = Date.now();

  // ── Find the top-of-mind upcoming exam ────────────────────────────
  // Window: 3 days past to 30 days future. Sort by absolute distance
  // to "now" so today / yesterday's exam beats one a month out.
  const now = new Date();
  const from = new Date(now.getTime() - 3 * DAY);
  const to = new Date(now.getTime() + 30 * DAY);
  const candidates = await prisma.examImportantDate.findMany({
    where: {
      date: { gte: from, lte: to },
      isExamDay: true,
      exam: { active: true },
      archivedAt: null,
    },
    include: { exam: { select: { id: true, code: true, shortName: true, name: true } } },
  });
  if (candidates.length === 0) {
    return jsonOk({ ok: true, action: "no upcoming exam-day in window", elapsedMs: Date.now() - started });
  }
  const sorted = candidates
    .map((c) => ({ row: c, absDays: Math.abs((c.date.getTime() - now.getTime()) / DAY) }))
    .sort((a, b) => a.absDays - b.absDays);
  const top = sorted[0].row;
  const daysFromExam = (top.date.getTime() - now.getTime()) / DAY;

  // ── Activity gate ────────────────────────────────────────────────
  // Threshold = non-seed threads either (a) tagged to this exam OR
  // (b) created in the last 7 days globally. If the rail's already
  // lively, no seeding needed.
  const realActivity = await prisma.discussion.count({
    where: {
      isSeed: false,
      OR: [
        { examId: top.exam.id },
        { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } },
      ],
    },
  });
  if (realActivity >= ACTIVITY_THRESHOLD) {
    // Real activity is healthy — prune any stale seed threads so
    // they don't pollute the rail. Skip Claude.
    const deleted = await prisma.discussion.deleteMany({ where: { isSeed: true } });
    return jsonOk({
      ok: true,
      action: "real activity healthy — pruned seeds",
      topExam: top.exam.code,
      realActivity,
      seedsDeleted: deleted.count,
      elapsedMs: Date.now() - started,
    });
  }

  // ── Generate fresh seed titles via Claude ─────────────────────────
  const titles = await generateSeedThreads({
    examShortName: top.exam.shortName,
    examName: top.exam.name,
    daysFromExam,
  });
  if (titles.length === 0) {
    return jsonOk({
      ok: false,
      action: "claude returned no titles",
      topExam: top.exam.code,
      elapsedMs: Date.now() - started,
    });
  }

  // ── Replace any prior seed rows + insert the fresh batch ──────────
  // Author names rotate through the synthetic-handles pool so the
  // sidebar reads as 6-8 different students chatting, not "Shishya
  // sample" eight times.
  const { pickSyntheticHandle } = await import("@/data/synthetic-handles");
  await prisma.discussion.deleteMany({ where: { isSeed: true } });
  const usedNames: string[] = [];
  const created = await prisma.$transaction(
    titles.map((t, i) => {
      const handle = pickSyntheticHandle(usedNames);
      usedNames.push(handle);
      return prisma.discussion.create({
        data: {
          title: t.title,
          examId: top.exam.id,
          isSeed: true,
          authorName: handle,
          // Spread lastActivityAt over the past few hours so the rail
          // doesn't show all 8 threads with identical timestamps.
          lastActivityAt: new Date(now.getTime() - i * 23 * 60_000),
          messageCount: 0,
          createdAt: new Date(now.getTime() - i * 23 * 60_000),
        },
        select: { id: true, title: true },
      });
    }),
  );

  return jsonOk({
    ok: true,
    action: "seeded fresh threads",
    topExam: top.exam.code,
    daysFromExam: Math.round(daysFromExam * 10) / 10,
    realActivity,
    seeded: created.length,
    titles: created.map((c) => c.title),
    elapsedMs: Date.now() - started,
  });
}

function jsonOk(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
