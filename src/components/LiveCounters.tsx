"use client";

// Auto-refreshing live activity counters.
//
// Numbers come from /api/live-counts which queries the real DB and adds
// a +1,000 synthetic floor to "online" + "totalEver" so day-1 visitors
// don't see "3 students helped till now". Real numbers replace the
// floor's importance as the platform grows.
//
// Polls every 30s (API caches for 30s on the edge → roughly one real DB
// hit per 30s regardless of concurrent visitors).
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

const TICK_MS = 30_000;

// Stable initial values used for BOTH the server render and the very
// first client paint. The lazy initializer used to call
// `getLiveCounts(new Date())` which is time-dependent — server and
// client almost always landed on different minute buckets and React
// 19 then rejected the hydration with a "client-side exception"
// (the exact error students reported when opening shishya.in from
// WhatsApp shares). Using a fixed seed here makes server + client
// agree byte-for-byte on the initial paint; useEffect overlays the
// real /api/live-counts numbers within ~200 ms after mount.
const SSR_SAFE_INITIAL: LiveCounts = {
  online: 1_100,
  mocksInProgress: 5,
  mocksToday: 0,
  activeDiscussions: 24,
  totalEver: 1_000,
};

function useLiveCounts(): LiveCounts {
  const [counts, setCounts] = useState<LiveCounts>(SSR_SAFE_INITIAL);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/live-counts", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<LiveCounts>;
        if (cancelled) return;
        setCounts((prev) => ({
          online: data.online ?? prev.online,
          mocksInProgress: data.mocksInProgress ?? prev.mocksInProgress,
          mocksToday: data.mocksToday ?? prev.mocksToday,
          activeDiscussions: data.activeDiscussions ?? prev.activeDiscussions,
          totalEver: data.totalEver ?? prev.totalEver,
        }));
      } catch {
        /* network blip — keep whatever we last had */
      }
    }
    tick();
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void tick();
    }, TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
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
    //
    // lg:mx-80 — clear the two 320px side rails on lg+ so the strip's
    // green background ends exactly where the rails begin. Without
    // this the strip (z-40) overlays the rails (z-20) and the rail
    // headers (Upcoming on left, Discussions on right) get covered.
    <div className="sticky top-0 z-40 border-b border-emerald-200 bg-emerald-50/95 backdrop-blur-sm supports-[backdrop-filter]:bg-emerald-50/80 lg:mx-80">
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
