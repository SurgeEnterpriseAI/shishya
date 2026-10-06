// The 6 Oct 2026 date-honesty batch (scripts/fix-tracker-dates-2026-10-06.ts):
// its guards, on a fake DB — no network, no production database.
//   • dry run by default: no flag, or --only <group>, writes nothing (no row,
//     no log); --apply needs exactly one group; unknown flags are refused;
//   • never deletes: the fake DB's delete methods throw, and the script's
//     source holds no delete call;
//   • the undo log is on disk ("pending") before the first write; a failed
//     write rolls the transaction back and marks the log "failed";
//   • --undo is a dry run without --apply; with it every row goes back to its
//     "before" and a created row is archived, never deleted;
//   • stale evidence refuses --apply;
//   • the evidence says what the rows say, and the held exams stay out;
//   • GATE_CSE's exam window no longer leads its title as the CS paper's date
//     (review of 6 Oct), and the list pages whose next-exam cell changes go
//     to the IndexNow list;
//   • MP ESB's probable 19 Nov exam start is not cited (founder question).
// Run: npx vitest run tests/unit/fix-tracker-dates-2026-10-06.test.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SUPPRESSED_SOURCE } from "@/lib/exam-timeline";
import { sourceTier } from "@/lib/official-source";
import {
  ACTIONS,
  EVIDENCE,
  FOUNDER_QUESTIONS,
  GATE_EXAMS,
  GEN_SOURCE,
  HELD_BY_FOUNDER,
  LOG_STEM,
  MAX_READ_AGE_DAYS,
  PROVENANCE,
  applyPlanned,
  hubPreview,
  listCells,
  listPageUrls,
  parseCli,
  plan,
  run,
  simulate,
  staleEvidence,
  type Db,
  type ExamCtx,
  type ListMembership,
  type LogFile,
  type Row,
} from "../../scripts/fix-tracker-dates-2026-10-06";

const NOW = new Date("2026-10-06T06:00:00Z"); // 11:30 IST, the day of the reads
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const GATE_URL = "https://gate2027.iitm.ac.in/important_dates";

type FakeExam = { id: string; code: string; shortName: string; name: string; state: string | null; eligibility: { officialUrl: string | null } };

