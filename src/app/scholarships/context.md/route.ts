// GET /scholarships/context.md — the scholarships section's machine brief
// (26 Sep 2026, B-machine-crawl): one line per entry of
// src/data/scholarships.ts — name, awarding body, levels, scope, the
// Shishya page and the official link (src/lib/section-context.ts). Static
// data, no DB. Headers as the exam context files, plus an HTTP canonical
// link to /scholarships.
// 26 Sep 2026 (G4): plus the list pages (/scholarships/for/{filter},
// /scholarships/closing-soon) with their computed counts and index state,
// and the 2026-27 last dates read on official portals (src/lib/scholarship-lists.ts).

import { istDay } from "@/lib/exam-week";
// 26 Sep 2026 (repair): the schemes, never the one outside aggregator
// (Buddy4Study) the raw catalogue holds — src/lib/scholarship-schemes.ts.
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import {
  SCHOLARSHIP_FILTERS,
  closingSoon,
  hostOf,
  isClosingSoonIndexable,
  isFilterListIndexable,
  lastDateOf,
  schemesForFilter,
} from "@/lib/scholarship-lists";
import { SITE, contextMarkdownHeaders, scholarshipsContextMarkdown, type ScholarshipListsContext } from "@/lib/section-context";

export const revalidate = 3600;

function listsContext(today: string): ScholarshipListsContext {
  const soon = closingSoon(today);
  const lists = [
    ...SCHOLARSHIP_FILTERS.map((f) => {
      const list = schemesForFilter(f, today);
      return { path: `/scholarships/for/${f.slug}`, label: `Scholarships for ${f.audience}`, count: list.length, indexable: isFilterListIndexable(list) };
    }),
    { path: "/scholarships/closing-soon", label: "Closing in the next 30 days", count: soon.length, indexable: isClosingSoonIndexable(soon) },
  ];
  const dated = SCHOLARSHIP_SCHEMES.flatMap((s) => {
    const d = lastDateOf(s, today);
    return d.kind === "upcoming"
      ? [{ id: s.id, name: s.name, closesOn: d.closesOn, tier: d.cycle.tier, host: hostOf(d.cycle.sourceUrl), checkedOn: d.cycle.checkedOn }]
      : [];
  }).sort((a, b) => (a.closesOn < b.closesOn ? -1 : a.closesOn > b.closesOn ? 1 : a.name.localeCompare(b.name)));
  return { lists, dated };
}

export async function GET() {
  const today = istDay(new Date());
  return new Response(scholarshipsContextMarkdown(SCHOLARSHIP_SCHEMES, today, SITE, listsContext(today)), {
    headers: contextMarkdownHeaders(`${SITE}/scholarships`),
  });
}
