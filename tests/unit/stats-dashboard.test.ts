// /admin/stats (13 Oct 2026): IST day helpers, the "saved" estimate, and the
// page stays admin-only. No DB (prisma mocked).
// Run: npx vitest run tests/unit/stats-dashboard.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { fillDays, istToday, savedUsd, windowStart, featureName } from "@/lib/stats-dashboard";

const read = (rel: string) => fs.readFileSync(path.join(__dirname, "../..", rel), "utf8");

describe("IST days", () => {
  it("istToday turns over at IST midnight, not UTC midnight", () => {
    expect(istToday(new Date("2026-10-12T18:29:00Z"))).toBe("2026-10-12");
    expect(istToday(new Date("2026-10-12T18:31:00Z"))).toBe("2026-10-13");
  });
  it("windowStart is IST midnight, days-1 days back", () => {
    expect(windowStart(1, new Date("2026-10-13T03:00:00Z")).toISOString()).toBe("2026-10-12T18:30:00.000Z");
    expect(windowStart(7, new Date("2026-10-13T03:00:00Z")).toISOString()).toBe("2026-10-06T18:30:00.000Z");
  });
  it("fillDays gives one row per day, zero-filled, oldest first", () => {
    const rows = fillDays([{ day: "2026-10-12", v: 5 }], 3, "2026-10-13", (day) => ({ day, v: 0 }));
    expect(rows).toEqual([{ day: "2026-10-11", v: 0 }, { day: "2026-10-12", v: 5 }, { day: "2026-10-13", v: 0 }]);
  });
});

describe("saving estimate", () => {
  it("prices local tokens at Claude Sonnet rates ($3 in / $15 out per million)", () => {
    expect(savedUsd(1_000_000, 0)).toBeCloseTo(3);
    expect(savedUsd(0, 1_000_000)).toBeCloseTo(15);
  });
  it("names jobs in plain words and leaves unknown labels as they are", () => {
    expect(featureName("tutor")).toBe("AI tutor — signed in");
    expect(featureName("brand-new-job")).toBe("brand-new-job");
  });
});

describe("the page", () => {
  it("is admin-only, not indexed, and linked from /admin", () => {
    const page = read("src/app/admin/stats/page.tsx");
    expect(page).toContain("if (!isAdmin) redirect(\"/\");");
    expect(page).toContain("robots: { index: false, follow: false }");
    expect(read("src/app/admin/page.tsx")).toContain('href="/admin/stats"');
  });
  it("hands the client charts no functions (a server page cannot)", () => {
    const page = read("src/app/admin/stats/page.tsx");
    expect(page).not.toMatch(/format=\{/);
  });
});
