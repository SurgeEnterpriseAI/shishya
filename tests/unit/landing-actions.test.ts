import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { careerActions, currentAffairsActions, examNextActions, landingHeading, scholarshipActions } from "@/lib/landing-actions";

// 27 Sep 2026: landing pages that answered one question and offered nothing
// next lost 71–93% of search visitors after one page; "Next on Shishya" puts
// the next steps and the free sign-up offer right under the answer.

describe("examNextActions", () => {
  const exam = { code: "UK_TET", shortName: "UTET" };
  it("leads with the no-sign-in quiz only when the exam has practice", () => {
    const withP = examNextActions(exam, true, "updates", "en");
    expect(withP[0]).toMatchObject({ href: "/exams/UK_TET/quiz", primary: true });
    const without = examNextActions(exam, false, "updates", "en");
    expect(without.some((a) => a.href.endsWith("/quiz"))).toBe(false);
    expect(without[0]).toMatchObject({ href: "/exams/UK_TET", primary: true });
    expect(without[0].label).not.toMatch(/mock/i);
  });
  it("never links a page to itself, and always offers the hub and the tutor", () => {
    const upd = examNextActions(exam, true, "updates", "en").map((a) => a.href);
    expect(upd).not.toContain("/exams/UK_TET/updates");
    expect(upd).toContain("/exams/UK_TET");
    expect(upd.some((h) => h.startsWith("/chat?examCode=UK_TET&seed="))).toBe(true);
    expect(examNextActions(exam, true, "cutoff", "en").map((a) => a.href)).toContain("/exams/UK_TET/updates");
  });
  it("uses the page's locale-preserving link maker for hub and updates", () => {
    const hrefs = examNextActions(exam, true, "cutoff", "hi", (rel) => `/hi${rel}`).map((a) => a.href);
    expect(hrefs).toContain("/hi/exams/UK_TET");
    expect(hrefs).toContain("/hi/exams/UK_TET/updates");
  });
  it("hi and te give the same links with their own words", () => {
    const en = examNextActions(exam, true, "cutoff", "en");
    for (const l of ["hi", "te"]) {
      const x = examNextActions(exam, true, "cutoff", l);
      expect(x.map((a) => a.href)).toEqual(en.map((a) => a.href));
      expect(x[0].label).not.toBe(en[0].label);
    }
    expect(landingHeading("te")).not.toBe(landingHeading("en"));
  });
});

describe("the other landing families", () => {
  it("current affairs leads with a tutor quiz on that month", () => {
    const a = currentAffairsActions("September 2026", "en");
    expect(a[0].primary).toBe(true);
    expect(decodeURIComponent(a[0].href)).toContain("September 2026 current affairs");
    expect(a.map((x) => x.href)).toEqual(expect.arrayContaining(["/live-test", "/exams/browse", "/exam-calendar"]));
  });
  it("scholarships lead with the eligibility match; careers with the tutor", () => {
    expect(scholarshipActions("Adani Foundation Scholarship", "en")[0].href).toBe("/scholarships/match");
    expect(careerActions("Intelligence Officer", "en")[0].href).toMatch(/^\/chat\?general=1&seed=/);
  });
});

describe("placement (source)", () => {
  const ROOT = path.resolve(__dirname, "../..");
  const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
  it.each([
    ["src/app/exams/[code]/updates/page.tsx", 'surface="exam-updates"'],
    ["src/app/exams/[code]/cutoff/page.tsx", 'surface="exam-cutoff"'],
    ["src/app/exams/[code]/syllabus/page.tsx", 'surface="exam-syllabus"'],
    ["src/app/current-affairs/capsule/[month]/page.tsx", 'surface="ca-capsule"'],
    ["src/app/current-affairs/[date]/page.tsx", 'surface="ca-daily"'],
    ["src/app/scholarships/[id]/page.tsx", 'surface="scholarship"'],
    ["src/app/careers/[slug]/page.tsx", 'surface="career"'],
  ])("%s carries the block", (file, surface) => {
    expect(read(file)).toContain(surface);
  });
  it("the sign-up inside it follows the site rule and shows to guests only", () => {
    const src = read("src/components/SignupInline.tsx");
    expect(src).toContain("if (!pitchAllowedPath(location.pathname)) return;");
    expect(src).toContain("if (!alive || signedIn !== false) return;");
  });
});
