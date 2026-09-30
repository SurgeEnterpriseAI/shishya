// The profile a new account starts with (30 Sep 2026, sign-up build 2).
//
// Called once, by the NextAuth createUser event (src/lib/auth.ts), inside the
// OAuth callback route handler — where cookies() is in scope, exactly as for
// the attribution capture and the school branch. Nothing is asked: every
// write below uses a signal the student already gave by reading the page.
//   1. EXAM GOAL (never on a school sign-in): the exam of the page the
//      student signed up from (src/lib/signup-goal.ts — the callback, or for
//      a generic callback the browser's last page before /login) becomes an
//      active enrolment through the one door (src/lib/db/enrollment.ts),
//      looked up with realExamKey, active only — so never a school
//      container. Idempotent: an exam the account already holds is left as
//      it is. /chat?examCode already enrolled silently (chat/page.tsx); now
//      the exam hub, PYQ, quiz, build-mock and mock returns do too. The
//      "Your Shishya is ready" strip names it and changes it in one tap.
//   2. LANGUAGE: a /hi or /te callback, else a non-English shishya-lang
//      cookie, fills User.preferredLang while it is still the default EN
//      (the same raw UPDATE as /api/me/preferences).
//   3. GUEST RECORDS: challenges this browser made as a guest (creatorAnonId,
//      still live) and exam alerts made with this email are linked to the
//      account, so "a friend played your challenge" reaches it
//      (src/lib/challenge-db.ts mails creatorUserId only). Not on a school
//      sign-in for challenges (a school surface has no challenge).
//   4. The one-time strip's cookie (src/lib/welcome-strip.ts), exam-side
//      sign-ups only.
// Each step is best-effort and independent; nothing here can fail a sign-in.

import { prisma } from "./db/prisma";
import { realExamKey, realExamOrNull } from "./db/exam-scope";
import { ensureEnrollment } from "./db/enrollment";
import { normaliseEmail } from "./exam-alerts";
import { callbackAllowsTrailGoal, goalFromTrail, signupGoalOf, signupLanguage, type SignupGoal } from "./signup-goal";
import { WELCOME_COOKIE, WELCOME_COOKIE_MAX_AGE_S, WELCOME_COOKIE_VALUE } from "./welcome-strip";

export interface SignupProfileInput {
  userId: string;
  email: string | null | undefined;
  /** The browser's anonymous analytics id (shishya_anon), or null. */
  anonId: string | null;
  /** The NextAuth callback URL (the page the account was made from), or null. */
  callback: string | null;
  /** A school sign-in (src/lib/school/student-classes.ts isSchoolSignInCallback). */
  school: boolean;
}

export interface SignupProfileResult {
  goal: { code: string; shortName: string } | null;
  lang: string | null;
  challengesLinked: number;
  alertsLinked: number;
  welcomeCookie: boolean;
}

/** How far back the browser's own page views may name the goal. */
const TRAIL_WINDOW_MS = 3 * 3600_000;

type GoalExam = { id: string; code: string; shortName: string; category: string };

async function readCookie(name: string): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get(name)?.value ?? null;
  } catch {
    return null;
  }
}

