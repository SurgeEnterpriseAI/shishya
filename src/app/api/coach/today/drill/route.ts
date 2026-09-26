// GET /api/coach/today/drill?exam=CODE&topic=CODE — the coach's task for
// a topic whose study notes are not ready (audit 11 Sep 2026: 1,012 of
// 1,419 enrolments sat on exams with zero notes, and "read the notes,
// then test yourself" landed on "Study notes are still being prepared").
//
// Builds ONE small graded set from the VALIDATED question pool — the
// topic's own pool, else its subject's, else the exam's (drillScope, the
// same rule the planner used to write the task's label) — and 303s into
// the mock player. Deterministic: no model call, ever. Never lands on a
// notes page. No promise about when notes will exist.
//
// Why a GET link: the plan renders tasks as plain <Link href> and POST
// /api/mocks needs a JSON body. Next's <Link> prefetch / soft-navigation
// sends RSC + Next-Router-Prefetch headers; those get an empty 204 (a
// non-flight response makes the router fall back to a full navigation,
// which then hits this route normally), so hovering or scrolling never
// creates a mock. One OPEN drill per (student, topic, IST day) is
// reused, so a double-click or a leaked prefetch can't duplicate either.
//
// Deliberately NOT done here: stamping TopicStudyState.readAt — the
// dashboard renders "continue where you left off" from it as a link to
// /exams/{e}/topics/{t}, i.e. straight back to the empty page.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { drillScope, DRILL_MOCK_TYPE } from "@/lib/coach-plan";
import { getSeenHistory } from "@/lib/answered-questions";
import { pickTiered, shuffleWith, type SeenInput } from "@/lib/question-pick";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";

const EXAM_RE = /^[A-Z0-9_]{2,40}$/;
const TOPIC_RE = /^[A-Za-z0-9_.\-]{1,80}$/;

/** UTC instant of today's IST midnight (same formula as /api/coach/today). */
function istDayStart(): Date {
  return new Date(
    Math.floor((Date.now() + 5.5 * 3600_000) / 86_400_000) * 86_400_000 - 5.5 * 3600_000,
  );
}

