// The SSC CHSL tracker fixes (scripts/fix-ssc-chsl-dates-10-2026.ts): its
// selection logic, page preview and guards, on a fake DB — no network, no
// production database.
//   • selection: only live, generated rows, by kind, IST day, cited host and
//     exact label (stories by title, day and host); a missing or doubled row
//     is reported, never guessed; curated / official-watch rows are never
//     picked;
//   • the page: the 30 Apr / 31 May rows leave the list; the strip's answer-
//     key card goes from "20 Apr 2026 · reported" to "not announced yet" only
//     with mar20 AND keys25; the 30 Nov row is relabelled "proposed" and is
//     still "reported" — never official (founder rule; dateRowTier);
//   • dry run by default, writes nothing; --apply needs --only; unknown flags
//     and groups refused; --apply refused without the 2026 notification row
//     (apr30, keys25), without the 19 Mar twin (mar20 alone) or on a stale
//     read of SSC's schedule (nov30, news1);
//   • archive + suppress or edit in place, never delete or create; the undo
//     log is on disk ("pending") before the first write; a row changed since
//     the plan stops the run;
//   • --undo is a dry run without --apply; with it the rows go back.
// The fixture rows are the live SSC_CHSL rows read on 13 Oct 2026 (SELECT),
// trimmed to the ones that matter.
// Run: npx vitest run tests/unit/fix-ssc-chsl-dates-10-2026.test.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SUPPRESSED_SOURCE, resolveKind } from "@/lib/exam-timeline";
import { dateRowTier } from "@/lib/official-source";
import {
  DATE_TARGETS,
  EVIDENCE,
  GEN_SOURCE,
  GROUPS,
  LOG_STEM,
  NEWS_TARGETS,
  NOV30_LABEL,
  NO_KEY_PUBLISHED_NOTE,
  applyPlanned,
  applyRefusals,
  indexNowUrls,
  matchesDateTarget,
  nov30Notes,
  parseCli,
  plan,
  run,
  selectTargets,
  simulate,
  stripCard,
  trackerLines,
  type Db,
  type LogFile,
  type Row,
  type Story,
} from "../../scripts/fix-ssc-chsl-dates-10-2026";

const NOW = new Date("2026-10-13T06:00:00Z"); // 11:30 IST, the day of the read
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const PORTAL = "https://ssc.gov.in";
const NOTICE = EVIDENCE.notice.url;
const C360 = "https://news.careers360.com/ssc-chsl-2026-tier-1-final-answer-key-out";
const SEA = "https://sarkariexamsalerts.com/ssc/ssc-chsl-2026-notification/";
const EXAM_ID = "e-chsl";

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
    createdAt: new Date("2026-10-06T07:19:28Z"),
    archivedAt: null,
    ...extra,
  };
}

