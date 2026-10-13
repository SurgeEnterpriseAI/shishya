// AI rank-band generator. Given an exam, produces 5-8 score→rank→outcome
// tiers that map a mock-test percentage to a plausible real-exam rank window
// and the colleges/posts/cadres typically reachable at that band.
//
// IMPORTANT: this is approximation from Claude's training knowledge of
// historic cut-offs and outcomes. Bands are coarse on purpose — the goal
// is motivation and goal-setting, not pinpoint rank prediction. Rows are
// flagged with source = "ai-generated:claude" so an admin can override
// per exam with curated, more-recent data.
//
// 13 Oct 2026 (quality audit, 20 real exams, blind judge): Claude's own bands
// had real errors in 6-8 of 20 — institutions this exam does not fill (SSC
// CPO listing CBI and NIA posts, IITs and DSE through CUET PG, Telangana
// colleges and NIT Andhra Pradesh through AP EAMCET), invented cut-offs, fees,
// pay levels and a flat "60%" TET pass mark, rank windows written backwards
// (BITSAT) and 39→40 gaps between bands (CA Foundation). The prompt asked for
// "last year's approximate cut-off" and fees from memory, and the model was
// given only the exam's name. Now:
//   - the call carries what Shishya stores for the exam (loadRankBandFacts):
//     its kind, state, conducting body, description, paper size, and the
//     official cut-offs verified against the published document
//     (OfficialCutoff, src/lib/official-cutoffs.ts);
//   - the prompt lists only outcomes filled from THIS exam's result and
//     allows no number in an outcome except one from that stored data;
//   - checkRankBands repairs what code can (backwards rank pairs, gaps of
//     up to a point between bands), strips any outcome number the stored data
//     does not hold, and returns no bands at all when the ladder is still
//     wrong (ranks that get better as the score falls, a band left with no
//     outcome) — the cron then keeps the stored bands, as it does today.
// Review of the same day: an exam that publishes no rank (BITSAT, CAT, CUET)
// gets no rank window, even when the model writes one; an outcome that
// promises a result ("guaranteed", "assured", "almost certain") or names an
// institution the exam never fills (AIIMS through NEET PG, ISRO through GATE)
// loses that clause or the line; cut-off lines carry their gender (Male and Female rows
// of one category differ by as much as 25 marks); and a call whose stored
// data could not be read says so instead of "none stored".

import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage } from "@/lib/ai/usage";
import { anthropic, MODEL } from "./client";
import { createLocalFirst, ledgerModel } from "@/lib/ai/local-llm";
import { examKindLabel } from "@/lib/exam-kind";
import { stateInfo } from "@/lib/state-info";
import { realExamKey } from "@/lib/db/exam-scope";

export interface RankBandInput {
  examCode: string;
  examName: string;
  examShortName: string;
  category: string;
  /** What Shishya stores for the exam (13 Oct 2026); loadRankBandFacts. */
  facts?: RankBandFacts | null;
}

/** One verified official cut-off row (OfficialCutoff), as printed. */
export interface RankBandCutoff {
  cycle: string;
  stage: string;
  post: string;
  region: string;
  /** "Male", "Female" or "" (13 Oct 2026): rows of one category can differ only by it. */
  gender: string;
  categoryLabel: string;
  marks: string;
  maxMarks: string;
  scoreType: string;
  publisher: string;
}

/** The stored data the call is grounded on (13 Oct 2026). */
export interface RankBandFacts {
  /** ISO state code for a state exam (Exam.state). */
  state: string | null;
  /** Exam.description — Shishya's own summary, not checked against a notice. */
  description: string | null;
  pattern: { totalQuestions: number; totalMarks: number; negativeMark: number; durationMin: number } | null;
  conductingBody: { name: string | null; url: string | null } | null;
  /** Verified official cut-offs, newest cycle first, at most RANK_FACTS_CUTOFF_CAP. */
  officialCutoffs: RankBandCutoff[];
}

export interface RankBand {
  scorePctMin: number;
  scorePctMax: number;
  rankMin: number | null;
  rankMax: number | null;
  label: string;
  outcomes: string; // markdown bullet list
}

export interface RankBandsResult {
  bands: RankBand[];
  inputTokens: number;
  outputTokens: number;
  /** What checkRankBands repaired, stripped or refused (13 Oct 2026). */
  issues: string[];
}

