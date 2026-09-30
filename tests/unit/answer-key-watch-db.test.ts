// Official watch — the writer (30 Sep 2026), src/lib/answer-key-watch-db.ts.
// Fake DB; IndexNow, page gates and twin verdicts mocked — no network.
//
// One verified release = one ExamImportantDate row (confidence 'official',
// source official-watch, the body's link), the generated rows of the same
// kind within ±30 days archived (expected → official upgrade), a hit logged
// (an answer-key PDF queued for the local importer), IndexNow for the pages
// that print it. A human-suppressed row (same day or link) blocks it; an
// existing row for the same link is not written twice; a dry run writes
// nothing. The raw-SQL ensure matches the Prisma models column for column.

import fs from "node:fs";
import path from "node:path";
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
  examPageGates: vi.fn(async () => ({ cutoff: false, tricks: false, guide: false, syllabus: false, buildMock: false })),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { ENSURE_OFFICIAL_WATCH_SQL, isTwinOfRelease, writeRelease, type WatchDb, type WriteReleaseArgs } from "@/lib/answer-key-watch-db";
import { OFFICIAL_WATCH_SOURCE, SUPPRESSED_SOURCE } from "@/lib/exam-timeline";
import type { VerifiedRelease } from "@/lib/answer-key-watch";

const NOW = new Date("2026-09-30T15:30:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

type Row = { id: string; kind: string | null; label: string; isExamDay: boolean; date: Date; url: string | null; source: string; archivedAt: Date | null };

function fakeDb(rows: Row[]) {
  const created: Record<string, unknown>[] = [];
  const archived: string[] = [];
  const raw: { sql: string; values: unknown[] }[] = [];
  const db = {
    examImportantDate: {
      findMany: async ({ where }: { where: Record<string, any> }) =>
        rows.filter((r) => {
          if (r.source !== where.source) return false;
          if (where.archivedAt === null && r.archivedAt) return false;
          if (where.date && (r.date < where.date.gte || r.date > where.date.lte)) return false;
          return true;
        }),
      findFirst: async ({ where }: { where: Record<string, any> }) =>
        rows.find((r) => r.source === where.source && r.url === where.url && !r.archivedAt) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: "new-row" };
      },
      updateMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        archived.push(...where.id.in);
        return { count: where.id.in.length };
      },
    },
    $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
      raw.push({ sql: strings.join("?"), values });
      return Promise.resolve(1);
    },
    $executeRawUnsafe: async () => 0,
    $queryRaw: async () => [],
  };
  return { db: db as unknown as WatchDb, created, archived, raw };
}

function release(over: Partial<VerifiedRelease> = {}): VerifiedRelease {
  return {
    kind: "ANSWER_KEY",
    url: "https://upsc.gov.in/keys/nda-2026.pdf",
    listingUrl: "https://upsc.gov.in/examinations/answer-keys",
    host: "upsc.gov.in",
    releasedOn: day("2026-09-22"),
    dateSource: "printed",
    note: "date printed beside the link on upsc.gov.in",
    anchorText: "Answer Key",
    text: "Answer Key · NDA & NA (II) 2026 Provisional Answer Key 22/09/2026",
    isPdf: true,
    via: "html",
    ...over,
  };
}

function args(over: Partial<WriteReleaseArgs> = {}): WriteReleaseArgs {
  return {
    exam: { id: "e1", code: "NDA", state: null },
    release: release(),
    label: "Answer key (provisional) — NDA 2026 exam",
    stage: "NDA 2026 exam",
    cycleYear: "2026",
    watchId: "w1",
    now: NOW,
    dry: false,
    indexNow: true,
    ...over,
  };
}

const gen = (id: string, kind: string, iso: string, label = "Answer key (expected)"): Row => ({
  id, kind, label, isExamDay: false, date: day(iso), url: null, source: "ai-generated:claude", archivedAt: null,
});

beforeEach(() => {
  submitted.length = 0;
});

