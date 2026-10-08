// scripts/repair-teacher-request-rearm.ts (7 Oct 2026, inbox fix B5): the
// teacher request reopened before the re-arm fix (582b5f8) that the 24h SLA
// net never answered again. Run against a fake DB. Pins: which matches are
// re-armed and which are left alone (and why), first names only in the
// dry run, a dry run writes nothing, --apply clears escalatedAt only on the
// re-armed rows with an undo log written before and after, a row that moved
// mid-run writes nothing, and --undo restores only a row still waiting.
// Run: npx vitest run tests/unit/repair-teacher-request-rearm.test.ts

import { describe, expect, it } from "vitest";
import { firstName, ist, leaveAloneReason, run, type Candidate, type Db, type LogFile } from "../../scripts/repair-teacher-request-rearm";

const T = (iso: string) => new Date(iso);
/** The known case: asked 15 Aug 20:59 IST, AI answer 16 Aug 22:10, reopened 17 Aug 05:12. */
const STUCK: Candidate = {
  id: "req-stuck",
  status: "PENDING",
  studentRating: "NEED_MORE_HELP",
  createdAt: T("2026-08-15T15:29:00Z"),
  escalatedAt: T("2026-08-16T16:40:00Z"),
  ratedAt: T("2026-08-16T23:42:00Z"),
  answeredAt: T("2026-08-16T16:40:00Z"),
  answeredBy: "ai",
  examCode: "IBPS_CLERK",
  surface: "chat",
  contactName: "Anita Kumari",
  userName: null,
};
const CONTACTED: Candidate = { ...STUCK, id: "req-contacted", status: "CONTACTED", contactName: null, userName: "Ravi Teja" };
const TEAM_ANSWERED: Candidate = { ...STUCK, id: "req-team", answeredAt: T("2026-08-18T05:00:00Z"), answeredBy: "team", contactName: "Sita Devi" };

function fakeDb(matches: Candidate[], opts: { inTx?: (id: string) => Candidate | undefined; byId?: Record<string, Candidate> } = {}) {
  const calls = { query: 0, exec: [] as unknown[][], tx: 0 };
  const db: Db = {
    async $queryRaw<T>(strings: TemplateStringsArray, ...values: unknown[]) {
      calls.query++;
      const sql = strings.join("?");
      if (sql.includes("WHERE tr.id =")) {
        const id = String(values[0]);
        const r = opts.inTx?.(id) ?? opts.byId?.[id] ?? matches.find((m) => m.id === id);
        return (r ? [r] : []) as T;
      }
      return matches as T;
    },
    async $executeRaw(strings: TemplateStringsArray, ...values: unknown[]) {
      calls.exec.push([strings.join("?"), ...values]);
      return 1;
    },
    async $transaction<T>(fn: (tx: Db) => Promise<T>) {
      calls.tx++;
      return fn(db);
    },
  };
  return { db, calls };
}

function deps(db: Db) {
  const out: string[] = [];
  const files: Record<string, string> = {};
  const writes: Array<{ path: string; status: string }> = [];
  return {
    out,
    files,
    writes,
    d: {
      db,
      now: () => T("2026-10-07T12:00:00Z"),
      log: (s: string) => out.push(s),
      logDir: "fix-logs-test",
      writeFile: (p: string, s: string) => {
        files[p] = s;
        writes.push({ path: p, status: (JSON.parse(s) as LogFile).status });
      },
      readFile: (p: string) => files[p],
    },
  };
}

describe("which reopens are re-armed", () => {
  it("the stuck PENDING reopen with nothing answered since → re-arm", () => {
    expect(leaveAloneReason(STUCK)).toBeNull();
  });

  it("left alone: moved by the team, answered again, or not a reopen after the AI answer", () => {
    expect(leaveAloneReason(CONTACTED)).toMatch(/status CONTACTED/);
    expect(leaveAloneReason(TEAM_ANSWERED)).toMatch(/answered again since the reopen \(team\)/);
    expect(leaveAloneReason({ ...STUCK, ratedAt: T("2026-08-16T10:00:00Z") })).toMatch(/not a reopen/);
    expect(leaveAloneReason({ ...STUCK, studentRating: "SOLVED" })).toMatch(/not a reopen/);
    expect(leaveAloneReason({ ...STUCK, escalatedAt: null })).toMatch(/not a reopen/);
  });

  it("first names only, IST times", () => {
    expect(firstName(STUCK)).toBe("Anita");
    expect(firstName(CONTACTED)).toBe("Ravi");
    expect(firstName({ contactName: "  ", userName: null })).toBe("(no name)");
    expect(ist(STUCK.createdAt)).toBe("2026-08-15 20:59 IST");
    expect(ist(STUCK.ratedAt)).toBe("2026-08-17 05:12 IST");
  });
});

