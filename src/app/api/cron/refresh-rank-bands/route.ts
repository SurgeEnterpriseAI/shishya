// GET /api/cron/refresh-rank-bands — daily refresh of score→rank→outcome
// bands for a rotating subset of exams. Cut-off patterns change much
// slower than news/dates, so we use a 14-day rotation (~12 exams/day)
// rather than 7.
//
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { generateRankBands } from "@/lib/ai/rank-bands";

const GEN_SOURCE = "ai-generated:claude";
// Each call ~$0.06.
const COST_PER_EXAM_USD = 0.06;
const PER_DAY_BUDGET_USD = 5.0;

function dayOfYearUtc(now = new Date()): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  return Math.floor((now.getTime() - start) / (24 * 60 * 60 * 1000));
}

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
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, shortName: true, category: true },
  });

  const ROTATION = 14;
  const slot = dayOfYearUtc() % ROTATION;
  const slice = exams.filter((_, idx) => idx % ROTATION === slot);

  const started = Date.now();
  const log: Array<{ code: string; ok: boolean; bands?: number; err?: string }> = [];
  let spent = 0;

  for (const exam of slice) {
    if (spent >= PER_DAY_BUDGET_USD) {
      log.push({ code: exam.code, ok: false, err: "budget" });
      continue;
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
    }
  }

  return new Response(
    JSON.stringify({
      ok: true, slot, rotation: ROTATION,
      processed: log.length,
      ok_count: log.filter((l) => l.ok).length,
      failed: log.filter((l) => !l.ok).length,
      estSpendUsd: Number(spent.toFixed(2)),
      elapsedMs: Date.now() - started,
      log,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
