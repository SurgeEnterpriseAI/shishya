// The site's default robots as a value (3 Oct 2026, fix plan C8, PTF-3).
//
// A page that returned `robots: undefined` cleared the layout's robots block
// and printed no robots meta (84 indexable URLs on 3 Oct). Indexable pages now
// leave the key out (the spread form) or return SITE_DEFAULT_ROBOTS
// (examPageRobots). The layout keeps its own literal (its test stubs every
// import), so this test reads the layout as text and checks the two hold the
// same four values. Pure; no DB, no network.
// Run: npx vitest run tests/unit/site-robots.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { SITE_DEFAULT_ROBOTS } from "@/lib/site-robots";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

/** The object literal after the layout's first `robots: {`, parsed. */
function layoutRobots(): unknown {
  const src = read("src/app/layout.tsx");
  const start = src.indexOf("robots: {");
  expect(start).toBeGreaterThan(-1);
  const open = src.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (let k = open; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}" && --depth === 0) {
      end = k;
      break;
    }
  }
  expect(end).toBeGreaterThan(open);
  return new Function(`return (${src.slice(open, end + 1)});`)();
}

describe("SITE_DEFAULT_ROBOTS", () => {
  it("holds the same four values as the layout's robots block", () => {
    expect(SITE_DEFAULT_ROBOTS).toEqual({ index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 });
    expect(layoutRobots()).toEqual(SITE_DEFAULT_ROBOTS);
  });

  it("the layout does not import it (the layout's test stubs every import)", () => {
    expect(read("src/app/layout.tsx")).not.toContain("site-robots");
  });

  it("the five indexable pages leave the key out instead of passing undefined", () => {
    for (const [file, spread] of [
      ["src/app/after-10th/page.tsx", "...(META_MODEL.indexable ? {} : { robots: { index: false, follow: true } }),"],
      ["src/app/after-12th/page.tsx", "...(META_MODEL.indexable ? {} : { robots: { index: false, follow: true } }),"],
      ["src/app/exams/after/[level]/page.tsx", "...(indexable ? {} : { robots: { index: false, follow: true } }),"],
      ["src/app/scholarships/for/[filter]/page.tsx", "...(indexable ? {} : { robots: { index: false, follow: true } }),"],
      ["src/app/scholarships/closing-soon/page.tsx", "...(isClosingSoonIndexable(list) ? {} : { robots: { index: false, follow: true } }),"],
    ] as const) {
      const src = read(file);
      expect(src, file).toContain(spread);
      expect(src, file).not.toMatch(/robots:[^\n]*\bundefined\b/);
    }
  });
});
