// Exam patterns read by hand from the conducting body's own notice
// (26 Sep 2026, discoverability wave 2 G3).
//
// Why a list: the Exam row's pattern columns (totalQuestions, totalMarks,
// durationMin, marksPerQ, negativeMark) carry no source and are never null.
// The 26 Sep critic read found 17 unrelated exams sharing one default-looking
// tuple and 46 of 180 multi-stage exams that one tuple cannot describe; the
// G3 probe (scripts/tmp-w2-g3-probe.ts) found NEET_UG stored as 200 questions
// / 200 minutes and CA_FOUNDATION (four papers) as one 100-question paper.
// Answer engines lift a page's first sentence verbatim, so pattern NUMBERS
// appear in an answer lead, a meta description, a visible FAQ answer or the
// syllabus pattern table ONLY for an exam listed here — and only while the
// stored row still agrees with what the notice says (verifiedPattern). A
// stored row edited later silently drops the exam back to "no numbers".
//
// 29 Sep 2026: four more exams, each read twice from the body's own
// document (the second reading made without trusting the first; files in the
// session's official-reading folder): TNPSC Group I, UPSSSC PET, APPSC
// Group II and IOQM. They showed what one tuple cannot say, so the shape
// grew: a section may print its questions or its marks and not both (null =
// not printed in the notice, never shown as 0); a deduction may be worded,
// not a number ("1/3rd of the marks prescribed for the question"; TNPSC cuts
// 0.5 mark for a BLANK answer and prints none for a wrong one); a document
// may carry no date (the olympiad brochure) or be a scan read by AI; and the
// paper's answer format may differ from Shishya's practice questions (IOQM
// asks for an integer, with no options) — then no page claims the paper's
// pattern for them.
//
// Adding an exam: open the body's notice (not a coaching page), copy the
// scheme exactly, cite the URL, the paragraph and the notice's own date, and
// the day you read it. Candidates not yet read (their official PDFs refused
// the 26 Sep fetch): JEE_MAIN (NTA bulletin), UPSC_PRELIMS (GS Paper I, UPSC
// notice 05/2026-CSE).

export interface VerifiedSection {
  name: string;
  /** null = the notice does not print it. */
  questions: number | null;
  /** null = the notice does not print it. */
  marks: number | null;
}

export interface VerifiedPattern {
  code: string;
  /** The stage the stored Exam row describes, as the notice names it. */
  stage: string;
  questions: number;
  marks: number;
  durationMin: number;
  /** Marks deducted per wrong answer; 0 = none printed. The number the
   *  stored Exam row is compared with. */
  negativePerWrong: number;
  /** The deduction as the notice words it, when a bare number would say less
   *  or something else. Printed in place of "−x per wrong answer" / "no
   *  negative marking". */
  negativeText?: string;
  /** How an answer is given, when it is not a choice among options. */
  answerFormat?: string;
  /** How the marks are spread, when questions do not all carry the same. */
  marksNote?: string;
  /** Shishya's practice questions for this exam are in another format than
   *  the paper: no page says they follow the paper's pattern. */
  practiceFormatDiffers?: boolean;
  /** May be empty: the notice names no sections. */
  sections: readonly VerifiedSection[];
  /** The notice's own words on the question paper's language; "" = not stated. */
  languages: string;
  source: {
    url: string;
    publisher: string;
    /** Short name of the body for "(SSC notice, 21 May 2026)". */
    publisherShort: string;
    title: string;
    /** YYYY-MM-DD the notice is dated; "" = the document prints no date. */
    publishedOn: string;
    /** Where in the notice. */
    para: string;
    /** What the body calls the document; "notice" when absent. */
    kind?: "notice" | "advertisement" | "brochure";
    /** The PDF is an image with no text layer: read by AI, twice. */
    scanned?: boolean;
  };
  /** YYYY-MM-DD (IST) the notice was read against the stored row. */
  checkedOn: string;
}

