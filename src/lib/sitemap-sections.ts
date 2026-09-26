// Sitemap XML builders (26 Sep 2026, G1 index hygiene).
//
// Next renders src/app/sitemap.ts itself; the extra sitemaps served from
// route handlers (/sitemap-news.xml for Bing) need the same protocol by hand.
// These builders are pure — no DB, no clock — so the tests pin the exact XML:
//   • every URL absolute, XML-escaped, at most once per file;
//   • <lastmod> only from a real Date (never invented, the 25 Aug 2026
//     sitemap honesty rule), as a W3C datetime;
//   • never more than SITEMAP_URL_CAP URLs in one file (the protocol cap).

import type { MetadataRoute } from "next";

export const SITEMAP_URL_CAP = 50_000;

export interface SitemapXmlEntry {
  url: string;
  lastModified?: Date | string | null;
}

/** &, <, >, ' and " escaped for XML text. */
export function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;");
}

function isoOrNull(d: Date | string | null | undefined): string | null {
  if (d == null) return null;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? null : x.toISOString();
}

/** A <urlset> of the entries: absolute http(s) URLs only, first occurrence
 *  kept, capped at SITEMAP_URL_CAP. */
export function urlsetXml(entries: readonly SitemapXmlEntry[]): string {
  const seen = new Set<string>();
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const e of entries) {
    if (seen.size >= SITEMAP_URL_CAP) break;
    if (!/^https?:\/\//.test(e.url) || seen.has(e.url)) continue;
    seen.add(e.url);
    const lastmod = isoOrNull(e.lastModified);
    lines.push(`<url><loc>${xmlEscape(e.url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`);
  }
  lines.push("</urlset>");
  return lines.join("\n");
}

export interface NewsSitemapRow {
  code: string;
  id: string;
  publishedAt: Date | string | null;
}

/** The /sitemap-news.xml body: one permalink per row, lastmod = publishedAt. */
export function newsSitemapXml(rows: readonly NewsSitemapRow[], base: string): string {
  return urlsetXml(
    rows.map((r) => ({
      url: `${base}/exams/${encodeURIComponent(r.code)}/news/${encodeURIComponent(r.id)}`,
      lastModified: r.publishedAt,
    })),
  );
}

// ── Extension point for other groups' families (26 Sep 2026) ────────────
// The main session wires page families built elsewhere into /sitemap.xml
// here after integration, without touching src/app/sitemap.ts: add the
// provider to EXTRA_SITEMAP_PROVIDERS. The contract for a provider:
//   • list only pages whose own robots allow Google to index them (this is
//     the sitemap Google reads) — the same rule the page's metadata reads;
//   • lastModified only from real row timestamps, never new Date();
//   • absolute URLs on `base`.
// A provider that throws contributes nothing (a smaller sitemap beats a 500),
// and dedupeSitemap drops any URL an earlier family already listed.

export type SitemapEntryProvider = (base: string) => MetadataRoute.Sitemap | Promise<MetadataRoute.Sitemap>;

// 27 Sep 2026 (integration): the new families of the discoverability wave,
// registered. Each module is imported lazily inside its provider, so this
// file stays free of DB imports (the pure builders above and their tests),
// and each provider already lists only pages whose own robots let Google
// index them:
//   • /scholarships/for/{filter} + /scholarships/closing-soon — only while
//     every listed row is reviewed and the floor holds (0 today);
//   • /schooling/cbse/class-{10,12}/board-exam — ≥ 10 verified official links;
//   • /exams/category/{slug} — ≥ 5 active real exams;
//   • /exams/after/{level} — ≥ 5 exams at that level;
//   • /mock-tests — lastmod = the newest shared mock (never invented);
//   • /subjects/{slug} — the hubs past the data floor (5 of 7 on 27 Sep).
export const EXTRA_SITEMAP_PROVIDERS: SitemapEntryProvider[] = [
  async (base) => (await import("@/lib/scholarship-lists")).scholarshipListSitemapEntries(base),
  async (base) => (await import("@/lib/board-exams")).boardExamSitemapEntries(base),
  async (base) => (await import("@/lib/exam-categories")).categoryHubSitemapEntries(base),
  async (base) => (await import("@/lib/exam-qualification")).qualificationSitemapEntries(base),
  async (base) => {
    const [{ mockTestsSitemapEntries }, { loadNewestSharedMockAt }] = await Promise.all([
      import("@/lib/mock-catalogue"),
      import("@/lib/db/mock-catalogue-db"),
    ]);
    return mockTestsSitemapEntries(base, await loadNewestSharedMockAt().catch(() => null));
  },
  async (base) => {
    const [{ subjectHubSitemapEntries }, { loadSubjectHubs }] = await Promise.all([
      import("@/lib/subject-hubs"),
      import("@/lib/db/subject-hubs-db"),
    ]);
    return subjectHubSitemapEntries(await loadSubjectHubs(), base);
  },
];

/** Every registered provider's entries, each provider guarded. */
export async function extraSitemapEntries(
  base: string,
  providers: readonly SitemapEntryProvider[] = EXTRA_SITEMAP_PROVIDERS,
): Promise<MetadataRoute.Sitemap> {
  const lists = await Promise.all(
    providers.map(async (p): Promise<MetadataRoute.Sitemap> => {
      try {
        return await p(base);
      } catch {
        return [];
      }
    }),
  );
  return lists.flat();
}

/** First occurrence of each URL wins; order kept. */
export function dedupeSitemap<E extends { url: string }>(entries: readonly E[]): E[] {
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
