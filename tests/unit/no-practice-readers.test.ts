// Readers that promise practice on an ENROLLED exam, and the AI cron that
// could overwrite the official research (27 Sep 2026, fixer).
//
// An enrolment can sit on an exam with NO practice (src/lib/exam-practice-state.ts):
// /chat enrols the exam the AI tutor opens, and the tutor is the one call to
// action on a no-practice hub. The Daily-5 mail then said "your Daily 5 for
// {exam} is ready … 5 quick questions on one of your weakest {exam} topics"
// with no question to serve. Now the Daily-5 mail, /today's pick
// (pickDailyFive) and the coach intake skip such an exam
// (src/lib/db/exam-practice.ts practiceExamCodes), and
// /api/cron/refresh-vacancies never picks an ExamEligibility row the official
// research wrote (generatedBy "official-research:…") — it would have left a
// web-search figure in a row still labelled official research.
//
// practiceExamCodes() runs against a stubbed Prisma read; the rest are source
// checks. No DB, no network.
// Run: npx vitest run tests/unit/no-practice-readers.test.ts

import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rows: [] as unknown[], fail: false }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: async () => {
      if (state.fail) throw new Error("db down");
      return state.rows;
    },
  },
}));

import { practiceExamCodes } from "@/lib/db/exam-practice";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");
/** Source with block and line comments removed. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const row = (code: string, questions: number, systemMocks: number) => ({ code, shortName: code, category: "OTHER", state: null, candidatesPerYear: null, questions, systemMocks });

describe("practiceExamCodes — the exams a reader may promise practice on", () => {
  afterEach(() => {
    state.fail = false;
    vi.restoreAllMocks();
  });

  it("a checked question or a shared mock; neither → left out", async () => {
    state.rows = [row("SSC_CGL", 900, 4), row("RBI_GRADE_B", 0, 0), row("MOCKS_ONLY", 0, 1), row("CLAT", 0, 0)];
    const codes = await practiceExamCodes();
    expect(codes).not.toBeNull();
    expect([...codes!].sort()).toEqual(["MOCKS_ONLY", "SSC_CGL"]);
  });

  it("a failed read is null — the caller keeps its old behaviour instead of stopping", async () => {
    state.fail = true;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await practiceExamCodes()).toBeNull();
    expect(err).toHaveBeenCalled();
  });
});

describe("the Daily-5 mail names only an enrolled exam with practice", () => {
  const src = code("src/app/api/cron/daily-five/route.ts");

  it("enrolments without practice are dropped before the exam is resolved; none left → no mail", () => {
    expect(src).toContain("const practiceCodes = await practiceExamCodes();");
    expect(src).toContain("const mine = practiceCodes ? u.enrollments.filter((e) => practiceCodes.has(e.exam.code)) : u.enrollments;");
    expect(src).toMatch(/if \(mine\.length === 0\) \{\s*modes\["skip:no-practice"\] = \(modes\["skip:no-practice"\] \?\? 0\) \+ 1;\s*continue;\s*\}/);
    expect(src).toMatch(/resolveMailExam\(\s*mine\.map\(/);
    // A rollover names the next exam as "your" exam only if it is enrolled AND has practice.
    expect(src).toContain("const alsoEnrolled = mine.some((e) => e.examId === resolved.examId);");
    expect(src).not.toMatch(/u\.enrollments\.some\(/);
    expect(src.indexOf("const mine =")).toBeLessThan(src.indexOf("sendDailyFiveEmail({"));
  });

  it("/today and the dashboard pick: the newest enrolment WITH practice, else none", () => {
    const five = code("src/lib/study-day-five.ts");
    expect(five).toContain('import { practiceExamCodes } from "@/lib/db/exam-practice";');
    expect(five).toContain("const enrollment = practiceCodes ? enrollments.find((e) => practiceCodes.has(e.exam.code)) : enrollments[0];");
    expect(five).not.toMatch(/prisma\.enrollment\.findFirst\(/);
  });
});

describe("the coach intake plans only toward an exam with practice", () => {
  it("POST /api/coach refuses an exam with none (409), after the exam lookup", () => {
    const api = code("src/app/api/coach/route.ts");
    expect(api).toMatch(/if \(practiceCodes && !practiceCodes\.has\(exam\.code\)\) \{\s*return Response\.json\(\s*\{ error: "Shishya has no practice questions for this exam yet, so a day-by-day plan would be empty\. Pick another exam\." \},\s*\{ status: 409 \},/);
    expect(api.indexOf("if (!exam?.active)")).toBeLessThan(api.indexOf("practiceExamCodes()"));
    expect(api.indexOf("practiceExamCodes()")).toBeLessThan(api.indexOf('INSERT INTO "CoachPlan"'));
  });

  it("/coach offers and recommends only exams with practice", () => {
    const page = code("src/app/coach/page.tsx");
    expect(page).toContain("return rows.filter((r) => !practiceCodes || practiceCodes.has(r.code)).map((r) => ({");
    expect(page).toContain("const hit = rows.find((r) => !practiceCodes || practiceCodes.has(r.code)) ?? null;");
    expect(page).toMatch(/ORDER BY \(en\."userId" IS NOT NULL\) DESC, MIN\(d\.date\) ASC\s*LIMIT 10`/);
  });
});

describe("refresh-vacancies never touches a row the official research wrote", () => {
  it("the SELECT skips generatedBy 'official-research:…' before it orders or limits", () => {
    const src = code("src/app/api/cron/refresh-vacancies/route.ts");
    const where = src.indexOf("WHERE e.active = TRUE");
    const skip = src.indexOf(`AND COALESCE(x."generatedBy", '') NOT LIKE 'official-research:%'`);
    const order = src.indexOf("ORDER BY GREATEST(");
    expect(where).toBeGreaterThan(-1);
    expect(skip).toBeGreaterThan(where);
    expect(skip).toBeLessThan(order);
    // The hub treats exactly this prefix as official research.
    expect(code("src/app/exams/[code]/page.tsx")).toContain('(elig.generatedBy ?? "").startsWith("official-research:")');
  });

  it("the activation script says the skip must be deployed first", () => {
    const s = read("scripts/activate-national-exams.ts");
    expect(s).toContain("it now skips the rows the official research wrote");
    expect(s).toContain("must be DEPLOYED before --apply");
    expect(s).not.toMatch(/being written/);
  });
});
