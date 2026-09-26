// Result permalinks say only what they render (26 Sep 2026, G1 index
// hygiene) — src/lib/result-permalink-copy.ts and its page. Pure + source
// pins; the same helpers were run over all 52 live rows by
// scripts/tmp-w2-g1-results.ts (read-only) before this shipped.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  resultFaq,
  resultInSitemap,
  resultPermalinkDescription,
  resultPermalinkTitle,
  resultRobots,
  type ResultCopyInput,
} from "@/lib/result-permalink-copy";
import { GOOGLE_ONLY_NOINDEX } from "@/lib/news-index-policy";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const base: ResultCopyInput = {
  short: "SSC CGL",
  stage: "Tier 1",
  year: 2026,
  headline: "SSC declared the CGL 2026 Tier 1 result on 20 September.",
  cutoffNote: null,
  nextSteps: null,
  officialName: "Staff Selection Commission",
  declaredLabel: "20 September 2026",
};
const steps = [{ step: "Download the scorecard", note: "from ssc.gov.in" }, { step: "Tier 2 exam" }];

describe("title and description name only what the page renders", () => {
  it.each([
    [null, null, "declared", /^SSC declared .* Verify on the official portal — free on Shishya\.$/],
    ["General ~150", null, "declared & cutoff", /The expected cutoff read — free on Shishya\. Verify on the official portal\.$/],
    [null, steps, "declared & next steps", /The next steps in the SSC CGL selection process — free on Shishya\.$/],
    ["General ~150", steps, "declared, cutoff & next steps", /The expected cutoff read and the next steps in the SSC CGL selection process — free on Shishya\.$/],
  ] as const)("cutoffNote %s, steps %s", (cutoffNote, nextSteps, cover, desc) => {
    const r = { ...base, cutoffNote, nextSteps };
    expect(resultPermalinkTitle(r)).toBe(`SSC CGL Tier 1 Result 2026 — ${cover} | Shishya`);
    expect(resultPermalinkDescription(r)).toMatch(desc);
    const hasCutoff = cutoffNote !== null;
    expect(/cutoff/i.test(resultPermalinkTitle(r))).toBe(hasCutoff);
    expect(/cutoff/i.test(resultPermalinkDescription(r).replace(base.headline, ""))).toBe(hasCutoff);
    expect(/next steps/i.test(resultPermalinkTitle(r))).toBe(nextSteps !== null);
    expect(resultPermalinkDescription(r)).not.toMatch(/exact|analysis/i);
  });

  it("an empty or whitespace cutoffNote and an empty steps list count as none", () => {
    const r = { ...base, cutoffNote: "   ", nextSteps: [] };
    expect(resultPermalinkTitle(r)).toBe("SSC CGL Tier 1 Result 2026 — declared | Shishya");
    expect(resultFaq(r)).toHaveLength(1);
  });
});

describe("resultFaq — one list for the JSON-LD and the page's visible headings", () => {
  it("declared always; cutoff with a cutoffNote; next steps with steps — in that order", () => {
    const all = resultFaq({ ...base, cutoffNote: "General ~150 (expected)", nextSteps: steps });
    expect(all.map((q) => q.question)).toEqual([
      "Has the SSC CGL Tier 1 result been declared?",
      "What is the expected cutoff for the SSC CGL Tier 1?",
      "What happens after the SSC CGL Tier 1 result?",
    ]);
    expect(all[0].answer).toBe(`Yes — declared on 20 September 2026. ${base.headline} Verify on the official portal (Staff Selection Commission).`);
    expect(all[1].answer).toBe("General ~150 (expected)");
    expect(all[2].answer).toBe("1. Download the scorecard — from ssc.gov.in 2. Tier 2 exam");
    expect(resultFaq({ ...base, officialName: null })[0].answer).toMatch(/Verify on the official portal\.$/);
  });

  it("the page prints every question as a heading and builds the FAQPage JSON-LD from the same list", () => {
    const page = stripComments(read("src/app/exams/[code]/results/[id]/page.tsx"));
    expect(page).toMatch(/const faq = resultFaq\(copy\);/);
    expect(page).toMatch(/mainEntity: faq\.map\(\(x\) => \(\{ "@type": "Question", name: x\.question/);
    expect(page).toMatch(/<h2[^>]*>\{declaredQ\.question\}<\/h2>/);
    expect(page).toMatch(/\{declaredQ\.answer\}/);
    expect(page).toMatch(/<h2[^>]*>\{cutoffQ\.question\}<\/h2>/);
    expect(page).toMatch(/<h2[^>]*>\{stepsQ\.question\}<\/h2>/);
    // Everything the list can hold has a place on the page: 3 questions, 3 headings.
    expect(resultFaq({ ...base, cutoffNote: "x", nextSteps: steps })).toHaveLength(3);
  });
});

describe("index: an official link or Google-only noindex, and the sitemap agrees", () => {
  it("resultRobots / resultInSitemap", () => {
    expect(resultRobots("https://ssc.gov.in/result")).toEqual({ index: true, follow: true });
    expect(resultRobots(null)).toBe(GOOGLE_ONLY_NOINDEX);
    expect(resultRobots("")).toBe(GOOGLE_ONLY_NOINDEX);
    expect(resultRobots("ssc.gov.in")).toBe(GOOGLE_ONLY_NOINDEX);
    for (const u of ["https://ssc.gov.in/result", null, "", "ssc.gov.in"]) {
      expect(resultInSitemap(u)).toBe(resultRobots(u) !== GOOGLE_ONLY_NOINDEX);
    }
  });

  it("the page and the sitemap wire them", () => {
    const page = stripComments(read("src/app/exams/[code]/results/[id]/page.tsx"));
    expect(page).toMatch(/robots: resultRobots\(r\.officialUrl\),/);
    expect(page).toMatch(/const title = resultPermalinkTitle\(copy\);/);
    expect(page).toMatch(/const description = resultPermalinkDescription\(copy\);/);
    expect(page).toMatch(/"@type": "Article",/);
    expect(page).not.toMatch(/Expected cutoff analysis|declared, cutoff & next steps/);
    // /cutoff and /syllabus only when those pages render; "study notes" only with notes.
    expect(page).toMatch(/\{gates\.cutoff && \(/);
    expect(page).toMatch(/\{gates\.syllabus && \(/);
    expect(page).toMatch(/newsPermalinkCopy\(r\.short, hasNotes\)\.syllabusLabel/);
    const sm = stripComments(read("src/app/sitemap.ts"));
    expect(sm).toMatch(/\.filter\(\(r\) => resultInSitemap\(r\.officialUrl\)\)/);
  });
});
