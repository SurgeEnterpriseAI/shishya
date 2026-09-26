// "Also on Shishya" — the other independent sections, server-rendered
// (26 Sep 2026, group D). The School, Colleges, Scholarships and Careers
// pages linked the exam side through /exams (a 308 to the home page) or
// not at all; this block links every other section by the shared list in
// src/lib/site-description.ts (the home page's doors), so the wording and
// the URLs match the machine files. Number-free by design.

import Link from "next/link";
import { SECTION_LINKS } from "@/lib/site-description";

export function SectionCrossLinks({
  current,
  extra = [],
  heading = "Also on Shishya",
}: {
  /** The section this page belongs to (its href), left out of the list. */
  current: string;
  /** Page-specific links shown first. */
  extra?: ReadonlyArray<{ label: string; href: string; blurb?: string }>;
  heading?: string;
}) {
  const links = [...extra, ...SECTION_LINKS.filter((s) => s.href !== current)];
  return (
    <nav aria-label={heading} className="mt-12 rounded-lg border border-ink-200 bg-white p-5">
      <h2 className="text-base font-semibold text-ink-900">{heading}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block h-full rounded-md border border-ink-100 bg-saffron-50/20 p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/60"
            >
              <span className="block text-sm font-semibold text-ink-900">{s.label} →</span>
              {s.blurb && <span className="mt-1 block text-xs text-ink-600">{s.blurb}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
