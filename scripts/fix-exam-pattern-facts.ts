// 27 Sep 2026 (organic wave 3, official cutoffs + pattern facts lane).
//
// Four Exam rows carry pattern facts the conducting body no longer prints.
// The page prints them as pills ("200 Questions · 720 Marks · 200 Minutes"),
// in the visible description paragraph and JSON-LD, and in the AI's ground
// facts (src/lib/ai/exam-facts.ts: "200 questions asked, 180 of them scored").
// Every target value below was read on 27 Sep 2026 from the body's own
// document, on its own host, and the quote is kept next to it:
//
//   JEE_MAIN      pattern numbers already match the NTA JEE (Main) 2026
//                 Information Bulletin (75 Q / 300 marks / 3 h / +4 −1); only
//                 the description is wrong ("90 questions (75 to attempt)" —
//                 the pre-2025 optional Section B).
//   NEET_UG       stored 200 Q (180 scored) / 200 min — the pre-2025 paper.
//                 NEET (UG) 2026 bulletin: 180 compulsory questions, 180
//                 minutes, 720 marks, +4 −1.
//   CA_FOUNDATION the row already describes one objective paper (100 Q, 1
//                 mark each, −0.25) but with the subjective papers' 3 hours;
//                 ICAI: Papers 3 & 4 are 2 hours. The description names the
//                 pre-2023 papers and "twice yearly"; the new scheme has
//                 Accounting / Business Laws / Quantitative Aptitude /
//                 Business Economics, three sessions a year.
//   CS_FOUNDATION stored the discontinued remote-proctored CSEET (140 Q / 200
//                 marks / 2 h). ICSI restructured CSEET from June 2026: four
//                 100-mark papers, three subjective and one OMR paper
//                 (Business Laws and Management: 100 questions, one mark
//                 each, 2 hours, no negative marking). The row now describes
//                 that OMR paper; the description carries all four papers.
//
// What it writes: only Exam columns that differ from the target
// (totalQuestions, scoredQuestions, totalMarks, marksPerQ, negativeMark,
// durationMin, description). Nothing else. Subject weights are checked and
// reported, never written. It also prints PATTERN_VERIFIED entries for
// src/lib/pattern-verified.ts (this script does not edit that file).
//
// Dry run by default: prints each row before, every changed field with its
// official quote, and the row after. --apply writes with compare-and-set
// (the where clause re-checks every changed column's old value, so a row
// someone edited after the read is skipped, not overwritten). Idempotent:
// a second run finds nothing to change.
//
// Run: npx tsx --env-file=.env.local scripts/fix-exam-pattern-facts.ts [--apply]

import { prisma } from "../src/lib/db/prisma";
import type { VerifiedPattern } from "../src/lib/pattern-verified";

type Field = "totalQuestions" | "scoredQuestions" | "totalMarks" | "marksPerQ" | "negativeMark" | "durationMin" | "description";
const FIELDS: Field[] = ["totalQuestions", "scoredQuestions", "totalMarks", "marksPerQ", "negativeMark", "durationMin", "description"];

interface Source {
  url: string;
  title: string;
  publisher: string;
  /** Date the document prints, or how the date was established when it prints none. */
  dated: string;
  where: string;
  /** Verbatim (text layer) or as read off the page image (scan) — said in `where`. */
  quote: string;
}

interface Target {
  code: string;
  values: Record<Field, number | string | null>;
  /** Which source backs which field. */
  basis: Partial<Record<Field, number[]>>;
  sources: Source[];
  /** Official question share per stored Subject code (report only). */
  subjectShare?: Record<string, number>;
  /** Ready for src/lib/pattern-verified.ts; null = one tuple cannot state it honestly. */
  verified: VerifiedPattern | null;
  verifiedNote?: string;
}

const NTA_JEE_IB = "https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2025/11/202511021649722475.pdf";
const NTA_NEET_IB = "https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/02/202602231394640855.pdf";
const ICSI_ANN = "https://www.icsi.edu/media/cms_uploads/announcement-restructured-cseet-6c26af2b.pdf";
const ICSI_714 = "https://www.icsi.edu/media/question_papers/714-june-2026.pdf";

