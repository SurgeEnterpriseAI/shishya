// Activation of the national / PG exams (27 Sep 2026): the pure readiness
// check behind scripts/activate-national-exams.ts, and the UP_UPCET rename
// (scripts/rename-upcet.ts + the seed). No DB, no network.
// Run: npx vitest run tests/unit/activate-national-exams.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { activationReadiness, NEVER_ACTIVATE, type ReadinessInput } from "../../scripts/activation-readiness";
import { examColumns, expandSpecs, type NationalExamsFile } from "../../scripts/national-exams-plan";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");
const file = JSON.parse(read("data/national-exams-2026.json")) as NationalExamsFile;
const specs = expandSpecs(file);

/** The row scripts/add-national-exams.ts wrote for a spec: inactive, official site, its dates. */
function asWritten(code: string, over: Partial<ReadinessInput> = {}): ReadinessInput {
  const s = specs.find((x) => x.code === code)!;
  return {
    code,
    row: { ...examColumns(s), active: false, category: s.exam.category },
    officialUrl: s.eligibility.officialUrl,
    officialDates: s.dates.length,
    ...over,
  };
}

describe("activationReadiness", () => {
  it("every exam as the add script wrote it passes, except CSIR NET and JNVST", () => {
    const pass = specs.filter((s) => activationReadiness(asWritten(s.code)).ready).map((s) => s.code).sort();
    expect(pass).toEqual(
      ["BITSAT", "CLAT", "CUET_PG", "GATE_CE", "GATE_DA", "GATE_ECE", "GATE_EE", "GATE_ME", "IIT_JAM", "SSC_CPO", "SSC_JE", "UGC_NET"].sort(),
    );
    for (const c of ["CSIR_NET", "JNVST"]) {
      const v = activationReadiness(asWritten(c));
      expect(v.ready, c).toBe(false);
      expect(v.fails[0], c).toMatch(/^never activated by this script: /);
    }
    expect(Object.keys(NEVER_ACTIVATE).sort()).toEqual(["CSIR_NET", "JNVST"]);
  });

  it("BITSAT has no official date but the official syllabus link carries it", () => {
    const v = activationReadiness(asWritten("BITSAT", { officialDates: 0 }));
    expect(v.ready).toBe(true);
    expect(v.passes.some((p) => p.startsWith("official syllabus link"))).toBe(true);
  });

  it("fails: no row, no https official site, a stored pattern that drifted", () => {
    expect(activationReadiness(asWritten("CLAT", { row: null })).fails).toContain("no Exam row — run scripts/add-national-exams.ts --apply first");
    expect(activationReadiness(asWritten("CLAT", { officialUrl: null })).fails).toContain("no https official site (ExamEligibility.officialUrl)");
    expect(activationReadiness(asWritten("CLAT", { officialUrl: "http://consortiumofnlus.ac.in/" })).ready).toBe(false);
    const drifted = asWritten("CLAT");
    const v = activationReadiness({ ...drifted, row: { ...drifted.row!, totalQuestions: 150 } });
    expect(v.ready).toBe(false);
    expect(v.fails.join(" ")).toContain("stored pattern differs");
  });

  it("an exam not in the file, or a school container, never passes; an active one is reported, not re-activated", () => {
    const v = activationReadiness({ code: "SSC_CGL", row: { totalQuestions: 100, totalMarks: 200, durationMin: 60, marksPerQ: 2, negativeMark: 0.5, active: true, category: "GOVT_JOBS" }, officialUrl: "https://ssc.gov.in/", officialDates: 3 });
    expect(v.ready).toBe(false);
    expect(v.fails).toContain("not in data/national-exams-2026.json (no official facts)");
    const w = asWritten("CLAT");
    expect(activationReadiness({ ...w, row: { ...w.row!, category: "SCHOOL_BOARD" } }).ready).toBe(false);
    const active = activationReadiness({ ...w, row: { ...w.row!, active: true } });
    expect(active.alreadyActive).toBe(true);
    expect(active.ready).toBe(false);
  });

  it("no official date and no syllabus link fails", () => {
    // Every spec has a syllabus link, so blank it through a code with none.
    const v = activationReadiness({ ...asWritten("CLAT"), code: "NOT_IN_FILE", officialDates: 0 });
    expect(v.fails).toContain("no official-tier tracker date and no official syllabus link");
  });
});

describe("the activation script — dry run by default, writes only active = true", () => {
  const src = read("scripts/activate-national-exams.ts");
  it("apply only on --apply; a guarded single-column update; never a deactivation", () => {
    expect(src).toContain('const apply = process.argv.includes("--apply");');
    expect(src).toContain("prisma.exam.updateMany({ where: { id: v.id!, active: false }, data: { active: true } })");
    expect(src).not.toMatch(/active:\s*false\s*}\s*\)/);
    expect(src.match(/prisma\.\w+\.(update|updateMany|create|upsert|delete|deleteMany)\(/g)).toEqual(["prisma.exam.updateMany("]);
    expect(src).toMatch(/if \(!apply\) \{\s*console\.log\("\\nDry run — pass --apply to write\."\);\s*return;/);
  });
});

describe("UP_UPCET no longer says CUET PG", () => {
  it("the rename script: old → new name, guarded on the old name, dry run by default", () => {
    const src = read("scripts/rename-upcet.ts");
    expect(src).toContain('export const OLD_NAME = "UP Combined Entrance Test (UPCET / CUET PG-style)";');
    expect(src).toContain('export const NEW_NAME = "UP Combined Entrance Test (UPCET)";');
    expect(src).toContain("prisma.exam.updateMany({ where: { id: row.id, name: OLD_NAME }, data: { name: NEW_NAME } })");
    expect(src).toContain('const apply = process.argv.includes("--apply");');
    expect("UP Combined Entrance Test (UPCET)").not.toMatch(/cuet/i);
  });

  it("the seed carries the new name, so a re-seed does not bring the old one back", () => {
    const seed = read("seed/exams/state-exams.ts");
    expect(seed).toContain('{ code: "UP_UPCET", state: "UP", name: "UP Combined Entrance Test (UPCET)", shortName: "UPCET",');
    expect(seed).not.toContain('name: "UP Combined Entrance Test (UPCET / CUET PG-style)"');
  });
});
