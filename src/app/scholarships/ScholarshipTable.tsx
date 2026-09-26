// The table the scholarship list pages share (26 Sep 2026, G4):
// /scholarships/for/{filter} and /scholarships/closing-soon. Server-rendered,
// so every row's links are crawlable: the scheme's Shishya page and its
// official apply link. Every cell is the catalogue's own text
// (src/data/scholarships.ts) — the amount is its prose, never a parsed
// number; the last-date cell is src/lib/scholarship-lists.ts lastDateCell
// (a date only when read on the official portal, with its tier).

import Link from "next/link";
import type { Scholarship } from "@/data/scholarships";
import { hostOf, lastDateCell } from "@/lib/scholarship-lists";

export function ScholarshipTable({ rows, today }: { rows: readonly Scholarship[]; today: string }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-ink-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-ink-50 text-[11px] uppercase tracking-wider text-ink-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Scholarship</th>
            <th scope="col" className="px-3 py-2 font-semibold">Amount</th>
            <th scope="col" className="px-3 py-2 font-semibold">Family income limit</th>
            <th scope="col" className="px-3 py-2 font-semibold">2026-27 last date</th>
            <th scope="col" className="px-3 py-2 font-semibold">Apply on</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 align-top">
          {rows.map((s) => {
            const cell = lastDateCell(s, today);
            return (
              <tr key={s.id}>
                <td className="px-3 py-3">
                  <Link href={`/scholarships/${s.id}`} className="font-semibold text-ink-900 hover:text-saffron-800 hover:underline">
                    {s.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-500">{s.awardingBody}</p>
                </td>
                <td className="px-3 py-3 text-xs text-ink-700">{s.amount}</td>
                <td className="px-3 py-3 text-xs text-ink-700">
                  {/* "Up to": the catalogue holds the highest ceiling; a scheme family can set a lower one for some groups (its page says which). */}
                  {s.eligibility.incomeMaxLakhs !== undefined ? `Up to ₹${s.eligibility.incomeMaxLakhs} lakh a year` : "None listed"}
                </td>
                <td className="px-3 py-3 text-xs">
                  <span className={cell.tier === "official" ? "font-medium text-ink-900" : "text-ink-600"}>{cell.text}</span>
                </td>
                <td className="px-3 py-3 text-xs">
                  <a href={s.applyUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 hover:underline">
                    {hostOf(s.applyUrl)} ↗
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