function go(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

export async function GET(req: Request) {
  const h = req.headers;
  if (
    h.get("next-router-prefetch") === "1" ||
    h.get("rsc") === "1" ||
    h.get("purpose") === "prefetch" ||
    (h.get("sec-purpose") ?? "").includes("prefetch")
  ) {
    return new Response(null, { status: 204 });
  }

  const url = new URL(req.url);
  const examCode = url.searchParams.get("exam") ?? "";
  const topicCode = url.searchParams.get("topic") ?? "";
  if (!EXAM_RE.test(examCode) || !TOPIC_RE.test(topicCode)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const self = `/api/coach/today/drill?exam=${encodeURIComponent(examCode)}&topic=${encodeURIComponent(topicCode)}`;

  const session = await auth();
  const userId = session?.user?.id;
  // Same-origin callback: NextAuth returns here after sign-in and the
  // drill is created then (the whole path+query is one encoded value, so
  // the '&' survives).
  if (!userId) return go(req, `/login?callbackUrl=${encodeURIComponent(self)}`);

  try {
    const exam = await prisma.exam.findUnique({
      where: realExamKey({ code: examCode }),
      select: { id: true, code: true, shortName: true },
    });
    if (!exam) return go(req, "/coach");

    const topic = await prisma.topic.findFirst({
      where: { code: topicCode, subject: { examId: exam.id } },
      select: {
        id: true,
        code: true,
        name: true,
        subject: { select: { id: true, code: true, name: true } },
        children: { select: { id: true } },
      },
    });
    // Never a notes page — the exam hub is never empty.
    if (!topic) return go(req, `/exams/${exam.code}`);
    const topicIds = [topic.id, ...topic.children.map((c) => c.id)];

    // Idempotent per IST day: an open (unsubmitted) drill for this topic
    // is resumed, never duplicated.
    const dayStart = istDayStart();
    const open = await prisma.$queryRaw<{ id: string }[]>`
      SELECT m.id FROM "Mock" m
      WHERE m."userId" = ${userId} AND m."examId" = ${exam.id}
        AND m."generatedBy" = 'coach-drill'
        AND m.config->>'coachTopic' = ${topic.code}
        AND m."createdAt" >= ${dayStart}
        AND NOT EXISTS (SELECT 1 FROM "Attempt" a
                         WHERE a."mockId" = m.id AND a.status IN ('SUBMITTED','AUTO_SUBMITTED'))
      ORDER BY m."createdAt" DESC LIMIT 1`;
    if (open[0]) return go(req, `/mocks/${open[0].id}`);

    // Pool sizes in one pass — the same validated-MCQ rule the planner
    // counts with, so the label the student clicked and the set they get
    // agree. 25 Sep 2026: withdrawn questions (tag "rejected") are left out
    // of the counts and the pool alike, so the scope is chosen on what can
    // really be served. A withdrawn row is validated=false (admin Reject,
    // the data fixes), so the planner's count is the same in practice; the
    // title always states the size actually picked.
    const counts = await prisma.$queryRaw<{ t: number; s: number; e: number }[]>`
      SELECT (COUNT(*) FILTER (WHERE q."topicId" = ANY(${topicIds})))::int AS t,
             (COUNT(*) FILTER (WHERE tt."subjectId" = ${topic.subject.id}))::int AS s,
             COUNT(*)::int AS e
      FROM "Question" q JOIN "Topic" tt ON tt.id = q."topicId"
      WHERE q."examId" = ${exam.id} AND q.validated = TRUE AND q.type = 'MCQ'
        AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))`;
    const c = counts[0] ?? { t: 0, s: 0, e: 0 };
    const d = drillScope({ qDrill: c.t, qSubject: c.s }, c.e);
    if (!d) return go(req, `/exams/${exam.code}`);

    // Unseen first, then least-recently-seen (15 Sep 2026): "seen" is every
    // question of every mock this student opened on the exam in the last
    // SEEN_WINDOW_DAYS days — getSeenQuestions, the rule every other picker
    // uses. It was the answers of the last 20 SUBMITTED attempts, so an
    // opened-but-abandoned set, or anything older than 20 attempts, came
    // back as fresh. A failed seen query picks without exclusion.
    // 25 Sep 2026: seen = ANSWERED (getSeenHistory, the rule /api/mocks and
    // the builder use since batch 2a). A question that was only on screen
    // in an opened mock is not a repeat: never-shown questions first, then
    // shown-but-unanswered (least-recently-shown), then answered (oldest
    // first).
    const seen: SeenInput = (await getSeenHistory(userId, exam.id)) ?? new Map<string, number>();

    const scopeSql =
      d.scope === "topic"
        ? Prisma.sql`AND q."topicId" = ANY(${topicIds})`
        : d.scope === "subject"
          ? Prisma.sql`AND tt."subjectId" = ${topic.subject.id}`
          : Prisma.empty;
    const pool = await prisma.$queryRaw<{ id: string }[]>`
      SELECT q.id FROM "Question" q JOIN "Topic" tt ON tt.id = q."topicId"
      WHERE q."examId" = ${exam.id} AND q.validated = TRUE AND q.type = 'MCQ'
        AND NOT (${WITHDRAWN_TAG} = ANY(q.tags)) ${scopeSql}
      LIMIT 5000`;
    const questionIds = shuffleWith(pickTiered([pool], d.n, seen).picked).map((q) => q.id);
    if (questionIds.length === 0) return go(req, `/exams/${exam.code}`);
    const n = questionIds.length;

    const own =
      c.t === 0 ? "no validated questions" : `only ${c.t} validated question${c.t === 1 ? "" : "s"}`;
    const title =
      d.scope === "topic"
        ? `Coach drill — ${topic.name} (${n} Qs)`
        : d.scope === "subject"
          ? `Coach drill — ${topic.subject.name} (${n} Qs, for ${topic.name})`
          : `Coach drill — ${exam.shortName} mixed (${n} Qs, for ${topic.name})`;
    const rationale =
      d.scope === "topic"
        ? `Notes for ${topic.name} are not ready yet, so today's task is a ${n}-question drill from this topic's validated pool.`
        : d.scope === "subject"
          ? `Notes for ${topic.name} are not ready yet and the topic has ${own}, so this drill uses the ${topic.subject.name} pool instead.`
          : `Notes for ${topic.name} are not ready yet and ${topic.subject.name} has too few validated questions, so this drill mixes questions from across ${exam.shortName}.`;

    const mock = await prisma.mock.create({
      data: {
        userId,
        examId: exam.id,
        // Never TOPIC — see DRILL_MOCK_TYPE (a 5-question TOPIC mock is
        // what /today resumes as the student's Daily 5).
        type: DRILL_MOCK_TYPE,
        title,
        config: {
          requestType: d.scope === "topic" ? "TOPIC" : "SUBJECT",
          coach: "drill",
          coachTopic: topic.code,
          coachScope: d.scope,
          topicCode: topic.code,
          subjectCode: topic.subject.code,
          questionCount: n,
          durationMin: Math.max(5, Math.round(n * 1.5)),
          rationale,
        },
        questionIds,
        generatedBy: "coach-drill",
      },
      select: { id: true },
    });
    return go(req, `/mocks/${mock.id}`);
  } catch (err) {
    // A coach link must never end on an error page.
    console.error("[coach-drill]", err);
    return go(req, "/coach");
  }
}
