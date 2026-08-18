// GET /unsubscribe?u=<userId>&t=<token> — one-click email opt-out.
//
// The signed token proves the request came from a real Shishya email
// (no login needed — a logged-out user tapping the footer link must
// still be able to opt out). We flip emailOptOut and confirm. Idempotent.

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { verifyUnsubToken } from "@/lib/email-unsubscribe";

export const metadata: Metadata = {
  title: "Email preferences — Shishya",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function Unsubscribe({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string; resub?: string }>;
}) {
  const { u, t, resub } = await searchParams;
  const valid = typeof u === "string" && typeof t === "string" && verifyUnsubToken(u, t);

  let done = false;
  if (valid) {
    if (resub === "1") {
      await prisma.$executeRaw`UPDATE "User" SET "emailOptOut" = FALSE, "emailOptOutAt" = NULL WHERE id = ${u}`;
    } else {
      await prisma.$executeRaw`UPDATE "User" SET "emailOptOut" = TRUE, "emailOptOutAt" = NOW() WHERE id = ${u}`;
    }
    done = true;
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      {done && resub !== "1" && (
        <>
          <h1 className="text-xl font-bold text-ink-900">You&apos;re unsubscribed</h1>
          <p className="mt-3 text-sm text-ink-600">
            We won&apos;t email you study nudges, live-test invites or exam reminders anymore.
            Everything on Shishya — your mocks, notes, plans and reports — stays free and open, and
            you can come back any time.
          </p>
          <p className="mt-4 text-sm text-ink-500">
            Changed your mind?{" "}
            <Link href={`/unsubscribe?u=${u}&t=${t}&resub=1`} className="font-semibold text-saffron-700 underline">
              Turn emails back on
            </Link>
          </p>
        </>
      )}
      {done && resub === "1" && (
        <>
          <h1 className="text-xl font-bold text-ink-900">Emails turned back on</h1>
          <p className="mt-3 text-sm text-ink-600">You&apos;ll hear from your coach again. Welcome back.</p>
        </>
      )}
      {!valid && (
        <>
          <h1 className="text-xl font-bold text-ink-900">Link expired or invalid</h1>
          <p className="mt-3 text-sm text-ink-600">
            This unsubscribe link couldn&apos;t be verified. If you&apos;re signed in, you can manage
            email preferences in your settings.
          </p>
          <Link href="/me/settings" className="mt-4 inline-block rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-semibold text-white">
            Go to settings
          </Link>
        </>
      )}
      <p className="mt-8">
        <Link href="/" className="text-sm text-ink-400 underline">Back to Shishya</Link>
      </p>
    </main>
  );
}
