// /admin/credential-grants — bootstrap path for the first Domain Experts.
//
// Until 3 verified DEs exist in a domain, community vouching can't
// promote anyone. Admin reviews the pending claims here and can
// either grant (manually approve + promote) or reject (with reason).
//
// Once the network is seeded, vouching takes over and admin
// intervention becomes rare.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { credentialDomainLabel } from "@/lib/db/credentials";
import { GrantActions } from "./GrantActions";

export const metadata = {
  title: "Credential grants — Shishya admin",
  robots: { index: false, follow: false },
};

interface PendingRow {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  domain: string;
  claimType: string;
  institution: string;
  notes: string | null;
  vouchCount: number;
  createdAt: Date;
}

export default async function CredentialGrantsPage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/dashboard");

  const pending = await prisma.$queryRaw<PendingRow[]>`
    SELECT c."id", c."userId", c."domain", c."claimType", c."institution",
           c."notes", c."createdAt",
           u."email", u."name",
           COALESCE((
             SELECT COUNT(DISTINCT "voucherUserId")::int
             FROM "CredentialVouch" WHERE "credentialId" = c."id"
           ), 0) AS "vouchCount"
    FROM "UserCredential" c
    JOIN "User" u ON u."id" = c."userId"
    WHERE c."status"::text = 'PENDING'
    ORDER BY c."createdAt" ASC
  `;

  // Count per-domain verified DEs so admin sees which domains still
  // need manual bootstrap.
  const domains = await prisma.$queryRaw<Array<{ domain: string; n: bigint }>>`
    SELECT "domain", COUNT(*)::bigint AS n
    FROM "UserCredential"
    WHERE "status"::text = 'VERIFIED'
    GROUP BY "domain"
    ORDER BY n DESC
  `;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header admin />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/admin/insights" className="hover:text-ink-800">Admin</Link> · Credential grants
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">Credential grants</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-600">
          Bootstrap path for the first Domain Experts. Until ≥3 DEs
          exist in a domain, community vouching can't promote anyone
          there — manual grants seed each domain. After that, vouching
          takes over and this queue should rarely need admin attention.
        </p>

        {/* Current DE counts per domain — shows which need bootstrapping */}
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Verified Domain Experts per domain
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {domains.length === 0 ? (
              <li className="text-ink-500">No verified DEs yet — first grant unblocks vouching.</li>
            ) : (
              domains.map((d) => (
                <li key={d.domain} className="flex justify-between">
                  <span>{credentialDomainLabel(d.domain)}</span>
                  <span className="tabular-nums font-medium text-ink-700">{Number(d.n)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Pending */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Pending claims ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white p-6 text-center text-xs text-ink-500">
            Nothing pending. When students submit credential claims at /me/credentials they appear here.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {pending.map((c) => (
              <li key={c.id} className="rounded-lg border border-ink-200 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink-900">
                    {c.name ?? c.email.split("@")[0]}
                    <span className="ml-2 text-[11px] font-normal text-ink-500">{c.email}</span>
                  </h3>
                  <span className="text-[10px] text-ink-500">
                    Submitted {c.createdAt.toISOString().slice(0, 10)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-800">
                  <strong>{c.claimType.replace(/_/g, " ")}</strong> at <strong>{c.institution}</strong>
                </p>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  Domain: {credentialDomainLabel(c.domain)} · {c.vouchCount} community vouches
                </p>
                {c.notes && (
                  <p className="mt-2 rounded-md bg-ink-50 p-2 text-[11px] text-ink-700">{c.notes}</p>
                )}
                <GrantActions credentialId={c.id} userId={c.userId} email={c.email} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
