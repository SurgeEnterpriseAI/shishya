"use client";

// One-time, self-dismissing explainer for first-timers seeing a new
// button. Founder rule: self-explanatory flash text that DISAPPEARS —
// inline (never an overlay: the Aug-4 lesson), auto-fades after 10s,
// and never shows again on this browser once seen or dismissed.

import { useEffect, useState } from "react";

export function FlashHint({ id, text }: { id: string; text: string }) {
  const [show, setShow] = useState(false);
  const key = `flash-hint-${id}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(key)) return;
      setShow(true);
      localStorage.setItem(key, "1");
      const t = setTimeout(() => setShow(false), 10_000);
      return () => clearTimeout(t);
    } catch {
      // storage unavailable — stay hidden rather than nag every visit
    }
  }, [key]);

  if (!show) return null;
  return (
    <div className="mt-2 flex items-start justify-between gap-2 rounded-lg border border-saffron-300 bg-saffron-50 px-3 py-2 text-xs text-ink-700 print:hidden">
      <span>✨ {text}</span>
      <button
        aria-label="Dismiss"
        onClick={() => setShow(false)}
        className="shrink-0 font-bold text-ink-400 hover:text-ink-600"
      >
        ×
      </button>
    </div>
  );
}
