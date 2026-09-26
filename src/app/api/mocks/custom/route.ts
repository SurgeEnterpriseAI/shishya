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
//
// PYQ mode (15 Sep 2026): pyqOnly draws only PYQ-pattern questions (source
// PYQ, every year) — the builder's ?pyq=1 page counts the same pool, so its
// "available" and `bank.size` agree. Students asked for "PYQ topic based".
//
// Honest size (25 Sep 2026): 232 of 370 builder mocks came back short and
// were still titled as asked. The title now carries the number the mock
// really holds ("… · 18 questions", src/lib/mock-fill.ts), config keeps
// count + requestedCount, and the response carries `requested`, `short` and
// a plain `line` ("Only 18 questions were available for these topics …").
// `count` may be any size 5-50: the builder offers "All N" when a selection
// holds fewer than 50.
//
// Seen = answered (25 Sep 2026): the seen map is now a SeenHistory
// (src/lib/answered-questions.ts). Order of preference: never-shown →
// shown but never answered (least-recently-shown first) → answered
// (least-recently-answered first). `bank.seen` / `repeats` count answered
// questions only. Withdrawn questions (tag "rejected") never enter the pool.
//
// School chapter practice (26 Sep 2026): `school: true` + `topicCode` (the
// chapter's Topic.code) builds "Practise this chapter" for a signed-in
// student of a student-mode class (Class 8-12, src/lib/school/student-classes.ts)
// — up to 10 of the chapter's answer-checked questions, honest size, no AI —
// through src/lib/school/student-db.ts buildSchoolChapterMock, which is the
// only place that reads a school container; this route keeps realExamKey()
// for every other request, so a school code without the flag stays an
// unknown exam. An account that has not answered the age-band card gets
// 403 { error: "school-band-required" } and the page shows the card.

import { z } from "zod";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { getSeenHistory } from "@/lib/answered-questions";
import {
  SEEN_WINDOW_DAYS,
  answeredBankLine,
  countRepeats,
  partitionBySeen,
  pickTiered,
  seenSummary,
  shuffleWith,
  type BankStats,
  type SeenInput,
} from "@/lib/question-pick";
import { MAX_BUILDER_QUESTIONS, MIN_MOCK_QUESTIONS, questionsLabel, shortfallLine, titleWithCount } from "@/lib/mock-fill";
import { buildSchoolChapterMock } from "@/lib/school/student-db";

