"use client";

// Anonymous-visitor signup nudge for public SEO pages (cutoff, and
// reusable for tricks/guide later). Never gates content — the page
// stays fully readable; this only OFFERS the next step at a high-intent
// moment ("will my score clear the cutoff?").
//
// Session is checked CLIENT-side (/api/auth/session) so the host page
// keeps its ISR caching — no server cookie read. Renders nothing until
// the visitor is confirmed anonymous (signed-in users never see it,
// with no flash). Instrumented with shown/click beacons per surface.

import { useEffect, useRef, useState } from "react";

function beacon(cta: string, extra?: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: typeof location !== "undefined" ? location.pathname : "/",
          props: { cta, ...extra },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export function AnonExamNudge({
  examCode,
  headline,
  body,
  cta,
  surface,
}: {
  examCode: string;
  /** Bold lead-in, e.g. "Will your score clear the SSC CGL cutoff?" */
  headline: string;
  /** Follow-on sentence. */
  body: string;
  /** Button label. */
  cta: string;
  /** Analytics surface tag, e.g. "cutoff-nudge". */
  surface: string;
}) {
  const [anon, setAnon] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!cancelled && !s?.user) setAnon(true);
      })
      .catch(() => {
        if (!cancelled) setAnon(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (anon && !seen.current) {
      seen.current = true;
      beacon(`${surface}-shown`, { surface, examCode });
    }
  }, [anon, surface, examCode]);

  if (!anon) return null;

  const href = `/login?callbackUrl=${encodeURIComponent(`/exams/${examCode}`)}`;
  return (
    <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-700">
        <span className="font-semibold text-ink-900">{headline}</span> {body}
      </p>
      <a
        href={href}
        onClick={() => beacon(`${surface}-click`, { surface, examCode })}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
      >
        {cta}
      </a>
    </div>
  );
}
