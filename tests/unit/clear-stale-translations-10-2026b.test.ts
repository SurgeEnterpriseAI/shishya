// scripts/clear-stale-translations-10-2026b.ts (14 Oct 2026): the rule that
// picks cached translations older than their question's latest recorded
// key / solution change (report sweep, answer-check solution replacement,
// bank fix, hand re-key), the CLI guards, and the write: undo log on disk
// before the transaction, a conditional delete of exactly the logged rows,
// nothing written on any mismatch, and an undo that keeps a newer translation.
// In-memory DB, temp log dir. Run: npx vitest run tests/unit/clear-stale-translations-10-2026b.test.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BANK_FIX_WINDOW_MS,
  correctionsOf,
  DAY_MS,
  judgeRow,
  LOG_STEM,
  parseCli,
  run,
  SAME_WRITE_MS,
  selectStale,
  sweepNotes,
  sweepTime,
  type Db,
  type QRow,
  type ResolveEvent,
  type TrMeta,
} from "../../scripts/clear-stale-translations-10-2026b";

const OPTIONS = ["A", "B", "C", "D"].map((key, i) => ({ key, text: `Option ${i + 1}` }));
const note = (day: string, key: string) => `\n\n[Correction ${day}: answer key corrected to ${key} after student report + independent re-verification. Because ${key}.]`;
const T = (iso: string) => new Date(iso);

function q(id: string, over: Partial<QRow> = {}): QRow {
  return {
    id,
    answerKey: "B",
    solution: `Working for ${id}.`,
    validated: true,
    validatedBy: "factory:verify-v1",
    validatedAt: T("2026-09-01T00:00:00Z"),
    tags: [],
    metadata: null,
    options: OPTIONS,
    exam: { code: "IBPS_PO" },
    ...over,
  };
}
const ev = (questionId: string, resolvedAt: string, resolvedBy = "claude:instant-report"): ResolveEvent => ({ questionId, resolvedBy, resolvedAt: T(resolvedAt) });
const tr = (id: string, questionId: string, createdAt: string, locale = "hi"): TrMeta => ({ id, questionId, locale, generator: "claude-haiku-4-5/translator-v1-backfill", createdAt: T(createdAt) });

describe("the report sweep's note and its time", () => {
  it("reads every note in the solution, in order", () => {
    expect(sweepNotes(`Old.${note("2026-07-23", "A")}${note("2026-08-02", "C")}`)).toEqual([
      { day: "2026-07-23", key: "A" },
      { day: "2026-08-02", key: "C" },
    ]);
    expect(sweepNotes("Correction (13 Oct 2026): the bank fix's line is not a sweep note.")).toEqual([]);
    expect(sweepNotes(null)).toEqual([]);
  });

  it("times a note by the sweep's resolve that UTC day: exact for one resolve, the earliest (a window) for several, the day's start for none", () => {
    const one = sweepTime("2026-07-23", [ev("q", "2026-07-23T10:00:00.120Z"), ev("q", "2026-07-23T10:00:00.120Z")]);
    expect(one).toEqual({ at: T("2026-07-23T10:00:00.120Z"), atFrom: "report resolvedAt", windowMs: 0 });
    const several = sweepTime("2026-07-23", [ev("q", "2026-07-23T15:00:00Z"), ev("q", "2026-07-23T09:00:00Z", "cron:key-sweep")]);
    expect(several).toEqual({ at: T("2026-07-23T09:00:00Z"), atFrom: "earliest resolve that day", windowMs: 6 * 3600 * 1000 });
    // Another day's resolve, an admin's resolve and an unresolved report do not count.
    const none = sweepTime("2026-07-23", [ev("q", "2026-07-22T23:59:00Z"), ev("q", "2026-07-23T12:00:00Z", "admin@shishya.in"), { questionId: "q", resolvedBy: null, resolvedAt: null }]);
    expect(none).toEqual({ at: T("2026-07-23T00:00:00Z"), atFrom: "note day (UTC)", windowMs: DAY_MS + 5 * 60 * 1000 });
    // A resolve a few seconds past midnight still belongs to the note's day.
    expect(sweepTime("2026-07-23", [ev("q", "2026-07-24T00:00:03Z")])?.atFrom).toBe("report resolvedAt");
  });
});