export const PATTERN_VERIFIED: Readonly<Record<string, VerifiedPattern>> = {
  SSC_CGL: {
    code: "SSC_CGL",
    stage: "Tier-I",
    questions: 100,
    marks: 200,
    durationMin: 60,
    negativePerWrong: 0.5,
    sections: [
      { name: "General Intelligence and Reasoning", questions: 25, marks: 50 },
      { name: "General Awareness", questions: 25, marks: 50 },
      { name: "Quantitative Aptitude", questions: 25, marks: 50 },
      { name: "English Comprehension", questions: 25, marks: 50 },
    ],
    languages: "English and Hindi, except English Comprehension",
    source: {
      url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2026.pdf",
      publisher: "Staff Selection Commission",
      publisherShort: "SSC",
      title: "Combined Graduate Level Examination, 2026 — Notice",
      publishedOn: "2026-05-21",
      para: "13.8 Scheme of Tier-I Examination",
    },
    checkedOn: "2026-09-26",
  },
  TN_TNPSC_GROUP1: {
    code: "TN_TNPSC_GROUP1",
    stage: "Preliminary Examination",
    questions: 200,
    marks: 300,
    durationMin: 180,
    negativePerWrong: 0,
    negativeText: "no deduction printed for a wrong answer; 0.5 mark is deducted if a question is left blank",
    sections: [
      { name: "General Studies (Degree Standard)", questions: 175, marks: null },
      { name: "Aptitude and Mental Ability (SSLC Standard)", questions: 25, marks: null },
    ],
    languages: "Tamil and English",
    source: {
      url: "https://tnpsc.gov.in/document/english/Group%20I%20Notification%202026_E.pdf",
      publisher: "Tamil Nadu Public Service Commission",
      publisherShort: "TNPSC",
      title: "Combined Civil Services Examination - I (Group I Services) — Notification No. 05/2026",
      publishedOn: "2026-06-23",
      para: "para 6.1 Scheme of Examination; deductions in Annexure IV, para 1.11.3",
    },
    checkedOn: "2026-09-29",
  },
  UP_UPSSSC_PET: {
    code: "UP_UPSSSC_PET",
    stage: "Preliminary Eligibility Test",
    questions: 100,
    marks: 100,
    durationMin: 120,
    negativePerWrong: 0.25,
    sections: [
      { name: "Indian History", questions: null, marks: 5 },
      { name: "Indian National Movement", questions: null, marks: 5 },
      { name: "Geography", questions: null, marks: 5 },
      { name: "Indian Economy", questions: null, marks: 5 },
      { name: "Indian Constitution and Public Administration", questions: null, marks: 5 },
      { name: "General Science", questions: null, marks: 5 },
      { name: "Elementary Arithmetic", questions: null, marks: 5 },
      { name: "General Hindi", questions: null, marks: 5 },
      { name: "General English", questions: null, marks: 5 },
      { name: "Logic and Reasoning", questions: null, marks: 5 },
      { name: "Current Affairs", questions: null, marks: 10 },
      { name: "General Awareness", questions: null, marks: 10 },
      { name: "Unseen Hindi passage (2 passages)", questions: 10, marks: 10 },
      { name: "Graph interpretation (2 graphs)", questions: 10, marks: 10 },
      { name: "Table interpretation (2 tables)", questions: 10, marks: 10 },
    ],
    languages: "",
    source: {
      url: "https://upsssc.gov.in/ViewPdf.aspx?tOQhA8AoFpUkdSk5J2hr0lU0H14+rIaUtQroTArbIsw=",
      publisher: "Uttar Pradesh Subordinate Services Selection Commission",
      publisherShort: "UPSSSC",
      title: "Preliminary Eligibility Test (PET)-2026 — Advertisement No. 16-Exam/2026",
      publishedOn: "2026-08-01",
      para: "para 10, scheme and syllabus, pages 7–11",
      kind: "advertisement",
      scanned: true,
    },
    checkedOn: "2026-09-29",
  },
  AP_APPSC_GROUP2: {
    code: "AP_APPSC_GROUP2",
    stage: "Screening Test",
    questions: 150,
    marks: 150,
    durationMin: 150,
    negativePerWrong: 0.3333,
    negativeText: "each wrong answer is penalised with 1/3rd of the marks prescribed for the question",
    sections: [
      { name: "Indian History", questions: null, marks: 30 },
      { name: "Geography", questions: null, marks: 30 },
      { name: "Indian Society", questions: null, marks: 30 },
      { name: "Current Affairs", questions: null, marks: 30 },
      { name: "Mental Ability", questions: null, marks: 30 },
    ],
    languages: "English, translated into Telugu",
    source: {
      url: "https://psc.ap.gov.in/Documents/NotificationDocuments/Notfn_%20Group-II_2023%20with%20Syllabus_112023_07122023.pdf",
      publisher: "Andhra Pradesh Public Service Commission",
      publisherShort: "APPSC",
      title: "Group-II Services — Notification No. 11/2023",
      publishedOn: "2023-12-07",
      para: "Scheme for Screening Test, page 5",
    },
    checkedOn: "2026-09-29",
  },
  IOQM: {
    code: "IOQM",
    stage: "Stage 1",
    questions: 30,
    marks: 100,
    durationMin: 180,
    negativePerWrong: 0,
    answerFormat: "each answer is an integer from 00 to 99, marked on an OMR sheet; there are no options to choose from",
    marksNote: "10 questions carry 2 marks each, 10 carry 3 marks and 10 carry 5 marks",
    practiceFormatDiffers: true,
    sections: [],
    languages: "English and Hindi",
    source: {
      url: "https://olympiads.hbcse.tifr.res.in/wp-content/uploads/2026/09/Brochure-Maths-Olympiad-2026-27-1.pdf",
      publisher: "Homi Bhabha Centre for Science Education (TIFR)",
      publisherShort: "HBCSE",
      title: "Mathematical Olympiads 2026–2027 — Brochure",
      publishedOn: "",
      para: "Stage 1, printed page 3",
      kind: "brochure",
    },
    checkedOn: "2026-09-29",
  },
};

