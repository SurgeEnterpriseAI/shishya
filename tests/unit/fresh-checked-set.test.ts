// "Get 10 fresh questions" picks from the answer-checked bank (6 Oct 2026).
//
// The results page's fresh-set button used to have the AI write 10 questions
// on the press (validated:false); since 26 Sep no such set could be served.
// The fix keeps the site's promise — mocks serve only answer-checked
// questions — by picking the set from the exam's checked questions this
// student has never seen (src/lib/fresh-set.ts, POST /api/mocks/fresh).
// Pinned here:
//   1. the picker: only servable questions that passed the answer check
//      (review fix: a validated row with no check record is never picked
//      and never counted in M), in the set's language, never a seen one (or
//      the same text as a seen one), the button's scope first then wider,
//      no twins, a fixed order with variety, and the too-few numbers;
//   2. the route (Prisma mocked): an ordinary CHALLENGE mock of servable,
//      checked, unseen questions in the attempt's paper's language; too few
//      → no mock and the honest numbers; a set not yet submitted (not
//      started, in progress or discarded) comes back instead of a new one,
//      also when it appears between the first look and the create (the
//      lock); only the student's own attempt steers the scope; no model
//      call;
//   3. no AI on this path (imports, the removed generator);
//   4. the card: the copy (en/hi/te), the beacon, never on a school attempt.
// The check that fails on the old route is tests/unit/fresh-set-core.test.ts.

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

type Row = {
  id: string;
  examId: string;
  topicId: string;
  type: string;
  difficulty: string;
  body: string;
  answerKey: string;
  validated: boolean;
  validatedBy: string | null;
  validatedAt: Date | null;
  tags: string[];
  pyqYear: number | null;
  language: string;
  metadata: unknown;
};

type OpenMock = { id: string; title: string; questionIds: string[]; attempts?: { id: string }[] };

const db = vi.hoisted(() => ({
  questions: new Map<string, Row>(),
  mocks: [] as { id: string; questionIds: string[]; [k: string]: unknown }[],
  seen: [] as string[],
  session: { user: { id: "u1" } } as { user: { id: string } } | null,
  attempt: null as null | { userId: string; topicScores: unknown; answers?: unknown; mock: { examId: string; questionIds?: string[] } },
  openMock: null as null | OpenMock,
  /** When true, the pool read ignores its WHERE (a broken filter must still not serve drafts, unchecked or other-language rows). */
  ignoreWhere: false,
  /** The pool read's SQL and values, as last sent. */
  poolSql: null as null | { sql: string; values: unknown[] },
  /** The SQL of every $queryRaw, in order. */
  rawSql: [] as string[],
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => db.session) }));
vi.mock("@/lib/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics")>()),
  recordEvent: vi.fn(async () => undefined),
}));
vi.mock("@/lib/ai/usage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/usage")>()),
  recordAiUsage: vi.fn(() => 0),
}));
vi.mock("@/lib/ai/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/client")>();
  return { ...real, anthropic: { messages: { create: vi.fn(async () => ({ content: [], usage: { input_tokens: 0, output_tokens: 0 } })) } } };
});
vi.mock("@/lib/db/prisma", () => {
  const matches = (q: Row, where: Record<string, any> | undefined): boolean => {
    if (!where) return true;
    if (where.examId && q.examId !== where.examId) return false;
    if (where.validated === true && q.validated !== true) return false;
    const notHas = where.NOT?.tags?.has;
    if (notHas && q.tags.includes(notHas)) return false;
    const idIn = where.id?.in;
    if (Array.isArray(idIn) && !idIn.includes(q.id)) return false;
    return true;
  };
  /** The answer check's record, as the SQL rule of src/lib/exam-answer-check.ts reads it. */
  const checked = (q: Row): boolean =>
    (q.validatedBy ?? "").startsWith("factory:") &&
    !!q.metadata &&
    typeof q.metadata === "object" &&
    Object.prototype.hasOwnProperty.call(q.metadata, "factoryVerify");
  const prisma: Record<string, any> = {
    exam: {
      findUnique: vi.fn(async (args: { where: { code?: string } }) =>
        args.where.code === "SSC_CGL" ? { id: "e1", code: "SSC_CGL", name: "SSC Combined Graduate Level", shortName: "SSC CGL" } : null,
      ),
    },
    topic: {
      findMany: vi.fn(async () => [
        { id: "t-pct", code: "quant.percentage", name: "Percentage", subjectId: "s-quant", parentId: null },
        { id: "t-pct-sub", code: "quant.percentage.successive", name: "Successive percentage", subjectId: "s-quant", parentId: "t-pct" },
        { id: "t-ratio", code: "quant.ratio", name: "Ratio", subjectId: "s-quant", parentId: null },
        { id: "t-si", code: "quant.si", name: "Simple interest", subjectId: "s-quant", parentId: null },
        { id: "t-gk", code: "ga.polity", name: "Polity", subjectId: "s-ga", parentId: null },
      ]),
    },
    attempt: { findUnique: vi.fn(async () => db.attempt) },
    question: {
      findMany: vi.fn(async (args?: { where?: Record<string, any> }) => [...db.questions.values()].filter((q) => matches(q, args?.where))),
    },
    mock: {
      findFirst: vi.fn(async (): Promise<OpenMock | null> => db.openMock),
      create: vi.fn(async ({ data }: { data: { questionIds: string[]; title: string; [k: string]: unknown } }) => {
        const m = { ...data, id: `m-${db.mocks.length + 1}` };
        db.mocks.push(m);
        return { id: m.id, title: data.title };
      }),
    },
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = Array.from(strings).join("?");
      db.rawSql.push(sql);
      if (sql.includes("pg_advisory_xact_lock")) return [{ ok: 1 }];
      if (sql.includes('"answerChecked"')) {
        // The pool read: the exam's servable rows in the paper's language
        // (what its WHERE says), each with the answer check's record.
        db.poolSql = { sql, values };
        const lang = values.find((v) => typeof v === "string" && /^[A-Z]{2}$/.test(v));
        return [...db.questions.values()]
          .filter((q) => db.ignoreWhere || (values.includes(q.examId) && q.validated && !q.tags.includes("rejected") && q.language === lang))
          .map((q) => ({ ...q, answerChecked: checked(q) }));
      }
      return db.seen.map((qid) => ({ qid }));
    }),
  };
  prisma.$transaction = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  return { prisma };
});

