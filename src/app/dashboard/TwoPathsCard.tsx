"use client";

// Short informational card on /dashboard explaining the two intended
// ways to use Shishya. Shown after the welcome heading until the user
// dismisses it once — flag stored in localStorage so it stays gone.
//
// Intentionally plain (no gradients, no emojis on bullets). The point
// is to set expectations once, not to decorate.

import { useEffect, useState } from "react";

const DISMISS_KEY = "shishya-two-paths-dismissed";

export function TwoPathsCard() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* localStorage unavailable */
    }
  }

  // While we read localStorage, render nothing — avoids flashing the
  // card to users who've already dismissed it.
  if (dismissed !== false) return null;

  return (
    <section className="mt-6 rounded-md border border-ink-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-900">
          Two ways to use Shishya
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 text-xs text-ink-400 hover:text-ink-800"
        >
          Got it ×
        </button>
      </div>
      <ol className="mt-3 space-y-2 text-sm text-ink-700">
        <li>
          <span className="font-medium text-ink-900">1.</span>{" "}
          Take a mock from your enrolled exam, see which topics cost you
          marks, drill the weakest ones, then mock again. Repeat until
          your score climbs.
        </li>
        <li>
          <span className="font-medium text-ink-900">2.</span>{" "}
          New to an exam? Take a diagnostic mock to see where you stand
          versus the rankers&apos; cut-offs. Then Ask Shishya to help
          you close the gap.
        </li>
      </ol>
    </section>
  );
}
