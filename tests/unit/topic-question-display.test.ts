import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  hasBrokenLetterShift,
  isShowable,
  kindKey,
  passedAnswerCheck,
  pickShownQuestions,
  promisedOptionCount,
  readOptions,
  stemKey,
  type QuestionRow,
} from "@/lib/topic-question-display";
import { fillTopicQuestions, topicQuestionsCopy } from "@/lib/topic-questions-copy";
import { printsQuestionsInFull, TOPIC_PAGES_STAGE1 } from "@/lib/topic-pages-stage1";

// 29 Sep 2026 — practice questions printed in full on topic pages.

const accept = { factoryVerify: { decision: "ACCEPT", agreement: 1, confidence: 1, keyCorrected: false } };
const opts = (n = 4) => ["A", "B", "C", "D", "E", "F"].slice(0, n).map((key, i) => ({ key, text: `Option ${i + 1}` }));
const row = (over: Partial<QuestionRow> = {}): QuestionRow => ({
  id: "q1",
  type: "MCQ",
  difficulty: "EASY",
  body: "The simple interest on ₹2000 at 10% per annum for 3 years is:",
  options: opts(),
  answerKey: "B",
  solution: "One year's interest is 2000 × 10 ÷ 100 = ₹200. For 3 years it is ₹600.",
  tags: ["si-direct"],
  validatedBy: "factory:verify-v1",
  metadata: accept,
  ...over,
});

// Stems that share no kind: each is its own question.
const STEMS = [
  "A train 150 m long crosses a pole in 9 seconds. Its speed is:",
  "The average of five consecutive odd numbers is 27. The largest number is:",
  "If 12 men finish a wall in 8 days, 16 men finish it in:",
  "The ratio of boys to girls in a class is 3 : 2. With 40 pupils, the girls number:",
  "A shopkeeper marks goods 20% above cost and allows 10% discount. His gain percent is:",
  "The perimeter of a square field is 64 m. Its area is:",
  "Which fraction is the smallest among 3/4, 5/8, 7/12 and 2/3?",
  "A pipe fills a tank in 6 hours and another empties it in 8 hours. Together they fill it in:",
  "The LCM of 12, 18 and 30 is:",
  "A boat goes 24 km downstream in 2 hours and returns in 3 hours. The speed of the stream is:",
  "Two dice are thrown. The probability that the total is 9 is:",
  "The angles of a triangle are in the ratio 2 : 3 : 4. The largest angle is:",
  "If x + 1/x = 5, the value of x squared plus 1/x squared is:",
  "The cost of 7 pens and 4 pencils is known. Which statement alone gives the cost of one pen?",
];

describe("passedAnswerCheck", () => {
  it("needs the check's own ACCEPT with full agreement and confidence of 0.9 or more", () => {
    expect(passedAnswerCheck(row())).toBe(true);
    expect(passedAnswerCheck(row({ validatedBy: "sme-bulk-2026-05-10" }))).toBe(false);
    expect(passedAnswerCheck(row({ validatedBy: null }))).toBe(false);
    expect(passedAnswerCheck(row({ metadata: null }))).toBe(false);
    expect(passedAnswerCheck(row({ metadata: { factoryVerify: { ...accept.factoryVerify, decision: "HOLD" } } }))).toBe(false);
    expect(passedAnswerCheck(row({ metadata: { factoryVerify: { ...accept.factoryVerify, agreement: 0.67 } } }))).toBe(false);
    expect(passedAnswerCheck(row({ metadata: { factoryVerify: { ...accept.factoryVerify, confidence: 0.85 } } }))).toBe(false);
  });
  it("leaves out a question whose key the check changed", () => {
    expect(passedAnswerCheck(row({ metadata: { factoryVerify: { ...accept.factoryVerify, keyCorrected: true } } }))).toBe(false);
  });
});

describe("isShowable — the question is whole and agrees with itself", () => {
  it("a checked MCQ with four options, its key among them and a worked solution", () => {
    expect(isShowable(row())).toBe(true);
  });
  it.each([
    ["not an MCQ", { type: "DESCRIPTIVE" }],
    ["tagged rejected", { tags: ["rejected"] }],
    ["key not among the options", { answerKey: "E" }],
    ["an option without text", { options: [{ key: "A", text: "x" }, { key: "B", text: "" }] }],
    ["two options with one letter", { options: [{ key: "A", text: "x" }, { key: "A", text: "y" }] }],
    ["one option only", { options: [{ key: "A", text: "x" }] }],
    ["options not a list", { options: "A,B,C,D" }],
    ["solution is only a letter", { solution: "Answer: B" }],
    ["stem promises five words, four options", { body: "Five words are suggested for the blank. Choose the one that fits." }],
    ["letter code with one broken shift", { body: "If MACHINE is coded as NBDIJOF in a language and PLANET as QMBOFV, how is TABLE coded? Note: GARDEN is coded as HBSEFO and WINDOW is coded as XJOEPZ." }],
  ])("not shown: %s", (_, over) => {
    expect(isShowable(row(over as Partial<QuestionRow>))).toBe(false);
  });
});

