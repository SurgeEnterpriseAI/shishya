// School pages (26 Sep 2026, go-live) — the pure rules the /schooling pages
// render by, without a database:
//   1. the URL scheme keeps the 25 Sep chapter URLs (kebab of the printed
//      title) and resolves the hand-shortened ones and the hand-picked
//      subject segments to today's address (src/lib/school/legacy-urls.ts)
//      — every one of the 154 old chapter URLs, resolved against the seeded
//      chapter list, never against a guessed slug (26 Sep 2026 fixer: the
//      guess 404ed "units-and-measurements"), and every old subject URL
//      resolves or is the one with no live twin;
//   2. chapter slugs over the whole seeded spine are unique per subject,
//      never empty, deterministic, and carry the book code only where two
//      books of one subject print the same title;
//   3. the ONE indexable rule (src/lib/school/scope.ts) and the guest quiz
//      minimum, pinned equal to the exam guest quiz's ANON_QUIZ_MIN;
//   4. stored notes → rendered markdown: provenance comment, leading H1 and
//      the official-link section stripped, the official URL read back, and
//      what the shared renderer cannot draw (pipe tables, *italics*)
//      rewritten into what it can (26 Sep 2026 fixer);
//   5. getSchoolGuestQuiz refuses a chapter that is not under a school
//      container, a pool short of the minimum, and serves only validated,
//      non-withdrawn MCQs — against an in-memory Prisma stub;
//   6. the book / chapter identity read from the spine.
// Run: npx vitest run tests/unit/school-pages.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  topic: null as null | { id: string; name: string; code: string; children: { id: string }[]; subject: { exam: { code: string; shortName: string; name: string } } },
  questions: [] as { id: string; topicId: string; validated: boolean; type: string; tags: string[]; examCategory: string }[],
  calls: [] as { model: string; op: string; args: unknown }[],
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: {
      findUnique: async (args: unknown) => {
        db.calls.push({ model: "exam", op: "findUnique", args });
        throw new Error("the school quiz must never look a container up as an exam");
      },
      findFirst: async (args: unknown) => {
        db.calls.push({ model: "exam", op: "findFirst", args });
        throw new Error("the school quiz must never look a container up as an exam");
      },
    },
    topic: {
      findFirst: async (args: { where: { code: string; parentId: null; subject: { exam: { category: string; code: string } } } }) => {
        db.calls.push({ model: "topic", op: "findFirst", args });
        const w = args.where;
        if (!db.topic || db.topic.code !== w.code || w.subject.exam.category !== "SCHOOL_BOARD" || w.subject.exam.code !== db.topic.subject.exam.code) return null;
        return db.topic;
      },
    },
    question: {
      findMany: async (args: { where: { validated: boolean; type: string; NOT: { tags: { has: string } }; topicId: { in: string[] }; exam: { category: string } }; take: number }) => {
        db.calls.push({ model: "question", op: "findMany", args });
        const w = args.where;
        return db.questions
          .filter(
            (q) =>
              w.topicId.in.includes(q.topicId) &&
              q.validated === w.validated &&
              q.type === w.type &&
              !q.tags.includes(w.NOT.tags.has) &&
              q.examCategory === w.exam.category,
          )
          .slice(0, args.take)
          .map((q) => ({
            id: q.id,
            body: `Q ${q.id}`,
            options: [
              { key: "A", text: "a" },
              { key: "B", text: "b" },
              { key: "C", text: "c" },
              { key: "D", text: "d" },
            ],
            answerKey: "B",
            solution: "because",
            difficulty: "EASY",
            topic: { name: db.topic?.name ?? "", code: q.topicId },
          }));
      },
    },
  },
}));

