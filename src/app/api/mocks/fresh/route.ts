// POST /api/mocks/fresh — "Get 10 fresh questions" on the results page.
//
// Body: { examCode: string, topicCode: string, count?: number (5–15), attemptId?: string }
//
// 6 Oct 2026 — the set is picked, not written. Until today this route asked
// the AI for `count` new questions on the attempt's weakest topic at the
// moment of the press, saved them validated:false and built a CHALLENGE mock
// on them. Since 26 Sep 2026 (ebd0a9c) a mock serves only answer-checked
// questions (src/lib/served-paper.ts), so each set served 0 questions and
// opened on "This mock is being rebuilt" — 105 sets for 34 students, US$4.39
// of model spend, none played (RCA, 6 Oct 2026). The site's promise that
// mocks serve only answer-checked questions stays; so now:
//   • no model call, no new question: the set is up to `count` of the exam's
//     questions that are servable (the served-paper rule) AND passed the
//     answer check (the firewall's record, the rule of
//     src/lib/exam-answer-check.ts, computed below as "answerChecked"), in
//     the language of the attempt's paper, that this student has never seen
//     in any attempt — the pressed topic first, then the attempt's other
//     weak topics, then the topic's subject, then the whole exam
//     (src/lib/fresh-set.ts pickFreshSet, pure);
//   • it is an ordinary owned mock (type CHALLENGE, generatedBy
//     FRESH_GENERATED_BY): /mocks/[id] serves it and fixes its paper when the
//     attempt starts (src/app/mocks/[id]/page.tsx creates the attempt with
//     paperSkeleton(servedPaperIds(...))), exactly like any other mock;
//   • with fewer than FRESH_SET_MIN (5) left, no mock is made: 200
//     { result: "too-few", practised, total, exam, links } and the card says
//     how many of the exam's answer-checked questions the student has
//     practised, with links to the topic quizzes and previous-year papers;
//   • one set at a time per exam (review fix, 6 Oct 2026): /mocks/[id]
//     creates the attempt as soon as the student lands, so "reuse an
//     unstarted set" almost never applied and a press, back, press made a
//     new set each time (and put the first set's 10 in "seen"). Now, before
//     anything is picked, the student's latest fresh set on this exam that no
//     attempt has submitted — not started, in progress or discarded — comes
//     back (reused: true) and /mocks/[id] resumes or starts it; a new set is
//     made only after the last one is submitted. The lookup is repeated
//     under a per-student, per-exam transaction lock just before the create,
//     so two presses at once (two tabs, a retry) make one set. That bounds
//     the sets, so the old daily cap (it bounded model spend) is gone.
// Signed out → 401 as before (the results page itself needs a sign-in). A
// school container is an unknown exam here (realExamKey), so Class 1-12
// school attempts never reach a set. The AI generator this route used
// (src/lib/ai/on-demand-questions.ts) had no other caller and is removed.
// Tests: tests/unit/fresh-set-core.test.ts, tests/unit/fresh-checked-set.test.ts.

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { bad, notFound, ok, parseBody, serverError, unauth } from "@/lib/http";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import { canServePaper, persistedPaperIds, servedPaperIds } from "@/lib/served-paper";
import {
  FRESH_GENERATED_BY,
  FRESH_SET_SIZE,
  freshSetLinks,
  freshTiers,
  paperLanguage,
  pickFreshSet,
  weakTopicIdsOf,
  type FreshCandidate,
} from "@/lib/fresh-set";

const Body = z.object({
  examCode: z.string(),
  topicCode: z.string(),
  count: z.number().int().min(5).max(15).optional(),
  attemptId: z.string().min(1).max(64).optional(),
});

/** An attempt in one of these finishes a fresh set; until then a press returns that set. */
const FINISHED_STATUSES: ("SUBMITTED" | "AUTO_SUBMITTED")[] = ["SUBMITTED", "AUTO_SUBMITTED"];

/** The most questions of the attempt's paper read to tell its language. */
const PAPER_LANGUAGE_TAKE = 300;

type Db = Pick<Prisma.TransactionClient, "mock" | "question">;