describe("stem checks", () => {
  it("reads the promised count", () => {
    expect(promisedOptionCount("Out of the four alternatives, choose the best.")).toBe(4);
    expect(promisedOptionCount("Five words are suggested.")).toBe(5);
    expect(promisedOptionCount("A train has 5 coaches.")).toBeNull();
  });
  it("a steady shift broken at exactly one letter is a typo; a steady or a changing shift is not", () => {
    expect(hasBrokenLetterShift("If TABLE is coded as UBCMF, how is CHAIR coded?")).toBe(false);
    expect(hasBrokenLetterShift("If TABLE is coded as UBCMG, how is CHAIR coded?")).toBe(true);
    expect(hasBrokenLetterShift("If TABLE is coded as UCEPJ, how is CHAIR coded?")).toBe(false);
    expect(hasBrokenLetterShift("If CAT is coded as DBU, how is DOG coded?")).toBe(false);
  });
  it("options are read strictly", () => {
    expect(readOptions(opts(4))).toHaveLength(4);
    expect(readOptions(opts(1))).toBeNull();
    expect(readOptions([...opts(6), { key: "G", text: "x" }])).toBeNull();
    expect(readOptions(null)).toBeNull();
  });
  it("twins: same stem without currency marks, punctuation and case; same kind without its numbers", () => {
    expect(stemKey("The SI on ₹2,000 at 10% is:")).toBe(stemKey("the si on Rs. 2000 at 10 % is"));
    expect(kindKey("The SI on ₹2000 at 10% for 3 years is:")).toBe(kindKey("The SI on ₹5000 at 8% for 2 years is:"));
    expect(kindKey("The SI on ₹2000 is:")).not.toBe(kindKey("The CI on ₹2000 is:"));
  });
});

describe("pickShownQuestions", () => {
  it("one of an identical stem, at most two of a stem that differs only in its numbers", () => {
    const rows = [
      row({ id: "a" }),
      row({ id: "b", body: "The simple interest on Rs. 2000 at 10% per annum for 3 years is" }),
      row({ id: "c", body: "The simple interest on ₹5000 at 8% per annum for 2 years is:" }),
      row({ id: "d", body: "The simple interest on ₹900 at 5% per annum for 4 years is:" }),
      row({ id: "e", body: "A sum doubles itself in 8 years at simple interest. The rate per annum is:", tags: ["doubling-time"] }),
    ];
    expect(pickShownQuestions(rows).map((q) => q.id)).toEqual(["a", "e", "c"]);
  });

  it("one of each kind first, then easy to hard, fixed by id", () => {
    const rows = [
      row({ id: "h1", difficulty: "HARD", tags: ["k1"], body: STEMS[0] }),
      row({ id: "e1", difficulty: "EASY", tags: ["k1"], body: STEMS[1] }),
      row({ id: "m2", difficulty: "MEDIUM", tags: ["k2"], body: STEMS[2] }),
      row({ id: "e2", difficulty: "EASY", tags: ["k2"], body: STEMS[3] }),
    ];
    const first = pickShownQuestions(rows).map((q) => q.id);
    expect(first).toEqual(["e1", "e2", "m2", "h1"]);
    expect(pickShownQuestions([...rows].reverse()).map((q) => q.id)).toEqual(first);
  });

  it("no more than three in a row with the same correct letter, and options are never moved", () => {
    const rows = ["a", "b", "c", "d", "e"].map((id, i) => row({ id, tags: [`k${i}`], body: STEMS[i], answerKey: i < 4 ? "A" : "C" }));
    const out = pickShownQuestions(rows);
    expect(out.map((q) => q.answerKey)).toEqual(["A", "A", "A", "C", "A"]);
    for (const q of out) expect(q.options.map((o) => o.key)).toEqual(["A", "B", "C", "D"]);
  });

  it("shows at most ten, and nothing when nothing passes", () => {
    const many = STEMS.map((body, i) => row({ id: `q${String(i).padStart(2, "0")}`, tags: [`k${i}`], body }));
    expect(pickShownQuestions(many)).toHaveLength(10);
    expect(pickShownQuestions([row({ validatedBy: "system:pyq-pattern" })])).toEqual([]);
    expect(pickShownQuestions([])).toEqual([]);
  });
});

