// GET /scholarships/context.md — the scholarships section's machine brief
// (26 Sep 2026, B-machine-crawl): one line per entry of
// src/data/scholarships.ts — name, awarding body, levels, scope, the
// Shishya page and the official link (src/lib/section-context.ts). Static
// data, no DB. Headers as the exam context files, plus an HTTP canonical
// link to /scholarships.
// 26 Sep 2026 (G4): plus the list pages (/scholarships/for/{filter},
// /scholarships/closing-soon) with their computed counts and index state,
// and the 2026-27 last dates read on official portals (src/lib/scholarship-lists.ts).
// 6 Oct 2026 (scholarships release): plus what every other scheme's page
// shows for 2026-27 (open now, rolling, closed, no date yet, discontinued,
// NSP's per-state dates or the usual window), counted here with lastDateOf.

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
import { nspLevelForScholarship } from "@/lib/nsp-windows";
import { SITE, contextMarkdownHeaders, scholarshipsContextMarkdown, type ScholarshipListsContext, type ScholarshipOthers } from "@/lib/section-context";

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
      ? [{ id: s.id, name: s.name, closesOn: d.closesOn, tier: d.cycle.tier, host: hostOf(d.cycle.sourceUrl), checkedOn: d.cycle.checkedOn, note: d.cycle.note ?? null }]
      : [];
  }).sort((a, b) => (a.closesOn < b.closesOn ? -1 : a.closesOn > b.closesOn ? 1 : a.name.localeCompare(b.name)));
  // 6 Oct 2026: every scheme outside the dated block, by what its page shows.
  const datedIds = new Set(dated.map((d) => d.id));
  const others: ScholarshipOthers = { nspByState: 0, openNow: 0, openWhenChecked: 0, rolling: 0, closed: 0, noDate: 0, discontinued: 0, usualOnly: 0 };
  for (const s of SCHOLARSHIP_SCHEMES) {
    if (datedIds.has(s.id)) continue;
    // The two NSP pages lead with NSP's per-state dates (cycleLeadLine -> nspLeadLine).
    if (!s.closed && nspLevelForScholarship(s.id)) {
      others.nspByState++;
      continue;
    }
    const d = lastDateOf(s, today);
    if (d.kind === "open-now") {
      if (d.fresh) others.openNow++;
      else others.openWhenChecked++;
    } else if (d.kind === "rolling") others.rolling++;
    else if (d.kind === "passed") others.closed++;
    else if (d.kind === "no-date") others.noDate++;
    else if (d.kind === "discontinued") others.discontinued++;
    else if (d.kind === "usual") others.usualOnly++;
  }
  return { lists, dated, others };
}

export async function GET() {
  const today = istDay(new Date());
  return new Response(scholarshipsContextMarkdown(SCHOLARSHIP_SCHEMES, today, SITE, listsContext(today)), {
    headers: contextMarkdownHeaders(`${SITE}/scholarships`),
  });
}
