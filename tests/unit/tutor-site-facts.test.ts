// Pure unit tests for src/lib/ai/site-facts.ts — the tutor's list of what
// Shishya actually offers (24 Sep 2026). No DB, no model call.
//
// Guards the September finding: asked "how do I remove an exam", the tutor
// invented "Settings → Exams" and a Shishya Android/iOS app. The list must
// name only real routes, and the rendered block must say what does NOT exist.
// And the review finding: a list that calls itself complete while leaving
// out live features makes the tutor deny them — so the live features are
// listed, and only the "Does NOT exist" items may be denied outright.

import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_FEATURE_PATHS, siteFeaturesBlock } from "@/lib/ai/site-facts";

const EXPECTED_PATHS = [
  "/exams/{CODE}",
  "/exams/{CODE}/build-mock",
  "/exams/{CODE}/pyq/{YEAR}",
  "/exams/{CODE}/syllabus",
  "/exams/{CODE}/topics/{TOPIC}",
  "/exams/{CODE}/topics/{TOPIC}/hi",
  "/exams/{CODE}/topics/{TOPIC}/quiz",
  "/exams/{CODE}/quiz",
  "/exams/{CODE}/updates",
  "/exams/{CODE}/archive",
  "/exams/{CODE}/live",
  "/exams/{CODE}/reactions",
  "/exams/{CODE}/cutoff",
  "/exams/{CODE}/tricks",
  "/exams/{CODE}/guide",
  "/exams/{CODE}/checklist",
  "/exams/{CODE}/attempts",
  "/exams/{CODE}/score-estimate",
  "/dashboard",
  "/today",
  "/revision",
  "/coach",
  "/live-test",
  "/exam-calendar",
  "/results",
  "/find-your-exam",
  "/exams/browse",
  "/exams/state",
  "/jobs-map",
  "/current-affairs",
  "/typing",
  "/descriptive",
  "/discussions",
  "/ask",
  "/scholarships",
  "/scholarships/match",
  "/me/report",
  "/me/settings",
  "/chat",
  "/onboarding?rerun=1",
  "/ideas",
  "/mentors",
  "/pricing",
  "/jobs",
  "/colleges",
  "/careers",
  "/schooling",
  "/worldwide",
  "/aptitude",
];

const APP = path.resolve(__dirname, "../../src/app");

/** "/exams/{CODE}/pyq/{YEAR}?x=1" → src/app/exams/[code]/pyq/[year]/page.tsx */
function routeFile(p: string): string {
  const bare = p.split("?")[0];
  const dir = bare
    .replace(/\{CODE\}/g, "[code]")
    .replace(/\{TOPIC\}/g, "[topicCode]")
    .replace(/\{YEAR\}/g, "[year]");
  return path.join(APP, dir, "page.tsx");
}

describe("SITE_FEATURES", () => {
  it("is exactly the fixed, reviewed list of paths", () => {
    expect([...SITE_FEATURE_PATHS]).toEqual(EXPECTED_PATHS);
  });

  it("names only routes that exist in src/app", () => {
    for (const p of SITE_FEATURE_PATHS) {
      expect(existsSync(routeFile(p)), `${p} → ${routeFile(p)}`).toBe(true);
    }
  });
});

describe("siteFeaturesBlock", () => {
  const block = siteFeaturesBlock();

  it("is deterministic — the same bytes for every call (shared 1-hour cache)", () => {
    expect(siteFeaturesBlock()).toBe(block);
    // No dates in the shared prefix — they belong to the per-exam block.
    expect(block).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("links every listed path and no shishya.in path outside the list", () => {
    for (const p of EXPECTED_PATHS) expect(block).toContain(`https://shishya.in${p}`);
    const linked = [...block.matchAll(/https:\/\/shishya\.in(\/[^\s):,;"]*)?/g)].map((m) => m[1] ?? "");
    for (const l of linked) {
      const clean = l.replace(/[.]$/, "");
      if (clean === "") continue; // the home page, where an exam is picked
      expect(EXPECTED_PATHS, clean).toContain(clean);
    }
    // The home page link is a real route too.
    expect(existsSync(path.join(APP, "page.tsx"))).toBe(true);
  });

  it("says plainly what does not exist, and forbids inventing it", () => {
    expect(block).toContain("No Shishya app in the Play Store or App Store");
    expect(block).toMatch(/No way to remove or deactivate an exam/);
    expect(block).toMatch(/it only ADDS exams, it never removes one/);
    expect(block).toContain(`"Suggest a feature"`);
    expect(block).toMatch(/Never invent a menu, setting, app, button or page/);
  });

  it("denies only the 'Does NOT exist' items; anything else unlisted is 'I don't know of it'", () => {
    expect(block).toContain(`Only what is under "Does NOT exist" may be denied outright`);
    expect(block).toContain("do not say Shishya lacks it");
    expect(block).toContain("say you don't know of that feature on Shishya");
    // The first cut's blanket claims are gone.
    expect(block).not.toContain("the ONLY features");
    expect(block).not.toMatch(/not listed, say plainly that Shishya doesn't have that yet/);
  });

  it("points to the features students asked for", () => {
    expect(block).toContain("Build my own mock");
    expect(block).toContain("?pyq=1");
    expect(block).toMatch(/NOT the actual paper/);
    expect(block).toMatch(/Language picker inside every mock/);
    expect(block).toContain("Mistake Notebook");
    expect(block).toContain("Report this question");
  });

  it("lists the live features the first cut left out (review, 24 Sep 2026)", () => {
    // "is there typing practice?" must not be answered "Shishya doesn't have that".
    expect(block).toContain("- Typing skill test practice — https://shishya.in/typing:");
    expect(block).toContain("https://shishya.in/descriptive (free sign-in)");
    expect(block).toContain("- Discussions — https://shishya.in/discussions:");
    expect(block).toContain("- Ask Shishya — https://shishya.in/ask:");
    expect(block).toContain("- India's Govt Jobs Map — https://shishya.in/jobs-map:");
    expect(block).toContain(`"Challenge a friend" card on a mock's results page`);
    expect(block).toContain(`"Study group" (make a group, share its invite link`);
    expect(block).toContain(`"Open study room"`);
    expect(block).toContain(`"Alert me on this phone"`);
  });
});