/** Official cut-off rows put in one prompt, newest cycles first. */
export const RANK_FACTS_CUTOFF_CAP = 24;
/** Exam.description is clipped to this many characters in the prompt (the
 *  hand-researched ones run to ~1,400 and name the posts or seats filled). */
const DESCRIPTION_MAX = 1500;

const SYSTEM = `You are generating a score→rank→outcome mapping for ONE Indian exam, for use in a free exam-prep platform (Shishya).

GOAL: When a student finishes a mock test and sees their percentage score, they want one immediate human-readable card telling them: "If you scored this in the real exam, you'd likely be in this range, and these are the colleges / posts / next stages this exam leads to at that level."

The card is shown to students as an AI estimate. Honesty comes first: a band with three correct outcomes beats a band with six that include one wrong one.

OUTPUT RULES:
1. Return 5-8 bands covering the full 0-100% score range with no gaps and no overlaps. Neighbouring bands share their boundary: if one band ends at 40, the next starts at 40 (0-40, 40-55, …), never 0-39 then 40-49.
2. Each band has:
   - scorePctMin / scorePctMax (% of mock test score; 0-100)
   - rankMin / rankMax: the expected real-exam rank window. rankMin is the BETTER (smaller) number, rankMax the worse (larger) one; rankMax may be null in the lowest band. For JEE Main, JEE Advanced, NEET, GATE, CLAT, AILET, state CETs and polytechnic tests and every other entrance test whose result gives the candidate an all-India or state RANK, ALWAYS fill them with a conservative estimate — the card shows them as an estimated rank. Both null when the exam gives no rank: SSC / RRB / state-PSC / police / banking recruitment, eligibility tests, olympiad stages, and BITSAT, CAT and CUET (UG and PG), which publish a score or a percentile — never turn a score or percentile into a rank.
   - label: a short tier name in 2-6 words, with no number except one that restates the band's own rank window
   - outcomes: ONE markdown string of 3-6 "- " bullets (a single string, never an array)
3. A higher score band always has better (smaller) ranks than every lower score band.
4. WHICH OUTCOMES — only institutions, courses, posts or next stages filled from THIS exam's own result:
   - Never list an institution or post that admits or recruits through a different exam or counselling, even a related one. Mistakes seen before: NITs and the centrally funded IIITs and IITs fill B.Tech seats through JEE Main / JEE Advanced (JoSAA), never through a state CET, BITSAT or CUET; IIT postgraduate seats go through GATE, JAM, CAT or the IIT's own test, not CUET PG; AIIMS, JIPMER, PGIMER and NIMHANS MD/MS seats go through INI-CET, not NEET PG; DM/MCh seats go through NEET-SS; NLU Delhi admits through AILET, not CLAT; a state's CET fills only that state's seats (Andhra Pradesh's never fills Telangana's colleges); ISRO is not a PSU and recruits its scientists and engineers through its own ICRB test, not GATE.
   - Stay inside what the STORED DATA says the exam is: its state, its conducting body, its description. For jobs reached through this exam (posts, departments, PSUs that shortlist on it), name an organisation only when the STORED DATA description names it; otherwise write the route plainly ("PSU trainee-engineer shortlisting, where the PSU's notice lists this paper").
   - An eligibility or qualifying test (a TET, CA Foundation, a qualifying paper): the outcomes are whether the student qualifies and what that lets them do next (apply in the recruitment exam, register for the next level). Never map a score to a job posting the certificate alone does not give.
   - An olympiad: only its official next stages.
   - If you are not sure that an institution or post is filled through this exam, leave it out. A plain outcome ("Government polytechnics in the state — popular branches", "Sub-Inspector posts in the forces this exam recruits for") is better than a wrong named one.
   - Never promise a result: no "guaranteed", "assured", "sure-shot", "almost certain" or "automatic" seat, branch, shortlist or selection. A band is an estimate; write "likely" or "in range" instead. Shishya's checker deletes such claims.
5. NUMBERS: inside outcomes write no cut-off, rank, percentile, marks, fee, salary, pay level, stipend, seat or vacancy count, age, validity period or pass percentage — EXCEPT a figure copied from the STORED DATA block, with its cycle, and its gender when the row names one (e.g. "2024 Tier-I UR cut-off 131.5/200", "2024 Tier-I UR (Female) cut-off 124.5/200"). After a "—" add only the branch, course or specialisation, the campus or city, or the post's group, cadre or service. Numbers in outcomes that are not in the STORED DATA are deleted by Shishya's checker, so do not write them.
6. The score bands and rank windows are estimates. Keep them conservative and, where the STORED DATA has official cut-offs, consistent with them (a score near the published cut-off is the qualifying edge, not a comfortable band). Rule 5 is about outcome text only: a rank-based exam's rank window always goes in rankMin/rankMax.

OUTPUT: STRICT JSON only, no markdown fences, no preamble:

{
  "bands": [
    {
      "scorePctMin": 0,
      "scorePctMax": 30,
      "rankMin": 400000,
      "rankMax": null,
      "label": "Needs more prep",
      "outcomes": "- Unlikely to clear cut-off this cycle\\n- Focus on basics for next attempt"
    },
    ...
  ]
}`;

