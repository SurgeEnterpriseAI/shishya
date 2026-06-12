"use client";

// CTA on the exam page. Calls POST /api/mocks → redirects to /mocks/:id.
// Labels passed in by the server component so the strings can be in any locale.
//
// ABANDONMENT FIX (12 Jun 2026)
// Three of the best early users (yuvraj, harshal, yeshwanth) completed
// the 5-Q diagnostic but then opened the follow-up ADAPTIVE mock and
// bailed with ZERO answers. Root cause: clicking "adaptive" instantly
// created a 15-question mock and dropped them into the player with the
// timer ALREADY running — a wall for a casual return visit.
//
// Now the returning-user path offers a length CHOICE up front (5 / 10 /
// 15) with a clear time estimate, and defaults to 10 (not 15) so the
// commitment reads as reasonable before they click. They pick what fits
// their time, then start — no surprise 15-Q timed wall.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

interface Labels {
  adaptive: string;
  diagnostic: string;
  firstDiagnostic: string;
  building: string;
}

// Length options for the adaptive mock. minutes ≈ questions (≈1 min/Q
// is realistic for most exams; the per-mock duration is set server-side
// from questionCount anyway). 10 is the recommended default.
const LENGTHS = [
  { count: 5, label: "Quick", mins: 5 },
  { count: 10, label: "Standard", mins: 10 },
  { count: 15, label: "Full", mins: 15 },
] as const;

export function StartMockButton({
  examCode,
  hasHistory,
  labels,
}: {
  examCode: string;
  hasHistory: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Default to 10 questions — the previous instant-15 was the wall.
  const [count, setCount] = useState<number>(10);

  async function start(kind: "DIAGNOSTIC" | "ADAPTIVE", n?: number) {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiPost<{ mock: { id: string } }>("/api/mocks", {
        examCode,
        request:
          kind === "DIAGNOSTIC"
            ? { type: "DIAGNOSTIC", questionCount: 5 }
            : { type: "ADAPTIVE", questionCount: n ?? count },
      });
      router.push(`/mocks/${res.mock.id}`);
    } catch (e: any) {
      setErr(e.message ?? "Could not start mock");
      setBusy(false);
    }
  }

  // First-timer (no history): single low-commitment diagnostic.
  if (!hasHistory) {
    return (
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <button
          onClick={() => start("DIAGNOSTIC")}
          disabled={busy}
          className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
        >
          {busy ? labels.building : `${labels.firstDiagnostic} · 5 Q · ~5 min`}
        </button>
        {err && <span className="text-xs text-rose-700">{err}</span>}
      </div>
    );
  }

  // Returning user: length picker + clear time estimate, then start.
  const selected = LENGTHS.find((l) => l.count === count) ?? LENGTHS[1];
  return (
    <div className="flex flex-col items-stretch gap-2">
      {/* Length chooser — pick your commitment before the clock starts. */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-ink-500">Length:</span>
        {LENGTHS.map((l) => (
          <button
            key={l.count}
            type="button"
            onClick={() => setCount(l.count)}
            disabled={busy}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              count === l.count
                ? "bg-saffron-500 text-white"
                : "border border-ink-200 bg-white text-ink-700 hover:border-saffron-400"
            }`}
          >
            {l.count} Q
            <span className="ml-1 opacity-70">· ~{l.mins}m</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <button
          onClick={() => start("ADAPTIVE")}
          disabled={busy}
          className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
        >
          {busy
            ? labels.building
            : `Start ${selected.count}-question mock · ~${selected.mins} min →`}
        </button>
        <button
          onClick={() => start("DIAGNOSTIC")}
          disabled={busy}
          className="text-xs font-medium text-saffron-700 hover:text-saffron-800 disabled:opacity-50"
        >
          or a quick 5-Q diagnostic
        </button>
      </div>
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </div>
  );
}
