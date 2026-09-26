// Where a visit came from, as a family (27 Sep 2026).
//
// Why: /shishya-in-numbers reports sign-ups and new people by the source of
// their first visit. The founder's rule (27 Sep 2026): the credible number is
// the referrer-verified share, and ChatGPT tags its links
// utm_source=chatgpt.com with no referrer — so the tag must count. One
// classifier, two forms that cannot drift: sourceFamily() in TypeScript and
// sourceFamilySql() for Postgres, both generated from the same ordered rule
// lists below (tests/unit/source-family.test.ts runs both over the same
// cases through a tiny CASE interpreter).
//
// Order: a tracking tag wins over a referrer. A tag rule is tried first; an
// unknown tag falls through to the referrer; a visit with a tag or referrer
// that matches no rule is "Other websites"; no tag and no referrer is
// "Direct or unknown". Our own share buttons tag copy / native / medium
// share, which count as social. The installed app (utm_source=pwa), our own
// hosts, Google's sign-in page and the stored "direct" sentinel (no
// referrer, no tag) are direct.
//
// Patterns are unanchored, case-insensitive regular expressions written in
// the subset JavaScript and Postgres ARE agree on: alternation, groups, ^,
// $, and [.] for a literal dot. No backslashes (a string escape can silently
// turn "\." into "." — any character) and no quotes (the patterns are
// inlined into SQL); tests/unit/source-family.test.ts enforces both.
//
// Pure: no DB, no Next imports.

import { Prisma } from "@prisma/client";

export type SourceFamily = "ai" | "search" | "social" | "email" | "direct" | "other";

export const SOURCE_FAMILIES: readonly SourceFamily[] = ["ai", "search", "social", "email", "other", "direct"];

export const SOURCE_FAMILY_LABEL: Record<SourceFamily, string> = {
  ai: "AI assistants",
  search: "Search engines",
  social: "Social and messaging",
  email: "Email",
  other: "Other websites",
  direct: "Direct or unknown",
};

export interface SourceRule {
  family: SourceFamily;
  /** Matched (case-insensitive, unanchored) against the tested value. */
  pattern: string;
  /** When set, a value matching this is NOT this rule. */
  unless?: string;
}

/** utm_medium values that mean "shared by a person" (our share buttons). */
export const MEDIUM_RULES: readonly SourceRule[] = [{ family: "social", pattern: "^share$" }];

/** Tag (utm_source) rules, first match wins. */
export const UTM_RULES: readonly SourceRule[] = [
  { family: "email", pattern: "^(email|newsletter)" },
  // 27 Sep 2026 (fixer review): "direct" is the sentinel src/middleware.ts and
  // src/lib/signup-attribution.ts store in User.signupReferrerHost for a
  // visit with no referrer and no tag — it names no source. Without this it
  // fell through to "Other websites" and counted as a named source.
  { family: "direct", pattern: "^(pwa|direct)$" },
  { family: "social", pattern: "^(copy|native)$" },
  { family: "ai", pattern: "(chatgpt|openai|perplexity|gemini|copilot|claude|deepseek|grok|meta[.]ai)" },
  { family: "search", pattern: "^bing" },
  { family: "social", pattern: "(whatsapp|telegram|youtube|facebook|instagram|twitter|reddit|linkedin|quora|sharechat|^x$|share)" },
];

