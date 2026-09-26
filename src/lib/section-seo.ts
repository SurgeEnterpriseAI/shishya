// Section-page SEO helpers (26 Sep 2026, "every education search" wave,
// group D: school, colleges, scholarships, careers and their satellites).
//
// Pure and import-free, so pages, client islands and tests share one rule:
//
//   clipDescription  — a meta / og / JSON-LD description cut at a sentence
//                      end, else a word boundary with an ellipsis. The pages
//                      used `.slice(0, 280)` and `.slice(0, 300)`, which cut
//                      mid-word ("…NIRF Overall #" on /colleges/[slug]).
//   fitTitle         — a <title> kept to ~70 characters: the core (board,
//                      class, subject; or the page's own name) is always
//                      kept, the first optional tail that fits is used, and
//                      the " | Shishya" suffix goes before the core would.
//   examHubHref      — /exams/{CODE} only when the code is in the live
//                      catalogue (src/lib/live-exam-codes.ts); otherwise
//                      null and the caller renders a plain label. /exams/CLAT,
//                      /exams/BITSAT, /exams/UGC_NET and /exams/GATE were
//                      linked from these pages and all 404.
//
// Tests: tests/unit/section-metadata.test.ts

/** Google shows ~155-160 characters of a meta description. */
export const DESCRIPTION_MAX = 160;

/** A <title> this long or shorter shows whole in most results pages. */
export const TITLE_MAX = 70;

export const TITLE_BRAND = " | Shishya";

/** Whitespace-normalised `text`, at most `max` characters, cut at the last
 *  sentence end that keeps at least half of `max`, else at the last word
 *  boundary with "…". Never cuts inside a word or a number. */
export function clipDescription(text: string, max: number = DESCRIPTION_MAX): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  // A sentence end: . ! or ? followed by a space (so "3.5", "e.g" mid-token
  // and URLs never count), at or before `max`.
  const head = t.slice(0, max + 1);
  const re = /[.!?](?=\s)/g;
  let cut = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(head)) && m.index < max) cut = m.index + 1;
  if (cut >= Math.floor(max / 2)) return t.slice(0, cut);
  // Word boundary, leaving one character for the ellipsis.
  const space = t.lastIndexOf(" ", max - 1);
  const base = (space > 0 ? t.slice(0, space) : t.slice(0, max - 1)).replace(/[\s,;:(—–-]+$/, "");
  return `${base}…`;
}

/** `${core} — ${tail}${brand}` with the first tail that fits `max`; then the
 *  first tail without the brand; then — with `keepTail` (the tail is the
 *  page's reason to rank, e.g. a chapter's "notes and practice") — the last,
 *  shortest tail without the brand even over `max`; else the bare core (with
 *  the brand when it fits). The core itself is never shortened. */
export function fitTitle(
  core: string,
  tails: readonly string[],
  opts: { max?: number; brand?: string; keepTail?: boolean } = {},
): string {
  const max = opts.max ?? TITLE_MAX;
  const brand = opts.brand ?? TITLE_BRAND;
  const withTail = (tail: string) => (tail ? `${core} — ${tail}` : core);
  for (const tail of tails) {
    const s = `${withTail(tail)}${brand}`;
    if (s.length <= max) return s;
  }
  for (const tail of tails) {
    const s = withTail(tail);
    if (s.length <= max) return s;
  }
  if (opts.keepTail && tails.length > 0) return withTail(tails[tails.length - 1]);
  return `${core}${brand}`.length <= max ? `${core}${brand}` : core;
}

/** The exam hub path when `code` is a live exam, else null. */
export function examHubHref(code: string, live: ReadonlySet<string> | ReadonlyMap<string, unknown>): string | null {
  return live.has(code) ? `/exams/${code}` : null;
}

/** "GATE_CSE" → "GATE CSE" — the plain label for a code with no live page. */
export function examCodeLabel(code: string): string {
  return code.replace(/_/g, " ");
}
