// /admin/demand — the demand heatmap (1 Sep 2026).
//
// What aspirants keep asking for, mined daily from free-form text
// (tutor chat, PulseAsk notes, teacher requests, /ideas) by
// src/lib/demand-mine.ts. Three reads, most-detailed first:
//   1. cluster × week heatmap, grouped under the fixed category
//      taxonomy — the build-queue ranker
//   2. category × exam pivot — WHERE each demand lives
//   3. the weekly "build next" digest + raw quotes per cluster
// Server-rendered; row quotes open via <details>, no client JS.

import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { DEMAND_CATEGORIES } from "@/lib/demand-mine";
import { ShipForm } from "./ShipForm";

export const dynamic = "force-dynamic";

const WEEKS = 8;

// Saffron heat ramp — alpha scales with count so the founder reads
// intensity at a glance; text flips dark on hot cells.
function cell(count: number, max: number) {
  if (count === 0) return { backgroundColor: "transparent", color: "#b4b2a9" };
  const a = 0.12 + 0.78 * Math.min(1, count / Math.max(1, max));
  return { backgroundColor: `rgba(249,115,22,${a.toFixed(2)})`, color: a > 0.5 ? "#431407" : "#7c2d12" };
}

export default async function AdminDemandPage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  // Cluster × ISO-week counts, last 8 weeks (weeks keyed by their
  // Monday date, IST). One grouped query.
  const grid = await prisma
    .$queryRaw<{ clusterKey: string; label: string; category: string; shippedAt: Date | null; shipTitle: string | null; wk: Date; c: bigint }[]>`
      SELECT s."clusterKey", c.label, c.category, c."shippedAt", c."shipTitle",
        date_trunc('week', s."saidAt" + interval '330 minutes')::date wk,
        COUNT(*) c
      FROM "DemandSignal" s JOIN "DemandCluster" c ON c.key = s."clusterKey"
      WHERE s."saidAt" >= NOW() - interval '1 week' * ${WEEKS} AND c.status = 'active'
      GROUP BY 1, 2, 3, 4, 5, 6`
    .catch(() => []);

  const quotes = await prisma
    .$queryRaw<{ clusterKey: string; quote: string; source: string; examCode: string | null; saidAt: Date }[]>`
      SELECT "clusterKey", quote, source, "examCode", "saidAt" FROM (
        SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s."clusterKey" ORDER BY s."saidAt" DESC) rn
        FROM "DemandSignal" s
        WHERE s."saidAt" >= NOW() - interval '60 days'
      ) x WHERE rn <= 4`
    .catch(() => []);

  const byExam = await prisma
    .$queryRaw<{ examCode: string; category: string; c: bigint }[]>`
      SELECT "examCode", category, COUNT(*) c FROM "DemandSignal"
      WHERE "examCode" IS NOT NULL AND "saidAt" >= NOW() - interval '1 week' * ${WEEKS}
      GROUP BY 1, 2`
    .catch(() => []);

  const srcMix = await prisma
    .$queryRaw<{ source: string; c: bigint }[]>`
      SELECT source, COUNT(*) c FROM "DemandSignal"
      WHERE "saidAt" >= NOW() - interval '1 week' * ${WEEKS} GROUP BY 1 ORDER BY c DESC`
    .catch(() => []);

  const digest = await prisma
    .$queryRaw<{ text: string; createdAt: Date }[]>`
      SELECT text, "createdAt" FROM "DemandDigest" ORDER BY "createdAt" DESC LIMIT 1`
    .catch(() => []);

  // Assemble week columns (oldest → newest Mondays).
  const weekSet = [...new Set(grid.map((r) => r.wk.toISOString().slice(0, 10)))].sort();
  const weeks = weekSet.slice(-WEEKS);
  const wkLabel = (w: string) => {
    const d = new Date(w + "T00:00:00Z");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  };

  // Rows: cluster → {label, category, counts by week, total}.
  const rowMap = new Map<string, { label: string; category: string; shippedAt: Date | null; shipTitle: string | null; byWeek: Map<string, number>; total: number }>();
  let maxCell = 1;
  for (const r of grid) {
    const w = r.wk.toISOString().slice(0, 10);
    const row = rowMap.get(r.clusterKey) ?? { label: r.label, category: r.category, shippedAt: r.shippedAt, shipTitle: r.shipTitle, byWeek: new Map(), total: 0 };
    const n = Number(r.c);
    row.byWeek.set(w, (row.byWeek.get(w) ?? 0) + n);
    row.total += n;
    rowMap.set(r.clusterKey, row);
    maxCell = Math.max(maxCell, n);
  }
  const quotesByCluster = new Map<string, typeof quotes>();
  for (const qr of quotes) {
    const arr = quotesByCluster.get(qr.clusterKey) ?? [];
    arr.push(qr);
    quotesByCluster.set(qr.clusterKey, arr);
  }

  // Category × exam pivot (top 12 exams by total signals).
  const examTotals = new Map<string, number>();
  for (const r of byExam) examTotals.set(r.examCode, (examTotals.get(r.examCode) ?? 0) + Number(r.c));
  const topExams = [...examTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([e]) => e);
  const pivot = new Map<string, number>();
  let maxPivot = 1;
  for (const r of byExam) {
    if (!topExams.includes(r.examCode)) continue;
    const k = `${r.category}|${r.examCode}`;
    const n = (pivot.get(k) ?? 0) + Number(r.c);
    pivot.set(k, n);
    maxPivot = Math.max(maxPivot, n);
  }

  const total = srcMix.reduce((a, r) => a + Number(r.c), 0);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">← Admin</Link> · Demand
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Demand heatmap — what to build next</h1>
        <p className="mt-1 text-sm text-ink-600">
          Mined daily from free-form text: tutor chat, PulseAsk notes, teacher requests, the ideas board.
          {total > 0 && (
            <>
              {" "}
              <span className="font-medium text-ink-800">{total} signals</span> in {WEEKS} weeks (
              {srcMix.map((s) => `${s.source} ${Number(s.c)}`).join(" · ")}).
            </>
          )}
        </p>

        {digest[0] && (
          <div className="mt-5 rounded-xl border border-saffron-300 bg-saffron-50/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-saffron-800">
              Build next — weekly read ({new Date(digest[0].createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
            </p>
            <p className="mt-1 text-sm text-ink-800">{digest[0].text}</p>
          </div>
        )}

        <h2 className="mt-8 text-base font-semibold text-ink-800">Needs × weeks</h2>
        {rowMap.size === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
            No signals yet — the miner runs nightly (1:30 AM IST).
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-ink-200 bg-white p-3">
            <table className="w-full min-w-[640px] border-separate text-sm" style={{ borderSpacing: "3px" }}>
              <thead>
                <tr className="text-xs text-ink-500">
                  <th className="w-[38%] text-left font-medium">Need</th>
                  {weeks.map((w) => (
                    <th key={w} className="text-center font-normal">{wkLabel(w)}</th>
                  ))}
                  <th className="text-center font-medium">Σ</th>
                </tr>
              </thead>
              <tbody>
                {DEMAND_CATEGORIES.map((cat) => {
                  const rows = [...rowMap.entries()]
                    .filter(([, r]) => r.category === cat)
                    .sort((a, b) => b[1].total - a[1].total);
                  if (rows.length === 0) return null;
                  return (
                    <Fragment key={cat}>
                      <tr key={`h-${cat}`}>
                        <td colSpan={weeks.length + 2} className="pt-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                          {cat}
                        </td>
                      </tr>
                      {rows.map(([key, r]) => (
                        <tr key={key}>
                          <td className="py-1 pr-2">
                            <details>
                              <summary className="cursor-pointer text-ink-900 hover:text-saffron-700">
                                {r.label}
                                {r.shippedAt && (
                                  <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800" title={r.shipTitle ?? ""}>shipped ✓</span>
                                )}
                              </summary>
                              <ul className="mt-1 space-y-1 pl-1">
                                {(quotesByCluster.get(key) ?? []).map((qr, i) => (
                                  <li key={i} className="text-xs text-ink-600">
                                    &ldquo;{qr.quote}&rdquo;
                                    <span className="ml-1 text-ink-400">
                                      — {qr.source}{qr.examCode ? `/${qr.examCode}` : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <ShipForm clusterKey={key} label={r.label} />
                            </details>
                          </td>
                          {weeks.map((w) => {
                            const n = r.byWeek.get(w) ?? 0;
                            return (
                              <td key={w} className="rounded px-1 py-1 text-center tabular-nums" style={cell(n, maxCell)}>
                                {n || ""}
                              </td>
                            );
                          })}
                          <td className="text-center font-semibold tabular-nums text-ink-800">{r.total}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-ink-500">Click a need for recent quotes in the aspirant&apos;s own words.</p>
          </div>
        )}

        {topExams.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-semibold text-ink-800">Categories × exams (where each demand lives)</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-ink-200 bg-white p-3">
              <table className="w-full min-w-[640px] border-separate text-sm" style={{ borderSpacing: "3px" }}>
                <thead>
                  <tr className="text-xs text-ink-500">
                    <th className="text-left font-medium">Category</th>
                    {topExams.map((e) => (
                      <th key={e} className="text-center font-normal">{e.length > 10 ? e.slice(0, 9) + "…" : e}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEMAND_CATEGORIES.filter((cat) => topExams.some((e) => pivot.has(`${cat}|${e}`))).map((cat) => (
                    <tr key={cat}>
                      <td className="py-1 pr-2 text-ink-900">{cat}</td>
                      {topExams.map((e) => {
                        const n = pivot.get(`${cat}|${e}`) ?? 0;
                        return (
                          <td key={e} className="rounded px-1 py-1 text-center tabular-nums" style={cell(n, maxPivot)}>
                            {n || ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
