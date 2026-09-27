import { describe, expect, it } from "vitest";
import { isChildSchoolPath, pitchAllowedPath, signupHref, signupPitchCopy } from "@/lib/signup-pitch";

// 27 Sep 2026 (founder, evening): a free sign-up offer everywhere except
// school pages below Class 8; content always first; the offer says what an
// account really does and what we take.

describe("where the offer may show", () => {
  it.each([
    "/",
    "/exams/SSC_CGL",
    "/exams/NEET_UG/pyq/2024",
    "/colleges",
    "/scholarships/csss",
    "/careers",
    "/current-affairs",
    "/schooling/cbse/class-8",
    "/schooling/cbse/class-9/science/cell-the-building-block-of-life",
    "/schooling/cbse/class-12",
    "/ask?q=neet",
  ])("shows on %s", (p) => {
    expect(pitchAllowedPath(p)).toBe(true);
  });

  it.each([
    "/schooling",
    "/schooling/",
    "/schooling/cbse",
    "/schooling/cbse/class-1",
    "/schooling/cbse/class-7",
    "/schooling/cbse/class-6/science/the-wonderful-world-of-science",
    "/schooling/icse-cisce/class-5",
    "/chat",
    "/chat?general=1",
    "/login?callbackUrl=%2F",
    "/onboarding",
    "/mocks/abc12345",
    "/attempts/x/results",
    "/dashboard",
    "/me/report",
    "/admin/insights",
  ])("never on %s", (p) => {
    expect(pitchAllowedPath(p)).toBe(false);
  });

  it("child school pages are Class 1-7 and the class-agnostic school pages only", () => {
    expect(isChildSchoolPath("/schooling/cbse/class-7")).toBe(true);
    expect(isChildSchoolPath("/schooling/cbse/class-8")).toBe(false);
    expect(isChildSchoolPath("/schooling/cbse/class-10/science")).toBe(false);
    expect(isChildSchoolPath("/schooling/cbse")).toBe(true);
    expect(isChildSchoolPath("/exams/SSC_CGL")).toBe(false);
  });

  it("the sign-in link returns to the page", () => {
    expect(signupHref("/exams/SSC_CGL?x=1")).toBe("/login?callbackUrl=%2Fexams%2FSSC_CGL%3Fx%3D1&from=pitch");
    expect(signupHref("javascript:x")).toBe("/login?callbackUrl=%2F&from=pitch");
  });
});

describe("the offer's words", () => {
  const en = signupPitchCopy("en");
  it("en, hi and te carry the same shape", () => {
    for (const l of ["hi", "te"]) {
      const c = signupPitchCopy(l);
      expect(Object.keys(c).sort()).toEqual(Object.keys(en).sort());
      expect(c.points.length).toBe(en.points.length);
    }
    expect(signupPitchCopy("ta")).toBe(en);
  });
  it("says exactly what Google shares, that it is free, and the age line", () => {
    expect(en.privacy).toMatch(/name, email and profile picture/);
    expect(en.privacy).toMatch(/Free/);
    expect(en.privacy).toMatch(/13 and above/);
  });
  it("promises nothing an account does not give (date alerts need no account)", () => {
    const all = [en.lead, ...en.points, en.short].join(" ");
    expect(all).not.toMatch(/alert/i);
    expect(all).not.toMatch(/#1|best|guarantee/i);
  });
});
