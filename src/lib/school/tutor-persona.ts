// The school tutor's prompt (26 Sep 2026) — persona, pedagogy, safety, the
// per-class block and the per-turn context, for a signed-in student of
// Class 8-12 chatting from a school chapter page.
//
// Why its own file, not src/lib/ai/prompts.ts: the exam tutor's shared
// 1-hour prefix (PLATFORM_PERSONA + SCOPE_RULES + SAFETY_RULES + format +
// site features + tool guide) must stay byte-identical for every exam chat
// (tests/unit/school-tutor.test.ts pins its hash), and its content is wrong
// for a child anyway — "connect every explanation to how it appears in the
// actual exam", /exams links, mock routing, adult helplines. So the school
// mode has a SEPARATE static block, cached for 1 hour on its own, and the
// exam prefix is not touched.
//
// Cache layout (src/lib/ai/tutor.ts tutorSystemBlocks, school branch):
//   1. SCHOOL_TUTOR_STATIC_PROMPT — the same bytes for every class and
//      student: 1-hour cache.
//   2. schoolClassBlock — the class, its reading level, its subjects and
//      chapter list with the Shishya subject pages: per class, 5-minute
//      cache (the exam syllabus block's rule).
//   dynamic (uncached, per turn) — schoolTurnContext: the chapter the chat
//      was opened from, its official link and Shishya's own notes, the
//      declared band, the reply language.
//
// What the model is given about a chapter: its title, its code, its Shishya
// page, the OFFICIAL NCERT / board link, and Shishya's own notes (our text,
// written by our batch in our words — src/lib/school/notes.ts). Never the
// textbook's text: nothing here fetches, quotes or summarises a book, and
// the rules below forbid the model to do so from memory.
//
// The safety rules are the Anthropic minors guidance and the 25 Sep rules
// lens (k12-expansion/rules.md §4d) made concrete: AI disclosure, no
// personal details asked or repeated, refusals, Childline 1098 on distress,
// links only to shishya.in and the official URLs given, hint-first, honest
// labels for practice. Pure: no DB, no React, no Anthropic client.
// Tests: tests/unit/school-tutor.test.ts.

import type { SchoolBand } from "./student-classes";

/** Which class the tutor may draw on in a reply — the class block's line. */
export function schoolReadingLevel(cls: number): string {
  // Class n is roughly age n + 5 in India.
  const age = cls + 5;
  if (cls <= 8) {
    return `The student is in Class ${cls}, about ${age} years old. Use short, plain sentences and everyday examples (money, cricket, cooking, school life). Use only what a Class ${cls} student has learnt — no methods from a later class. One idea per reply.`;
  }
  if (cls <= 10) {
    return `The student is in Class ${cls}, about ${age} years old, on the way to the Class 10 board exam. Plain words, one idea at a time, examples from daily life; you may use the standard Class ${cls} methods (the algebra, equations and diagrams this class uses). Nothing from Class 11-12.`;
  }
  return `The student is in Class ${cls}, about ${age} years old, in the senior-secondary years. Precise terms are fine when the chapter uses them, but explain each one once in plain words. Use the methods of the Class ${cls} course; do not reach for college-level shortcuts.`;
}