import { POST } from "@/app/api/mocks/fresh/route";
import { prisma } from "@/lib/db/prisma";
import { anthropic } from "@/lib/ai/client";
import { canServePaper, isServable, MIN_SERVED_QUESTIONS, servedPaperIds } from "@/lib/served-paper";
import {
  FRESH_GENERATED_BY,
  FRESH_SET_MIN,
  FRESH_SET_SIZE,
  freshOrderKey,
  freshSetLinks,
  freshTiers,
  isFreshEligible,
  LEGACY_ON_DEMAND_GENERATED_BY,
  paperLanguage,
  pickFreshSet,
  tierOf,
  weakTopicIdsOf,
  type FreshCandidate,
} from "@/lib/fresh-set";
import { FRESH_SET_COPY, fillFresh, freshSetCopy, tooFewLine } from "@/lib/fresh-set-copy";
import { schoolContainerClassOf } from "@/lib/school/student-classes";

const ROOT = process.cwd();
const src = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
/** The source without comment lines (a comment may name what the code must not do). */
const code = (p: string) =>
  src(p)
    .split(/\r?\n/)
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

// ── Fixtures ────────────────────────────────────────────────────────────

/** A word for n made of letters only (the twin rules read numbers as "#"): 5 → "f", 15 → "bf". */
const word = (n: number) => String(n).replace(/\d/g, (d) => "abcdefghij"[Number(d)]);
/** Distinct stems: three words of their own each, so no two are twins or one kind. */
const stem = (i: number) => `Which value fits w${word(i)} x${word(i)} y${word(i)} here?`;

function cand(id: string, over: Partial<FreshCandidate> = {}, i = Number(id.replace(/\D/g, "")) || 0): FreshCandidate {
  return {
    id,
    topicId: "t1",
    difficulty: "MEDIUM",
    body: stem(i),
    answerKey: "ABCD"[i % 4],
    validated: true,
    tags: [],
    answerChecked: true,
    language: "EN",
    ...over,
  };
}

/** The answer check's record on a row that passed it. */
const PASSED = { validatedBy: "factory:verify", metadata: { factoryVerify: { decision: "ACCEPT", agreement: 1, confidence: 0.95 } } };

function row(id: string, topicId: string, i: number, over: Partial<Row> = {}): Row {
  return {
    id,
    examId: "e1",
    topicId,
    type: "MCQ",
    difficulty: ["EASY", "MEDIUM", "HARD"][i % 3],
    body: stem(i),
    answerKey: "ABCD"[i % 4],
    validated: true,
    validatedBy: PASSED.validatedBy,
    validatedAt: new Date("2026-09-20T00:00:00Z"),
    tags: [],
    pyqYear: null,
    language: "EN",
    metadata: PASSED.metadata,
    ...over,
  };
}

