// Printed practice questions on a school chapter page (3 Oct 2026, crawl
// audit G3; src/lib/school/chapter-questions.ts,
// src/components/school/SchoolChapterQuestions.tsx).
//
// What is pinned:
//   • the selection: the topic pages' display rules, with the school
//     question's own concept tag as its kind. Every school question's first
//     tag is its chapter's code, so the default rules printed 2 per chapter
//     (all 230 chapters, read 3 Oct 2026); the school picker prints up to 10;
//   • honesty: only answer-checked rows (ACCEPT, all solves agreeing, 0.9+,
//     key not corrected, never "rejected") are ever printed;
//   • THE SWITCH: SCHOOL_CHAPTER_QUESTIONS_PRINTED is false; with it on,
//     only a Class 8-12 chapter with 5+ checked questions prints — Class 1-7
//     never does;
//   • the block, rendered with the switch on: stem and options visible, the
//     answer and explanation inside a native <details> (the first open),
//     every character escaped, "**a**" drawn bold, the AI / automated-check
//     wording, no sign-in, tutor or account link.
// The component is transpiled with TypeScript and rendered with
// renderToStaticMarkup (the pattern of tests/unit/date-tier-view.test.ts).
// No DB, no network. Run: npx vitest run tests/unit/school-chapter-questions.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as notesMarkdown from "@/lib/notes-markdown";
import * as studentCopy from "@/lib/school/student-copy";
import { CHAPTER_QUESTIONS_COPY } from "@/lib/school/student-copy";
import { pickShownQuestions, type QuestionRow, type ShownQuestion } from "@/lib/topic-question-display";
import {
  SCHOOL_CHAPTER_QUESTIONS_MAX,
  SCHOOL_CHAPTER_QUESTIONS_PRINTED,
  pickSchoolChapterQuestions,
  printsSchoolChapterQuestions,
  schoolQuestionKind,
} from "@/lib/school/chapter-questions";

const ROOT = process.cwd();
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

// ── fixtures: a Class 10 "Life Processes" chapter, tagged as the school batch tags ─

const STEMS = [
  "Which enzyme in saliva begins the breakdown of starch in the mouth?",
  "Where in the human body does most absorption of digested food take place?",
  "What is the role of bile secreted by the liver during digestion?",
  "Which gas is released as a by-product when green plants carry out photosynthesis?",
  "Through which tiny pores on leaves does gaseous exchange mainly happen?",
  "Why do the walls of the ventricles have thicker muscles than the atria?",
  "Which blood vessels carry blood away from the heart to the organs?",
  "What is the main function of the nephron in the human kidney?",
  "In which cell organelle does aerobic respiration release most of its energy?",
  "Which plant tissue transports water and minerals from roots to leaves?",
  "What happens to pyruvate in muscle cells when oxygen is in short supply?",
  "Which pigment present in leaves absorbs light energy for photosynthesis?",
];
const CONCEPTS = ["salivary-amylase", "small-intestine", "bile", "photosynthesis-products", "stomata", "ventricles", "arteries", "nephron", "mitochondria", "xylem", "anaerobic-respiration", "chlorophyll"];
const CHECKED = { decision: "ACCEPT", agreement: 1, confidence: 0.95, keyCorrected: false };

function row(i: number, over: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: `q${String(i).padStart(2, "0")}`,
    type: "MCQ",
    difficulty: ["EASY", "MEDIUM", "HARD"][i % 3],
    body: STEMS[i % STEMS.length],
    options: ["A", "B", "C", "D"].map((key) => ({ key, text: `Option ${key} for question ${i}` })),
    answerKey: ["A", "B", "C", "D"][i % 4],
    solution: `Worked explanation for question ${i}: the reasoning is set out step by step here.`,
    tags: ["jesc1.ch05", "school", "gen:2026-09-26", CONCEPTS[i % CONCEPTS.length], "basic-definitions"],
    validatedBy: "factory:verify-v1",
    metadata: { factoryVerify: CHECKED },
    ...over,
  };
}
const CHAPTER = STEMS.map((_, i) => row(i));

