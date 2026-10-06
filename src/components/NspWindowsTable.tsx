// "2026-27 last dates on NSP, by state" (3 Oct 2026, non-exam value step 1):
// the section /scholarships/nsp-post-matric and /scholarships/nsp-pre-matric
// print under their lead line. Server component — every row is in the HTML
// crawlers and assistants read.
//
// One table for the page's level, grouped by state (A-Z) with an anchor per
// state (#state-west-bengal). Each row is NSP's own scheme string, verbatim;
// the state heading only groups (src/lib/nsp-windows.ts). Columns: scheme as
// NSP printed it · opens · last date · status. No row is hidden: a closed
// window says "Closed on {date}", and a last date that has passed since NSP
// was read says so and that NSP may have extended it (NSP often does).
// The header names NSP and the day it was read; the footer points states not
// listed to their own portals (catalogue rows the page passes in, only for
// states with no row on NSP's list for the level — nspPortalRowAllowed).
// Nothing account-related is offered on any row (no reminder, no sign-up);
// Class 1-10 rows (under9) are data like the others.

import Link from "next/link";
import { formatIsoDay, hostOf } from "@/lib/scholarship-lists";
import {
  NSP_WINDOWS,
  NSP_WINDOWS_YEAR,
  nspLevelSummary,
  nspWindowsByState,
  nspWindowStatus,
  type NspLevel,
  type NspLevelSummary,
  type NspStatus,
  type NspWindow,
} from "@/lib/nsp-windows";

const LEVEL_WORD: Record<NspLevel, string> = { post: "post-matric", pre: "pre-matric" };

function statusText(s: NspStatus): string {
  switch (s.kind) {
    case "open":
      return "Open";
    case "opens-later":
      return `Opens ${formatIsoDay(s.opensOn)}`;
    case "closed":
      return `Closed on ${formatIsoDay(s.closesOn)}`;
    case "passed":
      return `Last date ${formatIsoDay(s.closesOn)} has passed; NSP may have extended it`;
    case "no-date":
      return s.notYetOpened ? "Not yet opened on NSP" : "No last date on NSP";
    case "not-listed":
      return `No longer on NSP's list (checked ${formatIsoDay(s.since)})`;
  }
}

const STATUS_CLASS: Record<NspStatus["kind"], string> = {
  open: "font-semibold text-emerald-700",
  "opens-later": "font-medium text-ink-800",
  closed: "text-ink-500",
  passed: "text-amber-800",
  "no-date": "text-ink-600",
  "not-listed": "text-ink-500",
};

/** "47 open today, 2 closed or past their last date, 3 not yet opened on NSP":
 *  open and closed always, every other bucket only when it has rows, each
 *  named for what it is (a row opening later has a last date; a row no
 *  longer on NSP's list is not a row "with no last date"). */
function countsText(sum: NspLevelSummary): string {
  const parts = [`${sum.open} open today`, `${sum.closed} closed or past ${sum.closed === 1 ? "its" : "their"} last date`];
  if (sum.opensLater) parts.push(`${sum.opensLater} opening later`);
  if (sum.notYetOpened) parts.push(`${sum.notYetOpened} not yet opened on NSP`);
  if (sum.noDate) parts.push(`${sum.noDate} with no last date on NSP`);
  if (sum.notListed) parts.push(`${sum.notListed} no longer on NSP's list`);
  return parts.join(", ");
}

function opensCell(r: NspWindow): string {
  if (r.opensOn) return formatIsoDay(r.opensOn);
  return /NOT YET OPENED/i.test(r.printed ?? "") ? "Not yet opened" : "Not shown";
}

export interface NspPortalLink {
  id: string;
  name: string;
}

export function NspWindowsTable({ level, today, portals }: { level: NspLevel; today: string; portals: readonly NspPortalLink[] }) {
  const groups = nspWindowsByState(level);
  if (groups.length === 0) return null;
  const sum = nspLevelSummary(level, today);
  const checked = formatIsoDay(NSP_WINDOWS.checkedOn);
  const word = LEVEL_WORD[level];
  const anyMinority = groups.some((g) => g.rows.some((r) => /minorit/i.test(r.scheme)));
  return (
    <section id="nsp-last-dates" aria-labelledby="nsp-last-dates-title" className="mt-8">
      <h2 id="nsp-last-dates-title" className="text-lg font-semibold text-ink-900">
        {NSP_WINDOWS_YEAR} last dates on NSP, by state
      </h2>
      <p className="mt-1 max-w-3xl text-xs text-ink-600">
        Read on NSP (
        <a href={NSP_WINDOWS.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
          {hostOf(NSP_WINDOWS.sourceUrl)}
        </a>{" "}
        → Centrally Sponsored Schemes) on {checked}. NSP can extend dates; check the portal before the day.
      </p>
      <p className="mt-2 max-w-3xl text-sm text-ink-700">
        {sum.rows} {word} {sum.rows === 1 ? "row" : "rows"} for {sum.states} {sum.states === 1 ? "state or UT" : "states and UTs"}: {countsText(sum)}.
      </p>
      <nav aria-label="Jump to your state" className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {groups
          .filter((g) => g.anchor)
          .map((g) => (
            <a key={g.anchor} href={`#${g.anchor}`} className="rounded border border-ink-200 bg-white px-2 py-1 text-ink-700 hover:border-saffron-400">
              {g.name}
            </a>
          ))}
      </nav>
      <div className="mt-4 overflow-x-auto rounded-lg border border-ink-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">
            NSP {NSP_WINDOWS_YEAR} {word} windows by state, as read on NSP on {checked}
          </caption>
          <thead className="bg-ink-50 text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Scheme, as NSP printed it</th>
              <th scope="col" className="px-3 py-2 font-semibold">Opens</th>
              <th scope="col" className="px-3 py-2 font-semibold">Last date</th>
              <th scope="col" className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.anchor ?? "unplaced"} className="divide-y divide-ink-100 align-top">
              <tr id={g.anchor ?? undefined} className="scroll-mt-20 bg-saffron-50/50">
                <th scope="rowgroup" colSpan={4} className="px-3 py-2 text-sm font-semibold text-ink-900">
                  {g.name}
                </th>
              </tr>
              {g.rows.map((r) => {
                const st = nspWindowStatus(r, today);
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-xs text-ink-800">{r.scheme}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-700">{opensCell(r)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-ink-900">{r.closesOn ? formatIsoDay(r.closesOn) : "Not shown"}</td>
                    <td className={`px-3 py-2 text-xs ${STATUS_CLASS[st.kind]}`}>{statusText(st)}</td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-xs text-ink-600">
        States not listed run these schemes on their own portals
        {portals.length > 0 ? (
          <>
            , for example:{" "}
            {portals.map((p, i) => (
              <span key={p.id}>
                {i > 0 && (i === portals.length - 1 ? " and " : ", ")}
                <Link href={`/scholarships/${p.id}`} className="text-saffron-700 underline">
                  {p.name}
                </Link>
              </span>
            ))}
            .
          </>
        ) : (
          "."
        )}
        {!anyMinority && " NSP's list has no row for minority-community students."}
      </p>
    </section>
  );
}