function press(body: Record<string, unknown>) {
  return new Request("https://shishya.in/api/mocks/fresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const BODY = { examCode: "SSC_CGL", topicCode: "quant.percentage", count: 10, attemptId: "a1" };

function seed(rows: Row[]) {
  db.questions.clear();
  for (const r of rows) db.questions.set(r.id, r);
}

beforeEach(() => {
  vi.clearAllMocks();
  db.mocks.length = 0;
  db.seen = [];
  db.session = { user: { id: "u1" } };
  db.attempt = {
    userId: "u1",
    topicScores: {
      "t-pct": { topicCode: "quant.percentage", topicName: "Percentage", correct: 1, total: 5, score: 0.2 },
      "t-ratio": { topicCode: "quant.ratio", topicName: "Ratio", correct: 2, total: 4, score: 0.5 },
      "t-gk": { topicCode: "ga.polity", topicName: "Polity", correct: 3, total: 3, score: 1 },
    },
    mock: { examId: "e1" },
  };
  db.openMock = null;
  db.ignoreWhere = false;
  db.poolSql = null;
  db.rawSql = [];
  seed([]);
});

// ── 1. The picker ───────────────────────────────────────────────────────

describe("pickFreshSet — which questions a fresh set holds", () => {
  const T = [new Set(["t1"])];

  it("holds only answer-checked questions: never validated:false, never tagged 'rejected'", () => {
    const pool = [
      ...Array.from({ length: 12 }, (_, i) => cand(`c${i}`, {}, i)),
      ...Array.from({ length: 10 }, (_, i) => cand(`d${i}`, { validated: false }, 100 + i)),
      ...Array.from({ length: 3 }, (_, i) => cand(`r${i}`, { tags: ["rejected"] }, 200 + i)),
    ];
    const p = pickFreshSet({ pool, seen: new Set(), tiers: T, salt: "u1" });
    expect(p.ok).toBe(true);
    expect(p.ids).toHaveLength(FRESH_SET_SIZE);
    const byId = new Map(pool.map((q) => [q.id, q]));
    for (const id of p.ids) expect(isServable(byId.get(id))).toBe(true);
    expect(p.ids.some((id) => /^[dr]/.test(id))).toBe(false);
    expect(p.total).toBe(12);
  });

  it("drafts alone never make a set, however many there are", () => {
    const pool = [
      ...Array.from({ length: 3 }, (_, i) => cand(`c${i}`, {}, i)),
      ...Array.from({ length: 30 }, (_, i) => cand(`d${i}`, { validated: false }, 100 + i)),
    ];
    const p = pickFreshSet({ pool, seen: new Set(), tiers: T, salt: "u1" });
    expect(p).toMatchObject({ ok: false, ids: [], total: 3, practised: 0, available: 3 });
  });

  it("holds only questions the answer check passed: a validated row with no check record is never picked and not counted in M", () => {
    const pool = [
      ...Array.from({ length: 8 }, (_, i) => cand(`c${i}`, {}, i)),
      // validated at insert or in bulk, never through the check
      ...Array.from({ length: 6 }, (_, i) => cand(`u${i}`, { answerChecked: false }, 100 + i)),
      cand("n0", { answerChecked: null }, 200),
      cand("m0", { answerChecked: undefined }, 201),
    ];
    const p = pickFreshSet({ pool, seen: new Set(["c0", "u0"]), tiers: T, salt: "u1" });
    expect(p.ids).toHaveLength(7);
    expect(p.ids.every((id) => id.startsWith("c"))).toBe(true);
    // M = the 8 checked rows; N = the one checked row seen (a seen unchecked row is not in M).
    expect(p).toMatchObject({ ok: true, total: 8, practised: 1, available: 7 });
    expect(isFreshEligible(cand("x"))).toBe(true);
    expect(isFreshEligible(cand("x", { answerChecked: false }))).toBe(false);
    expect(isFreshEligible(cand("x", { validated: false }))).toBe(false);
    expect(isFreshEligible(cand("x", { tags: ["rejected"] }))).toBe(false);
    expect(isFreshEligible(null)).toBe(false);
  });

  it("one language: only rows in the set's language (a row with none is EN); without a language, every row", () => {
    const pool = [
      ...Array.from({ length: 6 }, (_, i) => cand(`e${i}`, { language: "EN" }, i)),
      ...Array.from({ length: 8 }, (_, i) => cand(`t${i}`, { language: "TE" }, 50 + i)),
      cand("x0", { language: null }, 99),
    ];
    const en = pickFreshSet({ pool, seen: new Set(), tiers: T, salt: "u1", language: "EN" });
    expect([...en.ids].sort()).toEqual(["e0", "e1", "e2", "e3", "e4", "e5", "x0"]);
    expect(en.total).toBe(7);
    const te = pickFreshSet({ pool, seen: new Set(["e0"]), tiers: T, salt: "u1", language: "TE" });
    expect(te.ids).toHaveLength(8);
    expect(te.ids.every((id) => id.startsWith("t"))).toBe(true);
    expect(te).toMatchObject({ total: 8, practised: 0 });
    expect(pickFreshSet({ pool, seen: new Set(), tiers: T, salt: "u1" }).total).toBe(15);
  });

  it("paperLanguage: the paper's most common language; EN on a tie with EN, on nothing, on junk", () => {
    expect(paperLanguage(["TE", "TE", "EN"])).toBe("TE");
    expect(paperLanguage(["te", "te", "EN"])).toBe("TE");
    expect(paperLanguage(["EN", "TE"])).toBe("EN");
    expect(paperLanguage(["TE", "HI"])).toBe("HI");
    expect(paperLanguage([])).toBe("EN");
    expect(paperLanguage([null, undefined, "", "english"])).toBe("EN");
  });

  it("never repeats a seen question, nor a row with the same text as a seen one", () => {
    const pool = Array.from({ length: 20 }, (_, i) => cand(`c${i}`, {}, i));
    // c19 is a duplicate row of seen c0 (same stem, new id).
    pool[19] = cand("c19", { body: pool[0].body });
    const seen = new Set(["c0", "c1", "c2", "c3", "c4"]);
    for (let s = 0; s < 25; s++) {
      const p = pickFreshSet({ pool, seen, tiers: T, salt: `user-${s}` });
      expect(p.ids).toHaveLength(10);
      for (const id of p.ids) expect(seen.has(id)).toBe(false);
      expect(p.ids).not.toContain("c19");
      expect(p.practised).toBe(6); // 5 seen + the duplicate of c0
    }
  });

  it("the button's scope first, then wider: the pressed topic, the weak topics, then the rest of the exam", () => {
    const tiers = [new Set(["tA"]), new Set(["tB"])];
    const pool = [
      ...Array.from({ length: 4 }, (_, i) => cand(`a${i}`, { topicId: "tA" }, i)),
      ...Array.from({ length: 4 }, (_, i) => cand(`b${i}`, { topicId: "tB" }, 10 + i)),
      ...Array.from({ length: 10 }, (_, i) => cand(`z${i}`, { topicId: "tZ" }, 20 + i)),
    ];
    const p = pickFreshSet({ pool, seen: new Set(), tiers, salt: "u1" });
    expect(p.perTier).toEqual([4, 4, 2]);
    for (let i = 0; i < 4; i++) {
      expect(p.ids).toContain(`a${i}`);
      expect(p.ids).toContain(`b${i}`);
    }
    // A topic with enough unseen questions fills the set alone.
    const only = pickFreshSet({ pool: Array.from({ length: 15 }, (_, i) => cand(`a${i}`, { topicId: "tA" }, i)).concat(pool.slice(8)), seen: new Set(), tiers, salt: "u1" });
    expect(only.perTier).toEqual([10, 0, 0]);
  });

  it("no twins: an identical stem once; the same stem with new numbers at most twice while others remain", () => {
    const sameText = "A train 120 m long passes a pole in 6 seconds. What is its speed in km/h?";
    const newNumbers = (n: number) => `A train ${100 + n * 10} m long passes a pole in ${5 + n} seconds. What is its speed in km/h?`;
    const pool = [
      cand("x1", { body: sameText }),
      cand("x2", { body: sameText }),
      ...Array.from({ length: 6 }, (_, i) => cand(`n${i}`, { body: newNumbers(i) })),
      ...Array.from({ length: 12 }, (_, i) => cand(`c${i}`, {}, i)),
    ];
    const p = pickFreshSet({ pool, seen: new Set(), tiers: T, salt: "u1" });
    const bodies = p.ids.map((id) => pool.find((q) => q.id === id)!.body);
    expect(bodies.filter((b) => b === sameText).length).toBeLessThanOrEqual(1);
    const trains = bodies.filter((b) => b.startsWith("A train")).length;
    expect(trains).toBeLessThanOrEqual(2);
    // When the bank is short, near-twins come back — an identical stem never does.
    const short = pickFreshSet({ pool: pool.slice(0, 8), seen: new Set(), tiers: T, salt: "u1" });
    expect(short.ok).toBe(true);
    expect(short.ids).toHaveLength(7); // x1/x2 count once
    expect(short.available).toBe(7);
  });

  it("a fixed order: the same student gets the same set twice; another student gets another", () => {
    const pool = Array.from({ length: 40 }, (_, i) => cand(`c${i}`, {}, i));
    const a1 = pickFreshSet({ pool, seen: new Set(), tiers: T, salt: "student-a" });
    const a2 = pickFreshSet({ pool: [...pool].reverse(), seen: new Set(), tiers: T, salt: "student-a" });
    const b = pickFreshSet({ pool, seen: new Set(), tiers: T, salt: "student-b" });
    expect(a2.ids).toEqual(a1.ids);
    expect(b.ids).not.toEqual(a1.ids);
    expect(freshOrderKey("s", "x")).toBe(freshOrderKey("s", "x"));
    expect(freshOrderKey("s", "x")).not.toBe(freshOrderKey("t", "x"));
  });

  it("played easy to hard, never more than three answers of one letter in a row", () => {
    const levels = ["HARD", "EASY", "MEDIUM"];
    const pool = Array.from({ length: 30 }, (_, i) => cand(`c${i}`, { difficulty: levels[i % 3], answerKey: i < 20 ? "B" : "ABCD"[i % 4] }, i));
    for (let s = 0; s < 20; s++) {
      const p = pickFreshSet({ pool, seen: new Set(), tiers: T, salt: `s${s}` });
      const qs = p.ids.map((id) => pool.find((q) => q.id === id)!);
      for (let i = 3; i < qs.length; i++) {
        const run = qs.slice(i - 3, i + 1).map((q) => q.answerKey);
        const allSame = run.every((k) => k === run[0]);
        // A run of four is allowed only when no other letter is left to move forward.
        if (allSame) expect(qs.slice(i).every((q) => q.answerKey === run[0])).toBe(true);
      }
    }
    // Four of each level, each level with all four letters: no run of three can
    // form, so no question is moved and the levels read easy to hard.
    const varied = Array.from({ length: 12 }, (_, i) => cand(`v${i}`, { difficulty: ["EASY", "MEDIUM", "HARD"][Math.floor(i / 4)], answerKey: "ABCD"[i % 4] }, i));
    const p = pickFreshSet({ pool: varied, seen: new Set(), tiers: T, salt: "u1" });
    expect(p.ids).toHaveLength(10);
    const rank = { EASY: 0, MEDIUM: 1, HARD: 2 } as Record<string, number>;
    const lv = p.ids.map((id) => rank[varied.find((q) => q.id === id)!.difficulty]);
    expect([...lv].sort((x, y) => x - y)).toEqual(lv);
  });

  it("too few: under FRESH_SET_MIN unseen there is no set; 5 to 9 make a shorter set", () => {
    expect(FRESH_SET_MIN).toBe(MIN_SERVED_QUESTIONS);
    const pool = Array.from({ length: 12 }, (_, i) => cand(`c${i}`, {}, i));
    const seen = (n: number) => new Set(pool.slice(0, n).map((q) => q.id));
    const four = pickFreshSet({ pool, seen: seen(8), tiers: T, salt: "u1" });
    expect(four).toMatchObject({ ok: false, ids: [], total: 12, practised: 8, available: 4 });
    const five = pickFreshSet({ pool, seen: seen(7), tiers: T, salt: "u1" });
    expect(five.ok).toBe(true);
    expect(five.ids).toHaveLength(5);
    const seven = pickFreshSet({ pool, seen: seen(5), tiers: T, salt: "u1" });
    expect(seven.ids).toHaveLength(7);
    expect(canServePaper(five.ids)).toBe(true);
  });

  it("weakTopicIdsOf: the attempt's wrong topics, weakest first; full marks and junk left out", () => {
    expect(
      weakTopicIdsOf({
        t1: { score: 0.5 },
        t2: { score: 0 },
        t3: { score: 1 },
        t4: { score: "x" },
        t5: null,
        t6: { score: 0.5 },
      }),
    ).toEqual(["t2", "t1", "t6"]);
    expect(weakTopicIdsOf(null)).toEqual([]);
    expect(weakTopicIdsOf([1, 2])).toEqual([]);
  });

  it("freshTiers: pressed topic with its sub-topics, then weak topics, then the subject; a topic sits in one tier", () => {
    const topics = [
      { id: "p", code: "p", subjectId: "s1", parentId: null },
      { id: "p1", code: "p1", subjectId: "s1", parentId: "p" },
      { id: "w", code: "w", subjectId: "s2", parentId: null },
      { id: "s", code: "s", subjectId: "s1", parentId: null },
      { id: "o", code: "o", subjectId: "s3", parentId: null },
    ];
    const tiers = freshTiers(topics, "p", ["p", "w", "ghost"]);
    expect(tiers.map((t) => [...t].sort())).toEqual([["p", "p1"], ["w"], ["s"]]);
    expect(tierOf("o", tiers)).toBe(3);
    expect(freshTiers(topics, null, ["w"]).map((t) => [...t])).toEqual([["w"]]);
  });

  it("freshSetLinks: the hub's topic list, and its previous-year papers only when the exam has some", () => {
    expect(freshSetLinks("SSC_CGL", true)).toEqual({ topics: "/exams/SSC_CGL#syllabus", pyq: "/exams/SSC_CGL#pyqs" });
    expect(freshSetLinks("SSC_CGL", false)).toEqual({ topics: "/exams/SSC_CGL#syllabus", pyq: null });
  });
});

// ── 2. The route ────────────────────────────────────────────────────────

describe("POST /api/mocks/fresh — a set from the checked bank", () => {
  /** 6 unseen on the pressed topic (2 seen), 4 on the weak topic, 10 on the subject, 10 elsewhere, plus drafts. */
  function bank() {
    const rows: Row[] = [];
    let i = 0;
    for (let k = 0; k < 8; k++) rows.push(row(`pct${k}`, k < 2 ? "t-pct-sub" : "t-pct", i++));
    for (let k = 0; k < 4; k++) rows.push(row(`rat${k}`, "t-ratio", i++));
    for (let k = 0; k < 10; k++) rows.push(row(`si${k}`, "t-si", i++, { pyqYear: k === 0 ? 2023 : null }));
    for (let k = 0; k < 10; k++) rows.push(row(`gk${k}`, "t-gk", i++));
    for (let k = 0; k < 10; k++) rows.push(row(`draft${k}`, "t-pct", 100 + k, { validated: false, validatedAt: null }));
    rows.push(row("withdrawn0", "t-pct", 200, { validated: true, tags: ["rejected"] }));
    seed(rows);
    db.seen = ["pct0", "pct1"];
  }

  it("makes an ordinary owned mock of servable, unseen questions — the pressed topic first", async () => {
    bank();
    const res = await POST(press(BODY));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { result: string; mock: { id: string; questionCount: number; reused: boolean } };
    expect(data.result).toBe("ok");
    expect(data.mock.reused).toBe(false);
    const m = db.mocks[0];
    expect(m).toMatchObject({ id: data.mock.id, userId: "u1", examId: "e1", type: "CHALLENGE", generatedBy: FRESH_GENERATED_BY });
    expect(FRESH_GENERATED_BY).not.toBe(LEGACY_ON_DEMAND_GENERATED_BY);
    expect(m.questionIds).toHaveLength(10);
    expect(servedPaperIds(m, db.questions)).toEqual(m.questionIds);
    for (const id of m.questionIds) {
      expect(db.seen).not.toContain(id);
      expect(id).not.toMatch(/^draft|^withdrawn/);
    }
    // 6 unseen on the pressed topic (with its sub-topic), then 4 from the weak topic Ratio.
    const cfg = m.config as { perTier: number[]; fromTopic: number; questionCount: number; requestType: string };
    expect(cfg).toMatchObject({ fromTopic: 6, questionCount: 10, requestType: "FRESH_CHECKED" });
    expect(cfg.perTier.slice(0, 2)).toEqual([6, 4]);
    expect(m.title).toBe("Fresh practice — Percentage and more SSC CGL (10 Qs)");
    expect(vi.mocked(anthropic.messages.create)).not.toHaveBeenCalled();
  });

  it("a broken pool filter still serves no draft, no withdrawn, no unchecked and no other-language question", async () => {
    bank();
    for (let k = 0; k < 10; k++) {
      const u = row(`unchecked${k}`, "t-pct", 300 + k, { validatedBy: "system:pyq-pattern", metadata: null });
      const t = row(`telugu${k}`, "t-pct", 400 + k, { language: "TE" });
      db.questions.set(u.id, u);
      db.questions.set(t.id, t);
    }
    db.ignoreWhere = true;
    const res = await POST(press(BODY));
    const m = db.mocks[0];
    expect(res.status).toBe(200);
    expect(m.questionIds.every((id) => !/^draft|^withdrawn|^unchecked|^telugu/.test(id))).toBe(true);
    expect(servedPaperIds(m, db.questions)).toHaveLength(10);
    expect((m.config as { pool: { total: number } }).pool.total).toBe(32);
  });

  it("a validated question with no answer-check record is never picked and not counted in M (the too-few line)", async () => {
    bank();
    // Validated at insert or in bulk, never through the check: a set's worth on the pressed topic.
    for (let k = 0; k < 12; k++) {
      const r = row(`bulk${k}`, "t-pct", 300 + k, { validatedBy: "system:pyq-pattern", metadata: null });
      db.questions.set(r.id, r);
    }
    // Half a record is no record: the factory stamp without factoryVerify, and factoryVerify without the stamp.
    db.questions.set("half0", row("half0", "t-pct", 400, { metadata: null }));
    db.questions.set("half1", row("half1", "t-pct", 401, { validatedBy: "system:bulk:overnight" }));
    await POST(press(BODY));
    const m = db.mocks[0];
    expect(m.questionIds.some((id) => /^bulk|^half/.test(id))).toBe(false);
    expect((m.config as { pool: { total: number; practised: number } }).pool).toEqual({ total: 32, practised: 2 });
    // Too few: "You have already seen N of the M answer-checked questions" — M is the 32 checked rows.
    db.mocks.length = 0;
    const checkedIds = [...db.questions.values()]
      .filter((q) => q.validated && !q.tags.includes("rejected") && q.validatedBy === PASSED.validatedBy && q.metadata)
      .map((q) => q.id);
    expect(checkedIds).toHaveLength(32);
    db.seen = [...checkedIds.slice(0, 29), "bulk0", "bulk1"];
    const data = await (await POST(press(BODY))).json();
    expect(data).toMatchObject({ result: "too-few", practised: 29, total: 32, available: 3 });
    expect(db.mocks).toHaveLength(0);
  });

  it("the pool read computes answerChecked with the answer check's own rule and keeps to the paper's language", async () => {
    const RULE = `(COALESCE(q."validatedBy", '') LIKE 'factory:%' AND COALESCE(q.metadata ? 'factoryVerify', FALSE))`;
    // The same text as the hub FAQ's count (src/lib/exam-answer-check.ts), which counts its complement.
    expect(src("src/lib/exam-answer-check.ts")).toContain(`NOT ${RULE}`);
    expect(code("src/app/api/mocks/fresh/route.ts")).toContain(`${RULE} AS "answerChecked"`);
    bank();
    await POST(press({ ...BODY, attemptId: undefined }));
    expect(db.poolSql!.sql).toMatch(/q\.validated = TRUE AND NOT \(\? = ANY\(q\.tags\)\)/);
    expect(db.poolSql!.sql).toMatch(/q\.language::text = \?/);
    // No attempt to read → EN.
    expect(db.poolSql!.values).toEqual(["e1", "rejected", "EN"]);
  });

  it("an English attempt never gets native-medium rows; a Telugu attempt gets Telugu rows", async () => {
    bank();
    for (let k = 0; k < 12; k++) {
      const r = row(`te${k}`, "t-pct", 500 + k, { language: "TE" });
      db.questions.set(r.id, r);
    }
    // The English paper the student just took.
    db.attempt = { ...db.attempt!, mock: { examId: "e1", questionIds: ["pct0", "pct1", "rat0"] } };
    await POST(press(BODY));
    expect(db.mocks[0].questionIds).toHaveLength(10);
    expect(db.mocks[0].questionIds.some((id) => id.startsWith("te"))).toBe(false);
    expect((db.mocks[0].config as { language: string }).language).toBe("EN");
    expect(db.poolSql!.values.at(-1)).toBe("EN");
    // A Telugu paper (its persisted skeleton: three Telugu, one English) → a Telugu set, and M counts Telugu rows only.
    db.mocks.length = 0;
    db.attempt = {
      ...db.attempt!,
      answers: ["te0", "te1", "te2", "pct0"].map((questionId, slot) => ({ questionId, slot })),
      mock: { examId: "e1", questionIds: ["pct0"] },
    };
    db.seen = ["pct0", "pct1", "te0", "te1", "te2"];
    await POST(press(BODY));
    const m = db.mocks[0];
    expect(m.questionIds).toHaveLength(9);
    expect(m.questionIds.every((id) => id.startsWith("te"))).toBe(true);
    expect(m.config).toMatchObject({ language: "TE", pool: { total: 12, practised: 3 } });
  });

  it("only the student's own attempt on this exam steers the scope", async () => {
    bank();
    db.attempt = { ...db.attempt!, userId: "someone-else" };
    await POST(press(BODY));
    // Without the weak topics, the pressed topic's subject (Ratio + SI) is the next tier.
    expect((db.mocks[0].config as { perTier: number[] }).perTier).toEqual([6, 4, 0]);
    db.mocks.length = 0;
    db.attempt = { ...db.attempt!, userId: "u1", mock: { examId: "another-exam" } };
    await POST(press(BODY));
    expect((db.mocks[0].config as { perTier: number[] }).perTier).toEqual([6, 4, 0]);
  });

  it("too few unseen: no mock, the honest numbers and the links", async () => {
    bank();
    db.seen = [...db.questions.keys()].filter((id) => !/^draft|^withdrawn/.test(id)).slice(0, 28); // 32 checked, 4 left
    const res = await POST(press(BODY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      result: "too-few",
      practised: 28,
      total: 32,
      available: 4,
      exam: { code: "SSC_CGL", shortName: "SSC CGL" },
      links: { topics: "/exams/SSC_CGL#syllabus", pyq: "/exams/SSC_CGL#pyqs" },
    });
    expect(vi.mocked(prisma.mock.create)).not.toHaveBeenCalled();
    expect(db.mocks).toHaveLength(0);
  });

  it("an exam with no checked question at all: too few, no mock", async () => {
    seed([row("draft0", "t-pct", 1, { validated: false })]);
    const data = await (await POST(press(BODY))).json();
    expect(data).toMatchObject({ result: "too-few", practised: 0, total: 0, links: { pyq: null } });
    expect(db.mocks).toHaveLength(0);
  });

  it("a set not yet submitted comes back before anything is picked: in progress, not started, or discarded", async () => {
    bank();
    await POST(press(BODY));
    const first = db.mocks[0];
    // The press went into the player (/mocks/[id] made the attempt at once), then back to results.
    db.openMock = { id: first.id, title: String(first.title), questionIds: [...first.questionIds], attempts: [{ id: "att-1" }] };
    db.rawSql = [];
    vi.mocked(prisma.topic.findMany).mockClear();
    const again = await (await POST(press(BODY))).json();
    expect(again).toEqual({ result: "ok", mock: { id: first.id, title: first.title, questionCount: 10, reused: true } });
    expect(db.mocks).toHaveLength(1);
    expect(vi.mocked(prisma.mock.create)).toHaveBeenCalledTimes(1);
    // Nothing was picked: no scope read, no pool read, no seen read.
    expect(db.rawSql).toEqual([]);
    expect(vi.mocked(prisma.topic.findMany)).not.toHaveBeenCalled();
    // The lookup: this student's, this exam's fresh sets that no attempt has submitted, newest first.
    expect(vi.mocked(prisma.mock.findFirst).mock.calls.at(-1)![0]).toMatchObject({
      where: {
        userId: "u1",
        examId: "e1",
        generatedBy: FRESH_GENERATED_BY,
        attempts: { none: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } },
      },
      orderBy: { createdAt: "desc" },
    });
    // Not started, or discarded (no attempt in progress): it comes back while its paper can still start.
    db.openMock = { ...db.openMock!, attempts: [] };
    expect(await (await POST(press(BODY))).json()).toMatchObject({ result: "ok", mock: { id: first.id, reused: true, questionCount: 10 } });
    expect(db.mocks).toHaveLength(1);
  });

  it("an unstarted set that can no longer start (questions withdrawn since) is passed over: a new set is made", async () => {
    bank();
    db.questions.get("si0")!.tags = ["rejected"];
    db.questions.get("si1")!.tags = ["rejected"];
    db.openMock = { id: "m-old", title: "old", questionIds: ["si0", "si1", "si2", "si3", "si4", "si5"], attempts: [] };
    const data = await (await POST(press(BODY))).json();
    expect(data).toMatchObject({ result: "ok", mock: { reused: false } });
    expect(data.mock.id).not.toBe("m-old");
    expect(db.mocks).toHaveLength(1);
  });

  it("two presses at once make one set: the lookup is repeated under a per-student, per-exam lock before the create", async () => {
    bank();
    const otherTab: OpenMock = {
      id: "m-other-tab",
      title: "Fresh practice — Percentage and more SSC CGL (10 Qs)",
      questionIds: ["pct2", "pct3", "pct4", "pct5", "pct6", "pct7", "rat0", "rat1", "rat2", "rat3"],
      attempts: [],
    };
    // Nothing open at the first look; the other tab's set exists by the time the lock is held.
    (prisma.mock.findFirst as unknown as Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(otherTab);
    const data = await (await POST(press(BODY))).json();
    expect(data).toMatchObject({ result: "ok", mock: { id: "m-other-tab", reused: true, questionCount: 10 } });
    expect(vi.mocked(prisma.mock.create)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledTimes(1);
    const calls = (prisma.$queryRaw as unknown as Mock).mock.calls;
    const lock = calls.find((c) => Array.from(c[0] as TemplateStringsArray).join("?").includes("pg_advisory_xact_lock"));
    expect(lock?.slice(1)).toEqual(["fresh-set:u1:e1"]);
    // The lock is taken after the pick (the pool and seen reads come first).
    expect(db.rawSql.findIndex((q) => q.includes("pg_advisory_xact_lock"))).toBe(db.rawSql.length - 1);
  });

  it("signed out → 401; unknown or school exam → 404; a bad body → 400 with the parser's words", async () => {
    db.session = null;
    expect((await POST(press(BODY))).status).toBe(401);
    db.session = { user: { id: "u1" } };
    expect((await POST(press({ ...BODY, examCode: "NCERT_C05" }))).status).toBe(404);
    const bad = await POST(press({ examCode: "SSC_CGL" }));
    expect(bad.status).toBe(400);
    expect(String((await bad.json()).error)).toMatch(/^Invalid body: /);
    expect(db.mocks).toHaveLength(0);
  });

  it("the route looks the exam up with realExamKey and reads seen from every attempt, all time", () => {
    const r = code("src/app/api/mocks/fresh/route.ts");
    expect(r).toMatch(/where: realExamKey\(\{ code: body\.examCode \}\)/);
    expect(r).toMatch(/unnest\(m\."questionIds"\)/);
    expect(r).toMatch(/jsonb_array_elements/);
    expect(r).not.toMatch(/startedAt/);
    expect(r).toMatch(/q\.validated = TRUE AND NOT \(\$\{WITHDRAWN_TAG\} = ANY\(q\.tags\)\)/);
  });
});

// ── 3. No AI on this path ───────────────────────────────────────────────

describe("no model call on the fresh path", () => {
  const AI_IMPORT = /from\s+["'](?:@\/lib\/ai(?:\/[^"']*)?|@anthropic-ai\/[^"']*|\.\.?\/[^"']*ai\/[^"']*)["']/;

  it("the route, the picker and the card import nothing from the AI layer", () => {
    for (const p of [
      "src/app/api/mocks/fresh/route.ts",
      "src/lib/fresh-set.ts",
      "src/lib/fresh-set-copy.ts",
      "src/app/attempts/[id]/results/FreshQuestionsButton.tsx",
    ]) {
      expect(code(p), p).not.toMatch(AI_IMPORT);
      expect(code(p), p).not.toMatch(/anthropic|generateFreshQuestions|recordAiUsage|AI_GENERATED/i);
    }
    expect(code("src/app/api/mocks/fresh/route.ts")).not.toMatch(/question\.create|createMany/);
  });

  it("the on-demand generator is gone and nothing under src/ imports it", () => {
    expect(fs.existsSync(path.join(ROOT, "src/lib/ai/on-demand-questions.ts"))).toBe(false);
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) walk(abs);
        else if (/\.(ts|tsx)$/.test(e.name) && /from\s+["'][^"']*on-demand-questions["']/.test(fs.readFileSync(abs, "utf8"))) hits.push(abs);
      }
    };
    walk(path.join(ROOT, "src"));
    expect(hits).toEqual([]);
  });
});

