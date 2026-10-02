// School-age safeguards (2 Oct 2026, personalisation wave W1b; founder
// decisions PD-5 and PD-16 option A). The rule: src/lib/school-age.ts; its
// SQL twin: src/lib/db/enrollment.ts schoolAgeAccountSql.
//
// What it pins:
//  1. the rule — an account is school age when it holds an olympiad
//     enrolment, a class-container enrolment, the stored 13-17 band or a
//     school wizard stage; an adult aspirant, an undeclared account and a
//     declared adult / parent / teacher band with no class enrolment are not;
//     the categories are the catalogue's own (Exam.category), never exam codes;
//  2. the SQL twin — its exact text, built from the rule's own constants, safe
//     for an account whose onbStage is NULL, alias validated; the batch helper
//     and its fail-closed answer;
//  3. the three come-back mails — win-back, lapse nudge, evening nudge: each
//     selection carries `NOT schoolAgeAccountSql("u")`, and against a stub
//     database that HONOURS that fragment (it applies the pure rule wherever a
//     query carries it), an olympiad-only account, olympiad + real exam, class
//     + real exam, a wizard CLASS_9_10 account and a stored-band account get
//     none of them, while the two adult accounts (one with onbStage NULL) do.
//     The stub cannot run Postgres: that the fragment's SQL means what the
//     pure rule means is section 2's text test (and was read against the
//     database once, by a SELECT-only probe, on the day this shipped);
//  4. the two mails that stay — Daily 5 and coach-morning still go to every
//     one of those accounts; the quoted tutor-chat line is absent for the
//     school-age ones and present for the others; their chats are not read
//     for the mail; a failed school-age read quotes nobody and stops no mail.
// No DB, no network, nothing sent (the mail senders are stubs).
// Run: npx vitest run tests/unit/mail-school-age.test.ts

import fs from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  raws: [] as Array<{ sql: string; strings: string[]; values: unknown[] }>,
  schoolAgeReadFails: false,
  userFinds: [] as any[],
  questionIds: [] as string[][],
  sent: { winback: [] as any[], lapse: [] as any[], evening: [] as any[], dailyFive: [] as any[], coach: [] as any[] },
  /** Filled after the real modules load (the stub needs the rule and the fragment). */
  queryRaw: null as null | ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>),
  findUsers: null as null | ((args: any) => unknown[]),
  events: [] as Array<{ userId: string; createdAt: Date }>,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => db.queryRaw!(strings, ...values),
    $executeRaw: async () => 1,
    analyticsEvent: { findMany: async () => db.events },
    user: {
      findMany: async (args: any) => {
        db.userFinds.push(args);
        return db.findUsers!(args);
      },
    },
  },
}));
vi.mock("@/lib/email", () => ({
  sendWinbackEmail: async (p: any) => (db.sent.winback.push(p), true),
  sendLapseNudgeEmail: async (p: any) => (db.sent.lapse.push(p), true),
  sendEveningRescueEmail: async (p: any) => (db.sent.evening.push(p), true),
  sendDailyFiveEmail: async (p: any) => (db.sent.dailyFive.push(p), true),
  sendCoachDayEmail: async (p: any) => (db.sent.coach.push(p), true),
}));
vi.mock("@/lib/email-optout", () => ({ optedOutUserIds: async () => [] }));
vi.mock("@/lib/study-day", () => ({
  loadStudyDays: async (ids: string[]) => new Map(ids.map((id) => [id, new Set([1, 2])])),
}));
// A live streak that dies tonight, for whoever is asked about.
vi.mock("@/lib/db/streak", () => ({ computeStreak: () => ({ current: 3, activeToday: false }), istDay: () => 0 }));
vi.mock("@/lib/exam-week", () => ({ istDay: () => 0 }));
vi.mock("@/lib/live-test-today", () => ({ liveTestEmailNotice: async () => null }));
vi.mock("@/lib/exam-week-student", () => ({ shiftDayIso: () => null }));
vi.mock("@/lib/db/exam-practice", () => ({ practiceExamCodes: async () => null }));
// The exam the mail names: the student's own newest enrolment, nothing finished.
vi.mock("@/lib/exam-week-mail", () => ({
  loadExamBundles: async () => new Map(),
  nextExamsInTrack: async () => [],
  pickNextInTrack: () => null,
  examDoneState: () => null,
  examWeekMailLine: async () => null,
  whenWithTier: () => "",
  trackKey: () => "track",
  resolveMailExam: async (mine: Array<{ examId: string; code: string; short: string }>) =>
    mine[0] ? { mode: "same", examId: mine[0].examId, code: mine[0].code, short: mine[0].short } : null,
}));
// The mail-line loader: every student asked about has a typed question from
// yesterday — so a missing line can only be the school-age rule.
vi.mock("@/lib/db/pickup", () => ({
  loadEmailQuestions: async (ids: string[], now: Date) => {
    db.questionIds.push([...ids]);
    return new Map(
      ids.map((id) => [
        id,
        { sessionId: `sess_${id}`, examCode: null, content: `Question typed by ${id}`, createdAt: new Date(now.getTime() - 20 * 3600_000), answered: true, isLastUser: true },
      ]),
    );
  },
}));

