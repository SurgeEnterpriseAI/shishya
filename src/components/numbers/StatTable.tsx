// A plain, accessible table for the public numbers pages (27 Sep 2026).
//
// Phone-first: at 360 px a wide table scrolls inside its own frame (the page
// itself never scrolls sideways) and the first column stays pinned. A column
// may carry a sparkline under its heading; the table cells stay the source
// of truth. Server component.

import type { ReactNode } from "react";
import { Sparkline } from "./Sparkline";

export interface StatColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Values for a sparkline under the heading (oldest first). */
  spark?: readonly (number | null)[];
  /** The sparkline's accessible description (must list the values). */
  sparkLabel?: string;
}

export interface StatRow {
  key: string;
  cells: Record<string, ReactNode>;
}

export function StatTable({
  caption,
  columns,
  rows,
  footnotes,
}: {
  caption: string;
  columns: readonly StatColumn[];
  rows: readonly StatRow[];
  footnotes?: readonly ReactNode[];
}) {
  return (
    <div className="mt-3">
      <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <caption className="px-3 pt-2 text-left text-xs text-ink-500">{caption}</caption>
          <thead>
            <tr className="border-b border-ink-200 align-bottom">
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-3 py-2 font-semibold text-ink-800 ${c.align === "right" ? "text-right" : "text-left"} ${i === 0 ? "sticky left-0 bg-white" : ""}`}
                >
                  <span className="whitespace-nowrap">{c.label}</span>
                  {c.spark && c.sparkLabel ? (
                    // 27 Sep 2026 (integrator): aria-hidden so the column header's
                    // accessible name stays its label; the values are in the cells.
                    <span aria-hidden="true" className={`mt-1 flex ${c.align === "right" ? "justify-end" : ""}`}>
                      <Sparkline values={c.spark} label={c.sparkLabel} />
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-ink-100 last:border-0">
                {columns.map((c, i) =>
                  i === 0 ? (
                    <th key={c.key} scope="row" className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 text-left font-medium text-ink-700">
                      {r.cells[c.key]}
                    </th>
                  ) : (
                    <td key={c.key} className={`whitespace-nowrap px-3 py-2 tabular-nums text-ink-700 ${c.align === "right" ? "text-right" : "text-left"}`}>
                      {r.cells[c.key]}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footnotes && footnotes.length ? (
        <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-ink-500">
          {footnotes.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
