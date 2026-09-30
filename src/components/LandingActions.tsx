// "Next on Shishya" (27 Sep 2026) — see src/lib/landing-actions.ts. Server
// component: the links are in the HTML (crawlers follow them).
//
// 30 Sep 2026 (sign-up build 3): the guest sign-up block that sat at the
// bottom of this box (src/components/SignupInline.tsx) moved out: each
// content page mounts it once, on its own, right after the page's first
// answer block (src/lib/content-signup.ts), so a page never shows it twice.
// The box, its links and its place on every page are unchanged.

import Link from "next/link";
import { landingHeading, type LandingAction } from "@/lib/landing-actions";

export function LandingActions({
  actions,
  locale,
  surface,
}: {
  actions: LandingAction[];
  locale: string;
  surface: string;
}) {
  if (actions.length === 0) return null;
  return (
    <nav aria-label={landingHeading(locale)} data-landing-actions={surface} className="mt-6 rounded-2xl border border-ink-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{landingHeading(locale)}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {actions.map((a) => (
          <li key={a.href}>
            <Link
              href={a.href}
              prefetch={false}
              className={
                a.primary
                  ? "block rounded-lg bg-saffron-500 px-3 py-2 text-sm font-semibold text-white hover:bg-saffron-600"
                  : "block rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 hover:border-saffron-400 hover:bg-saffron-50/50"
              }
            >
              {a.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
