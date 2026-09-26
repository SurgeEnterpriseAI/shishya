// School tutor (26 Sep 2026) — the pure rules behind the signed-in Class
// 8-12 chat: which containers a student may chat on (src/lib/school/
// tutor-scope.ts), the persona and safety rules — present, and specific to
// the class (tutor-persona.ts), the daily cap (tutor-cap.ts), the school
// branch of tutorSystemBlocks, and the ONE thing the exam tutor must keep:
// its shared 1-hour prefix byte-identical (its sha256 is pinned below —
// change the hash only with a deliberate prompt edit). Plus source guards on
// the route, the page, the island and the loaders. No DB, no model call.
// Run: npx vitest run tests/unit/school-tutor.test.ts

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { tutorSystemBlocks } from "@/lib/ai/tutor";
import { PLATFORM_PERSONA, SAFETY_RULES, SCOPE_RULES } from "@/lib/ai/prompts";
import { dict, type Locale, type StringKey } from "@/lib/i18n";
import { STUDENT_MODE_MIN_CLASS } from "@/lib/school/student-classes";
import {
  SCHOOL_CAP_CODE,
  SCHOOL_TUTOR_CAP_COPY,
  SCHOOL_TUTOR_DAILY_CAP,
  schoolCapFrames,
  schoolTutorCapReached,
  schoolTutorDayStart,
  schoolTutorMessagesLeft,
  schoolUiLang,
} from "@/lib/school/tutor-cap";
import {
  SCHOOL_NOTES_EXCERPT_CHARS,
  SCHOOL_TUTOR_STATIC_PROMPT,
  schoolClassBlock,
  schoolReadingLevel,
  schoolTurnContext,
  type SchoolChapterFocus,
  type SchoolTutorScope,
} from "@/lib/school/tutor-persona";
import {
  SCHOOL_BAND_REQUIRED_CODE,
  SCHOOL_BAND_REQUIRED_COPY,
  SCHOOL_ONLY_TUTOR_CODE,
  SCHOOL_ONLY_TUTOR_COPY,
  SCHOOL_TUTOR_MIN_CLASS,
  isSchoolTutorRequest,
  schoolBandRequiredErrorFrame,
  schoolOnlyChatPath,
  schoolOnlyTutorErrorFrame,
  schoolStudentExamKey,
} from "@/lib/school/tutor-scope";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

// ── Scope ─────────────────────────────────────────────────────────────

describe("schoolStudentExamKey — a signed-in student on Class 8-12 only", () => {
  it("shares the class rule with student-classes.ts (Class 8 is the first)", () => {
    expect(SCHOOL_TUTOR_MIN_CLASS).toBe(8);
    expect(SCHOOL_TUTOR_MIN_CLASS).toBe(STUDENT_MODE_MIN_CLASS);
  });

  it("C09 signed in → the category-pinned key; C08 and C12, CISCE too", () => {
    expect(schoolStudentExamKey({ code: "NCERT_C09", userId: "u1" })).toEqual({ category: "SCHOOL_BOARD", code: "NCERT_C09", cls: 9 });
    expect(schoolStudentExamKey({ code: "NCERT_C08", userId: "u1" })?.cls).toBe(8);
    expect(schoolStudentExamKey({ code: "NCERT_C12", userId: "u1" })?.cls).toBe(12);
    expect(schoolStudentExamKey({ code: "CISCE_C10", userId: "u1" })).toEqual({ category: "SCHOOL_BOARD", code: "CISCE_C10", cls: 10 });
  });

  it("a guest gets null for every school code (404 via realExamKey, as today)", () => {
    for (const code of ["NCERT_C09", "NCERT_C12", "CISCE_C11"]) {
      expect(schoolStudentExamKey({ code, userId: null })).toBeNull();
      expect(schoolStudentExamKey({ code, userId: undefined })).toBeNull();
      expect(isSchoolTutorRequest({ code, userId: "" })).toBe(false);
    }
  });

  it("Classes 1-7 stay 404 even signed in; a real exam or garbage is never a school key", () => {
    for (const code of ["NCERT_C01", "NCERT_C05", "NCERT_C07", "CISCE_C07"]) expect(schoolStudentExamKey({ code, userId: "u1" })).toBeNull();
    for (const code of ["SSC_CGL", "NCERT_C13", "NCERT_C9", "ncert_c09", "", null, undefined]) expect(schoolStudentExamKey({ code, userId: "u1" })).toBeNull();
    expect(isSchoolTutorRequest({ code: "NCERT_C09", userId: "u1" })).toBe(true);
  });
});

// ── Persona ───────────────────────────────────────────────────────────

