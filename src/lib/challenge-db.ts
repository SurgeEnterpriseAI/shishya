// Challenge a friend — storage, grading and notifications (14 Sep 2026).
// SERVER ONLY. The pure rules (tokens, names, grading, slices, caps, copy)
// are in src/lib/challenge.ts; the tables come from
// scripts/create-challenge-tables.ts and are read with raw SQL.
//
// Secrets: a challenge's creator key and each player's key live only in
// their browsers; the tables keep sha256 hashes. Scores are graded here
// against the answer keys of the exam's validated MCQs — the pool the
// anonymous quiz serves (src/lib/anon-quiz.ts) — never taken from the
// browser's own tally.
//
// Language: a challenge stores the page language it was made in; the
// challenger's phone notifications use it (the email stays English).

import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getAnonQuiz, type AnonQuiz } from "@/lib/anon-quiz";
import { sendEmail } from "@/lib/email";
import { fillTemplate, locales, tk, type Locale } from "@/lib/i18n";
import { clipText, isAllowedPushEndpoint, type PushPayload } from "@/lib/push-alert-rules";
import { pushConfigured, sendPush } from "@/lib/web-push";
import {
  CHALLENGE_EMAIL_GAP_MS,
  CHALLENGE_KEY_RE,
  CHALLENGE_MAX_QUESTIONS,
  CHALLENGE_MIN_QUESTIONS,
  CHALLENGE_PUSH_GAP_MS,
  CHALLENGE_TOKEN_RE,
  canNotifyAgain,
  challengeExpiresAt,
  challengePlayEmail,
  gradeChoices,
  isChallengeExpired,
  mockSlice,
  newChallengeKey,
  newChallengeToken,
  type ChallengeSource,
} from "@/lib/challenge";

export type Choice = string | null;

export interface ChallengeWho {
  userId: string | null;
  anonId: string | null;
}

/** The creator key (header x-challenge-key) or the signed-in account. */
export interface ChallengeAccess {
  key: string | null;
  userId: string | null;
}

type Fail = { ok: false; status: number; error: string };

export function hashChallengeKey(key: string): string {
  return createHash("sha256").update(`shishya-challenge:${key}`).digest("hex");
}

