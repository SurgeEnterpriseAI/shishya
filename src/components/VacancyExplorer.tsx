"use client";

// Live Government Vacancies explorer — the homepage widget that lets any
// visitor see, on any day, how many government vacancies exist:
//   • National   — all-India exams (SSC, RRB, IBPS, UPSC …), each clickable
//   • By State   — pick a state → its exams + vacancies expand inline
//   • Category   — indicative reservation-wise split of the total
// Every exam row deep-links to its hub → sign up → personalised funnel.
//
// All data is server-loaded and passed in; the drill-down is pure client
// state (no fetch), so the whole thing is crawlable and instant.
//
// 2 Oct 2026 (founder: every sign-in call is the white Google button, with
// a line saying why): the footer's green bar "Prepping for one of these?
// Sign in free →" is now ONE plain line — that question and what an account
// keeps ("Prepping for one of these? Your tests and tutor chats are saved.",
// signUpReason "vacancies": the general words, because the link returns to
// /dashboard, not to one exam) — and the one shared "Sign up with Google"
// button under it. The line is the button's reason (explain="own"): no
// separate caption, because this panel sits in a fixed-height rail on the
// home page (src/components/home/HomeRails.tsx) and every line of the
// footer is taken from the scrolling list above it (review, same day: with
// a line, a button, a caption and an outlined link the footer was about
// 156 px and one exam row was left in view). The sign-up is FIRST in the
// footer; "Find my exams" follows it as a small text link (it was a filled
// saffron bar above the sign-in). Nothing was removed and both links go
// where they went. `locale`: the page's language — the home page's /hi and
// /te twins get the line and the button in Hindi and Telugu, like the other
// sign-up button on that page. Counting: the button's own "signin-click"
// under door id "home-vacancies" (it was "link"), and the older
// "explorer-nudge-click" still fires on the same click.

import { useState } from "react";
import Link from "next/link";
import { SignUpButton } from "@/components/SignUpButton";
import { signUpReason } from "@/lib/signup-cta-copy";
import type { VacancyExplorer as VData, VacExam } from "@/lib/vacancy-explorer";

const fmt = (n: number) => n.toLocaleString("en-IN");

function ExamRow({ e }: { e: VacExam }) {
  return (
    <Link
      href={`/exams/${e.code}`}
      className="flex items-center justify-between gap-2 px-4 py-2 transition-colors hover:bg-saffron-50/60"
    >
      <span className="truncate text-sm font-medium text-ink-800">{e.short}</span>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-saffron-700">
        {e.vac > 0 ? fmt(e.vac) : "—"}
      </span>
    </Link>
  );
}

type Tab = "national" | "state" | "category";

// Click beacon for the explorer's anon signup nudge. Impressions are NOT
// tracked here: the desktop rail and the mobile panel both mount (one is
// CSS-hidden), which would double-count — clicks can only come from the
// visible one, so clicks are the honest metric.
function nudgeClick() {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: typeof location !== "undefined" ? location.pathname : "/",
          props: { cta: "explorer-nudge-click", surface: "explorer-nudge" },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* best-effort */
  }
}