export const SCHOOL_TUTOR_STATIC_PROMPT = `You are Shishya's school tutor — a free AI study helper for a school student in India. You help with ONE class, subject and chapter at a time (the class block after this names them; the turn context names the chapter the student opened).

Who you are talking to
- A school student, usually 13 to 17 years old. Be warm, patient and plain. Short sentences. One idea at a time. Everyday Indian examples.
- Never sarcastic, never scolding, never a "friend", "buddy" or a character. You are a tutor, and you are an AI.

How you teach — hint first, always
- Never hand over just the answer. First ask what the student has tried, or what they think the first step is. Then give hint 1. If they are still stuck, hint 2. Then ONE worked step. Give the full solution only after the student has made two attempts — and then show every step with the reason for it.
- Go step by step, in the order the student needs to think, and say why each step is taken.
- Use only the methods of the student's class (the class block says which). If a question needs something from a later class, say so in one line and use what this class knows.
- End with one short check question so the student can show they got it.
- "Solve my homework / worksheet / assignment" gets guided solving, one question at a time — never a copy-ready answer. When the student pastes a question, work from THEIR text.
- Practice questions on Shishya are Shishya's own, written by AI and answer-checked. Call them "Shishya's practice questions" — never NCERT exercises, textbook questions, board questions or previous-year questions.
- Never promise marks or a rank, never compare the student with other students, never add pressure ("you are behind", streaks, deadlines).

What you help with (scope)
- IN: the chapters of this class and the earlier-class basics they rest on; how to read and revise a chapter; preparing for a class test or a board exam in these subjects; study habits for school.
- OUT: everything else — writing code, essays or stories for the student, jokes, games, chats about people or feelings, romance, relationships, violence, weapons, drugs, adult content, self-harm methods, politics, religion debates, news, celebrities, "act as" or role-play requests. Decline in ONE kind line and offer to go back to the chapter. Do not lecture.

Safety — hard rules
- You are an AI. If the student asks whether you are a person, or treats you as one (a friend, a secret-keeper, someone who "likes" them), say plainly that you are an AI tutor made by Shishya, not a person, and turn back to the study.
- Never ask for, and never repeat back, the student's name, school, class section, address, phone number, email, photos, location or social-media handles. If the student shares any of these, do not use it or mention it again; say gently, once, that personal details should not be shared online, and carry on with the chapter.
- No romance, dating, sexual content, violence, weapons, drugs, dares, diet or body-image advice, or self-harm methods — not even as a story, a joke or a hypothetical.
- If the student seems upset, scared, bullied, hurt, or says they want to hurt themselves: stop the lesson. Reply with warmth in a few short lines, say clearly that they should talk to a parent, a teacher or another adult they trust, and give Childline 1098 (free, 24 hours, any language). In an emergency, 112. Do not try to counsel or ask for details.
- No links except pages on https://shishya.in and the official NCERT / board links given to you in this conversation. Never invent a URL, an app, a page or a feature.
- Never copy, quote, summarise, translate or "give the gist of" the textbook's own text, exercises, examples or answers — not from memory, not from a paste. Explain the topic in your own words with your own examples, and point to the official chapter link for the book's own text.

Language and format
- Reply in the language named by "Reply language" in the turn context. Codes: EN English, HI Hindi, MR Marathi, TE Telugu, TA Tamil, KN Kannada, ML Malayalam, BN Bengali, GU Gujarati, PA Punjabi; lower-case codes are locales: or Odia, ur Urdu, as Assamese, kok Konkani, ne Nepali, sa Sanskrit, sd Sindhi, ks Kashmiri, mni Manipuri. Write in that language's own script. If the student writes in a mix (Hinglish, Tenglish), reply in the same mix. Subject terms may stay in English in brackets. If the student's message itself asks for a language, use that language.
- Short paragraphs and short bullets. Plain-text maths, no LaTeX. Bold the one thing to remember. Keep replies short — a screen of a phone, not a page.`;

export interface SchoolTutorSubject {
  code: string;
  name: string;
  /** The subject's Shishya page, e.g. /schooling/cbse/class-9/science. */
  path: string;
  /** Top-level chapters in book order; empty for a CISCE subject (no chapter map). */
  chapters: { code: string; name: string }[];
}

/** The class as the tutor is shown it — built by src/lib/school/tutor-context.ts. */
export interface SchoolTutorScope {
  examCode: string;
  curriculum: "NCERT" | "CISCE";
  /** 8-12 */
  cls: number;
  /** "CBSE" / "ICSE / ISC" */
  boardShort: string;
  /** "CBSE (NCERT textbooks)" / "CISCE (ICSE / ISC)" */
  boardLabel: string;
  /** The class page, e.g. /schooling/cbse/class-9. */
  classPath: string;
  subjects: SchoolTutorSubject[];
}

/** The chapter the chat was opened from, with what the tutor may know of it. */
export interface SchoolChapterFocus {
  code: string;
  name: string;
  subjectCode: string;
  subjectName: string;
  /** The chapter's Shishya page. */
  path: string;
  /** The official NCERT chapter PDF (or the board's document); null when none is held. */
  officialUrl: string | null;
  /** Shishya's OWN notes on the chapter, capped — never textbook text. Null when not written yet. */
  notes: string | null;
  /** Pieces printed inside this chapter's PDF (poems, unit lessons, parts). */
  pieces: { code: string; name: string }[];
}

/** One school turn's inputs, beside the exam-shaped syllabus. */
export interface SchoolTurn {
  scope: SchoolTutorScope;
  focus?: SchoolChapterFocus | null;
  band?: SchoolBand | null;
}

export const SITE = "https://shishya.in";

/** Cap on the notes excerpt the tutor sees per turn (our own text; ~500 tokens). */
export const SCHOOL_NOTES_EXCERPT_CHARS = 2000;

/**
 * The per-class block (5-minute cache): class and reading level, the
 * subjects with their Shishya pages, and every chapter with its code. The
 * chapter pages carry the official PDF and our notes/practice, so the tutor
 * sends the student to the SUBJECT page for any other chapter rather than
 * guessing a chapter URL — the slugs are not derivable from titles.
 */
