"use client";

// Shown when a student re-opens an IN_PROGRESS attempt whose timer has
// already run out. Before this (audit 18 Aug 2026) the live player just
// mounted and silently auto-submitted — a jarring instant result. Now
// the student explicitly chooses: submit what they had saved, or discard
// and start the test fresh.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExpiredAttemptGate({
  attemptId,
  answered,
  total,
  examShort,
  examCode,
}: {
  attemptId: string;
  answered: number;
  total: number;
  examShort: string;
  examCode: string;
}) {
  const [busy, setBusy] = useState<null | "submit" | "discard">(null);
  const router = useRouter();

  async function submitWhatIHave() {
    setBusy("submit");
    const r = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto: true }),
    }).catch(() => null);
    if (r?.ok) router.push(`/attempts/${attemptId}/results`);
    else setBusy(null);
  }

  async function discardAndRestart() {
    setBusy("discard");
    await fetch(`/api/attempts/${attemptId}/discard`, { method: "POST" }).catch(() => null);
    // Back to the exam hub to start a clean run.
    router.push(`/exams/${examCode}`);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <div className="text-3xl">⏱️</div>
        <h1 className="mt-2 text-lg font-bold text-ink-900">Time&apos;s up on this attempt</h1>
        <p className="mt-2 text-sm text-ink-700">
          Your {examShort} test ran past its time limit while it was open. You had{" "}
          <span className="font-semibold">
            {answered} of {total}
          </span>{" "}
          answered. What would you like to do?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            disabled={busy !== null}
            onClick={submitWhatIHave}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy === "submit" ? "Submitting…" : `Submit my ${answered} answers & see the result`}
          </button>
          <button
            disabled={busy !== null}
            onClick={discardAndRestart}
            className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-white disabled:opacity-50"
          >
            {busy === "discard" ? "Clearing…" : "Discard & start this test fresh"}
          </button>
        </div>
      </div>
    </main>
  );
}
