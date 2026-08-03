"use client";

// Engagement-triggered signup nudge for anonymous visitors.
//
// Founder call (3 Aug 2026): ~72% of engaged visitors never sign up,
// yet everything that retains them (streaks, weak areas, mistake
// notebook, coach) needs identity. This asks at the moment of earned
// value — never at the door.
//
// Form: slide-up bottom sheet (mobile) / corner card (desktop) — NOT a
// screen-blocking modal, because Google penalizes intrusive
// interstitials on mobile organic landings and SEO is the growth
// engine.
//
// Hard courtesy rules (all enforced here):
//   • anonymous visitors only (any session-token cookie → render null)
//   • 5+ minutes of ACTIVE tab time AND 3+ pageviews this session
//   • never during a mock/live-test attempt, never on /login, /admin,
//     /i/, /join, /aptitude
//   • max once per day; gone forever after 3 dismissals or 1 click
//   • every shown/clicked/dismissed logged (surface 'signup-nudge')
//     so the conversion lift is measured, not assumed.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const ACTIVE_SECONDS_NEEDED = 5 * 60;
const MIN_PAGEVIEWS = 3;
const MAX_DISMISSALS = 3;

const LS_DISMISS = "shishya_nudge_dismissals";
const LS_LAST = "shishya_nudge_last_shown";
const LS_DONE = "shishya_nudge_done";
const SS_VIEWS = "shishya_nudge_views";
const SS_SECONDS = "shishya_nudge_seconds";

function blockedPath(p: string): boolean {
  return (
    p.startsWith("/mocks/") ||
    p.startsWith("/live-test/") ||
    p.startsWith("/attempts/") ||
    p.startsWith("/login") ||
    p.startsWith("/admin") ||
    p.startsWith("/i/") ||
    p.startsWith("/join/") ||
    p.startsWith("/aptitude")
  );
}

function signedIn(): boolean {
  try {
    return document.cookie.includes("session-token");
  } catch {
    return false;
  }
}

function beacon(action: "shown" | "clicked" | "dismissed") {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: location.pathname,
          props: { surface: "signup-nudge", action },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* best-effort */
  }
}

export function SignupNudge() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  // Count route changes as pageviews (sessionStorage survives
  // navigations within the tab, resets on a new tab/session).
  useEffect(() => {
    try {
      const v = Number(sessionStorage.getItem(SS_VIEWS) ?? "0") + 1;
      sessionStorage.setItem(SS_VIEWS, String(v));
    } catch {
      /* private mode */
    }
  }, [pathname]);

  // Accumulate ACTIVE seconds (tab visible only) and evaluate the
  // rules once per tick. Cheap: one 1s interval, all checks local.
  useEffect(() => {
    if (signedIn()) return;
    const id = window.setInterval(() => {
      if (document.hidden || show) return;
      try {
        if (localStorage.getItem(LS_DONE)) return;
        if (Number(localStorage.getItem(LS_DISMISS) ?? "0") >= MAX_DISMISSALS) return;
        const today = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(LS_LAST) === today) return;

        const secs = Number(sessionStorage.getItem(SS_SECONDS) ?? "0") + 1;
        sessionStorage.setItem(SS_SECONDS, String(secs));

        if (
          secs >= ACTIVE_SECONDS_NEEDED &&
          Number(sessionStorage.getItem(SS_VIEWS) ?? "0") >= MIN_PAGEVIEWS &&
          !blockedPath(location.pathname) &&
          !signedIn()
        ) {
          localStorage.setItem(LS_LAST, today);
          setShow(true);
          beacon("shown");
        }
      } catch {
        /* private mode — never nudge if we can't be polite about it */
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm"
      role="dialog"
      aria-label="Sign up for free"
    >
      <div className="animate-[slideup_.3s_ease-out] rounded-t-2xl border-2 border-saffron-300 bg-white p-4 shadow-xl sm:rounded-2xl">
        <style>{`@keyframes slideup{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-ink-900">
            🎯 You&apos;ve been studying for 5 minutes — make Shishya yours.
          </p>
          <button
            type="button"
            aria-label="Maybe later"
            onClick={() => {
              try {
                localStorage.setItem(
                  LS_DISMISS,
                  String(Number(localStorage.getItem(LS_DISMISS) ?? "0") + 1),
                );
              } catch { /* ok */ }
              beacon("dismissed");
              setShow(false);
            }}
            className="shrink-0 rounded-md p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-600">
          Free forever. One tap with Google saves your practice, maps your weak areas, starts your
          streak, and unlocks your personal coach.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <a
            href="/login"
            onClick={() => {
              try { localStorage.setItem(LS_DONE, "1"); } catch { /* ok */ }
              beacon("clicked");
            }}
            className="rounded-xl bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
          >
            Sign up free →
          </a>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(
                  LS_DISMISS,
                  String(Number(localStorage.getItem(LS_DISMISS) ?? "0") + 1),
                );
              } catch { /* ok */ }
              beacon("dismissed");
              setShow(false);
            }}
            className="text-xs font-medium text-ink-500 hover:text-ink-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
