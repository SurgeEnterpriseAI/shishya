// The late-answer run's DB and model steps (1 Oct 2026) — the rules, the
// order and the caps are src/lib/tutor-late-answer.ts; this file only does
// what they call for. Cron: GET /api/cron/tutor-answer-later.
//
//   loadRows  — member USER rows in the window (2 Oct 2026: last sent in the
//               72 hours — metadata.sentAt, else createdAt — and first
//               stored in the last 7 days) that carry failedAt or a
//               late claim, not late-answered, that the chat promised a late
//               answer, with no later ASSISTANT row, not asked again and
//               answered in another conversation since, tries left, and the
//               account's presence; the conversation's exam is read through
//               the ChatSession relation;
//   probe     — ONE 1-token call on the tutor's own model, booked in AiUsage
//               as 'tutor-late-probe'; its SDK error is classified
//               (src/lib/ai/tutor-failure.ts);
//   claim     — one atomic UPDATE … RETURNING: only while the row is still a
//               failed (or stale-claimed), promised, unanswered question with
//               no later ASSISTANT row, not re-asked and answered elsewhere,
//               and tries left. It moves failedAt out and stamps answeringAt,
//               so a Retry from the chat meanwhile waits for this answer
//               (src/lib/chat-turn-dedupe.ts) instead of paying twice;
//   answer    — the chat's own pipeline: src/lib/tutor-turn.ts builds the
//               context (exam / general / school, student state, tutor memory,
//               stored band, topic or chapter) exactly as POST /api/chat does,
//               from the rows stored up to the question; tutorStream() writes
//               every prompt. Before calling, the very request tutorStream
//               will send (src/lib/ai/tutor.ts tutorRequest) is priced at its
//               worst (lateAnswerWorstUsd); an answer that could take the run
//               past its cap is not asked. The reply language is the one the
//               route recorded on the failed row (older rows: the language the
//               message asks for, else the script it is written in, else the
//               account's). Its calls are booked 'tutor-late';
//   save      — one transaction: the question is marked lateAnsweredAt only
//               while the claim is still this run's and no reply exists; then
//               the ASSISTANT row { lateAnswer: true, answeredAfterMs } is
//               stored, dated 1 ms after its question so the thread reads in
//               order (the real time is lateAnsweredAt). The conversation's
//               updatedAt moves, so it rises in Recent chats;
//   release   — the row goes back to failed (lateFailedReason); `final` spends
//               its tries so no later run picks it again; `refundTry` gives
//               back the try its claim took (an outage, or never asked);
//   mail      — pendingMail reads the late answers not told yet (never a
//               school chat, never one the student has opened);
//               markMailed / unmarkMailed stamp lateMailAt on the questions;
//               src/lib/db/tutor-answer-email.ts (audience + 24-hour guard)
//               and src/lib/email.ts sendTutorAnsweredEmail.
// 2 Oct 2026: sentAt (the student's last failed send) is written by the chat
// route's markTurnFailed and by nothing in this file — claim, save and
// release leave it as it is, so the window cannot slide.
// Nothing here runs outside the cron route; no script calls it.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { REAL_EXAM_SQL, isSchoolCategory } from "./exam-scope";
import { tutorStream } from "@/lib/ai";
import { tutorRequest } from "@/lib/ai/tutor";
import { anthropic, MODEL, TOKEN_LIMITS } from "@/lib/ai/client";
import { PRICING, recordAiUsage } from "@/lib/ai/usage";
import { estimateTokens } from "@/lib/ai/batch";
import { genModelTier } from "@/lib/ai/question-gen-run";
import { classifyTutorFailure } from "@/lib/ai/tutor-failure";
import { historyFromRows, loadTutorTurnContext, tutorStreamArgs, type TutorTurnScope } from "@/lib/tutor-turn";
import { getSchoolTutorContext, type SchoolTutorContext } from "@/lib/school/tutor-context";
import { schoolStudentExamKey } from "@/lib/school/tutor-scope";
import { isMinorBand, schoolBandOfProfile } from "@/lib/school/student-classes";
import { detectLanguageRequest, langToReplyLanguage, resolvePreferredLocale } from "@/lib/preferred-lang";
import { sendTutorAnsweredEmail } from "@/lib/email";
import { answeredEmailTargets, reserveAnsweredEmail, unreserveAnsweredEmail } from "./tutor-answer-email";
import {
  LATE_CLAIM_STALE_MS,
  LATE_HARD_STOP_MS,
  LATE_MAX_TRIES,
  LATE_PROBE_FEATURE,
  LATE_SELECT_LIMIT,
  LATE_USAGE_FEATURE,
  answeredEmailLines,
  lateAnswerWorstUsd,
  lateAskedNote,
  lateTurnMeta,
  questionScriptLocale,
  type LateAnswerDeps,
  type LateAnswerOk,
  type LateAnswerOutcome,
  type LateCandidateRow,
  type LatePendingRow,
  type LateProbe,
  type LateRelease,
} from "@/lib/tutor-late-answer";

