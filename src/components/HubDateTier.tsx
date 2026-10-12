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
// 14 Oct 2026 (Release 2): a Reported badge carries what the word means as
// its title — "not yet checked against an official notice"
// (src/lib/date-tier-view.ts reportedGloss): an AI-made date is never
// "official" any more (src/lib/official-source.ts dateRowTier), and no person
// has matched a reported date to the body's notice. Most announced rows are
// reported now, so the visible sentence is one legend line under the list
// (reportedNote), not a repeat on every row.
//
// Server component: no state, no client JS.

import { dateTierView } from "@/lib/date-tier-view";
import type { SourceTier } from "@/lib/official-source";

export interface HubDateTierProps {
  /** The row's TimelineRow (tier + citation); nothing renders without one. */
  row: { tier: SourceTier; url?: string | null } | null | undefined;
  /** The badge words in the page's language: t("tracker.official") etc. */
  labels: Readonly<Record<SourceTier, string>>;
  /** The Reported badge's title, in the page's language:
   *  reportedGloss(locale). Optional; no title without it. */
  reportedNote?: string;
}

export function HubDateTier({ row, labels, reportedNote }: HubDateTierProps) {
  if (!row) return null;
  const v = dateTierView(row);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
      <span
        className={`rounded-full px-2 py-0.5 font-semibold ${v.badgeClass}`}
        title={v.tier === "reported" && reportedNote ? reportedNote : undefined}
      >
        {labels[v.tier]}
      </span>
      {v.sourceDisplay === "link" && v.sourceUrl && (
        <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-saffron-700 hover:text-saffron-800">
          {v.sourceHost} ↗
        </a>
      )}
      {v.sourceDisplay === "host" && <span>{v.sourceHost}</span>}
    </div>
  );
}
