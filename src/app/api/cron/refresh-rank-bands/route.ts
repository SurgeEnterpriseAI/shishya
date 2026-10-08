// GET /api/cron/refresh-rank-bands — daily refresh of score→rank→outcome
// bands. Cut-off patterns change much slower than news/dates.
//
// 7 Oct 2026: oldest first (stored bands or the last paid call), as many as the background spend
// guard allows (can-wait "rank-bands", $0.05 a day ≈ 2 exams at $0.018;
// src/lib/ai/spend-guard.ts). Until now a 14-day rotation slot (~14 exams)
// was called whatever the day had left; with a daily cap a slot would have
// reached its first 3 exams and starved the rest for good. Oldest-first
// picks up whatever a held day left. An empty balance stops the run and the
// other jobs skip for 20 minutes.
//
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { generateRankBands } from "@/lib/ai/rank-bands";
import { createSpendGuard } from "@/lib/ai/spend-guard";

const GEN_SOURCE = "ai-generated:claude";
// Each call ~$0.06.
const COST_PER_EXAM_USD = 0.06;
const PER_DAY_BUDGET_USD = 5.0;

/** Most exams a run reaches (the guard's cap usually stops it first). */
const MAX_PER_RUN = 14;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), {
      status: 500, headers: { "content-type": "application/json" },
    });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  const exams = await prisma.exam.findMany({
    // 25 Sep 2026: real exams only — "rank bands" for a school class would
    // be invented numbers (and AI spend) for something with no rank.
    where: REAL_EXAM_WHERE,
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, shortName: true, category: true },
  });

  // Oldest first by the later of the stored bands and the last paid call
  // (AiUsage ref = exam code), so an exam whose call returned no bands does
  // not hold the head of the queue; one never tried comes first of all.
  const [last, paid] = await Promise.all([
    prisma.examRankBand.groupBy({ by: ["examId"], where: { source: GEN_SOURCE }, _max: { createdAt: true } }),
    prisma.aiUsage.groupBy({ by: ["ref"], where: { feature: "rank-bands" }, _max: { createdAt: true } }),
  ]);
  const bandsAt = new Map(last.map((l) => [l.examId, l._max.createdAt?.getTime() ?? 0]));
  const paidAt = new Map(paid.map((p) => [p.ref ?? "", p._max.createdAt?.getTime() ?? 0]));
  const lastAt = (e: { id: string; code: string }) => Math.max(bandsAt.get(e.id) ?? 0, paidAt.get(e.code) ?? 0);
  const slice = [...exams].sort((a, b) => lastAt(a) - lastAt(b)).slice(0, MAX_PER_RUN);
  const guard = createSpendGuard();

  const started = Date.now();
  const log: Array<{ code: string; ok: boolean; bands?: number; err?: string }> = [];
  let spent = 0;

  for (const exam of slice) {
    if (spent >= PER_DAY_BUDGET_USD) {
      log.push({ code: exam.code, ok: false, err: "budget" });
      continue;
    }
    const d = await guard.allow("rank-bands");
    if (!d.allow) {
      log.push({ code: exam.code, ok: false, err: `held: ${d.reason}` });
      break;
    }
    try {
      const { bands } = await generateRankBands({
        examCode: exam.code,
        examName: exam.name,
        examShortName: exam.shortName,
        category: String(exam.category),
      });
      if (bands.length === 0) {
        log.push({ code: exam.code, ok: false, err: "empty bands" });
        spent += COST_PER_EXAM_USD;
        continue;
      }
      // Archive prior generated bands instead of deleting — students
      // can compare how the rank/score prediction has shifted over
      // successive cron cycles. Only archivedAt IS NULL rows are
      // shown by default (see exam-cache / results page).
      await prisma.examRankBand.updateMany({
        where: { examId: exam.id, source: GEN_SOURCE, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      let idx = 0;
      for (const b of bands.sort((a, b2) => b2.scorePctMin - a.scorePctMin)) {
        await prisma.examRankBand.create({
          data: {
            examId: exam.id,
            scorePctMin: b.scorePctMin,
            scorePctMax: b.scorePctMax,
            rankMin: b.rankMin,
            rankMax: b.rankMax,
            label: b.label,
            outcomes: b.outcomes,
            orderIdx: idx++,
            source: GEN_SOURCE,
          },
        });
      }
      log.push({ code: exam.code, ok: true, bands: bands.length });
      spent += COST_PER_EXAM_USD;
    } catch (err) {
      log.push({ code: exam.code, ok: false, err: (err as Error).message });
      if (await guard.noteFailure("rank-bands", err)) break;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true, order: "oldest-bands-first",
      processed: log.length,
      ok_count: log.filter((l) => l.ok).length,
      failed: log.filter((l) => !l.ok).length,
      estSpendUsd: Number(spent.toFixed(2)),
      elapsedMs: Date.now() - started,
      spendGuard: guard.summary(),
      log,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
