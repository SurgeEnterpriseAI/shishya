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
//
// Unseen-first (11 Sep 2026): questions the student has had in ANY mock
// they opened on this exam in the last SEEN_WINDOW_DAYS days are picked
// only after the unseen pool is exhausted, least-recently-seen first,
// never twice in one paper; the response says exactly how many repeat
// (`bank`) so the builder page can show it before the student starts.
// If the seen query fails we still build the paper (no exclusion) but
// `bank` is null and nothing is persisted in config.seen — a "seen 0 of
// M" we did not measure is not an honest number.

import { z } from "zod";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { getSeenQuestions } from "@/lib/seen-questions";
import {
  SEEN_WINDOW_DAYS,
  bankLine,
  countRepeats,
  partitionBySeen,
  pickTiered,
  seenSummary,
  shuffleWith,
  type BankStats,
  type SeenMap,
} from "@/lib/question-pick";

const Body = z.object({
  examCode: z.string().min(1).max(64),
  topicIds: z.array(z.string().min(1).max(40)).min(1).max(10),
  count: z.union([z.literal(10), z.literal(25), z.literal(50)]),
  difficulty: z.enum(["MIXED", "EASY", "HARD"]),
});

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

  // Pull the candidate pool once (ids + topic + difficulty) and the
  // student's seen map once (questionId -> lastSeenAt on this exam in
  // the window); sample in JS.
  const [pool, seen] = await Promise.all([
    prisma.question.findMany({
      where: { examId: exam.id, topicId: { in: validIds }, validated: true },
      select: { id: true, topicId: true, difficulty: true },
    }),
    getSeenQuestions(userId, exam.id),
  ]);
  // seen === null → the seen query failed: sample as if nothing were
  // seen, but report no numbers (see header).
  const seenForPick: SeenMap = seen ?? new Map();
  type Row = (typeof pool)[number];
  const strict = diffFilter ? pool.filter((q) => q.difficulty === diffFilter) : pool;
  const fallback = diffFilter ? pool.filter((q) => q.difficulty === "MEDIUM") : [];

  // Pass 1 — even split across topics, UNSEEN strict questions only.
  const per = Math.ceil(count / validIds.length);
  const picked = new Map<string, Row>();
  for (const tid of validIds) {
    const { unseen } = partitionBySeen(strict.filter((q) => q.topicId === tid), seenForPick);
    for (const q of shuffleWith(unseen).slice(0, per)) picked.set(q.id, q);
  }
  // Pass 2 — top up to `count`: unseen from the rest of the strict pool,
  // then unseen MEDIUM fallback, then least-recently-seen strict, then
  // least-recently-seen fallback. A thin topic never shrinks the paper,
  // and a repeat is only ever the oldest one available.
  if (picked.size < count) {
    const rest = (qs: Row[]) => qs.filter((q) => !picked.has(q.id));
    const { picked: extra } = pickTiered([rest(strict), rest(fallback)], count - picked.size, seenForPick);
    for (const q of extra) picked.set(q.id, q);
  }
  // Pass 1 can overshoot `count` (ceil per topic): trim unseen-first
  // (was a random trim), then shuffle for presentation order.
  const chosen = pickTiered([[...picked.values()]], count, seenForPick).picked;
  const questionIds = shuffleWith(chosen).map((q) => q.id);
  if (questionIds.length < 5) {
    return NextResponse.json({ error: "not enough questions for this selection" }, { status: 422 });
  }

  // Honest numbers for the response + config. `pool` is the whole
  // validated bank of the chosen topics (all difficulties — the same
  // number the builder page shows as "available"). null when the seen
  // query failed — we then have no number to report.
  const bank: BankStats | null = seen
    ? {
        size: seenSummary(pool, seen).bankSize,
        seen: seenSummary(pool, seen).seenInBank,
        repeats: countRepeats(questionIds, seen),
        windowDays: SEEN_WINDOW_DAYS,
      }
    : null;

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
        ...(bank ? { seen: bank } : {}),
      } as object,
    },
    select: { id: true },
  });

  return NextResponse.json({
    id: mock.id,
    count: questionIds.length,
    durationMin,
    // null when the seen query failed — the builder page then starts the
    // mock straight away, exactly as it does for a set with no repeats.
    bank: bank ? { ...bank, line: bankLine(bank) } : null,
  });
}
