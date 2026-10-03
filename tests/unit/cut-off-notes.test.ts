// Generators never store a reply cut at the token cap (3 Oct 2026, fix plan
// C9, PTF-1D step 1).
//
// The Hindi-note, tricks and guide generators stored whatever the model sent
// back; replies stopped at max_tokens were stored cut (live: a Hindi note
// ending "<li>**ट", a tricks page ending "E xploitation (against), **", a
// guide ending "A. Chemistry is generally"). Each generator now checks the
// stop reason; src/lib/topic-notes.ts holds the two pure checks that find
// the texts already stored. No generator is run here. No DB, no network.
// Run: npx vitest run tests/unit/cut-off-notes.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { isCutOff, noteHeadingCount } from "@/lib/topic-notes";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("isCutOff", () => {
  it("the three live tails read as cut off", () => {
    expect(isCutOff("## समय और दूरी\n\n- **गति** = दूरी / समय\n- **ट")).toBe(true);
    expect(isCutOff("## English\n\n- **Prefix ex-** — out of: Exit, Export, E xploitation (against), **")).toBe(true);
    expect(isCutOff("## Frequently asked questions\n\n**Q.** Which subject scores best?\n\n**A.** Chemistry is generally")).toBe(true);
  });

  it("a complete ending does not", () => {
    expect(isCutOff("## Overview\n\nSpeed is distance over time.")).toBe(false);
    expect(isCutOff("- **Rule** — keep it short.\n")).toBe(false);
    expect(isCutOff("गति = दूरी / समय।")).toBe(false);
    expect(isCutOff("- Answer: **42**")).toBe(false);
    expect(isCutOff("")).toBe(false);
    expect(isCutOff(null)).toBe(false);
  });
});

describe("noteHeadingCount", () => {
  it("counts '#' to '######' heading lines only", () => {
    expect(noteHeadingCount("# A\n\n## B\ntext #not\n### C\n####### seven\n#nospace")).toBe(3);
    expect(noteHeadingCount("")).toBe(0);
    expect(noteHeadingCount(undefined)).toBe(0);
    expect(noteHeadingCount("# A\r\n## B\r\n")).toBe(2);
  });
});

describe("the generators check the stop reason before storing", () => {
  it.each(["scripts/generate-hindi-notes.ts", "scripts/generate-exam-tricks.ts", "scripts/generate-exam-guides.ts"])("%s", (file) => {
    const src = read(file);
    expect(src).toContain('stop_reason === "max_tokens"');
  });

  it("the Hindi translator's cap is 8000 tokens (4000 cut 246 of 420 notes)", () => {
    const src = read("scripts/generate-hindi-notes.ts");
    expect(src).toContain("max_tokens: 8000,");
    expect(src).not.toContain("max_tokens: 4000,");
  });
});
