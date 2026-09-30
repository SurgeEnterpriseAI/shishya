// "Your options, side by side" (30 Sep 2026, P1 build 1, spec §2.1 — agent B).
//
// Columns: option / what it is / how long / who it suits (or, for a course
// family, the options after Class 10 a sourced rule keeps it open from) / leads
// to / exams / full page. One semantic <table>: from lg up it is a table;
// below lg each row stacks into a card (390 px phones), with the column name
// printed above each cell for that layout only — so there is one copy of the
// content in the HTML, not a table plus a card list. A column no row fills is
// left out. No count is typed: the rows are the model's computed list.
//
// Durations print only as the model cut them (confirmed, or an estimate
// marked "estimate"); an exam chip links only a live exam. Server component.
// 30 Sep 2026 (review fix): a confirmed duration carries its source link and
// "read on" day in the cell itself, as the stream pages do (StreamOptionView),
// not only in the Sources list at the foot of the page.

import Link from "next/link";
import type { StageOptionRow } from "@/lib/paths/stage-pages";
import { pathCopy } from "@/lib/paths/copy";
import { ExamChipList } from "./ExamChipList";
import { pathViewCopy } from "./view-copy";
import { factCellText, readOnText, visibleAliases } from "./view-helpers";

const CELL = "block lg:table-cell lg:border-t lg:border-ink-200 lg:px-3 lg:py-3 lg:align-top";
const LABEL = "block text-[10px] font-semibold uppercase tracking-wider text-ink-500 lg:hidden";

export function StageOptionsTable({
  rows,
  note,
  locale,
  id = "options",
}: {
  rows: readonly StageOptionRow[];
  /** The line under the heading (what a row opens). */
  note?: string;
  locale?: string | null;
  id?: string;
}) {
  if (rows.length === 0) return null;
  const t = pathCopy(locale).table;
  const v = pathViewCopy(locale);
  const showDuration = rows.some((r) => factCellText(r.duration, locale) !== null);
  const showSuits = rows.some((r) => !!r.suits);
  const showFrom = rows.some((r) => r.from.length > 0);
  const showLeads = rows.some((r) => r.leadsTo.length > 0);
  const showExams = rows.some((r) => r.exams.length > 0);

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-8">
      <h2 id={`${id}-heading`} className="text-xl font-semibold text-ink-900">
        {t.heading}
      </h2>
      {note && <p className="mt-1 text-xs text-ink-500">{note}</p>}
      <table className="mt-4 block w-full border-collapse text-left text-xs text-ink-700 lg:table">
        <thead className="hidden lg:table-header-group">
          <tr className="bg-ink-50 text-[11px] uppercase tracking-wider text-ink-500">
            <th scope="col" className="px-3 py-2 font-semibold">{t.option}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t.whatItIs}</th>
            {showDuration && <th scope="col" className="px-3 py-2 font-semibold">{t.duration}</th>}
            {showSuits && <th scope="col" className="px-3 py-2 font-semibold">{t.suits}</th>}
            {showFrom && <th scope="col" className="px-3 py-2 font-semibold">{t.from}</th>}
            {showLeads && <th scope="col" className="px-3 py-2 font-semibold">{t.leadsTo}</th>}
            {showExams && <th scope="col" className="px-3 py-2 font-semibold">{t.exams}</th>}
            <th scope="col" className="px-3 py-2 font-semibold">
              <span className="sr-only">{t.link}</span>
            </th>
          </tr>
        </thead>
        <tbody className="block space-y-3 lg:table-row-group lg:space-y-0">
          {rows.map((r) => {
            const duration = factCellText(r.duration, locale);
            const durationSource = r.duration?.status === "confirmed" ? r.duration.source : null;
            const aliases = visibleAliases(r.aliases, r.shortName);
            return (
              <tr
                key={r.id}
                id={`option-${r.id}`}
                data-option={r.id}
                className="block rounded-lg border border-ink-200 bg-white p-4 lg:table-row lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
              >
                <th scope="row" className={`${CELL} font-normal`}>
                  {r.href ? (
                    <Link href={r.href} prefetch={false} className="text-sm font-semibold text-ink-900 underline decoration-saffron-300 underline-offset-2 hover:text-saffron-700">
                      {r.shortName}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-ink-900">{r.shortName}</span>
                  )}
                  {aliases.length > 0 && <span className="mt-0.5 block text-[11px] text-ink-500">{aliases.join(" · ")}</span>}
                </th>
                <td className={`${CELL} mt-2 lg:mt-0`}>
                  <span className={LABEL}>{t.whatItIs}</span>
                  {r.whatItIs ?? ""}
                </td>
                {showDuration && (
                  <td className={`${CELL} mt-2 lg:mt-0`}>
                    {duration && (
                      <>
                        <span className={LABEL}>{t.duration}</span>
                        {duration}
                        {durationSource && (
                          <span className="mt-1 block break-words text-[11px] text-ink-500">
                            <a href={durationSource.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-700">
                              {v.source}: {durationSource.publisher}
                            </a>
                            , {readOnText(durationSource, locale)}
                          </span>
                        )}
                      </>
                    )}
                  </td>
                )}
                {showSuits && (
                  <td className={`${CELL} mt-2 lg:mt-0`}>
                    {r.suits && (
                      <>
                        <span className={LABEL}>{t.suits}</span>
                        {r.suits}
                      </>
                    )}
                  </td>
                )}
                {showFrom && (
                  <td className={`${CELL} mt-2 lg:mt-0`}>
                    {r.from.length > 0 && (
                      <>
                        <span className={LABEL}>{t.from}</span>
                        <ul className="flex flex-wrap gap-x-2 gap-y-1">
                          {r.from.map((l) => (
                            <li key={`${l.href}|${l.label}`}>
                              <Link href={l.href} prefetch={false} className="text-saffron-700 underline hover:text-saffron-800">
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </td>
                )}
                {showLeads && (
                  <td className={`${CELL} mt-2 lg:mt-0`}>
                    {r.leadsTo.length > 0 && (
                      <>
                        <span className={LABEL}>{t.leadsTo}</span>
                        <ul className="flex flex-wrap gap-x-2 gap-y-1">
                          {r.leadsTo.map((l) => (
                            <li key={`${l.href}|${l.label}`}>
                              <Link href={l.href} prefetch={false} className="text-saffron-700 underline hover:text-saffron-800">
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </td>
                )}
                {showExams && (
                  <td className={`${CELL} mt-2 lg:mt-0`}>
                    {r.exams.length > 0 && (
                      <>
                        <span className={LABEL}>{t.exams}</span>
                        <ExamChipList chips={r.exams} locale={locale} compact />
                      </>
                    )}
                  </td>
                )}
                <td className={`${CELL} mt-3 lg:mt-0 lg:whitespace-nowrap`}>
                  {r.href && (
                    <Link href={r.href} prefetch={false} className="font-semibold text-saffron-700 hover:text-saffron-800">
                      {t.link} <span aria-hidden="true">→</span>
                      <span className="sr-only">: {r.shortName}</span>
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
