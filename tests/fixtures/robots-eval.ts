// A small RFC 9309 evaluator for the real robots() rules (moved here from
// tests/unit/robots-sections.test.ts on 27 Sep 2026 so the search tests can
// ask the same question: longest match wins, allow wins a tie, "*" wildcard,
// "$" end anchor, a named group replaces "*").

export type Rule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };

export const list = (x: string | string[] | undefined): string[] => ([] as string[]).concat(x ?? []);

/** RFC 9309 path pattern → RegExp: "*" any run, trailing "$" end anchor,
 *  everything else literal; always anchored at the start (a prefix match). */
export function patternRe(p: string): RegExp {
  const anchored = p.endsWith("$");
  const body = (anchored ? p.slice(0, -1) : p)
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/** The group for a user agent: an exact (case-insensitive) product-token
 *  match, else the "*" group. */
export function groupFor(rules: Rule[], ua: string): Rule[] {
  const named = rules.filter((r) => list(r.userAgent).some((a) => a.toLowerCase() === ua.toLowerCase()));
  return named.length ? named : rules.filter((r) => list(r.userAgent).includes("*"));
}

/** Longest matching rule wins; allow wins a tie; no match = allowed. */
export function allowed(rules: Rule[], ua: string, path: string): boolean {
  let best: { len: number; allow: boolean } | null = null;
  for (const r of groupFor(rules, ua)) {
    for (const [pats, allow] of [
      [list(r.allow), true],
      [list(r.disallow), false],
    ] as const) {
      for (const p of pats) {
        if (!p || !patternRe(p).test(path)) continue;
        const len = p.length;
        if (!best || len > best.len || (len === best.len && allow && !best.allow)) best = { len, allow };
      }
    }
  }
  return best ? best.allow : true;
}
