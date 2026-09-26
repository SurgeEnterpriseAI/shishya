// Practice state of an exam (27 Sep 2026) — ONE rule for every surface that
// promises mock tests, previous year paper practice or "practice" of any kind
// for an exam: the hub (/exams/{code}) body, its title, meta description,
// keywords and Course JSON-LD, ExamFaq and the hub's own FAQ questions, the
// practice boxes on /updates, /cutoff, /syllabus and /guide, the per-exam
// context.md, llms-full.txt, the sitemap and the site search.
//
// Why: on 27 Sep 2026 twelve live hubs (AILET, CA_FOUNDATION, CMI_ADMISSION,
// CS_FOUNDATION, ISI_BSTAT, LSAT_INDIA, NATA, NEET_PG, NID_DAT, NIFT,
// RBI_GRADE_B, UCEED) and the fourteen national / PG exams created inactive
// that night (scripts/add-national-exams.ts) held no checked question and no
// shared mock (read-only probe, 27 Sep). Their pages still said "Every {exam}
// mock test, PYQ-pattern paper and study tool on Shishya is completely free"
// (FAQ + FAQPage JSON-LD), "Take a free {exam} mock" (/updates, /cutoff),
// "A free diagnostic mock maps your weak topics" (/syllabus), "Practice is one
// tap away" (tracker description), "a free day-by-day coach plan" (whose menu
// is a full mock and a Daily 5 — both empty for such an exam), rendered empty
// "Previous year papers", "Mock tests", "Your rank" and "Syllabus" sections,
// and listed "Hub (mocks, previous year paper practice …)" in context.md and
// llms-full.txt.
//
// The rule: an exam HAS PRACTICE when it holds at least one validated
// (checked) question or one shared (system, non-live-test) mock — what the
// search's and the home catalogue's `live` flag and the hub's "Mock Tests"
// empty state already meant. A withdrawn question is validated=false
// (src/lib/question-withdrawn.ts), so it never counts.
//
// An exam with no practice gets, instead of practice promises: the official
// facts with their sources (src/lib/official-exam-facts.ts), one plain line
// that there are no practice questions yet (27 Sep 2026 fixer: not "being
// written" — nothing writes them), the AI tutor line, and links to
// related exams that DO have practice (relatedPracticeExams below).
//
// Pure — no DB, no i18n dictionary. The cached per-exam map lives in
// src/lib/db/exam-practice.ts. Tests: tests/unit/exam-practice-state.test.ts.

export interface PracticeCounts {
  /** Validated questions of the exam (the hub's validatedQuestionCount). */
  questions: number;
  /** Shared (system) mocks, live-test papers excluded (the hub's systemMocks). */
  systemMocks: number;
}

export interface ExamPracticeState {
  /** At least one checked question or shared mock. */
  hasPractice: boolean;
  questions: number;
  systemMocks: number;
}

export const NO_PRACTICE: ExamPracticeState = Object.freeze({ hasPractice: false, questions: 0, systemMocks: 0 });

const count = (n: unknown): number => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/** The rule. Anything that is not a positive finite count is 0. */
export function practiceStateFromCounts(c: Partial<PracticeCounts> | null | undefined): ExamPracticeState {
  const questions = count(c?.questions);
  const systemMocks = count(c?.systemMocks);
  return { hasPractice: questions > 0 || systemMocks > 0, questions, systemMocks };
}

// ── Related exams that DO have practice ─────────────────────────────────

export interface PracticeCatalogRow {
  code: string;
  shortName: string;
  category: string;
  state: string | null;
  candidatesPerYear: number | null;
  practice: ExamPracticeState;
}

/**
 * Hand-picked kin for exams whose own family (code prefix) or category holds
 * nothing a student of that exam would practise from. An empty list means
 * "no related links" — better none than an unrelated one (NEET UG questions
 * are no preparation for NEET PG; CUET UG none for a design test). Codes
 * without practice are dropped at read time, so a kin that gains questions
 * later appears by itself.
 */
