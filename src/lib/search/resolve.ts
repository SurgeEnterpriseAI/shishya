// resolveQuery (26 Sep 2026): what a student typed → the page Shishya already
// has for it. Pure and isomorphic — the home strip runs it in the browser over
// the lite index; /ask runs it on the server over the deep index. No model,
// no prisma, no fetch, no next.
//
// Three outcomes:
//   direct — one page clearly fits: open it (the /ask server route 307s).
//   list   — several pages fit, or a word is not in the catalogue: show them.
//   ai     — no page fits, or the query is a real doubt: the AI answers and
//            recommends real pages (never for Class 1-7, never for a bot).
//
// Scoring per page (m in 0..1):
//   1.00  the typed name equals one of the page's names (exact);
//         a bare family name → its main exam (DEFAULT_FAMILY, 1.02)
//   0.95  a fully resolved school structure (class → subject → chapter),
//         a state / section / intent landing with nothing else typed
//   0.92  a distinctive acronym (in ≤ 3 pages) that names the page
//   0.90 × coverage — idf-weighted share of the typed words the page's names
//         explain (typos at 0.8, a half-typed last word at 0.7 while typing;
//         soft words at 0.3 weight; words in no page at half weight)
//   adjustments: a named section / kind (+0.05 or ×0.6), a named state
//   (+0.1 same, ×0.5 other state, ×0.85 national), a school query next to an
//   exam (×0.5, olympiads excepted), exam-page words next to a non-exam page
//   (×0.8), popularity (+0.03 × weight).
// DIRECT needs ≥ DIRECT_MIN, every typed word explained, a DIRECT_MARGIN lead
// over the best page of a DIFFERENT entity (an exam's sub-pages never compete
// with each other; a college with its branches), no doubt, and a page that
// exists for the asked intent.

import type {
  DocKind,
  ExamIntent,
  Outcome,
  ParsedQuery,
  Resolution,
  SearchDoc,
  SearchHit,
  SearchIndex,
  SearchNotice,
  SearchSection,
  HitWhy,
} from "./types";
import { DIRECT_MARGIN, DIRECT_MIN, LIST_MIN, RECOMMEND_MIN, SCHOOL_AI_MODE } from "./types";
import { parseQuery } from "./parse";
import { decodeLetterNames, isLatinToken, normaliseTerm, trigramDice } from "./normalize";
import { INTENT_LABEL, examIntentUrl, examSiblingIntents, isSafePath, knownUrl, localeTarget } from "./targets";
import {
  BOARD_PAPER_WORDS,
  DEFAULT_FAMILY,
  DEGREE_STREAM,
  EXAM_SUBJECT_WORDS,
  FILLER_SOFT_WORDS,
  INTENT_LANDING,
  INTENT_PHRASES,
  PLURAL_COLLEGE_WORDS,
  SCHOOL_PAGE_INTENTS,
  SECTION_PHRASES,
  SUBJECT_NEAREST,
  SUBJECT_TARGETS,
} from "./lexicon";
import { STATES } from "@/lib/state-info";
import { nearestExams } from "@/lib/exam-nearest";

export const FUZZY_MIN = 0.72;
const FUZZY_WEIGHT = 0.8;
const PREFIX_WEIGHT = 0.7;
const SOFT_WEIGHT = 0.3;
const UNKNOWN_WEIGHT = 0.5;
const MAX_HITS = 8;
const PER_SECTION = 3;

export interface ResolveOptions {
  /** true while the student is still typing: the last word may match by prefix, and nothing is ever DIRECT. */
  typing?: boolean;
  /** The locale of the page the search started on ("/hi" home → "hi"): twin paths get the prefix. */
  pageLocale?: "en" | "hi" | "te";
  /** Alias of pageLocale. */
  locale?: "en" | "hi" | "te";
  limit?: number;
}

// ── Prepared index (built once per index object) ─────────────────────────

interface Prep {
  docs: SearchDoc[];
  toks: Set<string>[];
  idToks: Set<string>[];
  termIdx: Map<string, number[]>;
  inv: Map<string, number[]>;
  softInv: Map<string, number[]>;
  softToks: Set<string>[];
  df: Map<string, number>;
  N: number;
  maxIdf: number;
  vocab: Set<string>;
  sortedVocab: string[];
  latinLong: string[];
  examIdx: Map<string, number>;
  examState: Map<string, number>;
  collegeState: Map<string, number>;
  boardIdx: Map<string, number>;
  classIdx: Map<string, number>;
  subjectsOf: Map<string, number[]>;
  chaptersOf: Map<string, number[]>;
  topicsOf: Map<string, number[]>;
  landing: Map<string, number>;
  /** college-stream docs by stream slug ("management" → /colleges/stream/management). */
  streamIdx: Map<string, number>;
  entity: string[];
}

const prepCache = new WeakMap<SearchIndex, Prep>();

function add<K>(m: Map<K, number[]>, k: K, i: number) {
  const list = m.get(k);
  if (list) {
    if (list[list.length - 1] !== i) list.push(i);
  } else m.set(k, [i]);
}

function entityOf(d: SearchDoc): string {
  if ((d.kind === "exam" || d.kind === "topic-note") && d.examCode) return `exam:${d.examCode}`;
  if (d.kind === "college" || d.kind === "college-branch") return `college:${d.path.split("/")[2] ?? d.id}`;
  return d.id;
}

function prepare(index: SearchIndex): Prep {
  const cached = prepCache.get(index);
  if (cached) return cached;
  const docs = index.docs;
  const toks: Set<string>[] = [];
  const idToks: Set<string>[] = [];
  const softToks: Set<string>[] = [];
  const termIdx = new Map<string, number[]>();
  const inv = new Map<string, number[]>();
  const softInv = new Map<string, number[]>();
  const df = new Map<string, number>();
  const P: Prep = {
    // N and df count the pages both tiers hold (26 Sep 2026, search fixer): the deep tier's
    // topic-note pages (4,345 in production, 189 in the test snapshot) no longer shift every
    // word's weight, so the strip (lite) and /ask (deep) — and the tests and production —
    // weigh a query the same way ("mp patwari" flipped from list to ai on production data).
    docs, toks, idToks, termIdx, inv, softInv, softToks, df, N: docs.filter((d) => d.kind !== "topic-note").length, maxIdf: 0, vocab: new Set(), sortedVocab: [], latinLong: [],
    examIdx: new Map(), examState: new Map(), collegeState: new Map(), boardIdx: new Map(), classIdx: new Map(), subjectsOf: new Map(),
    chaptersOf: new Map(), topicsOf: new Map(), landing: new Map(), streamIdx: new Map(), entity: [],
  };
  docs.forEach((d, i) => {
    const set = new Set<string>();
    for (const term of d.terms) {
      add(termIdx, term, i);
      for (const t of term.split(" ")) if (t) set.add(t);
    }
    toks.push(set);
    // Acronyms that name the page: its title's all-caps words ("MPESB", "KSP", "UKSSSC") and its exam code's parts.
    const id = new Set<string>(
      d.title
        .split(/[^A-Za-z0-9]+/)
        .filter((w) => w.length >= 2 && /^[A-Z0-9]+$/.test(w) && /[A-Z]/.test(w))
        .map((w) => w.toLowerCase()),
    );
    if (d.examCode) for (const t of d.examCode.toLowerCase().split("_")) id.add(t);
    idToks.push(id);
    const soft = new Set<string>();
    for (const term of d.soft ?? []) for (const t of term.split(" ")) if (t) soft.add(t);
    softToks.push(soft);
    for (const t of set) {
      add(inv, t, i);
      if (d.kind !== "topic-note") df.set(t, (df.get(t) ?? 0) + 1);
      P.vocab.add(t);
    }
    for (const t of soft) if (!set.has(t)) add(softInv, t, i);
    P.entity.push(entityOf(d));
    switch (d.kind) {
      case "exam":
        if (d.examCode) P.examIdx.set(d.examCode, i);
        break;
      case "exam-state":
        if (d.state) P.examState.set(d.state, i);
        break;
      case "college-state":
        if (d.state) P.collegeState.set(d.state, i);
        break;
      case "school-board":
        if (d.board) P.boardIdx.set(d.board, i);
        break;
      case "school-class":
        P.classIdx.set(`${d.board}:${d.cls}`, i);
        break;
      case "school-subject":
        add(P.subjectsOf, `${d.board}:${d.cls}`, i);
        break;
      case "school-chapter":
        add(P.chaptersOf, `${d.board}:${d.cls}:${d.subjectSlug}`, i);
        break;
      case "topic-note":
        if (d.examCode) add(P.topicsOf, d.examCode, i);
        break;
      case "landing":
        P.landing.set(d.path, i);
        break;
      case "college-stream":
        P.streamIdx.set(d.path.split("/").pop() ?? "", i);
        break;
    }
  });
  P.maxIdf = Math.log(1 + P.N);
  P.sortedVocab = [...P.vocab].sort();
  P.latinLong = P.sortedVocab.filter((t) => t.length >= 4 && isLatinToken(t));
  prepCache.set(index, P);
  return P;
}