import { ExamCategory, type Prisma } from "@prisma/client";
import { SCHOOL_CATEGORY } from "@/lib/db/exam-scope";
import { schoolAgeAccountSql, schoolAgeTestFor, schoolAgeUserIds, schoolOnlyAccountSql } from "@/lib/db/enrollment";
import {
  OLYMPIAD_CATEGORY,
  SCHOOL_AGE_WIZARD_STAGES,
  SCHOOL_CLASS_CATEGORY,
  isSchoolAge,
  schoolAgeTriggers,
  type SchoolAgeFacts,
} from "@/lib/school-age";
import {
  SCHOOL_ADULT_STAGE,
  SCHOOL_PARENT_STAGE,
  SCHOOL_TEACHER_STAGE,
  STUDENT_STAGES,
  isMinorBand,
  schoolBandOfProfile,
  schoolBandOfStage,
} from "@/lib/school/student-classes";
import { STAGE_OPTIONS } from "@/lib/onboarding-options";
import { pickupEmailLine, type EmailQuestionRow } from "@/lib/pickup";
import { GET as winback } from "@/app/api/cron/winback/route";
import { GET as lapseNudge } from "@/app/api/cron/lapse-nudge/route";
import { GET as eveningNudge } from "@/app/api/cron/evening-nudge/route";
import { GET as dailyFive } from "@/app/api/cron/daily-five/route";
import { GET as coachMorning } from "@/app/api/cron/coach-morning/route";

// ── The stub database ──────────────────────────────────────────────────
// Seven accounts. Every one of them holds a real-exam enrolment in the
// catalogue's sense (an olympiad is a real exam; a class container is not),
// so before W1b every one of them was in all five audiences.

interface Account extends SchoolAgeFacts {
  id: string;
  schoolAge: boolean;
}
const ACCOUNTS: Account[] = [
  { id: "adult-ug", schoolAge: false, enrolmentCategories: ["GOVT_JOBS"], onbStage: "UG", onbPrepCodes: ["SSC_CGL"] },
  // The common case: no wizard, onbStage NULL. Must stay in every audience.
  { id: "adult-plain", schoolAge: false, enrolmentCategories: ["BANKING"], onbStage: null, onbPrepCodes: [] },
  { id: "olympiad-only", schoolAge: true, enrolmentCategories: ["OLYMPIAD"], onbStage: null, onbPrepCodes: [] },
  { id: "olympiad-and-exam", schoolAge: true, enrolmentCategories: ["OLYMPIAD", "GOVT_JOBS"], onbStage: null, onbPrepCodes: [] },
  { id: "class-and-exam", schoolAge: true, enrolmentCategories: ["SCHOOL_BOARD", "ENGINEERING"], onbStage: null, onbPrepCodes: [] },
  { id: "wizard-9-10", schoolAge: true, enrolmentCategories: ["OTHER"], onbStage: "CLASS_9_10", onbPrepCodes: ["NTSE"] },
  { id: "band-13-17", schoolAge: true, enrolmentCategories: ["ENGINEERING"], onbStage: "CLASS_11_12", onbPrepCodes: ["NCERT_C11", "JEE_MAIN"] },
];
const ADULTS = ["adult-plain", "adult-ug"];
const SCHOOL_AGE = ACCOUNTS.filter((a) => a.schoolAge).map((a) => a.id).sort();
const ALL = ACCOUNTS.map((a) => a.id).sort();

const SCHOOL_AGE_SQL = schoolAgeAccountSql("u").sql;
/** A Prisma.sql fragment among a tagged query's values (this client exports no Sql class to test against). */
const isSql = (v: unknown): v is Prisma.Sql =>
  !!v && typeof v === "object" && typeof (v as { sql?: unknown }).sql === "string" && Array.isArray((v as { values?: unknown }).values);

