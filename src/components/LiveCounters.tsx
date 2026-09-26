"use client";

// Auto-refreshing real-activity counters.
//
// 27 May 2026: synthetic floor REMOVED. Numbers come from /api/live-counts
// which queries the DB directly. Real numbers only — no inflation,
// no jitter, no padding. Trust > optics.
//
// Polls every 30 s (API caches 30 s on the edge → roughly one real DB
// hit per 30 s regardless of concurrent visitors).
//
// 26 Sep 2026: the whole-platform strip (founder brief: "keep as many
// stats as possible — AI tutor usage, sign-ups, everything across the
// website; say 'mock exams taken'; a plain word for the people counter").
//   • No typed number anywhere any more. Until the first /api/live-counts
//     reply lands the strip renders its shell (the Live dot, height
//     reserved) — the old SSR placeholders ("370 visited …") were typed
//     values, and a failed API left them on screen.
//   • Every label describes exactly what LIVE_COUNT_DEFINITIONS
//     (src/lib/live-counts-server.ts) says the field counts; the people
//     counter reads "learners" (founder's word, 26 Sep 2026).
//   • Labels come from the caller (i18n live.*) with English defaults;
//     the pre-26-Sep label fields are accepted but no longer rendered
//     (/for/[persona] passed present-tense words for all-time counts).
//   • Layout (26 Sep 2026 review: the first cut wrapped to 3–7 lines —
//     113 px of sticky band on a desktop, 193 px at 640 px, 3 lines on
//     phones — and the shell was shorter than the loaded strip, so the
//     hero jumped when the numbers landed). Height is now fixed by
//     construction: phones get a 2 × 2 grid of four counters (always two
//     lines, 49 px band); from sm, exactly two single-line rows (57 px
//     band) — a row wider than the screen scrolls sideways inside its
//     line, it never wraps. The shell before the first reply is the same
//     frame with the Live dot only, so nothing below it moves.
//   • A failed poll (the API answers 503) changes nothing on screen: the
//     last-known numbers stay, or the shell before the first reply.
//   • The item table, labels and poll merge are pure functions in
//     ./live-counters-strip.ts (unit-tested there, with the measured
//     width budget).
//
// Two render variants:
//   <LiveCountersStrip />    slim full-width banner under the header
//   <LiveCountersBlock />    boxed widget for the discussion sidebar

import { useEffect, useState } from "react";
import { formatCount } from "@/lib/live-counters";
// Type-only: erased at build, so the client bundle never sees Prisma.
import type { LiveCounts } from "@/lib/live-counts-server";
import { buildStripItems, mergeCounts, type StripItem, type StripLabels } from "./live-counters-strip";

export type { StripLabels } from "./live-counters-strip";

const TICK_MS = 30_000;