/** The rows the route keeps in a conversation's context (its lastTurns). */
export const CONTEXT_TURNS = 30;

type RawRow = {
  id: string;
  sessionId: string;
  content: string;
  createdAt: Date;
  metadata: unknown;
  userId: string | null;
  laterAssistant: boolean;
  reAsked: boolean;
};

async function loadRows(sinceMs: number, nowMs: number): Promise<LateCandidateRow[]> {
  // The two "answered since" tests are computed once and filtered BEFORE the
  // LIMIT, so questions that can never be picked never crowd out the ones
  // that can (tries spent, too). The promise test mirrors
  // src/lib/tutor-late-answer.ts lateAnswerPromised.
  // 2 Oct 2026 — the window, as lateWindowOpen has it: `sinceMs` (72 hours
  // back) is compared with the student's last send — metadata.sentAt, written
  // only by the chat route — or with createdAt; and the scan is floored on
  // createdAt at the 7-day hard stop. A sentAt that is not a JSON number is
  // ignored (the CASE keeps its cast from running on anything else).
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT c.* FROM (
      SELECT m.id, m."sessionId", m.content, m."createdAt", m.metadata, u.id AS "userId",
        EXISTS (
          SELECT 1 FROM "ChatMessage" r
          WHERE r."sessionId" = m."sessionId" AND r.role = 'ASSISTANT' AND r."createdAt" > m."createdAt"
        ) AS "laterAssistant",
        -- 1 Oct 2026 review: the same question asked again later in ANY of the
        -- student's conversations, and that one got a reply (/chat opens a
        -- fresh conversation by default).
        EXISTS (
          SELECT 1 FROM "ChatMessage" q2
          JOIN "ChatSession" s2 ON s2.id = q2."sessionId"
          WHERE s2."userId" = s."userId" AND q2.role = 'USER' AND q2."createdAt" > m."createdAt"
            AND btrim(q2.content) = btrim(m.content)
            AND EXISTS (
              SELECT 1 FROM "ChatMessage" a2
              WHERE a2."sessionId" = q2."sessionId" AND a2.role = 'ASSISTANT' AND a2."createdAt" > q2."createdAt"
            )
        ) AS "reAsked"
      FROM "ChatMessage" m
      JOIN "ChatSession" s ON s.id = m."sessionId"
      LEFT JOIN "User" u ON u.id = s."userId"
      WHERE m.role = 'USER'
        AND m."createdAt" >= ${new Date(nowMs - LATE_HARD_STOP_MS)} AND m."createdAt" <= ${new Date(nowMs)}
        AND (
          m."createdAt" >= ${new Date(sinceMs)}
          OR CASE WHEN jsonb_typeof(m.metadata->'sentAt') = 'number'
            THEN (m.metadata->>'sentAt')::numeric >= ${String(sinceMs)}::numeric
            ELSE FALSE END
        )
        AND (m.metadata->>'failedAt' IS NOT NULL OR m.metadata->>'lateClaimAt' IS NOT NULL)
        AND m.metadata->>'lateAnsweredAt' IS NULL
        AND (m.metadata->>'failedReason' IS NULL OR m.metadata->>'latePromised' = 'true')
        AND COALESCE((m.metadata->>'lateTries')::int, 0) < ${LATE_MAX_TRIES}
    ) AS c
    WHERE NOT c."laterAssistant" AND NOT c."reAsked"
    ORDER BY c."createdAt" ASC
    LIMIT ${LATE_SELECT_LIMIT}`;
  if (rows.length === 0) return [];
  // The conversations' exams, through the relation (a keyed read of rows already picked).
  const sessions = await prisma.chatSession.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.sessionId))] } },
    select: { id: true, exam: { select: { code: true, category: true } } },
  });
  const examOf = new Map(sessions.map((s) => [s.id, s.exam]));
  return rows.map((r) => {
    const exam = examOf.get(r.sessionId) ?? null;
    return {
      id: r.id,
      sessionId: r.sessionId,
      userId: r.userId ?? null,
      content: r.content,
      createdAt: new Date(r.createdAt),
      metadata: r.metadata,
      laterAssistant: r.laterAssistant === true,
      reAsked: r.reAsked === true,
      examCode: exam?.code ?? null,
      examCategory: exam ? String(exam.category) : null,
    };
  });
}

async function probe(): Promise<LateProbe> {
  const start = Date.now();
  try {
    // No system prompt, 1 output token: the question is only "can the tutor's model be served now?".
    const r = await anthropic.messages.create({ model: MODEL, max_tokens: 1, messages: [{ role: "user", content: "ping" }] });
    return { ok: true, costUsd: recordAiUsage(LATE_PROBE_FEATURE, r, { model: MODEL, latencyMs: Date.now() - start }) };
  } catch (err) {
    console.error("[tutor-late] probe failed:", err);
    return { ok: false, reason: classifyTutorFailure(err) };
  }
}

async function claim(row: LateCandidateRow, claimMs: number): Promise<boolean> {
  const staleBefore = claimMs - LATE_CLAIM_STALE_MS;
  const got = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "ChatMessage" AS m
    SET metadata = (COALESCE(m.metadata, '{}'::jsonb) - 'failedAt') || jsonb_build_object(
      'answeringAt', ${String(claimMs)}::bigint,
      'lateClaimAt', ${String(claimMs)}::bigint,
      'lateTries', COALESCE((m.metadata->>'lateTries')::int, 0) + 1
    )
    FROM "ChatSession" AS s
    WHERE m.id = ${row.id} AND m.role = 'USER' AND s.id = m."sessionId"
      AND m.metadata->>'lateAnsweredAt' IS NULL
      AND (
        m.metadata->>'failedAt' IS NOT NULL
        OR (m.metadata->>'lateClaimAt' IS NOT NULL AND (m.metadata->>'lateClaimAt')::bigint < ${String(staleBefore)}::bigint)
      )
      AND (m.metadata->>'failedReason' IS NULL OR m.metadata->>'latePromised' = 'true')
      AND COALESCE((m.metadata->>'lateTries')::int, 0) < ${LATE_MAX_TRIES}
      AND NOT EXISTS (
        SELECT 1 FROM "ChatMessage" r
        WHERE r."sessionId" = m."sessionId" AND r.role = 'ASSISTANT' AND r."createdAt" > m."createdAt"
      )
      AND NOT EXISTS (
        SELECT 1 FROM "ChatMessage" q2
        JOIN "ChatSession" s2 ON s2.id = q2."sessionId"
        WHERE s2."userId" = s."userId" AND q2.role = 'USER' AND q2."createdAt" > m."createdAt"
          AND btrim(q2.content) = btrim(m.content)
          AND EXISTS (
            SELECT 1 FROM "ChatMessage" a2
            WHERE a2."sessionId" = q2."sessionId" AND a2.role = 'ASSISTANT' AND a2."createdAt" > q2."createdAt"
          )
      )
    RETURNING m.id`;
  return got.length === 1;
}

