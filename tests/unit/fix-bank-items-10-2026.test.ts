// The six bank fixes of 13 Oct 2026 (scripts/fix-bank-items-10-2026.ts):
// the brute force, the coding rule, the selection and its guards, on a fake
// DB — no network, no production database.
//   • brute force: every letter pair of a word, both directions; DOCUMENT
//     has none, CONSTITUTION 9 (6 forward), PRESIDENT 2; the stored keys of
//     DOCUMENT / CONSTITUTION / PRESIDENT disagree with it, the planned ones
//     agree; a stem that does not name the direction is "convention" when the
//     two counts pick different options (reported, never written);
//   • coding: the stored sentence 1 breaks the last-letter + length rule,
//     the fixed one follows it and N12 is satisfaction only;
//   • selection: exact stem within exam and topic, the 13 Oct options and
//     key; a row missing, already fixed, matched twice, held by another id or
//     changed is a problem line, never a guess;
//   • dry run by default, writes nothing; --apply needs --only; unknown flags
//     and groups refused;
//   • apply: the log is on disk ("pending") before the first write; one
//     transaction; a question is only updated (withdrawal = validated false +
//     tag "rejected"); its cached translations are removed (kept with
//     --keep-translations); a row changed since the plan stops the run;
//   • undo puts every field back (metadata null included) and re-creates
//     the removed translations, keeping one made again since.
// The fixture rows are the live rows read on 13 Oct 2026 (SELECT), with the
// old solutions trimmed.
// Run: npx vitest run tests/unit/fix-bank-items-10-2026.test.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import {
  GROUPS,
  LOG_STEM,
  TAG,
  TARGETS,
  applyPlanned,
  askedCode,
  canonical,
  codingRuleBreaks,
  fieldsOf,
  indexNowUrls,
  letterPairs,
  optionCount,
  pairDirectionOf,
  pairSolution,
  pairVerdict,
  pairWordOf,
  parseCli,
  plan,
  run,
  selectTargets,
  type Db,
  type LogFile,
  type Option,
  type Row,
  type TrRow,
} from "../../scripts/fix-bank-items-10-2026";

const NOW = new Date("2026-10-13T06:30:00Z"); // 12:00 IST, the day of the read
const target = (g: string) => TARGETS.find((t) => t.group === g)!;

interface QRow extends Row {
  hints: unknown;
}
function q(group: string, extra: Partial<QRow> = {}): QRow {
  const t = target(group);
  return {
    id: t.id,
    body: t.body,
    options: t.options.map((o) => ({ ...o })),
    answerKey: t.answerKey,
    solution: `old solution of ${group}`,
    validated: true,
    tags: [],
    metadata: group === "document" ? null : { factoryVerify: { at: "2026-09-26T07:01:16.854Z", decision: "ACCEPT", prevKey: t.answerKey } },
    exam: { code: t.exam },
    topic: { code: t.topic },
    hints: null,
    ...extra,
  };
}
/** Other letter-pair rows of the bank (for the report). */
function others(): QRow[] {
  const base = { solution: "s", validated: true, tags: [] as string[], metadata: null, hints: null, topic: { code: "reason.alphabet_test" } };
  return [
    {
      ...base,
      id: "q-question",
      exam: { code: "IBPS_PO" },
      body: "How many such pairs of letters are there in the word 'QUESTION' which have as many letters between them in the word (in both forward and backward directions) as they have between them in the English alphabet?",
      options: [{ key: "A", text: "One" }, { key: "B", text: "Two" }, { key: "C", text: "Three" }, { key: "D", text: "More than three" }],
      answerKey: "C",
    },
    {
      ...base,
      id: "q-master",
      exam: { code: "SBI_CLERK" },
      validated: false,
      body: "How many pairs of letters are there in the word 'MASTER' which have as many letters between them in the word as in the English alphabet?",
      options: [{ key: "A", text: "One" }, { key: "B", text: "Two" }, { key: "C", text: "Three" }, { key: "D", text: "Four" }],
      answerKey: "B",
    },
  ];
}
function seed(): QRow[] {
  return [...GROUPS.map((g) => q(g)), ...others()];
}
function tr(questionId: string, locale: string, extra: Partial<TrRow> = {}): TrRow {
  return { id: `tr-${questionId.slice(-4)}-${locale}`, questionId, locale, body: `old ${locale} stem`, options: [{ key: "A", text: "x" }], solution: `old ${locale} solution`, hints: null, generator: "claude-haiku-4-5/translator-v1-backfill", createdAt: "2026-05-17T17:06:58.978Z", ...extra };
}
function seedTr(): TrRow[] {
  return [
    ...["gu", "hi", "ta", "te"].map((l) => tr(target("document").id, l)),
    tr(target("coding").id, "hi"),
    tr(target("flora").id, "hi"),
    tr(target("flora").id, "mr", { generator: "claude-sonnet-4-5/translator-v1" }),
    tr(target("constitution").id, "hi"),
    tr(target("president").id, "hi"),
  ];
}