function seed(): { exams: FakeExam[]; rows: Row[] } {
  const exams: FakeExam[] = [
    { id: "e-gate", code: "GATE_CE", shortName: "GATE CE", name: "Graduate Aptitude Test in Engineering — Civil Engineering", state: null, eligibility: { officialUrl: "https://gate2027.iitm.ac.in/" } },
    { id: "e-cse", code: "GATE_CSE", shortName: "GATE CSE", name: "Graduate Aptitude Test in Engineering — Computer Science", state: null, eligibility: { officialUrl: "https://gate2027.iitm.ac.in/" } },
    { id: "e-nsep", code: "NSEP", shortName: "NSEP", name: "National Standard Examination in Physics (NSEP)", state: null, eligibility: { officialUrl: "https://iapt.org.in" } },
    { id: "e-ioqm", code: "IOQM", shortName: "IOQM", name: "Indian Olympiad Qualifier in Mathematics", state: null, eligibility: { officialUrl: "https://olympiads.hbcse.tifr.res.in" } },
  ];
  const r = (id: string, examId: string, iso: string, kind: string, label: string, extra: Partial<Row> = {}): Row => ({
    id,
    examId,
    label,
    date: day(iso),
    isExamDay: kind === "EXAM",
    source: "official-research:2026-09-27",
    notes: null,
    kind,
    confidence: "official",
    url: GATE_URL,
    createdAt: new Date("2026-09-26T22:12:55Z"),
    archivedAt: null,
    ...extra,
  });
  const rows: Row[] = [
    r("g1", "e-gate", "2026-09-02", "APPLICATION_START", "GATE 2027 online application (GOAPS) opened"),
    r("g2", "e-gate", "2026-09-27", "APPLICATION_END", "GATE 2027 regular registration closes (without late fee)"),
    r("g3", "e-gate", "2026-10-05", "APPLICATION_END", "GATE 2027 extended registration closes (with late fee)"),
    r("g4", "e-gate", "2026-10-14", "CORRECTION_WINDOW", "GATE 2027 application rectification window (14–21 Oct 2026)"),
    r("g5", "e-gate", "2027-02-06", "OTHER", "GATE 2027 exams on 6, 7, 13, 14, 20 and 21 Feb 2027 — the CE paper's own date is not announced yet"),
    r("g6", "e-gate", "2027-03-19", "RESULT", "GATE 2027 results announced"),
    // GATE_CSE as on 6 Oct: the exam window stored as two EXAM rows.
    ...(
      [
        ["c1", "2026-09-27", "APPLICATION_END", "GATE 2027 regular registration closes (without late fee)"],
        ["c2", "2026-10-05", "APPLICATION_END", "GATE 2027 extended registration closes (with late fee)"],
        ["c3", "2026-10-14", "CORRECTION_WINDOW", "GATE 2027 application rectification opens"],
        ["c4", "2026-10-21", "CORRECTION_WINDOW", "GATE 2027 application rectification ends"],
        ["c6", "2027-01-04", "OTHER", "GATE 2027 exam city allotment notification"],
        ["c7", "2027-02-06", "EXAM", "GATE 2027 exams begin"],
        ["c8", "2027-02-21", "EXAM", "GATE 2027 exams end"],
        ["c9", "2027-03-19", "RESULT", "GATE 2027 results announced"],
      ] as const
    ).map(([id, iso, kind, label]) => r(id, "e-cse", iso, kind, label, { source: "official-calendar:2026-27" })),
    r("c5", "e-cse", "2027-01-03", "ADMIT_CARD", "GATE 2027 admit card release", { source: GEN_SOURCE, url: "https://gate2027.iitm.ac.in/", confidence: "expected" }),
    r("p1", "e-nsep", "2026-11-22", "EXAM", "NSEP 2026-27 exam", { source: GEN_SOURCE, url: "https://www.pw.live/olympiad/exams/nsep", notes: "Sunday, 8:30 AM to 10:30 AM" }),
    r("p2", "e-nsep", "2027-02-07", "EXAM", "INPhO 2027 (Stage 2) exam (expected)", { source: GEN_SOURCE, url: null, confidence: "expected" }),
    r("q1", "e-ioqm", "2026-09-06", "EXAM", "IOQM 2026 exam day", { source: GEN_SOURCE, url: "https://www.mtai.org.in/ioqm-2026/" }),
    r("q2", "e-ioqm", "2026-10-15", "RESULT", "IOQM 2026 result (expected)", { source: GEN_SOURCE, url: null, confidence: "expected" }),
  ];
  return { exams, rows };
}

/** An in-memory DB with the Prisma calls the script makes. No delete:
 *  calling one throws. A failed transaction restores the rows. */
function fakeDb(opts: { beforeWrite?: () => void; failOnUpdate?: number } = {}) {
  const { exams, rows } = seed();
  const calls = { update: 0, create: 0 };
  let n = 0;
  const copy = (x: Row): Row => ({ ...x });
  const where = (w: Record<string, any>) => (x: Row) => {
    if (w.examId !== undefined && x.examId !== w.examId) return false;
    if (w.archivedAt === null && x.archivedAt) return false;
    if (typeof w.source === "string" && x.source !== w.source) return false;
    if (w.date instanceof Date && x.date.getTime() !== w.date.getTime()) return false;
    if (w.date?.gte && x.date.getTime() < w.date.gte.getTime()) return false;
    return true;
  };
  const examImportantDate = {
    findMany: async (a: any) => {
      let out = rows.filter(where(a?.where ?? {})).sort((x, y) => x.date.getTime() - y.date.getTime() || (x.id < y.id ? -1 : 1));
      if (a?.take) out = out.slice(0, a.take);
      return out.map(copy);
    },
    findUnique: async (a: any) => {
      const x = rows.find((y) => y.id === a.where.id);
      return x ? copy(x) : null;
    },
    update: async (a: any) => {
      opts.beforeWrite?.();
      calls.update++;
      if (opts.failOnUpdate && calls.update === opts.failOnUpdate) throw new Error("disk full (test)");
      const x = rows.find((y) => y.id === a.where.id);
      if (!x) throw new Error("no row");
      Object.assign(x, a.data);
      return copy(x);
    },
    create: async (a: any) => {
      opts.beforeWrite?.();
      calls.create++;
      const id = `new${++n}`;
      rows.push({ id, createdAt: new Date(), archivedAt: null, ...a.data });
      return { id };
    },
    delete: async () => {
      throw new Error("delete called");
    },
    deleteMany: async () => {
      throw new Error("deleteMany called");
    },
  };
  const exam = {
    findMany: async (a: any) => exams.filter((e) => a.where.code.in.includes(e.code)),
    findUniqueOrThrow: async (a: any) => {
      const e = exams.find((x) => x.code === a.where.code);
      if (!e) throw new Error("no exam");
      return { id: e.id };
    },
  };
  const db = {
    exam,
    examImportantDate,
    $transaction: async (fn: (tx: any) => Promise<unknown>) => {
      const snapshot = rows.map(copy);
      try {
        return await fn(db);
      } catch (e) {
        rows.splice(0, rows.length, ...snapshot);
        throw e;
      }
    },
  };
  return { db: db as unknown as Db, rows, calls };
}

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fix-dates-1006-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});
const logs = () => fs.readdirSync(tmp).map((f) => ({ f, log: JSON.parse(fs.readFileSync(path.join(tmp, f), "utf8")) as LogFile }));
const quiet = { now: NOW, say: () => {} };

