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
//
// Class 1-7 school pages (27 Sep 2026, founder rule 5: below 13, content
// only and NO DATA TAKEN): on /schooling/{board}/class-1 … class-7 every
// event goes out "anonymous" — no cookie (credentials omit), no referrer
// (neither document.referrer in the body nor the Referer header), no utm,
// and nothing captured into sessionStorage. The ingest route
// (src/app/api/analytics/route.ts) stores a bare count for those paths and
// issues no cookie, so a stale client cannot undo this either.
// sendChildSafeEvent is the same send for other islands on those pages
// (the school chapter quiz's finish).
//
// 30 Sep 2026 (sign-up build 1, src/lib/signin-cta.ts):
//   • the /login PAGE_VIEW also carries ?from= (the door that sent the
//     visitor) and, in an in-app browser, its family label (inApp) — never
//     the raw user agent;
//   • the browser's first page view writes its path into the first-party
//     `shishya_land` cookie (path only, 30 days), which the SIGNUP event
//     reads — never on a Class 1-7 page;
//   • a click on any plain link to /login (a server-rendered one, or one in a
//     file with no beacon of its own) sends the one sign-in beacon
//     { cta: "signin-click", surface: data-signin-surface or "link" };
//     buttons that beacon themselves carry data-signin-beacon="self".

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { inAppBrowser } from "@/lib/in-app-browser";
import {
  cleanFrom,
  cookieHasLanding,
  landingCookieString,
  loginCallbackFamily,
  signinBeacon,
  signinLinkBeaconProps,
} from "@/lib/signin-cta";

// The families moved to src/lib/signin-cta.ts (30 Sep 2026) so the server's
// SIGNUP event shares them; re-exported for existing importers.
export { loginCallbackFamily };

type EventKind =
  | "PAGE_VIEW"
  | "SIGNUP"
  | "VERIFICATION_SUBMITTED"
  | "QUIZ_ATTEMPTED"
  | "CHAPTER_COMPLETED"
  | "SCHOLARSHIP_SAVED"
  | "CHAT_OPENED"
  | "CTA_CLICKED"
  | "SEARCH_MISS";

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
  opts: { anonymous?: boolean } = {},
): Promise<void> {
  try {
    // Class 1-7 pages (see the header): a bare event — no cookie, no
    // referrer, no utm.
    const anonymous = opts.anonymous === true;
    // The API can't see the TRUE referrer from its own request headers —
    // the fetch's Referer is always our own page (same-host, dropped). Send
    // document.referrer explicitly so channel attribution (google /
    // chatgpt / whatsapp / …) actually works. Meaningful on the landing
    // page-view; harmless (same-host, dropped server-side) after that.
    const referrer = !anonymous && typeof document !== "undefined" ? document.referrer || undefined : undefined;
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive lets the request finish even if the user is navigating away
      keepalive: true,
      ...(anonymous ? { credentials: "omit" as const, referrerPolicy: "no-referrer" as const } : {}),
      body: JSON.stringify(anonymous ? { kind, path, props } : { kind, path, props, referrer, ...utm }),
    });
  } catch {
    /* analytics failures must never disturb the user */
  }
}

/** One event with no cookie, no referrer and no utm — for islands on the
 *  Class 1-7 school pages (founder rule 5, 27 Sep 2026). Fire-and-forget. */
export function sendChildSafeEvent(kind: EventKind, path: string, props?: Record<string, unknown>): void {
  void send(kind, path, props, {}, { anonymous: true });
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastFiredRef = useRef<string | null>(null);

  // Sign-in clicks on plain /login links (30 Sep 2026): one delegated
  // listener, capture phase, so a next/link soft navigation still counts.
  // Class 1-7 pages carry no sign-in and take no data: nothing is sent there.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      try {
        if (isUnder13SchoolPath(window.location.pathname)) return;
        const el = e.target instanceof Element ? e.target.closest("a[href]") : null;
        const props = signinLinkBeaconProps(el, window.location.origin);
        if (!props) return;
        const { surface, ...rest } = props;
        signinBeacon(surface, { ...rest, via: "login" });
      } catch {
        /* analytics is best-effort */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Install window.shishyaTrack once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const utm = readUtmFromStorage();
    window.shishyaTrack = (kind, props) => {
      // Class 1-7 pages: the anonymous send (founder rule 5).
      if (isUnder13SchoolPath(window.location.pathname)) {
        sendChildSafeEvent(kind, window.location.pathname, props);
        return;
      }
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

    // Class 1-7 pages (founder rule 5): no utm captured into sessionStorage,
    // and the view goes out with no cookie, referrer or utm.
    const child = isUnder13SchoolPath(pathname);
    const utm = child ? {} : { ...readUtmFromStorage(), ...captureUtmFromUrl(searchParams ?? new URLSearchParams()) };
    // Dedupe: don't fire the same pathname twice in a row (React Strict
    // Mode + back-forward cache cause double fires).
    const fullKey = pathname + (searchParams?.toString() ?? "");
    if (lastFiredRef.current === fullKey) return;
    lastFiredRef.current = fullKey;
    // First landing (30 Sep 2026): written once per browser, never on a
    // Class 1-7 page; the SIGNUP event reads it (src/lib/auth.ts).
    if (!child) {
      try {
        if (!cookieHasLanding(document.cookie)) {
          const c = landingCookieString(pathname, location.protocol === "https:");
          if (c) document.cookie = c;
        }
      } catch {
        /* cookies disabled */
      }
    }
    const from = pathname === "/login" ? cleanFrom(searchParams?.get("from")) : null;
    const inApp = pathname === "/login" ? inAppBrowser(typeof navigator !== "undefined" ? navigator.userAgent : "") : null;
    const props =
      pathname === "/login"
        ? {
            callbackFamily: loginCallbackFamily(searchParams?.get("callbackUrl")),
            // A failed Google sign-in comes back as /login?error=… — count it.
            ...(searchParams?.get("error") ? { error: (searchParams.get("error") ?? "").slice(0, 40) } : {}),
            // 30 Sep 2026: the door that sent them, and an in-app browser's family.
            ...(from ? { from } : {}),
            ...(inApp ? { inApp } : {}),
          }
        : undefined;
    void send("PAGE_VIEW", pathname, props, utm, { anonymous: child });
  }, [pathname, searchParams]);

  return null;
}