/** jsonb keeps its own key order: the fake stores objects with keys reversed. */
function reorder(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(reorder);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().reverse().map((k) => [k, reorder((v as any)[k])]));
  return v;
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function fakeDb(opts: { rows?: QRow[]; trs?: TrRow[]; beforeWrite?: () => void; failOnUpdate?: number } = {}) {
  const rows = opts.rows ?? seed();
  const trs = opts.trs ?? seedTr();
  const calls = { update: 0, delete: 0, create: 0 };
  const question = {
    findMany: async (a: any) => {
      const inList: string[] | undefined = a?.where?.body?.in;
      const hit = inList ? rows.filter((r) => inList.includes(r.body)) : rows.filter((r) => /pair/i.test(r.body) && /alphabet|between them/i.test(r.body));
      return clone(hit);
    },
    findUnique: async (a: any) => {
      const r = rows.find((x) => x.id === a.where.id);
      return r ? clone(r) : null;
    },
    update: async (a: any) => {
      opts.beforeWrite?.();
      calls.update++;
      if (opts.failOnUpdate && calls.update === opts.failOnUpdate) throw new Error("disk full (test)");
      const r = rows.find((x) => x.id === a.where.id);
      if (!r) throw new Error("no row");
      const d = a.data;
      Object.assign(r, {
        body: d.body,
        options: reorder(clone(d.options)),
        answerKey: d.answerKey,
        solution: d.solution,
        validated: d.validated,
        tags: [...d.tags.set],
        metadata: d.metadata === Prisma.DbNull ? null : reorder(clone(d.metadata)),
      });
      return clone(r);
    },
    delete: async () => {
      throw new Error("question.delete called");
    },
    deleteMany: async () => {
      throw new Error("question.deleteMany called");
    },
  };
  const questionTranslation = {
    findMany: async (a: any) => clone(trs.filter((t) => t.questionId === a.where.questionId).sort((x, y) => (x.locale < y.locale ? -1 : 1))),
    findUnique: async (a: any) => {
      const t = trs.find((x) => x.id === a.where.id);
      return t ? { ...clone(t), createdAt: new Date(t.createdAt) } : null;
    },
    findFirst: async (a: any) => {
      const t = trs.find((x) => x.questionId === a.where.questionId && x.locale === a.where.locale);
      return t ? { id: t.id } : null;
    },
    delete: async (a: any) => {
      opts.beforeWrite?.();
      calls.delete++;
      const i = trs.findIndex((x) => x.id === a.where.id);
      if (i < 0) throw new Error("no translation");
      return trs.splice(i, 1)[0];
    },
    create: async (a: any) => {
      calls.create++;
      if (trs.some((x) => x.questionId === a.data.questionId && x.locale === a.data.locale)) throw new Error("unique (questionId, locale)");
      const d = a.data;
      const t: TrRow = { id: d.id, questionId: d.questionId, locale: d.locale, body: d.body, options: d.options, solution: d.solution, hints: d.hints === Prisma.DbNull ? null : d.hints, generator: d.generator, createdAt: new Date(d.createdAt).toISOString() };
      trs.push(t);
      return t;
    },
    deleteMany: async () => {
      throw new Error("questionTranslation.deleteMany called");
    },
  };
  const mocks = [
    { id: "m-ibps-9", title: "IBPS Clerk — Full Mock 9", userId: null, questionIds: ["x1", target("document").id], _count: { attempts: 0 } },
    { id: "m-user", title: "My quiz", userId: "u1", questionIds: [target("asafjah").id], _count: { attempts: 1 } },
  ];
  const mock = { findMany: async (a: any) => clone(mocks.filter((m) => m.questionIds.includes(a.where.questionIds.has))) };
  const db: any = {
    question,
    questionTranslation,
    mock,
    $transaction: async (fn: (tx: any) => Promise<unknown>) => {
      const snapRows = clone(rows);
      const snapTrs = clone(trs);
      try {
        return await fn(db);
      } catch (e) {
        rows.splice(0, rows.length, ...snapRows);
        trs.splice(0, trs.length, ...snapTrs);
        throw e;
      }
    },
  };
  return { db: db as Db, rows, trs, calls };
}

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fix-bank-items-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});
const logs = () => fs.readdirSync(tmp).map((f) => ({ f, log: JSON.parse(fs.readFileSync(path.join(tmp, f), "utf8")) as LogFile }));
const quiet = { now: NOW, say: () => {} };
const byId = (rows: QRow[], id: string) => rows.find((r) => r.id === id)!;

