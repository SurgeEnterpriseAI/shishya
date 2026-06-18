// Per-candidate aptitude test generator. SERVER-ONLY (it builds the answer
// key). Quant + Reasoning questions are procedurally generated from random
// parameters with the answer COMPUTED IN CODE — so the key is always
// correct and every candidate gets different numbers. Verbal items are
// sampled from a curated bank. The caller seals the key (src/lib/aptitude/
// seal.ts) before sending the answer-stripped questions to the browser.

import {
  APTITUDE_CONFIG,
  type AptitudeSection,
  type KeyItem,
  type PublicAptitudeQuestion,
} from "@/data/aptitude";

// One generated question before option-shuffling: a correct answer + a few
// plausible distractors (all as display strings).
interface RawQ {
  section: AptitudeSection;
  question: string;
  correct: string;
  distractors: string[];
}

// ── tiny RNG helpers (server request scope — Math.random is fine) ───────
const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const letter = (idx: number) => String.fromCharCode(65 + (((idx % 26) + 26) % 26));

// ── QUANT generators ───────────────────────────────────────────────────
const QUANT_GENS: Array<() => RawQ> = [
  // Train crossing a pole
  () => {
    const sp = pick([
      { kmh: 36, ms: 10 }, { kmh: 54, ms: 15 }, { kmh: 72, ms: 20 },
      { kmh: 90, ms: 25 }, { kmh: 108, ms: 30 },
    ]);
    const t = pick([6, 7, 8, 9, 10, 12]);
    const L = sp.ms * t;
    return {
      section: "QUANT",
      question: `A train ${L} m long is running at ${sp.kmh} km/hr. How long will it take to cross a pole?`,
      correct: `${t} seconds`,
      distractors: [`${t + 2} seconds`, `${t + 4} seconds`, `${Math.max(2, t - 2)} seconds`],
    };
  },
  // X% of N
  () => {
    const p = pick([5, 10, 20, 25, 40, 50]);
    const N = 20 * ri(4, 25);
    const ans = (p * N) / 100;
    return {
      section: "QUANT",
      question: `What is ${p}% of ${N}?`,
      correct: `${ans}`,
      distractors: [`${ans + p}`, `${Math.max(1, ans - p)}`, `${ans + 2 * p}`],
    };
  },
  // Simple interest
  () => {
    const P = 100 * ri(10, 90);
    const R = pick([5, 6, 8, 10, 12]);
    const T = ri(2, 5);
    const SI = (P * R * T) / 100;
    return {
      section: "QUANT",
      question: `Find the simple interest on Rs ${P} at ${R}% per annum for ${T} years.`,
      correct: `Rs ${SI}`,
      distractors: [`Rs ${Math.round(SI * 1.2)}`, `Rs ${Math.round(SI * 0.8)}`, `Rs ${Math.round(SI * 1.5)}`],
    };
  },
  // Average of first n natural numbers
  () => {
    const n = pick([10, 20, 30, 40, 50, 100]);
    const avg = (n + 1) / 2;
    return {
      section: "QUANT",
      question: `What is the average of the first ${n} natural numbers?`,
      correct: `${avg}`,
      distractors: [`${avg + 0.5}`, `${avg + 1}`, `${avg - 1}`],
    };
  },
  // Markup + discount → profit %
  () => {
    const c = pick([
      { m: 40, d: 10, p: 26 }, { m: 50, d: 20, p: 20 }, { m: 20, d: 10, p: 8 },
      { m: 60, d: 25, p: 20 }, { m: 50, d: 10, p: 35 }, { m: 40, d: 25, p: 5 },
    ]);
    return {
      section: "QUANT",
      question: `A shopkeeper marks his goods ${c.m}% above cost and then allows a ${c.d}% discount. His profit percent is`,
      correct: `${c.p}%`,
      distractors: [`${c.p + 4}%`, `${c.p + 9}%`, `${Math.max(1, c.p - 6)}%`],
    };
  },
  // Two pipes filling a tank
  () => {
    const c = pick([
      { a: 12, b: 24, t: 8 }, { a: 10, b: 15, t: 6 }, { a: 20, b: 30, t: 12 },
      { a: 6, b: 12, t: 4 }, { a: 15, b: 30, t: 10 }, { a: 12, b: 36, t: 9 },
    ]);
    return {
      section: "QUANT",
      question: `Two pipes can fill a tank in ${c.a} and ${c.b} minutes respectively. If both are opened together, the tank fills in`,
      correct: `${c.t} minutes`,
      distractors: [`${c.t + 2} minutes`, `${c.a + c.b} minutes`, `${Math.round((c.a + c.b) / 2)} minutes`],
    };
  },
  // Men × days work
  () => {
    const m1 = pick([10, 12, 15, 18, 20]);
    const d1 = pick([12, 16, 20, 24]);
    const m2 = pick([24, 25, 30, 36, 40]);
    const work = m1 * d1;
    // ensure clean integer days
    const d2 = work / m2;
    if (!Number.isInteger(d2)) {
      // fall back to a guaranteed-clean combo
      return {
        section: "QUANT",
        question: `15 men complete a piece of work in 20 days. How many days will 25 men take to do the same work?`,
        correct: `12 days`,
        distractors: [`10 days`, `15 days`, `18 days`],
      };
    }
    return {
      section: "QUANT",
      question: `${m1} men complete a piece of work in ${d1} days. How many days will ${m2} men take to do the same work?`,
      correct: `${d2} days`,
      distractors: [`${d2 + 2} days`, `${Math.max(1, d2 - 2)} days`, `${d2 + 4} days`],
    };
  },
  // Boat downstream speed
  () => {
    const still = pick([8, 10, 12, 15, 18]);
    const stream = pick([2, 3, 4, 5]);
    return {
      section: "QUANT",
      question: `The speed of a boat in still water is ${still} km/hr and the speed of the stream is ${stream} km/hr. Its downstream speed is`,
      correct: `${still + stream} km/hr`,
      distractors: [`${still - stream} km/hr`, `${still} km/hr`, `${still + 2 * stream} km/hr`],
    };
  },
  // Average speed (distance / time)
  () => {
    const speed = pick([40, 45, 50, 60, 75, 80]);
    const time = pick([2, 2.5, 3, 4]);
    const dist = speed * time;
    return {
      section: "QUANT",
      question: `A car covers ${dist} km in ${time} hours. Its average speed is`,
      correct: `${speed} km/hr`,
      distractors: [`${speed + 5} km/hr`, `${speed - 5} km/hr`, `${speed + 10} km/hr`],
    };
  },
  // Simple linear equation
  () => {
    const a = pick([2, 3, 4, 5]);
    const x = ri(3, 12);
    const b = ri(2, 15);
    const c = a * x + b;
    return {
      section: "QUANT",
      question: `If ${a}x + ${b} = ${c}, then x is`,
      correct: `${x}`,
      distractors: [`${x + 1}`, `${x - 1}`, `${x + 2}`],
    };
  },
  // Ratio chaining a:b, b:c → a:c
  () => {
    const a = ri(1, 4), b1 = ri(2, 5), b2 = ri(2, 5), c = ri(2, 6);
    const A = a * b2, C = b1 * c;
    const g = gcd(A, C);
    return {
      section: "QUANT",
      question: `If a : b = ${a} : ${b1} and b : c = ${b2} : ${c}, then a : c is`,
      correct: `${A / g} : ${C / g}`,
      distractors: [`${C / g} : ${A / g}`, `${A / g + 1} : ${C / g}`, `${A / g} : ${C / g + 1}`, `${b1} : ${b2}`],
    };
  },
  // Compound interest for 2 years
  () => {
    const P = pick([10000, 20000, 8000, 5000, 16000]);
    const R = pick([10, 5, 20, 25]);
    const amt = P * (1 + R / 100) ** 2;
    const CI = Math.round(amt - P);
    return {
      section: "QUANT",
      question: `Find the compound interest on Rs ${P} at ${R}% per annum for 2 years.`,
      correct: `Rs ${CI}`,
      distractors: [`Rs ${(P * R * 2) / 100}`, `Rs ${CI + 200}`, `Rs ${Math.max(1, CI - 200)}`],
    };
  },
];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// ── REASONING generators ───────────────────────────────────────────────
const REASON_GENS: Array<() => RawQ> = [
  // Arithmetic progression — next term
  () => {
    const a = ri(1, 6), d = ri(2, 7);
    const seq = [a, a + d, a + 2 * d, a + 3 * d, a + 4 * d];
    const next = a + 5 * d;
    return {
      section: "REASONING",
      question: `Find the next number in the series: ${seq.join(", ")}, ?`,
      correct: `${next}`,
      distractors: [`${next + d}`, `${next - 1}`, `${next + 1}`],
    };
  },
  // Geometric progression — next term
  () => {
    const a = pick([2, 3, 4]), r = pick([2, 3]);
    const seq = [a, a * r, a * r ** 2, a * r ** 3];
    const next = a * r ** 4;
    return {
      section: "REASONING",
      question: `Find the next number in the series: ${seq.join(", ")}, ?`,
      correct: `${next}`,
      distractors: [`${next + a * r ** 3}`, `${next - a}`, `${next + a}`],
    };
  },
  // Perfect squares
  () => {
    const k = ri(1, 6);
    const seq = [k, k + 1, k + 2, k + 3, k + 4].map((x) => x * x);
    const next = (k + 5) ** 2;
    return {
      section: "REASONING",
      question: `Find the next number in the series: ${seq.join(", ")}, ?`,
      correct: `${next}`,
      distractors: [`${next - 1}`, `${(k + 4) ** 2 + (k + 5)}`, `${next + (k + 5)}`],
    };
  },
  // x → 2x + 1
  () => {
    let v = ri(2, 6);
    const seq = [v];
    for (let i = 0; i < 3; i++) { v = 2 * v + 1; seq.push(v); }
    const next = 2 * v + 1;
    return {
      section: "REASONING",
      question: `Find the next number in the series: ${seq.join(", ")}, ?`,
      correct: `${next}`,
      distractors: [`${next - 2}`, `${2 * v}`, `${next + 4}`],
    };
  },
  // Letter series with a fixed step
  () => {
    const s = ri(0, 14), step = pick([2, 3, 4]);
    const seq = [s, s + step, s + 2 * step, s + 3 * step].map(letter);
    const next = letter(s + 4 * step);
    return {
      section: "REASONING",
      question: `Complete the letter series: ${seq.join(", ")}, ?`,
      correct: next,
      distractors: [letter(s + 4 * step + 1), letter(s + 4 * step - 1), letter(s + 3 * step)],
    };
  },
  // Odd one out — composite among primes
  () => {
    const primes = shuffle([3, 5, 7, 11, 13, 17, 19, 23]).slice(0, 3);
    const composite = pick([9, 15, 21, 25, 27, 33, 35, 49]);
    return {
      section: "REASONING",
      question: `Find the odd one out: ${shuffle([...primes, composite]).join(", ")}`,
      correct: `${composite}`,
      distractors: primes.map(String),
    };
  },
  // Number analogy — cube
  () => {
    const x = ri(3, 7);
    return {
      section: "REASONING",
      question: `2 : 8 :: ${x} : ?  (find the missing number)`,
      correct: `${x ** 3}`,
      distractors: [`${x ** 2}`, `${x * 3}`, `${x ** 3 - x}`, `${x ** 3 + x}`],
    };
  },
  // Direction sense — single right/left turn
  () => {
    const dirs = ["North", "East", "South", "West"];
    const startIdx = ri(0, 3);
    const turn = pick(["right", "left"]);
    const d1 = ri(3, 9), d2 = ri(2, 7);
    const finalIdx = turn === "right" ? (startIdx + 1) % 4 : (startIdx + 3) % 4;
    return {
      section: "REASONING",
      question: `A man walks ${d1} km towards ${dirs[startIdx]}, then turns ${turn} and walks ${d2} km. Which direction is he now facing?`,
      correct: dirs[finalIdx],
      distractors: dirs.filter((_, i) => i !== finalIdx),
    };
  },
  // Letter-shift coding
  () => {
    const word = pick(["CAT", "DOG", "SUN", "BED", "CUP", "PEN", "HAT", "BUS", "MAP", "TOP"]);
    const k = pick([1, 2, 3]);
    const code = (w: string, s: number) =>
      w.split("").map((ch) => letter(ch.charCodeAt(0) - 65 + s)).join("");
    return {
      section: "REASONING",
      question: `If each letter is shifted ${k} place(s) forward in the alphabet, how is "${word}" coded?`,
      correct: code(word, k),
      distractors: [code(word, k + 1), code(word, k - 1 || 4), word.split("").reverse().join("")],
    };
  },
  // Day of week after N days
  () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = ri(0, 6), n = ri(8, 60);
    const ans = days[(today + n) % 7];
    return {
      section: "REASONING",
      question: `If today is ${days[today]}, what day of the week will it be after ${n} days?`,
      correct: ans,
      distractors: shuffle(days.filter((d) => d !== ans)).slice(0, 3),
    };
  },
];

