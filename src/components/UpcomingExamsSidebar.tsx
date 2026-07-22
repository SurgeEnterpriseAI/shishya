"use client";

// Left-side sticky rail: the exam calendar, split into three tabs.
//
//   Concluded  — exam days in the last 7 IST days (incl. today after
//                18:00 IST). The answer-key / expected-cutoff /
//                student-verdict window — the hottest content on the
//                site right after an exam runs.
//   Upcoming   — today (pre-18:00 IST, 🔴 TODAY badge) + all future
//                dates, soonest first. Includes non-exam events
//                (admit card, application windows).
//   Past       — exam days 8–60 days back, newest first, each linking
//                to its verdict/cutoff analysis when one exists.
//
// SMART DEFAULT: the server passes defaultTab="concluded" only when an
// exam actually concluded in the last ~3 days — otherwise "upcoming".
// Nobody ever lands on an empty tab.
//
// SEO/AEO: ALL three lists are server-rendered into the HTML; the tab
// switch only toggles CSS visibility. Crawlers and AI engines index
// every row regardless of which tab a human sees first.
//
// PHASE CHIPS — exam-day rows near their date surface the matching
// phase article (📋 Checklist / 🔴 Live / 📊 Reactions) via
// src/lib/exam-phase.ts, shared with the refresh-phase-articles cron.
// Past-window rows keep a Reactions chip whenever the article exists.

import { useState } from "react";
import Link from "next/link";
import { resolvePhase, PHASE_SLUG, istDayNumber } from "@/lib/exam-phase";
import type { ExamPhase } from "@prisma/client";

export type CalendarBucket = "concluded" | "upcoming" | "past";

export interface UpcomingEvent {
  id: string;
  examCode: string;
  examShort: string;
  date: string; // ISO
  label: string;
  isExamDay: boolean;
  /**
   * 1-2 sentence preview from the matching phase article, server-
   * resolved alongside the phase. When present, the sidebar renders
   * this in place of the plain "Live" / "Checklist" / "Reactions"
   * chip text so the student sees the article's hook before clicking.
   * Null if no article exists yet (cron hasn't generated one).
   */
  phaseSnippet?: string | null;
  /**
   * Which calendar tab this event belongs to, classified server-side
   * with IST day math. Optional so the static fallback list (which
   * only carries future dates) keeps working — absent means upcoming.
   */
  bucket?: CalendarBucket;
}

interface PhaseChip {
  phase: ExamPhase;
  slug: "checklist" | "live" | "reactions";
  icon: string;
  color: string;
  /** Chip body — article snippet when available, else static teaser. */
  text: string;
  /** Deep-link to the phase article ONLY when one exists; otherwise
   *  the exam overview so the click never dead-ends. */
  href: string;
  hasArticle: boolean;
}

const PHASE_CHIP_META: Record<ExamPhase, { icon: string; color: string; fallback: string }> = {
  CHECKLIST: {
    icon: "📋",
    color: "bg-amber-100 text-amber-900",
    fallback: "Last-minute revision sheet — what to carry, topics to skim, time-table.",
  },
  LIVE: {
    icon: "🔴",
    color: "bg-rose-100 text-rose-900",
    fallback: "Live shift-by-shift difficulty + first answer-key trackers as they release.",
  },
  REACTIONS: {
    icon: "📊",
    color: "bg-sky-100 text-sky-900",
    fallback: "Student verdict, expected cutoff, answer-key analysis — refreshed every 2 h.",
  },
};

function phaseChipFor(event: UpcomingEvent): PhaseChip | null {
  // Only flag actual exam-day rows. "Application opens" etc. shouldn't
  // get phase chips even if they fall close to today's date.
  if (!event.isExamDay) return null;
  const phase = resolvePhase(new Date(event.date));
  if (phase) {
    const meta = PHASE_CHIP_META[phase];
    const snippet = event.phaseSnippet?.trim();
    const hasArticle = Boolean(snippet);
    return {
      phase,
      slug: PHASE_SLUG[phase],
      icon: meta.icon,
      color: meta.color,
      text: snippet || meta.fallback,
      href: hasArticle
        ? `/exams/${event.examCode}/${PHASE_SLUG[phase]}`
        : `/exams/${event.examCode}`,
      hasArticle,
    };
  }
  // Outside the live phase windows (concluded day 4-7, or the Past
  // tab): still surface the Reactions article when one exists — the
  // verdict/cutoff analysis stays valuable long after the 3-day window.
  const bucket = event.bucket ?? "upcoming";
  if (bucket !== "upcoming" && event.phaseSnippet?.trim()) {
    const meta = PHASE_CHIP_META.REACTIONS;
    return {
      phase: "REACTIONS",
      slug: "reactions",
      icon: meta.icon,
      color: meta.color,
      text: event.phaseSnippet.trim(),
      href: `/exams/${event.examCode}/reactions`,
      hasArticle: true,
    };
  }
  return null;
}