describe("letter pairs: the brute force", () => {
  it("counts every pair of positions, both directions", () => {
    expect(letterPairs("DOCUMENT").all).toEqual([]);
    const c = letterPairs("CONSTITUTION");
    expect(c.all.map((p) => `${p.a}${p.i}-${p.b}${p.j}`)).toEqual(["C1-N12", "O2-N3", "O2-T7", "O2-U8", "N3-T9", "S4-T5", "T7-U8", "U8-T9", "O11-N12"]);
    expect(c.forward).toHaveLength(6);
    expect(letterPairs("PRESIDENT").all.map((p) => p.a + p.b)).toEqual(["PS", "DE"]);
    expect(letterPairs("QUESTION").all.map((p) => p.a + p.b)).toEqual(["US", "ST", "ON"]);
    const t = letterPairs("TRANSPORT");
    expect([t.all.length, t.forward.length]).toEqual([4, 3]);
    // P(1) and S(4): 2 letters between in the word (R, E) and in the alphabet (Q, R).
    expect(letterPairs("PRESIDENT").all[0]).toMatchObject({ wordBetween: 2, alphaBetween: 2, direction: "forward" });
  });

  it("reads the word, the direction and the option counts from a stem", () => {
    expect(pairWordOf(target("document").body)).toBe("DOCUMENT");
    expect(pairWordOf("How many pairs of letters are there in the word TRANSPORT which have …")).toBe("TRANSPORT");
    expect(pairDirectionOf(target("document").body)).toBe("both");
    expect(pairDirectionOf(target("constitution").body)).toBe("both");
    expect(pairDirectionOf(target("president").body)).toBe("unspecified");
    expect(optionCount("None")).toEqual({ exact: 0 });
    expect(optionCount("3")).toEqual({ exact: 3 });
    expect(optionCount("More than five")).toEqual({ moreThan: 5 });
    expect(optionCount("Cannot be determined")).toBeNull();
  });

  it("the stored keys disagree with the count; the planned ones agree", () => {
    const stored = (g: string) => pairVerdict({ body: target(g).body, options: target(g).options, answerKey: target(g).answerKey })!;
    expect(stored("document")).toMatchObject({ kind: "wrong-key", correctKey: "A", both: 0 });
    expect(stored("constitution")).toMatchObject({ kind: "no-option", both: 9, forwardOnly: 6 });
    expect(stored("president")).toMatchObject({ kind: "no-option", both: 2, forwardOnly: 2 });
    for (const g of ["document", "constitution", "president"]) {
      const t = target(g);
      expect(pairVerdict({ body: t.newBody ?? t.body, options: t.newOptions ?? t.options, answerKey: t.newAnswerKey ?? t.answerKey })).toMatchObject({ kind: "ok" });
      expect(t.check()).toBeNull();
    }
  });

  it("a stem without a direction whose two counts pick different options is 'convention', never a fix", () => {
    const m = others().find((x) => x.id === "q-master")!;
    expect(pairVerdict({ body: m.body, options: m.options as Option[], answerKey: m.answerKey })).toMatchObject({ kind: "convention", correctKey: null, both: 3, forwardOnly: 2 });
    const qn = others().find((x) => x.id === "q-question")!;
    expect(pairVerdict({ body: qn.body, options: qn.options as Option[], answerKey: qn.answerKey })).toMatchObject({ kind: "ok" });
  });

  it("the worked solution lists every pair checked when none qualifies, and the pairs when some do", () => {
    const d = target("document").solution;
    expect(d).toMatch(/^Answer: A \(None\)\./);
    expect(d).toContain("D(1)=4, O(2)=15, C(3)=3, U(4)=21, M(5)=13, E(6)=5, N(7)=14, T(8)=20");
    expect(d).toContain("- D(1) with O, C, U, M, E, N, T: in the word 0, 1, 2, 3, 4, 5, 6; in the alphabet 10, 0, 16, 8, 0, 9, 15.");
    expect(d.match(/^- /gm)).toHaveLength(7);
    expect(d).toMatch(/If you chose A before 13 Oct 2026, your answer was right\./);
    const c = target("constitution").solution;
    expect(c).toContain("these 9 pairs qualify");
    expect(c).toContain("- C(1) and N(12): 10 letters between in the word, 10 in the alphabet (forward).");
    expect(c).toContain("(Counting the forward direction only would give 6.)");
    expect(target("president").solution).toContain("(Counting the forward direction only gives the same pairs.)");
    expect(pairSolution("TOWARDS", "unspecified", { key: "B", text: "Two" }, "x")).toContain("these 2 pairs qualify");
  });
});

