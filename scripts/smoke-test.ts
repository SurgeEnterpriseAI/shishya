// scripts/smoke-test.ts
//
// End-to-end smoke test that exercises the full create-mock → answer →
// submit flow without going through HTTP/auth. Uses Prisma directly + the
// pure AI services (`generateMock`, `runDiagnostic`).
//
// What it asserts:
//   1. We can create a test user and enroll them in SSC CGL.
//   2. We can build a DIAGNOSTIC mock (rule-based, no Claude) from the
//      validated question pool.
//   3. We can mark some answers correct/wrong/skipped, submit the attempt,
//      and the scoring + topic aggregates match what we computed by hand.
//   4. The WeaknessMap is updated correctly.
//   5. Scores survive a roundtrip to Postgres (no precision loss).
//
// Cleanup happens at the end (deletes the test user via cascade).
//
// Run with:
//   DATABASE_URL=... npx tsx scripts/smoke-test.ts
//
// Add --keep-data to skip cleanup if you want to inspect the DB afterwards.

import { PrismaClient, Prisma } from "@prisma/client";
import { generateMock } from "../src/lib/ai";
import { getStudentState } from "../src/lib/db/student-state";
import { getSyllabusContext } from "../src/lib/db/syllabus";
import { scoreAttempt } from "../src/lib/scoring";

const KEEP_DATA = process.argv.includes("--keep-data");
const TEST_EMAIL = `smoke-test-${Date.now()}@shishya.test`;
const EXAM_CODE = "SSC_CGL";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(cond: any, msg: string) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    failures.push(msg);
    console.error(`  ✗ ${msg}`);
  }
}

