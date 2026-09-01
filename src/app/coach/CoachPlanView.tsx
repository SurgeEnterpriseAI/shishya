// Shared plan renderer — the full view on /coach and the compact strip
// on the dashboard. Server component (no state; every render IS the
// morning rebuild).
//
// Copy rules (product soul): the plan is a service, never an audit.
// "Rebuilt for you" — never "you missed". Triage is strategy, not loss.

import Link from "next/link";
import type { ComputedPlan } from "@/lib/coach-plan";
import { CoachRebuildPing } from "@/components/CoachRebuildPing";
import { PulseAsk } from "@/components/PulseAsk";

const KIND_ICON: Record<string, string> = {
  read: "📖",
  test: "🎯",
  daily5: "⚡",
  livetest: "🇮🇳",
  mock: "📝",
};

export function CoachPlanView({ plan, full = false }: { plan: ComputedPlan; full?: boolean }) {
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
        Today&apos;s plan ({plan.dailyMinutes >= 180 ? "3+ hrs" : plan.dailyMinutes >= 90 ? "1–2 hrs" : "under 1 hr"})
      </p>
      <ul className="mt-2 space-y-2">
        {plan.todayTasks.map((t, i) => (
          <li key={i}>
            <Link
              href={t.href}
              className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 bg-white px-4 py-2.5 transition-colors hover:border-saffron-400"
            >
              <span className="min-w-0 text-sm text-ink-800">
                <span aria-hidden className="mr-2">{KIND_ICON[t.kind] ?? "•"}</span>
                {t.label}
              </span>
              <span className="shrink-0 text-sm font-bold text-saffron-700">Start →</span>
            </Link>
          </li>
        ))}
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
