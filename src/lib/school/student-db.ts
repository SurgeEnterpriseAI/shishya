// Student mode on school pages (26 Sep 2026) — the server side.
//
// The pure rules live in src/lib/school/student-classes.ts; this module is
// every DB read and write the student flows make, so the three routes that
// serve them (POST /api/me/onboarding-profile for the age band, POST
// /api/mocks/custom and POST /api/mocks for "Practise this chapter") hold
// no school query of their own:
//   • findStudentModeContainer — ONE school container by its code, category
//     pinned (SCHOOL_CONTAINER_WHERE, never `active`: every container is
//     inactive by design, src/lib/school/scope.ts), and null unless it is a
//     student-mode class (8-12). tests/unit/exam-scope-guard.test.ts
//     allow-lists this file for that one keyed read (reason "SCHOOL").
//   • readSchoolProfile / declareSchoolBand — the one-time age band, in the
//     EXISTING User fields (onbStage + onbPrepCodes, see student-classes.ts),
//     and the account's enrolment on the class container through the one
//     enrolment door with the school flag (src/lib/db/enrollment.ts).
//   • buildSchoolChapterMock — "Practise this chapter": up to
//     SCHOOL_CHAPTER_MOCK_MAX of the chapter's answer-checked, non-withdrawn
//     MCQs (SCHOOL_SERVABLE_QUESTION_WHERE — the same test the guest quiz and
//     the served-paper rule apply), unseen first, never padded: the title and
//     the response carry the number the set really holds, and fewer than the
//     minimum builds nothing (422). The mock is the ordinary Mock row the
//     /mocks/[id] player runs (USER_REQUEST = instant-feedback practice,
//     generatedBy "school-chapter"), with config.school naming the chapter
//     and its page so the results page can hide the exam CTAs and link the
//     chapter and the school tutor instead.
// No AI call anywhere here.

import { prisma } from "@/lib/db/prisma";
import { ensureEnrollment } from "@/lib/db/enrollment";
import { getSeenHistory } from "@/lib/answered-questions";
import { SEEN_WINDOW_DAYS, answeredBankLine, countRepeats, partitionBySeen, pickTiered, seenSummary, shuffleWith, type BankStats, type SeenInput } from "@/lib/question-pick";
import { shortfallLine, titleWithCount } from "@/lib/mock-fill";
import { subjectShortName } from "./copy";
import { SCHOOL_CONTAINER_WHERE, SCHOOL_SERVABLE_QUESTION_WHERE } from "./scope";
import {
  SCHOOL_CHAPTER_MOCK_MAX,
  SCHOOL_CHAPTER_MOCK_MIN,
  isStudentModeContainer,
  schoolBandOfProfile,
  schoolStageForBand,
  studentModeClassOfExamCode,
  type SchoolBand,
  type SchoolBandProfile,
} from "./student-classes";
import { loadSchoolSurface, schoolChapterPath } from "./surface";

export interface StudentModeContainer {
  id: string;
  code: string;
  category: string;
  shortName: string;
  name: string;
  durationMin: number;
  totalQuestions: number;
  /** 8-12 */
  cls: number;
}

/** One student-mode school container by code; null for a Class 1-7
 *  container, a real exam's code or an unknown code — the caller's
 *  "unknown exam" branch runs, exactly as a school code behaves on the exam
 *  surfaces (the keyed helper in src/lib/db/exam-scope.ts). */
export async function findStudentModeContainer(code: string): Promise<StudentModeContainer | null> {
  const cls = studentModeClassOfExamCode(code);
  if (cls === null) return null;
  const exam = await prisma.exam.findUnique({
    where: { ...SCHOOL_CONTAINER_WHERE, code },
    select: { id: true, code: true, category: true, shortName: true, name: true, durationMin: true, totalQuestions: true },
  });
  if (!exam || !isStudentModeContainer(exam)) return null;
  return { ...exam, cls };
}

// ── Age band ──────────────────────────────────────────────────────────

/** The account's school band, or null until the card was answered. */
export async function readSchoolProfile(userId: string): Promise<SchoolBandProfile | null> {
  const rows = await prisma.$queryRaw<{ onbStage: string | null; onbPrepCodes: string[] | null }[]>`
    SELECT "onbStage", "onbPrepCodes" FROM "User" WHERE "id" = ${userId} LIMIT 1`;
  return schoolBandOfProfile(rows[0] ?? null);
}