const SCOPE_C09: SchoolTutorScope = {
  examCode: "NCERT_C09",
  curriculum: "NCERT",
  cls: 9,
  boardShort: "CBSE",
  boardLabel: "CBSE (NCERT textbooks)",
  classPath: "/schooling/cbse/class-9",
  subjects: [
    {
      code: "SCIENCE",
      name: "Science",
      path: "/schooling/cbse/class-9/science",
      chapters: [
        { code: "iesc1.ch01", name: "Matter in Our Surroundings" },
        { code: "iesc1.ch02", name: "Is Matter Around Us Pure?" },
      ],
    },
    { code: "MATHEMATICS", name: "Mathematics", path: "/schooling/cbse/class-9/mathematics", chapters: [{ code: "iemh1.ch01", name: "Number Systems" }] },
    { code: "HINDI", name: "Hindi", path: "/schooling/cbse/class-9/hindi", chapters: [] },
  ],
};

const FOCUS: SchoolChapterFocus = {
  code: "iesc1.ch01",
  name: "Matter in Our Surroundings",
  subjectCode: "SCIENCE",
  subjectName: "Science",
  path: "/schooling/cbse/class-9/science/matter-in-our-surroundings",
  officialUrl: "https://ncert.nic.in/textbook/pdf/iesc101.pdf",
  notes: "## Big idea\nEverything around us is made of matter.",
  pieces: [{ code: "iesc1.ch01.p1", name: "Activity 1.1" }],
};

describe("SCHOOL_TUTOR_STATIC_PROMPT — the persona and safety rules", () => {
  const p = SCHOOL_TUTOR_STATIC_PROMPT;

  it("is hint-first, step by step, and never just the answer", () => {
    expect(p).toContain("hint first, always");
    expect(p).toContain("Never hand over just the answer");
    expect(p).toContain("Then ONE worked step");
    expect(p).toContain("only after the student has made two attempts");
    expect(p).toContain("step by step");
    expect(p).toContain("End with one short check question");
    expect(p).toMatch(/homework.*guided solving, one question at a time/);
  });

  it("is scoped to the class, subject and chapter, with plain words", () => {
    expect(p).toContain("ONE class, subject and chapter at a time");
    expect(p).toContain("Use only the methods of the student's class");
    expect(p).toContain("Short sentences. One idea at a time. Everyday Indian examples.");
  });

  it("never asks for or repeats personal details", () => {
    expect(p).toContain("Never ask for, and never repeat back, the student's name, school, class section, address, phone number, email, photos, location or social-media handles");
    expect(p).toContain("personal details should not be shared online");
  });

  it("links only shishya.in and the official links it is given", () => {
    expect(p).toContain("No links except pages on https://shishya.in and the official NCERT / board links given to you in this conversation");
    expect(p).toContain("Never invent a URL");
    expect(p).not.toContain("/exams");
  });

  it("refuses romance, violence, self-harm methods and adult content", () => {
    expect(p).toContain("No romance, dating, sexual content, violence, weapons, drugs, dares, diet or body-image advice, or self-harm methods");
    expect(p).toMatch(/OUT: everything else.*romance, relationships, violence, weapons, drugs, adult content, self-harm methods/);
    expect(p).toContain("Decline in ONE kind line");
  });

  it("on distress says to talk to a parent or teacher and gives Childline 1098", () => {
    expect(p).toContain("talk to a parent, a teacher or another adult they trust");
    expect(p).toContain("Childline 1098");
    expect(p).toContain("112");
    expect(p).toContain("Do not try to counsel");
    // The exam tutor's adult helplines are not the child's.
    expect(p).not.toContain("iCall");
    expect(p).not.toContain("Vandrevala");
  });

  it("says it is an AI when asked or treated as a person", () => {
    expect(p).toContain("You are an AI.");
    expect(p).toContain("say plainly that you are an AI tutor made by Shishya, not a person");
    expect(p).toContain('never a "friend", "buddy" or a character');
  });

  it("never copies, summarises or translates textbook text — explains in its own words and points to the official chapter", () => {
    expect(p).toContain("Never copy, quote, summarise, translate or \"give the gist of\" the textbook's own text, exercises, examples or answers");
    expect(p).toContain("Explain the topic in your own words with your own examples, and point to the official chapter link");
  });

  it("labels practice honestly and promises no marks", () => {
    expect(p).toContain("Shishya's own, written by AI and answer-checked");
    expect(p).toContain("never NCERT exercises, textbook questions, board questions or previous-year questions");
    expect(p).toContain("Never promise marks or a rank");
    expect(p).toContain("streaks");
  });

  it("carries the reply-language codes and the mixed-language rule", () => {
    expect(p).toContain("Reply language");
    expect(p).toContain("HI Hindi");
    expect(p).toContain("TE Telugu");
    expect(p).toContain("Hinglish");
  });

  it("is not the exam persona: no exam framing, no exam scope rules", () => {
    expect(p).not.toContain(PLATFORM_PERSONA.slice(0, 40));
    expect(p).not.toContain("exam-prep tutor");
    expect(p).not.toContain("actual exam");
    expect(p).not.toContain("<<ACTIONS>>");
  });
});

