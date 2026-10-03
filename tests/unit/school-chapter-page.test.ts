// The CBSE chapter page and its subject page as rendered HTML (3 Oct 2026,
// school growth). No DB, no network, no browser: the two route pages are
// transpiled with TypeScript and rendered with renderToStaticMarkup; the DB
// reads, the header, the quiz player and the student island are stubbed;
// the copy, the scope rules, the picker and the renderers are the real
// modules (the pattern of tests/unit/tn-board-pages.test.ts).
// Run: npx vitest run tests/unit/school-chapter-page.test.ts
//
// What this pins:
//   1. the notes render through the full renderer: "### Example" is an <h3>,
//      "---" a rule, nothing raw — on Class 10 and on Class 6;
//   2. no link to an empty chapter: the subject page prints a chapter with no
//      Shishya content as plain text with its official PDF, and the chapter
//      page's previous / next card for such a chapter is plain text too;
//      chapters with content keep their links;
//   3. the next step (the "next" slot of the student island) on Class 8-12
//      only, after the notes, the printed questions and the guest quiz, in
//      place of the save line (one sign-up block) — a Class 6 page renders
//      no island at all;
//   4. the printed questions: with the switch OFF (as shipped) no read and no
//      block; with it ON, a Class 10 chapter prints 10 with <details>, a
//      Class 6 chapter prints nothing and reads nothing.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import * as challengeCopy from "@/lib/challenge-copy";
import * as i18n from "@/lib/i18n";
import * as languages from "@/lib/languages";
import * as notesMarkdown from "@/lib/notes-markdown";
import * as books from "@/lib/school/books";
import * as chapterQuestions from "@/lib/school/chapter-questions";
import * as schoolContext from "@/lib/school/context";
import * as schoolCopy from "@/lib/school/copy";
import * as legacyUrls from "@/lib/school/legacy-urls";
import * as schoolScope from "@/lib/school/scope";
import * as studentClasses from "@/lib/school/student-classes";
import * as studentCopy from "@/lib/school/student-copy";
import * as schoolSurface from "@/lib/school/surface";
import * as sectionSeo from "@/lib/section-seo";
import * as schoolingData from "@/lib/schooling-data";
import * as schoolingSubjects from "@/lib/schooling-subjects";
import { prepareSchoolNotes } from "@/lib/school/notes";
import { rawMarkdownLeft } from "@/lib/notes-raw-check";
import type { QuestionRow } from "@/lib/topic-question-display";
import type { SchoolSurfaceChapter, SchoolSurfaceClass, SchoolSurfaceSubject } from "@/lib/school/surface";

const ROOT = process.cwd();

// ── fixtures ─────────────────────────────────────────────────────────────

const NOTE = `# Life Processes

## Key ideas

- **Nutrition** gives the body energy and raw material.

### Example 1: Where is starch digested first?

Saliva carries an enzyme that starts on starch in the mouth.

---

### Example 2: Why are ventricle walls thick?

They pump blood out to the organs.

## Read the official chapter

Read the chapter in the official NCERT book: https://ncert.nic.in/textbook/pdf/jesc105.pdf`;

function chapter(code: string, name: string, slug: string, orderIdx: number, has: { notes: boolean; questions: number }): SchoolSurfaceChapter {
  const indexable = schoolScope.isSchoolChapterIndexable({ hasNotes: has.notes, validatedQuestions: has.questions });
  return {
    code,
    name,
    orderIdx,
    slug,
    bookCode: code.split(".")[0],
    hasNotes: has.notes,
    validatedQuestions: has.questions,
    noteUpdatedAt: has.notes ? "2026-09-26T10:00:00.000Z" : null,
    questionsUpdatedAt: has.questions ? "2026-09-26T10:00:00.000Z" : null,
    indexable,
    lastModified: indexable ? "2026-09-26T10:00:00.000Z" : null,
  };
}

function liveClass(cls: number, subject: SchoolSurfaceSubject): SchoolSurfaceClass {
  return { boardSlug: "cbse", cls, curriculum: "NCERT", examCode: `NCERT_C${String(cls).padStart(2, "0")}`, name: `CBSE Class ${cls}`, subjects: [subject] } as unknown as SchoolSurfaceClass;
}

