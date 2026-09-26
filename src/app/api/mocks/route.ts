// POST /api/mocks — create a new mock test for the current user.
// Body: { examCode, request: GenerateMockRequest } (matches src/lib/ai/types.ts)
//
// School chapter practice (26 Sep 2026): { examCode: "NCERT_C09", school:
// true, request: { type: "TOPIC", topicCode, questionCount } } from a Class
// 8-12 school page builds "Practise this chapter" through
// src/lib/school/student-db.ts buildSchoolChapterMock — the chapter's
// answer-checked questions only, honest size, no generator, no AI, the same
// set /api/mocks/custom builds — and returns it in this route's `mock`
// shape (every client reads mock.id). Without the flag a school code is an
// unknown exam here, as before (realExamKey).

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { ensureEnrollment } from "@/lib/db/enrollment";
import { generateMock } from "@/lib/ai";
import { tryCatAdaptiveMock } from "@/lib/psychometrics";
import { getStudentState } from "@/lib/db/student-state";
import { getSyllabusContext } from "@/lib/db/syllabus";
import { bad, notFound, ok, serverError, unauth, parseBody } from "@/lib/http";
import { getSeenHistory } from "@/lib/answered-questions";
import {
  SEEN_WINDOW_DAYS,
  answeredBankLine,
  countRepeats,
  dedupeById,
  dedupeIds,
  partitionBySeen,
  pickWithSeenExclusion,
  seenSummary,
  shapeCandidates,
  type BankStats,
  type SeenHistory,
  type SeenInput,
} from "@/lib/question-pick";
import { rankByInstruction, shortfallLine, stripCountClaims, titleWithCount } from "@/lib/mock-fill";
import { buildSchoolChapterMock } from "@/lib/school/student-db";
import type { Difficulty, GenerateMockRequest, QuestionRef, SyllabusContext } from "@/lib/ai/types";

/** Narrow-select cap on the validated pool fetched per creation. Seen
 *  exclusion runs over this whole slice (the old code took 200/500 full
 *  rows BEFORE filtering, so unseen questions past the cap were never
 *  fetched). ids + topicId + difficulty + topic.code only — cheaper than
 *  the old 500 rows with body/options/solution text. */
const POOL_TAKE = 1000;

