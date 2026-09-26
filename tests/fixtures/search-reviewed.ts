// The reviewed outcome of each real query (search-real-queries.json), in the
// form today's pages take (27 Sep 2026). Shared by
// tests/unit/search-resolver.test.ts and tests/unit/search-review-fixes.test.ts,
// which pin "no wrong DIRECT, ≥ 85% agree" against it.
//
// The rows were reviewed over the 26 Sep 2026 index. Since then:
//   • 26 Sep 2026 (G2): /exams/X/pyq 308s to the hub's #pyqs — the search
//     links the section itself, so a recorded /pyq is compared in that form;
//   • 27 Sep 2026 (wave 2 search): a recorded /exams/browse?category=X filter
//     (robots-blocked) is compared as the /exams/category/{slug} hub that
//     covers X (index-core.ts CATEGORY_HUB) when the index holds that hub;
//     and a bare mock-test ask the review left as a list (no page existed)
//     now has its page, /mock-tests, when the index holds it.

import fs from "node:fs";
import path from "node:path";
import { CATEGORY_HUB } from "@/lib/search/index-core";
import type { Outcome, SearchIndex } from "@/lib/search/types";

export interface ReviewedRow {
  q: string;
  src: string;
  outcome: Outcome;
  url?: string;
}

export function reviewedRows(): ReviewedRow[] {
  return (JSON.parse(fs.readFileSync(path.join(__dirname, "search-real-queries.json"), "utf8")) as { rows: ReviewedRow[] }).rows;
}

/** Rows whose reviewed outcome predates the page that now answers them. */
const SINCE_REVIEW: Readonly<Record<string, { outcome: Outcome; url: string }>> = {
  "mock test": { outcome: "direct", url: "/mock-tests" },
  "i want mock tests": { outcome: "direct", url: "/mock-tests" },
};

export function reviewedTarget(row: ReviewedRow, index: SearchIndex): { outcome: Outcome; url?: string } {
  const has = (p: string) => index.docs.some((d) => d.path === p);
  const later = SINCE_REVIEW[row.q];
  if (later && has(later.url)) return later;
  let url = row.url;
  if (url && url.startsWith("/exams/") && url.endsWith("/pyq") && url.split("/").length === 4) url = `${url.slice(0, -4)}#pyqs`;
  const cat = url ? /^\/exams\/browse\?category=([A-Z_]+)$/.exec(url)?.[1] : undefined;
  const hub = cat && CATEGORY_HUB[cat] ? `/exams/category/${CATEGORY_HUB[cat]}` : undefined;
  if (hub && has(hub)) url = hub;
  return { outcome: row.outcome, url };
}
