// Student mode on Class 8-12 school pages (26 Sep 2026) — the rules.
//
//  1. the container rule: NCERT_C08..C12 and CISCE_C08..C12 are student-mode
//     containers; Classes 1-7 and every real exam are not; the pure module
//     restates three facts (category name, code shape, practice minimum) and
//     they are pinned equal to their sources;
//  2. the enrolment door (src/lib/db/enrollment.ts) against a stubbed Prisma:
//     real exam → upsert; school container → refused; school container of a
//     student-mode class → refused WITHOUT the school flag, allowed WITH it;
//     Class 1-7 container → refused even with the flag; the flag on a real
//     exam changes nothing;
//  3. the audiences: realEnrollmentExistsSql joins the exam category,
//     hasRealExamEnrollment / schoolOnlyUserIds against the stub, and a
//     source scan — no cron or mail predicate keys on a bare Enrollment
//     EXISTS any more;
//  4. the age band in existing fields: stage per band and class, the
//     profile reader (a wizard-only CLASS_9_10 account has NO band), the
//     minor test;
//  5. chapter practice honesty: 4 → no button, 7 → 7, 25 → 10;
//  6. what the entry renders per class band and auth state
//     (studentEntryView), the links, and the pages: the island only under
//     isStudentModeClass, the results page's exam pieces off for a school
//     attempt, the copy's age line and AI line, no forbidden literal in the
//     island.
// No DB, no network. Run: npx vitest run tests/unit/school-student-mode.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  upserts: [] as unknown[],
  counts: [] as unknown[],
  countAnswer: 0,
  rawAnswer: [] as unknown[],
  raws: [] as { sql: string; values: unknown[] }[],
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    enrollment: {
      upsert: async (args: unknown) => {
        db.upserts.push(args);
        return { id: "enr-1" };
      },
      count: async (args: unknown) => {
        db.counts.push(args);
        return db.countAnswer;
      },
    },
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      db.raws.push({ sql: strings.join("?"), values });
      return db.rawAnswer;
    },
  },
}));

import { SCHOOL_CATEGORY, isSchoolCategory } from "@/lib/db/exam-scope";
import { SCHOOL_TUTOR_DAILY_CAP } from "@/lib/school/tutor-cap";
import { SCHOOL_GUEST_QUIZ_MIN } from "@/lib/school/scope";
import { MIN_SERVED_QUESTIONS } from "@/lib/served-paper";
import { ensureEnrollment, hasRealExamEnrollment, realEnrollmentExistsSql, schoolOnlyAccountSql, schoolOnlyUserIds } from "@/lib/db/enrollment";
import {
  SCHOOL_BANDS,
  SCHOOL_CHAPTER_MOCK_MAX,
  SCHOOL_CHAPTER_MOCK_MIN,
  isMinorBand,
  isSchoolBand,
  isSchoolReturn,
  isSchoolSignInCallback,
  isStudentModeClass,
  isStudentModeContainer,
  schoolBandOfProfile,
  schoolBandOfStage,
  schoolChapterMockCount,
  schoolContainerClassOf,
  schoolReturnPath,
  schoolSignInHref,
  schoolStageForBand,
  schoolTutorHref,
  studentEntryView,
  studentModeClassOfExamCode,
  studentModeCodesOf,
  studentStageForClass,
} from "@/lib/school/student-classes";
import {
  AGE_LINE,
  AI_TUTOR_LINE,
  PRACTICE_LABEL,
  SCHOOL_REVIEW_COPY,
  STUDENT_ENTRY_COPY,
  schoolDashboardCopy,
  schoolMistakesHeading,
  schoolMistakesSeed,
  schoolQuestionSeed,
  schoolResultsCopy,
} from "@/lib/school/student-copy";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

beforeEach(() => {
  db.upserts = [];
  db.counts = [];
  db.countAnswer = 0;
  db.rawAnswer = [];
  db.raws = [];
});

// ── 1: the container rule ────────────────────────────────────────────

