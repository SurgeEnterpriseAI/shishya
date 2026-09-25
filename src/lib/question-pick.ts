// Seen-aware question picking — the ONE helper every per-student picker
// uses (/api/mocks, /api/mocks/custom, the build-mock page, tests).
//
// The rule (audit 11 Sep 2026 — "Why repeatedly questions asked??"):
// a student must not meet a question again while the same scope still
// holds validated questions they have NOT met in the last
// SEEN_WINDOW_DAYS days. "Seen" = the question was in ANY mock the
// student opened on this exam (an Attempt row exists — submitted,
// abandoned or still open), because the player renders every question
// of a mock the moment the attempt row is created.
//
// When the unseen pool is smaller than the request we fall back to the
// LEAST-recently-seen questions (oldest lastSeenAt first) — never a
// random recycle of the whole bank — and we report exactly how many
// repeat so the copy can be honest. A picked set never contains the
// same question twice.
//
// Seen = ANSWERED (25 Sep 2026). The September read found 234 of 368
// builder mocks re-serving questions — still 58% after the rule above —
// and 41 of 313 repeat mocks re-served ONLY questions the student had
// never answered: they had merely been on screen in a mock left at
// question 1. Every helper below therefore also accepts a SeenHistory
// ({ answered, shown }, built by getSeenHistory in
// src/lib/answered-questions.ts) in place of a flat SeenMap:
//   answered — a choice was saved for it in the window. This is "seen":
//              it counts as a repeat and in every bank number.
//   shown    — on screen in an opened mock but never answered in the
//              window. Not a repeat, but picked only after every
//              never-shown question, least-recently-shown first, and
//              always before any answered one.
// A flat SeenMap still means "everything in it is seen" (the old
// opened-means-seen map), so callers that still pass one are unchanged.
//
// No prisma / server imports here: BuilderForm (a client component)
// and vitest (no DB) both import this file. The DB side lives in
// src/lib/seen-questions.ts and src/lib/answered-questions.ts.

/** How far back an attempt counts as "seen". One constant, used by the
 *  seen query, the API copy and the build-mock page. */
export const SEEN_WINDOW_DAYS = 90;

/** questionId -> lastSeenAt (epoch ms). Built by getSeenQuestions(). */
export type SeenMap = Map<string, number>;

/** What a student did with this exam's questions in the window (25 Sep
 *  2026). `answered`: questionId -> start of the latest attempt in which a
 *  choice was saved for it. `shown`: questionId -> start of the latest
 *  attempt that had it on screen, for questions never answered in the
 *  window (no id is in both maps). */
export interface SeenHistory {
  answered: SeenMap;
  shown: SeenMap;
}

/** The old flat map (every entry counts as seen) or a SeenHistory. */
export type SeenInput = SeenMap | SeenHistory;

const NO_SHOWN: SeenMap = new Map();

/** A flat map is all-answered with nothing shown-only. */
export function asSeenHistory(seen: SeenInput): SeenHistory {
  return seen instanceof Map ? { answered: seen, shown: NO_SHOWN } : seen;
}

/** The questions that count as SEEN — repeats and bank numbers. */
export function answeredOf(seen: SeenInput): SeenMap {
  return seen instanceof Map ? seen : seen.answered;
}

export interface Pickable {
  id: string;
}

export type Rng = () => number;

export interface PickResult<T> {
  /** Chosen items, unseen first (shuffled), then least-recently-seen. */
  picked: T[];
  /** How many of `picked` the student has seen (answered) inside the window. */
  repeats: number;
  /** Unique unseen (not answered) items available across the whole input. */
  unseenAvailable: number;
  /** How many of `picked` were on screen before but never answered
   *  (SeenHistory only; always 0 for a flat map). Not repeats. */
  reshown: number;
}

/** The numbers every mock-creation response carries. Real DB counts only. */
export interface BankStats {
  /** Validated questions in the scope the set was drawn from. */
  size: number;
  /** Of those, how many the student has seen in the window. */
  seen: number;
  /** How many questions in THIS set the student has seen in the window. */
  repeats: number;
  windowDays: number;
}

/** Fisher-Yates on a copy. `rng` is injectable so tests are deterministic. */
export function shuffleWith<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** First occurrence wins; input order preserved. */
export function dedupeById<T extends Pickable>(items: readonly T[]): T[] {
  const have = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (have.has(it.id)) continue;
    have.add(it.id);
    out.push(it);
  }
  return out;
}

/** Same as dedupeById for a plain id list. */
export function dedupeIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

function byAtThenId<T extends Pickable>(a: { item: T; at: number }, b: { item: T; at: number }): number {
  return a.at - b.at || (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0);
}

/** Split a (deduped) pool into the questions the student has not seen in
 *  the window — input order kept — and the seen ones sorted
 *  least-recently-seen first (ties broken by id so the order is
 *  deterministic).
 *  With a SeenHistory, "seen" = answered, and the rest splits into
 *  `fresh` (never on screen in the window, input order) and `shownLrs`
 *  (on screen but never answered, least-recently-shown first); `unseen`
 *  is fresh then shownLrs. With a flat map, fresh = unseen and shownLrs
 *  is empty. */
