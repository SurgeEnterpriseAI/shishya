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

import { useState } from "react";
import Link from "next/link";
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

export function VacancyExplorerPanel({ data }: { data: VData }) {
  const [tab, setTab] = useState<Tab>("national");
  const [openState, setOpenState] = useState<string | null>(null);

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

      {/* Footer → the personalized finder */}
      <div className="border-t border-ink-200 bg-white px-4 py-3">
        <Link href="/find-your-exam" className="block rounded-lg bg-saffron-500 px-3 py-2 text-center text-xs font-bold text-white hover:bg-saffron-600">
          Which fit YOU? Find my exams →
        </Link>
      </div>
    </div>
  );
}

/** Desktop fixed left rail. */
export function VacancyExplorerSidebar({ data }: { data: VData }) {
  return (
    <aside
      className="fixed bottom-0 left-0 top-16 z-20 hidden w-80 flex-col border-r border-ink-200 bg-white shadow-sm lg:flex"
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
      <VacancyExplorerPanel data={data} />
    </aside>
  );
}
