"use client";

// First-time-user activation lever — Diagnostic-5.
//
// Replaces the previous "Step 1 — pick your first exam" 6-tile grid as
// the primary CTA on /dashboard when the user has zero enrollments.
//
// WHY THIS EXISTS
// As of 27 May 2026 prod data: 100 signups, 2 mock-takers (2%
// activation). Every extra click between signup and first question
// answered halves conversion. The previous flow was:
//   signup → onboarding → dashboard → pick exam tile → exam page →
//   Start Mock button → choose diagnostic vs adaptive → answer Q1
// (7+ clicks)
//
// This hero collapses that to ONE click for first-timers:
//   signup → onboarding → dashboard → [big saffron button] → Q1
//
// The exam is picked deterministically from onbPrepCodes (the user's
// onboarding picks) with a popular-exam fallback. We never ask them
// to pick again — that's onboarding's job, not the dashboard's.
//
// After this attempt the hero is hidden — recent[] > 0 means we
// switch to the "Recommended next mock" / Score-boost surfaces.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

interface Props {
  /** Exam code we'll create the diagnostic against. Computed
   *  server-side from User.onbPrepCodes (first entry) with a
   *  popular-exam fallback. */
  examCode: string;
  /** Short name for display ("SSC CGL", "NEET UG", …). */
  examShortName: string;
}

export function DiagnosticHero({ examCode, examShortName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiPost<{ mock: { id: string } }>("/api/mocks", {
        examCode,
        request: { type: "DIAGNOSTIC", questionCount: 5 },
      });
      // Direct nav to the mock player — no intermediate confirmation
      // screen. Friction zero.
      router.push(`/mocks/${res.mock.id}`);
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Couldn't start the diagnostic. Try again or pick an exam below.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50/80 to-white p-6 sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          ⚡ Step 1 — see where you stand
        </p>
        <h3 className="mt-2 text-xl font-bold text-ink-900 sm:text-2xl">
          Take a 90-second {examShortName} diagnostic
        </h3>
        <p className="mt-2 text-sm text-ink-600">
          5 questions across the syllabus. Shishya uses your answers to spot
          the topics dragging your score down — then every next mock targets
          exactly those. No timer pressure, free, no setup.
        </p>

        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="mt-6 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-saffron-500 px-6 py-3.5 text-base font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-saffron-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:cursor-wait disabled:opacity-70 sm:max-w-md"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Building your 5 questions…
            </>
          ) : (
            <>Start your 90-second diagnostic →</>
          )}
        </button>

        {err && (
          <p className="mt-3 text-xs text-rose-700">{err}</p>
        )}

        <p className="mt-3 text-[11px] text-ink-500">
          Tap a different exam below if you&apos;d rather start with
          something else.
        </p>
      </div>
    </div>
  );
}