const TARGETS: Target[] = [
  {
    code: "JEE_MAIN",
    values: {
      totalQuestions: 75,
      scoredQuestions: null,
      totalMarks: 300,
      marksPerQ: 4,
      negativeMark: 1,
      durationMin: 180,
      description:
        "Engineering entrance test conducted by the National Testing Agency in two sessions (January and April). Paper 1 (B.E./B.Tech.) is a computer-based test of 75 questions for 300 marks in 3 hours: in each of Mathematics, Physics and Chemistry, 20 multiple-choice questions (Section A) and 5 numerical-value questions (Section B). +4 for a correct answer, −1 for a wrong one, in both sections.",
    },
    basis: { totalQuestions: [0], totalMarks: [0], marksPerQ: [1], negativeMark: [1], durationMin: [2], description: [0, 1, 2, 3] },
    sources: [
      {
        url: NTA_JEE_IB,
        title: "JEE (Main) - 2026 Information Bulletin",
        publisher: "National Testing Agency",
        dated: "prints no date; PDF created 2025-11-02 (file metadata and upload path); linked on jeemain.nta.nic.in as 'Information Bulletin'",
        where: "2.4 Pattern of Examination, PDF page 17 (text layer)",
        quote:
          "Mathematics 20 05 100 / Physics 20 05 100 / Chemistry 20 05 100 / Total 75 300 — Each Subject will have two sections. Section A will be of Multiple-Choice Questions (MCQs) and Section B will contain Questions whose answers are to be filled in as a numerical value. There will be negative marking for incorrect answer in Section A and Section B.",
      },
      {
        url: NTA_JEE_IB,
        title: "JEE (Main) - 2026 Information Bulletin",
        publisher: "National Testing Agency",
        dated: "as above",
        where: "2.4.1 Multiple Choice Questions / 2.4.2 Numerical Value Questions, PDF page 21 (text layer)",
        quote: "1. Correct answer or the most appropriate answer: Four marks (+4) 2. Any incorrect option marked will be given minus one mark (-1) … 2.4.2 … 1. Correct Answer: Four marks (+4) 2. Incorrect Answer: Minus one mark (-1)",
      },
      {
        url: NTA_JEE_IB,
        title: "JEE (Main) - 2026 Information Bulletin",
        publisher: "National Testing Agency",
        dated: "as above",
        where: "2.5 Duration of Test, PDF page 21, and 2.3 Scheme of Examination for the mode (text layer)",
        quote: "Paper 1 (B.E. / B. Tech.) Physics, Chemistry, and Mathematics 03 hours [For Non-PwD/PwBD Candidates] — mode: \"Computer Based Test (CBT)\" mode only",
      },
      {
        url: NTA_JEE_IB,
        title: "JEE (Main) - 2026 Information Bulletin",
        publisher: "National Testing Agency",
        dated: "as above",
        where: "Note 1.3 item 2, PDF page 14 (text layer)",
        quote: "JEE (Main) - 2026 Session 1 for Paper 1 (B.E. / B. Tech.) will be held between 21 January and 30 January 2026 and Session 2 will be held between 02 April and 09 April 2026 tentatively.",
      },
    ],
    subjectShare: { PHYSICS: 25, CHEMISTRY: 25, MATHEMATICS: 25 },
    verified: {
      code: "JEE_MAIN",
      stage: "Paper 1 (B.E./B.Tech.)",
      questions: 75,
      marks: 300,
      durationMin: 180,
      negativePerWrong: 1,
      sections: [
        { name: "Mathematics", questions: 25, marks: 100 },
        { name: "Physics", questions: 25, marks: 100 },
        { name: "Chemistry", questions: 25, marks: 100 },
      ],
      languages:
        "thirteen languages i.e. English, Hindi, Assamese, Bengali, Gujarati, Kannada Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu and Urdu",
      source: {
        url: NTA_JEE_IB,
        publisher: "National Testing Agency",
        publisherShort: "NTA",
        title: "JEE (Main) - 2026 Information Bulletin",
        publishedOn: "2025-11-02",
        para: "2.4 Pattern of Examination; 2.4.1–2.4.2 marking; 2.5 Duration of Test",
      },
      checkedOn: "2026-09-27",
    },
    verifiedNote:
      "publishedOn 2025-11-02 is the PDF's creation date / upload path — the bulletin prints no date. The JEE (Main) 2026 FULL mocks hold 75 questions each (checked read-only 27 Sep), so a 'real pattern' mock claim stays true.",
  },
  {
    code: "NEET_UG",
    values: {
      totalQuestions: 180,
      scoredQuestions: null,
      totalMarks: 720,
      marksPerQ: 4,
      negativeMark: 1,
      durationMin: 180,
      description:
        "Single national entrance test for undergraduate medical, dental, AYUSH and allied programmes, conducted by the National Testing Agency in pen-and-paper mode. 180 compulsory questions for 720 marks in 180 minutes: Physics 45, Chemistry 45 and Biology (Botany & Zoology) 90. +4 for a correct answer, −1 for a wrong one.",
    },
    basis: { totalQuestions: [0], scoredQuestions: [0], totalMarks: [0], marksPerQ: [1], negativeMark: [1], durationMin: [0, 2], description: [0, 1, 2, 3] },
    sources: [
      {
        url: NTA_NEET_IB,
        title: "Information Bulletin NEET (UG)-2026",
        publisher: "National Testing Agency",
        dated: "prints no date; file path and PDF metadata 2026-02-23; linked on neet.nta.nic.in as 'Information Bulletin for NEET(UG)-2026'",
        where: "2. PATTERN OF THE TEST, PDF page 26 (text layer)",
        quote:
          "The Test pattern of NEET (UG) - 2026 comprises Physics, Chemistry, Biology (Botany & Zoology). The question paper will consist of 180 compulsory questions which must be attempted by the candidates in 180 minutes. (As per Letter CDN-20011/289/2024-Cordination-NMC dated 05.12.2025) — Physics 45 180 / Chemistry 45 180 / Biology (Botany & Zoology) 90 360 / Total 180 720",
      },
      {
        url: NTA_NEET_IB,
        title: "Information Bulletin NEET (UG)-2026",
        publisher: "National Testing Agency",
        dated: "as above",
        where: "3 IMPORTANT POINTS TO NOTE, PDF page 26 (text layer)",
        quote: "(i) Correct answer or the most appropriate answer: Four marks (+4) (ii) Any incorrect option marked will be given minus one mark (-1). (iii) Unanswered: No mark (0).",
      },
      {
        url: NTA_NEET_IB,
        title: "Information Bulletin NEET (UG)-2026",
        publisher: "National Testing Agency",
        dated: "as above",
        where: "4 MODE OF EXAMINATION and 5. DURATION OF TEST, PDF page 27 (text layer)",
        quote:
          "NEET (UG) – 2026 will be a single day/ single shift exam in PEN and PAPER mode as was conducted in 2025. … The duration of the test would be three (03) hours.",
      },
      {
        url: "https://cdnbbsr.s3waas.gov.in/s37bc1ec1d9c3426357e69acd5bf320061/uploads/2026/07/20260716477215762.pdf",
        title: "Press Release, 16 July 2026 — NTA Declares Result of NEET (UG) 2026",
        publisher: "National Testing Agency",
        dated: "16 July 2026 (printed)",
        where: "para 2 (text layer)",
        quote: "11.21 lakh candidates have qualified for admission to undergraduate medical, dental, AYUSH and allied programmes.",
      },
    ],
    subjectShare: { PHYSICS: 45, CHEMISTRY: 45, BIOLOGY: 90 },
    verified: {
      code: "NEET_UG",
      stage: "NEET (UG) 2026",
      questions: 180,
      marks: 720,
      durationMin: 180,
      negativePerWrong: 1,
      sections: [
        { name: "Physics", questions: 45, marks: 180 },
        { name: "Chemistry", questions: 45, marks: 180 },
        { name: "Biology (Botany & Zoology)", questions: 90, marks: 360 },
      ],
      languages: "English, Hindi, Assamese, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu and Urdu mediums",
      source: {
        url: NTA_NEET_IB,
        publisher: "National Testing Agency",
        publisherShort: "NTA",
        title: "Information Bulletin NEET (UG)-2026",
        publishedOn: "2026-02-23",
        para: "Chapter 3: 2. Pattern of the Test; 3. Important points to note; 5. Duration of Test",
      },
      checkedOn: "2026-09-27",
    },
    verifiedNote:
      "publishedOn 2026-02-23 is the file path / PDF metadata date — the bulletin prints no date. The 21 June 2026 re-examination ran 2:00–5:15 PM: NTA public notice 12 June 2026 (scan) says the 'examination window has been extended to 195 minutes … This includes the time required for mandatory examination formalities', so the test itself stays 180 minutes. CAUTION before adding this entry: the 12 NEET_UG FULL mocks hold 200 questions each (old pattern, checked read-only 27 Sep) — hub-faq's 'full-length mock in the NEET (UG) 2026 pattern: 180 questions' line would be false until those mocks are rebuilt or not called real-pattern.",
  },
  {
    code: "CA_FOUNDATION",
    values: {
      totalQuestions: 100,
      scoredQuestions: null,
      totalMarks: 100,
      marksPerQ: 1,
      negativeMark: 0.25,
      durationMin: 120,
      description:
        "Entry-level examination of the Institute of Chartered Accountants of India for the CA course (New Scheme of Education and Training). Four papers of 100 marks each: Paper 1 Accounting and Paper 2 Business Laws are subjective (3 hours each); Paper 3 Quantitative Aptitude (Business Mathematics, Logical Reasoning, Statistics) and Paper 4 Business Economics are objective — 100 multiple-choice questions in 2 hours, one mark each, 1/4 mark deducted for each wrong answer. Pass: 40% in each paper and 50% in aggregate at one sitting. Held three times a year — January, May and September.",
    },
    basis: { totalQuestions: [2], totalMarks: [2], marksPerQ: [2], negativeMark: [0, 2], durationMin: [1, 2], description: [0, 1, 2] },
    sources: [
      {
        url: "https://icai-call-sahayata.icai.org/wp-content/uploads/2024/10/CA-Courses-.pdf",
        title: "Frequently Asked Questions (FAQs) on New Scheme of Education and Training",
        publisher: "The Institute of Chartered Accountants of India",
        dated: "prints no date; upload path 2024/10",
        where: "Q 2.9, 2.11, 2.12, 2.13, 2.14 (text layer)",
        quote:
          "Paper 1: Accounting (100 marks) Paper 2: Business Laws (100 marks) Paper 3: Quantitative Aptitude (100 marks) - Business Mathematics - Logical Reasoning - Statistics Paper 4: Business Economics (100 marks) … Foundation Examinations are held thrice a year in the months of January, May and September. … Paper 1 & 2 are subjective type and Paper 3 & 4 are objective type. … Yes, there is negative marking of 0.25 mark for every wrong answer in objective type papers. … a minimum of 40% marks in each paper and a minimum of 50% marks in the aggregate of all the papers.",
      },
      {
        url: "https://resource.cdn.icai.org/92035exam020526.pdf",
        title: "Important Announcement No. 13-CA (EXAM)/SEPTEMBER – NOVEMBER/2026",
        publisher: "The Institute of Chartered Accountants of India (Examination Department)",
        dated: "2nd May 2026 (printed)",
        where: "timings table, p.1–2 (text layer)",
        quote: "Paper(s) 3 & 4 of Foundation Examination are of 2 hours duration. … Foundation Paper 1 & 2 2 PM to 5 PM 3 Hours / Paper 3 & 4* 2 PM to 4 PM 2 Hours",
      },
      {
        url: "https://resource.cdn.icai.org/91186exam-aps4305-mcq-jan2026-fnd-p4.pdf",
        title: "Foundation Paper-4 Business Economics, 24 Jan 2026 — Question Paper Booklet (MCQ paper and key, icai.org/post/exam-mcq-ques-and-key-jan2026-int-fnd)",
        publisher: "The Institute of Chartered Accountants of India",
        dated: "24 Jan 2026 (stamped on the booklet)",
        where: "General Instructions to Candidates, cover page (scan; read off the page image). Paper-3 booklet (…/91185exam-aps4305-mcq-jan2026-fnd-p3.pdf) prints the same instructions.",
        quote:
          "2. If the Question Paper Booklet does not contain 100 questions … 3. Duration of the test is 2 hours. … 9. For each correct answer, one mark will be awarded. For each wrong answer, 1/4th of the mark earmarked for each question will be deducted. … Time : 2 Hours  Maximum Marks : 100",
      },
    ],
    verified: null,
    verifiedNote:
      "Not proposed for PATTERN_VERIFIED: the stored tuple is Papers 3 and 4 alike, but their sections differ and no ICAI page read today states Paper 3's section marks; hub-faq would print an empty section list. Add per-paper entries only from ICAI's syllabus.",
  },
  {
    code: "CS_FOUNDATION",
    values: {
      totalQuestions: 100,
      scoredQuestions: null,
      totalMarks: 100,
      marksPerQ: 1,
      negativeMark: 0,
      durationMin: 120,
      description:
        "The Institute of Company Secretaries of India's Company Secretary Executive Entrance Test (CSEET), the entry test for the CS Executive Programme. Restructured from the June 2026 session: a centre-based test of four 100-mark papers on four days — Business Communication, Fundamentals of Accounting and Economic and Business Environment (subjective, 3 hours each) and Business Laws and Management (OMR-based, 2 hours: Business Laws 60 marks, Business Management 40 marks; 100 questions of one mark each, no negative marking). Pass: 40% in each paper and 50% in aggregate in one sitting. Held three times a year — February, June and October.",
    },
    basis: { totalQuestions: [1], totalMarks: [0, 1], marksPerQ: [1], negativeMark: [0, 1], durationMin: [0, 1], description: [0, 1] },
    sources: [
      {
        url: ICSI_ANN,
        title: "Important Announcement — Restructuring of Company Secretary Executive Entrance Test (CSEET) (Effective from June 2026 Session)",
        publisher: "The Institute of Company Secretaries of India",
        dated: "10.04.2026 (printed); listed on icsi.edu/students/restructured-cseet dated 08-09-2026",
        where: "(B), (O), (P), (Q), (I) (text layer)",
        quote:
          "The first session of restructured CSEET will be held in June 2026. … First Day Business Communication 100 Subjective 3 Hours / Second Day Fundamentals of Accounting 100 Subjective 3 Hours / Third Day Economic and Business Environment 100 Subjective 3 Hours / Fourth Day Business Laws and Management 100 OMR BASED 2 Hours — Business Laws -60 Marks, Business Management-40 Marks … a minimum of forty percent marks in each paper and fifty percent marks in the aggregate of all papers of CSEET … conducted at designated examination centres … There will be no negative marking in the OMR paper of CSEET i.e. Business Laws and Management. … CSEET to be conducted during First Week of February / First Week of June / First Week of October",
      },
      {
        url: ICSI_714,
        title: "CSEET June 2026 — Business Laws and Management (OMR Based), subject code 714, question paper",
        publisher: "The Institute of Company Secretaries of India",
        dated: "listed on icsi.edu/examination/previous-sessions-qps/june-2026 dated 30-07-2026",
        where: "cover page (scan; read off the page image)",
        quote:
          "Time allowed : 2 hours  Maximum marks : 100  Total number of questions : 100 … 4. This Question Paper Booklet contains 100 questions. All questions are compulsory and carry ONE mark each. There is no negative marking for wrong answers.",
      },
    ],
    verified: {
      code: "CS_FOUNDATION",
      stage: "Business Laws and Management (OMR paper)",
      questions: 100,
      marks: 100,
      durationMin: 120,
      negativePerWrong: 0,
      sections: [
        { name: "Business Laws (Part A)", questions: 60, marks: 60 },
        { name: "Business Management (Part B)", questions: 40, marks: 40 },
      ],
      languages: "not stated in the ICSI documents read on 27 Sep 2026 — fill from ICSI before adding",
      source: {
        url: ICSI_ANN,
        publisher: "The Institute of Company Secretaries of India",
        publisherShort: "ICSI",
        title: "Restructuring of Company Secretary Executive Entrance Test (CSEET) (Effective from June 2026 Session)",
        publishedOn: "2026-04-10",
        para: "(O) Details Subjects, Pattern of Examination, Marks and Duration; (Q)(iii)",
      },
      checkedOn: "2026-09-27",
    },
    verifiedNote:
      "Section question counts 60/40 follow from the announcement's 60/40 marks and the June 2026 booklet's 'carry ONE mark each' (its Part B starts at question 61). The languages field has no ICSI wording yet — do not add this entry until it does (hub-faq prints it verbatim). No CS_FOUNDATION mocks exist (checked read-only 27 Sep).",
  },
];

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