describe("schoolClassBlock — per class, class-specific", () => {
  it("names the class and its reading level, and differs between classes", () => {
    const b8 = schoolClassBlock({ ...SCOPE_C09, cls: 8, examCode: "NCERT_C08", classPath: "/schooling/cbse/class-8" });
    const b9 = schoolClassBlock(SCOPE_C09);
    const b11 = schoolClassBlock({ ...SCOPE_C09, cls: 11, examCode: "NCERT_C11", classPath: "/schooling/cbse/class-11" });
    expect(b8).toContain("# Class 8 — CBSE (NCERT textbooks) (Shishya code NCERT_C08)");
    expect(b8).toContain("about 13 years old");
    expect(b8).toContain("no methods from a later class");
    expect(b9).toContain("Class 9, about 14 years old");
    expect(b9).toContain("Class 10 board exam");
    expect(b9).toContain("Nothing from Class 11-12");
    expect(b11).toContain("senior-secondary");
    expect(new Set([b8, b9, b11]).size).toBe(3);
    for (const cls of [8, 9, 10, 11, 12]) expect(schoolReadingLevel(cls)).toContain(`Class ${cls}`);
  });

  it("lists every subject with its Shishya page and every chapter with its code", () => {
    const b = schoolClassBlock(SCOPE_C09);
    expect(b).toContain("Class page: https://shishya.in/schooling/cbse/class-9");
    expect(b).toContain("## Science [SCIENCE] — https://shishya.in/schooling/cbse/class-9/science");
    expect(b).toContain("- Matter in Our Surroundings [`iesc1.ch01`]");
    expect(b).toContain("- Number Systems [`iemh1.ch01`]");
    expect(b).toContain("## Hindi [HINDI] — https://shishya.in/schooling/cbse/class-9/hindi");
    expect(b).toContain("no chapter list on Shishya yet");
  });

  it("sends the student to the subject page for other chapters and never to /exams", () => {
    const b = schoolClassBlock(SCOPE_C09);
    expect(b).toContain("link its SUBJECT page");
    expect(b).toContain("never guess a chapter URL");
    expect(b).toContain("never link /exams, mocks, coach, results");
    expect(b).not.toMatch(/https:\/\/shishya\.in\/exams/);
    expect(b).not.toContain("build-mock");
  });

  it("a CISCE class has no chapter list and says so", () => {
    const b = schoolClassBlock({
      examCode: "CISCE_C10",
      curriculum: "CISCE",
      cls: 10,
      boardShort: "ICSE / ISC",
      boardLabel: "CISCE (ICSE / ISC)",
      classPath: "/schooling/icse-cisce/class-10",
      subjects: [{ code: "MATHEMATICS", name: "Mathematics", path: "/schooling/icse-cisce/class-10/mathematics", chapters: [] }],
    });
    expect(b).toContain("CISCE prescribes a syllabus per subject, not one textbook");
    expect(b).toContain("official syllabus on the subject page");
    expect(b).not.toContain("chapter code in brackets");
  });
});

describe("schoolTurnContext — the chapter focus, the band, the language", () => {
  it("anchors to the chapter with its page, official link, pieces and OUR notes", () => {
    const c = schoolTurnContext({ scope: SCOPE_C09, focus: FOCUS, band: "STUDENT_13_17" }, "EN");
    expect(c).toContain('CURRENT CHAPTER — the student opened this chat from "Matter in Our Surroundings" (Science, Class 9, chapter code `iesc1.ch01`)');
    expect(c).toContain("Shishya page for this chapter: https://shishya.in/schooling/cbse/class-9/science/matter-in-our-surroundings");
    expect(c).toContain("Official chapter (the book's own text lives ONLY here — point the student to it; never reproduce it): https://ncert.nic.in/textbook/pdf/iesc101.pdf");
    expect(c).toContain("Also inside this chapter's PDF: Activity 1.1.");
    expect(c).toContain("Shishya's own notes on this chapter (our words, not the book's");
    expect(c).toContain("Everything around us is made of matter.");
    expect(c).toContain("declared they are a student aged 13 to 17");
    expect(c).toContain("Reply language: EN.");
    expect(c).not.toContain("<<ACTIONS>>");
  });

  it("without notes or an official link it says so, never inventing either", () => {
    const c = schoolTurnContext({ scope: SCOPE_C09, focus: { ...FOCUS, notes: null, officialUrl: null, pieces: [] } }, "HI");
    expect(c).toContain("Shishya has no notes on this chapter yet");
    expect(c).toContain("No official chapter link is held for this chapter");
    expect(c).not.toContain("Also inside");
    expect(c).toContain("Reply language: HI.");
  });

  it("with no chapter open it asks which one; parents and teachers are addressed as adults", () => {
    expect(schoolTurnContext({ scope: SCOPE_C09 }, "TE")).toContain("No chapter is open yet");
    expect(schoolTurnContext({ scope: SCOPE_C09, band: "PARENT" }, "EN")).toContain("declared they are a PARENT");
    expect(schoolTurnContext({ scope: SCOPE_C09, band: "TEACHER" }, "EN")).toContain("declared they are a TEACHER");
    expect(schoolTurnContext({ scope: SCOPE_C09, band: "STUDENT_18" }, "EN")).toContain("aged 18 or older");
    for (const band of ["PARENT", "TEACHER", "STUDENT_18"] as const) expect(schoolTurnContext({ scope: SCOPE_C09, band }, "EN")).toContain("Keep every safety rule");
    // 26 Sep 2026 (integrator): with no band the line is never a declaration
    // (the route refuses such a turn; this is the belt-and-braces wording).
    const undeclared = schoolTurnContext({ scope: SCOPE_C09, band: null }, "EN");
    expect(undeclared).toContain("has not declared who they are; treat them as a student aged 13 to 17");
    expect(undeclared).not.toContain("declared they are");
    expect(schoolTurnContext({ scope: SCOPE_C09, band: "STUDENT_13_17" }, "EN")).toContain("declared they are a student aged 13 to 17");
  });

  it("caps the notes excerpt the loader passes (our own text, ~500 tokens)", () => {
    expect(SCHOOL_NOTES_EXCERPT_CHARS).toBeGreaterThanOrEqual(1000);
    expect(SCHOOL_NOTES_EXCERPT_CHARS).toBeLessThanOrEqual(3000);
  });
});

