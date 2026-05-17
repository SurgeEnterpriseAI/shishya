// /verification — foundational explainer page.
//
// Every verification badge across the platform links here. This page is
// the single canonical answer to "why should I trust what Shishya says?"
// The text is intentionally direct, no marketing flourish, no hidden
// caveats. Sober and trustworthy like a university library.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import {
  VerificationBadge,
  SectionVerificationSummary,
} from "@/components/VerificationBadge";

export const metadata: Metadata = {
  title: "How verification works — Shishya",
  description:
    "Every fact on Shishya carries a visible verification status. AI checks the official source automatically; community members confirm what they personally know. Click any badge to see the verification history.",
  alternates: { canonical: "https://shishya.in/verification" },
  openGraph: {
    title: "How Shishya verifies every fact",
    description: "AI-checked + community-confirmed against official sources. Click any badge to see the history.",
    url: "https://shishya.in/verification",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

export default function VerificationExplainerPage() {
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
          Every fact you see here is checked. We pull information from
          official government, university, and exam authority sources, then
          verify each fact in two ways: our AI checks the source
          automatically every few days, and verified students and
          professionals from our community confirm what they know
          personally. The badge next to each fact shows what's been
          verified, when, and by whom. If something looks wrong to you,
          click the badge and tell us. Every flag is reviewed. Every
          correction is acknowledged.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-ink-600">
          The students who help us keep Shishya accurate earn recognition
          for it. This is how we stay different from any general AI tool:
          we don't just give you answers; we show you why you can trust
          them.
        </p>

        {/* The five badge states */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">The five badge states</h2>
        <p className="mt-1 text-xs text-ink-500">
          Hover any badge for the exact verification details. Click any
          badge anywhere on the platform to come back to this page.
        </p>

        <ul className="mt-6 space-y-4">
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="fully" source="NIRF" lastCheckedAt="2026-05-15" />
              <h3 className="text-sm font-semibold text-ink-900">Fully verified</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              AI-verified against the official source within the last 30
              days <em>and</em> confirmed by 3+ community users (or by a
              Trusted Verifier or Domain Expert). This is the strongest
              status a fact can have.
            </p>
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="verified" source="CBSE" lastCheckedAt="2026-05-15" />
              <h3 className="text-sm font-semibold text-ink-900">Verified</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              AI-verified within the last 60 days, or confirmed by 2+
              community users. Trustworthy for most purposes.
            </p>
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="ai" source="official source" lastCheckedAt="2026-05-15" />
              <h3 className="text-sm font-semibold text-ink-900">AI-verified</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              Auto-verified by AI against the official source, but no
              human has reviewed it yet. A real signal — but AI can
              misread sources (especially tables and PDFs). Treat this
              as one input, not absolute truth. Help us upgrade it by
              clicking "I checked the source — this is accurate" when
              you read the page.
            </p>
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="needs" source="UPSC" lastCheckedAt="2026-02-15" />
              <h3 className="text-sm font-semibold text-ink-900">Needs verification</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              Last verification is more than 60 days old, or the source
              URL has changed structure, or AI verification found a
              discrepancy. The displayed fact is probably still correct,
              but we're queueing a re-check. Don't rely on it for a
              time-critical decision without checking the source yourself.
            </p>
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="none" />
              <h3 className="text-sm font-semibold text-ink-900">Not yet verified</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              New content awaiting its first verification. We show this
              honestly instead of hiding it behind a fake check mark.
              Help us upgrade it.
            </p>
          </li>
          <li className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex items-baseline gap-3">
              <VerificationBadge status="disputed" />
              <h3 className="text-sm font-semibold text-ink-900">Flagged</h3>
            </div>
            <p className="mt-2 text-xs text-ink-600">
              Multiple users have flagged this as incorrect, or AI
              verification keeps failing. An admin is reviewing within
              24 hours. Don't rely on this fact yet.
            </p>
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
        <SectionVerificationSummary
          status="verified"
          source="NIRF 2024 + official college sites"
          refreshCadence="every 30 days"
        />

        {/* Contribution loop */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          Why community verification matters
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          AI can misread sources. Tables, PDF formats, and government
          notification language are particularly error-prone. Human
          verification is the corrective signal that catches what the AI
          misses — and importantly, catches when the source itself is
          wrong or outdated.
        </p>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">
          Students who help us keep Shishya accurate earn recognition
          for it. <em>No money, no rewards convertible to money</em> —
          just visible badges next to your name that compound over time:
          Contributor → Verifier → Trusted Verifier → Domain Expert.
          A Trusted Verifier who cleared UPSC is qualitatively different
          from a ChatGPT answer, and that's the kind of signal Shishya
          surfaces.
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
          <li>Real ongoing infrastructure to keep AI verification running across thousands of facts.</li>
          <li>Real moderation effort to handle disputes and badge promotions.</li>
          <li>Permanent commitment to source citation discipline. No shortcuts ever.</li>
          <li>Treating community contributors as genuine partners — with respect, recognition, and responsiveness.</li>
          <li>Transparency about what's not yet verified. The "Not yet verified" badge has to be allowed to exist visibly.</li>
        </ul>

        {/* Phase 1 status (be honest with the user) */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          Where we are in the rollout
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          <strong>Phase 1 (today):</strong> The badge UI is live across the
          platform. Most facts currently show "AI-verified" against their
          original ingestion source — that's an honest signal, not a fake
          check.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          <strong>Phase 2 (next):</strong> The automated AI re-verification
          job runs continuously, refreshing every fact on the cadence
          appropriate to its type (exam dates daily, visa policy weekly,
          syllabi quarterly).
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          <strong>Phase 3 (after that):</strong> Community verification —
          click "I checked the source — this is accurate" or "this looks
          wrong" on any badge. Contribution counts accrue and turn into
          visible badges next to your name.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          <strong>Phase 4-5:</strong> Trusted Verifier and Domain Expert
          promotions. Domain Experts upload credentials (admission
          letter, employment letter, etc.) — we verify, then permanently
          delete the document.
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
