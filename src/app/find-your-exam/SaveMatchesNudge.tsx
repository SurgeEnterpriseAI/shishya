"use client";

// The "save your matches" conversion nudge — shown to ANONYMOUS visitors
// right when their finder results appear (peak intent: they just saw the
// exams they can crack). Three days of data showed the browse-first
// surfaces lifting visitors (~211/day) while signup conversion sank to
// ~4% — this recaptures the conversion without adding friction: results
// stay fully visible with no gate; the nudge only offers to SAVE them.
//
// The answers live in the URL, so the login callback returns the user to
// the exact same results after Google sign-in — nothing is lost.
//
// Instrumented: fires a one-time "shown" impression + a click beacon so
// nudge CTR and its effect on signups are measurable.

import { useEffect, useRef } from "react";

function beacon(cta: string, extra?: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: typeof location !== "undefined" ? location.pathname : "/find-your-exam",
          props: { cta, surface: "finder-nudge", ...extra },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export function SaveMatchesNudge({
  loginHref,
  matchCount,
}: {
  loginHref: string;
  matchCount: number;
}) {
  const seen = useRef(false);
  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    beacon("finder-nudge-shown", { matchCount });
  }, [matchCount]);

  return (
    <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-emerald-300 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-700">
        <span className="font-semibold text-ink-900">Don&apos;t lose these {matchCount} matches</span>{" "}
        — sign in free and we&apos;ll save them + set up your daily prep plan.
      </p>
      <a
        href={loginHref}
        onClick={() => beacon("finder-nudge-click", { matchCount })}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        Save my matches — sign in free →
      </a>
    </div>
  );
}
