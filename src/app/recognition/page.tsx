// /recognition — annual recognition framework.
//
// Spec Phase 1.5: scaffold-only. Activates Nov 2026. Until then this
// page explains how the leaderboard will work + sets expectations.
//
// During the activation window (Nov 1 – Dec 31 of FIRST_YEAR+), it
// surfaces the live top-10 leaderboard.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { UserBadge, type UserBadgeLevel } from "@/components/UserBadge";
import {
  computeAnnualLeaderboard,
  recognitionStatus,
  RECOGNITION_ACTIVATION,
} from "@/lib/db/recognition";

export const metadata: Metadata = {
  title: "Annual Recognition — Top contributors of the year | Shishya",
  description:
    "Each year, Shishya celebrates the top community contributors — Trusted Verifiers, Domain Experts, and the most-active verifiers across every section. No money, just recognition.",
  alternates: { canonical: "https://shishya.in/recognition" },
};

export const revalidate = 3600; // hourly during active window; pre-window this page is largely static

export default async function RecognitionPage() {
  const status = recognitionStatus();

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Recognition
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">Annual Recognition</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          Each year Shishya celebrates the verifiers, flaggers, and Domain
          Experts who kept the platform honest. Recognition is the only
          currency on Shishya — there is no money in this system, ever.
        </p>

        {status.kind === "ACTIVE" ? (
          <ActiveLeaderboard year={status.year} windowEnd={status.windowEnd} />
        ) : (
          <DormantScaffold nextYear={status.nextActivationYear} />
        )}

        <h2 className="mt-12 text-base font-semibold text-ink-900">How the leaderboard is computed</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          <li className="rounded-lg border border-ink-200 bg-white p-4 text-xs text-ink-700">
            <p className="font-semibold text-ink-900">Score formula</p>
            <p className="mt-2">
              Confirmed verification = <strong>1 point</strong>. Validated
              flag (you spotted something wrong, and it actually was) ={" "}
              <strong>2 points</strong>. Accepted update suggestion ={" "}
              <strong>3 points</strong>. Points roll over from the calendar
              year only — January 1 resets the leaderboard.
            </p>
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4 text-xs text-ink-700">
            <p className="font-semibold text-ink-900">Tie-breakers</p>
            <p className="mt-2">
              Same score? The user with the earliest activity in the year
              ranks higher. Old hands beat late-year sprinters, all else
              equal.
            </p>
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4 text-xs text-ink-700">
            <p className="font-semibold text-ink-900">Exclusions</p>
            <p className="mt-2">
              Verifications that were later <em>DISMISSED</em> in audit
              don't count. Pending or rejected flags don't count. We
              recognise quality + impact, not raw volume.
            </p>
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4 text-xs text-ink-700">
            <p className="font-semibold text-ink-900">Privacy</p>
            <p className="mt-2">
              Only users with a <strong>public profile</strong> have their
              name/handle shown on the leaderboard. Private-profile users
              still rank internally but display as "Anonymous Contributor".
            </p>
          </li>
        </ul>

        <div className="mt-8 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            Domain awards (planned for {RECOGNITION_ACTIVATION.FIRST_YEAR})
          </h3>
          <p className="mt-2">
            Alongside the overall top-10, we'll spotlight the top
            contributor in each domain — UPSC, JEE, NEET, CLAT, IIT
            alumni, NLU alumni, civil services. The recognition page in
            November {RECOGNITION_ACTIVATION.FIRST_YEAR} will surface
            these categories as the window opens.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">Why annual + time-boxed?</p>
          <p className="mt-2">
            A perpetual leaderboard rewards grinding and discourages
            new contributors who could never catch up. An annual
            November–December window keeps the recognition feeling like
            an event — celebratory rather than competitive — and gives
            everyone a fresh start each January.
          </p>
        </div>
      </section>
    </main>
  );
}

async function ActiveLeaderboard({ year, windowEnd }: { year: number; windowEnd: Date }) {
  const rows = await computeAnnualLeaderboard(year);
  return (
    <div className="mt-8 rounded-lg border border-saffron-300 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-ink-900">
          Top contributors — {year}
        </h2>
        <span className="text-[11px] text-ink-500">
          Live · window closes {windowEnd.toISOString().slice(0, 10)}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-600">
          No qualifying activity in {year} yet. Be the first.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {rows.map((r, i) => {
            const isPublic = !!r.handle;
            const displayName = isPublic ? (r.name ?? r.handle) : "Anonymous Contributor";
            return (
              <li
                key={r.userId}
                className="flex items-baseline justify-between gap-3 rounded-md border border-ink-100 bg-saffron-50/20 px-4 py-2 text-sm"
              >
                <span className="flex items-baseline gap-3">
                  <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-saffron-500 text-xs font-bold text-white tabular-nums">
                    {i + 1}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-2">
                    {isPublic ? (
                      <Link href={`/u/${r.handle}`} className="font-medium text-ink-900 hover:text-saffron-800">
                        {displayName}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink-700">{displayName}</span>
                    )}
                    <UserBadge level={r.badgeLevel as UserBadgeLevel} />
                  </span>
                </span>
                <span className="text-xs text-ink-600 tabular-nums">
                  {r.yearScore} pts · {r.verificationCount} verifications
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function DormantScaffold({ nextYear }: { nextYear: number }) {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-ink-300 bg-white p-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        Activates November {nextYear}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-ink-900">
        The {nextYear} leaderboard opens on November 1
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-ink-700">
        Recognition windows run November 1 → December 31 each year. Outside
        the window we don't show a leaderboard — the recognition isn't
        a daily score to optimise; it's an annual celebration of who kept
        Shishya honest this year. Until then, focus on verifying what
        you know — every confirmed verification this year counts toward
        the {nextYear} leaderboard.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/verification"
          className="inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
        >
          Read the verification policy →
        </Link>
        <Link
          href="/me"
          className="inline-flex rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-50"
        >
          Your contributions →
        </Link>
      </div>
    </div>
  );
}
