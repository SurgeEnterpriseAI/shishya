// The stale SSC CGL answer-key rows (scripts/fix-sscgl-stale-answerkey-2026-10.ts):
// its selection logic and guards, on a fake DB — no network, no production
// database.
//   • selection: only live, generated ANSWER_KEY rows whose label names an
//     earlier SSC CGL cycle, by day, cited host and exact label; a missing or
//     doubled row is reported, never guessed; the 2026 cycle's rows and
//     curated / official-watch rows are never picked;
//   • the tracker's answer-key card: 17 Jun (reported) now; 9 Jan (official)
//     if only jun17 goes; "not announced yet" when both go;
//   • dry run by default, writes nothing; --apply needs --only; unknown flags
//     refused; --apply refused without a 2026 exam row cited to ssc.gov.in;
//   • the dry run never calls an AI-made row "official" (citationWord);
//   • archive + suppress, never delete; the undo log is on disk ("pending")
//     before the first write; a row changed since the plan stops the run;
//   • --undo is a dry run without --apply; with it the rows go back.
// The fixture rows are the live SSC_CGL rows read on 10 Oct 2026 (SELECT),
// trimmed to the ones that matter.
// Run: npx vitest run tests/unit/fix-sscgl-stale-answerkey-2026-10.test.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SUPPRESSED_SOURCE, resolveKind } from "@/lib/exam-timeline";
import {
  GEN_SOURCE,
  LOG_STEM,
  TARGETS,
  answerKeyCard,
  applyPlanned,
  citationWord,
  currentCycleExamRow,
  indexNowUrls,
  isPreviousCycleKey,
  labelCycleYears,
  otherPreviousCycleKeys,
  parseCli,
  plan,
  run,
  selectTargets,
  simulate,
  type Db,
  type LogFile,
  type Row,
} from "../../scripts/fix-sscgl-stale-answerkey-2026-10";

const NOW = new Date("2026-10-10T06:00:00Z"); // 11:30 IST, the day of the read
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const PORTAL = "https://ssc.gov.in";
const NOTICE = "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_CGLE_2026.pdf";
const EXAM_ID = "e-cgl";

function r(id: string, iso: string, kind: string | null, label: string, extra: Partial<Row> = {}): Row {
  return {
    id,
    examId: EXAM_ID,
    label,
    date: day(iso),
    isExamDay: kind === "EXAM",
    source: GEN_SOURCE,
    notes: null,
    kind,
    confidence: "official",
    url: NOTICE,
    createdAt: new Date("2026-09-10T01:16:41Z"),
    archivedAt: null,
    ...extra,
  };
}

/** SSC_CGL's live rows as read on 10 Oct 2026 (ids shortened). */
function seed(): Row[] {
  return [
    r("res25", "2025-12-18", "RESULT", "SSC CGL 2025 Tier 1 Result"),
    r("jan09", "2026-01-09", "ANSWER_KEY", "SSC CGL 2025 Tier 1 final answer key released", { url: "https://ssc.gov.in", notes: "Final answer key with response sheet and scorecard released" }),
    r("t2ex25", "2026-01-18", "EXAM", "SSC CGL 2025 Tier 2 Exam", { notes: "Conducted from 18th to 19th January 2026; no key published for this stage" }),
    r("final25", "2026-05-14", "RESULT", "SSC CGL 2025 Final Result declared", { url: "https://testbook.com/ssc-cgl-exam/results" }),
    r("notif", "2026-05-21", "NOTIFICATION", "Notification published"),
    r("jun17", "2026-06-17", "ANSWER_KEY", "SSC CGL 2025 Tier 2 Final Answer Key", {
      url: "https://www.mysarkarinaukri.com/en/ssc-cgl-tier-2-answer-key-2026/",
      notes: "Final answer key with scorecard and response sheets; accessible until 16th July 2026",
    }),
    r("appEnd", "2026-06-21", "APPLICATION_END", "Application window closed"),
    r("admit", "2026-09-27", "ADMIT_CARD", "Tier 1 admit card availability"),
    r("t1start", "2026-09-30", "EXAM", "Tier 1 exam starts"),
    r("t1end", "2026-10-30", "EXAM", "Tier 1 exam ends"),
    r("res26", "2026-11-30", "RESULT", "Tier 1 result (expected)", { confidence: "expected", url: null }),
    r("t2ex26", "2026-12-15", "EXAM", "Tier 2 exam (expected)", { confidence: "expected" }),
  ];
}