describe("letter + number coding", () => {
  it("the stored sentence 1 breaks the last-letter + length rule; the fixed stem follows it", () => {
    expect(codingRuleBreaks(target("coding").body)).toEqual([
      { word: "customer", printed: "T8", rule: "R8" },
      { word: "satisfaction", printed: "N10", rule: "N12" },
    ]);
    expect(codingRuleBreaks(target("coding").newBody!)).toEqual([]);
    expect(askedCode(target("coding").body)).toBe("N10");
    expect(askedCode(target("coding").newBody!)).toBe("N12");
    expect(target("coding").check()).toBeNull();
    // Only the two codes and the asked code change.
    expect(target("coding").newBody!.replace("R8 N12", "T8 N10").replace("'N12' stand", "'N10' stand")).toBe(target("coding").body);
  });
});

describe("the six targets", () => {
  it("each names its row, exact stem, a reason and a correction line; history rows cite the true dates", () => {
    expect(TARGETS.map((t) => t.group)).toEqual([...GROUPS]);
    expect(new Set(TARGETS.map((t) => t.id)).size).toBe(6);
    for (const t of TARGETS) {
      expect(t.why.length).toBeGreaterThan(40);
      expect(t.solution).toContain("13 Oct 2026");
      expect(t.solution).not.toMatch(/\b(wait|let me re-?check|hmm)\b/i);
    }
    expect(target("asafjah").action).toBe("withdraw");
    expect(target("asafjah").solution).toMatch(/1713 by Emperor Farrukhsiyar/);
    expect(target("asafjah").solution).toMatch(/Muhammad Shah became emperor in 1719/);
    expect(target("flora").solution).toMatch(/On 21 November 1955/);
    expect(target("flora").newBody).not.toMatch(/195\d/);
    expect(target("flora").solution).not.toMatch(/Over 100 people were killed in this/);
  });
});

