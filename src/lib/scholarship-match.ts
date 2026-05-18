// Scholarship match scoring engine.
//
// Given a student profile (state, category, gender, level, income band,
// optional exam), score every scholarship and return the matches that
// pass the strict eligibility gates, sorted by relevance.
//
// Two phases:
//   1. HARD GATES — if a scholarship has a strict eligibility rule and
//      the student doesn't qualify, exclude it entirely. e.g., a
//      girls-only scholarship for a male student is excluded, not
//      down-ranked. Same for state-restricted, category-restricted,
//      exam-gated.
//   2. RELEVANCE SCORE — within the gated set, rank by how SPECIFIC
//      the match is. A scholarship that explicitly names the student's
//      state ranks above a national scheme. A category-specific match
//      ranks above an open scheme. Helps surface "exactly for you"
//      vs "you can apply because everyone can".
//
// The wizard surfaces the matchReasons inline so the student can
// quickly see WHY each one matched.

import type {
  Scholarship,
  ScholarshipCategory,
  ScholarshipLevel,
} from "@/data/scholarships";

export interface StudentProfile {
  /** Two-letter state code, or null for "no state preference". */
  state: string | null;
  /** Social category — drives the category-specific scheme inclusion. */
  category: ScholarshipCategory | null;
  /** "F" = girls-only schemes are surfaced as PRIMARY matches. */
  gender: "F" | "M" | null;
  /** Current/target education level. */
  level: ScholarshipLevel | null;
  /** Annual family income in lakhs ₹. null = "prefer not to say". */
  incomeLakhs: number | null;
  /** Exam codes the student has cleared / is preparing for (optional). */
  examCodes: string[];
}

export interface MatchResult {
  scholarship: Scholarship;
  /** Higher is more relevant. Used for sorting only — not surfaced as a number. */
  score: number;
  /** Plain-language explanations of why this matched, surfaced inline. */
  matchReasons: string[];
  /** Soft warnings the student should check — e.g., "income limit ₹2.5L". */
  warnings: string[];
}

export function findMatches(profile: StudentProfile, all: Scholarship[]): MatchResult[] {
  const out: MatchResult[] = [];

  for (const s of all) {
    const gate = passesHardGates(s, profile);
    if (!gate.passes) continue;

    const matchReasons: string[] = [];
    const warnings: string[] = gate.warnings;
    let score = 0;

    // STATE — specific state match is strongest. National schemes
    // get a smaller boost (still eligible, just less "exactly for you").
    if (s.state !== null && profile.state === s.state) {
      score += 50;
      matchReasons.push(`Scheme is specific to your state`);
    } else if (s.state === null) {
      score += 10;
      matchReasons.push("Available nation-wide");
    }

    // CATEGORY — strong boost when the scheme explicitly serves your
    // category (vs being open to all).
    if (s.eligibility.categories && profile.category) {
      if (s.eligibility.categories.includes(profile.category)) {
        score += 40;
        matchReasons.push(`Reserved for ${profile.category} category`);
      }
    } else if (!s.eligibility.categories) {
      score += 5;
    }

    // GENDER — girls-only scholarships are a strong signal when
    // student is female. Boys-only is rare but symmetric.
    if (s.eligibility.gender === "F" && profile.gender === "F") {
      score += 35;
      matchReasons.push("Specifically for girls / women");
    }

    // LEVEL — explicit level match.
    if (profile.level && s.levels.includes(profile.level)) {
      score += 25;
      matchReasons.push(`Covers ${labelLevel(profile.level)}`);
    }

    // INCOME — income-gated schemes that the student passes are a
    // strong signal of being well-targeted.
    if (s.eligibility.incomeMaxLakhs !== undefined && profile.incomeLakhs !== null) {
      if (profile.incomeLakhs <= s.eligibility.incomeMaxLakhs) {
        score += 30;
        matchReasons.push(`Within ₹${s.eligibility.incomeMaxLakhs}L family-income limit`);
      }
    }

    // EXAM — exam-gated schemes that the student has cleared.
    if (s.eligibility.requiresExam && s.eligibility.requiresExam.length > 0 && profile.examCodes.length > 0) {
      const overlap = s.eligibility.requiresExam.filter((e) => profile.examCodes.includes(e));
      if (overlap.length > 0) {
        score += 40;
        matchReasons.push(`Eligible via ${overlap.join(", ").replace(/_/g, " ")}`);
      }
    }

    // SCHEME TYPE — give private/foundation schemes a small boost
    // since they're often under-discovered.
    if (s.type === "PRIVATE") score += 3;

    out.push({ scholarship: s, score, matchReasons, warnings });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

interface GateResult {
  passes: boolean;
  warnings: string[];
}

function passesHardGates(s: Scholarship, profile: StudentProfile): GateResult {
  const warnings: string[] = [];

  // GATE: state-restricted scheme + student lives elsewhere
  if (s.state !== null && profile.state !== null && s.state !== profile.state) {
    return { passes: false, warnings };
  }

  // GATE: category-restricted scheme + student is not in that category
  if (s.eligibility.categories && profile.category) {
    if (!s.eligibility.categories.includes(profile.category)) {
      return { passes: false, warnings };
    }
  }
  // If scheme is category-restricted but student didn't share category,
  // we surface it with a warning rather than excluding (student decides).
  if (s.eligibility.categories && !profile.category) {
    warnings.push(`Reserved for ${s.eligibility.categories.join("/")} — check eligibility`);
  }

  // GATE: gender restriction the student doesn't meet
  if (s.eligibility.gender && profile.gender && s.eligibility.gender !== profile.gender) {
    return { passes: false, warnings };
  }
  if (s.eligibility.gender && !profile.gender) {
    warnings.push(`Restricted to ${s.eligibility.gender === "F" ? "girls / women" : "boys / men"}`);
  }

  // GATE: level mismatch
  if (profile.level && !s.levels.includes(profile.level)) {
    return { passes: false, warnings };
  }

  // GATE: income limit
  if (s.eligibility.incomeMaxLakhs !== undefined && profile.incomeLakhs !== null) {
    if (profile.incomeLakhs > s.eligibility.incomeMaxLakhs) {
      return { passes: false, warnings };
    }
  }
  if (s.eligibility.incomeMaxLakhs !== undefined && profile.incomeLakhs === null) {
    warnings.push(`Income ceiling ₹${s.eligibility.incomeMaxLakhs}L — confirm before applying`);
  }

  // GATE: exam requirement — soft. If the student didn't list any
  // exams, we keep the scheme but warn. If they listed exams and none
  // match, exclude (they wouldn't qualify).
  if (s.eligibility.requiresExam && s.eligibility.requiresExam.length > 0) {
    if (profile.examCodes.length === 0) {
      warnings.push(
        `Requires: ${s.eligibility.requiresExam.map((e) => e.replace(/_/g, " ")).join(" or ")}`,
      );
    } else {
      const overlap = s.eligibility.requiresExam.filter((e) => profile.examCodes.includes(e));
      if (overlap.length === 0) {
        return { passes: false, warnings };
      }
    }
  }

  // Income-only schemes (no other restriction) for high-income filters
  // get a "double-check" warning — most national merit-cum-means caps
  // exist for a reason.
  return { passes: true, warnings };
}

function labelLevel(level: ScholarshipLevel): string {
  switch (level) {
    case "CLASS_9_10":  return "Class 9–10";
    case "CLASS_11_12": return "Class 11–12";
    case "DIPLOMA":     return "Diploma / ITI";
    case "UG":          return "Undergraduate";
    case "PG":          return "Postgraduate";
    case "PHD":         return "PhD / Research";
  }
}
