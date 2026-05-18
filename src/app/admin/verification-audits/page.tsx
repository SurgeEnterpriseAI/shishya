// /admin/verification-audits — random-sampled re-check of community verifications.
//
// Admin sees 20 random verifications that haven't yet been audited.
// For each, they read the claim + source + user's verify action and
// record APPROVED / REJECTED / CORRECTED. The results drive each
// verifier's quality score, which gates Trusted Verifier promotions.
//
// Adjacent to /admin/verification-promotions — without audit data,
// the promotion queue can't compute quality scores and no one is
// eligible. So this page must be worked through regularly.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  sampleVerificationsForAudit,
  type AuditableVerification,
} from "@/lib/db/verification-promotions";
import { prisma } from "@/lib/db/prisma";
import { AuditActions } from "./AuditActions";

export const metadata = {
  title: "Verification audits — Shishya admin",
  robots: { index: false, follow: false },
};

export default async function VerificationAuditsPage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/dashboard");

  const pending: AuditableVerification[] = await sampleVerificationsForAudit(20);

  // Counts so the admin sees their pipeline at a glance.
  const counts = await prisma.$queryRaw<Array<{ total: bigint; audited: bigint }>>`
    SELECT
      COUNT(*) FILTER (WHERE v."actionType"::text = 'VERIFY')::bigint AS total,
      COUNT(*) FILTER (
        WHERE v."actionType"::text = 'VERIFY'
          AND EXISTS (SELECT 1 FROM "VerificationAudit" va WHERE va."verificationId" = v."id")
      )::bigint AS audited
    FROM "Verification" v
  `;
  const total = Number(counts[0]?.total ?? 0n);
  const audited = Number(counts[0]?.audited ?? 0n);
  const unaudited = total - audited;
  const pct = total > 0 ? Math.round((audited * 100) / total) : 0;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header admin />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/admin/insights" className="hover:text-ink-800">Admin</Link> · Verification audits
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">Sample audits</h1>
        <p className="mt-1 text-sm text-ink-600">
          Re-check 20 random community verifications. Each decision drives
          the verifier's quality score, which gates Trusted Verifier
          promotion. Random sampling per page load — refresh for a new set.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Total verifications</p>
            <p className="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{total}</p>
          </div>
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Audited</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">{audited}</p>
            <p className="text-[10px] text-ink-500">{pct}% covered</p>
          </div>
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Pending audit</p>
            <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">{unaudited}</p>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center">
            <p className="text-sm font-medium text-ink-900">No verifications pending audit.</p>
            <p className="mt-1 text-xs text-ink-500">
              Either we've audited everything, or no community member has
              clicked "I checked the source" yet. Once verifications start
              landing, this queue fills automatically.
            </p>
          </div>
        ) : (
          <ol className="mt-8 space-y-4">
            {pending.map((v) => (
              <li key={v.verificationId} className="rounded-lg border border-ink-200 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink-900">{v.factClaimText}</h3>
                  <span className="text-[11px] text-ink-500">
                    {new Date(v.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  Verifier: <span className="font-medium text-ink-700">{v.userEmail}</span>
                </p>
                <div className="mt-3 grid gap-2 text-xs">
                  <div className="rounded-md bg-ink-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Claim value</p>
                    <p className="mt-1 break-words text-ink-900">{v.factClaimValue}</p>
                  </div>
                  <div className="rounded-md bg-ink-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Source</p>
                    <p className="mt-1">
                      <a href={v.factSourceUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
                        {v.factSourceName} ↗
                      </a>
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-500 break-all">{v.factSourceUrl}</p>
                  </div>
                  <p className="text-[11px] text-ink-500">
                    Page: <Link href={v.factPageId} className="text-saffron-700 underline">{v.factPageId}</Link>
                  </p>
                </div>

                <AuditActions
                  verificationId={v.verificationId}
                  factId={v.factId}
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