const finalFail = (note: string, costUsd = 0): LateAnswerOutcome => ({ ok: false, reason: "other", costUsd, final: true, note });

/** The tier's list prices for the tutor's model (the dearest tier when the id names none). */
function tutorModelPrice(): { in: number; out: number; cacheW: number } {
  return PRICING[genModelTier(MODEL) ?? "opus"];
}

/**
 * The conversation as it stood when the question was asked (the route's
 * lastTurns): the CONTEXT_TURNS rows at or before it, oldest first; the
 * question itself is left out of the history (it is the turn's message).
 */
export async function historyAtQuestion(sessionId: string, row: { id: string; createdAt: Date }) {
  const stored = (
    await prisma.chatMessage.findMany({
      where: { sessionId, createdAt: { lte: row.createdAt } },
      orderBy: { createdAt: "desc" },
      take: CONTEXT_TURNS,
      select: { id: true, role: true, content: true },
    })
  ).reverse();
  return historyFromRows(
    stored.map((r) => ({ id: r.id, role: String(r.role), content: r.content })),
    row.id,
  );
}

async function answer(row: LateCandidateRow, remainingUsd: number): Promise<LateAnswerOutcome> {
  let cost = 0;
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: row.sessionId },
      select: { id: true, userId: true, exam: { select: { id: true, code: true, category: true } } },
    });
    if (!session || !row.userId || session.userId !== row.userId) return finalFail("session");
    const profile = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { preferredLang: true, onbStage: true, onbPrepCodes: true },
    });
    if (!profile) return finalFail("user");
    const schoolProfile = schoolBandOfProfile(profile);
    const exam = session.exam ? { id: session.exam.id, code: session.exam.code, category: String(session.exam.category) } : null;
    let schoolCtx: SchoolTutorContext | null = null;
    if (exam && isSchoolCategory(exam.category)) {
      // Class 8-12 only, on its class container — as the route (a Class 1-7 container has no tutor).
      const key = schoolStudentExamKey({ code: exam.code });
      if (!key) return finalFail("class-1-7");
      schoolCtx = await getSchoolTutorContext(key.code);
      if (!schoolCtx) return finalFail("school-context");
    } else if (schoolProfile && isMinorBand(schoolProfile.band)) {
      // The route gives a declared 13-17 account the school tutor ONLY.
      return finalFail("school-only");
    }

    const meta = lateTurnMeta(row.metadata);
    const history = await historyAtQuestion(session.id, row);
    const scope: TutorTurnScope = {
      userId: session.userId,
      exam: schoolCtx ? schoolCtx.exam : exam,
      schoolCtx,
      examCode: exam?.code ?? null,
      isGeneral: exam == null,
      sessionId: session.id,
      preferredLang: profile.preferredLang ?? null,
      schoolBand: schoolProfile?.band ?? null,
      message: row.content,
      topicCode: meta.topicCode ?? null,
    };
    const context = await loadTutorTurnContext(scope);
    // Rows from before 1 Oct 2026 carry no replyLang: the language the message
    // asks for, else the script it is written in (1 Oct 2026 review — a
    // Devanagari or Telugu question from an account left on the EN default),
    // else the account's.
    const language =
      meta.replyLang ??
      langToReplyLanguage(
        resolvePreferredLocale({
          explicit: detectLanguageRequest(row.content) ?? questionScriptLocale(row.content),
          preferredLang: context.studentState.preferredLang,
        }),
      );

    const streamArgs = tutorStreamArgs({ scope, context, history, language: language as any });
    const args = {
      ...streamArgs,
      // 1 Oct 2026: the model is told when the question was asked ("just" = then).
      userMessage: lateAskedNote(row.createdAt) + streamArgs.userMessage,
      usage: { feature: LATE_USAGE_FEATURE, onCost: (usd: number) => (cost += Math.max(0, usd || 0)) },
    };
    // The run's hard cap (1 Oct 2026 review): price THIS request at its worst
    // before asking; when it does not fit in what is left, it is not asked.
    const req = tutorRequest(args);
    const worstUsd = lateAnswerWorstUsd({
      systemTokens: estimateTokens(req.system.map((b) => b.text).join("\n")) + (req.tools ? estimateTokens(JSON.stringify(req.tools)) : 0),
      messageTokens: estimateTokens(req.messages.map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))).join("\n")),
      maxCalls: req.maxCalls,
      maxTokens: TOKEN_LIMITS.tutor,
      price: tutorModelPrice(),
    });
    if (worstUsd > remainingUsd + 1e-9) return { ok: false, overBudget: true, worstUsd, costUsd: 0 };

    let full = "";
    let actions: unknown = undefined;
    const toolCalls: unknown[] = [];
    const ai = tutorStream(args);
    for await (const chunk of ai) {
      if ("delta" in chunk) full += chunk.delta;
      else if ("tool" in chunk) toolCalls.push(chunk.tool);
      else if ("done" in chunk) actions = chunk.done.suggestedActions;
    }
    // An empty reply is no answer: the question stays failed for a later try.
    if (!full.trim()) return { ok: false, reason: "other", costUsd: cost };
    return { ok: true, text: full, actions: actions ?? null, toolCalls, costUsd: cost };
  } catch (err) {
    console.error("[tutor-late] answer failed:", err);
    return { ok: false, reason: classifyTutorFailure(err), costUsd: cost };
  }
}

