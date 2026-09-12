"use client";

// The mock's countdown, isolated so the once-a-second tick re-renders ONLY
// this component.
//
// Profiler reasoning (11 Sep 2026): the tick used to be a useState in
// MockPlayer itself. Every second React reconciled the whole player — the
// ~100-button palette, 4-5 option rows, the header, plus two full Map scans
// for the answered/marked counters — about 3,600 full-player renders per
// hour on a 60-minute paper, and 10,800 on a 180-minute one. The palette
// and the option list are pure functions of `answers`/`idx`, which change
// only on a tap, so all of that work was thrown away. Now a tick re-renders
// one div and two spans; MockPlayer renders on answer / navigation /
// save-state changes only, which also means the localStorage mirror effect
// keyed on `answers` cannot be dragged along by the clock.

import { useEffect, useMemo, useRef, useState } from "react";

export function MockTimer({
  startedAt,
  durationMin,
  onTimeUp,
}: {
  /** ISO string of the attempt's server-side start. */
  startedAt: string;
  durationMin: number;
  /** Fired exactly once, when remaining time reaches 0 (also immediately
   *  on mount for a resumed attempt that is already past time). */
  onTimeUp: () => void;
}) {
  const totalSec = durationMin * 60;
  const startMs = useMemo(() => new Date(startedAt).getTime(), [startedAt]);
  const [now, setNow] = useState(() => Date.now());

  // Latest callback without asking the parent to memoise anything.
  const onTimeUpRef = useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  });
  const firedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsedSec = Math.floor((now - startMs) / 1000);
  const remainingSec = Math.max(0, totalSec - elapsedSec);

  useEffect(() => {
    if (remainingSec === 0 && !firedRef.current) {
      firedRef.current = true;
      onTimeUpRef.current();
    }
  }, [remainingSec]);

  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  const fraction = totalSec === 0 ? 0 : remainingSec / totalSec;
  const colour = fraction < 0.1 ? "bg-rose-500" : fraction < 0.25 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-1.5">
      <span className={`h-2 w-2 rounded-full ${colour}`} />
      <span className="font-mono text-sm tabular-nums text-ink-900">
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
}
