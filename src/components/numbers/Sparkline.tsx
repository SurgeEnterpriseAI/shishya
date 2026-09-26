// Inline SVG sparkline for the public numbers pages (27 Sep 2026).
//
// Accessible by construction: role="img", an aria-label that lists every
// value, and a <title> with the same text. The table next to it is the
// source of truth; the line only shows the shape. Stroke is currentColor so
// the caller's text colour sets it. A null value (a week with no comparable
// number) breaks the line. Server component — no state, no client JS.

import { sparklinePath } from "@/lib/public-stats";

export function Sparkline({
  values,
  label,
  className = "block h-5 w-20 text-saffron-600",
}: {
  values: readonly (number | null)[];
  /** Plain-language description including every value, e.g.
   *  "Sign-ups by week, 20 Jul to 13 Sep: 97, 118, …". */
  label: string;
  className?: string;
}) {
  const g = sparklinePath(values);
  return (
    <svg viewBox={`0 0 ${g.width} ${g.height}`} role="img" aria-label={label} className={className} focusable="false">
      <title>{label}</title>
      {g.d ? <path d={g.d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" /> : null}
      {g.last ? <circle cx={g.last.x} cy={g.last.y} r={2.25} fill="currentColor" /> : null}
    </svg>
  );
}
