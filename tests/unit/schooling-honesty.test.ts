// School section honesty (25 Sep 2026, extended 26 Sep 2026 for go-live).
//
// 25 Sep: the /schooling section stayed hidden (noindex, reachable by URL)
// and said nothing that wasn't true. 26 Sep: the section is public page by
// page, so the checks now are — every page sets robots explicitly
// (SCHOOLING_ROBOTS for a page with nothing of its own, schoolRobots(…)
// otherwise); the copy promises nothing that isn't built (the BANNED list,
// now including the phrases the go-live must not bring back); no school
// page or school component carries a tutor, sign-in, account or storage
// entry (Anthropic minors policy; the parent-consent layer is not built);
// and practice comes only from answer-checked Question rows through the
// school-only getter, never from the unchecked May-2026 quiz file.
// 26 Sep 2026 (student mode): the founder opened Class 8-12 pages to
// student sign-in, the AI tutor and account practice — through ONE island
// (src/components/school/SchoolStudentEntry.tsx) the pages render only under
// isStudentModeClass(cls), with every word in src/lib/school/student-copy.ts.
// So the sign-in ban below becomes a rule: a sign-in word may appear only
// beside the age line ("13 and above"); the tutor / login / dashboard
// literals stay banned in every school file (the island builds its links
// through src/lib/school/student-classes.ts); Classes 1-7 keep everything.
// Static checks over the page sources, in the style of the other
// index-shape tests. No DB. Run: npx vitest run tests/unit/schooling-honesty.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  BOARDS,
  SCHOOLING_INDEX_ROBOTS,
  SCHOOLING_ROBOTS,
  boardExamPapersFor,
  boardLinkCopy,
  boardLinks,
  findBoard,
  isSchoolBoardIndexable,
  schoolRobots,
} from "@/lib/schooling-data";
import { SCHOOL_QUIZZES_ANSWER_CHECKED } from "@/lib/schooling-quizzes";

const ROOT = path.resolve(__dirname, "../..");
const SCHOOL_APP = path.join(ROOT, "src/app/schooling");
const SCHOOL_COMPONENTS = path.join(ROOT, "src/components/school");
const SCHOOL_COPY = path.join(ROOT, "src/lib/school/copy.ts");

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

