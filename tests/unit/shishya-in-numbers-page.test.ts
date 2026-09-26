// /shishya-in-numbers source rules (27 Sep 2026). Static reads of the new
// files — no DB, no network, no render.
//
//   • the page and its context.md stay statically renderable with hourly
//     ISR: no cookies(), headers(), getT() or getUrlLocale();
//   • no number is typed into the page, its route or its components: after
//     comments and string literals are removed, no 3+ digit literal is left
//     except the revalidate constant and years;
//   • none of the new copy makes a ranking, trust or valuation claim.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const PAGE = "src/app/shishya-in-numbers/page.tsx";
const ROUTE = "src/app/shishya-in-numbers/context.md/route.ts";
const COMPONENTS = ["src/components/numbers/Sparkline.tsx", "src/components/numbers/StatTable.tsx", "src/components/numbers/DefinedNumber.tsx"];
const LIBS = [
  "src/lib/public-stats.ts",
  "src/lib/iso-week.ts",
  "src/lib/source-family.ts",
  "src/lib/public-numbers-rules.ts",
  "src/lib/public-numbers-view.ts",
  "src/lib/public-numbers.ts",
];

/** Source with comments, string literals and template literals removed. */
function code(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && n === "*") {
      i = src.indexOf("*/", i + 2);
      i = i < 0 ? src.length : i + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i++;
      while (i < src.length && src[i] !== c) i += src[i] === "\\" ? 2 : 1;
      i++;
      out += '""';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

describe("/shishya-in-numbers stays static and computed", () => {
  for (const f of [PAGE, ROUTE]) {
    it(`${f} revalidates hourly and reads no request state`, () => {
      const src = read(f);
      expect(src).toMatch(/export const revalidate = 3600;/);
      const c = code(src);
      expect(c).not.toMatch(/\bcookies\s*\(/);
      expect(c).not.toMatch(/\bheaders\s*\(/);
      expect(c).not.toMatch(/\bgetT\b/);
      expect(c).not.toMatch(/\bgetUrlLocale\b/);
      expect(c).not.toMatch(/["']use client["']/);
    });
  }

  for (const f of [PAGE, ROUTE, ...COMPONENTS]) {
    it(`${f} types no statistic`, () => {
      const c = code(read(f)).replace(/export const revalidate = 3600;/, "");
      const literals = (c.match(/\b\d{3,}\b/g) ?? []).filter((d) => !/^20[2-3]\d$/.test(d));
      expect(literals).toEqual([]);
    });
  }

  it("the page loads its numbers from the shared module and the context.md from the same view", () => {
    expect(read(PAGE)).toContain(`from "@/lib/public-numbers"`);
    expect(read(ROUTE)).toContain("numbersMarkdown");
    expect(read(ROUTE)).toContain("contextMarkdownHeaders");
  });
});

describe("new copy makes no ranking, trust or valuation claim", () => {
  const BANNED: RegExp[] = [/#1\b/, /\bbest\b/i, /\blargest\b/i, /\btrusted\b/i, /\bleading\b(?!-)/i, /testimonial/i, /valuation/i, /crore users/i, /AI-generated/i];
  for (const f of [PAGE, ROUTE, ...COMPONENTS, ...LIBS]) {
    it(f, () => {
      // Comments may explain the rule; the shipped strings and markup may not break it.
      const src = read(f).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const re of BANNED) expect(src, String(re)).not.toMatch(re);
    });
  }
});