export interface StoredPattern {
  code: string;
  totalQuestions: number;
  totalMarks: number;
  durationMin: number;
  negativeMark: number;
}

const close = (a: number, b: number) => Math.abs(Number(a) - Number(b)) < 0.005;

/** The verified pattern for this exam, only while the stored row agrees with
 *  it on every number; null otherwise (no pattern numbers are printed). */
export function verifiedPattern(exam: StoredPattern | null | undefined): VerifiedPattern | null {
  if (!exam) return null;
  const v = PATTERN_VERIFIED[exam.code];
  if (!v) return null;
  const agrees =
    close(exam.totalQuestions, v.questions) &&
    close(exam.totalMarks, v.marks) &&
    close(exam.durationMin, v.durationMin) &&
    close(exam.negativeMark, v.negativePerWrong);
  return agrees ? v : null;
}

/** "0.5", "1", "0.25" — a mark as a notice prints it, without trailing zeros. */
export function markText(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** "21 May 2026" from a YYYY-MM-DD string (no timezone shift). */
export function isoDayText(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "SSC notice, 21 May 2026" — the citation every pattern sentence carries.
 *  A document that prints no date is cited by the day it was read. */
export function patternCitation(v: VerifiedPattern): string {
  const doc = `${v.source.publisherShort} ${v.source.kind ?? "notice"}`;
  return v.source.publishedOn ? `${doc}, ${isoDayText(v.source.publishedOn)}` : `${doc}, read ${isoDayText(v.checkedOn)}`;
}

/** "−0.5 per wrong answer", "no negative marking", or the notice's own wording. */
export function negativeMarkingText(v: VerifiedPattern): string {
  if (v.negativeText) return v.negativeText;
  return v.negativePerWrong > 0 ? `−${markText(v.negativePerWrong)} per wrong answer` : "no negative marking";
}

/** "General Awareness 25 questions (50 marks)", "Indian History (5 marks)",
 *  "General Studies 175 questions" — only what the notice prints. */
export function sectionText(s: VerifiedSection): string {
  const q = s.questions != null ? ` ${s.questions} questions` : "";
  const m = s.marks != null ? ` (${s.marks} marks)` : "";
  return `${s.name}${q}${m}`;
}

/** The one-sentence pattern answer: "Tier-I: 100 questions, 200 marks, 60
 *  minutes, −0.5 per wrong answer (SSC notice, 21 May 2026)." */
export function patternSentence(v: VerifiedPattern): string {
  const format = v.answerFormat ? `; ${v.answerFormat}` : "";
  return `${v.stage}: ${v.questions} questions, ${v.marks} marks, ${v.durationMin} minutes, ${negativeMarkingText(v)}${format} (${patternCitation(v)}).`;
}
