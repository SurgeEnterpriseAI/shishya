// "Get 10 fresh questions" on the results page — which questions a fresh set
// holds (6 Oct 2026).
//
// The bug this replaces: the button (src/app/attempts/[id]/results/
// FreshQuestionsButton.tsx → POST /api/mocks/fresh) asked the AI for 10 new
// questions on the student's weakest topic at the moment of the press, saved
// them validated:false and built a CHALLENGE mock on them. Since 26 Sep 2026
// (ebd0a9c) every mock serves only answer-checked questions
// (src/lib/served-paper.ts), so every fresh set served 0 of its 10 and opened
// on "This mock is being rebuilt": from 26 Sep 13:35 IST to 6 Oct 09:19 IST,
// 105 sets for 34 students, US$4.39 of model spend, none played (RCA, 6 Oct).
//
// The site promises that mocks serve only answer-checked questions, and that
// promise stays. So a fresh set is no longer written by the AI. It is picked,
// with no model call, from the questions of the same exam that
//   • pass the served-paper rule (isServable: validated and not tagged
//     "rejected"; a question the answer-check firewall failed is never
//     validated, see src/lib/question-withdrawn.ts), AND
//   • passed the answer check (answerChecked: the firewall's own record,
//     validatedBy 'factory:…' with metadata.factoryVerify — the rule of
//     src/lib/exam-answer-check.ts, computed by the route's SQL). Review fix,
//     6 Oct 2026: 157 validated questions on 55 exams carry no check record
//     (validated at insert or in bulk); the card calls the set
//     "answer-checked", so those are never picked and never counted in M; AND
//   • are in the language of the attempt's paper (review fix, 6 Oct 2026:
//     7 exams hold native-medium rows beside the English ones — TS_POLICE_PC
//     119 TE of 498 — and an English student's set must not turn Telugu;
//     paperLanguage below, EN when unknown), AND
//   • this student has NOT seen.
// How:
//   • "seen" = in any attempt this student ever opened (any status, any
//     date — the attempt's mock question list and the questions saved on the
//     attempt itself), so the set never repeats a question; and a question
//     whose stem is the same text as a seen one (a duplicate row) counts as
//     seen too;
//   • preference = the scope the button had: the topic it names (the
//     attempt's weakest, with its sub-topics) first, then the other topics
//     the student got wrong in that attempt (weakest first), then the rest of
//     that topic's subject, then the whole exam (tiers, built by the route);
//   • no twins (the topic page's rules, src/lib/topic-question-display.ts):
//     the same stem once; the same stem with new numbers, or the same
//     question in other words, at most twice. When that leaves the set short,
//     the near-twins are allowed back (never an identical stem);
//   • a deterministic order with variety: within a tier, a fixed hash of
//     (student, question) — the same pool gives the same student the same
//     set, two students get different ones; the chosen set is then played
//     easy to hard, with no more than three answers of one letter in a row.
// A set holds up to FRESH_SET_SIZE questions. With fewer than FRESH_SET_MIN
// (= MIN_SERVED_QUESTIONS, the shortest paper a mock may start with) there is
// no set: the route makes no mock and the card says how many of the exam's
// answer-checked questions the student has practised.
//
// Pure — no DB, no model. The route: src/app/api/mocks/fresh/route.ts.
// Tests: tests/unit/fresh-checked-set.test.ts, tests/unit/fresh-set-core.test.ts.

import { isServable, MIN_SERVED_QUESTIONS } from "@/lib/served-paper";
import { kindKey, kindWords, sameKind, stemKey } from "@/lib/topic-question-display";

/** The most questions a fresh set holds (the button's "10"). */
export const FRESH_SET_SIZE = 10;
/** Below this many unseen checked questions there is no set (a mock shorter than this never starts). */
export const FRESH_SET_MIN = MIN_SERVED_QUESTIONS;
/** Mock.generatedBy of a fresh set picked from the checked bank (6 Oct 2026 on). */
export const FRESH_GENERATED_BY = "rule:fresh-checked";
/** Mock.generatedBy of the AI-written sets (10 Sep – 6 Oct 2026); none is made any more. */
export const LEGACY_ON_DEMAND_GENERATED_BY = "ai:on-demand";
/** At most this many of one kind in a set (the topic page's MAX_SAME_KIND_WITH_NEW_NUMBERS). */
const MAX_SAME_KIND = 2;
/** No more than this many answers of one letter in a row (the topic page's rule). */
const MAX_SAME_LETTER_RUN = 3;

