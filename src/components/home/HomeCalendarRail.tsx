"use client";

// The exam calendar as an in-flow panel (26 Sep 2026, "Doors").
//
// UpcomingExamsSidebar is hard-wired as a fixed desktop rail (top-[101px],
// w-80, hidden below lg). The home page now puts the founder's two
// saffron-edged rails INTO the flow — side by side at lg+, stacked on
// phones — so this island carries the same three tabs, rows, phase chips
// and honesty labels with a box the page sizes. Data and labels come from
// the page exactly as they did for the fixed rail (src/lib/home-strip-copy.ts
// calendarRailLabels); only the English default is imported here so the
// Hindi and Telugu copy stays out of the bundle.
//
//   Concluded  — exam days in the last 7 IST days (incl. today after 18:00).
//   Upcoming   — today (pre-18:00, 🔴 TODAY) + every future date, soonest first.
//   Past       — exam days 8–60 days back, newest first.
//
// All three lists are server-rendered; the tab switch only toggles CSS
// visibility, so crawlers index every row. "(expected)" / "was expected —
// not confirmed": an estimate is never shown as a date.

import { useState } from "react";
import Link from "next/link";
import { resolvePhase, PHASE_SLUG, istDayNumber } from "@/lib/exam-phase";
import type { ExamPhase } from "@prisma/client";
import { CALENDAR_RAIL_EN, type CalendarRailLabels } from "@/lib/calendar-rail-copy";
import type { CalendarBucket, UpcomingEvent } from "@/components/UpcomingExamsSidebar";

interface PhaseChip {
  icon: string;
  color: string;
  text: string;
  href: string;
  hasArticle: boolean;
}

const PHASE_CHIP_COLOR: Record<ExamPhase, { icon: string; color: string }> = {
  CHECKLIST: { icon: "📋", color: "bg-amber-100 text-amber-900" },
  LIVE: { icon: "🔴", color: "bg-rose-100 text-rose-900" },
  REACTIONS: { icon: "📊", color: "bg-sky-100 text-sky-900" },
};

const chipFallback = (L: CalendarRailLabels, phase: ExamPhase): string =>
  phase === "CHECKLIST" ? L.chipChecklist : phase === "LIVE" ? L.chipLive : L.chipReactions;

// Same rule as UpcomingExamsSidebar.phaseChipFor: only announced exam-day
// rows get a chip; the checklist deep-links always (built from stored
// facts), live / reactions only with a real article.
function phaseChipFor(event: UpcomingEvent, L: CalendarRailLabels): PhaseChip | null {
  if (!event.isExamDay) return null;
  const phase = resolvePhase(new Date(event.date));
  if (phase) {
    const meta = PHASE_CHIP_COLOR[phase];
    const snippet = event.phaseSnippet?.trim();
    const deepLink = Boolean(snippet) || phase === "CHECKLIST";
    return {
      icon: meta.icon,
      color: meta.color,
      text: snippet || chipFallback(L, phase),
      href: deepLink ? `/exams/${event.examCode}/${PHASE_SLUG[phase]}` : `/exams/${event.examCode}`,
      hasArticle: deepLink,
    };
  }
  const bucket = event.bucket ?? "upcoming";
  if (bucket !== "upcoming" && event.phaseSnippet?.trim()) {
    const meta = PHASE_CHIP_COLOR.REACTIONS;
    return {
      icon: meta.icon,
      color: meta.color,
      text: event.phaseSnippet.trim(),
      href: `/exams/${event.examCode}/reactions`,
      hasArticle: true,
    };
  }
  return null;
}

const tabsFor = (L: CalendarRailLabels): { key: CalendarBucket; label: string; empty: string }[] => [
  { key: "concluded", label: L.tabConcluded, empty: L.emptyConcluded },
  { key: "upcoming", label: L.tabUpcoming, empty: L.emptyUpcoming },
  { key: "past", label: L.tabPast, empty: L.emptyPast },
];