async function save(row: LateCandidateRow, claimMs: number, out: LateAnswerOk, nowMs: number): Promise<boolean> {
  const stored = await prisma.$transaction(async (tx) => {
    const marked = await tx.$executeRaw`
      UPDATE "ChatMessage" AS m
      SET metadata = (COALESCE(m.metadata, '{}'::jsonb) - 'answeringAt' - 'lateClaimAt') || jsonb_build_object('lateAnsweredAt', ${String(nowMs)}::bigint)
      WHERE m.id = ${row.id}
        AND (m.metadata->>'lateClaimAt')::bigint = ${String(claimMs)}::bigint
        AND m.metadata->>'lateAnsweredAt' IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "ChatMessage" r
          WHERE r."sessionId" = m."sessionId" AND r.role = 'ASSISTANT' AND r."createdAt" > m."createdAt"
        )`;
    if (marked !== 1) return false;
    await tx.chatMessage.create({
      data: {
        sessionId: row.sessionId,
        role: "ASSISTANT",
        content: out.text,
        // Right after its question, so a conversation with two failed
        // questions reads Q1 → A1 → Q2 → A2; the real time is lateAnsweredAt.
        createdAt: new Date(row.createdAt.getTime() + 1),
        metadata: {
          actions: (out.actions ?? null) as any,
          toolCalls: out.toolCalls as any,
          lateAnswer: true,
          answeredAfterMs: Math.max(0, nowMs - row.createdAt.getTime()),
          lateAnsweredAt: nowMs,
        },
      },
    });
    return true;
  });
  if (stored) {
    // The conversation rises in Recent chats and stays in the tutor's memory window. Best-effort.
    try {
      await prisma.chatSession.update({ where: { id: row.sessionId }, data: { updatedAt: new Date(nowMs) } });
    } catch (err) {
      console.error("[tutor-late] could not mark the conversation active:", err);
    }
  }
  return stored;
}

