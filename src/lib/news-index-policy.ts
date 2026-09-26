// News permalinks and Google (26 Sep 2026, G1 index hygiene).
//
// Why: Google has shown Shishya almost nowhere since 16 Aug 2026 (a
// site-level quality demotion), and the largest family it reports as
// crawled-not-indexed is /exams/{code}/news/{id}: 6,075 permalinks on 26 Sep
// 2026 (613 live, 5,462 archived — scripts/tmp-w2-g1-probe.ts), most of them
// short generated restatements. Bing, ChatGPT search (Bing's index +
// OAI-SearchBot) and Perplexity DO read them, and ChatGPT sends ~42% of new
// visitors — so the permalinks stay public and indexable for every engine
// except Google:
//
//   robots = { index: true, follow: true, googleBot: { index: false, follow: true } }
//
// Next renders that as <meta name="robots" content="index, follow"> plus
// <meta name="googlebot" content="noindex, follow">. Only Googlebot reads the
// second tag; Bingbot, OAI-SearchBot and PerplexityBot are unaffected, and
// Googlebot still follows the links (hub, tracker, cutoff, syllabus).
// While the flag is on, the permalinks also leave /sitemap.xml (which Google
// reads) and are served from /sitemap-news.xml, which robots.txt does not
// name and the main session submits to Bing Webmaster only.
//
// FOUNDER APPROVAL REQUIRED BEFORE DEPLOY. The 27 Aug 2026 all-engine
// noindex of this family was reverted. What the flag gives up: news
// permalinks drew 280 Google first landings in July 2026, 15 in August and
// 3 in September (297 in 90 days, most before the 16 Aug drop — probe
// tmp-w2-complete2.ts); with the flag on, this family does not come back in
// Google if the demotion lifts. Set NEWS_GOOGLE_NOINDEX = false to keep
// today's behaviour (index everywhere, listed in /sitemap.xml).
//
// Duplicate titles: the refresh cron has written the same headline more than
// once for an exam (208 groups / 492 rows on 26 Sep 2026, 31 with a live
// row, 11 spanning more than 60 days — scripts/tmp-w2-g1-probe.ts; the
// quality critic's read found no group with identical bodies). The rule
// below canonicalises 267 rows in 197 groups, and no live row points at an
// archived one (scripts/tmp-w2-g1-newscanon.ts).
// newsCanonicalId() points each copy at ONE row of its group:
//   1. the earliest-published LIVE row whose cited url is an official source
//      (sourceTier "official" — conducting body's site or the exam's portal);
//   2. else the earliest-published live row;
//   3. else (every copy archived) the earliest-published row.
// A live story is never canonicalised to an archived one (that would tell
// Bing to drop the current story), and a group spanning more than
// NEWS_DUPLICATE_MAX_SPAN_DAYS keeps every row self-canonical: the same
// headline months apart is a different cycle's story (CTET, CGPSC results).
//
// Pure: no DB, no Next imports. The permalink page reads the rows (cached
// per exam) and the sitemap route reads the flag.

import { sourceTier } from "@/lib/official-source";

/** Founder flag — see the header. true = Google-only noindex + out of /sitemap.xml. */
// 27 Sep 2026 (main session): OFF until the founder decides — he reverted the
// last news index change himself on 27 Aug 2026. The canonical-only filter
// and lastmod = publishedAt apply either way. Flip to true only on his yes.
export const NEWS_GOOGLE_NOINDEX: boolean = false;

/** robots metadata that keeps a page out of Google only (26 Sep 2026): every
 *  other engine gets index,follow; Googlebot gets noindex,follow. */
export const GOOGLE_ONLY_NOINDEX = {
  index: true,
  follow: true,
  googleBot: { index: false, follow: true },
} as const;

export const INDEX_EVERYWHERE = { index: true, follow: true } as const;

export type NewsRobots = typeof GOOGLE_ONLY_NOINDEX | typeof INDEX_EVERYWHERE;

