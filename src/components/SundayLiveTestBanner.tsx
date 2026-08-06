"use client";

// The week-long "This Sunday" All-India Live Test announcement.
//
// Founder call (6 Aug 2026): the first live-test Sunday drew only 4
// submissions because nobody knew in advance. Live tests are now
// created a full week ahead, so this banner runs ALL WEEK — students
// see which papers are coming, and can ask to be reminded. Sunday
// morning, the reminder cron emails everyone who signed up.
//
// Signed-in students: one tap (we know their email).
// Anonymous students: one email field — no account needed to be
// reminded (removing every excuse not to show up).
//
// On Sunday itself the LIVE banner takes over (this one hides at
// daysAway === 0).

import { useState } from "react";
import Link from "next/link";
import type { UpcomingSunday } from "@/lib/live-test-today";

export function SundayLiveTestBanner({
  data,
  signedIn,
}: {
  data: UpcomingSunday | null;
  signedIn: boolean;
}) {
  const [state, setState] = useState<"idle" | "form" | "busy" | "done">("idle");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!data || data.daysAway === 0) return null;

  async function register(withEmail?: string) {
    setErr(null);
    setState("busy");
    try {
      const res = await fetch("/api/live-test/remind", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sundayDate: data!.sundayDate, email: withEmail }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j?.error ?? "Couldn't register — try again.");
        setState(withEmail ? "form" : "idle");
        return;
      }
      setState("done");
    } catch {
      setErr("Network hiccup — try again.");
      setState(withEmail ? "form" : "idle");
    }
  }

  const shown = data.exams.slice(0, 5);
  const more = data.exams.length - shown.length;

  return (
    <div className="mb-5 rounded-xl border-2 border-rose-200 bg-gradient-to-r from-rose-50/80 via-orange-50 to-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
          🏆 {data.label}
        </span>
        <span className="text-sm font-bold text-ink-900">
          {data.exams.length} All-India Live Test{data.exams.length > 1 ? "s" : ""} — free, with
          your All-India rank the moment you submit
        </span>
        {state === "done" ? (
          <span className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
            ✓ You&apos;re registered — we&apos;ll email you Sunday morning
          </span>
        ) : state === "form" ? (
          <span className="ml-auto flex items-center gap-1.5">
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-44 rounded-lg border border-ink-300 px-2 py-1.5 text-xs focus:border-rose-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                  setErr("Enter a valid email");
                  return;
                }
                register(email);
              }}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
            >
              Remind me
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={state === "busy"}
            onClick={() => (signedIn ? register() : setState("form"))}
            className="ml-auto shrink-0 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {state === "busy" ? "…" : "🔔 Remind me on Sunday"}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-600">
        {shown.map((e) => e.short).join(" · ")}
        {more > 0 ? ` +${more} more` : ""} · opens 6 AM, closes 11 PM ·{" "}
        <Link href="/live-test" className="font-semibold text-rose-700 underline">
          see the papers
        </Link>
      </p>
      {err && <p className="mt-1 text-xs font-medium text-rose-700">{err}</p>}
    </div>
  );
}
