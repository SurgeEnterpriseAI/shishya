"use client";

// "How did you find Shishya?" — one-tap chip strip on /dashboard (13 Sep 2026).
//
// Why: 264 of 800 signups carried no source (WhatsApp strips referrers,
// ChatGPT/Bing landings often arrive cookie-less), so the referrer alone
// cannot say which loop is working. One tap from the student closes that
// gap. Honesty rules: no counter, no urgency line, no incentive — a plain
// question, a Skip, and a thank-you that disappears.
//
// Storage: an AnalyticsEvent (kind CTA_CLICKED, props {cta:'found-via',
// value}) — no schema change. Shown once: localStorage on this device +
// the server wrapper (FoundViaChip.tsx) checks the event log, so a second
// device never sees it again either. 'dismissed' is stored the same way
// so Skip is also final.
//
// Copy is English constants for now (like TwoPathsCard / DailyFiveCard);
// pass `labels` once foundVia.* keys exist in src/lib/i18n.ts.

import { useEffect, useState } from "react";

const KEY = "shishya-found-via";

export type FoundViaValue = "chatgpt" | "google" | "bing" | "whatsapp" | "telegram" | "youtube" | "other";

const OPTIONS: { value: FoundViaValue; label: string }[] = [
  { value: "chatgpt", label: "ChatGPT" },
  { value: "google", label: "Google" },
  { value: "bing", label: "Bing" },
  { value: "whatsapp", label: "A friend's WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Other" },
];

type LabelKey = "title" | "sub" | "thanks" | "skip" | FoundViaValue;

const DEFAULTS: Record<"title" | "sub" | "thanks" | "skip", string> = {
  title: "How did you find Shishya?",
  sub: "One tap. Helps us reach more aspirants.",
  thanks: "Thanks — that helps us reach more aspirants.",
  skip: "Skip",
};

type State = "loading" | "open" | "thanks" | "hidden";

export function FoundViaChipClient({ labels }: { labels?: Partial<Record<LabelKey, string>> }) {
  const [state, setState] = useState<State>("loading");

  // Read localStorage after mount — render nothing until then so a user
  // who already answered never sees a flash of the strip.
  useEffect(() => {
    try {
      setState(window.localStorage.getItem(KEY) ? "hidden" : "open");
    } catch {
      setState("open");
    }
  }, []);

  useEffect(() => {
    if (state !== "thanks") return;
    const t = window.setTimeout(() => setState("hidden"), 3000);
    return () => window.clearTimeout(t);
  }, [state]);

  function send(value: string) {
    // The ingest route attaches userId from the session; keepalive so the
    // request survives a navigation right after the tap.
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ kind: "CTA_CLICKED", path: "/dashboard", props: { cta: "found-via", value } }),
    }).catch(() => {});
  }

  function remember(v: "answered" | "dismissed") {
    try {
      window.localStorage.setItem(KEY, v);
    } catch {
      /* localStorage unavailable — the server check still suppresses it next time */
    }
  }

  function pick(value: FoundViaValue) {
    send(value);
    remember("answered");
    setState("thanks");
  }

  function skip() {
    send("dismissed");
    remember("dismissed");
    setState("hidden");
  }

  if (state === "loading" || state === "hidden") return null;

  const L = (k: LabelKey, fallback: string) => labels?.[k] ?? fallback;

  if (state === "thanks") {
    return (
      <section className="mt-6 rounded-md border border-ink-200 bg-white p-4" aria-live="polite">
        <p className="text-sm text-ink-700">{L("thanks", DEFAULTS.thanks)}</p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-md border border-ink-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">{L("title", DEFAULTS.title)}</p>
          <p className="mt-0.5 text-xs text-ink-500">{L("sub", DEFAULTS.sub)}</p>
        </div>
        <button
          type="button"
          onClick={skip}
          aria-label="Skip"
          className="shrink-0 text-xs text-ink-400 hover:text-ink-800"
        >
          {L("skip", DEFAULTS.skip)} ×
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => pick(o.value)}
            className="rounded-full border border-ink-300 px-3 py-1 text-xs text-ink-800 hover:border-saffron-400"
          >
            {L(o.value, o.label)}
          </button>
        ))}
      </div>
    </section>
  );
}
