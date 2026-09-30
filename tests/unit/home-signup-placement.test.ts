// The free sign-up card's place on the home page (30 Sep 2026, founder:
// "move the sign-in card to the right of" Exams today). Source-level pins:
// the card sits in the events grid from lg up, phones keep it at the end of
// the page, and the footer copy steps aside on the home page only at lg.
// Run: npx vitest run tests/unit/home-signup-placement.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("home page: the sign-up card beside the week's events", () => {
  const page = read("src/app/page.tsx");
  const grid = page.slice(page.indexOf('<div className="mt-7 grid gap-4 empty:hidden lg:grid-cols-2'), page.indexOf("<HomeFinder"));

  it("is mounted in the events grid, after the two event blocks", () => {
    expect(grid).toMatch(/<LiveTestTodayBanner data=\{liveToday\} \/>\s*<ExamsTodayStrip \/>\s*<SignupPitch placement="home-side" surface="home-beside-events" \/>/);
  });

  it("phones: the wrapper hides when the (hidden) card is its only child, so no empty gap", () => {
    expect(grid).toContain("max-lg:[&:has(>[data-signup-pitch]:only-child)]:hidden");
  });
});

describe("SignupPitch placements", () => {
  const src = read("src/components/SignupPitch.tsx");

  it("home-side shows only from lg, spans the row when it is alone or third", () => {
    expect(src).toContain('"hidden lg:block lg:[&:first-child]:col-span-2 lg:[&:nth-child(3)]:col-span-2"');
  });

  it("the footer copy steps aside on the home page at lg only — never elsewhere, never on phones", () => {
    expect(src).toContain('const HOME_PATHS = new Set(["/", "/hi", "/te"]);');
    expect(src).toContain("const footerOnHome = !side && HOME_PATHS.has(pathname ?? \"\");");
    expect(src).toContain('`container-prose my-10${footerOnHome ? " lg:hidden" : ""}`');
  });

  it("both placements keep the guest-only, path and no-server-render rules", () => {
    expect(src).toContain("if (!pitchAllowedPath(pathname)) return;");
    expect(src).toContain("if (!alive || signedIn !== false) return;");
    expect(src).toContain("if (!copy) return null;");
    // The placement is decided after those checks, so neither copy can skip them.
    expect(src.indexOf("if (!copy) return null;")).toBeLessThan(src.indexOf('const side = placement === "home-side";'));
  });
});
