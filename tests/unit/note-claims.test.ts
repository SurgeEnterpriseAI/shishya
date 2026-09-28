import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isInventedCountSentence, splitNoteSentences, stripInventedCounts } from "@/lib/note-claims";

// 29 Sep 2026 — the stored topic notes state how many questions or marks an
// exam gives a topic; nobody counted them. The pages no longer show those
// sentences. Every sentence below is taken from a stored note.

describe("isInventedCountSentence — what goes", () => {
  it.each([
    "Expect 3–5 questions from this domain in the exam.",
    "For AP TET Paper I (Classes 1-5) and Paper II (Classes 6-8), expect 3-5 questions directly from this topic.",
    "Expect 2-4 questions on CCE in the Child Development and Pedagogy section.",
    "You will typically see 3–5 questions in the reasoning section based on Venn Diagrams.",
    "Modern India (roughly 1757–1947 and post-independence) is a core topic in SSC CGL General Awareness, consistently accounting for 3–5 questions in Tier 1.",
    "This topic appears consistently in the Child Development and Pedagogy section, typically 2–3 questions per paper.",
    "This topic carries 5–8 questions on average.",
    "Average (or arithmetic mean) is a central topic in SSC CHSL Quantitative Aptitude, typically yielding 2–3 questions in every exam.",
    "Combustion and fuels is a practical chemistry topic tested in RRB Group D General Science with 2–3 direct questions expected.",
    "In SSC CHSL, you'll see 1–2 questions asking you to convert a sentence from direct speech to indirect speech, or vice versa.",
    "Mastering this topic can secure you 5–6 easy marks if you develop the right approach.",
    "Mastering this 2–3 mark topic will boost your speed and accuracy in the Mathematics section.",
    "Simple and Compound Interest forms a reliable 1-3 question segment in SBI Clerk Prelims Numerical Ability.",
    "Sports questions in SSC GD constitute 2–4 questions in the General Awareness section.",
    "**Exam weight:** 1–2 questions out of 25 in Numerical Ability.",
    "RC = 7–10 questions; highest weightage in English section.",
    "Around 40-50% of questions come from Physical Geography, 30-35% from Human Geography, and 20-25% from Economic Geography.",
    'Every exam features 3–5 questions based on logical deductions from two or three statements using quantifiers like "All," "Some," "No," and "Only."',
    "Typically, 3–5 questions appear in every Prelims paper, and with proper technique, you can solve them in under 30 seconds each.",
    "इस विषय से आमतौर पर 2–3 प्रश्न पूछे जाते हैं।",
    "HTET के तीनों levels (PRT, TGT, PGT) में यह section अनिवार्य है और सामान्यतः 10-15 marks इसी से आते हैं।",
  ])("%s", (s) => {
    expect(isInventedCountSentence(s)).toBe(true);
  });
});

describe("isInventedCountSentence — what stays (the lesson itself)", () => {
  it.each([
    "The Revolt of 1857 marks the first large-scale armed resistance against British rule in India, often called the First War of Indian Independence, the Sepoy Mutiny, or the Great Rebellion.",
    "| Republic Day | 26 January 1950 | 2025 marks 75th |",
    "One question is not worth sacrificing three others.",
    "**Fix:** Always verify that your classification criterion applies consistently to three items and fails for only one.",
    "- **Misinterpreting pictographs**: If one symbol represents 5 items, students often count symbols instead of multiplying.",
    "Multiplication often involves finding total cost (₹15 per item × 6 items = ₹90).",
    "*A student scores 72 marks out of 90.",
    "- Average = 380 ÷ 5 = 76 marks",
    "- SA total = 55 out of 80 → (55/80) × 60 = 41.25 marks",
    "- **40% weightage to FA, 60% to SA**",
    "CCE mandates 40% weightage to formative assessment and 60% to summative assessment in CBSE pattern schools.",
    "| FA (Formative Assessment) | 40% weightage in CCE; includes projects, assignments, quizzes, class participation |",
    "- **Misremembering GST Council voting**: Decisions require 3/4th majority with Centre having 1/3rd weightage and states 2/3rd collectively.",
    "**Unit Test Blueprint** (25 marks, 45 minutes):",
    "- Grammar and sentence structure: 3 marks (correct tenses, agreement)",
    "- **Long Answer Questions (LAQs)**: Assess ability to organise ideas, present arguments, and draw conclusions (5-6 marks).",
    '*A Class IV teacher gives a short 5-question quiz after teaching "addition of fractions with like denominators."',
    '**Question**: After completing the chapter on "Water Cycle," a teacher conducts a written test worth 20 marks that contributes to the term grade.',
    "- **Negative marking makes guessing risky** — In SSC GD, each wrong answer costs 0.25 marks.",
    "Speed comes with practice—aim to solve a 5-question set in under 5 minutes during the exam.",
    "Spend 3–4 focused hours on this topic, practice 50–60 questions, and you'll handle anything the exam throws at you.",
    "**Final Tip:** In the actual exam, read all 5 questions first before starting calculations.",
    "Percentage means per hundred.",
  ])("%s", (s) => {
    expect(isInventedCountSentence(s)).toBe(false);
  });
});