// ── tutorSystemBlocks: the school branch, and the exam prefix untouched ──

const EMPTY = { examCode: "X", examName: "X", examShortName: "X", subjects: [] };

describe("tutorSystemBlocks — school branch", () => {
  it("is the school static block (1 hour) + the class block (5 minutes), and nothing of the exam layout", () => {
    const blocks = tutorSystemBlocks({ syllabus: EMPTY, toolsOn: false, school: SCOPE_C09 });
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe(SCHOOL_TUTOR_STATIC_PROMPT);
    expect((blocks[0].cache_control as { ttl?: string }).ttl).toBe("1h");
    expect(blocks[1].text).toBe(schoolClassBlock(SCOPE_C09));
    expect((blocks[1].cache_control as { ttl?: string }).ttl).toBeUndefined();
    // The exam tutor's site-features list, tool guide and syllabus block are not sent to a child.
    const all = blocks.map((b) => b.text).join("\n");
    expect(all).not.toContain("Tools available");
    expect(all).not.toContain("MOCK REQUESTS");
    expect(all).not.toContain("Does NOT exist");
    expect(all).not.toContain(SCOPE_RULES.slice(0, 30));
    expect(all).not.toContain(SAFETY_RULES.slice(0, 30));
  });

  it("is deterministic — the same bytes for the same class (the cache key)", () => {
    const a = tutorSystemBlocks({ syllabus: EMPTY, toolsOn: true, school: SCOPE_C09 });
    const b = tutorSystemBlocks({ syllabus: EMPTY, toolsOn: false, school: SCOPE_C09 });
    expect(a.map((x) => x.text)).toEqual(b.map((x) => x.text));
  });
});

describe("the exam tutor's shared 1-hour prefix is byte-identical to before school mode", () => {
  // sha256 of tutorSystemBlocks(...)[0].text on 26 Sep 2026, before the
  // school branch was added (scripts/tmp-school4-prefix-hash.ts). A change
  // here re-writes the shared cache for every exam chat — only ever on
  // purpose.
  const PINNED = {
    signedIn: "b8c0e28f4107199efe120e720b78173482bda39f5fdb9316c409f5f996ac63b6",
    guest: "aab8ee5095728691d1c92c3bddb8c4b0f32c7132afeb0c7d9fe4b3b37964e3e5",
    general: "040145a9e04e88b660aefc4fe3b6c8f351f2bd4fc7e3b87e3787588c9950b0a0",
  };

  it("signed-in (tools on), guest (tools off) and general mode", () => {
    expect(sha(tutorSystemBlocks({ syllabus: EMPTY, toolsOn: true })[0].text)).toBe(PINNED.signedIn);
    expect(sha(tutorSystemBlocks({ syllabus: EMPTY, toolsOn: false })[0].text)).toBe(PINNED.guest);
    expect(sha(tutorSystemBlocks({ syllabus: EMPTY, toolsOn: false, generalMode: true })[0].text)).toBe(PINNED.general);
  });

  it("carries nothing of the school persona, and `school: null` is the exam layout", () => {
    for (const args of [{ toolsOn: true }, { toolsOn: false }, { toolsOn: false, generalMode: true }]) {
      const text = tutorSystemBlocks({ syllabus: EMPTY, ...args, school: null })[0].text;
      expect(text).not.toContain("Childline");
      expect(text).not.toContain("school tutor");
      expect(text).toContain(PLATFORM_PERSONA);
    }
  });
});

// ── Daily cap ─────────────────────────────────────────────────────────