/** SSC_CHSL's live rows as read on 13 Oct 2026 (ids shortened). */
function seed(): Row[] {
  return [
    r("t1ex25", "2025-11-12", "EXAM", "SSC CHSL 2025 Tier 1 exam conducted", { url: C360, notes: "Tier 1 exam held from November 12-30, 2025" }),
    r("key1208", "2025-12-08", "ANSWER_KEY", "SSC CHSL 2025 Tier 1 answer key released", { url: "https://competition.careers360.com/articles/ssc-chsl-answer-key" }),
    r("res0227", "2026-02-27", "RESULT", "CHSL 2025 Tier 1 result declared", { url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/writeup_27022026.pdf" }),
    r("key0319", "2026-03-19", "ANSWER_KEY", "SSC CHSL 2025 Tier 1 final answer key released", { url: C360 }),
    r("key0320", "2026-03-20", "ANSWER_KEY", "SSC CHSL 2025 Tier 1 final answer key released", { url: `${C360}/amp`, notes: "Final answer key for 2025 cycle" }),
    r("t2ex25", "2026-04-10", "EXAM", "SSC CHSL 2025 Tier 2 exam", { url: "https://competition.careers360.com/articles/ssc-chsl-2026-tier-2-admit-card-out-steps-to-download" }),
    r("key0420", "2026-04-20", "ANSWER_KEY", "CHSL 2025 Tier 2 answer key released", { url: "https://ssc.gov.in" }),
    r("notif0430", "2026-04-30", "NOTIFICATION", "SSC CHSL 2026 notification released", { url: SEA }),
    r("start0430", "2026-04-30", "APPLICATION_START", "Application window start", { url: SEA }),
    r("end0531", "2026-05-31", "APPLICATION_END", "Application window end", { url: SEA }),
    r("frta", "2026-08-17", "RESULT", "Result — SSC CHSL 2025: FRTA", { source: "official-watch", url: "https://ssc.gov.in/api/attachment/uploads/masterData/Results/ROLL_17082026.pdf" }),
    r("notif", "2026-09-07", "NOTIFICATION", "Notification"),
    r("start", "2026-09-07", "APPLICATION_START", "Application start"),
    r("end", "2026-10-07", "APPLICATION_END", "Application end"),
    r("corr", "2026-10-14", "CORRECTION_WINDOW", "Application correction window", { source: "official-research:2026-10-10" }),
    r("admit", "2026-11-27", "ADMIT_CARD", "Tier 1 admit card (expected)", { confidence: "expected", url: null }),
    r("t1", "2026-11-30", "EXAM", "Tier 1 exam", {
      url: "https://ssc.gov.in",
      notes: "Exam continues till Dec 31, 2026 in multiple shifts; exact date announced on October 1, 2026 · no key published for this stage",
    }),
    r("res27", "2027-02-28", "RESULT", "Tier 1 result (expected)", { confidence: "expected", url: null }),
  ];
}

function story(id: string, iso: string, title: string, extra: Partial<Story> = {}): Story {
  return { id, examId: EXAM_ID, title, body: "body", source: GEN_SOURCE, url: "https://ssc.gov.in", publishedAt: new Date(`${iso}T07:19:28.335Z`), archivedAt: null, ...extra };
}
function seedStories(): Story[] {
  return [
    story("n1005", "2026-10-05", "SSC CHSL 2026 Tier 1 exam dates announced for Nov-Dec 2026", {
      body: "Staff Selection Commission announced that the Tier 1 exam will be conducted from 30th November to 31st December 2026. The notification was released on September 7, 2026 for 2,536 vacancies.",
    }),
    story("n0907", "2026-09-07", "SSC CHSL 2026 notification released with 2,536 vacancies", { url: NOTICE }),
  ];
}

/** An in-memory DB with the Prisma calls the script makes. No delete or
 *  create: calling one throws. A failed transaction restores the rows. */
function fakeDb(opts: { rows?: Row[]; stories?: Story[]; beforeWrite?: () => void; failOnUpdate?: number } = {}) {
  const rows = opts.rows ?? seed();
  const stories = opts.stories ?? seedStories();
  const calls = { update: 0 };
  const forbidden = {
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
  function table<T extends { id: string; examId: string; archivedAt: Date | null }>(list: T[], order: (a: T, b: T) => number) {
    return {
      findMany: async (a: any) =>
        list
          .filter((x) => (a?.where?.examId === undefined || x.examId === a.where.examId) && !(a?.where?.archivedAt === null && x.archivedAt))
          .sort(order)
          .map((x) => ({ ...x })),
      findUnique: async (a: any) => {
        const x = list.find((y) => y.id === a.where.id);
        return x ? { ...x } : null;
      },
      update: async (a: any) => {
        opts.beforeWrite?.();
        calls.update++;
        if (opts.failOnUpdate && calls.update === opts.failOnUpdate) throw new Error("disk full (test)");
        const x = list.find((y) => y.id === a.where.id);
        if (!x) throw new Error("no row");
        Object.assign(x, a.data);
        return { ...x };
      },
      ...forbidden,
    };
  }
  const examImportantDate = table(rows, (x, y) => x.date.getTime() - y.date.getTime() || (x.id < y.id ? -1 : 1));
  const examNewsItem = table(stories, (x, y) => y.publishedAt.getTime() - x.publishedAt.getTime() || (x.id < y.id ? -1 : 1));
  const exam = {
    findUnique: async (a: any) => (a.where.code === "SSC_CHSL" ? { id: EXAM_ID, shortName: "SSC CHSL", eligibility: { officialUrl: PORTAL } } : null),
  };
  const db = {
    exam,
    examImportantDate,
    examNewsItem,
    $transaction: async (fn: (tx: any) => Promise<unknown>) => {
      const snapRows = rows.map((x) => ({ ...x }));
      const snapStories = stories.map((x) => ({ ...x }));
      try {
        return await fn(db);
      } catch (e) {
        rows.splice(0, rows.length, ...snapRows);
        stories.splice(0, stories.length, ...snapStories);
        throw e;
      }
    },
  };
  return { db: db as unknown as Db, rows, stories, calls };
}

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fix-ssc-chsl-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});
const logs = () => fs.readdirSync(tmp).map((f) => ({ f, log: JSON.parse(fs.readFileSync(path.join(tmp, f), "utf8")) as LogFile }));
const quiet = { now: NOW, say: () => {} };
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("selection: by kind, day, host, provenance and exact label — never guessed", () => {
  it("picks exactly the target rows and the story, by group", () => {
    const pick = (g: (typeof GROUPS)[number]) => {
      const s = selectTargets(seed(), seedStories(), [g]);
      return [...s.dates.map((p) => p.row.id), ...s.news.map((p) => p.story.id)];
    };
    expect(pick("apr30")).toEqual(["notif0430", "start0430", "end0531"]);
    expect(pick("mar20")).toEqual(["key0320"]);
    expect(pick("keys25")).toEqual(["key1208", "key0319", "key0420"]);
    expect(pick("nov30")).toEqual(["t1"]);
    expect(pick("news1")).toEqual(["n1005"]);
    expect(selectTargets(seed(), seedStories(), [...GROUPS]).problems).toEqual([]);
  });

  it("the same label on another day, cited to another host, or not generated, is not the target", () => {
    const t = DATE_TARGETS.find((x) => x.group === "nov30")!;
    const t1 = seed().find((x) => x.id === "t1")!;
    expect(matchesDateTarget(t1, t)).toBe(true);
    expect(matchesDateTarget({ ...t1, date: day("2026-12-01") }, t)).toBe(false);
    expect(matchesDateTarget({ ...t1, url: "https://testbook.com/ssc-chsl" }, t)).toBe(false);
    expect(matchesDateTarget({ ...t1, label: "Tier 1 exam (proposed: 30 Nov – 31 Dec 2026)" }, t)).toBe(false);
    for (const source of ["official-research:2026-10-10", "official-watch", SUPPRESSED_SOURCE, null]) expect(matchesDateTarget({ ...t1, source }, t), String(source)).toBe(false);
    expect(matchesDateTarget({ ...t1, archivedAt: NOW }, t)).toBe(false);
    // The 19 Mar final key is not mar20's target (it is keys25's).
    const mar20 = DATE_TARGETS.find((x) => x.group === "mar20")!;
    expect(matchesDateTarget(seed().find((x) => x.id === "key0319")!, mar20)).toBe(false);
  });

  it("a missing row or a doubled row is a problem line, never a guess", () => {
    const gone = seed().map((x) => (x.id === "t1" ? { ...x, archivedAt: NOW } : x));
    const a = selectTargets(gone, seedStories(), ["nov30"]);
    expect(a.dates).toEqual([]);
    expect(a.problems[0]).toMatch(/^nov30: no live generated EXAM row on 2026-11-30 .*nothing to do/);
    const twice = [...seed(), { ...seed().find((x) => x.id === "end0531")!, id: "end0531b" }];
    const b = selectTargets(twice, seedStories(), ["apr30"]);
    expect(ids(b.dates.map((p) => p.row))).toEqual(["notif0430", "start0430"]);
    expect(b.problems).toEqual(["apr30: 2 rows match (end0531, end0531b) — skipped, never guessed"]);
    const noStory = selectTargets(seed(), seedStories().filter((n) => n.id !== "n1005"), ["news1"]);
    expect(noStory.problems[0]).toMatch(/^news1: no live generated story/);
  });

  it("every target has an exact pattern, a reason and SSC's own evidence", () => {
    for (const t of [...DATE_TARGETS, ...NEWS_TARGETS]) {
      const re = "label" in t ? t.label : t.title;
      expect(re.source.startsWith("^") && re.source.endsWith("$"), t.group).toBe(true);
      expect(t.why.length).toBeGreaterThan(40);
      expect(EVIDENCE[t.evidence].url).toMatch(/^https:\/\/ssc\.gov\.in\/api\/attachment\//);
    }
  });
});

describe("what the page shows", () => {
  it("the 30 Apr / 31 May rows and the 20 Mar copy leave the tracker list; nov30 is relabelled", () => {
    const rows = seed();
    const planned = plan(selectTargets(rows, [], ["apr30", "mar20", "nov30"]), NOW);
    const before = trackerLines(rows, NOW, PORTAL);
    const after = trackerLines(simulate(rows, planned), NOW, PORTAL);
    const gone = before.filter((l) => !after.includes(l));
    const added = after.filter((l) => !before.includes(l));
    expect(gone).toEqual([
      "20 Mar 2026 · SSC CHSL 2025 Tier 1 final answer key released · reported · Done",
      "30 Apr 2026 · SSC CHSL 2026 notification released · reported · Done",
      "30 Apr 2026 · Application window start · reported · Done",
      "31 May 2026 · Application window end · reported · Done",
      "30 Nov 2026 · Tier 1 exam · reported · in 48 days",
    ]);
    expect(added).toEqual([`30 Nov 2026 · ${NOV30_LABEL} · reported · in 48 days`]);
  });

  it("the answer-key card: 20 Apr now; the 20 Mar copy if keys25 runs alone; not announced yet with mar20 + keys25", () => {
    const rows = seed();
    const card = (groups: (typeof GROUPS)[number][]) => stripCard(simulate(rows, plan(selectTargets(rows, [], groups), NOW)), "ANSWER_KEY", NOW, PORTAL);
    expect(stripCard(rows, "ANSWER_KEY", NOW, PORTAL)).toBe('20 Apr 2026 · reported · "CHSL 2025 Tier 2 answer key released"');
    expect(card(["keys25"])).toBe('20 Mar 2026 · reported · "SSC CHSL 2025 Tier 1 final answer key released"');
    expect(card(["mar20", "keys25"])).toBe("not announced yet");
    // The notification / application cards are the 7 Sep notice's, before and after.
    const noApr = simulate(rows, plan(selectTargets(rows, [], ["apr30"]), NOW));
    for (const k of ["NOTIFICATION", "APPLICATION_START", "APPLICATION_END"]) {
      expect(stripCard(rows, k, NOW, PORTAL)).toMatch(/^7 (Sept|Oct) 2026 · reported/);
      expect(stripCard(noApr, k, NOW, PORTAL)).toBe(stripCard(rows, k, NOW, PORTAL));
    }
  });

  it("nov30 stays 'reported' — an AI-made row is never official — and keeps the no-key line", () => {
    const rows = seed();
    const [p] = plan(selectTargets(rows, [], ["nov30"]), NOW);
    expect(p).toMatchObject({ table: "date", action: "edit", rowId: "t1" });
    const after = p.after as { label: string; url: string; notes: string; source: string; confidence: string };
    expect(after).toMatchObject({ label: NOV30_LABEL, url: EVIDENCE.schedule.url, source: GEN_SOURCE, confidence: "official" });
    expect(after.notes).toMatch(/proposed dates 30 Nov to 31 Dec 2026/);
    expect(after.notes).not.toMatch(/exact|multiple shifts/i);
    expect(after.notes.endsWith(` · ${NO_KEY_PUBLISHED_NOTE}`)).toBe(true);
    expect(dateRowTier(after.confidence, after.url, PORTAL, after.source)).toBe("reported");
    expect(nov30Notes(null)).not.toMatch(/no key/);
  });

  it("news1 says proposed, cites SSC's notice and is dated the day SSC posted it", () => {
    const [p] = plan(selectTargets(seed(), seedStories(), ["news1"]), NOW);
    expect(p).toMatchObject({ table: "news", action: "edit", rowId: "n1005" });
    const a = p.after as { title: string; body: string; url: string; publishedAt: string; source: string };
    expect(a.title).toMatch(/proposed/);
    expect(a.body).toMatch(/proposed/);
    expect(a.body).not.toMatch(/will be conducted/);
    expect(a.body).toMatch(/about 2,536 tentative vacancies/);
    expect(a).toMatchObject({ url: EVIDENCE.schedule.url, publishedAt: "2026-10-01T12:43:07.517Z", source: GEN_SOURCE });
  });

  it("IndexNow: hub, tracker, their twins, context.md, and the edited story", () => {
    const planned = plan(selectTargets(seed(), seedStories(), [...GROUPS]), NOW);
    const urls = indexNowUrls(planned);
    expect(urls).toContain("https://shishya.in/exams/SSC_CHSL/updates");
    expect(urls).toContain("https://shishya.in/hi/exams/SSC_CHSL/updates");
    expect(urls).toContain("https://shishya.in/exams/SSC_CHSL/context.md");
    expect(urls).toContain("https://shishya.in/exams/SSC_CHSL/news/n1005");
  });
});

describe("the command line: dry run by default", () => {
  it("no flag is a dry run of all; --apply needs --only; comma lists and 'all' work", () => {
    expect(parseCli([])).toMatchObject({ apply: false, only: "all", groups: [...GROUPS], undoFile: null });
    expect(parseCli(["--only", "nov30,apr30"])).toMatchObject({ apply: false, groups: ["apr30", "nov30"], only: "apr30,nov30" });
    expect(parseCli(["--apply", "--only", "all"])).toMatchObject({ apply: true, groups: [...GROUPS], only: "all" });
    expect(() => parseCli(["--apply"])).toThrow(/--only/);
    expect(() => parseCli(["--only", "both"])).toThrow(/not a group/);
  });

  it("refuses unknown flags and flags without a value; --undo takes no group", () => {
    expect(() => parseCli(["--aply", "--only", "all"])).toThrow(/unknown argument/);
    expect(() => parseCli(["--only"])).toThrow(/needs a value/);
    expect(parseCli(["--undo", "x.json"])).toMatchObject({ apply: false, undoFile: "x.json" });
    expect(() => parseCli(["--undo", "x.json", "--only", "apr30"])).toThrow();
  });

  it("a dry run writes no row and no log", async () => {
    for (const argv of [[], ["--only", "apr30"], ["--only", "all"]]) {
      const { db, calls } = fakeDb();
      const lines: string[] = [];
      const out = await run(argv, db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
      expect(out.applied).toBe(false);
      expect(calls.update).toBe(0);
      expect(lines.join("\n")).toMatch(/DRY RUN \(nothing is written\)/);
    }
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  it("the dry run never prints an AI-made row as official", async () => {
    const { db } = fakeDb();
    const lines: string[] = [];
    await run([], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    const listed = lines.filter((l) => /\[ai-generated:claude\]/.test(l));
    expect(listed.length).toBeGreaterThanOrEqual(10);
    for (const l of listed) expect(l, l).not.toMatch(/ official /);
  });
});

describe("guards", () => {
  it("apr30 and keys25 are refused without the 7 Sep 2026 notification row cited to SSC's notice", () => {
    const rows = seed().filter((x) => x.id !== "notif");
    expect(applyRefusals(rows, ["apr30"], NOW)[0]).toMatch(/^apr30: no live NOTIFICATION row on 2026-09-07/);
    expect(applyRefusals(rows, ["keys25"], NOW)[0]).toMatch(/^keys25: /);
    expect(applyRefusals(seed(), ["apr30", "keys25"], NOW)).toEqual([]);
  });

  it("mar20 alone is refused without the 19 Mar twin; with keys25 it goes", () => {
    const rows = seed().filter((x) => x.id !== "key0319");
    expect(applyRefusals(rows, ["mar20"], NOW)[0]).toMatch(/^mar20: no live 19 Mar 2026/);
    expect(applyRefusals(rows, ["mar20", "keys25"], NOW)).toEqual([]);
  });

  it("nov30 and news1 are refused on a stale read of SSC's schedule", () => {
    const later = new Date(new Date(EVIDENCE.schedule.readAt).getTime() + 6 * 86_400_000);
    const out = applyRefusals(seed(), ["nov30", "news1", "apr30"], later);
    expect(out.map((x) => x.split(":")[0])).toEqual(["nov30", "news1"]);
  });

  it("--apply stops before any write when refused", async () => {
    const { db, calls } = fakeDb({ rows: seed().filter((x) => x.id !== "notif") });
    await expect(run(["--apply", "--only", "apr30"], db, { ...quiet, logDir: tmp })).rejects.toThrow(/REFUSED/);
    expect(calls.update).toBe(0);
    expect(fs.readdirSync(tmp)).toEqual([]);
  });
});

describe("apply: archive + suppress or edit, undo log first, one transaction, never a delete", () => {
  it("--only apr30 archives and suppresses the three rows; the log is pending before the write", async () => {
    const pendingSeen: string[] = [];
    const { db, rows, calls } = fakeDb({
      beforeWrite: () => {
        const all = logs();
        expect(all).toHaveLength(1);
        pendingSeen.push(all[0].log.status);
      },
    });
    const out = await run(["--apply", "--only", "apr30"], db, { ...quiet, logDir: tmp });
    expect(out.applied).toBe(true);
    expect(calls.update).toBe(3);
    expect(pendingSeen).toEqual(["pending", "pending", "pending"]);
    const [{ f, log }] = logs();
    expect(f.startsWith(`${LOG_STEM}.apr30.`)).toBe(true);
    expect(log).toMatchObject({ script: LOG_STEM, kind: "apply", status: "applied", only: "apr30" });
    const changed = rows.filter((x) => x.source === SUPPRESSED_SOURCE);
    expect(ids(changed)).toEqual(["notif0430", "start0430", "end0531"]);
    for (const x of changed) expect(x.archivedAt).toEqual(NOW);
    // The refresh writer's suppressed keys (src/lib/exam-data-writer.ts dayKey).
    expect(changed.map((x) => `${resolveKind(x)}|${x.date.toISOString().slice(0, 10)}`)).toEqual([
      "NOTIFICATION|2026-04-30",
      "APPLICATION_START|2026-04-30",
      "APPLICATION_END|2026-05-31",
    ]);
    // Labels, dates and citations are kept; nothing removed, nothing created.
    expect(changed.map((x) => x.label)).toEqual(["SSC CHSL 2026 notification released", "Application window start", "Application window end"]);
    expect(rows).toHaveLength(seed().length);
  });

  it("--only all changes 8 rows and 1 story; every other row is as it was; a second run finds nothing", async () => {
    const { db, rows, stories } = fakeDb();
    await run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp });
    expect(ids(rows.filter((x) => x.source === SUPPRESSED_SOURCE)).sort()).toEqual(["end0531", "key0319", "key0320", "key0420", "key1208", "notif0430", "start0430"]);
    expect(rows.find((x) => x.id === "t1")).toMatchObject({ label: NOV30_LABEL, source: GEN_SOURCE, archivedAt: null });
    expect(stories.find((x) => x.id === "n1005")).toMatchObject({ url: EVIDENCE.schedule.url, publishedAt: new Date("2026-10-01T12:43:07.517Z") });
    const before = new Map(seed().map((x) => [x.id, x]));
    const touched = ["end0531", "key0319", "key0320", "key0420", "key1208", "notif0430", "start0430", "t1"];
    for (const x of rows.filter((y) => !touched.includes(y.id))) expect(x).toEqual(before.get(x.id));
    expect(stories.find((x) => x.id === "n0907")).toEqual(seedStories().find((x) => x.id === "n0907"));
    expect(stripCard(rows, "ANSWER_KEY", NOW, PORTAL)).toBe("not announced yet");
    const second = await run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp });
    expect(second.planned).toEqual([]);
    expect(second.applied).toBe(false);
    expect(second.problems).toHaveLength(DATE_TARGETS.length + NEWS_TARGETS.length);
    expect(logs()).toHaveLength(1);
  });

  it("a failed write rolls the transaction back and leaves the log 'failed'", async () => {
    const { db, rows, stories } = fakeDb({ failOnUpdate: 5 });
    const before = JSON.stringify([rows, stories]);
    await expect(run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp })).rejects.toThrow(/disk full/);
    expect(JSON.stringify([rows, stories])).toBe(before);
    const [{ log }] = logs();
    expect(log.status).toBe("failed");
    expect(log.error).toMatch(/disk full/);
  });

  it("a row changed since the plan stops the whole run", async () => {
    const { db, rows } = fakeDb();
    const planned = plan(selectTargets(seed(), seedStories(), ["apr30", "nov30"]), NOW);
    rows.find((x) => x.id === "t1")!.notes = "edited by hand after the plan";
    const snapshot = JSON.stringify(rows);
    await expect(applyPlanned(db, planned, path.join(tmp, "x.json"), "apr30,nov30", () => {})).rejects.toThrow(/changed since the plan/);
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(logs()[0].log.status).toBe("failed");
  });

  it("has no delete, create or raw write anywhere in the script", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "scripts/fix-ssc-chsl-dates-10-2026.ts"), "utf8");
    expect(src).not.toMatch(/\.delete(Many)?\s*\(/);
    expect(src).not.toMatch(/\.create(Many)?\s*\(/);
    expect(src).not.toMatch(/DELETE\s+FROM/i);
    expect(src).not.toMatch(/\$executeRaw/);
  });
});

