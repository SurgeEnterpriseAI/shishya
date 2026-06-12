// CAT item selection — pick the next question that teaches us (and the
// student) the most.
//
// Maximum-information selection: at the student's current θ, each candidate
// item has Fisher information I(θ) = a²·P·(1−P), maximal when the item is
// matched to ability (~50-70% chance of success — the productive-struggle
// zone). Pure max-info over-exposes the few best-calibrated items, so we use
// randomesque selection: sample from the top-K by information.
//
// Pure logic; callers fetch candidates and persist choices.

import { itemInformation } from "./irt";

export interface CandidateItem {
  questionId: string;
  a: number;
  b: number;
}

export interface SelectOpts {
  /** How many items to pick. */
  count: number;
  /** Randomesque pool size per pick (default 5). 1 = strict max-info. */
  topK?: number;
  /** Exclude already-seen question ids. */
  excludeIds?: Set<string>;
  /** Optional RNG for testability. Default Math.random. */
  rng?: () => number;
}

/** Select `count` items for a student at ability θ, no repeats. */
export function selectItems(
  theta: number,
  candidates: CandidateItem[],
  opts: SelectOpts,
): CandidateItem[] {
  const rng = opts.rng ?? Math.random;
  const topK = Math.max(1, opts.topK ?? 5);
  const excluded = opts.excludeIds ?? new Set<string>();

  const pool = candidates
    .filter((c) => !excluded.has(c.questionId))
    .map((c) => ({ item: c, info: itemInformation(theta, c) }))
    .sort((x, y) => y.info - x.info);

  const picked: CandidateItem[] = [];
  const taken = new Set<string>();
  while (picked.length < opts.count && pool.length > 0) {
    const window = pool.filter((p) => !taken.has(p.item.questionId)).slice(0, topK);
    if (window.length === 0) break;
    const choice = window[Math.floor(rng() * window.length)];
    picked.push(choice.item);
    taken.add(choice.item.questionId);
  }
  return picked;
}

/**
 * Blend for adaptive mocks: most items in the productive-struggle zone at θ,
 * a confidence-builder below it, and a stretch item above it. Keeps morale
 * up while still maximising measurement.
 */
export function selectAdaptiveSet(
  theta: number,
  candidates: CandidateItem[],
  count: number,
  opts: Omit<SelectOpts, "count"> = {},
): CandidateItem[] {
  const nEasy = Math.max(1, Math.round(count * 0.2));
  const nStretch = Math.max(1, Math.round(count * 0.15));
  const nCore = Math.max(0, count - nEasy - nStretch);

  const excluded = new Set(opts.excludeIds ?? []);
  const out: CandidateItem[] = [];
  const take = (targetTheta: number, n: number) => {
    const picked = selectItems(targetTheta, candidates, {
      ...opts,
      count: n,
      excludeIds: excluded,
    });
    for (const p of picked) {
      excluded.add(p.questionId);
      out.push(p);
    }
  };

  take(theta, nCore); // matched to ability
  take(theta - 1, nEasy); // confidence builders
  take(theta + 1, nStretch); // stretch
  return out;
}
