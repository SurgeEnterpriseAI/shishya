// /admin/stats — the founder's live read of Shishya (13 Oct 2026): where
// every AI call goes (Surge's own Qwen server or Claude), tokens, the
// Claude bill and what the local server saved, by job and by model; and the
// people and traffic behind it. Admin-only, refreshes itself every minute.
// Data: src/lib/stats-dashboard.ts (AiUsage, AnalyticsEvent, User, tutor
// logs) and the live strip's own numbers (getLiveCounts) for today's people.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { getLiveCounts, ZERO_LIVE_COUNTS } from "@/lib/live-counts-server";
import {
  aiByFeature,
  aiByModel,
  aiDaily,
  featureName,
  peopleDaily,
  searchMisses,
  topPaths,
  trafficSources,
  SAVING_REFERENCE_MODEL,
} from "@/lib/stats-dashboard";
import { AutoRefresh, StackedColumns } from "./charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats — admin", robots: { index: false, follow: false } };

const PERIODS = [7, 30, 90] as const;

const usd = (v: number) => (v >= 100 ? `$${Math.round(v).toLocaleString("en-IN")}` : `$${v.toFixed(2)}`);
const compact = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : `${Math.round(v)}`;
const int = (v: number) => Math.round(v).toLocaleString("en-IN");
const pct = (a: number, b: number) => {
  if (b <= 0) return "—";
  const v = (a / b) * 100;
  return v > 0 && v < 10 ? `${v.toFixed(1)}%` : `${Math.round(v)}%`;
};

const VIZ_CSS = `
.viz-root {
  color-scheme: light;
  --page: #f9f9f7; --surface-1: #fcfcfb; --surface-2: #ffffff;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #898781;
  --grid: #e1e0d9; --axis: #c3c2b7; --border: rgba(11,11,11,0.10);
  --series-1: #2a78d6; --series-2: #eb6834; --good: #006300;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme='light'])) .viz-root {
    color-scheme: dark;
    --page: #0d0d0d; --surface-1: #1a1a19; --surface-2: #232321;
    --text-primary: #ffffff; --text-secondary: #c3c2b7; --text-muted: #898781;
    --grid: #2c2c2a; --axis: #383835; --border: rgba(255,255,255,0.10);
    --series-1: #3987e5; --series-2: #d95926; --good: #0ca30c;
  }
}
:root[data-theme='dark'] .viz-root {
  color-scheme: dark;
  --page: #0d0d0d; --surface-1: #1a1a19; --surface-2: #232321;
  --text-primary: #ffffff; --text-secondary: #c3c2b7; --text-muted: #898781;
  --grid: #2c2c2a; --axis: #383835; --border: rgba(255,255,255,0.10);
  --series-1: #3987e5; --series-2: #d95926; --good: #0ca30c;
}
.viz-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 14px; }
.viz-root table td, .viz-root table th { padding: 6px 10px; }
.viz-root .num { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
`;

const LOCAL = { color: "var(--series-1)", label: "Surge 27B (our server)" };
const CLAUDE = { color: "var(--series-2)", label: "Claude" };