function same(field: Field, a: unknown, b: unknown): boolean {
  if (a === null || b === null || a === undefined || b === undefined) return a == null && b == null;
  if (field === "description") return a === b;
  return near(Number(a), Number(b));
}

const show = (v: unknown) => (v === null || v === undefined ? "null" : typeof v === "string" ? JSON.stringify(v) : String(v));

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "APPLY — writing only the differences below (compare-and-set)." : "DRY RUN — nothing is written. Pass --apply to write the differences below.");
  let changedRows = 0;
  let changedFields = 0;

  for (const t of TARGETS) {
    const row = await prisma.exam.findUnique({
      where: { code: t.code },
      select: {
        id: true,
        totalQuestions: true,
        scoredQuestions: true,
        totalMarks: true,
        marksPerQ: true,
        negativeMark: true,
        durationMin: true,
        description: true,
        subjects: { select: { code: true, weight: true } },
      },
    });
    console.log(`\n== ${t.code}`);
    if (!row) {
      console.log("   no Exam row — skipped");
      continue;
    }
    const tuple = (r: Record<string, unknown>) =>
      `${r.totalQuestions} Q (scored ${show(r.scoredQuestions)}) · ${r.totalMarks} marks · ${r.marksPerQ}/Q · −${r.negativeMark} · ${r.durationMin} min`;
    console.log(`   BEFORE ${tuple(row)}`);
    console.log(`   BEFORE description: ${show(row.description)}`);

    const diff: Partial<Record<Field, { from: unknown; to: unknown }>> = {};
    for (const f of FIELDS) {
      const cur = (row as Record<string, unknown>)[f];
      if (!same(f, cur, t.values[f])) diff[f] = { from: cur, to: t.values[f] };
    }
    const fields = Object.keys(diff) as Field[];
    if (fields.length === 0) {
      console.log("   already matches the official pattern — nothing to change.");
    }
    for (const f of fields) {
      const d = diff[f]!;
      console.log(`   CHANGE ${f}: ${show(d.from)} -> ${show(d.to)}`);
      for (const i of t.basis[f] ?? []) {
        const s = t.sources[i];
        console.log(`      source: ${s.publisher} — ${s.title} [${s.dated}] ${s.url}`);
        console.log(`      at ${s.where}: "${s.quote}"`);
      }
    }
    if (fields.length > 0) {
      const after = { ...row, ...Object.fromEntries(fields.map((f) => [f, t.values[f]])) };
      console.log(`   AFTER  ${tuple(after)}`);
      if (diff.description) console.log(`   AFTER  description: ${show(t.values.description)}`);
    }

    // Subject weights: report only.
    if (t.subjectShare) {
      const total = Object.values(t.subjectShare).reduce((a, b) => a + b, 0);
      const wTotal = row.subjects.reduce((a, s) => a + s.weight, 0);
      const verdicts = Object.entries(t.subjectShare).map(([code, q]) => {
        const s = row.subjects.find((x) => x.code === code);
        if (!s || wTotal <= 0) return `${code}: no stored subject`;
        const ok = Math.abs(s.weight / wTotal - q / total) < 0.005;
        return `${code} ${ok ? "ok" : `DIFFERS (stored share ${(s.weight / wTotal).toFixed(3)}, official ${(q / total).toFixed(3)})`}`;
      });
      console.log(`   subjects (report only, not written): ${verdicts.join("; ")}`);
    }

    if (!apply || fields.length === 0) continue;
    // Compare-and-set: every changed column must still hold the value read above.
    const where: Record<string, unknown> = { id: row.id };
    for (const f of fields) {
      const from = diff[f]!.from;
      if (from === null || from === undefined) where[f] = null;
      else if (f === "description") where[f] = from;
      else where[f] = { gte: Number(from) - 1e-9, lte: Number(from) + 1e-9 };
    }
    const data = Object.fromEntries(fields.map((f) => [f, t.values[f]]));
    const res = await prisma.exam.updateMany({ where, data });
    if (res.count === 1) {
      changedRows++;
      changedFields += fields.length;
      console.log(`   WROTE ${fields.join(", ")}`);
    } else {
      console.log("   SKIPPED — the row changed after it was read; re-run the dry run.");
    }
  }

  console.log("\n== PATTERN_VERIFIED entries for src/lib/pattern-verified.ts (NOT written by this script)");
  for (const t of TARGETS) {
    console.log(`\n// ${t.code}${t.verifiedNote ? ` — ${t.verifiedNote}` : ""}`);
    console.log(t.verified ? `${t.code}: ${JSON.stringify(t.verified, null, 2)},` : "(no entry proposed)");
  }

  if (apply) {
    const after = await prisma.exam.findMany({
      where: { code: { in: TARGETS.map((t) => t.code) } },
      select: { code: true, totalQuestions: true, scoredQuestions: true, totalMarks: true, marksPerQ: true, negativeMark: true, durationMin: true },
      orderBy: { code: "asc" },
    });
    console.log("\n== AFTER (re-read)");
    for (const a of after) console.log(`   ${a.code}: ${a.totalQuestions} Q (scored ${show(a.scoredQuestions)}) · ${a.totalMarks} marks · ${a.marksPerQ}/Q · −${a.negativeMark} · ${a.durationMin} min`);
    console.log(`\nWrote ${changedFields} fields on ${changedRows} rows.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