describe("which questions a school chapter prints", () => {
  it("the kind of a school question is its first concept tag — never the chapter code, 'school', the date or 'rejected'", () => {
    expect(schoolQuestionKind({ tags: ["leph2.ch03", "school", "gen:2026-09-26", "de-broglie-wavelength", "macroscopic-objects"] })).toBe("de-broglie-wavelength");
    expect(schoolQuestionKind({ tags: ["jesc1.ch05.p02", "School", "rejected", "gen:2026-09-27", "Bile"] })).toBe("bile");
    expect(schoolQuestionKind({ tags: ["jesc1.ch05", "school", "gen:2026-09-26"] })).toBeNull();
    expect(schoolQuestionKind({ tags: [] })).toBeNull();
  });

  it("the topic pages' default kind (the first tag) printed 2 per chapter; the school picker prints up to 10", () => {
    expect(pickShownQuestions(CHAPTER)).toHaveLength(2);
    const shown = pickSchoolChapterQuestions(CHAPTER);
    expect(SCHOOL_CHAPTER_QUESTIONS_MAX).toBe(10);
    expect(shown).toHaveLength(10);
    // One of each concept: no stem twice.
    expect(new Set(shown.map((q) => q.body)).size).toBe(10);
    // The same fixed order on every visit, whatever order the rows come in.
    expect(pickSchoolChapterQuestions([...CHAPTER].reverse()).map((q) => q.id)).toEqual(shown.map((q) => q.id));
  });

  it("the topic pages' call is unchanged: no options = first-tag kinds, a number = the cap", () => {
    const distinctFirst = CHAPTER.map((q) => ({ ...q, tags: [CONCEPTS[Number(q.id.slice(1))]] }));
    expect(pickShownQuestions(distinctFirst)).toHaveLength(10);
    expect(pickShownQuestions(distinctFirst, 3)).toHaveLength(3);
    expect(pickShownQuestions(distinctFirst, { max: 3 })).toHaveLength(3);
    expect(pickShownQuestions(distinctFirst).map((q) => q.id)).toEqual(pickShownQuestions(distinctFirst, { kindOf: (q) => q.tags[0] ?? null }).map((q) => q.id));
  });

  it("at most two questions of one concept", () => {
    const same = STEMS.map((_, i) => row(i, { tags: ["jesc1.ch05", "school", "gen:2026-09-26", "digestion"] }));
    expect(pickSchoolChapterQuestions(same)).toHaveLength(2);
  });

  it("only answer-checked rows: a REVIEW decision, a corrected key, a split or unsure check, another checker or the 'rejected' tag is never printed", () => {
    const bad: QuestionRow[] = [
      row(0, { id: "x1", metadata: { factoryVerify: { ...CHECKED, decision: "REVIEW" } } }),
      row(1, { id: "x2", metadata: { factoryVerify: { ...CHECKED, keyCorrected: true } } }),
      row(2, { id: "x3", metadata: { factoryVerify: { ...CHECKED, agreement: 0.67 } } }),
      row(3, { id: "x4", metadata: { factoryVerify: { ...CHECKED, confidence: 0.85 } } }),
      row(4, { id: "x5", validatedBy: "system:pyq-pattern" }),
      row(5, { id: "x6", tags: ["jesc1.ch05", "school", "rejected", "gen:2026-09-26", "ventricles"] }),
      row(6, { id: "x7", metadata: null }),
      row(7, { id: "x8", answerKey: "E" }),
      row(8, { id: "x9", solution: "C." }),
    ];
    expect(pickSchoolChapterQuestions(bad)).toEqual([]);
    const mixed = pickSchoolChapterQuestions([...bad, ...CHAPTER.slice(9)]);
    expect(mixed.map((q) => q.id).sort()).toEqual(["q09", "q10", "q11"]);
  });
});