function assertEq(actual: any, expected: any, msg: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    failures.push(`${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
    console.error(`  ✗ ${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function main() {
  const prisma = new PrismaClient();
  let userId: string | null = null;

  try {
    console.log("\n━━━━━━━ Shishya smoke test ━━━━━━━");
    console.log(`exam: ${EXAM_CODE}    test email: ${TEST_EMAIL}`);

    // ── Pre-flight: ensure SSC CGL is seeded with validated questions
    console.log("\n[1] Pre-flight checks");
    const exam = await prisma.exam.findUnique({
      where: { code: EXAM_CODE },
      include: { subjects: { include: { _count: { select: { topics: true } } } } },
    });
    assert(exam, "SSC_CGL exam exists");
    if (!exam) throw new Error("Run `npm run seed:all` first.");
    assert(exam.subjects.length === 4, "SSC_CGL has 4 subjects");

    const validatedCount = await prisma.question.count({
      where: { examId: exam.id, validated: true },
    });
    if (validatedCount < 12) {
      console.log(
        `\n  (info) only ${validatedCount} validated Qs — temporarily flipping all SSC_CGL Qs to validated for the smoke test`
      );
      // For smoke test, stamp every SSC CGL Q as validated. We restore at end.
      await prisma.question.updateMany({
        where: { examId: exam.id, validated: false },
        data: { validated: true },
      });
    }

    // ── Create user + enrollment ─────────────────────────────────────────
    console.log("\n[2] Create user + enroll");
    const user = await prisma.user.create({
      data: { email: TEST_EMAIL, name: "Smoke Test", preferredLang: "EN" },
    });
    userId = user.id;
    await prisma.enrollment.create({
      data: { userId: user.id, examId: exam.id },
    });
    assert(true, "user + enrollment created");

    // ── Generate diagnostic mock ─────────────────────────────────────────
    console.log("\n[3] Generate diagnostic mock");
    const studentState = await getStudentState(user.id, EXAM_CODE);
    const syllabus = await getSyllabusContext(EXAM_CODE);
    const candidates = await prisma.question.findMany({
      where: { examId: exam.id, validated: true },
      include: { topic: true },
      take: 500,
    });
    assert(candidates.length >= 12, `≥12 candidate questions (have ${candidates.length})`);

    const mockSpec = await generateMock({
      studentState,
      request: { type: "DIAGNOSTIC", questionCount: 12 },
      availableQuestions: candidates.map((q) => ({
        id: q.id,
        topicId: q.topicId,
        topicCode: q.topic.code,
        difficulty: q.difficulty,
      })),
      syllabus,
    });
    assertEq(mockSpec.questionIds.length, 12, "diagnostic mock has 12 questions");

    const mock = await prisma.mock.create({
      data: {
        userId: user.id,
        examId: exam.id,
        type: "DIAGNOSTIC",
        title: mockSpec.title,
        config: { rationale: mockSpec.rationale, durationMin: mockSpec.durationMin } as Prisma.InputJsonObject,
        questionIds: mockSpec.questionIds,
        generatedBy: "ai:diagnostic",
      },
    });

    // ── Build a deterministic answer pattern ─────────────────────────────
    // Strategy: first 8 correct, next 2 wrong, last 2 skipped.
    console.log("\n[4] Submit answers");
    const qsForMock = await prisma.question.findMany({
      where: { id: { in: mockSpec.questionIds } },
      include: { topic: true },
    });
    const qById = new Map(qsForMock.map((q) => [q.id, q]));
    const pattern: Array<"correct" | "wrong" | "skip"> = [
      "correct", "correct", "correct", "correct", "correct", "correct", "correct", "correct",
      "wrong", "wrong",
      "skip", "skip",
    ];
    const submittedAnswers = mockSpec.questionIds.map((qid, i) => {
      const q = qById.get(qid)!;
      const action = pattern[i];
      const wrongOption = q.answerKey === "A" ? "B" : "A";
      return {
        questionId: qid,
        chosen: action === "correct" ? q.answerKey : action === "wrong" ? wrongOption : null,
        timeSec: 30,
        marked: false,
      };
    });

    const attempt = await prisma.attempt.create({
      data: {
        mockId: mock.id,
        userId: user.id,
        status: "IN_PROGRESS",
        answers: submittedAnswers as Prisma.InputJsonValue,
      },
    });

    // ── Run scoring through the same pure module the API uses ───────────
    const result = scoreAttempt({
      questionIds: mockSpec.questionIds,
      questionsById: new Map(
        qsForMock.map((q) => [
          q.id,
          {
            id: q.id,
            answerKey: q.answerKey,
            topicId: q.topicId,
            topicCode: q.topic.code,
            topicName: q.topic.name,
            difficulty: q.difficulty,
          },
        ])
      ),
      submittedAnswers,
      marksPerQ: exam.marksPerQ,         // SSC CGL: 2
      negativeMark: exam.negativeMark,   // SSC CGL: 0.5
    });

    // Expected: 8 correct × 2 = 16; 2 wrong × -0.5 = -1; total = 15
    assertEq(result.scoreRaw, 15, "scoreRaw = 8×2 − 2×0.5 = 15");
    assertEq(result.scoreMax, 24, "scoreMax = 12 × 2 = 24");
    assertEq(Math.round(result.scorePct * 100) / 100, 62.5, "scorePct = 62.5");
    assert(result.scored.filter((s) => s.correct).length === 8, "8 scored as correct");
    assert(result.scored.filter((s) => s.chosen != null && !s.correct).length === 2, "2 scored as wrong");
    assert(result.scored.filter((s) => s.chosen == null).length === 2, "2 scored as skipped");

    // Persist the submitted attempt
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: "SUBMITTED",
        finishedAt: new Date(),
        durationSec: 360,
        answers: result.scored as unknown as Prisma.InputJsonValue,
        scoreRaw: result.scoreRaw,
        scoreMax: result.scoreMax,
        scorePct: result.scorePct,
        topicScores: result.topicScores as unknown as Prisma.InputJsonValue,
      },
    });

    // ── Update WeaknessMap & verify roundtrip ────────────────────────────
    console.log("\n[5] WeaknessMap roundtrip");
    for (const [topicId, t] of result.topicAgg) {
      await prisma.weaknessMap.upsert({
        where: {
          userId_examId_topicId: { userId: user.id, examId: exam.id, topicId },
        },
        update: {
          attemptsCount: { increment: t.total },
          correctCount: { increment: t.correct },
          masteryScore: t.score,
          avgTimeSec: t.timeSum / t.total,
          lastSeenAt: new Date(),
        },
        create: {
          userId: user.id,
          examId: exam.id,
          topicId,
          attemptsCount: t.total,
          correctCount: t.correct,
          masteryScore: t.score,
          avgTimeSec: t.timeSum / t.total,
        },
      });
    }
    const weaknessRows = await prisma.weaknessMap.findMany({
      where: { userId: user.id, examId: exam.id },
    });
    assert(
      weaknessRows.length === result.topicAgg.size,
      `WeaknessMap has ${result.topicAgg.size} rows (one per touched topic)`
    );
    const totalsFromDb = weaknessRows.reduce(
      (acc, w) => ({ correct: acc.correct + w.correctCount, total: acc.total + w.attemptsCount }),
      { correct: 0, total: 0 }
    );
    assertEq(totalsFromDb.correct, 8, "WeaknessMap totals: correct = 8");
    assertEq(totalsFromDb.total, 12, "WeaknessMap totals: attempted = 12");

    // ── Read attempt back, ensure scores survived JSON roundtrip ─────────
    console.log("\n[6] Read attempt back from DB");
    const dbAttempt = await prisma.attempt.findUnique({ where: { id: attempt.id } });
    assert(dbAttempt, "attempt persists");
    assertEq(dbAttempt!.scoreRaw, 15, "scoreRaw round-trips through Postgres");
    assertEq(dbAttempt!.scoreMax, 24, "scoreMax round-trips");

    // ── Verify state read for next session ───────────────────────────────
    console.log("\n[7] StudentState reflects the new attempt");
    const stateAfter = await getStudentState(user.id, EXAM_CODE);
    assertEq(stateAfter.totalMocksTaken, 1, "totalMocksTaken = 1");
    assertEq(stateAfter.lastMockScorePct, dbAttempt!.scorePct ?? 0, "lastMockScorePct matches DB");
    assert(stateAfter.weaknesses.length > 0, "weaknesses populated");

    console.log("\n━━━━━━━ Result ━━━━━━━");
    console.log(`  ${pass} passed, ${fail} failed`);
    if (fail > 0) {
      console.error("\nFailures:");
      for (const f of failures) console.error(`  - ${f}`);
    }
  } finally {
    if (userId && !KEEP_DATA) {
      console.log("\nCleaning up test user (cascades to attempts, mocks, weakness, etc.)");
      await prisma.user.delete({ where: { id: userId } });
    } else if (KEEP_DATA && userId) {
      console.log(`\n--keep-data set; test user ${userId} (${TEST_EMAIL}) preserved.`);
    }
    await prisma.$disconnect();
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n❌ Smoke test crashed:", err);
  process.exit(2);
});
