// /login — minimal sign-in page (bilingual).
//
// Attribution capture (Referer + UTM → `shishya_attrib` cookie) lives in
// `src/middleware.ts`, NOT here. Server Components can't write cookies
// in Next 15 — putting it here just silently dropped every capture.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { getT } from "@/lib/i18n-server";

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
            <li className="flex gap-2"><span aria-hidden className="text-saffron-500">✓</span> 163 entrance &amp; government-job exams covered</li>
          </ul>
        </div>

        <p className="mt-6 text-xs text-ink-500">{t("login.smallprint")}</p>
      </div>
    </main>
  );
}