describe("correctionsOf (which recorded changes still stand)", () => {
  it("report sweep: the note's new key, timed by the resolve", () => {
    const r = correctionsOf(q("s1", { answerKey: "A", solution: `Old.${note("2026-07-23", "A")}` }), [ev("s1", "2026-07-23T10:00:00Z")]);
    expect(r.corrections).toEqual([{ source: "report-sweep", kind: "key+note", at: T("2026-07-23T10:00:00Z"), atFrom: "report resolvedAt", windowMs: 0, oldKey: null, newKey: "A" }]);
  });

  it("answer check: a moved key or a replaced solution counts; the same key with the same solution does not", () => {
    const fvAt = "2026-09-26T07:00:00.000Z";
    const moved = q("f1", { answerKey: "C", validatedAt: T("2026-09-26T07:19:51Z"), metadata: { factoryVerify: { keyCorrected: true, at: fvAt, prevKey: "B", prevSolution: "old" } } });
    expect(correctionsOf(moved).corrections).toMatchObject([{ source: "answer-check", kind: "key", at: T("2026-09-26T07:19:51Z"), atFrom: "validatedAt", windowMs: 0, oldKey: "B", newKey: "C" }]);
    const sameKeyNewSolution = q("f2", { answerKey: "B", solution: "A blind solve reaching B.", validatedAt: T("2026-09-26T07:10:00Z"), metadata: { factoryVerify: { keyCorrected: true, at: fvAt, prevKey: "B", prevSolution: "The old, wrong working." } } });
    expect(correctionsOf(sameKeyNewSolution).corrections).toMatchObject([{ source: "answer-check", kind: "solution", atFrom: "validatedAt" }]);
    const unchanged = q("f3", { answerKey: "B", solution: "Same.", metadata: { factoryVerify: { keyCorrected: true, at: fvAt, prevKey: "B", prevSolution: "Same." } } });
    expect(correctionsOf(unchanged).corrections).toEqual([]);
    // validatedAt by someone else, or long after the check: factoryVerify.at, a lower bound with a window.
    const later = q("f4", { answerKey: "C", validatedBy: "admin@shishya.in", validatedAt: T("2026-10-01T00:00:00Z"), metadata: { factoryVerify: { keyCorrected: true, at: fvAt, prevKey: "B" } } });
    expect(correctionsOf(later).corrections).toMatchObject([{ atFrom: "factoryVerify.at", at: T(fvAt), windowMs: SAME_WRITE_MS }]);
    expect(correctionsOf(q("f5", { metadata: { factoryVerify: { keyCorrected: true, prevKey: "A" } } })).untimed).toEqual(["answer check: keyCorrected without at"]);
  });

  it("bank fix and hand re-keys: a re-key made by the bank fix is not counted twice; an untimed re-key is reported", () => {
    const bf = q("b1", { answerKey: "A", metadata: { rekeyedBy: "datafix:fix-bank-items-10-2026", rekeyedFrom: "C", bankFix: { by: "datafix:fix-bank-items-10-2026", at: "2026-10-13T07:29:34.067Z", prevAnswerKey: "C" } } });
    expect(correctionsOf(bf).corrections).toEqual([{ source: "bank-fix", kind: "text", at: T("2026-10-13T07:29:34.067Z"), atFrom: "bankFix.at", windowMs: BANK_FIX_WINDOW_MS, oldKey: "C", newKey: "A" }]);
    const hand = q("h1", { answerKey: "A", metadata: { rekeyedBy: "datafix:sbi-q-fix-sep24", rekeyedFrom: "B" } });
    expect(correctionsOf(hand).corrections).toMatchObject([{ source: "hand-rekey", at: T("2026-09-24T00:00:00+05:30"), atFrom: "tag day", windowMs: DAY_MS }]);
    expect(correctionsOf(q("h2", { answerKey: "A", metadata: { rekeyedBy: "datafix:unknown", rekeyedFrom: "B" } })).untimed).toEqual(["hand re-key datafix:unknown: no recorded time"]);
    // Re-keyed back to where it was: nothing stands.
    expect(correctionsOf(q("h3", { answerKey: "B", metadata: { rekeyedBy: "datafix:sbi-q-fix-sep24", rekeyedFrom: "B" } })).corrections).toEqual([]);
  });
});

