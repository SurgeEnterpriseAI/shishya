// parseQuery (26 Sep 2026): turn what a student typed into slots — class,
// chapter, board, subject, exam page (intent), year, section, state, language
// request — plus the residual words the index must explain. Pure: no index,
// no prisma / fetch / next. The resolver (resolve.ts) scores the residual
// against the site's pages.
//
// Order (each step consumes what it matches, longest phrase first):
//   CANON (cross-script role words, observed typos) → LANG_REQUEST →
//   board-local class names → qualifiers ("12th pass", "after 10th") → CLASS
//   → CHAPTER → BOARD → YEAR → paper / tier numbers → INTENT → SECTION →
//   STATE → QUESTION → STOP → school SUBJECT (only with a school cue) →
//   residual = hard + soft words.

import { normaliseQuery } from "./normalize";
import * as L from "./lexicon";
import type { DocKind, ExamIntent, ParsedQuery, SearchSection } from "./types";
import { STATES } from "@/lib/state-info";
import { stateWordTable } from "@/lib/exam-aliases";

type Row<V> = { toks: string[]; value: V };
type Table<V> = Map<string, Row<V>[]>;

/** Compile a phrase table: normalise each phrase, key by first token, longest first. */
function compile<V>(rows: readonly (readonly [string, V])[]): Table<V> {
  const out: Table<V> = new Map();
  for (const [phrase, value] of rows) {
    const toks = normaliseQuery(phrase).tokens;
    if (toks.length === 0) continue;
    const list = out.get(toks[0]) ?? [];
    list.push({ toks, value });
    out.set(toks[0], list);
  }
  for (const list of out.values()) list.sort((a, b) => b.toks.length - a.toks.length);
  return out;
}
const words = (list: readonly string[]) => compile(list.map((w) => [w, true] as const));

const LANG = compile(L.LANG_REQUEST);
const CLASS_PH = compile(L.CLASS_PHRASES);
const CLASS_WORD = new Set(L.CLASS_WORDS.map((w) => normaliseQuery(w).norm));
const Q_AFTER = new Set(L.QUALIFIER_AFTER.map((w) => normaliseQuery(w).norm));
const Q_BEFORE = new Set(L.QUALIFIER_BEFORE);
// 26 Sep 2026 (search fixer): class number words in every script, keyed as the normaliser writes them.
const CLASS_NUM = new Map(Object.entries(L.CLASS_NUMBER_WORDS).map(([k, v]) => [normaliseQuery(k).norm, v] as const));
const COND_CLASS = new Set(L.CONDITIONAL_CLASS_WORDS);
const SCHOOL_OK_INTENT = new Set<ExamIntent>(L.SCHOOL_PAGE_INTENTS);
const PAPER = new Set(L.PAPER_WORDS);
/** Words that make a query about jobs, not school ("matric pass govt job"). */
const JOB_WORDS = new Set(["job", "jobs", "naukri", "sarkari", "govt", "government", "bharti", "recruitment", "vacancy", "vacancies", "नौकरी", "सरकारी", "ఉద్యోగం", "ఉద్యోగాలు"]);
const Q_TAIL = words(L.QUALIFIER_TAIL);
const GRAD = words(L.GRAD_STAGE);
const STAGE_PH = compile(L.STAGE_PHRASES);
const CHAPTER_WORD = new Set(L.CHAPTER_WORDS.map((w) => normaliseQuery(w).norm));
const BOARD = compile(L.BOARD_PHRASES);
const INTENT = compile(L.INTENT_PHRASES);
const SECTION = compile(L.SECTION_PHRASES);
const SUBJECT = compile(L.SUBJECT_PHRASES);
const QUESTION = new Set(L.QUESTION_WORDS.map((w) => normaliseQuery(w).norm));
const Q_PAIR_HEAD = new Set(L.QUESTION_PAIR_HEADS.map((w) => normaliseQuery(w).norm));
const Q_PAIR_TAIL = new Set(L.QUESTION_PAIR_TAILS.map((w) => normaliseQuery(w).norm));
const DOUBT = words(L.DOUBT_PHRASES);
const FIRST = words(L.FIRST_PERSON_PHRASES);
const COMPARE = words(L.COMPARE_PHRASES);
const STOP = new Set(L.STOP_WORDS.map((w) => normaliseQuery(w).norm));
const SOFT = new Set(L.SOFT_WORDS.map((w) => normaliseQuery(w).norm));
const ROLE = new Set(L.ROLE_WORDS);
const GENDER_F = new Set(L.GENDER_F_WORDS.map((w) => normaliseQuery(w).norm));
const ABBR = new Map(Object.entries(L.STATE_ABBR).map(([k, v]) => [normaliseQuery(k).norm, v]));
const BEING_ALWAYS = words(L.BEING_BUILT_ALWAYS);
const DEGREE = new Set(L.DEGREE_WORDS);
const STUDY = new Set(L.STUDY_WORDS);
const CANON = new Map(Object.entries(L.CANON).map(([k, v]) => [normaliseQuery(k).norm, normaliseQuery(v).tokens]));

