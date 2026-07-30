"use client";

// The coach's breadcrumb — keeps the plan's chain unbroken.
//
// A coach task sends the student OUT to a topic page or mock; without
// this, coming back for task 2 relies on memory. Mounted on task
// destinations, it quietly shows plan-holders where they stand:
//   • current task done → "Next on today's plan: X →"
//   • all tasks done    → the day is banked; tomorrow is teased
//   • not a plan-holder / signed out → renders NOTHING (zero clutter)
//
// Session + plan are checked client-side so ISR/SEO pages stay cached.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TodayTask {
  kind: string;
  label: string;
  href: string;
  done: boolean;
}

interface TodayPlan {
  hasPlan: boolean;
  examShort?: string;
  dayNumber?: number;
  totalDays?: number;
  allDone?: boolean;
  tasks?: TodayTask[];
}

export function CoachNextTask() {
  const pathname = usePathname();
  const [plan, setPlan] = useState<TodayPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coach/today")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.hasPlan) setPlan(d);
      })
      .catch(() => {
        /* breadcrumb is enhancement only */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!plan?.hasPlan || !plan.tasks?.length) return null;

  const next = plan.tasks.find((t) => !t.done && !pathname.startsWith(t.href.split("?")[0]));

  if (plan.allDone) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
        <p className="text-sm text-ink-800">
          🎉 <span className="font-bold">Today&apos;s plan complete</span> — Day {plan.dayNumber}{" "}
          of {plan.totalDays} banked for {plan.examShort}.
        </p>
        <Link href="/coach" className="shrink-0 text-sm font-bold text-emerald-700 hover:underline">
          See the plan →
        </Link>
      </div>
    );
  }
  if (!next) return null;

  return (
    <Link
      href={next.href}
      className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-saffron-300 bg-saffron-50 px-4 py-3 transition-colors hover:border-saffron-400"
    >
      <span className="min-w-0 text-sm text-ink-800">
        🎯 <span className="font-semibold">Next on today&apos;s plan:</span> {next.label}
      </span>
      <span className="shrink-0 text-sm font-bold text-saffron-700">Start →</span>
    </Link>
  );
}