/**
 * The student's latest fresh set on this exam that no attempt has submitted,
 * when /mocks/[id] can still serve it: one in progress resumes on the paper
 * it started with; one not started (or discarded) starts on the served list,
 * so that list must still be long enough to start. Null otherwise.
 */
async function openFreshSet(db: Db, userId: string, examId: string) {
  const open = await db.mock.findFirst({
    where: {
      userId,
      examId,
      generatedBy: FRESH_GENERATED_BY,
      attempts: { none: { status: { in: FINISHED_STATUSES } } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      questionIds: true,
      attempts: { where: { status: "IN_PROGRESS" }, select: { id: true }, take: 1 },
    },
  });
  if (!open) return null;
  if ((open.attempts?.length ?? 0) > 0) return { id: open.id, title: open.title, questionCount: open.questionIds.length };
  const rows = await db.question.findMany({
    where: { id: { in: open.questionIds } },
    select: { id: true, validated: true, tags: true },
  });
  const served = servedPaperIds(open, new Map(rows.map((r) => [r.id, r])));
  return canServePaper(served) ? { id: open.id, title: open.title, questionCount: served.length } : null;
}

type PoolRow = FreshCandidate & { pyqYear: number | null };

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const userId = session.user.id;

    let body: z.infer<typeof Body>;
    try {
      body = await parseBody(req, Body);
    } catch (e) {
      // parseBody throws only its own "Invalid JSON body" / "Invalid body: …".
      return bad(e instanceof Error ? e.message : "Invalid body");
    }
    const size = body.count ?? FRESH_SET_SIZE;

    const exam = await prisma.exam.findUnique({
      where: realExamKey({ code: body.examCode }),
      select: { id: true, code: true, name: true, shortName: true },
    });
    if (!exam) return notFound("exam");

    // A set the student has not finished comes back before anything is picked.
    const open = await openFreshSet(prisma, userId, exam.id);
    if (open) return ok({ result: "ok", mock: { ...open, reused: true } });

    // The scope the button had: its topic (the attempt's weakest), then the
    // attempt's other weak topics, then the topic's subject, then the exam.
    const topics = await prisma.topic.findMany({
      where: { subject: { examId: exam.id } },
      select: { id: true, code: true, name: true, subjectId: true, parentId: true },
    });
    const pressed = topics.find((t) => t.code === body.topicCode) ?? null;
    let weak: string[] = [];
    // The set's language: the attempt's paper's (EN when unknown) — 7 exams
    // hold native-medium rows beside the English ones.
    let language = "EN";
    if (body.attemptId) {
      const attempt = await prisma.attempt.findUnique({
        where: { id: body.attemptId },
        select: { userId: true, topicScores: true, answers: true, mock: { select: { examId: true, questionIds: true } } },
      });
      // Only the student's own attempt on this exam steers the pick.
      if (attempt && attempt.userId === userId && attempt.mock?.examId === exam.id) {
        weak = weakTopicIdsOf(attempt.topicScores);
        const paper = persistedPaperIds(attempt.answers) ?? attempt.mock.questionIds ?? [];
        if (paper.length > 0) {
          const langs = await prisma.question.findMany({
            where: { id: { in: paper.slice(0, PAPER_LANGUAGE_TAKE) } },
            select: { language: true },
          });
          language = paperLanguage(langs.map((r) => r.language));
        }
      }
    }
    const tiers = freshTiers(topics, pressed?.id ?? null, weak);

    // The exam's servable questions in that language (the served-paper rule),
    // each with the answer check's own record: answerChecked is the rule of
    // src/lib/exam-answer-check.ts (the hub FAQ's count), computed here so
    // metadata (≈0.8 kB a row) is never read. pickFreshSet keeps only
    // servable rows with answerChecked true, so M and N count only those.
    // LIMIT: the largest exam held 760 servable questions on 6 Oct 2026.
    const pool = await prisma.$queryRaw<PoolRow[]>`
      SELECT q.id, q."topicId", q.difficulty::text AS difficulty, q.body, q."answerKey", q.validated, q.tags,
             q."pyqYear", q.language::text AS language,
             (COALESCE(q."validatedBy", '') LIKE 'factory:%' AND COALESCE(q.metadata ? 'factoryVerify', FALSE)) AS "answerChecked"
        FROM "Question" q
       WHERE q."examId" = ${exam.id} AND q.validated = TRUE AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))
         AND q.language::text = ${language}
       ORDER BY q.id
       LIMIT 5000`;

    // Seen = every question of every attempt this student ever opened (the
    // mock's list and the rows saved on the attempt), on this exam's questions.
    const seenRows = await prisma.$queryRaw<{ qid: string | null }[]>`
      SELECT DISTINCT s.qid
        FROM (
          SELECT unnest(m."questionIds") AS qid
            FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
           WHERE a."userId" = ${userId}
          UNION
          SELECT r->>'questionId' AS qid
            FROM "Attempt" a
            CROSS JOIN LATERAL jsonb_array_elements(
              CASE WHEN jsonb_typeof(a.answers::jsonb) = 'array' THEN a.answers::jsonb ELSE '[]'::jsonb END
            ) AS r
           WHERE a."userId" = ${userId}
        ) s
        JOIN "Question" q ON q.id = s.qid
       WHERE q."examId" = ${exam.id}`;
    const seen = new Set<string>();
    for (const r of seenRows) if (typeof r?.qid === "string" && r.qid) seen.add(r.qid);

    const pick = pickFreshSet({ pool, seen, tiers, salt: userId, size, language });

    if (!pick.ok) {
      return ok({
        result: "too-few",
        practised: pick.practised,
        total: pick.total,
        available: pick.available,
        exam: { code: exam.code, shortName: exam.shortName },
        links: freshSetLinks(exam.code, pool.some((q) => q.pyqYear != null)),
      });
    }

    const n = pick.ids.length;
    const fromTopic = pressed ? pick.perTier[0] ?? 0 : 0;
    const scopeName = pressed?.name ?? exam.shortName;
    const title =
      pressed && fromTopic === n
        ? `Fresh practice — ${pressed.name} (${n} Qs)`
        : pressed
          ? `Fresh practice — ${pressed.name} and more ${exam.shortName} (${n} Qs)`
          : `Fresh practice — ${exam.shortName} (${n} Qs)`;
    const rationale =
      pressed && fromTopic === n
        ? `${n} answer-checked ${exam.shortName} questions on ${pressed.name} that you have not seen before.`
        : pressed && fromTopic > 0
          ? `${n} answer-checked ${exam.shortName} questions you have not seen before: ${fromTopic} on ${pressed.name}, the rest from your other weak areas and the wider exam.`
          : `${n} answer-checked ${exam.shortName} questions you have not seen before, from your weak areas and the wider exam.`;

    // Under a per-student, per-exam lock: a set made meanwhile (another tab,
    // a retry) is returned instead of a second one.
    const made = await prisma.$transaction(async (tx) => {
      // The lock's own value is void; only the outer 1 is read back.
      await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtext(${`fresh-set:${userId}:${exam.id}`}))) AS l`;
      const again = await openFreshSet(tx, userId, exam.id);
      if (again) return { ...again, reused: true };
      const mock = await tx.mock.create({
        data: {
          userId,
          examId: exam.id,
          // CHALLENGE, as every fresh set has been (the week analysis counts this type).
          type: "CHALLENGE",
          title,
          config: {
            requestType: "FRESH_CHECKED",
            rationale,
            topicCode: body.topicCode,
            scope: scopeName,
            language,
            questionCount: n,
            durationMin: Math.max(10, Math.round(n * 1.5)),
            fromTopic,
            perTier: pick.perTier,
            pool: { total: pick.total, practised: pick.practised },
          },
          questionIds: pick.ids,
          generatedBy: FRESH_GENERATED_BY,
        },
        select: { id: true, title: true },
      });
      return { id: mock.id, title: mock.title, questionCount: n, reused: false };
    });

    return ok({ result: "ok", mock: made });
  } catch (err) {
    return serverError(err);
  }
}
