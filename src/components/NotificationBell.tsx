"use client";

// Notification bell — shown in the Header for signed-in users only.
//
// IMPORTANT: this MUST be a Client Component. The parent
// HeaderAuthControls is itself a Client Component. If we made the bell
// an async Server Component (as it was historically), Next would bundle
// the server-side auth() / prisma calls into the *client* chunk — which
// then explodes in the browser with React #482 + "headers() called
// outside a request scope" the moment a signed-in user paints. See
// the incident on 27 May 2026 — every signed-in homepage view hit the
// error boundary because of this bug.
//
// Count is fetched once on mount from /api/me/notifications/unread-count
// (private, no-store). Lightweight — one indexed COUNT() per signed-in
// page load. Re-fetches on window focus so a user reading the
// /me/notifications page sees the badge clear when they come back.

import { useEffect, useState } from "react";
import Link from "next/link";

export function NotificationBell() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/me/notifications/unread-count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (alive) setCount(Number(data?.count ?? 0));
      } catch {
        if (alive) setCount(0);
      }
    }
    load();
    function onFocus() {
      load();
    }
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Until the first fetch lands we render the icon without a badge.
  // Cheaper than a skeleton — the badge is decorative, not load-critical.
  const showBadge = typeof count === "number" && count > 0;
  const label = showBadge ? `${count} unread notifications` : "Notifications";

  return (
    <Link
      href="/me/notifications"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-700 hover:bg-ink-100 hover:text-ink-900"
      aria-label={label}
      title={showBadge ? `${count} unread` : "Notifications"}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        className="h-5 w-5"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
        />
      </svg>
      {showBadge && (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-saffron-500 px-1 text-[10px] font-semibold text-white tabular-nums">
          {count! > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
