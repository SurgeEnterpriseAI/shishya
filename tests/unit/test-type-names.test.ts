// "Topic-wise / subject-wise / chapter-wise test" — the entry points carry the
// names students type (7 Oct 2026, B6). 4 of 5 students who asked the tutor for
// one had the tools already (SubjectTestButton since 20 Jul, the topic page's
// "Test me (10 Qs)" since 26 Jul, /exams/[code]/build-mock since 1 Sep), and 3
// had used one minutes before asking.
// What it pins: the buttons' and links' names; the tutor answers such a request
// (no topic named) with the three entry points and their links — only for an
// exam whose builder serves it, and the block stays byte-identical for every
// exam that has one (the cached prompt segment).
// Run: npx vitest run tests/unit/test-type-names.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUILD_YOUR_OWN_TEST_LABEL, TOPIC_TEST_AGAIN_LABEL, TOPIC_TEST_LABEL, subjectTestLabel, topicTestHeading } from "@/lib/test-type-names";
import { syllabusBlock } from "@/lib/ai/prompts";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

describe("the entry points say what students type", () => {
  it("the hub's subject buttons: \"Subject-wise test\", with the subject and the size", () => {
    expect(subjectTestLabel("English", 25)).toBe("Subject-wise test: English · 25 Qs →");
    expect(subjectTestLabel("General Awareness", 12)).toBe("Subject-wise test: General Awareness · 12 Qs →");
    expect(read("src/app/exams/[code]/SubjectTestButton.tsx")).toContain('{busy ? "Building your test…" : subjectTestLabel(subjectName, qCount)}');
  });

  it("the topic page: \"Topic-wise test\" — the 10-question button under the notes and the quick test box", () => {
    expect(TOPIC_TEST_LABEL).toBe("Topic-wise test (10 Qs) →");
    expect(TOPIC_TEST_AGAIN_LABEL).toBe("Topic-wise test again (10 Qs) →");
    expect(topicTestHeading("Percentage")).toBe("Topic-wise test: Percentage");
    const panel = read("src/app/exams/[code]/topics/[topicCode]/TopicMasteryPanel.tsx");
    expect(panel).toContain("mastered ? TOPIC_TEST_AGAIN_LABEL : TOPIC_TEST_LABEL");
    expect(panel).not.toContain("Test me (10 Qs)");
    expect(read("src/app/exams/[code]/topics/[topicCode]/TopicQuizButton.tsx")).toContain("{topicTestHeading(topicName)}");
  });

  it("the builder link: \"Build your own test (pick chapters/topics)\"", () => {
    expect(BUILD_YOUR_OWN_TEST_LABEL).toBe("Build your own test (pick chapters/topics) →");
    expect(read("src/app/exams/[code]/CustomMockBuilder.tsx")).toContain("{BUILD_YOUR_OWN_TEST_LABEL}");
  });
});

describe("the tutor answers a 'topic-wise test' request with the right links", () => {
  const syllabus = {
    examCode: "SSC_GD",
    examName: "SSC General Duty Constable",
    subjects: [{ code: "GK", name: "General Knowledge", weight: 1, topics: [{ code: "gk.history", name: "History" }] }],
  };

  it("names the three entry points with this exam's links, and hands a named topic back to MOCK REQUESTS", () => {
    const b = syllabusBlock(syllabus);
    expect(b).toContain("TEST-TYPE REQUESTS:");
    expect(b).toMatch(/"topic-wise test", "subject-wise test" or "chapter-wise test"/);
    expect(b).toContain('"Subject-wise test" — the buttons of that name on https://shishya.in/exams/SSC_GD#subject-tests');
    // SubjectTestButton sizes a test min(25, the subject's questions), from 10: never "25 questions each".
    expect(b).toContain("a test of up to 25 questions for each subject that has enough practice questions");
    expect(b).toContain('"Topic-wise test" — on a topic\'s own page, https://shishya.in/exams/SSC_GD/topics/{topic code}');
    expect(b).toContain('"Build your own test (pick chapters/topics)" — https://shishya.in/exams/SSC_GD/build-mock (free sign-in)');
    expect(b).toContain("If they then name a topic or subject, follow MOCK REQUESTS above.");
    // After the MOCK REQUESTS line, which is unchanged.
    expect(b.indexOf("TEST-TYPE REQUESTS:")).toBeGreaterThan(b.indexOf("MOCK REQUESTS:"));
    expect(b).toContain('point to the "Full-Length Mock (Real Pattern)" tile. Only a generic "quiz me"');
  });

  it("the same bytes whatever the opts say when the builder serves the exam; nothing promised where it does not", () => {
    const base = syllabusBlock(syllabus);
    expect(syllabusBlock(syllabus, {})).toBe(base);
    expect(syllabusBlock(syllabus, { buildMock: null })).toBe(base);
    expect(syllabusBlock(syllabus, { buildMock: true, fullPatternMock: true })).toBe(base);
    const none = syllabusBlock(syllabus, { buildMock: false });
    expect(none).not.toContain("TEST-TYPE REQUESTS");
    expect(none).not.toContain("/build-mock");
  });
});
