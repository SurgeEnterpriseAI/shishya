// The profile a new account starts with (30 Sep 2026, sign-up build 2 —
// src/lib/signup-profile.ts, called by createUser in src/lib/auth.ts), and
// the two page changes that make its promises true.
//
// Pinned against the real module with prisma, the enrolment door and the
// cookie jar stubbed:
//   • the exam of the page the account was made from becomes an ACTIVE
//     enrolment through ensureEnrollment — hub, PYQ, tutor, a mock's exam,
//     and (generic callback only) the browser's last page; real, active
//     exams only (realExamKey); an exam the account already holds is left
//     as it is; nothing on a school sign-in;
//   • the page language fills preferredLang only while it is EN;
//   • live guest challenges (creatorAnonId) and email alerts are linked —
//     challenges never on a school sign-in;
//   • the strip's cookie on exam-side sign-ups only;
//   • every step fails alone and never throws.
// Plus (source): the hub keys "Continue practising" on real history and
// reads only an ACTIVE enrolment; the enrol promise under the hub's
// diagnostic button says what an exam goal sends, in en / hi / te.
// No DB, no network. Run: npx vitest run tests/unit/signup-profile.test.ts

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ExamRow = { id: string; code: string; shortName: string; category: string; active: boolean };

const state = vi.hoisted(() => ({
  cookies: {} as Record<string, string>,
  set: [] as { name: string; value: string; opts: Record<string, unknown> }[],
  exams: {} as Record<string, ExamRow>,
  mocks: {} as Record<string, { exam: ExamRow }>,
  pageViews: [] as { path: string | null }[],
  existing: null as { active: boolean } | null,
  enrolments: [] as { userId: string; exam: { id: string; code?: string }; patch: unknown; opts: unknown }[],
  raw: [] as string[],
  rawValues: [] as unknown[][],
  examLookups: [] as unknown[],
  failRaw: false,
  failExam: false,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name in state.cookies ? { name, value: state.cookies[name] } : undefined),
    set: (name: string, value: string, opts: Record<string, unknown>) => {
      state.set.push({ name, value, opts });
    },
  }),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: {
      findUnique: async (args: { where: { code: string; category?: unknown } }) => {
        if (state.failExam) throw new Error("db down");
        state.examLookups.push(args.where);
        return state.exams[args.where.code] ?? null;
      },
    },
    mock: {
      findUnique: async (args: { where: { id: string } }) => state.mocks[args.where.id] ?? null,
    },
    analyticsEvent: {
      findMany: async () => state.pageViews,
    },
    enrollment: {
      findUnique: async () => state.existing,
    },
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join("?");
      state.raw.push(sql.replace(/\s+/g, " ").trim());
      state.rawValues.push(values);
      if (state.failRaw) throw new Error("db down");
      return /"Challenge"/.test(sql) ? 2 : /"ExamAlert"/.test(sql) ? 1 : 1;
    },
  },
}));

vi.mock("@/lib/db/enrollment", () => ({
  ensureEnrollment: async (userId: string, exam: { id: string; code?: string }, patch: unknown, opts: unknown) => {
    state.enrolments.push({ userId, exam, patch, opts });
    return {};
  },
}));

import { applySignupProfile } from "@/lib/signup-profile";
import { dict } from "@/lib/i18n";

