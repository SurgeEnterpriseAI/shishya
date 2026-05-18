// /community-vouching/[domain] — pending Domain Expert credential
// claims awaiting vouches in this domain.
//
// Visible to everyone (the spec wants verification public-facing), but
// the actual vouch button only renders for users who hold a verified
// credential in the same domain.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import {
  getPendingCredentialsInDomain,
  credentialDomainLabel,
  VOUCHING_THRESHOLD,
} from "@/lib/db/credentials";
import { CREDENTIAL_DOMAIN_LABELS, type CredentialDomain } from "@/lib/institutional-domains";
import { VouchButton } from "./VouchButton";

export const metadata = {
  title: "Community vouching — Shishya",
  robots: { index: false, follow: true },
};

export default async function CommunityVouchingPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  if (!(domain in CREDENTIAL_DOMAIN_LABELS)) notFound();
  const dom = domain as CredentialDomain;

  const claims = await getPendingCredentialsInDomain(dom);

  // Does the current user hold a verified credential in this domain?
  // Drives whether the vouch button is enabled.
  const session = await auth().catch(() => null);
  let canVouch = false;
  if (session?.user?.id) {
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n
      FROM "UserCredential"
      WHERE "userId" = ${session.user.id}
        AND "domain" = ${dom}
        AND "status"::text = 'VERIFIED'
    `;
    canVouch = (rows[0]?.n ?? 0n) > 0n;
  }

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Community vouching
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{credentialDomainLabel(dom)}</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          People claiming a verified credential in this domain. Each
          claim needs <strong>{VOUCHING_THRESHOLD}</strong> vouches from
          existing Domain Experts in the same domain to be promoted
          automatically.
        </p>

        {!session?.user ? (
          <div className="mt-6 rounded-md border border-saffron-200 bg-saffron-50/60 px-4 py-3 text-xs text-ink-700">
            <Link href="/login" className="text-saffron-700 underline">Sign in</Link> to vouch (only available to verified Domain Experts in this domain).
          </div>
        ) : !canVouch ? (
          <div className="mt-6 rounded-md border border-ink-200 bg-ink-50/40 px-4 py-3 text-xs text-ink-700">
            You don't currently hold a verified credential in this
            domain. Vouching is only possible from peers within the
            same domain — that's what makes vouching trustworthy.
          </div>
        ) : null}

        {claims.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-ink-900">No pending claims in this domain.</p>
            <p className="mt-1 text-xs text-ink-500">
              When someone submits a credential claim for{" "}
              {credentialDomainLabel(dom)}, it'll appear here.
            </p>
          </div>
        ) : (
          <ol className="mt-8 space-y-4">
            {claims.map((c) => (
              <li key={c.id} className="rounded-lg border border-ink-200 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink-900">
                    {c.name ?? c.email.split("@")[0]}
                    <span className="ml-2 text-[11px] font-normal text-ink-500">{c.email}</span>
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                    {c.vouchCount}/{VOUCHING_THRESHOLD} vouches
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-800">
                  Claims to be: <strong>{c.claimType.replace(/_/g, " ")}</strong> at <strong>{c.institution}</strong>
                </p>
                {c.notes && (
                  <p className="mt-2 rounded-md bg-ink-50 p-2 text-[11px] text-ink-700">{c.notes}</p>
                )}
                <p className="mt-2 text-[11px] text-ink-500">Submitted {c.createdAt.toISOString().slice(0, 10)}</p>

                {canVouch && session?.user?.id !== c.userId && (
                  <div className="mt-3">
                    <VouchButton credentialId={c.id} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