export function VacancyExplorerPanel({ data, signedIn, locale }: { data: VData; signedIn?: boolean; locale?: string | null }) {
  const [tab, setTab] = useState<Tab>("national");
  const [openState, setOpenState] = useState<string | null>(null);

  // A DB blip serves the empty fallback shape for one request — hide
  // the widget entirely rather than show "0 GOVT EXAMS · 0 vacancies".
  if (data.examCount === 0) return null;

  const TABS: { key: Tab; label: string }[] = [
    { key: "national", label: "National" },
    { key: "state", label: "By state" },
    { key: "category", label: "Category" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Grand total banner */}
      <div className="border-b border-ink-100 bg-gradient-to-r from-saffron-50 to-amber-50 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
          Live vacancies · {data.examCount} govt exams
        </p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-ink-900">
          {fmt(data.grandTotal)}
          <span className="ml-1 text-xs font-medium text-ink-500">≈ {data.totalLakh} lakh / yr</span>
        </p>
        {/* The explorer shows the numbers; the map shows the LANDSCAPE.
            Natural next click for anyone studying this widget. */}
        <Link
          href="/jobs-map"
          className="mt-1 inline-block text-[11px] font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
        >
          🗺️ See India&apos;s Government Jobs Map →
        </Link>
        {data.updatedAt && (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Updated {new Date(data.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex gap-1 border-b border-ink-200 px-2 pt-2">
        {TABS.map((tb) => {
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tb.key)}
              className={`flex-1 rounded-t-md border border-b-0 px-1 py-1.5 text-[11px] font-semibold transition-colors ${
                active ? "border-ink-200 bg-white text-saffron-800" : "border-transparent text-ink-500 hover:text-ink-800"
              }`}
            >
              {tb.label}
            </button>
          );
        })}
      </div>

      {/* National */}
      {tab === "national" && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="px-4 pb-1 pt-3 text-[11px] text-ink-500">
            All-India exams · {fmt(data.national.total)} vacancies
          </p>
          <ul className="divide-y divide-ink-100">
            {data.national.exams.map((e) => (
              <li key={e.code}><ExamRow e={e} /></li>
            ))}
          </ul>
        </div>
      )}

      {/* By state */}
      {tab === "state" && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ul className="divide-y divide-ink-100">
            {data.states.map((s) => {
              const open = openState === s.code;
              return (
                <li key={s.code}>
                  <button
                    type="button"
                    onClick={() => setOpenState(open ? null : s.code)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-saffron-50/50"
                    aria-expanded={open}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className={`text-[10px] text-ink-400 transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
                      <span className="truncate text-sm font-medium text-ink-800">{s.name}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-saffron-700">{fmt(s.total)}</span>
                  </button>
                  {open && (
                    <ul className="bg-ink-50/40">
                      {s.exams.map((e) => (
                        <li key={e.code} className="border-t border-ink-100/70">
                          <div className="pl-3">
                            <ExamRow e={e} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Category */}
      {tab === "category" && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ul className="divide-y divide-ink-100">
            {data.categories.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <span className="text-sm font-medium text-ink-800">
                  {c.label} <span className="text-[10px] text-ink-400">{Math.round(c.pct * 100)}%</span>
                </span>
                <span className="text-xs font-semibold tabular-nums text-saffron-700">≈ {fmt(c.count)}</span>
              </li>
            ))}
          </ul>
          <p className="px-4 py-3 text-[10px] leading-snug text-ink-400">
            Indicative split using the standard reservation roster — actual category-wise vacancies
            vary by exam and notification.
          </p>
        </div>
      )}

      {/* Footer → the personalized finder (+ anon signup nudge) */}
      <div className="border-t border-ink-200 bg-white px-4 py-3">
        {signedIn === false && (
          <div className="mb-1">
            <p data-su-reason className="text-center text-xs text-ink-700">{signUpReason(locale, "vacancies")}</p>
            <SignUpButton
              href={`/login?callbackUrl=${encodeURIComponent("/dashboard")}&from=home-vacancies`}
              surface="home-vacancies"
              locale={locale}
              explain="own"
              side="top"
              block
              center
              className="mt-1.5"
              onSignInClick={nudgeClick}
            />
          </div>
        )}
        <Link
          href="/find-your-exam"
          className={
            signedIn === false
              ? "block py-1 text-center text-xs font-semibold text-saffron-700 underline-offset-2 hover:underline"
              : "block rounded-lg bg-saffron-500 px-3 py-2 text-center text-xs font-bold text-white hover:bg-saffron-600"
          }
        >
          Which fit YOU? Find my exams →
        </Link>
      </div>
    </div>
  );
}

/** Desktop fixed left rail. */
export function VacancyExplorerSidebar({ data, signedIn, locale }: { data: VData; signedIn?: boolean; locale?: string | null }) {
  // Same empty-fallback guard as the panel — hide the whole rail
  // (header included) rather than a "Government vacancies" box of zeros.
  if (data.examCount === 0) return null;
  return (
    <aside
      className="fixed bottom-0 left-0 top-[101px] z-20 hidden w-80 flex-col border-r-4 border-saffron-500 bg-white shadow-sm lg:flex"
      aria-label="Live government vacancies"
    >
      <div className="flex items-center justify-between gap-2 border-b border-ink-200 bg-ink-50/40 px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          Government vacancies
        </h3>
        <Link href="/find-your-exam" className="shrink-0 rounded-md border border-ink-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-100">
          Find mine
        </Link>
      </div>
      <VacancyExplorerPanel data={data} signedIn={signedIn} locale={locale} />
    </aside>
  );
}
