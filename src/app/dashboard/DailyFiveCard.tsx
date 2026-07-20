"use client";

// Retention build (Jul 20 checkpoint verdict: D1-7 return stuck at 14%,
// one-and-done 85% — conversion levers didn't move it, so the product now
// gives a REASON to come back daily). The Daily 5: one tap → 5 questions
// on your current weakest topic → done in ~3 minutes → streak preserved.
// Users literally asked the tutor to "make me a study plan for today";
// this IS the plan, pre-made, every day.

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  examCode: string;
  examShort: string;
  topicCode?: string | null;
  topicName?: string | null;
  streakCurrent: number;
  activeToday: boolean;
}

export function DailyFiveCard({
  examCode,
  examShort,
  topicCode,
  topicName,
  streakCurrent,
  activeToday,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examCode,
          request: topicCode
            ? { type: "TOPIC", topicCode, questionCount: 5 }
            : { type: "ADAPTIVE", questionCount: 5 },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.mock?.id) {
        setErr(data?.error ?? "Couldn't build today's 5 — try again.");
        setBusy(false);
        return;
      }
      router.push(`/mocks/${data.mock.id}`);
    } catch {
      setErr("Network hiccup — try again.");
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-saffron-50 to-amber-50 p-5 shadow-sm">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            ☀️ Today&apos;s 5 · your daily plan
          </p>
          <p className="mt-1 text-base font-bold text-ink-900">
            {topicName
              ? `5 quick questions on ${topicName} (${examShort})`
              : `5 quick questions for ${examShort}`}
          </p>
          <p className="mt-1 text-xs text-ink-600">
            ~3 minutes on your weakest area.{" "}
            {streakCurrent > 0
              ? activeToday
                ? `🔥 ${streakCurrent}-day streak — already active today, make it count.`
                : `🔥 Keep your ${streakCurrent}-day streak alive.`
              : "Do it daily — small reps are how toppers are made."}
          </p>
          {err && <p className="mt-1 text-xs text-rose-700">{err}</p>}
        </div>
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "Building…" : "Start today's 5 →"}
        </button>
      </div>
    </section>
  );
}
