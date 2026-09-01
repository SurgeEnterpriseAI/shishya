// POST /api/mocks/custom — the custom mock builder (1 Sep 2026).
//
// Built from mined demand (/admin/demand): "mock in which (maths -
// number system and ratio & proportion), Polity(...)", "I want topic
// wise mock test like, today india polity". Students pick topics +
// count + difficulty; we sample from the validated pool and hand back
// a Mock the existing /mocks/[id] player runs (incl. its 13-language
// translation picker).
//
// Sampling: even split across chosen topics, then top-up from the
// whole selection so a thin topic never shrinks the paper. EASY/HARD
// filter falls back to MEDIUM rows when the strict pool runs short —
// an honest smaller-but-right paper beats a padded wrong one, so the
// final count may be lower than asked when the pool genuinely lacks
// questions; the response says how many.

import { z } from "zod";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

const Body = z.object({
  examCode: z.string().min(1).max(64),
  topicIds: z.array(z.string().min(1).max(40)).min(1).max(10),
  count: z.union([z.literal(10), z.literal(25), z.literal(50)]),
  difficulty: z.enum(["MIXED", "EASY", "HARD"]),
});

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "sign-in required" }, { status: 401 });

  const rl = await checkRateLimit("explain", userId);
  if (!rl.ok) return rateLimited(rl);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { examCode, topicIds, count, difficulty } = parsed.data;

  const exam = await prisma.exam.findUnique({
    where: { code: examCode },
    select: { id: true, shortName: true, durationMin: true, totalQuestions: true },
  });
  if (!exam) return NextResponse.json({ error: "unknown exam" }, { status: 404 });

  // Validate topics belong to this exam (via subject) and load names.
  const topics = await prisma.$queryRaw<{ id: string; name: string }[]>(Prisma.sql`
    SELECT t.id, t.name FROM "Topic" t
    JOIN "Subject" s ON s.id = t."subjectId"
    WHERE s."examId" = ${exam.id} AND t.id IN (${Prisma.join(topicIds)})`);
  if (topics.length === 0) return NextResponse.json({ error: "no matching topics" }, { status: 400 });

  const validIds = topics.map((t) => t.id);
  const diffFilter = difficulty === "MIXED" ? undefined : difficulty;

  // Pull the candidate pool once (ids + topic + difficulty), sample in JS.
  const pool = await prisma.question.findMany({
    where: { examId: exam.id, topicId: { in: validIds }, validated: true },
    select: { id: true, topicId: true, difficulty: true },
  });
  const strict = diffFilter ? pool.filter((q) => q.difficulty === diffFilter) : pool;
  const fallback = diffFilter ? pool.filter((q) => q.difficulty === "MEDIUM") : [];

  // Even split across topics from the strict pool…
  const per = Math.ceil(count / validIds.length);
  const picked = new Set<string>();
  for (const tid of validIds) {
    const mine = shuffle(strict.filter((q) => q.topicId === tid).map((q) => q.id));
    for (const id of mine.slice(0, per)) picked.add(id);
  }
  // …then top up to `count` from the rest of the strict pool, then the
  // MEDIUM fallback.
  for (const q of shuffle([...strict, ...fallback])) {
    if (picked.size >= count) break;
    picked.add(q.id);
  }
  const questionIds = shuffle([...picked]).slice(0, count);
  if (questionIds.length < 5) {
    return NextResponse.json({ error: "not enough questions for this selection" }, { status: 422 });
  }

  const perQMin = exam.totalQuestions > 0 ? exam.durationMin / exam.totalQuestions : 1;
  const durationMin = Math.min(exam.durationMin, Math.max(10, Math.round(questionIds.length * perQMin)));

  const names = topics.map((t) => t.name);
  const title = `${exam.shortName} — Custom: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3}` : ""}`;

  const mock = await prisma.mock.create({
    data: {
      examId: exam.id,
      userId,
      type: "USER_REQUEST",
      title,
      questionIds,
      generatedBy: "custom-builder",
      config: {
        topics: validIds,
        topicNames: names,
        difficulty,
        count: questionIds.length,
        requestedCount: count,
        durationMin,
      } as object,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: mock.id, count: questionIds.length, durationMin });
}
