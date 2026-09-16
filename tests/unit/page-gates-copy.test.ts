// Pure unit tests for src/lib/page-gates-copy.ts (16 Sep 2026) — the words
// that depend on what an exam's pages hold: the context.md / Ask age line,
// the MP_MPESB → MP_RAEO cross-link, the topic / syllabus page titles and the
// news permalink's notes wording.
// No DB. Run with: npx vitest run tests/unit/page-gates-copy.test.ts
//
// Guards the 16 Sep scout findings: MP_RAEO's context.md gave the central
// "OBC +3, SC/ST +5" relaxation against the MP rule book; topic and syllabus
// pages promised study notes (and topic tests) for exams with none.

import { describe, it, expect } from "vitest";

import {
  RELATED_EXAM_PAGES,
  ageEligibilityLine,
  askAgeSummary,
  newsPermalinkCopy,
  relatedExamLines,
  syllabusPageCopy,
  topicIndexable,
  topicPageMeta,
} from "@/lib/page-gates-copy";

const MP_RULE = "Up to 45 for MP-domicile SC/ST/OBC, women, PwD, Home Guards";

describe("age line — the exam's own relaxation, never an assumed central rule", () => {
  it("prints the stored relaxation", () => {
    expect(ageEligibilityLine(18, 40, MP_RULE)).toBe(`Age: 18–40 years; relaxation: ${MP_RULE}`);
  });

  it("never prints the central OBC/SC/ST rule when nothing is stored", () => {
    for (const rel of [null, undefined, "", "   "]) {
      const line = ageEligibilityLine(19, 25, rel);
      expect(line).toMatch(/^Age: 19–25 years/);
      expect(line).not.toMatch(/OBC|SC\/ST|\+3|\+5/);
      expect(line).toContain("official notice");
    }
  });

  it("keeps the ? placeholders and returns null without any limit", () => {
    expect(ageEligibilityLine(17, null, null)).toMatch(/^Age: 17–\? years/);
    expect(ageEligibilityLine(null, null, MP_RULE)).toBeNull();
  });

  it("collapses a multi-line stored rule to one markdown line", () => {
    expect(ageEligibilityLine(18, 33, "35 for SC/ST\n\n38 for forest tribals ")).toBe(
      "Age: 18–33 years; relaxation: 35 for SC/ST 38 for forest tribals",
    );
  });

  it("Ask's compact form follows the same rule", () => {
    expect(askAgeSummary(18, 40, MP_RULE)).toBe(`18-40 (relaxation: ${MP_RULE})`);
    expect(askAgeSummary(19, 25, null)).toBe("19-25 (relaxation not stored — check the official notice)");
    expect(askAgeSummary(19, 25, null)).not.toMatch(/OBC|SC\/ST/);
    expect(askAgeSummary(null, 25, MP_RULE)).toBeNull();
  });
});

describe("related exam pages — MP_MPESB names the dedicated MP_RAEO page", () => {
  const site = "https://shishya.in";

  it("links RAEO from the MPESB file only while RAEO is active", () => {
    expect(RELATED_EXAM_PAGES.MP_MPESB.map((r) => r.code)).toEqual(["MP_RAEO"]);
    const lines = relatedExamLines("MP_MPESB", (c) => c === "MP_RAEO", site);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Group 2 Sub Group 1 — Krishi Vistar Adhikari / RAEO");
    expect(lines[0]).toContain("https://shishya.in/exams/MP_RAEO");
    expect(lines[0]).toContain("https://shishya.in/exams/MP_RAEO/context.md");
    expect(lines[0].startsWith("> ")).toBe(true);
    expect(relatedExamLines("MP_MPESB", () => false, site)).toEqual([]);
  });

  it("adds nothing for other exams", () => {
    expect(relatedExamLines("MP_RAEO", () => true, site)).toEqual([]);
    expect(relatedExamLines("SSC_CGL", () => true, site)).toEqual([]);
  });
});

describe("topic page meta — no notes promise without notes; empty topics noindex", () => {
  const base = { topicName: "Soil nutrient management", examShort: "MP RAEO", topicDescription: null };

  it("keeps the notes title and description word for word when notes exist", () => {
    const m = topicPageMeta({ ...base, topicDescription: "INM basics.", hasNotes: true, validatedQuestions: 0 });
    expect(m.title).toBe("Soil nutrient management for MP RAEO — Notes, Practice & Study Help | Shishya");
    expect(m.description).toBe(
      "Free Soil nutrient management study notes for MP RAEO preparation. Concepts, formulas, common mistakes, practice questions, and Ask Shishya when you need help on this topic. INM basics.",
    );
    expect(m.index).toBe(true);
    expect(m.keywords).toEqual([
      "Soil nutrient management MP RAEO",
      "Soil nutrient management notes",
      "Soil nutrient management formulas",
      "Soil nutrient management practice questions",
      "MP RAEO Soil nutrient management preparation",
      "MP RAEO Soil nutrient management pyq",
    ]);
  });

  it("drops 'Notes' for a topic with questions but no notes", () => {
    const m = topicPageMeta({ ...base, hasNotes: false, validatedQuestions: 12 });
    expect(m.title).toBe("Soil nutrient management for MP RAEO — Practice & Study Help | Shishya");
    expect(m.title).not.toMatch(/Notes/);
    expect(m.description).not.toMatch(/notes/i);
    expect(m.description).toContain("practice questions");
    expect(m.keywords).toEqual([
      "Soil nutrient management MP RAEO",
      "Soil nutrient management practice questions",
      "MP RAEO Soil nutrient management preparation",
      "MP RAEO Soil nutrient management pyq",
    ]);
    expect(m.index).toBe(true);
  });

  it("promises neither notes nor practice for an empty topic, and is noindex", () => {
    const m = topicPageMeta({ ...base, hasNotes: false, validatedQuestions: 0 });
    expect(m.title).not.toMatch(/Notes|Practice/);
    expect(m.description).not.toMatch(/notes|practice/i);
    expect(m.title).toContain("Soil nutrient management for MP RAEO");
    for (const k of m.keywords) expect(k).not.toMatch(/notes|formulas|practice/i);
    expect(m.keywords).toContain("MP RAEO Soil nutrient management pyq");
    expect(m.index).toBe(false);
  });

  it("is noindex only with no notes AND no checked question (raeo.6 corrected fix)", () => {
    expect(topicIndexable(false, 0)).toBe(false);
    expect(topicIndexable(false, 1)).toBe(true);
    expect(topicIndexable(false, 2)).toBe(true);
    expect(topicIndexable(true, 0)).toBe(true);
    expect(topicPageMeta({ ...base, hasNotes: false, validatedQuestions: 1 }).index).toBe(true);
    expect(topicPageMeta({ ...base, hasNotes: false, validatedQuestions: 2 }).index).toBe(true);
  });
});