/** Where a query carries the school-age fragment, and whether it is negated. */
function schoolAgeUse(strings: readonly string[], values: readonly unknown[]): { negated: boolean; before: string } | null {
  const i = values.findIndex((v) => isSql(v) && v.sql === SCHOOL_AGE_SQL);
  if (i < 0) return null;
  const before = strings[i].replace(/\s+/g, " ").trimEnd();
  return { negated: /\bNOT$/.test(before), before };
}

/** The stub honours the fragment with the PURE rule: `NOT <fragment>` keeps the
 *  accounts that are not school age, a bare `<fragment>` keeps the ones that are.
 *  A query with no fragment keeps everyone (that is what "no exclusion" means). */
function keeper(strings: readonly string[], values: readonly unknown[]): (a: Account) => boolean {
  const use = schoolAgeUse(strings, values);
  if (!use) return () => true;
  return (a) => isSchoolAge(a) !== use.negated;
}

const emailOf = (id: string) => `${id}@example.com`;

beforeAll(() => {
  process.env.CRON_SECRET = "test-secret";
  db.queryRaw = async (strings, ...values) => {
    const sql = strings.join("?").replace(/\s+/g, " ");
    db.raws.push({ sql, strings: [...strings], values });
    const keep = keeper(strings, values);
    const now = Date.now();
    // Win-back and the lapse nudge: lapsed accounts (4 days — inside the lapse window).
    if (sql.includes('FROM "User" u JOIN act')) {
      return ACCOUNTS.filter(keep).map((a) => ({
        id: a.id,
        email: emailOf(a.id),
        name: a.id,
        emailOptOut: false,
        lastSeen: new Date(now - 4 * 86_400_000),
        enrolled: true,
        livePlan: false,
        coachShort: null,
        coachDaysLeft: null,
      }));
    }
    // The evening nudge's first read: who studied in the last two days.
    if (sql.includes('SELECT DISTINCT s."userId" FROM (')) return ACCOUNTS.filter(keep).map((a) => ({ userId: a.id }));
    // Coach-morning: everyone here holds a plan with tasks today.
    if (sql.includes('FROM "CoachDay" cd')) {
      return ACCOUNTS.map((a) => ({
        userId: a.id,
        email: emailOf(a.id),
        name: a.id,
        examId: `exam-${a.id}`,
        code: "EXAM",
        short: "Exam",
        tasks: [{ label: "Revise Percentages" }],
        note: null,
        daysLeft: 20,
        examDate: new Date(now + 20 * 86_400_000),
        planCreatedAt: new Date(now - 10 * 86_400_000),
      }));
    }
    // schoolAgeUserIds: of these ids, the school-age ones.
    if (sql.includes('SELECT u.id FROM "User" u WHERE u.id = ANY(')) {
      if (db.schoolAgeReadFails) throw new Error("db down");
      const ids = values[0] as string[];
      return ACCOUNTS.filter((a) => ids.includes(a.id)).filter(keep).map((a) => ({ id: a.id }));
    }
    // The exam a win-back / lapse mail may name: each candidate's own enrolment.
    if (sql.includes('e."shortName" AS short, en."createdAt"')) {
      const ids = values.find((v) => Array.isArray(v)) as string[];
      return ids.map((id) => ({ userId: id, examId: `exam-${id}`, code: "EXAM", short: "Exam", createdAt: new Date(now - 30 * 86_400_000) }));
    }
    if (sql.includes('COUNT(DISTINCT "userId") students')) return [{ students: BigInt(0), sets: BigInt(0) }];
    return [];
  };
  db.findUsers = (args) => {
    const inIds: string[] | undefined = args?.where?.id?.in;
    const notIn: string[] = args?.where?.id?.notIn ?? [];
    return ACCOUNTS.filter((a) => (!inIds || inIds.includes(a.id)) && !notIn.includes(a.id)).map((a) => ({
      id: a.id,
      email: emailOf(a.id),
      name: a.id,
      enrollments: [{ examId: `exam-${a.id}`, createdAt: new Date(Date.now() - 30 * 86_400_000), shiftDate: null, exam: { code: "EXAM", shortName: "Exam" } }],
    }));
  };
});

beforeEach(() => {
  db.raws = [];
  db.userFinds = [];
  db.questionIds = [];
  db.schoolAgeReadFails = false;
  db.sent = { winback: [], lapse: [], evening: [], dailyFive: [], coach: [] };
  // Seen 30 hours ago: inside Daily-5's three days, before today's IST midnight.
  db.events = ACCOUNTS.map((a) => ({ userId: a.id, createdAt: new Date(Date.now() - 30 * 3600_000) }));
});

