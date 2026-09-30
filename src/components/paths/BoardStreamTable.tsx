// "Subjects, board by board" on a stream page (30 Sep 2026, P1 build 1,
// spec §2.3 — agent B).
//
// Only CONFIRMED rows, each board's rows under its name with the document
// they were read in (publisher, title, link) and the day it was read; subject
// names exactly as the board prints them — names only, never textbook text.
// With no confirmed row the block says "Board-wise subject lists are being
// checked against each board's own documents." and lists nothing. A board
// whose lists could not be read appears ONLY as "Check {board}'s official
// site", linking its own site — never with subjects. Every row is in the
// server HTML; a board with more than BOARD_OPEN_MAX rows starts folded in
// <details> so a phone reader can find their own board. Server component.

import { pathCopy, fillCopy } from "@/lib/paths/copy";
import type { StreamPageModel } from "@/lib/paths/stream-pages";
import { pathViewCopy } from "./view-copy";
import { BOARD_OPEN_MAX, groupRowsByBoard, readOnText } from "./view-helpers";

export function BoardStreamTable({ table, locale, id = "boards" }: { table: StreamPageModel["boardTable"]; locale?: string | null; id?: string }) {
  if (!table.applies) return null;
  const c = pathCopy(locale).boards;
  const v = pathViewCopy(locale);
  const groups = groupRowsByBoard(table.rows);
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-10">
      <h2 id={`${id}-heading`} className="text-xl font-semibold text-ink-900">
        {c.heading}
      </h2>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-ink-700">{table.pendingMessage ?? c.pending}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-500">{v.boardsIntro}</p>
          <div className="mt-4 space-y-3">
            {groups.map((g) => (
              <details key={g.board} open={g.rows.length <= BOARD_OPEN_MAX} className="rounded-lg border border-ink-200 bg-white" data-board={g.board}>
                <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                  <span className="text-sm font-semibold text-ink-900">{g.boardName}</span>
                  <span className="text-[11px] text-ink-500">{fillCopy(v.boardRowCount, { n: g.rows.length })}</span>
                </summary>
                <div className="border-t border-ink-100 px-4 pb-4">
                  <table className="mt-2 block w-full border-collapse text-left text-xs text-ink-700 sm:table">
                    <thead className="hidden sm:table-header-group">
                      <tr className="text-[10px] uppercase tracking-wider text-ink-500">
                        {g.hasGroupCode && <th scope="col" className="py-2 pr-3 font-semibold">{c.groupCode}</th>}
                        <th scope="col" className="py-2 pr-3 font-semibold">{c.localName}</th>
                        <th scope="col" className="py-2 font-semibold">{c.subjects}</th>
                      </tr>
                    </thead>
                    <tbody className="block divide-y divide-ink-100 sm:table-row-group">
                      {g.rows.map((r, i) => (
                        <tr key={`${r.groupCode ?? ""}|${r.localName}|${i}`} className="block py-2 sm:table-row sm:py-0">
                          {g.hasGroupCode && (
                            <td className="block sm:table-cell sm:py-2 sm:pr-3 sm:align-top">
                              <span className="sm:hidden text-[10px] font-semibold uppercase tracking-wider text-ink-500">{c.groupCode}: </span>
                              {r.groupCode ?? "—"}
                            </td>
                          )}
                          <th scope="row" className="block font-medium text-ink-900 sm:table-cell sm:py-2 sm:pr-3 sm:align-top">
                            {r.localName}
                          </th>
                          <td className="block sm:table-cell sm:py-2 sm:align-top">
                            <span className="sm:hidden text-[10px] font-semibold uppercase tracking-wider text-ink-500">{c.subjects}: </span>
                            {r.subjects.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ul className="mt-2 space-y-1 text-[11px] text-ink-500">
                    {g.sources.map((s) => (
                      <li key={s.url} className="break-words">
                        {c.source}:{" "}
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline hover:text-saffron-800">
                          {s.publisher}, {s.title}
                        </a>{" "}
                        ({readOnText(s, locale)})
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </>
      )}
      {table.checks.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-ink-300 bg-white p-4">
          <p className="text-xs text-ink-600">{v.boardsCheckIntro}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {table.checks.map((b) => (
              <li key={b.board}>
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline hover:text-saffron-800">
                  {b.linkText}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
