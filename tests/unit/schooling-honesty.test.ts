// School build Step 0 (25 Sep 2026): the /schooling section stays hidden
// (noindex, reachable by URL) and says nothing that isn't true today.
// Static checks over the page sources, in the style of the other
// index-shape tests: no page can drop the noindex, promises that were
// removed ("hand-authored", "Ask Shishya scoped to the chapter", "notes
// being generated", "every board, in your language", ...) cannot come back,
// and the unchecked May-2026 quizzes stay off.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  BOARDS,
  SCHOOLING_ROBOTS,
  boardExamPapersFor,
  boardLinkCopy,
  boardLinks,
  findBoard,
} from "@/lib/schooling-data";
import { SCHOOL_QUIZZES_ANSWER_CHECKED } from "@/lib/schooling-quizzes";

const ROOT = path.resolve(__dirname, "../..");
const SCHOOL_APP = path.join(ROOT, "src/app/schooling");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const pageFiles = walk(SCHOOL_APP).filter((f) => /[\\/]page\.tsx$/.test(f));
const read = (f: string) => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, "/");

// Dated comments quote the removed copy on purpose; check only what renders.
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("/schooling is noindex", () => {
  it("SCHOOLING_ROBOTS is noindex, follow", () => {
    expect(SCHOOLING_ROBOTS).toEqual({ index: false, follow: true });
  });

  it("the section layout sets it for every page under /schooling", () => {
    const layout = read(path.join(SCHOOL_APP, "layout.tsx"));
    expect(layout).toMatch(/export const metadata[^=]*=\s*\{[^}]*robots:\s*SCHOOLING_ROBOTS/);
  });

  it("finds every page (landing, streams, board, class, subject, chapter)", () => {
    expect(pageFiles.map(rel).sort()).toEqual([
      "src/app/schooling/[slug]/[classSlug]/[subject]/[chapter]/page.tsx",
      "src/app/schooling/[slug]/[classSlug]/[subject]/page.tsx",
      "src/app/schooling/[slug]/[classSlug]/page.tsx",
      "src/app/schooling/[slug]/page.tsx",
      "src/app/schooling/page.tsx",
      "src/app/schooling/streams/page.tsx",
    ]);
  });

  it.each(pageFiles.map((f) => [rel(f), f]))("%s sets robots on every metadata it returns", (_name, f) => {
    const src = stripComments(read(f));
    const staticMeta = src.match(/export const metadata: Metadata = \{([\s\S]*?)\n\};/);
    const gen = src.match(/export async function generateMetadata[\s\S]*?\n\}\n/);
    expect(staticMeta || gen, "page has no metadata").toBeTruthy();
    if (staticMeta) expect(staticMeta[1]).toMatch(/\n  robots: SCHOOLING_ROBOTS,/);
    if (gen) {
      const returns = gen[0].split(/\breturn \{/).slice(1);
      expect(returns.length).toBeGreaterThan(0);
      for (const r of returns) {
        // Up to the object's closing brace at the same indent as `return`.
        const body = r.split(/\n  \};|\};\n/)[0];
        expect(body, "a generateMetadata return without robots").toMatch(/robots: SCHOOLING_ROBOTS/);
      }
    }
  });
});