// ── VERBAL bank (sampled, not generated) ───────────────────────────────
const VERBAL_BANK: RawQ[] = [
  { section: "VERBAL", question: "Choose the synonym of ABUNDANT.", correct: "Plentiful", distractors: ["Scarce", "Empty", "Tiny"] },
  { section: "VERBAL", question: "Choose the synonym of BRAVE.", correct: "Courageous", distractors: ["Cowardly", "Weak", "Timid"] },
  { section: "VERBAL", question: "Choose the synonym of RAPID.", correct: "Swift", distractors: ["Slow", "Steady", "Late"] },
  { section: "VERBAL", question: "Choose the synonym of HUGE.", correct: "Enormous", distractors: ["Minute", "Slight", "Narrow"] },
  { section: "VERBAL", question: "Choose the synonym of HONEST.", correct: "Truthful", distractors: ["Deceitful", "Cunning", "Shy"] },
  { section: "VERBAL", question: "Choose the synonym of WEALTHY.", correct: "Affluent", distractors: ["Poor", "Frugal", "Humble"] },
  { section: "VERBAL", question: "Choose the antonym of ANCIENT.", correct: "Modern", distractors: ["Old", "Antique", "Historic"] },
  { section: "VERBAL", question: "Choose the antonym of EXPAND.", correct: "Contract", distractors: ["Enlarge", "Grow", "Stretch"] },
  { section: "VERBAL", question: "Choose the antonym of VICTORY.", correct: "Defeat", distractors: ["Triumph", "Success", "Win"] },
  { section: "VERBAL", question: "Choose the antonym of GENEROUS.", correct: "Stingy", distractors: ["Kind", "Liberal", "Giving"] },
  { section: "VERBAL", question: "Choose the antonym of TEMPORARY.", correct: "Permanent", distractors: ["Brief", "Passing", "Short"] },
  { section: "VERBAL", question: "Choose the antonym of HUMBLE.", correct: "Arrogant", distractors: ["Modest", "Meek", "Gentle"] },
  { section: "VERBAL", question: "Choose the correctly spelled word.", correct: "Accommodate", distractors: ["Acommodate", "Accomodate", "Acomodate"] },
  { section: "VERBAL", question: "Choose the correctly spelled word.", correct: "Necessary", distractors: ["Neccessary", "Necesary", "Neccesary"] },
  { section: "VERBAL", question: "Choose the correctly spelled word.", correct: "Definitely", distractors: ["Definately", "Definatly", "Defenitely"] },
  { section: "VERBAL", question: "Choose the correctly spelled word.", correct: "Privilege", distractors: ["Priviledge", "Privelege", "Privilage"] },
  { section: "VERBAL", question: "Fill in the blank: She is good ___ mathematics.", correct: "at", distractors: ["in", "on", "with"] },
  { section: "VERBAL", question: "Fill in the blank: He has been living here ___ 2010.", correct: "since", distractors: ["for", "from", "by"] },
  { section: "VERBAL", question: "Fill in the blank: Neither of the boys ___ present today.", correct: "was", distractors: ["are", "were", "have"] },
  { section: "VERBAL", question: "Fill in the blank: The book is ___ the table.", correct: "on", distractors: ["in", "at", "into"] },
  { section: "VERBAL", question: "One word for 'a person who cannot read or write' is", correct: "Illiterate", distractors: ["Ignorant", "Innocent", "Illegible"] },
  { section: "VERBAL", question: "One word for 'the study of living organisms' is", correct: "Biology", distractors: ["Geology", "Zoology", "Botany"] },
  { section: "VERBAL", question: "One word for 'a place where books are kept' is", correct: "Library", distractors: ["Bookshop", "Archive", "Gallery"] },
  { section: "VERBAL", question: "Identify the part with the error: He / don't like / coffee / in the morning.", correct: "don't like", distractors: ["He", "coffee", "in the morning"] },
  { section: "VERBAL", question: "Identify the part with the error: One of my friend / is / a doctor / in Delhi.", correct: "One of my friend", distractors: ["is", "a doctor", "in Delhi"] },
];

