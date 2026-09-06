// /admin/ai-spend — where the Anthropic bill goes, by feature and by day.
// Reads the AiUsage ledger written by every production call site (6 Sep
// 2026). Admin-only; robots already disallow /admin.

import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI spend — admin", robots: { index: false, follow: false } };

type FeatureRow = {
  feature: string; calls: number; cost: number; input: number; output: number; cache_w: number; cache_r: number; searches: number; avg_ms: number | null;
};
type DayRow = { dt: string; calls: number; cost: number; searches: number };

export default async function AiSpendPage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const [byFeature7d, byFeature24h, byDay] = await Promise.all([
    prisma.$queryRaw<FeatureRow[]>`
      SELECT feature, COUNT(*)::int calls, SUM("costUsd")::float cost, SUM("inputTokens")::int input, SUM("outputTokens")::int output,
             SUM("cacheWriteTokens")::int cache_w, SUM("cacheReadTokens")::int cache_r, SUM("webSearches")::int searches,
             ROUND(AVG("latencyMs"))::int avg_ms
      FROM "AiUsage" WHERE "createdAt" >= NOW() - interval '7 days' GROUP BY 1 ORDER BY 3 DESC`,
    prisma.$queryRaw<FeatureRow[]>`
      SELECT feature, COUNT(*)::int calls, SUM("costUsd")::float cost, SUM("inputTokens")::int input, SUM("outputTokens")::int output,
             SUM("cacheWriteTokens")::int cache_w, SUM("cacheReadTokens")::int cache_r, SUM("webSearches")::int searches,
             ROUND(AVG("latencyMs"))::int avg_ms
      FROM "AiUsage" WHERE "createdAt" >= NOW() - interval '24 hours' GROUP BY 1 ORDER BY 3 DESC`,
    prisma.$queryRaw<DayRow[]>`
      SELECT (("createdAt" + interval '330 minutes')::date)::text dt, COUNT(*)::int calls, SUM("costUsd")::float cost, SUM("webSearches")::int searches
      FROM "AiUsage" WHERE "createdAt" >= NOW() - interval '14 days' GROUP BY 1 ORDER BY 1 DESC`,
  ]);

  const usd = (n: number) => `$${n.toFixed(2)}`;
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  const total7 = byFeature7d.reduce((s, r) => s + r.cost, 0);
  const total24 = byFeature24h.reduce((s, r) => s + r.cost, 0);

  const Table = ({ rows, total, title }: { rows: FeatureRow[]; total: number; title: string }) => (
    <section className="mb-8">
      <h2 className="mb-2 text-lg font-semibold">{title} · {usd(total)}</h2>
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2">Feature</th><th className="px-3 py-2 text-right">Calls</th><th className="px-3 py-2 text-right">Cost</th>
              <th className="px-3 py-2 text-right">$/call</th><th className="px-3 py-2 text-right">Share</th><th className="px-3 py-2 text-right">In</th>
              <th className="px-3 py-2 text-right">Out</th><th className="px-3 py-2 text-right">Cache W/R</th><th className="px-3 py-2 text-right">Searches</th><th className="px-3 py-2 text-right">Avg ms</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="px-3 py-3 text-stone-500" colSpan={10}>No calls logged yet — the ledger starts with the first deploy after 6 Sep 2026.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.feature} className="border-t border-stone-100">
                <td className="px-3 py-2 font-medium">{r.feature}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.calls}</td>
                <td className="px-3 py-2 text-right tabular-nums">{usd(r.cost)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.calls ? `$${(r.cost / r.calls).toFixed(3)}` : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{total ? `${((r.cost / total) * 100).toFixed(0)}%` : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{k(r.input)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{k(r.output)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{k(r.cache_w)} / {k(r.cache_r)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.searches}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.avg_ms ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-bold">AI spend</h1>
        <p className="mb-6 text-sm text-stone-600">
          Estimated from list prices per logged call (Sonnet $3/$15, Haiku $1/$5 per M tokens, cache write/read, $0.01 per web search). The Anthropic console is the invoice; this page says which feature caused it.
        </p>
        <Table rows={byFeature24h} total={total24} title="Last 24 hours" />
        <Table rows={byFeature7d} total={total7} title="Last 7 days" />
        <section>
          <h2 className="mb-2 text-lg font-semibold">By day (IST)</h2>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                <tr><th className="px-3 py-2">Day</th><th className="px-3 py-2 text-right">Calls</th><th className="px-3 py-2 text-right">Cost</th><th className="px-3 py-2 text-right">Searches</th></tr>
              </thead>
              <tbody>
                {byDay.map((d) => (
                  <tr key={d.dt} className="border-t border-stone-100">
                    <td className="px-3 py-2">{d.dt}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.calls}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{usd(d.cost)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.searches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
