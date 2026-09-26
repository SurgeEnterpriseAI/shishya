// The scholarship schemes Shishya lists — the catalogue minus outside
// aggregators (26 Sep 2026, repair).
//
// Why: src/data/scholarships.ts holds one entry that is not a scholarship:
// "buddy4study-aggregator" (awardingBody "Buddy4Study (aggregator)",
// tag "aggregator", applyUrl buddy4study.com). It was counted in every
// computed "208 scholarships" (the site description, /about, /context.md,
// llms-full.txt, the /scholarships title), listed as a card and a detail
// page with MonetaryGrant JSON-LD, and printed on /scholarships/context.md
// under the line "Each line links the awarding body's own site or portal,
// never an aggregator". An aggregator is a discovery portal, not a grant, so
// every count, list, sitemap row, related-scholarships block and MonetaryGrant
// now reads SCHOLARSHIP_SCHEMES; /scholarships keeps its one clearly labelled
// footnote link to the aggregator for wider discovery, and the old detail
// URL redirects to /scholarships (src/app/scholarships/[id]/page.tsx).
//
// The data file itself (its "Single largest aggregator" description, the
// third-party "800+" count in the entry, and its header comment "students
// never land on a third-party aggregator") is outside this wave's file set;
// the hand-off is in the repair report. The exam-hub sidebar
// (src/components/ScholarshipsForExamSection.tsx, via scholarshipsForExam)
// and the search index (src/lib/search/index-core.ts) still read the full
// catalogue — also handed off.
//
// Pure: no DB, no Next imports (tests/unit/scholarship-schemes.test.ts).

import { SCHOLARSHIPS, type Scholarship } from "@/data/scholarships";

/** True for a catalogue entry that is an outside aggregator, not a scheme. */
export function isAggregatorListing(s: Pick<Scholarship, "tags">): boolean {
  return s.tags.includes("aggregator");
}

/** Every scholarship scheme in the catalogue — never an aggregator. */
export const SCHOLARSHIP_SCHEMES: readonly Scholarship[] = SCHOLARSHIPS.filter((s) => !isAggregatorListing(s));
