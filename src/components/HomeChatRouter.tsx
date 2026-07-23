"use client";

// Floating chat-router popup on the homepage. Bottom-left FAB (the
// bottom-right corner is owned by the discussions sidebar FAB).
// Click it → small modal with a single textarea: "What are you
// looking for?" Visitor types → POST /api/chat-route → Claude
// interprets intent → returns a destination URL + a one-line
// "why" → we auto-navigate after a brief confirmation.
//
// Design choices:
//   - Single-shot, not a full conversation. The popup is a router,
//     not a tutor. For multi-turn study help we already have /chat.
//   - We show the "why" for ~1.2 s before navigating so the user
//     understands what's about to happen (and can hit Esc to abort).
//   - confidence: "low" → don't auto-navigate, surface a manual
//     "Take me there" button. Protects against Claude routing to
//     the wrong page when the user's intent really is unclear.

import { useEffect, useRef, useState } from "react";

type RouteResult = {
  url: string;
  why: string;
  confidence: "high" | "medium" | "low";
};

export function HomeChatRouter() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when the modal opens.
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  // Esc closes the modal at any time.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 2 || submitting) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/chat-route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) throw new Error(`route failed: ${res.status}`);
      const data = (await res.json()) as RouteResult;
      setResult(data);

      // Auto-navigate for high/medium confidence after a short pause
      // so the visitor reads the "why" first. Low confidence stays on
      // the modal and surfaces a manual "Take me there" button.
      if (data.confidence !== "low") {
        setTimeout(() => {
          window.location.assign(data.url);
        }, 1200);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't reach the router. Try again or use the search bar above.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* ── Vertical side tab, right edge, vertically centred (sticky). On
          lg it sits just left of the calendar rail (right-[20rem]); on
          mobile it hugs the right edge. ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the Ask-Shishya helper"
        data-tour="home-chat-fab"
        className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl bg-ink-900 px-2 py-4 text-sm font-medium text-white shadow-lg ring-1 ring-ink-900/20 transition-colors hover:bg-ink-800 lg:right-[20rem]"
      >
        <span aria-hidden>🤖</span>
        <span className="hidden [writing-mode:vertical-rl] sm:inline">What are you looking for?</span>
        <span className="[writing-mode:vertical-rl] sm:hidden">Ask Shishya</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-router-title"
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* sheet — bottom-anchored on phones, centered card on lg */}
          <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-lg rounded-t-2xl bg-white shadow-2xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-3">
              <div>
                <h3 id="chat-router-title" className="text-base font-semibold text-ink-900">
                  What are you looking for?
                </h3>
                <p className="mt-0.5 text-xs text-ink-500">
                  Type in any language — Shishya finds the right page.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="-mr-2 rounded-md p-2 text-ink-500 hover:bg-ink-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submit} className="px-5 py-4">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. I'm in Class 12 PCM, want IIT · or · SSC CGL last year cutoff · or · सरकारी नौकरी की तैयारी"
                rows={3}
                maxLength={500}
                disabled={submitting || !!result}
                className="w-full resize-none rounded-lg border-2 border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200/60 disabled:opacity-60"
              />

              {error && (
                <p className="mt-2 text-xs text-rose-700">{error}</p>
              )}

              {result && (
                <div
                  className={`mt-3 rounded-lg border p-3 text-sm ${
                    result.confidence === "low"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-emerald-300 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  <p className="font-medium">{result.why}</p>
                  {result.confidence === "low" ? (
                    <a
                      href={result.url}
                      className="mt-2 inline-block rounded-md bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-800"
                    >
                      Take me there anyway →
                    </a>
                  ) : (
                    <p className="mt-1 text-xs opacity-80">Redirecting…</p>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[11px] text-ink-500">
                  Press Enter to send · Esc to close
                </p>
                <button
                  type="submit"
                  disabled={submitting || message.trim().length < 2 || !!result}
                  className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:opacity-50"
                >
                  {submitting ? "Routing…" : "Find it →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