const TABS: { key: CalendarBucket; label: string; empty: string }[] = [
  { key: "concluded", label: "Concluded", empty: "No exams concluded in the last 7 days." },
  { key: "upcoming", label: "Upcoming", empty: "No upcoming dates announced." },
  { key: "past", label: "Past", empty: "Older exam analyses will appear here." },
];

export function UpcomingExamsSidebar({
  events,
  defaultTab,
  side = "left",
}: {
  events: UpcomingEvent[];
  defaultTab?: CalendarBucket;
  /** Which fixed rail to anchor to. "right" flips the border side. */
  side?: "left" | "right";
}) {
  const buckets: Record<CalendarBucket, UpcomingEvent[]> = { concluded: [], upcoming: [], past: [] };
  for (const e of events) buckets[e.bucket ?? "upcoming"].push(e);

  const [tab, setTab] = useState<CalendarBucket>(
    defaultTab && buckets[defaultTab].length > 0 ? defaultTab : "upcoming",
  );

  const todayIst = istDayNumber(new Date());

  return (
    <aside
      className={`fixed bottom-0 top-16 z-20 hidden w-80 flex-col border-ink-200 bg-white shadow-sm lg:flex ${
        side === "right" ? "right-0 border-l" : "left-0 border-r"
      }`}
      aria-label="Exam calendar"
    >
      <div className="border-b border-ink-200 bg-ink-50/40 px-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
            <span className="inline-block h-2 w-2 rounded-full bg-saffron-500" aria-hidden />
            Exam calendar
          </h3>
          <Link
            href="/exams"
            className="shrink-0 rounded-md border border-ink-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-100"
          >
            All
          </Link>
        </div>
        <div role="tablist" aria-label="Exam calendar sections" className="-mb-px mt-2 flex gap-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            const n = buckets[t.key].length;
            return (
              <button
                key={t.key}
                role="tab"
                id={`cal-tab-${t.key}`}
                aria-selected={active}
                aria-controls={`cal-panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded-t-md border border-b-0 px-1 py-1.5 text-[11px] font-semibold transition-colors ${
                  active
                    ? "border-ink-200 bg-white text-saffron-800"
                    : "border-transparent bg-transparent text-ink-500 hover:text-ink-800"
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
            id={`cal-panel-${t.key}`}
            aria-labelledby={`cal-tab-${t.key}`}
            className={active ? "flex min-h-0 flex-1 flex-col" : "hidden"}
          >
            {list.length === 0 ? (
              <div className="flex-1 px-4 py-10 text-center">
                <p className="text-sm text-ink-500">{t.empty}</p>
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
                {list.map((e) => {
                  const chip = phaseChipFor(e);
                  const isToday = e.isExamDay && istDayNumber(new Date(e.date)) === todayIst;
                  return (
                    <li key={e.id} className={e.isExamDay ? "bg-saffron-50/40" : ""}>
                      {/* Whole row clickable; the phase chip below is its
                          own <Link> to the phase article. */}
                      <Link
                        href={`/exams/${e.examCode}`}
                        className="block px-4 pt-3 transition-colors hover:bg-saffron-50/50"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-ink-900">
                            {e.examShort}
                          </p>
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
                              🔴 TODAY
                            </span>
                          ) : e.isExamDay ? (
                            <span className="mr-1.5 rounded bg-saffron-200 px-1 py-0.5 text-[10px] font-medium text-saffron-900">
                              EXAM DAY
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
                          {chip.hasArticle && (
                            <span aria-hidden className="shrink-0 leading-snug">→</span>
                          )}
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

      <div className="border-t border-ink-200 bg-white px-4 py-3 text-center">
        <Link
          href="/exams"
          className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
        >
          Browse all exam dates →
        </Link>
      </div>
    </aside>
  );
}

/** Compact "16 May" / "16 May 26" style. Year only shown if not the current year. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const day = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (d.getFullYear() === now.getFullYear()) return day;
  return `${day} ${String(d.getFullYear()).slice(2)}`;
}
