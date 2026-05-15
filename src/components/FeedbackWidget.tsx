"use client";

// Tiny floating pill at the bottom-right of every page that lets a
// student suggest a feature in-context. Auto-tags the request with
// the current route + a guessed "area" so the founder can slice
// requests by where students hit friction.
//
// Behaviour:
//  - Hidden on the landing page (/), inside a live mock (/mocks/[id]),
//    and on admin routes (no operator self-spam).
//  - Hidden for signed-out visitors — auth gate on the API enforces it
//    anyway, but no point showing UI that 401s.
//  - If the user dismisses the panel 3 times without submitting, we
//    snooze the pill for 7 days via localStorage. Don't nag.

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";

const AREAS = [
  "Mock tests",
  "AI Tutor",
  "Translations",
  "Results & Rank",
  "UI / Navigation",
  "Other",
] as const;

const SNOOZE_KEY = "shishya-feedback-snooze";
const DISMISS_COUNT_KEY = "shishya-feedback-dismiss-count";
const DISMISS_LIMIT = 3;
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function guessArea(path: string): (typeof AREAS)[number] {
  if (path.startsWith("/mocks/")) return "Mock tests";
  if (path.startsWith("/chat")) return "AI Tutor";
  if (path.startsWith("/attempts/")) return "Results & Rank";
  if (path.startsWith("/exams/")) return "Mock tests";
  if (path.startsWith("/dashboard")) return "UI / Navigation";
  return "Other";
}

function contextLabel(path: string): string {
  if (path === "/") return "Landing page";
  if (path === "/dashboard") return "Dashboard";
  if (path === "/exams") return "Exam catalog";
  if (path.startsWith("/exams/") && path.includes("/topics/")) {
    return `Topic page · ${path.split("/")[2]}`;
  }
  if (path.startsWith("/exams/")) {
    return `Exam page · ${path.split("/")[2]}`;
  }
  if (path.startsWith("/mocks/")) return "Mock player";
  if (path.startsWith("/attempts/")) return "Results page";
  if (path.startsWith("/chat")) return "Ask Shishya";
  return path;
}

export function FeedbackWidget({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname() ?? "/";

  // Route-based hide rules. Inside an in-progress mock we never want
  // to distract; admin routes belong to operators not students.
  const hidden =
    !signedIn ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/logout" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/mocks/");

  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(SNOOZE_KEY);
    if (v) setSnoozedUntil(parseInt(v, 10) || 0);
  }, []);

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [area, setArea] = useState<(typeof AREAS)[number]>(() => guessArea(pathname));
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep area pre-selection in sync with the route as the user navigates.
  useEffect(() => {
    if (!open) setArea(guessArea(pathname));
  }, [pathname, open]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  if (hidden) return null;
  if (snoozedUntil && Date.now() < snoozedUntil) return null;

  const ctx = useMemo(() => contextLabel(pathname), [pathname]);
  const examCode = pathname.startsWith("/exams/") ? pathname.split("/")[2] : null;

  function dismiss() {
    setOpen(false);
    if (submittedId) return; // submitted is success, not a real dismiss
    try {
      const n = parseInt(window.localStorage.getItem(DISMISS_COUNT_KEY) ?? "0", 10) + 1;
      window.localStorage.setItem(DISMISS_COUNT_KEY, String(n));
      if (n >= DISMISS_LIMIT) {
        const until = Date.now() + SNOOZE_MS;
        window.localStorage.setItem(SNOOZE_KEY, String(until));
        setSnoozedUntil(until);
      }
    } catch { /* localStorage unavailable */ }
  }

  async function submit() {
    if (body.trim().length < 8) {
      setErr("A bit more detail helps us route this — at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await apiPost<{ request: { id: string } }>("/api/feedback", {
        body: body.trim(),
        area,
        routePath: pathname,
        examCode,
      });
      setSubmittedId(res.request.id);
      // Reset dismiss counter on a successful submit so the pill stays
      // visible for the user.
      try { window.localStorage.removeItem(DISMISS_COUNT_KEY); } catch {}
    } catch (e: any) {
      setErr(e?.message ?? "Could not submit — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* The pill itself */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-saffron-300 bg-saffron-50 px-3 py-2 text-xs font-medium text-saffron-900 shadow-md hover:bg-saffron-100 hover:shadow-lg"
          aria-label="Suggest a feature"
        >
          <span aria-hidden>💡</span>
          <span>Suggest a feature</span>
        </button>
      )}

      {/* Slide-out panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center">
          <div
            className="absolute inset-0 bg-ink-900/30"
            onClick={dismiss}
            aria-hidden
          />
          <div className="relative m-2 w-full max-w-[380px] rounded-lg border border-ink-200 bg-white p-5 shadow-xl sm:m-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-ink-900">Suggest a feature</p>
              <button
                type="button"
                onClick={dismiss}
                className="text-xs text-ink-500 hover:text-ink-800"
              >
                Close
              </button>
            </div>

            {!submittedId ? (
              <>
                <p className="mt-1 text-xs text-ink-500">
                  Tied to:{" "}
                  <span className="rounded bg-ink-100 px-1.5 py-0.5 font-medium text-ink-700">
                    {ctx}
                  </span>
                </p>

                <label className="mt-3 block">
                  <span className="text-xs font-medium text-ink-700">
                    What would help you here?
                  </span>
                  <textarea
                    ref={textareaRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="e.g. let me filter mocks by subject…"
                    className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
                  />
                </label>

                <label className="mt-3 block">
                  <span className="text-xs font-medium text-ink-700">Area</span>
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value as (typeof AREAS)[number])}
                    className="mt-1 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
                  >
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </label>

                {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link
                    href="/ideas"
                    className="text-xs text-saffron-700 hover:text-saffron-800 hover:underline"
                  >
                    See what others suggested →
                  </Link>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting || body.trim().length < 8}
                    className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-50"
                  >
                    {submitting ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4">
                <p className="text-sm font-semibold text-emerald-700">
                  Thanks — we&apos;ve logged it.
                </p>
                <p className="mt-1 text-xs text-ink-600">
                  Shishya&apos;s team reviews these weekly. Track it on the public
                  ideas board:
                </p>
                <Link
                  href="/ideas"
                  className="mt-3 inline-block rounded-md border border-saffron-300 bg-saffron-50 px-3 py-1.5 text-xs font-medium text-saffron-900 hover:bg-saffron-100"
                >
                  Open the ideas board →
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedId(null);
                    setBody("");
                  }}
                  className="ml-2 inline-block text-xs text-ink-500 hover:text-ink-800"
                >
                  Suggest another
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