describe("writeRelease", () => {
  it("writes the official row, archives the generated twins of the same kind within ±30 days, logs the hit, pings IndexNow", async () => {
    const f = fakeDb([
      gen("g1", "ANSWER_KEY", "2026-09-25"),
      gen("g2", "OTHER", "2026-10-10", "Answer key release (expected)"), // an answer key stored as OTHER
      gen("g3", "RESULT", "2026-09-25", "Result (expected)"),
      gen("g4", "ANSWER_KEY", "2026-11-15"),
    ]);
    const res = await writeRelease(f.db, args({ siblings: [release({ url: "https://upsc.gov.in/keys/nda-2026-resp.pdf" })] }));
    expect(res).toMatchObject({ status: "written", rowId: "new-row", archivedTwins: 2 });
    expect(f.created[0]).toMatchObject({
      examId: "e1",
      kind: "ANSWER_KEY",
      confidence: "official",
      source: OFFICIAL_WATCH_SOURCE,
      url: "https://upsc.gov.in/keys/nda-2026.pdf",
      isExamDay: false,
      label: "Answer key (provisional) — NDA 2026 exam",
      notes: "date printed beside the link on upsc.gov.in",
    });
    expect((f.created[0].date as Date).toISOString()).toBe("2026-09-22T00:00:00.000Z");
    expect(f.archived.sort()).toEqual(["g1", "g2"]);
    const hits = f.raw.filter((r) => r.sql.includes('INSERT INTO "OfficialWatchHit"'));
    expect(hits).toHaveLength(2);
    expect(hits[0].values).toContain("needs-import"); // an answer-key PDF waits for the local importer
    expect(hits[0].values).toContain("new-row");
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toContain("https://shishya.in/exams/NDA/updates");
    expect(submitted[0]).toContain("https://shishya.in/exams/NDA/context.md");
    expect(submitted[0].some((u) => u.includes("/hi/") || u.includes("/te/"))).toBe(false); // twins not localised → withheld
    expect(res.indexNowUrls).toBe(submitted[0].length);
  });

  it("a result or an HTML notice is not queued for the PDF importer", async () => {
    const f = fakeDb([]);
    await writeRelease(f.db, args({ release: release({ kind: "RESULT", isPdf: true }) }));
    await writeRelease(f.db, args({ release: release({ url: "https://upsc.gov.in/notice/nda-key", isPdf: false }) }));
    const hits = f.raw.filter((r) => r.sql.includes('INSERT INTO "OfficialWatchHit"'));
    expect(hits.every((h) => h.values.includes("n/a"))).toBe(true);
  });

  it("a dry run writes nothing and pings nothing", async () => {
    const f = fakeDb([gen("g1", "ANSWER_KEY", "2026-09-25")]);
    const res = await writeRelease(f.db, args({ dry: true }));
    expect(res).toEqual({ status: "dry-run", archivedTwins: 1, indexNowUrls: 0 });
    expect(f.created).toEqual([]);
    expect(f.archived).toEqual([]);
    expect(f.raw).toEqual([]);
    expect(submitted).toEqual([]);
  });

  it("a human-suppressed row of the same kind and day, or with the same link, blocks the write", async () => {
    const sameDay: Row = { id: "s1", kind: "ANSWER_KEY", label: "Answer key", isExamDay: false, date: day("2026-09-22"), url: null, source: SUPPRESSED_SOURCE, archivedAt: NOW };
    const sameLink: Row = { ...sameDay, id: "s2", date: day("2026-08-01"), url: "https://www.upsc.gov.in/keys/nda-2026.pdf" };
    for (const s of [sameDay, sameLink]) {
      const f = fakeDb([s]);
      const res = await writeRelease(f.db, args());
      expect(res.status).toBe("skipped");
      expect(f.created).toEqual([]);
    }
  });

  it("the same link is never written twice", async () => {
    const existing: Row = { id: "w-row", kind: "ANSWER_KEY", label: "Answer key", isExamDay: false, date: day("2026-09-22"), url: "https://upsc.gov.in/keys/nda-2026.pdf", source: OFFICIAL_WATCH_SOURCE, archivedAt: null };
    const f = fakeDb([existing]);
    expect(await writeRelease(f.db, args())).toMatchObject({ status: "skipped", reason: "already written", rowId: "w-row" });
    expect(f.created).toEqual([]);
  });

  it("without indexNow nothing is submitted", async () => {
    const f = fakeDb([]);
    await writeRelease(f.db, args({ indexNow: false }));
    expect(submitted).toEqual([]);
  });

  // Review, 30 Sep 2026 (nice-to-have 6): every generated row of the kind
  // within ±30 days was archived, whatever its stage or version.
  it("archives only twins of the same stage / sitting and version", async () => {
    const f = fakeDb([
      gen("same", "ANSWER_KEY", "2026-09-20", "NDA 2 2026 provisional answer key — GAT"),
      gen("plain", "ANSWER_KEY", "2026-09-25", "Answer key (expected)"),
      gen("final", "ANSWER_KEY", "2026-10-05", "Final answer key (expected)"),
      gen("other-sitting", "ANSWER_KEY", "2026-09-10", "Answer key — NDA 1 2026"),
    ]);
    const res = await writeRelease(f.db, args({ exam: { id: "e1", code: "NDA", state: null, shortName: "NDA" }, stage: "NDA 2 2026 exam" }));
    expect(res.archivedTwins).toBe(2);
    expect(f.archived.sort()).toEqual(["plain", "same"]);
  });
  it("a Tier 1 result never archives the Tier 2 result row", async () => {
    const f = fakeDb([
      gen("t1", "RESULT", "2026-09-28", "Tier 1 result (expected)"),
      gen("t2", "RESULT", "2026-10-10", "Tier 2 result (expected)"),
    ]);
    const r = release({ kind: "RESULT", url: "https://ssc.gov.in/results/cgl-t1.pdf", text: "Result of Combined Graduate Level Examination 2026 (Tier-I)" });
    await writeRelease(f.db, args({ exam: { id: "e1", code: "SSC_CGL", state: null, shortName: "SSC CGL" }, release: r, stage: "Tier 1 exam concludes" }));
    expect(f.archived).toEqual(["t1"]);
  });
  it("isTwinOfRelease", () => {
    const r = release();
    expect(isTwinOfRelease({ label: "Answer key (expected)" }, r, "NDA 2 2026 exam", ["NDA"])).toBe(true);
    expect(isTwinOfRelease({ label: "Final answer key (expected)" }, r, "NDA 2 2026 exam", ["NDA"])).toBe(false);
    expect(isTwinOfRelease({ label: "NDA 1 2026 answer key" }, r, "NDA 2 2026 exam", ["NDA"])).toBe(false);
    expect(isTwinOfRelease({ label: "Final answer key" }, release({ text: "Final Answer Key NDA (II) 2026" }), "NDA 2 2026 exam", ["NDA"])).toBe(true);
  });
});