describe("stage 1 — the pages people land on", () => {
  it("prints in full on a landed page and nowhere else yet", () => {
    expect(TOPIC_PAGES_STAGE1.size).toBe(186);
    expect(printsQuestionsInFull("IOQM", "math.combinatorics")).toBe(true);
    expect(printsQuestionsInFull("SSC_CGL", "no.such.topic")).toBe(false);
    for (const k of TOPIC_PAGES_STAGE1) expect(k).toMatch(/^[A-Z0-9_]+\/[A-Za-z0-9_.-]+$/);
  });
  it("the same question in other words counts as one kind, tagged or not", () => {
    const stems = [
      "The difference between compound interest and simple interest on a certain sum at 10% per annum for 2 years is ₹150. What is the principal amount?",
      "The difference between compound interest and simple interest on a sum of money at 10% per annum for 2 years is Rs. 150. What is the principal amount?",
      "The difference between the compound interest and simple interest on a certain sum of money at 10% per annum for 2 years is Rs. 150. What is the principal?",
      "The difference between compound interest and simple interest on a principal for 2 years at 10% per annum is ₹64. What is the principal amount?",
      "A sum of money doubles itself in 8 years at simple interest. In how many years will it become triple?",
    ];
    const rows = stems.map((body, i) => row({ id: `q${i}`, tags: [], body }));
    expect(pickShownQuestions(rows).map((q) => q.id).sort()).toEqual(["q0", "q1", "q4"]);
  });
  it("at most two questions of one kind on a page", () => {
    const rows = ["a", "b", "c", "d"].map((id, i) => row({ id, tags: ["ci-si-difference"], body: STEMS[i] }));
    expect(pickShownQuestions(rows).map((q) => q.id)).toEqual(["a", "b"]);
  });
});

describe("words and wiring", () => {
  it("the block says the questions are AI-written practice questions with an automated check, in en, hi and te", () => {
    expect(topicQuestionsCopy("en").notice).toMatch(/written with AI/);
    expect(topicQuestionsCopy("en").notice).toMatch(/automated second pass, not by a person/);
    for (const l of ["en", "hi", "te"]) {
      expect(topicQuestionsCopy(l).notice).toContain("AI");
      expect(`${topicQuestionsCopy(l).heading} ${topicQuestionsCopy(l).notice}`).not.toMatch(/real|previous year|असली|पिछले साल|గత సంవత్సర/i);
    }
    expect(topicQuestionsCopy("ta")).toBe(topicQuestionsCopy("en"));
    expect(fillTopicQuestions(topicQuestionsCopy("en").heading, { n: 6, topic: "Percentage", exam: "SSC CGL" })).toBe("6 practice questions on Percentage for SSC CGL, with answers");
  });

  const ROOT = path.resolve(__dirname, "../..");
  const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
  it("the topic page prints them under the notes, and first on a page with no notes", () => {
    const page = read("src/app/exams/[code]/topics/[topicCode]/page.tsx");
    expect(page).toContain("const shownQs = printsQuestionsInFull(exam.code, topic.code)");
    expect(page).toContain("? pickShownQuestions(");
    expect(page).toContain('validatedBy: { startsWith: "factory:" }');
    expect(page).toContain("questions={shownQs.slice(1)}");
    const empty = page.indexOf('t("topic.notes.empty.headline")');
    const all = page.indexOf("questions={shownQs}");
    expect(all).toBeGreaterThan(-1);
    expect(all).toBeLessThan(empty);
    expect(page).toContain("{practiceQs.length > 0 && shownQs.length === 0 && (");
  });
  it("the answer sits in the page HTML under a native details element, the first one open", () => {
    const c = read("src/components/TopicQuestionsInFull.tsx");
    expect(c).not.toMatch(/^"use client"/);
    expect(c).toContain("<details");
    expect(c).toContain("open={firstOpen && i === 0}");
  });
  it("article text has real styles, at zero specificity", () => {
    const css = read("src/app/globals.css");
    expect(css).toContain(".prose :where(ul) {");
    expect(css).toContain("list-style: disc;");
    expect(css).toContain(".prose :where(th, td) {");
    expect(css).toContain(".prose-base {");
    expect(read("src/app/exams/[code]/topics/[topicCode]/hi/page.tsx")).toContain("<NotesMarkdown markdown={stripInventedCounts(hi.content)} rich demoteH1 />");
  });
});