describe("the command line: dry run by default", () => {
  it("no flag, or one group, is a dry run; --apply needs exactly one group", () => {
    expect(parseCli([])).toMatchObject({ apply: false, only: "all", undoFile: null });
    expect(parseCli(["--only", "gate"])).toMatchObject({ apply: false, only: "gate" });
    expect(parseCli(["--apply", "--only", "olympiad"])).toMatchObject({ apply: true, only: "olympiad" });
    expect(() => parseCli(["--apply"])).toThrow(/--only/);
    expect(() => parseCli(["--apply", "--only", "all"])).toThrow(/one group at a time/);
    expect(() => parseCli(["--only", "fix"])).toThrow();
  });

  it("refuses unknown flags and flags without a value", () => {
    expect(() => parseCli(["--aply", "--only", "gate"])).toThrow(/unknown argument/);
    expect(() => parseCli(["--release", "NSTSE"])).toThrow(/unknown argument/);
    expect(() => parseCli(["--only"])).toThrow(/needs a value/);
  });

  it("--undo is a dry run unless --apply, and takes no group", () => {
    expect(parseCli(["--undo", "x.json"])).toMatchObject({ apply: false, undoFile: "x.json" });
    expect(parseCli(["--undo", "x.json", "--apply"])).toMatchObject({ apply: true, undoFile: "x.json" });
    expect(() => parseCli(["--undo", "x.json", "--only", "gate"])).toThrow();
  });

  it("a dry run (all groups, or one) writes no row and no log", async () => {
    for (const argv of [[], ["--only", "gate"], ["--only", "olympiad"], ["--only", "cite"]]) {
      const { db, calls } = fakeDb();
      const out = await run(argv, db, { ...quiet, logDir: tmp });
      expect(out.applied).toBe(false);
      expect(calls).toEqual({ update: 0, create: 0 });
    }
    expect(fs.readdirSync(tmp)).toEqual([]);
  });
});