/** One cut-off row as one prompt line. */
function cutoffLine(c: RankBandCutoff): string {
  const where = [c.stage, c.post, c.region, c.gender ?? ""].map((s) => s.trim()).filter(Boolean).join(" · ");
  const out = c.maxMarks.trim() ? `${c.marks} / ${c.maxMarks}` : c.marks;
  return `  - ${c.cycle} · ${where || "cut-off"} · ${c.categoryLabel}: ${out}${c.scoreType.trim() ? ` (${c.scoreType.trim()})` : ""}${c.publisher.trim() ? ` — ${c.publisher.trim()}` : ""}`;
}

/**
 * The STORED DATA block of the user prompt (13 Oct 2026). Pure. Every number
 * an outcome may carry comes from this text (allowedNumbers reads it back).
 */
export function rankBandFactsBlock(input: Pick<RankBandInput, "examCode" | "category" | "facts">): string {
  const f = input.facts ?? null;
  const L: string[] = [`STORED DATA (Shishya's records for this exam — stay inside them):`];
  const st = f?.state ? stateInfo(f.state) : null;
  L.push(`- Exam type: ${examKindLabel({ code: input.examCode, category: input.category })}${st ? ` · state exam: ${st.name}` : f?.state ? ` · state exam: ${f.state}` : ""}`);
  if (f?.conductingBody && (f.conductingBody.name || f.conductingBody.url)) {
    L.push(`- Conducting body: ${[f.conductingBody.name, f.conductingBody.url ? `(${f.conductingBody.url})` : null].filter(Boolean).join(" ")}`);
  }
  if (f?.description?.trim()) {
    const d = f.description.replace(/\s+/g, " ").trim();
    L.push(`- About the exam (Shishya's summary, not checked against the notification): ${d.length > DESCRIPTION_MAX ? `${d.slice(0, DESCRIPTION_MAX - 1)}…` : d}`);
  }
  if (f?.pattern && f.pattern.totalQuestions > 0) {
    const p = f.pattern;
    L.push(`- Paper (Shishya's record): ${p.totalQuestions} questions · ${p.totalMarks} marks · ${p.durationMin} minutes · negative marking ${p.negativeMark > 0 ? `${p.negativeMark} per wrong answer` : "none"}`);
  }
  if (!f) {
    // No facts passed, or the read failed (13 Oct 2026): "none stored" would not be true.
    L.push(`- Shishya's records: not loaded for this call (no description, conducting body or official cut-offs here) — so write no cut-off figure anywhere.`);
  } else if (f.officialCutoffs?.length) {
    L.push(`- Official cut-offs, checked against the published document (as printed):`);
    L.push(...f.officialCutoffs.map(cutoffLine));
  } else {
    L.push(`- Official cut-offs: none stored for this exam — so write no cut-off figure anywhere.`);
  }
  return L.join("\n");
}

/** The user prompt. Pure; exported for tests and the eval. */
export function rankBandsUserPrompt(input: RankBandInput): string {
  return `Generate the score→rank→outcome bands for this exam.

Exam code:   ${input.examCode}
Exam name:   ${input.examName}
Short name:  ${input.examShortName}
Category:    ${input.category}

${rankBandFactsBlock(input)}

Return STRICT JSON per the schema in the system prompt. 5-8 bands, full 0-100 score coverage, no gaps.`;
}

/** The request generateRankBands sends. Pure; exported for tests and the eval. */
export function rankBandsRequest(input: RankBandInput): Anthropic.Messages.MessageCreateParamsNonStreaming {
  return {
    model: MODEL,
    max_tokens: 3500,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: rankBandsUserPrompt(input) }],
  };
}

