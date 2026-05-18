// /me/credentials — manage your Domain Expert credential claims.
//
// Phase 1.2 v1 ships with TWO paths visible:
//   1. Community vouching — submit a claim, it appears in /community-vouching/[domain]
//      for existing DEs in the same domain to vouch on.
//   2. (Stubbed) Institutional email — UI shows "needs email infra" banner.
// Plus admin-grant path which is operator-side, not user-facing.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { getUserCredentials, credentialDomainLabel, VOUCHING_THRESHOLD } from "@/lib/db/credentials";
import { CREDENTIAL_DOMAIN_LABELS, type CredentialDomain } from "@/lib/institutional-domains";
import { CredentialForm } from "./CredentialForm";

export const metadata = {
  title: "Your credentials — Shishya",
  robots: { index: false, follow: false },
};

export default async function MyCredentialsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/me/credentials");
  const userId = session.user.id;

  const creds = await getUserCredentials(userId);
  const verified = creds.filter((c) => c.status === "VERIFIED");
  const pending = creds.filter((c) => c.status === "PENDING");
  const rejected = creds.filter((c) => c.status === "REJECTED");

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/me" className="hover:text-ink-800">Your profile</Link> · Credentials
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">Credentials</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          Verified credentials elevate your verifications to Domain
          Expert weight — a single click from you can flip a fact to
          Verified status. The verification system stays neutral by
          requiring real proof of affiliation.
        </p>

        {/* Verified */}
        {verified.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold text-ink-900">Verified ({verified.length})</h2>
            <ul className="mt-3 space-y-2">
              {verified.map((c) => (
                <li key={c.id} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">
                      {c.claimType} · {c.institution}
                    </p>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                      Verified via {c.verifiedVia?.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {credentialDomainLabel(c.domain)} · verified {c.verifiedAt?.toISOString().slice(0, 10)}
                  </p>
                  {c.notes && <p className="mt-1 text-[11px] text-ink-600">{c.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold text-ink-900">Pending ({pending.length})</h2>
            <ul className="mt-3 space-y-2">
              {pending.map((c) => (
                <li key={c.id} className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ink-900">
                      {c.claimType} · {c.institution}
                    </p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                      Awaiting vouches
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {credentialDomainLabel(c.domain)} · needs {VOUCHING_THRESHOLD} vouches from existing Domain Experts in this domain
                  </p>
                  <p className="mt-2 text-[11px] text-ink-600">
                    Your claim appears at{" "}
                    <Link
                      href={`/community-vouching/${c.domain}`}
                      className="text-saffron-700 underline"
                    >
                      /community-vouching/{c.domain}
                    </Link>
                    {" "}— share that URL with someone who can vouch (current DEs in the same domain only).
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rejected */}
        {rejected.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold text-ink-900">Rejected ({rejected.length})</h2>
            <ul className="mt-3 space-y-2">
              {rejected.map((c) => (
                <li key={c.id} className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
                  <p className="text-sm font-semibold text-ink-900">
                    {c.claimType} · {c.institution}
                  </p>
                  {c.notes && <p className="mt-1 text-[11px] text-rose-700">{c.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit a new claim */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          Submit a new credential claim
        </h2>
        <CredentialForm />

        {/* Honest framing on what's currently possible */}
        <div className="mt-12 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">How verification works today</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-ink-600">
            <li>
              <strong>Community vouching:</strong> 3 existing Domain
              Experts in the same domain vouch → auto-promotion. This
              is the primary path once the network has bootstrapped.
            </li>
            <li>
              <strong>Institutional email (coming soon):</strong> A
              one-time link to your verified institutional email
              (@iitm.ac.in / @upsc.gov.in / @aiims.edu / etc.).
              Currently blocked on email infrastructure setup.
            </li>
            <li>
              <strong>Admin grant:</strong> For bootstrap — the
              platform admin can grant Domain Expert status to vetted
              individuals so the vouching network has a starting point.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
