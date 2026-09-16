// A human beats the generator (16 Sep 2026): the refresh writer must not
// re-create or revive what a human suppressed, must not write a generated
// milestone beside a curated row of the same kind, and must treat an
// "Answer key" row stored as OTHER as an answer-key row.
// Fake DB — no Prisma, no network (no exam-week row, so no IndexNow ping).

import { describe, it, expect } from "vitest";
import { writeExamInfo, SUPPRESSED_SOURCE, GEN_SOURCE } from "@/lib/exam-data-writer";
import { buildTimeline, resolveKind } from "@/lib/exam-timeline";

type DateRow = { kind: string | null; label: string; date: Date; isExamDay: boolean };

function fakeDb(opts: { suppressedNews?: string[]; curated?: DateRow[]; suppressedDates?: DateRow[] }) {
  const calls = { newsCreate: [] as any[], newsUpdate: [] as any[], dateCreate: [] as any[], dateArchive: [] as any[] };
  const db = {
    examNewsItem: {
      findMany: async ({ where }: any) =>
        where.source === SUPPRESSED_SOURCE ? (opts.suppressedNews ?? []).map((title) => ({ title })) : [],
      create: async (args: any) => (calls.newsCreate.push(args), {}),
      update: async (args: any) => (calls.newsUpdate.push(args), {}),
      updateMany: async () => ({ count: 0 }),
    },
    examImportantDate: {
      findMany: async ({ where }: any) => {
        if (where.source === SUPPRESSED_SOURCE) return opts.suppressedDates ?? [];
        if (where.OR) return opts.curated ?? [];
        return []; // prior generated rows
      },
      findFirst: async () => null,
      updateMany: async (args: any) => (calls.dateArchive.push(args), { count: 0 }),
      create: async (args: any) => (calls.dateCreate.push(args), {}),
    },
    exam: { findUnique: async () => null },
  };
  return { db: db as any, calls };
}

const now = new Date("2026-09-16T12:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const gen = (over: Record<string, unknown>) => ({
  label: "x",
  date: null as string | null,
  daysFromNow: 0,
  isExamDay: false,
  kind: "OTHER",
  confidence: "expected",
  source: null as string | null,
  notes: null as string | null,
  ...over,
});
const info = (news: any[], dates: any[]) => ({ news, dates, inputTokens: 0, outputTokens: 0 }) as any;

describe("writeExamInfo — suppressed stories", () => {
  it("drops a generated story that restates a suppressed one and writes nothing", async () => {
    const { db, calls } = fakeDb({ suppressedNews: ["Application window closed for 2,784 MP RAEO vacancies"] });
    const res = await writeExamInfo(db, "e1", info([{ title: "Application window closed for 2,784 MP RAEO vacancies", body: "b", daysAgo: 1 }], []), now);
    expect(calls.newsCreate).toHaveLength(0);
    expect(calls.newsUpdate).toHaveLength(0);
    expect(res.newsSuppressed).toBe(1);
  });

  it("does not suppress an undated headline that may be a real new postponement", async () => {
    const { db, calls } = fakeDb({ suppressedNews: ["MP RAEO exam date postponed from August to September"] });
    const res = await writeExamInfo(db, "e1", info([{ title: "MP RAEO exam date postponed", body: "b", daysAgo: 0 }], []), now);
    expect(calls.newsCreate).toHaveLength(1);
    expect(res.newsSuppressed).toBe(0);
  });

  it("still writes an unrelated story", async () => {
    const { db, calls } = fakeDb({ suppressedNews: ["Application window closed for 2,784 MP RAEO vacancies"] });
    const res = await writeExamInfo(db, "e1", info([{ title: "MP RAEO 2026 admit card released by MPESB", body: "b", daysAgo: 0 }], []), now);
    expect(calls.newsCreate).toHaveLength(1);
    expect(calls.newsCreate[0].data.source).toBe(GEN_SOURCE);
    expect(res.newsSuppressed).toBe(0);
  });
});