describe("the switch (default OFF) and who would see the block", () => {
  it("is off: the chapter page prints nothing new and makes no extra read", () => {
    expect(SCHOOL_CHAPTER_QUESTIONS_PRINTED).toBe(false);
    for (let cls = 1; cls <= 12; cls++) expect(printsSchoolChapterQuestions({ cls, validatedQuestions: 40 }), `class ${cls}`).toBe(false);
  });

  it("switched on: Class 8-12 chapters with 5+ checked questions only — never Class 1-7", () => {
    for (let cls = 1; cls <= 12; cls++) {
      expect(printsSchoolChapterQuestions({ cls, validatedQuestions: 40 }, true), `class ${cls}`).toBe(cls >= 8);
      expect(printsSchoolChapterQuestions({ cls, validatedQuestions: 4 }, true), `class ${cls}, 4 questions`).toBe(false);
    }
    expect(printsSchoolChapterQuestions({ cls: 10, validatedQuestions: 5 }, true)).toBe(true);
  });

  it("the page reads and renders the block only through the switch, after the notes and before the guest quiz; the metadata does not change", () => {
    const page = read("src/app/schooling/[slug]/[classSlug]/[subject]/[chapter]/page.tsx");
    expect(page).toContain("const printed = printsSchoolChapterQuestions({ cls, validatedQuestions: chapter.validatedQuestions })");
    expect(page).toMatch(/\? await getSchoolChapterShownQuestions\(examCode, chapter\.code\)\s*: \[\];/);
    expect(page).toContain("{printed.length > 0 && <SchoolChapterQuestions questions={printed}");
    expect(page.indexOf("<SchoolChapterQuestions")).toBeGreaterThan(page.indexOf("<NotesMarkdown"));
    expect(page.indexOf("<SchoolChapterQuestions")).toBeLessThan(page.indexOf("<SchoolChapterQuiz"));
    const meta = page.slice(page.indexOf("export async function generateMetadata"), page.indexOf("export default async function ChapterPage"));
    expect(meta).not.toMatch(/printed|ChapterQuestions/);
    // The loader: the school-servable rows of the chapter and its pieces, chosen by the school picker.
    const db = read("src/lib/school/db.ts");
    const loader = db.slice(db.indexOf("export const getSchoolChapterShownQuestions"));
    expect(loader).toContain("...SCHOOL_SERVABLE_QUESTION_WHERE, topicId: { in: [topic.id, ...topic.children.map((c) => c.id)] }, exam: SCHOOL_CONTAINER_WHERE");
    expect(loader).toContain("return pickSchoolChapterQuestions(rows);");
    expect(loader).toContain('tags: ["school-surface"]');
  });
});

// ── the block, rendered (the switch on) ──────────────────────────────────