const run = (handler: (req: Request) => Promise<Response>, name: string, qs = "") =>
  handler(new Request(`https://shishya.in/api/cron/${name}${qs}`, { headers: { authorization: "Bearer test-secret" } }));
const recipients = (list: any[]) => list.map((p) => p.userId as string).sort();

const ROOT = process.cwd();
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

// ── 1: the rule ────────────────────────────────────────────────────────

describe("isSchoolAge — the four triggers and their negatives", () => {
  const facts = (over: Partial<SchoolAgeFacts> = {}): SchoolAgeFacts => ({ enrolmentCategories: [], onbStage: null, onbPrepCodes: [], ...over });

  it("the categories are the catalogue's own, not exam codes", () => {
    expect(OLYMPIAD_CATEGORY).toBe(ExamCategory.OLYMPIAD);
    expect(SCHOOL_CLASS_CATEGORY).toBe(ExamCategory.SCHOOL_BOARD);
    expect(SCHOOL_CLASS_CATEGORY).toBe(SCHOOL_CATEGORY);
    // The rule module names no exam: no SOF / NSO / NSTSE / NCERT code anywhere in its code.
    const code = read("src/lib/school-age.ts")
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join("\n");
    expect(code).not.toMatch(/SOF|NSO|IMO|NSTSE|SZF|NCERT_|CISCE_|NTSE/);
    expect(code.match(/from "([^"]+)"/g)).toEqual(['from "@/lib/school/student-classes"']);
  });

  it("1 — any olympiad enrolment, alone or beside a real exam", () => {
    expect(schoolAgeTriggers(facts({ enrolmentCategories: ["OLYMPIAD"] }))).toEqual(["olympiad-enrolment"]);
    expect(isSchoolAge(facts({ enrolmentCategories: ["GOVT_JOBS", "OLYMPIAD", "BANKING"] }))).toBe(true);
    // The category as the database returns it is upper case; a lower-case copy still counts.
    expect(isSchoolAge(facts({ enrolmentCategories: ["olympiad"] }))).toBe(true);
  });

  it("2 — a school class enrolment, alone or beside a real exam", () => {
    expect(schoolAgeTriggers(facts({ enrolmentCategories: ["SCHOOL_BOARD"] }))).toEqual(["class-enrolment"]);
    expect(isSchoolAge(facts({ enrolmentCategories: ["ENGINEERING", "SCHOOL_BOARD"] }))).toBe(true);
    // The rule errs towards fewer mails: a declared adult / parent / teacher who
    // holds a class enrolment is treated the same (it is not a statement of age).
    for (const stage of [SCHOOL_ADULT_STAGE, SCHOOL_PARENT_STAGE, SCHOOL_TEACHER_STAGE]) {
      expect(schoolAgeTriggers(facts({ enrolmentCategories: ["SCHOOL_BOARD"], onbStage: stage, onbPrepCodes: ["NCERT_C09"] }))).toEqual(["class-enrolment"]);
    }
  });

  it("3 — the stored 13-17 band (a school stage AND the class code the band card wrote)", () => {
    const p = { onbStage: "CLASS_9_10", onbPrepCodes: ["NCERT_C09"] };
    expect(isMinorBand(schoolBandOfProfile(p)?.band)).toBe(true);
    expect(schoolAgeTriggers(facts(p))).toEqual(["minor-band", "wizard-school-stage"]);
  });

  it("4 — a school wizard stage with no band and no school enrolment", () => {
    for (const stage of ["CLASS_8", "CLASS_9_10", "CLASS_11_12"]) {
      // The wizard-only account never declared an age: no band, but the stage alone counts.
      expect(schoolBandOfProfile({ onbStage: stage, onbPrepCodes: ["JEE_MAIN"] })).toBeNull();
      expect(schoolAgeTriggers(facts({ enrolmentCategories: ["ENGINEERING"], onbStage: stage, onbPrepCodes: ["JEE_MAIN"] }))).toEqual(["wizard-school-stage"]);
    }
    expect([...SCHOOL_AGE_WIZARD_STAGES]).toEqual(["CLASS_8", "CLASS_9_10", "CLASS_11_12"]);
    expect([...SCHOOL_AGE_WIZARD_STAGES]).toEqual([...STUDENT_STAGES]);
    // Each one is a stage the wizard really offers.
    const offered = STAGE_OPTIONS.map((s) => s.value);
    for (const stage of SCHOOL_AGE_WIZARD_STAGES) expect(offered).toContain(stage);
  });

  it("negatives: an adult aspirant, an account with nothing, the other wizard stages, a declared adult band with no class enrolment", () => {
    expect(isSchoolAge(facts())).toBe(false);
    expect(isSchoolAge(facts({ enrolmentCategories: ["GOVT_JOBS", "BANKING"], onbStage: "UG", onbPrepCodes: ["SSC_CGL"] }))).toBe(false);
    for (const stage of STAGE_OPTIONS.map((s) => s.value).filter((v) => !SCHOOL_AGE_WIZARD_STAGES.includes(v))) {
      expect(isSchoolAge(facts({ enrolmentCategories: ["ENGINEERING"], onbStage: stage })), stage).toBe(false);
    }
    expect(STAGE_OPTIONS.map((s) => s.value).filter((v) => !SCHOOL_AGE_WIZARD_STAGES.includes(v))).toEqual(["UG", "PG", "WORKING", "OTHER"]);
    // A declared 18+ student / parent / teacher whose class enrolment is gone: no trigger left.
    for (const stage of [SCHOOL_ADULT_STAGE, SCHOOL_PARENT_STAGE, SCHOOL_TEACHER_STAGE]) {
      expect(isSchoolAge(facts({ enrolmentCategories: ["GOVT_JOBS"], onbStage: stage, onbPrepCodes: ["NCERT_C09"] })), stage).toBe(false);
    }
    // A code in onbPrepCodes is not an enrolment — an olympiad code or a class code there decides nothing.
    expect(isSchoolAge(facts({ enrolmentCategories: ["GOVT_JOBS"], onbStage: "UG", onbPrepCodes: ["NSO", "NCERT_C09"] }))).toBe(false);
    // Every other catalogue category, and near-misses, are not triggers.
    const others = Object.values(ExamCategory).filter((c) => c !== ExamCategory.OLYMPIAD && c !== ExamCategory.SCHOOL_BOARD);
    expect(others.length).toBeGreaterThanOrEqual(10);
    expect(isSchoolAge(facts({ enrolmentCategories: others }))).toBe(false);
    expect(isSchoolAge(facts({ enrolmentCategories: ["OLYMPIADS", "SCHOOL", "", null, undefined] }))).toBe(false);
    expect(isSchoolAge(facts({ onbStage: "class_9_10" }))).toBe(false);
  });

  it("the stub accounts are what the rule says they are", () => {
    for (const a of ACCOUNTS) expect(isSchoolAge(a), a.id).toBe(a.schoolAge);
    expect(SCHOOL_AGE).toEqual(["band-13-17", "class-and-exam", "olympiad-and-exam", "olympiad-only", "wizard-9-10"]);
  });
});