export async function generateRankBands(input: RankBandInput): Promise<RankBandsResult> {
  const response = await createLocalFirst("rank-bands", anthropic, rankBandsRequest(input));
  recordAiUsage("rank-bands", response, { model: ledgerModel(response, MODEL), ref: input.examCode });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.bands)) {
    throw new Error(`rank-bands JSON parse failed for ${input.examCode}: ${text.slice(0, 200)}`);
  }

  const { bands, issues } = checkRankBands(parseBands(parsed.bands), allowedNumbers(input), {
    noRank: publishesNoRank(input.examCode),
    wrongNames: wrongPathwayNames(input.examCode),
  });
  if (issues.length) console.warn(`[rank-bands] ${input.examCode}: ${issues.join("; ")}`);

  return {
    bands,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    issues,
  };
}

/** The model's bands as typed rows (the shape check it always had). Highest band first. */
export function parseBands(raw: unknown[]): RankBand[] {
  return raw
    .filter((b: any) =>
      Number.isFinite(b?.scorePctMin) &&
      Number.isFinite(b?.scorePctMax) &&
      typeof b?.label === "string" &&
      typeof b?.outcomes === "string",
    )
    .map((b: any) => ({
      scorePctMin: clampNum(b.scorePctMin, 0, 100),
      scorePctMax: clampNum(b.scorePctMax, 0, 100),
      rankMin: Number.isFinite(b.rankMin) ? Math.max(1, Math.round(Number(b.rankMin))) : null,
      rankMax: Number.isFinite(b.rankMax) ? Math.max(1, Math.round(Number(b.rankMax))) : null,
      label: String(b.label).slice(0, 120),
      outcomes: String(b.outcomes).slice(0, 2000),
    }))
    // Sort highest-score-band first (orderIdx 0).
    .sort((a: RankBand, b: RankBand) => b.scorePctMin - a.scorePctMin);
}

// ── Outcome numbers ───────────────────────────────────────────────────────

const NUMBER_RE = /\d+(?:,\d{2,3})*(?:\.\d+)?/g;

/** Words that carry a small number which is a name, not a claim ("Tier-2",
 *  "CBT 1", "Class 12", "10+2", "12th", "5-year"). Removed before the check. */
const NAME_NUMBERS: RegExp[] = [
  /\b(?:class|tier|paper|phase|stage|cbt|round|session|part|section|shift|group)[\s-]*\d{1,2}(?:st|nd|rd|th)?\b/gi,
  /\b10\s*\+\s*2\b/g,
  /\b(?:10|12)th\b/gi,
  /\b[1-6][\s-]year\b/gi,
];