describe("/schooling robots (26 Sep 2026: public page by page)", () => {
  it("SCHOOLING_ROBOTS is noindex, follow; SCHOOLING_INDEX_ROBOTS is index, follow; schoolRobots picks", () => {
    expect(SCHOOLING_ROBOTS).toEqual({ index: false, follow: true });
    expect(SCHOOLING_INDEX_ROBOTS).toEqual({ index: true, follow: true });
    expect(schoolRobots(true)).toBe(SCHOOLING_INDEX_ROBOTS);
    expect(schoolRobots(false)).toBe(SCHOOLING_ROBOTS);
  });

  it("the section layout no longer sets a section-wide noindex (each page decides)", () => {
    const layout = read(path.join(SCHOOL_APP, "layout.tsx"));
    expect(stripComments(layout)).not.toMatch(/robots/);
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

  it.each(pageFiles.map((f) => [rel(f), f]))("%s sets robots (SCHOOLING_ROBOTS or schoolRobots) on every metadata it returns", (_name, f) => {
    const src = stripComments(read(f));
    const staticMeta = src.match(/export const metadata: Metadata = \{([\s\S]*?)\n\};/);
    const gen = src.match(/export async function generateMetadata[\s\S]*?\n\}\n/);
    expect(staticMeta || gen, "page has no metadata").toBeTruthy();
    if (staticMeta) expect(staticMeta[1]).toMatch(/\n  robots: (?:SCHOOLING_ROBOTS,|schoolRobots\()/);
    if (gen) {
      const returns = gen[0].split(/\breturn \{/).slice(1);
      expect(returns.length).toBeGreaterThan(0);
      for (const r of returns) {
        // Up to the object's closing brace at the same indent as `return`.
        const body = r.split(/\n  \};|\};\n/)[0];
        expect(body, "a generateMetadata return without robots").toMatch(/robots: (?:SCHOOLING_ROBOTS|schoolRobots\()/);
      }
    }
  });

  it("a chapter page is indexable by the one rule only; the 25 Sep form stays noindex", () => {
    const chapter = stripComments(read(path.join(SCHOOL_APP, "[slug]/[classSlug]/[subject]/[chapter]/page.tsx")));
    expect(chapter).toMatch(/robots: schoolRobots\(chapter\.indexable\)/);
    expect(chapter).not.toMatch(/robots: schoolRobots\(true\)/);
    // the "not ready yet" line is the only thing a bare chapter says of ours
    expect(chapter).toMatch(/CHAPTER_COPY\.notReady/);
  });
});

describe("no untrue promises on /schooling", () => {
  // \s+ between words: JSX copy wraps across source lines.
  const BANNED: Array<[RegExp, string]> = [
    [/hand-?author/i, "nothing records who wrote the May quizzes"],
    [/written\s+by\s+hand/i, "nothing records who wrote the May quizzes"],
    [/scoped\s+to\s+(the|that|this)\s+chapter/i, "the tutor has no chapter scope"],
    [/being\s+(generated|authored|added)/i, "say what exists, not what is coming"],
    [/coming\s+soon/i, "say what is not ready, not what is coming (26 Sep 2026)"],
    [/in\s+your\s+language/i, "the pages are English-only"],
    [/verified\s+against\s+official/i, "nothing here is verified content"],
    [/adaptive\s+difficulty|progress\s+tracking|study\s+planner/i, "not built"],
    [/every\s+90\s+days|refreshed\s+every/i, "no job refreshes school facts"],
    [/160\+|all\s+state\s+CETs/i, "unsourced count"],
    [/mastery\s+quiz/i, "the May quizzes are off; practice is answer-checked Question rows"],
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
    // 26 Sep 2026 (go-live): honest labels and no account promises.
    [/\bNCERT\s+exercises?\b/i, "an AI question is never called an NCERT exercise (say 'not taken from the NCERT book')"],
    [/\bboard\s+questions?\b/i, "an AI question is never called a board question"],
    [/keep\s+track|track\s+your|your\s+progress/i, "nothing school-related is stored for an account"],
    // 26 Sep 2026 (student mode): "sign in" is checked separately below —
    // allowed only beside the age line ("13 and above").
    [/\bsign[\s-]?up\b/i, "no sign-up ask on school pages (children)"],
    [/create\s+an?\s+account/i, "no account ask on school pages (children)"],
    // 26 Sep 2026 (fixer): the quiz finish sends one anonymous QUIZ_ATTEMPTED
    // event (chapter + score) under the shishya_anon cookie; say that, not "nothing".
    [/nothing\s+is\s+saved|saves\s+nothing|stores\s+nothing|nothing\s+is\s+stored/i, "practice sends an anonymous usage event (chapter + score); the copy must say so"],
  ];
  const STUDENT_COPY = path.join(ROOT, "src/lib/school/student-copy.ts");
  const files = [
    ...walk(SCHOOL_APP).filter((f) => /\.tsx?$/.test(f)),
    ...walk(SCHOOL_COMPONENTS).filter((f) => /\.tsx?$/.test(f)),
    SCHOOL_COPY,
    STUDENT_COPY,
    ...["schooling-data.ts", "schooling-subjects.ts"].map((f) => path.join(ROOT, "src/lib", f)),
  ];

  it.each(files.map((f) => [rel(f), f]))("%s", (_name, f) => {
    const src = stripComments(read(f));
    for (const [re, why] of BANNED) {
      const m = src.match(re);
      expect(m?.[0] ?? null, `${why}`).toBeNull();
    }
  });

  // 26 Sep 2026 (student mode): every sign-in word on a school surface sits
  // beside the age line. The two copy files hold every such sentence; no
  // page or component may carry one of its own.
  it.each(files.map((f) => [rel(f), f]))("%s: a sign-in word only beside the age line (13 and above)", (_name, f) => {
    const src = stripComments(read(f));
    const re = /\bsign[\s-]?in\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      expect([SCHOOL_COPY, STUDENT_COPY].includes(f), `${rel(f)}: sign-in copy belongs in student-copy.ts`).toBe(true);
      const window = src.slice(Math.max(0, m.index - 400), m.index + 400);
      // The text, or the AGE_LINE constant that carries it (student-copy.ts).
      expect(window, `${rel(f)} @${m.index}: "${m[0]}" without the age line`).toMatch(/13 and above|\bAGE_LINE\b/);
    }
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
    // 26 Sep 2026: a website-only board stays noindex; a seeded tree or a
    // syllabus / sample-paper page makes the board page indexable — through
    // the ONE rule the sitemap reads too (integrator: src/lib/school/landings.ts).
    expect(boardPage).toMatch(/robots: schoolRobots\(isSchoolBoardIndexable\(b, live\.length\)\)/);
    for (const b of BOARDS) {
      const links = boardLinks(b);
      expect(isSchoolBoardIndexable(b, 0), b.slug).toBe(links.syllabus || links.samplePapers);
      expect(isSchoolBoardIndexable(b, 1), b.slug).toBe(true);
    }
    expect(BOARDS.filter((b) => isSchoolBoardIndexable(b, 0)).map((b) => b.slug)).toEqual(["cbse", "nios", "icse-cisce", "ib", "cambridge-igcse", "tn-state-board"]);
  });

  it("a subject page is indexable by the sitemap's own rule (isSchoolSubjectIndexable with the spine identity), never a bare true (26 Sep 2026 integrator)", () => {
    const subject = stripComments(read(path.join(SCHOOL_APP, "[slug]/[classSlug]/[subject]/page.tsx")));
    expect(subject).toMatch(/robots: schoolRobots\(isSchoolSubjectIndexable\(subject, schoolClassIdentity\(live\.cls\.curriculum, cls\)\)\)/);
    expect(subject).not.toMatch(/robots: schoolRobots\(true\)/);
    // an NCERT subject with no book says so; a CISCE subject without its own
    // syllabus PDF names the stage curriculum document, not "syllabus PDF"
    expect(subject).toMatch(/SUBJECT_COPY\.noBook\(subject\.name, cls\)/);
    expect(subject).toMatch(/const subjectPdf = !isNcert && cisceSubjectLinks\(cls, subject\.name\)\.length > 0;/);
  });

  it("the quiz's 'Back to the notes' button is offered only when the chapter has notes (26 Sep 2026 integrator)", () => {
    const chapter = stripComments(read(path.join(SCHOOL_APP, "[slug]/[classSlug]/[subject]/[chapter]/page.tsx")));
    expect(chapter).toMatch(/<SchoolChapterQuiz quiz=\{quiz\} labels=\{labels\} copy=\{CHAPTER_QUIZ_COPY\} backToNotes=\{notes !== null\} \/>/);
    const player = stripComments(read(path.join(SCHOOL_COMPONENTS, "SchoolChapterQuiz.tsx")));
    expect(player).toMatch(/\{backToNotes && \(\s*<a\s+href="#notes"/);
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

// 26 Sep 2026 (go-live): practice on a chapter page comes ONLY from
// answer-checked Question rows through the school-only getter; the May-2026
// quiz file stays off and is not even imported any more.
describe("school practice is answer-checked rows through the school-only getter", () => {
  const chapterFile = path.join(SCHOOL_APP, "[slug]/[classSlug]/[subject]/[chapter]/page.tsx");

  it("the unchecked May-2026 quizzes stay off and are not read by any school page", () => {
    expect(SCHOOL_QUIZZES_ANSWER_CHECKED).toBe(false);
    for (const f of pageFiles) expect(stripComments(read(f)), rel(f)).not.toMatch(/schooling-quizzes|ChapterQuizPlayer|findQuiz\(/);
  });

  it("the chapter page offers the quiz only when the row count allows it, through getSchoolGuestQuiz", () => {
    const chapter = stripComments(read(chapterFile));
    expect(chapter).toMatch(/const quizOffered = hasSchoolGuestQuiz\(chapter\);/);
    expect(chapter).toMatch(/const quiz = quizOffered \? await getSchoolGuestQuiz\(\{ examCode, topicCode: chapter\.code \}\) : null;/);
    expect(chapter).not.toMatch(/getAnonQuiz\(/);
    expect(chapter).toMatch(/import \{ getSchoolGuestQuiz \} from "@\/lib\/anon-quiz"/);
  });

  it("a CISCE subject page shows its own syllabus PDFs and the stage document from the spine, never every class-level link row (26 Sep 2026 fixer)", () => {
    const subject = stripComments(read(path.join(SCHOOL_APP, "[slug]/[classSlug]/[subject]/page.tsx")));
    expect(subject).not.toMatch(/links\.classDocs/);
    expect(subject).toMatch(/\(cisceClassDocuments\(cls\)\?\.links \?\? \[\]\)\.filter\(\(l\) => !cisceLinks\.some\(\(s\) => s\.url === l\.url\)\)/);
  });

  it("an old subject or chapter URL with no live twin is redirected, never 404ed, when its class is live (26 Sep 2026 fixer)", () => {
    const subject = stripComments(read(path.join(SCHOOL_APP, "[slug]/[classSlug]/[subject]/page.tsx")));
    expect(subject).toMatch(/if \(findSubject\(p\.slug, cls, p\.subject\)\) return \{ kind: "redirect", to: schoolClassPath\(p\.slug, cls\) \};/);
    const chapter = stripComments(read(path.join(SCHOOL_APP, "[slug]/[classSlug]/[subject]/[chapter]/page.tsx")));
    expect(chapter).toMatch(/legacyChapterSlug\(old, liveSubject\.chapters\)/);
    expect(chapter).not.toMatch(/legacyChapterTarget|kebab\(/);
  });

  it("notes render through NotesMarkdown after the provenance comment and the official-link section are stripped", () => {
    const chapter = stripComments(read(chapterFile));
    expect(chapter).toMatch(/<NotesMarkdown markdown=\{notes\.markdown\} \/>/);
    const db = stripComments(read(path.join(ROOT, "src/lib/school/db.ts")));
    expect(db).toMatch(/hasUsableNotes\(content\) \? prepareSchoolNotes\(content\) : null/);
  });
});

// 26 Sep 2026 (go-live): no tutor, sign-in, account or storage entry on a
// school page or a school component (Anthropic minors policy; the
// parent-consent and safety layer is not built). Guest practice with no
// account is fine — no result is saved to any account; its one anonymous
// analytics beacon is what every page view sends, and the copy says so.
// 26 Sep 2026 (student mode): the Class 8-12 entry island reaches /login,
// /chat and the profile route ONLY through src/lib/school/student-classes.ts
// (schoolSignInHref / schoolTutorHref) and fetch() — no literal route, no
// storage, no session import in any school file; the pages render the
// island under isStudentModeClass(cls) alone (tests/unit/school-student-mode.test.ts).
describe("school pages carry no tutor, sign-in, account or storage entry of their own", () => {
  const files = [...walk(SCHOOL_APP).filter((f) => /\.tsx?$/.test(f)), ...walk(SCHOOL_COMPONENTS).filter((f) => /\.tsx?$/.test(f)), SCHOOL_COPY];
  const FORBIDDEN: Array<[RegExp, string]> = [
    [/["'`]\/chat\b/, "the AI tutor"],
    [/["'`]\/login\b|["'`]\/onboarding\b|["'`]\/dashboard\b/, "sign-in / account flows"],
    [/\bsignIn\(|GoogleSignInButton|GateSignInButton|GuestQuizGate/, "sign-in buttons"],
    [/\bAnonQuizPlayer\b|\bTalkToTeacher\b|\bChallengeCard\b|\bExamAlertBox\b|\bStudyTogether\b|\bTopicMasteryPanel\b|\bCoachNextTask\b/, "the exam pages' conversion pieces"],
    [/localStorage|sessionStorage|document\.cookie/, "nothing is stored for a guest"],
    [/from "@\/lib\/auth"/, "no session read on a school page"],
  ];

  it.each(files.map((f) => [rel(f), f]))("%s", (_name, f) => {
    const src = stripComments(read(f));
    // The board page keeps its 25 Sep verification badge, which reads the
    // session to enable the operator's click-to-verify; that is the one
    // allowed auth import and it renders no CTA.
    const allowAuth = rel(f) === "src/app/schooling/[slug]/page.tsx";
    for (const [re, why] of FORBIDDEN) {
      if (allowAuth && re.source.includes("lib\\/auth")) continue;
      const m = src.match(re);
      expect(m?.[0] ?? null, why).toBeNull();
    }
  });

  it("the school quiz player is a client component with no result-screen CTA beyond try-again", () => {
    const src = stripComments(read(path.join(SCHOOL_COMPONENTS, "SchoolChapterQuiz.tsx")));
    expect(src).toMatch(/^"use client";/);
    expect(src).toMatch(/onClick=\{reset\}/);
    expect(src).toMatch(/href="#notes"/);
    expect(src).not.toMatch(/<Link\b/);
    expect(src).not.toMatch(/fetch\(/);
  });
});

// 26 Sep 2026 (fixer): the school URLs left sitemap.ts on 25 Sep; a noindex
// page listed in the sitemap is a "Submitted URL marked noindex" error.
// 26 Sep 2026 (school go-live, surface builder): the section is back on the
// search surface, but ONLY through the live-DB loader in
// src/lib/school/surface.ts (tests/unit/school-surface.test.ts pins the
// indexable rule and the URL shape). The sitemap and llms-full.txt must not
// hand-list a /schooling URL or read the hardcoded schooling-* data again —
// that data lists chapters with no content behind them.
describe("/schooling reaches the search surface only through the live loader", () => {
  it.each([["src/app/sitemap.ts"], ["src/app/llms-full.txt/route.ts"]])("%s lists school URLs from @/lib/school/surface, none by hand", (f) => {
    const src = stripComments(read(path.join(ROOT, f)));
    expect(src).toMatch(/from "@\/lib\/school\/surface"/);
    expect(src).toMatch(/loadSchoolSurface\(\)\.catch\(\(\) => EMPTY_SCHOOL_SURFACE\)/);
    expect(src).not.toMatch(/@\/lib\/schooling-/);
  });
  it("the page loaders (src/lib/school/db.ts) let a failed read throw, so ISR keeps the last good page instead of caching a noindex fallback (26 Sep 2026 fixer)", () => {
    const src = stripComments(read(path.join(ROOT, "src/lib/school/db.ts")));
    expect(src).not.toMatch(/EMPTY_SCHOOL_SURFACE|\.catch\(/);
  });
  it("sitemap.ts hand-lists no /schooling URL", () => {
    const src = stripComments(read(path.join(ROOT, "src/app/sitemap.ts")));
    expect(src).not.toMatch(/\/schooling\b/);
  });
  it("llms-full.txt's only hand-written /schooling links are the two board pages", () => {
    const src = stripComments(read(path.join(ROOT, "src/app/llms-full.txt/route.ts")));
    expect(src.match(/\/schooling\/[a-z-]+/g)?.sort()).toEqual(["/schooling/cbse", "/schooling/icse-cisce"]);
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
      expect(l).not.toMatch(/mastery quiz/i);
      expect(l).not.toMatch(/your board's chapters/i);
      expect(l).not.toMatch(/school boards with official syllabus and sample-paper links/);
    }
  });
});