/** What the picker reads of a question. */
export interface FreshCandidate {
  id: string;
  topicId: string;
  difficulty: string;
  body: string;
  answerKey: string;
  validated: boolean;
  tags?: readonly string[] | null;
  /**
   * The answer check passed this row (validatedBy 'factory:…' and
   * metadata.factoryVerify — src/lib/exam-answer-check.ts). Anything but
   * true (false, null, missing) is not picked and not counted.
   */
  answerChecked?: boolean | null;
  /** Question.language ("EN", "TE", …); missing = "EN" (the column's default). */
  language?: string | null;
}

/** A row a fresh set may hold: servable (the served-paper rule) and passed by the answer check. */
export function isFreshEligible(q: FreshCandidate | null | undefined): boolean {
  return !!q && isServable(q) && q.answerChecked === true;
}

export interface FreshPickInput {
  /** The exam's questions (the route reads the servable ones; anything else is dropped here too). */
  pool: readonly FreshCandidate[];
  /** Only rows of this Question.language (the attempt's paper's); omitted = every language. */
  language?: string;
  /** Question ids this student has seen in any attempt. */
  seen: ReadonlySet<string>;
  /** Topic ids in order of preference; a topic in none of them is the last tier (the rest of the exam). */
  tiers: readonly ReadonlySet<string>[];
  /** Fixes the order for this student (their user id). */
  salt: string;
  /** Default FRESH_SET_SIZE. */
  size?: number;
}

export interface FreshPick {
  /** The set, in the order it is played. Empty when ok is false. */
  ids: string[];
  /** True when the set has at least FRESH_SET_MIN questions. */
  ok: boolean;
  /** The exam's answer-checked questions in the set's language (servable and passed by the check) — the card's M. */
  total: number;
  /** Of those, the ones this student has practised (seen, or the same text as a seen one). */
  practised: number;
  /** Different unseen questions that could be served (identical stems counted once). */
  available: number;
  /** How many of the set came from each tier (index = tier; the last = the rest of the exam). */
  perTier: number[];
}