/** State names in every script we hold: the alias table's state words,
 *  STATES' English / native / Hindi names, and typed misspellings. */
const STATE_TABLE: Table<string> = (() => {
  const rows: [string, string][] = [];
  for (const [w, code] of stateWordTable()) rows.push([w, code]);
  for (const s of Object.values(STATES)) {
    rows.push([s.name, s.code], [s.hindiName, s.code]);
    if (s.nativeName && !/[a-z]/i.test(s.nativeName)) rows.push([s.nativeName, s.code]);
  }
  for (const [w, code] of Object.entries(L.STATE_TYPOS)) rows.push([w, code]);
  return compile(rows);
})();

const INTENT_PRIORITY: readonly ExamIntent[] = [
  "score", "cutoff", "pyq", "syllabus", "eligibility", "salary", "checklist", "tricks", "guide", "build-mock", "subject-tests", "topics",
  "dates", "live", "reactions", "mocks", "hub",
];

/** The shishya.in path a pasted URL names: "https://shishya.in/exams/mp_tet" → "/exams/MP_TET". */
export function pastedShishyaPath(raw: string): string | null {
  const s = String(raw ?? "").trim();
  let path: string | null = null;
  let query = "";
  // Only a query that IS a link counts ("is shishya.in free" is a question).
  const m = /^(?:https?:\/\/)?(?:www\.)?shishya\.in(\/[^\s?#]*)?(?:\?([^\s#]*))?(?:#\S*)?$/i.exec(s);
  if (m) {
    path = m[1] || "/";
    query = m[2] ?? "";
  } else if (/^\/[^\s/]/.test(s) && !/\s/.test(s)) {
    path = s.split(/[?#]/)[0];
    query = /\?([^#]*)/.exec(s)?.[1] ?? "";
  }
  if (!path) return null;
  path = path.replace(/\/+$/, "") || "/";
  path = path.replace(/^\/(hi|te)(?=\/|$)/, "") || "/";
  // 26 Sep 2026 (search fixer): an exam code is upper-cased, never the state or browse pages
  // ("/exams/state/bihar" stays as it is; "/exams/browse?category=banking" keeps its category).
  path = path.replace(/^\/exams\/([a-z0-9_]+)/i, (whole, code: string) => (/^(state|browse)$/i.test(code) ? whole.toLowerCase() : `/exams/${code.toUpperCase()}`));
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  const cat = path === "/exams/browse" ? /(?:^|&)category=([a-z_]+)(?:&|$)/i.exec(query)?.[1] : undefined;
  return cat ? `${path}?category=${cat.toUpperCase()}` : path;
}

interface Scan {
  toks: string[];
  used: boolean[];
}

/** Longest phrase of `table` starting at i over unused tokens. */
function phraseAt<V>(s: Scan, i: number, table: Table<V>): Row<V> | null {
  if (s.used[i]) return null;
  const list = table.get(s.toks[i]);
  if (!list) return null;
  for (const row of list) {
    let ok = i + row.toks.length <= s.toks.length;
    for (let k = 0; ok && k < row.toks.length; k++) ok = !s.used[i + k] && s.toks[i + k] === row.toks[k];
    if (ok) return row;
  }
  return null;
}

/** Every match of a table, consuming it; returns values in order of position. */
function take<V>(s: Scan, table: Table<V>, onMatch?: (row: Row<V>, i: number) => boolean): V[] {
  const out: V[] = [];
  for (let i = 0; i < s.toks.length; i++) {
    const row = phraseAt(s, i, table);
    if (!row) continue;
    if (onMatch && !onMatch(row, i)) continue;
    for (let k = 0; k < row.toks.length; k++) s.used[i + k] = true;
    out.push(row.value);
    i += row.toks.length - 1;
  }
  return out;
}

/** The values of every phrase of `table` in `toks`, left to right (nothing consumed). */
function valuesIn<V>(toks: string[], table: Table<V>): V[] {
  const s: Scan = { toks, used: toks.map(() => false) };
  const out: V[] = [];
  for (let i = 0; i < toks.length; i++) {
    const row = phraseAt(s, i, table);
    if (!row) continue;
    out.push(row.value);
    i += row.toks.length - 1;
  }
  return out;
}

/** Whether a phrase of `table` occurs anywhere in `toks` (used or not). */
function has<V>(toks: string[], table: Table<V>): boolean {
  const s: Scan = { toks, used: toks.map(() => false) };
  for (let i = 0; i < toks.length; i++) if (phraseAt(s, i, table)) return true;
  return false;
}

const num = (t: string | undefined): number | null => (t && /^\d{1,2}$/.test(t) ? Number(t) : null);
const ordinal = (t: string | undefined): number | null => {
  const m = t ? L.ORDINAL_SUFFIX_RE.exec(t) : null;
  return m ? Number(m[1]) : null;
};
const inClassRange = (n: number | null): n is number => n != null && n >= 1 && n <= 12;

/** typing: the last word may be half-typed ("ssc cg" is not Chhattisgarh yet). */
export function parseQuery(raw: string, opts: { typing?: boolean } = {}): ParsedQuery {
  const { norm, script, tokens: normTokens } = normaliseQuery(raw);
  const pastedPath = pastedShishyaPath(raw);
  // CANON first: native role words and observed typos → one form, so every
  // later step (and the state-abbreviation role test) sees "police", not "पुलिस".
  const toks = normTokens.flatMap((t) => CANON.get(t) ?? [t]);
  const s: Scan = { toks, used: toks.map(() => false) };
  const kindOf: (string | null)[] = toks.map(() => null); // why a token was used

  const mark = (i: number, n: number, why: string) => {
    for (let k = 0; k < n; k++) {
      s.used[i + k] = true;
      kindOf[i + k] = why;
    }
  };

  // 1 — language request.
  let langRequest: string | null = null;
  for (let i = 0; i < toks.length; i++) {
    const row = phraseAt(s, i, LANG);
    if (!row) continue;
    // 26 Sep 2026 (search fixer): "colleges in tamil nadu" — the language word starts a state's name, so it is the state.
    const st = phraseAt(s, i + row.toks.length - 1, STATE_TABLE);
    if (st && st.toks.length > 1) continue;
    langRequest ??= row.value;
    mark(i, row.toks.length, "lang");
  }

  // School cues decide whether an ordinal is a class and a subject word is a subject.
  const hasSchoolCue =
    toks.some((t) => CLASS_WORD.has(t) || CHAPTER_WORD.has(t)) || has(toks, BOARD) || toks.some((t) => t === "ncert" || t === "cbse" || t === "textbook");
  const hasSubjectWord = has(toks, SUBJECT);
  const hasRoleWord = toks.some((t) => ROLE.has(t)) || has(toks, INTENT) || has(toks, SECTION);

  // 2 — board-local class names ("second puc", "inter 1st year", "plus two").
  // 26 Sep 2026 (search fixer): "matric" / "matriculation" / "sslc" are Class 10
  // only beside a school word and away from scholarship, job and exam-page
  // words ("post matric scholarship", "sslc result", "matric pass govt job"),
  // and never inside a board's own name ("karnataka sslc").
  const boardCover = new Set<number>();
  {
    const bs: Scan = { toks, used: toks.map(() => false) };
    for (let i = 0; i < toks.length; i++) {
      const row = phraseAt(bs, i, BOARD);
      if (row) for (let k = 0; k < row.toks.length; k++) boardCover.add(i + k);
    }
  }
  const notSchoolAsk =
    toks.some((t) => JOB_WORDS.has(t)) ||
    valuesIn(toks, SECTION).some((v) => v.section !== "school") ||
    valuesIn(toks, INTENT).some((v) => !SCHOOL_OK_INTENT.has(v.intent) || v.dateKind != null);
  let cls: number | null = null;
  for (let i = 0; i < toks.length; i++) {
    const row = phraseAt(s, i, CLASS_PH);
    if (!row) continue;
    if (row.toks.length === 1 && COND_CLASS.has(row.toks[0])) {
      const cue = hasSchoolCue || hasSubjectWord || (toks.length === 1 && row.toks[0] !== "sslc");
      if (!cue || notSchoolAsk || boardCover.has(i) || Q_AFTER.has(toks[i + 1] ?? "")) continue;
    }
    cls ??= row.value;
    mark(i, row.toks.length, "class");
  }

  // 3 — qualifiers: "12th pass", "after 10th", "with 12th", "12th ke baad", "after graduation".
  let stage: ParsedQuery["stage"] = null;
  // 27 Sep 2026 (wave 2 fixer): true when the stage came only from a bare "10th" / "12th" beside a role
  // or exam word ("12th exam" — often the board exam itself), not from a qualifier the student typed.
  let stageFromBareOrdinal = false;
  for (let i = 0; i < toks.length; i++) {
    const lvl = phraseAt(s, i, STAGE_PH);
    if (lvl) {
      stage ??= lvl.value;
      mark(i, lvl.toks.length, "stage");
      continue;
    }
    const row = phraseAt(s, i, GRAD);
    if (row) {
      stage ??= "after-grad";
      mark(i, row.toks.length, "stage");
    }
  }
  // 26 Sep 2026 (search fixer): "class 10 pass", "10వ తరగతి పాస్" — a class word inside the qualifier.
  for (let i = 0; i + 2 < toks.length; i++) {
    if (s.used[i] || s.used[i + 1] || s.used[i + 2] || !Q_AFTER.has(toks[i + 2])) continue;
    let n: number | null = null;
    if (CLASS_WORD.has(toks[i])) n = num(toks[i + 1]) ?? ordinal(toks[i + 1]);
    else if (CLASS_WORD.has(toks[i + 1])) n = num(toks[i]) ?? ordinal(toks[i]) ?? CLASS_NUM.get(toks[i]) ?? null;
    if (n !== 10 && n !== 12) continue;
    stage ??= n === 10 ? "after-10" : "after-12";
    mark(i, 3, "stage");
  }
  for (let i = 0; i < toks.length; i++) {
    if (s.used[i]) continue;
    const n = ordinal(toks[i]) ?? CLASS_NUM.get(toks[i]) ?? (Q_BEFORE.has(toks[i - 1] ?? "") ? num(toks[i]) : null);
    if (n !== 10 && n !== 12) continue;
    const next = toks[i + 1];
    const tail = i + 1 < toks.length ? phraseAt(s, i + 1, Q_TAIL) : null;
    const before = i > 0 && !s.used[i - 1] && Q_BEFORE.has(toks[i - 1]);
    const after = next != null && !s.used[i + 1] && Q_AFTER.has(next);
    // A bare "12th" next to a job / exam word ("ssc 12th", "12th level jobs") is a qualifier too.
    const jobby = !hasSchoolCue && !hasSubjectWord && toks.some((t, j) => j !== i && ROLE.has(t));
    if (!before && !after && !tail && !jobby) continue;
    if (stage == null && !before && !after && !tail) stageFromBareOrdinal = true;
    stage ??= n === 10 ? "after-10" : "after-12";
    mark(i, 1, "stage");
    if (before) mark(i - 1, 1, "stage");
    if (after) mark(i + 1, 1, "stage");
    if (tail) mark(i + 1, tail.toks.length, "stage");
  }

  // 4 — class: "class 9", "कक्षा 6", "10 తరగతి", "class 10th", "10th", "tenth", "dasvi".
  for (let i = 0; i < toks.length; i++) {
    if (s.used[i]) continue;
    const t = toks[i];
    if (CLASS_WORD.has(t)) {
      const n = num(toks[i + 1]) ?? ordinal(toks[i + 1]);
      if (!s.used[i + 1] && inClassRange(n)) {
        cls ??= n;
        mark(i, 2, "class");
        continue;
      }
      const p = num(toks[i - 1]) ?? ordinal(toks[i - 1]);
      if (i > 0 && !s.used[i - 1] && inClassRange(p)) {
        cls ??= p;
        mark(i - 1, 2, "class");
        continue;
      }
      mark(i, 1, "class"); // a class word with no number is a school cue, not a search word
      continue;
    }
    // A bare "10th" / "tenth" is a class only with a school word beside it, or
    // alone ("rrb ntpc 2nd stage" is not Class 2).
    const bareClassOk = hasSchoolCue || hasSubjectWord || toks.length === 1;
    const o = ordinal(t);
    if (bareClassOk && inClassRange(o) && !(i > 0 && CHAPTER_WORD.has(toks[i - 1])) && !CHAPTER_WORD.has(toks[i + 1] ?? "")) {
      cls ??= o;
      mark(i, 1, "class");
      continue;
    }
    const w = CLASS_NUM.get(t);
    if (w != null && bareClassOk) {
      cls ??= w;
      mark(i, 1, "class");
    }
  }

  // 5 — chapter: "chapter 3", "ch 3", "पाठ 2", "3rd chapter", "chapter no 4".
  let chapterNo: number | null = null;
  for (let i = 0; i < toks.length; i++) {
    if (s.used[i] || !CHAPTER_WORD.has(toks[i])) continue;
    let j = i + 1;
    if (toks[j] === "no" || toks[j] === "number") j++;
    const n = num(toks[j]) ?? ordinal(toks[j]);
    if (n != null && n >= 1 && n <= 40 && !s.used[j]) {
      chapterNo ??= n;
      mark(i, j - i + 1, "chapter");
      continue;
    }
    const p = ordinal(toks[i - 1]) ?? num(toks[i - 1]);
    if (i > 0 && p != null && p >= 1 && p <= 40 && !s.used[i - 1]) {
      chapterNo ??= p;
      mark(i - 1, 2, "chapter");
    }
  }

  // 6 — board.
  let board: string | null = null;
  take(s, BOARD, (row, i) => {
    board ??= row.value;
    for (let k = 0; k < row.toks.length; k++) kindOf[i + k] = "board";
    return true;
  });

  // 7 — year.
  let year: number | null = null;
  for (let i = 0; i < toks.length; i++) {
    if (s.used[i] || !/^20\d\d$/.test(toks[i])) continue;
    const y = Number(toks[i]);
    if (y < 2000 || y > 2035) continue;
    year ??= y;
    mark(i, 1, "year");
  }

  // 8 — "paper 2", "tier 1", "cbt 2", "2nd stage": a sitting, not the exam's name.
  const soft: string[] = [];
  for (let i = 0; i < toks.length - 1; i++) {
    if (s.used[i] || s.used[i + 1]) continue;
    // 26 Sep 2026 (search fixer): "level 2" too ("reet level 2 syllabus").
    const sitting = /^(paper|tier|phase|stage|shift|session|cbt|attempt|level)$/;
    const numbered = sitting.test(toks[i]) && /^\d{1,2}[ab]?$/.test(toks[i + 1]); // "tier 1", "cbt 2"
    const ordinalFirst = ordinal(toks[i]) != null && sitting.test(toks[i + 1]); // "2nd stage"
    if (!numbered && !ordinalFirst) continue;
    mark(i, 2, "sitting"); // which sitting, not which exam: read and set aside
  }

  // 9 — exam page (intent).
  const intents: { intent: ExamIntent; dateKind?: string }[] = [];
  take(s, INTENT, (row, i) => {
    intents.push(row.value);
    for (let k = 0; k < row.toks.length; k++) kindOf[i + k] = "intent";
    return true;
  });
  // 26 Sep 2026 (search fixer): a bare "paper" beside an exam is its previous
  // papers ("hssc cet 2024 paper", "neet paper"), as "पेपर" already is; next
  // to a school word it stays a word ("class 3 paper boats").
  const schoolWords = cls != null || chapterNo != null || board != null || toks.some((t) => CLASS_WORD.has(t) || CHAPTER_WORD.has(t));
  for (let i = 0; i < toks.length; i++) {
    if (s.used[i] || !PAPER.has(toks[i]) || schoolWords) continue;
    intents.push({ intent: "pyq" });
    mark(i, 1, "intent");
  }
  let intent: ExamIntent | null = null;
  let dateKind: string | null = null;
  for (const p of INTENT_PRIORITY) {
    const hit = intents.find((x) => x.intent === p);
    if (hit) {
      intent = hit.intent;
      dateKind = hit.dateKind ?? null;
      break;
    }
  }

  // 10 — section words (colleges, scholarships, careers, sarkari naukri …).
  let section: SearchSection | null = null;
  let kindHint: DocKind | null = null;
  let aspect: ParsedQuery["aspect"] = null;
  const sectionWords: string[] = [];
  take(s, SECTION, (row, i) => {
    sectionWords.push(...row.toks);
    section ??= row.value.section;
    if (row.value.kind && (!kindHint || kindHint === "college")) kindHint = row.value.kind;
    aspect ??= row.value.aspect ?? null;
    for (let k = 0; k < row.toks.length; k++) kindOf[i + k] = "section";
    return true;
  });
  const filters: ParsedQuery["filters"] = { gender: null, categories: [], levels: [] };
  for (let i = 0; i < toks.length; i++) {
    if (s.used[i]) continue;
    if (GENDER_F.has(toks[i])) {
      filters.gender = "F";
      mark(i, 1, "filter");
    } else if ((kindHint === "scholarship" || intent === "cutoff") && L.CATEGORY_WORDS[toks[i]]) {
      // 26 Sep 2026 (search fixer): "ssc cgl cutoff obc" — the cutoff page is category-wise.
      filters.categories.push(L.CATEGORY_WORDS[toks[i]]);
      mark(i, 1, "filter");
    } else if (kindHint === "scholarship" && L.LEVEL_WORDS[toks[i]]) {
      filters.levels.push(L.LEVEL_WORDS[toks[i]]);
      mark(i, 1, "filter");
    }
  }

  // 11 — state: names in any script, typos, then a 2-letter abbreviation only
  // beside a role / exam / section word.
  let state: string | null = null;
  const stateTokens: string[] = [];
  take(s, STATE_TABLE, (row, i) => {
    if (state && state !== row.value) return false;
    state = row.value;
    stateTokens.push(...row.toks);
    for (let k = 0; k < row.toks.length; k++) kindOf[i + k] = "state";
    return true;
  });
  if (!state && hasRoleWord) {
    for (let i = 0; i < toks.length; i++) {
      if (s.used[i]) continue;
      const code = ABBR.get(toks[i]);
      if (!code || (opts.typing && i === toks.length - 1)) continue;
      state = code;
      stateTokens.push(toks[i]);
      mark(i, 1, "state");
      break;
    }
  }

  // 12 — question shape: question words, "?", doubt verbs, first person, compare.
  const questionMark = /[?？]\s*$/.test(String(raw ?? ""));
  let questionWords = 0;
  for (let i = 0; i < toks.length; i++) {
    if (s.used[i] || !QUESTION.has(toks[i])) continue;
    questionWords++;
    // "when is X" asks for the dates page.
    if ((toks[i] === "when" || toks[i] === "ఎప్పుడు") && !intent) {
      intent = "dates";
      dateKind = "EXAM";
    }
    mark(i, 1, "question");
    // 27 Sep 2026 (wave 2 fixer): "kaun sa" / "kon si" — the pair is one question word.
    if (Q_PAIR_HEAD.has(toks[i]) && i + 1 < toks.length && !s.used[i + 1] && Q_PAIR_TAIL.has(toks[i + 1])) mark(i + 1, 1, "question");
  }
  const doubtVerb = has(toks, DOUBT);
  const firstPerson = has(toks, FIRST);
  const compare = has(toks, COMPARE);
  for (let i = 0; i < toks.length; i++) {
    const row = phraseAt(s, i, DOUBT);
    if (row) mark(i, row.toks.length, "question");
  }
  const shape: ParsedQuery["shape"] = questionMark || questionWords > 0 || doubtVerb ? "question" : "keyword";

  // 13 — stop words and romanised fillers.
  for (let i = 0; i < toks.length; i++) if (!s.used[i] && STOP.has(toks[i])) mark(i, 1, "stop");

  // 14 — school subject, claimed only with a school cue ("class 9 science");
  // without one it stays a word for the index ("physics" → a list).
  let subject: string | null = null;
  const schoolCue = cls != null || board != null || chapterNo != null || section === "school";
  if (schoolCue) {
    take(s, SUBJECT, (row, i) => {
      if (subject) return false;
      subject = row.value;
      for (let k = 0; k < row.toks.length; k++) kindOf[i + k] = "subject";
      return true;
    });
  }

  // 15 — graduation / PG / PhD study help (no section yet).
  // 26 Sep 2026 (search fixer): "ug" / "pg" right after an exam's own word ("neet ug", "cuet ug") is part of its name, not a degree.
  const examSuffix = (i: number) => {
    const p = toks[i - 1];
    return i > 0 && /^[a-z][a-z0-9]{2,}$/.test(p) && !DEGREE.has(p) && !STUDY.has(p) && !STOP.has(p) && !CLASS_WORD.has(p);
  };
  const degreeWord = toks.some((t, i) => DEGREE.has(t) && !((t === "ug" || t === "pg") && examSuffix(i)));
  const beingBuilt = has(toks, BEING_ALWAYS) || (degreeWord && toks.some((t) => STUDY.has(t)));

  // 16 — residual.
  const hard: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    if (s.used[i]) continue;
    if (SOFT.has(toks[i])) soft.push(toks[i]);
    else hard.push(toks[i]);
  }
  const chapterWords = schoolCue && subject ? [...hard] : [];

  const phrase = toks.filter((_t, i) => !["lang", "stop", "question"].includes(kindOf[i] ?? "")).join(" ");
  const doubt = shape === "question" && (doubtVerb || firstPerson || compare || hard.length >= 2);

  return {
    raw: String(raw ?? ""),
    norm,
    script,
    tokens: toks,
    pastedPath,
    langRequest,
    intent,
    dateKind,
    year,
    cls,
    board,
    subject,
    chapterNo,
    chapterWords,
    stage,
    stageExplicit: stage != null && !stageFromBareOrdinal,
    state,
    stateTokens,
    section,
    sectionWords,
    kindHint,
    aspect,
    filters,
    beingBuilt,
    shape,
    doubtVerb,
    firstPerson,
    compare,
    doubt,
    rest: [...hard, ...soft].join(" "),
    hard,
    soft,
    phrase,
  };
}
