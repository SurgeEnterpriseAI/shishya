// The life-stage pages on the sitemap and the ping lists (30 Sep 2026, P1
// build 1, spec §2.6).
//
// Two families, two doors in:
//   • the stage hubs /after-10th and /after-12th — listed here, registered in
//     src/lib/sitemap-sections.ts EXTRA_SITEMAP_PROVIDERS;
//   • the nine /schooling/streams/{option} pages — every /schooling URL on
//     the sitemap comes through src/lib/school/landings.ts (spec F6,
//     tests/unit/schooling-honesty.test.ts), so they are listed THERE, by the
//     same gate the page reads (isStreamPageIndexable).
// Each list uses the page's own robots rule, so the sitemap and the robots
// meta can never disagree (a noindex URL in the sitemap Google reads is a
// Search Console error): a hub is listed while isStageHubIndexable holds, a
// stream page while isStreamPageIndexable holds.
//
// The hub gate counts options that open a page. An option's page is its
// stream page, its course family's first existing page or a fixed link —
// never an exam hub — so the verdict does not depend on which exams are
// live, and the empty live set used here gives the page's own answer
// (tests/unit/paths-sitemap.test.ts pins it).
//
// lastModified: none. The pages are computed from data files with no real
// per-page timestamp, and a sitemap never invents one (25 Aug 2026 rule).
//
// Pure: no DB, no clock.

import type { MetadataRoute } from "next";
import { streamPagePath } from "./index-helpers";
import { afterTenthModel, afterTwelfthModel, isStageHubIndexable, type StageHubId, type StageHubModel } from "./stage-pages";
import { indexableStreamSlugs } from "./stream-pages";

/** The two new stage hubs, in life order. */
export const STAGE_HUB_IDS: readonly StageHubId[] = ["after-10th", "after-12th"];

const NO_LIVE_EXAMS: ReadonlySet<string> = new Set<string>();

/** A hub's model for the machine surfaces. No live-exam read: the index gate
 *  and the option list do not depend on it, and the machine lines that use
 *  this model print no exam links. */
export function stageHubMachineModel(id: StageHubId): StageHubModel {
  return id === "after-10th" ? afterTenthModel(NO_LIVE_EXAMS) : afterTwelfthModel(NO_LIVE_EXAMS);
}

/** The hubs whose own robots let Google index them, in life order. */
export function indexableStageHubs(): StageHubModel[] {
  return STAGE_HUB_IDS.map(stageHubMachineModel).filter((m) => isStageHubIndexable(m));
}

/** Sitemap rows for the indexable hubs (the EXTRA_SITEMAP_PROVIDERS entry). */
export function stageHubSitemapEntries(base: string): MetadataRoute.Sitemap {
  return indexableStageHubs().map((m) => ({ url: `${base}${m.path}`, changeFrequency: "weekly" as const, priority: 0.8 }));
}

/** Sitemap rows for the indexable stream pages. Read ONLY by
 *  src/lib/school/landings.ts schoolLandingSitemapEntries (the one door for
 *  /schooling URLs). */
export function streamPageSitemapRows(base: string): MetadataRoute.Sitemap {
  return indexableStreamSlugs().map((slug) => ({ url: `${base}${streamPagePath(slug)}`, changeFrequency: "monthly" as const, priority: 0.6 }));
}

/** Every indexable life-stage page (hubs, then stream pages), site-relative —
 *  src/lib/indexnow.ts lifeStageUrls submits these with their context files. */
export function lifeStageIndexablePaths(): string[] {
  return [...indexableStageHubs().map((m) => m.path), ...indexableStreamSlugs().map(streamPagePath)];
}
