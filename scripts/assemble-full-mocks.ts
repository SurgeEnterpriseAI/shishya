// Assemble REAL-PATTERN full-length mocks (1 Sep 2026).
//
// Trigger: the first-ever PulseAsk free-text capture — a TS Police PC
// student typed "200 questions" on the exam hub. The real prelim is a
// 200-question / 3-hour paper; our biggest shared mock was 120. Motto,
// per the founder: everything a student asks for should be available.
//
// For every active exam whose VALIDATED pool covers the real paper
// size, build one shared full-length mock:
//   • exactly exam.totalQuestions questions, exam.durationMin timer
//   • sampled per-subject proportional to syllabus weight (capped by
//     that subject's pool), remainder topped up from the whole pool
//   • ordered in subject blocks like the real paper
//   • userId NULL (shared — every student attempts the same paper) with
//     generatedBy 'system:full-pattern-v1'
//
// Idempotent: an exam that already has a v1 full-pattern mock of the
// right size is skipped, so re-running after the question bank grows
// only fills in newly-qualified exams.
//
//   npx tsx --env-file=.env.local scripts/assemble-full-mocks.ts [--dry]

import { prisma } from "../src/lib/db/prisma";

const GENERATED_BY = "system:full-pattern-v1";
const dry = process.argv.includes("--dry");

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  const exams = await prisma.$queryRawUnsafe<
    { id: string; code: string; shortName: string; tq: number; dur: number; pool: number }[]
  >(`
    SELECT e.id, e.code, e."shortName", e."totalQuestions" tq, e."durationMin" dur,
      (SELECT COUNT(*)::int FROM "Question" q WHERE q."examId"=e.id AND q.validated=TRUE) pool
    FROM "Exam" e WHERE e.active=TRUE AND e."totalQuestions" > 0`);

  let created = 0, skipped = 0;
  for (const ex of exams) {
    if (ex.pool < ex.tq) continue;

    const existing = await prisma.mock.findFirst({
      where: { examId: ex.id, userId: null, generatedBy: GENERATED_BY },
      select: { id: true, questionIds: true },
    });
    if (existing && existing.questionIds.length >= ex.tq) {
      skipped++;
      continue;
    }

    // Pool with subject linkage + weight.
    const pool = await prisma.$queryRawUnsafe<
      { qid: string; sid: string; sname: string; weight: number | null }[]
    >(
      `SELECT q.id qid, s.id sid, s.name sname, s.weight
       FROM "Question" q
       JOIN "Topic" t ON t.id = q."topicId"
       JOIN "Subject" s ON s.id = t."subjectId"
       WHERE q."examId" = $1 AND q.validated = TRUE`,
      ex.id,
    );
    if (pool.length < ex.tq) continue;

    // Per-subject quota ∝ weight (default 1), capped by availability.
    const bySub = new Map<string, { name: string; weight: number; qids: string[] }>();
    for (const r of pool) {
      const s = bySub.get(r.sid) ?? { name: r.sname, weight: Number(r.weight ?? 1) || 1, qids: [] };
      s.qids.push(r.qid);
      bySub.set(r.sid, s);
    }
    const subs = [...bySub.entries()].map(([sid, s]) => ({ sid, ...s }));
    const wSum = subs.reduce((a, s) => a + s.weight, 0);
    const picked: string[] = [];
    const leftovers: string[] = [];
    for (const s of subs) {
      const quota = Math.min(s.qids.length, Math.round((ex.tq * s.weight) / wSum));
      const mine = shuffle([...s.qids]);
      picked.push(...mine.slice(0, quota));
      leftovers.push(...mine.slice(quota));
    }
    // Top up (rounding shortfall) from leftovers, keeping subject-block
    // order by appending then re-grouping at the end.
    for (const qid of shuffle(leftovers)) {
      if (picked.length >= ex.tq) break;
      picked.push(qid);
    }
    // Re-group into subject blocks like the real paper.
    const subjOf = new Map(pool.map((r) => [r.qid, r.sid]));
    const ordered = subs
      .flatMap((s) => picked.filter((qid) => subjOf.get(qid) === s.sid))
      .slice(0, ex.tq);
    if (ordered.length < ex.tq) continue;

    console.log(`${dry ? "[dry] " : ""}${ex.code.padEnd(22)} ${ex.tq}Q / ${ex.dur} min  (pool ${ex.pool}, ${subs.length} subjects)`);
    if (dry) { created++; continue; }

    await prisma.mock.create({
      data: {
        examId: ex.id,
        userId: null,
        type: "FULL",
        title: `${ex.shortName} — Full-Length Mock (Real Pattern: ${ex.tq}Q · ${ex.dur} min)`,
        questionIds: ordered,
        generatedBy: GENERATED_BY,
        config: { pattern: "real", count: ex.tq, durationMin: ex.dur } as object,
      },
    });
    created++;
  }
  console.log(`done: created=${created} skipped(existing)=${skipped}`);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