const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "@/lib/notes-markdown": notesMarkdown,
  "@/lib/school/student-copy": studentCopy,
};
function loadTsx(rel: string): Record<string, unknown> {
  const file = path.join(ROOT, rel);
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const req = (spec: string): unknown => {
    if (spec in STUBS) return STUBS[spec];
    throw new Error(`${rel} imports an unexpected module: ${spec}`);
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}
const block = loadTsx("src/components/school/SchoolChapterQuestions.tsx") as {
  SchoolChapterQuestions: (p: { questions: readonly ShownQuestion[]; chapterName: string; reportLabel: string }) => React.ReactElement | null;
};
const renderBlock = (questions: readonly ShownQuestion[]) =>
  renderToStaticMarkup(React.createElement(block.SchoolChapterQuestions, { questions, chapterName: "Life Processes", reportLabel: "Life Processes, Class 10 Science" }));

describe("the printed block (switch on)", () => {
  const shown = pickSchoolChapterQuestions(CHAPTER);
  const html = renderBlock(shown);

  it("ten questions: stem and options visible, the answer and explanation inside a native <details>, the first one open", () => {
    expect(html).toContain('data-school-questions="10"');
    expect(html).toContain(`<h2 id="chapter-questions-heading" class="text-base font-semibold text-ink-900">${CHAPTER_QUESTIONS_COPY.heading}</h2>`);
    expect(CHAPTER_QUESTIONS_COPY.heading).toBe("Practice questions with answers");
    expect(html.match(/<details\b/g)).toHaveLength(10);
    expect(html.match(/<details\b[^>]*\bopen=""/g)).toHaveLength(1);
    expect(html.indexOf("<details")).toBe(html.search(/<details\b[^>]*\bopen=""/));
    const items = html.split("<li class=\"rounded-lg").slice(1);
    expect(items).toHaveLength(10);
    shown.forEach((q, i) => {
      const item = items[i];
      const details = item.slice(item.indexOf("<details"));
      const visible = item.slice(0, item.indexOf("<details"));
      expect(visible, q.id).toContain(notesMarkdown.escapeHtml(q.body));
      for (const o of q.options) expect(visible, q.id).toContain(notesMarkdown.escapeHtml(o.text));
      expect(details, q.id).toContain(`${CHAPTER_QUESTIONS_COPY.answer}:</span> (${q.answerKey})`);
      expect(details, q.id).toContain(notesMarkdown.escapeHtml(q.solution));
      expect(visible, q.id).not.toContain(notesMarkdown.escapeHtml(q.solution));
    });
  });

  it("says what the questions are: Shishya's own, written with AI, checked by an automated pass — not the book's or a board's", () => {
    const intro = CHAPTER_QUESTIONS_COPY.intro(10, "Life Processes");
    // React escapes text itself (an apostrophe as &#x27;).
    expect(html).toContain(intro.replace(/'/g, "&#x27;"));
    expect(intro).toMatch(/Shishya's own practice questions on Life Processes, written with AI/);
    expect(intro).toMatch(/automated second pass before it is shown, not by a person/);
    expect(intro).toMatch(/not taken from the NCERT book or any board paper/);
    expect(intro).not.toMatch(/NCERT exercise|board question|previous.year|real exam/i);
    expect(CHAPTER_QUESTIONS_COPY.intro(1, "Light")).toMatch(/^1 of Shishya's own practice question on Light/);
  });

  it("every character is escaped; '**a**' vector notation is drawn bold, never printed as raw stars", () => {
    const tricky: ShownQuestion = {
      id: "v1",
      difficulty: "EASY",
      body: "If **a** = 3i − 4j + 12k, what is |**a**|? <script>alert(1)</script>",
      options: [
        { key: "A", text: "**13**" },
        { key: "B", text: "5 < 13 & 12 > 5" },
      ],
      answerKey: "A",
      solution: "|**a**| = √(9 + 16 + 144) = √169 = 13, so the answer is A.",
    };
    const h = renderBlock([tricky]);
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(h).toContain("|<strong>a</strong>|");
    expect(h).toContain("<strong>13</strong>");
    expect(h).toContain("5 &lt; 13 &amp; 12 &gt; 5");
    expect(h.replace(/<[^>]+>/g, "")).not.toContain("**");
  });

  it("nothing at all for an empty list; no sign-in, tutor, account or page link of its own", () => {
    expect(renderBlock([])).toBe("");
    const src = read("src/components/school/SchoolChapterQuestions.tsx");
    expect(src).not.toMatch(/"use client"|["'`]\/(?:login|chat|dashboard|onboarding)\b|SignUpButton|SignInLink|localStorage|<Link\b/);
    // The only link: the error report by mail, nofollow.
    expect(html.match(/<a\b/g)).toHaveLength(10);
    expect(html.match(/<a href="mailto:corp@surgesoftware\.co\.in\?subject=Error%20in%20question%20q\d+%20\(Life%20Processes%2C%20Class%2010%20Science\)" rel="nofollow"/g)).toHaveLength(10);
  });
});
