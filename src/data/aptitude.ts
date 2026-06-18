// Surge admission aptitude test — question bank + selection + scoring.
//
// SERVER-ONLY. This file holds the answer keys, so it must never be
// imported into a Client Component. The /aptitude page (server) strips
// answers via toPublic() before handing questions to the browser; the
// /api/aptitude/submit route scores submissions against APTITUDE_POOL.
//
// Style mirrors the aptitude rounds used by TCS (NQT), Infosys, Wipro,
// Cognizant etc.: Quantitative Aptitude, Logical Reasoning, and Verbal
// Ability. Every answer key here has been hand-verified.

export type AptitudeSection = "QUANT" | "REASONING" | "VERBAL";

export interface AptitudeQuestion {
  id: string;
  section: AptitudeSection;
  question: string;
  options: string[]; // exactly 4
  answer: number; // 0-based index of the correct option
}

/** What the browser sees — no answer key. */
export interface PublicAptitudeQuestion {
  id: string;
  section: AptitudeSection;
  question: string;
  options: string[];
}

// ── Test configuration ────────────────────────────────────────────────
export const APTITUDE_CONFIG = {
  durationMinutes: 30,
  totalQuestions: 30,
  // Per-section counts in a served test (must sum to totalQuestions).
  perSection: { QUANT: 12, REASONING: 10, VERBAL: 8 } as Record<AptitudeSection, number>,
  // Pass mark — a candidate clearing this is shortlisted for the Surge
  // admission process. 60% is a typical IT-services aptitude cutoff.
  passPercent: 60,
} as const;

export const SECTION_LABEL: Record<AptitudeSection, string> = {
  QUANT: "Quantitative Aptitude",
  REASONING: "Logical Reasoning",
  VERBAL: "Verbal Ability",
};