describe("apply: undo log first, one transaction, never a delete", () => {
  it("writes the log (pending) before the first write, then marks it applied with the created ids", async () => {
    const pendingSeen: string[] = [];
    const { db, rows, calls } = fakeDb({
      beforeWrite: () => {
        const all = logs();
        expect(all).toHaveLength(1);
        pendingSeen.push(all[0].log.status);
      },
    });
    const out = await run(["--apply", "--only", "gate"], db, { ...quiet, logDir: tmp });
    expect(out.applied).toBe(true);
    expect(pendingSeen.length).toBe(calls.update + calls.create);
    expect(new Set(pendingSeen)).toEqual(new Set(["pending"]));
    const [{ f, log }] = logs();
    expect(f.startsWith(`${LOG_STEM}.gate.`)).toBe(true);
    expect(log).toMatchObject({ script: LOG_STEM, kind: "apply", status: "applied", only: "gate" });
    // GATE_CE: archive 27 Sep, relabel 5 Oct, relabel the rectification row, create 12 Oct.
    // GATE_CSE: archive 27 Sep, relabel 5 Oct, create 12 Oct; archive the 6 and 21 Feb EXAM rows, create the OTHER window row.
    expect(log.entries.filter((e) => e.exam === "GATE_CE").map((e) => e.type).sort()).toEqual(["archive", "create", "update", "update"]);
    expect(log.entries.filter((e) => e.exam === "GATE_CSE").map((e) => e.type).sort()).toEqual(["archive", "archive", "archive", "create", "create", "update"]);
    expect(log.entries.every((e) => e.rowId)).toBe(true);
    const archived = rows.find((r) => r.id === "g2")!;
    expect(archived.archivedAt).not.toBeNull();
    expect(archived.source).toBe(SUPPRESSED_SOURCE);
    expect(rows.find((r) => r.id === "g3")!.label).toBe("GATE 2027 regular registration closes (without late fee)");
    const made = rows.find((r) => r.examId === "e-gate" && r.source === PROVENANCE && r.date.getTime() === day("2026-10-12").getTime())!;
    expect(made).toMatchObject({ kind: "APPLICATION_END", confidence: "official", url: GATE_URL, archivedAt: null });
    // GATE_CSE's window EXAM rows: archived and suppressed, kind kept, so the
    // refresh writer's suppressedKeys hold EXAM|2027-02-06 and EXAM|2027-02-21.
    for (const id of ["c7", "c8"]) expect(rows.find((r) => r.id === id)).toMatchObject({ kind: "EXAM", source: SUPPRESSED_SOURCE, archivedAt: expect.any(Date) });
    const windowRow = rows.find((r) => r.examId === "e-cse" && r.source === PROVENANCE && r.date.getTime() === day("2027-02-06").getTime())!;
    expect(windowRow).toMatchObject({ kind: "OTHER", isExamDay: false, confidence: "official", url: GATE_URL, archivedAt: null });
    expect(windowRow.label).toMatch(/CS paper's own date is not announced yet/);
    expect(rows).toHaveLength(seed().rows.length + 3); // nothing removed
  });

  it("a failed write rolls the transaction back and leaves the log 'failed'", async () => {
    const { db, rows } = fakeDb({ failOnUpdate: 2 });
    const before = JSON.stringify(rows);
    await expect(run(["--apply", "--only", "gate"], db, { ...quiet, logDir: tmp })).rejects.toThrow(/disk full/);
    expect(JSON.stringify(rows)).toBe(before);
    const [{ log }] = logs();
    expect(log.status).toBe("failed");
    expect(log.error).toMatch(/disk full/);
  });

  it("a row changed since the plan stops the whole run", async () => {
    const { db, rows } = fakeDb();
    const { exams } = seed();
    const ctx = new Map<string, ExamCtx>();
    for (const e of exams) ctx.set(e.code, { id: e.id, code: e.code, shortName: e.shortName, name: e.name, state: e.state, officialUrl: e.eligibility.officialUrl, live: rows.filter((r) => r.examId === e.id).map((r) => ({ ...r })) });
    const planned = plan(ACTIONS.filter((a) => a.group === "gate"), ctx, NOW, []);
    rows.find((r) => r.id === "g3")!.notes = "edited by hand after the plan";
    const snapshot = JSON.stringify(rows);
    await expect(applyPlanned(db, planned, path.join(tmp, "x.json"), "gate", () => {})).rejects.toThrow(/changed since the plan/);
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(logs()[0].log.status).toBe("failed");
  });

  it("has no delete call anywhere in the script", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "scripts/fix-tracker-dates-2026-10-06.ts"), "utf8");
    expect(src).not.toMatch(/\.delete(Many)?\s*\(/);
    expect(src).not.toMatch(/DELETE\s+FROM/i);
    expect(src).not.toMatch(/\$executeRaw/);
  });

  it("is idempotent: a second plan after the apply finds nothing to do", async () => {
    const { db, rows } = fakeDb();
    for (const group of ["olympiad", "gate"]) {
      await run(["--apply", "--only", group], db, { ...quiet, logDir: tmp });
      const second = await run(["--only", group], db, { ...quiet, logDir: tmp });
      expect(second.planned, group).toEqual([]);
    }
    expect(rows.filter((r) => r.source === PROVENANCE && !r.archivedAt).length).toBeGreaterThan(0);
  });
});