/** FNV-1a, 32-bit: a fixed number for (salt, id), so the order never depends on Math.random. */
export function freshOrderKey(salt: string, id: string): number {
  let h = 0x811c9dc5;
  const s = `${salt}:${id}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The tier of a topic: its index in `tiers`, or tiers.length for the rest of the exam. */
export function tierOf(topicId: string, tiers: readonly ReadonlySet<string>[]): number {
  const i = tiers.findIndex((t) => t.has(topicId));
  return i === -1 ? tiers.length : i;
}

const DIFFICULTY_ORDER: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2 };

/** Which questions a fresh set holds, and the numbers the card shows when there are too few. */
export function pickFreshSet(input: FreshPickInput): FreshPick {
  const size = Math.max(1, Math.floor(input.size ?? FRESH_SET_SIZE));
  const { tiers, seen, salt } = input;

  // The servable, answer-checked pool in the set's language, each id once.
  const lang = input.language;
  const byId = new Map<string, FreshCandidate>();
  for (const q of input.pool) {
    if (!q || typeof q.id !== "string" || byId.has(q.id) || !isFreshEligible(q)) continue;
    if (lang && (q.language || "EN") !== lang) continue;
    byId.set(q.id, q);
  }
  const servable = [...byId.values()];
  const total = servable.length;

  // A row with the same text as a seen question is that question again.
  const seenStems = new Set<string>();
  for (const q of servable) if (seen.has(q.id)) seenStems.add(stemKey(q.body));
  const unseen = servable.filter((q) => !seen.has(q.id) && !seenStems.has(stemKey(q.body)));
  const practised = total - unseen.length;
  const available = new Set(unseen.map((q) => stemKey(q.body))).size;

  const key = new Map(unseen.map((q) => [q.id, freshOrderKey(salt, q.id)] as const));
  const ranked = [...unseen].sort(
    (a, b) =>
      tierOf(a.topicId, tiers) - tierOf(b.topicId, tiers) ||
      key.get(a.id)! - key.get(b.id)! ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  // Pass 1: no twins (identical stem once; new numbers or other words at most twice).
  const picked: FreshCandidate[] = [];
  const stems = new Set<string>();
  const kindCount = new Map<string, number>();
  const groups: { words: Set<string>; n: number }[] = [];
  for (const q of ranked) {
    if (picked.length >= size) break;
    const s = stemKey(q.body);
    if (stems.has(s)) continue;
    const k = kindKey(q.body);
    const n = kindCount.get(k) ?? 0;
    if (n >= MAX_SAME_KIND) continue;
    const words = kindWords(q.body);
    const group = groups.find((g) => sameKind(g.words, words));
    if (group && group.n >= MAX_SAME_KIND) continue;
    if (group) group.n++;
    else groups.push({ words, n: 1 });
    stems.add(s);
    kindCount.set(k, n + 1);
    picked.push(q);
  }
  // Pass 2, only when short: near-twins come back, an identical stem never does.
  if (picked.length < size) {
    const chosen = new Set(picked.map((q) => q.id));
    for (const q of ranked) {
      if (picked.length >= size) break;
      if (chosen.has(q.id)) continue;
      const s = stemKey(q.body);
      if (stems.has(s)) continue;
      stems.add(s);
      chosen.add(q.id);
      picked.push(q);
    }
  }

  const perTier = Array.from({ length: tiers.length + 1 }, () => 0);
  for (const q of picked) perTier[tierOf(q.topicId, tiers)]++;

  if (picked.length < FRESH_SET_MIN) return { ids: [], ok: false, total, practised, available, perTier };

  // Played easy to hard (then by the same fixed key), with no more than three
  // answers of one letter in a row — by moving questions, never options.
  const ordered = [...picked].sort(
    (a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1) || key.get(a.id)! - key.get(b.id)!,
  );
  const out: FreshCandidate[] = [];
  const rest = [...ordered];
  while (rest.length) {
    const run = out.slice(-MAX_SAME_LETTER_RUN);
    const letter = (q: FreshCandidate) => q.answerKey.trim();
    const blocked = run.length === MAX_SAME_LETTER_RUN && run.every((q) => letter(q) === letter(run[0])) ? letter(run[0]) : null;
    const i = blocked === null ? 0 : rest.findIndex((q) => letter(q) !== blocked);
    out.push(rest.splice(i === -1 ? 0 : i, 1)[0]);
  }
  return { ids: out.map((q) => q.id), ok: true, total, practised, available, perTier };
}

/** The topic ids of the attempt's topics the student got wrong, weakest first (topicScores is keyed by topic id). */
export function weakTopicIdsOf(topicScores: unknown): string[] {
  if (!topicScores || typeof topicScores !== "object" || Array.isArray(topicScores)) return [];
  const rows: { id: string; score: number }[] = [];
  for (const [id, v] of Object.entries(topicScores as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const score = Number((v as { score?: unknown }).score);
    if (Number.isFinite(score) && score < 1) rows.push({ id, score });
  }
  return rows.sort((a, b) => a.score - b.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((r) => r.id);
}

/**
 * The language of an attempt's paper: the most common Question.language of
 * its questions. A tie that includes EN, no question, or no readable
 * language → "EN" (the column's default and the old route's only language);
 * any other tie → the first code alphabetically, so the answer is fixed.
 */
export function paperLanguage(languages: readonly (string | null | undefined)[]): string {
  const n = new Map<string, number>();
  for (const l of languages) {
    const code = typeof l === "string" ? l.trim().toUpperCase() : "";
    if (/^[A-Z]{2}$/.test(code)) n.set(code, (n.get(code) ?? 0) + 1);
  }
  if (n.size === 0) return "EN";
  const top = Math.max(...n.values());
  const leaders = [...n.keys()].filter((k) => n.get(k) === top).sort();
  return leaders.includes("EN") ? "EN" : leaders[0];
}

export interface ExamTopic {
  id: string;
  code: string;
  subjectId: string;
  parentId: string | null;
}

/**
 * The preference tiers for a set: [the pressed topic and its sub-topics, the
 * attempt's other weak topics (weakest first, each with its sub-topics), the
 * rest of the pressed topic's subject]. Empty sets are dropped; a topic sits
 * in its first tier only. With no pressed topic, the weak topics lead.
 */
export function freshTiers(topics: readonly ExamTopic[], pressedTopicId: string | null, weakTopicIds: readonly string[]): Set<string>[] {
  const withChildren = (id: string) => [id, ...topics.filter((t) => t.parentId === id).map((t) => t.id)];
  const known = new Set(topics.map((t) => t.id));
  const placed = new Set<string>();
  const tiers: Set<string>[] = [];
  const add = (ids: readonly string[]) => {
    const tier = new Set<string>();
    for (const id of ids) if (known.has(id) && !placed.has(id)) tier.add(id);
    for (const id of tier) placed.add(id);
    if (tier.size > 0) tiers.push(tier);
  };
  if (pressedTopicId) add(withChildren(pressedTopicId));
  add(weakTopicIds.flatMap(withChildren));
  const pressed = topics.find((t) => t.id === pressedTopicId);
  if (pressed) add(topics.filter((t) => t.subjectId === pressed.subjectId).map((t) => t.id));
  return tiers;
}

/** The other practice the too-few card links to: the hub's topic list (each topic has its quiz) and its previous-year papers. */
export function freshSetLinks(examCode: string, hasPreviousYear: boolean): { topics: string; pyq: string | null } {
  const hub = `/exams/${encodeURIComponent(examCode)}`;
  return { topics: `${hub}#syllabus`, pyq: hasPreviousYear ? `${hub}#pyqs` : null };
}
