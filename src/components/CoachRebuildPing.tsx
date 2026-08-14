"use client";

// Fires when the plan on screen is the deterministic FALLBACK (no
// CoachDay row for today). That happens exactly when the 4 AM night-
// brain skipped this student — they were inactive 7+ days (a comeback,
// the moment that matters most) or the cron missed them. We ask the
// server to run the AI rebuild NOW, in the background, so the smart
// re-triaged plan is ready by their next navigation — the founder rule:
// whenever they return, the plan re-arranges around the days left so
// they can still crack it, no guilt.
//
// Safety: CoachDay has @@unique(userId, date) so duplicate fires are
// harmless; sessionStorage stops repeat pings within a tab session.

import { useEffect } from "react";

export function CoachRebuildPing({ aiPlanned }: { aiPlanned: boolean }) {
  useEffect(() => {
    if (aiPlanned) return;
    const key = "coach-rebuild-" + new Date().toISOString().slice(0, 10);
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (private mode) — fire anyway; the
      // server-side unique key keeps it idempotent.
    }
    fetch("/api/coach/rebuild", { method: "POST" }).catch(() => {});
  }, [aiPlanned]);
  return null;
}