describe("syllabus page copy — 'study notes' only when a topic links to them", () => {
  const base = { examShort: "MP RAEO", examName: "MP RAEO Recruitment Test", year: 2026, subjects: 17, topicCount: 46, weightageShown: false };

  it("keeps the notes title for an exam with linked notes", () => {
    const c = syllabusPageCopy({ ...base, linkedTopics: 37, buildMock: true });
    expect(c.title).toBe("MP RAEO Syllabus 2026 — Complete Topic List with Free Study Notes | Shishya");
    expect(c.description).toBe(
      "Complete MP RAEO (MP RAEO Recruitment Test) syllabus 2026: every subject and topic with weightage, free study notes, practice questions and topic-wise mock tests. No coaching fees, in your language.",
    );
    expect(c.keywords).toContain("MP RAEO study notes");
    expect(c.intro).toContain("37 topics below link to free study notes");
    expect(c.jsonLdDescription).toBe("Full MP RAEO Recruitment Test syllabus: 17 subjects, 46 topics, 37 with free study notes.");
    expect(c.shareMessage).toContain("free study notes");
  });

  it("says nothing about notes for an exam without them", () => {
    const c = syllabusPageCopy({ ...base, linkedTopics: 0, buildMock: true });
    expect(c.title).toBe("MP RAEO Syllabus 2026 — Complete Topic List | Shishya");
    expect(c.shareMessage).toBe("Complete MP RAEO syllabus 2026 — every subject & topic (Shishya):");
    for (const text of [c.title, c.description, c.jsonLdDescription, c.shareMessage, ...c.keywords]) {
      expect(text).not.toMatch(/study notes/i);
    }
    expect(c.intro).toContain("Study notes for this exam are not published yet");
    expect(c.description).toContain("practice questions and topic-wise mock tests");
  });

  it("titles a no-notes page 'with Weightage' only when a subject weightage is printed", () => {
    expect(syllabusPageCopy({ ...base, linkedTopics: 0, weightageShown: true, buildMock: true }).title).toBe(
      "MP RAEO Syllabus 2026 — Complete Topic List with Weightage | Shishya",
    );
    expect(syllabusPageCopy({ ...base, linkedTopics: 0, weightageShown: false, buildMock: true }).title).not.toMatch(/weightage/i);
    for (const weightageShown of [true, false]) {
      expect(syllabusPageCopy({ ...base, linkedTopics: 0, weightageShown, buildMock: true }).shareMessage).not.toMatch(/weightage/i);
    }
  });

  it("keeps the syllabus search phrases in every branch", () => {
    for (const linkedTopics of [0, 1]) {
      for (const [buildMock, weightageShown] of [[true, true], [true, false], [false, true], [false, false]] as const) {
        const c = syllabusPageCopy({ ...base, linkedTopics, buildMock, weightageShown });
        expect(c.title).toContain("MP RAEO Syllabus 2026 — Complete Topic List");
        expect(c.description).toContain("every subject and topic with weightage");
        expect(c.keywords.slice(0, 4)).toEqual([
          "MP RAEO syllabus 2026",
          "MP RAEO syllabus topics",
          "MP RAEO subject wise syllabus",
          "MP RAEO syllabus with weightage",
        ]);
      }
    }
  });

  it("claims topic-wise mock tests only when the builder has a topic", () => {
    expect(syllabusPageCopy({ ...base, linkedTopics: 0, buildMock: false }).description).toBe(
      "Complete MP RAEO (MP RAEO Recruitment Test) syllabus 2026: every subject and topic with weightage, practice questions. No coaching fees, in your language.",
    );
    expect(syllabusPageCopy({ ...base, linkedTopics: 1, buildMock: false }).intro).toContain("1 topic below links to free study notes");
  });
});

describe("news permalink — 'study notes' only for an exam with notes", () => {
  it("keeps the old description tail and link label when notes exist", () => {
    expect(newsPermalinkCopy("SSC CGL", true)).toEqual({
      descriptionTail: "Free SSC CGL mock tests, PYQs & study notes on Shishya.",
      syllabusLabel: "Syllabus & study notes",
    });
  });

  it("drops the notes claim without notes, and on a failed read", () => {
    for (const hasNotes of [false, null]) {
      const c = newsPermalinkCopy("MP RAEO", hasNotes);
      expect(c.descriptionTail).toBe("Free MP RAEO mock tests & PYQs on Shishya.");
      expect(c.syllabusLabel).toBe("Syllabus");
    }
  });
});