// ── Question pool ──────────────────────────────────────────────────────
// More questions than a single test needs, so different candidates get
// different subsets (harder to leak). Each test pulls perSection counts.
export const APTITUDE_POOL: AptitudeQuestion[] = [
  // ----- QUANTITATIVE APTITUDE -----
  { id: "q01", section: "QUANT", question: "A train 120 m long runs at 54 km/hr. How long does it take to cross a pole?", options: ["6 seconds", "8 seconds", "10 seconds", "12 seconds"], answer: 1 },
  { id: "q02", section: "QUANT", question: "What is 25% of 480?", options: ["110", "120", "130", "140"], answer: 1 },
  { id: "q03", section: "QUANT", question: "What is the average of the first 10 natural numbers?", options: ["5", "5.5", "6", "6.5"], answer: 1 },
  { id: "q04", section: "QUANT", question: "A sum of money doubles itself in 8 years at simple interest. What is the rate of interest per annum?", options: ["10%", "12%", "12.5%", "15%"], answer: 2 },
  { id: "q05", section: "QUANT", question: "If a : b = 2 : 3 and b : c = 4 : 5, then a : c is", options: ["8 : 15", "2 : 5", "8 : 12", "6 : 5"], answer: 0 },
  { id: "q06", section: "QUANT", question: "Find the compound interest on Rs 10,000 at 10% per annum for 2 years.", options: ["Rs 2,000", "Rs 2,100", "Rs 2,200", "Rs 1,900"], answer: 1 },
  { id: "q07", section: "QUANT", question: "A shopkeeper marks his goods 40% above cost and allows a 10% discount. His profit percent is", options: ["20%", "24%", "26%", "30%"], answer: 2 },
  { id: "q08", section: "QUANT", question: "Two pipes can fill a tank in 12 minutes and 24 minutes respectively. If both are opened together, the tank fills in", options: ["6 minutes", "8 minutes", "9 minutes", "10 minutes"], answer: 1 },
  { id: "q09", section: "QUANT", question: "The speed of a boat in still water is 10 km/hr and the stream is 2 km/hr. Its downstream speed is", options: ["8 km/hr", "10 km/hr", "12 km/hr", "14 km/hr"], answer: 2 },
  { id: "q10", section: "QUANT", question: "The HCF of 36 and 48 is", options: ["6", "9", "12", "18"], answer: 2 },
  { id: "q11", section: "QUANT", question: "The LCM of 12 and 18 is", options: ["24", "30", "36", "72"], answer: 2 },
  { id: "q12", section: "QUANT", question: "A man buys 12 apples for Rs 10 and sells 10 apples for Rs 12. His profit percent is", options: ["20%", "30%", "40%", "44%"], answer: 3 },
  { id: "q13", section: "QUANT", question: "If 3x − 7 = 11, then x is", options: ["4", "5", "6", "7"], answer: 2 },
  { id: "q14", section: "QUANT", question: "A number divided by 5 leaves remainder 3. What is the remainder when twice the number is divided by 5?", options: ["1", "2", "3", "4"], answer: 0 },
  { id: "q15", section: "QUANT", question: "15 men complete a piece of work in 20 days. How many days will 25 men take to do the same work?", options: ["10 days", "12 days", "15 days", "18 days"], answer: 1 },
  { id: "q16", section: "QUANT", question: "Express 7/8 as a percentage.", options: ["77.5%", "82.5%", "87.5%", "90%"], answer: 2 },
  { id: "q17", section: "QUANT", question: "The simple interest on Rs 5,000 at 8% per annum for 3 years is", options: ["Rs 1,000", "Rs 1,200", "Rs 1,400", "Rs 1,500"], answer: 1 },
  { id: "q18", section: "QUANT", question: "A car covers 150 km in 2.5 hours. Its average speed is", options: ["55 km/hr", "60 km/hr", "65 km/hr", "75 km/hr"], answer: 1 },

  // ----- LOGICAL REASONING -----
  { id: "r01", section: "REASONING", question: "Find the next number in the series: 2, 6, 12, 20, 30, ?", options: ["38", "40", "42", "44"], answer: 2 },
  { id: "r02", section: "REASONING", question: "Find the next number: 3, 9, 27, 81, ?", options: ["162", "210", "243", "324"], answer: 2 },
  { id: "r03", section: "REASONING", question: "Find the odd one out: 3, 5, 7, 9, 11", options: ["3", "5", "9", "11"], answer: 2 },
  { id: "r04", section: "REASONING", question: "If CAT is coded as DBU, then DOG is coded as", options: ["EPH", "EPG", "FPH", "EQH"], answer: 0 },
  { id: "r05", section: "REASONING", question: "Pointing to a photo, a man said, \"She is the daughter of my grandfather's only son.\" How is she related to the man?", options: ["Mother", "Sister", "Aunt", "Cousin"], answer: 1 },
  { id: "r06", section: "REASONING", question: "Find the next number: 1, 4, 9, 16, 25, ?", options: ["30", "36", "49", "32"], answer: 1 },
  { id: "r07", section: "REASONING", question: "Find the next number: 1, 1, 2, 3, 5, 8, ?", options: ["11", "12", "13", "15"], answer: 2 },
  { id: "r08", section: "REASONING", question: "Complete the letter series: A, C, E, G, ?", options: ["H", "I", "J", "K"], answer: 1 },
  { id: "r09", section: "REASONING", question: "Find the next number: 5, 11, 23, 47, ?", options: ["86", "91", "94", "95"], answer: 3 },
  { id: "r10", section: "REASONING", question: "A man walks 5 km towards north, then turns right and walks 3 km. Which direction is he now facing?", options: ["North", "South", "East", "West"], answer: 2 },
  { id: "r11", section: "REASONING", question: "Find the odd one out: Dog, Cat, Lion, Apple", options: ["Dog", "Cat", "Lion", "Apple"], answer: 3 },
  { id: "r12", section: "REASONING", question: "All roses are flowers. Some flowers fade quickly. Which conclusion definitely follows?", options: ["Some roses fade quickly", "All flowers are roses", "Some flowers are roses", "No rose fades quickly"], answer: 2 },
  { id: "r13", section: "REASONING", question: "If ONE = 3, TWO = 3, THREE = 5, then SIX = ? (based on number of letters)", options: ["3", "4", "5", "6"], answer: 0 },
  { id: "r14", section: "REASONING", question: "Complete the series: Z, X, V, T, ?", options: ["P", "Q", "R", "S"], answer: 2 },
  { id: "r15", section: "REASONING", question: "What is the angle between the hands of a clock at 3:00?", options: ["60°", "75°", "90°", "120°"], answer: 2 },
  { id: "r16", section: "REASONING", question: "Find the next number: 7, 14, 28, 56, ?", options: ["98", "108", "112", "120"], answer: 2 },

  // ----- VERBAL ABILITY -----
  { id: "v01", section: "VERBAL", question: "Choose the synonym of ABUNDANT.", options: ["Scarce", "Plentiful", "Empty", "Tiny"], answer: 1 },
  { id: "v02", section: "VERBAL", question: "Choose the antonym of ANCIENT.", options: ["Old", "Antique", "Modern", "Historic"], answer: 2 },
  { id: "v03", section: "VERBAL", question: "Choose the correctly spelled word.", options: ["Acommodate", "Accomodate", "Accommodate", "Acomodate"], answer: 2 },
  { id: "v04", section: "VERBAL", question: "Choose the synonym of BRAVE.", options: ["Cowardly", "Courageous", "Weak", "Timid"], answer: 1 },
  { id: "v05", section: "VERBAL", question: "Choose the antonym of EXPAND.", options: ["Enlarge", "Grow", "Contract", "Stretch"], answer: 2 },
  { id: "v06", section: "VERBAL", question: "Fill in the blank: She is good ___ mathematics.", options: ["in", "at", "on", "with"], answer: 1 },
  { id: "v07", section: "VERBAL", question: "One word for 'a person who cannot read or write' is", options: ["Illiterate", "Ignorant", "Innocent", "Illegible"], answer: 0 },
  { id: "v08", section: "VERBAL", question: "Identify the part with the error: He / don't like / coffee / in the morning.", options: ["He", "don't like", "coffee", "in the morning"], answer: 1 },
  { id: "v09", section: "VERBAL", question: "Choose the synonym of RAPID.", options: ["Slow", "Swift", "Steady", "Late"], answer: 1 },
  { id: "v10", section: "VERBAL", question: "Choose the antonym of VICTORY.", options: ["Triumph", "Success", "Defeat", "Win"], answer: 2 },
  { id: "v11", section: "VERBAL", question: "Fill in the blank: Neither of the boys ___ present today.", options: ["are", "were", "was", "have"], answer: 2 },
  { id: "v12", section: "VERBAL", question: "One word for 'the study of living organisms' is", options: ["Geology", "Biology", "Zoology", "Botany"], answer: 1 },
];