export type DeclareSchoolBandResult = { ok: true; profile: SchoolBandProfile } | { ok: false; status: 404; error: string };

/** The one-time age-band answer on a student-mode class page: writes the
 *  band into onbStage, adds the container code to onbPrepCodes (keeping
 *  every code already there), marks the wizard done so the exam wizard never
 *  nags a school account, and enrols the account on the class container
 *  (school flag). Returns the profile the page should now render by. */
export async function declareSchoolBand(userId: string, band: SchoolBand, examCode: string): Promise<DeclareSchoolBandResult> {
  const exam = await findStudentModeContainer(examCode);
  if (!exam) return { ok: false, status: 404, error: "unknown class" };
  const current = await prisma.$queryRaw<{ onbPrepCodes: string[] | null }[]>`
    SELECT "onbPrepCodes" FROM "User" WHERE "id" = ${userId} LIMIT 1`;
  const codes = [...new Set([...(current[0]?.onbPrepCodes ?? []), exam.code])];
  const stage = schoolStageForBand(band, exam.cls);
  await prisma.$executeRaw`
    UPDATE "User"
    SET "onbStage" = ${stage},
        "onbPrepCodes" = ${codes}::text[],
        "onbCompletedAt" = COALESCE("onbCompletedAt", NOW()),
        "updatedAt" = NOW()
    WHERE "id" = ${userId}`;
  // "Your classes": the account's enrolment on the container, through the
  // one door with the school flag. Never an exam mail loop — the audiences
  // in src/lib/db/enrollment.ts drop school-only accounts.
  await ensureEnrollment(userId, exam, { active: true }, { school: true });
  const profile = schoolBandOfProfile({ onbStage: stage, onbPrepCodes: codes });
  if (!profile) throw new Error("school band write produced no profile"); // cannot happen: stage + code were just written
  return { ok: true, profile };
}

// ── Chapter practice ──────────────────────────────────────────────────

/** What a school mock's config.school records at creation. */
export interface SchoolMockConfig {
  examCode: string;
  topicCode: string;
  chapterName: string;
  subjectName: string;
  cls: number;
  /** The chapter page, when the surface knew the chapter at build time. */
  chapterPath: string | null;
}

/** config.school of a school chapter mock, or null for any other mock. */
export function schoolMockConfigOf(config: unknown): SchoolMockConfig | null {
  const s = (config as { school?: unknown } | null | undefined)?.school;
  if (!s || typeof s !== "object") return null;
  const o = s as Partial<SchoolMockConfig>;
  if (typeof o.examCode !== "string" || typeof o.topicCode !== "string" || typeof o.chapterName !== "string") return null;
  return {
    examCode: o.examCode,
    topicCode: o.topicCode,
    chapterName: o.chapterName,
    subjectName: typeof o.subjectName === "string" ? o.subjectName : "",
    cls: typeof o.cls === "number" ? o.cls : (studentModeClassOfExamCode(o.examCode) ?? 0),
    chapterPath: typeof o.chapterPath === "string" && o.chapterPath.startsWith("/schooling/") ? o.chapterPath : null,
  };
}

export type SchoolChapterMockResult =
  | { ok: true; id: string; title: string; count: number; requested: number; short: boolean; line: string | null; durationMin: number; bank: (BankStats & { line: string }) | null; chapterPath: string | null }
  | { ok: false; status: 403 | 404 | 422; error: string; available?: number };

/** The chapter page of (container, chapter) from the cached surface; null
 *  when the surface does not list it (or the read failed — the mock still
 *  builds; the results page then links /schooling). */