describe("selection: exact stem, never guessed", () => {
  it("picks all six rows as read on 13 Oct", () => {
    const { picks, problems } = selectTargets(seed(), [...GROUPS]);
    expect(problems).toEqual([]);
    expect(picks.map((p) => p.row.id)).toEqual(TARGETS.map((t) => t.id));
  });

  it("a missing, already fixed, doubled, re-homed or changed row is a problem line", () => {
    const rows = seed();
    byId(rows, target("document").id).answerKey = "A"; // changed since the read
    byId(rows, target("coding").id).body = target("coding").newBody!; // already fixed
    rows.push({ ...q("flora"), id: "flora-copy" }); // matched twice
    byId(rows, target("president").id).id = "someone-else"; // another id holds the stem
    byId(rows, target("asafjah").id).tags = [WITHDRAWN_TAG]; // already withdrawn
    rows.splice(rows.findIndex((r) => r.id === target("constitution").id), 1); // missing
    const { picks, problems } = selectTargets(rows, [...GROUPS]);
    expect(picks).toEqual([]);
    const text = problems.join("\n");
    expect(text).toMatch(/document: options or key changed since the 13 Oct read/);
    expect(text).toMatch(/coding: the new stem is already in place/);
    expect(text).toMatch(/flora: 2 rows match the stem/);
    expect(text).toMatch(/president: the stem is held by someone-else/);
    expect(text).toMatch(/asafjah: already out of the pools/);
    expect(text).toMatch(/constitution: no SBI_PO reason.alphabet_test row with the stem/);
    expect(problems.every((p) => p.endsWith("skipped"))).toBe(true);
  });

  it("the same stem in another exam or topic is not the target", () => {
    const rows = [{ ...q("document"), exam: { code: "SBI_CLERK" } }];
    expect(selectTargets(rows, ["document"]).picks).toEqual([]);
  });
});

