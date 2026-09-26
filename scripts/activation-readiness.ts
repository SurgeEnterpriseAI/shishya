// Pure readiness check for scripts/activate-national-exams.ts (27 Sep 2026).
// No DB, no network — tests/unit/activate-national-exams.test.ts.
//
// An exam from data/national-exams-2026.json may go live (Exam.active = true)
// only when its hub can stand on official facts alone — it has no practice
// question, so the hub shows the official-facts panel instead
// (src/lib/exam-practice-state.ts, src/lib/no-practice-copy.ts):
//   1. the Exam row exists and is a real exam (not a school container);
//   2. ExamEligibility.officialUrl is an https URL (the conducting body's site);
//   3. the stored pattern agrees with the official research on every number
//      (src/lib/official-exam-facts.ts officialPattern) — the panel prints the
//      pattern with its source only then;
//   4. at least one live tracker row at the OFFICIAL tier (the conducting
//      body's own notice linked — src/lib/official-source.ts sourceTier), or an
//      official syllabus link.
// Never, whatever the checks say (the data lane's call, 27 Sep 2026):
//   CSIR_NET — the Exam row holds ONE subject's scheme (Life Sciences 703);
//              the other four subjects' papers differ;
//   JNVST    — candidates are 9–11 years old; the standing school-expansion
//              decision needs child consent and the minors sign-off first.

import { officialExamFacts, officialPattern, type StoredPatternRow } from "../src/lib/official-exam-facts";

export const NEVER_ACTIVATE: Readonly<Record<string, string>> = {
  CSIR_NET: "the Exam row holds one subject's scheme (Life Sciences 703); the other four CSIR NET papers differ",
  JNVST: "candidates are 9–11 years old — child consent and the minors sign-off come first",
};

export interface ReadinessInput {
  code: string;
  /** The Exam row as stored; null when there is none. */
  row: (StoredPatternRow & { active: boolean; category: string }) | null;
  /** ExamEligibility.officialUrl. */
  officialUrl: string | null;
  /** Live (non-archived) tracker rows whose tier is "official". */
  officialDates: number;
}

export interface ReadinessVerdict {
  code: string;
  /** Passes every check and is not active yet — --apply activates it. */
  ready: boolean;
  alreadyActive: boolean;
  passes: string[];
  fails: string[];
}

const host = (u: string): string => {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
};

export function activationReadiness(i: ReadinessInput): ReadinessVerdict {
  const passes: string[] = [];
  const fails: string[] = [];
  const never = NEVER_ACTIVATE[i.code];
  if (never) fails.push(`never activated by this script: ${never}`);
  const facts = officialExamFacts(i.code);
  if (!facts) fails.push("not in data/national-exams-2026.json (no official facts)");
  if (!i.row) {
    fails.push("no Exam row — run scripts/add-national-exams.ts --apply first");
    return { code: i.code, ready: false, alreadyActive: false, passes, fails };
  }
  if (String(i.row.category).toUpperCase() === "SCHOOL_BOARD") fails.push("a school class container, not an exam");

  if (i.officialUrl && /^https:\/\//i.test(i.officialUrl)) passes.push(`official site: ${host(i.officialUrl)}`);
  else fails.push("no https official site (ExamEligibility.officialUrl)");

  const pattern = officialPattern(i.code, i.row);
  if (pattern) passes.push(`pattern agrees with the official research (${pattern.stage}; ${host(pattern.url)})`);
  else if (facts) fails.push("the stored pattern differs from data/national-exams-2026.json — the hub would print no pattern");

  const syllabus = facts?.syllabusUrl && /^https?:\/\//i.test(facts.syllabusUrl) ? facts.syllabusUrl : null;
  if (i.officialDates > 0) passes.push(`${i.officialDates} official-tier tracker date${i.officialDates === 1 ? "" : "s"}`);
  if (syllabus) passes.push(`official syllabus link (${host(syllabus)})`);
  if (i.officialDates <= 0 && !syllabus) fails.push("no official-tier tracker date and no official syllabus link");

  const alreadyActive = i.row.active;
  return { code: i.code, ready: fails.length === 0 && !alreadyActive, alreadyActive, passes, fails };
}
