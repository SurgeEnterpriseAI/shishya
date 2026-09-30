// "Sources and last checked" (30 Sep 2026, P1 build 1, spec §2.1 — agent B).
//
// One line per official document the page prints a rule from: who published
// it, its title as printed (linked), and the day it was read. A source the
// registry marks "reported" (a secondary page naming the official one) says
// so. The list comes from the page model (model.sources), which holds only
// the sources of confirmed facts and rows — an unconfirmed fact has none.
// Server component; renders nothing for an empty list.

import type { PathSource } from "@/data/paths";
import { pathCopy } from "@/lib/paths/copy";
import { readOnText } from "./view-helpers";

export function PathSources({ sources, locale, id = "sources" }: { sources: readonly PathSource[]; locale?: string | null; id?: string }) {
  if (sources.length === 0) return null;
  const c = pathCopy(locale).sources;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-12 border-t border-ink-200 pt-6">
      <h2 id={`${id}-heading`} className="text-base font-semibold text-ink-900">
        {c.heading}
      </h2>
      <ul className="mt-3 space-y-2 text-xs text-ink-700">
        {sources.map((s) => (
          <li key={s.url} className="break-words" data-path-source={s.tier}>
            <span className="font-medium text-ink-800">{s.publisher}</span>:{" "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline hover:text-saffron-800">
              {s.title}
            </a>{" "}
            <span className="text-ink-500">
              ({readOnText(s, locale)}
              {s.tier === "reported" ? `, ${c.reported}` : ""})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