const Body = z.object({
  examCode: z.string(),
  // 26 Sep 2026: a school chapter practice (TOPIC on a student-mode container).
  school: z.boolean().optional(),
  request: z.discriminatedUnion("type", [
    z.object({ type: z.literal("DIAGNOSTIC"), questionCount: z.number().int().min(5).max(50) }),
    z.object({ type: z.literal("ADAPTIVE"), questionCount: z.number().int().min(5).max(100), durationMin: z.number().int().optional() }),
    z.object({ type: z.literal("TOPIC"), topicCode: z.string(), questionCount: z.number().int().min(5).max(50), difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional() }),
    z.object({ type: z.literal("SUBJECT"), subjectCode: z.string(), questionCount: z.number().int().min(10).max(100) }),
    z.object({ type: z.literal("FULL") }),
    z.object({ type: z.literal("REVISION"), questionCount: z.number().int().min(5).max(50) }),
    z.object({ type: z.literal("USER_REQUEST"), instruction: z.string().min(3), questionCount: z.number().int().min(5).max(50) }),
  ]),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const body = await parseBody(req, Body);

    // 26 Sep 2026: school chapter practice — no generator, no enrolment on an
    // exam; src/lib/school/student-db.ts owns the whole build.
    if (body.school) {
      if (body.request.type !== "TOPIC") return bad("A school chapter practice is a TOPIC request on the chapter's code.");
      const r = await buildSchoolChapterMock({
        userId: session.user.id,
        examCode: body.examCode,
        topicCode: body.request.topicCode,
        count: body.request.questionCount,
      });
      if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
      return ok({
        mock: {
          id: r.id,
          title: r.title,
          rationale: null,
          durationMin: r.durationMin,
          questionCount: r.count,
          requestedCount: r.requested,
          short: r.short,
          shortLine: r.line,
          topicMix: {},
          difficultyMix: {},
          bank: r.bank,
          school: true,
          chapterPath: r.chapterPath,
        },
      });
    }

    const exam = await prisma.exam.findUnique({ where: realExamKey({ code: body.examCode }) });
    if (!exam) return notFound("exam");

    // Build candidate question pool — only validated questions go to live mocks.
    // `pool` = what the generator may pick from (unseen first — see
    // fetchCandidatePool); `full` = the whole validated scope, used for the
    // post-generator top-up and the honest bank numbers.
    const { candidates: pool, full, seen, bankSize, seenInBank } = await fetchCandidatePool(exam.id, session.user.id, body.request);
    // `seen` is null when the seen query failed: pick as if nothing were
    // seen (a DB blip must not fail the mock) but report NO bank numbers —
    // an empty map would make the honest line say "seen 0 of M".
    const seenForPick: SeenInput = seen ?? new Map();
    if (pool.length === 0) {
      return bad("No questions available yet for this configuration. Try a different topic or wait for content to be seeded.");
    }

    const studentState = await getStudentStateOrInit(session.user.id, body.examCode);
    const syllabus = await getSyllabusContext(body.examCode);

    // Free text (25 Sep 2026): the model reads at most 120 candidates in
    // pool order, so a request naming a topic whose questions sat past the
    // first 120 came back with 3 questions under a "25Q" title. Put the
    // questions of the topics the request names first — nothing is added
    // or dropped.
    const candidates =
      body.request.type === "USER_REQUEST"
        ? rankByInstruction(pool, body.request.instruction, topicTextLookup(syllabus))
        : pool;

    // ADAPTIVE: try the psychometric CAT engine first — measurement-driven,
    // deterministic, and no Claude call. Returns null until the student has
    // enough response history; then we fall back to the LLM heuristic.
    let result =
      body.request.type === "ADAPTIVE"
        ? await tryCatAdaptiveMock(prisma, {
            userId: session.user.id,
            examId: exam.id,
            examShortName: syllabus.examShortName,
            questionCount: body.request.questionCount,
            durationMin: body.request.durationMin,
            pool,
          })
        : null;
    const usedCat = result != null;

    if (!result) {
      result = await generateMock({
        studentState,
        request: body.request as GenerateMockRequest,
        availableQuestions: candidates,
        syllabus,
      });
    }

    // ── Seen-exclusion, second half ──────────────────────────────────
    // 1. Never the same question twice in one mock (the rule-based
    //    DIAGNOSTIC/FULL assemblers match subjects by topic-code prefix
    //    and can double-push when one subject's code prefixes another's).
    // 2. If the generator came back short of the request (unseen-only
    //    candidates lacked a subject/difficulty), top up from the full
    //    scope: unseen first, then least-recently-seen. Exempt:
    //      REVISION     — re-showing wrong answers IS the point.
    //      USER_REQUEST — the LLM picked against the student's own
    //                     instruction and wrote the title/rationale for
    //                     THAT set; padding it from the exam-wide scope
    //                     would put maths into a "Polity" paper. An
    //                     honest smaller set beats a padded wrong one.
    // 3. Report the real numbers: bank size, how many of it the student
    //    has seen in the window, how many of THIS set repeat — only when
    //    the seen query succeeded (bank = null otherwise; never a guess).
    const isRevision = body.request.type === "REVISION";
    const topUpExempt = isRevision || body.request.type === "USER_REQUEST";
    const requested = "questionCount" in body.request ? body.request.questionCount : null;
    let finalIds = dedupeIds(result.questionIds);
    if (requested && finalIds.length < requested && !topUpExempt) {
      const have = new Set(finalIds);
      const { picked } = pickWithSeenExclusion(
        full.filter((q) => !have.has(q.id)),
        requested - finalIds.length,
        seenForPick,
      );
      finalIds = finalIds.concat(picked.map((q) => q.id));
    }
    // Checked AFTER the top-up (13 Sep 2026): a 5-question diagnostic on an
    // exam with more than five subjects samples only the first five, and a
    // student who had seen those got 0 unseen candidates — a hard error
    // while unseen questions sat in the other subjects.
    if (finalIds.length === 0) {
      return bad("Could not assemble a mock from available questions.");
    }
    const { topicMix, difficultyMix } =
      finalIds.length === result.questionIds.length
        ? { topicMix: result.topicMix, difficultyMix: result.difficultyMix }
        : mixesFor(finalIds, full);
    const bank: BankStats | null =
      isRevision || seen == null || seenInBank == null
        ? null
        : {
            size: bankSize,
            seen: seenInBank,
            repeats: countRepeats(finalIds, seen),
            windowDays: SEEN_WINDOW_DAYS,
          };

    // Honest size (25 Sep 2026): a free-text mock titled "25Q" held 3
    // questions. A model-written title loses any count claim and states
    // the number the mock really holds; any other title gains the real
    // number whenever the set came back smaller than asked.
    const short = requested != null && finalIds.length < requested;
    const title =
      body.request.type === "USER_REQUEST" || short
        ? titleWithCount(result.title, finalIds.length, "Custom mock")
        : stripCountClaims(result.title) || result.title;

    const mock = await prisma.mock.create({
      data: {
        userId: session.user.id,
        examId: exam.id,
        type: mockTypeFromRequest(body.request),
        title,
        config: {
          rationale: result.rationale,
          topicMix,
          difficultyMix,
          durationMin: result.durationMin,
          requestType: body.request.type,
          count: finalIds.length,
          ...(requested != null ? { requestedCount: requested } : {}),
          // Persisted so the player / results page can show the same
          // honest line later (every /api/mocks client auto-redirects).
          // Spread into a literal: an interface has no index signature,
          // which Prisma's InputJsonValue requires. `seen` counts ANSWERED
          // questions since 25 Sep 2026 (basis marks the change).
          ...(bank ? { seen: { ...bank, basis: "answered" } } : {}),
        },
        questionIds: finalIds,
        generatedBy:
          body.request.type === "DIAGNOSTIC"
            ? "ai:diagnostic"
            : usedCat
              ? "cat:irt"
              : (result as { fallback?: boolean }).fallback
                ? "rule:ai-unavailable"
                : "ai",
        generationContext: { studentSnapshot: studentState as any },
      },
    });

    return ok({
      mock: {
        id: mock.id,
        title: mock.title,
        rationale: result.rationale,
        durationMin: result.durationMin,
        questionCount: finalIds.length,
        // Additive (25 Sep 2026): what was asked for, and the plain line
        // when the set holds fewer ("Only 3 questions were available for
        // this request, so this mock has 3, not 25.").
        requestedCount: requested,
        short,
        shortLine: requested != null ? shortfallLine(requested, finalIds.length, "this request") : null,
        topicMix,
        difficultyMix,
        // Additive: { size, seen, repeats, windowDays, line }. null for
        // REVISION (all repeats by design). Existing clients read only
        // mock.id. `seen` = answered questions.
        bank: bank ? { ...bank, line: answeredBankLine(bank) } : null,
      },
    });
  } catch (err: any) {
    // Our own friendly refusals carry their message. A model-provider error
    // (the Anthropic SDK's APIError carries `headers` / `error`) must never
    // reach a student verbatim — on 11-13 Sep "credit balance is too low" did,
    // because it arrives with status 400.
    if (err?.friendly) return Response.json({ error: err.message }, { status: err.status ?? 503 });
    if (err?.headers !== undefined || err?.error?.type !== undefined) {
      console.error("[mocks] model provider error:", err?.status, err?.message);
      return Response.json(
        { error: "Our AI helper is unavailable for a few minutes. A topic test or the diagnostic starts right away." },
        { status: 503 },
      );
    }
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

interface CandidatePool {
  /** What the generator / CAT engine may pick from: unseen first, topped
   *  up with least-recently-seen only when unseen < floor. */
  candidates: QuestionRef[];
  /** The whole validated scope (topic / subject / exam), capped at POOL_TAKE
   *  (plus up to POOL_TAKE unseen rows fetched directly when the cap hit). */
  full: QuestionRef[];
  /** answered / shown-only questions for this user+exam in the window
   *  (src/lib/answered-questions.ts). NULL when the seen query failed
   *  (pick without exclusion, report no numbers) and for REVISION (no bank
   *  numbers by design). */
  seen: SeenHistory | null;
  /** Exact validated count of the scope (== full.length unless the cap hit). */
  bankSize: number;
  /** Exact count of the scope the student has seen in the window — from the
   *  DB when the cap hit, never from a sample. NULL whenever `seen` is. */
  seenInBank: number | null;
}

const NARROW_SELECT = {
  id: true,
  topicId: true,
  difficulty: true,
  topic: { select: { code: true } },
} as const;

async function fetchCandidatePool(
  examId: string,
  userId: string,
  request: GenerateMockRequest
): Promise<CandidatePool> {
  // Withdrawn questions (tag "rejected") never reach a mock, even if a
  // row were ever left validated (25 Sep 2026).
  const baseWhere = { examId, validated: true, NOT: { tags: { has: "rejected" } } };

  // REVISION intentionally re-shows past wrong questions, so it must
  // NOT get the don't-repeat / escalation treatment — handled in its
  // own branch below before we compute the modifiers.
  if (request.type === "REVISION") {
    const revision = await fetchRevisionPool(examId, userId, request);
    return { candidates: revision, full: revision, seen: null, bankSize: revision.length, seenInBank: null };
  }

  // ── DEPTH LEVER 1 ────────────────────────────────────────────────
  // Two signals computed once per request (one query each):
  //   seen     — this user's history on this exam in the last
  //              SEEN_WINDOW_DAYS days: questions ANSWERED (seen) and
  //              questions only on screen, never answered (25 Sep 2026).
  //              Never-shown questions go first; when they run short we
  //              fall back to shown-but-unanswered, then to the
  //              LEAST-recently-answered ones (never a random recycle of
  //              the whole bank).
  //   isStrong — recent submitted attempts average > 70%. Such users
  //              get EASY questions dropped so the mock skews harder —
  //              the platform pushes them instead of coasting.
  // TOPIC requests that pin an explicit difficulty opt OUT of
  // escalation (the user picked the level).
  const [seen, strongPerformer] = await Promise.all([
    getSeenHistory(userId, examId),
    isStrongPerformer(examId, userId),
  ]);
  // null = the seen query failed. Pick as if nothing were seen; the
  // caller reports no bank numbers (see CandidatePool.seen).
  const seenForPick: SeenInput = seen ?? new Map();
  const escalate =
    strongPerformer && !(request.type === "TOPIC" && request.difficulty);

  let where: Record<string, unknown>;
  if (request.type === "TOPIC") {
    // Scope topic lookup to this exam — different exams can share topic codes.
    const topic = await prisma.topic.findFirst({
      where: { code: request.topicCode, subject: { examId } },
      include: { children: { select: { id: true } } },
    });
    if (!topic) return emptyPool(seen);
    const topicIds = [topic.id, ...topic.children.map((c) => c.id)];
    where = {
      ...baseWhere,
      topicId: { in: topicIds },
      ...(request.difficulty && { difficulty: request.difficulty }),
    };
  } else {
    // DIAGNOSTIC / ADAPTIVE / SUBJECT / FULL / USER_REQUEST → broad pool
    where = { ...baseWhere };
    if (request.type === "SUBJECT") {
      const subject = await prisma.subject.findFirst({
        where: { examId, code: request.subjectCode },
        include: { topics: { select: { id: true } } },
      });
      if (!subject) return emptyPool(seen);
      where.topicId = { in: subject.topics.map((t) => t.id) };
    }
  }

  const qs = await prisma.question.findMany({ where, select: NARROW_SELECT, take: POOL_TAKE });
  let full = qs.map(toRef);
  let bankSize = full.length;
  let seenInBank: number | null = seen ? seenSummary(full, seen).seenInBank : null;

  // FULL has no explicit questionCount in the request; assume the
  // exam's full length is fine, fall back to 25 as a sensible floor
  // for the exhaustion check.
  const minKeep = "questionCount" in request ? request.questionCount : 25;

  if (qs.length >= POOL_TAKE) {
    // Cap hit (rare — most banks are well under POOL_TAKE): `full` is an
    // arbitrary un-ordered sample of the scope, and two things must never
    // come from a sample:
    //   - the honest numbers — bank size AND seen-in-scope are counted in
    //     the DB (seen ids are bounded by the student's own attempts in
    //     the window, so the IN list is small);
    //   - the unseen pool — if the sample's never-shown slice is short of
    //     the floor, fetch never-shown rows directly (id NOT IN answered or
    //     shown) so a repeat is never served while fresh questions exist
    //     past the cap.
    // Bank numbers count ANSWERED questions (25 Sep 2026).
    const seenIds = seen ? [...seen.answered.keys()] : [];
    const touchedIds = seen ? [...seen.answered.keys(), ...seen.shown.keys()] : [];
    const floor = Math.max(minKeep, 5);
    const needUnseen = seen != null && touchedIds.length > 0 && partitionBySeen(full, seen).fresh.length < floor;
    const [total, seenCount, unseenRows] = await Promise.all([
      prisma.question.count({ where }),
      seen == null
        ? Promise.resolve<number | null>(null)
        : seenIds.length === 0
          ? Promise.resolve<number | null>(0)
          : prisma.question.count({ where: { ...where, id: { in: seenIds } } }),
      needUnseen
        ? prisma.question.findMany({ where: { ...where, id: { notIn: touchedIds } }, select: NARROW_SELECT, take: POOL_TAKE })
        : Promise.resolve([] as typeof qs),
    ]);
    bankSize = total;
    seenInBank = seenCount;
    if (unseenRows.length > 0) full = dedupeById([...unseenRows.map(toRef), ...full]);
  }

  const candidates = shapePool(full, { seen: seenForPick, escalate, minKeep });
  return { candidates, full, seen, bankSize, seenInBank };
}

function emptyPool(seen: SeenHistory | null): CandidatePool {
  return { candidates: [], full: [], seen, bankSize: 0, seenInBank: seen ? 0 : null };
}

// REVISION = deliberately re-show past wrong questions. No don't-repeat,
// no escalation — re-seeing them IS the point.
async function fetchRevisionPool(
  examId: string,
  userId: string,
  request: Extract<GenerateMockRequest, { type: "REVISION" }>,
): Promise<QuestionRef[]> {
  void request;
  const wrongAttempts = await prisma.attempt.findMany({
    where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, mock: { examId } },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: { answers: true },
  });
  const wrongIds = new Set<string>();
  for (const a of wrongAttempts) {
    const ans = (a.answers as any[]) ?? [];
    for (const x of ans) if (x?.correct === false && x?.questionId) wrongIds.add(x.questionId);
  }
  if (wrongIds.size === 0) return [];
  const qs = await prisma.question.findMany({
    where: { examId, validated: true, NOT: { tags: { has: "rejected" } }, id: { in: [...wrongIds] } },
    include: { topic: true },
  });
  return qs.map(toRef);
}

// ─────────────────────────────────────────────────────────────────────
// DEPTH LEVER 1 helpers — don't-repeat + difficulty escalation.
// (The seen query itself lives in src/lib/seen-questions.ts; the pure
// unseen-first / least-recently-seen logic in src/lib/question-pick.ts.)
// ─────────────────────────────────────────────────────────────────────

/** True when the user's recent submitted attempts on this exam average
 *  above the escalation threshold (70%). scorePct is stored 0-100.
 *  Needs at least 2 graded attempts so a single lucky diagnostic
 *  doesn't prematurely ramp difficulty. */
async function isStrongPerformer(examId: string, userId: string): Promise<boolean> {
  const recent = await prisma.attempt.findMany({
    where: {
      userId,
      mock: { examId },
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      scorePct: { not: null },
    },
    orderBy: { finishedAt: "desc" },
    take: 2,
    select: { scorePct: true },
  });
  if (recent.length < 2) return false;
  const avg = recent.reduce((s, a) => s + (a.scorePct ?? 0), 0) / recent.length;
  return avg > 70;
}

/** Apply don't-repeat + escalation to a candidate pool, with graceful
 *  fallbacks so we never starve a mock:
 *    1. Keep only unseen questions. If that leaves < floor, top up with
 *       the LEAST-recently-seen ones — exactly enough to reach floor,
 *       so the generator cannot prefer a question seen last week over
 *       one seen two months ago (the old code recycled the whole pool
 *       here, which is where "Why repeatedly questions asked??" came from).
 *    2. If escalate, drop EASY. If that leaves < floor, keep EASY
 *       (not enough hard content yet → don't starve). */
function shapePool(
  pool: QuestionRef[],
  opts: { seen: SeenInput; escalate: boolean; minKeep: number },
): QuestionRef[] {
  const floor = Math.max(opts.minKeep, 5);

  let out = shapeCandidates(pool, opts.seen, floor);

  if (opts.escalate) {
    const harder = out.filter((q) => q.difficulty !== "EASY");
    if (harder.length >= floor) out = harder;
  }
  return out;
}

/** topicCode -> "topic name + subject name" for rankByInstruction, from the
 *  syllabus the generator already loaded (subtopics included, since a
 *  question may hang off one). Unknown codes match on the code alone. */
function topicTextLookup(syllabus: SyllabusContext): (topicCode: string) => string {
  const text = new Map<string, string>();
  for (const s of syllabus.subjects) {
    for (const t of s.topics) {
      text.set(t.code, `${t.name} ${s.name}`);
      for (const st of t.subtopics ?? []) text.set(st.code, `${st.name} ${t.name} ${s.name}`);
    }
  }
  return (code) => text.get(code) ?? "";
}

/** Recompute topic / difficulty mixes after a post-generator top-up so
 *  the stored config describes the set that was actually created. */
function mixesFor(ids: string[], full: QuestionRef[]) {
  const byId = new Map(full.map((q) => [q.id, q]));
  const topicMix: Record<string, number> = {};
  const difficultyMix: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const id of ids) {
    const q = byId.get(id);
    if (!q) continue;
    topicMix[q.topicCode] = (topicMix[q.topicCode] ?? 0) + 1;
    difficultyMix[q.difficulty] = (difficultyMix[q.difficulty] ?? 0) + 1;
  }
  return { topicMix, difficultyMix };
}

function toRef(q: { id: string; topicId: string; difficulty: Difficulty; topic: { code: string } }): QuestionRef {
  return {
    id: q.id,
    topicId: q.topicId,
    topicCode: q.topic.code,
    difficulty: q.difficulty,
  };
}

function mockTypeFromRequest(r: GenerateMockRequest) {
  switch (r.type) {
    case "DIAGNOSTIC": return "DIAGNOSTIC" as const;
    case "ADAPTIVE": return "ADAPTIVE" as const;
    case "TOPIC": return "TOPIC" as const;
    case "SUBJECT": return "SUBJECT" as const;
    case "FULL": return "FULL" as const;
    case "REVISION": return "REVISION" as const;
    case "USER_REQUEST": return "USER_REQUEST" as const;
  }
}

async function getStudentStateOrInit(userId: string, examCode: string) {
  // Auto-enroll if not yet enrolled — frictionless first mock.
  const exam = await prisma.exam.findUnique({ where: realExamKey({ code: examCode }) });
  if (!exam) throw new Error("Exam not found");
  await ensureEnrollment(userId, exam);
  return await getStudentState(userId, examCode);
}