describe("judgeRow / selectStale", () => {
  const exact = { source: "report-sweep" as const, kind: "key+note", at: T("2026-07-23T10:00:00Z"), atFrom: "report resolvedAt" as const, windowMs: 0, oldKey: null, newKey: "A" };
  const lower = { source: "answer-check" as const, kind: "solution", at: T("2026-09-26T07:00:00Z"), atFrom: "factoryVerify.at" as const, windowMs: SAME_WRITE_MS, oldKey: "B", newKey: "B" };

  it("stale before a change (attributed to the latest it predates), ambiguous inside a lower bound's window, else kept", () => {
    expect(judgeRow([exact, lower], T("2026-05-17T12:26:27Z"))).toEqual({ stale: lower });
    expect(judgeRow([exact, lower], T("2026-08-01T00:00:00Z"))).toEqual({ stale: lower });
    expect(judgeRow([exact], T("2026-07-23T10:00:00.001Z"))).toBeNull();
    expect(judgeRow([lower], T("2026-09-26T08:00:00Z"))).toEqual({ ambiguous: lower });
    expect(judgeRow([lower], T("2026-09-26T09:00:00.001Z"))).toBeNull();
    expect(judgeRow([], T("2026-01-01T00:00:00Z"))).toBeNull();
  });

  it("selects every row written before the change, served questions first, with the margin", () => {
    const qs = [
      q("s2", { answerKey: "A", validated: false, solution: `Old.${note("2026-07-23", "A")}` }),
      q("s1", { answerKey: "C", solution: `Old.${note("2026-08-21", "C")}` }),
      q("plain"),
    ];
    const events = [ev("s1", "2026-08-21T06:00:00Z"), ev("s2", "2026-07-23T10:00:00Z", "claude:key-sweep")];
    const trs = [
      tr("t1", "s1", "2026-05-17T12:26:27Z", "hi"),
      tr("t2", "s1", "2026-08-21T23:00:00Z", "te"), // after the fix: kept
      tr("t3", "s2", "2026-07-23T03:00:00Z", "kn"),
      tr("t4", "plain", "2026-05-01T00:00:00Z", "hi"), // no change: not even counted
    ];
    const sel = selectStale(qs, trs, events);
    expect(sel.candidates.map((c) => [c.tr.id, c.served, c.correction.source])).toEqual([
      ["t1", true, "report-sweep"],
      ["t3", false, "report-sweep"],
    ]);
    expect(sel.translationsOfThem).toBe(3);
    expect(sel.afterChange).toBe(1);
    expect(sel.ambiguous).toEqual([]);
    expect(sel.questionsWithChange["report-sweep"]).toBe(2);
    expect(sel.nearestBeforeSec).toBe(7 * 3600);
    expect(sel.nearestAfterSec).toBe(17 * 3600);
  });
});

describe("parseCli", () => {
  it("refuses unknown flags, --apply without --max, a bad --max or --only, and --max/--only with --undo", () => {
    expect(parseCli([])).toEqual({ apply: false, max: null, only: null, undoFile: null, logDir: null });
    expect(parseCli(["--apply", "--max", "50", "--only", "report-sweep,answer-check"])).toMatchObject({ apply: true, max: 50, only: ["report-sweep", "answer-check"] });
    expect(() => parseCli(["--force"])).toThrow(/unknown argument/);
    expect(() => parseCli(["--apply"])).toThrow(/--apply needs --max/);
    expect(() => parseCli(["--max", "0"])).toThrow(/positive whole number/);
    expect(() => parseCli(["--max", "--apply"])).toThrow(/--max needs a value/);
    expect(() => parseCli(["--only", "admin"])).toThrow(/--only takes report-sweep/);
    expect(() => parseCli(["--undo", "x.json", "--max", "3"])).toThrow(/--undo takes the log file only/);
    expect(parseCli(["--undo", "x.json", "--apply"])).toMatchObject({ apply: true, undoFile: "x.json" });
  });
});

// ── An in-memory DB that mirrors the queries the script makes ──────────────