// Class 10 Science: ch04 empty, ch05 notes + 40 questions, ch06 practice only, ch07 3 questions (not enough: empty).
const C10 = {
  ch04: chapter("jesc1.ch04", "Carbon and its Compounds", "carbon-and-its-compounds", 4, { notes: false, questions: 0 }),
  ch05: chapter("jesc1.ch05", "Life Processes", "life-processes", 5, { notes: true, questions: 40 }),
  ch06: chapter("jesc1.ch06", "Control and Coordination", "control-and-coordination", 6, { notes: false, questions: 12 }),
  ch07: chapter("jesc1.ch07", "How do Organisms Reproduce?", "how-do-organisms-reproduce", 7, { notes: false, questions: 3 }),
};
const SCIENCE10: SchoolSurfaceSubject = { code: "SCIENCE", name: "Science", slug: "science", orderIdx: 1, chapters: [C10.ch04, C10.ch05, C10.ch06, C10.ch07] } as unknown as SchoolSurfaceSubject;
// Class 6: one chapter with notes and questions between two empty ones.
const C6 = {
  ch01: chapter("fecu1.ch01", "Chapter One", "chapter-one", 1, { notes: false, questions: 0 }),
  ch02: chapter("fecu1.ch02", "Chapter Two", "chapter-two", 2, { notes: true, questions: 30 }),
  ch03: chapter("fecu1.ch03", "Chapter Three", "chapter-three", 3, { notes: false, questions: 0 }),
};
const SCIENCE6: SchoolSurfaceSubject = { code: "SCIENCE", name: "Science", slug: "science", orderIdx: 1, chapters: [C6.ch01, C6.ch02, C6.ch03] } as unknown as SchoolSurfaceSubject;
const CLASSES: Record<number, SchoolSurfaceClass> = { 10: liveClass(10, SCIENCE10), 6: liveClass(6, SCIENCE6) };

const CHECKED = { decision: "ACCEPT", agreement: 1, confidence: 0.95, keyCorrected: false };
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
const ROWS: QuestionRow[] = STEMS.map((body, i) => ({
  id: `q${String(i).padStart(2, "0")}`,
  type: "MCQ",
  difficulty: ["EASY", "MEDIUM", "HARD"][i % 3],
  body,
  options: ["A", "B", "C", "D"].map((key) => ({ key, text: `Option ${key} for question ${i}` })),
  answerKey: ["A", "B", "C", "D"][i % 4],
  solution: `Worked explanation for question ${i}: the reasoning is set out step by step here.`,
  tags: ["jesc1.ch05", "school", "gen:2026-09-26", `concept-${i}`],
  validatedBy: "factory:verify-v1",
  metadata: { factoryVerify: CHECKED },
}));

// ── stubs ────────────────────────────────────────────────────────────────

let switchOn = false;
const shownReads: string[] = [];
const headers: boolean[] = [];

function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
  void prefetch;
  return React.createElement("a", { href, ...rest }, children);
}
function findLive(cls: number, subjectSlug: string, chapterSlug?: string) {
  const c = CLASSES[cls];
  const subject = c?.subjects.find((s) => s.slug === subjectSlug);
  if (!c || !subject) return undefined;
  if (chapterSlug === undefined) return { cls: c, subject };
  const i = subject.chapters.findIndex((x) => x.slug === chapterSlug);
  if (i < 0) return undefined;
  return { cls: c, subject, chapter: subject.chapters[i], prev: subject.chapters[i - 1] ?? null, next: subject.chapters[i + 1] ?? null };
}

