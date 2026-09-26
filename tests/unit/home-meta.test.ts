// The home page's meta description (27 Sep 2026) — src/lib/home-meta.ts.
// It was ~300 characters and cut off in results; now the whole platform in
// ≤ 160, the exam count computed, no typed number, nothing claimed that the
// home page's sections do not hold. No DB.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_META_MAX, homeMetaDescription } from "@/lib/home-meta";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";

describe("homeMetaDescription", () => {
  it("fits 160 characters with the count the page loads, the DB-down fallback count, or none", () => {
    expect(HOME_META_MAX).toBe(160);
    for (const count of ["168", "180", "1000", "170+", ""]) {
      const d = homeMetaDescription(count, INDIAN_LANGUAGE_COUNT);
      expect(d.length, `${count}: ${d}`).toBeLessThanOrEqual(HOME_META_MAX);
    }
  });

  it("the whole platform, 'one smart place to study', with the computed counts", () => {
    const d = homeMetaDescription("168", INDIAN_LANGUAGE_COUNT);
    expect(d).toBe(
      `One smart place to study: school chapters, 168 government and entrance exams, free mock tests, colleges, scholarships, careers. A tutor in ${INDIAN_LANGUAGE_COUNT} Indian languages.`,
    );
    for (const w of ["school", "entrance", "government", "mock tests", "colleges", "scholarships", "careers"]) expect(d).toContain(w);
  });

  it("no count: the number-free line; a count too long to fit: the same, never clipped", () => {
    const none = homeMetaDescription("", INDIAN_LANGUAGE_COUNT);
    expect(none).toContain("school chapters, government and entrance exams,");
    expect(homeMetaDescription("1".repeat(40), INDIAN_LANGUAGE_COUNT)).toBe(none);
  });

  it("the home page uses it for its meta and Open Graph description", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/app/page.tsx"), "utf8");
    expect(src).toMatch(/const description = homeMetaDescription\(examCount, INDIAN_LANGUAGE_COUNT\);/);
    expect(src).not.toMatch(/Free practice for anyone studying in India/);
  });
});
