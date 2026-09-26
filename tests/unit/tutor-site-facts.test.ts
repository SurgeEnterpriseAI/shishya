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
import { SITE_FEATURE_PATHS, TUTOR_EXAM_CATEGORY_SLUGS, TUTOR_QUALIFICATION_LEVELS, siteFeaturesBlock } from "@/lib/ai/site-facts";

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
  "/exams/entrance",
  "/exams/state",
  // 26 Sep 2026 (entry points, after G4): the comparison lists.
  "/exams/category/{CATEGORY}",
  "/exams/after/{LEVEL}",
  "/jobs-map",
  "/current-affairs",
  "/typing",
  "/descriptive",
  "/discussions",
  "/ask",
  "/scholarships",
  "/scholarships/match",
  "/scholarships/for/{GROUP}",
  "/scholarships/closing-soon",
  "/me/report",
  "/me/settings",
  "/chat",
  "/onboarding?rerun=1",
  "/ideas",
  // 27 Sep 2026: the public transparency pages.
  "/shishya-in-numbers",
  "/pulse",
  "/mentors",
  "/pricing",
  "/jobs",
  "/colleges",
  "/careers",
  // 26 Sep 2026 (whole-education identity): the other sections.
  "/career-map",
  "/schooling",
  "/schooling/{BOARD}/class-{N}",
  "/schooling/cbse/class-10/board-exam",
  "/schooling/cbse/class-12/board-exam",
  "/distance-learning",
  "/post-graduation",
  "/insights",
  "/for/{PERSONA}",
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
    .replace(/\{YEAR\}/g, "[year]")
    .replace(/\{BOARD\}/g, "[slug]")
    .replace(/class-\{N\}/g, "[classSlug]")
    .replace(/\{PERSONA\}/g, "[persona]")
    // 26 Sep 2026 (entry points, after G4)
    .replace(/\{CATEGORY\}/g, "[slug]")
    .replace(/\{LEVEL\}/g, "[level]")
    .replace(/\{GROUP\}/g, "[filter]")
    .replace(/^\/schooling\/cbse\/class-\d+\//, "/schooling/[slug]/[classSlug]/");
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
    // 26 Sep 2026 (entry points): named as the /ask page's H1.
    expect(block).toContain("- Search or ask Shishya — https://shishya.in/ask:");
    expect(block).toContain("- India's Govt Jobs Map — https://shishya.in/jobs-map:");
    expect(block).toContain(`"Challenge a friend" card on a mock's results page`);
    expect(block).toContain(`"Study group" (make a group, share its invite link`);
    expect(block).toContain(`"Open study room"`);
    expect(block).toContain(`"Alert me on this phone"`);
  });

  it("describes the whole-education sections honestly (26 Sep 2026)", () => {
    const school = block.split("\n").find((l) => l.startsWith("- School — https://shishya.in/schooling:"));
    expect(school, "the /schooling line").toBeTruthy();
    // The class-scoped tutor: Class 8-12, students 13 and above; Class 1-7 content only.
    expect(school).toMatch(/Class 8-12 pages a student aged 13 or above can sign in to ask the AI tutor/);
    expect(school).toMatch(/Class 1-7 pages have no sign-in and no chat tutor/);
    // Official books linked, Shishya's notes only where they exist, no typed chapter count.
    expect(school).toMatch(/official book PDF/);
    expect(school).toMatch(/on the chapters that have them/);
    expect(school!.replace(/Class(?:es)? \d+-\d+|aged 13/g, "")).not.toMatch(/\d/);
    for (const p of ["/career-map", "/distance-learning", "/post-graduation", "/insights", "/for/{PERSONA}", "/schooling/{BOARD}/class-{N}"]) {
      expect(block).toContain(`https://shishya.in${p}`);
    }
    // Every persona slug the /for/{PERSONA} line names is a real persona.
    expect(block).toContain("{PERSONA} = one of the slugs listed on that line");
    expect(block).toMatch(/class-10-student, engineering-aspirant/);
  });
});