describe("the daily cap — 20 USER messages per IST day", () => {
  it("is 20, reached at 20 (not 19), with the messages left never negative", () => {
    expect(SCHOOL_TUTOR_DAILY_CAP).toBe(20);
    expect(schoolTutorCapReached(0)).toBe(false);
    expect(schoolTutorCapReached(19)).toBe(false);
    expect(schoolTutorCapReached(20)).toBe(true);
    expect(schoolTutorCapReached(21)).toBe(true);
    expect(schoolTutorMessagesLeft(0)).toBe(20);
    expect(schoolTutorMessagesLeft(7)).toBe(13);
    expect(schoolTutorMessagesLeft(20)).toBe(0);
    expect(schoolTutorMessagesLeft(25)).toBe(0);
  });

  it("the day starts at 00:00 IST (18:30 UTC of the previous UTC day)", () => {
    // 24 Sep 2026 12:00 IST → the day began 23 Sep 18:30 UTC.
    expect(schoolTutorDayStart(new Date("2026-09-24T06:30:00Z")).toISOString()).toBe("2026-09-23T18:30:00.000Z");
    // 24 Sep 00:30 IST (23 Sep 19:00 UTC) is already the 24th.
    expect(schoolTutorDayStart(new Date("2026-09-23T19:00:00Z")).toISOString()).toBe("2026-09-23T18:30:00.000Z");
    // 23 Sep 23:30 IST (18:00 UTC) is still the 23rd.
    expect(schoolTutorDayStart(new Date("2026-09-23T18:00:00Z")).toISOString()).toBe("2026-09-22T18:30:00.000Z");
    // Exactly midnight IST begins the new day.
    expect(schoolTutorDayStart(new Date("2026-09-23T18:30:00Z")).toISOString()).toBe("2026-09-23T18:30:00.000Z");
  });

  it("the end-of-day line exists in en, hi and te, names the cap and tomorrow, and nags nobody", () => {
    expect(SCHOOL_TUTOR_CAP_COPY.en).toBe("That's 20 messages with the tutor for today — it opens again tomorrow. Till then, the chapter's notes and practice are open on its page.");
    expect(SCHOOL_TUTOR_CAP_COPY.hi).toMatch(/[ऀ-ॿ]/);
    expect(SCHOOL_TUTOR_CAP_COPY.te).toMatch(/[ఀ-౿]/);
    for (const lang of ["en", "hi", "te"] as const) {
      expect(SCHOOL_TUTOR_CAP_COPY[lang]).toContain("20");
      expect(SCHOOL_TUTOR_CAP_COPY[lang].toLowerCase()).not.toMatch(/streak|sign in|upgrade/);
    }
    expect(schoolUiLang("hi")).toBe("hi");
    expect(schoolUiLang("te")).toBe("te");
    for (const c of ["en", "mr", "", null, undefined, "x"]) expect(schoolUiLang(c)).toBe("en");
  });

  it("streams as an ordinary reply (meta / delta / done) with the cap code, and no meta without a conversation", () => {
    const withSession = schoolCapFrames("s1", "en");
    expect(withSession).toBe(
      `event: meta\ndata: {"sessionId":"s1"}\n\n` +
        `event: delta\ndata: ${JSON.stringify(SCHOOL_TUTOR_CAP_COPY.en)}\n\n` +
        `event: done\ndata: {"messageId":"school-cap","actions":[],"toolCalls":[],"code":"school-daily-cap"}\n\n`,
    );
    expect(SCHOOL_CAP_CODE).toBe("school-daily-cap");
    const fresh = schoolCapFrames(null, "te");
    expect(fresh).not.toContain("event: meta");
    expect(fresh).toContain(JSON.stringify(SCHOOL_TUTOR_CAP_COPY.te));
    expect(fresh).not.toContain("event: error");
  });
});

describe("a declared 13-17 student gets the school tutor only (26 Sep 2026 fixer review)", () => {
  it("the line exists in en, hi and te and points at the class pages, never at an exam or a phone", () => {
    expect(SCHOOL_ONLY_TUTOR_COPY.en).toBe("Your tutor is on your class pages — open the chapter you are studying and ask from there.");
    expect(SCHOOL_ONLY_TUTOR_COPY.hi).toMatch(/[ऀ-ॿ]/);
    expect(SCHOOL_ONLY_TUTOR_COPY.te).toMatch(/[ఀ-౿]/);
    for (const lang of ["en", "hi", "te"] as const) {
      expect(SCHOOL_ONLY_TUTOR_COPY[lang].toLowerCase()).not.toMatch(/exam|phone|whatsapp|sign in|streak/);
    }
    expect(SCHOOL_ONLY_TUTOR_CODE).toBe("school-only-tutor");
  });

  it("sends the account to the class it asked about when it confirmed that class, else its first class", () => {
    expect(schoolOnlyChatPath(["NCERT_C09"], null)).toBe("/chat?examCode=NCERT_C09");
    expect(schoolOnlyChatPath(["NCERT_C09"], "SSC_CGL")).toBe("/chat?examCode=NCERT_C09");
    expect(schoolOnlyChatPath(["NCERT_C09", "NCERT_C10"], "NCERT_C10")).toBe("/chat?examCode=NCERT_C10");
    expect(schoolOnlyChatPath(["CISCE_C11"], undefined)).toBe("/chat?examCode=CISCE_C11");
  });

  it("the refusal is one error event with the line, the code and the way back — no meta, no reply", () => {
    const frame = schoolOnlyTutorErrorFrame("/chat?examCode=NCERT_C09", "hi");
    expect(frame).toBe(
      `event: error\ndata: ${JSON.stringify({ error: SCHOOL_ONLY_TUTOR_COPY.hi, code: "school-only-tutor", next: "/chat?examCode=NCERT_C09" })}\n\n`,
    );
    expect(frame).not.toContain("event: meta");
    expect(frame).not.toContain("event: done");
  });
});