/** Referrer-host rules, first match wins. */
export const REF_RULES: readonly SourceRule[] = [
  { family: "email", pattern: "(^com[.]google[.]android[.]gm$|outlook|mail[.])" },
  {
    family: "ai",
    pattern:
      "(chatgpt|openai[.]com|perplexity|gemini[.]google|bard[.]google|copilot|edgeservices[.]bing|claude[.]ai|deepseek|grok|meta[.]ai|you[.]com)",
  },
  { family: "search", pattern: "bing[.]" },
  { family: "search", pattern: "(^|[.])google[.]", unless: "^(accounts|mail)[.]google" },
  { family: "search", pattern: "(googlequicksearchbox|^com[.]google[.]android)" },
  {
    family: "search",
    pattern: "(duckduckgo|yahoo|yandex|search[.]brave|ecosia|baidu|naver|startpage|qwant|seznam|aol[.]|petalsearch|(^|[.])search[.])",
  },
  {
    family: "social",
    pattern:
      "(whatsapp|t[.]me|telegram|youtube|youtu[.]be|facebook|(^|[.])fb[.]|instagram|(^|[.])t[.]co$|twitter|(^|[.])x[.]com$|reddit|linkedin|lnkd|quora|sharechat|pinterest|snapchat|discord)",
  },
  // 27 Sep 2026: "^direct$" = the no-referrer sentinel (see UTM_RULES).
  { family: "direct", pattern: "(^accounts[.]google|shishya|vercel[.]app|localhost|^direct$)" },
];

function matches(rule: SourceRule, value: string): boolean {
  if (!new RegExp(rule.pattern, "i").test(value)) return false;
  return !(rule.unless && new RegExp(rule.unless, "i").test(value));
}

/** The family of one visit from its utm_source, utm_medium and referrer host. */
export function sourceFamily(utmSource: string | null | undefined, utmMedium: string | null | undefined, refHost: string | null | undefined): SourceFamily {
  // No trimming: the SQL form compares the stored strings as they are.
  const u = utmSource ?? "";
  const m = utmMedium ?? "";
  const r = refHost ?? "";
  for (const rule of MEDIUM_RULES) if (m && matches(rule, m)) return rule.family;
  for (const rule of UTM_RULES) if (u && matches(rule, u)) return rule.family;
  for (const rule of REF_RULES) if (r && matches(rule, r)) return rule.family;
  if (u || r) return "other";
  return "direct";
}

/** True when the visit's source is named by a tag or referrer (anything but
 *  "Direct or unknown"). */
export function isNamedSource(f: SourceFamily): boolean {
  return f !== "direct";
}

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*(\.("[A-Za-z_][A-Za-z0-9_]*"|[A-Za-z_][A-Za-z0-9_]*))?$|^"[A-Za-z_][A-Za-z0-9_]*"$/;

function col(expr: string): string {
  if (!SQL_IDENT.test(expr)) throw new Error(`source-family: bad column expression ${JSON.stringify(expr)}`);
  return `COALESCE(${expr}, '')`;
}

function cond(rule: SourceRule, value: string): string {
  const base = `(${value} <> '' AND ${value} ~* '${rule.pattern}'`;
  return rule.unless ? `${base} AND NOT (${value} ~* '${rule.unless}'))` : `${base})`;
}

/** The same classifier as SQL text: a CASE over three column expressions
 *  (e.g. `fa."utmSource"`, `fa."utmMedium"`, `fa."refHost"`) that yields the
 *  SourceFamily string. Column expressions are validated identifiers. */
export function sourceFamilySqlText(utmCol: string, mediumCol: string, refCol: string): string {
  const u = col(utmCol);
  const m = col(mediumCol);
  const r = col(refCol);
  const whens: string[] = [];
  for (const rule of MEDIUM_RULES) whens.push(`WHEN ${cond(rule, m)} THEN '${rule.family}'`);
  for (const rule of UTM_RULES) whens.push(`WHEN ${cond(rule, u)} THEN '${rule.family}'`);
  for (const rule of REF_RULES) whens.push(`WHEN ${cond(rule, r)} THEN '${rule.family}'`);
  whens.push(`WHEN ${u} <> '' OR ${r} <> '' THEN 'other'`);
  return `(CASE ${whens.join(" ")} ELSE 'direct' END)`;
}

/** sourceFamilySqlText as a Prisma.sql fragment. */
export function sourceFamilySql(utmCol: string, mediumCol: string, refCol: string): Prisma.Sql {
  return Prisma.raw(sourceFamilySqlText(utmCol, mediumCol, refCol));
}
