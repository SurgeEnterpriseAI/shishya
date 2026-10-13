// The web_search server tool for every caller whose search results become
// facts a student reads (13 Oct 2026): exam dates and news, vacancy notes,
// the current-affairs digest, exam-week articles, the ask box, and the
// official-source / eligibility scripts. One helper, so a change to how we
// search reaches all of them at once.
//
// Shishya's own pages are never a source for a fact. Our pages are built from
// these very calls, so citing one is circular: on 3 Sep 2026 a CDS result
// date was stored as "official" with https://shishya.in/exams/CDS/updates as
// its source. Two free checks in code stop that today: exam-info drops a
// news item and strips a date source on our domain (isOwnSiteUrl below), and
// official-source.ts treats any shishya.in citation as untrusted everywhere
// (isSelfSource: tier "expected", the link never offered as a source).
//
// blocked_domains (keeping shishya.in out of the search results themselves)
// is OFF by default (13 Oct 2026). Measured on exam-info, 8 calls with the
// block and 8 without, same exams: any blocked_domains entry makes the
// searches come back with longer page text, about 13,500 more input tokens a
// call (+34%, about $0.04 on Sonnet 4.5) — +$0.44-0.59/day on exam-info alone,
// more than the cache removal there saves, plus an unmeasured ~$0.19/day on
// the other callers (the ask box included, where a student is waiting). And
// shishya.in appeared in 0 of ~720 raw search results that day. Turning it on
// is a founder decision: set BLOCK_OWN_SITE_DEFAULT to true (every caller), or
// pass { blockOwnSite: true } for one caller, after a judged A/B.
//
// The API refuses blocked_domains together with allowed_domains (400), so
// the callers that search only official hosts (answer-key-check,
// answer-key-research: allowed_domains = officialHostsFor) keep their
// allow-list and do not use this helper; Shishya is outside that list anyway.
// Callers that only borrow a paper's style (pyq-generator,
// vernacular-mock-generator) or pick videos (generate-inspiration-videos)
// state no fact from the results and keep the plain tool.

import { isSelfSource } from "@/lib/never-official-hosts";

/** Shishya's own domains: never a source for a fact. */
export const OWN_SITE_DOMAINS: readonly string[] = ["shishya.in"];

/** Whether webSearchTool adds blocked_domains when the caller does not say (13 Oct 2026: off, see above). */
export const BLOCK_OWN_SITE_DEFAULT = false;

export interface WebSearchToolDef {
  type: "web_search_20250305";
  name: "web_search";
  max_uses: number;
  blocked_domains?: string[];
}

/**
 * The basic web_search tool (web_search_20250305: the app's Sonnet 4.5 has no
 * dynamic filtering). With blockOwnSite (default BLOCK_OWN_SITE_DEFAULT, off)
 * Shishya's own domains are blocked from the results. The installed SDK's
 * Tool union predates the server tool, so callers still cast it into `tools`.
 */
export function webSearchTool(maxUses: number, opts: { blockOwnSite?: boolean } = {}): WebSearchToolDef {
  const tool: WebSearchToolDef = { type: "web_search_20250305", name: "web_search", max_uses: maxUses };
  if (opts.blockOwnSite ?? BLOCK_OWN_SITE_DEFAULT) tool.blocked_domains = [...OWN_SITE_DOMAINS];
  return tool;
}

/** True when `url` is on Shishya's own site (any subdomain or a preview deploy): the same rule as official-source.ts. */
export function isOwnSiteUrl(url: string | null | undefined): boolean {
  return isSelfSource(url);
}
