// Index shape (13 Sep 2026): writeExamInfo keeps one permalink per story.
// Fake DB — no Prisma, no network (no exam-week row, so no IndexNow ping).

import { describe, it, expect } from "vitest";
import { writeExamInfo } from "@/lib/exam-data-writer";

type Row = { id: string; title: string; body: string; url: string | null; archivedAt: Date | null };

function fakeDb(rows: Row[]) {
  const calls = { create: [] as any[], update: [] as any[], newsUpdateMany: [] as any[] };
  const db = {
    examNewsItem: {
      findMany: async ({ where }: any) =>
        where.source === "ai-generated:claude:suppressed" ? [] :
        rows.filter((r) => (where.archivedAt === null ? r.archivedAt === null : r.archivedAt !== null && r.archivedAt >= where.archivedAt.gte)),
      create: async (args: any) => (calls.create.push(args), {}),
      update: async (args: any) => (calls.update.push(args), {}),
      updateMany: async (args: any) => (calls.newsUpdateMany.push(args), { count: 0 }),
    },
    examImportantDate: {
      findMany: async () => [],
      findFirst: async () => null,
      updateMany: async () => ({ count: 0 }),
      create: async () => ({}),
    },
    exam: { findUnique: async () => null },
  };
  return { db: db as any, calls };
}

const now = new Date("2026-09-13T06:00:00Z");
const info = (news: { title: string; body: string; daysAgo: number; source?: string | null }[]) => ({
  news,
  dates: [],
  inputTokens: 0,
  outputTokens: 0,
});

describe("writeExamInfo — news", () => {
  it("updates a restated story in place instead of archiving it and creating a new row", async () => {
    const { db, calls } = fakeDb([{ id: "n1", title: "SSC CGL 2026: Tier 1 exam dates awaited", body: "Not out.", url: null, archivedAt: null }]);
    const res = await writeExamInfo(db, "exam1", info([{ title: "SSC CGL 2026 Tier 1 exam date announcement expected soon", body: "Still not out.", daysAgo: 0 }]), now);
    expect(calls.create).toHaveLength(0);
    expect(calls.newsUpdateMany).toHaveLength(0);
    expect(calls.update).toEqual([
      { where: { id: "n1" }, data: { title: "SSC CGL 2026 Tier 1 exam date announcement expected soon", body: "Still not out.", url: null } },
    ]);
    expect(res).toMatchObject({ news: 1, newsCreated: 0, newsUpdated: 1, newsRefreshed: 0, newsUnchanged: 0, newsArchived: 0, indexNow: false });
  });

  it("re-dates a matched story whose stated facts changed and drops the old citation", async () => {
    const { db, calls } = fakeDb([
      { id: "n1", title: "SSC CGL 2026 Tier 1 exam date expected in March", body: "Estimate.", url: "https://ssc.gov.in/calendar", archivedAt: null },
    ]);
    const res = await writeExamInfo(db, "exam1", info([{ title: "SSC CGL 2026 Tier 1 exam date expected in June", body: "Estimate moved.", daysAgo: 0 }]), now);
    expect(calls.create).toHaveLength(0);
    expect(calls.update).toEqual([
      { where: { id: "n1" }, data: { title: "SSC CGL 2026 Tier 1 exam date expected in June", body: "Estimate moved.", url: null, publishedAt: now } },
    ]);
    expect(res).toMatchObject({ newsUpdated: 1, newsRefreshed: 1 });
  });

  it("creates a genuinely new story and archives only the story that left", async () => {
    const { db, calls } = fakeDb([{ id: "n1", title: "SSC CGL 2026 Tier 1 admit card expected soon", body: "Soon.", url: null, archivedAt: null }]);
    const res = await writeExamInfo(db, "exam1", info([{ title: "SSC CGL 2026 Tier 1 result declared", body: "Out now.", daysAgo: 1, source: "https://ssc.gov.in/r" }]), now);
    expect(calls.update).toHaveLength(0);
    expect(calls.create).toHaveLength(1);
    expect(calls.create[0].data).toMatchObject({ examId: "exam1", source: "ai-generated:claude", url: "https://ssc.gov.in/r" });
    expect(calls.newsUpdateMany).toEqual([{ where: { id: { in: ["n1"] }, archivedAt: null }, data: { archivedAt: now } }]);
    expect(res).toMatchObject({ newsCreated: 1, newsArchived: 1 });
  });

  it("an empty generation never touches the stored news", async () => {
    const { db, calls } = fakeDb([{ id: "n1", title: "SSC CGL 2026 Tier 1 admit card expected soon", body: "Soon.", url: null, archivedAt: null }]);
    await writeExamInfo(db, "exam1", info([]), now);
    expect(calls.create.length + calls.update.length + calls.newsUpdateMany.length).toBe(0);
  });
});