/** The real, active exam the sign-up names, or null. */
async function resolveGoalExam(i: SignupProfileInput): Promise<GoalExam | null> {
  let goal: SignupGoal | null = signupGoalOf(i.callback);
  if (!goal && i.anonId && callbackAllowsTrailGoal(i.callback)) {
    // One indexed read ([anonId, createdAt]): this browser's last pages.
    const rows = await prisma.analyticsEvent.findMany({
      where: { anonId: i.anonId, kind: "PAGE_VIEW", createdAt: { gte: new Date(Date.now() - TRAIL_WINDOW_MS) } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { path: true },
    });
    goal = goalFromTrail(rows.map((r) => r.path));
  }
  if (!goal) return null;
  if (goal.kind === "exam") {
    const exam = await prisma.exam.findUnique({
      where: realExamKey({ code: goal.code }),
      select: { id: true, code: true, shortName: true, category: true, active: true },
    });
    return exam && exam.active ? exam : null;
  }
  const mock = await prisma.mock.findUnique({
    where: { id: goal.id },
    select: { exam: { select: { id: true, code: true, shortName: true, category: true, active: true } } },
  });
  const exam = realExamOrNull(mock?.exam ?? null);
  return exam && exam.active ? exam : null;
}

/** 1. The exam goal: enrol when the account does not hold the exam yet. */
async function recordSignupGoal(i: SignupProfileInput): Promise<SignupProfileResult["goal"]> {
  const exam = await resolveGoalExam(i);
  if (!exam) return null;
  const existing = await prisma.enrollment.findUnique({
    where: { userId_examId: { userId: i.userId, examId: exam.id } },
    select: { active: true },
  });
  // Already held: left exactly as it is (an exam the student turned off stays off).
  if (existing) return existing.active ? { code: exam.code, shortName: exam.shortName } : null;
  await ensureEnrollment(i.userId, exam, { active: true });
  return { code: exam.code, shortName: exam.shortName };
}

/** 2. The page language, while preferredLang is still the default EN. */
async function storeSignupLanguage(i: SignupProfileInput): Promise<string | null> {
  const code = signupLanguage({ callback: i.callback, cookie: await readCookie("shishya-lang") });
  if (!code) return null;
  await prisma.$executeRaw`
    UPDATE "User"
    SET "preferredLang" = ${code}::"Language",
        "updatedAt" = NOW()
    WHERE "id" = ${i.userId} AND "preferredLang" = 'EN'
  `;
  return code;
}

/** 3a. Live challenges this browser made as a guest. */
async function linkGuestChallenges(userId: string, anonId: string): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "Challenge" SET "creatorUserId" = ${userId}
    WHERE "creatorAnonId" = ${anonId} AND "creatorUserId" IS NULL AND "expiresAt" > NOW()
  `;
}

/** 3b. Exam alerts made with this email before the account existed.
 *  30 Sep 2026 (review): plain equality on the normalised address, so the
 *  (email, examId) unique index serves it inside the OAuth callback —
 *  /api/exam-alerts stores normaliseEmail() (trim + lowercase), and a
 *  read-only probe found 0 stored rows that are not normalised. */
async function linkGuestAlerts(userId: string, email: string): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "ExamAlert" SET "userId" = ${userId}
    WHERE "email" = ${normaliseEmail(email)} AND "userId" IS NULL
  `;
}

/** 4. The one-time strip's cookie. */
async function setWelcomeCookie(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  (await cookies()).set(WELCOME_COOKIE, WELCOME_COOKIE_VALUE, {
    path: "/",
    maxAge: WELCOME_COOKIE_MAX_AGE_S,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });
  return true;
}

function logged<T>(step: string, fallback: T) {
  return (err: unknown): T => {
    console.error(`[signup-profile] ${step} failed (non-fatal):`, err);
    return fallback;
  };
}

export async function applySignupProfile(i: SignupProfileInput): Promise<SignupProfileResult> {
  const email = typeof i.email === "string" && i.email.includes("@") ? i.email : null;
  const [goal, lang, challengesLinked, alertsLinked] = await Promise.all([
    i.school ? Promise.resolve(null) : recordSignupGoal(i).catch(logged("exam goal", null)),
    storeSignupLanguage(i).catch(logged("language", null)),
    !i.school && i.anonId ? linkGuestChallenges(i.userId, i.anonId).catch(logged("challenge link", 0)) : Promise.resolve(0),
    email ? linkGuestAlerts(i.userId, email).catch(logged("alert link", 0)) : Promise.resolve(0),
  ]);
  const welcomeCookie = i.school ? false : await setWelcomeCookie().catch(logged("welcome cookie", false));
  return { goal, lang, challengesLinked, alertsLinked, welcomeCookie };
}