export function partitionBySeen<T extends Pickable>(
  pool: readonly T[],
  seen: SeenInput,
): { unseen: T[]; seenLrs: T[]; fresh: T[]; shownLrs: T[] } {
  const { answered, shown } = asSeenHistory(seen);
  const fresh: T[] = [];
  const shownItems: { item: T; at: number }[] = [];
  const seenItems: { item: T; at: number }[] = [];
  for (const q of dedupeById(pool)) {
    const at = answered.get(q.id);
    if (at !== undefined) {
      seenItems.push({ item: q, at });
      continue;
    }
    const shownAt = shown.get(q.id);
    if (shownAt !== undefined) shownItems.push({ item: q, at: shownAt });
    else fresh.push(q);
  }
  shownItems.sort(byAtThenId);
  seenItems.sort(byAtThenId);
  const shownLrs = shownItems.map((s) => s.item);
  return { unseen: [...fresh, ...shownLrs], seenLrs: seenItems.map((s) => s.item), fresh, shownLrs };
}

/** Tiered pick. Tiers are priority-ordered candidate lists (e.g. strict
 *  difficulty first, MEDIUM fallback second). Order of preference:
 *    1. unseen from tier 0, then unseen from tier 1, … (shuffled within a tier)
 *    2. least-recently-seen from tier 0, then tier 1, …
 *  With a SeenHistory, step 1 splits in two: never-shown questions of
 *  every tier first (shuffled within a tier), then shown-but-unanswered
 *  ones of every tier (least-recently-shown first); step 2 is the
 *  answered ones. Never returns the same id twice, never more than the
 *  unique pool. */
export function pickTiered<T extends Pickable>(
  tiers: readonly (readonly T[])[],
  count: number,
  seen: SeenInput,
  rng: Rng = Math.random,
): PickResult<T> {
  const picked: T[] = [];
  const have = new Set<string>();
  const unseenIds = new Set<string>();
  const shownTiers: T[][] = [];
  const lrsTiers: T[][] = [];
  const take = (q: T) => {
    if (picked.length >= count || have.has(q.id)) return;
    have.add(q.id);
    picked.push(q);
  };

  for (const tier of tiers) {
    const { unseen, fresh, shownLrs, seenLrs } = partitionBySeen(tier, seen);
    for (const q of unseen) unseenIds.add(q.id);
    shownTiers.push(shownLrs);
    lrsTiers.push(seenLrs);
    for (const q of shuffleWith(fresh, rng)) take(q);
  }
  const freshPicked = picked.length;
  for (const shown of shownTiers) for (const q of shown) take(q);
  const unseenPicked = picked.length;
  for (const lrs of lrsTiers) for (const q of lrs) take(q);

  return {
    picked,
    repeats: picked.length - unseenPicked,
    unseenAvailable: unseenIds.size,
    reshown: unseenPicked - freshPicked,
  };
}

/** Single-pool convenience over pickTiered. */
export function pickWithSeenExclusion<T extends Pickable>(
  pool: readonly T[],
  count: number,
  seen: SeenInput,
  rng: Rng = Math.random,
): PickResult<T> {
  return pickTiered([pool], count, seen, rng);
}

/** Candidate pool for a generator that does its own picking (difficulty
 *  mix, CAT, LLM): all unseen questions when there are at least `floor`
 *  of them, otherwise unseen + exactly enough least-recently-seen to
 *  reach `floor`. Handing the generator only what it needs keeps
 *  repeats minimal — any extra seen candidate would let it pick a
 *  more-recently-seen question over an older one.
 *  With a SeenHistory: every never-shown question when there are at least
 *  `floor`, otherwise never-shown + exactly enough shown-but-unanswered
 *  (least-recently-shown first), then answered (least-recently-answered
 *  first), to reach `floor`. */
export function shapeCandidates<T extends Pickable>(pool: readonly T[], seen: SeenInput, floor: number): T[] {
  const { fresh, shownLrs, seenLrs } = partitionBySeen(pool, seen);
  if (fresh.length >= floor) return fresh;
  return [...fresh, ...[...shownLrs, ...seenLrs].slice(0, Math.max(0, floor - fresh.length))];
}

/** How much of a bank the student has already met (answered, for a
 *  SeenHistory). Ids in `seen` that are not in the bank are ignored (they
 *  belong to other topics / exams). */
export function seenSummary<T extends Pickable>(bank: readonly T[], seen: SeenInput): { bankSize: number; seenInBank: number } {
  const answered = answeredOf(seen);
  const unique = dedupeById(bank);
  let seenInBank = 0;
  for (const q of unique) if (answered.has(q.id)) seenInBank++;
  return { bankSize: unique.length, seenInBank };
}

/** How many of a set's ids the student has seen (answered, for a
 *  SeenHistory) in the window (deduped). */
export function countRepeats(ids: readonly string[], seen: SeenInput): number {
  const answered = answeredOf(seen);
  let n = 0;
  for (const id of dedupeIds(ids)) if (answered.has(id)) n++;
  return n;
}

/** The honest sentence a mock-creation API returns. Numbers only from the
 *  DB — never a refresh cadence or a "fresh set" promise (no such cron
 *  exists). i18n key to add later: mocks.bank.line */
export function bankLine(b: Pick<BankStats, "size" | "seen" | "repeats">): string {
  return `You have seen ${b.seen} of the ${b.size} validated questions in this bank; this set repeats ${b.repeats}.`;
}

/** bankLine for numbers counted from a SeenHistory (25 Sep 2026): `seen`
 *  there is ANSWERED questions, so the sentence says answered. Same rule —
 *  DB numbers only, no refresh promise. */
export function answeredBankLine(b: Pick<BankStats, "size" | "seen" | "repeats" | "windowDays">): string {
  return `You have answered ${b.seen} of the ${b.size} validated questions in this bank in the last ${b.windowDays} days; this set repeats ${b.repeats} of them.`;
}
