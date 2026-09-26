// Query + index-term normaliser for site-wide search (26 Sep 2026).
//
// Pure and isomorphic: the same function normalises what a student types (in
// the browser and on the server) and every key the index stores, so "Group II",
// "group-2" and "GROUP 2" all meet as "group 2", and "कक्षा १०" as "कक्षा 10".
// No prisma, no fetch, no next — the home strip ships this file to the client.
//
// Steps: NFKC → lower case → zero-width marks dropped → Indic / Arabic-Indic
// digits → ASCII → dotted abbreviations joined ("b.tech" → "btech", "u.p." →
// "up") → "10+2" → "12th", "a&n" / "j&k" → state words → punctuation → space
// → roman numerals after group / paper / tier / class / … ("group ii" →
// "group 2", never a bare "i") → letter+digit splits ("group2" → "group 2",
// "class10" → "class 10") → ordinals joined ("10 th" → "10th") → cut at 200.
//
// The Devanagari / Telugu letter-name decoder turns an acronym spelled in
// letter names back into Latin (एसएससी → ssc, टीएसपीएससी → tspsc). It only
// accepts a decode when the WHOLE word decodes, the result is 2-6 letters and
// (when a vocabulary is given) the result is a word the index already holds —
// nothing is guessed.

import type { QueryScript } from "./types";

export const MAX_QUERY_CHARS = 200;

const ZERO_WIDTH = /[​-‍⁠﻿]/g;

// Zero code points of the digit blocks: Devanagari, Bengali, Gurmukhi,
// Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam, Arabic-Indic, Extended
// Arabic-Indic (the same fold as normaliseCutoffText, plus Arabic).
const DIGIT_ZEROS = [0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0660, 0x06f0];

/** Indic and Arabic digits → ASCII ("कक्षा १०" → "कक्षा 10"). */
export function foldDigits(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    let d = -1;
    for (const z of DIGIT_ZEROS) {
      if (c >= z && c <= z + 9) {
        d = c - z;
        break;
      }
    }
    out += d >= 0 ? String(d) : ch;
  }
  return out;
}

const SCRIPT_RANGES: readonly [QueryScript, number, number][] = [
  ["deva", 0x0900, 0x097f],
  ["beng", 0x0980, 0x09ff],
  ["guru", 0x0a00, 0x0a7f],
  ["gujr", 0x0a80, 0x0aff],
  ["orya", 0x0b00, 0x0b7f],
  ["taml", 0x0b80, 0x0bff],
  ["telu", 0x0c00, 0x0c7f],
  ["knda", 0x0c80, 0x0cff],
  ["mlym", 0x0d00, 0x0d7f],
  ["arab", 0x0600, 0x06ff],
];

/** The script most of the letters are in: "latin" when there are none or all
 *  are Latin, "mixed" when no script holds 60% of them. */
export function detectScript(s: string): QueryScript {
  const counts = new Map<QueryScript, number>();
  let total = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    let script: QueryScript | null = null;
    if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0xc0 && c <= 0x24f)) script = "latin";
    else {
      for (const [name, lo, hi] of SCRIPT_RANGES) {
        if (c >= lo && c <= hi) {
          // Digits inside a block are not letters.
          if (!/\p{L}|\p{M}/u.test(ch)) break;
          script = name;
          break;
        }
      }
    }
    if (!script) continue;
    total++;
    counts.set(script, (counts.get(script) ?? 0) + 1);
  }
  if (total === 0) return "latin";
  let best: QueryScript = "latin";
  let bestN = -1;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return bestN / total >= 0.6 ? best : "mixed";
}

const ROMAN: Readonly<Record<string, number>> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
// Only after a word that numbers things — "i want" and "class x" differ.
const NUMBERED_WORDS = "group|grp|gurup|paper|tier|grade|part|phase|class|std|standard|varg|chapter|chap|ch|lesson|level|book|unit|sem|semester|puc";
const ROMAN_AFTER = new RegExp(`\\b(${NUMBERED_WORDS}) (xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)([ab]?)\\b`, "g");
const LETTER_DIGIT = new RegExp(`\\b(${NUMBERED_WORDS}|cls|kaksha)(\\d{1,2})([ab]?)\\b`, "g");

