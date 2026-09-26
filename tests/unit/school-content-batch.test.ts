// Tests for the school content batch runner's pure parts (26 Sep 2026):
// the prompt builders (src/lib/school/content-prompts.ts — a persona per
// class, the copyright rule, the official link), the reply parsers and the
// copy heuristic (content-parse.ts), the persistence plan (content-plan.ts)
// and the journal/phase state machine (src/lib/ai/batch.ts runJournalPhase)
// driven by a stubbed Batches API, like tests/unit/bank-verify-batch.test.ts.
// Nothing here touches the network or the database.

import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";

vi.mock("@/lib/db/prisma", () => ({ prisma: { aiUsage: { create: () => Promise.resolve({}) } } }));
vi.mock("next/server", () => ({
  after: () => {
    throw new Error("after() called outside a request scope");
  },
}));

import { messageParamsFor } from "@/lib/ai/client";
import { GENERATOR_OUTPUT_SCHEMA, coerceCandidate } from "@/lib/ai/factory/generator";
import type { CandidateQuestion } from "@/lib/ai/factory/types";
import { modelFor } from "@/lib/ai/router";
import {
  BATCH_CHUNK_MAX,
  journalPath,
  makeCustomId,
  newJournal,
  openJournalsCovering,
  runJournalPhase,
  saveJournal,
  loadJournal,
  worstCaseUsd,
  type BatchesApi,
  type JournalRequest,
  type MessageBatch,
  type ProbeResult,
  type SpendGuard,
} from "@/lib/ai/batch";
import {
  COPYRIGHT_RULE,
  HONEST_LABEL_RULE,
  MCQ_CHAPTER_MIX,
  MCQ_PROMPT_VERSION,
  MCQ_SET_ANGLES,
  MCQ_SETS_PER_CHAPTER,
  NOTES_HEADINGS,
  NOTES_MAX_TOKENS,
  NOTES_PROMPT_VERSION,
  SCHOOL_CLASSES_SUPPORTED,
  SENIOR_SUBJECTS,
  buildSchoolMcqRequest,
  buildSchoolNotesRequest,
  chapterIdentity,
  classPersona,
  mcqSystemPrompt,
  notesSystemPrompt,
  officialLinkLine,
  personaSubjects,
  placeholderNotes,
  retryFeedbackBlock,
  type SchoolChapter,
} from "@/lib/school/content-prompts";
import {
  HONEST_LABEL_PATTERNS,
  candidateSuspects,
  copySuspects,
  countWords,
  dedupeCandidates,
  difficultyMix,
  normaliseStem,
  parseSchoolMcqSet,
  parseSchoolNotes,
} from "@/lib/school/content-parse";
import {
  genTag,
  mixForSet,
  notesGeneratedBy,
  planNoteWrite,
  planQuestionRows,
  pruneBuiltRequests,
  questionTags,
  readProvenanceComment,
  setsNeeded,
  stripProvenanceComment,
} from "@/lib/school/content-plan";
import { displayTitle, ncertBooksForClass, ncertTopicCode } from "@/lib/school/spine";

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

const TOPIC_ID = "cmg1school0001abcd12345678";

const ch6: SchoolChapter = {
  topicId: TOPIC_ID,
  examCode: "NCERT_C06",
  cls: 6,
  subject: "Mathematics",
  bookCode: "fegp1",
  bookTitle: "Ganita Prakash",
  chapterNumber: "5",
  chapterKind: "chapter",
  topicCode: "fegp1.ch05",
  title: "Prime Time",
  officialUrl: "https://ncert.nic.in/textbook/pdf/fegp105.pdf",
};
const ch10: SchoolChapter = { ...ch6, examCode: "NCERT_C10", cls: 10, subject: "Science", bookCode: "jesc1", bookTitle: "Science", chapterNumber: "12", topicCode: "jesc1.ch12", title: "Electricity", officialUrl: "https://ncert.nic.in/textbook/pdf/jesc112.pdf" };
// 26 Sep 2026: Class 11-12 fixtures, as the runner resolves them from the spine
const ch11: SchoolChapter = { ...ch6, examCode: "NCERT_C11", cls: 11, subject: "Physics", bookCode: "keph1", bookTitle: "Physics Part-I", chapterNumber: "1", topicCode: "keph1.ch01", title: "Units and Measurement", officialUrl: "https://ncert.nic.in/textbook/pdf/keph101.pdf" };
const ch12: SchoolChapter = { ...ch6, examCode: "NCERT_C12", cls: 12, subject: "Chemistry", bookCode: "lech1", bookTitle: "Chemistry-I", chapterNumber: "2", chapterKind: "unit", topicCode: "lech1.ch02", title: "Electrochemistry", officialUrl: "https://ncert.nic.in/textbook/pdf/lech102.pdf" };

const words = (n: number, seed = "prime numbers have exactly two factors one and the number itself") => Array.from({ length: n }, (_, i) => seed.split(" ")[i % 11]).join(" ");

function goodNotes(ch: SchoolChapter, over: Partial<Record<string, string>> = {}): string {
  const body = (k: string, fallback: string) => over[k] ?? fallback;
  return [
    "## What this chapter is about",
    body("about", `${words(120)}.\n\n${words(80)}.`),
    "",
    "## Key ideas",
    body("ideas", `- A prime number has exactly two factors.\n- ${words(20)}.\n- ${words(20)}.\n- ${words(20)}.`),
    "",
    "## Formulas and facts to remember",
    body("facts", `- 2 is the only even prime.\n- ${words(30)}.`),
    "",
    "## Worked examples",
    body("examples", `Example 1: Is 91 prime? 91 = 7 × 13, so no.\n\nExample 2: ${words(60)}.`),
    "",
    "## Common mistakes",
    body("mistakes", `- Thinking 1 is prime → 1 has only one factor.\n- ${words(30)}.\n- ${words(30)}.`),
    "",
    "## Quick revision",
    body("revision", `- Prime: exactly two factors.\n- ${words(12)}.\n- ${words(12)}.`),
    "",
    "## Read the official chapter",
    body("link", officialLinkLine(ch)),
  ].join("\n");
}

function mcq(i: number, difficulty: "EASY" | "MEDIUM" | "HARD", over: Partial<CandidateQuestion> = {}): CandidateQuestion {
  return {
    body: `Which of these numbers is prime? (question ${i})`,
    options: [
      { key: "A", text: `${i * 2 + 4}` },
      { key: "B", text: "13" },
      { key: "C", text: "15" },
      { key: "D", text: "21" },
    ],
    answerKey: "B",
    solution: "13 has only the factors 1 and 13, so it is prime. The others have more factors, so B is right.",
    difficulty,
    tags: ["prime-numbers"],
    ...over,
  };
}

function goodSet(): CandidateQuestion[] {
  const d: Array<"EASY" | "MEDIUM" | "HARD"> = ["EASY", "EASY", "EASY", "EASY", "MEDIUM", "MEDIUM", "MEDIUM", "MEDIUM", "HARD", "HARD"];
  return d.map((x, i) => mcq(i, x));
}

function message(text: string, model = "claude-sonnet-4-5-20250929"): Anthropic.Messages.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model,
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 900, output_tokens: 1500, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  } as unknown as Anthropic.Messages.Message;
}

// ---------------------------------------------------------------------------
// prompt builders
// ---------------------------------------------------------------------------

describe("class personas", () => {
  it("exist for classes 6-12; the 6-10 ones differ by class in both prompts", () => {
    // 26 Sep 2026: + 11 and 12 (Physics, Chemistry, Mathematics, Biology — see "Class 11-12 personas" below)
    expect([...SCHOOL_CLASSES_SUPPORTED]).toEqual([6, 7, 8, 9, 10, 11, 12]);
    const junior = SCHOOL_CLASSES_SUPPORTED.filter((c) => c <= 10);
    const notes = junior.map((c) => notesSystemPrompt(c, "Mathematics"));
    const mcqs = junior.map((c) => mcqSystemPrompt(c, "Science"));
    expect(new Set(notes).size).toBe(5);
    expect(new Set(mcqs).size).toBe(5);
    expect(notes[0]).toContain("Class 6");
    expect(notes[0]).toContain("11-year-old");
    expect(notes[4]).toContain("board examination");
    expect(mcqs[0]).toContain("Class 6 question");
    expect(mcqs[0]).toContain("no chemical formulas");
    expect(mcqs[4]).toContain("balanced equations");
    // 26 Sep 2026 review: the Class 10 examples line must not nudge the model into board/exam wording that the honest-label check rejects
    expect(classPersona(10).examples).not.toMatch(/board|exam/i);
    // both prompts forbid quotation marks (the ≥ 12-word quotation heuristic relies on it) and the Common-mistakes form carries none
    for (const p of [...notes, ...mcqs]) expect(p).toMatch(/no quotation marks/i);
    const mistakes = /## Common mistakes\n([^\n]+)/.exec(notes[0])?.[1] ?? "";
    expect(mistakes).toContain("the wrong thinking → the fix");
    expect(mistakes).not.toContain('"');
    // maths persona for a maths subject, science persona for science
    expect(notesSystemPrompt(6, "Mathematics")).toContain("Mathematics at this class means");
    expect(notesSystemPrompt(6, "Science")).toContain("Science at this class means");
    expect(classPersona(6).notesWords[1]).toBeLessThan(classPersona(10).notesWords[1]);
  });

  it("refuses a class without a persona", () => {
    expect(() => classPersona(5)).toThrow(/no persona for Class 5/);
    expect(() => classPersona(13)).toThrow(/no persona for Class 13/);
    expect(() => notesSystemPrompt(3, "Mathematics")).toThrow(/no persona/);
    expect(() => personaSubjects(4)).toThrow(/no persona/);
  });
});

