// Next-node links on the life-stage pages (30 Sep 2026, P1 build 1, spec
// §2.1 — agent B): stream → course family → college stream → career, or a
// hub's next pages. Every list is computed by the page model (no typed
// count); links are plain server HTML with prefetch off, so crawlers follow
// them and a phone does not prefetch a long career list. Empty groups are
// dropped; nothing renders when every group is empty.

import Link from "next/link";
import type { LinkItem } from "@/lib/paths/stream-pages";

export interface PathLinkGroup {
  /** Sub-heading; omitted for a block with a single, self-explaining list. */
  heading?: string;
  links: readonly LinkItem[];
  /** "cards" = a two-column list of boxes (few, important links); "chips" = a wrapped list (many). */
  variant?: "cards" | "chips";
}

export function PathNextLinks({ heading, groups, id = "next" }: { heading: string; groups: readonly PathLinkGroup[]; id?: string }) {
  const shown = groups.filter((g) => g.links.length > 0);
  if (shown.length === 0) return null;
  return (
    <nav id={id} aria-labelledby={`${id}-heading`} className="mt-10">
      <h2 id={`${id}-heading`} className="text-xl font-semibold text-ink-900">
        {heading}
      </h2>
      {shown.map((g) => (
        <div key={g.heading ?? "links"} className="mt-4">
          {g.heading && <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{g.heading}</h3>}
          {g.variant === "chips" ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {g.links.map((l) => (
                <li key={`${l.href}|${l.label}`}>
                  <Link
                    href={l.href}
                    prefetch={false}
                    className="inline-block rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs text-ink-800 hover:border-saffron-400 hover:bg-saffron-50/50"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {g.links.map((l) => (
                <li key={`${l.href}|${l.label}`}>
                  <Link
                    href={l.href}
                    prefetch={false}
                    className="block rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-800 hover:border-saffron-400 hover:bg-saffron-50/50"
                  >
                    {l.label} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
