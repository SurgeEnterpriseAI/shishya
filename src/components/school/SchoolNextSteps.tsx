// "Next steps" on Class 9-12 school pages (26 Sep 2026, every-education-
// search wave) — server-rendered links from a class or subject page to the
// exam side and the other sections: olympiads, stream choice and the
// Class 10 guide for Classes 9-10; JEE Main / NEET UG / CUET UG, the
// entrance-exam landing, colleges, scholarships and careers for Classes
// 11-12. The steps are src/lib/section-related.ts schoolNextSteps(); an
// exam step renders only while that exam has a live page. No account,
// tutor or sign-in link here — those live in SchoolStudentEntry.

import Link from "next/link";
import type { NextStep } from "@/lib/section-related";
import { examHubHref } from "@/lib/section-seo";

export function SchoolNextSteps({ steps, live }: { steps: readonly NextStep[]; live: ReadonlyMap<string, string> }) {
  const links = steps
    .map((s) => ({ label: s.label, href: s.exam ? examHubHref(s.exam, live) : (s.href ?? null) }))
    .filter((s): s is { label: string; href: string } => s.href !== null);
  if (links.length === 0) return null;
  return (
    <nav aria-label="Next steps" className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
      <h2 className="text-base font-semibold text-ink-900">Next steps</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-block rounded-md border border-ink-200 bg-saffron-50/20 px-3 py-1.5 text-xs text-ink-800 hover:border-saffron-400 hover:bg-saffron-50/60"
            >
              {l.label} →
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