/** The robots value of a news permalink for a given flag value. */
export function newsRobots(googleNoindex: boolean = NEWS_GOOGLE_NOINDEX): NewsRobots {
  return googleNoindex ? GOOGLE_ONLY_NOINDEX : INDEX_EVERYWHERE;
}

/** Whether news permalinks belong in /sitemap.xml (the sitemap Google reads). */
export function newsInMainSitemap(googleNoindex: boolean = NEWS_GOOGLE_NOINDEX): boolean {
  return !googleNoindex;
}

/** Lowercase, whitespace-collapsed title — the duplicate key within one exam. */
export function normaliseNewsTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

export const NEWS_DUPLICATE_MAX_SPAN_DAYS = 60;
const DAY_MS = 86_400_000;

export interface NewsCanonicalRow {
  id: string;
  title: string;
  publishedAt: Date | string;
  archivedAt: Date | string | null;
  /** The cited notice URL the generator stored (ExamNewsItem.url). */
  url: string | null;
}

const ms = (d: Date | string): number => (d instanceof Date ? d : new Date(d)).getTime();

/** Earliest published first; id breaks a tie so the pick never depends on read order. */
function byPublished(a: NewsCanonicalRow, b: NewsCanonicalRow): number {
  return ms(a.publishedAt) - ms(b.publishedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** For one exam's rows: id → canonical id, for every row of a duplicate-title
 *  group whose canonical is ANOTHER row. Rows missing from the map are
 *  self-canonical. `officialUrl` = the exam's portal (ExamEligibility). */
export function newsCanonicalMap(rows: readonly NewsCanonicalRow[], officialUrl?: string | null): Map<string, string> {
  const groups = new Map<string, NewsCanonicalRow[]>();
  for (const r of rows) {
    const k = normaliseNewsTitle(r.title);
    if (!k) continue;
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  const out = new Map<string, string>();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const times = g.map((r) => ms(r.publishedAt)).filter(Number.isFinite);
    if (times.length !== g.length) continue; // a bad date: leave the group alone
    if (Math.max(...times) - Math.min(...times) > NEWS_DUPLICATE_MAX_SPAN_DAYS * DAY_MS) continue;
    const sorted = [...g].sort(byPublished);
    const live = sorted.filter((r) => r.archivedAt == null);
    const target =
      live.find((r) => sourceTier("official", r.url, officialUrl) === "official") ?? live[0] ?? sorted[0];
    for (const r of g) if (r.id !== target.id) out.set(r.id, target.id);
  }
  return out;
}

/** The canonical row id for `id` among its exam's rows (itself when unique). */
export function newsCanonicalId(id: string, rows: readonly NewsCanonicalRow[], officialUrl?: string | null): string {
  return newsCanonicalMap(rows, officialUrl).get(id) ?? id;
}

/** 27 Sep 2026 (integration): the rows a sitemap may list — every row that
 *  is its own canonical. A duplicate-title copy carries rel=canonical to
 *  another row of its group (newsCanonicalMap, the permalink page's rule), so
 *  listing it in /sitemap-news.xml would contradict its own tag. Rows are
 *  grouped per exam exactly as the permalink page reads them (every
 *  non-suppressed row of the exam); `officialUrlByExam` = ExamEligibility.
 *  officialUrl per examId. The group's canonical row is always kept. */
export function selfCanonicalNewsRows<R extends NewsCanonicalRow & { examId: string }>(
  rows: readonly R[],
  officialUrlByExam: ReadonlyMap<string, string | null> = new Map(),
): R[] {
  const byExam = new Map<string, R[]>();
  for (const r of rows) {
    const list = byExam.get(r.examId);
    if (list) list.push(r);
    else byExam.set(r.examId, [r]);
  }
  const copies = new Set<string>();
  for (const [examId, list] of byExam) {
    for (const id of newsCanonicalMap(list, officialUrlByExam.get(examId) ?? null).keys()) copies.add(id);
  }
  return rows.filter((r) => !copies.has(r.id));
}