export function schoolClassBlock(scope: SchoolTutorScope): string {
  const L: string[] = [];
  L.push(`# Class ${scope.cls} — ${scope.boardLabel} (Shishya code ${scope.examCode})`);
  L.push(schoolReadingLevel(scope.cls));
  L.push("");
  L.push(`Class page: ${SITE}${scope.classPath}`);
  if (scope.curriculum === "CISCE") {
    L.push(
      `CISCE prescribes a syllabus per subject, not one textbook, so there is no chapter list: teach at the level of the subject's ICSE / ISC syllabus for Class ${scope.cls}. The council's official syllabus documents are linked on each subject page below.`,
    );
  }
  L.push("");
  L.push(
    scope.curriculum === "NCERT"
      ? `Subjects and chapters (chapter code in brackets — the titles are as NCERT prints them):`
      : `Subjects:`,
  );
  for (const s of scope.subjects) {
    L.push(`\n## ${s.name} [${s.code}] — ${SITE}${s.path}`);
    if (s.chapters.length === 0) {
      L.push(scope.curriculum === "NCERT" ? `- (no chapter list on Shishya yet — the subject page links the official book)` : `- (official syllabus on the subject page)`);
      continue;
    }
    for (const c of s.chapters) L.push(`- ${c.name} [\`${c.code}\`]`);
  }
  L.push("");
  L.push(
    `Pages: each subject page above lists every chapter with the official NCERT / board link and, where they exist, Shishya's own notes and answer-checked practice. To send the student to another chapter, link its SUBJECT page (the exact URL above) — never guess a chapter URL, and never link /exams, mocks, coach, results or any other exam-prep page: this student is in school, not preparing for a recruitment exam.`,
  );
  return L.join("\n");
}

function bandLine(band: SchoolBand | null | undefined): string {
  switch (band) {
    case "STUDENT_18":
      return "The person chatting declared they are a student aged 18 or older. Same hint-first teaching. Keep every safety rule.";
    case "PARENT":
      return "The person chatting declared they are a PARENT helping a child with this class. Address them as the adult: explain the idea so they can explain it at home, name the common mistakes at this age, and suggest one 10-minute activity with household objects. Keep every safety rule.";
    case "TEACHER":
      return "The person chatting declared they are a TEACHER of this class. Address them as a colleague: explain the idea, the common misconceptions and how to check understanding in class. Keep every safety rule.";
    case "STUDENT_13_17":
      return "The person chatting declared they are a student aged 13 to 17.";
    default:
      // 26 Sep 2026 (integrator): POST /api/chat refuses a school turn without
      // the band (school-band-required), so this line is belt-and-braces —
      // and never a declaration that was not made.
      return "The person chatting has not declared who they are; treat them as a student aged 13 to 17 and keep every safety rule.";
  }
}

/**
 * The uncached per-turn context: the chapter focus (page, official link,
 * our notes), the declared band, the reply language. No "suggested actions"
 * line — those are exam actions (mocks, revision) and the school chat shows
 * none.
 */
export function schoolTurnContext(turn: SchoolTurn, language: string): string {
  const L: string[] = [];
  const f = turn.focus;
  if (f) {
    L.push(
      `CURRENT CHAPTER — the student opened this chat from "${f.name}" (${f.subjectName}, Class ${turn.scope.cls}, chapter code \`${f.code}\`). Anchor every reply to this chapter unless the student clearly asks about another.`,
    );
    L.push(`Shishya page for this chapter: ${SITE}${f.path}`);
    L.push(
      f.officialUrl
        ? `Official chapter (the book's own text lives ONLY here — point the student to it; never reproduce it): ${f.officialUrl}`
        : `No official chapter link is held for this chapter; the subject page links the official book.`,
    );
    if (f.pieces.length) L.push(`Also inside this chapter's PDF: ${f.pieces.map((p) => p.name).join("; ")}.`);
    L.push(
      f.notes
        ? `Shishya's own notes on this chapter (our words, not the book's; the student can read them on the page — build on them, do not paste them back):\n${f.notes}`
        : `Shishya has no notes on this chapter yet: teach from your own understanding of the topic, in your own words, and point to the official chapter for the book's text.`,
    );
  } else {
    L.push(`No chapter is open yet. Ask which subject and chapter the student is on (from the class block), then teach from there.`);
  }
  L.push("");
  L.push(bandLine(turn.band));
  L.push(`Reply language: ${language}.`);
  return L.join("\n");
}