/**
 * Give a claimed row back. The try its claim took is given back for a
 * failure that says nothing about the question (an outage) or an answer that
 * was never asked (over budget) — 1 Oct 2026 review: otherwise an overload
 * that let the probe through would use up the oldest question's tries, run
 * after run, and its promise would be broken.
 */
export async function release(row: LateCandidateRow, claimMs: number, how: LateRelease, nowMs: number): Promise<void> {
  const patch = {
    failedAt: nowMs,
    ...(how.reason ? { lateFailedReason: how.reason } : {}),
    ...(how.final ? { lateTries: LATE_MAX_TRIES } : {}),
  };
  try {
    if (how.refundTry && !how.final) {
      await prisma.$executeRaw`
        UPDATE "ChatMessage"
        SET metadata = (COALESCE(metadata, '{}'::jsonb) - 'answeringAt' - 'lateClaimAt') || ${JSON.stringify(patch)}::jsonb
          || jsonb_build_object('lateTries', GREATEST(COALESCE((metadata->>'lateTries')::int, 1) - 1, 0))
        WHERE id = ${row.id} AND (metadata->>'lateClaimAt')::bigint = ${String(claimMs)}::bigint`;
    } else {
      await prisma.$executeRaw`
        UPDATE "ChatMessage"
        SET metadata = (COALESCE(metadata, '{}'::jsonb) - 'answeringAt' - 'lateClaimAt') || ${JSON.stringify(patch)}::jsonb
        WHERE id = ${row.id} AND (metadata->>'lateClaimAt')::bigint = ${String(claimMs)}::bigint`;
    }
  } catch (err) {
    // The claim goes stale by itself (LATE_CLAIM_STALE_MS) and a later run picks the row again.
    console.error("[tutor-late] could not release a claim:", err);
  }
}

type RawPending = {
  id: string;
  userId: string;
  sessionId: string;
  examCode: string | null;
  content: string;
  createdAt: Date;
  answeredAtMs: string | number;
};

