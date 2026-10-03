// The Hindi topic page says when its note is incomplete (3 Oct 2026, fix
// plan C12, PTF-1D step 2).
//
// 234 of 420 stored Hindi notes have fewer headings than their English note:
// the translator's reply stopped at its old token cap and the cut text was
// stored (live: /exams/SSC_CGL/topics/quant.time_speed_distance/hi ends
// "<li>**ट"). Until a note is re-translated, the page prints one line above
// the article, "यह हिंदी नोट अधूरा है — पूरा नोट अंग्रेज़ी में पढ़ें", linked to
// the English page. A note with as many headings as the English one prints
// nothing extra. The three <NotesMarkdown … rich demoteH1 /> tags stay as
// they are (pinned by other tests).
// The page is transpiled with TypeScript and rendered with
// renderToStaticMarkup; the database, header and client components are
// stubbed (the pattern of tests/unit/paths-views.test.ts). No DB, no network.
// Run: npx vitest run tests/unit/hindi-note-incomplete.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as topicNotes from "@/lib/topic-notes";
import * as noteClaims from "@/lib/note-claims";
import * as contentSignup from "@/lib/content-signup";
import * as notesMarkdown from "@/lib/notes-markdown";

const ROOT = process.cwd();
const NOT_FOUND = "NEXT_NOT_FOUND";
const LINE = "यह हिंदी नोट अधूरा है — पूरा नोट अंग्रेज़ी में पढ़ें";

interface TopicRow {
  code: string;
  name: string;
  subject: { name: string };
  noteTranslations: { content: string; generatedAt: Date }[];
  teachingNote: { content: string } | null;
}

let topicRow: TopicRow | null = null;
let topicSelect: unknown = null;
const examRow = { id: "e1", code: "SSC_CGL", shortName: "SSC CGL", name: "SSC Combined Graduate Level", active: true };

function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
  return React.createElement("a", { href, ...rest }, children);
}
const nothing = () => null;

const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "next/link": { __esModule: true, default: LinkStub },
  "next/navigation": {
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  },
  "@/components/Header": { Header: () => React.createElement("header", { "data-stub": "header" }) },
  "@/components/ExamSignUpContext": { ExamSignUpContext: nothing },
  "@/components/ShareExamButton": { ShareExamButton: nothing },
  "@/components/SignupInline": { SignupInline: nothing },
  "@/lib/db/prisma": {
    prisma: {
      exam: { findUnique: async () => examRow },
      topic: {
        findFirst: async (args: { select?: unknown }) => {
          topicSelect = args.select;
          return topicRow;
        },
      },
    },
  },
  "@/lib/db/exam-scope": { realExamKey: (w: unknown) => w },
  "@/lib/db/exam-practice": { examPracticeState: async () => ({ hasPractice: true }) },
  "@/lib/topic-notes": topicNotes,
  "@/lib/note-claims": noteClaims,
  "@/lib/content-signup": contentSignup,
  "@/lib/notes-markdown": notesMarkdown,
};

function resolveFile(spec: string, fromDir: string): string {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(fromDir, spec);
  else throw new Error(`unexpected package: ${spec}`);
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const f = base + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return path.normalize(f);
  }
  throw new Error(`cannot resolve ${spec} from ${fromDir}`);
}

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
  const req = (spec: string): unknown => (spec in STUBS ? STUBS[spec] : loadFile(resolveFile(spec, dir)));
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}

const PAGE_FILE = "src/app/exams/[code]/topics/[topicCode]/hi/page.tsx";
const page = loadFile(path.join(ROOT, PAGE_FILE)) as {
  default: (p: { params: Promise<{ code: string; topicCode: string }> }) => Promise<React.ReactElement>;
};
const render = async () =>
  renderToStaticMarkup(await page.default({ params: Promise.resolve({ code: "SSC_CGL", topicCode: "quant.time_speed_distance" }) }));

/** A note with `n` headings ("# " first, then "## "), each with a line of text. */
function note(n: number, word: string): string {
  const parts: string[] = [];
  for (let k = 1; k <= n; k++) parts.push(`${k === 1 ? "#" : "##"} ${word} ${k}\n\n${word} text for section ${k}, long enough to read as a real section of the note.`);
  return parts.join("\n\n");
}

function row(hiHeadings: number, enHeadings: number | null): TopicRow {
  return {
    code: "quant.time_speed_distance",
    name: "Time, Speed and Distance",
    subject: { name: "Quantitative Aptitude" },
    noteTranslations: [{ content: note(hiHeadings, "खंड"), generatedAt: new Date("2026-08-20T10:00:00.000Z") }],
    teachingNote: enHeadings === null ? null : { content: note(enHeadings, "Section") },
  };
}

beforeEach(() => {
  topicRow = null;
  topicSelect = null;
});

describe("the Hindi note's 'incomplete' line", () => {
  it("4 Hindi headings against 7 English: the line is printed once, above the notes, linked to the English page", async () => {
    topicRow = row(4, 7);
    const html = await render();
    expect(html.split(LINE).length - 1).toBe(1);
    expect(html).toContain(`<a href="/exams/SSC_CGL/topics/quant.time_speed_distance" class="font-medium underline hover:text-ink-900">${LINE}</a>`);
    expect(html.indexOf(LINE)).toBeLessThan(html.indexOf("<article"));
    // The page reads the English note only to compare the counts.
    expect(topicSelect).toMatchObject({ teachingNote: { select: { content: true } } });
  });

  it("equal counts: no line", async () => {
    topicRow = row(7, 7);
    const html = await render();
    expect(html).not.toContain("अधूरा");
    expect(html).toContain("<article");
  });

  it("more Hindi headings than English, or no English note: no line", async () => {
    topicRow = row(8, 7);
    expect(await render()).not.toContain("अधूरा");
    topicRow = row(4, null);
    expect(await render()).not.toContain("अधूरा");
  });

  it("no Hindi note: still not found", async () => {
    topicRow = { ...row(4, 7), noteTranslations: [] };
    await expect(render()).rejects.toThrow(NOT_FOUND);
  });

  it("the three NotesMarkdown tags are unchanged", () => {
    const src = fs.readFileSync(path.join(ROOT, PAGE_FILE), "utf8");
    expect(src).toContain("<NotesMarkdown markdown={hiParts[0]} rich demoteH1 />");
    expect(src).toContain("<NotesMarkdown markdown={hiParts[1]} rich demoteH1 />");
    expect(src).toContain("<NotesMarkdown markdown={hiMd} rich demoteH1 />");
    expect(src.match(/<NotesMarkdown[^>]*>/g)?.length).toBe(3);
  });
});