async function chapterPathOf(examCode: string, topicCode: string): Promise<string | null> {
  try {
    const surface = await loadSchoolSurface();
    const c = surface.classes.find((x) => x.examCode === examCode);
    if (!c) return null;
    for (const s of c.subjects) {
      const ch = s.chapters.find((x) => x.code === topicCode);
      if (ch) return schoolChapterPath(c.boardSlug, c.cls, s.slug, ch.slug);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Build "Practise this chapter" for a signed-in student of a student-mode
 * class: `count` (at most SCHOOL_CHAPTER_MOCK_MAX) of the chapter's checked
 * questions, unseen first — never-shown, then shown-but-unanswered, then
 * least-recently-answered (src/lib/question-pick.ts) — and an honest size.
 */
export async function buildSchoolChapterMock(i: { userId: string; examCode: string; topicCode: string; count: number }): Promise<SchoolChapterMockResult> {
  const exam = await findStudentModeContainer(i.examCode);
  if (!exam) return { ok: false, status: 404, error: "unknown exam" };
  // The age band comes first: no practice set for an account that has not
  // answered the card (the page shows the card instead of this button).
  const profile = await readSchoolProfile(i.userId);
  if (!profile) return { ok: false, status: 403, error: "school-band-required" };

  const topic = await prisma.topic.findFirst({
    where: { code: i.topicCode, parentId: null, subject: { examId: exam.id } },
    select: { id: true, name: true, code: true, subject: { select: { name: true } }, children: { select: { id: true } } },
  });
  if (!topic) return { ok: false, status: 404, error: "unknown chapter" };
  const topicIds = [topic.id, ...topic.children.map((c) => c.id)];

  const [pool, seen] = await Promise.all([
    prisma.question.findMany({
      where: { ...SCHOOL_SERVABLE_QUESTION_WHERE, examId: exam.id, topicId: { in: topicIds } },
      select: { id: true, topicId: true, difficulty: true },
    }),
    getSeenHistory(i.userId, exam.id),
  ]);
  const requested = Math.max(SCHOOL_CHAPTER_MOCK_MIN, Math.min(SCHOOL_CHAPTER_MOCK_MAX, Math.floor(i.count)));
  const seenForPick: SeenInput = seen ?? new Map();
  const { fresh, shownLrs } = partitionBySeen(pool, seenForPick);
  const firstPass = [...shuffleWith(fresh), ...shownLrs].slice(0, requested);
  const chosen = firstPass.length < requested
    ? [...firstPass, ...pickTiered([pool.filter((q) => !firstPass.some((p) => p.id === q.id))], requested - firstPass.length, seenForPick).picked]
    : firstPass;
  const questionIds = shuffleWith(chosen).map((q) => q.id);
  if (questionIds.length < SCHOOL_CHAPTER_MOCK_MIN) {
    return {
      ok: false,
      status: 422,
      error: `Only ${questionIds.length} checked ${questionIds.length === 1 ? "question is" : "questions are"} ready for this chapter — practice needs at least ${SCHOOL_CHAPTER_MOCK_MIN}.`,
      available: questionIds.length,
    };
  }

  const bank: BankStats | null = seen
    ? { size: seenSummary(pool, seen).bankSize, seen: seenSummary(pool, seen).seenInBank, repeats: countRepeats(questionIds, seen), windowDays: SEEN_WINDOW_DAYS }
    : null;
  const perQMin = exam.totalQuestions > 0 ? exam.durationMin / exam.totalQuestions : 1.5;
  const durationMin = Math.max(5, Math.round(questionIds.length * perQMin));
  const subjectName = topic.subject.name;
  // The number in the title is the number of questions picked, never the size asked for.
  const title = titleWithCount(`Class ${exam.cls} ${subjectShortName(subjectName)} — Practice: ${topic.name}`, questionIds.length);
  const short = questionIds.length < requested;
  const chapterPath = await chapterPathOf(exam.code, topic.code);

  // The account's enrolment on the class container (school flag) — the
  // player and the attempt start do the same, so a set built here always
  // starts; see src/lib/db/enrollment.ts.
  await ensureEnrollment(i.userId, exam, {}, { school: true });

  const school: SchoolMockConfig = { examCode: exam.code, topicCode: topic.code, chapterName: topic.name, subjectName, cls: exam.cls, chapterPath };
  const mock = await prisma.mock.create({
    data: {
      examId: exam.id,
      userId: i.userId,
      type: "USER_REQUEST",
      title,
      questionIds,
      generatedBy: "school-chapter",
      config: {
        topics: [topic.id],
        topicNames: [topic.name],
        difficulty: "MIXED",
        count: questionIds.length,
        requestedCount: requested,
        durationMin,
        ...(bank ? { seen: { ...bank, basis: "answered" } } : {}),
        school,
      } as object,
    },
    select: { id: true },
  });

  return {
    ok: true,
    id: mock.id,
    title,
    count: questionIds.length,
    requested,
    short,
    line: shortfallLine(requested, questionIds.length, "this chapter"),
    durationMin,
    bank: bank ? { ...bank, line: answeredBankLine(bank) } : null,
    chapterPath,
  };
}