describe("run", () => {
  it("dry run: lists re-arm and left-alone rows with first names, writes nothing", async () => {
    const { db, calls } = fakeDb([STUCK, CONTACTED, TEAM_ANSWERED]);
    const t = deps(db);
    const r = await run([], t.d);
    expect(r.rearm.map((x) => x.id)).toEqual(["req-stuck"]);
    expect(r.left.map((x) => x.id)).toEqual(["req-contacted", "req-team"]);
    expect(calls.exec).toEqual([]);
    expect(calls.tx).toBe(0);
    expect(t.writes).toEqual([]);
    const all = t.out.join("\n");
    expect(all).toContain("req-stuck  Anita · IBPS_CLERK · from chat");
    expect(all).toContain("asked 2026-08-15 20:59 IST · AI answer 2026-08-16 22:10 IST · reopened 2026-08-17 05:12 IST · status PENDING");
    expect(all).not.toMatch(/Kumari|Teja|Devi/);
    expect(all).toContain("Dry run — nothing written.");
  });

  it("--apply: clears escalatedAt on the re-armed row only, log pending → applied", async () => {
    const { db, calls } = fakeDb([STUCK, CONTACTED]);
    const t = deps(db);
    const r = await run(["--apply"], t.d);
    expect(calls.tx).toBe(1);
    expect(calls.exec).toHaveLength(1);
    expect(String(calls.exec[0][0])).toMatch(/UPDATE "TeacherRequest" SET "escalatedAt" = NULL\s+WHERE id = \? AND status = 'PENDING' AND "studentRating" = 'NEED_MORE_HELP' AND "escalatedAt" IS NOT NULL/);
    expect(calls.exec[0][1]).toBe("req-stuck");
    expect(t.writes.map((w) => w.status)).toEqual(["pending", "applied"]);
    const log = JSON.parse(t.files[r.logPath!]) as LogFile;
    expect(log.entries).toEqual([
      { id: "req-stuck", examCode: "IBPS_CLERK", status: "PENDING", escalatedAt: "2026-08-16T16:40:00.000Z", ratedAt: "2026-08-16T23:42:00.000Z", answeredAt: "2026-08-16T16:40:00.000Z" },
    ]);
    expect(t.files[r.logPath!]).not.toMatch(/Anita/);
  });

  it("--apply: a row that moved during the run writes nothing and the log says failed", async () => {
    const { db, calls } = fakeDb([STUCK], { inTx: () => ({ ...STUCK, escalatedAt: T("2026-10-07T11:59:00Z") }) });
    const t = deps(db);
    await expect(run(["--apply"], t.d)).rejects.toThrow(/changed while this run read it/);
    expect(calls.exec).toEqual([]);
    expect(t.writes.map((w) => w.status)).toEqual(["pending", "failed"]);
  });

  it("--undo restores a row still waiting, skips one the cron has answered since", async () => {
    const { db } = fakeDb([STUCK]);
    const t = deps(db);
    const { logPath } = await run(["--apply"], t.d);
    // Still waiting: escalatedAt NULL, rating and answer unchanged.
    const waiting = fakeDb([], { byId: { "req-stuck": { ...STUCK, escalatedAt: null } } });
    const u = deps(waiting.db);
    Object.assign(u.files, t.files);
    await run(["--undo", logPath!, "--apply"], u.d);
    expect(waiting.calls.exec).toHaveLength(1);
    expect(String(waiting.calls.exec[0][0])).toMatch(/SET "escalatedAt" = \?::timestamp\(3\)\s+WHERE id = \? AND "escalatedAt" IS NULL/);
    expect(waiting.calls.exec[0].slice(1)).toEqual(["2026-08-16T16:40:00.000Z", "req-stuck"]);
    // Answered by the cron since: left alone.
    const answered = fakeDb([], { byId: { "req-stuck": { ...STUCK, escalatedAt: T("2026-10-07T14:00:00Z"), answeredAt: T("2026-10-07T14:00:00Z") } } });
    const v = deps(answered.db);
    Object.assign(v.files, t.files);
    await run(["--undo", logPath!, "--apply"], v.d);
    expect(answered.calls.exec).toEqual([]);
    expect(v.out.join("\n")).toMatch(/answered it since .* skipped/);
  });
});
