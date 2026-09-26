// Public-statistics helpers for the transparency pages (27 Sep 2026).
//
// Why: /shishya-in-numbers, /press and /pulse print numbers about Shishya's
// students to the open web. Founder privacy rule (27 Sep 2026): aggregates
// only — never a person, never a count below 20 in any public cell (merge or
// suppress), no user-level data, no identifying timestamps. Every page cell
// goes through these helpers so the k-gate lives in one place.
//
// Pure: no DB, no Next imports — safe in pages, route handlers and tests
// (tests/unit/public-stats.test.ts).

/** The smallest count any public cell may print (founder rule, 27 Sep 2026). */
export const K_MIN = 20;

/** What a suppressed cell prints. */
export const SUPPRESSED = "—";

const NUM = new Intl.NumberFormat("en-IN");

/** "1909" → "1,909" (Indian grouping; "1,00,000" above a lakh). */
export function formatInt(n: number): string {
  return NUM.format(Math.round(n));
}

/** True when a count may be printed in a public cell. */
export function publishable(n: number | null | undefined, k: number = K_MIN): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= k;
}

/** A count cell: the formatted number when it is at least k, else "—". */
export function cell(n: number | null | undefined, k: number = K_MIN): string {
  return publishable(n, k) ? formatInt(n) : SUPPRESSED;
}

/** num / den as a percentage number, or null when den is 0 or missing. */
export function share(num: number | null | undefined, den: number | null | undefined): number | null {
  if (typeof num !== "number" || typeof den !== "number" || !Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return (num / den) * 100;
}

/** "28.7%" with `digits` decimals; null share → "—". */
export function formatPct(p: number | null, digits = 1): string {
  return p === null ? SUPPRESSED : `${p.toFixed(digits)}%`;
}

/** True when a subset `num` of a group `den` may be printed next to it: both
 *  are at least k AND the rest (den − num) is 0 or at least k.
 *  27 Sep 2026 (fixer review): printing "128 of 143" hands the reader
 *  143 − 128 = 15 — a group under k — by subtraction, as surely as a cell
 *  would. */
export function subsetPublishable(num: number | null | undefined, den: number | null | undefined, k: number = K_MIN): boolean {
  if (!publishable(num, k) || !publishable(den, k)) return false;
  const rest = den - num;
  return rest === 0 || rest >= k;
}

/** A share cell: prints only when the numerator, the denominator and the
 *  rest (den − num) all pass subsetPublishable — a share of a small group,
 *  or next to a small remainder, can identify people as surely as the
 *  count itself. */
export function shareCell(num: number | null | undefined, den: number | null | undefined, digits = 1, k: number = K_MIN): string {
  if (!subsetPublishable(num, den, k)) return SUPPRESSED;
  return formatPct(share(num, den), digits);
}

/** A ratio (e.g. mocks per active account) with `digits` decimals; printed
 *  only when the denominator is at least k. */
export function ratioCell(num: number | null | undefined, den: number | null | undefined, digits = 2, k: number = K_MIN): string {
  if (typeof num !== "number" || !publishable(den, k)) return SUPPRESSED;
  return (num / den).toFixed(digits);
}

/** How a merged group's label joins the groups it holds. */
export const MERGE_JOINER = " + ";

export interface Bucket {
  key: string;
  label: string;
  n: number;
}

export interface MergedBucket extends Bucket {
  /** The original keys folded into this group (one entry when unmerged). */
  keys: string[];
  /** The original labels, in the order they were folded in. */
  labels: string[];
  merged: boolean;
}

/** "A", "A and B", "A, B and C". */
export function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/** Merge the smallest group into the next-smallest until every group is at
 *  least k (or only one group is left). Groups with n = 0 are dropped first.
 *  Output is sorted by size, biggest first; a merged group's label names
 *  every group it holds, joined with " + " ("Search engines + Direct or
 *  unknown + Other websites") — "and" would be ambiguous next to a label
 *  like "Social and messaging". */
export function mergeSmallBuckets(buckets: readonly Bucket[], k: number = K_MIN): MergedBucket[] {
  let groups: MergedBucket[] = buckets
    .filter((b) => b.n > 0)
    .map((b) => ({ key: b.key, label: b.label, n: b.n, keys: [b.key], labels: [b.label], merged: false }));
  const bySize = (a: MergedBucket, b: MergedBucket) => a.n - b.n || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  while (groups.length > 1) {
    groups.sort(bySize);
    if (groups[0].n >= k) break;
    const [small, next, ...rest] = groups;
    // Keep the larger group's label first: "Search engines, Direct or unknown …".
    const labels = [...next.labels, ...small.labels];
    const combined: MergedBucket = {
      key: [...next.keys, ...small.keys].join("+"),
      label: labels.join(MERGE_JOINER),
      n: next.n + small.n,
      keys: [...next.keys, ...small.keys],
      labels,
      merged: true,
    };
    groups = [combined, ...rest];
  }
  return groups.sort((a, b) => b.n - a.n || (a.key < b.key ? -1 : 1));
}


export interface SparklineGeometry {
  /** SVG path data; a null value breaks the line. Empty when no value. */
  d: string;
  /** The last non-null point (the dot), or null. */
  last: { x: number; y: number } | null;
  width: number;
  height: number;
}

/** Path for an inline sparkline in a `0 0 width height` viewBox. The y-axis
 *  runs from 0 (bottom) to the series maximum, so a flat series sits where
 *  its value is instead of being stretched to fill the box. */
export function sparklinePath(values: readonly (number | null)[], width = 120, height = 28, pad = 2): SparklineGeometry {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const max = nums.length ? Math.max(...nums, 0) : 0;
  const n = values.length;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const x = (i: number) => (n <= 1 ? width / 2 : pad + (innerW * i) / (n - 1));
  const y = (v: number) => (max <= 0 ? height - pad : pad + innerH - (innerH * v) / max);
  const r = (v: number) => Math.round(v * 100) / 100;
  let d = "";
  let pen = false;
  let last: { x: number; y: number } | null = null;
  values.forEach((v, i) => {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      pen = false;
      return;
    }
    const px = r(x(i));
    const py = r(y(v));
    d += `${pen ? "L" : "M"}${px} ${py} `;
    pen = true;
    last = { x: px, y: py };
  });
  return { d: d.trim(), last, width, height };
}