// ── Assembly ────────────────────────────────────────────────────────────
function buildOptions(correct: string, distractors: string[]): string[] {
  const out = [correct];
  for (const d of distractors) {
    if (out.length >= 4) break;
    if (!out.includes(d)) out.push(d);
  }
  // Safety net — guarantee 4 distinct options even if a generator returned
  // colliding distractors (rare). Uses real aptitude-style fillers (never
  // the correct answer) rather than placeholder text.
  for (const filler of ["None of these", "Cannot be determined", "All of these"]) {
    if (out.length >= 4) break;
    if (!out.includes(filler)) out.push(filler);
  }
  return shuffle(out);
}

/**
 * Build one fresh aptitude paper: 12 Quant + 10 Reasoning + 8 Verbal, every
 * one randomized so no two candidates get the same test. Returns the public
 * (answer-stripped) questions and the matching answer key.
 */
export function generateAptitudeTest(): {
  questions: PublicAptitudeQuestion[];
  key: KeyItem[];
} {
  const raws: RawQ[] = [];
  // Use each generator once (shuffled order) so a test draws on the full
  // template set; numbers differ every run.
  shuffle([...QUANT_GENS]).slice(0, APTITUDE_CONFIG.perSection.QUANT).forEach((g) => raws.push(g()));
  shuffle([...REASON_GENS]).slice(0, APTITUDE_CONFIG.perSection.REASONING).forEach((g) => raws.push(g()));
  shuffle([...VERBAL_BANK]).slice(0, APTITUDE_CONFIG.perSection.VERBAL).forEach((v) => raws.push(v));

  const questions: PublicAptitudeQuestion[] = [];
  const key: KeyItem[] = [];
  raws.forEach((r, idx) => {
    const id = `g${idx}`;
    const options = buildOptions(r.correct, r.distractors);
    questions.push({ id, section: r.section, question: r.question, options });
    key.push({ id, section: r.section, answer: options.indexOf(r.correct) });
  });
  return { questions, key };
}
