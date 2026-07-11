"use client";

// AnalyticsTracker — mounts once in the root layout. Two jobs:
//
//   1. Fire PAGE_VIEW on every pathname change (App Router's
//      usePathname + useSearchParams).
//   2. Expose a tiny global `window.shishyaTrack(kind, props?)` for
//      any client component that wants to fire an event without
//      importing the module. Used by the chapter quiz player,
//      scholarship "Save" button, chat opener, etc.
//
// UTM params on the current URL get attached automatically. Once
// captured, they're persisted in sessionStorage so that subsequent
// in-app navigation still credits the original source.

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type EventKind =
  | "PAGE_VIEW"
  | "SIGNUP"
  | "VERIFICATION_SUBMITTED"
  | "QUIZ_ATTEMPTED"
  | "CHAPTER_COMPLETED"
  | "SCHOLARSHIP_SAVED"
  | "CHAT_OPENED"
  | "CTA_CLICKED";

const UTM_STORAGE_KEY = "shishya:utm";

interface UtmBlob {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

declare global {
  interface Window {
    /** Fire an analytics event from any client component. */
    shishyaTrack?: (kind: EventKind, props?: Record<string, unknown>) => void;
  }
}

function readUtmFromStorage(): UtmBlob {
  try {
    const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmBlob) : {};
  } catch {
    return {};
  }
}

function captureUtmFromUrl(params: URLSearchParams): UtmBlob {
  const utmSource = params.get("utm_source") ?? undefined;
  const utmMedium = params.get("utm_medium") ?? undefined;
  const utmCampaign = params.get("utm_campaign") ?? undefined;
  if (!utmSource && !utmMedium && !utmCampaign) return {};
  const blob: UtmBlob = { utmSource, utmMedium, utmCampaign };
  try {
    window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(blob));
  } catch { /* sessionStorage disabled */ }
  return blob;
}

async function send(
  kind: EventKind,
  path: string,
  props: Record<string, unknown> | undefined,
  utm: UtmBlob,
): Promise<void> {
  try {
    // The API can't see the TRUE referrer from its own request headers —
    // the fetch's Referer is always our own page (same-host, dropped). Send
    // document.referrer explicitly so channel attribution (google /
    // chatgpt / whatsapp / …) actually works. Meaningful on the landing
    // page-view; harmless (same-host, dropped server-side) after that.
    const referrer = typeof document !== "undefined" ? document.referrer || undefined : undefined;
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive lets the request finish even if the user is navigating away
      keepalive: true,
      body: JSON.stringify({ kind, path, props, referrer, ...utm }),
    });
  } catch {
    /* analytics failures must never disturb the user */
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastFiredRef = useRef<string | null>(null);

  // Install window.shishyaTrack once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const utm = readUtmFromStorage();
    window.shishyaTrack = (kind, props) => {
      void send(kind, window.location.pathname, props, { ...utm, ...readUtmFromStorage() });
    };
  }, []);

  // PAGE_VIEW on every pathname change.
  useEffect(() => {
    if (!pathname) return;
    // Skip /api routes and the admin/dashboard tour-only sub-routes from
    // PAGE_VIEW tracking — they're either non-pages or already tracked
    // via the dashboard's own instrumentation.
    if (pathname.startsWith("/api/")) return;

    const utm = { ...readUtmFromStorage(), ...captureUtmFromUrl(searchParams ?? new URLSearchParams()) };
    // Dedupe: don't fire the same pathname twice in a row (React Strict
    // Mode + back-forward cache cause double fires).
    const fullKey = pathname + (searchParams?.toString() ?? "");
    if (lastFiredRef.current === fullKey) return;
    lastFiredRef.current = fullKey;
    void send("PAGE_VIEW", pathname, undefined, utm);
  }, [pathname, searchParams]);

  return null;
}