function keyMatches(key: string | null | undefined, hash: string): boolean {
  if (!key || !CHALLENGE_KEY_RE.test(key)) return false;
  const a = Buffer.from(hashChallengeKey(key), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface LoadedChallenge {
  id: string;
  examId: string;
  examCode: string;
  examShort: string;
  examName: string;
  examCategory: string;
  source: ChallengeSource;
  sourceRef: string | null;
  questionIds: string[];
  creatorUserId: string | null;
  creatorAnonId: string | null;
  creatorKeyHash: string;
  creatorName: string | null;
  creatorCorrect: number;
  questionCount: number;
  locale: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastEmailAt: Date | null;
  lastPushAt: Date | null;
}

export async function loadChallenge(token: string): Promise<LoadedChallenge | null> {
  if (!CHALLENGE_TOKEN_RE.test(token)) return null;
  const rows = await prisma.$queryRaw<LoadedChallenge[]>`
    SELECT c.id, c."examId", e.code AS "examCode", e."shortName" AS "examShort", e.name AS "examName",
           e.category::text AS "examCategory", c.source, c."sourceRef", c."questionIds", c."creatorUserId",
           c."creatorAnonId", c."creatorKeyHash", c."creatorName", c."creatorCorrect", c."questionCount",
           c.locale, c."createdAt", c."expiresAt", c."lastEmailAt", c."lastPushAt"
    FROM "Challenge" c
    JOIN "Exam" e ON e.id = c."examId"
    WHERE c.id = ${token}
    LIMIT 1`;
  return rows[0] ?? null;
}

function canManage(ch: LoadedChallenge, access: ChallengeAccess): boolean {
  return (access.userId !== null && access.userId === ch.creatorUserId) || keyMatches(access.key, ch.creatorKeyHash);
}

/** The challenge's questions in its order — null when any of them is no
 *  longer a validated MCQ of the exam (a changed set can't be compared fairly). */
export async function challengeQuiz(ch: Pick<LoadedChallenge, "examCode" | "questionIds" | "questionCount">): Promise<AnonQuiz | null> {
  const quiz = await getAnonQuiz({ examCode: ch.examCode, ids: ch.questionIds });
  if (!quiz || !quiz.replay || quiz.questions.length !== ch.questionCount) return null;
  return quiz;
}

export type CreateChallengeInput =
  | { source: "quiz" | "topic"; examCode: string; questionIds: string[]; choices: Choice[]; name: string | null; locale: string | null }
  | { source: "challenge"; parentToken: string; choices: Choice[]; name: string | null; locale: string | null }
  | { source: "mock"; attemptId: string; name: string | null; locale: string | null };

export type CreateChallengeResult =
  | {
      ok: true;
      token: string;
      creatorKey: string;
      creatorCorrect: number;
      questionCount: number;
      examCode: string;
      examShort: string;
      fromMock: boolean;
    }
  | Fail;

export async function createChallenge(input: CreateChallengeInput, who: ChallengeWho): Promise<CreateChallengeResult> {
  let examId: string;
  let examCode: string;
  let examShort: string;
  let questionIds: string[];
  let creatorCorrect: number;
  let sourceRef: string | null = null;

  if (input.source === "mock") {
    if (!who.userId) return { ok: false, status: 401, error: "Sign in to challenge friends with your mock." };
    const attempt = await prisma.attempt.findUnique({
      where: { id: input.attemptId },
      select: {
        userId: true,
        status: true,
        answers: true,
        mock: { select: { examId: true, questionIds: true, exam: { select: { code: true, shortName: true, active: true } } } },
      },
    });
    if (!attempt?.mock || attempt.userId !== who.userId || !attempt.mock.exam.active) {
      return { ok: false, status: 404, error: "attempt not found" };
    }
    if (attempt.status !== "SUBMITTED" && attempt.status !== "AUTO_SUBMITTED") {
      return { ok: false, status: 409, error: "Finish the mock first." };
    }
    // Only questions a friend can actually be served (the anonymous quiz
    // pool), then evenly spaced — never chosen by what the student got right.
    const eligible = await prisma.question.findMany({
      where: { id: { in: attempt.mock.questionIds }, examId: attempt.mock.examId, validated: true, type: "MCQ" },
      select: { id: true },
    });
    const eligibleIds = new Set(eligible.map((q) => q.id));
    const slice = mockSlice(attempt.mock.questionIds.filter((id) => eligibleIds.has(id)));
    if (!slice) return { ok: false, status: 422, error: "This mock doesn't have enough questions a friend can play." };
    const answers = new Map(
      ((attempt.answers as { questionId?: string; correct?: boolean }[] | null) ?? []).map((a) => [a?.questionId, a]),
    );
    examId = attempt.mock.examId;
    examCode = attempt.mock.exam.code;
    examShort = attempt.mock.exam.shortName;
    questionIds = slice;
    // As the results page showed it: a skipped question is not correct.
    creatorCorrect = slice.filter((id) => answers.get(id)?.correct === true).length;
    sourceRef = input.attemptId;
  } else {
    let setExamCode: string;
    let ids: string[];
    if (input.source === "challenge") {
      const parent = await loadChallenge(input.parentToken);
      if (!parent || isChallengeExpired(parent.expiresAt)) return { ok: false, status: 404, error: "challenge not found" };
      setExamCode = parent.examCode;
      ids = parent.questionIds;
      sourceRef = parent.id;
    } else {
      setExamCode = input.examCode;
      ids = input.questionIds;
    }
    if (ids.length < CHALLENGE_MIN_QUESTIONS || ids.length > CHALLENGE_MAX_QUESTIONS) {
      return { ok: false, status: 400, error: "invalid question set" };
    }
    const quiz = await getAnonQuiz({ examCode: setExamCode, ids });
    if (!quiz || !quiz.replay || quiz.questions.length !== ids.length || quiz.questions.some((q, i) => q.id !== ids[i])) {
      return { ok: false, status: 422, error: "These questions can't be used for a challenge." };
    }
    const exam = await prisma.exam.findUnique({ where: { code: quiz.examCode }, select: { id: true } });
    if (!exam) return { ok: false, status: 404, error: "exam not found" };
    examId = exam.id;
    examCode = quiz.examCode;
    examShort = quiz.examShort;
    questionIds = ids;
    creatorCorrect = gradeChoices(
      quiz.questions.map((q) => q.answerKey),
      input.choices,
    );
  }

  const creatorKey = newChallengeKey();
  const keyHash = hashChallengeKey(creatorKey);
  const now = new Date();
  const expiresAt = challengeExpiresAt(now);
  for (let tries = 0; tries < 3; tries++) {
    const token = newChallengeToken();
    const inserted = await prisma.$executeRaw`
      INSERT INTO "Challenge" (id, "examId", source, "sourceRef", "questionIds", "creatorUserId", "creatorAnonId",
        "creatorKeyHash", "creatorName", "creatorCorrect", "questionCount", locale, "createdAt", "expiresAt")
      VALUES (${token}, ${examId}, ${input.source}, ${sourceRef}, ${questionIds}, ${who.userId}, ${who.anonId},
        ${keyHash}, ${input.name}, ${creatorCorrect}, ${questionIds.length}, ${input.locale}, ${now}, ${expiresAt})
      ON CONFLICT (id) DO NOTHING`;
    if (inserted === 1) {
      return {
        ok: true,
        token,
        creatorKey,
        creatorCorrect,
        questionCount: questionIds.length,
        examCode,
        examShort,
        fromMock: input.source === "mock",
      };
    }
  }
  return { ok: false, status: 500, error: "Could not make the challenge. Please try again." };
}

export type RecordPlayResult =
  | { ok: true; stored: boolean; correct: number; total: number; creatorCorrect: number; creatorName: string | null }
  | (Fail & { self?: boolean });

/** A friend's score: graded here, one stored play per browser (a repeat
 *  returns the first score). The challenger's own account or analytics id
 *  can't play their own challenge. */
export async function recordChallengePlay(
  token: string,
  input: { playerKey: string; choices: Choice[]; name: string | null },
  who: ChallengeWho,
): Promise<RecordPlayResult> {
  const ch = await loadChallenge(token);
  if (!ch) return { ok: false, status: 404, error: "challenge not found" };
  if (isChallengeExpired(ch.expiresAt)) return { ok: false, status: 410, error: "This challenge has ended." };
  if ((who.userId !== null && who.userId === ch.creatorUserId) || (who.anonId !== null && who.anonId === ch.creatorAnonId)) {
    return { ok: false, status: 409, error: "This is your own challenge.", self: true };
  }
  const quiz = await challengeQuiz(ch);
  if (!quiz) return { ok: false, status: 410, error: "This challenge's questions have changed." };

  const choices = quiz.questions.map((_, i) => (typeof input.choices[i] === "string" ? input.choices[i] : null));
  const correct = gradeChoices(
    quiz.questions.map((q) => q.answerKey),
    choices,
  );
  const playerKeyHash = hashChallengeKey(input.playerKey);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "ChallengePlay" (id, "challengeId", "playerUserId", "playerAnonId", "playerKeyHash", "playerName", choices, correct, "createdAt")
    VALUES (${crypto.randomUUID()}, ${ch.id}, ${who.userId}, ${who.anonId}, ${playerKeyHash}, ${input.name},
      ${JSON.stringify(choices)}::jsonb, ${correct}, NOW())
    ON CONFLICT ("challengeId", "playerKeyHash") DO NOTHING
    RETURNING id`;
  const base = { total: ch.questionCount, creatorCorrect: ch.creatorCorrect, creatorName: ch.creatorName };
  if (rows.length > 0) return { ok: true, stored: true, correct, ...base };
  const prev = await prisma.$queryRaw<{ correct: number }[]>`
    SELECT correct FROM "ChallengePlay" WHERE "challengeId" = ${ch.id} AND "playerKeyHash" = ${playerKeyHash} LIMIT 1`;
  return { ok: true, stored: false, correct: prev[0]?.correct ?? correct, ...base };
}

/** Take one notification slot atomically: true for exactly one caller per gap. */
async function claimSlot(id: string, column: "lastPushAt" | "lastEmailAt", gapMs: number): Promise<boolean> {
  const minutes = Math.round(gapMs / 60_000);
  const rows =
    column === "lastPushAt"
      ? await prisma.$queryRaw<{ id: string }[]>`
          UPDATE "Challenge" SET "lastPushAt" = NOW()
          WHERE id = ${id} AND ("lastPushAt" IS NULL OR "lastPushAt" <= NOW() - (${minutes} * INTERVAL '1 minute'))
          RETURNING id`
      : await prisma.$queryRaw<{ id: string }[]>`
          UPDATE "Challenge" SET "lastEmailAt" = NOW()
          WHERE id = ${id} AND ("lastEmailAt" IS NULL OR "lastEmailAt" <= NOW() - (${minutes} * INTERVAL '1 minute'))
          RETURNING id`;
  return rows.length > 0;
}

function challengeLocale(v: string | null): Locale {
  return v && (locales as readonly string[]).includes(v) ? (v as Locale) : "en";
}

/** "Ravi played your SSC GD challenge" — in the language the challenge was made in. */
function playPush(ch: LoadedChallenge, latest: { name: string | null; correct: number }): PushPayload {
  const loc = challengeLocale(ch.locale);
  const vars = { name: latest.name ?? "", exam: ch.examShort, mine: latest.correct, theirs: ch.creatorCorrect, total: ch.questionCount };
  return {
    title: clipText(fillTemplate(tk(latest.name ? "challenge.push.title" : "challenge.push.titleFriend", loc), vars), 72),
    body: clipText(fillTemplate(tk(latest.name ? "challenge.push.body" : "challenge.push.bodyFriend", loc), vars), 140),
    url: `/c/${ch.id}?utm_source=push&utm_medium=challenge`,
    tag: `challenge-${ch.id}`,
  };
}

/** The one confirmation when a challenger turns on phone notifications. */
function watchWelcomePush(ch: LoadedChallenge): PushPayload {
  const loc = challengeLocale(ch.locale);
  return {
    title: clipText(fillTemplate(tk("challenge.push.welcomeTitle", loc), { exam: ch.examShort }), 72),
    body: clipText(tk("challenge.push.welcomeBody", loc), 140),
    url: `/c/${ch.id}?utm_source=push&utm_medium=challenge-welcome`,
    tag: `challenge-${ch.id}`,
  };
}

/**
 * Tell the challenger a friend played: one phone notification per 20 min
 * to each device they turned on, and — for a signed-in challenger — one
 * email per 6 h listing every play so far (opt-out respected by sendEmail).
 * Runs after the response; never throws.
 */
export async function notifyChallengeCreator(token: string): Promise<void> {
  try {
    const ch = await loadChallenge(token);
    if (!ch) return;
    const now = new Date();
    const plays = await prisma.$queryRaw<{ name: string | null; correct: number }[]>`
      SELECT "playerName" AS name, correct FROM "ChallengePlay"
      WHERE "challengeId" = ${ch.id}
      ORDER BY "createdAt" DESC
      LIMIT 50`;
    const latest = plays[0];
    if (!latest) return;

    if (canNotifyAgain(ch.lastPushAt, now, CHALLENGE_PUSH_GAP_MS)) {
      const watches = await prisma.$queryRaw<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`
        SELECT id, endpoint, p256dh, auth FROM "ChallengeWatch"
        WHERE "challengeId" = ${ch.id} AND "unsubscribedAt" IS NULL`;
      if (watches.length > 0 && (await claimSlot(ch.id, "lastPushAt", CHALLENGE_PUSH_GAP_MS))) {
        const payload = playPush(ch, latest);
        for (const w of watches) {
          const outcome = await sendPush(w, payload);
          if (outcome === "gone") {
            await prisma.$executeRaw`UPDATE "ChallengeWatch" SET "unsubscribedAt" = NOW() WHERE id = ${w.id}`;
          } else if (outcome === "failed") {
            await prisma.$executeRaw`
              UPDATE "ChallengeWatch"
              SET "failCount" = "failCount" + 1,
                  "unsubscribedAt" = CASE WHEN "failCount" + 1 >= 5 THEN NOW() ELSE "unsubscribedAt" END
              WHERE id = ${w.id}`;
          }
        }
      }
    }

    if (ch.creatorUserId && canNotifyAgain(ch.lastEmailAt, now, CHALLENGE_EMAIL_GAP_MS)) {
      const user = await prisma.user.findUnique({ where: { id: ch.creatorUserId }, select: { email: true } });
      if (user?.email && (await claimSlot(ch.id, "lastEmailAt", CHALLENGE_EMAIL_GAP_MS))) {
        const mail = challengePlayEmail({
          token: ch.id,
          examShort: ch.examShort,
          creatorCorrect: ch.creatorCorrect,
          total: ch.questionCount,
          plays,
        });
        await sendEmail({ to: user.email, ...mail, tag: "challenge-play", unsubUserId: ch.creatorUserId });
      }
    }
  } catch (err) {
    console.error("[challenge] notify failed:", (err as Error)?.message);
  }
}

export type CreatorViewResult =
  | {
      ok: true;
      examCode: string;
      examShort: string;
      questionCount: number;
      creatorCorrect: number;
      creatorName: string | null;
      fromMock: boolean;
      expiresAt: string;
      expired: boolean;
      /** Newest first; only friends who chose to send their score. */
      plays: { name: string | null; correct: number; at: string }[];
      /** Devices with notifications on for this challenge. */
      watching: number;
    }
  | Fail;

export async function challengeCreatorView(token: string, access: ChallengeAccess): Promise<CreatorViewResult> {
  const ch = await loadChallenge(token);
  if (!ch) return { ok: false, status: 404, error: "challenge not found" };
  if (!canManage(ch, access)) {
    return { ok: false, status: 403, error: "Only the person who made this challenge can see its scores." };
  }
  const plays = await prisma.$queryRaw<{ name: string | null; correct: number; at: Date }[]>`
    SELECT "playerName" AS name, correct, "createdAt" AS at FROM "ChallengePlay"
    WHERE "challengeId" = ${ch.id}
    ORDER BY "createdAt" DESC
    LIMIT 100`;
  const watch = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM "ChallengeWatch" WHERE "challengeId" = ${ch.id} AND "unsubscribedAt" IS NULL`;
  return {
    ok: true,
    examCode: ch.examCode,
    examShort: ch.examShort,
    questionCount: ch.questionCount,
    creatorCorrect: ch.creatorCorrect,
    creatorName: ch.creatorName,
    fromMock: ch.source === "mock",
    expiresAt: new Date(ch.expiresAt).toISOString(),
    expired: isChallengeExpired(ch.expiresAt),
    plays: plays.map((p) => ({ name: p.name, correct: Number(p.correct), at: new Date(p.at).toISOString() })),
    watching: Number(watch[0]?.n ?? 0),
  };
}

/** Turn on phone notifications for a challenge (the challenger only). The
 *  first sign-up from a device sends one confirmation, which also proves the
 *  subscription works. */
export async function addChallengeWatch(
  token: string,
  access: ChallengeAccess,
  sub: { endpoint: string; p256dh: string; auth: string },
): Promise<{ ok: true; fresh: boolean } | Fail> {
  if (!pushConfigured()) return { ok: false, status: 503, error: "Phone notifications are not available right now." };
  const ch = await loadChallenge(token);
  if (!ch) return { ok: false, status: 404, error: "challenge not found" };
  if (!canManage(ch, access)) {
    return { ok: false, status: 403, error: "Only the person who made this challenge can turn on its notifications." };
  }
  if (isChallengeExpired(ch.expiresAt)) return { ok: false, status: 410, error: "This challenge has ended." };
  if (!isAllowedPushEndpoint(sub.endpoint)) {
    return { ok: false, status: 400, error: "This browser's notifications are not supported yet." };
  }
  const rows = await prisma.$queryRaw<{ fresh: boolean }[]>`
    INSERT INTO "ChallengeWatch" (id, "challengeId", endpoint, p256dh, auth, "createdAt")
    VALUES (${crypto.randomUUID()}, ${ch.id}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, NOW())
    ON CONFLICT ("challengeId", endpoint) DO UPDATE SET
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      "unsubscribedAt" = NULL,
      "failCount" = 0
    RETURNING (xmax = 0) AS fresh`;
  const fresh = rows[0]?.fresh === true;
  if (fresh) {
    const outcome = await sendPush(sub, watchWelcomePush(ch));
    if (outcome !== "sent") {
      await prisma.$executeRaw`
        UPDATE "ChallengeWatch" SET "unsubscribedAt" = NOW() WHERE "challengeId" = ${ch.id} AND endpoint = ${sub.endpoint}`.catch(() => {});
      return {
        ok: false,
        status: outcome === "gone" ? 410 : 502,
        error:
          outcome === "gone"
            ? "This browser turned the notification off. Please try again."
            : "Couldn't reach this browser's notification service. Please try again.",
      };
    }
  }
  return { ok: true, fresh };
}
