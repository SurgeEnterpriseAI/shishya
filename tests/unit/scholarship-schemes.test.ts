// The scholarship schemes vs the raw catalogue (26 Sep 2026, repair).
//
// src/data/scholarships.ts holds one outside aggregator (Buddy4Study, tag
// "aggregator"). It was counted in every computed scholarship number, listed
// as a card and a MonetaryGrant detail page, and printed under "never an
// aggregator" on /scholarships/context.md. Every count, list, sitemap row
// and related block now reads SCHOLARSHIP_SCHEMES; its old URL redirects.
// No DB, no network.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { SCHOLARSHIP_SCHEMES, isAggregatorListing } from "@/lib/scholarship-schemes";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
/** Source with line and block comments removed (comments may name the old identifier). */
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("SCHOLARSHIP_SCHEMES", () => {
  it("is the catalogue minus its aggregator listings, in catalogue order", () => {
    const aggregators = SCHOLARSHIPS.filter((s) => s.tags.includes("aggregator"));
    expect(aggregators.map((s) => s.id)).toContain("buddy4study-aggregator");
    expect(SCHOLARSHIP_SCHEMES.length).toBe(SCHOLARSHIPS.length - aggregators.length);
    expect(SCHOLARSHIP_SCHEMES.some(isAggregatorListing)).toBe(false);
    expect(SCHOLARSHIP_SCHEMES.map((s) => s.id)).toEqual(SCHOLARSHIPS.filter((s) => !isAggregatorListing(s)).map((s) => s.id));
  });

  it("isAggregatorListing reads the tag", () => {
    expect(isAggregatorListing({ tags: ["aggregator", "discovery"] })).toBe(true);
    expect(isAggregatorListing({ tags: ["merit"] })).toBe(false);
  });
});

describe("every scholarship count, list and sitemap row uses the schemes", () => {
  it.each([
    "src/app/sitemap.ts",
    "src/app/colleges/page.tsx",
    "src/app/context.md/route.ts",
    "src/app/llms-full.txt/route.ts",
    "src/app/scholarships/context.md/route.ts",
    "src/lib/site-description-counts.ts",
    "src/app/scholarships/page.tsx",
  ])("%s", (rel) => {
    const src = code(rel);
    expect(src).toContain("SCHOLARSHIP_SCHEMES");
    expect(src).not.toMatch(/\bSCHOLARSHIPS\b/);
  });

  it("the detail route: static params and related blocks from the schemes; an aggregator URL redirects", () => {
    const src = code("src/app/scholarships/[id]/page.tsx");
    expect(src).toMatch(/SCHOLARSHIP_SCHEMES\.map\(\(s\) => \(\{ id: s\.id \}\)\)/);
    // 26 Sep 2026 (G4): related blocks never offer a discontinued scheme.
    expect(src).toContain("relatedScholarships(s, SCHOLARSHIP_SCHEMES, 8).filter(isOpenScheme).slice(0, 6)");
    expect(src).toContain('if (isAggregatorListing(s)) permanentRedirect("/scholarships");');
  });

  it("no page promises links 'never' reach an aggregator while one is linked", () => {
    expect(read("src/app/editorial-policy/page.tsx")).not.toMatch(/never to a third-party\s+aggregator/);
    expect(read("src/app/editorial-policy/page.tsx")).toMatch(/is labelled as an\s+aggregator and is not counted among the scholarships/);
    expect(read("src/lib/section-context.ts")).not.toContain("never an aggregator");
  });
});