describe("the raw-SQL ensure", () => {
  const schema = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const modelFields = (name: string) => {
    const body = new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`).exec(schema)?.[1] ?? "";
    return body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^[a-zA-Z]\w*\s/.test(l))
      .map((l) => l.split(/\s+/)[0])
      .sort();
  };
  const sqlColumns = (table: string) => {
    const sql = ENSURE_OFFICIAL_WATCH_SQL.find((s) => s.includes(`CREATE TABLE IF NOT EXISTS "${table}"`)) ?? "";
    return [...sql.matchAll(/^\s*"(\w+)" /gm)].map((m) => m[1]).sort();
  };
  it("creates both tables only if missing (never a migration on the live DB)", () => {
    expect(ENSURE_OFFICIAL_WATCH_SQL.every((s) => /IF NOT EXISTS/.test(s))).toBe(true);
    expect(ENSURE_OFFICIAL_WATCH_SQL.some((s) => /DROP|ALTER|DELETE|TRUNCATE/i.test(s))).toBe(false);
  });
  it("matches the Prisma models column for column", () => {
    expect(sqlColumns("OfficialWatch")).toEqual(modelFields("OfficialWatch"));
    expect(sqlColumns("OfficialWatchHit")).toEqual(modelFields("OfficialWatchHit"));
    expect(ENSURE_OFFICIAL_WATCH_SQL.join("\n")).toMatch(/"OfficialWatch_examId_kind_listingUrl_key" ON "OfficialWatch"\("examId", "kind", "listingUrl"\)/);
    expect(ENSURE_OFFICIAL_WATCH_SQL.join("\n")).toMatch(/"OfficialWatchHit_examId_url_key" ON "OfficialWatchHit"\("examId", "url"\)/);
  });
});
