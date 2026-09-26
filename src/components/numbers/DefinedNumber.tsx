// One public number with its definition printed underneath (27 Sep 2026).
//
// Every number on /shishya-in-numbers and /press is shown with the sentence
// that says exactly what it counts, the period it covers and the day it was
// computed — the founder's rule for anything the market may quote. A number
// that could not be read shows "could not be computed right now", never 0.

import Link from "next/link";
import { istDayLabel } from "@/lib/iso-week";

export const NOT_COMPUTED = "could not be computed right now";

export function DefinedNumber({
  id,
  label,
  value,
  sub,
  definition,
  period,
  asOf,
  href,
}: {
  id?: string;
  label: string;
  /** The printed figure; null → NOT_COMPUTED. */
  value: string | null;
  /** A second line under the figure ("213 of 742 accounts"). */
  sub?: string | null;
  definition: string;
  period?: string | null;
  /** IST day "YYYY-MM-DD". */
  asOf?: string | null;
  /** Where the full definition lives (used on /press). */
  href?: string;
}) {
  return (
    <div id={id} className="scroll-mt-20 rounded-xl border border-ink-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      {value === null ? (
        <p className="mt-1 text-sm italic text-ink-500">{NOT_COMPUTED}</p>
      ) : (
        <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{value}</p>
      )}
      {value !== null && sub ? <p className="text-xs text-ink-600">{sub}</p> : null}
      <p className="mt-2 text-xs leading-relaxed text-ink-600">{definition}</p>
      {period || asOf || href ? (
        <p className="mt-1 text-[11px] text-ink-500">
          {period ? <span>{period}</span> : null}
          {period && asOf ? " · " : null}
          {asOf ? <span>computed {istDayLabel(asOf)}</span> : null}
          {href ? (
            <>
              {period || asOf ? " · " : null}
              <Link href={href} className="text-saffron-700 underline">
                definition
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
