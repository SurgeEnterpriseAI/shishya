// School curriculum spine — the rows the seed would write (25 Sep 2026).
//
// Why a pure plan: scripts/seed-school-spine.ts (dry run by default) and
// tests/unit/school-spine.test.ts must agree on exactly which Exam / Subject /
// Topic / KnowledgeSource rows the official spine turns into, without a DB.
//
// Model (product.md §1.2): one Exam row per (curriculum, class) with category
// SCHOOL_BOARD — NCERT_C01..NCERT_C12, CISCE_C01..CISCE_C12 — one Subject per
// NCERT / CISCE subject, one top-level Topic per NCERT chapter whose title and
// PDF were both verified (unresolved chapters get no Topic). The official
// chapter PDF link lives in a KnowledgeSource row (tier STANDARD_TEXT,
// publisher NCERT, examCode + topicCode, NO chunks — a link, never ingested
// text: NCERT's licence forbids reproducing or summarising the books). CISCE
// syllabus / regulation PDFs are KnowledgeSource rows too (tier OFFICIAL).
// 26 Sep 2026: a piece printed inside a chapter PDF (First Flight's poems,
// Hornbill's and Kaveri's poems, Poorvi's unit lessons, numbered parts) is a
// child Topic of its chapter (<chapter>.pNN), so a class syllabus built from
// these rows does not drop "Fire and Ice" from Class 10.
//
// Every Exam row is created active=false. REAL_EXAM_WHERE / SCHOOL_WHERE in
// src/lib/db/exam-scope.ts both exclude an inactive SCHOOL_BOARD row, and
// the exam and topic pages 404 an inactive exam. NOT covered as of 26 Sep
// 2026: /api/chat looks the exam up by code alone and upserts an Enrollment,
// so a hand-made request with examCode NCERT_C09 would reach the tutor and
// enrol the user. scripts/seed-school-spine.ts therefore refuses --apply
// without --chat-gate-checked (see its header).

import { CISCE, NCERT_CLASS_FILES, SCHOOL_CLASSES, cisceExamCode, displayTitle, ncertExamCode, ncertPieceCode, ncertSubjectsForClass, ncertTopicCode, subjectCodeFor } from "./spine";

export const SCHOOL_BOARD = "SCHOOL_BOARD" as const;

/** Container defaults, NOT a board paper pattern: Exam's pattern columns are
 *  required, so a (curriculum, class) row carries the chapter-check shape
 *  from product.md §1.2 — 10 questions, 1 mark each, no negative marking.
 *  Class 10/12 board patterns can replace these once they are sourced. */
export const CHAPTER_CHECK_DEFAULTS = {
  durationMin: 15,
  totalQuestions: 10,
  totalMarks: 10,
  marksPerQ: 1,
  negativeMark: 0,
} as const;

export interface PlannedExam {
  code: string;
  name: string;
  shortName: string;
  category: typeof SCHOOL_BOARD;
  description: string;
  durationMin: number;
  totalQuestions: number;
  totalMarks: number;
  marksPerQ: number;
  negativeMark: number;
  languages: ("EN" | "HI")[];
  active: false;
}

export interface PlannedSubject {
  examCode: string;
  code: string;
  name: string;
  orderIdx: number;
}

export interface PlannedTopic {
  examCode: string;
  subjectCode: string;
  code: string;
  name: string;
  orderIdx: number;
  /** Set for a piece inside a chapter PDF: the chapter Topic's code. */
  parentCode?: string;
}

export interface PlannedLink {
  /** KnowledgeSource.contentHash is @unique; a link row has no content, so
   *  the key is (exam, URL) behind a prefix no ingested sha256 can take —
   *  the same CISCE curriculum PDF serves Classes 1-5 as five rows. */
  contentHash: string;
  title: string;
  url: string;
  publisher: "NCERT" | "CISCE";
  tier: "STANDARD_TEXT" | "OFFICIAL";
  examCode: string;
  topicCode: string | null;
  language: "EN";
}

export interface PlannedClassSummary {
  examCode: string;
  label: string;
  subjects: number;
  books: number;
  topics: number;
  /** Child Topics: pieces printed inside a chapter PDF. */
  pieces: number;
  unresolvedChapters: number;
  links: number;
  unresolvedByReason: Record<string, number>;
}

export interface SchoolSpinePlan {
  exams: PlannedExam[];
  subjects: PlannedSubject[];
  topics: PlannedTopic[];
  links: PlannedLink[];
  summary: PlannedClassSummary[];
}

export function linkHash(examCode: string, url: string): string {
  return `official-link:${examCode}:${url}`;
}

function ncertExam(cls: number, hasHindi: boolean, fetchedOn: string): PlannedExam {
  return {
    code: ncertExamCode(cls),
    name: `NCERT Class ${cls}`,
    shortName: `NCERT ${cls}`,
    category: SCHOOL_BOARD,
    description:
      `School curriculum container, not an exam: the subjects, textbooks and chapters NCERT lists for Class ${cls} ` +
      `on https://ncert.nic.in/textbook.php (read ${fetchedOn}). Chapter titles come from each book's own contents page; ` +
      `chapter links go to NCERT's PDFs. Inactive until checked school content exists.`,
    ...CHAPTER_CHECK_DEFAULTS,
    languages: hasHindi ? ["EN", "HI"] : ["EN"],
    active: false,
  };
}

function cisceSubjectName(name: string): string {
  return name.replace(/^(A|An)\s+/, "");
}

