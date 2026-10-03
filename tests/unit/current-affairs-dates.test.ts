// Current-affairs times are read, not typed (3 Oct 2026, fix C4).
//
// Every /current-affairs/{date} page said datePublished 02:00 IST and
// dateModified 14:00 IST, and the sitemap said 05:30 IST, while every day was
// written about 06:31 IST. The page and the sitemap now read
// CurrentAffair."generatedAt" through the pure helper in
// src/lib/current-affairs-dates.ts. Sources are read as text — nothing here
// touches the DB.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { dateSpan } from "@/lib/current-affairs-dates";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const d = (s: string) => new Date(s);

describe("dateSpan", () => {
  it("one row → earliest and latest are that row's time", () => {
    const only = d("2026-10-01T01:01:41.751Z");
    const span = dateSpan([only]);
    expect(span?.earliest.toISOString()).toBe("2026-10-01T01:01:41.751Z");
    expect(span?.latest.toISOString()).toBe("2026-10-01T01:01:41.751Z");
  });

  it("several rows → the earliest and the latest, in any order, ignoring null and invalid dates", () => {
    const span = dateSpan([
      d("2026-10-01T01:02:10.000Z"),
      null,
      d("2026-10-01T01:01:41.751Z"),
      undefined,
      new Date("not a date"),
      d("2026-10-01T09:03:00.000Z"),
    ]);
    expect(span?.earliest.toISOString()).toBe("2026-10-01T01:01:41.751Z");
    expect(span?.latest.toISOString()).toBe("2026-10-01T09:03:00.000Z");
  });

  it("returns its own inputs — never a time that was not read", () => {
    const inputs = [d("2026-09-30T01:01:00Z"), d("2026-09-30T01:03:00Z")];
    const span = dateSpan(inputs)!;
    expect(inputs).toContain(span.earliest);
    expect(inputs).toContain(span.latest);
  });

  it("empty list, or nothing valid → null", () => {
    expect(dateSpan([])).toBeNull();
    expect(dateSpan([null, undefined, new Date("x")])).toBeNull();
  });

  it("the helper never reads the clock", () => {
    const src = stripComments(read("src/lib/current-affairs-dates.ts"));
    expect(src).not.toMatch(/new Date\(|Date\.now\(/);
  });
});

describe("the day page states the read times", () => {
  const src = read("src/app/current-affairs/[date]/page.tsx");

  it("no typed publish / modify time is left", () => {
    expect(src).not.toContain("T02:00:00+05:30");
    expect(src).not.toContain("T14:00:00+05:30");
  });

  it("selects generatedAt and builds both fields from the read span, or leaves both out", () => {
    const code = stripComments(src);
    expect(code).toMatch(/"whyItMatters", source, "generatedAt"/);
    expect(code).toMatch(/const written = dateSpan\(rows\.map\(\(r\) => r\.generatedAt\)\)/);
    expect(code).toMatch(/datePublished: written\.earliest\.toISOString\(\), dateModified: written\.latest\.toISOString\(\)/);
    expect(code).toMatch(/\.\.\.\(written\s*\?/);
  });
});

describe("the sitemap reads the write time", () => {
  const src = stripComments(read("src/app/sitemap.ts"));

  it("one grouped SELECT of each date with its newest generatedAt", () => {
    expect(src).toMatch(/SELECT date AS d, MAX\("generatedAt"\) AS g FROM "CurrentAffair" GROUP BY date ORDER BY date DESC LIMIT 400/);
    expect(src).not.toMatch(/SELECT DISTINCT date AS d FROM "CurrentAffair"/);
  });

  it("a day's lastmod is its g; a capsule's lastmod is the newest g of its month", () => {
    expect(src).toMatch(/\.\.\.lastModifiedField\(r\.g\)/);
    expect(src).not.toMatch(/lastModified: r\.d\b/);
    expect(src).toMatch(/lastModifiedField\(dateSpan\(caDates\.filter\(/);
  });
});
