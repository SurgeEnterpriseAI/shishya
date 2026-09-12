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
// No prisma / server imports here: BuilderForm (a client component)
// and vitest (no DB) both import this file. The DB side lives in
// src/lib/seen-questions.ts.

/** How far back an attempt counts as "seen". One constant, used by the
 *  seen query, the API copy and the build-mock page. */
export const SEEN_WINDOW_DAYS = 90;

/** questionId -> lastSeenAt (epoch ms). Built by getSeenQuestions(). */
export type SeenMap = Map<string, number>;

export interface Pickable {
  id: string;
}

export type Rng = () => number;

export interface PickResult<T> {
  /** Chosen items, unseen first (shuffled), then least-recently-seen. */
  picked: T[];
  /** How many of `picked` the student has seen inside the window. */
  repeats: number;
  /** Unique unseen items available across the whole input. */
  unseenAvailable: number;
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

/** Split a (deduped) pool into the questions the student has not seen in
 *  the window — input order kept — and the seen ones sorted
 *  least-recently-seen first (ties broken by id so the order is
 *  deterministic). */
export function partitionBySeen<T extends Pickable>(
  pool: readonly T[],
  seen: SeenMap,
): { unseen: T[]; seenLrs: T[] } {
  const unseen: T[] = [];
  const seenItems: { item: T; at: number }[] = [];
  for (const q of dedupeById(pool)) {
    const at = seen.get(q.id);
    if (at === undefined) unseen.push(q);
    else seenItems.push({ item: q, at });
  }
  seenItems.sort((a, b) => a.at - b.at || (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0));
  return { unseen, seenLrs: seenItems.map((s) => s.item) };
}

/** Tiered pick. Tiers are priority-ordered candidate lists (e.g. strict
 *  difficulty first, MEDIUM fallback second). Order of preference:
 *    1. unseen from tier 0, then unseen from tier 1, … (shuffled within a tier)
 *    2. least-recently-seen from tier 0, then tier 1, …
 *  Never returns the same id twice, never more than the unique pool. */
export function pickTiered<T extends Pickable>(
  tiers: readonly (readonly T[])[],
  count: number,
  seen: SeenMap,
  rng: Rng = Math.random,
): PickResult<T> {
  const picked: T[] = [];
  const have = new Set<string>();
  const unseenIds = new Set<string>();
  const lrsTiers: T[][] = [];

  for (const tier of tiers) {
    const { unseen, seenLrs } = partitionBySeen(tier, seen);
    for (const q of unseen) unseenIds.add(q.id);
    lrsTiers.push(seenLrs);
    for (const q of shuffleWith(unseen, rng)) {
      if (picked.length >= count) break;
      if (have.has(q.id)) continue;
      have.add(q.id);
      picked.push(q);
    }
  }
  const unseenPicked = picked.length;

  for (const lrs of lrsTiers) {
    for (const q of lrs) {
      if (picked.length >= count) break;
      if (have.has(q.id)) continue;
      have.add(q.id);
      picked.push(q);
    }
  }

  return { picked, repeats: picked.length - unseenPicked, unseenAvailable: unseenIds.size };
}

/** Single-pool convenience over pickTiered. */
export function pickWithSeenExclusion<T extends Pickable>(
  pool: readonly T[],
  count: number,
  seen: SeenMap,
  rng: Rng = Math.random,
): PickResult<T> {
  return pickTiered([pool], count, seen, rng);
}

/** Candidate pool for a generator that does its own picking (difficulty
 *  mix, CAT, LLM): all unseen questions when there are at least `floor`
 *  of them, otherwise unseen + exactly enough least-recently-seen to
 *  reach `floor`. Handing the generator only what it needs keeps
 *  repeats minimal — any extra seen candidate would let it pick a
 *  more-recently-seen question over an older one. */
export function shapeCandidates<T extends Pickable>(pool: readonly T[], seen: SeenMap, floor: number): T[] {
  const { unseen, seenLrs } = partitionBySeen(pool, seen);
  if (unseen.length >= floor) return unseen;
  return [...unseen, ...seenLrs.slice(0, Math.max(0, floor - unseen.length))];
}

/** How much of a bank the student has already met. Ids in `seen` that are
 *  not in the bank are ignored (they belong to other topics / exams). */
export function seenSummary<T extends Pickable>(bank: readonly T[], seen: SeenMap): { bankSize: number; seenInBank: number } {
  const unique = dedupeById(bank);
  let seenInBank = 0;
  for (const q of unique) if (seen.has(q.id)) seenInBank++;
  return { bankSize: unique.length, seenInBank };
}

/** How many of a set's ids the student has seen in the window (deduped). */
export function countRepeats(ids: readonly string[], seen: SeenMap): number {
  let n = 0;
  for (const id of dedupeIds(ids)) if (seen.has(id)) n++;
  return n;
}

/** The honest sentence a mock-creation API returns. Numbers only from the
 *  DB — never a refresh cadence or a "fresh set" promise (no such cron
 *  exists). i18n key to add later: mocks.bank.line */
export function bankLine(b: Pick<BankStats, "size" | "seen" | "repeats">): string {
  return `You have seen ${b.seen} of the ${b.size} validated questions in this bank; this set repeats ${b.repeats}.`;
}