describe("undo", () => {
  it("is a dry run without --apply; with it, every row and the story go back exactly", async () => {
    const { db, rows, stories } = fakeDb();
    await run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp });
    const [{ f }] = logs();
    const file = path.join(tmp, f);
    await run(["--undo", file], db, { ...quiet, logDir: tmp });
    expect(rows.filter((x) => x.source === SUPPRESSED_SOURCE)).toHaveLength(7);
    await run(["--undo", file, "--apply"], db, { ...quiet, logDir: tmp });
    expect(rows).toEqual(seed());
    expect(stories).toEqual(seedStories());
    const undoLog = logs().find((x) => x.f.includes(".undo."))!.log;
    expect(undoLog).toMatchObject({ kind: "undo", status: "applied", undoOf: file });
  });

  it("skips a row changed since the apply, and refuses a file that is not an applied log of this script", async () => {
    const { db, rows } = fakeDb();
    await run(["--apply", "--only", "apr30"], db, { ...quiet, logDir: tmp });
    const [{ f }] = logs();
    rows.find((x) => x.id === "end0531")!.notes = "hand edit";
    const lines: string[] = [];
    await run(["--undo", path.join(tmp, f), "--apply"], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    expect(lines.join("\n")).toMatch(/date end0531: changed since this script wrote it — skipped/);
    expect(rows.find((x) => x.id === "notif0430")).toMatchObject({ source: GEN_SOURCE, archivedAt: null });
    expect(rows.find((x) => x.id === "end0531")).toMatchObject({ source: SUPPRESSED_SOURCE });
    const bogus = path.join(tmp, "bogus.json");
    fs.writeFileSync(bogus, JSON.stringify({ script: "other", kind: "apply", status: "applied", entries: [] }));
    await expect(run(["--undo", bogus], db, { ...quiet, logDir: tmp })).rejects.toThrow(/not an applied log/);
  });
});