/** Strip the answer key for client delivery. */
export function toPublic(q: AptitudeQuestion): PublicAptitudeQuestion {
  return { id: q.id, section: q.section, question: q.question, options: q.options };
}

/**
 * Deterministic-ish shuffle using a seed so the same page render is
 * stable, while different loads (different seeds) get different sets.
 * No Math.random in module scope — the caller passes a seed.
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a 30-question test (12 quant + 10 reasoning + 8 verbal),
 * answer-stripped and section-interleaved. `seed` makes the selection
 * reproducible for one render; pass a fresh seed per candidate load.
 */
export function buildAptitudeTest(seed: number): PublicAptitudeQuestion[] {
  const out: PublicAptitudeQuestion[] = [];
  (Object.keys(APTITUDE_CONFIG.perSection) as AptitudeSection[]).forEach((section, idx) => {
    const need = APTITUDE_CONFIG.perSection[section];
    const pool = APTITUDE_POOL.filter((q) => q.section === section);
    const picked = seededShuffle(pool, seed + idx * 101).slice(0, need);
    out.push(...picked.map(toPublic));
  });
  return out;
}

export interface ScoredResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  sections: Record<AptitudeSection, { correct: number; total: number }>;
}

/**
 * Score a submission. `answers` is a map of questionId → chosen option
 * index. Unknown ids are ignored; unanswered questions count as wrong.
 * `total` is fixed at the configured test length so partial submissions
 * (e.g. time-out) are scored against the full paper.
 */
export function scoreAptitude(answers: Record<string, number>): ScoredResult {
  const byId = new Map(APTITUDE_POOL.map((q) => [q.id, q]));
  const sections: Record<AptitudeSection, { correct: number; total: number }> = {
    QUANT: { correct: 0, total: 0 },
    REASONING: { correct: 0, total: 0 },
    VERBAL: { correct: 0, total: 0 },
  };
  let score = 0;
  let answered = 0;
  for (const [id, choice] of Object.entries(answers)) {
    const q = byId.get(id);
    if (!q) continue;
    answered++;
    sections[q.section].total++;
    if (q.answer === choice) {
      score++;
      sections[q.section].correct++;
    }
  }
  const total = APTITUDE_CONFIG.totalQuestions;
  const percent = Math.round((score / total) * 100);
  return {
    score,
    total,
    percent,
    passed: percent >= APTITUDE_CONFIG.passPercent,
    sections,
  };
}