function useLiveCounts(): LiveCounts | null {
  // null until the first reply: nothing typed is ever shown.
  const [counts, setCounts] = useState<LiveCounts | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/live-counts", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<LiveCounts>;
        if (cancelled) return;
        setCounts((prev) => mergeCounts(prev, data));
      } catch {
        /* network blip — keep last-known */
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
 * Slim, full-width "real platform activity" banner. Sits just below the
 * page header on the landing page.
 *
 * From sm it reads as two lines, e.g.
 *   "● LIVE  9 active now · 14,460 learners · 5,230 mock exams taken +72 today ·
 *    4,159 AI tutor questions +54 today · 1,900 signed up +170 this week ·
 *    86,657 page views +945 today"
 *   "72,907 questions answered +888 today · 84 live tests taken ·
 *    1,795 exam goals set · 180 exams · 34,700 practice questions ·
 *    4,350 topic notes · 5 school chapters · 19 languages"
 * and on phones as a 2 × 2 grid: learners · mock exams taken /
 * AI tutor questions · signed up.
 *
 * Strip is sticky so the social proof persists as the visitor scrolls.
 */
export function LiveCountersStrip({
  labels,
  sticky = true,
}: {
  labels: StripLabels;
  /** Homepage passes false and provides its own sticky wrapper. */
  sticky?: boolean;
}) {
  const counts = useLiveCounts();
  const wrapper = `${sticky ? "sticky top-0 z-40 " : ""}pointer-events-auto border-b border-emerald-200 bg-emerald-50/95 backdrop-blur-sm supports-[backdrop-filter]:bg-emerald-50/80`;

  // No items until the first reply (or while it keeps failing): the same
  // fixed-height frame renders with the Live dot only.
  const items = counts ? buildStripItems(counts, labels) : [];
  const phone = items.filter((it) => it.phone);
  const row1 = items.filter((it) => it.row === 1);
  const row2 = items.filter((it) => it.row === 2);

  return (
    <div className={wrapper} data-live-strip={counts ? "live" : "shell"}>
      <div className="px-4 py-1.5 text-[11px] text-emerald-900 sm:px-6 sm:text-xs lg:px-8">
        {/* Phones: PHONE_KEYS in a 2 × 2 grid — always exactly two lines. */}
        <div className="grid h-9 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] grid-rows-2 items-center gap-x-3 sm:hidden">
          {phone.length === 0 ? (
            <span className="col-span-2 row-span-2 flex justify-center">
              <PingDot />
            </span>
          ) : (
            phone.map((it, i) => <PhoneCell key={it.key} item={it} pulse={i === 0} />)
          )}
        </div>
        {/* sm+: exactly two single-line rows. */}
        <div className="hidden sm:block">
          <StripRow>
            <LivePulse />
            {row1.map((it, i) => (
              <Counter key={it.key} item={it} last={i === row1.length - 1} />
            ))}
          </StripRow>
          <StripRow muted>
            {row2.map((it, i) => (
              <Counter key={it.key} item={it} last={i === row2.length - 1} />
            ))}
          </StripRow>
        </div>
      </div>
    </div>
  );
}

// A row never wraps: centred when it fits, scrolls sideways inside its
// own line when the screen is narrower (scrollbar hidden, edges faded so
// the cut reads as "more this way").
const ROW_SCROLL_STYLE = {
  scrollbarWidth: "none",
  maskImage: "linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 12px), transparent)",
  WebkitMaskImage: "linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 12px), transparent)",
} as const;

function StripRow({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      className={`h-[22px] overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden${muted ? " text-emerald-800" : ""}`}
      style={ROW_SCROLL_STYLE}
    >
      <div className="mx-auto flex h-full w-max items-center gap-x-4 whitespace-nowrap">{children}</div>
    </div>
  );
}

function Counter({ item, last }: { item: StripItem; last: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5" data-counter={item.key}>
      <span className={`tabular-nums ${item.key === "totalSignups" ? "font-semibold" : "font-medium"}`}>
        {formatCount(item.value)}
      </span>{" "}
      {item.label}
      {item.pill && (
        <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
          {item.pill}
        </span>
      )}
      {!last && (
        <span className="pl-1 text-emerald-300" aria-hidden>
          ·
        </span>
      )}
    </span>
  );
}

function PhoneCell({ item, pulse }: { item: StripItem; pulse: boolean }) {
  return (
    <span className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap" data-counter={item.key}>
      {pulse && <PingDot />}
      <span className={`tabular-nums ${item.key === "totalSignups" ? "font-semibold" : "font-medium"}`}>
        {formatCount(item.value)}
      </span>{" "}
      {item.label}
    </span>
  );
}

function LivePulse() {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <PingDot />
      <span className="text-[10px] uppercase tracking-wider text-emerald-700">Live</span>
    </span>
  );
}

interface BlockLabels {
  /** "Real activity on Shishya" title (i18n key live.block.title) */
  title: string;
  /** "learners" (i18n key live.block.online) */
  online: string;
  /** "mock exams taken" (i18n key live.block.inMock) */
  inMock: string;
  /** "submitted today" (i18n key live.block.todaysMocks) */
  todaysMocks: string;
}

/**
 * Sidebar block for the discussion drawer. Shows the same key numbers as
 * the strip plus the live-today numbers. Renders nothing until the first
 * reply (no typed placeholders).
 *
 * Order is intentional: lead with visitor reach, then engagement
 * (mocks), then signup conversion, with momentum + active-now as
 * supporting context.
 */
export function LiveCountersBlock({ labels }: { labels: BlockLabels }) {
  const counts = useLiveCounts();
  if (!counts) return null;
  const { uniqueVisitors, mocksTaken, totalSignups, signupsLast7Days, activeNow, mocksToday } = counts;
  return (
    <div className="border-b border-ink-200 bg-gradient-to-b from-emerald-50 to-white px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
        <PingDot />
        {labels.title}
      </p>

      <div className="mt-2.5 space-y-2">
        <Row icon="👥" value={uniqueVisitors} label={labels.online} />
        <Row icon="📝" value={mocksTaken} label={labels.inMock} />
        <Row
          icon="🎓"
          value={totalSignups}
          label={"signed up"}
          suffix={signupsLast7Days > 0 ? `+${signupsLast7Days} this week` : undefined}
        />
        {(mocksToday > 0 || activeNow > 0) && (
          <div className="mt-1 border-t border-ink-100 pt-2 text-[10px] text-ink-500">
            {activeNow > 0 && (
              <span className="mr-2">
                <span className="tabular-nums font-medium text-emerald-700">
                  {activeNow}
                </span>{" "}
                active now
              </span>
            )}
            {mocksToday > 0 && (
              <span>
                <span className="tabular-nums font-medium text-ink-700">
                  {mocksToday}
                </span>{" "}
                {labels.todaysMocks}
              </span>
            )}
          </div>
        )}
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
  suffix,
}: {
  icon: string;
  value: number;
  label: string;
  subtle?: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm" aria-hidden>
        {icon}
      </span>
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
      {suffix && (
        <span className="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
          {suffix}
        </span>
      )}
    </div>
  );
}
