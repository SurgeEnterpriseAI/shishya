// A small weekly sparkline for Shishya Pulse (27 Sep 2026). Server-rendered
// inline SVG, no client JS. The table beside it is the accessible source of
// truth; the SVG repeats every value in its <title> and aria-label. It draws
// nothing when a value was gated (under 20) — a line through a hidden value
// would print it by shape.

import { SPARK_H, SPARK_W, sparklinePath, sparklinePoints } from "@/lib/pulse-view";

export function PulseSparkline({ name, values, labels }: { name: string; values: readonly (number | null)[]; labels: readonly string[] }) {
  const points = sparklinePoints(values);
  if (!points) return null;
  const text = `${name}, week by week: ${values.map((v, i) => `${labels[i]} ${(v as number).toLocaleString("en-IN")}`).join("; ")}`;
  const last = points[points.length - 1];
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      width={SPARK_W}
      height={SPARK_H}
      role="img"
      aria-label={text}
      className="mt-1 block text-saffron-600"
    >
      <title>{text}</title>
      <path d={sparklinePath(points)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={2.2} fill="currentColor" />
    </svg>
  );
}