import { ANON_QUIZ_MIN, getSchoolGuestQuiz } from "@/lib/anon-quiz";
import { SCHOOL_CONTAINER_WHERE, SCHOOL_GUEST_QUIZ_MIN, SCHOOL_SERVABLE_QUESTION_WHERE, hasSchoolGuestQuiz, isSchoolChapterIndexable } from "@/lib/school/scope";
import { OFFICIAL_LINK_HEADING, OFFICIAL_LINK_PREFIX, italicsToBold, normalizeSchoolMarkdown, prepareSchoolNotes } from "@/lib/school/notes";
import { PROVENANCE_COMMENT_PREFIX, readProvenanceComment, stripProvenanceComment } from "@/lib/school/provenance";
import * as contentPlan from "@/lib/school/content-plan";
import { NOTES_HEADINGS, OFFICIAL_LINK_PREFIX as PROMPT_OFFICIAL_LINK_PREFIX } from "@/lib/school/content-prompts";
import { LEGACY_SUBJECT_SLUGS, legacyChapterSlug, legacyChapterTarget, legacySubjectSlug, type LiveChapterLike } from "@/lib/school/legacy-urls";
import { SCHOOL_CHILDREN_LINE, kebab, schoolBookCodeOf, schoolChapterSlugs, schoolExamCode, schoolSubjectSlug, schoolSubjectCodeFromSlug } from "@/lib/school/surface";
import { buildSchoolSpinePlan } from "@/lib/school/seed-plan";
import { CLASS_SYLLABUS } from "@/lib/schooling-subjects";
import { bookOfChapter, chapterLabel, cisceClassDocuments, cisceSubjectLinks, cisceSubjectsWithPdf, ncertBooksForSubject, ncertChapterMeta } from "@/lib/school/books";
import { cisceLevelForClass } from "@/lib/school/spine";
import {
  BOARD_COPY,
  CHAPTER_QUIZ_COPY,
  CLASS_COPY,
  HUB_COPY,
  PRACTICE_PRIVACY_LINE,
  SUBJECT_COPY,
  chapterHasParts,
  chapterStatusLabel,
  cisceDocsPhrase,
  countsLine,
  oursTitleBit,
  subjectShortName,
} from "@/lib/school/copy";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";

// ── 1 + 2: URL scheme ──────────────────────────────────────────────────

