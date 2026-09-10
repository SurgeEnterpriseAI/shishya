// "Nothing matched" must never be the end of the road (10 Sep 2026).
//
// Until today a search the catalogue could not answer rendered:
//   "No exam matches "SCT PC". Try a shorter query."
// which blames the aspirant for our gap. A Telangana student hit exactly
// that, enrolled in TAMIL NADU Police Constable instead, and only then
// wrote in — which is how we learned the word was unreachable at all.
//
// This is the deterministic fallback: no model call, no network, pure
// functions over the exam list the page already holds. It answers "which
// exams are CLOSEST to what they typed", and says WHY, so the UI can be
// honest about the difference between a match and a guess.
//
// Ranking, strongest signal first:
//   1. state   — the query names a state (STATE_WORDS via resolveAliases)
//   2. token   — a whole word of the query appears in the exam's text
//   3. fuzzy   — trigram similarity, which survives the typos students
//                actually make ("costable", "polytecnic", "eamcat")
// A candidate must clear its threshold, so a nonsense query returns nothing
// rather than a confident-looking wrong answer.

import { resolveAliases, type ExamLike } from "@/lib/exam-aliases";

export interface NearestHit<T> {
  exam: T;
  /** 0..1 — how close, for ordering only. Never shown to a student. */
  score: number;
  /** Why this surfaced, so the UI can label the group honestly. */
  why: "state" | "token" | "fuzzy";
}

/** Words too common to carry intent — matching on them surfaces noise. */
const STOP = new Set([
  "exam", "exams", "test", "tests", "paper", "papers", "prep", "preparation",
  "syllabus", "cutoff", "result", "results", "date", "dates", "vacancy",
  "vacancies", "notification", "online", "free", "best", "for", "the", "and",
  "job", "jobs", "recruitment", "govt", "government", "want", "prepare", "i",
]);

// Fuzzy is the weakest signal and short words share trigrams cheaply, so
// it has to clear a high bar. Measured against real queries: "polytecnic"
// vs "polytechnic" ≈ 0.9, "costable" vs "constable" ≈ 0.8, "eamcat" vs
// "eamcet" ≈ 0.6 — all survive; "guard" against unrelated exam words does
// not, which is what used to surface WBCS for "forest guard".
const MIN_FUZZY = 0.5;

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9ऀ-ൿ]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function trigrams(s: string): Set<string> {
  const t = ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  const out = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
}

/** Dice coefficient over character trigrams — 0..1, typo-tolerant. */
function similarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return (2 * shared) / (A.size + B.size);
}

/**
 * The closest exams to a query that matched nothing exactly.
 *
 * @param query  what the student typed
 * @param exams  the same list the picker already renders
 * @param limit  how many to offer — small; a long list of guesses is noise
 */
export function nearestExams<T extends ExamLike>(query: string, exams: T[], limit = 4): NearestHit<T>[] {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return [];
  const qTokens = tokens(q);
  const alias = resolveAliases(q);

  // How many exams each query word appears in. A word in one exam ("nursing")
  // identifies it; a word in a dozen ("officer") identifies nothing — and
  // without this, "nursing officer" ranked IBPS PO and SBI PO above the one
  // actual nursing exam, because "officer" matched them all equally.
  const docFreq = new Map<string, number>();
  for (const w of qTokens) {
    let n = 0;
    for (const e of exams) {
      if (`${e.shortName} ${e.name} ${e.code}`.toLowerCase().includes(w)) n++;
    }
    docFreq.set(w, n);
  }
  // A word that names most of the catalogue is filler, whatever it means.
  const distinctive = (w: string) => (docFreq.get(w) ?? 0) > 0 && (docFreq.get(w) ?? 0) <= Math.max(4, exams.length * 0.15);

  const hits: NearestHit<T>[] = [];
  for (const e of exams) {
    const text = `${e.shortName} ${e.name} ${e.code}`.toLowerCase();

    // 1 — the query named a state and this exam belongs to it. Strongest:
    // "kashmir constable" should reach J&K even with no name overlap.
    if (alias.state && e.state === alias.state) {
      hits.push({ exam: e, score: 0.9, why: "state" });
      continue;
    }

    // 2 — a DISTINCTIVE word of the query appears in the exam's own text,
    // scored by how rare that word is across the catalogue.
    const eTokens = new Set(tokens(text));
    const matched = qTokens.filter((w) => (eTokens.has(w) || text.includes(w)) && distinctive(w));
    if (matched.length > 0) {
      const rarity = Math.max(...matched.map((w) => 1 / (docFreq.get(w) ?? 1)));
      hits.push({ exam: e, score: 0.5 + 0.35 * rarity, why: "token" });
      continue;
    }

    // 3 — typo tolerance, WORD against WORD. Comparing the query to the
    // whole name dilutes the score to nothing: "polytecnic" against
    // "AP Polytechnic Common Entrance Test (AP POLYCET)" shares few
    // trigrams as a string, but is nearly identical to the word
    // "polytechnic" inside it. So score each query word against each
    // exam word and keep the best pair.
    const words = [...eTokens].filter((w) => w.length >= 4);
    let best = similarity(q, e.shortName);
    for (const qw of qTokens) {
      if (qw.length < 4) continue;
      for (const w of words) {
        const sim = similarity(qw, w);
        if (sim > best) best = sim;
      }
    }
    if (best >= MIN_FUZZY) hits.push({ exam: e, score: best, why: "fuzzy" });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
