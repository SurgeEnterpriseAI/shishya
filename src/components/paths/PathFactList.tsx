// The "Rules to know before you choose" block (30 Sep 2026, P1 build 1 —
// agent B). Prints the model's facts — already cut to the printable ones
// (confirmed with an official source, or an estimate) — each confirmed rule
// with its source link and the day it was read, each estimate with the word
// "estimate". An unconfirmed fact never reaches this component (the page
// models drop it), and a confirmed fact without a source is skipped here as
// a second guard. Server component; nothing for an empty list.

import type { PathFact } from "@/data/paths";
import { pathCopy } from "@/lib/paths/copy";
import { pathViewCopy } from "./view-copy";
import { readOnText } from "./view-helpers";

export function PathFactList({
  facts,
  heading,
  locale,
  id = "rules",
}: {
  facts: readonly PathFact[];
  heading?: string;
  locale?: string | null;
  id?: string;
}) {
  const printable = facts.filter((f) => (f.status === "confirmed" && !!f.source) || f.status === "estimate");
  if (printable.length === 0) return null;
  const c = pathCopy(locale);
  const v = pathViewCopy(locale);
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-10">
      <h2 id={`${id}-heading`} className="text-xl font-semibold text-ink-900">
        {heading ?? c.blocks.facts}
      </h2>
      <ul className="mt-3 space-y-3">
        {printable.map((f, i) => (
          <li key={i} className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-800">
            <p>
              {f.text}
              {f.status === "estimate" ? ` (${c.sources.estimate})` : ""}
            </p>
            {f.status === "confirmed" && f.source && (
              <p className="mt-1 break-words text-xs text-ink-500">
                <a href={f.source.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline hover:text-saffron-800">
                  {v.source}: {f.source.publisher}
                </a>
                , {readOnText(f.source, locale)}
                {f.source.tier === "reported" ? ` (${c.sources.reported})` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