export function buildSchoolSpinePlan(): SchoolSpinePlan {
  const plan: SchoolSpinePlan = { exams: [], subjects: [], topics: [], links: [], summary: [] };
  const fetchedOn = NCERT_CLASS_FILES[0]?.source.fetchedOn ?? "";

  for (const cls of SCHOOL_CLASSES) {
    const examCode = ncertExamCode(cls);
    const subjects = ncertSubjectsForClass(cls);
    const hasHindi = subjects.some((s) => s.books.some((b) => b.language === "hi" || b.editions.some((e) => e.language === "hi")));
    plan.exams.push(ncertExam(cls, hasHindi, fetchedOn));
    const sum: PlannedClassSummary = {
      examCode, label: `NCERT Class ${cls}`, subjects: 0, books: 0, topics: 0, pieces: 0, unresolvedChapters: 0, links: 0, unresolvedByReason: {},
    };
    subjects.forEach((s, si) => {
      plan.subjects.push({ examCode, code: s.code, name: s.name, orderIdx: si + 1 });
      sum.subjects++;
      s.books.forEach((b, bi) => {
        sum.books++;
        for (const ch of b.chapters) {
          const code = ncertTopicCode(b.code, ch.pdfSeq);
          plan.topics.push({ examCode, subjectCode: s.code, code, name: displayTitle(ch.title), orderIdx: (bi + 1) * 100 + ch.seq });
          plan.links.push({
            contentHash: linkHash(examCode, ch.pdfUrl),
            title: `NCERT Class ${cls} ${s.name} — ${b.title} — ${ch.number ? `${ch.kind === "chapter" ? "Chapter" : ch.kind[0].toUpperCase() + ch.kind.slice(1)} ${ch.number}: ` : ""}${displayTitle(ch.title)} (PDF)`,
            url: ch.pdfUrl,
            publisher: "NCERT",
            tier: "STANDARD_TEXT",
            examCode,
            topicCode: code,
            language: "EN",
          });
          sum.topics++;
          sum.links++;
          // pieces printed inside this chapter's PDF: child Topics, no link
          // row of their own (they share the chapter PDF)
          (ch.includes ?? []).forEach((inc, k) => {
            plan.topics.push({
              examCode, subjectCode: s.code, code: ncertPieceCode(code, k + 1), name: displayTitle(inc.title),
              orderIdx: k + 1, parentCode: code,
            });
            sum.pieces++;
          });
        }
        for (const u of b.unresolved) {
          sum.unresolvedChapters++;
          const reason = u.reason.split(":")[0];
          sum.unresolvedByReason[reason] = (sum.unresolvedByReason[reason] ?? 0) + 1;
        }
      });
    });
    plan.summary.push(sum);
  }

  for (const cls of SCHOOL_CLASSES) {
    const level = CISCE.levels.find((l) => l.classes.includes(cls));
    if (!level) continue;
    const examCode = cisceExamCode(cls);
    const stage = level.examinationYear ? `${level.examinationYear} course` : level.stage;
    plan.exams.push({
      code: examCode,
      name: `CISCE Class ${cls}`,
      shortName: `CISCE ${cls}`,
      category: SCHOOL_BOARD,
      description:
        `School curriculum container, not an exam: the subjects CISCE lists for Class ${cls} (${stage}) on https://cisce.org ` +
        `(read ${CISCE.fetchedOn}). CISCE prescribes syllabuses, not one textbook, so this container has subjects and official ` +
        `syllabus links only. Inactive until checked school content exists.`,
      ...CHAPTER_CHECK_DEFAULTS,
      languages: ["EN"],
      active: false,
    });
    const sum: PlannedClassSummary = {
      examCode, label: `CISCE Class ${cls}`, subjects: 0, books: 0, topics: 0, pieces: 0, unresolvedChapters: 0, links: 0, unresolvedByReason: {},
    };
    const doc = level.regulations ?? (level.document ? { url: level.document.url } : null);
    if (doc) {
      plan.links.push({
        contentHash: linkHash(examCode, doc.url), title: `CISCE Class ${cls} — ${level.examinationYear ? `${level.examinationYear} regulations` : level.document?.title ?? "curriculum"} (PDF)`,
        url: doc.url, publisher: "CISCE", tier: "OFFICIAL", examCode, topicCode: null, language: "EN",
      });
      sum.links++;
    }
    level.subjects.forEach((s, si) => {
      const code = subjectCodeFor(cisceSubjectName(s.name));
      plan.subjects.push({ examCode, code, name: s.name, orderIdx: si + 1 });
      sum.subjects++;
      for (const url of s.syllabusUrls ?? []) {
        plan.links.push({
          contentHash: linkHash(examCode, url), title: `CISCE Class ${cls} ${s.name} — ${level.examinationYear ?? "curriculum"} syllabus (PDF)`,
          url, publisher: "CISCE", tier: "OFFICIAL", examCode, topicCode: null, language: "EN",
        });
        sum.links++;
      }
    });
    plan.summary.push(sum);
  }

  // One link row per (exam, URL): the same CISCE syllabus PDF can serve two
  // subjects of one class (the Group I and Group II foreign-language PDF).
  const seen = new Set<string>();
  plan.links = plan.links.filter((l) => !seen.has(l.contentHash) && Boolean(seen.add(l.contentHash)));
  for (const s of plan.summary) s.links = plan.links.filter((l) => l.examCode === s.examCode).length;
  return plan;
}