// ── 2: the SQL twin ────────────────────────────────────────────────────

describe("schoolAgeAccountSql — the same rule for a selection over \"User\"", () => {
  it("its exact text: any enrolment on an olympiad or a class container, or a school stage; no bind values", () => {
    const frag = schoolAgeAccountSql("u");
    expect(frag.sql).toBe(
      `(EXISTS (SELECT 1 FROM "Enrollment" en JOIN "Exam" e ON e.id = en."examId" WHERE en."userId" = u.id ` +
        `AND (e."category"::text = 'OLYMPIAD' OR NOT e."category"::text <> 'SCHOOL_BOARD')) ` +
        `OR COALESCE(u."onbStage" IN ('CLASS_8', 'CLASS_9_10', 'CLASS_11_12'), FALSE))`,
    );
    expect(frag.values).toEqual([]);
    // Built from the rule's constants: the category and every stage appear as written there.
    expect(frag.sql).toContain(`'${OLYMPIAD_CATEGORY}'`);
    expect(frag.sql).toContain(`'${SCHOOL_CLASS_CATEGORY}'`);
    for (const stage of SCHOOL_AGE_WIZARD_STAGES) expect(frag.sql).toContain(`'${stage}'`);
    // ANY enrolment row: unlike the school-only test, it does not ask for an active one.
    expect(frag.sql).not.toContain("active");
    expect(schoolOnlyAccountSql("u").sql).toContain("en.active = TRUE");
  });

  it("an account whose onbStage is NULL is not dropped by `AND NOT` (NULL IN (…) is NULL)", () => {
    expect(schoolAgeAccountSql("u").sql).toMatch(/OR COALESCE\(u\."onbStage" IN \([^)]*\), FALSE\)\)$/);
  });

  it("the stored 13-17 band is always one of the stages the SQL tests", () => {
    const stages = [...STAGE_OPTIONS.map((s) => s.value), SCHOOL_ADULT_STAGE, SCHOOL_PARENT_STAGE, SCHOOL_TEACHER_STAGE, null, ""];
    for (const stage of stages) {
      expect(isMinorBand(schoolBandOfStage(stage)), String(stage)).toBe(SCHOOL_AGE_WIZARD_STAGES.includes(String(stage)));
    }
  });

  it("the alias is validated — and may not be one of the fragment's own", () => {
    expect(schoolAgeAccountSql("usr").sql).toContain(`en."userId" = usr.id`);
    expect(schoolAgeAccountSql("usr").sql).toContain(`COALESCE(usr."onbStage" IN`);
    for (const bad of ["u; DROP", "u.id", "1u", "", "en", "e"]) expect(() => schoolAgeAccountSql(bad)).toThrow(/bad SQL alias/);
  });

  it("schoolAgeUserIds: one read for the batch, de-duplicated, the fragment un-negated; an empty batch reads nothing", async () => {
    expect(await schoolAgeUserIds([])).toEqual([]);
    expect(db.raws).toHaveLength(0);
    expect((await schoolAgeUserIds([...ALL, "adult-ug", ""])).sort()).toEqual(SCHOOL_AGE);
    expect(db.raws).toHaveLength(1);
    expect(db.raws[0].sql).toContain('SELECT u.id FROM "User" u WHERE u.id = ANY(?) AND ?');
    expect(db.raws[0].values[0]).toEqual(ALL);
    const use = schoolAgeUse(db.raws[0].strings, db.raws[0].values)!;
    expect(use.negated).toBe(false);
    expect(use.before.endsWith(") AND")).toBe(true);
  });

  it("schoolAgeTestFor fails closed: a failed read answers 'school age' for everyone in the batch", async () => {
    const ok = await schoolAgeTestFor(ALL);
    expect(ALL.filter((id) => ok(id))).toEqual(SCHOOL_AGE);
    db.schoolAgeReadFails = true;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = await schoolAgeTestFor(ALL);
    expect(ALL.every((id) => failed(id))).toBe(true);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
    await expect(schoolAgeUserIds(ALL)).rejects.toThrow("db down");
  });
});

