// /verification — foundational explainer page.
//
// Every verification badge across the platform links here. This page is
// the single canonical answer to "why should I trust what Shishya says?"
// The text is intentionally direct, no marketing flourish, no hidden
// caveats. Sober and trustworthy like a university library.
//
// 26 Sep 2026: rewritten to what the DB backs. The page claimed every fact
// on Shishya carries a status, that AI re-checks sources "every few days"
// and that verified students and professionals confirm facts. In fact
// (read-only probe, 26 Sep 2026): per-fact badges render only on college and
// school-board pages; 0 automated re-checks (AiCheck rows) have ever run;
// 2 student confirmations from 1 student; no badge level above NEWCOMER.
// The rules below mirror the verify route's code and every count comes from
// Fact / Verification / AiCheck / User rows (src/lib/verification-state.ts,
// src/lib/db/verification-stats.ts) — nothing is typed.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import {
  VerificationBadge,
  SectionVerificationSummary,
} from "@/components/VerificationBadge";
import { loadVerificationStats } from "@/lib/db/verification-stats";
import {
  describeVerificationState,
  FACT_STATUS_LABEL,
  FACT_STATUS_RULES,
  type FactStatusKey,
} from "@/lib/verification-state";

// 26 Sep 2026: the "Where this stands today" counts are read from the DB.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How verification works — Shishya",
  description:
    "College and school-board pages on Shishya show a badge next to key facts, naming the official source for each. Signed-in students can confirm a fact or flag it as wrong, and flags go to the team. What each badge state means, and where the system stands today.",
  alternates: { canonical: "https://shishya.in/verification" },
  openGraph: {
    title: "How fact badges work on Shishya",
    description: "Each badge names the fact's official source; signed-in students can confirm or flag it. What each state means, and where the system stands today.",
    url: "https://shishya.in/verification",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

export default async function VerificationExplainerPage() {
  // Number-free fallback when the DB read fails: the table and the
  // per-state counts are simply not shown.
  const stats = await loadVerificationStats().catch(() => null);
  const state = stats ? describeVerificationState(stats) : null;
  const R = FACT_STATUS_RULES;
  const today = (k: FactStatusKey) =>
    state ? (
      <p className="mt-2 text-[11px] text-ink-500 tabular-nums">
        Facts in this state today: {state.perStatus[k].toLocaleString("en-IN")}
      </p>
    ) : null;
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Verification
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          How verification works on Shishya
        </h1>
        <p className="mt-4 max-w-3xl text-base text-ink-700">
          College and school-board pages show a badge next to key facts —
          a college&apos;s NIRF rank, a board&apos;s official website — and
          each badge names the official source for that fact. Exam pages
          show one &ldquo;Sourced&rdquo; line naming the official
          notification instead. Signed-in students can confirm a fact or
          flag it as wrong from its badge. If something looks wrong to you,
          click the badge and tell us. Every flag reaches the team and
          stays open until someone reviews it.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-ink-600">
          A badge tells you where a fact came from and how many students
          have confirmed it, so you can check the source yourself before
          you rely on it.
        </p>

        {/* The badge states (26 Sep 2026: rules from FACT_STATUS_RULES,
            which a test pins to the verify route; today's counts from the DB) */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">The badge states</h2>
        <p className="mt-1 text-xs text-ink-500">
          Hover any badge for the exact verification details. Click any
          badge anywhere on the platform to come back to this page.
        </p>

        <ul className="mt-6 space-y-4">
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="fully" />
              <h3 className="text-sm font-semibold text-ink-900">{FACT_STATUS_LABEL.FULLY}</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              The automated source re-check matched it within the last{" "}
              {R.fullyRecheckDays} days <em>and</em> {R.fullyCommunity}+
              students confirmed it — or a Trusted Verifier plus{" "}
              {R.fullyTrustedPlusCommunity}+ students, or a Domain Expert,
              did. This is the strongest status a fact can have.
            </p>
            {today("FULLY")}
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="verified" />
              <h3 className="text-sm font-semibold text-ink-900">{FACT_STATUS_LABEL.VERIFIED}</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              Re-checked against the source within the last{" "}
              {R.verifiedRecheckDays} days and confirmed by{" "}
              {R.verifiedCommunity}+ students — or confirmed by a Trusted
              Verifier or a Domain Expert.
            </p>
            {today("VERIFIED")}
            {state && !state.upperTiersReachable && (
              <p className="mt-2 rounded border border-amber-200 bg-amber-50/60 px-2 py-1 text-[11px] text-amber-800">
                No fact can reach this state or {FACT_STATUS_LABEL.FULLY} yet:
                none has a source re-check from the last{" "}
                {R.verifiedRecheckDays} days, and no Trusted Verifier or
                Domain Expert has been named.
              </p>
            )}
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="ai" />
              <h3 className="text-sm font-semibold text-ink-900">{FACT_STATUS_LABEL.AI}</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              The fact names its official source — NIRF for a
              college&apos;s rank, the board&apos;s own website for board
              facts — but has not reached the confirmations above. Sources
              can be misread (especially tables and PDFs), so treat this as
              one input, not absolute truth. Help us upgrade it by
              clicking &ldquo;I checked the source — this is
              accurate&rdquo; on the badge once you have read the source.
            </p>
            {today("AI")}
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="needs" />
              <h3 className="text-sm font-semibold text-ink-900">{FACT_STATUS_LABEL.NEEDS_REVIEW}</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              {state?.recheckRunning ? "Set by" : "Meant to be set by"} the
              automated source re-check when a source has changed structure,
              is unreachable, or shows a different value
              {state && !state.recheckRunning ? " — the re-check is not running yet" : ""}.{" "}
              Don&apos;t rely on such a fact for a time-critical decision
              without checking the source yourself.
            </p>
            {today("NEEDS_REVIEW")}
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="none" />
              <h3 className="text-sm font-semibold text-ink-900">{FACT_STATUS_LABEL.NONE}</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              New content awaiting its first verification. We show this
              honestly instead of hiding it behind a fake check mark.
              Help us upgrade it.
            </p>
            {today("NONE")}
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="disputed" />
              <h3 className="text-sm font-semibold text-ink-900">{FACT_STATUS_LABEL.DISPUTED}</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              {R.disputedFlags} or more students have flagged it as wrong.
              It is with the team for review — there is no set review time.
              Don&apos;t rely on this fact yet.
            </p>
            {today("DISPUTED")}
          </li>
        </ul>

        {/* Section summary example */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          Section-level summary badge
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Some pages also show a single summary badge at the top —
          useful on mobile or for content-heavy pages where dozens of
          per-fact badges would clutter the layout.
        </p>
        {/* 26 Sep 2026: example only — was status "verified" with
            "refreshed every 30 days", which no page can back yet. */}
        <SectionVerificationSummary
          status="ai"
          source="the official source named on the page"
        />

        {/* Contribution loop */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          Why student confirmations matter
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          AI can misread sources. Tables, PDF formats, and government
          notification language are particularly error-prone. Human
          verification is the corrective signal that catches what the AI
          misses — and importantly, catches when the source itself is
          wrong or outdated.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">
          Each confirmation, flag or suggested update adds contribution
          points to your profile. <em>No money, no rewards convertible to
          money</em>. Badge levels are meant to show next to your name as
          your contributions grow — Contributor → Verifier → Trusted
          Verifier → Domain Expert{state ? <>; {state.levelsClause}.</> : "."}
        </p>

        {/* What this commits Shishya to */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          What this commits us to
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          The verification system is the product, not a checkbox. It
          commits Shishya to:
        </p>
        <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm text-ink-700">
          <li>
            {state?.recheckRunning
              ? "Keeping the automated source re-check running across every badged fact."
              : state
                ? "Building the automated source re-check — and, until it runs, calling these facts “Sourced”, never re-checked."
                : "An automated re-check of every badged fact against its official source."}
          </li>
          <li>Real moderation effort to handle disputes and badge promotions.</li>
          <li>Permanent commitment to source citation discipline. No shortcuts ever.</li>
          <li>Treating community contributors as genuine partners — with respect, recognition, and responsiveness.</li>
          <li>Transparency about what's not yet verified. The "Not yet verified" badge has to be allowed to exist visibly.</li>
        </ul>

        {/* 26 Sep 2026: was "Where we are in the rollout" with phases in
            the wrong tense; now counted from the DB (src/lib/db/verification-stats.ts). */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          Where this stands today
        </h2>
        {state && (
          <>
            <table className="mt-3 w-full max-w-3xl border-collapse text-left text-sm">
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r.label} className="border-b border-ink-100 align-top">
                    <th scope="row" className="py-2 pr-4 font-medium text-ink-800">{r.label}</th>
                    <td className="py-2 text-ink-700 tabular-nums">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[11px] text-ink-500">
              Counted from Shishya&apos;s database; this page refreshes hourly.
            </p>
          </>
        )}
        <p className="mt-4 max-w-3xl text-sm text-ink-700">
          <strong>Badges (live):</strong> on college and school-board
          pages. &ldquo;Sourced&rdquo; means the fact is shown against the
          source it was first recorded from — an honest signal, not a fake
          check.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          <strong>
            Automated source re-check{state ? (state.recheckRunning ? " (running)" : " (not running yet)") : ""}:
          </strong>{" "}
          {state?.recheckRunning ? "it refreshes" : "it is designed to refresh"} each
          fact on the cadence appropriate to its type (exam dates daily,
          visa policy weekly, syllabi quarterly).
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          <strong>Student confirmations and flags (live):</strong> signed-in
          students can click &ldquo;I checked the source — this is
          accurate&rdquo;, &ldquo;This looks wrong&rdquo; or &ldquo;Suggest
          an update&rdquo; on any badge on those pages.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          <strong>Trusted Verifier and Domain Expert:</strong>{" "}
          {state ? state.seniorTiersSentence + " " : ""}Domain Experts will
          be confirmed through a credential check (admission letter,
          employment letter, etc.) — we verify, then permanently delete
          the document.
        </p>

        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            One promise
          </h3>
          <p className="mt-2">
            Verification status will never be for sale. Coaching centres,
            colleges and other interested parties cannot earn or buy
            badges. The verification system stays neutral or it doesn't
            mean anything.
          </p>
        </div>
      </section>
    </main>
  );
}