describe("student-mode containers = Class 8-12 school containers", () => {
  it("the pure module's restated facts equal their sources", () => {
    expect(SCHOOL_CATEGORY).toBe("SCHOOL_BOARD");
    expect(SCHOOL_CHAPTER_MOCK_MIN).toBe(SCHOOL_GUEST_QUIZ_MIN);
    expect(SCHOOL_CHAPTER_MOCK_MIN).toBe(MIN_SERVED_QUESTIONS);
    expect(SCHOOL_CHAPTER_MOCK_MAX).toBe(10);
    for (const code of ["NCERT_C01", "NCERT_C09", "CISCE_C12"]) expect(schoolContainerClassOf(code)).toBe(Number(code.slice(-2)));
    for (const code of ["SSC_CGL", "NCERT_C13", "NCERT_C0", "ncert_c09", "NCERT_C09 "]) expect(schoolContainerClassOf(code)).toBeNull();
  });

  it("classes 8-12 are student-mode; 1-7 are not", () => {
    for (let c = 1; c <= 12; c++) expect(isStudentModeClass(c), `class ${c}`).toBe(c >= 8);
    expect(isStudentModeClass(0)).toBe(false);
    expect(isStudentModeClass(13)).toBe(false);
    expect(isStudentModeClass(9.5)).toBe(false);
  });

  it("the container matrix: NCERT / CISCE C08-C12 only, and only with the school category", () => {
    for (const cur of ["NCERT", "CISCE"]) {
      for (let c = 1; c <= 12; c++) {
        const code = `${cur}_C${String(c).padStart(2, "0")}`;
        expect(studentModeClassOfExamCode(code), code).toBe(c >= 8 ? c : null);
        expect(isStudentModeContainer({ code, category: "SCHOOL_BOARD" }), code).toBe(c >= 8);
        expect(isStudentModeContainer({ code, category: "school_board" }), code).toBe(c >= 8);
        // The code alone is not enough: a row with a real category is not a school container.
        expect(isStudentModeContainer({ code, category: "GOVT_JOBS" }), code).toBe(false);
      }
    }
    expect(isStudentModeContainer({ code: "SSC_CGL", category: "GOVT_JOBS" })).toBe(false);
    expect(isStudentModeContainer({ code: "SSC_CGL", category: "SCHOOL_BOARD" })).toBe(false);
    expect(isSchoolCategory("SCHOOL_BOARD")).toBe(true);
  });
});

// ── 2: the enrolment door ─────────────────────────────────────────────

describe("ensureEnrollment: the refusal / allow matrix", () => {
  const real = { id: "e-ssc", category: "GOVT_JOBS", code: "SSC_CGL" };
  const c9 = { id: "e-c9", category: "SCHOOL_BOARD", code: "NCERT_C09" };
  const c12 = { id: "e-c12", category: "SCHOOL_BOARD", code: "CISCE_C12" };
  const c5 = { id: "e-c5", category: "SCHOOL_BOARD", code: "NCERT_C05" };

  it("a real exam enrols with and without the flag, byte-for-byte as before", async () => {
    await ensureEnrollment("u1", real);
    await ensureEnrollment("u1", real, { active: true }, { school: true });
    expect(db.upserts).toEqual([
      { where: { userId_examId: { userId: "u1", examId: "e-ssc" } }, update: {}, create: { userId: "u1", examId: "e-ssc" } },
      { where: { userId_examId: { userId: "u1", examId: "e-ssc" } }, update: { active: true }, create: { userId: "u1", examId: "e-ssc", active: true } },
    ]);
  });

  it("a student-mode container is refused WITHOUT the flag and allowed WITH it", async () => {
    await expect(ensureEnrollment("u1", c9)).rejects.toThrow(/school container/);
    await expect(ensureEnrollment("u1", c9, {}, { school: false })).rejects.toThrow(/school container/);
    await expect(ensureEnrollment("u1", { id: "e-c9", category: "SCHOOL_BOARD" }, {}, { school: true })).rejects.toThrow(/school container/); // no code → cannot prove the class
    expect(db.upserts).toEqual([]);
    await ensureEnrollment("u1", c9, { active: true }, { school: true });
    await ensureEnrollment("u1", c12, {}, { school: true });
    expect(db.upserts).toEqual([
      { where: { userId_examId: { userId: "u1", examId: "e-c9" } }, update: { active: true }, create: { userId: "u1", examId: "e-c9", active: true } },
      { where: { userId_examId: { userId: "u1", examId: "e-c12" } }, update: {}, create: { userId: "u1", examId: "e-c12" } },
    ]);
  });

  it("a Class 1-7 container is refused even with the flag", async () => {
    await expect(ensureEnrollment("u1", c5, {}, { school: true })).rejects.toThrow(/outside the student-mode classes/);
    await expect(ensureEnrollment("u1", c5)).rejects.toThrow(/school container/);
    expect(db.upserts).toEqual([]);
  });
});

// ── 3: the audiences ──────────────────────────────────────────────────