// ── 3: the three come-back mails ───────────────────────────────────────

describe("win-back, lapse nudge and evening nudge skip school-age accounts", () => {
  it("win-back: the selection carries AND NOT <school age>, before its LIMIT; only the adults are mailed", async () => {
    const res = await run(winback, "winback");
    expect(await res.json()).toMatchObject({ ok: true, eligible: 2, sent: 2, failed: 0 });
    expect(recipients(db.sent.winback)).toEqual(ADULTS);
    const sel = db.raws.find((q) => q.sql.includes('FROM "User" u JOIN act'))!;
    expect(sel.sql).toContain("t.tag = 'winback'");
    const use = schoolAgeUse(sel.strings, sel.values)!;
    expect(use.negated).toBe(true);
    expect(use.before.endsWith("AND NOT")).toBe(true);
    // It sits inside the candidate query, ahead of the LIMIT: a school-age account takes no place in the batch.
    const src = read("src/app/api/cron/winback/route.ts");
    const at = src.indexOf('AND NOT ${schoolAgeAccountSql("u")}');
    expect(at).toBeGreaterThan(src.indexOf("const candidates = await prisma.$queryRaw"));
    expect(at).toBeLessThan(src.indexOf("LIMIT ${MAX_SENDS}"));
    expect(src.match(/schoolAgeAccountSql\("u"\)/g)).toHaveLength(1);
  });

  it("win-back dry run lists none of them either", async () => {
    const j = (await (await run(winback, "winback", "?dry=1")).json()) as { eligible: number; sample: Array<{ name: string }> };
    expect(j.eligible).toBe(2);
    expect(j.sample.map((s) => s.name).sort()).toEqual(ADULTS);
    expect(db.sent.winback).toHaveLength(0);
  });

  it("lapse nudge: the selection carries AND NOT <school age>; they are not even candidates", async () => {
    const res = await run(lapseNudge, "lapse-nudge");
    expect(await res.json()).toMatchObject({ ok: true, candidates: 2, eligible: 2, sent: 2, failed: 0 });
    expect(recipients(db.sent.lapse)).toEqual(ADULTS);
    const sel = db.raws.find((q) => q.sql.includes('FROM "User" u JOIN act'))!;
    expect(sel.sql).toContain("INTERVAL '72 hours'");
    const use = schoolAgeUse(sel.strings, sel.values)!;
    expect(use.negated).toBe(true);
    expect(use.before.endsWith("AND NOT")).toBe(true);
    const src = read("src/app/api/cron/lapse-nudge/route.ts");
    expect(src).toMatch(/AND NOT \$\{schoolAgeAccountSql\("u"\)\}\s*ORDER BY act\.last_seen DESC\s*LIMIT 500/);
    expect(src.indexOf('schoolAgeAccountSql("u")')).toBeLessThan(src.indexOf("if (dry) {"));
  });

  it("lapse nudge dry run names only the adults", async () => {
    const j = (await (await run(lapseNudge, "lapse-nudge", "?dry=1")).json()) as { recipients: Array<{ userId: string }> };
    expect(j.recipients.map((r) => r.userId).sort()).toEqual(ADULTS);
    expect(db.sent.lapse).toHaveLength(0);
  });

  it("evening nudge: the first read drops them, so no streak is computed for them and none is mailed", async () => {
    const res = await run(eveningNudge, "evening-nudge");
    expect(await res.json()).toMatchObject({ ok: true, atRisk: 2, sent: 2, failed: 0 });
    expect(recipients(db.sent.evening)).toEqual(ADULTS);
    const first = db.raws[0];
    expect(first.sql).toContain('SELECT DISTINCT s."userId" FROM (');
    expect(first.sql).toContain('JOIN "User" u ON u.id = s."userId"');
    const use = schoolAgeUse(first.strings, first.values)!;
    expect(use.negated).toBe(true);
    expect(use.before.endsWith("WHERE NOT")).toBe(true);
    // The recipient read is asked only about the accounts that survived it.
    expect([...db.userFinds[0].where.id.in].sort()).toEqual(ADULTS);
    // The four study-day legs are unchanged.
    for (const leg of ['"Attempt" WHERE "finishedAt" >=', '"ChatSession" WHERE "createdAt" >=', '"DescriptiveAttempt" WHERE "createdAt" >=', '"TopicStudyState" WHERE "completedAt" >=']) {
      expect(first.sql).toContain(leg);
    }
  });

  it("the stub is not vacuous: a selection WITHOUT the fragment would have returned all seven", async () => {
    const rows = await db.queryRaw!(Object.assign(['SELECT u.id FROM "User" u JOIN act ON act."userId" = u.id'], { raw: [] }) as unknown as TemplateStringsArray);
    expect(rows).toHaveLength(ACCOUNTS.length);
  });
});

