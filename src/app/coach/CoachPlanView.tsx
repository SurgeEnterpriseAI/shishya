// Shared plan renderer — the full view on /coach and the compact strip
// on the dashboard. Server component (no state; every render IS the
// morning rebuild).
//
// Copy rules (product soul): the plan is a service, never an audit.
// "Rebuilt for you" — never "you missed". Triage is strategy, not loss.
//
// Done ticks (16 Sep 2026): `done` comes from src/lib/coach-done.ts — the
// same flags the CoachNextTask breadcrumb reads. A done task keeps its link
// and reads "Done"; an open one still says "Start →" (never "missed"). The
// "N/M done" count is only shown when a tick is possible for every task
// (not on exam day or after the exam).

import Link from "next/link";
import type { ComputedPlan } from "@/lib/coach-plan";
import { showsDoneCount } from "@/lib/coach-done";
import { CoachRebuildPing } from "@/components/CoachRebuildPing";
import { PulseAsk } from "@/components/PulseAsk";

const KIND_ICON: Record<string, string> = {
  read: "📖",
  test: "🎯",
  daily5: "⚡",
  livetest: "🇮🇳",
  mock: "📝",
};

// The task list's own words, so a Hindi or Telugu reader never gets "पूरा"
// on one row and "Start →" on the next (review, 16 Sep 2026). Task labels
// come from src/lib/coach-plan.ts and are English-only.
const COPY = {
  en: { plan: "Today's plan ({hrs})", long: "3+ hrs", mid: "1–2 hrs", short: "under 1 hr", start: "Start →", done: "Done", count: "{n}/{m} done" },
  hi: { plan: "आज की योजना ({hrs})", long: "3+ घंटे", mid: "1–2 घंटे", short: "1 घंटे से कम", start: "शुरू करें →", done: "पूरा", count: "{n}/{m} पूरे" },
  te: { plan: "ఈరోజు ప్లాన్ ({hrs})", long: "3+ గంటలు", mid: "1–2 గంటలు", short: "1 గంట లోపు", start: "ప్రారంభించండి →", done: "పూర్తైంది", count: "{n}/{m} పూర్తి" },
} as const;

export function CoachPlanView({
  plan,
  full = false,
  done = null,
  locale = "en",
}: {
  plan: ComputedPlan;
  full?: boolean;
  /** Per-task done flags, same order as plan.todayTasks (null = unknown: no ticks, no count). */
  done?: boolean[] | null;
  locale?: string;
}) {
  const copy = locale === "hi" ? COPY.hi : locale === "te" ? COPY.te : COPY.en;
  const flags = done && done.length === plan.todayTasks.length ? done : null;
  const doneCount = flags ? flags.filter(Boolean).length : 0;
  const showCount = !!flags && plan.todayTasks.length > 0 && showsDoneCount(plan.phase);
  const pct = plan.progress.total
    ? Math.round((plan.progress.covered / plan.progress.total) * 100)
    : 0;
  const statusLine =
    plan.status === "fresh"
      ? "Your plan starts today — day one is ready."
      : plan.status === "on-track"
        ? "Yesterday: done. Today continues the push."
        : "Plan rebuilt for today — best possible path with the time left.";

  return (
    <div className={`rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5 ${full ? "mt-6" : "mt-3"}`}>
      <CoachRebuildPing aiPlanned={plan.aiPlanned} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-ink-900">
          🎯 {plan.examShort} — Day {plan.dayNumber}
          <span className="font-semibold text-ink-500"> · {plan.daysLeft} days to exam</span>
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            plan.status === "rebuilt"
              ? "bg-sky-100 text-sky-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {plan.status === "rebuilt" ? "🔁 rebuilt today" : "✓ on track"}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-600">{statusLine}</p>

      {/* The coach's overnight note — written by the 4 AM AI pass from
          this student's actual data. The single most human moment on
          the dashboard. */}
      {plan.note && (
        <p className="mt-3 rounded-lg border-l-4 border-saffron-400 bg-white px-3 py-2 text-sm italic leading-relaxed text-ink-800">
          “{plan.note}”
          <span className="mt-0.5 block text-right text-[10px] not-italic text-ink-400">
            — your coach, planned overnight
          </span>
        </p>
      )}

      {/* Syllabus progress */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs text-ink-600">
          <span>
            Syllabus: <span className="font-semibold text-ink-900">{plan.progress.covered}</span>/
            {plan.progress.total} topics touched · {plan.progress.mastered} mastered
          </span>
          <span className="font-bold tabular-nums text-saffron-700">{pct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-saffron-400" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
      </div>

      {/* Today's tasks */}
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-500">
        {copy.plan.replace("{hrs}", plan.dailyMinutes >= 180 ? copy.long : plan.dailyMinutes >= 90 ? copy.mid : copy.short)}
        {showCount && (
          <span className={doneCount === plan.todayTasks.length ? "text-emerald-700" : undefined}>
            {" · "}
            {copy.count.replace("{n}", String(doneCount)).replace("{m}", String(plan.todayTasks.length))}
          </span>
        )}
      </p>
      <ul className="mt-2 space-y-2">
        {plan.todayTasks.map((t, i) => {
          const isDone = flags?.[i] === true;
          return (
            <li key={i}>
              <Link
                href={t.href}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 transition-colors ${
                  isDone ? "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300" : "border-ink-200 bg-white hover:border-saffron-400"
                }`}
              >
                <span className={`min-w-0 text-sm ${isDone ? "text-ink-500 line-through" : "text-ink-800"}`}>
                  <span aria-hidden className="mr-2">{isDone ? "✓" : KIND_ICON[t.kind] ?? "•"}</span>
                  {t.label}
                </span>
                {isDone ? (
                  <span className="shrink-0 text-sm font-bold text-emerald-700">{copy.done}</span>
                ) : (
                  <span className="shrink-0 text-sm font-bold text-saffron-700">{copy.start}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Transparent triage */}
      {plan.triage && (
        <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3">
          <p className="text-xs font-bold text-sky-900">
            ✂️ Coach&apos;s triage: {plan.triage.dropped} low-weightage topic
            {plan.triage.dropped === 1 ? "" : "s"} parked so your {plan.daysLeft} days go where
            the marks are.
          </p>
          {plan.triage.examples.length > 0 && (
            <p className="mt-0.5 text-[11px] text-ink-600">
              Parked (lowest priority): {plan.triage.examples.join(" · ")} — they come back if
              you get ahead of plan.
            </p>
          )}
        </div>
      )}

      {/* PulseAsk (1 Sep 2026): plan-quality pulse on the full /coach
          view only (the compact strip stays clean). Coach requires
          sign-in, so free text is available. */}
      {full && (
        <PulseAsk
          surface="coach"
          prompt="Is the coach pointing you at the right things?"
          chips={["Spot on", "Too generic", "Wrong topics"]}
          signedIn
          examCode={plan.examCode}
        />
      )}

      {!full && (
        <p className="mt-3 text-right">
          <Link href="/coach" className="text-xs font-medium text-saffron-700 hover:underline">
            Full plan &amp; settings →
          </Link>
        </p>
      )}
    </div>
  );
}
