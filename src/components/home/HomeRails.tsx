// The founder's two orange-edged rails, moved into the flow (26 Sep 2026):
// live government vacancies (VacancyExplorerPanel, already in-flow-safe) and
// the exam calendar (HomeCalendarRail). Side by side at lg+, stacked on
// phones; each 26rem tall with internal scroll (22rem left the vacancy
// explorer one visible row under its total banner, tabs and footer); the
// 4 px saffron-500 edge kept. Server component; the two islands inside
// carry their own state and the explorer keeps its sign-in nudge beacon.

import Link from "next/link";
import { VacancyExplorerPanel } from "@/components/VacancyExplorer";
import type { VacancyExplorer } from "@/lib/vacancy-explorer";
import type { CalendarBucket, UpcomingEvent } from "@/components/UpcomingExamsSidebar";
import type { CalendarRailLabels } from "@/lib/calendar-rail-copy";
import type { HomeDoorsCopy } from "@/lib/home-doors-copy";
import { HomeCalendarRail } from "./HomeCalendarRail";

const RAIL =
  "flex h-[26rem] flex-col overflow-hidden rounded-xl border border-ink-200 border-l-4 border-l-saffron-500 bg-white shadow-sm";

export function HomeRails({
  vacancy,
  signedIn,
  events,
  defaultTab,
  labels,
  copy,
}: {
  vacancy: VacancyExplorer;
  signedIn: boolean;
  events: UpcomingEvent[];
  defaultTab: CalendarBucket;
  labels: CalendarRailLabels;
  copy: HomeDoorsCopy;
}) {
  // A DB blip serves the empty vacancy shape for one request: hide that
  // rail (the panel returns null too) rather than a box of zeros.
  const showVacancies = vacancy.examCount > 0;
  return (
    <section
      aria-label={`${copy.rails.vacancies} · ${labels.heading}`}
      className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5"
    >
      {showVacancies && (
        <div className={RAIL}>
          <div className="flex items-center justify-between gap-2 border-b border-ink-200 bg-ink-50/40 px-4 py-2.5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              {copy.rails.vacancies}
            </h2>
            <Link
              href="/find-your-exam"
              className="shrink-0 rounded-md border border-ink-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-100"
            >
              {copy.rails.findMine}
            </Link>
          </div>
          <VacancyExplorerPanel data={vacancy} signedIn={signedIn} />
        </div>
      )}
      <HomeCalendarRail
        events={events}
        defaultTab={defaultTab}
        labels={labels}
        className={`${RAIL}${showVacancies ? "" : " lg:col-span-2"}`}
      />
    </section>
  );
}
