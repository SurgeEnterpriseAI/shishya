// /login — minimal sign-in page (bilingual).
//
// Attribution capture (Referer + UTM → `shishya_attrib` cookie) lives in
// `src/middleware.ts`, NOT here. Server Components can't write cookies
// in Next 15 — putting it here just silently dropped every capture.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { getT } from "@/lib/i18n-server";

// Belt-and-braces alongside the robots.txt disallow: a Disallow-ed URL
// can still be indexed (link-only, no description) and would then be a
// terrible SERP entry point. noindex/follow keeps it out for good while
// letting crawlers walk the escape-hatch links below.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const sp = await searchParams;
  const cb = sp.callbackUrl ?? "/dashboard";
  const { t } = await getT();

  return (
    <main className="min-h-screen bg-saffron-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-ink-200 bg-white p-8 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-lg font-bold text-white">
            शि
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-ink-900">{t("login.h1")}</h1>
        <p className="mt-2 text-sm text-ink-600">{t("login.body")}</p>
        <GoogleSignInButton callbackUrl={cb} label={t("login.continue")} />

        {/* Value prop for cold visitors who land straight on /login (it's a
            top entry page in the funnel data, and a bare sign-in wall was
            bouncing them). Spell out what signing in unlocks — all free —
            so the entry converts instead of bouncing. (Gemini growth
            suggestion: optimize the /login entry experience.) */}
        <div className="mt-6 rounded-lg bg-saffron-50 p-4 text-left ring-1 ring-saffron-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            Free · No credit card · 22 Indian languages
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
            <li className="flex gap-2"><span aria-hidden className="text-saffron-500">✓</span> Adaptive mocks that target your weak topics</li>
            <li className="flex gap-2"><span aria-hidden className="text-saffron-500">✓</span> Ask Shishya — your AI tutor for every exam</li>
            <li className="flex gap-2"><span aria-hidden className="text-saffron-500">✓</span> Real previous-year papers, by year &amp; topic</li>
            <li className="flex gap-2"><span aria-hidden className="text-saffron-500">✓</span> Every major entrance &amp; government-job exam covered</li>
          </ul>
        </div>

        {/* Escape hatch. Funnel data (13 Aug 2026): /login was the single
            biggest one-page exit for first-time visitors — 53 of 148
            bounces in 7 days. A cold arrival previously had exactly two
            moves: sign in, or leave. These give them the platform itself
            without an account, so a stranger can find out what Shishya
            is before being asked to trust it. */}
        <div className="mt-6 border-t border-ink-100 pt-4">
          <p className="text-sm font-medium text-ink-800">First time here? Look around first — no account needed.</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/" className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50">
              Browse every exam &amp; free mock tests →
            </Link>
            <Link href="/ask" className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50">
              Ask Shishya a question — free, no sign-in →
            </Link>
            <Link href="/find-your-exam" className="rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50">
              Not sure which exam suits you? Find out →
            </Link>
          </div>
        </div>

        <p className="mt-6 text-xs text-ink-500">{t("login.smallprint")}</p>
      </div>
    </main>
  );
}
