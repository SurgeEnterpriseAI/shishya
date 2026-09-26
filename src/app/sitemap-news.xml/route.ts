// /sitemap-news.xml — the news permalinks, for Bing (26 Sep 2026, G1 index
// hygiene).
//
// Why: while the founder flag NEWS_GOOGLE_NOINDEX is on
// (src/lib/news-index-policy.ts), /exams/{code}/news/{id} carries a
// googlebot noindex and leaves /sitemap.xml — the sitemap Google reads.
// Bing (which feeds ChatGPT search and Copilot) still indexes the permalinks,
// so they are listed here: every real-exam row a human did not suppress,
// live and archived, lastmod = publishedAt (archiving is a status change,
// not an edit).
//
// Deliberately NOT named in robots.txt and NOT in the /sitemap.xml family:
// the main session submits this URL to Bing Webmaster Tools only. It is a
// plain <urlset> (not a Google News sitemap — Google is not its reader).
//
// Served whether or not the flag is on (with the flag off the same URLs are
// also in /sitemap.xml, which is harmless for Bing). A failed read serves an
// empty <urlset>, the /sitemap.xml rule: a smaller sitemap beats none, and a
// sitemap that omits a URL removes nothing from an index.
//
// 27 Sep 2026 (integration): canonical permalinks only. A duplicate-title
// copy's rel=canonical points at another row of its group (the permalink
// page's newsCanonicalMap rule, ~267 copies on 26 Sep 2026); listing the copy
// here would contradict its own tag, so selfCanonicalNewsRows drops it and
// keeps the row it points at. If the eligibility read fails, every row is
// listed — the page's own fallback (a failed canonical read keeps a
// permalink self-canonical), and a sitemap that lists a copy for a day
// removes nothing from an index.

import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { SUPPRESSED_SOURCE } from "@/lib/exam-timeline";
import { selfCanonicalNewsRows } from "@/lib/news-index-policy";
import { newsSitemapXml } from "@/lib/sitemap-sections";

export const revalidate = 86_400; // 24h, as /sitemap.xml

/** Sitemap protocol cap is 50,000 URLs per file; 6,075 rows on 26 Sep 2026. */
const NEWS_SITEMAP_CAP = 45_000;

export async function GET(): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in";
  const rows = await prisma.examNewsItem
    .findMany({
      where: { exam: REAL_EXAM_WHERE, OR: [{ source: null }, { source: { not: SUPPRESSED_SOURCE } }] },
      select: {
        id: true,
        examId: true,
        title: true,
        url: true,
        publishedAt: true,
        createdAt: true,
        archivedAt: true,
        exam: { select: { code: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: NEWS_SITEMAP_CAP,
    })
    .catch(() => []);
  const officialUrlByExam = await prisma.examEligibility
    .findMany({ where: { examId: { in: [...new Set(rows.map((r) => r.examId))] } }, select: { examId: true, officialUrl: true } })
    .then((es) => new Map(es.map((e) => [e.examId, e.officialUrl] as const)))
    .catch(() => null);
  const listed = officialUrlByExam ? selfCanonicalNewsRows(rows, officialUrlByExam) : rows;
  const xml = newsSitemapXml(
    listed.map((r) => ({ code: r.exam.code, id: r.id, publishedAt: r.publishedAt ?? r.createdAt })),
    base,
  );
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
