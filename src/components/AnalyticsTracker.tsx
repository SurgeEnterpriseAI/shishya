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

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";

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

// /login is the most-viewed page on the site and its views were one
// undifferentiated number. The callbackUrl says WHAT the visitor was
// trying to do when the wall appeared; this folds it into a small family
// so login views can be split by intent (11 Sep 2026 signup-leak audit).
// Order matters: /exams/X/pyq/... is "pyq", not "exam". "none" = a bare
// /login visit (cold arrival / header link) — /login itself defaults
// that to /dashboard, but it is not a dashboard intent.
export function loginCallbackFamily(cb: string | null | undefined): string {
  if (!cb) return "none";
  if (/\/pyq(\/|$|\?|#)/.test(cb)) return "pyq";
  if (/\/mocks\//.test(cb)) return "mock";
  if (/\/coach(\/|$|\?|#)/.test(cb)) return "coach";
  if (/\/dashboard(\/|$|\?|#)/.test(cb)) return "dashboard";
  if (/\/exams\//.test(cb)) return "exam";
  return "other";
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
    const props =
      pathname === "/login"
        ? {
            callbackFamily: loginCallbackFamily(searchParams?.get("callbackUrl")),
            // A failed Google sign-in comes back as /login?error=… — count it.
            ...(searchParams?.get("error") ? { error: (searchParams.get("error") ?? "").slice(0, 40) } : {}),
          }
        : undefined;
    void send("PAGE_VIEW", pathname, props, utm, { anonymous: child });
  }, [pathname, searchParams]);

  return null;
}