// ── Source guards ─────────────────────────────────────────────────────

describe("a school turn without the declared band is refused at the API (26 Sep 2026 integrator)", () => {
  it("has its own line in en, hi and te — the mock builder's code, never an exam word", () => {
    expect(SCHOOL_BAND_REQUIRED_CODE).toBe("school-band-required");
    expect(SCHOOL_BAND_REQUIRED_COPY.en).toBe("One question before the tutor — tell Shishya once who is using it. It is asked on your class page.");
    expect(SCHOOL_BAND_REQUIRED_COPY.hi).toMatch(/[ऀ-ॿ]/);
    expect(SCHOOL_BAND_REQUIRED_COPY.te).toMatch(/[ఀ-౿]/);
    for (const lang of ["en", "hi", "te"] as const) expect(SCHOOL_BAND_REQUIRED_COPY[lang].toLowerCase()).not.toMatch(/exam|phone|whatsapp|sign in|streak/);
    // The same code the chapter mock builder answers with (student-db.ts, 403).
    expect(read("src/lib/school/student-db.ts")).toContain('"school-band-required"');
  });

  it("is one error event with the code and the page that asks — no meta, no done", () => {
    const frame = schoolBandRequiredErrorFrame("/schooling/cbse/class-9?from=school", "te");
    expect(frame).toBe(
      `event: error\ndata: ${JSON.stringify({ error: SCHOOL_BAND_REQUIRED_COPY.te, code: "school-band-required", next: "/schooling/cbse/class-9?from=school" })}\n\n`,
    );
    expect(frame).not.toContain("event: meta");
    expect(frame).not.toContain("event: done");
  });

  it("the class page's entry asks the band too, so that `next` is a page that asks", () => {
    expect(read("src/components/school/SchoolStudentEntry.tsx")).toContain('if (p.variant === "class" && view.kind !== "band-card") {');
  });
});

describe("the school loaders read school containers by category and fetch no textbook text", () => {
  const src = read("src/lib/school/tutor-context.ts");

  it("every nested exam filter is SCHOOL_CONTAINER_WHERE; no exam lookup, no real-exam helper", () => {
    // Query filters only — the interface's `exam: { id: string; … }` type is not a filter.
    const nested = (src.match(/\bexam:\s*\{[^}]*\}/g) ?? []).filter((n) => !n.includes(": string") && !n.includes("select:"));
    expect(nested.length).toBeGreaterThanOrEqual(2);
    for (const n of nested) expect(n).toContain("...SCHOOL_CONTAINER_WHERE, code");
    expect(src).toMatch(/import \{[^}]*\bSCHOOL_CONTAINER_WHERE\b[^}]*\} from "\.\/scope"/);
    // Code only — the header comment names prisma.exam.* to say it is never used.
    const code = src.split("\n").filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join("\n");
    expect(code).not.toMatch(/prisma\.exam\./);
    expect(code).not.toMatch(/\b(?:realExamKey|REAL_EXAM_WHERE|NOT_SCHOOL_WHERE|SCHOOL_WHERE)\b/);
  });

  it("reads only rows: no fetch, no URL read, and the notes are capped", () => {
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).toContain("prepared.markdown.slice(0, SCHOOL_NOTES_EXCERPT_CHARS)");
    expect(src).toContain('createdAt: { gte: schoolTutorDayStart(now) }');
    expect(src).toContain("session: { userId, exam: SCHOOL_CONTAINER_WHERE }");
  });
});

