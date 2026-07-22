// StreakCard — the habit anchor, made prominent.
//
// The old streak UI was a tiny chip hidden until current > 0, so the
// one-and-done users (85% of signups, the exact cohort we're trying to
// retain) never saw it. This card is always visible and framed to pull:
//   • a 7-day dot calendar — you SEE your run and the gap you'd leave
//   • loss-aversion copy when a live streak is at risk today
//   • a milestone race ("2 days to your 7-day badge")
//   • a warm zero-state that invites the first day rather than hiding
//
// Server component — pure render from the StudyStreak read-model. The
// action (start today's 5) lives in the adjacent DailyFiveCard.

import type { StudyStreak } from "@/lib/db/streak";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export function StreakCard({
  streak,
  todayDow,
}: {
  streak: StudyStreak;
  /** 0-6 (Sun-Sat) IST day-of-week for "today", for labelling the dots. */
  todayDow: number;
}) {
  const { current, best, activeToday, last7, nextMilestone, toNextMilestone, hitMilestoneToday } = streak;
  const atRisk = current > 0 && !activeToday; // studied through yesterday, not yet today

  // Headline + subline vary by state so the card always has a pull.
  let headline: string;
  let sub: string;
  let tone: "fire" | "risk" | "start";
  if (hitMilestoneToday) {
    headline = `🎉 ${current}-day streak!`;
    sub = `Milestone unlocked. ${nextMilestone ? `Next up: ${nextMilestone} days.` : "You're in rare company."}`;
    tone = "fire";
  } else if (atRisk) {
    headline = `🔥 ${current}-day streak at risk`;
    sub = `Practice today to keep it — 3 minutes is all it takes. Miss today and you're back to zero.`;
    tone = "risk";
  } else if (current > 0) {
    headline = `🔥 ${current}-day streak`;
    sub = nextMilestone
      ? `You've studied today — safe. ${toNextMilestone} more ${toNextMilestone === 1 ? "day" : "days"} to your ${nextMilestone}-day badge.`
      : `You've studied today — safe. You're on a legendary run.`;
    tone = "fire";
  } else {
    headline = `Start your streak today`;
    sub = `Toppers aren't smarter — they show up every day. One 3-minute session starts your run.`;
    tone = "start";
  }

  const border =
    tone === "risk" ? "border-rose-300" : tone === "start" ? "border-ink-200" : "border-amber-300";
  const bg =
    tone === "risk"
      ? "from-rose-50 via-amber-50 to-rose-50"
      : tone === "start"
        ? "from-ink-50 via-white to-ink-50"
        : "from-amber-50 via-saffron-50 to-amber-50";

  return (
    <section className={`mt-6 rounded-xl border-2 ${border} bg-gradient-to-r ${bg} p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-ink-900">{headline}</p>
          <p className="mt-1 text-xs text-ink-600">{sub}</p>
        </div>
        {best > 1 && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Best</p>
            <p className="text-lg font-bold tabular-nums text-ink-700">{best}</p>
          </div>
        )}
      </div>

      {/* 7-day dot calendar — oldest (left) to today (right). */}
      <div className="mt-4 flex items-end gap-2">
        {last7.map((on, i) => {
          const isToday = i === 6;
          const dow = DOW[(todayDow - 6 + i + 70) % 7];
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                  on
                    ? "bg-amber-400 text-white shadow-sm"
                    : isToday
                      ? "border-2 border-dashed border-amber-400 bg-white text-amber-500"
                      : "bg-ink-100 text-ink-300"
                }`}
                aria-label={on ? "active" : "no activity"}
              >
                {on ? "🔥" : isToday ? "·" : ""}
              </span>
              <span className={`text-[10px] ${isToday ? "font-bold text-amber-700" : "text-ink-400"}`}>
                {isToday ? "Today" : dow}
              </span>
            </div>
          );
        })}
      </div>

      {/* Milestone progress bar — the race that keeps people coming. */}
      {nextMilestone && current > 0 && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${Math.round((current / nextMilestone) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-ink-500">
            {current}/{nextMilestone} days to your next milestone
          </p>
        </div>
      )}
    </section>
  );
}
