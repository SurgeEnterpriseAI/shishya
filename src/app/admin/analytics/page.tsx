// /admin/analytics — product-decision dashboard.
//
// Reads first-party AnalyticsEvent rows + renders the 5 metrics that
// actually inform decisions:
//   1. Daily active users (last 30d)
//   2. Signups (last 30d, with cumulative)
//   3. Event counts by kind (which actions are users actually taking)
//   4. Top pages by PAGE_VIEW
//   5. Top contributors (verifications + chapters completed by user)
//   6. Attribution: where signups came from
//
// Admin-gated via requireAdmin. No client JS — pure server-rendered
// for speed + ease of debugging.

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  dailyActiveUsers,
  dailyEventCount,
  eventCountsByKind,
  topPages,
  attributionSources,
  topContributors,
} from "@/lib/analytics";

export const metadata: Metadata = {
  title: "Analytics — Admin | Shishya",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({
  searchParams,
}: { searchParams: Promise<{ days?: string }> }) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const sp = await searchParams;
  const days = Math.max(1, Math.min(parseInt(sp.days ?? "30", 10) || 30, 365));

  const [dau, signupsDaily, byKind, pages, attribution, contributors] = await Promise.all([
    dailyActiveUsers(days).catch(() => []),
    dailyEventCount("SIGNUP", days).catch(() => []),
    eventCountsByKind(days).catch(() => []),
    topPages(days, 20).catch(() => []),
    attributionSources(days, 15).catch(() => []),
    topContributors(days, 10).catch(() => []),
  ]);

  const totalSignups = signupsDaily.reduce((s, r) => s + Number(r.count), 0);
  const dauTodayRow = dau.length > 0 ? dau[dau.length - 1] : null;
  const dauToday = dauTodayRow ? Number(dauTodayRow.count) : 0;
  const dauMax = dau.length > 0 ? Math.max(...dau.map((r) => Number(r.count))) : 0;
  const signupsMax = signupsDaily.length > 0 ? Math.max(...signupsDaily.map((r) => Number(r.count))) : 0;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">Admin</Link> · Analytics
        </p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold text-ink-900">Analytics</h1>
          <PeriodSwitcher current={days} />
        </div>
        <p className="mt-1 text-sm text-ink-600">
          First-party event log. PII-free. {days}-day window.
        </p>

        {/* Headline stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="DAU today" value={dauToday.toLocaleString()} />
          <Stat label={`Total signups (${days}d)`} value={totalSignups.toLocaleString()} />
          <Stat label="Peak DAU" value={dauMax.toLocaleString()} />
          <Stat label="Peak daily signups" value={signupsMax.toLocaleString()} />
        </div>

        {/* Daily active users sparkline */}
        <Section title="Daily active users" subtitle={`Distinct users (signed in or anon) per day, last ${days} days`}>
          <Sparkline data={dau.map((r) => ({ day: r.day, value: Number(r.count) }))} />
        </Section>

        {/* Signups */}
        <Section title="Signups per day" subtitle={`SIGNUP events (one per new user), last ${days} days`}>
          <Sparkline data={signupsDaily.map((r) => ({ day: r.day, value: Number(r.count) }))} color="emerald" />
        </Section>

        {/* Event counts by kind */}
        <Section title="Event counts by kind" subtitle={`Total events of each kind over the period`}>
          {byKind.length === 0 ? (
            <Empty />
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {byKind.map((r) => (
                <li key={r.kind} className="flex items-baseline justify-between rounded border border-ink-100 bg-white px-3 py-2 text-sm">
                  <span className="font-medium text-ink-800">{r.kind}</span>
                  <span className="tabular-nums text-ink-700">{Number(r.count).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Top pages */}
        <Section title="Top pages" subtitle="By PAGE_VIEW count">
          {pages.length === 0 ? (
            <Empty />
          ) : (
            <ol className="mt-3 space-y-1 text-sm">
              {pages.map((r, i) => (
                <li key={r.path ?? `${i}`} className="flex items-baseline justify-between gap-3 rounded border border-ink-100 bg-white px-3 py-2">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-ink-100 text-[10px] font-bold tabular-nums">{i + 1}</span>
                    <span className="truncate font-mono text-xs text-ink-800">{r.path ?? "(unknown)"}</span>
                  </span>
                  <span className="text-xs tabular-nums text-ink-600">{Number(r.count).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* Attribution */}
        <Section title="Attribution (signups)" subtitle="Top sources by SIGNUP volume — utm_source or referrer host">
          {attribution.length === 0 ? (
            <Empty />
          ) : (
            <ol className="mt-3 space-y-1 text-sm">
              {attribution.map((r, i) => (
                <li key={r.source} className="flex items-baseline justify-between rounded border border-ink-100 bg-white px-3 py-2">
                  <span className="flex items-baseline gap-2">
                    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-ink-100 text-[10px] font-bold tabular-nums">{i + 1}</span>
                    <span className="text-ink-800">{r.source}</span>
                  </span>
                  <span className="text-xs tabular-nums text-ink-600">{Number(r.count).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* Top contributors */}
        <Section title="Top contributors" subtitle="Verifications + chapters completed in the period">
          {contributors.length === 0 ? (
            <Empty />
          ) : (
            <ol className="mt-3 space-y-1 text-sm">
              {contributors.map((r, i) => (
                <li key={r.email} className="flex flex-wrap items-baseline justify-between gap-3 rounded border border-ink-100 bg-white px-3 py-2">
                  <span className="flex items-baseline gap-2">
                    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-ink-100 text-[10px] font-bold tabular-nums">{i + 1}</span>
                    <span className="font-mono text-xs text-ink-800">{r.email}</span>
                  </span>
                  <span className="text-xs tabular-nums text-ink-600">
                    {Number(r.verificationsLast30).toLocaleString()} verifications · {Number(r.chaptersCompletedLast30).toLocaleString()} chapters
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <p className="mt-10 text-[11px] text-ink-500">
          Stored in <code className="rounded bg-ink-100 px-1">AnalyticsEvent</code>. No 3rd-party tracker.
          Anonymous users get a rotating cookie id (30d). Once they sign in, events bind to userId.
        </p>
      </section>
    </main>
  );
}

function PeriodSwitcher({ current }: { current: number }) {
  const opts = [7, 14, 30, 90];
  return (
    <div className="flex gap-1">
      {opts.map((d) => (
        <Link
          key={d}
          href={`/admin/analytics?days=${d}`}
          className={
            d === current
              ? "rounded-md bg-saffron-500 px-3 py-1 text-xs font-semibold text-white"
              : "rounded-md border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-100"
          }
        >
          {d}d
        </Link>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{value}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
      {children}
    </div>
  );
}

function Empty() {
  return (
    <p className="mt-3 rounded border border-dashed border-ink-300 bg-white px-3 py-4 text-center text-xs text-ink-500">
      No data in this window. Events will appear once users hit the platform.
    </p>
  );
}

/**
 * Tiny CSS-only sparkline — renders bars instead of an SVG line so we
 * stay zero-dep. Color: "saffron" (default) or "emerald".
 */
function Sparkline({
  data,
  color = "saffron",
}: {
  data: Array<{ day: Date; value: number }>;
  color?: "saffron" | "emerald";
}) {
  if (data.length === 0) return <Empty />;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bar = color === "emerald" ? "bg-emerald-500" : "bg-saffron-500";
  const lighter = color === "emerald" ? "bg-emerald-100" : "bg-saffron-100";
  return (
    <div className="mt-3 rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex h-32 items-end gap-1">
        {data.map((d, i) => {
          const heightPct = (d.value / max) * 100;
          return (
            <div
              key={i}
              className={`group relative flex-1 ${lighter} rounded-sm`}
              style={{ height: "100%" }}
              title={`${d.day.toISOString().slice(0, 10)}: ${d.value.toLocaleString()}`}
            >
              <div
                className={`${bar} absolute bottom-0 left-0 right-0 rounded-sm transition-colors`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink-500 tabular-nums">
        <span>{data[0]?.day.toISOString().slice(5, 10)}</span>
        {data.length > 2 && (
          <span>{data[Math.floor(data.length / 2)].day.toISOString().slice(5, 10)}</span>
        )}
        <span>{data[data.length - 1]?.day.toISOString().slice(5, 10)}</span>
      </div>
    </div>
  );
}