export const PRACTICE_KIN: Readonly<Record<string, readonly string[]>> = {
  // Law entrance: the state law CETs are the law-aptitude practice on Shishya.
  CLAT: ["MH_MAHCET_LAW", "AP_LAWCET", "TS_LAWCET"],
  AILET: ["MH_MAHCET_LAW", "AP_LAWCET", "TS_LAWCET"],
  LSAT_INDIA: ["MH_MAHCET_LAW", "AP_LAWCET", "TS_LAWCET"],
  // BITS admission test: the same Class 11-12 physics, chemistry and maths.
  BITSAT: ["JEE_MAIN", "JEE_ADVANCED"],
  // NATA's B.Arch aspirants also sit JEE Main Paper 2A.
  NATA: ["JEE_MAIN"],
  // ISI and CMI entrance: olympiad-style mathematics.
  ISI_BSTAT: ["JEE_ADVANCED", "IOQM"],
  CMI_ADMISSION: ["JEE_ADVANCED", "IOQM"],
  // RBI Grade B: the bank officer exams' reasoning, quant and English.
  RBI_GRADE_B: ["SBI_PO", "IBPS_PO"],
  // No honest kin on Shishya today.
  NEET_PG: [],
  NID_DAT: [],
  NIFT: [],
  UCEED: [],
  CA_FOUNDATION: [],
  CS_FOUNDATION: [],
  IIT_JAM: [],
  CSIR_NET: [],
  JNVST: [],
};

/** "SSC_JE" → "SSC_"; "GATE_ME" → "GATE_"; state codes ("UP_UPCET") → null. */
function familyPrefix(code: string, state: string | null): string | null {
  if (state) return null; // a state exam's first token is its state, not a family
  const m = /^([A-Z]+)_/.exec(code);
  return m ? `${m[1]}_` : null;
}

/**
 * Up to `max` exams with practice, related to `code`, most relevant first
 * (none at all for an exam whose PRACTICE_KIN entry is empty):
 *   1. the same code family ("SSC_JE" → SSC CGL, SSC CHSL …; "GATE_ME" →
 *      GATE CSE), a national exam only;
 *   2. the hand-picked kin (PRACTICE_KIN);
 *   3. only when both are empty and the exam has no PRACTICE_KIN entry: the
 *      same category — the same state first for a state exam.
 * Within a step, larger candidatesPerYear first, then code. Never the exam
 * itself; never an exam without practice.
 */
export function relatedPracticeExams(code: string, rows: readonly PracticeCatalogRow[], max = 4): PracticeCatalogRow[] {
  const kin = PRACTICE_KIN[code];
  if (kin && kin.length === 0) return []; // an explicit "no honest kin" beats the family too (NEET PG ≠ NEET UG)
  const self = rows.find((r) => r.code === code) ?? null;
  const pool = rows.filter((r) => r.code !== code && r.practice.hasPractice);
  const bySize = (a: PracticeCatalogRow, b: PracticeCatalogRow) =>
    (b.candidatesPerYear ?? 0) - (a.candidatesPerYear ?? 0) || a.code.localeCompare(b.code);
  const out: PracticeCatalogRow[] = [];
  const add = (list: readonly PracticeCatalogRow[]) => {
    for (const r of list) if (out.length < max && !out.some((o) => o.code === r.code)) out.push(r);
  };
  const prefix = familyPrefix(code, self?.state ?? null);
  if (prefix) add(pool.filter((r) => !r.state && r.code.startsWith(prefix)).sort(bySize));
  if (kin) add(kin.map((k) => pool.find((r) => r.code === k)).filter((r): r is PracticeCatalogRow => !!r));
  if (out.length === 0 && kin === undefined && self) {
    const same = pool.filter((r) => r.category === self.category);
    add(same.filter((r) => self.state != null && r.state === self.state).sort(bySize));
    add(same.filter((r) => !(self.state != null && r.state === self.state)).sort(bySize));
  }
  return out;
}
