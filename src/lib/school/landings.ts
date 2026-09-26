// School landing pages on the sitemap (26 Sep 2026, integrator).
//
// The DB-backed school tree (boards with a seeded class, classes, subjects,
// indexable chapters) is listed by src/lib/school/surface.ts
// schoolSitemapEntries. Three kinds of school page are not rows: the section
// hub (/schooling), the streams article (/schooling/streams) and the 18
// board pages without a seeded class tree (src/lib/schooling-data.ts
// BOARDS). On 26 Sep 2026 the pages made the hub and the article indexable
// and a board page indexable by isSchoolBoardIndexable (a seeded tree, or a
// syllabus / sample-paper page), but the sitemap still listed none of them
// — the section's entry page and five indexable pages were unsubmitted.
// This module lists them by the SAME rule the pages use, so the sitemap
// and the robots meta can never disagree (the founder's search-surface
// rule: a noindex URL in the sitemap is a Search Console error, an
// indexable page off it is a page nobody is told about).
//
// lastModified: the hub's is the newest class timestamp on the surface
// (its counts change when content lands) — a real timestamp, never
// new Date(); the article and the link-only boards carry none.
// sitemap.ts never names a /schooling URL by hand and never imports the
// hardcoded schooling-* data (tests/unit/schooling-honesty.test.ts); this
// module is the one place that joins the two.

import type { MetadataRoute } from "next";
import { BOARDS, isSchoolBoardIndexable } from "@/lib/schooling-data";
import { schoolBoardPath, type SchoolSurface } from "./surface";

export const SCHOOL_HUB_PATH = "/schooling";
export const SCHOOL_STREAMS_PATH = "/schooling/streams";

/** Seeded classes per board slug on the surface. */
export function liveClassesByBoard(surface: Pick<SchoolSurface, "classes">): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of surface.classes) out.set(c.boardSlug, (out.get(c.boardSlug) ?? 0) + 1);
  return out;
}

/** The hub, the streams article, and every board page that is indexable
 *  by the board page's own rule and NOT already listed from the DB tree
 *  (a board with a seeded class is listed by schoolSitemapEntries with its
 *  real lastmod). */
export function schoolLandingSitemapEntries(surface: Pick<SchoolSurface, "classes">, base: string): MetadataRoute.Sitemap {
  const live = liveClassesByBoard(surface);
  let newest: string | null = null;
  for (const c of surface.classes) {
    const m = c.lastModified ?? c.updatedAt;
    if (m && (!newest || m > newest)) newest = m;
  }
  const out: MetadataRoute.Sitemap = [
    { url: `${base}${SCHOOL_HUB_PATH}`, ...(newest ? { lastModified: new Date(newest) } : {}), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}${SCHOOL_STREAMS_PATH}`, changeFrequency: "monthly", priority: 0.7 },
  ];
  for (const b of BOARDS) {
    const n = live.get(b.slug) ?? 0;
    if (n > 0) continue;
    if (!isSchoolBoardIndexable(b, n)) continue;
    out.push({ url: `${base}${schoolBoardPath(b.slug)}`, changeFrequency: "monthly", priority: 0.6 });
  }
  return out;
}
