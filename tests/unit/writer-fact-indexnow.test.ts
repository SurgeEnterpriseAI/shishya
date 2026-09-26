// IndexNow on announced-fact changes (26 Sep 2026, G1 index hygiene) —
// src/lib/exam-data-writer.ts. The writer pings the hub, tracker, exam
// calendar and state page for ANY exam whose announced dates changed, and
// only then: a regeneration that re-states the same facts (every run archives
// and re-creates its rows) sends nothing. Fake DB; submitIndexNow is mocked,
// so nothing here touches the network.

import { describe, it, expect, vi, beforeEach } from "vitest";

const submitted: string[][] = [];
vi.mock("@/lib/indexnow", async (orig) => {
  const real = await orig<typeof import("@/lib/indexnow")>();
  return {
    ...real,
    submitIndexNow: vi.fn(async (urls: string[]) => {
      submitted.push(urls);
      return 1;
    }),
    pingIndexNow: vi.fn(async () => {
      throw new Error("network must not be touched");
    }),
  };
});
vi.mock("@/lib/twin-localisation", async (orig) => {
  const real = await orig<typeof import("@/lib/twin-localisation")>();
  return { ...real, loadTwinVerdicts: vi.fn(async () => []) };
});
vi.mock("@/lib/exam-page-gates", () => ({
  GATES_CLOSED: { cutoff: false, tricks: false, guide: false, syllabus: false, buildMock: false },
  examPageGates: vi.fn(async () => ({ cutoff: true, tricks: false, guide: false, syllabus: false, buildMock: false })),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { writeExamInfo, announcedFactKeys, announcedFactsChanged, GEN_SOURCE, SUPPRESSED_SOURCE } from "@/lib/exam-data-writer";

type Row = { id: string; kind: string | null; label: string; date: Date; isExamDay: boolean; confidence: string | null; url: string | null; source?: string | null };

function fakeDb(o: { prior?: Row[]; curated?: Row[]; examWeek?: boolean; exam?: { code: string; state: string | null; officialUrl?: string | null } | null }) {
  const created: unknown[] = [];
  const db = {
    examNewsItem: {
      findMany: async () => [],
      create: async () => ({}),
      update: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
    examImportantDate: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.source === SUPPRESSED_SOURCE) return [];
        if (where.OR) return o.curated ?? [];
        return o.prior ?? [];
      },
      findFirst: async () => (o.examWeek ? { id: "near" } : null),
      updateMany: async () => ({ count: 0 }),
      create: async (args: unknown) => (created.push(args), {}),
    },
    exam: {
      findUnique: async () =>
        o.exam === undefined
          ? { code: "TN_TNPSC_GROUP4", state: "TN", eligibility: { officialUrl: null } }
          : o.exam && { code: o.exam.code, state: o.exam.state, eligibility: { officialUrl: o.exam.officialUrl ?? null } },
    },
  };
  return { db: db as never, created };
}

const NOW = new Date("2026-09-26T06:00:00Z");
const S = "https://shishya.in";
const OFFICIAL = "https://tnpsc.gov.in/notice.pdf";
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const gen = (over: Record<string, unknown>) => ({
  label: "Group 4 exam",
  date: "2026-12-01" as string | null,
  daysFromNow: 0,
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  source: OFFICIAL as string | null,
  notes: null as string | null,
  ...over,
});
const info = (dates: unknown[]) => ({ news: [], dates, inputTokens: 0, outputTokens: 0 }) as never;
const priorRow = (over: Partial<Row>): Row => ({
  id: "p1",
  kind: "EXAM",
  label: "Group 4 exam",
  date: day("2026-12-01"),
  isExamDay: true,
  confidence: "official",
  url: OFFICIAL,
  source: GEN_SOURCE,
  ...over,
});
const FACT_URLS = [`${S}/exams/TN_TNPSC_GROUP4`, `${S}/exams/TN_TNPSC_GROUP4/updates`, `${S}/exam-calendar`, `${S}/exams/state/tamil-nadu`];

beforeEach(() => {
  submitted.length = 0;
});

describe("announcedFactKeys / announcedFactsChanged", () => {
  it("official and reported rows only; kind + IST day + tier; labels ignored", () => {
    const keys = announcedFactKeys([
      priorRow({}),
      priorRow({ id: "p2", label: "Group 4 written exam (reworded)" }),
      priorRow({ id: "p3", kind: "RESULT", date: day("2027-02-01"), url: "https://testbook.com/x" }),
      priorRow({ id: "p4", kind: "ADMIT_CARD", confidence: "expected", url: null }),
      priorRow({ id: "p5", kind: "ANSWER_KEY", url: "https://sarkariresult.com.cm/k" }),
    ]);
    expect([...keys].sort()).toEqual(["EXAM|2026-12-01|official", "RESULT|2027-02-01|reported"]);
    expect(announcedFactsChanged(new Set(["a"]), new Set(["a"]))).toBe(false);
    expect(announcedFactsChanged(new Set(["a"]), new Set(["b"]))).toBe(true);
    expect(announcedFactsChanged(new Set(["a", "b"]), new Set(["a"]))).toBe(true);
    expect(announcedFactsChanged(new Set(), new Set())).toBe(false);
  });
});

describe("writeExamInfo → IndexNow on fact changes", () => {
  it("a newly announced date pings hub, tracker, exam calendar and state page — once, twins withheld without a verdict", async () => {
    const { db } = fakeDb({});
    const res = await writeExamInfo(db, "e1", info([gen({})]), NOW);
    expect(res.factsChanged).toBe(true);
    expect(res.indexNow).toBe(true);
    expect(submitted).toEqual([FACT_URLS]);
  });

  it("a regeneration that re-states the same announced facts sends nothing (the archive + re-create is not a change)", async () => {
    const { db, created } = fakeDb({ prior: [priorRow({})] });
    const res = await writeExamInfo(db, "e1", info([gen({ label: "Group 4 exam (re-worded by the generator)" })]), NOW);
    expect(created).toHaveLength(1);
    expect(res.factsChanged).toBe(false);
    expect(res.indexNow).toBe(false);
    expect(submitted).toEqual([]);
  });

  it("a tier upgrade (reported → official) is a change", async () => {
    const { db } = fakeDb({ prior: [priorRow({ url: "https://testbook.com/tnpsc" })] });
    const res = await writeExamInfo(db, "e1", info([gen({})]), NOW);
    expect(res.factsChanged).toBe(true);
    expect(submitted).toEqual([FACT_URLS]);
  });

  it("estimates moving about, or a date cited only to a denylisted copycat, are not announced facts", async () => {
    const a = fakeDb({ prior: [priorRow({ confidence: "expected", url: null })] });
    expect((await writeExamInfo(a.db, "e1", info([gen({ confidence: "expected", source: null, date: "2026-12-09" })]), NOW)).factsChanged).toBe(false);
    const b = fakeDb({});
    expect((await writeExamInfo(b.db, "e1", info([gen({ source: "https://sarkariresult.com.cm/tnpsc" })]), NOW)).factsChanged).toBe(false);
    expect(submitted).toEqual([]);
  });

  it("inside exam week the exam-week set and the fact set go in ONE submission, de-duplicated", async () => {
    const { db } = fakeDb({ examWeek: true });
    await writeExamInfo(db, "e1", info([gen({ date: "2026-09-28" })]), NOW);
    expect(submitted).toHaveLength(1);
    const urls = submitted[0];
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of FACT_URLS) expect(urls).toContain(u);
    expect(urls).toContain(`${S}/exams/TN_TNPSC_GROUP4/cutoff`);
    expect(urls).toContain(`${S}/exams/TN_TNPSC_GROUP4/checklist`);
    expect(urls.some((u) => /\/(hi|te)\//.test(u))).toBe(false);
  });

  it("a national exam has no state page; an unknown exam sends nothing", async () => {
    const national = fakeDb({ exam: { code: "SSC_CGL", state: null } });
    await writeExamInfo(national.db, "e1", info([gen({})]), NOW);
    expect(submitted).toEqual([[`${S}/exams/SSC_CGL`, `${S}/exams/SSC_CGL/updates`, `${S}/exam-calendar`]]);
    submitted.length = 0;
    const none = fakeDb({ exam: null });
    const res = await writeExamInfo(none.db, "e1", info([gen({})]), NOW);
    expect(res.indexNow).toBe(false);
    expect(submitted).toEqual([]);
  });
});