describe("undo", () => {
  it("is a dry run without --apply; with it, every row goes back and created rows are archived, never deleted", async () => {
    const { db, rows, calls } = fakeDb();
    const original = seed().rows;
    await run(["--apply", "--only", "gate"], db, { ...quiet, logDir: tmp });
    const [{ f }] = logs();
    const file = path.join(tmp, f);
    const writesAfterApply = { ...calls };
    await run(["--undo", file], db, { ...quiet, logDir: tmp });
    expect(calls).toEqual(writesAfterApply);
    await run(["--undo", file, "--apply"], db, { ...quiet, logDir: tmp });
    for (const o of original) {
      const now = rows.find((r) => r.id === o.id)!;
      expect({ ...now, createdAt: o.createdAt }).toEqual(o);
    }
    const created = rows.filter((r) => !original.some((o) => o.id === r.id));
    expect(created).toHaveLength(3); // GATE_CE 12 Oct, GATE_CSE 12 Oct, GATE_CSE 6 Feb window
    for (const c of created) expect(c.archivedAt).not.toBeNull();
    const undoLog = logs().find((l) => l.log.kind === "undo")!;
    expect(undoLog.log).toMatchObject({ status: "applied", undoOf: file });
  });

  it("refuses a file that is not an applied log of this script", async () => {
    const { db } = fakeDb();
    const bogus = path.join(tmp, "bogus.json");
    fs.writeFileSync(bogus, JSON.stringify({ script: "fix-tracker-dates-2026-10-03", kind: "apply", status: "applied", entries: [] }));
    await expect(run(["--undo", bogus, "--apply"], db, { ...quiet, logDir: tmp })).rejects.toThrow(/not an applied log/);
  });
});

describe("stale reads", () => {
  it(`refuses --apply once an evidence read is more than ${MAX_READ_AGE_DAYS} days old`, async () => {
    const later = new Date("2026-10-09T06:00:00Z");
    expect(staleEvidence(ACTIONS, NOW)).toEqual([]);
    expect(staleEvidence(ACTIONS.filter((a) => a.group === "gate"), later)).toEqual(["gate", "gateWindow"]);
    const { db, calls } = fakeDb();
    await expect(run(["--apply", "--only", "gate"], db, { now: later, say: () => {}, logDir: tmp })).rejects.toThrow(/stale evidence/);
    expect(calls).toEqual({ update: 0, create: 0 });
    expect(fs.readdirSync(tmp)).toEqual([]);
  });
});