interface FullTr {
  id: string;
  questionId: string;
  locale: string;
  body: string;
  options: unknown;
  solution: string;
  hints: unknown;
  generator: string | null;
  createdAt: Date;
}
function makeDb(questions: QRow[], reports: (ResolveEvent & { userId?: string; reason?: string })[], trs: FullTr[]) {
  const state = { trs: trs.map((t) => ({ ...t })), transactions: 0, writes: [] as string[], onTransaction: null as null | (() => void) };
  const pick = (row: any, select: any) => (select ? Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]])) : row);
  const inList = (v: unknown, cond: any) => (cond && typeof cond === "object" && "in" in cond ? cond.in.includes(v) : v === cond);
  const trApi = {
    findMany: async ({ where, select }: any) =>
      state.trs.filter((t) => (where.id ? inList(t.id, where.id) : true) && (where.questionId ? inList(t.questionId, where.questionId) : true)).map((t) => pick(t, select)),
    deleteMany: async ({ where }: any) => {
      const before = state.trs.length;
      state.trs = state.trs.filter((t) => !where.OR.some((o: any) => o.id === t.id && o.createdAt.getTime() === t.createdAt.getTime()));
      state.writes.push(`deleteMany ${before - state.trs.length}`);
      return { count: before - state.trs.length };
    },
    createMany: async ({ data }: any) => {
      for (const d of data) state.trs.push({ ...d });
      state.writes.push(`createMany ${data.length}`);
      return { count: data.length };
    },
  };
  const db: Db = {
    question: {
      findMany: async ({ where, select }: any) => questions.filter((x) => inList(x.id, where.id)).map((x) => (select && Object.keys(select).length === 1 ? { id: x.id } : x)),
    },
    questionReport: {
      // The script asks for these three fields only; the fake would hand back anything it asked for.
      findMany: async ({ where, select }: any) => {
        expect(Object.keys(select).sort()).toEqual(["questionId", "resolvedAt", "resolvedBy"]);
        return reports.filter((r) => inList(r.questionId, where.questionId) && inList(r.resolvedBy, where.resolvedBy)).map((r) => pick(r, select));
      },
    },
    questionTranslation: trApi,
    // The SQL picks questions with a recorded change and a cache row; mirrored here.
    $queryRaw: (async () =>
      questions
        .filter((x) => (/\[Correction 20.*answer key corrected to.*after student report/s.test(x.solution ?? "") || (x.metadata as any)?.factoryVerify?.keyCorrected === true || (x.metadata as any)?.bankFix || (x.metadata as any)?.rekeyedBy) && state.trs.some((t) => t.questionId === x.id))
        .map((x) => ({ id: x.id }))) as Db["$queryRaw"],
    $transaction: (async (fn: any) => {
      state.transactions++;
      state.onTransaction?.();
      const snapshot = state.trs.map((t) => ({ ...t }));
      try {
        return await fn({ questionTranslation: trApi });
      } catch (e) {
        state.trs = snapshot;
        throw e;
      }
    }) as Db["$transaction"],
  };
  return { db, state };
}

const full = (id: string, questionId: string, createdAt: string, locale = "hi"): FullTr => ({
  id,
  questionId,
  locale,
  body: `प्रश्न ${questionId}`,
  options: OPTIONS,
  solution: `पुराना हल ${questionId} — उत्तर B`,
  hints: null,
  generator: "claude-haiku-4-5/translator-v1-backfill",
  createdAt: T(createdAt),
});