const NOT_FOUND = "NEXT_NOT_FOUND";
const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "next/link": { __esModule: true, default: LinkStub },
  "next/navigation": {
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
    permanentRedirect: (to: string) => {
      throw new Error(`REDIRECT ${to}`);
    },
  },
  "@/components/Header": {
    Header: ({ childSafe }: { childSafe?: boolean }) => {
      headers.push(Boolean(childSafe));
      return React.createElement("header", { "data-stub": "header" });
    },
  },
  "@/components/JsonLd": { SHISHYA_ORG_REF: { "@id": "https://shishya.in/#org" } },
  "@/components/school/SchoolNextSteps": { SchoolNextSteps: () => null },
  "@/components/school/SchoolChapterQuiz": { SchoolChapterQuiz: () => React.createElement("div", { "data-stub": "guest-quiz" }) },
  "@/components/school/SchoolStudentEntry": {
    SchoolStudentEntry: (p: { slot?: string; cls: number; validatedQuestions?: number; pagePath: string }) =>
      React.createElement("div", { "data-entry": p.slot ?? "tutor", "data-cls": p.cls, "data-vq": p.validatedQuestions, "data-path": p.pagePath }),
  },
  "@/lib/school/db": {
    getLiveSchoolClass: async (_b: string, cls: number) => CLASSES[cls],
    getLiveSchoolSubject: async (_b: string, cls: number, s: string) => findLive(cls, s),
    getLiveSchoolChapter: async (_b: string, cls: number, s: string, ch: string) => findLive(cls, s, ch),
    getSchoolChapterDetail: async () => ({ notes: prepareSchoolNotes(NOTE), notesAt: "2026-09-26T10:00:00.000Z", pieces: [] }),
    getSchoolOfficialLinks: async () => ({ byChapter: { "jesc1.ch04": "https://ncert.nic.in/textbook/pdf/jesc104.pdf" }, classDocs: [] }),
    getSchoolChapterShownQuestions: async (examCode: string, code: string) => {
      shownReads.push(`${examCode} ${code}`);
      return chapterQuestions.pickSchoolChapterQuestions(ROWS);
    },
    chapterCounts: (chs: readonly SchoolSurfaceChapter[], quizMin: number) => ({
      chapters: chs.length,
      notes: chs.filter((c) => c.hasNotes).length,
      practice: chs.filter((c) => c.validatedQuestions >= quizMin).length,
      indexable: chs.filter((c) => c.indexable).length,
    }),
  },
  "@/lib/anon-quiz": { getSchoolGuestQuiz: async () => ({ examCode: "NCERT_C10", questions: [] }) },
  "@/lib/live-exam-codes": { loadLiveExams: async () => new Map() },
  "@/lib/section-related": { schoolNextSteps: () => [] },
  // The real module, with the switch read from this test.
  "@/lib/school/chapter-questions": {
    ...chapterQuestions,
    printsSchoolChapterQuestions: (c: { cls: number; validatedQuestions: number }) => chapterQuestions.printsSchoolChapterQuestions(c, switchOn),
  },
};

function resolveFile(spec: string, fromDir: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(fromDir, spec);
  else return null;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const f = base + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return path.normalize(f);
  }
  throw new Error(`cannot resolve ${spec} from ${fromDir}`);
}

const PRELOADED = new Map<string, unknown>(
  (
    [
      ["@/lib/challenge-copy", challengeCopy],
      ["@/lib/i18n", i18n],
      ["@/lib/languages", languages],
      ["@/lib/notes-markdown", notesMarkdown],
      ["@/lib/school/books", books],
      ["@/lib/school/context", schoolContext],
      ["@/lib/school/copy", schoolCopy],
      ["@/lib/school/legacy-urls", legacyUrls],
      ["@/lib/school/scope", schoolScope],
      ["@/lib/school/student-classes", studentClasses],
      ["@/lib/school/student-copy", studentCopy],
      ["@/lib/school/surface", schoolSurface],
      ["@/lib/section-seo", sectionSeo],
      ["@/lib/schooling-data", schoolingData],
      ["@/lib/schooling-subjects", schoolingSubjects],
    ] as const
  ).map(([spec, mod]) => [resolveFile(spec, ROOT)!, mod]),
);

const loaded = new Map<string, { exports: Record<string, unknown> }>();
function loadFile(file: string): Record<string, unknown> {
  const hit = loaded.get(file);
  if (hit) return hit.exports;
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  loaded.set(file, mod);
  const dir = path.dirname(file);
  const req = (spec: string): unknown => {
    if (spec in STUBS) return STUBS[spec];
    const f = resolveFile(spec, dir);
    if (!f) throw new Error(`${path.relative(ROOT, file)} imports an unexpected package: ${spec}`);
    return PRELOADED.get(f) ?? loadFile(f);
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}
const load = (rel: string) => loadFile(path.normalize(path.join(ROOT, rel)));

type Page<P> = { default: (p: { params: Promise<P> }) => Promise<React.ReactElement> };
const chapterPage = load("src/app/schooling/[slug]/[classSlug]/[subject]/[chapter]/page.tsx") as Page<{ slug: string; classSlug: string; subject: string; chapter: string }>;
const subjectPage = load("src/app/schooling/[slug]/[classSlug]/[subject]/page.tsx") as Page<{ slug: string; classSlug: string; subject: string }>;

const renderChapter = async (cls: number, slug: string) =>
  renderToStaticMarkup(await chapterPage.default({ params: Promise.resolve({ slug: "cbse", classSlug: `class-${cls}`, subject: "science", chapter: slug }) }));
const renderSubject = async (cls: number) => renderToStaticMarkup(await subjectPage.default({ params: Promise.resolve({ slug: "cbse", classSlug: `class-${cls}`, subject: "science" }) }));
const hrefs = (html: string) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]);
const notesArticle = (html: string) => html.slice(html.indexOf("<article"), html.indexOf("</article>"));

