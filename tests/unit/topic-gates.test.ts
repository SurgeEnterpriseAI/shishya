// Practice-only topic pages: Google-only noindex (26 Sep 2026, discoverability
// wave 2 G3). A topic with no notes and fewer than 10 checked questions is
// indexable for Bing and the ChatGPT/OAI crawlers but tells Googlebot
// noindex,follow; empty topics stay noindex for everyone; topics with notes
// are unchanged. Pure (src/lib/page-gates-copy.ts) + a source check of the
// page's robots shape. No DB, no network.
// Run: npx vitest run tests/unit/topic-gates.test.ts

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TOPIC_GOOGLE_MIN_QUESTIONS, topicGoogleIndexable, topicIndexable, topicPageMeta } from "@/lib/page-gates-copy";

const meta = (hasNotes: boolean, validatedQuestions: number) =>
  topicPageMeta({ topicName: "Percentage", examShort: "SSC CGL", topicDescription: null, hasNotes, validatedQuestions });

describe("topic index rules", () => {
  it.each([
    // hasNotes, questions, index (all engines), googleIndex
    [false, 0, false, false],
    [false, 1, true, false],
    [false, 9, true, false],
    [false, 10, true, true],
    [false, 250, true, true],
    [true, 0, true, true],
    [true, 3, true, true],
  ])("notes=%s questions=%i → index %s, Google %s", (hasNotes, q, index, google) => {
    const m = meta(hasNotes, q);
    expect(m.index).toBe(index);
    expect(m.googleIndex).toBe(google);
    expect(topicIndexable(hasNotes, q)).toBe(index);
    if (index) expect(topicGoogleIndexable(hasNotes, q)).toBe(google);
  });

  it("the floor is 10 and topicIndexable keeps its two-argument signature", () => {
    expect(TOPIC_GOOGLE_MIN_QUESTIONS).toBe(10);
    expect(topicIndexable.length).toBe(2);
  });

  it("titles are unchanged by the Google rule", () => {
    expect(meta(false, 5).title).toBe("Percentage for SSC CGL — Practice & Study Help | Shishya");
    expect(meta(true, 5).title).toBe("Percentage for SSC CGL — Notes, Practice & Study Help | Shishya");
  });

  it("the page emits googleBot noindex,follow — and only that — for a practice-only topic", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "src/app/exams/[code]/topics/[topicCode]/page.tsx"), "utf8");
    expect(page).toContain("{ robots: { index: true, follow: true, googleBot: { index: false, follow: true } } }");
    expect(page).toContain("? { robots: { index: false, follow: true } }");
    expect(page).toContain("const googleIndex = validatedQuestions === null || meta.googleIndex;");
  });
});
