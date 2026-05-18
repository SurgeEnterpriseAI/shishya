// /admin/verification-promotions — Trusted Verifier promotion queue.
//
// Surfaces every Verifier-level user who clears all 5 eligibility gates
// (200+ verifications, 90+ days old, 8 of last 12 weeks active, zero
// validated false claims, ≥80% quality score on ≥10 audit samples).
//
// Admin reviews each candidate's profile and audits, then Promote /
// Deny / Defer. The eligibility set is computed live on page load —
// fine at our scale, materialise into a view if/when we exceed ~100k
// active verifiers.
//
// Counterpart of /admin/verification-audits — without audit data the
// quality score can't be computed and no one is eligible. Admins
// must work both queues.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  computeEligibility,
  TRUSTED_VERIFIER,
  type EligibilityRow,
  type PromotionGate,
} from "@/lib/db/verification-promotions";
import { PromotionActions } from "./PromotionActions";

export const metadata = {
  title: "Trusted Verifier promotions — Shishya admin",
  robots: { index: false, follow: false },
};

const GATE_LABEL: Record<PromotionGate, string> = {
  OK:                              "Eligible — review and decide",
  INSUFFICIENT_VERIFICATIONS:      "Below 200 verifications",
  ACCOUNT_TOO_YOUNG:               "Account younger than 90 days",
  INSUFFICIENT_ACTIVE_WEEKS:       "Active in fewer than 8 of last 12 weeks",
  HAS_VALIDATED_FALSE_CLAIMS:      "Has validated false claims",
  INSUFFICIENT_AUDIT_SAMPLES:      "Need more audit samples before scoring",
  QUALITY_SCORE_BELOW_THRESHOLD:   "Quality score below 80%",
};

export default async function VerificationPromotionsPage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/dashboard");

  const all = await computeEligibility();
  const eligible = all.filter((r) => r.gate === "OK");
  const pending = all.filter((r) => r.gate !== "OK");

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header admin />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/admin/insights" className="hover:text-ink-800">Admin</Link> · Trusted Verifier promotions
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">Trusted Verifier promotions</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-600">
          Users who clear all 5 gates surface here for review. Promotion
          is a meaningful elevation — a Trusted Verifier's single click
          can flip a Fact to "Verified" status. Audit their history and
          decide deliberately.
        </p>

        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-4 text-xs text-ink-700">
          <p className="font-semibold text-ink-900">Promotion criteria</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>≥ {TRUSTED_VERIFIER.MIN_VERIFICATIONS} verifications</li>
            <li>Account age ≥ {TRUSTED_VERIFIER.MIN_ACCOUNT_AGE_DAYS} days</li>
            <li>Active in ≥ {TRUSTED_VERIFIER.MIN_ACTIVE_WEEKS_OF_LAST_12} of last 12 weeks</li>
            <li>Zero validated false claims (no audit flagged their verification REJECTED/CORRECTED)</li>
            <li>Quality score ≥ {TRUSTED_VERIFIER.MIN_QUALITY_SCORE_PCT}% on ≥ {TRUSTED_VERIFIER.MIN_AUDIT_SAMPLES} audited samples</li>
          </ul>
          <p className="mt-2 text-[11px] text-ink-500">
            Audit data drives the quality score. If samples are low,
            run more passes through{" "}
            <Link href="/admin/verification-audits" className="text-saffron-700 underline">
              /admin/verification-audits
            </Link>{" "}
            to enable promotions.
          </p>
        </div>

        {/* Eligible */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">
          Eligible for promotion ({eligible.length})
        </h2>
        {eligible.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white p-6 text-center text-xs text-ink-500">
            No users currently clear all gates. As verification volume grows,
            candidates will surface here.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {eligible.map((r) => <Candidate key={r.userId} row={r} />)}
          </ol>
        )}

        {/* Pending (below thresholds) — collapsed view so the admin can
            see WHY no one's eligible and plan targeted action */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">
          Verifiers below threshold ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white p-6 text-center text-xs text-ink-500">
            No verifier-level users below threshold either. The pool is empty
            until someone hits ≥ {TRUSTED_VERIFIER.MIN_VERIFICATIONS} verifications.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200 bg-white text-xs">
            {pending.map((r) => (
              <li key={r.userId} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink-900">{r.email}</p>
                  <span className="text-[10px] text-ink-500">{r.accountAgeDays}d on platform · {r.verificationCount} verifications</span>
                </div>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  {GATE_LABEL[r.gate]}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Candidate({ row }: { row: EligibilityRow }) {
  return (
    <li className="rounded-lg border border-emerald-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{row.name ?? row.email.split("@")[0]}</h3>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
          {row.qualityScorePct}% quality
        </span>
      </div>
      <p className="text-[11px] text-ink-500">{row.email}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <Stat label="Verifications" value={row.verificationCount} />
        <Stat label="Days on platform" value={row.accountAgeDays} />
        <Stat label="Active weeks (last 12)" value={`${row.activeWeeksOfLast12}/12`} />
        <Stat label="Audits passed" value={`${row.auditApprovedCount}/${row.auditSampleCount}`} />
      </div>

      <p className="mt-3 text-[11px] text-ink-500">
        Contribution score: <span className="font-semibold text-ink-700">{row.contributionScore}</span>
      </p>

      <PromotionActions userId={row.userId} email={row.email} />
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-ink-100 bg-ink-50/40 p-2">
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-ink-800">{value}</p>
    </div>
  );
}