const SSC: ExamRow = { id: "e-ssc", code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS", active: true };
const OLD: ExamRow = { id: "e-old", code: "OLD_EXAM", shortName: "Old", category: "GOVT_JOBS", active: false };
const BASE = { userId: "u-1", email: "Student@Example.com", anonId: "11111111-2222-3333-4444-555555555555", school: false };

beforeEach(() => {
  state.cookies = {};
  state.set = [];
  state.exams = { SSC_CGL: SSC, OLD_EXAM: OLD };
  state.mocks = {};
  state.pageViews = [];
  state.existing = null;
  state.enrolments = [];
  state.raw = [];
  state.rawValues = [];
  state.examLookups = [];
  state.failRaw = false;
  state.failExam = false;
});

describe("the exam goal (never asked — the page the account was made from)", () => {
  it("an exam hub return → an active enrolment on that exam, looked up as a REAL exam", async () => {
    const r = await applySignupProfile({ ...BASE, callback: "https://shishya.in/exams/SSC_CGL?start=practice" });
    expect(r.goal).toEqual({ code: "SSC_CGL", shortName: "SSC CGL" });
    expect(state.enrolments).toEqual([{ userId: "u-1", exam: expect.objectContaining({ id: "e-ssc" }), patch: { active: true }, opts: undefined }]);
    // realExamKey: the category filter rides beside the code, so a school row never matches.
    expect(state.examLookups[0]).toEqual({ code: "SSC_CGL", category: { not: "SCHOOL_BOARD" } });
  });

  it("PYQ, quiz, build-mock, the /hi twin and the exam tutor all name the same goal", async () => {
    for (const cb of ["/exams/SSC_CGL/pyq/2024", "/exams/SSC_CGL/quiz", "/exams/SSC_CGL/build-mock", "/hi/exams/SSC_CGL", "/chat?examCode=SSC_CGL"]) {
      state.enrolments = [];
      const r = await applySignupProfile({ ...BASE, callback: cb });
      expect(r.goal?.code, cb).toBe("SSC_CGL");
      expect(state.enrolments, cb).toHaveLength(1);
    }
  });

  it("a mock return → the mock's exam; a school mock's container → nothing", async () => {
    state.mocks.cm1abcdefghijklmnopqrstu = { exam: SSC };
    state.mocks.cm1schoolmockxxxxxxxxxxx = { exam: { id: "e-c09", code: "NCERT_C09", shortName: "Class 9", category: "SCHOOL_BOARD", active: true } };
    expect((await applySignupProfile({ ...BASE, callback: "/mocks/cm1abcdefghijklmnopqrstu" })).goal?.code).toBe("SSC_CGL");
    state.enrolments = [];
    expect((await applySignupProfile({ ...BASE, callback: "/mocks/cm1schoolmockxxxxxxxxxxx" })).goal).toBeNull();
    expect(state.enrolments).toEqual([]);
  });

  it("a generic callback → the browser's last page before /login decides", async () => {
    state.pageViews = [{ path: "/login" }, { path: "/exams/SSC_CGL/cutoff" }, { path: "/" }];
    expect((await applySignupProfile({ ...BASE, callback: "https://shishya.in/dashboard" })).goal?.code).toBe("SSC_CGL");
    state.enrolments = [];
    // A specific non-exam callback: no goal from the trail.
    expect((await applySignupProfile({ ...BASE, callback: "/colleges/iit-bombay" })).goal).toBeNull();
    // No anonId: no trail read.
    expect((await applySignupProfile({ ...BASE, anonId: null, callback: null })).goal).toBeNull();
    expect(state.enrolments).toEqual([]);
  });

  it("an unknown, retired or school code enrols nothing", async () => {
    for (const cb of ["/exams/NOPE_EXAM", "/exams/OLD_EXAM", "/exams/NCERT_C09", "/chat?examCode=NCERT_C05"]) {
      const r = await applySignupProfile({ ...BASE, callback: cb });
      expect(r.goal, cb).toBeNull();
    }
    expect(state.enrolments).toEqual([]);
  });

  it("an exam the account already holds is left exactly as it is (an off one stays off)", async () => {
    state.existing = { active: true };
    expect((await applySignupProfile({ ...BASE, callback: "/exams/SSC_CGL" })).goal?.code).toBe("SSC_CGL");
    state.existing = { active: false };
    expect((await applySignupProfile({ ...BASE, callback: "/exams/SSC_CGL" })).goal).toBeNull();
    expect(state.enrolments).toEqual([]);
  });

  it("a school sign-in: no exam goal, no challenge link, no strip cookie", async () => {
    const r = await applySignupProfile({ ...BASE, school: true, callback: "/schooling/cbse/class-9" });
    expect(r.goal).toBeNull();
    expect(state.enrolments).toEqual([]);
    expect(state.raw.some((q) => q.includes('"Challenge"'))).toBe(false);
    expect(state.set).toEqual([]);
    expect(r.welcomeCookie).toBe(false);
  });
});

describe("language, guest records and the strip's cookie", () => {
  it("a /hi page or a hi cookie fills preferredLang — only while it is still EN", async () => {
    state.cookies["shishya-lang"] = "hi";
    const r = await applySignupProfile({ ...BASE, callback: "/exams/SSC_CGL" });
    expect(r.lang).toBe("HI");
    const upd = state.raw.find((q) => q.includes('UPDATE "User"'));
    expect(upd).toContain(`"preferredLang" = ?::"Language"`);
    expect(upd).toContain(`"preferredLang" = 'EN'`);
  });

  it("English or no cookie writes nothing", async () => {
    state.cookies["shishya-lang"] = "en";
    const r = await applySignupProfile({ ...BASE, callback: "/exams/SSC_CGL" });
    expect(r.lang).toBeNull();
    expect(state.raw.some((q) => q.includes('UPDATE "User"'))).toBe(false);
  });

  it("links this browser's live guest challenges and this email's alerts", async () => {
    const r = await applySignupProfile({ ...BASE, callback: "/exams/SSC_CGL" });
    expect(r.challengesLinked).toBe(2);
    expect(r.alertsLinked).toBe(1);
    const ch = state.raw.find((q) => q.includes('"Challenge"'))!;
    expect(ch).toContain(`"creatorAnonId" = ?`);
    expect(ch).toContain(`"creatorUserId" IS NULL`);
    expect(ch).toContain(`"expiresAt" > NOW()`);
    const al = state.raw.find((q) => q.includes('"ExamAlert"'))!;
    // Plain equality on the normalised address (the (email, examId) index), not lower() = lower().
    expect(al).toContain(`"email" = ?`);
    expect(al).not.toContain("lower(");
    // … bound to the address as /api/exam-alerts stores it (trim + lowercase).
    expect(state.rawValues[state.raw.indexOf(al)]).toEqual(["u-1", "student@example.com"]);
    expect(al).toContain(`"userId" IS NULL`);
  });

  it("the strip's cookie: non-httpOnly, PII-free, 2 hours, exam-side sign-ups", async () => {
    await applySignupProfile({ ...BASE, callback: "/exams/SSC_CGL" });
    expect(state.set).toEqual([
      { name: "shishya_welcome", value: "1", opts: expect.objectContaining({ path: "/", maxAge: 7200, httpOnly: false, sameSite: "lax" }) },
    ]);
  });

  it("every step fails alone and nothing throws", async () => {
    state.failRaw = true;
    state.failExam = true;
    const r = await applySignupProfile({ ...BASE, callback: "/exams/SSC_CGL" });
    expect(r).toMatchObject({ goal: null, lang: null, challengesLinked: 0, alertsLinked: 0, welcomeCookie: true });
  });
});

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

describe("the hub keys its enrolled heading on history (source)", () => {
  const src = read("src/app/exams/[code]/page.tsx");

  it("\"Continue practising\" needs an enrolment AND a finished mock here", () => {
    expect(src).toContain('{isEnrolled && recent.length > 0 ? t("exam.action.continue") : t("exam.action.start")}');
    expect(src).toContain('{isEnrolled && recent.length > 0 ? t("exam.action.continue.body") : t("exam.action.start.body")}');
    expect(src).not.toContain('{isEnrolled ? t("exam.action.continue")');
  });

  it("only an ACTIVE enrolment counts (as the dashboard, Daily 5 and the exam mails count it)", () => {
    expect(src).toContain("const isEnrolled = !!enrollment?.active;");
  });
});

describe("the enrol promise says what an exam goal sends (en / hi / te)", () => {
  const note = (l: "en" | "hi" | "te") => (dict[l] as Record<string, string>)["ew.enrol.resultNote"];

  it("English names the Daily 5 mail and the others, and drops 'nothing else'", () => {
    const en = note("en");
    // Kept short under the hub's main button (review 30 Sep 2026: "not intrusive").
    expect(en.length).toBeLessThanOrEqual(200);
    expect(en).not.toMatch(/nothing else/i);
    expect(en).toContain("Daily 5");
    for (const w of ["streak", "live tests", "exam date", "result day", "week away", "unsubscribe"]) expect(en).toContain(w);
  });

  it("Hindi and Telugu say the same, in their own script, without the old 'nothing else'", () => {
    expect(note("hi")).toMatch(/[ऀ-ॿ]/);
    expect(note("te")).toMatch(/[ఀ-౿]/);
    expect(note("hi")).toContain("Daily 5");
    expect(note("te")).toContain("Daily 5");
    expect(note("hi")).not.toContain("और कुछ नहीं");
    expect(note("te")).not.toContain("ఇంకేమీ కాదు");
  });
});
