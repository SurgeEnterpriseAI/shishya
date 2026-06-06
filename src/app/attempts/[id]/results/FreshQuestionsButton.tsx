"use client";

// Depth Lever 3 CTA — "Get N fresh questions on [topic] →".
//
// Shown on the results page for the student's weakest topic. One tap
// generates a brand-new, level-tuned set via /api/mocks/fresh and drops
// them straight into the mock player. This is the infinite-depth escape
// hatch for users who exhaust the fixed pool — they can always summon
// more practice at the right difficulty.

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  examCode: string;
  topicCode: string;
  topicName: string;
  count?: number;
}

export function FreshQuestionsButton({ examCode, topicCode, topicName, count = 10 }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/mocks/fresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, topicCode, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? "Couldn't generate right now. Try again.");
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
    <div className="mt-6 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5 shadow-sm">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            ✦ Want more? We&apos;ll make it
          </p>
          <p className="mt-1 text-base font-bold text-ink-900">
            Generate {count} fresh questions on {topicName}
          </p>
          <p className="mt-1 text-xs text-ink-600">
            Brand-new questions, tuned to your level — never the same set twice.
            Made for you in a few seconds.
          </p>
          {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Making your questions…
            </>
          ) : (
            <>Generate {count} fresh →</>
          )}
        </button>
      </div>
    </div>
  );
}