// 26 Sep 2026 (entry points): /ask became the whole-platform search in
// 60d3bb6 while its line still said "questions about government jobs", and
// the G4 page families (exam comparison lists, scholarship lists, CBSE
// board-exam pages) had no line, so neither the tutor nor /ask could send a
// student to them.
describe("whole-platform /ask and the G4 pages (26 Sep 2026, entry points)", () => {
  const block = siteFeaturesBlock();
  const line = (prefix: string) => {
    const l = block.split("\n").find((x) => x.startsWith(prefix));
    expect(l, prefix).toBeTruthy();
    return l!;
  };

  it("describes /ask as the search for every section, not government jobs only", () => {
    const ask = line("- Search or ask Shishya — https://shishya.in/ask:");
    expect(ask).not.toMatch(/questions about government jobs/);
    for (const w of ["school class, subject or chapter", "an exam and its dates", "college, scholarship, career", "no login"]) expect(ask).toContain(w);
    expect(ask).toMatch(/instead of teaching from the textbook/);
    expect(ask).toMatch(/Class 1-7 searches get pages only/);
  });

  it("names only category hubs that exist, and none the 26 Sep probe found under or on the floor", async () => {
    const { EXAM_CATEGORIES } = await import("@/lib/exam-categories");
    const slugs = EXAM_CATEGORIES.map((c) => c.slug as string);
    expect(TUTOR_EXAM_CATEGORY_SLUGS.length).toBeGreaterThan(0);
    for (const s of TUTOR_EXAM_CATEGORY_SLUGS) expect(slugs, s).toContain(s);
    for (const s of ["railway", "ssc", "defence", "upsc-civil-services", "medical-entrance", "management-entrance", "design-entrance", "law-entrance"]) {
      expect(TUTOR_EXAM_CATEGORY_SLUGS, s).not.toContain(s);
    }
    expect(line("- Compare exams by category — https://shishya.in/exams/category/{CATEGORY}:")).toContain(
      `{CATEGORY} is one of ${TUTOR_EXAM_CATEGORY_SLUGS.join(", ")}; for any other kind use All exams`,
    );
  });

  it("names only published qualification levels, never the held postgraduation page", async () => {
    const { PUBLISHED_LEVELS, findQualificationLevel } = await import("@/lib/exam-qualification");
    const published = PUBLISHED_LEVELS.map((l) => l.slug as string);
    for (const l of TUTOR_QUALIFICATION_LEVELS) expect(published, l).toContain(l);
    expect(TUTOR_QUALIFICATION_LEVELS).not.toContain("postgraduation");
    expect(findQualificationLevel("postgraduation")?.held).toBeTruthy();
    const after = line("- Exams after 10th, 12th or graduation — https://shishya.in/exams/after/{LEVEL}:");
    expect(after).toContain(`{LEVEL} is one of ${TUTOR_QUALIFICATION_LEVELS.join(", ")}`);
    expect(after).toContain("lowest qualification each one accepts");
    expect(after).toContain("There is no list of exams after postgraduation yet");
  });

  it("names every scholarship list the page renders and the real closing-soon window", async () => {
    const { SCHOLARSHIP_FILTERS, CLOSING_SOON_DAYS } = await import("@/lib/scholarship-lists");
    const lists = line("- Scholarship lists — https://shishya.in/scholarships/for/{GROUP}:");
    expect(lists).toContain(`{GROUP} is one of ${SCHOLARSHIP_FILTERS.map((f) => f.slug).join(", ")}`);
    // The quality critic's vetoed near-copies of /scholarships are not lists.
    expect(lists).not.toMatch(/\b(undergraduate|postgraduate)\b/);
    expect(line("- Scholarships closing soon — https://shishya.in/scholarships/closing-soon:")).toContain(`in the next ${CLOSING_SOON_DAYS} days`);
  });

  it("links a board-exam page only where a CBSE hub exists, as links to CBSE, promising no date sheet", async () => {
    const { findBoardExamHub } = await import("@/data/board-exams");
    for (const n of [10, 12]) {
      expect(findBoardExamHub("cbse", n), `cbse ${n}`).toBeTruthy();
      const l = line(`- CBSE Class ${n} board exam — https://shishya.in/schooling/cbse/class-${n}/board-exam:`);
      expect(l).toContain("no paper is copied onto Shishya");
      expect(l).toContain("whether the date sheet is out yet");
    }
  });

  it("tells the tutor the placeholder values are the listed ones only", () => {
    expect(block).toContain("{CATEGORY}, {LEVEL} and {GROUP} likewise = one of the values listed on their own line — never any other");
  });
});

describe("PLATFORM_PERSONA (26 Sep 2026)", () => {
  it("is the whole-education study companion, without 'community-driven' or 'every stage'", async () => {
    const { PLATFORM_PERSONA } = await import("@/lib/ai/prompts");
    expect(PLATFORM_PERSONA).toContain(
      "a free, AI-supported study companion for students in India — school, entrance and government exams, colleges, scholarships and careers",
    );
    expect(PLATFORM_PERSONA).not.toMatch(/community-driven|every stage/);
  });
});