const idf = (P: Prep, t: string) => Math.log(1 + P.N / (1 + (P.df.get(t) ?? 0)));

/** The words of the index, for the letter-name decoder and the UI. */
export function indexVocabulary(index: SearchIndex): ReadonlySet<string> {
  return prepare(index).vocab;
}

// ── Query tokens ─────────────────────────────────────────────────────────

interface QT {
  t: string;
  orig: string;
  role: "hard" | "soft" | "state";
  w: number;
  alts: { tok: string; f: number }[];
  known: boolean;
  subj: boolean;
  filler: boolean;
}

const EXAM_SUBJECT = new Set(EXAM_SUBJECT_WORDS);
const FILLER = new Set(FILLER_SOFT_WORDS.map((w) => normaliseTerm(w)));
/** Words of the page / section vocabulary ("syllabus", "cutoff", "colleges"): a half-typed one is not a search word yet. */
const SLOT_WORDS: readonly string[] = [...new Set([...INTENT_PHRASES, ...SECTION_PHRASES].flatMap(([p]) => normaliseTerm(p).split(" ")).filter((w) => w.length >= 3))];

function prefixMatches(P: Prep, prefix: string, limit = 40): string[] {
  const out: string[] = [];
  let lo = 0;
  let hi = P.sortedVocab.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (P.sortedVocab[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < P.sortedVocab.length && out.length < limit; i++) {
    const t = P.sortedVocab[i];
    if (!t.startsWith(prefix)) break;
    if (t !== prefix) out.push(t);
  }
  return out;
}

function fuzzyMatches(P: Prep, t: string): { tok: string; f: number }[] {
  if (t.length < 4 || !isLatinToken(t)) return [];
  const out: { tok: string; f: number; d: number }[] = [];
  for (const v of P.latinLong) {
    if (Math.abs(v.length - t.length) > 2) continue;
    const d = trigramDice(t, v);
    if (d >= FUZZY_MIN) out.push({ tok: v, f: FUZZY_WEIGHT, d });
  }
  return out.sort((a, b) => b.d - a.d).slice(0, 3).map(({ tok, f }) => ({ tok, f }));
}

/** Repair and weigh the residual: letter-name acronyms, split acronyms ("mp esb" → "mpesb"), typos, a half-typed last word. */
function queryTokens(P: Prep, parsed: ParsedQuery, typing: boolean): QT[] {
  const raw = parsed.tokens;
  const out: QT[] = [];
  const hard = [...parsed.hard];
  const consumedByJoin = new Set<string>();
  const lastTok = raw[raw.length - 1];
  const stateName = parsed.state ? normaliseTerm(STATES[parsed.state]?.name ?? "") : "";
  let fuzzyBudget = 8;
  const mk = (t: string, role: QT["role"]): QT | null => {
    let tok = t;
    let known = P.vocab.has(tok);
    // A state word typed another way ("uttrakhand", "తెలంగాణ") matches as the state's own name.
    if (!known && role === "state" && stateName && !stateName.includes(" ") && P.vocab.has(stateName)) {
      tok = stateName;
      known = true;
    }
    // Plurals: "groups" → "group", "mocks" → "mock" (as a near-exact alternative
    // when the plural is itself a word somewhere — "Equal Groups").
    const singular = isLatinToken(tok) && tok.length >= 4 && tok.endsWith("s") && P.vocab.has(tok.slice(0, -1)) ? tok.slice(0, -1) : null;
    if (!known && singular) {
      tok = singular;
      known = true;
    }
    if (!known && !isLatinToken(tok)) {
      const dec = decodeLetterNames(tok, P.vocab);
      if (dec) {
        tok = dec;
        known = true;
      }
    }
    if (!known && role !== "state") {
      const at = raw.indexOf(t);
      const prev = at > 0 ? raw[at - 1] : undefined;
      const next = at >= 0 && at < raw.length - 1 ? raw[at + 1] : undefined;
      if (prev && P.vocab.has(prev + tok) && !parsed.hard.includes(prev + tok)) {
        tok = prev + tok;
        known = true;
        consumedByJoin.add(prev);
      } else if (next && P.vocab.has(tok + next)) {
        tok = tok + next;
        known = true;
        consumedByJoin.add(next);
      }
    }
    // Typo matching for the first few unknown words only (a pasted paragraph must not cost a scan per word).
    const alts = known || fuzzyBudget-- <= 0 ? [] : fuzzyMatches(P, tok);
    if (singular && singular !== tok) alts.push({ tok: singular, f: 0.95 });
    if (typing && t === lastTok && tok.length >= 2 && role !== "state") {
      for (const p of prefixMatches(P, tok)) alts.push({ tok: p, f: PREFIX_WEIGHT });
    }
    // While typing, a last word that is still one letter, or matches nothing
    // yet, is left out rather than counted against every page.
    if (
      typing &&
      t === lastTok &&
      role !== "state" &&
      raw.length > 1 &&
      (tok.length < 2 || (!known && alts.length === 0) || (!known && SLOT_WORDS.some((w) => w.startsWith(tok) && w !== tok)))
    ) {
      return null;
    }
    const base = known || alts.length ? idf(P, known ? tok : alts[0].tok) : P.maxIdf * UNKNOWN_WEIGHT;
    const w = role === "soft" ? base * SOFT_WEIGHT : base;
    return { t: tok, orig: t, role, w, alts, known, subj: EXAM_SUBJECT.has(t), filler: role === "soft" && FILLER.has(t) };
  };
  for (const [list, role] of [[hard, "hard"], [parsed.soft, "soft"], [parsed.stateTokens, "state"]] as const) {
    for (const t of list) {
      const q = mk(t, role);
      if (q) out.push(q);
    }
  }
  // A word joined into its neighbour ("mp" + "esb") is not also a word of its own.
  const filtered = out.filter((q) => !(consumedByJoin.has(q.orig) && q.role !== "state" && !q.known));
  // Nothing hard: the soft words carry the query ("junior assistant", "clerk").
  // Filler words ("exams", "tayari") carry it only when nothing else was read —
  // "bihar exams" is the Bihar page, not every page with "exams" in its name.
  const slots = parsed.state || parsed.section || parsed.kindHint || parsed.intent || parsed.cls != null || parsed.board || parsed.stage;
  if (!filtered.some((q) => q.role === "hard")) {
    for (const q of filtered) {
      if (q.role !== "soft" || (q.filler && slots)) continue;
      q.role = "hard";
      q.w = q.w / SOFT_WEIGHT;
    }
  }
  return filtered;
}

// ── Scoring ──────────────────────────────────────────────────────────────

interface Scored {
  i: number;
  score: number;
  why: HitWhy;
  unexplained: string[];
  subjMods: string[];
  exactFull: boolean;
}

interface Ctx {
  P: Prep;
  index: SearchIndex;
  parsed: ParsedQuery;
  qts: QT[];
  schoolCue: boolean;
  exactFull: Set<number>;
  exactEntity: Set<number>;
  defaultDoc: number | null;
}

const COLLEGE_FAMILY: ReadonlySet<DocKind> = new Set(["college", "college-branch", "college-state", "college-stream"]);
function kindFamily(k: DocKind): ReadonlySet<DocKind> {
  if (COLLEGE_FAMILY.has(k)) return COLLEGE_FAMILY;
  if (k === "career") return new Set<DocKind>(["career", "persona"]);
  if (k.startsWith("abroad")) return new Set<DocKind>(["abroad-country", "abroad-university", "abroad-test"]);
  return new Set<DocKind>([k]);
}

function matchTok(ctx: Ctx, q: QT, i: number): { m: number; own: boolean } {
  const { P } = ctx;
  const d = P.docs[i];
  const own = P.toks[i];
  if (q.role === "state" && ctx.parsed.state && d.state === ctx.parsed.state) return { m: 1, own: false };
  if (own.has(q.t)) return { m: 1, own: true };
  if (q.role === "soft" && P.softToks[i].has(q.t)) return { m: 1, own: true };
  let best = 0;
  for (const a of q.alts) if (own.has(a.tok) && a.f > best) best = a.f;
  if (best > 0) return { m: best, own: true };
  if (P.softToks[i].has(q.t)) return { m: 0.6, own: true };
  if (d.kind === "topic-note" && d.examCode) {
    const parent = P.examIdx.get(d.examCode);
    if (parent != null) {
      if (P.toks[parent].has(q.t)) return { m: 1, own: false };
      for (const a of q.alts) if (P.toks[parent].has(a.tok)) return { m: a.f, own: false };
      if (q.role === "state" && ctx.parsed.state && d.state === ctx.parsed.state) return { m: 1, own: false };
    }
  }
  return { m: 0, own: false };
}

function scoreDoc(ctx: Ctx, i: number): Scored | null {
  const { P, parsed, qts } = ctx;
  const d = P.docs[i];
  let num = 0;
  let den = 0;
  let ownMatch = false;
  let fuzzy = false;
  let parentMatch = false;
  const unexplained: string[] = [];
  const subjMods: string[] = [];
  const hardCount = qts.filter((q) => q.role === "hard").length;
  // A named state explains a page of that state only next to another matched
  // word — on its own it would make every Karnataka page a full match.
  const otherMatch = qts.some((q) => q.role !== "state" && matchTok(ctx, q, i).m > 0);
  for (const q of qts) {
    let { m, own } = matchTok(ctx, q, i);
    if (q.role === "state" && !otherMatch) {
      m = P.toks[i].has(q.t) ? 1 : 0;
      own = m > 0;
    }
    if (m > 0 && own) ownMatch = true;
    // 26 Sep 2026 (search fixer): a state word alone does not name a topic note's exam ("uttrakhand geography" is not UK TET).
    if (m > 0 && !own && q.role !== "state") parentMatch = true;
    if (m > 0 && m < 1) fuzzy = true;
    // A subject word next to an exam's name asks for its subject tests ("ibps clerk math").
    if (m === 0 && q.subj && (d.kind === "exam" || d.kind === "topic-note") && q.role === "hard" && hardCount > 1) {
      subjMods.push(q.orig);
      continue;
    }
    // An unmatched filler word ("exam", "primary", "full") costs nothing.
    if (q.role === "soft" && q.filler && m === 0) continue;
    num += q.w * m;
    den += q.w;
    if (m === 0 && q.role === "hard") unexplained.push(q.orig);
  }
  const exactFull = ctx.exactFull.has(i);
  const exact = exactFull || ctx.exactEntity.has(i);
  if (d.kind === "topic-note" && !ownMatch) return null;
  const cov = den > 0 ? num / den : 0;
  if (!exact && cov <= 0 && ctx.defaultDoc !== i) return null;

  let score: number;
  let why: HitWhy;
  if (ctx.defaultDoc === i) {
    score = 1.02;
    why = "default";
  } else if (exact) {
    score = 1;
    why = "exact";
  } else {
    // Specificity: the typed words make up most of one of the page's names
    // ("banking" is all of "Banking exams" but a third of "UPSC SSC Banking").
    const spec = specificity(P, i, qts);
    score = 0.9 * cov * (hardCount <= 1 ? 0.85 + 0.15 * spec : 0.92 + 0.08 * spec);
    why = fuzzy ? "fuzzy" : "tokens";
    if (cov === 1 && unexplained.length === 0) {
      const acr = qts.find((q) => q.role === "hard" && isLatinToken(q.t) && (P.df.get(q.t) ?? 0) <= 3 && P.idToks[i].has(q.t));
      if (acr) {
        score = Math.max(score, 0.92);
        why = "acronym";
      }
    }
  }
  if (subjMods.length) score *= 0.97;

  // A section word that is part of this page's own name ("Oxford University") is not a filter on it.
  const ownSectionWord = parsed.sectionWords.some((w) => P.toks[i].has(w));
  if (ownSectionWord && !exactFull) score += 0.05;
  if (!exactFull && !ownSectionWord) {
    // Section / kind named in the query.
    if (parsed.kindHint) {
      const fam = kindFamily(parsed.kindHint);
      if (fam.has(d.kind)) score += 0.05;
      else if (parsed.section && d.section === parsed.section) score *= 0.85;
      else score *= 0.6;
    } else if (parsed.section) {
      if (d.section === parsed.section) score += 0.05;
      else score *= 0.6;
    }
    // Exam-page words next to a page that is not an exam.
    if (parsed.intent && parsed.intent !== "hub" && !parsed.aspect) {
      const examish = d.kind === "exam" || d.kind === "topic-note" || d.kind === "exam-category" || d.kind === "exam-state";
      const fits = (d.kind === "career" && parsed.intent === "salary") || (COLLEGE_FAMILY.has(d.kind) && parsed.intent === "cutoff");
      if (!examish && !fits) score *= 0.8;
    }
  }
  // State named.
  if (parsed.state) {
    if (d.state === parsed.state) score += 0.1;
    else if (d.state) score *= 0.4;
    else if (d.kind === "exam") score *= 0.85;
    else if (d.kind !== "exam-category") score *= 0.8;
  }
  // A school query next to an exam page (olympiads excepted) or any other non-school page.
  if (ctx.schoolCue && (d.kind === "exam" || d.kind === "topic-note") && ctx.index.exams[d.examCode ?? ""]?.category !== "OLYMPIAD") score *= 0.5;
  else if (ctx.schoolCue && !d.kind.startsWith("school") && d.kind !== "exam") score *= 0.7;
  // Scholarship filters.
  if (d.kind === "scholarship" && d.scholarship) {
    const f = parsed.filters;
    if (f.gender === "F") score = d.scholarship.gender === "F" ? score + 0.15 : d.scholarship.gender === "M" ? score * 0.3 : score;
    if (f.categories.length && d.scholarship.categories.some((c) => f.categories.includes(c))) score += 0.05;
    if (f.levels.length && d.scholarship.levels.some((l) => f.levels.includes(l))) score += 0.05;
  }
  score += 0.03 * d.weight;
  // Caps: an insight or persona title, or a topic note of an exam nobody
  // named, never wins on a shared word alone.
  if (d.kind === "topic-note" && !parentMatch) score = Math.min(score, 0.8);
  // 26 Sep 2026 (search fixer): a topic note is not the cutoff / PYQ / mock / dates page the query asked for
  // ("ssc cgl algebra cutoff" lists the topic beside the cutoff page; it never opens the topic).
  if (d.kind === "topic-note" && parsed.intent && parsed.intent !== "hub" && parsed.intent !== "topics") score = Math.min(score, 0.78);
  if (!exact) {
    if (d.kind === "insight" || d.kind === "persona") score = Math.min(score, 0.75);
    if (parsed.beingBuilt) score = Math.min(score, 0.8);
  }
  return { i, score, why, unexplained, subjMods, exactFull };
}

/** Best share of one of the page's names that the matched query words cover. */
function specificity(P: Prep, i: number, qts: QT[]): number {
  const q = new Set<string>();
  for (const x of qts) {
    q.add(x.t);
    for (const a of x.alts) q.add(a.tok);
  }
  let best = 0;
  for (const term of P.docs[i].terms) {
    const parts = term.split(" ");
    let hit = 0;
    for (const p of parts) if (q.has(p)) hit++;
    if (hit > 0) best = Math.max(best, hit / parts.length);
  }
  return best;
}

// ── School structure ─────────────────────────────────────────────────────

interface SchoolResult {
  scored: Scored[];
  complete: boolean;
  notices: SearchNotice[];
  subjectLabel: string | null;
}

function structHit(i: number, score: number, why: HitWhy = "structure", unexplained: string[] = []): Scored {
  return { i, score, why, unexplained, subjMods: [], exactFull: false };
}

function findSubject(P: Prep, board: string, cls: number, subject: string): number | null {
  const subs = P.subjectsOf.get(`${board}:${cls}`) ?? [];
  const keys = SUBJECT_TARGETS[subject] ?? [subject];
  for (const key of keys) {
    const exact = subs.find((i) => normaliseTerm(P.docs[i].title) === key);
    if (exact != null) return exact;
    const pre = subs.find((i) => normaliseTerm(P.docs[i].title).startsWith(`${key} `));
    if (pre != null) return pre;
  }
  return null;
}

/** Names within a scope that the words explain: exact name first, then token coverage. */
function matchNames(ctx: Ctx, idxs: number[], words: string[]): { i: number; cov: number; exact: boolean }[] {
  const { P } = ctx;
  const phrase = words.join(" ");
  const out: { i: number; cov: number; exact: boolean }[] = [];
  for (const i of idxs) {
    const d = P.docs[i];
    const exact = d.terms.includes(phrase);
    let hit = 0;
    let all = 0;
    for (const w of words) {
      const q = ctx.qts.find((x) => x.orig === w);
      const wt = q?.w ?? idf(P, w);
      all += wt;
      if (P.toks[i].has(q?.t ?? w)) hit += wt;
      else if (q?.alts.some((a) => P.toks[i].has(a.tok))) hit += wt * FUZZY_WEIGHT;
    }
    const cov = all > 0 ? hit / all : 0;
    if (exact || cov > 0) out.push({ i, cov: exact ? 1 : cov, exact });
  }
  return out.sort((a, b) => Number(b.exact) - Number(a.exact) || b.cov - a.cov);
}

function resolveSchool(ctx: Ctx): SchoolResult | null {
  const { P, parsed } = ctx;
  const { cls, subject, chapterNo, board } = parsed;
  if (cls == null && subject == null && chapterNo == null && board == null) return null;
  const seeded = board === "icse-cisce" ? "icse-cisce" : "cbse";
  const otherBoard = board && board !== "cbse" && board !== "icse-cisce" ? board : null;
  const notices: SearchNotice[] = [];
  const hard = parsed.hard;
  const out: Scored[] = [];

  if (cls == null) {
    if (subject) {
      // "ncert physics": that subject in every class of the board.
      for (const [key, idxs] of P.subjectsOf) {
        if (!key.startsWith(`${seeded}:`)) continue;
        const c = Number(key.split(":")[1]);
        const i = findSubject(P, seeded, c, subject);
        if (i != null && idxs.includes(i)) out.push(structHit(i, 0.7));
      }
      return { scored: out, complete: false, notices, subjectLabel: subject };
    }
    const bi = board ? P.boardIdx.get(board) : undefined;
    if (bi != null) out.push(structHit(bi, 0.95));
    return { scored: out, complete: bi != null && hard.length === 0 && chapterNo == null, notices, subjectLabel: null };
  }

  if (otherBoard) {
    // A state board has a board page, not class pages.
    const bi = P.boardIdx.get(otherBoard);
    if (bi != null) out.push(structHit(bi, 0.9));
    const ci = P.classIdx.get(`cbse:${cls}`);
    if (ci != null) out.push(structHit(ci, 0.7));
    return { scored: out, complete: false, notices, subjectLabel: subject };
  }

  const classI = P.classIdx.get(`${seeded}:${cls}`);
  if (classI == null) return { scored: out, complete: false, notices, subjectLabel: subject };

  if (!subject) {
    if (hard.length === 0 && chapterNo == null) {
      out.push(structHit(classI, 0.95));
      return { scored: out, complete: true, notices, subjectLabel: null };
    }
    // "photosynthesis class 11": chapter and subject names within the class.
    out.push(structHit(classI, 0.6));
    if (hard.length) {
      const subs = P.subjectsOf.get(`${seeded}:${cls}`) ?? [];
      const chs = subs.flatMap((si) => P.chaptersOf.get(`${seeded}:${cls}:${P.docs[si].subjectSlug}`) ?? []);
      const m = matchNames(ctx, [...subs, ...chs], hard);
      const strong = m.filter((x) => x.exact || x.cov >= 0.8);
      if (strong.length === 1 || (strong.length > 1 && strong[0].exact && !strong[1].exact)) {
        out.push(structHit(strong[0].i, 0.95));
        return { scored: out, complete: true, notices, subjectLabel: null };
      }
      for (const x of m.slice(0, 6)) out.push(structHit(x.i, 0.55 + 0.3 * x.cov, "tokens", x.cov < 1 ? hard : []));
    }
    return { scored: out, complete: false, notices, subjectLabel: null };
  }

  let subjI = findSubject(P, seeded, cls, subject);
  if (subjI == null) {
    const near = SUBJECT_NEAREST[subject];
    const nearI = near ? findSubject(P, seeded, cls, near) : null;
    out.push(structHit(classI, 0.9));
    if (nearI != null) out.push(structHit(nearI, 0.85));
    return { scored: out, complete: false, notices, subjectLabel: subject };
  }
  const subjDoc = P.docs[subjI];
  const chapters = P.chaptersOf.get(`${seeded}:${cls}:${subjDoc.subjectSlug}`) ?? [];

  if (chapterNo != null) {
    const same = chapters.filter((i) => P.docs[i].chapterNo === chapterNo);
    // Old cumulative numbering: students count straight through Part I and
    // Part II ("chapter 9" of Class 11 Physics = Part II chapter 2).
    const cum = [...chapters].sort((a, b) => (P.docs[a].book ?? 0) - (P.docs[b].book ?? 0) || (P.docs[a].chapterNo ?? 0) - (P.docs[b].chapterNo ?? 0));
    const cumulative = chapterNo >= 1 && chapterNo <= cum.length ? cum[chapterNo - 1] : null;
    if (same.length === 1 && hard.length === 0) {
      out.push(structHit(same[0], 0.95));
      return { scored: out, complete: true, notices, subjectLabel: subjDoc.title };
    }
    if (same.length > 1) {
      // Chapter N in more than one book (Class 10 English readers): the student picks.
      notices.push("chapter-ambiguous");
      for (const i of same) out.push(structHit(i, 0.8));
      if (cumulative != null && !same.includes(cumulative)) out.push(structHit(cumulative, 0.75));
      out.push(structHit(subjI, 0.7));
      return { scored: out, complete: false, notices, subjectLabel: subjDoc.title };
    }
    if (same.length === 1) {
      out.push(structHit(same[0], 0.8, "structure", hard));
      out.push(structHit(subjI, 0.7));
      return { scored: out, complete: false, notices, subjectLabel: subjDoc.title };
    }
    // No book of the subject numbers a chapter N.
    notices.push("no-page-for-intent");
    if (cumulative != null) out.push(structHit(cumulative, 0.8));
    out.push(structHit(subjI, 0.85));
    return { scored: out, complete: false, notices, subjectLabel: subjDoc.title };
  }

  if (parsed.chapterWords.length) {
    const m = matchNames(ctx, chapters, parsed.chapterWords);
    const strong = m.filter((x) => x.exact || x.cov >= 0.8);
    if (strong.length === 1 || (strong.length > 1 && strong[0].exact && !strong[1].exact)) {
      out.push(structHit(strong[0].i, 0.95));
      return { scored: out, complete: true, notices, subjectLabel: subjDoc.title };
    }
    for (const x of m.slice(0, 6)) out.push(structHit(x.i, 0.5 + 0.35 * x.cov, "tokens"));
    out.push(structHit(subjI, 0.85, "structure", parsed.chapterWords));
    return { scored: out, complete: false, notices, subjectLabel: subjDoc.title };
  }

  out.push(structHit(subjI, 0.95));
  return { scored: out, complete: hard.length === 0, notices, subjectLabel: subjDoc.title };
}

// ── Hits ─────────────────────────────────────────────────────────────────

const KIND_ORDER: Readonly<Record<string, number>> = {
  school: 1, college: 2, "college-branch": 2, "college-state": 2, "college-stream": 2, scholarship: 3, career: 4, persona: 4.5, landing: 5,
  "exam-state": 6, "exam-category": 6, exam: 7, "abroad-country": 5.5, "abroad-university": 5.5, "abroad-test": 5.5, "topic-note": 8, insight: 9,
};
function kindRank(d: SearchDoc, schoolCue: boolean): number {
  if (d.kind.startsWith("school")) return schoolCue ? 1 : 6.5;
  return KIND_ORDER[d.kind] ?? 8;
}

function hitFor(ctx: Ctx, s: Scored, locale: "en" | "hi" | "te", intentOverride?: ExamIntent | null): SearchHit {
  const { P, parsed, index } = ctx;
  const d = P.docs[s.i];
  let url = d.path;
  let label = d.title;
  let intent: ExamIntent | null = null;
  let status = d.status;
  let downgraded = false;
  if (d.kind === "exam" && d.examCode && !s.exactFull) {
    let want: ExamIntent | null = intentOverride !== undefined ? intentOverride : parsed.intent;
    if (s.subjMods.length && (want == null || want === "mocks")) want = "subject-tests";
    const t = examIntentUrl(d.examCode, want, index.exams[d.examCode], parsed.year);
    url = t.url;
    intent = t.applied;
    downgraded = t.downgraded;
    status = t.status ?? status;
    label = want && want !== "hub" ? `${d.title} · ${t.label}` : d.title;
  } else if (d.kind === "school-chapter") {
    label = `Class ${d.cls} · ${d.title}`;
  } else if (d.kind === "school-subject") {
    label = `Class ${d.cls} ${d.title}`;
  }
  if (!isSafePath(url)) url = "/";
  return {
    docId: d.id,
    kind: d.kind,
    section: d.section,
    title: d.title,
    sub: d.sub,
    label,
    url: localeTarget(url, locale),
    intent,
    status,
    score: Math.round(s.score * 1000) / 1000,
    why: s.why,
    ...(downgraded ? { downgraded } : {}),
  };
}

// 26 Sep 2026 (search fixer): see lexicon.ts SCHOOL_PAGE_INTENTS / BOARD_PAPER_WORDS / PLURAL_COLLEGE_WORDS.
const SCHOOL_OK_INTENT = new Set<ExamIntent>(SCHOOL_PAGE_INTENTS);
const BOARD_PAPER = BOARD_PAPER_WORDS.map((w) => ` ${normaliseTerm(w)} `);
const PLURAL_COLLEGE = new Set(PLURAL_COLLEGE_WORDS.map((w) => normaliseTerm(w)));
const LIVE_TEST_RE = /(^| )live (test|tests|mock|mocks)( |$)/;

const SECTION_FALLBACK: Readonly<Record<SearchSection, string>> = {
  school: "/schooling",
  entrance: "/exams/browse",
  government: "/exams/browse",
  college: "/colleges",
  careers: "/careers",
  more: "/",
};

// ── Main ─────────────────────────────────────────────────────────────────

export function resolveQuery(raw: string, index: SearchIndex, opts: ResolveOptions = {}): Resolution {
  const typing = opts.typing === true;
  const pageLocale = opts.pageLocale ?? opts.locale ?? "en";
  const limit = Math.max(1, Math.min(opts.limit ?? MAX_HITS, MAX_HITS));
  const P = prepare(index);
  const parsed = parseQuery(raw, { typing });
  const locale: "en" | "hi" | "te" = pageLocale !== "en" ? pageLocale : parsed.langRequest === "hi" || parsed.langRequest === "te" ? parsed.langRequest : "en";
  const schoolCue = parsed.cls != null || parsed.board != null || parsed.chapterNo != null || parsed.subject != null;

  const qts = queryTokens(P, parsed, typing);

  // Exact names: the whole phrase (intent and section words included — "typing test", "sarkari result"),
  // the entity words (state words included — "bihar police"), and the hard words alone.
  const exactNorm = parsed.norm !== parsed.phrase ? (P.termIdx.get(parsed.norm) ?? []) : [];
  const exactFull = new Set<number>([...(P.termIdx.get(parsed.phrase) ?? []), ...exactNorm]);
  const entityPhrase = parsed.tokens.filter((t) => parsed.hard.includes(t) || parsed.soft.includes(t) || parsed.stateTokens.includes(t)).join(" ");
  const hardPhrase = qts.filter((q) => q.role === "hard").map((q) => q.t).join(" ");
  const hardNoSubj = qts.filter((q) => q.role === "hard" && !q.subj).map((q) => q.t).join(" ");
  const exactEntity = new Set<number>();
  // A section word in any language names the page's own kind: "ఇంజనీరింగ్ కాలేజీలు" = "engineering colleges".
  const kindWords = parsed.kindHint && COLLEGE_FAMILY.has(parsed.kindHint) ? ["colleges", "college"] : parsed.kindHint === "scholarship" ? ["scholarships", "scholarship"] : [];
  for (const p of [entityPhrase, hardPhrase, hardNoSubj, qts.map((q) => q.t).join(" "), ...kindWords.map((w) => `${hardPhrase} ${w}`)]) {
    for (const i of P.termIdx.get(p) ?? []) exactEntity.add(i);
  }
  // A bare family name opens its main exam (neet → NEET UG); "neet pg" is not bare.
  let defaultDoc: number | null = null;
  const fam = DEFAULT_FAMILY[hardPhrase];
  if (fam && P.examIdx.has(fam)) defaultDoc = P.examIdx.get(fam)!;

  const ctxBase: Ctx = { P, index, parsed, qts, schoolCue, exactFull, exactEntity, defaultDoc };
  // Nothing to look up ("", "hi", "please"): no page, and nothing to ask the AI either.
  const contentless =
    qts.length === 0 && !parsed.state && !parsed.section && !parsed.kindHint && !parsed.intent && !parsed.dateKind && parsed.cls == null && !parsed.board && !parsed.subject && !parsed.stage && !parsed.pastedPath && !exactFull.size;
  if (parsed.tokens.length === 0 || contentless) return finish(ctxBase, [], "list", [], null, false, locale, limit);

  // A pasted shishya.in link opens that page.
  if (parsed.pastedPath) {
    const canon = knownUrl(parsed.pastedPath, index);
    if (canon) {
      const docI = P.docs.findIndex((d) => d.path.split("#")[0] === canon) ;
      const examCode = /^\/exams\/([A-Z0-9_]+)/.exec(canon)?.[1];
      const i = docI >= 0 ? docI : examCode ? P.examIdx.get(examCode) ?? -1 : -1;
      if (i >= 0) {
        const hit = { ...hitFor(ctxBase, structHit(i, 1, "url"), locale, null), url: localeTarget(canon, locale), why: "url" as HitWhy };
        return finish(ctxBase, [structHit(i, 1, "url")], typing ? "list" : "direct", [], hit, false, locale, limit);
      }
    }
  }

  // Candidates from the inverted index.
  const cand = new Set<number>([...exactFull, ...exactEntity]);
  if (defaultDoc != null) cand.add(defaultDoc);
  const examCands = new Set<string>();
  for (const q of qts) {
    for (const i of P.inv.get(q.t) ?? []) cand.add(i);
    for (const i of P.softInv.get(q.t) ?? []) cand.add(i);
    for (const a of q.alts) for (const i of P.inv.get(a.tok) ?? []) cand.add(i);
  }
  for (const i of cand) if (P.docs[i].kind === "exam" && P.docs[i].examCode) examCands.add(P.docs[i].examCode!);
  if (index.tier === "deep") for (const code of examCands) for (const i of P.topicsOf.get(code) ?? []) cand.add(i);
  // In a named state, that state's pages are candidates too.
  if (parsed.state) {
    const si = P.examState.get(parsed.state);
    if (si != null) cand.add(si);
  }

  // Only slot words left (a state, a section, an intent): the slot rules below
  // pick the page; token scoring would let every page of the state match.
  const hasHardTok = qts.some((q) => q.role === "hard");
  let scored: Scored[] = [];
  for (const i of cand) {
    if (!hasHardTok && !exactFull.has(i)) continue;
    const s = scoreDoc(ctxBase, i);
    if (s) scored.push(s);
  }

  // School structure.
  const notices: SearchNotice[] = [];
  const school = resolveSchool(ctxBase);
  let schoolComplete = false;
  if (school) {
    schoolComplete = school.complete;
    notices.push(...school.notices);
    // The class / subject / chapter structure decides among school pages; a
    // token match on "class 12" would tie the CBSE and ICSE class pages.
    scored = scored.filter((s) => !P.docs[s.i].kind.startsWith("school-"));
    scored.push(...school.scored);
  }

  // 26 Sep 2026 (search fixer): a school page answers practice, notes and chapter
  // words — not a result, admit card, date, cutoff, previous paper or sample
  // paper. Those list the class / board page with "no-page-for-intent"; the
  // board's own page (which links its sample papers) leads for paper words.
  const boardPaperAsk = BOARD_PAPER.some((w) => ` ${parsed.norm} `.includes(w));
  const schoolAskMissing = (parsed.intent != null && !SCHOOL_OK_INTENT.has(parsed.intent)) || parsed.dateKind != null || boardPaperAsk;
  if (school && boardPaperAsk) {
    const bi = P.boardIdx.get(parsed.board ?? "cbse");
    if (bi != null) scored.push(structHit(bi, 0.97, "structure"));
  }

  // Nothing but slots: a state, a section, an intent, a qualifier.
  const hardLeft = qts.filter((q) => q.role === "hard").length;
  let landingComplete = false;
  if (hardLeft === 0 && !school && exactFull.size === 0) {
    const kind = parsed.kindHint;
    if (parsed.state) {
      const i = kind && COLLEGE_FAMILY.has(kind) ? P.collegeState.get(parsed.state) : P.examState.get(parsed.state);
      if (i != null) {
        scored.push(structHit(i, 0.95, "state"));
        landingComplete = true;
      }
    } else if (parsed.stage && parsed.section === "government") {
      // 26 Sep 2026 (search fixer): "10th pass sarkari naukri" / "सरकारी नौकरी 10वीं पास" — the exams that fit an
      // education level are the finder's page, not the unfiltered list of every exam.
      const rows: [string, number][] = [["/find-your-exam", 0.95], ["/jobs-map", 0.78], ["/jobs/govt-jobs", 0.76]];
      for (const [p, sc] of rows) {
        const i = P.landing.get(p);
        if (i != null) scored.push(structHit(i, sc, "landing"));
      }
      landingComplete = P.landing.has("/find-your-exam");
    } else if (kind === "scholarship" && (parsed.filters.gender || parsed.filters.categories.length || parsed.filters.levels.length)) {
      // "scholarships for girls": the matcher first, then the scholarships whose own rules fit.
      const m = P.landing.get("/scholarships/match");
      if (m != null) scored.push(structHit(m, 0.84, "landing"));
      const f = parsed.filters;
      P.docs.forEach((d, i) => {
        if (d.kind !== "scholarship" || !d.scholarship) return;
        let sc = 0.5;
        if (f.gender === "F") sc += d.scholarship.gender === "F" ? 0.25 : -0.3;
        if (f.categories.length && d.scholarship.categories.some((c) => f.categories.includes(c))) sc += 0.1;
        if (f.levels.length && d.scholarship.levels.some((l) => f.levels.includes(l))) sc += 0.1;
        if (parsed.state) sc += d.state === parsed.state ? 0.1 : d.state ? -0.3 : 0;
        if (sc >= LIST_MIN) scored.push(structHit(i, Math.min(0.8, sc + 0.02 * d.weight), "tokens"));
      });
    } else if (kind || parsed.section) {
      const collegePath = parsed.intent === "cutoff" ? "/colleges/cutoffs" : parsed.aspect === "placements" ? "/colleges/placements" : "/colleges";
      const path =
        kind === "scholarship" ? "/scholarships" : kind && COLLEGE_FAMILY.has(kind) ? collegePath : kind === "career" ? "/careers" : kind?.startsWith("abroad") ? "/worldwide" : SECTION_FALLBACK[parsed.section ?? "more"];
      const i = P.landing.get(path);
      if (i != null) {
        scored.push(structHit(i, 0.95, "landing"));
        landingComplete = !parsed.intent || path !== "/colleges";
      }
    } else if (parsed.intent || parsed.dateKind) {
      const spec = (parsed.dateKind === "RESULT" && INTENT_LANDING.RESULT) || INTENT_LANDING[parsed.intent ?? "hub"];
      const i = spec ? P.landing.get(spec.path) : undefined;
      if (spec && i != null) {
        scored.push(structHit(i, spec.direct ? 0.95 : 0.7, "landing"));
        landingComplete = spec.direct;
      }
    } else if (parsed.stage) {
      // 26 Sep 2026 (search fixer): the finder leads ("10वीं पास नौकरी").
      for (const [p, sc] of [["/find-your-exam", 0.72], ["/careers", 0.7], ["/jobs/govt-jobs", 0.7]] as const) {
        const i = P.landing.get(p);
        if (i != null) scored.push(structHit(i, sc, "landing"));
      }
    }
  }

  // 26 Sep 2026 (search fixer): "career after 12th science" — a stage with a
  // career word and a stream word: the career pages, not Class 6-8 Science.
  if (parsed.stage && parsed.kindHint === "career" && hasHardTok && !school) {
    const rest = qts.filter((q) => q.role === "hard").map((q) => q.orig);
    const rows: [string, number][] = [["/careers", 0.9], ["/career-map", 0.88], ...(parsed.stage === "after-10" ? ([["/schooling/streams", 0.86]] as [string, number][]) : [])];
    for (const [p, sc] of rows) {
      const i = P.landing.get(p);
      if (i != null) scored.push(structHit(i, sc, "landing", rest));
    }
  }

  // 26 Sep 2026 (search fixer): colleges. A degree beside "colleges" names its
  // stream page ("mba colleges" → management, "mbbs colleges" → medical), and a
  // plural "colleges" query never opens ONE college or branch — the state page
  // (when a state is named) and the stream page lead a list instead ("law
  // colleges in delhi" is not NLU Delhi).
  const collegeAsk = !!parsed.kindHint && COLLEGE_FAMILY.has(parsed.kindHint);
  const pluralColleges = collegeAsk && parsed.sectionWords.some((w) => PLURAL_COLLEGE.has(w));
  if (collegeAsk) {
    for (const q of qts) {
      const slug = q.role === "hard" ? DEGREE_STREAM[q.t] : undefined;
      const si = slug ? P.streamIdx.get(slug) : undefined;
      if (si == null) continue;
      const rest = qts.filter((x) => x.role === "hard" && x !== q && !P.toks[si].has(x.t)).map((x) => x.orig);
      scored.push(structHit(si, 0.95, "structure", rest));
    }
    if (pluralColleges) {
      scored = scored.map((s) => ((P.docs[s.i].kind === "college" || P.docs[s.i].kind === "college-branch") && s.score > 0.78 ? { ...s, score: 0.78 } : s));
      const ci = parsed.state && hasHardTok ? P.collegeState.get(parsed.state) : undefined;
      if (ci != null) scored.push(structHit(ci, 0.93, "state", qts.filter((q) => q.role === "hard" && !P.toks[ci].has(q.t)).map((q) => q.orig)));
    }
  }

  // 26 Sep 2026 (search fixer): "ssc cgl live test" — the exam's mocks and the all-India live tests, side by side.
  if (LIVE_TEST_RE.test(parsed.norm) && examCands.size > 0) {
    const lt = P.landing.get("/live-test");
    if (lt != null) scored.push(structHit(lt, 0.93, "landing"));
  }

  // A named state keeps its state page in reach when the rest does not fit
  // ("uttarakhand sub inspector": no such exam, the state page is the closest).
  if (parsed.state && hasHardTok) {
    const si = P.examState.get(parsed.state);
    if (si != null) scored.push(structHit(si, 0.45, "state", qts.filter((q) => q.role === "hard").map((q) => q.orig)));
  }

  // Graduation / PG / PhD study help is being built: the PG page leads the list.
  if (parsed.beingBuilt) {
    const pg = P.landing.get("/post-graduation");
    // 26 Sep 2026 (search fixer): never above an exam the query named.
    const bestExam = scored.reduce((m, s) => (P.docs[s.i].kind === "exam" ? Math.max(m, s.score) : m), 0);
    if (pg != null) scored.push(structHit(pg, bestExam >= LIST_MIN ? Math.min(0.8, bestExam - 0.01) : 0.8, "landing"));
  }

  // Typo rescue for one unknown word: the closest exams, as list rows only.
  const maxScore = scored.reduce((m, s) => Math.max(m, s.score), 0);
  if (maxScore < LIST_MIN && qts.length === 1 && !qts[0].known && qts[0].alts.length === 0 && isLatinToken(qts[0].t) && qts[0].t.length >= 4) {
    const examDocs = P.docs.flatMap((d, i) => (d.kind === "exam" && d.examCode ? [{ code: d.examCode, name: d.sub, shortName: d.title, state: d.state ?? null, i }] : []));
    for (const n of nearestExams(qts[0].t, examDocs, 4)) scored.push(structHit(n.exam.i, Math.min(0.6, 0.4 + 0.25 * n.score), "nearest", [qts[0].orig]));
  }

  // The whole phrase is a page's name, page words included ("typing test",
  // "exam calendar", "sarkari result"): the query named that page, so pages
  // matched on its other words step back.
  if (exactFull.size && (parsed.phrase !== entityPhrase || exactNorm.length > 0)) {
    const named = exactNorm.length ? new Set(exactNorm) : exactFull; // the whole query as typed is the strongest name
    scored = scored.map((s) => (named.has(s.i) || s.why === "structure" ? s : { ...s, score: s.score * 0.8 }));
  }

  // One row per page, best score kept.
  const byDoc = new Map<number, Scored>();
  for (const s of scored) {
    const prev = byDoc.get(s.i);
    if (!prev || s.score > prev.score) byDoc.set(s.i, s);
  }
  scored = [...byDoc.values()].sort(
    (a, b) => b.score - a.score || kindRank(P.docs[a.i], schoolCue) - kindRank(P.docs[b.i], schoolCue) || P.docs[b.i].weight - P.docs[a.i].weight || P.docs[a.i].title.localeCompare(P.docs[b.i].title),
  );

  const top = scored[0] ?? null;
  const topDoc = top ? P.docs[top.i] : null;

  // Doubt, refined against the index.
  const unexplained = top ? top.unexplained : qts.filter((q) => q.role === "hard").map((q) => q.orig);
  const topFacts = topDoc?.examCode ? index.exams[topDoc.examCode] : undefined;
  const confident = !!top && top.score >= DIRECT_MIN && unexplained.length === 0;
  const PAGE_INTENTS: readonly (ExamIntent | null)[] = ["dates", "cutoff", "syllabus", "pyq", "mocks", "topics", "checklist", "build-mock", "subject-tests", "score", "guide", "tricks", "live", "reactions"];
  const pageIntent =
    topDoc?.kind === "exam" &&
    (PAGE_INTENTS.includes(parsed.intent) ||
      (parsed.intent === "salary" && !!topFacts?.deep.salary) ||
      (parsed.intent === "eligibility" && !!topFacts?.deep.eligibility));
  const careerHow = topDoc?.kind === "career" && parsed.kindHint === "career";
  let doubt = parsed.shape === "question" && (parsed.doubtVerb || parsed.firstPerson || parsed.compare || unexplained.length >= 2);
  if (doubt && confident && (pageIntent || careerHow || (top!.why === "exact" && !parsed.firstPerson && !parsed.compare) || top!.why === "default")) doubt = false;
  parsed.doubt = doubt;

  const schoolScope: Resolution["schoolScope"] = parsed.cls != null ? (parsed.cls <= 7 ? "class1to7" : "class8to12") : schoolCue && topDoc?.cls != null ? (topDoc.cls <= 7 ? "class1to7" : "class8to12") : "none";

  // Decide. A topic note must also lead its own exam's pages by the margin
  // (26 Sep 2026, search fixer): the exam and its topic are different pages.
  const topOther = top ? scored.find((s) => s.i !== top.i && (topDoc?.kind === "topic-note" || P.entity[s.i] !== P.entity[top.i])) : undefined;
  const margin = top ? top.score - (topOther?.score ?? 0) : 0;
  const popularityDefault =
    !!top &&
    !!topOther &&
    Math.abs(top.score - topOther.score) < 0.02 &&
    topDoc?.kind === "exam" &&
    P.docs[topOther.i].kind === "exam" &&
    topDoc.weight >= 5 * Math.max(0.01, P.docs[topOther.i].weight) &&
    normaliseTerm(topDoc.title).startsWith(hardPhrase);
  // The typed words ARE the page's own title ("iit bombay" = "IIT Bombay") and
  // no other page carries them as a name — only as part of a longer one
  // ("SJMSOM IIT Bombay"): a 0.1 lead is enough for a named entity.
  const ENTITY_KINDS: readonly DocKind[] = ["exam", "college", "college-branch", "scholarship", "abroad-country", "abroad-university", "abroad-test"];
  const titleExact =
    !!topDoc && ENTITY_KINDS.includes(topDoc.kind) && [hardPhrase, entityPhrase].includes(normaliseTerm(topDoc.title)) && topOther?.why !== "exact" && margin >= 0.1;
  const topHit = top ? hitFor(ctxBase, top, locale) : null;
  const schoolIntentMissing = schoolAskMissing && !!topDoc && topDoc.kind.startsWith("school-");
  const intentMissing = !!topHit?.downgraded || schoolIntentMissing;

  let outcome: Outcome = "list";
  const noHit = !top || top.score < LIST_MIN;
  const deepMissing =
    confident && topDoc?.kind === "exam" && ((parsed.intent === "salary" && !topFacts?.deep.salary) || (parsed.intent === "eligibility" && !topFacts?.deep.eligibility));
  // While typing, "nothing fits yet" is not a reason to ask the AI — only a finished query is.
  const aiWanted = (noHit && !typing) || doubt || deepMissing || (parsed.beingBuilt && doubt);
  const structureDirect = (schoolComplete || landingComplete) && !!top && (top.why === "structure" || top.why === "state" || top.why === "landing");
  const directOk =
    !typing &&
    !!top &&
    !doubt &&
    !intentMissing &&
    !topDoc?.listOnly &&
    top.why !== "nearest" &&
    unexplained.length === 0 &&
    // Being built: only the page whose whole name was typed opens ("bsc nursing syllabus" is a degree question too).
    !(parsed.beingBuilt && !top.exactFull) &&
    (structureDirect ||
      (top.score >= DIRECT_MIN && (margin >= DIRECT_MARGIN || top.why === "default" || top.why === "url" || popularityDefault || titleExact)));

  if (directOk) outcome = "direct";
  else if (aiWanted && schoolScope !== "class1to7") outcome = "ai";
  else outcome = "list";

  if (aiWanted && schoolScope === "class1to7") notices.push("no-ai-young-class");
  if (outcome === "ai" && schoolScope === "class8to12" && SCHOOL_AI_MODE === "route-only") notices.push("school-route-only");
  if (intentMissing) notices.push("no-page-for-intent");
  if (parsed.beingBuilt) notices.push("being-built");
  // "rrb je": an exam family matched, and some typed word is explained by no
  // page in reach at all (not merely by a different row — "telangana si and pc").
  const hardQ = qts.filter((q) => q.role === "hard");
  const explainedSomewhere = new Set<string>();
  for (const s of scored) if (s.score >= LIST_MIN) for (const q of hardQ) if (!s.unexplained.includes(q.orig)) explainedSomewhere.add(q.orig);
  const missing = hardQ.filter((q) => !explainedSomewhere.has(q.orig));
  const familyMatched = !!top && topDoc?.kind === "exam" && top.unexplained.length > 0 && missing.length > 0 && missing.length < hardQ.length;
  // The client index has no topic-note pages: only the server says "not in the catalogue".
  if (outcome !== "direct" && familyMatched && index.tier === "deep") notices.push("not-in-catalogue");

  return finish(ctxBase, scored, outcome, notices, outcome === "direct" ? topHit : null, outcome !== "direct" && unexplained.length > 0, locale, limit, schoolScope, school?.subjectLabel ?? null);
}

function finish(
  ctx: Ctx,
  scored: Scored[],
  outcome: Outcome,
  noticesIn: SearchNotice[],
  best: SearchHit | null,
  logMiss: boolean,
  locale: "en" | "hi" | "te",
  limit: number,
  schoolScope: Resolution["schoolScope"] = "none",
  subjectLabel: string | null = null,
): Resolution {
  const { P, parsed, index } = ctx;
  const floor = scored.some((s) => s.score >= LIST_MIN) ? LIST_MIN : RECOMMEND_MIN;
  const rows = scored.filter((s) => s.score >= floor);
  const hitsAll = rows.map((s) => hitFor(ctx, s, locale));
  if (best) {
    const k = hitsAll.findIndex((h) => h.docId === best.docId);
    if (k > 0) hitsAll.unshift(...hitsAll.splice(k, 1));
    else if (k < 0) hitsAll.unshift(best);
  }
  // Group: best's section first, ≤ 3 per section, ≤ limit rows.
  const order: SearchSection[] = [];
  const per = new Map<SearchSection, SearchHit[]>();
  const seenUrl = new Set<string>();
  let count = 0;
  for (const h of hitsAll) {
    if (count >= limit) break;
    if (seenUrl.has(h.url)) continue;
    const list = per.get(h.section) ?? [];
    if (list.length >= PER_SECTION) continue;
    if (!per.has(h.section)) order.push(h.section);
    list.push(h);
    per.set(h.section, list);
    seenUrl.add(h.url);
    count++;
  }
  const groups = order.map((section) => ({ section, hits: per.get(section)! }));
  const hits = groups.flatMap((g) => g.hits);

  // Quick links: the rendering sibling pages of the top exam.
  const top = scored[0];
  const topDoc = top ? P.docs[top.i] : null;
  const quick: SearchHit[] = [];
  if (topDoc?.kind === "exam" && topDoc.examCode && top.score >= LIST_MIN) {
    const current = hitFor(ctx, top, locale);
    for (const it of examSiblingIntents(index.exams[topDoc.examCode])) {
      const h = hitFor(ctx, top, locale, it);
      if (h.url === current.url) continue;
      quick.push({ ...h, why: "structure" });
      if (quick.length >= 5) break;
    }
  }

  const recommended = outcome === "ai" ? scored.filter((s) => s.score >= RECOMMEND_MIN && !P.docs[s.i].listOnly).slice(0, 3).map((s) => hitFor(ctx, s, locale)) : [];
  const notices = [...new Set(noticesIn)];

  // What we read.
  const understood: Resolution["understood"] = [];
  if (topDoc?.kind === "exam" && top.score >= LIST_MIN) understood.push({ slot: "exam", label: topDoc.title });
  if (parsed.board) understood.push({ slot: "board", label: parsed.board === "cbse" ? "CBSE (NCERT)" : parsed.board === "icse-cisce" ? "ICSE / ISC" : parsed.board });
  if (parsed.cls != null) understood.push({ slot: "class", label: `Class ${parsed.cls}` });
  if (parsed.subject) understood.push({ slot: "subject", label: subjectLabel ?? cap(parsed.subject) });
  if (parsed.chapterNo != null) understood.push({ slot: "chapter", label: `Chapter ${parsed.chapterNo}` });
  if (parsed.state) understood.push({ slot: "state", label: STATES[parsed.state]?.name ?? parsed.state });
  if (parsed.intent && parsed.intent !== "hub") understood.push({ slot: "intent", label: INTENT_LABEL[parsed.intent] });
  if (parsed.year) understood.push({ slot: "year", label: String(parsed.year) });
  if (parsed.langRequest) understood.push({ slot: "language", label: LANGUAGE_NAME[parsed.langRequest] ?? parsed.langRequest });
  if (parsed.kindHint || parsed.section) understood.push({ slot: "section", label: SECTION_LABEL[parsed.kindHint ?? ""] ?? SECTION_LABEL[parsed.section ?? ""] ?? "" });

  const fbSection: SearchSection = (best ?? hits[0])?.section ?? parsed.section ?? "more";
  const fbPath = parsed.kindHint === "scholarship" ? "/scholarships/match" : SECTION_FALLBACK[fbSection];
  const fbI = P.landing.get(fbPath);
  const fallback: SearchHit = fbI != null ? { ...hitFor(ctx, structHit(fbI, 0, "landing"), locale), why: "landing" } : {
    docId: "landing:/", kind: "landing", section: "more", title: "Shishya home", sub: "", label: "Shishya home", url: localeTarget("/", locale), intent: null, score: 0, why: "landing",
  };

  return {
    q: parsed.raw,
    parsed,
    outcome,
    best: outcome === "direct" ? best : null,
    hits,
    groups,
    quick,
    recommended,
    understood: understood.filter((u) => u.label),
    notices,
    schoolScope,
    logMiss,
    needsServer: index.tier === "lite" && outcome !== "direct",
    fallback,
  };
}

const cap = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
const LANGUAGE_NAME: Readonly<Record<string, string>> = {
  hi: "Hindi", te: "Telugu", mr: "Marathi", ta: "Tamil", kn: "Kannada", bn: "Bengali", gu: "Gujarati", pa: "Punjabi", or: "Odia", ml: "Malayalam", ur: "Urdu", en: "English",
};
const SECTION_LABEL: Readonly<Record<string, string>> = {
  college: "Colleges", scholarship: "Scholarships", career: "Careers", "abroad-country": "Study abroad", "abroad-university": "Study abroad",
  school: "School", entrance: "Entrance exams", government: "Government jobs", careers: "Careers", more: "",
};
