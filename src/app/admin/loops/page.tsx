// /admin/loops — measure the loops (13 Sep 2026).
//
// Four readouts the 11 Sep audit found missing, all raw SQL over existing
// tables (src/lib/loops-readout.ts), nothing cached, nothing public:
//   A. mail: logged sends → delivered → opens → clicks → return ≤36 h, by
//      mail kind (opens/clicks arrive via /api/webhooks/resend)
//   B. share loop: taps by surface × channel, arrivals + signups by
//      utm_source, and the K-factor upper bound with its formula printed
//   C. "How did you find Shishya?" chip answers vs the referrer-derived
//      source for the same users
//   D. AI crawlers (BotVisit) by family × IST day
// Readers run SEQUENTIALLY (Neon connection_limit is shared with live
// traffic) and each block says "could not load" when its read failed.
// Admin-only, English, no client JS.

import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  BOT_FAMILIES_FIRST,
  FOUND_VIA_OPTIONS,
  LOGGED_SEND_FAMILIES,
  activeUsers,
  botVisits,
  challengeFunnel,
  foldFunnel,
  foundVia,
  istDayList,
  kFactor,
  mailFamily,
  mailReturns,
  mailTouches,
  orderFamilies,
  pct,
  pivotByDay,
  shareArrivals,
  shareSignups,
  shareTaps,
  totalSignups,
} from "@/lib/loops-readout";

export const metadata: Metadata = {
  title: "Loops — Admin | Shishya",
  robots: { index: false, follow: false },
};

// ~10 sequential Neon reads (activeUsers is a 14-day scan of AnalyticsEvent);
// same reason /admin/insights and /admin/exam-week raise the timeout.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const FOUND_VIA_WINDOW_D = 90;

function num(n: number | null | undefined): string {
  return n == null ? "–" : Number(n).toLocaleString("en-IN");
}

function ratio(n: number): string {
  return n.toFixed(3);
}

