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
// Adding an exam: open the body's notice (not a coaching page), copy the
// scheme exactly, cite the URL, the paragraph and the notice's own date, and
// the day you read it. Candidates not yet read (their official PDFs refused
// the 26 Sep fetch): JEE_MAIN (NTA bulletin), UPSC_PRELIMS (GS Paper I, UPSC
// notice 05/2026-CSE).

export interface VerifiedSection {
  name: string;
  questions: number;
  marks: number;
}

export interface VerifiedPattern {
  code: string;
  /** The stage the stored Exam row describes, as the notice names it. */
  stage: string;
  questions: number;
  marks: number;
  durationMin: number;
  /** Marks deducted per wrong answer; 0 = none. */
  negativePerWrong: number;
  sections: readonly VerifiedSection[];
  /** The notice's own words on the question paper's language. */
  languages: string;
  source: {
    url: string;
    publisher: string;
    /** Short name of the body for "(SSC notice, 21 May 2026)". */
    publisherShort: string;
    title: string;
    /** YYYY-MM-DD the notice is dated. */
    publishedOn: string;
    /** Where in the notice. */
    para: string;
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

/** "SSC notice, 21 May 2026" — the citation every pattern sentence carries. */
export function patternCitation(v: VerifiedPattern): string {
  return `${v.source.publisherShort} notice, ${isoDayText(v.source.publishedOn)}`;
}

/** The one-sentence pattern answer: "Tier-I: 100 questions, 200 marks, 60
 *  minutes, −0.5 per wrong answer (SSC notice, 21 May 2026)." */
export function patternSentence(v: VerifiedPattern): string {
  const neg = v.negativePerWrong > 0 ? `, −${markText(v.negativePerWrong)} per wrong answer` : ", no negative marking";
  return `${v.stage}: ${v.questions} questions, ${v.marks} marks, ${v.durationMin} minutes${neg} (${patternCitation(v)}).`;
}
