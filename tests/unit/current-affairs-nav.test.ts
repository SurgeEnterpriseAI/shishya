// /current-affairs/[date] previous / next links (26 Sep 2026): the nearest
// dates that HAVE rows, never date ± 1 — the digest skips days (09-15,
// 09-17, 09-22 and 09-25 in September 2026), and date ± 1 would link a 404.

import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({ dates: [] as string[], fail: false, sql: [] as string[] }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRawUnsafe: async (sql: string, date: string) => {
      state.sql.push(sql);
      if (state.fail) throw new Error("db down");
      const before = state.dates.filter((d) => d < date).sort();
      const after = state.dates.filter((d) => d > date).sort();
      if (/MAX\(date\)/.test(sql) && /date < \$1::date/.test(sql)) return [{ d: before.length ? before[before.length - 1] : null }];
      if (/MIN\(date\)/.test(sql) && /date > \$1::date/.test(sql)) return [{ d: after.length ? after[0] : null }];
      throw new Error(`unexpected SQL: ${sql}`);
    },
  },
}));

import { caNavLinks, loadCaNeighbours } from "@/lib/current-affairs-nav";

beforeEach(() => {
  // The live September pattern: no 09-15, 09-17, 09-22 or 09-25.
  state.dates = ["2026-09-13", "2026-09-14", "2026-09-16", "2026-09-18", "2026-09-21", "2026-09-23", "2026-09-24", "2026-09-26"];
  state.fail = false;
  state.sql = [];
});

describe("loadCaNeighbours — the nearest dates with rows", () => {
  it("skips a gap on both sides (09-16 → 09-14 and 09-18)", async () => {
    expect(await loadCaNeighbours("2026-09-16")).toEqual({ prev: "2026-09-14", next: "2026-09-18" });
  });

  it("skips a two-day gap (09-24 → 09-23 and 09-26, never the 404 at 09-25)", async () => {
    const n = await loadCaNeighbours("2026-09-24");
    expect(n).toEqual({ prev: "2026-09-23", next: "2026-09-26" });
    expect(n.next).not.toBe("2026-09-25");
  });

  it("the newest day has no next link, the oldest no previous one", async () => {
    expect(await loadCaNeighbours("2026-09-26")).toEqual({ prev: "2026-09-24", next: null });
    expect(await loadCaNeighbours("2026-09-13")).toEqual({ prev: null, next: "2026-09-14" });
  });

  it("a failed read or a malformed date links nothing", async () => {
    state.fail = true;
    expect(await loadCaNeighbours("2026-09-16")).toEqual({ prev: null, next: null });
    state.fail = false;
    state.sql = [];
    expect(await loadCaNeighbours("2026-9-16")).toEqual({ prev: null, next: null });
    expect(state.sql).toEqual([]);
  });
});

describe("caNavLinks", () => {
  it("previous, the month capsule, next, and the exam catalogue", () => {
    expect(caNavLinks("2026-09-16", { prev: "2026-09-14", next: "2026-09-18" })).toEqual([
      { href: "/current-affairs/2026-09-14", label: "← 14 September 2026", rel: "prev" },
      { href: "/current-affairs/capsule/2026-09", label: "September 2026 capsule" },
      { href: "/current-affairs/2026-09-18", label: "18 September 2026 →", rel: "next" },
      { href: "/exams/browse", label: "Government and entrance exams" },
    ]);
  });

  it("no day link without a neighbour", () => {
    const hrefs = caNavLinks("2026-09-26", { prev: "2026-09-24", next: null }).map((l) => l.href);
    expect(hrefs).toEqual(["/current-affairs/2026-09-24", "/current-affairs/capsule/2026-09", "/exams/browse"]);
  });
});