describe("exam audiences never hold a school-only account", () => {
  it("realEnrollmentExistsSql joins the exam and tests its category; the alias is validated", () => {
    const frag = realEnrollmentExistsSql("u");
    expect(frag.sql).toBe(`EXISTS (SELECT 1 FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" WHERE en."userId" = u.id AND en.active = TRUE AND e."category"::text <> 'SCHOOL_BOARD')`);
    expect(frag.values).toEqual([]);
    expect(realEnrollmentExistsSql("usr").sql).toContain(`en."userId" = usr.id`);
    for (const bad of ["u; DROP", "u.id", "1u", ""]) expect(() => realEnrollmentExistsSql(bad)).toThrow(/bad SQL alias/);
  });

  it("hasRealExamEnrollment counts active enrolments on non-school exams only", async () => {
    db.countAnswer = 0;
    expect(await hasRealExamEnrollment("u1")).toBe(false);
    db.countAnswer = 2;
    expect(await hasRealExamEnrollment("u1")).toBe(true);
    expect(db.counts[0]).toEqual({ where: { userId: "u1", active: true, exam: { category: { not: "SCHOOL_BOARD" } } } });
  });

  it("schoolOnlyUserIds asks for users whose active enrolments are all school containers", async () => {
    expect(await schoolOnlyUserIds([])).toEqual([]);
    expect(db.raws).toEqual([]);
    db.rawAnswer = [{ userId: "u2" }];
    expect(await schoolOnlyUserIds(["u1", "u2"])).toEqual(["u2"]);
    const q = db.raws[0];
    expect(q.sql).toMatch(/e\."category"::text = 'SCHOOL_BOARD'/);
    expect(q.sql).toMatch(/NOT EXISTS \(\s*SELECT 1 FROM "Enrollment" en2 JOIN "Exam" e2/);
    expect(q.values[0]).toEqual(["u1", "u2"]);
    // The NOT EXISTS carries the real-exam fragment (a Prisma.sql value).
    expect((q.values[1] as { sql: string }).sql).toBe(`e2."category"::text <> 'SCHOOL_BOARD'`);
  });

  // 26 Sep 2026 (fixer): the day-3 nudge is keyed on the User row alone (no
  // enrolment to join), so it needs the positive test — "this account is
  // school-only" — as an exclusion.
  it("schoolOnlyAccountSql: marked school (class enrolment OR the code in onbPrepCodes) AND no real-exam enrolment; alias validated", () => {
    const frag = schoolOnlyAccountSql("u");
    expect(frag.sql).toBe(
      `((EXISTS (SELECT 1 FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" WHERE en."userId" = u.id AND en.active = TRUE AND NOT e."category"::text <> 'SCHOOL_BOARD') ` +
        `OR EXISTS (SELECT 1 FROM unnest(COALESCE(u."onbPrepCodes", '{}'::text[])) c WHERE c ~ ?)) ` +
        `AND NOT EXISTS (SELECT 1 FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" WHERE en."userId" = u.id AND en.active = TRUE AND e."category"::text <> 'SCHOOL_BOARD'))`,
    );
    // The one bound value is the container code shape — the same set student-classes.ts parses.
    expect(frag.values).toEqual(["^(NCERT|CISCE)_C[0-9]{2}$"]);
    const re = new RegExp(frag.values[0] as string);
    for (const code of ["NCERT_C01", "NCERT_C08", "CISCE_C12"]) expect(re.test(code), code).toBe(true);
    for (const code of ["SSC_CGL", "NCERT_C9", "ncert_c09", "NCERT_C09 "]) expect(re.test(code), code).toBe(false);
    expect(schoolOnlyAccountSql("usr").sql).toContain(`unnest(COALESCE(usr."onbPrepCodes"`);
    for (const bad of ["u; DROP", "u.id", "1u", ""]) expect(() => schoolOnlyAccountSql(bad)).toThrow(/bad SQL alias/);
  });

  it("the day-3 nudge (keyed on User only) drops school-only accounts, and offers ?dry=1", () => {
    const src = stripComments(read("src/app/api/cron/day3-nudge/route.ts"));
    expect(src).toMatch(/AND NOT \$\{schoolOnlyAccountSql\("u"\)\}\s*ORDER BY u\."createdAt" ASC/);
    expect(src).toMatch(/import \{ schoolOnlyAccountSql \} from "@\/lib\/db\/enrollment";/);
    // The exclusion sits inside the candidate query, so a dry run shows it.
    expect(src.indexOf('schoolOnlyAccountSql("u")')).toBeLessThan(src.indexOf("if (dry) {"));
    expect(src.indexOf("if (dry) {")).toBeLessThan(src.indexOf("sendDay3NudgeEmail({"));
  });

  it("no mail audience keys on a bare Enrollment EXISTS any more (win-back, lapse nudge, Daily-5's would-mail)", () => {
    const files = [
      "src/app/api/cron/winback/route.ts",
      "src/app/api/cron/lapse-nudge/route.ts",
      "src/lib/study-day-five.ts",
      "src/app/api/cron/coach-morning/route.ts",
      "src/app/api/cron/daily-five/route.ts",
      "src/app/api/cron/evening-nudge/route.ts",
      "src/app/api/cron/daily-brief/route.ts",
      "src/app/api/cron/day3-nudge/route.ts",
    ];
    for (const f of files) {
      const src = stripComments(read(f));
      expect(src, f).not.toMatch(/EXISTS \(SELECT 1 FROM "Enrollment" (?:en|e) WHERE (?:en|e)\."userId" = u\.id AND (?:en|e)\.active(?: = TRUE)?\)/);
      // Every FROM "Enrollment" in these files is joined to "Exam" or read through the relation with the helper.
      const bare = [...src.matchAll(/FROM "Enrollment"(?: (?:en|e))?\s*\n?\s*WHERE/g)];
      expect(bare, `${f}: bare Enrollment read`).toEqual([]);
    }
    for (const f of ["src/app/api/cron/winback/route.ts", "src/app/api/cron/lapse-nudge/route.ts", "src/lib/study-day-five.ts"]) {
      expect(read(f), f).toMatch(/\$\{realEnrollmentExistsSql\("u"\)\}/);
    }
    // pickDailyFive: weakness rows and the enrolment fallback are real-exam only.
    const five = read("src/lib/study-day-five.ts");
    expect(five).toMatch(/prisma\.weaknessMap\.findMany\(\{\s*where: \{ userId, exam: NOT_SCHOOL_WHERE \}/);
    expect(five).toMatch(/prisma\.enrollment\.findFirst\(\{\s*where: \{ userId, active: true, exam: NOT_SCHOOL_WHERE \}/);
    // coach-morning's own-enrolment rollover joins the exam.
    expect(read("src/app/api/cron/coach-morning/route.ts")).toMatch(/FROM "Enrollment" en JOIN "Exam" e ON e\.id = en\."examId"\n\s+WHERE en\.active = TRUE AND en\."userId" = ANY\(.*?\) AND \$\{NOT_SCHOOL_SQL\}/);
  });
});

// ── 4: the age band in existing fields ────────────────────────────────

describe("the age band lives in onbStage + onbPrepCodes", () => {
  it("the four bands and their stages", () => {
    expect(SCHOOL_BANDS).toEqual(["STUDENT_13_17", "STUDENT_18", "PARENT", "TEACHER"]);
    for (const b of SCHOOL_BANDS) expect(isSchoolBand(b)).toBe(true);
    for (const x of ["CHILD", "", null, 13, undefined]) expect(isSchoolBand(x)).toBe(false);
    expect(studentStageForClass(8)).toBe("CLASS_8");
    expect(studentStageForClass(9)).toBe("CLASS_9_10");
    expect(studentStageForClass(10)).toBe("CLASS_9_10");
    expect(studentStageForClass(11)).toBe("CLASS_11_12");
    expect(studentStageForClass(12)).toBe("CLASS_11_12");
    expect(schoolStageForBand("STUDENT_13_17", 8)).toBe("CLASS_8");
    expect(schoolStageForBand("STUDENT_13_17", 12)).toBe("CLASS_11_12");
    expect(schoolStageForBand("STUDENT_18", 12)).toBe("SCHOOL_ADULT");
    expect(schoolStageForBand("PARENT", 9)).toBe("SCHOOL_PARENT");
    expect(schoolStageForBand("TEACHER", 9)).toBe("SCHOOL_TEACHER");
    for (const [stage, band] of [
      ["CLASS_8", "STUDENT_13_17"],
      ["CLASS_9_10", "STUDENT_13_17"],
      ["CLASS_11_12", "STUDENT_13_17"],
      ["SCHOOL_ADULT", "STUDENT_18"],
      ["SCHOOL_PARENT", "PARENT"],
      ["SCHOOL_TEACHER", "TEACHER"],
      ["UG", null],
      ["WORKING", null],
      ["OTHER", null],
      [null, null],
    ] as const) {
      expect(schoolBandOfStage(stage), String(stage)).toBe(band);
    }
    expect(isMinorBand("STUDENT_13_17")).toBe(true);
    for (const b of ["STUDENT_18", "PARENT", "TEACHER", null] as const) expect(isMinorBand(b)).toBe(false);
  });

  it("the marker is a student-mode container code in onbPrepCodes: a wizard-only account has no band", () => {
    expect(schoolBandOfProfile(null)).toBeNull();
    expect(schoolBandOfProfile({ onbStage: "CLASS_9_10", onbPrepCodes: ["NTSE", "JEE_MAIN"] })).toBeNull();
    expect(schoolBandOfProfile({ onbStage: "CLASS_9_10", onbPrepCodes: [] })).toBeNull();
    expect(schoolBandOfProfile({ onbStage: null, onbPrepCodes: ["NCERT_C09"] })).toBeNull();
    // A Class 1-7 code is never written by the school flow and never counts.
    expect(schoolBandOfProfile({ onbStage: "CLASS_8", onbPrepCodes: ["NCERT_C05"] })).toBeNull();
    expect(schoolBandOfProfile({ onbStage: "CLASS_9_10", onbPrepCodes: ["JEE_MAIN", "NCERT_C09"] })).toEqual({ band: "STUDENT_13_17", classCodes: ["NCERT_C09"] });
    expect(schoolBandOfProfile({ onbStage: "SCHOOL_PARENT", onbPrepCodes: ["NCERT_C09", "CISCE_C10"] })).toEqual({ band: "PARENT", classCodes: ["NCERT_C09", "CISCE_C10"] });
    // The wizard later overwrote the stage: asked again, never assumed.
    expect(schoolBandOfProfile({ onbStage: "UG", onbPrepCodes: ["NCERT_C09"] })).toBeNull();
    expect(studentModeCodesOf(["SSC_CGL", "NCERT_C05", "NCERT_C08", "CISCE_C12"])).toEqual(["NCERT_C08", "CISCE_C12"]);
    expect(studentModeCodesOf(null)).toEqual([]);
  });

  it("the profile route accepts the band, keeps school codes through the wizard, and reads them back", () => {
    const src = read("src/app/api/me/onboarding-profile/route.ts");
    expect(src).toMatch(/export async function GET\(/);
    expect(src).toMatch(/searchParams\.get\("school"\) !== "1"/);
    expect(src).toMatch(/if \(body\.school !== undefined\) \{/);
    expect(src).toMatch(/isSchoolBand\(s\.band\)/);
    expect(src).toMatch(/declareSchoolBand\(session\.user\.id, band, examCode\)/);
    // The wizard's write keeps the school marker codes read from the ROW.
    expect(src).toMatch(/studentModeCodesOf\(rows\[0\]\?\.onbPrepCodes\)/);
    expect(src).toMatch(/"onbPrepCodes" = \$\{storedCodes\}::text\[\]/);
    // The analytics event carries the band and the class only.
    expect(src).toMatch(/props: \{ kind: "school_band_declared", band, examCode \}/);
    expect(src).not.toMatch(/props: \{ kind: "school_band_declared"[^}]*(?:name|email)/);
  });
});

// ── 5: chapter practice honesty ───────────────────────────────────────

describe("schoolChapterMockCount: the honest size, or no button", () => {
  it("under the minimum → null; the count itself up to 10; never more", () => {
    for (const n of [0, 1, 4]) expect(schoolChapterMockCount(n)).toBeNull();
    expect(schoolChapterMockCount(5)).toBe(5);
    expect(schoolChapterMockCount(7)).toBe(7);
    expect(schoolChapterMockCount(10)).toBe(10);
    expect(schoolChapterMockCount(25)).toBe(10);
    expect(schoolChapterMockCount(Number.NaN)).toBeNull();
  });
});

// ── 6: what the entry renders, and where ──────────────────────────────

describe("the student entry per class band and auth state", () => {
  it("Class 1-7: nothing, whatever the state", () => {
    for (const cls of [1, 6, 7]) {
      expect(studentEntryView({ cls, signedIn: false, band: null, validatedQuestions: 40 })).toEqual({ kind: "none" });
      expect(studentEntryView({ cls, signedIn: true, band: "STUDENT_13_17", validatedQuestions: 40 })).toEqual({ kind: "none" });
    }
  });

  it("Class 8-12: signed out → the sign-in CTA; signed in without a band → the card; with a band → the buttons", () => {
    for (const cls of [8, 9, 12]) {
      expect(studentEntryView({ cls, signedIn: null, band: null, validatedQuestions: 40 })).toEqual({ kind: "signed-out" });
      expect(studentEntryView({ cls, signedIn: false, band: null, validatedQuestions: 40 })).toEqual({ kind: "signed-out" });
      expect(studentEntryView({ cls, signedIn: true, band: null, validatedQuestions: 40 })).toEqual({ kind: "band-card" });
      expect(studentEntryView({ cls, signedIn: true, band: "STUDENT_13_17", validatedQuestions: 40 })).toEqual({ kind: "ready", practiceCount: 10, band: "STUDENT_13_17" });
      expect(studentEntryView({ cls, signedIn: true, band: "PARENT", validatedQuestions: 7 })).toEqual({ kind: "ready", practiceCount: 7, band: "PARENT" });
      // Fewer than 5 checked questions: the tutor entry only, no practice button.
      expect(studentEntryView({ cls, signedIn: true, band: "TEACHER", validatedQuestions: 3 })).toEqual({ kind: "ready", practiceCount: null, band: "TEACHER" });
    }
  });

  it("the links: Google sign-in back to the page with from=school; the tutor with the container, the chapter and a hint-first seed", () => {
    expect(schoolReturnPath("/schooling/cbse/class-9/mathematics/polynomials")).toBe("/schooling/cbse/class-9/mathematics/polynomials?from=school");
    expect(schoolReturnPath("//evil.example")).toBe("/schooling?from=school");
    expect(schoolReturnPath("https://evil.example/x")).toBe("/schooling?from=school");
    expect(schoolSignInHref("/schooling/cbse/class-9")).toBe(`/login?callbackUrl=${encodeURIComponent("/schooling/cbse/class-9?from=school")}`);
    expect(isSchoolReturn("?from=school")).toBe(true);
    expect(isSchoolReturn("?from=signin")).toBe(false);
    expect(isSchoolReturn(null)).toBe(false);
    const href = schoolTutorHref({ examCode: "NCERT_C09", topicCode: "iemh1.ch02", chapterName: "Polynomials", cls: 9, subjectName: "Mathematics" });
    const u = new URL(href, "https://shishya.in");
    expect(u.pathname).toBe("/chat");
    expect(u.searchParams.get("examCode")).toBe("NCERT_C09");
    expect(u.searchParams.get("topicCode")).toBe("iemh1.ch02");
    expect(u.searchParams.get("seed")).toMatch(/^Help me understand "Polynomials" \(Class 9 Mathematics\) step by step\./);
    expect(u.searchParams.get("seed")).not.toMatch(/exam|marks|rank/i);
  });

  // 26 Sep 2026 (fixer): the welcome mail is exam-prep marketing and fired
  // for every new account, a 13-17 school sign-in included; createUser now
  // asks this about NextAuth's callback-url cookie (tests/unit/auth-welcome-school.test.ts).
  it("isSchoolSignInCallback: a return to a school page or the school tutor, absolute or relative; nothing else, nothing unparseable", () => {
    // What the cookie really holds: the absolute URL the redirect callback produced.
    expect(isSchoolSignInCallback("https://shishya.in/schooling/cbse/class-9/mathematics/polynomials?from=school")).toBe(true);
    expect(isSchoolSignInCallback("https://shishya.in/schooling/cbse/class-9")).toBe(true);
    expect(isSchoolSignInCallback("http://localhost:3000/schooling")).toBe(true);
    expect(isSchoolSignInCallback("/schooling/cisce/class-12/physics/x?from=school")).toBe(true);
    // The other builder's school chat gate returns to /chat?examCode=<container>.
    expect(isSchoolSignInCallback("https://shishya.in/chat?examCode=NCERT_C09&topicCode=iemh1.ch02&from=school")).toBe(true);
    expect(isSchoolSignInCallback("/chat?examCode=CISCE_C11")).toBe(true);
    expect(isSchoolSignInCallback("/chat?examCode=NCERT_C06")).toBe(true); // still the school surface
    // Exam sign-ins keep their welcome.
    expect(isSchoolSignInCallback("https://shishya.in/dashboard")).toBe(false);
    expect(isSchoolSignInCallback("https://shishya.in/exams/SSC_CGL")).toBe(false);
    expect(isSchoolSignInCallback("/chat?examCode=SSC_CGL")).toBe(false);
    expect(isSchoolSignInCallback("/chat")).toBe(false);
    expect(isSchoolSignInCallback("/chat?general=1")).toBe(false);
    expect(isSchoolSignInCallback("/schoolingx")).toBe(false);
    expect(isSchoolSignInCallback("/mocks/abc?from=school")).toBe(false);
    expect(isSchoolSignInCallback("https://shishya.in/login?callbackUrl=%2Fschooling")).toBe(false);
    expect(isSchoolSignInCallback("")).toBe(false);
    expect(isSchoolSignInCallback(null)).toBe(false);
    expect(isSchoolSignInCallback(undefined)).toBe(false);
    expect(isSchoolSignInCallback("http://[bad")).toBe(false);
  });

  it("the copy: the age line at every sign-in entry, the AI line at the tutor entry, the honest practice label", () => {
    expect(AGE_LINE).toBe("For students 13 and above.");
    expect(STUDENT_ENTRY_COPY.signedOutBody).toContain(AGE_LINE);
    expect(STUDENT_ENTRY_COPY.classBody).toContain(AGE_LINE);
    expect(STUDENT_ENTRY_COPY.bandBody).toContain("13 and above");
    expect(STUDENT_ENTRY_COPY.signInButton).toMatch(/^Sign in to practise and ask the tutor/);
    expect(STUDENT_ENTRY_COPY.under13).toMatch(/^Younger than 13\?/);
    expect(STUDENT_ENTRY_COPY.aiLine).toBe(AI_TUTOR_LINE);
    expect(AI_TUTOR_LINE).toMatch(/^You will be talking to an AI tutor, not a person\./);
    // 26 Sep 2026 (integrator): the number the entry promises IS the cap the route enforces.
    expect(AI_TUTOR_LINE).toContain(`up to ${SCHOOL_TUTOR_DAILY_CAP} messages a day`);
    expect(STUDENT_ENTRY_COPY.tutorButton).toBe("Ask the AI tutor about this chapter →");
    expect(STUDENT_ENTRY_COPY.practiceButton(7)).toBe("Practise this chapter — 7 questions →");
    expect(STUDENT_ENTRY_COPY.practiceButton(1)).toBe("Practise this chapter — 1 question →");
    expect(STUDENT_ENTRY_COPY.practiceHonesty).toContain(PRACTICE_LABEL);
    expect(PRACTICE_LABEL).toMatch(/^Shishya's own questions, answer-checked/);
    // 26 Sep 2026 (integrator): honest after a Google sign-in (the account's
    // name and picture come from Google) — the promise is about the tutor.
    expect(STUDENT_ENTRY_COPY.bandNote).toMatch(/^The tutor never asks for your school, address, phone number or photos\./);
    expect(STUDENT_ENTRY_COPY.bandNote).not.toMatch(/never asks for a name/);
    expect(STUDENT_ENTRY_COPY.bandOption("STUDENT_13_17", 9)).toBe("I am a student aged 13 to 17, in Class 9");
    const all = JSON.stringify(STUDENT_ENTRY_COPY) + Object.values(STUDENT_ENTRY_COPY).filter((v) => typeof v === "function").map((f) => (f as (n: number) => string)(9)).join(" ");
    expect(all).not.toMatch(/NCERT exercise|board question|leaderboard|streak|challenge|share|teacher request|coach/i);
    for (const locale of ["en", "hi", "te"]) {
      const c = schoolResultsCopy(locale);
      expect(c.aiLine, locale).toMatch(/AI/);
      expect(c.honesty, locale).toMatch(/Shishya|NCERT/);
      expect(c.mistakesButton.length, locale).toBeGreaterThan(3);
    }
    expect(schoolResultsCopy("xx")).toBe(schoolResultsCopy("en"));
    expect(schoolMistakesHeading("en", 1)).toBe("Go through your 1 wrong answer with the AI tutor");
    expect(schoolMistakesHeading("en", 3)).toBe("Go through your 3 wrong answers with the AI tutor");
    expect(schoolMistakesHeading("hi", 3)).toContain("3");
    const seed = schoolMistakesSeed({ chapterName: "Motion", cls: 9, wrong: 2, weakest: ["Speed"] });
    expect(seed).toMatch(/^I practised "Motion" \(Class 9\) and got 2 questions wrong — mostly on Speed\. Go through my mistakes one at a time: give me a hint first/);
  });

  it("the chapter and class pages render the island only under isStudentModeClass(cls), and read no session", () => {
    const chapter = stripComments(read("src/app/schooling/[slug]/[classSlug]/[subject]/[chapter]/page.tsx"));
    expect(chapter).toMatch(/\{isStudentModeClass\(cls\) && \(\s*<SchoolStudentEntry\s+variant="chapter"/);
    expect(chapter).toMatch(/validatedQuestions=\{chapter\.validatedQuestions\}/);
    expect(chapter).toMatch(/pagePath=\{chapterPath\}/);
    expect(chapter).not.toMatch(/from "@\/lib\/auth"|searchParams/);
    const cls = stripComments(read("src/app/schooling/[slug]/[classSlug]/page.tsx"));
    expect(cls).toMatch(/\{isStudentModeClass\(cls\) && <SchoolStudentEntry variant="class"/);
    expect(cls).not.toMatch(/from "@\/lib\/auth"|searchParams/);
    // Exactly one SchoolStudentEntry per page, so a Class 6 page has none.
    expect(chapter.match(/<SchoolStudentEntry/g)?.length).toBe(1);
    expect(cls.match(/<SchoolStudentEntry/g)?.length).toBe(1);
  });

  it("the island holds no literal route, no storage and no session import; every word comes from student-copy", () => {
    const src = stripComments(read("src/components/school/SchoolStudentEntry.tsx"));
    expect(src).toMatch(/^"use client";/);
    expect(src).not.toMatch(/["'`]\/chat\b|["'`]\/login\b|["'`]\/onboarding\b|["'`]\/dashboard\b/);
    expect(src).not.toMatch(/localStorage|sessionStorage|document\.cookie|from "@\/lib\/auth"/);
    expect(src).not.toMatch(/\bsign[\s-]?(in|up)\b/i);
    expect(src).toMatch(/studentEntryView\(\{ cls: p\.cls, signedIn, band, validatedQuestions: p\.validatedQuestions \?\? 0 \}\)/);
    expect(src).toMatch(/if \(view\.kind === "none"\) return null;/);
    expect(src).toMatch(/school: true, topicCode: p\.topicCode, count: view\.practiceCount, difficulty: "MIXED"/);
    expect(src).toMatch(/data\.error === "school-band-required"/);
    expect(src).toMatch(/import \{ STUDENT_ENTRY_COPY as C \} from "@\/lib\/school\/student-copy"/);
    // No leaderboard / share / challenge / streak piece.
    expect(src).not.toMatch(/ChallengeCard|ShareScoreButton|InviteFriends|Streak|StudyGroup|TalkToTeacher/);
  });

  it("the results page turns every exam piece off for a school attempt and links the chapter and the school tutor", () => {
    const src = stripComments(read("src/app/attempts/[id]/results/page.tsx"));
    expect(src).toMatch(/const school = isStudentModeContainer\(\{ code: attempt\.mock\.exam\.code, category: attempt\.mock\.exam\.category \}\);/);
    expect(src).toMatch(/exam: \{ select: \{ code: true, shortName: true, active: true, category: true \} \}/);
    expect(src).toMatch(/const challengeEligible =\s*!school &&/);
    expect(src).toMatch(/const peerProof = school \? null :/);
    expect(src).toMatch(/const hasCoachPlan =\s*school \|\|/);
    expect(src).toMatch(/= school\s*\? \[null, null, false, null\]\s*: await Promise\.all\(\[\s*getStudyStreak/);
    expect(src).toMatch(/const softLanding = !school &&/);
    expect(src).toMatch(/setupDone: school \? true :/);
    expect(src).toMatch(/!school && \(isPersonalBest \|\| isFirstMock\)/);
    expect(src).toMatch(/\{!isSpiral && !school && \(/);
    expect(src).toMatch(/\{isSpiral && !school && topicArr\.length > 0 && \(/);
    expect(src).toMatch(/\{isPersonalBest && !school && \(/);
    expect(src).toMatch(/\{isFirstMock && !school && \(/);
    expect(src).toMatch(/\{!school && \(\s*<PeerProofLine/);
    expect(src).toMatch(/\{school \? null : !hasCoachPlan \? \(\s*<CoachEntry/);
    expect(src).toMatch(/\{wrongCount > 0 && !school && \(\s*<div className="mt-4">\s*<TalkToTeacher/);
    expect(src).toMatch(/\{attempt\.finishedAt && !school && \(\s*<>\s*<ShareScoreButton/);
    expect(src).toMatch(/\{attempt\.finishedAt && !school && topicArr\.length > 0 && \(\s*<FreshQuestionsButton/);
    expect(src).toMatch(/\{rankBands\.length > 0 && !school && \(/);
    expect(src).toMatch(/\{!school && \(\s*<PulseAsk/);
    expect(src).toMatch(/\{school \? \(\s*<>\s*<Link href=\{schoolChapterHref\}/);
    // The school tutor card: the AI line and the chapter-scoped href.
    expect(src).toMatch(/\{wrongCount > 0 && school && \(/);
    expect(src).toMatch(/href=\{schoolTutor\(mistakeSeed\)\}/);
    expect(src).toMatch(/\{schoolCopy\.aiLine\}/);
    expect(src).toMatch(/\{school && <p className="mt-2 text-xs text-ink-600">\{schoolCopy\.honesty\}<\/p>\}/);
    // Every remaining /exams/ link sits in a non-school branch.
    for (const m of src.matchAll(/href=\{`\/exams\/\$\{attempt\.mock\.exam\.code\}/g)) {
      const before = src.slice(Math.max(0, m.index! - 3000), m.index);
      expect(before, `an /exams link at ${m.index} outside a !school branch`).toMatch(/!school|softLanding && \(|school \? \(/);
    }
  });

  it("the mock player and the attempt start pass the school flag for a school-chapter set only", () => {
    for (const f of ["src/app/mocks/[id]/page.tsx", "src/app/api/attempts/route.ts"]) {
      const src = read(f);
      expect(src, f).toMatch(/\{ school: mock\.generatedBy === "school-chapter" \}/);
      expect(src, f).toMatch(/code: mock\.exam\.code/);
    }
    // The builders: the custom route and /api/mocks hand a school request to student-db, nothing else.
    const custom = read("src/app/api/mocks/custom/route.ts");
    expect(custom).toMatch(/if \(parsed\.data\.school\) \{\s*const r = await buildSchoolChapterMock\(/);
    expect(custom).toMatch(/where: realExamKey\(\{ code: examCode \}\)/);
    const mocks = read("src/app/api/mocks/route.ts");
    expect(mocks).toMatch(/if \(body\.school\) \{\s*if \(body\.request\.type !== "TOPIC"\)/);
    expect(mocks).toMatch(/buildSchoolChapterMock\(\{\s*userId: session\.user\.id,\s*examCode: body\.examCode,\s*topicCode: body\.request\.topicCode,\s*count: body\.request\.questionCount,\s*\}\)/);
  });

  // 26 Sep 2026 (integrator): the class page asks the band too (the chat's
  // band card and the route's band-required event send a class-level chat
  // there), and a school set's player exits never point at /exams/<container>.
  it("the class page's island asks the band, and a school set's player exits go back to the chapter, never /exams/<container>", () => {
    expect(read("src/components/school/SchoolStudentEntry.tsx")).toContain('if (p.variant === "class" && view.kind !== "band-card") {');
    const player = read("src/app/mocks/[id]/page.tsx");
    expect(player).toContain('const schoolCfg = mock.generatedBy === "school-chapter" ? schoolMockConfigOf(mock.config) : null;');
    expect(player).toContain('const schoolBack = schoolCfg ? { href: schoolCfg.chapterPath ?? "/schooling", label: schoolResultsCopy(locale).backToChapter } : null;');
    expect(player).toContain("back={schoolBack}");
    expect(player).toContain("backHref={schoolBack?.href ?? null}");
    for (const f of ["src/app/mocks/[id]/ExpiredAttemptGate.tsx", "src/app/mocks/[id]/MockRebuildingAttempt.tsx"]) {
      expect(read(f), f).toMatch(/router\.push\(backHref \?\? `\/exams\/\$\{/);
    }
    const rebuilding = read("src/app/mocks/[id]/MockRebuilding.tsx");
    expect(rebuilding).toContain("href={back?.href ?? `/exams/${encodeURIComponent(examCode)}`}");
    expect(rebuilding).toContain("{back?.label ?? fillTemplate(copy.rebuildBack, { exam: examShort })}");
    expect(rebuilding).toContain("backHref={back?.href ?? null}");
  });
});