describe("run: dry run, apply, undo", () => {
  let tmp: string;
  const quiet = { say: () => {} };
  const fixture = () =>
    makeDb(
      [
        q("s1", { answerKey: "C", solution: `Old.${note("2026-08-21", "C")}` }),
        q("f2", { answerKey: "B", solution: "New blind solve.", validatedAt: T("2026-09-26T07:10:00Z"), metadata: { factoryVerify: { keyCorrected: true, at: "2026-09-26T07:00:00Z", prevKey: "B", prevSolution: "Old working." } } }),
        q("ok"),
      ],
      [
        { questionId: "s1", resolvedBy: "claude:instant-report", resolvedAt: T("2026-08-21T06:00:00Z"), userId: "u-secret", reason: "student text" },
        { questionId: "s1", resolvedBy: "admin@shishya.in", resolvedAt: T("2026-08-25T06:00:00Z") },
      ],
      [full("t1", "s1", "2026-05-17T12:26:27Z", "hi"), full("t2", "s1", "2026-08-22T00:00:00Z", "te"), full("t3", "f2", "2026-06-01T00:00:00Z", "ta"), full("t4", "ok", "2026-01-01T00:00:00Z", "hi")],
    );
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cst-b-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const logs = () => fs.readdirSync(tmp).map((f) => ({ f, log: JSON.parse(fs.readFileSync(path.join(tmp, f), "utf8")) }));

  it("the dry run plans the stale rows and writes nothing", async () => {
    const { db, state } = fixture();
    const lines: string[] = [];
    const r = await run([], db, { say: (s) => lines.push(s), logDir: tmp });
    expect(r.planned).toBe(2);
    expect(r.selection!.candidates.map((c) => c.tr.id)).toEqual(["t3", "t1"]); // both served; question id order
    expect(state.transactions).toBe(0);
    expect(state.writes).toEqual([]);
    expect(fs.readdirSync(tmp)).toEqual([]);
    const out = lines.join("\n");
    expect(out).toMatch(/DRY RUN/);
    expect(out).toMatch(/report-sweep: 1 rows on 1 questions/);
    expect(out).toMatch(/answer-check: 1 rows on 1 questions/);
    expect(out).toMatch(/Not selected: admin-editor edits/);
    expect(out).not.toMatch(/u-secret|student text/);
    expect((await run(["--only", "report-sweep"], db, { ...quiet, logDir: tmp })).planned).toBe(1);
  });

  it("apply: the undo log is on disk before the transaction; exactly the logged rows go", async () => {
    const { db, state } = fixture();
    state.onTransaction = () => {
      const l = logs();
      expect(l).toHaveLength(1);
      expect(l[0].log).toMatchObject({ script: LOG_STEM, kind: "apply", status: "pending" });
      expect(l[0].log.entries.map((e: any) => e.row.id).sort()).toEqual(["t1", "t3"]);
    };
    const r = await run(["--apply", "--max", "10"], db, { ...quiet, logDir: tmp });
    expect(r.applied).toBe(2);
    expect(state.trs.map((t) => t.id).sort()).toEqual(["t2", "t4"]);
    const [{ log }] = logs();
    expect(log.status).toBe("applied");
    // Every full row is in the log, for the undo.
    expect(log.entries.find((e: any) => e.row.id === "t1").row).toMatchObject({ questionId: "s1", locale: "hi", solution: "पुराना हल s1 — उत्तर B", createdAt: "2026-05-17T12:26:27.000Z" });
    expect(log.entries.find((e: any) => e.row.id === "t1")).toMatchObject({ source: "report-sweep", correctionAtFrom: "report resolvedAt", newKey: "C" });
  });

  it("apply --only / --max take a subset, served first", async () => {
    const { db, state } = fixture();
    await run(["--apply", "--max", "1", "--only", "answer-check"], db, { ...quiet, logDir: tmp });
    expect(state.trs.map((t) => t.id).sort()).toEqual(["t1", "t2", "t4"]);
  });

  it("a row changed since the plan stops the run with nothing written (the log says failed)", async () => {
    const { db, state } = fixture();
    state.onTransaction = () => {
      state.trs.find((t) => t.id === "t3")!.solution = "re-translated meanwhile";
    };
    await expect(run(["--apply", "--max", "10"], db, { ...quiet, logDir: tmp })).rejects.toThrow(/changed since the plan — nothing written/);
    expect(state.trs.map((t) => t.id).sort()).toEqual(["t1", "t2", "t3", "t4"]);
    expect(logs()[0].log.status).toBe("failed");
  });

  it("undo re-creates the rows, keeps a translation made since the clear, and writes its own log", async () => {
    const { db, state } = fixture();
    await run(["--apply", "--max", "10"], db, { ...quiet, logDir: tmp });
    const applyLog = path.join(tmp, logs()[0].f);
    // Re-translated in Hindi since the clear: that one is kept.
    state.trs.push({ ...full("t9", "s1", "2026-10-14T12:00:00Z", "hi"), solution: "नया हल — उत्तर C" });
    const dry = await run(["--undo", applyLog], db, { ...quiet, logDir: tmp });
    expect(dry.applied).toBe(0);
    expect(state.trs.map((t) => t.id).sort()).toEqual(["t2", "t4", "t9"]);
    await run(["--undo", applyLog, "--apply"], db, { ...quiet, logDir: tmp });
    expect(state.trs.map((t) => t.id).sort()).toEqual(["t2", "t3", "t4", "t9"]);
    expect(state.trs.find((t) => t.id === "t3")!.createdAt.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    const undoLog = logs().find((x) => x.f.includes(".undo."))!.log;
    expect(undoLog).toMatchObject({ kind: "undo", status: "applied", undoOf: applyLog });
    expect(undoLog.entries.map((e: any) => e.row.id)).toEqual(["t3"]);
    const bad = path.join(tmp, "other.json");
    fs.writeFileSync(bad, JSON.stringify({ script: "something-else", kind: "apply", status: "applied", entries: [] }));
    await expect(run(["--undo", bad], db, { ...quiet, logDir: tmp })).rejects.toThrow(/not an applied log/);
  });
});