/** Compact "16 May" / "16 May 26" — the year only when it is not this year. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const day = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (d.getFullYear() === now.getFullYear()) return day;
  return `${day} ${String(d.getFullYear()).slice(2)}`;
}

export function HomeCalendarRail({
  events,
  defaultTab,
  labels,
  className = "",
}: {
  events: UpcomingEvent[];
  defaultTab?: CalendarBucket;
  /** Strings in the page's language; English when the page passes none. */
  labels?: CalendarRailLabels;
  /** The box: the page passes the rail frame (height, border, saffron edge). */
  className?: string;
}) {
  const L = labels ?? CALENDAR_RAIL_EN;
  const TABS = tabsFor(L);
  const buckets: Record<CalendarBucket, UpcomingEvent[]> = { concluded: [], upcoming: [], past: [] };
  for (const e of events) buckets[e.bucket ?? "upcoming"].push(e);

  // Nobody lands on an empty tab: the server's smart default only when it
  // has rows, else Upcoming.
  const [tab, setTab] = useState<CalendarBucket>(
    defaultTab && buckets[defaultTab].length > 0 ? defaultTab : "upcoming",
  );
  const todayIst = istDayNumber(new Date());

  return (
    <aside className={className} aria-label={L.heading}>
      <div className="border-b border-ink-200 bg-ink-50/40 px-4 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
            <span className="inline-block h-2 w-2 rounded-full bg-saffron-500" aria-hidden />
            {L.heading}
          </h2>
          {/* 26 Sep 2026: the fixed rail's "All" went to /exams, which
              redirects back to this page; the calendar is the destination. */}
          <Link
            href="/exam-calendar"
            className="shrink-0 rounded-md border border-ink-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-100"
          >
            {L.all}
          </Link>
        </div>
        <div role="tablist" aria-label={L.sections} className="-mb-px mt-2 flex gap-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            const n = buckets[t.key].length;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`home-cal-tab-${t.key}`}
                aria-selected={active}
                aria-controls={`home-cal-panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded-t-md border border-b-0 px-1 py-1.5 text-[11px] font-semibold transition-colors ${
                  active ? "border-ink-200 bg-white text-saffron-800" : "border-transparent bg-transparent text-ink-500 hover:text-ink-800"
                }`}
              >
                {t.label}
                {t.key === "concluded" && n > 0 && (
                  <span
                    className={`ml-1 rounded-full px-1.5 text-[10px] tabular-nums ${
                      active ? "bg-saffron-100 text-saffron-800" : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {TABS.map((t) => {
        const list = buckets[t.key];
        const active = tab === t.key;
        return (
          <div
            key={t.key}
            role="tabpanel"
            id={`home-cal-panel-${t.key}`}
            aria-labelledby={`home-cal-tab-${t.key}`}
            className={active ? "flex min-h-0 flex-1 flex-col" : "hidden"}
          >
            {list.length === 0 ? (
              <div className="flex-1 px-4 py-10 text-center">
                <p className="text-sm text-ink-500">{t.empty}</p>
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
                {list.map((e) => {
                  const chip = phaseChipFor(e, L);
                  const isToday = e.isExamDay && istDayNumber(new Date(e.date)) === todayIst;
                  return (
                    <li key={e.id} className={e.isExamDay ? "bg-saffron-50/40" : ""}>
                      <Link href={`/exams/${e.examCode}`} className="block px-4 pt-3 transition-colors hover:bg-saffron-50/50">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-ink-900">{e.examShort}</p>
                          <span
                            className={`shrink-0 text-[11px] font-medium tabular-nums ${
                              e.isExamDay ? "text-saffron-800" : "text-ink-600"
                            }`}
                          >
                            {formatDate(e.date)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-600">
                          {isToday && t.key === "upcoming" ? (
                            <span className="mr-1.5 rounded bg-rose-100 px-1 py-0.5 text-[10px] font-semibold text-rose-800">
                              🔴 {L.today}
                            </span>
                          ) : e.isExamDay ? (
                            <span className="mr-1.5 rounded bg-saffron-200 px-1 py-0.5 text-[10px] font-medium text-saffron-900">
                              {L.examDay}
                            </span>
                          ) : e.expectedExamDay ? (
                            <span className="mr-1.5 rounded bg-ink-100 px-1 py-0.5 text-[10px] font-medium text-ink-600">
                              {istDayNumber(new Date(e.date)) < todayIst ? L.wasExpected : L.expected}
                            </span>
                          ) : null}
                          {e.label}
                        </p>
                      </Link>
                      {chip && (
                        <Link
                          href={chip.href}
                          className={`mx-4 my-2 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[11px] leading-snug ${chip.color} hover:brightness-95`}
                        >
                          <span aria-hidden className="shrink-0 leading-snug">{chip.icon}</span>
                          <span className="flex-1 line-clamp-3 font-medium">{chip.text}</span>
                          {chip.hasArticle && <span aria-hidden className="shrink-0 leading-snug">→</span>}
                        </Link>
                      )}
                      {!chip && <div className="h-2" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      <div className="border-t border-ink-200 bg-white px-4 py-2.5 text-center">
        <Link href="/exam-calendar" className="text-xs font-medium text-saffron-700 hover:text-saffron-800">
          {L.browseAll}
        </Link>
      </div>
    </aside>
  );
}
