// What a news permalink may say about where its text came from
// (6 Oct 2026, search plan doNow 3).
//
// Every one of the ~6,380 permalinks said "Compiled by Shishya from official
// notifications" — with no link, although 3,997 AI rows store no source URL
// and the 2,376 stored ones (ExamNewsItem.url) were never rendered. The
// 6 Oct read (scripts/tmp-b1-probe.ts, aggregates): 2,358 rows have a source
// link that can be shown (row.url, else an http `source` on the few curated
// rows; 28 stored URLs are on the copycat / scraper denylist and are never
// shown), 862 of them on an official site; 4,026 rows have none.
//
// So, per row:
//   • the body carries the label "AI summary" when the row is tagged as
//     AI-written (source "ai-generated:…") — never on a row whose provenance
//     is not recorded as AI;
//   • a citable source URL is shown as "Source: {host}";
//   • "from official notifications" is said only when that link is on an
//     official site (src/lib/official-source.ts isOfficialSource — the
//     conducting body's own portal or a government / academic domain);
//   • any other link is shown with a neutral line: Shishya does not list the
//     site as the conducting body's own (review r1, 6 Oct: "is not the
//     conducting body's own site" was false on 4 NATA rows linking nata.in,
//     NATA's own portal, because NATA's stored portal is another host);
//   • a row with no link says plainly that no source link is stored (or that
//     the stored one is on a site Shishya does not cite).
// No other text on the page changes.
//
// Government news sites (review r1): isOfficialSource accepts every gov.in
// host, so 11 rows linking newsonair.gov.in (All India Radio news) said
// "Compiled by Shishya from official notifications" beside a news story.
// A broadcaster's or press office's news page is not the conducting body's
// notice: GOVERNMENT_NEWS_HOSTS never earn the "official notifications"
// wording (they read as any other non-listed site). Date tiers on the
// trackers are unchanged (src/lib/official-source.ts is not touched).
//
// Result permalinks (/exams/{code}/results/{id}) follow the same rule
// (resultProvenance): every ExamResult row is extracted by AI from Shishya's
// AI news summaries (src/lib/results-extract.ts), so each is labelled "AI
// summary", and the official wording needs an official link.

import { citableSourceUrl, isOfficialSource, sourceHostLabel } from "@/lib/official-source";

/** Government news and press sites: official domains, but news, not the
 *  conducting body's notice. On 6 Oct 2026 only newsonair.gov.in (11 news
 *  rows) was linked; the other two are listed so they never qualify. */
export const GOVERNMENT_NEWS_HOSTS: readonly string[] = ["newsonair.gov.in", "ddnews.gov.in", "pib.gov.in"];

function isGovernmentNewsHost(url: string): boolean {
  const h = sourceHostLabel(url).toLowerCase();
  return GOVERNMENT_NEWS_HOSTS.some((g) => h === g || h.endsWith("." + g));
}

/** True when a shown link may carry the "from official notifications"
 *  wording: an official site (isOfficialSource, with the exam's own portal)
 *  that is not a government news site. */
export function isOfficialNoticeSource(url: string, examOfficialUrl?: string | null): boolean {
  return isOfficialSource(url, examOfficialUrl) && !isGovernmentNewsHost(url);
}

/** The line beside a shown link that is not an official notice source. It
 *  says only what Shishya's own lists say — never that the site is not the
 *  conducting body's. */
export const NOT_LISTED_LINE = "Shishya does not list this site as the conducting body's own site";

export type NewsSourceKind = "official" | "secondary" | "denylisted" | "none";

export interface NewsProvenance {
  /** The row is recorded as AI-written: label the body "AI summary". */
  aiSummary: boolean;
  /** The source link to render, or null. */
  link: string | null;
  /** "ssc.gov.in" — the link's bare host. */
  host: string | null;
  kind: NewsSourceKind;
  /** The provenance sentence after the "Source:" link (always present). */
  line: string;
}

export const NEWS_AI_LABEL = "AI summary";

/** True when the stored `source` is the generator's AI tag. */
export function isAiNewsSource(source: string | null | undefined): boolean {
  return !!source && /^ai-generated(:|$)/i.test(source);
}

export function newsProvenance(
  row: { source: string | null; url: string | null },
  examOfficialUrl?: string | null,
): NewsProvenance {
  const aiSummary = isAiNewsSource(row.source);
  const httpSource = row.source && /^https?:\/\//i.test(row.source) ? row.source : null;
  const link = citableSourceUrl(row.url) ?? citableSourceUrl(httpSource);
  const storedButUncited = !link && (/^https?:\/\//i.test(row.url ?? "") || !!httpSource);
  if (link) {
    const host = sourceHostLabel(link);
    if (isOfficialNoticeSource(link, examOfficialUrl)) {
      return {
        aiSummary,
        link,
        host,
        kind: "official",
        line: "Compiled by Shishya from official notifications — always verify dates on the official exam portal.",
      };
    }
    return {
      aiSummary,
      link,
      host,
      kind: "secondary",
      line: `${NOT_LISTED_LINE} — always verify dates on the official exam portal.`,
    };
  }
  return {
    aiSummary,
    link: null,
    host: null,
    kind: storedButUncited ? "denylisted" : "none",
    line: storedButUncited
      ? "The source stored for this item is a site Shishya does not cite, so no source link is shown — always verify dates on the official exam portal."
      : "No source link is stored for this item — always verify dates on the official exam portal.",
  };
}

export interface ResultProvenance {
  /** Every ExamResult row is AI-extracted: always true, kept explicit. */
  aiSummary: true;
  /** The stored officialUrl when it may be linked (not denylisted), or null. */
  link: string | null;
  kind: NewsSourceKind;
  /** The provenance sentence, without the portal name or the final stop. */
  line: string;
}

/** What a result permalink may say about its source (review r1, 6 Oct 2026):
 *  the news rule applied to ExamResult.officialUrl, a URL the extractor took
 *  from the news text. `examOfficialUrl` is the exam's ExamEligibility
 *  portal. */
export function resultProvenance(officialUrl: string | null, examOfficialUrl?: string | null): ResultProvenance {
  const link = citableSourceUrl(officialUrl);
  const tail = "always verify dates and lists on the official portal";
  if (link && isOfficialNoticeSource(link, examOfficialUrl)) {
    return { aiSummary: true, link, kind: "official", line: `Compiled by Shishya from official notifications — ${tail}` };
  }
  if (link) {
    return { aiSummary: true, link, kind: "secondary", line: `AI summary of Shishya's exam news; ${NOT_LISTED_LINE} — ${tail}` };
  }
  if (/^https?:\/\//i.test(officialUrl ?? "")) {
    return {
      aiSummary: true,
      link: null,
      kind: "denylisted",
      line: `AI summary of Shishya's exam news; the link stored for this result is on a site Shishya does not cite — ${tail}`,
    };
  }
  return {
    aiSummary: true,
    link: null,
    kind: "none",
    line: `AI summary of Shishya's exam news; no official source link is stored for this result — ${tail}`,
  };
}