/** An in-memory DB with the Prisma calls the script makes. No delete:
 *  calling one throws. A failed transaction restores the rows. */
function fakeDb(opts: { rows?: Row[]; beforeWrite?: () => void; failOnUpdate?: number } = {}) {
  const rows = opts.rows ?? seed();
  const calls = { update: 0 };
  const copy = (x: Row): Row => ({ ...x });
  const examImportantDate = {
    findMany: async (a: any) =>
      rows
        .filter((x) => (a?.where?.examId === undefined || x.examId === a.where.examId) && !(a?.where?.archivedAt === null && x.archivedAt))
        .sort((x, y) => x.date.getTime() - y.date.getTime() || (x.id < y.id ? -1 : 1))
        .map(copy),
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
    create: async () => {
      throw new Error("create called");
    },
    delete: async () => {
      throw new Error("delete called");
    },
    deleteMany: async () => {
      throw new Error("deleteMany called");
    },
  };
  const exam = {
    findUnique: async (a: any) => (a.where.code === "SSC_CGL" ? { id: EXAM_ID, shortName: "SSC CGL", eligibility: { officialUrl: PORTAL } } : null),
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
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fix-sscgl-key-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});
const logs = () => fs.readdirSync(tmp).map((f) => ({ f, log: JSON.parse(fs.readFileSync(path.join(tmp, f), "utf8")) as LogFile }));
const quiet = { now: NOW, say: () => {} };

