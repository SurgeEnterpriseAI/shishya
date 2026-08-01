// "Live tests today" awareness banner — server-rendered, zero JS.
//
// Shows on the homepage and dashboard whenever All-India Live Tests
// are open (or opening within hours). THE Sunday ritual needs a front
// door: before this banner the only paths to /live-test were buried
// on exam hubs and results pages.

import Link from "next/link";
import type { LiveTestToday } from "@/lib/live-test-today";

export function LiveTestTodayBanner({ data }: { data: LiveTestToday | null }) {
  if (!data) return null;
  const shown = data.exams.slice(0, 6);
  const more = data.exams.length - shown.length;
  return (
    <Link
      href="/live-test"
      className="group mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 px-4 py-3 shadow-sm transition-colors hover:border-rose-400"
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" />
        </span>
        {data.openNow ? "Live now" : "Today"}
      </span>
      <span className="text-sm font-bold text-ink-900">
        {data.count} All-India Live Test{data.count > 1 ? "s" : ""} today — free, with your All-India rank on submission
      </span>
      <span className="hidden text-xs text-ink-600 sm:inline">
        {shown.map((e) => e.short).join(" · ")}
        {more > 0 ? ` +${more} more` : ""} · open till {data.tillIst}
      </span>
      <span className="ml-auto shrink-0 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors group-hover:bg-rose-700">
        Enter the test hall →
      </span>
    </Link>
  );
}
