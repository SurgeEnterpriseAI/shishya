// The "which government exam suits ME?" matching engine.
//
// Given a visitor's answers (age, education, stream, state, category,
// strengths), score every exam: a HARD eligibility filter (age /
// education / stream / domicile) followed by a SOFT fit rank (how well
// the exam's skill profile matches the visitor's strengths + how many
// vacancies it has — more posts = better real odds). Pure functions so
// the page stays thin and the logic is unit-testable.

export type EducationLevel = "10TH" | "12TH" | "ITI" | "DIPLOMA" | "GRADUATE" | "POSTGRADUATE";
export type Stream = "ANY" | "ENGINEERING" | "MEDICAL" | "COMMERCE" | "SCIENCE" | "ARTS" | "LAW";
export type Category = "GEN" | "EWS" | "OBC" | "SC" | "ST";
export type Skill = "quant" | "reasoning" | "gk" | "english" | "technical";

export interface MatchInput {
  age: number;
  education: EducationLevel;
  stream: Stream;
  state: string | null; // ISO state code, for domicile
  category: Category;
  strengths: Skill[]; // areas the user rates themselves strong in
}

export interface ExamElig {
  code: string;
  shortName: string;
  name: string;
  category: string; // exam category enum as text
  state: string | null;
  minAge: number | null;
  maxAge: number | null;
  educationTags: string[];
  educationNote: string | null;
  domicileState: string | null;
  vacanciesApprox: number | null;
  vacanciesNote: string | null;
  skillProfile: Partial<Record<Skill, number>> | null;
  officialUrl?: string | null;
  officialName?: string | null;
}

export interface MatchResult {
  exam: ExamElig;
  eligible: boolean;
  fitScore: number; // 0-100 among eligibles
  reasons: string[]; // why it fits / why not
  blockers: string[]; // hard reasons it's not eligible
}

const EDU_LEVEL: Record<EducationLevel, number> = {
  "10TH": 1, ITI: 2, "12TH": 2, DIPLOMA: 3, GRADUATE: 4, POSTGRADUATE: 5,
};
const AGE_RELAX: Record<Category, number> = { GEN: 0, EWS: 0, OBC: 3, SC: 5, ST: 5 };
const STREAM_TAGS = ["ENGINEERING", "MEDICAL", "COMMERCE", "SCIENCE", "ARTS", "LAW"];
const SKILLS: Skill[] = ["quant", "reasoning", "gk", "english", "technical"];

/** The minimum education LEVEL an exam requires, from its tags. */
function examMinLevel(tags: string[]): number {
  const levels = tags
    .filter((t): t is EducationLevel => t in EDU_LEVEL)
    .map((t) => EDU_LEVEL[t]);
  return levels.length ? Math.min(...levels) : 0; // lowest required qual (any of)
}

function examStreams(tags: string[]): string[] {
  return tags.filter((t) => STREAM_TAGS.includes(t));
}

export function matchExam(input: MatchInput, ex: ExamElig): MatchResult {
  const reasons: string[] = [];
  const blockers: string[] = [];

  // ── Age ──
  const relaxedMax = ex.maxAge != null ? ex.maxAge + AGE_RELAX[input.category] : null;
  const ageOk =
    (ex.minAge == null || input.age >= ex.minAge) &&
    (relaxedMax == null || input.age <= relaxedMax);
  if (!ageOk) {
    if (ex.minAge != null && input.age < ex.minAge) blockers.push(`Minimum age is ${ex.minAge}`);
    if (relaxedMax != null && input.age > relaxedMax)
      blockers.push(`Age limit is ${ex.maxAge}${AGE_RELAX[input.category] ? ` (+${AGE_RELAX[input.category]} for ${input.category})` : ""}`);
  } else if (ex.maxAge != null) {
    reasons.push(`Within the age limit (${ex.minAge ?? 18}–${ex.maxAge}${AGE_RELAX[input.category] ? ` +${AGE_RELAX[input.category]}` : ""})`);
  }

  // ── Education ──
  const userLevel = EDU_LEVEL[input.education];
  const reqLevel = examMinLevel(ex.educationTags);
  const eduOk = userLevel >= reqLevel;
  if (!eduOk) {
    blockers.push(ex.educationNote ? `Needs: ${ex.educationNote}` : "Higher qualification required");
  } else if (reqLevel > 0) {
    reasons.push(ex.educationNote ? `You meet the qualification (${ex.educationNote})` : "You meet the qualification");
  }

  // ── Stream (only when the exam mandates one) ──
  const streams = examStreams(ex.educationTags);
  const anyStream = ex.educationTags.includes("ANY_STREAM") || streams.length === 0;
  let streamOk = true;
  if (!anyStream) {
    streamOk = input.stream !== "ANY" && streams.includes(input.stream);
    if (!streamOk) blockers.push(`Needs a ${streams.map((s) => s.toLowerCase()).join("/")} background`);
    else reasons.push(`Your ${input.stream.toLowerCase()} background fits`);
  } else if (reqLevel >= 4) {
    reasons.push("Open to any graduation stream");
  }

  // ── Domicile (state exams) ──
  const needsDomicile = ex.domicileState ?? (ex.state ?? null);
  let domicileOk = true;
  if (needsDomicile) {
    domicileOk = input.state === needsDomicile;
    if (!domicileOk) blockers.push(`State exam — usually needs ${needsDomicile} domicile`);
    else reasons.push(`You're in ${needsDomicile} — domicile fits`);
  }

  const eligible = ageOk && eduOk && streamOk && domicileOk;

  // ── Fit score (skill match + vacancy odds) ──
  const prof = ex.skillProfile ?? {};
  const profTotal = SKILLS.reduce((a, k) => a + (Number(prof[k]) || 0), 0);
  const strongSum = input.strengths.reduce((a, k) => a + (Number(prof[k]) || 0), 0);
  const skillFit = profTotal > 0 ? strongSum / profTotal : 0; // 0-1
  const vac = ex.vacanciesApprox ?? 0;
  const vacancyScore = vac > 0 ? Math.min(1, Math.log10(vac + 1) / Math.log10(30000)) : 0;
  const fitScore = Math.round((0.62 * skillFit + 0.38 * vacancyScore) * 100);

  // Fit reasons
  if (eligible) {
    const matchedStrong = input.strengths.filter((k) => (Number(prof[k]) || 0) >= 4);
    if (matchedStrong.length)
      reasons.push(`Plays to your strengths: ${matchedStrong.join(", ")}`);
    if (vac >= 5000) reasons.push(`High vacancy volume (~${vac.toLocaleString("en-IN")}) — more real chances`);
    else if (vac > 0) reasons.push(`~${vac.toLocaleString("en-IN")} typical vacancies`);
  }

  return { exam: ex, eligible, fitScore, reasons, blockers };
}

export function matchAll(input: MatchInput, exams: ExamElig[]): {
  eligible: MatchResult[];
  ineligible: MatchResult[];
} {
  const results = exams.map((ex) => matchExam(input, ex));
  const eligible = results
    .filter((r) => r.eligible)
    .sort((a, b) => b.fitScore - a.fitScore);
  // "Close but blocked" — surface a few so the user sees what they'd
  // qualify for later (e.g. after graduating) rather than a dead end.
  const ineligible = results
    .filter((r) => !r.eligible)
    .sort((a, b) => (b.exam.vacanciesApprox ?? 0) - (a.exam.vacanciesApprox ?? 0));
  return { eligible, ineligible };
}