export default async function AdminStatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");
  const sp = await searchParams;
  const days = (PERIODS as readonly number[]).includes(Number(sp.days)) ? Number(sp.days) : 30;

  const [ai, features, models, people, sources, paths, misses, live] = await Promise.all([
    aiDaily(days),
    aiByFeature(days),
    aiByModel(days),
    peopleDaily(days),
    trafficSources(days),
    topPaths(days),
    searchMisses(days),
    getLiveCounts().catch(() => ZERO_LIVE_COUNTS),
  ]);

  const today = ai[ai.length - 1];
  const sum = (k: keyof (typeof ai)[number]) => ai.reduce((s, d) => s + Number(d[k] ?? 0), 0);
  const period = {
    claudeUsd: sum("claudeUsd"),
    savedUsd: sum("savedUsd"),
    localCalls: sum("localCalls"),
    claudeCalls: sum("claudeCalls"),
    localTokens: sum("localTokens"),
    claudeTokens: sum("claudeTokens"),
  };
  const maxSource = Math.max(1, ...sources.map((s) => s.visitors));
  const maxPath = Math.max(1, ...paths.map((p) => p.pageViews));

  return (
    <main className="viz-root min-h-screen" style={{ background: "var(--page)", color: "var(--text-primary)" }}>
      <style dangerouslySetInnerHTML={{ __html: VIZ_CSS }} />
      <Header admin />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/admin">Admin</Link> · Stats
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Shishya stats</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              AI calls, tokens and cost — our own server and Claude — plus people and traffic. <AutoRefresh />
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg p-1" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }} aria-label="Period">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin/stats?days=${p}`}
                className="rounded-md px-3 py-1 text-sm font-medium"
                style={p === days ? { background: "var(--text-primary)", color: "var(--surface-1)" } : { color: "var(--text-secondary)" }}
                aria-current={p === days ? "page" : undefined}
              >
                {p} days
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Today ───────────────────────────────────────────── */}
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Today (IST)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="AI calls on our server" value={pct(today.localCalls, today.localCalls + today.claudeCalls)} sub={`${int(today.localCalls)} of ${int(today.localCalls + today.claudeCalls)} calls`} />
          <Tile label="Claude bill" value={usd(today.claudeUsd)} sub={`${compact(today.claudeTokens)} tokens`} />
          <Tile label="Saved by our server" value={usd(today.savedUsd)} sub={`${compact(today.localTokens)} tokens at Claude Sonnet prices`} good />
          <Tile label="Active now" value={int(live.activeNow)} sub="people in the last 30 minutes" />
          <Tile label="New learners" value={`+${int(live.uniqueVisitorsToday)}`} sub={`${int(live.uniqueVisitors)} learners in all`} />
          <Tile label="Sign-ups" value={int(live.signupsToday)} sub={`${int(live.signupsLast7Days)} in the last 7 days`} />
          <Tile label="Tutor questions" value={int(live.tutorQuestionsToday)} sub={`${int(live.mocksToday)} mocks finished`} />
          <Tile label="Page views" value={int(live.pageViewsToday)} sub="bots excluded" />
        </div>

        {/* ── AI ──────────────────────────────────────────────── */}
        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>AI — last {days} days</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Claude bill" value={usd(period.claudeUsd)} sub={`${usd(period.claudeUsd / days)} a day`} />
          <Tile label="Saved by our server" value={usd(period.savedUsd)} sub="at Claude Sonnet prices" good />
          <Tile label="Calls on our server" value={pct(period.localCalls, period.localCalls + period.claudeCalls)} sub={`${int(period.localCalls)} of ${int(period.localCalls + period.claudeCalls)}`} />
          <Tile label="Tokens" value={compact(period.localTokens + period.claudeTokens)} sub={`${compact(period.localTokens)} on our server`} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="AI work per day, in dollars" note="What Claude charged, plus what our server's answers would have cost on Claude Sonnet.">
            <StackedColumns
              data={ai as any}
              series={[
                { key: "claudeUsd", label: "Claude bill", color: CLAUDE.color },
                { key: "savedUsd", label: "Saved by our server", color: LOCAL.color },
              ]}
              format="usd"
              ariaLabel="AI cost per day: Claude bill and saving from our server"
            />
          </Card>
          <Card title="Tokens per day" note="Input + output tokens (Claude: cache reads and writes included).">
            <StackedColumns
              data={ai as any}
              series={[
                { key: "localTokens", label: LOCAL.label, color: LOCAL.color },
                { key: "claudeTokens", label: CLAUDE.label, color: CLAUDE.color },
              ]}
              format="compact"
              ariaLabel="Tokens per day by provider"
            />
          </Card>
        </div>

        <Card title="Where every AI job goes" note={`Last ${days} days, by job. "On our server" = share of the job's calls answered by Surge's Qwen.`} className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-muted)" }} className="text-left text-xs">
                  <th>Job</th>
                  <th className="num">Calls</th>
                  <th className="min-w-[140px]">On our server</th>
                  <th className="num">Tokens</th>
                  <th className="num">Claude bill</th>
                  <th className="num">Saved</th>
                  <th className="num">Avg time</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => {
                  const calls = f.localCalls + f.claudeCalls;
                  const share = calls ? f.localCalls / calls : 0;
                  return (
                    <tr key={f.feature} style={{ borderTop: "1px solid var(--border)" }}>
                      <td>
                        <div className="font-medium">{featureName(f.feature)}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{f.feature}</div>
                      </td>
                      <td className="num">{int(calls)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full" style={{ background: "var(--series-2)" }} aria-hidden>
                            <div className="h-full" style={{ width: `${share * 100}%`, background: "var(--series-1)", borderRight: share > 0 && share < 1 ? "2px solid var(--surface-1)" : undefined }} />
                          </div>
                          <span className="num text-xs" style={{ color: "var(--text-secondary)" }}>{Math.round(share * 100)}%</span>
                        </div>
                      </td>
                      <td className="num">{compact(f.localTokens + f.claudeTokens)}</td>
                      <td className="num">{usd(f.claudeUsd)}</td>
                      <td className="num" style={{ color: f.savedUsd > 0 ? "var(--good)" : "var(--text-muted)" }}>{f.savedUsd > 0 ? usd(f.savedUsd) : "—"}</td>
                      <td className="num" style={{ color: "var(--text-secondary)" }}>{f.avgMs == null ? "—" : `${(f.avgMs / 1000).toFixed(1)} s`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Legend />
        </Card>

        <Card title="By model" note={`Last ${days} days.`} className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "var(--text-muted)" }} className="text-left text-xs">
                  <th>Model</th>
                  <th className="num">Calls</th>
                  <th className="num">Input</th>
                  <th className="num">Output</th>
                  <th className="num">Cache reads</th>
                  <th className="num">Cost</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.model} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: m.provider === "local" ? LOCAL.color : CLAUDE.color }} />
                      <span className="font-medium">{m.provider === "local" ? `${m.model.replace("local:", "")} (our server)` : m.model}</span>
                    </td>
                    <td className="num">{int(m.calls)}</td>
                    <td className="num">{compact(m.inTokens)}</td>
                    <td className="num">{compact(m.outTokens)}</td>
                    <td className="num">{compact(m.cacheReadTokens)}</td>
                    <td className="num">{m.provider === "local" ? "$0" : usd(m.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── People ──────────────────────────────────────────── */}
        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>People — last {days} days</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <Card title="Visitors per day" note="Distinct accounts or browsers with a page view; bots excluded.">
            <StackedColumns data={people as any} series={[{ key: "visitors", label: "Visitors", color: "var(--series-1)" }]} format="int" height={170} ariaLabel="Visitors per day" />
          </Card>
          <Card title="Sign-ups per day" note="New accounts.">
            <StackedColumns data={people as any} series={[{ key: "signups", label: "Sign-ups", color: "var(--series-1)" }]} format="int" height={170} ariaLabel="Sign-ups per day" />
          </Card>
          <Card title="Tutor questions per day" note="Questions students sent to the AI tutor.">
            <StackedColumns data={people as any} series={[{ key: "tutorQuestions", label: "Tutor questions", color: "var(--series-1)" }]} format="int" height={170} ariaLabel="Tutor questions per day" />
          </Card>
        </div>

        {/* ── Website ─────────────────────────────────────────── */}
        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Website — last {days} days</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <Card title="Where visitors come from" note="Link tag, else the referring site. Visitors (page views).">
            <BarList rows={sources.map((s) => ({ label: s.source, value: s.visitors, extra: `${int(s.visitors)} (${int(s.pageViews)})` }))} max={maxSource} />
          </Card>
          <Card title="Most viewed pages" note="Page views, bots excluded.">
            <BarList rows={paths.map((p) => ({ label: p.path, value: p.pageViews, extra: int(p.pageViews) }))} max={maxPath} />
          </Card>
          <Card title="Searches that found nothing" note="What students looked for and we don't have yet.">
            {misses.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>None in this period.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {misses.map((m) => (
                  <li key={m.q} className="flex justify-between gap-3">
                    <span className="truncate">{m.q}</span>
                    <span className="num" style={{ color: "var(--text-secondary)" }}>{int(m.count)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <p className="mt-8 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          AI numbers come from the spend ledger every AI call writes (AiUsage). "Saved" prices our server's tokens at {SAVING_REFERENCE_MODEL} rates
          ($3 / $15 per million input / output tokens) — an estimate of what those answers would have cost on Claude. Today's people tiles are the live
          strip's own numbers; per-day visitors count distinct accounts or browsers with a page view. Days are IST.
        </p>
      </section>
    </main>
  );
}

function Tile({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="viz-card px-4 py-3">
      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: good ? "var(--good)" : "var(--text-primary)" }}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{sub}</div> : null}
    </div>
  );
}

function Card({ title, note, children, className = "" }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`viz-card p-4 ${className}`}>
      <h3 className="font-semibold">{title}</h3>
      {note ? <p className="mb-3 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{note}</p> : null}
      {children}
    </section>
  );
}

function BarList({ rows, max }: { rows: { label: string; value: number; extra: string }[]; max: number }) {
  if (rows.length === 0) return <p className="text-sm" style={{ color: "var(--text-muted)" }}>No data in this period.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3">
            <span className="truncate">{r.label}</span>
            <span className="num" style={{ color: "var(--text-secondary)" }}>{r.extra}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full" style={{ background: "var(--grid)" }} aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: "var(--series-1)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: LOCAL.color }} />{LOCAL.label}</span>
      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CLAUDE.color }} />{CLAUDE.label}</span>
    </div>
  );
}