describe("writeExamInfo — dates", () => {
  const curatedExam: DateRow = { kind: "EXAM", label: "Online exam begins — shifts 09:00–12:00", date: day("2026-09-17"), isExamDay: true };

  it("lets an officially cited postponement through (later date, or a change notice)", async () => {
    const { db, calls } = fakeDb({ curated: [curatedExam] });
    const res = await writeExamInfo(
      db,
      "e1",
      info([], [
        gen({ label: "Exam postponed", kind: "EXAM", date: "2026-10-04", confidence: "official", source: "https://esb.mp.gov.in/postponed.pdf" }),
        gen({ label: "Corrigendum: exam rescheduled", kind: "EXAM", date: "2026-09-16", confidence: "official", source: "https://esb.mp.gov.in/c.pdf" }),
        gen({ label: "Exam (reported)", kind: "EXAM", date: "2026-10-01", confidence: "expected" }),
      ]),
      now,
    );
    expect(calls.dateCreate.map((c) => c.data.date.toISOString().slice(0, 10))).toEqual(["2026-10-04", "2026-09-16"]);
    expect(res.datesDropped).toBe(1);
  });

  it("keeps an existing official answer-key row stored as OTHER instead of duplicating it", async () => {
    const { db, calls } = fakeDb({});
    db.examImportantDate.findMany = async ({ where }: any) =>
      where.source === GEN_SOURCE
        ? [{ id: "p1", kind: "OTHER", label: "Answer Key objection window closes", date: day("2026-08-31"), confidence: "official", url: "https://ctet.nic.in/k" }]
        : [];
    await writeExamInfo(
      db,
      "e1",
      info([], [gen({ label: "Answer Key objection window closes", kind: "OTHER", date: "2026-08-31", confidence: "official", source: "https://ctet.nic.in/k" })]),
      now,
    );
    // The re-confirmed row supersedes the prior one: prior archived, one new row, no duplicate kept live.
    expect(calls.dateArchive[0].where.id).toBeUndefined();
    expect(calls.dateCreate).toHaveLength(1);
  });

  it("drops a generated EXAM row beside a curated exam row, keeps a far-off RESULT", async () => {
    const { db, calls } = fakeDb({ curated: [curatedExam] });
    const res = await writeExamInfo(
      db,
      "e1",
      info([], [
        gen({ label: "Exam (starts)", kind: "EXAM", date: "2026-09-15", confidence: "official", source: "http://esb.mp.gov.in/" }),
        gen({ label: "Result (expected)", kind: "RESULT", date: "2026-11-15" }),
      ]),
      now,
    );
    expect(calls.dateCreate.map((c) => c.data.kind)).toEqual(["RESULT"]);
    expect(res.datesDropped).toBe(1);
  });

  it("still writes a later stage (Mains months after a curated Prelims)", async () => {
    const { db, calls } = fakeDb({ curated: [curatedExam] });
    await writeExamInfo(db, "e1", info([], [gen({ label: "Mains (expected)", kind: "EXAM", date: "2026-12-20" })]), now);
    expect(calls.dateCreate).toHaveLength(1);
  });

  it("drops a generated row on a suppressed kind + day", async () => {
    const { db, calls } = fakeDb({
      suppressedDates: [{ kind: "EXAM", label: "UPSC CSE 2026 Mains (expected)", date: day("2026-09-18"), isExamDay: true }],
    });
    const res = await writeExamInfo(db, "e1", info([], [gen({ label: "UPSC CSE 2026 Mains (expected)", kind: "EXAM", date: "2026-09-18" })]), now);
    expect(calls.dateCreate).toHaveLength(0);
    expect(res.datesDropped).toBe(1);
  });

  it("keeps the live generation when every returned row was dropped", async () => {
    const { db, calls } = fakeDb({ curated: [curatedExam] });
    await writeExamInfo(db, "e1", info([], [gen({ label: "Exam", kind: "EXAM", date: "2026-09-17", confidence: "official", source: "http://esb.mp.gov.in/" })]), now);
    expect(calls.dateArchive).toHaveLength(0);
    expect(calls.dateCreate).toHaveLength(0);
  });

  it("an uncited 'Answer key (expected)' stored as OTHER is dropped; a cited official one is written", async () => {
    const { db, calls } = fakeDb({});
    const res = await writeExamInfo(
      db,
      "e1",
      info([], [
        gen({ label: "Answer key (expected)", kind: "OTHER", date: "2026-10-05" }),
        gen({ label: "Provisional answer key", kind: "OTHER", date: "2026-10-06", confidence: "official", source: "https://esb.mp.gov.in/key.pdf" }),
      ]),
      now,
    );
    // Stored as generated (OTHER); readers resolve the answer-key label.
    expect(calls.dateCreate.map((c) => [c.data.label, c.data.kind])).toEqual([["Provisional answer key", "OTHER"]]);
    expect(res.datesDropped).toBe(1);
  });
});

describe("exam-timeline — answer key stored as OTHER", () => {
  it("resolves to ANSWER_KEY and an expected one never reaches the timeline", () => {
    expect(resolveKind({ kind: "OTHER", label: "Answer key (expected)", isExamDay: false })).toBe("ANSWER_KEY");
    expect(resolveKind({ kind: "OTHER", label: "Counselling round 1", isExamDay: false })).toBe("OTHER");
    const rows = buildTimeline(
      [{ id: "r1", label: "Answer key (expected)", date: "2026-10-05T00:00:00Z", isExamDay: false, kind: "OTHER", confidence: "expected" }],
      now,
    );
    expect(rows).toHaveLength(0);
  });
});