function preReplace(s: string): string {
  let t = s;
  // "b.tech" / "b. tech" → "btech"; "u.p." → "up"; "m.b.b.s" → "mbbs".
  for (let i = 0; i < 4; i++) {
    const next = t.replace(/\b([a-z])\.\s?(?=[a-z])/g, "$1");
    if (next === t) break;
    t = next;
  }
  t = t
    .replace(/\bph\.?\s?d\b/g, "phd")
    .replace(/\bll\.?\s?b\b/g, "llb")
    .replace(/\b10\s?\+\s?2\b/g, " 12th ")
    .replace(/(^|[\s(])\+\s?([12])(?!\d)/g, "$1plus $2")
    .replace(/\ba\s?&\s?n\b/g, " andaman ")
    .replace(/\bj\s?&\s?k\b/g, " jammu kashmir ")
    .replace(/&/g, " and ");
  return t;
}

function postReplace(s: string): string {
  return s
    .replace(ROMAN_AFTER, (_m, w: string, r: string, suf: string) => `${w} ${ROMAN[r]}${suf}`)
    .replace(LETTER_DIGIT, (_m, w: string, d: string, suf: string) => `${w} ${d}${suf}`)
    .replace(/\b(\d{1,2}) (st|nd|rd|th)\b/g, "$1$2")
    .replace(/(\d{1,2}) (वीं|वी|वां|वा|वें|वे|వది|వ)(?=\s|$)/g, "$1$2");
}

/** Normalise a query or an index key. `tokens` split on anything that is not
 *  a letter, digit or combining mark (so Devanagari matras stay attached). */
export function normaliseQuery(raw: string): { norm: string; script: QueryScript; tokens: string[] } {
  let s = String(raw ?? "").slice(0, 2 * MAX_QUERY_CHARS).normalize("NFKC").toLowerCase().replace(ZERO_WIDTH, "");
  const script = detectScript(s);
  s = foldDigits(s);
  s = preReplace(s);
  s = s.replace(/[^\p{L}\p{N}\p{M}]+/gu, " ").replace(/\s+/g, " ").trim();
  s = postReplace(s).replace(/\s+/g, " ").trim();
  if (s.length > MAX_QUERY_CHARS) s = s.slice(0, MAX_QUERY_CHARS).replace(/\s\S*$/, "").trim();
  const tokens = s ? s.split(" ") : [];
  return { norm: s, script, tokens };
}

/** The normalised form of one index key. */
export function normaliseTerm(s: string): string {
  return normaliseQuery(s).norm;
}

/** Latin letters and digits only. */
export function isLatinToken(t: string): boolean {
  return /^[a-z0-9]+$/.test(t);
}

// ── Letter-name acronym decoder ─────────────────────────────────────────
// How an acronym is written in Devanagari / Telugu: one syllable per Latin
// letter (एस = S, सी = C). Keys are NFKC-normalised at load so a composed and
// a decomposed spelling meet.

const DEVA_LETTER_NAMES: readonly [string, string][] = [
  ["डब्ल्यू", "w"], ["डबल्यू", "w"], ["एक्स", "x"], ["क्यू", "q"], ["वाई", "y"], ["ज़ेड", "z"], ["जेड", "z"],
  ["एस", "s"], ["सी", "c"], ["जी", "g"], ["एल", "l"], ["पी", "p"], ["यू", "u"], ["आर", "r"], ["बी", "b"], ["टी", "t"],
  ["एन", "n"], ["एम", "m"], ["डी", "d"], ["के", "k"], ["जे", "j"], ["आई", "i"], ["वी", "v"], ["एच", "h"], ["एफ", "f"],
  ["ई", "e"], ["ओ", "o"], ["ए", "a"],
];
const TELU_LETTER_NAMES: readonly [string, string][] = [
  ["డబ్ల్యూ", "w"], ["ఎక్స్", "x"], ["క్యూ", "q"], ["వై", "y"], ["జెడ్", "z"],
  ["హెచ్", "h"], ["ఎస్", "s"], ["ఎల్", "l"], ["ఎన్", "n"], ["ఎమ్", "m"], ["ఎం", "m"], ["ఎఫ్", "f"], ["ఆర్", "r"],
  ["సీ", "c"], ["సి", "c"], ["జీ", "g"], ["జి", "g"], ["పీ", "p"], ["పి", "p"], ["యూ", "u"], ["యు", "u"],
  ["బీ", "b"], ["బి", "b"], ["టీ", "t"], ["టి", "t"], ["డీ", "d"], ["డి", "d"], ["కే", "k"], ["కె", "k"],
  ["జే", "j"], ["జె", "j"], ["వీ", "v"], ["వి", "v"], ["ఈ", "e"], ["ఇ", "e"], ["ఐ", "i"], ["ఓ", "o"], ["ఏ", "a"], ["ఎ", "a"],
];

const prepLetters = (rows: readonly [string, string][]) =>
  rows.map(([k, v]) => [k.normalize("NFKC"), v] as [string, string]).sort((a, b) => b[0].length - a[0].length);
const DEVA_TABLE = prepLetters(DEVA_LETTER_NAMES);
const TELU_TABLE = prepLetters(TELU_LETTER_NAMES);

/**
 * Decode an acronym spelled in Devanagari / Telugu letter names. Returns null
 * unless the whole word decodes to 2-6 letters and (when `vocab` is given)
 * the result is already a word of the index.
 */
export function decodeLetterNames(word: string, vocab?: ReadonlySet<string>): string | null {
  const w = word.normalize("NFKC");
  const table = /[ऀ-ॿ]/.test(w) ? DEVA_TABLE : /[ఀ-౿]/.test(w) ? TELU_TABLE : null;
  if (!table || w.length > 40) return null;
  let found: string | null = null;
  const walk = (i: number, acc: string, depth: number): boolean => {
    if (depth > 8) return false;
    if (i === w.length) {
      if (acc.length < 2 || acc.length > 6) return false;
      if (vocab && !vocab.has(acc)) return false;
      found = acc;
      return true;
    }
    for (const [k, v] of table) {
      if (w.startsWith(k, i) && walk(i + k.length, acc + v, depth + 1)) return true;
    }
    return false;
  };
  walk(0, "", 0);
  return found;
}

// ── Fuzzy ───────────────────────────────────────────────────────────────

function trigrams(s: string): Set<string> {
  const t = ` ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
}

/** Dice coefficient over character trigrams (0..1), word against word. */
export function trigramDice(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return (2 * shared) / (A.size + B.size);
}
