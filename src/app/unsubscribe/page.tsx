// GET /unsubscribe?u=<userId>&t=<token> — opt-out CONFIRMATION page.
//
// Review 22 Aug 2026: this page no longer changes state on GET (link
// scanners and stray clicks were silently unsubscribing students). It
// shows one confirm button which POSTs to /api/unsubscribe. After the
// POST it redirects back here with ?done=unsub|resub to show the result.

import type { Metadata } from "next";
import Link from "next/link";
import { verifyUnsubToken } from "@/lib/email-unsubscribe";

export const metadata: Metadata = {
  title: "Email preferences — Shishya",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function Unsubscribe({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string; done?: string }>;
}) {
  const { u, t, done } = await searchParams;
  const valid = typeof u === "string" && typeof t === "string" && verifyUnsubToken(u, t);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      {valid && done === "unsub" && (
        <>
          <h1 className="text-xl font-bold text-ink-900">You&apos;re unsubscribed</h1>
          <p className="mt-3 text-sm text-ink-600">
            We won&apos;t email you study nudges, live-test invites or exam reminders anymore.
            Everything on Shishya — your mocks, notes, plans and reports — stays free and open, and
            you can come back any time.
          </p>
          <form method="post" action="/api/unsubscribe" className="mt-4">
            <input type="hidden" name="u" value={u} />
            <input type="hidden" name="t" value={t} />
            <input type="hidden" name="resub" value="1" />
            <button className="text-sm font-semibold text-saffron-700 underline">Changed your mind? Turn emails back on</button>
          </form>
        </>
      )}
      {valid && done === "resub" && (
        <>
          <h1 className="text-xl font-bold text-ink-900">Emails turned back on</h1>
          <p className="mt-3 text-sm text-ink-600">You&apos;ll hear from your coach again. Welcome back.</p>
        </>
      )}
      {valid && !done && (
        <>
          <h1 className="text-xl font-bold text-ink-900">Unsubscribe from Shishya emails?</h1>
          <p className="mt-3 text-sm text-ink-600">
            This stops study nudges, live-test invites and exam reminders. Your account, mocks, plans
            and reports are untouched — and everything stays free.
          </p>
          <form method="post" action="/api/unsubscribe" className="mt-5">
            <input type="hidden" name="u" value={u} />
            <input type="hidden" name="t" value={t} />
            <button className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-800">
              Yes, unsubscribe me
            </button>
          </form>
          <p className="mt-3 text-xs text-ink-400">Nothing changes until you tap the button.</p>
        </>
      )}
      {!valid && (
        <>
          <h1 className="text-xl font-bold text-ink-900">Link expired or invalid</h1>
          <p className="mt-3 text-sm text-ink-600">
            This unsubscribe link couldn&apos;t be verified. Use the link from any Shishya email, or
            write to us and we&apos;ll do it by hand.
          </p>
          <a href="mailto:corp@surgesoftware.co.in?subject=Unsubscribe%20me%20from%20Shishya%20emails" className="mt-4 inline-block rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-semibold text-white">
            Email us to unsubscribe
          </a>
        </>
      )}
      <p className="mt-8">
        <Link href="/" className="text-sm text-ink-400 underline">Back to Shishya</Link>
      </p>
    </main>
  );
}