export default async function AdminLoopsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const sp = await searchParams;
  const days = Math.max(1, Math.min(parseInt(sp.days ?? "14", 10) || 14, 90));

  // Sequential on purpose — see the file comment.
  const touches = await mailTouches(days);
  const returns = await mailReturns(days);
  const taps = await shareTaps(days);
  const arrivals = await shareArrivals(days);
  const sSignups = await shareSignups(days);
  const allSignups = await totalSignups(days);
  const chip = await foundVia(FOUND_VIA_WINDOW_D);
  const bots = await botVisits(days);
  const challenge = await challengeFunnel(days);
  const active = await activeUsers(days); // heaviest — last, alone

  // ── A. mail funnel ──
  const funnel = touches ? foldFunnel(touches) : null;
  const returnByFamily = new Map<string, { sends: number; returned: number }>();
  for (const r of returns ?? []) {
    const fam = mailFamily(r.tag.replace(/^sent:/, ""));
    const cur = returnByFamily.get(fam) ?? { sends: 0, returned: 0 };
    cur.sends += Number(r.sends);
    cur.returned += Number(r.returned);
    returnByFamily.set(fam, cur);
  }
  const families = orderFamilies(new Set([...(funnel?.keys() ?? []), ...returnByFamily.keys()]));
  const anyWebhookRows = funnel ? [...funnel.values()].some((f) => f.delivered + f.open + f.click > 0) : false;

  // ── B. share loop ──
  const tapTotal = (taps ?? []).reduce((s, r) => s + Number(r.taps), 0);
  const shareSignupTotal = (sSignups ?? []).reduce((s, r) => s + Number(r.n), 0);
  const k = kFactor({ taps: tapTotal, activeUsers: active ?? 0, shareSignups: shareSignupTotal });
  const kReady = taps !== null && sSignups !== null && active !== null;

  // ── C. found-via crosstab ──
  const chipRows = chip ?? [];
  const answered = chipRows.filter((r) => r.said !== "dismissed").reduce((s, r) => s + Number(r.n), 0);
  const dismissed = chipRows.filter((r) => r.said === "dismissed").reduce((s, r) => s + Number(r.n), 0);
  const derivedTotals = new Map<string, number>();
  for (const r of chipRows) {
    if (r.said === "dismissed") continue;
    derivedTotals.set(r.derived, (derivedTotals.get(r.derived) ?? 0) + Number(r.n));
  }
  const derivedCols = [...derivedTotals.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d);
  const topCols = derivedCols.slice(0, 8);
  const hasOtherCol = derivedCols.length > 8;
  const cell = (said: string, derived: string | null) =>
    chipRows
      .filter((r) => r.said === said && (derived === null ? !topCols.includes(r.derived) : r.derived === derived))
      .reduce((s, r) => s + Number(r.n), 0);
  const saidRows = [
    ...FOUND_VIA_OPTIONS,
    ...[...new Set(chipRows.map((r) => r.said))].filter((s) => s !== "dismissed" && !FOUND_VIA_OPTIONS.includes(s)),
  ];

  // ── D. crawlers ──
  const dayCols = istDayList(days);
  const botPivot = bots ? pivotByDay(bots.map((b) => ({ key: b.bot, day: b.day, n: b.n })), dayCols) : null;
  const botRows = botPivot
    ? [
        ...BOT_FAMILIES_FIRST.map((b) => botPivot.find((r) => r.key === b) ?? { key: b, total: 0, cells: dayCols.map(() => 0) }),
        ...botPivot.filter((r) => !BOT_FAMILIES_FIRST.includes(r.key)),
      ]
    : null;

  const th = "px-2 py-1.5 text-right font-medium whitespace-nowrap";
  const td = "px-2 py-1.5 text-right tabular-nums";

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">Admin</Link> · Loops
        </p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold text-ink-900">Loops — mail, shares, crawlers</h1>
          <PeriodSwitcher current={days} />
        </div>
        <p className="mt-1 text-sm text-ink-600">
          Raw counts over the last {days} days (found-via chip: {FOUND_VIA_WINDOW_D} days). Nothing on this page is shown publicly.
        </p>

        {/* ── A ── */}
        <Section
          title="Mail: sends → delivered → opens → clicks → return"
          subtitle="One row per mail kind. Rows = touches (one open/click/delivered row per user per kind per 20 h). Return = any non-bot event from that user within 36 h of a logged send."
        >
          {touches === null ? (
            <CouldNotLoad what="EmailTouch" />
          ) : families.length === 0 ? (
            <Empty />
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-ink-200 bg-white">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="bg-ink-50 text-ink-600">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Mail kind</th>
                    <th className={th} title="'sent:' rows — marketing kinds only">Logged sends</th>
                    <th className={th} title="Distinct users behind the logged sends">People</th>
                    <th className={th} title="Webhook email.delivered">Delivered</th>
                    <th className={th} title="Webhook email.opened (users × days)">Opens</th>
                    <th className={th}>Open %</th>
                    <th className={th} title="Webhook email.clicked (users × days)">Clicks</th>
                    <th className={th}>Click %</th>
                    <th className={th} title="Sends older than 36 h followed by any non-bot event within 36 h">Returned ≤36 h</th>
                    <th className={th}>Return %</th>
                  </tr>
                </thead>
                <tbody>
                  {families.map((fam) => {
                    const f = funnel?.get(fam) ?? { sent: 0, delivered: 0, open: 0, click: 0, sentUsers: 0 };
                    const r = returnByFamily.get(fam);
                    const logged = LOGGED_SEND_FAMILIES.has(fam);
                    return (
                      <tr key={fam} className="border-t border-ink-100">
                        <td className="px-2 py-1.5 font-mono text-ink-800">
                          {fam}
                          {!logged && <span title="transactional — no send row is logged">*</span>}
                        </td>
                        <td className={td}>{logged || f.sent > 0 ? num(f.sent) : "–"}</td>
                        <td className={td}>{logged || f.sentUsers > 0 ? num(f.sentUsers) : "–"}</td>
                        <td className={td}>{f.delivered > 0 ? num(f.delivered) : "–"}</td>
                        <td className={td}>{f.open > 0 ? num(f.open) : "–"}</td>
                        <td className={td}>{f.delivered > 0 ? pct(f.open, f.delivered) : "–"}</td>
                        <td className={td}>{f.click > 0 ? num(f.click) : "–"}</td>
                        <td className={td}>{f.delivered > 0 ? pct(f.click, f.delivered) : "–"}</td>
                        <td className={td}>{r ? `${num(r.returned)} / ${num(r.sends)}` : "–"}</td>
                        <td className={td}>{r ? pct(r.returned, r.sends) : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {returns === null && <CouldNotLoad what="return-within-36 h" />}
          <p className="mt-2 text-xs text-ink-500">
            Opens and clicks appear only after the Resend webhook is set up (RESEND_WEBHOOK_SECRET + open/click tracking on the sending domain).
            {!anyWebhookRows && " No webhook rows yet in this window."}{" "}
            * Transactional kinds (welcome, aptitude-pass, mentor-session…) log no send row and BCC the founder; their opens can include the founder&apos;s copy — read those as an upper bound.
            Logged sends count marketing kinds only (the ones with an unsubscribe footer).
          </p>
        </Section>

        {/* ── B ── */}
        <Section title="Share loop" subtitle="Taps on any share button vs arrivals and signups that carried a share utm.">
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-ink-200 bg-white p-3">
              <p className="text-xs font-semibold text-ink-800">Taps by surface × channel</p>
              {taps === null ? (
                <CouldNotLoad what="share taps" />
              ) : taps.length === 0 ? (
                <Empty />
              ) : (
                <table className="mt-2 w-full text-xs">
                  <thead className="text-ink-500">
                    <tr>
                      <th className="py-1 text-left font-medium">surface</th>
                      <th className="py-1 text-left font-medium">via</th>
                      <th className="py-1 text-right font-medium">taps</th>
                      <th className="py-1 text-right font-medium">sharers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taps.map((r) => (
                      <tr key={`${r.surface}|${r.via}`} className="border-t border-ink-100">
                        <td className="py-1 font-mono">{r.surface}</td>
                        <td className="py-1 font-mono">{r.via}</td>
                        <td className="py-1 text-right tabular-nums">{num(r.taps)}</td>
                        <td className="py-1 text-right tabular-nums">{num(r.sharers)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-ink-200 font-semibold">
                      <td className="py-1" colSpan={2}>total</td>
                      <td className="py-1 text-right tabular-nums">{num(tapTotal)}</td>
                      <td className="py-1" />
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-3">
              <p className="text-xs font-semibold text-ink-800">Arrivals on share links (utm_medium=share) by utm_source</p>
              {arrivals === null ? (
                <CouldNotLoad what="share arrivals" />
              ) : arrivals.length === 0 ? (
                <Empty />
              ) : (
                <table className="mt-2 w-full text-xs">
                  <thead className="text-ink-500">
                    <tr>
                      <th className="py-1 text-left font-medium">utm_source</th>
                      <th className="py-1 text-right font-medium">identified visitors</th>
                      <th className="py-1 text-right font-medium">unidentified first hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrivals.map((r) => (
                      <tr key={r.src} className="border-t border-ink-100">
                        <td className="py-1 font-mono">{r.src}</td>
                        <td className="py-1 text-right tabular-nums">{num(r.identified)}</td>
                        <td className="py-1 text-right tabular-nums">{num(r.firstHits)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-2 text-[11px] text-ink-500">
                WhatsApp strips the referrer, so a lander&apos;s first page arrives with no cookie and no referrer and is left unidentified by the ingest identity rule; identity begins on the second hit. The two columns are different people-units — never add them.
              </p>
            </div>
            <div className="rounded-lg border border-ink-200 bg-white p-3">
              <p className="text-xs font-semibold text-ink-800">Signups that arrived on a share link</p>
              {sSignups === null ? (
                <CouldNotLoad what="share signups" />
              ) : sSignups.length === 0 ? (
                <Empty />
              ) : (
                <table className="mt-2 w-full text-xs">
                  <thead className="text-ink-500">
                    <tr>
                      <th className="py-1 text-left font-medium">utm_source</th>
                      <th className="py-1 text-right font-medium">signups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sSignups.map((r) => (
                      <tr key={r.src} className="border-t border-ink-100">
                        <td className="py-1 font-mono">{r.src}</td>
                        <td className="py-1 text-right tabular-nums">{num(r.n)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-2 text-xs text-ink-700">
                Share-utm signups: <strong className="tabular-nums">{num(shareSignupTotal)}</strong> of{" "}
                <strong className="tabular-nums">{num(allSignups)}</strong> total signups in {days} days
                {allSignups ? ` (${pct(shareSignupTotal, allSignups)})` : ""}.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-saffron-200 bg-saffron-50/50 p-4 text-sm text-ink-800">
            <p className="font-mono text-xs text-ink-700">
              K ≤ share-utm signups ÷ active signed-in users = (taps ÷ active users) × (share-utm signups ÷ taps)
            </p>
            {kReady ? (
              <p className="mt-2 font-mono text-xs">
                K ≤ {num(shareSignupTotal)} ÷ {num(active)} = <strong>{ratio(k.k)}</strong> = ({num(tapTotal)} ÷ {num(active)} = {ratio(k.tapsPerUser)}) × (
                {num(shareSignupTotal)} ÷ {num(tapTotal)} = {ratio(k.signupsPerTap)})
              </p>
            ) : (
              <CouldNotLoad what="one of taps / share signups / active users" />
            )}
            <p className="mt-2 text-xs text-ink-600">
              Upper bound: every signup that arrives on a share link is credited to the loop (some would have signed up anyway); forwards that drop the link (screenshots, retyped names) are invisible, so this bounds the MEASURED loop only. Active users = distinct signed-in users with any non-bot event in the window.
            </p>
          </div>
        </Section>

        {/* ── C ── */}
        <Section
          title="How did you find Shishya (chip) vs what the referrer said"
          subtitle={`Rows = what the student tapped; columns = utm_source, else referrer host, else User.signupReferrerHost, else (direct). Last ${FOUND_VIA_WINDOW_D} days (the chip is asked once per user).`}
        >
          {chip === null ? (
            <CouldNotLoad what="found-via answers" />
          ) : chipRows.length === 0 ? (
            <Empty />
          ) : (
            <>
              <p className="mt-2 text-xs text-ink-700">
                answered <strong className="tabular-nums">{num(answered)}</strong> · dismissed <strong className="tabular-nums">{num(dismissed)}</strong> · answer rate{" "}
                <strong>{pct(answered, answered + dismissed)}</strong>
              </p>
              <div className="mt-3 overflow-x-auto rounded-lg border border-ink-200 bg-white">
                <table className="w-full min-w-[700px] text-xs">
                  <thead className="bg-ink-50 text-ink-600">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">said ↓ / derived →</th>
                      {topCols.map((c) => (
                        <th key={c} className={th}>{c}</th>
                      ))}
                      {hasOtherCol && <th className={th}>other</th>}
                      <th className={th}>total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saidRows.map((said) => {
                      const total = chipRows.filter((r) => r.said === said).reduce((s, r) => s + Number(r.n), 0);
                      return (
                        <tr key={said} className="border-t border-ink-100">
                          <td className="px-2 py-1.5 font-mono text-ink-800">{said}</td>
                          {topCols.map((c) => (
                            <td key={c} className={td}>{num(cell(said, c))}</td>
                          ))}
                          {hasOtherCol && <td className={td}>{num(cell(said, null))}</td>}
                          <td className={`${td} font-semibold`}>{num(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        {/* ── D ── */}
        <Section title="AI crawlers by IST day" subtitle="BotVisit rows by user-agent family. Counted on middleware-matched paths only (src/middleware.ts matcher).">
          {botRows === null ? (
            <CouldNotLoad what="BotVisit" />
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-ink-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-ink-50 text-ink-600">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Crawler</th>
                    <th className={th}>total</th>
                    {dayCols.map((d) => (
                      <th key={d} className={th} title={d}>{d.slice(5)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {botRows.map((r) => (
                    <tr key={r.key} className={`border-t border-ink-100 ${BOT_FAMILIES_FIRST.includes(r.key) ? "bg-saffron-50/40" : ""}`}>
                      <td className="px-2 py-1.5 font-mono text-ink-800">{r.key}</td>
                      <td className={`${td} font-semibold`}>{num(r.total)}</td>
                      {r.cells.map((c, i) => (
                        <td key={dayCols[i]} className={td}>{c === 0 ? <span className="text-ink-300">0</span> : num(c)}</td>
                      ))}
                    </tr>
                  ))}
                  {botRows.length === 0 && (
                    <tr>
                      <td colSpan={2 + dayCols.length} className="px-2 py-3 text-center text-ink-500">No crawler hits in this window.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* ── E ── */}
        <Section
          title="Challenge a friend"
          subtitle="Links to the same questions with a score to beat: links made → challenge page views → scores friends sent → links they made in turn → signups tagged utm_campaign=challenge."
        >
          {challenge === null ? (
            <CouldNotLoad what="the challenge funnel (Challenge / ChallengePlay)" />
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-ink-200 bg-white">
              <table className="w-full text-xs">
                <tbody>
                  {(
                    [
                      ["Challenge links made", challenge.made, `from a quiz ${num(challenge.fromQuiz)} · from a mock ${num(challenge.fromMock)} · from a friend's challenge ${num(challenge.chained)}`],
                      ["People who made one", challenge.makers, "signed-in user, else analytics id, else browser key"],
                      ["Challenge page views", challenge.landingViews, `${num(challenge.landingVisitors)} identified visitors (a WhatsApp lander's first page is unidentified)`],
                      ["Scores friends sent", challenge.plays, `${num(challenge.players)} players · ${challenge.made ? (challenge.plays / challenge.made).toFixed(2) : "–"} per link made · a score kept private leaves no row`],
                      ["Signups tagged utm_campaign=challenge", challenge.signups, ""],
                    ] as [string, number, string][]
                  ).map(([label, n, detail]) => (
                    <tr key={label} className="border-t border-ink-100 first:border-0">
                      <td className="px-3 py-2 text-ink-800">{label}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{num(n)}</td>
                      <td className="px-3 py-2 text-ink-500">{detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <p className="mt-10 text-[11px] text-ink-500">
          Tables read: EmailTouch, AnalyticsEvent, User.signupReferrerHost, BotVisit, Challenge, ChallengePlay. No vendor script, no cache; every number is computed when this page is opened. Nothing here is shown publicly.
        </p>
      </section>
    </main>
  );
}

function PeriodSwitcher({ current }: { current: number }) {
  const opts = [7, 14, 30];
  return (
    <div className="flex gap-1">
      {opts.map((d) => (
        <Link
          key={d}
          href={`/admin/loops?days=${d}`}
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
      No rows in this window.
    </p>
  );
}

function CouldNotLoad({ what }: { what: string }) {
  return (
    <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
      Could not load {what} — the read failed (see server logs). Numbers in this block are not shown rather than shown as 0.
    </p>
  );
}