describe("POST /api/chat — the school path (source)", () => {
  const src = read("src/app/api/chat/route.ts");

  it("resolves a school container only through schoolStudentExamKey, keeps realExamKey for the rest", () => {
    expect(src).toContain("const schoolKey = schoolStudentExamKey({ code: examCodeForChat, userId });");
    expect(src).toContain("const schoolCtx = schoolKey ? await getSchoolTutorContext(schoolKey.code) : null;");
    expect(src).toMatch(/schoolCtx\s*\n?\s*\?\s*schoolCtx\.exam\s*\n?\s*:\s*await prisma\.exam\.findUnique\(\{ where: realExamKey\(/);
  });

  it("checks the cap before any write, enrols nobody on a school chat, and passes the school turn with tools off", () => {
    const cap = src.indexOf("countSchoolTutorMessagesToday(userId)");
    const enrol = src.indexOf("if (exam && userId && !schoolCtx) {\n    await ensureEnrollment(userId, exam);");
    const firstWrite = src.indexOf("prisma.chatMessage.create(");
    expect(cap).toBeGreaterThan(0);
    expect(enrol).toBeGreaterThan(cap);
    expect(firstWrite).toBeGreaterThan(cap);
    expect(src).toContain("return new Response(schoolCapFrames(body.sessionId ?? null, schoolUiLang(jar.get(\"shishya-lang\")?.value))");
    expect(src).toContain("school: schoolCtx ? { scope: schoolCtx.scope, focus: schoolFocus, band } : undefined,");
    expect(src).toContain("examCodeForChat && userId && !schoolCtx");
    expect(src).toContain("? ([null, schoolCtx.syllabus, null] as const)");
    expect(src).toContain("if (exam && !schoolCtx && body.topicCode) {");
  });

  it("sends a school student back to the chapter or class page, never /exams", () => {
    expect(src).toContain("const backPath = schoolCtx ? schoolCtx.scope.classPath : examCodeForChat ? `/exams/${examCodeForChat}` : \"/exams\";");
    expect(src).toContain("next: schoolFocus?.path ?? backPath");
    expect(src).toContain("Meanwhile the chapter's notes and practice are open at https://shishya.in${schoolFocus?.path ?? backPath}");
  });

  it("refuses a declared 13-17 account the general / exam tutor before enrolment, reading the profile once (fixer review)", () => {
    const profile = src.indexOf("const schoolProfile = schoolBandOfProfile(profile);");
    const gate = src.indexOf("if (userId && !schoolCtx && schoolProfile && isMinorBand(schoolProfile.band)) {");
    const enrol = src.indexOf("await ensureEnrollment(userId, exam);");
    const firstWrite = src.indexOf("prisma.chatMessage.create(");
    expect(profile).toBeGreaterThan(0);
    expect(gate).toBeGreaterThan(profile);
    expect(enrol).toBeGreaterThan(gate);
    expect(firstWrite).toBeGreaterThan(gate);
    expect(src).toContain("schoolOnlyTutorErrorFrame(schoolOnlyChatPath(schoolProfile.classCodes, examCodeForChat), schoolUiLang(jar.get(\"shishya-lang\")?.value))");
    // One User read per turn; the band on the school turn comes from it.
    expect(src.match(/prisma\.user\.findUnique\(/g)?.length).toBe(1);
    expect(src).toContain("if (schoolCtx) band = schoolProfile?.band ?? null;");
  });

  it("refuses a school turn without the band after the profile read and before the cap, enrolment and the first write (integrator)", () => {
    const profile = src.indexOf("const schoolProfile = schoolBandOfProfile(profile);");
    const gate = src.indexOf("if (schoolCtx && userId && !schoolProfile?.band) {");
    const cap = src.indexOf("countSchoolTutorMessagesToday(userId)");
    const enrol = src.indexOf("await ensureEnrollment(userId, exam);");
    const firstWrite = src.indexOf("prisma.chatMessage.create(");
    expect(profile).toBeGreaterThan(0);
    expect(gate).toBeGreaterThan(profile);
    expect(cap).toBeGreaterThan(gate);
    expect(enrol).toBeGreaterThan(gate);
    expect(firstWrite).toBeGreaterThan(gate);
    expect(src).toContain("schoolBandRequiredErrorFrame(schoolReturnPath(schoolCtx.scope.classPath), schoolUiLang(jar.get(\"shishya-lang\")?.value))");
  });

  it("drops a named conversation of another scope, so the cap always sees a school turn (fixer review)", () => {
    const owner = src.indexOf("if (chatSession && chatSession.userId !== userId) chatSession = null;");
    const scope = src.indexOf("if (chatSession && chatSession.examId !== (exam?.id ?? null)) chatSession = null;");
    const create = src.indexOf("chatSession = await prisma.chatSession.create({");
    expect(owner).toBeGreaterThan(0);
    expect(scope).toBeGreaterThan(owner);
    expect(create).toBeGreaterThan(scope);
  });
});

describe("/chat page — the school branch (source)", () => {
  const src = read("src/app/chat/page.tsx");
  const start = src.indexOf("// ── School tutor (26 Sep 2026)");
  const end = src.indexOf("// ── Anonymous tutor — UNGATED");
  const branch = src.slice(start, end);

  it("runs before the exam flows; Classes 1-7 are 404 for everyone; the container must load", () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(branch).toContain("if (!isStudentModeClass(schoolCls)) notFound();");
    expect(branch).toContain("if (!ctx) notFound();");
    expect(branch).toContain("const schoolCls = !generalMode && sp.examCode ? schoolContainerClassOf(sp.examCode) : null;");
  });

  it("shows the age line on the signed-out card and the band card, and never enrols or reads the exam picker", () => {
    expect(branch.match(/t\("chat\.school\.ageLine"\)/g)?.length).toBe(2);
    expect(branch).toContain("<GoogleSignInButton callbackUrl={selfUrl}");
    expect(branch).toContain("schoolBandOfProfile(profile)?.band ?? null");
    expect(branch).toContain("schoolReturnPath(backHref)");
    expect(branch).not.toContain("ensureEnrollment");
    expect(branch).not.toContain("enrollments");
    expect(branch).not.toContain("weaknessMap");
  });

  it("hands the island the AI line, the cap state and hint-first starters; the seed is accepted", () => {
    expect(branch).toContain('aiLine: t("chat.school.aiLine")');
    expect(branch).toContain("capReached: schoolTutorCapReached(usedToday)");
    expect(branch).toContain("capLine: SCHOOL_TUTOR_CAP_COPY[schoolUiLang(locale)]");
    expect(branch).toContain("initialSeed={sp.seed ?? null}");
    expect(branch).toContain('t("chat.school.starter.2")');
    expect(branch).toContain('empty: t("chat.school.empty")');
  });

  it("the exam flows read real-exam enrolments only, and a declared 13-17 account is sent to its class chat first (fixer review)", () => {
    const after = src.slice(end);
    // Both enrolment reads carry the helper: a class container never feeds the picker, the switcher or enrollments[0].
    expect(after.match(/prisma\.enrollment\.findMany\(/g)?.length).toBe(2);
    expect(after.match(/where: \{ userId: session\.user\.id, active: true, exam: NOT_SCHOOL_WHERE \}/g)?.length).toBe(2);
    // The minor redirect comes before any enrolment read and before the auto-enrol.
    const minor = after.indexOf("if (schoolProfile && isMinorBand(schoolProfile.band)) redirect(schoolOnlyChatPath(schoolProfile.classCodes, sp.examCode));");
    const firstRead = after.indexOf("prisma.enrollment.findMany(");
    const autoEnrol = after.indexOf("await ensureEnrollment(session.user.id, target, { active: true });");
    expect(minor).toBeGreaterThan(0);
    expect(firstRead).toBeGreaterThan(minor);
    expect(autoEnrol).toBeGreaterThan(minor);
    // A school-only adult on plain /chat: the class chat, not "no enrollments".
    expect(after).toContain("if (schoolProfile && !generalMode && !sp.examCode && enrollments.length === 0) {");
    expect(after).toContain("redirect(schoolOnlyChatPath(schoolProfile.classCodes, null));");
    expect(src).toContain('import { notFound, redirect } from "next/navigation";');
  });
});

describe("the chat island — a school chat shows the AI line and no exam CTA (source)", () => {
  const src = read("src/app/chat/ChatInterface.tsx");

  it("AI line always visible; diagnostic, teacher, actions and topic starters gated on !school", () => {
    expect(src).toContain("{school.aiLine}");
    expect(src).toContain("{!school && (\n            <button\n              type=\"button\"\n              onClick={takeTopicDiagnostic}");
    expect(src).toContain("{!school && !busy && messages.filter((m) => m.role === \"assistant\" && m.content).length >= 2 && (");
    expect(src).toContain("{!school && actions.length > 0 && (");
    expect(src).toContain("const starters: string[] = school\n    ? labels.starters");
  });

  it("the cap closes the composer on the cap code and on load; no share / challenge / group surface", () => {
    expect(src).toContain("if (parsed?.code === SCHOOL_CAP_CODE) setCapped(true);");
    expect(src).toContain("useState<boolean>(school?.capReached ?? false)");
    expect(src).toContain("if (!text.trim() || busy || capped) return;");
    // The cap closes the composer with or without the school prop (fixer review).
    expect(src).toContain("{capped ? (");
    expect(src).toContain("<p>{school ? school.capLine : SCHOOL_TUTOR_CAP_COPY[navLang]}</p>");
    // No social surface is imported into the chat island (comments may name them).
    expect(src).not.toMatch(/^import .*\b(?:ChallengeCard|StudyGroupsCard|ResultCardShare|ShareExamButton|Leaderboard)\b/m);
  });
});

describe("i18n — the chat.school.* keys exist in en, hi and te with the same placeholders", () => {
  const keys = (Object.keys(dict.en) as StringKey[]).filter((k) => k.startsWith("chat.school."));
  const raw = (locale: Locale, key: StringKey): string | undefined => (dict[locale] as Record<string, string>)[key];
  const placeholders = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();

  it("the family is the size this wave built", () => {
    expect(keys.length).toBe(24);
    expect(keys).toContain("chat.school.ageLine");
    expect(keys).toContain("chat.school.aiLine");
    expect(dict.en["chat.school.ageLine"]).toBe("Shishya's school tutor is for students 13 and above (Class 8 to 12).");
    expect(dict.en["chat.school.aiLine"]).toContain("You are talking to an AI tutor");
  });

  for (const locale of ["hi", "te"] as const) {
    it(`${locale}: every key present, in its own script, with the English placeholders`, () => {
      const script = locale === "hi" ? /[ऀ-ॿ]/ : /[ఀ-౿]/;
      for (const k of keys) {
        const v = raw(locale, k);
        expect(v, k).toBeTruthy();
        expect(v!, k).toMatch(script);
        expect(placeholders(v!), k).toEqual(placeholders(dict.en[k]));
      }
    });
  }

  it("the honest label survives: practice is Shishya's own, not NCERT exercises, in every language", () => {
    expect(dict.en["chat.school.subtitle"]).toContain("not NCERT exercises");
    expect(raw("hi", "chat.school.subtitle")).toContain("NCERT");
    expect(raw("te", "chat.school.subtitle")).toContain("NCERT");
  });
});