beforeEach(() => {
  switchOn = false;
  shownReads.length = 0;
  headers.length = 0;
});

describe("1. the notes render through the full renderer", () => {
  it.each([10, 6])("Class %i: '### Example' is an <h3>, '---' a rule, no raw markdown and no second <h1>", async (cls) => {
    const html = await renderChapter(cls, cls === 10 ? "life-processes" : "chapter-two");
    const article = notesArticle(html);
    expect(article).toContain("<h3>Example 1: Where is starch digested first?</h3>");
    expect(article).toContain("<hr>");
    expect(article).toContain("<h2>Key ideas</h2>");
    expect(rawMarkdownLeft(article)).toEqual([]);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    // The official-link section of the stored note never renders as text.
    expect(article).not.toContain("Read the chapter in the official NCERT book");
  });
});

describe("2. no link to an empty chapter", () => {
  it("the subject page links chapters with notes or checked practice, and prints an empty one as plain text with its official PDF", async () => {
    const html = await renderSubject(10);
    const links = hrefs(html);
    expect(links).toContain("/schooling/cbse/class-10/science/life-processes");
    expect(links).toContain("/schooling/cbse/class-10/science/control-and-coordination");
    // Empty: no notes and under 5 checked questions — no link anywhere on the page.
    expect(links.filter((h) => h.endsWith("/carbon-and-its-compounds"))).toEqual([]);
    expect(links.filter((h) => h.endsWith("/how-do-organisms-reproduce"))).toEqual([]);
    expect(html).toContain("Carbon and its Compounds");
    expect(html).toContain("How do Organisms Reproduce?");
    // Its official PDF, linked out.
    expect(html).toContain('<a href="https://ncert.nic.in/textbook/pdf/jesc104.pdf" target="_blank" rel="noopener noreferrer" class="text-[11px] font-medium text-saffron-700 underline">Official PDF ↗</a>');
    // Every chapter row carries its id: site search sends a student to an empty chapter's row
    // (#ch-{slug}, src/lib/school/chapter-row.ts), never to its empty page.
    expect(html).toContain('<li id="ch-carbon-and-its-compounds" class="scroll-mt-20"><div class="flex h-full items-start gap-3 rounded-lg border border-dashed');
    expect(html).toContain('<li id="ch-life-processes" class="scroll-mt-20"><a href="/schooling/cbse/class-10/science/life-processes"');
    // The CollectionPage list was already indexable-only.
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]*"CollectionPage"[^<]*)<\/script>/)![1]);
    expect(ld.mainEntity.itemListElement.map((i: { name: string }) => i.name)).toEqual(["Life Processes", "Control and Coordination"]);
  });

  it("Class 1-7 subject pages follow the same rule", async () => {
    const links = hrefs(await renderSubject(6));
    expect(links).toContain("/schooling/cbse/class-6/science/chapter-two");
    expect(links.filter((h) => /\/chapter-(one|three)$/.test(h))).toEqual([]);
  });

  it("the chapter page's previous / next card links a chapter with content and prints an empty one as plain text", async () => {
    // Life Processes: previous = Carbon (empty), next = Control and Coordination (practice).
    const html = await renderChapter(10, "life-processes");
    const links = hrefs(html);
    expect(links).toContain("/schooling/cbse/class-10/science/control-and-coordination");
    expect(links.filter((h) => h.endsWith("/carbon-and-its-compounds"))).toEqual([]);
    expect(html).toContain('<div class="rounded-lg border border-dashed border-ink-200 bg-white p-4"><p class="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Previous chapter</p><p class="mt-1 text-sm font-semibold text-ink-600">Carbon and its Compounds</p>');
    expect(html).toContain("Next chapter →");
    // Control and Coordination: next = 3 questions (empty) → plain; previous = Life Processes → linked.
    const html2 = await renderChapter(10, "control-and-coordination");
    expect(hrefs(html2)).toContain("/schooling/cbse/class-10/science/life-processes");
    expect(hrefs(html2).filter((h) => h.endsWith("/how-do-organisms-reproduce"))).toEqual([]);
    expect(html2).toContain('<p class="text-right text-[10px] font-semibold uppercase tracking-wider text-ink-500">Next chapter</p>');
  });
});