describe("the evidence and the rows", () => {
  it("every action's source is read on 6 Oct 2026 and is an official-tier host for its exam", () => {
    const portal: Record<string, string> = { NSEP: "https://iapt.org.in", NSEC: "https://www.iapt.org.in", NSEB: "https://iapt.org.in" };
    for (const a of ACTIONS) {
      const ev = EVIDENCE[a.evidence];
      expect(ev.readAt.startsWith("2026-10-06T"), a.exam).toBe(true);
      expect(sourceTier("official", ev.url, portal[a.exam] ?? null), `${a.exam} ${ev.url}`).toBe("official");
    }
  });

  it("the quoted lines carry the dates the rows write", () => {
    expect(EVIDENCE.gate.quote).toMatch(/REGULAR online registration \(without late fee\) \| \[struck: 21st September 2026, 27th September 2026\] 5th October 2026/);
    expect(EVIDENCE.gate.quote).toMatch(/EXTENDED online registration \(with late fee\) \| \[struck: 30th September 2026, 5th October 2026\] 12th October 2026/);
    expect(EVIDENCE.gate.quote).toMatch(/Admit Card download \| TBA/);
    expect(EVIDENCE.hbcseSci.quote).toMatch(/INPhO: January 31, 2027/);
    expect(EVIDENCE.hbcseSci.quote).toMatch(/INBO: January 31, 2027/);
    expect(EVIDENCE.hbcseSci.quote).toMatch(/INChO: January 30, 2027/);
    for (const x of ["NSEB: November 22, 2026", "NSEC: November 22, 2026", "NSEP: November 22, 2026"]) expect(EVIDENCE.hbcseSci.quote).toContain(x);
    expect(EVIDENCE.iapt.quote).toMatch(/NSEP \(Physics\) Sunday 22\.11\.26/);
    expect(EVIDENCE.hbcseMath.quote).toMatch(/\(RMO\) Date: November 15, 2026/);
    expect(EVIDENCE.hbcseMath.quote).toMatch(/January 17, 2027/);
    expect(EVIDENCE.gateWindow.quote).toMatch(/GATE 2027 Examinations \| 6th February 2027 .* 21st February 2027/);
    expect(EVIDENCE.gateWindow.doc).toMatch(/no paper, session or 'CS' is named/);
    expect(EVIDENCE.jkssbFinance.doc).toMatch(/notice2_17092026\.pdf.*Health and Medical Education Department/);
    const creates = ACTIONS.filter((a) => a.type === "create");
    expect(creates.map((a) => (a.type === "create" ? `${a.exam} ${a.row.day}` : "")).sort()).toEqual(
      [...GATE_EXAMS.map((e) => `${e} 2026-10-12`), "GATE_CSE 2027-02-06", "IOQM 2026-11-15", "IOQM 2027-01-17", "NSEB 2027-01-31", "NSEC 2027-01-30", "NSEP 2027-01-31"].sort(),
    );
  });

  it("stage-II, RMO and INMO rows are OTHER, so they never lead a hub title as the hub's own exam date", () => {
    for (const a of ACTIONS) if (a.group === "olympiad" && a.type === "create") expect([a.row.kind, a.row.isExamDay], a.row.label).toEqual(["OTHER", false]);
    const { exams, rows } = seed();
    const e = exams.find((x) => x.code === "IOQM")!;
    const ctx: ExamCtx = { id: e.id, code: e.code, shortName: e.shortName, name: e.name, state: null, officialUrl: e.eligibility.officialUrl, live: rows.filter((r) => r.examId === e.id) };
    const planned = plan(ACTIONS.filter((a) => a.exam === "IOQM"), new Map([["IOQM", ctx]]), NOW, []);
    expect(planned).toHaveLength(2);
    const before = hubPreview(ctx, ctx.live, NOW)[0];
    const after = hubPreview(ctx, simulate(ctx, planned, NOW), NOW)[0];
    expect(after).toBe(before);
    expect(after).toMatch(/Exam Held 6 Sept 2026/);
  });

  it("finds rows by exam, kind, day, host and label; a missing or doubled row is skipped, never guessed", () => {
    const { exams, rows } = seed();
    const e = exams.find((x) => x.code === "GATE_CE")!;
    const twin: Row = { ...rows.find((r) => r.id === "g3")!, id: "g3b" };
    const ctx: ExamCtx = { id: e.id, code: e.code, shortName: e.shortName, name: e.name, state: null, officialUrl: e.eligibility.officialUrl, live: [...rows.filter((r) => r.examId === e.id && r.id !== "g2"), twin] };
    const skipped: string[] = [];
    const planned = plan(ACTIONS.filter((a) => a.exam === "GATE_CE"), new Map([["GATE_CE", ctx]]), NOW, skipped);
    expect(skipped.some((s) => /2026-09-27 .*no live row found/.test(s))).toBe(true);
    expect(skipped.some((s) => /2026-10-05 .*2 live rows match — ambiguous/.test(s))).toBe(true);
    expect(planned.map((p) => p.action.type).sort()).toEqual(["create", "update"]);
  });

  it("leaves the founder's held exams out, and keeps the writer's provenance tag", () => {
    expect(Object.keys(HELD_BY_FOUNDER).sort()).toEqual(["NSTSE", "SK_SPSC"]);
    for (const a of ACTIONS) expect(Object.keys(HELD_BY_FOUNDER)).not.toContain(a.exam);
    const writer = fs.readFileSync(path.join(process.cwd(), "src/lib/exam-data-writer.ts"), "utf8");
    expect(writer).toContain(`export const GEN_SOURCE = "${GEN_SOURCE}";`);
  });

  it("does not cite MP ESB's probable 19 Nov exam start as official: it is a founder question", () => {
    expect(ACTIONS.some((a) => a.exam === "MP_MPESB" && a.type !== "create" && a.find.day === "2026-11-19")).toBe(false);
    expect(ACTIONS.filter((a) => a.exam === "MP_MPESB").map((a) => (a.type === "create" ? "" : `${a.find.kind} ${a.find.day}`))).toEqual(["APPLICATION_END 2026-10-06", "CORRECTION_WINDOW 2026-10-11"]);
    expect(FOUNDER_QUESTIONS.map((q) => `${q.exam} ${q.day} ${q.kind}`)).toEqual(["MP_MPESB 2026-11-19 EXAM"]);
    expect(EVIDENCE.esbPolice.quote).toContain("संभावित परीक्षा दिनांक व दिन : 19-11-2026 से प्रारंभ");
  });
});

