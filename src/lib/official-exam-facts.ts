// Official facts for the national / PG exams added on 27 Sep 2026 — the
// pattern's source, the official syllabus link and the eligibility source,
// read from data/national-exams-2026.json (every fact there was read on the
// conducting body's own host, with the URL and the exact words;
// scripts/add-national-exams.ts wrote the Exam, ExamEligibility and tracker
// rows from the same file).
//
// Why: an exam hub with no practice questions (src/lib/exam-practice-state.ts)
// shows official facts instead of practice promises, and a fact is printed
// only with its source. The Exam row's pattern columns carry no source, so
// pattern numbers appear only while the stored row still agrees with this
// file (officialPattern below — the src/lib/pattern-verified.ts idea for
// these exams: a row edited later silently drops back to "no numbers").
// The GATE papers share one organiser page; their scheme is the one
// scripts/national-exams-plan.ts gateSpec() writes (tests/unit/
// official-exam-facts.test.ts checks every code against that script).
//
// Pure — no DB, no network. A code not in the file has no facts (null).

import nationalExams from "../../data/national-exams-2026.json";

interface JsonExam {
  code: string;
  gatePaper?: { paperCode: string; paperName: string; hasEngineeringMath: boolean };
  exam?: {
    totalQuestions: number;
    scoredQuestions: number | null;
    totalMarks: number;
    durationMin: number;
    marksPerQ: number;
    negativeMark: number;
  };
  pattern?: { stage: string; url: string; source?: string };
  eligibility?: { officialUrl: string; officialName: string; sources: { url: string }[] };
  syllabus?: { url: string };
}

interface JsonFile {
  _meta: { readOn: string };
  exams: JsonExam[];
  gateCommon: { organiser: string; officialUrl: string; patternUrl: string; eligibilityUrl: string; syllabusUrlPattern: string };
}

const FILE = nationalExams as unknown as JsonFile;

export interface OfficialPatternNumbers {
  totalQuestions: number;
  scoredQuestions: number | null;
  totalMarks: number;
  durationMin: number;
  marksPerQ: number;
  negativeMark: number;
}

export interface OfficialExamFacts {
  code: string;
  /** YYYY-MM-DD (IST) the official pages were read. */
  readOn: string;
  officialName: string;
  officialUrl: string;
  pattern: {
    /** The stage the stored row describes, as the notice names it ("Paper-I"). */
    stage: string;
    url: string;
    /** The document's own title, when the file names it. */
    source: string | null;
    numbers: OfficialPatternNumbers;
  };
  syllabusUrl: string | null;
  eligibilitySourceUrl: string | null;
}

/** GATE 2027: one scheme for every paper (scripts/national-exams-plan.ts gateSpec). */
const GATE_NUMBERS: OfficialPatternNumbers = {
  totalQuestions: 65,
  scoredQuestions: null,
  totalMarks: 100,
  durationMin: 180,
  marksPerQ: 1,
  negativeMark: 1 / 3,
};

/** "Paper-I" from "Paper-I — …"; the document title without "(linked from …)". */
const firstClause = (s: string): string => s.split(" — ")[0].trim();
const sourceTitle = (s: string | undefined): string | null => (s ? s.replace(/\s*\(linked from [^)]*\)\s*$/i, "").trim() || null : null);