describe("the command line: dry run by default", () => {
  it("no flag is a dry run of all six; --apply needs --only", () => {
    expect(parseCli([])).toMatchObject({ apply: false, groups: [...GROUPS], only: "all" });
    expect(parseCli(["--apply", "--only", "document,flora"])).toMatchObject({ apply: true, groups: ["document", "flora"] });
    expect(() => parseCli(["--apply"])).toThrow(/--apply needs --only/);
    expect(() => parseCli(["--only", "everything"])).toThrow(/unknown group/);
    expect(() => parseCli(["--force"])).toThrow(/unknown argument/);
    expect(() => parseCli(["--only"])).toThrow(/needs a value/);
    expect(() => parseCli(["--undo", "x.json", "--only", "all"])).toThrow(/--undo takes the log file only/);
  });

  it("a dry run writes nothing and no log, and prints the new solutions and the pair report", async () => {
    const { db, calls } = fakeDb();
    const lines: string[] = [];
    const r = await run([], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    expect(r.applied).toBe(false);
    expect(r.planned).toHaveLength(6);
    expect(calls).toEqual({ update: 0, delete: 0, create: 0 });
    expect(fs.readdirSync(tmp)).toEqual([]);
    const out = lines.join("\n");
    expect(out).toMatch(/DRY RUN \(nothing is written\)/);
    expect(out).toMatch(/\[asafjah\] WITHDRAW \+ REWRITE SOLUTION/);
    expect(out).toMatch(/translations removed .*gu .*hi .*ta .*te/);
    expect(out).toMatch(/"IBPS Clerk — Full Mock 9" slot 2, 0 attempt\(s\)/);
    expect(out).toMatch(/convention .*MASTER/);
    expect(out).toMatch(/https:\/\/shishya\.in\/hi\/exams\/IBPS_CLERK\/topics\/reason\.alphabet_test/);
  });
});

describe("apply: one transaction, undo log first, questions only updated", () => {
  it("--only document re-keys it, rebuilds the solution and removes its 4 cached translations; the log is pending before the write", async () => {
    let statusAtFirstWrite: string | null = null;
    const { db, rows, trs } = fakeDb({
      beforeWrite: () => {
        if (statusAtFirstWrite === null) statusAtFirstWrite = logs()[0]?.log.status ?? "no log";
      },
    });
    const r = await run(["--apply", "--only", "document"], db, { ...quiet, logDir: tmp });
    expect(r.applied).toBe(true);
    expect(statusAtFirstWrite).toBe("pending");
    const d = byId(rows, target("document").id);
    expect(d).toMatchObject({ answerKey: "A", validated: true, solution: target("document").solution });
    expect(d.metadata).toMatchObject({ rekeyedBy: TAG, rekeyedFrom: "C", bankFix: { by: TAG, group: "document", prevAnswerKey: "C", prevSolution: "old solution of document" } });
    expect(trs.filter((t) => t.questionId === d.id)).toEqual([]);
    expect(trs).toHaveLength(seedTr().length - 4);
    // Nothing else moved.
    for (const g of GROUPS.filter((x) => x !== "document")) expect(byId(rows, target(g).id)).toEqual(q(g));
    const [{ f, log }] = logs();
    expect(f).toMatch(new RegExp(`^${LOG_STEM}\\.document\\.2026-10-13T06-30-00-000Z\\.json$`));
    expect(log).toMatchObject({ kind: "apply", status: "applied", only: "document" });
    expect(log.entries[0].translations.map((t) => t.locale)).toEqual(["gu", "hi", "ta", "te"]);
    expect(log.entries[0].before.metadata).toBeNull();
  });

  it("withdraws asafjah (validated false, tag rejected), fixes the codes, options and stems; a second run finds nothing to do", async () => {
    const { db, rows } = fakeDb();
    await run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp });
    const a = byId(rows, target("asafjah").id);
    expect(a).toMatchObject({ validated: false, tags: [WITHDRAWN_TAG], answerKey: "C" });
    expect(a.metadata).toMatchObject({ rejectedBy: TAG, factoryVerify: { decision: "ACCEPT" } });
    expect(byId(rows, target("coding").id)).toMatchObject({ body: target("coding").newBody, answerKey: "B", validated: true });
    expect(byId(rows, target("flora").id)).toMatchObject({ body: target("flora").newBody, answerKey: "B" });
    expect(canonical(byId(rows, target("constitution").id).options)).toBe(canonical(target("constitution").newOptions));
    expect(canonical(byId(rows, target("president").id).options)).toBe(canonical(target("president").newOptions));
    const again = await run([], db, { ...quiet, logDir: tmp });
    expect(again.planned).toEqual([]);
    expect(again.problems).toHaveLength(6);
  });

  it("--keep-translations leaves the cache", async () => {
    const { db, trs, calls } = fakeDb();
    await run(["--apply", "--only", "all", "--keep-translations"], db, { ...quiet, logDir: tmp });
    expect(trs).toHaveLength(seedTr().length);
    expect(calls.delete).toBe(0);
    expect(calls.update).toBe(6);
  });

  it("a failed write rolls the transaction back and leaves the log 'failed'", async () => {
    const { db, rows, trs } = fakeDb({ failOnUpdate: 3 });
    await expect(run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp })).rejects.toThrow(/disk full/);
    expect(rows).toEqual(seed());
    expect(trs).toEqual(seedTr());
    expect(logs()[0].log.status).toBe("failed");
  });

  it("a row or translation changed since the plan stops the whole run", async () => {
    for (const change of ["question", "translation"] as const) {
      const { db, rows, trs } = fakeDb();
      const { picks } = selectTargets(rows, [...GROUPS]);
      const trMap = new Map<string, TrRow[]>();
      for (const t of clone(trs)) trMap.set(t.questionId, [...(trMap.get(t.questionId) ?? []), t]);
      const planned = plan(picks, trMap, NOW, false);
      if (change === "question") byId(rows, target("flora").id).solution = "edited by hand after the plan";
      else trs.find((t) => t.locale === "mr")!.solution = "re-translated after the plan";
      const snapshot = JSON.stringify({ rows, trs });
      const file = path.join(tmp, `${change}.json`);
      await expect(applyPlanned(db, planned, file, "all", () => {})).rejects.toThrow(/changed since the plan/);
      expect(JSON.stringify({ rows, trs })).toBe(snapshot);
      expect((JSON.parse(fs.readFileSync(file, "utf8")) as LogFile).status).toBe("failed");
    }
  });

  it("deletes only cached translations: no question delete, no deleteMany, no raw write", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "scripts/fix-bank-items-10-2026.ts"), "utf8");
    const deletes = [...src.matchAll(/(\w+)\.(delete|deleteMany|create|createMany)\s*\(/g)].map((m) => `${m[1]}.${m[2]}`);
    expect(deletes).toEqual(["questionTranslation.delete", "questionTranslation.create"]);
    expect(src).not.toMatch(/DELETE\s+FROM/i);
    expect(src).not.toMatch(/\$executeRaw/);
  });
});

