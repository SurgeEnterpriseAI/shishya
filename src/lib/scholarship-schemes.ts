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
// 27 Sep 2026 (fixer): rows marked Scholarship.unlisted are left out too. The
// 27 Sep repair kept them out of the /scholarships/for/* and closing-soon
// lists only, while every other surface still presented them as schemes —
// twenty rows, seven of them "Not found … on any official page or in a web
// search" (e.g. rgvn-women-startups: an indexable page with an amount,
// eligibility and an Apply link, in the sitemap, the /scholarships browser,
// the match wizard, the search index, llms-full.txt, context.md and every
// published count). SCHOLARSHIP_SCHEMES is now what Shishya presents: no
// aggregator, no unlisted row. Their pages still answer
// (src/app/scholarships/[id]/page.tsx: noindex,follow, the reason on top, no
// Apply button, no MonetaryGrant or FAQ markup). The exam-hub sidebar, the
// tutor's scholarship tool, the state pages and the match wizard read
// OFFERED_SCHEMES — presented AND still taking applications (no closed row).
//
// Pure: no DB, no Next imports (tests/unit/scholarship-schemes.test.ts).

import { SCHOLARSHIPS, type Scholarship } from "@/data/scholarships";

/** True for a catalogue entry that is an outside aggregator, not a scheme. */
export function isAggregatorListing(s: Pick<Scholarship, "tags">): boolean {
  return s.tags.includes("aggregator");
}

/** A row Shishya presents as a scheme: not an outside aggregator and not
 *  held out of the catalogue (Scholarship.unlisted — not a scholarship, not
 *  found on any official page, or its status in doubt). */
export function isPresentedScheme(s: Pick<Scholarship, "tags" | "unlisted">): boolean {
  return !isAggregatorListing(s) && !s.unlisted;
}

/** A presented scheme a student can be pointed at today — not discontinued. */
export function isOfferedScheme(s: Pick<Scholarship, "tags" | "unlisted" | "closed">): boolean {
  return isPresentedScheme(s) && !s.closed;
}

/** What an unlisted row is, from its reason's opening words: "not-scholarship"
 *  (a bicycle, uniform, training, coaching or academy scheme — it exists),
 *  "not-found" (no such scheme found on an official page — nothing on its page
 *  can be vouched for), "in-doubt" (a real scheme whose current status could
 *  not be read). Null for a listed row. tests/unit/scholarship-schemes.test.ts
 *  pins that every reason in the data opens with one of these. */
export type UnlistedKind = "not-scholarship" | "not-found" | "in-doubt";
export function unlistedKind(s: Pick<Scholarship, "unlisted">): UnlistedKind | null {
  const r = s.unlisted?.trim();
  if (!r) return null;
  if (/^Not a scholarship/i.test(r)) return "not-scholarship";
  if (/^Status in doubt/i.test(r)) return "in-doubt";
  // "Not found …", "Not one verifiable scheme …" and anything unrecognised:
  // the strictest reading.
  return "not-found";
}

/** Every scholarship scheme Shishya presents — never an aggregator, never an
 *  unlisted row (27 Sep 2026 fixer). Closed schemes stay (their pages say so). */
export const SCHOLARSHIP_SCHEMES: readonly Scholarship[] = SCHOLARSHIPS.filter(isPresentedScheme);

/** The presented schemes still taking applications, in catalogue order. */
export const OFFERED_SCHEMES: readonly Scholarship[] = SCHOLARSHIP_SCHEMES.filter((s) => !s.closed);
