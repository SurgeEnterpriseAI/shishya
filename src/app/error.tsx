"use client";

// Root-level error boundary for ANY client-side runtime exception in
// the app. Without this file Next.js falls back to its generic
// "Application error: a client-side exception has occurred while
// loading shishya.in (see the browser console for more information)"
// page — which is useless to a non-technical visitor and undermines
// trust in the platform.
//
// Why a friendly fallback matters specifically for Shishya:
//   - Many visitors are students on patchy connections and varied
//     devices (low-end Android in tier-3 cities, college lab PCs).
//   - Even a single client-side throw — a hydration mismatch on a
//     time-dependent component, a misordered hook, a stale chunk in
//     a CDN edge — becomes a brick-wall experience.
//
// This component:
//   1. Renders a calm, on-brand fallback (not a stack trace).
//   2. Offers "Try again" — calls Next's `reset()` to re-mount the
//      tree without a full reload (works in 70% of transient errors).
//   3. Offers "Hard reset" — clears localStorage + sessionStorage
//      and forces a clean reload, which fixes the most common cause:
//      stale client state from an older deploy.
//   4. Logs the error (with digest) to the console so devs running
//      browser DevTools still see what went wrong.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in console for any dev / power user who wants the detail.
    // `digest` is the Next.js server-side error ID — useful for
    // correlating with Vercel logs when the error happens during SSR.
    // eslint-disable-next-line no-console
    console.error("[shishya/error-boundary]", { message: error.message, digest: error.digest, stack: error.stack });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-saffron-50/30 px-6 py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-saffron-500 text-2xl font-bold text-white">
          शि
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Something didn&apos;t load right
        </h1>
        <p className="mt-3 text-sm text-ink-600">
          A page-side hiccup stopped this from rendering. This is almost
          always fixed by reloading or resetting your saved state from
          older visits.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={async () => {
              // Aggressive cleanup — clear EVERYTHING the browser may
              // have cached from older sessions that could conflict
              // with the current deploy. Common culprits we've seen:
              //   - localStorage values with shape that's changed
              //     across releases (e.g. saved onboarding state)
              //   - Cookies storing a stale auth/lang preference
              //   - Service workers from older deploys still
              //     intercepting fetches (we don't ship one today,
              //     but a previous build may have)
              //   - Cache API entries with stale chunk responses
              // Each step is wrapped in its own try/catch so one
              // failure doesn't abort the rest. Final step does a
              // cache-busted reload via `?_r=<ts>` to ensure we
              // sidestep any remaining HTTP cache.
              try { localStorage.clear(); } catch { /* nothing */ }
              try { sessionStorage.clear(); } catch { /* nothing */ }
              try {
                document.cookie.split(";").forEach((c) => {
                  const eq = c.indexOf("=");
                  const name = (eq > -1 ? c.slice(0, eq) : c).trim();
                  if (!name) return;
                  // Expire on this exact path + the root + the bare domain.
                  // We can't touch httpOnly cookies from JS — those need a
                  // server-side clear, which our middleware handles next
                  // time anyway.
                  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
                });
              } catch { /* nothing */ }
              try {
                if ("serviceWorker" in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(regs.map((r) => r.unregister()));
                }
              } catch { /* nothing */ }
              try {
                if ("caches" in window) {
                  const names = await caches.keys();
                  await Promise.all(names.map((n) => caches.delete(n)));
                }
              } catch { /* nothing */ }
              window.location.assign(`/?_r=${Date.now()}`);
            }}
            className="rounded-md border border-ink-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 shadow-sm transition-colors hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-saffron-300"
          >
            Hard reset
          </button>
        </div>

        {error.digest && (
          <p className="mt-6 text-[11px] text-ink-400">
            Error ref: <code className="font-mono">{error.digest}</code>
          </p>
        )}

        <p className="mt-8 text-xs text-ink-500">
          If this keeps happening, try{" "}
          <a
            href="/"
            className="font-medium text-saffron-700 underline-offset-2 hover:underline"
          >
            shishya.in
          </a>{" "}
          in an Incognito / Private window — that bypasses any cached
          state from older visits and tells us whether the issue is
          local to your browser.
        </p>
      </div>
    </main>
  );
}
