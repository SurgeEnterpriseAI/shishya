// A kids' exam is never set for a student by itself (17 Oct 2026, under-13
// safety). The sign-up goal is pinned in tests/unit/signup-goal.test.ts and
// tests/unit/signup-profile.test.ts, /login's words in signup-cta.test.ts;
// here the other places Shishya picks an exam FOR the student:
//   • the onboarding wizard's pre-ticked exams — a persona's pre-pinned set
//     (written by the 1-click confirm) and a stage's suggestions
//     (autoPrepCodes, src/lib/onboarding-options.ts);
//   • the coach's rollover intake, pre-filled with the next exam in the
//     student's track (src/app/coach/page.tsx).
// A student's own pick (a chip, the hub, the tutor, the coach list) is not
// this rule and is unchanged.
// No DB, no network. Run: npx vitest run tests/unit/kids-auto-goal.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { STAGE_OPTIONS, autoPrepCodes } from "@/lib/onboarding-options";
import { UNDER13_ENTRY_EXAM_CODES, UNDER13_OLYMPIAD_CODES, under13ExamGuard } from "@/lib/signin-cta";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

describe("autoPrepCodes: the wizard never ticks a kids' exam by itself", () => {
  it("drops every kids' exam (the guard's own answer) and keeps the rest in order", () => {
    const kids = [...UNDER13_OLYMPIAD_CODES, ...UNDER13_ENTRY_EXAM_CODES, "SOF_IMO", "SZF_IOM", "NSTSE"];
    for (const c of kids) expect(under13ExamGuard(c), c).toBe(true);
    expect(autoPrepCodes(["IOQM", ...kids, "NSEJS"])).toEqual(["IOQM", "NSEJS"]);
    expect(autoPrepCodes([])).toEqual([]);
  });

  it("the 'I'm in Class 10' persona pre-pinned SOF_NSO and SOF_IMO: its pre-fill now keeps only the older students' exams", () => {
    const p = PERSONAS.find((x) => x.slug === "class-10-student")!;
    expect(p.examCodes.some((c) => under13ExamGuard(c))).toBe(true);
    expect(autoPrepCodes(p.examCodes)).toEqual(p.examCodes.filter((c) => !under13ExamGuard(c)));
    expect(autoPrepCodes(p.examCodes)).toContain("IOQM");
  });

  it("no persona's pre-fill and no stage's suggestion carries a kids' exam after it", () => {
    for (const p of PERSONAS) expect(autoPrepCodes(p.examCodes).filter((c) => under13ExamGuard(c)), p.slug).toEqual([]);
    for (const s of STAGE_OPTIONS) expect(autoPrepCodes(s.suggestedPrepCodes).filter((c) => under13ExamGuard(c)), s.value).toEqual([]);
  });

  it("both pre-fills go through it (source)", () => {
    expect(read("src/app/onboarding/page.tsx")).toContain("prepCodes: autoPrepCodes(persona.examCodes),");
    expect(read("src/app/onboarding/OnboardingWizard.tsx")).toContain(
      "if (opt) setPrepCodes(autoPrepCodes(opt.suggestedPrepCodes).filter((c) => exams.some((e) => e.code === c)));",
    );
    // The exam step's chips still list every active exam: a student's own pick is unchanged.
    expect(read("src/app/onboarding/page.tsx")).toMatch(/WHERE "active" = TRUE AND \$\{notSchoolSql\(""\)\}/);
  });
});

describe("the coach's rollover never pre-fills a kids' exam", () => {
  it("the recommended next exam skips a kids' exam by the one guard (source)", () => {
    const src = read("src/app/coach/page.tsx");
    expect(src).toContain('import { under13ExamGuard } from "@/lib/signin-cta";');
    expect(src).toContain("const hit = rows.find((r) => !under13ExamGuard(r.code) && (!practiceCodes || practiceCodes.has(r.code))) ?? null;");
  });
});
