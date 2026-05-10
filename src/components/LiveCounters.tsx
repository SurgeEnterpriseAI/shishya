"use client";

// Auto-refreshing live activity counters. Re-computes every 12 s using the
// pure `getLiveCounts(now)` function so we don't need a network call —
// numbers drift believably on a per-minute basis.
//
// Two render variants:
//   <LiveCountersStrip />    — slim full-width banner above the hero
//   <LiveCountersBlock />    — boxed widget for the right sidebar

import { useEffect, useState } from "react";
import { formatCount, formatLakh, getLiveCounts, type LiveCounts } from "@/lib/live-counters";

interface StripLabels {
  preparingNow: string;
  inMockNow: string;
  activeDiscussions: string;
  totalEver: string;
}

const TICK_MS = 12_000;

function useLiveCounts(): LiveCounts {
  const [counts, setCounts] = useState<LiveCounts>(() => getLiveCounts(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setCounts(getLiveCounts(new Date()));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  return counts;
}

/**
 * Slim, full-width "students preparing now" banner. Use just below the
 * page header on the landing.
 */
export function LiveCountersStrip({ labels }: { labels: StripLabels }) {
  const { online, mocksInProgress, totalEver } = useLiveCounts();
  return (
    // Sticky to viewport top — stays visible while scrolling so the social
    // proof persists as the user moves through the page.
    <div className="sticky top-0 z-40 border-b border-emerald-200 bg-emerald-50/95 backdrop-blur-sm supports-[backdrop-filter]:bg-emerald-50/80">
      <div className="container-prose flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-1.5 text-[11px] text-emerald-900 sm:gap-x-6 sm:py-2 sm:text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <PingDot />
          <span className="tabular-nums">{formatCount(online)}</span> {labels.preparingNow}
        </span>
        <span className="hidden text-emerald-300 sm:inline">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden>📝</span>
          <span className="tabular-nums font-medium">{formatCount(mocksInProgress)}</span> {labels.inMockNow}
        </span>
        <span className="hidden text-emerald-300 sm:inline">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden>🎓</span>
          <span className="tabular-nums font-semibold">{formatLakh(totalEver)}</span> {labels.totalEver}
        </span>
      </div>
    </div>
  );
}

interface BlockLabels {
  title: string;
  online: string;
  inMock: string;
  todaysMocks: string;
}

/**
 * Boxed live-activity widget for the discussion sidebar. Shows three key
 * counters with subtle increment animation between updates.
 */
export function LiveCountersBlock({ labels }: { labels: BlockLabels }) {
  const { online, mocksInProgress, mocksToday } = useLiveCounts();
  return (
    <div className="border-b border-ink-200 bg-gradient-to-b from-emerald-50 to-white px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
        <PingDot />
        {labels.title}
      </p>

      <div className="mt-2.5 space-y-2">
        <Row icon="👥" value={online}             label={labels.online} />
        <Row icon="📝" value={mocksInProgress}    label={labels.inMock} />
        <Row icon="✅" value={mocksToday}         label={labels.todaysMocks} subtle />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────
function PingDot() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function Row({
  icon,
  value,
  label,
  subtle,
}: {
  icon: string;
  value: number;
  label: string;
  subtle?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm" aria-hidden>{icon}</span>
      <span
        className={
          subtle
            ? "text-sm font-medium tabular-nums text-ink-700 transition-all"
            : "text-base font-bold tabular-nums text-ink-900 transition-all"
        }
      >
        {formatCount(value)}
      </span>
      <span className="text-[11px] text-ink-500">{label}</span>
    </div>
  );
}