describe("no untrue promises on /schooling", () => {
  // \s+ between words: JSX copy wraps across source lines.
  const BANNED: Array<[RegExp, string]> = [
    [/hand-?author/i, "nothing records who wrote the May quizzes"],
    [/written\s+by\s+hand/i, "nothing records who wrote the May quizzes"],
    [/scoped\s+to\s+(the|that|this)\s+chapter/i, "the tutor has no chapter scope"],
    [/being\s+(generated|authored)/i, "nothing is generating school notes"],
    [/in\s+your\s+language/i, "the pages are English-only"],
    [/verified\s+against\s+official/i, "nothing here is verified content"],
    [/adaptive\s+difficulty|progress\s+tracking|study\s+planner/i, "not built"],
    [/every\s+90\s+days|refreshed\s+every/i, "no job refreshes school facts"],
    [/160\+|all\s+state\s+CETs/i, "unsourced count"],
    [/mastery\s+quiz/i, "the quizzes are off until answer-checked"],
    [/previous\s+year\s+papers/i, "not every linked exam has them"],
    [/drawn\s+from\s+official\s+sources|ground\s+our\s+generated\s+content/i, "Shishya writes its own questions; never grounded in textbook text"],
    [/fec1=/, "no NCERT book has that code"],
    [/Honeysuckle|Honeydew|Honeycomb|Our\s+Pasts|Beehive/, "replaced NCERT books"],
    [/27,000|~250\s+IB/, "unsourced count"],
    [/42\s+career\s+paths/, "careers page lists CAREERS.length"],
    [/\/exams\/(CLAT|IPMAT|BITSAT)\b/, "no such exam page"],
    // 26 Sep 2026 (fixer): link promises only a few boards can keep.
    [/links\s+to\s+the\s+board(&apos;|')s\s+own\s+syllabus/i, "14 of 20 boards link only their website"],
    [/published\s+by\s+the\s+board\s+on\s+its\s+own\s+site/i, "only CBSE / CISCE / NIOS question-paper links are held"],
    [/Subjects\s+and\s+Official\s+Textbooks/, "stub classes list neither"],
    [/every\s+major\s+state\s+board/i, "15 state boards listed"],
    [/syllabus\s+and\s+books\s+today/i, "the stub link is often just the board website"],
    // 26 Sep 2026 (integrator): two lows the fix passes left open.
    [/editions\s+where\s+NCERT\s+publishes/i, "Class 11-12 commerce / humanities Urdu editions are not linked"],
    [/Browse\s+commerce\s+exams/i, "the MBA filter lists only CAT; no commerce exam has a page"],
  ];
  const files = [
    ...walk(SCHOOL_APP).filter((f) => /\.tsx?$/.test(f)),
    ...["schooling-data.ts", "schooling-subjects.ts"].map((f) => path.join(ROOT, "src/lib", f)),
  ];

  it.each(files.map((f) => [rel(f), f]))("%s", (_name, f) => {
    const src = stripComments(read(f));
    for (const [re, why] of BANNED) {
      const m = src.match(re);
      expect(m?.[0] ?? null, `${why}`).toBeNull();
    }
  });

  it("the unchecked May-2026 quizzes stay off, and the chapter page honours the flag", () => {
    expect(SCHOOL_QUIZZES_ANSWER_CHECKED).toBe(false);
    const chapter = stripComments(read(path.join(SCHOOL_APP, "[slug]/[classSlug]/[subject]/[chapter]/page.tsx")));
    expect(chapter).toMatch(/SCHOOL_QUIZZES_ANSWER_CHECKED \? findQuiz\(/);
    expect(chapter).not.toMatch(/findQuiz\((?!slug, classNum, subject, chapter\) : undefined)/);
  });

  it("board titles and descriptions name only the links the board page has", () => {
    let both = 0;
    let websiteOnly = 0;
    for (const b of BOARDS) {
      const links = boardLinks(b);
      const hasSamples = Boolean(b.samplePaperUrl) || Object.values(b.samplePapersByClass ?? {}).some(Boolean);
      expect(links, b.slug).toEqual({ syllabus: Boolean(b.syllabusUrl), samplePapers: hasSamples });
      const { title, phrase } = boardLinkCopy(b);
      expect(/syllabus/i.test(title), `${b.slug} title: ${title}`).toBe(links.syllabus);
      expect(/syllabus/i.test(phrase), `${b.slug} phrase: ${phrase}`).toBe(links.syllabus);
      expect(/sample/i.test(title), `${b.slug} title: ${title}`).toBe(links.samplePapers);
      expect(/sample/i.test(phrase), `${b.slug} phrase: ${phrase}`).toBe(links.samplePapers);
      if (links.syllabus && links.samplePapers) both++;
      if (!links.syllabus && !links.samplePapers) websiteOnly++;
    }
    expect(boardLinkCopy(findBoard("up-board")!).title).toBe("Official Website Link");
    expect(boardLinkCopy(findBoard("cbse")!).title).toBe("Official Syllabus and Sample Paper Links");
    expect([both, websiteOnly]).toEqual([3, 14]);
    const boardPage = stripComments(read(path.join(SCHOOL_APP, "[slug]/page.tsx")));
    expect(boardPage).toMatch(/const copy = boardLinkCopy\(b\);/);
    expect(boardPage).not.toMatch(/Official Syllabus and Sample Paper Links/);
  });

  it("the Class 10 / 12 board-exam card shows only where the board's own question-paper link is held", () => {
    const board = (slug: string) => findBoard(slug)!;
    expect(boardExamPapersFor(board("cbse"), 10)).toBe("https://cbseacademic.nic.in/SQP_CLASSX_2026-27.html");
    expect(boardExamPapersFor(board("cbse"), 12)).toBe("https://cbseacademic.nic.in/SQP_CLASSXII_2026-27.html");
    expect(boardExamPapersFor(board("icse-cisce"), 12)).toBe("https://cisce.org/isc-specimen-question-papers/");
    expect(boardExamPapersFor(board("cbse"), 9)).toBeUndefined();
    expect(boardExamPapersFor(board("cbse"), 11)).toBeUndefined();
    for (const slug of ["ib", "cambridge-igcse", "up-board", "tn-state-board", "mh-ssc-hsc"]) {
      for (const n of [10, 12]) expect(boardExamPapersFor(board(slug), n), `${slug} ${n}`).toBeUndefined();
    }
    for (const b of BOARDS) {
      for (const n of b.classes) {
        const shown = boardExamPapersFor(b, n) !== undefined;
        expect(shown, `${b.slug} class ${n}`).toBe((n === 10 || n === 12) && boardLinks(b).samplePapers);
      }
    }
    const classPage = stripComments(read(path.join(SCHOOL_APP, "[slug]/[classSlug]/page.tsx")));
    expect(classPage).toMatch(/const examPapers = boardExamPapersFor\(board, classNum\);/);
    expect(classPage).toMatch(/\{examPapers && \(/);
    expect(classPage).not.toMatch(/samplePapersFor\(/);
  });

  it("stream cards (Science / Commerce / Humanities) stay off IB and Cambridge pages", () => {
    const boardPage = stripComments(read(path.join(SCHOOL_APP, "[slug]/page.tsx")));
    const classPage = stripComments(read(path.join(SCHOOL_APP, "[slug]/[classSlug]/page.tsx")));
    expect(boardPage).toMatch(/\{b\.type !== "international" && \(b\.classes\.includes\(11\)/);
    expect(classPage).toMatch(/const showStreams = board\.type !== "international" &&/);
    expect(classPage).toMatch(/\{showStreams && \(/);
  });

  it("the quiz file no longer claims the questions were hand-written", () => {
    const quizzes = read(path.join(ROOT, "src/lib/schooling-quizzes.ts"));
    const header = quizzes.slice(0, quizzes.indexOf("export interface QuizQuestion"));
    expect(header).not.toMatch(/Questions are written by hand/);
    expect(header).toMatch(/NOT SERVED/);
  });
});

// 26 Sep 2026 (fixer): the school URLs left sitemap.ts on 25 Sep; a noindex
// page listed in the sitemap is a "Submitted URL marked noindex" error. Keep
// them (and llms.txt / robots) free of /schooling until the content gate.
// 26 Sep 2026 (integrator): llms-full.txt dropped its "Schooling boards &
// streams" line, so it is covered here too.
describe("/schooling stays off the search surface", () => {
  it.each([
    ["src/app/sitemap.ts"],
    ["src/app/robots.ts"],
    ["public/llms.txt"],
    ["src/app/llms-full.txt/route.ts"],
  ])("%s has no /schooling URL and no school data import", (f) => {
    const src = stripComments(read(path.join(ROOT, f)));
    expect(src).not.toMatch(/\/schooling\b/);
    expect(src).not.toMatch(/@\/lib\/schooling-/);
  });
});

// 26 Sep 2026 (integrator): pages outside the section that describe it
// (/career-map is indexed; site-facts feeds the tutor) promised quizzes and
// "your board's chapters". Each line that points at /schooling must not.
describe("links into /schooling promise only what it has", () => {
  it.each([["src/app/career-map/page.tsx"], ["src/lib/ai/site-facts.ts"]])("%s", (f) => {
    const lines = stripComments(read(path.join(ROOT, f)))
      .split("\n")
      .filter((l) => /["']\/schooling["']/.test(l) || /what: .*school board/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      if (!SCHOOL_QUIZZES_ANSWER_CHECKED) expect(l).not.toMatch(/quiz/i);
      expect(l).not.toMatch(/your board's chapters/i);
      expect(l).not.toMatch(/school boards with official syllabus and sample-paper links/);
    }
  });
});