// 26 Sep 2026: Class 11-12 (+1/+2) — Physics, Chemistry, Mathematics and
// Biology — so scripts/school-content-batch.ts can price them in a free dry run
// for the founder's Tier-2 decision. Same rules as 6-10 (link the book, never
// copy it; own questions; honest labels), the 13-and-above framing of Class
// 8-12, and one more line: no NCERT solutions.
describe("Class 11-12 personas", () => {
  const SENIOR = [11, 12] as const;

  it("leave every Class 6-10 prompt byte for byte as it was (why the prompt versions stay v2)", () => {
    // sha256 of the notes + MCQ system prompts of Classes 6-10 × Mathematics, Science, taken before the 11-12 change.
    // If this fails, a 6-10 prompt changed: bump NOTES_PROMPT_VERSION / MCQ_PROMPT_VERSION, then update the hash.
    const pin = [6, 7, 8, 9, 10].flatMap((c) => ["Mathematics", "Science"].flatMap((s) => [notesSystemPrompt(c, s), mcqSystemPrompt(c, s)])).join("\u0000");
    expect(createHash("sha256").update(pin).digest("hex")).toBe("4c8f13c03f3390e06929542e74028af11ada9d06521195e3730d80370450f3fb");
    expect(NOTES_PROMPT_VERSION).toBe("school-notes-v2");
    for (const c of [6, 7, 8, 9, 10]) {
      expect(personaSubjects(c)).toBeNull();
      expect(classPersona(c).subjects).toBeUndefined();
      expect(classPersona(c).copyrightAddendum).toBeUndefined();
      expect(notesSystemPrompt(c, "Mathematics")).not.toMatch(/no NCERT solutions/);
      // 6-10 still take any subject (the generic line), as before
      expect(notesSystemPrompt(c, "English")).toContain(`Keep every idea within what Class ${c} studies in English.`);
    }
  });

  it("exist for Physics, Chemistry, Mathematics and Biology, and differ by class and subject in both prompts", () => {
    expect([...SENIOR_SUBJECTS]).toEqual(["Physics", "Chemistry", "Mathematics", "Biology"]);
    const notes: string[] = [];
    const mcqs: string[] = [];
    for (const c of SENIOR) {
      const p = classPersona(c);
      expect(personaSubjects(c)).toEqual(SENIOR_SUBJECTS);
      for (const s of SENIOR_SUBJECTS) {
        const n = notesSystemPrompt(c, s);
        const m = mcqSystemPrompt(c, s);
        notes.push(n);
        mcqs.push(m);
        for (const text of [n, m]) {
          expect(text).toContain(`This chapter is NCERT Class ${c} ${s}.`);
          expect(text).toContain(`${s} at this class means: `);
          expect(text).toContain(p.learner);
          // the copyright rule unchanged, then the no-NCERT-solutions line
          expect(text).toContain(COPYRIGHT_RULE);
          expect(text).toContain(p.copyrightAddendum!);
          expect(text.indexOf(p.copyrightAddendum!)).toBeGreaterThan(text.indexOf(COPYRIGHT_RULE));
          expect(text).toMatch(/no quotation marks/i);
          // a science subject gets its own coverage + the shared conventions line; Mathematics its course
          if (s === "Mathematics") expect(text).toContain(p.maths);
          else expect(text).toContain(p.science);
        }
        expect(m).toContain(HONEST_LABEL_RULE);
        expect(m).toContain(GENERATOR_OUTPUT_SCHEMA);
        expect(m).toContain(`Class ${c} question`);
        expect(n).toContain(`${p.notesWords[0]}–${p.notesWords[1]} words in total`);
        for (const h of NOTES_HEADINGS) expect(n).toContain(h);
      }
    }
    expect(new Set(notes).size).toBe(SENIOR.length * SENIOR_SUBJECTS.length);
    expect(new Set(mcqs).size).toBe(SENIOR.length * SENIOR_SUBJECTS.length);
    expect(notesSystemPrompt(11, "Mathematics")).toContain("limits and derivatives");
    expect(notesSystemPrompt(12, "Mathematics")).toContain("differential equations");
    expect(notesSystemPrompt(11, "Physics")).toContain("oscillations and waves");
    expect(notesSystemPrompt(12, "Chemistry")).toContain("electrochemistry");
    expect(notesSystemPrompt(12, "Biology")).toContain("biotechnology");
  });

  it("refuse a senior subject nobody wrote a persona for, instead of a generic prompt", () => {
    for (const c of SENIOR) {
      for (const s of ["Science", "Accountancy", "English", "Computer Science", "physics", "constructor"]) {
        expect(() => notesSystemPrompt(c, s)).toThrow(new RegExp(`Class ${c} persona is written for Physics, Chemistry, Mathematics, Biology only`));
        expect(() => mcqSystemPrompt(c, s)).toThrow(/only \(got/);
      }
    }
  });

  it("frame the reader as a student of 13 and above, name no board or exam in the examples, quote nothing and trip none of our own checks", () => {
    for (const c of SENIOR) {
      const p = classPersona(c);
      const age = Number(/(\d+)-year-old/.exec(p.learner)?.[1]);
      expect(age).toBeGreaterThanOrEqual(13);
      expect(age).toBe(c + 5);
      expect(p.examples).not.toMatch(/board|exam/i);
      const text = [p.learner, p.language, p.maths, p.science, p.examples, ...Object.values(p.subjects ?? {})].join("\n");
      // the prompts forbid quotation marks and the copy check reads them as lifted text
      expect(`${text}\n${p.copyrightAddendum}`).not.toMatch(/["“”„]/);
      // the descriptive lines prime none of the shapes our checks reject (the addendum, like COPYRIGHT_RULE, names what it forbids)
      expect(copySuspects(text)).toEqual([]);
      for (const { re } of HONEST_LABEL_PATTERNS) expect(text).not.toMatch(re);
      // class level, not a competitive-exam nudge
      expect(text).not.toMatch(/\b(?:JEE|NEET|CUET|SSC)\b/);
      // no NCERT solutions; our own questions
      expect(p.copyrightAddendum).toMatch(/no NCERT solutions/);
      expect(p.copyrightAddendum).toMatch(/Do not recall, rework, renumber or solve any of them/);
      expect(p.copyrightAddendum).toMatch(/newly invented/);
    }
    // Class 12 Biology's reproduction and health chapters are handled factually, as a school lesson does
    expect(classPersona(12).subjects!.Biology).toMatch(/factually and respectfully in scientific terms/);
  });

  it("grow the notes length with the class; the notes check applies the class's own bounds; the longest reply still fits max_tokens", () => {
    for (let i = 1; i < SCHOOL_CLASSES_SUPPORTED.length; i++) {
      const [a, b] = [classPersona(SCHOOL_CLASSES_SUPPORTED[i - 1]), classPersona(SCHOOL_CLASSES_SUPPORTED[i])];
      expect(b.notesWords[0]).toBeGreaterThanOrEqual(a.notesWords[0]);
      expect(b.notesWords[1]).toBeGreaterThanOrEqual(a.notesWords[1]);
    }
    // parser max = hi × 1.35 words; ~1.7 tokens a word (TopicTeachingNote: ~1,700 tokens for 1,023 words) stays under NOTES_MAX_TOKENS
    for (const c of SCHOOL_CLASSES_SUPPORTED) expect(Math.round(classPersona(c).notesWords[1] * 1.35) * 1.7).toBeLessThan(NOTES_MAX_TOKENS);
    // the same note passes at Class 6 length and fails at Class 11's minimum
    const rest = countWords(goodNotes(ch11, { about: "" }));
    const min11 = Math.round(classPersona(11).notesWords[0] * 0.65);
    const atMin = goodNotes(ch11, { about: `${words(min11 - rest)}.` });
    expect(countWords(atMin)).toBe(min11);
    expect(parseSchoolNotes(atMin, ch11)).toMatchObject({ ok: true, reasons: [] });
    const below = goodNotes(ch11, { about: `${words(min11 - rest - 1)}.` });
    expect(parseSchoolNotes(below, ch11).reasons).toContain(`too short: ${min11 - 1} words (min ${min11})`);
    expect(parseSchoolNotes(below, { ...ch6, officialUrl: ch11.officialUrl }).ok).toBe(true);
  });

  it("assemble the notes and MCQ requests for a Class 11 and a Class 12 chapter: chapter identity, the official link only, our notes as grounding", () => {
    for (const ch of [ch11, ch12]) {
      const n = buildSchoolNotesRequest(ch);
      expect(Object.keys(n).sort()).toEqual(["max_tokens", "messages", "model", "system"]);
      expect(n.model).toBe(modelFor("generate"));
      expect(n.max_tokens).toBe(NOTES_MAX_TOKENS);
      const live = messageParamsFor({ model: n.model, maxTokens: n.max_tokens, system: n.system, messages: n.messages });
      expect(JSON.stringify(live)).toBe(JSON.stringify(n));
      const user = String(n.messages[0].content);
      expect(n.system[0].text).toBe(notesSystemPrompt(ch.cls, ch.subject));
      expect(user).toContain(`Class: ${ch.cls}`);
      expect(user).toContain(`Subject: ${ch.subject}`);
      expect(user).toContain(`Book: ${ch.bookTitle} (NCERT code ${ch.bookCode})`);
      expect(user).toContain(`Decide what a Class ${ch.cls} ${ch.subject} student studies under this chapter title`);
      expect(user.endsWith(officialLinkLine(ch))).toBe(true);
      const urls = JSON.stringify(n).match(/https?:\/\/[^\s"\\]+/g) ?? [];
      expect(new Set(urls)).toEqual(new Set([ch.officialUrl]));
      const m = buildSchoolMcqRequest(ch, goodNotes(ch), 2, { mix: mixForSet(2) });
      expect(m.system[0].text).toBe(mcqSystemPrompt(ch.cls, ch.subject));
      const mu = String(m.messages[0].content);
      expect(mu).toContain("Generate exactly 10 questions");
      expect(mu).toContain(MCQ_SET_ANGLES[2]);
      expect(mu).toContain("Shishya's own study notes");
      expect(mu).toContain(ch.officialUrl);
    }
    expect(String(buildSchoolNotesRequest(ch12).messages[0].content)).toContain("Unit 2: Electrochemistry");
    expect(chapterIdentity(ch11)).toBe("NCERT Class 11 · Physics · Physics Part-I · Chapter 1: Units and Measurement");
  });

  it("cover every Physics, Chemistry, Mathematics and Biology chapter of the Class 11 and 12 spine under the spine's own subject names", () => {
    for (const c of SENIOR) {
      const seen = new Set<string>();
      for (const { subject, book } of ncertBooksForClass(c)) {
        if (!(SENIOR_SUBJECTS as readonly string[]).includes(subject.name)) continue;
        for (const chapter of book.chapters) {
          seen.add(subject.name);
          const sc: SchoolChapter = {
            topicId: `t-${book.code}-${chapter.pdfSeq}`,
            examCode: `NCERT_C${c}`,
            cls: c,
            subject: subject.name,
            bookCode: book.code,
            bookTitle: book.title,
            chapterNumber: chapter.number,
            chapterKind: chapter.kind,
            topicCode: ncertTopicCode(book.code, chapter.pdfSeq),
            title: displayTitle(chapter.title),
            officialUrl: chapter.pdfUrl,
          };
          const n = buildSchoolNotesRequest(sc, { model: "m" });
          expect(String(n.messages[0].content).endsWith(officialLinkLine(sc))).toBe(true);
          for (let i = 0; i < MCQ_SETS_PER_CHAPTER; i++) {
            const m = buildSchoolMcqRequest(sc, placeholderNotes(sc), i, { model: "m", mix: mixForSet(i) });
            expect(m.system[0].text).toContain(`NCERT Class ${c} ${subject.name}.`);
          }
        }
      }
      expect([...seen].sort(), `Class ${c}`).toEqual([...SENIOR_SUBJECTS].sort());
    }
  });
});

describe("notes request", () => {
  it("is the exact body callClaude would send, on the generate tier, 4000 tokens", () => {
    const p = buildSchoolNotesRequest(ch6);
    expect(Object.keys(p).sort()).toEqual(["max_tokens", "messages", "model", "system"]);
    expect(p.model).toBe(modelFor("generate"));
    expect(p.max_tokens).toBe(4000);
    const live = messageParamsFor({ model: p.model, maxTokens: p.max_tokens, system: p.system, messages: p.messages });
    expect(JSON.stringify(live)).toBe(JSON.stringify(p));
    expect(buildSchoolNotesRequest(ch6)).toEqual(p);
  });

  it("carries the copyright rule, the chapter identity, the official link and every section heading — and no textbook text", () => {
    const p = buildSchoolNotesRequest(ch6);
    const system = p.system[0].text;
    const user = String(p.messages[0].content);
    expect(system).toContain(COPYRIGHT_RULE);
    expect(COPYRIGHT_RULE).toMatch(/CC BY-NC-ND/);
    expect(COPYRIGHT_RULE).toMatch(/Exercise 1\.1/);
    expect(COPYRIGHT_RULE).toMatch(/must not try to recall its exact text/);
    for (const h of NOTES_HEADINGS) expect(system).toContain(h);
    expect(user).toContain("Class: 6");
    expect(user).toContain("Subject: Mathematics");
    expect(user).toContain("Book: Ganita Prakash (NCERT code fegp1)");
    expect(user).toContain("Chapter 5: Prime Time");
    expect(user).toContain("`fegp1.ch05`");
    expect(user).toContain(officialLinkLine(ch6));
    expect(user).toContain("https://ncert.nic.in/textbook/pdf/fegp105.pdf");
    // the only URL in the whole request is the official one
    const urls = JSON.stringify(p).match(/https?:\/\/[^\s"\\]+/g) ?? [];
    expect(new Set(urls)).toEqual(new Set([ch6.officialUrl]));
    expect(chapterIdentity(ch6)).toBe("NCERT Class 6 · Mathematics · Ganita Prakash · Chapter 5: Prime Time");
  });
});

describe("mcq set request", () => {
  it("asks for the factory generator's exact JSON shape, the 4/4/2 mix, honest labels, and grounds in OUR notes", () => {
    const notes = goodNotes(ch6);
    const p = buildSchoolMcqRequest(ch6, notes, 0);
    expect(Object.keys(p).sort()).toEqual(["max_tokens", "messages", "model", "system"]);
    expect(p.model).toBe(modelFor("generate"));
    expect(p.max_tokens).toBe(6000);
    const system = p.system[0].text;
    const user = String(p.messages[0].content);
    expect(system).toContain(GENERATOR_OUTPUT_SCHEMA);
    expect(system).toContain(COPYRIGHT_RULE);
    expect(system).toContain(HONEST_LABEL_RULE);
    expect(HONEST_LABEL_RULE).toMatch(/never call a question an NCERT exercise/i);
    expect(user).toContain("Generate exactly 10 questions");
    expect(user).toContain("EASY: 4 · MEDIUM: 4 · HARD: 2");
    expect(user).toContain("Shishya's own study notes");
    expect(user).toContain("A prime number has exactly two factors.");
    expect(user).toContain(ch6.officialUrl);
  });

  it("gives each of the four sets its own angle", () => {
    const angles = [0, 1, 2, 3].map((i) => String(buildSchoolMcqRequest(ch6, "notes", i).messages[0].content));
    expect(new Set(angles).size).toBe(4);
    expect(angles[0]).toContain(`set 1 of ${MCQ_SETS_PER_CHAPTER}`);
    expect(angles[3]).toContain(MCQ_SET_ANGLES[3]);
    expect(MCQ_SET_ANGLES).toHaveLength(MCQ_SETS_PER_CHAPTER);
  });

  it("four per-set mixes add up to the chapter's 16/16/8", () => {
    const sum = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (let i = 0; i < MCQ_SETS_PER_CHAPTER; i++) {
      const m = mixForSet(i);
      sum.EASY += m.EASY;
      sum.MEDIUM += m.MEDIUM;
      sum.HARD += m.HARD;
    }
    expect(sum).toEqual(MCQ_CHAPTER_MIX);
    expect(MCQ_CHAPTER_MIX).toEqual({ EASY: 16, MEDIUM: 16, HARD: 8 });
  });

  it("placeholder notes for the dry-run estimate are about the requested length", () => {
    const w = placeholderNotes(ch6, 1000).split(/\s+/).filter(Boolean).length;
    expect(w).toBeGreaterThanOrEqual(1000);
    expect(w).toBeLessThan(1040);
  });

  it("a retry carries our checker's reasons in both prompts; a first attempt carries none", () => {
    const why = "copy suspect — figure reference (Fig. 3.2): \"Fig. 3.2\"; too short: 300 words (min 390)";
    const notes = buildSchoolNotesRequest(ch6, { retryFeedback: why });
    const mcqs = buildSchoolMcqRequest(ch6, "notes", 1, { retryFeedback: why });
    for (const p of [notes, mcqs]) {
      const user = String(p.messages[0].content);
      expect(user).toContain("# Your previous reply was rejected by our checker");
      expect(user).toContain(`Reasons: ${why}`);
      expect(user).toMatch(/fix every reason above/);
    }
    // the system prompt (per class, the same for every chapter) is unchanged by the retry
    expect(notes.system).toEqual(buildSchoolNotesRequest(ch6).system);
    expect(mcqs.system).toEqual(buildSchoolMcqRequest(ch6, "notes", 1).system);
    expect(String(buildSchoolNotesRequest(ch6).messages[0].content)).not.toContain("rejected by our checker");
    expect(String(buildSchoolMcqRequest(ch6, "notes", 1).messages[0].content)).not.toContain("rejected by our checker");
    expect(retryFeedbackBlock(undefined)).toBe("");
    expect(retryFeedbackBlock("  ")).toBe("");
    // the retry prompt still names the same chapter and link
    expect(String(notes.messages[0].content)).toContain(officialLinkLine(ch6));
    expect(NOTES_PROMPT_VERSION).toBe("school-notes-v2");
    expect(MCQ_PROMPT_VERSION).toBe("school-mcq-v2");
  });
});

describe("Phase V hand-off", () => {
  it("the bank verifier's own run id works for one exam per run, not for a comma list (why the runner prints one command per exam)", () => {
    // scripts/verify-question-bank.ts newRunId(): EXAMS.join("+").replace(/[^A-Za-z0-9_+-]/g, "").slice(0, 40)
    const slug = (exams: string[]) => exams.join("+").replace(/[^A-Za-z0-9_+-]/g, "").slice(0, 40);
    expect(() => journalPath("D:/x", `20260926-120000-${slug(["NCERT_C06", "NCERT_C07"])}`)).toThrow(/plain file-name token/);
    for (const code of ["NCERT_C06", "NCERT_C07", "NCERT_C08", "NCERT_C09", "NCERT_C10"]) {
      expect(journalPath("D:/x", `20260926-120000-${slug([code])}`)).toMatch(new RegExp(`20260926-120000-${code}\\.json$`));
    }
  });
});

// ---------------------------------------------------------------------------
// copy heuristic
// ---------------------------------------------------------------------------

describe("copySuspects", () => {
  it("flags the shape of a textbook copy", () => {
    const hits = [
      "Now solve Exercise 1.1 from the chapter.",
      "Look at Fig. 3.2 to see the angles.",
      "Figure 3.2 shows the angles.",
      "Do Activity 4.5 with your partner.",
      "As in Example 2.3, divide first.",
      "Table 1.2 lists the primes.",
      "Turn to page 42 for more.",
      "See page 42 for the proof.",
      "The rule is given on page 42.",
      "The proof (page 42) uses this idea.",
      "The proof is on p. 42 and pp. 43-44.",
      "This is explained in the textbook.",
      "As shown in the NCERT book, primes are special.",
      "As defined in this book, a prime has two factors.",
      "The book says that primes are special.",
      "Try the NCERT exercise questions.",
      "Question 3 of the exercise asks the same.",
      `He said "${words(12)}" and that was that.`,
      `"${words(12)}"`,
      `- Wrong: "${words(14)}" → the fix.`,
    ];
    for (const h of hits) expect(copySuspects(h), h).not.toEqual([]);
  });

  it("leaves our own wording alone — including the word problems and the two-quote cases the review found", () => {
    const clean = [
      "Example 1: Is 91 prime? 91 = 7 × 13.",
      "A book has 120 pages; you read 30 pages a day.",
      "Write the primes in a table with two columns.",
      "Activity: count the legs of a chair.",
      'The word "prime" means first.',
      `"${words(8)}" is a short quotation.`,
      officialLinkLine(ch6),
      "Read the chapter in the official NCERT book for the full text.",
      // 26 Sep 2026 review: Class 6-7 word-problem staples that used to trip the heuristic
      "Riya reads 20 pages from the book every day. How many days does she need for 240 pages?",
      "There are 240 pages in the book. Meera has read up to page 40.",
      "She read from page 10 to page 25 on Monday.",
      "Activity 1: Take a glass of water and add a spoon of salt.",
      "Figure 1 shows a rectangle 5 cm long and 3 cm wide.",
      "Table 1 below lists the first ten primes.",
      // two short quotations in one paragraph: the text between them is not a quotation
      'The word "prime" means first. A prime number has exactly two factors: one and the number itself. The word "composite" means made of parts.',
      // two short quotations in different sections, across a heading
      `## Key ideas\n- The word "factor" means a number that divides exactly.\n- ${words(20)}.\n\n## Common mistakes\n- Thinking "all odd numbers are prime" → 9 is odd but 9 = 3 × 3.`,
      // the Common-mistakes form without quotes
      "- All odd numbers are prime → 9 is odd but 9 = 3 × 3, so it is not prime.",
    ];
    for (const c of clean) expect(copySuspects(c), c).toEqual([]);
  });

  it("a whole note with quoted terms in three sections is clean", () => {
    const note = goodNotes(ch6, {
      ideas: `- The word "prime" means first: a prime number has exactly two factors.\n- The word "composite" means made of parts.\n- ${words(20)}.`,
      mistakes: `- Thinking "1 is prime" → 1 has only one factor.\n- Thinking "all odd numbers are prime" → 9 = 3 × 3.\n- ${words(30)}.`,
      revision: `- "Prime" = exactly two factors.\n- ${words(12)}.`,
    });
    expect(copySuspects(note)).toEqual([]);
    const r = parseSchoolNotes(note, ch6);
    expect(r.reasons).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("candidateSuspects adds the honest-label patterns — a source, not the word examination", () => {
    expect(candidateSuspects(mcq(1, "EASY", { body: "This NCERT exercise question asks which number is prime?" }))).not.toEqual([]);
    expect(candidateSuspects(mcq(1, "EASY", { solution: "This board question is easy. 13 is prime, so B." }))).not.toEqual([]);
    expect(candidateSuspects(mcq(1, "EASY", { solution: "This appeared in the 2019 board paper. 13 is prime, so B." }))).not.toEqual([]);
    expect(candidateSuspects(mcq(1, "EASY", { solution: "It came in a previous year paper. 13 is prime, so B." }))).not.toEqual([]);
    expect(candidateSuspects(mcq(1, "EASY", { solution: "This question was taken from a past paper. 13 is prime, so B." }))).not.toEqual([]);
    expect(candidateSuspects(mcq(1, "EASY"))).toEqual([]);
    // 26 Sep 2026 review: a percentage problem set in an examination is content, not a label
    expect(candidateSuspects(mcq(1, "EASY", { body: "In an examination paper of 30 questions, Arjun answered 24 correctly. What percentage did he get right?" }))).toEqual([]);
    expect(candidateSuspects(mcq(1, "EASY", { body: "In a board examination paper of 30 questions, Arjun answered 24 correctly. What percentage is that?" }))).toEqual([]);
    expect(candidateSuspects(mcq(1, "EASY", { solution: "The marks given in the examination add up to 24 out of 30, that is 80%. So B." }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// notes parser
// ---------------------------------------------------------------------------

describe("parseSchoolNotes", () => {
  it("accepts a well-formed note and keeps the official link line", () => {
    const r = parseSchoolNotes(goodNotes(ch6), ch6);
    expect(r.reasons).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.words).toBeGreaterThan(400);
    expect(r.content).toContain(officialLinkLine(ch6));
    expect(r.content.split(officialLinkLine(ch6)).length).toBe(2);
  });

  it("strips a markdown fence and appends the link line when the model left it out", () => {
    const withoutLink = goodNotes(ch6, { link: "" });
    const r = parseSchoolNotes("```markdown\n" + withoutLink + "\n```", ch6);
    expect(r.ok).toBe(true);
    expect(r.content.startsWith("## What this chapter is about")).toBe(true);
    expect(r.content.endsWith(officialLinkLine(ch6))).toBe(true);
    expect(r.content.split(ch6.officialUrl).length).toBe(2);
  });

  it("normalises the official section to exactly our link line — a markdown link or a sentence around the URL does not double it", () => {
    const md = parseSchoolNotes(goodNotes(ch6, { link: `Read the chapter in the official NCERT book: [Ganita Prakash](${ch6.officialUrl})` }), ch6);
    expect(md.reasons).toEqual([]);
    expect(md.content.endsWith(`## Read the official chapter\n${officialLinkLine(ch6)}`)).toBe(true);
    expect(md.content.split(ch6.officialUrl).length).toBe(2);
    const sentence = parseSchoolNotes(goodNotes(ch6, { link: `You can read the full chapter here: ${ch6.officialUrl} — it is free.\n\nHappy learning!` }), ch6);
    expect(sentence.ok).toBe(true);
    expect(sentence.content.endsWith(`## Read the official chapter\n${officialLinkLine(ch6)}`)).toBe(true);
    // a heading missing entirely is appended once
    const none = parseSchoolNotes(goodNotes(ch6).replace("\n## Read the official chapter\n" + officialLinkLine(ch6), ""), ch6);
    expect(none.content.split("## Read the official chapter").length).toBe(2);
    expect(none.content.endsWith(officialLinkLine(ch6))).toBe(true);
  });

  it("rejects notes that are too short or too long for the class", () => {
    const short = parseSchoolNotes(goodNotes(ch6, { about: "Primes.", examples: "None.", mistakes: "-", revision: "-", ideas: "-", facts: "-" }), ch6);
    expect(short.ok).toBe(false);
    expect(short.reasons.join(" ")).toMatch(/too short/);
    const long = parseSchoolNotes(goodNotes(ch6, { about: words(1500) }), ch6);
    expect(long.ok).toBe(false);
    expect(long.reasons.join(" ")).toMatch(/too long/);
  });

  it("rejects a missing or out-of-order required heading, but not the optional formulas section", () => {
    const missing = parseSchoolNotes(goodNotes(ch6).replace("## Common mistakes", "## Mistakes"), ch6);
    expect(missing.ok).toBe(false);
    expect(missing.reasons.join(" ")).toMatch(/## Common mistakes/);
    const swapped = goodNotes(ch6).replace("## Key ideas", "## TEMP").replace("## Worked examples", "## Key ideas").replace("## TEMP", "## Worked examples");
    expect(parseSchoolNotes(swapped, ch6).ok).toBe(false);
    const noFormulas = goodNotes(ch6).replace("## Formulas and facts to remember", "## Facts");
    expect(parseSchoolNotes(noFormulas, ch6).ok).toBe(true);
  });

  it("rejects a link other than the official chapter PDF and any copy suspect", () => {
    const foreign = parseSchoolNotes(goodNotes(ch6, { facts: "- See https://example.com/primes for more." }), ch6);
    expect(foreign.ok).toBe(false);
    expect(foreign.reasons.join(" ")).toMatch(/example\.com/);
    const copied = parseSchoolNotes(goodNotes(ch6, { examples: `Example 1: solve Exercise 5.1 question 3. ${words(60)}` }), ch6);
    expect(copied.ok).toBe(false);
    expect(copied.reasons.join(" ")).toMatch(/copy suspect — exercise reference/);
    const wrongUrl = parseSchoolNotes(goodNotes(ch6, { link: "Read the chapter in the official NCERT book: https://ncert.nic.in/textbook/pdf/fegp199.pdf" }), ch6);
    expect(wrongUrl.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mcq parser
// ---------------------------------------------------------------------------

describe("parseSchoolMcqSet", () => {
  it("accepts a clean set of ten in the factory's shape with the exact mix", () => {
    const r = parseSchoolMcqSet(JSON.stringify(goodSet()), { strictMix: true });
    expect(r.reasons).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.candidates).toHaveLength(10);
    expect(r.mix).toEqual({ EASY: 4, MEDIUM: 4, HARD: 2 });
    expect(r.candidates[0]).toEqual(coerceCandidate(goodSet()[0]));
  });

  it("tolerates a fence and prose around the array", () => {
    const r = parseSchoolMcqSet("Here you go:\n```json\n" + JSON.stringify(goodSet()) + "\n```", { strictMix: true });
    expect(r.ok).toBe(true);
  });

  it("strict (attempt 1) refuses a wrong mix or count; lenient (attempt 2) keeps any clean set of six or more", () => {
    const set = goodSet();
    set[0].difficulty = "MEDIUM";
    const strict = parseSchoolMcqSet(JSON.stringify(set), { strictMix: true });
    expect(strict.ok).toBe(false);
    expect(strict.reasons.join(" ")).toMatch(/difficulty mix 3\/5\/2/);
    const lenient = parseSchoolMcqSet(JSON.stringify(set), { strictMix: false });
    expect(lenient.ok).toBe(true);
    expect(lenient.mix).toEqual({ EASY: 3, MEDIUM: 5, HARD: 2 });
    const nine = parseSchoolMcqSet(JSON.stringify(goodSet().slice(0, 9)), { strictMix: true });
    expect(nine.ok).toBe(false);
    expect(nine.reasons.join(" ")).toMatch(/expected 10 questions, got 9/);
    expect(parseSchoolMcqSet(JSON.stringify(goodSet().slice(0, 6)), { strictMix: false }).ok).toBe(true);
    expect(parseSchoolMcqSet(JSON.stringify(goodSet().slice(0, 5)), { strictMix: false }).ok).toBe(false);
  });

  it("drops a question that looks copied or mislabelled, or has a broken shape, and says so", () => {
    const set = goodSet();
    set[2] = mcq(2, "EASY", { body: "From Exercise 5.2: which number is prime?" });
    set[5] = mcq(5, "MEDIUM", { solution: "This board question is easy. 13 is prime so B." });
    set[9] = { ...mcq(9, "HARD"), answerKey: "E" };
    const r = parseSchoolMcqSet(JSON.stringify(set), { strictMix: true });
    expect(r.ok).toBe(false);
    expect(r.candidates).toHaveLength(7);
    expect(r.dropped.map((d) => d.index)).toEqual([2, 5, 9]);
    expect(r.dropped[0].reason).toMatch(/exercise reference/);
    expect(r.dropped[1].reason).toMatch(/labels the question/);
    expect(r.dropped[2].reason).toBe("shape");
    expect(parseSchoolMcqSet(JSON.stringify(set), { strictMix: false }).ok).toBe(true);
  });

  it("reports a reply that is not JSON or not an array", () => {
    expect(parseSchoolMcqSet("I cannot write these.", { strictMix: true })).toMatchObject({ ok: false, candidates: [] });
    expect(parseSchoolMcqSet('{"body":"x"}', { strictMix: true }).reasons).toEqual(["not a JSON array"]);
    expect(parseSchoolMcqSet('[{"body":"cut off', { strictMix: true }).ok).toBe(false);
  });

  it("difficultyMix, normaliseStem and dedupeCandidates", () => {
    expect(difficultyMix(goodSet())).toEqual({ EASY: 4, MEDIUM: 4, HARD: 2 });
    expect(normaliseStem("What is 12 × 12?")).toBe(normaliseStem("what is 12 x 12"));
    const a = mcq(1, "EASY", { body: "Which number is prime: 9 or 13?" });
    const b = mcq(2, "EASY", { body: "Which number is prime, 9 or 13" });
    const c = mcq(3, "EASY", { body: "Which number is composite: 9 or 13?" });
    const r = dedupeCandidates([a, b, c], ["which number is COMPOSITE: 9 or 13?"]);
    expect(r.kept).toEqual([a]);
    expect(r.dropped.map((d) => d.reason)).toEqual(["duplicate stem", "duplicate stem"]);
  });
});

// ---------------------------------------------------------------------------
// persistence plan
// ---------------------------------------------------------------------------

describe("persistence plan", () => {
  const now = new Date("2026-09-26T10:00:00Z");

  it("plans the TopicTeachingNote upsert with the school-batch tag and a provenance comment", () => {
    const content = parseSchoolNotes(goodNotes(ch6), ch6).content;
    const plan = planNoteWrite(ch6, content, { model: "claude-sonnet-4-5-20250929", runId: "20260926-100000-school-NCERT_C06", now });
    expect(plan.where).toEqual({ topicId: TOPIC_ID });
    expect(plan.create.generatedBy).toBe("school-batch:claude-sonnet-4-5-20250929");
    expect(notesGeneratedBy("m")).toBe("school-batch:m");
    expect(plan.update.validatedAt).toBeNull();
    expect(plan.update.validatorId).toBeNull();
    expect(plan.create.content.startsWith(content)).toBe(true);
    const back = readProvenanceComment(plan.create.content);
    expect(back).toMatchObject({ pipeline: "school-batch-v1", promptVersion: "school-notes-v2", class: 6, book: "fegp1", bookTitle: "Ganita Prakash", chapter: "5", topicCode: "fegp1.ch05", officialUrl: ch6.officialUrl, runId: "20260926-100000-school-NCERT_C06" });
    expect(back?.groundedIn).toEqual(["ncert-chapter-identity:NCERT_C06:fegp1.ch05"]);
    expect(readProvenanceComment("## Overview\nplain govt-exam note")).toBeNull();
    // a later --phase generate grounds in the stored notes minus the comment
    expect(stripProvenanceComment(plan.create.content)).toBe(content.trimEnd());
    expect(stripProvenanceComment("## Overview\nplain govt-exam note")).toBe("## Overview\nplain govt-exam note");
  });

  it("plans Question rows that are unvalidated, AI_GENERATED, tagged and honestly labelled", () => {
    const rows = planQuestionRows(ch10, "exam-id", [mcq(1, "HARD", { tags: ["ohms-law", "Not Kebab", "ohms-law", "series-circuit", "resistance", "extra"] })], { model: "claude-sonnet-4-5-20250929", runId: "run1", setIndex: 2, now });
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r).toMatchObject({ examId: "exam-id", topicId: TOPIC_ID, type: "MCQ", difficulty: "HARD", language: "EN", source: "AI_GENERATED", validated: false, validatedBy: null, validatedAt: null, answerKey: "B", pyqYear: null });
    expect(r.tags).toEqual(["jesc1.ch12", "school", "gen:2026-09-26", "ohms-law", "series-circuit", "resistance"]);
    expect(genTag(now)).toBe("gen:2026-09-26");
    expect(r.metadata.provenance).toMatchObject({
      pipeline: "school-batch-v1",
      generatedBy: "claude-sonnet-4-5-20250929",
      promptVersion: "school-mcq-v2",
      groundedSources: ["ncert-chapter-identity:NCERT_C10:jesc1.ch12", "topic.teachingNote:jesc1.ch12"],
      producedAt: now.toISOString(),
      school: { class: 10, examCode: "NCERT_C10", subject: "Science", book: "jesc1", bookTitle: "Science", chapter: "12", chapterTitle: "Electricity", topicCode: "jesc1.ch12", officialUrl: ch10.officialUrl, setIndex: 2, runId: "run1" },
    });
    expect(r.metadata.provenance.label).toMatch(/written by AI/);
    expect(r.metadata.provenance.label).toMatch(/not an NCERT exercise or a board question/);
    expect(questionTags(ch6, { tags: [] }, now)).toEqual(["fegp1.ch05", "school", "gen:2026-09-26"]);
  });

  it("pruneBuiltRequests: a resume never resubmits what this run produced, and a dry-run journal drops what the chapter no longer needs", () => {
    const t1 = "t1";
    const t2 = "t2";
    const r = (phase: string, topic: string, runIndex?: number, status = "built") => ({ customId: makeCustomId(phase, topic, runIndex), phase, questionId: topic, runIndex, status });
    const requests = Object.fromEntries(
      [r("notes", t1), r("notes", t2), r("gen", t1, 0), r("gen", t1, 1), r("gen", t1, 2), r("gen", t2, 0), r("gen", t2, 1, "submitted")].map((x) => [x.customId, x]),
    );
    const outputs = { notes: { [t1]: { content: "x" } }, notesWritten: {}, gen: { [t1]: { "0": { candidates: [] } } }, written: { [t1]: { "1": { ids: [] } } } };
    // mid-run (batches were submitted): only what this run already produced goes, whatever the DB counts say now
    const mid = pruneBuiltRequests({ requests, outputs, neverSubmitted: false }, { notes: new Set(), sets: new Map() }, { notes: "notes", gen: "gen" });
    expect(mid.sort()).toEqual([makeCustomId("notes", t1), makeCustomId("gen", t1, 0), makeCustomId("gen", t1, 1)].sort());
    // a dry-run journal resumed later: drop what the chapter no longer needs, keep what it still does
    const dry = pruneBuiltRequests({ requests, outputs, neverSubmitted: true }, { notes: new Set([t2]), sets: new Map([[t1, [2]], [t2, [0]]]) }, { notes: "notes", gen: "gen" });
    expect(dry.sort()).toEqual([makeCustomId("notes", t1), makeCustomId("gen", t1, 0), makeCustomId("gen", t1, 1)].sort());
    const stale = pruneBuiltRequests({ requests, outputs, neverSubmitted: true }, { notes: new Set(), sets: new Map() }, { notes: "notes", gen: "gen" });
    // everything built goes (t2's submitted set 1 is not "built" and stays)
    expect(stale).toHaveLength(6);
    expect(stale).not.toContain(makeCustomId("gen", t2, 1));
  });

  it("setsNeeded reaches the 40-question target in sets of ten and --force asks for all four", () => {
    expect(setsNeeded(0)).toEqual([0, 1, 2, 3]);
    expect(setsNeeded(40)).toEqual([]);
    expect(setsNeeded(57)).toEqual([]);
    expect(setsNeeded(35)).toEqual([0]);
    expect(setsNeeded(12)).toEqual([0, 1, 2]);
    expect(setsNeeded(40, { force: true })).toEqual([0, 1, 2, 3]);
    expect(setsNeeded(0, { target: 20 })).toEqual([0, 1]);
  });
});

// ---------------------------------------------------------------------------
// journal / phase state machine with a stubbed Batches API
// ---------------------------------------------------------------------------

type Outputs = { notes: Record<string, string> };

function batch(over: Partial<MessageBatch>): MessageBatch {
  return {
    id: "msgbatch_test",
    type: "message_batch",
    processing_status: "ended",
    request_counts: { processing: 0, succeeded: 1, errored: 0, expired: 0, canceled: 0 },
    created_at: "2026-09-26T10:00:00Z",
    ended_at: "2026-09-26T10:30:00Z",
    expires_at: "2026-09-27T10:00:00Z",
    archived_at: null,
    cancel_initiated_at: null,
    results_url: null,
    ...over,
  };
}

type Result = Anthropic.Messages.MessageBatchIndividualResponse;
const ok = (custom_id: string, text: string): Result => ({ custom_id, result: { type: "succeeded", message: message(text) } });
const errored = (custom_id: string, type: string): Result => ({ custom_id, result: { type: "errored", error: { type: "error", error: { type, message: "x" } } as never } });
const expired = (custom_id: string): Result => ({ custom_id, result: { type: "expired" } });

/** A fake API whose create() numbers batches and whose results come from a script keyed by batch id. */
function scriptedApi(script: (batchIndex: number, requests: string[]) => Result[]): BatchesApi & { creates: string[][]; listed: number } {
  const creates: string[][] = [];
  const results = new Map<string, Result[]>();
  const api = {
    creates,
    listed: 0,
    create: async (body: Anthropic.Messages.BatchCreateParams) => {
      const ids = body.requests.map((r) => r.custom_id);
      creates.push(ids);
      const id = `msgbatch_${creates.length}`;
      results.set(id, script(creates.length - 1, ids));
      return batch({ id, processing_status: "in_progress", request_counts: { processing: ids.length, succeeded: 0, errored: 0, expired: 0, canceled: 0 } });
    },
    retrieve: async (id: string) => batch({ id }),
    results: async (id: string) =>
      (async function* () {
        for (const r of results.get(id) ?? []) yield r;
      })(),
    list: async () => {
      api.listed += 1;
      return { data: [] as MessageBatch[] };
    },
  };
  return api;
}

function tempJournal(name: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "school-content-journal-"));
  const file = path.join(dir, `${name}.json`);
  const journal = newJournal<Outputs>(name, { exams: ["NCERT_C06"] }, { notes: {} });
  return { dir, file, journal };
}

function req(journal: ReturnType<typeof newJournal<Outputs>>, phase: string, topicId: string, runIndex?: number, over: Partial<JournalRequest> = {}): JournalRequest {
  const customId = makeCustomId(phase, topicId, runIndex);
  journal.questions[topicId] = { code: "NCERT_C06" };
  journal.requests[customId] = { customId, phase, questionId: topicId, code: "NCERT_C06", runIndex, attempt: 1, status: "built", ...over };
  return journal.requests[customId];
}

const build = (r: JournalRequest) => buildSchoolNotesRequest({ ...ch6, topicId: r.questionId }, { model: "claude-sonnet-4-5-20250929" });

// The spend guard (26 Sep 2026) is required on every call; tests that are not
// about it get one that never stops: a ceiling far above any test's spend, one
// chunk, and a probe that always passes.
const PROBE_OK: ProbeResult = { ok: true, kind: "ok", status: 200, detail: "stub" };
const PROBE_BILLING: ProbeResult = { ok: false, kind: "billing", status: 400, detail: "invalid_request_error: Your credit balance is too low to access the Anthropic API" };
const openGuard = (over: Partial<SpendGuard> = {}): SpendGuard => ({ maxUsd: 1_000_000, chunkSize: BATCH_CHUNK_MAX, probe: async () => PROBE_OK, ...over });

describe("runJournalPhase (stubbed Batches API)", () => {
  it("submits built requests, collects, ledgers once, retries the retryable and the unusable once, then marks the rest failed", async () => {
    const { dir, file, journal } = tempJournal("run-a");
    try {
      const t1 = "cmga00000000000000000001";
      const t2 = "cmga00000000000000000002";
      const t3 = "cmga00000000000000000003";
      const t4 = "cmga00000000000000000004";
      req(journal, "notes", t1);
      req(journal, "notes", t2);
      req(journal, "notes", t3);
      req(journal, "notes", t4);
      const api = scriptedApi((i, ids) =>
        i === 0
          ? [ok(ids[0], "GOOD"), ok(ids[1], "BAD"), errored(ids[2], "overloaded_error") /* ids[3] never reported → expired */]
          : [ok(ids[0], "GOOD"), errored(ids[1], "invalid_request_error"), ok(ids[2], "GOOD")],
      );
      const ledgered: string[] = [];
      const seen: string[] = [];
      const out = await runJournalPhase(
        journal,
        file,
        "notes",
        "school-notes",
        build,
        (r, m) => {
          const text = (m.content[0] as Anthropic.Messages.TextBlock).text;
          seen.push(`${r.customId}:${r.attempt}:${text}`);
          if (text !== "GOOD") return false;
          journal.outputs.notes[r.questionId] = text;
          return true;
        },
        true,
        {
          api,
          pollIntervalMs: 1,
          log: () => {},
          warn: () => {},
          ledger: async (feature, r) => {
            ledgered.push(`${feature}:${r.customId}:${r.attempt}`);
            return 0.01;
          },
          guard: openGuard(),
        },
      );
      // first batch: all four; second batch: the unusable, the overloaded and the unreported one
      expect(api.creates).toHaveLength(2);
      expect(api.creates[0]).toEqual([t1, t2, t3, t4].map((t) => makeCustomId("notes", t)));
      expect(api.creates[1]).toEqual([t2, t3, t4].map((t) => makeCustomId("notes", t)));
      const s = (t: string) => journal.requests[makeCustomId("notes", t)];
      expect(s(t1)).toMatchObject({ status: "succeeded", attempt: 1, batchId: "msgbatch_1", ledgered: true });
      expect(s(t2)).toMatchObject({ status: "succeeded", attempt: 2, batchId: "msgbatch_2", ledgered: true });
      expect(s(t3)).toMatchObject({ status: "failed", attempt: 2, error: "invalid_request_error: x" });
      expect(s(t4)).toMatchObject({ status: "succeeded", attempt: 2 });
      expect(journal.outputs.notes).toEqual({ [t1]: "GOOD", [t2]: "GOOD", [t4]: "GOOD" });
      // every succeeded reply was ledgered exactly once, at the feature label
      expect(ledgered.sort()).toEqual([`school-notes:${makeCustomId("notes", t1)}:1`, `school-notes:${makeCustomId("notes", t2)}:1`, `school-notes:${makeCustomId("notes", t2)}:2`, `school-notes:${makeCustomId("notes", t4)}:2`].sort());
      expect(out.costUsd).toBeCloseTo(0.04, 6);
      expect(out.failed.map((r) => r.questionId)).toEqual([t3]);
      expect(out.stuck).toEqual([]);
      expect(journal.batches.map((b) => [b.id, b.attempt, b.count, b.status, b.collected])).toEqual([
        ["msgbatch_1", 1, 4, "ended", true],
        ["msgbatch_2", 2, 3, "ended", true],
      ]);
      expect(journal.pendingSubmit).toBeUndefined();
      // the journal on disk is the same state (write-then-rename, no .tmp left)
      const back = loadJournal<Outputs>(file);
      expect(back.phase).toBe("notes-collected");
      expect(back.requests).toEqual(journal.requests);
      expect(fs.existsSync(`${file}.tmp`)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the retry of a rejected reply is built with the checker's reasons in its prompt; an API-error retry is not (the runner's feedback path)", async () => {
    const { dir, file, journal } = tempJournal("run-f");
    try {
      const t1 = "cmgf00000000000000000001";
      const t2 = "cmgf00000000000000000002";
      req(journal, "notes", t1);
      req(journal, "notes", t2);
      const bodies: Array<Array<{ id: string; user: string }>> = [];
      const inner = scriptedApi((i, ids) => (i === 0 ? [ok(ids[0], "COPIED"), errored(ids[1], "overloaded_error")] : ids.map((id) => ok(id, "GOOD"))));
      const api: BatchesApi = {
        ...inner,
        create: async (body) => {
          bodies.push(body.requests.map((r) => ({ id: r.custom_id, user: String((r.params.messages[0] as { content: string }).content) })));
          return inner.create(body);
        },
      };
      // exactly what scripts/school-content-batch.ts does: reasons → outputs.feedback on rejection, into the prompt on attempt 2, error cleared on success
      const outputs = journal.outputs as Outputs & { feedback?: Record<string, string> };
      const build = (r: JournalRequest) => buildSchoolNotesRequest({ ...ch6, topicId: r.questionId }, { model: "claude-sonnet-4-5-20250929", retryFeedback: r.attempt > 1 ? outputs.feedback?.[r.customId] : undefined });
      const out = await runJournalPhase(
        journal,
        file,
        "notes",
        "school-notes",
        build,
        (r, m) => {
          const text = (m.content[0] as Anthropic.Messages.TextBlock).text;
          if (text !== "GOOD") {
            r.error = "copy suspect — figure reference (Fig. 3.2)";
            (outputs.feedback ??= {})[r.customId] = r.error;
            return false;
          }
          delete r.error;
          journal.outputs.notes[r.questionId] = text;
          return true;
        },
        true,
        { api, pollIntervalMs: 1, log: () => {}, warn: () => {}, ledger: async () => 0, guard: openGuard() },
      );
      expect(bodies).toHaveLength(2);
      expect(bodies[0].map((b) => b.user.includes("rejected by our checker"))).toEqual([false, false]);
      const second = Object.fromEntries(bodies[1].map((b) => [b.id, b.user]));
      expect(second[makeCustomId("notes", t1)]).toContain("Reasons: copy suspect — figure reference (Fig. 3.2)");
      expect(second[makeCustomId("notes", t2)]).not.toContain("rejected by our checker");
      const s = (t: string) => journal.requests[makeCustomId("notes", t)];
      expect(s(t1)).toMatchObject({ status: "succeeded", attempt: 2 });
      expect(s(t1).error).toBeUndefined();
      expect(s(t2)).toMatchObject({ status: "succeeded", attempt: 2 });
      expect(out.stuck).toEqual([]);
      expect(loadJournal<Outputs & { feedback?: Record<string, string> }>(file).outputs.feedback).toEqual({ [makeCustomId("notes", t1)]: "copy suspect — figure reference (Fig. 3.2)" });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is re-entrant: a second call with everything collected submits nothing", async () => {
    const { dir, file, journal } = tempJournal("run-b");
    try {
      const t1 = "cmgb00000000000000000001";
      req(journal, "notes", t1);
      const api = scriptedApi((_, ids) => [ok(ids[0], "GOOD")]);
      const deps = { api, pollIntervalMs: 1, log: () => {}, warn: () => {}, ledger: async () => 0.5, guard: openGuard() };
      const on = (r: JournalRequest) => {
        journal.outputs.notes[r.questionId] = "GOOD";
        return true;
      };
      const first = await runJournalPhase(journal, file, "notes", "school-notes", build, on, true, deps);
      const second = await runJournalPhase(journal, file, "notes", "school-notes", build, on, true, deps);
      expect(api.creates).toHaveLength(1);
      expect(first.costUsd).toBe(0.5);
      expect(second.costUsd).toBe(0);
      expect(journal.requests[makeCustomId("notes", t1)].status).toBe("succeeded");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("adopts a batch the API accepted while the submit was cut off, instead of submitting again", async () => {
    const { dir, file, journal } = tempJournal("run-c");
    try {
      const t1 = "cmgc00000000000000000001";
      const t2 = "cmgc00000000000000000002";
      req(journal, "gen", t1, 0);
      req(journal, "gen", t2, 0);
      journal.pendingSubmit = { phase: "gen", attempt: 1, count: 2, at: "2026-09-26T10:00:00Z", customIds: [makeCustomId("gen", t1, 0), makeCustomId("gen", t2, 0)] };
      const results = new Map<string, Result[]>([["msgbatch_adopted", [ok(makeCustomId("gen", t1, 0), "GOOD"), ok(makeCustomId("gen", t2, 0), "GOOD")]]]);
      const api: BatchesApi & { creates: number } = {
        creates: 0,
        create: async () => {
          api.creates += 1;
          throw new Error("must not submit again");
        },
        retrieve: async (id) => batch({ id, request_counts: { processing: 0, succeeded: 2, errored: 0, expired: 0, canceled: 0 } }),
        results: async (id) =>
          (async function* () {
            for (const r of results.get(id) ?? []) yield r;
          })(),
        list: async () => ({ data: [batch({ id: "msgbatch_adopted", created_at: "2026-09-26T10:00:05Z", request_counts: { processing: 0, succeeded: 2, errored: 0, expired: 0, canceled: 0 } })] }),
      };
      const out = await runJournalPhase(journal, file, "gen", "school-gen", build, () => true, true, { api, pollIntervalMs: 1, log: () => {}, warn: () => {}, ledger: async () => 0, guard: openGuard() });
      expect(api.creates).toBe(0);
      expect(journal.batches).toHaveLength(1);
      expect(journal.batches[0]).toMatchObject({ id: "msgbatch_adopted", phase: "gen", collected: true, status: "ended" });
      expect(journal.pendingSubmit).toBeUndefined();
      expect(Object.values(journal.requests).map((r) => r.status)).toEqual(["succeeded", "succeeded"]);
      expect(out.failed).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ledgers a stale request's reply but never parses it, and leaves other phases alone", async () => {
    const { dir, file, journal } = tempJournal("run-d");
    try {
      const t1 = "cmgd00000000000000000001";
      const gone = "cmgd00000000000000000009";
      const other = "cmgd00000000000000000005";
      req(journal, "notes", t1);
      req(journal, "notes", gone, undefined, { status: "stale", batchId: "msgbatch_1" });
      req(journal, "gen", other, 0);
      const api = scriptedApi((_, ids) => [ok(ids[0], "GOOD"), ok(makeCustomId("notes", gone), "STALE"), expired("unknown_custom_id")]);
      // the stale request sits in the batch the fake creates first
      journal.batches.push({ id: "msgbatch_1", phase: "notes", attempt: 1, count: 2, submittedAt: "2026-09-26T09:00:00Z", status: "in_progress", collected: false });
      journal.requests[makeCustomId("notes", t1)].status = "submitted";
      journal.requests[makeCustomId("notes", t1)].batchId = "msgbatch_1";
      const parsed: string[] = [];
      const ledgered: string[] = [];
      const api2: BatchesApi = {
        ...api,
        create: async () => {
          throw new Error("nothing to submit");
        },
        results: async () =>
          (async function* () {
            yield ok(makeCustomId("notes", t1), "GOOD");
            yield ok(makeCustomId("notes", gone), "STALE");
            yield expired("unknown_custom_id");
          })(),
      };
      const out = await runJournalPhase(journal, file, "notes", "school-notes", build, (r) => (parsed.push(r.customId), true), true, {
        api: api2,
        pollIntervalMs: 1,
        log: () => {},
        warn: () => {},
        ledger: async (_f, r) => (ledgered.push(r.customId), 0.02),
        guard: openGuard(),
      });
      expect(parsed).toEqual([makeCustomId("notes", t1)]);
      expect(ledgered.sort()).toEqual([makeCustomId("notes", gone), makeCustomId("notes", t1)].sort());
      expect(journal.requests[makeCustomId("notes", gone)]).toMatchObject({ status: "stale", ledgered: true });
      expect(journal.requests[makeCustomId("gen", other, 0)].status).toBe("built");
      expect(out.costUsd).toBeCloseTo(0.04, 6);
      expect(out.failed).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // -------------------------------------------------------------------------
  // spend guard (26 Sep 2026): chunks, the ceiling, the post-chunk probe
  // -------------------------------------------------------------------------

  it("submits --chunk requests per batch, one batch at a time: each is collected and the production key probed before the next goes out", async () => {
    const { dir, file, journal } = tempJournal("run-g");
    try {
      const ids = Array.from({ length: 10 }, (_, i) => `cmgg000000000000000000${String(i).padStart(2, "0")}`);
      for (const t of ids) req(journal, "notes", t);
      const events: string[] = [];
      const inner = scriptedApi((_, batchIds) => batchIds.map((id) => ok(id, "GOOD")));
      const api: BatchesApi = {
        ...inner,
        create: async (body) => {
          events.push(`create:${body.requests.length}`);
          return inner.create(body);
        },
        results: async (id) => {
          events.push(`results:${id}`);
          return inner.results(id);
        },
      };
      const out = await runJournalPhase(
        journal,
        file,
        "notes",
        "school-notes",
        build,
        (r) => {
          journal.outputs.notes[r.questionId] = "GOOD";
          return true;
        },
        true,
        {
          api,
          pollIntervalMs: 1,
          log: () => {},
          warn: () => {},
          ledger: async () => 0.01,
          guard: openGuard({
            chunkSize: 4,
            probe: async () => {
              events.push("probe");
              return PROBE_OK;
            },
          }),
        },
      );
      expect(inner.creates.map((c) => c.length)).toEqual([4, 4, 2]);
      expect(inner.creates.flat()).toEqual(ids.map((t) => makeCustomId("notes", t)));
      // strictly sequential: submit → collect → probe, then the next chunk
      expect(events).toEqual(["create:4", "results:msgbatch_1", "probe", "create:4", "results:msgbatch_2", "probe", "create:2", "results:msgbatch_3", "probe"]);
      expect(journal.batches.map((b) => [b.count, b.status, b.collected])).toEqual([
        [4, "ended", true],
        [4, "ended", true],
        [2, "ended", true],
      ]);
      expect(Object.values(journal.requests).every((r) => r.status === "succeeded" && r.ledgered)).toBe(true);
      expect(out.costUsd).toBeCloseTo(0.1, 6);
      expect(journal.spentUsd).toBeCloseTo(0.1, 6);
      expect(out.stop).toBeUndefined();
      expect(out.failed).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stops submitting after a failed post-chunk probe — what is left stays built, never failed — and a resume with a passing probe finishes the phase", async () => {
    const { dir, file, journal } = tempJournal("run-h");
    try {
      const ids = Array.from({ length: 6 }, (_, i) => `cmgh000000000000000000${String(i).padStart(2, "0")}`);
      for (const t of ids) req(journal, "notes", t);
      const api = scriptedApi((_, batchIds) => batchIds.map((id) => ok(id, "GOOD")));
      let probes = 0;
      const flaky = async () => (++probes === 2 ? PROBE_BILLING : PROBE_OK);
      const warned: string[] = [];
      const deps = { api, pollIntervalMs: 1, log: () => {}, warn: (l: string) => warned.push(l), ledger: async () => 0.25, guard: openGuard({ chunkSize: 2, probe: flaky }) };
      const first = await runJournalPhase(
        journal,
        file,
        "notes",
        "school-notes",
        build,
        (r) => {
          journal.outputs.notes[r.questionId] = "GOOD";
          return true;
        },
        true,
        deps,
      );
      // two chunks went out; the probe after the second failed; the third was never submitted
      expect(api.creates.map((c) => c.length)).toEqual([2, 2]);
      expect(first.stop).toMatchObject({ reason: "probe", phase: "notes", remaining: 2, spentUsd: 1, probe: PROBE_BILLING });
      expect(first.stop?.message).toMatch(/no further chunk is submitted/);
      expect(first.stop?.message).toMatch(/balance is empty; add credit first/);
      expect(first.costUsd).toBeCloseTo(1, 6);
      expect(first.failed).toEqual([]);
      expect(ids.map((t) => journal.requests[makeCustomId("notes", t)].status)).toEqual(["succeeded", "succeeded", "succeeded", "succeeded", "built", "built"]);
      expect(warned.join(" ")).toMatch(/production key probe after msgbatch_2 failed/);
      const onDisk = loadJournal<Outputs>(file);
      expect(onDisk.spentUsd).toBeCloseTo(1, 6);
      expect(onDisk.pendingSubmit).toBeUndefined();
      expect(onDisk.args.lastStop).toMatchObject({ phase: "notes", reason: "probe" });
      expect(Object.values(onDisk.requests).filter((r) => r.status === "built")).toHaveLength(2);
      // resume from disk: nothing open to settle, the remaining chunk goes out, the probe passes
      const resumed = loadJournal<Outputs>(file);
      const second = await runJournalPhase(
        resumed,
        file,
        "notes",
        "school-notes",
        build,
        (r) => {
          resumed.outputs.notes[r.questionId] = "GOOD";
          return true;
        },
        true,
        deps,
      );
      expect(api.creates).toHaveLength(3);
      expect(api.creates[2]).toEqual([ids[4], ids[5]].map((t) => makeCustomId("notes", t)));
      expect(second.stop).toBeUndefined();
      expect(second.costUsd).toBeCloseTo(0.5, 6);
      expect(resumed.spentUsd).toBeCloseTo(1.5, 6);
      expect(Object.values(resumed.requests).every((r) => r.status === "succeeded")).toBe(true);
      expect(Object.keys(resumed.outputs.notes).sort()).toEqual([...ids].sort());
      expect(probes).toBe(3);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  // 26 Sep 2026 review: the probe used to follow only a chunk THIS call had
  // submitted. A batch a killed invocation left polling (or one adopted from a
  // cut-off submit) was collected by the resume's first settle and the next
  // chunk went out on the runner's pre-flight probe alone — an hour or more
  // old after a 2,000-request poll. Every collected chunk is probed now.
  it("probes the production key after a chunk a resume found open, before the next chunk goes out; a failure there leaves the built requests built, and a resume with a passing probe finishes", async () => {
    const { dir, file, journal } = tempJournal("run-j");
    try {
      const [t1, t2, t3, t4] = Array.from({ length: 4 }, (_, i) => `cmgj000000000000000000${String(i).padStart(2, "0")}`);
      req(journal, "notes", t1, undefined, { status: "submitted", batchId: "msgbatch_open" });
      req(journal, "notes", t2, undefined, { status: "submitted", batchId: "msgbatch_open" });
      req(journal, "notes", t3);
      req(journal, "notes", t4);
      journal.batches.push({ id: "msgbatch_open", phase: "notes", attempt: 1, count: 2, submittedAt: "2026-09-26T09:00:00Z", status: "in_progress", collected: false });
      journal.phase = "notes-submitted";
      saveJournal(file, journal);
      const events: string[] = [];
      const inner = scriptedApi((_, batchIds) => batchIds.map((id) => ok(id, "GOOD")));
      const api: BatchesApi = {
        ...inner,
        create: async (body) => {
          events.push(`create:${body.requests.length}`);
          return inner.create(body);
        },
        results: async (id) => {
          events.push(`results:${id}`);
          if (id !== "msgbatch_open") return inner.results(id);
          return (async function* () {
            yield ok(makeCustomId("notes", t1), "GOOD");
            yield ok(makeCustomId("notes", t2), "GOOD");
          })();
        },
      };
      let balanceEmpty = true;
      const warned: string[] = [];
      const deps = {
        api,
        pollIntervalMs: 1,
        log: () => {},
        warn: (l: string) => warned.push(l),
        ledger: async () => 0.25,
        guard: openGuard({
          chunkSize: 2,
          probe: async () => {
            events.push("probe");
            return balanceEmpty ? PROBE_BILLING : PROBE_OK;
          },
        }),
      };
      const on = (j: typeof journal) => (r: JournalRequest) => {
        j.outputs.notes[r.questionId] = "GOOD";
        return true;
      };
      // the resume: the open batch is collected, the probe runs BEFORE the next chunk — and fails, so t3/t4 never go out
      const first = await runJournalPhase(journal, file, "notes", "school-notes", build, on(journal), true, deps);
      expect(events).toEqual(["results:msgbatch_open", "probe"]);
      expect(inner.creates).toEqual([]);
      expect(first.stop).toMatchObject({ reason: "probe", phase: "notes", remaining: 2, probe: PROBE_BILLING });
      expect(first.stop?.spentUsd).toBeCloseTo(0.5, 6);
      expect(first.stop?.message).toMatch(/production key probe after msgbatch_open failed/);
      expect(first.stop?.message).toMatch(/balance is empty; add credit first/);
      expect(first.costUsd).toBeCloseTo(0.5, 6);
      expect(first.failed).toEqual([]);
      expect([t1, t2, t3, t4].map((t) => journal.requests[makeCustomId("notes", t)].status)).toEqual(["succeeded", "succeeded", "built", "built"]);
      expect(journal.batches[0]).toMatchObject({ id: "msgbatch_open", status: "ended", collected: true });
      expect(warned.join(" ")).toMatch(/probe after msgbatch_open failed/);
      const onDisk = loadJournal<Outputs>(file);
      expect(onDisk.args.lastStop).toMatchObject({ phase: "notes", reason: "probe" });
      expect(Object.values(onDisk.requests).filter((r) => r.status === "built")).toHaveLength(2);
      expect(onDisk.spentUsd).toBeCloseTo(0.5, 6);
      // credit added, a later resume: nothing open to collect (so no probe before the submit), the last chunk goes out, its own probe passes
      balanceEmpty = false;
      const resumed = loadJournal<Outputs>(file);
      const second = await runJournalPhase(resumed, file, "notes", "school-notes", build, on(resumed), true, deps);
      expect(events.slice(2)).toEqual(["create:2", "results:msgbatch_1", "probe"]);
      expect(inner.creates).toEqual([[t3, t4].map((t) => makeCustomId("notes", t))]);
      expect(second.stop).toBeUndefined();
      expect(second.costUsd).toBeCloseTo(0.5, 6);
      expect(resumed.spentUsd).toBeCloseTo(1, 6);
      expect(Object.values(resumed.requests).every((r) => r.status === "succeeded" && r.ledgered)).toBe(true);
      expect(Object.keys(resumed.outputs.notes).sort()).toEqual([t1, t2, t3, t4].sort());
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("an adopted batch (cut-off submit) is a collected chunk too: a failed probe after it stops the phase even with nothing left to submit, so the runner does not go on to the next phase", async () => {
    const { dir, file, journal } = tempJournal("run-k");
    try {
      const t1 = "cmgk00000000000000000001";
      const t2 = "cmgk00000000000000000002";
      req(journal, "gen", t1, 0);
      req(journal, "gen", t2, 0);
      journal.pendingSubmit = { phase: "gen", attempt: 1, count: 2, at: "2026-09-26T10:00:00Z", customIds: [makeCustomId("gen", t1, 0), makeCustomId("gen", t2, 0)] };
      const api: BatchesApi & { creates: number } = {
        creates: 0,
        create: async () => {
          api.creates += 1;
          throw new Error("must not submit again");
        },
        retrieve: async (id) => batch({ id, request_counts: { processing: 0, succeeded: 2, errored: 0, expired: 0, canceled: 0 } }),
        results: async () =>
          (async function* () {
            yield ok(makeCustomId("gen", t1, 0), "GOOD");
            yield ok(makeCustomId("gen", t2, 0), "GOOD");
          })(),
        list: async () => ({ data: [batch({ id: "msgbatch_adopted", created_at: "2026-09-26T10:00:05Z", request_counts: { processing: 0, succeeded: 2, errored: 0, expired: 0, canceled: 0 } })] }),
      };
      const probes: string[] = [];
      let probeResult = PROBE_BILLING;
      const deps = { api, pollIntervalMs: 1, log: () => {}, warn: () => {}, ledger: async () => 0.1, guard: openGuard({ probe: async () => (probes.push("probe"), probeResult) }) };
      const out = await runJournalPhase(journal, file, "gen", "school-gen", build, () => true, true, deps);
      expect(api.creates).toBe(0);
      expect(probes).toEqual(["probe"]);
      expect(out.stop).toMatchObject({ reason: "probe", phase: "gen", remaining: 0, remainingWorstUsd: 0, probe: PROBE_BILLING });
      expect(out.stop?.message).toMatch(/probe after msgbatch_adopted failed/);
      expect(out.costUsd).toBeCloseTo(0.2, 6);
      expect(journal.batches[0]).toMatchObject({ id: "msgbatch_adopted", phase: "gen", collected: true });
      expect(Object.values(journal.requests).map((r) => r.status)).toEqual(["succeeded", "succeeded"]);
      expect(journal.pendingSubmit).toBeUndefined();
      // the work is kept: a resume with a passing probe has nothing to collect, submits nothing, probes nothing, and the phase completes
      probeResult = PROBE_OK;
      const again = await runJournalPhase(loadJournal<Outputs>(file), file, "gen", "school-gen", build, () => true, true, deps);
      expect(again.stop).toBeUndefined();
      expect(again.costUsd).toBe(0);
      expect(probes).toEqual(["probe"]);
      expect(api.creates).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a chunk whose worst case would cross --max-usd: nothing submitted, no probe, the rest stays built, and the message names the ceiling to pass", async () => {
    const { dir, file, journal } = tempJournal("run-i");
    try {
      const ids = Array.from({ length: 6 }, (_, i) => `cmgi000000000000000000${String(i).padStart(2, "0")}`);
      for (const t of ids) req(journal, "notes", t);
      // W = the worst case of one chunk of two (as the estimate prices it); each reply is ledgered at W so the numbers stay exact
      const W = worstCaseUsd([{ params: build(journal.requests[makeCustomId("notes", ids[0])]) }, { params: build(journal.requests[makeCustomId("notes", ids[1])]) }]);
      expect(W).toBeGreaterThan(0);
      const api = scriptedApi((_, batchIds) => batchIds.map((id) => ok(id, "GOOD")));
      let probes = 0;
      const warned: string[] = [];
      const on = (r: JournalRequest) => {
        journal.outputs.notes[r.questionId] = "GOOD";
        return true;
      };
      const depsFor = (maxUsd: number) => ({
        api,
        pollIntervalMs: 1,
        log: () => {},
        warn: (l: string) => warned.push(l),
        ledger: async () => W,
        guard: openGuard({ chunkSize: 2, maxUsd, probe: async () => (probes += 1, PROBE_OK) }),
      });
      // chunk 1: 0 + W ≤ 2.5 W → submitted, ledgered 2 W; chunk 2: 2 W + W > 2.5 W → refused
      const first = await runJournalPhase(journal, file, "notes", "school-notes", build, on, true, depsFor(2.5 * W));
      expect(api.creates.map((c) => c.length)).toEqual([2]);
      expect(probes).toBe(1);
      expect(first.stop).toMatchObject({ reason: "ceiling", phase: "notes", remaining: 4, chunk: { count: 2 } });
      expect(first.stop?.spentUsd).toBeCloseTo(2 * W, 10);
      expect(first.stop?.chunk?.worstUsd).toBeCloseTo(W, 10);
      expect(first.stop?.remainingWorstUsd).toBeCloseTo(2 * W, 10);
      expect(first.stop?.message).toMatch(/was NOT submitted/);
      expect(first.stop?.message).toContain(`--max-usd ${Math.max(1, Math.ceil(3 * W))} or more`);
      expect(first.stop?.message).toMatch(/smaller --chunk/);
      expect(warned.join(" ")).toContain("--max-usd");
      expect(first.failed).toEqual([]);
      expect(ids.map((t) => journal.requests[makeCustomId("notes", t)].status)).toEqual(["succeeded", "succeeded", "built", "built", "built", "built"]);
      expect(loadJournal<Outputs>(file).args.lastStop).toMatchObject({ reason: "ceiling" });
      // a ceiling that fits lets the same journal go on: 2 W + W ≤ 10 W, then 4 W + W ≤ 10 W
      const second = await runJournalPhase(journal, file, "notes", "school-notes", build, on, true, depsFor(10 * W));
      expect(api.creates.map((c) => c.length)).toEqual([2, 2, 2]);
      expect(second.stop).toBeUndefined();
      expect(journal.spentUsd).toBeCloseTo(6 * W, 10);
      expect(Object.values(journal.requests).every((r) => r.status === "succeeded")).toBe(true);
      expect(probes).toBe(3);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("openJournalsCovering finds unfinished journals that overlap, ignores done ones and skips junk", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "school-content-open-"));
    try {
      const a = newJournal<Outputs>("a", {}, { notes: {} });
      a.questions["t1"] = { code: "NCERT_C06" };
      a.batches.push({ id: "b", phase: "notes", attempt: 1, count: 1, submittedAt: "x", status: "in_progress", collected: false });
      a.phase = "notes-submitted";
      saveJournal(path.join(dir, "a.json"), a);
      const b = newJournal<Outputs>("b", {}, { notes: {} });
      b.questions["t1"] = { code: "NCERT_C06" };
      b.phase = "built";
      saveJournal(path.join(dir, "b.json"), b);
      const c = newJournal<Outputs>("c", {}, { notes: {} });
      c.questions["t1"] = { code: "NCERT_C06" };
      c.phase = "done";
      c.batches.push({ id: "b", phase: "notes", attempt: 1, count: 1, submittedAt: "x", status: "ended", collected: true });
      saveJournal(path.join(dir, "c.json"), c);
      fs.writeFileSync(path.join(dir, "junk.json"), "{not json");
      const warned: string[] = [];
      // a renamed journal (the full-bank one) resumes by its FILE name, so that is what the hint carries
      const d = newJournal<Outputs>("20260925-224546-MP_RAEO+MP_MPESB+NDA", {}, { notes: {} });
      d.questions["t2"] = { code: "NDA" };
      d.batches.push({ id: "b", phase: "notes", attempt: 1, count: 1, submittedAt: "x", status: "ended", collected: true });
      d.phase = "verify-collected";
      saveJournal(path.join(dir, "full-bank-validated-20260925.json"), d);
      const open = openJournalsCovering(dir, new Set(["t1", "t2"]), (l) => warned.push(l));
      expect(open.map((o) => [o.runId, o.file, o.overlap, o.submitted])).toEqual([
        ["a", "a", 1, true],
        ["b", "b", 1, false],
        ["20260925-224546-MP_RAEO+MP_MPESB+NDA", "full-bank-validated-20260925", 1, true],
      ]);
      expect(() => journalPath(dir, open[2].runId)).toThrow(/plain file-name token/);
      expect(journalPath(dir, open[2].file)).toBe(path.join(dir, "full-bank-validated-20260925.json"));
      expect(warned.join(" ")).toMatch(/junk\.json/);
      expect(openJournalsCovering(dir, new Set(["zzz"]))).toEqual([]);
      expect(openJournalsCovering(path.join(dir, "missing"), new Set(["t1"]))).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