function build(e: JsonExam): OfficialExamFacts | null {
  const readOn = FILE._meta.readOn;
  if (e.gatePaper) {
    const g = FILE.gateCommon;
    return {
      code: e.code,
      readOn,
      officialName: g.organiser,
      officialUrl: g.officialUrl,
      pattern: { stage: `${e.gatePaper.paperCode} paper`, url: g.patternUrl, source: "GATE 2027 Question Paper Pattern (IIT Madras)", numbers: GATE_NUMBERS },
      syllabusUrl: g.syllabusUrlPattern.replace("{PAPER}", e.gatePaper.paperCode),
      eligibilitySourceUrl: g.eligibilityUrl,
    };
  }
  if (!e.exam || !e.pattern || !e.eligibility) return null;
  return {
    code: e.code,
    readOn,
    officialName: e.eligibility.officialName,
    officialUrl: e.eligibility.officialUrl,
    pattern: {
      stage: firstClause(e.pattern.stage),
      url: e.pattern.url,
      source: sourceTitle(e.pattern.source),
      numbers: {
        totalQuestions: e.exam.totalQuestions,
        scoredQuestions: e.exam.scoredQuestions ?? null,
        totalMarks: e.exam.totalMarks,
        durationMin: e.exam.durationMin,
        marksPerQ: e.exam.marksPerQ,
        negativeMark: e.exam.negativeMark,
      },
    },
    syllabusUrl: e.syllabus?.url ?? null,
    eligibilitySourceUrl: e.eligibility.sources[0]?.url ?? null,
  };
}

const BY_CODE: ReadonlyMap<string, OfficialExamFacts> = new Map(
  FILE.exams.map((e) => [e.code, build(e)] as const).filter((x): x is [string, OfficialExamFacts] => x[1] !== null),
);

/** The official facts for this exam, or null when the file has none. */
export function officialExamFacts(code: string): OfficialExamFacts | null {
  return BY_CODE.get(code) ?? null;
}

/** Every code the file holds facts for. */
export function officialFactCodes(): string[] {
  return [...BY_CODE.keys()];
}

export interface StoredPatternRow {
  totalQuestions: number;
  totalMarks: number;
  durationMin: number;
  marksPerQ: number;
  negativeMark: number;
}

const close = (a: number, b: number) => Math.abs(Number(a) - Number(b)) < 0.005;

/** The official pattern, only while the stored Exam row agrees with it on
 *  every number; null otherwise (no pattern numbers are printed). */
export function officialPattern(code: string, stored: StoredPatternRow | null | undefined): OfficialExamFacts["pattern"] | null {
  const f = officialExamFacts(code);
  if (!f || !stored) return null;
  const n = f.pattern.numbers;
  const agrees =
    close(stored.totalQuestions, n.totalQuestions) &&
    close(stored.totalMarks, n.totalMarks) &&
    close(stored.durationMin, n.durationMin) &&
    close(stored.marksPerQ, n.marksPerQ) &&
    close(stored.negativeMark, n.negativeMark);
  return agrees ? f.pattern : null;
}

/** "−1/3", "−0.25", "−1" — a deduction as a notice prints it. */
function deduction(n: number): string {
  if (Math.abs(n - 1 / 3) < 1e-6) return "1/3";
  if (Math.abs(n - 2 / 3) < 1e-6) return "2/3";
  return String(Math.round(n * 100) / 100);
}

/**
 * "Paper-I: 100 questions, 100 marks, 60 minutes, −0.25 per wrong answer." A
 * paper whose questions carry different marks (GATE, JAM: marksPerQ × questions
 * ≠ total marks) states no per-answer mark — the notice's scheme is per
 * question type, and the source link says it.
 */
export function officialPatternSentence(p: OfficialExamFacts["pattern"]): string {
  const n = p.numbers;
  const qs =
    n.scoredQuestions != null && n.scoredQuestions < n.totalQuestions
      ? `${n.totalQuestions} questions (${n.scoredQuestions} of them scored)`
      : `${n.totalQuestions} questions`;
  const uniform = close(n.marksPerQ * (n.scoredQuestions ?? n.totalQuestions), n.totalMarks);
  const marking = !uniform
    ? "; marks and negative marking differ by question type"
    : n.negativeMark > 0
      ? `, −${deduction(n.negativeMark)} per wrong answer`
      : ", no negative marking";
  return `${p.stage}: ${qs}, ${n.totalMarks} marks, ${n.durationMin} minutes${marking}.`;
}