const Body = z
  .object({
    examCode: z.string().min(1).max(64),
    topicIds: z.array(z.string().min(1).max(40)).min(1).max(10).optional(),
    count: z.number().int().min(MIN_MOCK_QUESTIONS).max(MAX_BUILDER_QUESTIONS),
    difficulty: z.enum(["MIXED", "EASY", "HARD"]),
    pyqOnly: z.boolean().optional(),
    // 26 Sep 2026: school chapter practice — the chapter's Topic.code.
    school: z.boolean().optional(),
    topicCode: z.string().min(1).max(80).optional(),
  })
  .refine((b) => (b.school ? typeof b.topicCode === "string" : Array.isArray(b.topicIds)), {
    message: "topicIds (exam) or school + topicCode (school chapter) required",
  });

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "sign-in required" }, { status: 401 });

  const rl = await checkRateLimit("explain", userId);
  if (!rl.ok) return rateLimited(rl);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { examCode, count, difficulty, pyqOnly = false } = parsed.data;

  // 26 Sep 2026: "Practise this chapter" on a Class 8-12 school page.
  if (parsed.data.school) {
    const r = await buildSchoolChapterMock({ userId, examCode, topicCode: parsed.data.topicCode as string, count });
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.available !== undefined ? { available: r.available } : {}) }, { status: r.status });
    return NextResponse.json({
      id: r.id,
      title: r.title,
      count: r.count,
      requested: r.requested,
      short: r.short,
      line: r.line,
      durationMin: r.durationMin,
      bank: r.bank,
      school: true,
      chapterPath: r.chapterPath,
    });
  }
  const topicIds = parsed.data.topicIds as string[];

  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code: examCode }),
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
  // student's seen history once (answered / shown-only questions on this
  // exam in the window); sample in JS.
  const [pool, seen] = await Promise.all([
    prisma.question.findMany({
      where: {
        examId: exam.id,
        topicId: { in: validIds },
        validated: true,
        NOT: { tags: { has: "rejected" } },
        ...(pyqOnly ? { source: "PYQ" as const } : {}),
      },
      select: { id: true, topicId: true, difficulty: true },
    }),
    getSeenHistory(userId, exam.id),
  ]);
  // seen === null → the seen query failed: sample as if nothing were
  // seen, but report no numbers (see header).
  const seenForPick: SeenInput = seen ?? new Map();
  type Row = (typeof pool)[number];
  const strict = diffFilter ? pool.filter((q) => q.difficulty === diffFilter) : pool;
  const fallback = diffFilter ? pool.filter((q) => q.difficulty === "MEDIUM") : [];

  // Pass 1 — even split across topics, strict questions the student has
  // NOT answered: never-shown first, then shown-but-unanswered
  // (least-recently-shown first).
  const per = Math.ceil(count / validIds.length);
  const picked = new Map<string, Row>();
  for (const tid of validIds) {
    const { fresh, shownLrs } = partitionBySeen(strict.filter((q) => q.topicId === tid), seenForPick);
    for (const q of [...shuffleWith(fresh), ...shownLrs].slice(0, per)) picked.set(q.id, q);
  }
  // Pass 2 — top up to `count`: never-shown from the rest of the strict
  // pool, then never-shown MEDIUM fallback, then shown-but-unanswered
  // (strict, then fallback), then least-recently-answered strict, then
  // fallback. A thin topic never shrinks the paper, and a repeat is only
  // ever the oldest one available.
  if (picked.size < count) {
    const rest = (qs: Row[]) => qs.filter((q) => !picked.has(q.id));
    const { picked: extra } = pickTiered([rest(strict), rest(fallback)], count - picked.size, seenForPick);
    for (const q of extra) picked.set(q.id, q);
  }
  // Pass 1 can overshoot `count` (ceil per topic): trim unseen-first
  // (was a random trim), then shuffle for presentation order.
  const chosen = pickTiered([[...picked.values()]], count, seenForPick).picked;
  const questionIds = shuffleWith(chosen).map((q) => q.id);
  if (questionIds.length < MIN_MOCK_QUESTIONS) {
    return NextResponse.json(
      {
        error: `Only ${questionsLabel(questionIds.length)} ${questionIds.length === 1 ? "is" : "are"} available for this selection — a mock needs at least ${MIN_MOCK_QUESTIONS}. Add another topic, or choose Mixed.`,
        available: questionIds.length,
      },
      { status: 422 },
    );
  }

  // Honest numbers for the response + config. `pool` is the whole
  // validated bank of the chosen topics (all difficulties). `seen` counts
  // ANSWERED questions. null when the seen query failed — we then have no
  // number to report.
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
  // The number in the title is the number of questions picked, never the
  // size asked for.
  const title = titleWithCount(
    `${exam.shortName} — ${pyqOnly ? "PYQ-pattern practice" : "Custom"}: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3}` : ""}`,
    questionIds.length,
  );
  const short = questionIds.length < count;

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
        ...(pyqOnly ? { pyqOnly: true } : {}),
        durationMin,
        // Additive (25 Sep 2026): `seen` counts answered questions.
        ...(bank ? { seen: { ...bank, basis: "answered" } } : {}),
      } as object,
    },
    select: { id: true },
  });

  return NextResponse.json({
    id: mock.id,
    title,
    count: questionIds.length,
    requested: count,
    // true when the selection held fewer questions than asked; `line` then
    // says so in plain words (the builder shows its own localised copy).
    short,
    line: shortfallLine(count, questionIds.length),
    durationMin,
    // null when the seen query failed — the builder page then starts the
    // mock straight away, exactly as it does for a set with no repeats.
    bank: bank ? { ...bank, line: answeredBankLine(bank) } : null,
  });
}