const ctxOf = (code: string): ExamCtx => {
  const { exams, rows } = seed();
  const e = exams.find((x) => x.code === code)!;
  return { id: e.id, code: e.code, shortName: e.shortName, name: e.name, state: e.state, officialUrl: e.eligibility.officialUrl, live: rows.filter((r) => r.examId === e.id) };
};

describe("GATE_CSE: the exam window is not the CS paper's date (review of 6 Oct)", () => {
  it("the title stops naming 6 Feb (and, after it, 21 Feb) as the CS exam date", () => {
    const ctx = ctxOf("GATE_CSE");
    const planned = plan(ACTIONS.filter((a) => a.exam === "GATE_CSE"), new Map([["GATE_CSE", ctx]]), NOW, []);
    const after = simulate(ctx, planned, NOW);
    expect(hubPreview(ctx, ctx.live, NOW)[0]).toMatch(/^title: GATE CSE 2027 — Exam Date 6 Feb 2027,/);
    expect(hubPreview(ctx, after, NOW)[0]).toMatch(/^title: GATE CSE 2027 — Exam Date Not Announced Yet,/);
    expect(hubPreview(ctx, after, NOW)[1]).toMatch(/no announced GATE CSE exam date yet/);
    // Before the fix, on 7 Feb 2027 the title read "Exam Date 21 Feb 2027".
    const feb7 = new Date("2027-02-07T06:00:00Z");
    expect(hubPreview(ctx, ctx.live, feb7)[0]).toMatch(/Exam Date 21 Feb 2027/);
    expect(hubPreview(ctx, after, feb7)[0]).toMatch(/Exam Date Not Announced Yet/);
    // The window row stays on the tracker, as OTHER.
    expect(after.filter((r) => r.date.getTime() === day("2027-02-06").getTime()).map((r) => [r.kind, r.isExamDay])).toEqual([["OTHER", false]]);
  });

  it("its list cells change: category / after-level and /mock-tests", () => {
    const ctx = ctxOf("GATE_CSE");
    const planned = plan(ACTIONS.filter((a) => a.exam === "GATE_CSE"), new Map([["GATE_CSE", ctx]]), NOW, []);
    const before = listCells(ctx, ctx.live, NOW);
    const after = listCells(ctx, simulate(ctx, planned, NOW), NOW);
    expect(before).toEqual({ list: "6 Feb 2027 (official)", mock: "Next exam: 6 Feb 2027 (official)" });
    expect(after).toEqual({ list: "Not on the tracker yet", mock: "Next exam date not announced yet" });
    const m: ListMembership = { mockTests: true, categories: ["engineering-entrance"], levels: ["graduation"] };
    expect(listPageUrls(m, before, after)).toEqual([
      "https://shishya.in/mock-tests",
      "https://shishya.in/exams/category/engineering-entrance",
      "https://shishya.in/exams/after/graduation",
    ]);
    expect(listPageUrls(m, before, before)).toEqual([]);
  });

  it("the dry run puts only the list pages whose cell changes on the IndexNow list, and says when it could not check", async () => {
    const out: string[] = [];
    const { db } = fakeDb();
    await run(["--only", "gate"], db, {
      now: NOW,
      say: (s) => out.push(s),
      logDir: tmp,
      listPages: async (codes) =>
        new Map(codes.map((c) => [c, { mockTests: c === "GATE_CSE", categories: c === "GATE_CSE" ? ["engineering-entrance"] : ["only-if-ce-changed"], levels: ["graduation"] }])),
    });
    const text = out.join("\n");
    expect(text).toContain("listed on: /exams/category/only-if-ce-changed, /exams/after/graduation");
    const ping = text.slice(text.indexOf("INDEXNOW"));
    for (const u of ["https://shishya.in/mock-tests", "https://shishya.in/exams/category/engineering-entrance", "https://shishya.in/exams/after/graduation"]) expect(ping).toContain(`  ${u}\n`);
    expect(ping).not.toContain("only-if-ce-changed"); // GATE_CE's cells are "Not on the tracker yet" before and after
    const bare: string[] = [];
    await run(["--only", "gate"], fakeDb().db, { now: NOW, say: (s) => bare.push(s), logDir: tmp });
    expect(bare.join("\n")).toMatch(/list pages: not checked .* check them by hand/);
    expect(fs.readdirSync(tmp)).toEqual([]);
  });
});
