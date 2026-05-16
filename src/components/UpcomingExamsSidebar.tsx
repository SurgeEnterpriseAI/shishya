// Left-side sticky rail showing the next ~30 exam events across all
// 163 exams, ordered chronologically. Mirrors the right-side
// DiscussionsSidebar layout: fixed panel on lg+, slide-in drawer with
// FAB on smaller screens. Pure server-side data (no polling — exam
// dates change at most once per day via the refresh-exam-data cron).

import Link from "next/link";

export interface UpcomingEvent {
  id: string;
  examCode: string;
  examShort: string;
  date: string; // ISO
  label: string;
  isExamDay: boolean;
}

export function UpcomingExamsSidebar({ events }: { events: UpcomingEvent[] }) {
  return (
    <aside
      className="fixed bottom-0 left-0 top-16 z-20 hidden w-80 flex-col border-r border-ink-200 bg-white shadow-sm lg:flex"
      aria-label="Upcoming exam dates"
    >
      <div className="flex items-start justify-between gap-2 border-b border-ink-200 bg-ink-50/40 px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
            <span className="inline-block h-2 w-2 rounded-full bg-saffron-500" aria-hidden />
            Upcoming
          </p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-ink-900">
            Exam calendar
          </h3>
        </div>
        <Link
          href="/exams"
          className="shrink-0 rounded-md border border-ink-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-100"
        >
          All
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 px-4 py-10 text-center">
          <p className="text-sm text-ink-500">No upcoming dates announced.</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/exams/${e.examCode}`}
                className={`block px-4 py-3 transition-colors hover:bg-saffron-50/50 ${
                  e.isExamDay ? "bg-saffron-50/40" : ""
                }`}
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
                  {e.isExamDay && (
                    <span className="mr-1.5 rounded bg-saffron-200 px-1 py-0.5 text-[10px] font-medium text-saffron-900">
                      EXAM DAY
                    </span>
                  )}
                  {e.label}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

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