describe("stripInventedCounts", () => {
  const note = [
    "## Overview",
    "",
    "Percentage means per hundred. Expect 4–6 questions directly from this topic in most papers. It is used in profit, loss and interest.",
    "",
    "## Quick Reference",
    "",
    "- **Weightage:** Typically 3–5 questions per paper.",
    "- 25% = 1/4",
    "",
    "| Item | Value |",
    "|---|---|",
    "| Questions asked | Usually 2–3 questions every year |",
    "| 50% | 1/2 |",
    "",
    "```",
    "Expect 4–6 questions in code is not touched.",
    "```",
  ].join("\n");

  it("removes the claiming sentence, list item and table row, and nothing else", () => {
    const out = stripInventedCounts(note);
    expect(out).toContain("Percentage means per hundred. It is used in profit, loss and interest.");
    expect(out).not.toContain("Expect 4–6 questions directly");
    expect(out).not.toContain("Weightage");
    expect(out).not.toContain("Usually 2–3 questions");
    expect(out).toContain("- 25% = 1/4");
    expect(out).toContain("| 50% | 1/2 |");
    expect(out).toContain("|---|---|");
    expect(out).toContain("## Overview");
    expect(out).toContain("Expect 4–6 questions in code is not touched.");
    expect(out).not.toMatch(/\n{3,}/);
  });

  it("returns the same string when nothing matches, and keeps CRLF", () => {
    const clean = "## Key concepts\n\nA ratio compares two quantities.\n";
    expect(stripInventedCounts(clean)).toBe(clean);
    expect(stripInventedCounts("")).toBe("");
    const crlf = "Percentage means per hundred.\r\nExpect 4–6 questions from this topic.\r\nIt is used in profit.";
    expect(stripInventedCounts(crlf)).toBe("Percentage means per hundred.\r\nIt is used in profit.");
  });

  it("splits sentences after a closing quote, not at a decimal point", () => {
    expect(splitNoteSentences('He said "No." Then he left. It costs 0.25 marks.')).toEqual(['He said "No."', "Then he left.", "It costs 0.25 marks."]);
  });
});

describe("the topic pages use the filter (source)", () => {
  const ROOT = path.resolve(__dirname, "../..");
  const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
  it("English and Hindi topic pages pass the note through stripInventedCounts", () => {
    expect(read("src/app/exams/[code]/topics/[topicCode]/page.tsx")).toContain("<NotesMarkdown markdown={stripInventedCounts(notes)} rich demoteH1 />");
    expect(read("src/app/exams/[code]/topics/[topicCode]/hi/page.tsx")).toContain("<NotesMarkdown markdown={stripInventedCounts(hi.content)} />");
  });
  it('the quiz box no longer calls the practice questions "real" exam questions', () => {
    const page = read("src/app/exams/[code]/topics/[topicCode]/page.tsx");
    expect(page).not.toMatch(/\d+ real \{/);
    expect(read("src/app/exams/[code]/topics/[topicCode]/hi/page.tsx")).not.toContain("असली");
  });
});