// ── 4: the two mails that stay ─────────────────────────────────────────

describe("Daily 5 and coach-morning still go out — without the quoted chat line for school-age accounts", () => {
  const quoted = (list: any[]) => list.filter((p) => p.pickup).map((p) => p.userId as string).sort();

  it("the line itself: absent for a school-age account, present for the same question otherwise", () => {
    const q: EmailQuestionRow = { sessionId: "sess_abcdefgh", examCode: "SSC_CGL", content: "Why is 1 not prime?", createdAt: new Date("2026-10-01T08:00:00Z"), answered: true, isLastUser: true };
    const now = new Date("2026-10-02T03:20:00Z");
    const line = pickupEmailLine(q, now, { schoolAge: false })!;
    expect(line.text).toContain("“Why is 1 not prime?”");
    expect(line.html).toContain("Why is 1 not prime?");
    expect(pickupEmailLine(q, now, { schoolAge: true })).toBeNull();
    // Only an explicit "not school age" gets it: a caller that cannot say is refused.
    expect(pickupEmailLine(q, now, {} as { schoolAge: boolean })).toBeNull();
    expect(pickupEmailLine(q, now, undefined as unknown as { schoolAge: boolean })).toBeNull();
  });

  it("Daily 5: all seven get the mail; only the adults' mails quote their question; school-age chats are not read", async () => {
    const res = await run(dailyFive, "daily-five");
    expect(await res.json()).toMatchObject({ ok: true, sent: 7, failed: 0, withPickup: 2 });
    expect(recipients(db.sent.dailyFive)).toEqual(ALL);
    expect(quoted(db.sent.dailyFive)).toEqual(ADULTS);
    for (const p of db.sent.dailyFive) {
      if (ADULTS.includes(p.userId)) expect(p.pickup.text).toContain(`“Question typed by ${p.userId}”`);
      else expect(p.pickup).toBeNull();
    }
    expect(db.questionIds).toHaveLength(1);
    expect([...db.questionIds[0]].sort()).toEqual(ADULTS);
    // The audience read is untouched: it carries no school-age test.
    expect(JSON.stringify(db.userFinds[0].where)).not.toMatch(/OLYMPIAD|onbStage/);
  });

  it("Daily 5 dry run counts the line for the adults only", async () => {
    const j = (await (await run(dailyFive, "daily-five", "?dry=1")).json()) as { users: number; withPickup: number };
    expect(j).toMatchObject({ users: 7, withPickup: 2 });
    expect(db.sent.dailyFive).toHaveLength(0);
  });

  it("coach-morning: all seven get the mail; only the adults' mails quote their question; school-age chats are not read", async () => {
    const res = await run(coachMorning, "coach-morning");
    expect(await res.json()).toMatchObject({ ok: true, eligible: 7, sent: 7, failed: 0 });
    expect(recipients(db.sent.coach)).toEqual(ALL);
    expect(quoted(db.sent.coach)).toEqual(ADULTS);
    for (const p of db.sent.coach) {
      expect(p.tasks).toEqual(["Revise Percentages"]);
      if (!ADULTS.includes(p.userId)) expect(p.pickup).toBeNull();
    }
    expect(db.questionIds).toHaveLength(1);
    expect([...db.questionIds[0]].sort()).toEqual(ADULTS);
    // The audience read is untouched: the plan selection carries no school-age test.
    const sel = db.raws.find((q) => q.sql.includes('FROM "CoachDay" cd'))!;
    expect(schoolAgeUse(sel.strings, sel.values)).toBeNull();
  });

  it("coach-morning dry run counts the line for the adults only", async () => {
    const j = (await (await run(coachMorning, "coach-morning", "?dry=1")).json()) as { prepared: number; withPickup: number };
    expect(j).toMatchObject({ prepared: 7, withPickup: 2 });
    expect(db.sent.coach).toHaveLength(0);
  });

  it("a failed school-age read quotes nobody and stops no mail", async () => {
    db.schoolAgeReadFails = true;
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await run(dailyFive, "daily-five");
    await run(coachMorning, "coach-morning");
    err.mockRestore();
    expect(recipients(db.sent.dailyFive)).toEqual(ALL);
    expect(recipients(db.sent.coach)).toEqual(ALL);
    expect(quoted(db.sent.dailyFive)).toEqual([]);
    expect(quoted(db.sent.coach)).toEqual([]);
    // Nobody's chat was read for the mail.
    expect(db.questionIds).toEqual([[], []]);
  });

  it("source seams: the two mails ask who is school age; the come-back mails and the day-3 nudge exclude in SQL; nothing else changed audience", () => {
    for (const f of ["src/app/api/cron/daily-five/route.ts", "src/app/api/cron/coach-morning/route.ts"]) {
      const src = read(f);
      expect(src, f).toMatch(/const isSchoolAge = await schoolAgeTestFor\(/);
      expect(src, f).toMatch(/pickupEmailLine\(lastQuestions\.get\([^)]*\), now, \{ schoolAge: isSchoolAge\(/);
      expect(src, f).toMatch(/loadEmailQuestions\([^;]*!isSchoolAge\(id\)/);
      expect(src, f).not.toContain("schoolAgeAccountSql");
    }
    // day-3 nudge: added by the review of 2 Oct 2026 (it invites to an exam-prep diagnostic).
    for (const f of ["src/app/api/cron/winback/route.ts", "src/app/api/cron/lapse-nudge/route.ts", "src/app/api/cron/evening-nudge/route.ts", "src/app/api/cron/day3-nudge/route.ts"]) {
      expect(read(f).match(/NOT \$\{schoolAgeAccountSql\("u"\)\}/g), f).toHaveLength(1);
    }
    // The line's third argument is required: no caller can leave the question unanswered.
    expect(read("src/lib/pickup.ts")).toMatch(/now: Date,\n\s+who: \{ schoolAge: boolean \},\n\): \{ text: string; html: string \} \| null \{/);
    // The rule is used by exactly these six crons (and by nothing that alerts or monitors).
    const cronDir = path.join(ROOT, "src/app/api/cron");
    const users = fs
      .readdirSync(cronDir)
      .filter((d) => fs.existsSync(path.join(cronDir, d, "route.ts")) && /schoolAge(AccountSql|TestFor|UserIds)/.test(read(`src/app/api/cron/${d}/route.ts`)))
      .sort();
    expect(users).toEqual(["coach-morning", "daily-five", "day3-nudge", "evening-nudge", "lapse-nudge", "winback"]);
    // The day-3 nudge keeps its older school-only exclusion beside the new one.
    expect(read("src/app/api/cron/day3-nudge/route.ts")).toMatch(/NOT \$\{schoolOnlyAccountSql\("u"\)\}/);
  });
});
