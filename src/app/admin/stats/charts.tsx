"use client";

// Charts for /admin/stats (13 Oct 2026). Plain SVG, no chart library:
// stacked daily columns with a per-day hover tooltip, and a page that
// refreshes its server data every minute. Colours are roles from
// .viz-root (page.tsx) so light and dark mode swap in one place.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface Series {
  key: string;
  label: string;
  /** A CSS colour, normally var(--series-1) / var(--series-2). */
  color: string;
}

type Row = { day: string } & Record<string, number | string>;

/** Number formats by name: a server page cannot hand a function to this client component. */
export type FormatName = "usd" | "compact" | "int";
const FORMATS: Record<FormatName, (v: number) => string> = {
  usd: (v) => (v >= 100 ? `$${Math.round(v).toLocaleString("en-IN")}` : `$${v.toFixed(2)}`),
  compact: (v) =>
    v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : `${Math.round(v)}`,
  int: (v) => Math.round(v).toLocaleString("en-IN"),
};

const W = 720;
const H = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 48 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

const dayLabel = (d: string) => {
  const dt = new Date(`${d}T00:00:00Z`);
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
};

/** Stacked columns, one per IST day, with a hover tooltip listing every series. */
export function StackedColumns({
  data,
  series,
  format: formatName,
  height = H,
  ariaLabel,
}: {
  data: Row[];
  series: Series[];
  format: FormatName;
  height?: number;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const format = FORMATS[formatName];
  const totals = data.map((r) => series.reduce((s, x) => s + Number(r[x.key] ?? 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(28, slot - 4));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((r, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          let acc = 0;
          const segs = series
            .map((s) => {
              const v = Number(r[s.key] ?? 0);
              const y0 = y(acc);
              acc += v;
              return { s, v, top: y(acc), bottom: y0 };
            })
            .filter((g) => g.v > 0);
          return (
            <g key={r.day} opacity={hover === null || hover === i ? 1 : 0.45}>
              {segs.map((g, j) => {
                const isTop = j === segs.length - 1;
                const h = Math.max(0, g.bottom - g.top - (j > 0 ? 2 : 0)); // 2px surface gap between stacked fills
                return (
                  <path
                    key={g.s.key}
                    d={roundedTop(x, g.top, barW, h, isTop ? Math.min(4, barW / 2, h) : 0)}
                    fill={g.s.color}
                  />
                );
              })}
              {(i % labelEvery === 0 && data.length - 1 - i >= labelEvery / 2) || i === data.length - 1 ? (
                <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                  {dayLabel(r.day)}
                </text>
              ) : null}
              {/* hit target: the whole day slot, taller than the mark */}
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${dayLabel(r.day)}: ${series.map((s) => `${s.label} ${format(Number(r[s.key] ?? 0))}`).join(", ")}`} />
            </g>
          );
        })}
      </svg>
      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-0 z-10 min-w-[180px] rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${Math.min(78, Math.max(2, ((PAD.left + hover * slot) / W) * 100))}%`,
            background: "var(--surface-2)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="mb-1 font-semibold">{dayLabel(data[hover].day)}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{format(Number(data[hover][s.key] ?? 0))}</span>
            </div>
          ))}
          {series.length > 1 ? (
            <div className="mt-1 flex justify-between border-t pt-1" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Total</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{format(totals[hover])}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {series.length > 1 ? (
        <div className="mt-2 flex flex-wrap gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A column path with a rounded top (data end) and a square base. */
function roundedTop(x: number, top: number, w: number, h: number, r: number): string {
  if (h <= 0) return "";
  const b = top + h;
  if (r <= 0) return `M${x},${b}V${top}H${x + w}V${b}Z`;
  return `M${x},${b}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${b}Z`;
}

/** Re-reads the server data every `seconds` while the tab is visible. */
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  // Set after mount only: a time rendered on the server and again in the
  // browser a moment later would not match (a hydration error).
  const [stamp, setStamp] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    setStamp(new Date());
    timer.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setStamp(new Date());
      }
    }, seconds * 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [router, seconds]);
  return (
    <span style={{ color: "var(--text-muted)" }}>
      {stamp ? `Updated ${stamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST · ` : ""}refreshes every minute
    </span>
  );
}