/**
 * Late answers not told yet: the question rows answered late since
 * `sinceMs`, with no lateMailAt, in a general chat or an active real exam's
 * (never a school chat; never an exam /chat can no longer reopen, whose link
 * would not work), whose reply the student has not opened (lateSeenAt on the
 * reply, stored 1 ms after its question — they know already).
 * 2 Oct 2026: the scan floor on createdAt is the 7-day hard stop, not the
 * 72 hours — a re-sent question can now be answered up to 7 days after it
 * was first stored, and its mail must still find it.
 */
export async function pendingMail(sinceMs: number, userIds: string[] | null): Promise<LatePendingRow[]> {
  if (userIds && userIds.length === 0) return [];
  const rows = await prisma.$queryRaw<RawPending[]>`
    SELECT m.id, s."userId", m."sessionId", e.code AS "examCode", m.content, m."createdAt",
      (m.metadata->>'lateAnsweredAt') AS "answeredAtMs"
    FROM "ChatMessage" m
    JOIN "ChatSession" s ON s.id = m."sessionId"
    LEFT JOIN "Exam" e ON e.id = s."examId"
    WHERE m.role = 'USER'
      AND m."createdAt" >= ${new Date(sinceMs - LATE_HARD_STOP_MS)}
      AND m.metadata->>'lateAnsweredAt' IS NOT NULL
      AND (m.metadata->>'lateAnsweredAt')::bigint >= ${String(sinceMs)}::bigint
      AND m.metadata->>'lateMailAt' IS NULL
      AND (s."examId" IS NULL OR (${REAL_EXAM_SQL}))
      AND NOT EXISTS (
        SELECT 1 FROM "ChatMessage" a
        WHERE a."sessionId" = m."sessionId" AND a.role = 'ASSISTANT'
          AND a."createdAt" > m."createdAt" AND a."createdAt" <= m."createdAt" + interval '1 second'
          AND a.metadata->>'lateSeenAt' IS NOT NULL
      )
      ${userIds ? Prisma.sql`AND s."userId" = ANY(${userIds})` : Prisma.empty}
    ORDER BY m."createdAt" ASC
    LIMIT ${LATE_SELECT_LIMIT}`;
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    sessionId: r.sessionId,
    examCode: r.examCode ?? null,
    content: r.content,
    createdAt: new Date(r.createdAt),
    answeredAt: new Date(Number(r.answeredAtMs)),
  }));
}

/** Stamp lateMailAt on these questions (before the send). */
export async function markMailed(questionIds: string[], atMs: number): Promise<void> {
  if (questionIds.length === 0) return;
  await prisma.$executeRaw`
    UPDATE "ChatMessage"
    SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lateMailAt', ${String(atMs)}::bigint)
    WHERE id = ANY(${questionIds}) AND role = 'USER' AND metadata->>'lateMailAt' IS NULL`;
}

/** Take back this run's lateMailAt after a send that failed (only the stamp this run wrote). */
export async function unmarkMailed(questionIds: string[], atMs: number): Promise<void> {
  if (questionIds.length === 0) return;
  await prisma.$executeRaw`
    UPDATE "ChatMessage"
    SET metadata = metadata - 'lateMailAt'
    WHERE id = ANY(${questionIds}) AND role = 'USER' AND (metadata->>'lateMailAt')::bigint = ${String(atMs)}::bigint`;
}

/** The run's real steps. */
export function lateAnswerDeps(): LateAnswerDeps {
  return {
    loadRows,
    probe,
    claim,
    answer,
    save,
    release,
    pendingMail,
    emailTargets: (userIds) => answeredEmailTargets(userIds),
    reserveEmail: (userId) => reserveAnsweredEmail(userId),
    unreserveEmail: (guardId) => unreserveAnsweredEmail(guardId),
    markMailed,
    unmarkMailed,
    sendEmail: (target, items) =>
      // 2 Oct 2026: a school-age account (or one whose age signal was not read) gets no quoted question.
      sendTutorAnsweredEmail({
        to: target.to,
        userId: target.userId,
        name: target.name,
        lines: answeredEmailLines(items, new Date(), { schoolAge: target.schoolAge !== false }),
      }),
  };
}
