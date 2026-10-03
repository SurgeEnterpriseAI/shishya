// The tier line under a date in the exam hub's Important Dates list (3 Oct
// 2026, signup-100 lever 4). The list printed label, date, "N days away"
// and notes with no tier word and no source, so an aggregator's date or an
// unlabelled estimate read as fact. This line adds the badge (Official /
// Reported / Expected) and, for an official row, the body's notice as a
// link; for a reported row, the host that reported it as text
// (src/lib/date-tier-view.ts).
//
// Markup rule: a <div> of <span>s and one <a> — never a <p>. The hub's
// truth-lint parser (src/lib/truth-lint.ts parseHubDates) counts the <p>
// tags of each <li> to tell "no notes" from "notes it could not read".
//
// Server component: no state, no client JS.

import { dateTierView } from "@/lib/date-tier-view";
import type { SourceTier } from "@/lib/official-source";

export interface HubDateTierProps {
  /** The row's TimelineRow (tier + citation); nothing renders without one. */
  row: { tier: SourceTier; url?: string | null } | null | undefined;
  /** The badge words in the page's language: t("tracker.official") etc. */
  labels: Readonly<Record<SourceTier, string>>;
}

export function HubDateTier({ row, labels }: HubDateTierProps) {
  if (!row) return null;
  const v = dateTierView(row);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
      <span className={`rounded-full px-2 py-0.5 font-semibold ${v.badgeClass}`}>{labels[v.tier]}</span>
      {v.sourceDisplay === "link" && v.sourceUrl && (
        <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-saffron-700 hover:text-saffron-800">
          {v.sourceHost} ↗
        </a>
      )}
      {v.sourceDisplay === "host" && <span>{v.sourceHost}</span>}
    </div>
  );
}
