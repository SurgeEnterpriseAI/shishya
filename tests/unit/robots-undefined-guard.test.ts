// No page passes `robots: undefined` (3 Oct 2026, fix plan C11, PTF-3).
//
// src/app/layout.tsx sets the default robots ("index, follow,
// max-image-preview:large, max-snippet:-1"). A page whose metadata returns the
// key `robots` with the value undefined clears it, so the page prints no
// robots meta at all (84 indexable URLs on 3 Oct: /after-10th, /after-12th,
// /exams/after/*, /find-your-exam, the exam-day pages). An indexable page
// leaves the key out (`...(noindex ? { robots: {…} } : {})`) or returns
// SITE_DEFAULT_ROBOTS (src/lib/site-robots.ts).
// Source scan only; no DB, no network.
// Run: npx vitest run tests/unit/robots-undefined-guard.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = process.cwd();
const ROBOTS_UNDEFINED = /robots:[^\n]*\bundefined\b/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

describe("robots: undefined", () => {
  it("no file under src/app holds a `robots: … undefined` line", () => {
    const files = sourceFiles(path.join(ROOT, "src/app"));
    expect(files.length).toBeGreaterThan(100);
    const hits: string[] = [];
    for (const f of files) {
      const lines = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n").split("\n");
      lines.forEach((l, i) => {
        if (ROBOTS_UNDEFINED.test(l)) hits.push(`${path.relative(ROOT, f).replace(/\\/g, "/")}:${i + 1}: ${l.trim()}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it("the guard catches the old form and passes the spread form", () => {
    expect(ROBOTS_UNDEFINED.test("    robots: hasAnswers ? { index: false, follow: true } : undefined,")).toBe(true);
    expect(ROBOTS_UNDEFINED.test("    robots: indexable ? undefined : { index: false, follow: true },")).toBe(true);
    expect(ROBOTS_UNDEFINED.test("    ...(hasAnswers ? { robots: { index: false, follow: true } } : {}),")).toBe(false);
  });

  it("/find-your-exam: the bare landing leaves the key out; an answered view is noindex, follow", () => {
    const src = read("src/app/find-your-exam/page.tsx");
    expect(src).toContain("...(hasAnswers ? { robots: { index: false, follow: true } } : {}),");
  });
});