function numbersIn(text: string): number[] {
  return (text.match(NUMBER_RE) ?? []).map((n) => Number(n.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
}

/** Every number an outcome may carry: those in the stored data and the exam's own names. */
export function allowedNumbers(input: Pick<RankBandInput, "examCode" | "examName" | "examShortName" | "category" | "facts">): Set<number> {
  return new Set(numbersIn([rankBandFactsBlock(input), input.examCode, input.examName, input.examShortName].join("\n")));
}

function unsupported(text: string, allowed: Set<number>): boolean {
  let t = text;
  for (const re of NAME_NUMBERS) t = t.replace(re, " ");
  return numbersIn(t).some((n) => !allowed.has(n));
}

// ── Promised results ──────────────────────────────────────────────────────

/** Words that promise a result a band cannot (13 Oct 2026 review of the new
 *  bands: "Computer Science guaranteed" for BITSAT, "Guaranteed admission to
 *  BA LLB at NLU Delhi", "assured seat", "Admission almost certain",
 *  "Automatic shortlist for all PSU positions"). "certain branches" (= some
 *  branches) and "Assured Career Progression" (a pay scheme) are not claims. */
const PROMISE_RE =
  /\bguarantee(?:d|s)?\b|\bassured\b(?!\s+career\s+progression)|\bsure[\s-]?shot\b|\b(?:almost|virtually|nearly|practically)\s+(?:certain|sure|assured|guaranteed)\b|\b(?:is|are|be)\s+certain\b|\bcertain\s+(?:admission|seat|selection|qualification|shortlist(?:ing)?|call|success)\b|\bdefinite(?:ly)?\s+(?:admission|seat|selection|shortlist|call|qualification)\b|\bautomatic(?:ally)?\s+(?:shortlist(?:ed|ing)?|selection|selected|admission|qualification|call)\b/i;

/** True when `text` promises a result (PROMISE_RE). Pure; exported for tests. */
export function promisesResult(text: string): boolean {
  return PROMISE_RE.test(text);
}

// ── Wrong pathways ────────────────────────────────────────────────────────

/** Institutions that never fill seats or posts through these exams (13 Oct
 *  2026): pathways rule 4 names, held in code too because the model still
 *  wrote them after the new prompt — NEET PG bands with "MD/MS in AIIMS, PGI
 *  Chandigarh, JIPMER" (INI-CET fills those), GATE CSE bands with ISRO as a
 *  PSU (ISRO recruits through its own ICRB test). Only pathways that are wrong
 *  for every seat or post of the exam; the prompt covers the rest. */
const WRONG_PATHWAYS: ReadonlyArray<{ exam: RegExp; names: RegExp }> = [
  { exam: /^NEET_PG$/, names: /\b(?:AIIMS|JIPMER|PGIMER|PGI|NIMHANS)\b/i },
  { exam: /^CLAT$/, names: /\b(?:NLU\s+Delhi|NLUD|National\s+Law\s+University,?\s+Delhi)\b/i },
  { exam: /^GATE_/, names: /\bISRO\b/i },
  // B.Tech seats at NITs and IITs: JEE Main / JEE Advanced through JoSAA only.
  {
    exam: /^(?:BITSAT|CUET_UG|[A-Z]{2}_(?:EAMCET|EAPCET|POLYCET|GUJCET|JKCET|COMEDK|KCET|KEAM|MHTCET|OJEE|WBJEE|JEECUP))$/,
    names: /\b(?:NITs?|IITs?|National\s+Institutes?\s+of\s+Technology|Indian\s+Institutes?\s+of\s+Technology)\b/i,
  },
];

/** The names `examCode` never fills, as one pattern, or null. Pure; exported for tests. */
export function wrongPathwayNames(examCode: string): RegExp | null {
  const code = examCode.trim().toUpperCase();
  return WRONG_PATHWAYS.find((w) => w.exam.test(code))?.names ?? null;
}

/**
 * One outcome bullet with every number the stored data does not hold taken
 * out (13 Oct 2026): a bracket holding one goes, then a " — " clause holding
 * one goes, and a bullet whose name itself still holds one is dropped (null).
 * A promised result (promisesResult) or a name the exam never fills
 * (wrongNames, from wrongPathwayNames) is taken out the same way: its
 * bracket, then its clause, else the whole bullet. Pure; exported for tests.
 */
export function scrubOutcomeLine(line: string, allowed: Set<number>, wrongNames: RegExp | null = null): string | null {
  const bullet = line.replace(/^\s*[-*•]\s*/, "").trim();
  if (!bullet) return null;
  const bad = (s: string) => unsupported(s, allowed) || promisesResult(s) || (wrongNames != null && wrongNames.test(s));
  let t = bullet.replace(/\s*\([^()]*\)/g, (m) => (bad(m) ? "" : m));
  // The clause after the name: " — ", " – " or " - " (RankCard splits there too).
  const dash = t.search(/\s[—–-]\s/);
  if (dash >= 0 && bad(t.slice(dash))) t = t.slice(0, dash);
  t = t.replace(/\s+/g, " ").replace(/[\s,;:—-]+$/, "").trim();
  if (!t || bad(t)) return null;
  return `- ${t}`;
}

// ── The ladder check ──────────────────────────────────────────────────────

/** Gaps and overlaps up to this many percentage points are closed in code. */
const BOUNDARY_FIX_PTS = 1;

/**
 * Repairs and refusals on the parsed bands (13 Oct 2026). Pure; exported for
 * tests. `bands` highest first, as parseBands returns them. Returns no bands
 * (and says why) when the ladder cannot be shown honestly.
 */
export function checkRankBands(
  input: RankBand[],
  allowed: Set<number>,
  opts: { noRank?: boolean; wrongNames?: RegExp | null } = {},
): { bands: RankBand[]; issues: string[] } {
  const issues: string[] = [];
  if (input.length === 0) return { bands: [], issues: ["no bands"] };
  // Lowest first for the boundary walk.
  const bands = input.map((b) => ({ ...b })).sort((a, b) => a.scorePctMin - b.scorePctMin || a.scorePctMax - b.scorePctMax);

  // 0. An exam that publishes no rank (publishesNoRank) gets no rank window,
  //    whatever the model wrote (13 Oct 2026).
  if (opts.noRank) {
    const had = bands.filter((b) => b.rankMin != null || b.rankMax != null).length;
    for (const b of bands) b.rankMin = b.rankMax = null;
    if (had) issues.push(`cleared ${had} rank window(s): this exam publishes a score or percentile, not a rank`);
  }

  // 1. A rank window written backwards (rankMin is the better, smaller number).
  let swapped = 0;
  for (const b of bands) {
    if (b.rankMin != null && b.rankMax != null && b.rankMin > b.rankMax) {
      [b.rankMin, b.rankMax] = [b.rankMax, b.rankMin];
      swapped++;
    }
  }
  if (swapped) issues.push(`swapped ${swapped} backwards rank window(s)`);

  // 2. Boundaries: shared edges, 0 and 100 at the ends.
  let fixed = 0;
  if (bands[0].scorePctMin > 0 && bands[0].scorePctMin <= BOUNDARY_FIX_PTS) {
    bands[0].scorePctMin = 0;
    fixed++;
  }
  const top = bands[bands.length - 1];
  if (top.scorePctMax < 100 && top.scorePctMax >= 100 - BOUNDARY_FIX_PTS) {
    top.scorePctMax = 100;
    fixed++;
  }
  for (let i = 1; i < bands.length; i++) {
    const gap = bands[i].scorePctMin - bands[i - 1].scorePctMax;
    if (gap !== 0 && Math.abs(gap) <= BOUNDARY_FIX_PTS) {
      bands[i].scorePctMin = bands[i - 1].scorePctMax;
      fixed++;
    }
  }
  if (fixed) issues.push(`closed ${fixed} boundary gap(s) of up to ${BOUNDARY_FIX_PTS} point`);
  if (bands.some((b) => b.scorePctMin >= b.scorePctMax)) return { bands: [], issues: [...issues, "refused: a band with no score range"] };

  // 3. Ranks must get better as the score rises (compare each pair of neighbours).
  for (let i = 1; i < bands.length; i++) {
    const lo = bands[i - 1];
    const hi = bands[i];
    const worse = (a: number | null, b: number | null) => a != null && b != null && a > b;
    if (worse(hi.rankMin, lo.rankMin) || worse(hi.rankMax, lo.rankMax)) {
      return { bands: [], issues: [...issues, `refused: ranks get better as the score falls (${lo.scorePctMin}-${lo.scorePctMax}% vs ${hi.scorePctMin}-${hi.scorePctMax}%)`] };
    }
  }

  // 4. Outcome numbers the stored data does not hold.
  let stripped = 0;
  for (const b of bands) {
    const lines = b.outcomes.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const kept = lines.map((l) => scrubOutcomeLine(l, allowed, opts.wrongNames ?? null));
    stripped += kept.filter((k, i) => k !== `- ${lines[i].replace(/^\s*[-*•]\s*/, "").trim()}`).length;
    const out = kept.filter((k): k is string => k != null);
    if (out.length === 0) {
      return { bands: [], issues: [...issues, `refused: every outcome of "${b.label}" rested on numbers with no stored source, a promised result or a wrong pathway`] };
    }
    b.outcomes = out.join("\n");
  }
  if (stripped) issues.push(`removed unsupported numbers, promised results or wrong-pathway names from ${stripped} outcome line(s)`);

  // 5. A label that promises a result ("Top 50 — Premium NLUs assured"): its
  //    clause goes, or the label falls back to the band's score range.
  let relabelled = 0;
  for (const b of bands) {
    if (!promisesResult(b.label)) continue;
    const dash = b.label.search(/\s[—–-]\s/);
    const head = dash >= 0 ? b.label.slice(0, dash).trim() : "";
    b.label = head && !promisesResult(head) ? head : `Score band ${Math.round(b.scorePctMin)}–${Math.round(b.scorePctMax)}%`;
    relabelled++;
  }
  if (relabelled) issues.push(`removed a promised result from ${relabelled} label(s)`);

  return { bands: bands.sort((a, b) => b.scorePctMin - a.scorePctMin), issues };
}

/** Exams whose result gives no rank, only a score or percentile (13 Oct 2026):
 *  BITS admits on the BITSAT score, the IIMs shortlist on CAT percentiles and
 *  their own composite scores, and NTA publishes CUET normalised scores and
 *  percentiles. The live codes of that day; the prompt states the rule for
 *  the rest. */
export const NO_PUBLISHED_RANK_EXAMS: ReadonlySet<string> = new Set(["BITSAT", "CAT", "CUET_UG", "CUET_PG"]);

export function publishesNoRank(examCode: string): boolean {
  return NO_PUBLISHED_RANK_EXAMS.has(examCode.trim().toUpperCase());
}

// ── Stored data ───────────────────────────────────────────────────────────

/** The read-only slice of the Prisma client loadRankBandFacts uses. */
export interface RankFactsDb {
  exam: { findUnique(args: any): Promise<any> };
  officialCutoff: { findMany(args: any): Promise<any[]> };
}

/**
 * What Shishya stores for one exam, for the prompt (13 Oct 2026). Reads only.
 * Cut-offs: the verified OfficialCutoff rows of the newest cycles, at most
 * RANK_FACTS_CUTOFF_CAP. Null when the exam row is gone.
 */
export async function loadRankBandFacts(db: RankFactsDb, examId: string): Promise<RankBandFacts | null> {
  const [exam, cutoffs] = await Promise.all([
    db.exam.findUnique({
      where: realExamKey({ id: examId }),
      select: {
        state: true,
        description: true,
        totalQuestions: true,
        totalMarks: true,
        negativeMark: true,
        durationMin: true,
        eligibility: { select: { officialName: true, officialUrl: true } },
      },
    }),
    db.officialCutoff.findMany({
      where: { examId, archivedAt: null },
      take: 500,
      select: { cycle: true, stage: true, post: true, region: true, gender: true, categoryLabel: true, marks: true, maxMarks: true, scoreType: true, publisher: true, publishedOn: true },
    }),
  ]);
  if (!exam) return null;
  return {
    state: exam.state ?? null,
    description: exam.description ?? null,
    pattern:
      exam.totalQuestions > 0 && exam.totalMarks > 0
        ? { totalQuestions: exam.totalQuestions, totalMarks: exam.totalMarks, negativeMark: exam.negativeMark ?? 0, durationMin: exam.durationMin }
        : null,
    conductingBody: exam.eligibility ? { name: exam.eligibility.officialName ?? null, url: exam.eligibility.officialUrl ?? null } : null,
    officialCutoffs: pickCutoffs(cutoffs),
  };
}

/** A cycle's year: the latest 4-digit year in its name ("CEN 01/2019", "2023-24"), else its document's. */
function cycleYear(r: { cycle: string; publishedOn?: Date | string | null }): number {
  const years = (r.cycle.match(/\b(?:19|20)\d{2}\b/g) ?? []).map(Number);
  if (years.length) return Math.max(...years);
  const d = r.publishedOn ? new Date(r.publishedOn) : null;
  return d && Number.isFinite(d.getTime()) ? d.getUTCFullYear() : 0;
}

/** The newest cycles' rows first, at most RANK_FACTS_CUTOFF_CAP. Pure; exported for tests. */
export function pickCutoffs(input: Array<RankBandCutoff & { publishedOn?: Date | string | null }>): RankBandCutoff[] {
  const rows = [...input].sort((a, b) => cycleYear(b) - cycleYear(a) || b.cycle.localeCompare(a.cycle));
  const cycles: string[] = [];
  for (const r of rows) if (!cycles.includes(r.cycle)) cycles.push(r.cycle);
  const out: RankBandCutoff[] = [];
  for (const c of cycles) {
    for (const r of rows) {
      if (r.cycle !== c) continue;
      if (out.length >= RANK_FACTS_CUTOFF_CAP) return out;
      out.push({
        cycle: r.cycle,
        stage: r.stage ?? "",
        post: r.post ?? "",
        region: r.region ?? "",
        gender: r.gender ?? "",
        categoryLabel: r.categoryLabel,
        marks: r.marks,
        maxMarks: r.maxMarks ?? "",
        scoreType: r.scoreType ?? "",
        publisher: r.publisher ?? "",
      });
    }
  }
  return out;
}

function clampNum(v: any, lo: number, hi: number): number {
  const n = Number.isFinite(v) ? Number(v) : 0;
  return Math.max(lo, Math.min(hi, n));
}

function extractJson(text: string): any | null {
  let body = text.trim();
  if (body.startsWith("```")) {
    body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(body);
  } catch {
    const first = body.indexOf("{");
    const last = body.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;
    try {
      return JSON.parse(body.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}
