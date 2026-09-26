// The wave's new page families in /sitemap.xml (27 Sep 2026, integration) —
// src/lib/sitemap-sections.ts EXTRA_SITEMAP_PROVIDERS, which src/app/sitemap.ts
// spreads last and de-duplicates. The DB-backed loaders are mocked: this pins
// the wiring (every family reaches the sitemap, only through its own
// indexability rule, and a failing loader lists nothing), not the data.

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  newestMock: new Date("2026-09-25T10:00:00Z") as Date | null,
  mockFails: false,
  hubsFail: false,
}));

vi.mock("@/lib/exam-list-rows", () => ({ getExamListRows: async () => [] }));
vi.mock("@/lib/db/mock-catalogue-db", () => ({
  loadNewestSharedMockAt: async () => {
    if (state.mockFails) throw new Error("Neon hiccup");
    return state.newestMock;
  },
}));
vi.mock("@/lib/db/subject-hubs-db", () => ({
  loadSubjectHubs: async () => {
    if (state.hubsFail) throw new Error("timeout");
    return new Map();
  },
}));

import { EXTRA_SITEMAP_PROVIDERS, extraSitemapEntries } from "@/lib/sitemap-sections";
import { boardExamSitemapEntries } from "@/lib/board-exams";

const BASE = "https://shishya.in";

beforeEach(() => {
  state.newestMock = new Date("2026-09-25T10:00:00Z");
  state.mockFails = false;
  state.hubsFail = false;
});

describe("EXTRA_SITEMAP_PROVIDERS", () => {
  it("lists the board-exam hubs and /mock-tests; empty data lists no category, level or subject hub", async () => {
    const urls = (await extraSitemapEntries(BASE)).map((e) => e.url);
    for (const e of boardExamSitemapEntries(BASE)) expect(urls).toContain(e.url);
    expect(urls).toContain(`${BASE}/mock-tests`);
    expect(urls.some((u) => u.startsWith(`${BASE}/exams/category/`))).toBe(false);
    expect(urls.some((u) => u.startsWith(`${BASE}/exams/after/`))).toBe(false);
    expect(urls.some((u) => u.startsWith(`${BASE}/subjects/`))).toBe(false);
    for (const u of urls) expect(u.startsWith(`${BASE}/`), u).toBe(true);
  });

  it("/mock-tests carries the newest shared mock as lastmod, and none when unknown or unreadable", async () => {
    const find = async () => (await extraSitemapEntries(BASE)).find((e) => e.url === `${BASE}/mock-tests`);
    expect((await find())?.lastModified).toEqual(new Date("2026-09-25T10:00:00Z"));
    state.newestMock = null;
    expect((await find())?.lastModified).toBeUndefined();
    state.mockFails = true;
    const entry = await find();
    expect(entry).toBeDefined();
    expect(entry?.lastModified).toBeUndefined();
  });

  it("a loader that throws contributes nothing; the other families still list", async () => {
    state.hubsFail = true;
    const urls = (await extraSitemapEntries(BASE)).map((e) => e.url);
    expect(urls).toContain(`${BASE}/mock-tests`);
    expect(urls.length).toBeGreaterThanOrEqual(boardExamSitemapEntries(BASE).length + 1);
  });

  it("the scholarship lists stay out while their rows are unreviewed (the page's own noindex rule)", async () => {
    const urls = (await Promise.all(EXTRA_SITEMAP_PROVIDERS.map((p) => p(BASE)))).flat().map((e) => e.url);
    const { SCHOLARSHIP_FILTERS, schemesForFilter, isFilterListIndexable, istToday } = await import("@/lib/scholarship-lists");
    for (const f of SCHOLARSHIP_FILTERS) {
      const listed = urls.includes(`${BASE}/scholarships/for/${f.slug}`);
      expect(listed, f.slug).toBe(isFilterListIndexable(schemesForFilter(f, istToday(new Date()))));
    }
  });
});