// ── 4. The card ─────────────────────────────────────────────────────────

describe("the results card", () => {
  const BUTTON = "src/app/attempts/[id]/results/FreshQuestionsButton.tsx";

  it("the too-few line is the founder's sentence, with the numbers and the exam filled in", () => {
    const en = freshSetCopy("en");
    expect(tooFewLine(en, 742, 760, "SSC CGL")).toBe(
      "You have already seen 742 of the 760 answer-checked questions for SSC CGL in your mocks. More are added after they pass the answer check.",
    );
    expect(tooFewLine(en, 0, 0, "SSC CGL")).toBe(
      "There are no answer-checked questions for SSC CGL right now. More are added after they pass the answer check.",
    );
    expect(freshSetCopy("ta")).toBe(FRESH_SET_COPY.en);
  });

  it("en, hi and te carry every line with the same slots, and hi/te are their own words", () => {
    const keys = Object.keys(FRESH_SET_COPY.en).sort();
    const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const loc of ["hi", "te"] as const) {
      expect(Object.keys(FRESH_SET_COPY[loc]).sort()).toEqual(keys);
      for (const k of keys as (keyof typeof FRESH_SET_COPY.en)[]) {
        expect(slots(FRESH_SET_COPY[loc][k]), `${loc}.${k}`).toEqual(slots(FRESH_SET_COPY.en[k]));
        expect(FRESH_SET_COPY[loc][k], `${loc}.${k}`).not.toBe(FRESH_SET_COPY.en[k]);
      }
    }
    expect(slots(FRESH_SET_COPY.en.tooFew)).toEqual(["{exam}", "{m}", "{n}"]);
    expect(fillFresh("{a} {b}", { a: 1 })).toBe("1 {b}");
  });

  it("the card no longer promises AI-written questions", () => {
    expect(Object.values(FRESH_SET_COPY.en).join(" ")).not.toMatch(/Brand-new|tuned to your level|Made for you|Generate|written by AI/i);
    expect(code(BUTTON)).not.toMatch(/Brand-new|tuned to your level|Made for you|Making your questions|Generate \{count\}/);
    expect(FRESH_SET_COPY.en.body).toMatch(/Answer-checked questions you have not seen yet/);
  });

  it("the beacon: CTA_CLICKED fresh-generate, step press then result ok | too-few | error, with a count", () => {
    const b = code(BUTTON);
    expect(b).toMatch(/kind: "CTA_CLICKED"/);
    expect(b).toMatch(/cta: "fresh-generate"/);
    expect(b).toMatch(/step: "press", count/);
    for (const r of ["ok", "too-few", "error"]) expect(b).toMatch(new RegExp(`step: "result", result: "${r}", count: `));
    expect(b).toMatch(/navigator\.sendBeacon/);
  });

  it("the card sends its attempt id, shows the too-few line in place of the button, and only hub links", () => {
    const b = code(BUTTON);
    expect(b).toMatch(/useParams/);
    expect(b).toMatch(/attemptId/);
    expect(b).toMatch(/tooFewLine\(copy, tooFew\.practised, tooFew\.total, tooFew\.exam\)/);
    expect(b).toMatch(/startsWith\("\/exams\/"\)/);
  });

  it("never on a school attempt: the card hides itself for any school container code (Class 1-7 included)", () => {
    expect(schoolContainerClassOf("NCERT_C05")).toBe(5);
    expect(schoolContainerClassOf("CISCE_C03")).toBe(3);
    expect(schoolContainerClassOf("SSC_CGL")).toBeNull();
    expect(code(BUTTON)).toMatch(/if \(schoolContainerClassOf\(examCode\) !== null\) return null;/);
  });
});