describe("selection: a previous cycle's key, found by day, host and label — never guessed", () => {
  it("reads the cycle year from the label", () => {
    expect(labelCycleYears("SSC CGL 2025 Tier 2 Final Answer Key")).toEqual([2025]);
    expect(labelCycleYears("SSC CGL 2026 Tier 1 answer key")).toEqual([2026]);
    expect(labelCycleYears("Tier 1 answer key")).toEqual([]);
  });

  it("a previous-cycle key is live, generated, an answer key, and names only earlier SSC CGL years", () => {
    const rows = seed();
    const by = (id: string) => rows.find((x) => x.id === id)!;
    expect(isPreviousCycleKey(by("jun17"))).toBe(true);
    expect(isPreviousCycleKey(by("jan09"))).toBe(true);
    // Not an answer key, even of 2025.
    expect(isPreviousCycleKey(by("res25"))).toBe(false);
    expect(isPreviousCycleKey(by("t2ex25"))).toBe(false);
    // The 2026 cycle's key, or a key with no year, is never picked.
    expect(isPreviousCycleKey(r("k26", "2026-11-05", "ANSWER_KEY", "SSC CGL 2026 Tier 1 answer key"))).toBe(false);
    expect(isPreviousCycleKey(r("k0", "2026-11-05", "ANSWER_KEY", "Tier 1 answer key"))).toBe(false);
    // An answer key stored as OTHER is still an answer key (resolveKind).
    expect(isPreviousCycleKey(r("o", "2026-06-17", "OTHER", "SSC CGL 2025 Tier 2 answer key"))).toBe(true);
    // A curated, official-watch or already-suppressed row is not this script's.
    for (const source of ["official-research:2026-10-06", "official-watch", SUPPRESSED_SOURCE, null]) {
      expect(isPreviousCycleKey({ ...by("jun17"), source }), String(source)).toBe(false);
    }
    // An archived row is not live.
    expect(isPreviousCycleKey({ ...by("jun17"), archivedAt: NOW })).toBe(false);
  });

  it("picks exactly the jun17 and jan09 rows, by group", () => {
    const rows = seed();
    expect(selectTargets(rows, ["jun17"]).picks.map((p) => p.row.id)).toEqual(["jun17"]);
    expect(selectTargets(rows, ["jan09"]).picks.map((p) => p.row.id)).toEqual(["jan09"]);
    const both = selectTargets(rows, ["jun17", "jan09"]);
    expect(both.picks.map((p) => p.row.id)).toEqual(["jun17", "jan09"]);
    expect(both.problems).toEqual([]);
    expect(otherPreviousCycleKeys(rows)).toEqual([]);
  });

  it("the same label on another day, or cited to another host, is not the target", () => {
    const rows = seed().map((x) =>
      x.id === "jun17" ? { ...x, date: day("2026-06-18") } : x.id === "jan09" ? { ...x, url: "https://www.mysarkarinaukri.com/x" } : x,
    );
    const out = selectTargets(rows, ["jun17", "jan09"]);
    expect(out.picks).toEqual([]);
    expect(out.problems).toHaveLength(2);
    // Both are still previous-cycle keys: the dry run lists them, untouched.
    expect(otherPreviousCycleKeys(rows).map((x) => x.id).sort()).toEqual(["jan09", "jun17"]);
  });

  it("a missing row (already archived) or a doubled row is a problem line, never a guess", () => {
    const gone = seed().map((x) => (x.id === "jun17" ? { ...x, archivedAt: NOW } : x));
    const a = selectTargets(gone, ["jun17"]);
    expect(a.picks).toEqual([]);
    expect(a.problems[0]).toMatch(/^jun17: no live generated ANSWER_KEY row on 2026-06-17 .*already archived/);
    const twice = [...seed(), { ...seed().find((x) => x.id === "jun17")!, id: "jun17b" }];
    const b = selectTargets(twice, ["jun17"]);
    expect(b.picks).toEqual([]);
    expect(b.problems[0]).toMatch(/^jun17: 2 rows match \(jun17, jun17b\) — skipped, never guessed$/);
  });

  it("every target names a 2025 label, an exact label pattern and a reason", () => {
    for (const t of TARGETS) {
      expect(t.label.source.startsWith("^") && t.label.source.endsWith("$"), t.group).toBe(true);
      expect(t.label.source).toMatch(/2025/);
      expect(t.why.length).toBeGreaterThan(40);
    }
  });
});