describe("undo", () => {
  it("is a dry run without --apply; with it every question and translation goes back exactly", async () => {
    const { db, rows, trs } = fakeDb();
    await run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp });
    const [{ f }] = logs();
    const file = path.join(tmp, f);
    await run(["--undo", file], db, { ...quiet, logDir: tmp });
    expect(byId(rows, target("document").id).answerKey).toBe("A");
    await run(["--undo", file, "--apply"], db, { ...quiet, logDir: tmp });
    // Field by field (the fake reorders jsonb keys, as Postgres does).
    for (const g of GROUPS) expect(canonical(fieldsOf(byId(rows, target(g).id)))).toBe(canonical(fieldsOf(q(g))));
    expect(byId(rows, target("document").id).metadata).toBeNull();
    const sortTr = (x: TrRow[]) => canonical([...x].sort((a, b) => (a.id < b.id ? -1 : 1)));
    expect(sortTr(trs)).toBe(sortTr(seedTr()));
    const undoLog = logs().find((x) => x.f.includes(".undo."))!.log;
    expect(undoLog).toMatchObject({ kind: "undo", status: "applied", undoOf: file });
  });

  it("keeps a translation made again since the fix, and skips a question changed since", async () => {
    const { db, rows, trs } = fakeDb();
    await run(["--apply", "--only", "document,flora"], db, { ...quiet, logDir: tmp });
    const [{ f }] = logs();
    trs.push(tr(target("document").id, "hi", { id: "tr-new-hi", solution: "fresh translation of the fixed row", createdAt: "2026-10-14T03:00:00.000Z" }));
    byId(rows, target("flora").id).solution = "hand edit";
    const lines: string[] = [];
    await run(["--undo", path.join(tmp, f), "--apply"], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    const out = lines.join("\n");
    expect(out).toMatch(/document\] hi: translated again since the fix — the new translation is kept/);
    expect(out).toMatch(/\[flora\]: changed since this script wrote it — skipped/);
    expect(byId(rows, target("document").id).answerKey).toBe("C");
    expect(trs.filter((t) => t.questionId === target("document").id).map((t) => t.id).sort()).toEqual(["tr-new-hi", ...["gu", "ta", "te"].map((l) => tr(target("document").id, l).id)].sort());
    expect(byId(rows, target("flora").id).solution).toBe("hand edit");
  });

  it("refuses a file that is not an applied log of this script", async () => {
    const { db } = fakeDb();
    const bad = path.join(tmp, "other.json");
    fs.writeFileSync(bad, JSON.stringify({ script: "fix-sscgl-stale-answerkey-2026-10", kind: "apply", status: "applied", entries: [] }));
    await expect(run(["--undo", bad], db, { ...quiet, logDir: tmp })).rejects.toThrow(/not an applied log/);
  });
});

describe("IndexNow", () => {
  it("lists each topic page and its hi twin once", () => {
    expect(indexNowUrls([{ exam: "SBI_PO", topic: "reason.alphabet_test" }, { exam: "SBI_PO", topic: "reason.alphabet_test" }])).toEqual([
      "https://shishya.in/exams/SBI_PO/topics/reason.alphabet_test",
      "https://shishya.in/hi/exams/SBI_PO/topics/reason.alphabet_test",
    ]);
  });
});