describe("chapter and subject slugs (the URL scheme)", () => {
  const plan = buildSchoolSpinePlan();
  const chapters = plan.topics.filter((t) => !t.parentCode);

  // The seeded chapter list of every (class container, subject segment), with
  // the slugs the live pages use — what src/lib/school/surface.ts builds from
  // the same rows once they are in the DB.
  const liveBySubject = new Map<string, LiveChapterLike[]>();
  for (const s of plan.subjects) {
    const list = chapters.filter((t) => t.examCode === s.examCode && t.subjectCode === s.code);
    const slugs = schoolChapterSlugs(list);
    liveBySubject.set(`${s.examCode}|${schoolSubjectSlug(s.code)}`, list.map((t) => ({ code: t.code, name: t.name, slug: slugs.get(t.code)! })));
  }
  const seededSubjectSlugs = (examCode: string) => new Set(plan.subjects.filter((s) => s.examCode === examCode).map((s) => schoolSubjectSlug(s.code)));
  // 26 Sep 2026: the one old subject page with no seeded twin — CBSE's optional
  // Computer Applications has no NCERT book, so NCERT_C10 has no such subject.
  // The subject page 308s it to the class page.
  const NO_LIVE_TWIN = new Set(["cbse/10/computer-applications"]);

  it("every old CBSE / CISCE subject URL resolves to a seeded subject of its class, except the one with no live twin", () => {
    let checked = 0;
    for (const cls of CLASS_SYLLABUS) {
      const seeded = seededSubjectSlugs(schoolExamCode(cls.boardSlug, cls.classNum)!);
      for (const s of cls.subjects) {
        const key = `${cls.boardSlug}/${cls.classNum}/${s.slug}`;
        const mapped = legacySubjectSlug(cls.boardSlug, cls.classNum, s.slug);
        expect(seeded.has(mapped), key).toBe(!NO_LIVE_TWIN.has(key));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(60);
    // the eight the review found unmapped (26 Sep 2026 fixer), plus the originals
    expect(legacySubjectSlug("icse-cisce", 10, "physics")).toBe("science-physics-chemistry-biology");
    expect(legacySubjectSlug("icse-cisce", 10, "chemistry")).toBe("science-physics-chemistry-biology");
    expect(legacySubjectSlug("icse-cisce", 10, "biology")).toBe("science-physics-chemistry-biology");
    expect(legacySubjectSlug("icse-cisce", 10, "geography")).toBe("history-civics-and-geography");
    expect(legacySubjectSlug("icse-cisce", 11, "english")).toBe("english-or-modern-english");
    expect(legacySubjectSlug("icse-cisce", 12, "english")).toBe("english-or-modern-english");
    expect(legacySubjectSlug("icse-cisce", 11, "commerce")).toBe("business-studies-previously-known-as-commerce");
    expect(legacySubjectSlug("cbse", 10, "computer-applications")).toBe("computer-applications");
    // ISC has its own Physics / Geography / Commerce (Class 12): the class-10 keys do not leak
    expect(legacySubjectSlug("icse-cisce", 11, "physics")).toBe("physics");
    expect(legacySubjectSlug("icse-cisce", 12, "geography")).toBe("geography");
    expect(legacySubjectSlug("icse-cisce", 12, "commerce")).toBe("commerce");
    expect(legacySubjectSlug("cbse", 10, "hindi-a")).toBe("hindi");
    expect(legacySubjectSlug("cbse", 11, "english-core")).toBe("english");
    expect(legacySubjectSlug("icse-cisce", 10, "history-civics")).toBe("history-civics-and-geography");
    expect(legacySubjectSlug("icse-cisce", 11, "accounts")).toBe("accountancy");
    expect(legacySubjectSlug("cbse", 10, "mathematics")).toBe("mathematics");
    expect(legacySubjectSlug("up-board", 10, "hindi-a")).toBe("hindi-a");
  });

  it("every LEGACY_SUBJECT_SLUGS target is a seeded subject of the class(es) it applies to", () => {
    for (const [board, map] of Object.entries(LEGACY_SUBJECT_SLUGS)) {
      for (const [key, target] of Object.entries(map)) {
        const m = /^(\d+)\/(.+)$/.exec(key);
        const classes = m ? [Number(m[1])] : CLASS_SYLLABUS.filter((c) => c.boardSlug === board && c.subjects.some((s) => s.slug === key)).map((c) => c.classNum);
        expect(classes.length, `${board} ${key}: no 25 Sep class lists this segment`).toBeGreaterThan(0);
        for (const cls of classes) expect(seededSubjectSlugs(schoolExamCode(board, cls)!).has(target), `${board} class ${cls} ${key} -> ${target}`).toBe(true);
        expect(schoolSubjectCodeFromSlug(target)).toMatch(/^[A-Z0-9_]+$/);
      }
    }
  });

  it("every old CBSE / CISCE chapter URL resolves against the seeded chapter list: the same slug, or a live target", () => {
    let same = 0;
    let moved = 0;
    for (const cls of CLASS_SYLLABUS) {
      const examCode = schoolExamCode(cls.boardSlug, cls.classNum)!;
      for (const s of cls.subjects) {
        const mapped = legacySubjectSlug(cls.boardSlug, cls.classNum, s.slug);
        const live = liveBySubject.get(`${examCode}|${mapped}`) ?? [];
        for (const ch of s.chapters ?? []) {
          const target = legacyChapterTarget(cls.boardSlug, cls.classNum, s.slug, ch.slug, live);
          expect(target, `${cls.key}/${s.slug}/${ch.slug}`).not.toBeNull();
          expect(target!.subjectSlug).toBe(mapped);
          expect(live.some((c) => c.slug === target!.chapterSlug), `${cls.key}/${s.slug}/${ch.slug} -> ${target!.chapterSlug}`).toBe(true);
          if (target!.chapterSlug === ch.slug && target!.subjectSlug === s.slug) same++;
          else moved++;
        }
      }
    }
    // 26 Sep 2026: 114 of the 154 hand-listed chapter URLs are unchanged; 40 move
    // (38 hand-shortened slugs, "I'm Up and Down…" by how the apostrophe kebabs,
    // and "Units and Measurements" whose seeded title is NCERT's "Units and Measurement").
    expect(same).toBeGreaterThanOrEqual(114);
    expect(same + moved).toBe(154);
    const maths10 = liveBySubject.get("NCERT_C10|mathematics")!;
    expect(legacyChapterTarget("cbse", 10, "mathematics", "pair-of-linear-equations", maths10)).toEqual({
      subjectSlug: "mathematics",
      chapterSlug: "pair-of-linear-equations-in-two-variables",
    });
    expect(legacyChapterTarget("cbse", 10, "mathematics", "no-such-chapter", maths10)).toBeNull();
    const physics11 = liveBySubject.get("NCERT_C11|physics")!;
    expect(legacyChapterTarget("cbse", 11, "physics", "units-and-measurements", physics11)).toEqual({ subjectSlug: "physics", chapterSlug: "units-and-measurement" });
    expect(physics11.find((c) => c.slug === "units-and-measurement")?.code).toBe("keph1.ch01");
  });

  it("legacyChapterSlug: printed title first, then the same book's chapter at the old position, then a plural-insensitive title; null otherwise", () => {
    const book = { title: "Physics Part I", query: "keph1=0-7" };
    const live: LiveChapterLike[] = [
      { code: "keph1.ch01", name: "Units and Measurement", slug: "units-and-measurement" },
      { code: "keph1.ch02", name: "Motion in a Straight Line", slug: "motion-in-a-straight-line" },
      { code: "keph2.ch08", name: "Mechanical Properties of Solids", slug: "mechanical-properties-of-solids" },
    ];
    expect(legacyChapterSlug({ name: "Motion in a Straight Line", book, numberInBook: 2 }, live)).toBe("motion-in-a-straight-line");
    // a mis-typed old title, resolved by book + position
    expect(legacyChapterSlug({ name: "Units and Measurements", book, numberInBook: 1 }, live)).toBe("units-and-measurement");
    // the position rule stays inside the old chapter's own book
    expect(legacyChapterSlug({ name: "Something Else", book: { title: "Physics Part II", query: "keph2=0-7" }, numberInBook: 1 }, live)).toBeNull();
    // plural-insensitive title when the position is off
    expect(legacyChapterSlug({ name: "Unit and Measurements", book, numberInBook: 9 }, live)).toBe("units-and-measurement");
    expect(legacyChapterSlug({ name: "No Such Chapter", book, numberInBook: 9 }, live)).toBeNull();
  });

  it("subject slug ↔ Subject.code is a bijection over the seed", () => {
    for (const s of plan.subjects) {
      const slug = schoolSubjectSlug(s.code);
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(schoolSubjectCodeFromSlug(slug)).toBe(s.code);
    }
  });

  it("chapter slugs over the whole seed: unique per subject, never empty, book-coded only on a shared title", () => {
    const bySubject = new Map<string, typeof chapters>();
    for (const t of chapters) {
      const k = `${t.examCode}|${t.subjectCode}`;
      bySubject.set(k, [...(bySubject.get(k) ?? []), t]);
    }
    let coded = 0;
    for (const [key, list] of bySubject) {
      const slugs = schoolChapterSlugs(list);
      const seen = new Set<string>();
      const titles = new Map<string, number>();
      for (const t of list) titles.set(kebab(t.name), (titles.get(kebab(t.name)) ?? 0) + 1);
      for (const t of list) {
        const slug = slugs.get(t.code)!;
        expect(slug, `${key} ${t.code}`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(seen.has(slug), `${key} duplicate ${slug}`).toBe(false);
        seen.add(slug);
        const shared = (titles.get(kebab(t.name)) ?? 0) > 1;
        if (shared) {
          coded++;
          // the book code, or — when one book prints the title more than once — the whole code
          const ok = slug === `${kebab(t.name)}-${kebab(schoolBookCodeOf(t.code))}` || slug === `${kebab(t.name)}-${kebab(t.code)}`;
          expect(ok, `${key} ${t.code} ${slug}`).toBe(true);
        } else {
          expect(slug).toBe(kebab(t.name));
        }
      }
      // deterministic: the same list gives the same map
      expect([...schoolChapterSlugs(list).entries()]).toEqual([...slugs.entries()]);
    }
    // 26 Sep 2026: 10 shared titles = 21 chapters (Class 10 English First Flight vs
    // Words and Expressions 2, Class 12 Geography Part I / II, Economics
    // "Introduction", Class 9 Skill Education "Additional Vocations" x3).
    expect(coded).toBeGreaterThanOrEqual(20);
    expect(coded).toBeLessThan(40);
    expect(kebab("I’m Up and Down, and Round and Round")).toBe("i-m-up-and-down-and-round-and-round");
    expect(kebab("Orienting Yourself: The Use of Coordinates")).toBe("orienting-yourself-the-use-of-coordinates");
  });
});

// ── 3: the indexable rule ─────────────────────────────────────────────

describe("the one indexable rule and the guest quiz minimum", () => {
  it("SCHOOL_GUEST_QUIZ_MIN is the exam guest quiz's minimum", () => {
    expect(SCHOOL_GUEST_QUIZ_MIN).toBe(ANON_QUIZ_MIN);
    expect(SCHOOL_GUEST_QUIZ_MIN).toBe(5);
  });

  it("indexable = notes or a checked quiz; nothing else", () => {
    expect(isSchoolChapterIndexable({ hasNotes: true, validatedQuestions: 0 })).toBe(true);
    expect(isSchoolChapterIndexable({ hasNotes: false, validatedQuestions: 5 })).toBe(true);
    expect(isSchoolChapterIndexable({ hasNotes: false, validatedQuestions: 4 })).toBe(false);
    expect(isSchoolChapterIndexable({ hasNotes: false, validatedQuestions: 0 })).toBe(false);
    expect(hasSchoolGuestQuiz({ hasNotes: true, validatedQuestions: 4 })).toBe(false);
    expect(hasSchoolGuestQuiz({ hasNotes: false, validatedQuestions: 39 })).toBe(true);
  });

  it("the school scope pins the category and never reads `active`; servable = validated, MCQ, not withdrawn", () => {
    expect(SCHOOL_CONTAINER_WHERE).toEqual({ category: "SCHOOL_BOARD" });
    expect(SCHOOL_SERVABLE_QUESTION_WHERE).toEqual({ validated: true, type: "MCQ", NOT: { tags: { has: WITHDRAWN_TAG } } });
    expect(WITHDRAWN_TAG).toBe("rejected");
  });
});

// ── 4: notes ──────────────────────────────────────────────────────────

describe("stored notes → rendered markdown", () => {
  const stored = [
    "# Patterns in Mathematics",
    "",
    "## What this chapter is about",
    "",
    "Patterns are arrangements that repeat or follow a rule.",
    "",
    "## Key ideas",
    "",
    "- One idea per line.",
    "",
    "## Read the official chapter",
    "Read the chapter in the official NCERT book: https://ncert.nic.in/textbook/pdf/fegp101.pdf",
    "",
    `${PROVENANCE_COMMENT_PREFIX}{"pipeline":"school-batch-v1","topicCode":"fegp1.ch01"} -->`,
    "",
  ].join("\n");

  it("strips the provenance comment, the H1 and the official-link section, and reads the official URL back", () => {
    const p = prepareSchoolNotes(stored)!;
    expect(p.officialUrl).toBe("https://ncert.nic.in/textbook/pdf/fegp101.pdf");
    expect(p.markdown.startsWith("## What this chapter is about")).toBe(true);
    expect(p.markdown).not.toMatch(/^# /m);
    expect(p.markdown).not.toContain(OFFICIAL_LINK_HEADING);
    expect(p.markdown).not.toContain(PROVENANCE_COMMENT_PREFIX);
    expect(p.markdown).not.toContain("-->");
    expect(p.markdown.endsWith("- One idea per line.")).toBe(true);
    expect(p.wordCount).toBe(p.markdown.split(/\s+/).filter(Boolean).length);
  });

  it("rewrites what NotesMarkdown cannot draw: a pipe table becomes one bullet per row, *italics* become bold (26 Sep 2026 fixer)", () => {
    // The exact shapes stored on 26 Sep 2026 (Class 6 Maths ch 4 tally table, ch 2 "*Solution:*").
    const body = [
      "## Formulas and facts to remember",
      "",
      "A tally chart:",
      "| Colour | Tally | Frequency |",
      "|--------|-------|-----------|",
      "| Red    | ||||  | 4         |",
      "| Blue   | |||| | | 5         |",
      "| Green  | |||   | 3         |",
      "",
      "| Student | Symbols      |",
      "|---------|--------------|",
      "| Amit    | 📖📖📖       |",
      "",
      "*Solution:*",
      "- 3 * 4 = 12 and 2*3 = 6 stay as they are; **bold** stays; *two words* here.",
      "* a star bullet",
    ].join("\n");
    const p = prepareSchoolNotes(`# Data Handling\n\n${body}\n\n${OFFICIAL_LINK_HEADING}\n${OFFICIAL_LINK_PREFIX}https://ncert.nic.in/textbook/pdf/fegp104.pdf\n`)!;
    const lines = p.markdown.split("\n");
    expect(lines.some((l) => l.trim().startsWith("|"))).toBe(false);
    expect(lines).toContain("- Colour: **Red** · Tally: |||| · Frequency: 4");
    expect(lines).toContain("- Colour: **Blue** · Tally: |||| | · Frequency: 5");
    expect(lines).toContain("- Colour: **Green** · Tally: ||| · Frequency: 3");
    expect(lines).toContain("- Student: **Amit** · Symbols: 📖📖📖");
    // the table is its own block: a blank line separates it from the sentence before
    expect(lines[lines.indexOf("A tally chart:") + 1]).toBe("");
    expect(lines).toContain("**Solution:**");
    expect(lines).toContain("- 3 * 4 = 12 and 2*3 = 6 stay as they are; **bold** stays; **two words** here.");
    expect(lines).toContain("* a star bullet");
    // no single-asterisk pair survives (the renderer draws only **bold**)
    for (const l of lines) expect(l, l).not.toMatch(/(^|[^*\w])\*(?!\s)[^*\n]+?(?<!\s)\*(?![*\w])/);
    expect(p.officialUrl).toBe("https://ncert.nic.in/textbook/pdf/fegp104.pdf");
    expect(p.wordCount).toBe(p.markdown.split(/\s+/).filter(Boolean).length);
  });

  it("italicsToBold and normalizeSchoolMarkdown leave bold, bullets, arithmetic and plain notes alone", () => {
    expect(italicsToBold("*Solution:*")).toBe("**Solution:**");
    expect(italicsToBold("a *b* c")).toBe("a **b** c");
    for (const s of ["**bold**", "* bullet", "3 * 4", "2*3*4", "5*", "*x", "- one idea per line."]) expect(italicsToBold(s)).toBe(s);
    const plain = "## Key ideas\n\n- One idea per line.\n- **Bold** stays.\n\nA paragraph.";
    expect(normalizeSchoolMarkdown(plain)).toBe(plain);
    // a header-only table prints its header as a line; a separator alone prints nothing
    expect(normalizeSchoolMarkdown("| A | B |\n|---|---|")).toBe("A · B");
    expect(normalizeSchoolMarkdown("|---|---|")).toBe("");
  });

  it("empty or provenance-only content is no notes", () => {
    expect(prepareSchoolNotes(null)).toBeNull();
    expect(prepareSchoolNotes("")).toBeNull();
    expect(prepareSchoolNotes(`${PROVENANCE_COMMENT_PREFIX}{} -->`)).toBeNull();
  });

  it("the provenance helpers are the same functions the content runner uses (re-exported), and the literals match content-prompts", () => {
    expect(contentPlan.stripProvenanceComment).toBe(stripProvenanceComment);
    expect(contentPlan.readProvenanceComment).toBe(readProvenanceComment);
    expect(contentPlan.PROVENANCE_COMMENT_PREFIX).toBe(PROVENANCE_COMMENT_PREFIX);
    expect(readProvenanceComment(stored)?.topicCode).toBe("fegp1.ch01");
    expect(OFFICIAL_LINK_PREFIX).toBe(PROMPT_OFFICIAL_LINK_PREFIX);
    expect(NOTES_HEADINGS[NOTES_HEADINGS.length - 1]).toBe(OFFICIAL_LINK_HEADING);
  });
});

// ── 5: the school guest quiz getter ───────────────────────────────────

describe("getSchoolGuestQuiz (in-memory Prisma stub)", () => {
  beforeEach(() => {
    db.calls = [];
    db.topic = {
      id: "t1",
      name: "Patterns in Mathematics",
      code: "fegp1.ch01",
      children: [{ id: "t1p1" }],
      subject: { exam: { code: "NCERT_C06", shortName: "NCERT 6", name: "NCERT Class 6" } },
    };
    db.questions = Array.from({ length: 8 }, (_, i) => ({ id: `q${i}`, topicId: "t1", validated: true, type: "MCQ", tags: ["fegp1.ch01", "school"], examCategory: "SCHOOL_BOARD" }));
  });

  it("serves 5 validated, non-withdrawn MCQs of the chapter without ever reading the Exam table", async () => {
    const quiz = await getSchoolGuestQuiz({ examCode: "NCERT_C06", topicCode: "fegp1.ch01" });
    expect(quiz).not.toBeNull();
    expect(quiz!.questions).toHaveLength(5);
    expect(quiz!.examCode).toBe("NCERT_C06");
    expect(quiz!.scopeLabel).toBe("Patterns in Mathematics");
    expect(quiz!.replay).toBe(false);
    expect(db.calls.some((c) => c.model === "exam")).toBe(false);
    const q = db.calls.find((c) => c.model === "question")!.args as { where: Record<string, unknown> };
    expect(q.where).toMatchObject({ validated: true, type: "MCQ", NOT: { tags: { has: "rejected" } }, exam: { category: "SCHOOL_BOARD" }, topicId: { in: ["t1", "t1p1"] } });
    const t = db.calls.find((c) => c.model === "topic")!.args as { where: Record<string, unknown> };
    expect(t.where).toEqual({ code: "fegp1.ch01", parentId: null, subject: { exam: { category: "SCHOOL_BOARD", code: "NCERT_C06" } } });
  });

  it("refuses a chapter that is not under that school container (a real exam's code, a wrong class)", async () => {
    expect(await getSchoolGuestQuiz({ examCode: "SSC_CGL", topicCode: "fegp1.ch01" })).toBeNull();
    expect(await getSchoolGuestQuiz({ examCode: "NCERT_C07", topicCode: "fegp1.ch01" })).toBeNull();
    expect(db.calls.filter((c) => c.model === "question")).toHaveLength(0);
  });

  it("refuses a pool short of the minimum — unvalidated and withdrawn rows do not count", async () => {
    db.questions = [
      ...Array.from({ length: 4 }, (_, i) => ({ id: `v${i}`, topicId: "t1", validated: true, type: "MCQ", tags: [], examCategory: "SCHOOL_BOARD" })),
      { id: "u1", topicId: "t1", validated: false, type: "MCQ", tags: [], examCategory: "SCHOOL_BOARD" },
      { id: "w1", topicId: "t1", validated: true, type: "MCQ", tags: ["rejected"], examCategory: "SCHOOL_BOARD" },
      { id: "n1", topicId: "t1", validated: true, type: "NUMERIC", tags: [], examCategory: "SCHOOL_BOARD" },
    ];
    expect(await getSchoolGuestQuiz({ examCode: "NCERT_C06", topicCode: "fegp1.ch01" })).toBeNull();
    db.questions.push({ id: "v5", topicId: "t1p1", validated: true, type: "MCQ", tags: [], examCategory: "SCHOOL_BOARD" });
    const quiz = await getSchoolGuestQuiz({ examCode: "NCERT_C06", topicCode: "fegp1.ch01" });
    expect(quiz!.questions.map((q) => q.id).sort()).toEqual(["v0", "v1", "v2", "v3", "v5"]);
  });

  it("caps at the guest quiz maximum and never below the minimum", async () => {
    db.questions = Array.from({ length: 30 }, (_, i) => ({ id: `q${i}`, topicId: "t1", validated: true, type: "MCQ", tags: [], examCategory: "SCHOOL_BOARD" }));
    expect((await getSchoolGuestQuiz({ examCode: "NCERT_C06", topicCode: "fegp1.ch01", count: 50 }))!.questions).toHaveLength(10);
    expect((await getSchoolGuestQuiz({ examCode: "NCERT_C06", topicCode: "fegp1.ch01", count: 1 }))!.questions).toHaveLength(5);
  });
});

// ── 6: book / chapter identity from the spine ─────────────────────────

describe("book and chapter identity (src/lib/school/books.ts)", () => {
  it("reads the printed number, kind, book title and official PDF of a seeded chapter", () => {
    const meta = ncertChapterMeta(6, "fegp1.ch01");
    expect(meta).toEqual({ bookCode: "fegp1", bookTitle: "Ganita Prakash", number: "1", kind: "chapter", pdfUrl: "https://ncert.nic.in/textbook/pdf/fegp101.pdf" });
    expect(chapterLabel(meta)).toBe("Chapter 1");
    expect(chapterLabel(null)).toBe("");
    expect(ncertChapterMeta(6, "nope.ch99")).toBeNull();
  });

  it("lists a subject's official books with their index links and editions, and finds a chapter's book by code prefix", () => {
    const books = ncertBooksForSubject(6, "MATHEMATICS");
    expect(books.map((b) => b.code)).toEqual(["fegp1"]);
    expect(books[0].bookUrl).toBe("https://ncert.nic.in/textbook.php?fegp1=0-10");
    expect(books[0].editions.some((e) => e.language === "hi" && e.bookUrl.startsWith("https://ncert.nic.in/"))).toBe(true);
    expect(books[0].editions.some((e) => e.language === "ur")).toBe(true);
    expect(bookOfChapter(books, "fegp1.ch07")?.title).toBe("Ganita Prakash");
    expect(bookOfChapter(books, "fecu1.ch01")).toBeUndefined();
    expect(ncertBooksForSubject(10, "NO_SUCH_SUBJECT")).toEqual([]);
  });

  it("CISCE links come from cisce.org only", () => {
    const docs = cisceClassDocuments(10);
    expect(docs).not.toBeNull();
    for (const l of docs!.links) expect(l.url).toMatch(/^https:\/\/(?:www\.)?cisce\.org\//);
    for (const l of cisceSubjectLinks(10, "Mathematics")) expect(l.url).toMatch(/^https:\/\/(?:www\.)?cisce\.org\//);
    expect(cisceSubjectLinks(10, "No Such Subject")).toEqual([]);
  });
});

// ── copy helpers: counts are computed, never typed ────────────────────

describe("copy helpers", () => {
  it("countsLine names only non-zero parts", () => {
    expect(countsLine({ chapters: 10, notes: 5, practice: 5 })).toBe("10 chapters listed · Shishya notes on 5 · checked practice on 5");
    expect(countsLine({ chapters: 1, notes: 0, practice: 0 })).toBe("1 chapter listed");
  });

  // 26 Sep 2026 (integrator): a <title> never says "with notes and practice"
  // over a tree where 5 of 1,146 chapters have them — the count, or nothing.
  it("oursTitleBit is the computed count, empty without content", () => {
    expect(oursTitleBit({ notes: 0, practice: 0 })).toBe("");
    expect(oursTitleBit({ notes: 5, practice: 5 })).toBe(", Shishya notes and practice on 5 chapters");
    expect(oursTitleBit({ notes: 1, practice: 1 })).toBe(", Shishya notes and practice on 1 chapter");
    expect(oursTitleBit({ notes: 5, practice: 3 })).toBe(", Shishya notes on 5 and practice on 3 chapters");
    expect(oursTitleBit({ notes: 0, practice: 2 })).toBe(", Shishya practice on 2 chapters");
  });

  // 26 Sep 2026 (integrator): CISCE Classes 1-8 have one stage curriculum
  // document and no per-subject syllabus PDF; the ICSE / ISC classes have one
  // per subject. Page copy says which, computed from the spine — the same
  // distinction llms-full.txt and context.md draw.
  it("CISCE copy claims per-subject syllabus PDFs only where cisce.org publishes them", () => {
    const names = (cls: number) => cisceLevelForClass(cls)!.subjects.map((s) => s.name);
    for (const cls of [1, 3, 5, 6, 8]) expect(cisceSubjectsWithPdf(cls, names(cls)), `class ${cls}`).toBe(0);
    for (const cls of [9, 10, 11, 12]) expect(cisceSubjectsWithPdf(cls, names(cls)), `class ${cls}`).toBe(names(cls).length);
    expect(cisceSubjectsWithPdf(10, ["No Such Subject"])).toBe(0);

    expect(cisceDocsPhrase({ subjects: 7, withPdf: 0 })).toMatch(/^under CISCE's curriculum document for this stage — the council publishes no per-subject syllabus PDF/);
    expect(cisceDocsPhrase({ subjects: 35, withPdf: 35 })).toBe("each linking its own CISCE syllabus PDF and the council's regulations");
    expect(cisceDocsPhrase({ subjects: 35, withPdf: 30 })).toBe("30 of them linking their own CISCE syllabus PDF, the rest the council's regulations");
    expect(CLASS_COPY.cisceIntro(3, "Primary", { subjects: 7, withPdf: 0 })).not.toMatch(/syllabus PDFs/);
    expect(CLASS_COPY.cisceIntro(10, "ICSE 2027", { subjects: 35, withPdf: 35 })).toContain("each linking its own CISCE syllabus PDF");
    const today = BOARD_COPY.todayCisce({ classes: 12, subjects: 325, classesWithSubjectPdfs: 4 });
    expect(today).toContain("per-subject syllabus PDFs in 4 classes, one stage curriculum document (no per-subject PDF) in 8 classes");
    expect(today).not.toMatch(/each linking CISCE's own regulations and syllabus PDFs/);
    expect(HUB_COPY.cisceCardLine(12, 325)).toBe("12 classes · 325 subjects with the council's official documents");
    expect(HUB_COPY.lead({ chapters: 1, notes: 0, practice: 0 })).not.toMatch(/subjects with the council's own syllabus PDFs\./);
    expect(SUBJECT_COPY.noBook("ICT", 9)).toMatch(/^NCERT's textbook index lists ICT for Class 9 but publishes no book for it yet/);
  });
  it("the practice copy says what the beacon does, in the machine surfaces' words (26 Sep 2026 fixer)", () => {
    // SchoolChapterQuiz sends one anonymous QUIZ_ATTEMPTED event (chapter + score);
    // "nothing is saved" was untrue. HTML, llms-full.txt and context.md must agree.
    for (const text of [CHAPTER_QUIZ_COPY.intro, HUB_COPY.today({ chapters: 1, notes: 0, practice: 0 }), SCHOOL_CHILDREN_LINE]) {
      expect(text).toMatch(/no result is saved to any account or profile/);
      expect(text).toMatch(/anonymous usage event \(which chapter was practised and the score\)/);
      expect(text).not.toMatch(/nothing is saved|saves nothing|stores nothing|nothing is stored/i);
    }
    expect(CHAPTER_QUIZ_COPY.intro.endsWith(PRACTICE_PRIVACY_LINE)).toBe(true);
    expect(PRACTICE_PRIVACY_LINE).toMatch(/^No account needed/);
  });

  it("the page loaders (src/lib/school/db.ts) let a failed surface read throw — never the empty surface, never a catch (26 Sep 2026 fixer)", () => {
    const src = fs
      .readFileSync(path.resolve(__dirname, "../../src/lib/school/db.ts"), "utf8")
      .replace(/\r\n/g, "\n")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/EMPTY_SCHOOL_SURFACE|\.catch\(/);
    expect(src).toMatch(/return findSchoolClass\(await loadSchoolSurface\(\), boardSlug, cls\);/);
  });

  it("chapterHasParts and chapterStatusLabel say only what the chapter has", () => {
    expect(chapterHasParts({ hasNotes: true, quiz: true })).toBe("notes, practice and the official NCERT chapter");
    expect(chapterHasParts({ hasNotes: false, quiz: false })).toBe("the official NCERT chapter");
    expect(chapterStatusLabel({ hasNotes: false, quiz: false })).toBe("Official chapter only");
    expect(chapterStatusLabel({ hasNotes: true, quiz: false })).toBe("Notes");
    expect(subjectShortName("Mathematics")).toBe("Maths");
    expect(subjectShortName("Science")).toBe("Science");
  });
});