describe("the tracker's answer-key card", () => {
  it("now 17 Jun (reported); 9 Jan (official) if only jun17 goes; not announced yet when both go", () => {
    const rows = seed();
    expect(answerKeyCard(rows, NOW, PORTAL)).toMatch(/^Answer key 17 Jun 2026 · reported · Done/);
    const june = plan(selectTargets(rows, ["jun17"]).picks, NOW);
    expect(answerKeyCard(simulate(rows, june, NOW), NOW, PORTAL)).toMatch(/^Answer key 9 Jan 2026 · official · Done/);
    const both = plan(selectTargets(rows, ["jun17", "jan09"]).picks, NOW);
    expect(answerKeyCard(simulate(rows, both, NOW), NOW, PORTAL)).toBe("Answer key: not announced yet");
  });

  it("the 2026 cycle's evidence is the Tier 1 2026 row cited to ssc.gov.in", () => {
    expect(currentCycleExamRow(seed(), PORTAL)?.id).toBe("t1start");
    // Without an official 2026 exam row there is no evidence. The 2025
    // cycle's Tier 2 exam (18 Jan 2026) is dated in 2026 but names 2025 and
    // is before the keys: not evidence. Nor is an expected or aggregator row.
    const rest = seed().filter((x) => !["t1start", "t1end"].includes(x.id));
    expect(rest.some((x) => x.id === "t2ex25")).toBe(true);
    expect(currentCycleExamRow(rest, PORTAL)).toBeNull();
    expect(currentCycleExamRow([...rest, r("agg", "2026-09-30", "EXAM", "Tier 1 exam starts", { url: "https://testbook.com/ssc-cgl" })], PORTAL)).toBeNull();
  });

  it("never calls an AI-made row official: it cites the body's site, unchecked; a person-checked row keeps its tier", async () => {
    const rows = seed();
    const by = (id: string) => rows.find((x) => x.id === id)!;
    // AI-made, cited to ssc.gov.in: the page's "official" is not repeated here.
    expect(citationWord(by("t1start"), PORTAL)).toBe("cites the body's site; AI-made, unchecked");
    expect(citationWord(by("jan09"), PORTAL)).toBe("cites the body's site; AI-made, unchecked");
    // Cited to an aggregator: reported, whoever wrote it.
    expect(citationWord(by("jun17"), PORTAL)).toBe("reported");
    // A person-run step's tag on the body's notice: official.
    expect(citationWord({ ...by("t1start"), source: "official-research:2026-10-06" }, PORTAL)).toBe("official");
    // The dry run prints no AI-made row as "official".
    const { db } = fakeDb();
    const lines: string[] = [];
    await run([], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    const listed = lines.filter((l) => /\[ai-generated:claude\]/.test(l));
    expect(listed.length).toBeGreaterThanOrEqual(3);
    for (const l of listed) expect(l, l).not.toMatch(/ official /);
    expect(lines.join("\n")).toMatch(/2026 cycle evidence: 2026-09-30 EXAM +cites the body's site; AI-made, unchecked "Tier 1 exam starts"/);
  });

  it("IndexNow: the tracker, its hi / te twins and context.md", () => {
    expect(indexNowUrls()).toEqual([
      "https://shishya.in/exams/SSC_CGL/updates",
      "https://shishya.in/hi/exams/SSC_CGL/updates",
      "https://shishya.in/te/exams/SSC_CGL/updates",
      "https://shishya.in/exams/SSC_CGL/context.md",
    ]);
  });
});

describe("the command line: dry run by default", () => {
  it("no flag is a dry run of both; --apply needs --only", () => {
    expect(parseCli([])).toMatchObject({ apply: false, only: "both", groups: ["jun17", "jan09"], undoFile: null });
    expect(parseCli(["--only", "jun17"])).toMatchObject({ apply: false, groups: ["jun17"] });
    expect(parseCli(["--apply", "--only", "both"])).toMatchObject({ apply: true, groups: ["jun17", "jan09"] });
    expect(parseCli(["--apply", "--only", "jun17"])).toMatchObject({ apply: true, groups: ["jun17"] });
    expect(() => parseCli(["--apply"])).toThrow(/--only/);
    expect(() => parseCli(["--only", "all"])).toThrow(/--only/);
  });

  it("refuses unknown flags and flags without a value", () => {
    expect(() => parseCli(["--aply", "--only", "both"])).toThrow(/unknown argument/);
    expect(() => parseCli(["--force"])).toThrow(/unknown argument/);
    expect(() => parseCli(["--only"])).toThrow(/needs a value/);
  });

  it("--undo is a dry run unless --apply, and takes no group", () => {
    expect(parseCli(["--undo", "x.json"])).toMatchObject({ apply: false, undoFile: "x.json" });
    expect(parseCli(["--undo", "x.json", "--apply"])).toMatchObject({ apply: true, undoFile: "x.json" });
    expect(() => parseCli(["--undo", "x.json", "--only", "jun17"])).toThrow();
  });

  it("a dry run writes no row and no log, and prints the card for each choice", async () => {
    for (const argv of [[], ["--only", "jun17"], ["--only", "jan09"], ["--only", "both"]]) {
      const { db, calls } = fakeDb();
      const lines: string[] = [];
      const out = await run(argv, db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
      expect(out.applied).toBe(false);
      expect(calls.update).toBe(0);
      const text = lines.join("\n");
      expect(text).toMatch(/now: +Answer key 17 Jun 2026 · reported · Done/);
      expect(text).toMatch(/after --only jun17: +Answer key 9 Jan 2026 · official · Done/);
      expect(text).toMatch(/after --only both: +Answer key: not announced yet/);
      expect(text).toMatch(/DRY RUN \(nothing is written\)/);
    }
    expect(fs.readdirSync(tmp)).toEqual([]);
  });
});

describe("apply: archive + suppress, undo log first, one transaction, never a delete", () => {
  it("--only jun17 archives and suppresses that row only; the log is pending before the write", async () => {
    const pendingSeen: string[] = [];
    const { db, rows, calls } = fakeDb({
      beforeWrite: () => {
        const all = logs();
        expect(all).toHaveLength(1);
        pendingSeen.push(all[0].log.status);
      },
    });
    const out = await run(["--apply", "--only", "jun17"], db, { ...quiet, logDir: tmp });
    expect(out.applied).toBe(true);
    expect(calls.update).toBe(1);
    expect(pendingSeen).toEqual(["pending"]);
    const [{ f, log }] = logs();
    expect(f.startsWith(`${LOG_STEM}.jun17.`)).toBe(true);
    expect(log).toMatchObject({ script: LOG_STEM, kind: "apply", status: "applied", only: "jun17" });
    expect(log.entries.map((e) => e.rowId)).toEqual(["jun17"]);
    expect(log.entries[0].before).toMatchObject({ source: GEN_SOURCE, archivedAt: null });
    expect(log.entries[0].after).toMatchObject({ source: SUPPRESSED_SOURCE, archivedAt: NOW.toISOString() });
    const jun = rows.find((x) => x.id === "jun17")!;
    expect(jun).toMatchObject({ source: SUPPRESSED_SOURCE, kind: "ANSWER_KEY", label: "SSC CGL 2025 Tier 2 Final Answer Key", archivedAt: NOW });
    // The refresh writer's suppressed key for this row (src/lib/exam-data-writer.ts dayKey).
    expect(`${resolveKind(jun)}|${jun.date.toISOString().slice(0, 10)}`).toBe("ANSWER_KEY|2026-06-17");
    expect(rows.find((x) => x.id === "jan09")).toMatchObject({ source: GEN_SOURCE, archivedAt: null });
    expect(rows).toHaveLength(seed().length); // nothing removed, nothing created
  });

  it("--only both archives the two; a second run finds nothing to do", async () => {
    const { db, rows } = fakeDb();
    await run(["--apply", "--only", "both"], db, { ...quiet, logDir: tmp });
    expect(rows.filter((x) => x.source === SUPPRESSED_SOURCE).map((x) => x.id).sort()).toEqual(["jan09", "jun17"]);
    expect(answerKeyCard(rows, NOW, PORTAL)).toBe("Answer key: not announced yet");
    // Every other row is as it was.
    const before = new Map(seed().map((x) => [x.id, x]));
    for (const x of rows.filter((y) => !["jan09", "jun17"].includes(y.id))) expect(x).toEqual(before.get(x.id));
    const second = await run(["--apply", "--only", "both"], db, { ...quiet, logDir: tmp });
    expect(second.planned).toEqual([]);
    expect(second.applied).toBe(false);
    expect(second.problems).toHaveLength(2);
    expect(logs()).toHaveLength(1);
  });

  it("is refused without a 2026 exam row cited to ssc.gov.in", async () => {
    const { db, calls } = fakeDb({ rows: seed().filter((x) => !["t1start", "t1end"].includes(x.id)) });
    await expect(run(["--apply", "--only", "both"], db, { ...quiet, logDir: tmp })).rejects.toThrow(/REFUSED/);
    expect(calls.update).toBe(0);
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  it("a failed write rolls the transaction back and leaves the log 'failed'", async () => {
    const { db, rows } = fakeDb({ failOnUpdate: 2 });
    const before = JSON.stringify(rows);
    await expect(run(["--apply", "--only", "both"], db, { ...quiet, logDir: tmp })).rejects.toThrow(/disk full/);
    expect(JSON.stringify(rows)).toBe(before);
    const [{ log }] = logs();
    expect(log.status).toBe("failed");
    expect(log.error).toMatch(/disk full/);
  });

  it("a row changed since the plan stops the whole run", async () => {
    const { db, rows } = fakeDb();
    const planned = plan(selectTargets(seed(), ["jun17", "jan09"]).picks, NOW);
    rows.find((x) => x.id === "jan09")!.notes = "edited by hand after the plan";
    const snapshot = JSON.stringify(rows);
    await expect(applyPlanned(db, planned, path.join(tmp, "x.json"), "both", () => {})).rejects.toThrow(/changed since the plan/);
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(logs()[0].log.status).toBe("failed");
  });

  it("has no delete, create or raw write anywhere in the script", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "scripts/fix-sscgl-stale-answerkey-2026-10.ts"), "utf8");
    expect(src).not.toMatch(/\.delete(Many)?\s*\(/);
    expect(src).not.toMatch(/\.create(Many)?\s*\(/);
    expect(src).not.toMatch(/DELETE\s+FROM/i);
    expect(src).not.toMatch(/\$executeRaw/);
  });
});

describe("undo", () => {
  it("is a dry run without --apply; with it, both rows go back exactly", async () => {
    const { db, rows } = fakeDb();
    await run(["--apply", "--only", "both"], db, { ...quiet, logDir: tmp });
    const [{ f }] = logs();
    const file = path.join(tmp, f);
    await run(["--undo", file], db, { ...quiet, logDir: tmp });
    expect(rows.filter((x) => x.source === SUPPRESSED_SOURCE)).toHaveLength(2);
    await run(["--undo", file, "--apply"], db, { ...quiet, logDir: tmp });
    expect(rows).toEqual(seed());
    const undoLog = logs().find((x) => x.f.includes(".undo."))!.log;
    expect(undoLog).toMatchObject({ kind: "undo", status: "applied", undoOf: file });
    expect(answerKeyCard(rows, NOW, PORTAL)).toMatch(/^Answer key 17 Jun 2026/);
  });

  it("skips a row changed since the apply, and refuses a file that is not an applied log of this script", async () => {
    const { db, rows } = fakeDb();
    await run(["--apply", "--only", "both"], db, { ...quiet, logDir: tmp });
    const [{ f }] = logs();
    rows.find((x) => x.id === "jan09")!.notes = "hand edit";
    const lines: string[] = [];
    await run(["--undo", path.join(tmp, f), "--apply"], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    expect(lines.join("\n")).toMatch(/jan09: changed since this script wrote it — skipped/);
    expect(rows.find((x) => x.id === "jun17")).toMatchObject({ source: GEN_SOURCE, archivedAt: null });
    expect(rows.find((x) => x.id === "jan09")).toMatchObject({ source: SUPPRESSED_SOURCE });
    const bogus = path.join(tmp, "bogus.json");
    fs.writeFileSync(bogus, JSON.stringify({ script: "other", kind: "apply", status: "applied", entries: [] }));
    await expect(run(["--undo", bogus], db, { ...quiet, logDir: tmp })).rejects.toThrow(/not an applied log/);
    const failed = path.join(tmp, "failed.json");
    fs.writeFileSync(failed, JSON.stringify({ script: LOG_STEM, kind: "apply", status: "failed", entries: [] }));
    await expect(run(["--undo", failed], db, { ...quiet, logDir: tmp })).rejects.toThrow(/not an applied log/);
  });

  it("undoes a log left 'pending' (the run stopped after its commit): only rows still holding the change go back", async () => {
    const { db, rows } = fakeDb();
    await run(["--apply", "--only", "both"], db, { ...quiet, logDir: tmp });
    const [{ f, log }] = logs();
    const file = path.join(tmp, f);
    fs.writeFileSync(file, JSON.stringify({ ...log, status: "pending" }));
    const lines: string[] = [];
    await run(["--undo", file, "--apply"], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    expect(lines.join("\n")).toMatch(/the log says pending/);
    expect(rows).toEqual(seed());
  });
});
