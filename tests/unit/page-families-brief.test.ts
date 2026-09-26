// The wave 2 page families in /llms-full.txt and /context.md (27 Sep 2026,
// wave 2 search) — src/lib/page-families-brief.ts as tests.
//
// Pins: the list comes from the sitemap's own providers (never typed); each
// label comes from its family's data; a URL no family knows, a held level or
// another host is dropped; each family is one line and an empty list writes
// nothing; both routes print the block. No DB, no network.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FAMILY_ORDER, familyBriefLines, familyLinks } from "@/lib/page-families-brief";
import { EXAM_CATEGORIES } from "@/lib/exam-categories";
import { PUBLISHED_LEVELS } from "@/lib/exam-qualification";
import { BOARD_EXAM_HUBS } from "@/data/board-exams";
import { boardExamPath } from "@/lib/board-exams";
import { SUBJECT_HUBS, subjectHubPath } from "@/lib/subject-hubs";
import { SCHOLARSHIP_FILTERS } from "@/lib/scholarship-lists";
import { MOCK_TESTS_PATH } from "@/lib/mock-catalogue";

const SITE = "https://shishya.in";
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

/** Every page of every family, as the providers would list them (order shuffled on purpose). */
const ALL = [
  ...SCHOLARSHIP_FILTERS.map((f) => `/scholarships/for/${f.slug}`),
  "/scholarships/closing-soon",
  ...SUBJECT_HUBS.map((d) => subjectHubPath(d.slug)),
  ...BOARD_EXAM_HUBS.map(boardExamPath),
  ...PUBLISHED_LEVELS.map((l) => `/exams/after/${l.slug}`),
  ...EXAM_CATEGORIES.map((c) => `/exams/category/${c.slug}`),
  MOCK_TESTS_PATH,
].map((p) => ({ url: `${SITE}${p}` }));

describe("familyLinks", () => {
  const links = familyLinks(ALL, SITE);

  it("knows every page of every family, in family order, each labelled from its own data", () => {
    expect(links.length).toBe(ALL.length);
    const order = links.map((l) => FAMILY_ORDER.indexOf(l.family));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(links[0]).toEqual({ family: "mock-tests", url: `${SITE}${MOCK_TESTS_PATH}`, label: "Free mock tests" });
    const banking = EXAM_CATEGORIES.find((c) => c.slug === "banking")!;
    expect(links.find((l) => l.url.endsWith("/exams/category/banking"))?.label).toBe(banking.heading);
    const twelfth = PUBLISHED_LEVELS.find((l) => l.slug === "12th")!;
    expect(links.find((l) => l.url.endsWith("/exams/after/12th"))?.label).toBe(`Exams after ${twelfth.afterTitle}`);
    for (const h of BOARD_EXAM_HUBS) expect(links.find((l) => l.url.endsWith(boardExamPath(h)))?.label).toBe(`CBSE Class ${h.cls} board exam ${h.examYear}`);
    for (const d of SUBJECT_HUBS) expect(links.find((l) => l.url.endsWith(subjectHubPath(d.slug)))?.label).toBe(d.name);
    for (const f of SCHOLARSHIP_FILTERS) expect(links.find((l) => l.url.endsWith(`/scholarships/for/${f.slug}`))?.label).toBe(`Scholarships for ${f.audienceTitle}`);
  });

  it("drops what no family knows, a held level, another host and a repeat", () => {
    const got = familyLinks(
      [
        { url: `${SITE}/exams/category/not-a-category` },
        { url: `${SITE}/exams/after/postgraduation` },
        { url: `${SITE}/schooling/cbse/class-9/board-exam` },
        { url: `${SITE}/subjects/not-a-subject` },
        { url: `${SITE}/scholarships/for/boys` },
        { url: `https://example.com${MOCK_TESTS_PATH}` },
        { url: `${SITE}/exams/SSC_CGL` },
        { url: `${SITE}${MOCK_TESTS_PATH}` },
        { url: `${SITE}${MOCK_TESTS_PATH}` },
      ],
      SITE,
    );
    expect(got.map((l) => l.url)).toEqual([`${SITE}${MOCK_TESTS_PATH}`]);
  });
});

describe("familyBriefLines", () => {
  it("one line per family that has a page, each link labelled, nothing typed as a count", () => {
    const lines = familyBriefLines(familyLinks(ALL, SITE));
    expect(lines[0]).toMatch(/^## /);
    const items = lines.filter((l) => l.startsWith("- "));
    expect(items.length).toBe(FAMILY_ORDER.length);
    expect(items.join("\n")).toContain(`[Free mock tests](${SITE}${MOCK_TESTS_PATH})`);
    for (const l of items) expect(l.replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "")).not.toMatch(/\d/);
  });

  it("an empty list writes nothing, and a family with no page has no line", () => {
    expect(familyBriefLines([])).toEqual([]);
    const lines = familyBriefLines(familyLinks([{ url: `${SITE}/exams/category/banking` }], SITE));
    expect(lines.filter((l) => l.startsWith("- "))).toHaveLength(1);
  });
});

describe("the list is the sitemap's own, and both briefs print it", () => {
  it("loadFamilyLinks reads extraSitemapEntries (the registered providers), never a typed list", () => {
    const src = read("src/lib/page-families-brief.ts");
    expect(src).toMatch(/import \{ extraSitemapEntries \} from "@\/lib\/sitemap-sections";/);
    expect(src).toMatch(/familyLinks\(await extraSitemapEntries\(base\), base\)/);
  });

  it("/llms-full.txt and /context.md add the block", () => {
    expect(read("src/app/llms-full.txt/route.ts")).toContain("lines.push(...familyBriefLines(await loadFamilyLinks(SITE)));");
    const ctx = read("src/app/context.md/route.ts");
    expect(ctx).toContain("loadFamilyLinks(SITE),");
    expect(ctx).toContain("familyBriefLines(families)");
  });
});