describe("3. the next step after the notes and the guest quiz — Class 8-12 only", () => {
  it("Class 10: one 'next' slot after the notes and the guest quiz (no save slot), with the chapter's checked count", async () => {
    const html = await renderChapter(10, "life-processes");
    const slots = [...html.matchAll(/data-entry="([^"]+)"/g)].map((m) => m[1]);
    expect(slots).toEqual(["tutor", "next"]);
    const next = html.indexOf('data-entry="next"');
    expect(next).toBeGreaterThan(html.indexOf("</article>"));
    expect(next).toBeGreaterThan(html.indexOf('data-stub="guest-quiz"'));
    expect(html).toContain('<div data-entry="next" data-cls="10" data-vq="40" data-path="/schooling/cbse/class-10/science/life-processes"></div>');
    expect(headers).toEqual([false]);
  });

  it("Class 6: no student island at all, the child-safe header, no sign-in word", async () => {
    const html = await renderChapter(6, "chapter-two");
    expect(html).not.toContain("data-entry=");
    expect(headers).toEqual([true]);
    expect(html).not.toMatch(/\bsign[\s-]?(?:in|up)\b|\/login|\/chat/i);
  });
});

describe("4. printed questions with answers — behind the switch", () => {
  it("switch OFF (as shipped): no block and no read, on any class", async () => {
    for (const [cls, slug] of [[10, "life-processes"], [6, "chapter-two"]] as const) {
      const html = await renderChapter(cls, slug);
      expect(html, `class ${cls}`).not.toContain("data-school-questions");
      expect(html, `class ${cls}`).not.toContain("<details");
    }
    expect(shownReads).toEqual([]);
  });

  it("switch ON: a Class 10 chapter prints 10 checked questions, after the notes and before the next step and the quiz", async () => {
    switchOn = true;
    const html = await renderChapter(10, "life-processes");
    expect(shownReads).toEqual(["NCERT_C10 jesc1.ch05"]);
    expect(html).toContain('data-school-questions="10"');
    expect(html.match(/<details\b/g)).toHaveLength(10);
    expect(html).toContain(">Practice questions with answers</h2>");
    const block = html.indexOf("data-school-questions");
    expect(block).toBeGreaterThan(html.indexOf("</article>"));
    expect(block).toBeLessThan(html.indexOf('data-entry="next"'));
    expect(block).toBeLessThan(html.indexOf('data-stub="guest-quiz"'));
    // The answers are inside <details>, the stems outside.
    const section = html.slice(block, html.indexOf("</section>", block));
    const first = chapterQuestions.pickSchoolChapterQuestions(ROWS)[0];
    expect(section.indexOf(first.body)).toBeGreaterThan(-1);
    expect(section.indexOf(first.body)).toBeLessThan(section.indexOf("<details"));
    expect(section.indexOf(first.solution)).toBeGreaterThan(section.indexOf("<details"));
    expect(section).toContain("Error%20in%20question%20q");
    // A chapter with practice only (no notes) prints it too.
    shownReads.length = 0;
    const practiceOnly = await renderChapter(10, "control-and-coordination");
    expect(shownReads).toEqual(["NCERT_C10 jesc1.ch06"]);
    expect(practiceOnly).toContain('data-school-questions="10"');
  });

  it("switch ON: a Class 6 chapter prints nothing new and reads nothing; an empty Class 10 chapter neither", async () => {
    switchOn = true;
    const six = await renderChapter(6, "chapter-two");
    expect(six).not.toContain("data-school-questions");
    const empty = await renderChapter(10, "how-do-organisms-reproduce");
    expect(empty).not.toContain("data-school-questions");
    expect(shownReads).toEqual([]);
  });
});
