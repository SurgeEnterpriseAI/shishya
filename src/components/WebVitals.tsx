"use client";

// Field web vitals (13 Sep 2026, phone-first speed audit: "no field
// web-vitals data"). One beacon per sampled hard page load with LCP, CLS,
// INP and TTFB, sent when the tab is hidden or the page is left.
//
// Why PerformanceObserver and not next/web-vitals: the `web-vitals`
// package is not a dependency, and the copy bundled inside Next reports
// CLS/INP from its own visibilitychange listener, registered late (after
// FCP) — a single "send everything on hide" beacon could fire before those
// callbacks and lose the two metrics. Here the final values are read
// synchronously with takeRecords() inside our own hide handler, so there is
// no listener-order race. Definitions follow web.dev:
//   • LCP  — startTime of the last largest-contentful-paint entry;
//   • CLS  — largest session window (shifts < 1 s apart, window < 5 s),
//            ignoring shifts right after input;
//   • INP  — longest interaction duration (event entries with an
//            interactionId, >= 40 ms observed). web-vitals uses the p98
//            interaction, which equals the max below 50 interactions — the
//            normal page on this site; documented simplification;
//   • TTFB — navigation entry responseStart.
// LCP/TTFB describe the hard load; CLS/INP accumulate across the soft
// navigations until the tab is hidden, like CrUX's per-page-load view.
//
// Ingest: POST /api/analytics as the existing CTA_CLICKED kind with
// props.cta = "web-vitals" (adding an EventKind needs a DB enum change).
// credentials:"omit" + no referrer on purpose: the ingest route starts an
// anonymous identity on any cookie-returning second beacon, which would
// turn this measurement row into a "visitor" (DAU, phantom-scrub rules).
// Without cookies the row is unidentified — never a person, never a
// PAGE_VIEW, zero effect on the aspirant counter. No PII in props, and the
// path is a ROUTE TEMPLATE (/attempts/[id]/results), never a raw path with
// a student's record id in it.
//
// ── Switched on 14 Sep 2026 (SAMPLE_RATE 0 → 0.5) ──────────────────────
// The 13 Sep review kept it off until two outside changes landed; both ship
// in the same change:
//   1. PRIVACY. api/analytics/route.ts fingerprints unidentified rows
//      (uaHash + monthly ipHash). It now skips both for this beacon
//      (isWebVitalsBeacon, src/lib/analytics-beacons.ts). Otherwise a vitals
//      row from a real student would carry an IP hash seconds after their
//      identified PAGE_VIEW — a user↔IP join channel — and bot-scrub's
//      non-PAGE_VIEW retag would reach these rows.
//   2. HONEST NUMBERS. lib/analytics.ts eventCountsByKind leaves these rows
//      out, so "Event counts by kind" is not inflated by half of page loads.
// The privacy page names the page-speed measurement. Readout:
// scripts/web-vitals-report.ts (p75 per metric, touch vs mouse, per route).

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { WEB_VITALS_CTA } from "@/lib/analytics-beacons";
import { hasSessionHint, routeTemplatePath } from "@/lib/session-hint";

/** Share of page loads that report. Rows are ~300 B, no model calls. */
const SAMPLE_RATE = 0.5;

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}
interface EventTimingEntry extends PerformanceEntry {
  interactionId?: number;
}
type Handler = (entries: PerformanceEntry[]) => void;

export function WebVitals() {
  // Full param set of the current route (Next resolves it from the whole
  // router tree, so a footer island sees the page's [id] / [code] / …).
  const params = useParams();
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;
    if (Math.random() >= SAMPLE_RATE) return;

    const supported: readonly string[] = PerformanceObserver.supportedEntryTypes ?? [];
    // The hard-load route, templated: no per-student ids ever leave the page.
    const path = routeTemplatePath(location.pathname, paramsRef.current);
    let lcp: number | null = null;
    let cls = 0;
    let clsSeen = false;
    let winValue = 0;
    let winFirst = 0;
    let winLast = 0;
    let inp: number | null = null;
    let sent = false;
    const observers: Array<[PerformanceObserver, Handler]> = [];

    const onLcp: Handler = (entries) => {
      const last = entries[entries.length - 1];
      if (last) lcp = last.startTime;
    };
    const onShift: Handler = (entries) => {
      for (const raw of entries) {
        const e = raw as LayoutShiftEntry;
        if (e.hadRecentInput) continue;
        clsSeen = true;
        if (winValue > 0 && e.startTime - winLast < 1000 && e.startTime - winFirst < 5000) {
          winValue += e.value;
          winLast = e.startTime;
        } else {
          winValue = e.value;
          winFirst = e.startTime;
          winLast = e.startTime;
        }
        if (winValue > cls) cls = winValue;
      }
    };
    const onEvent: Handler = (entries) => {
      for (const raw of entries) {
        const e = raw as EventTimingEntry;
        if (!e.interactionId) continue;
        if (inp == null || e.duration > inp) inp = e.duration;
      }
    };

    function observe(type: string, handler: Handler, extra?: Record<string, unknown>) {
      if (!supported.includes(type)) return;
      try {
        const po = new PerformanceObserver((list) => handler(list.getEntries()));
        po.observe({ type, buffered: true, ...(extra ?? {}) } as PerformanceObserverInit);
        observers.push([po, handler]);
      } catch {
        /* entry type not observable here */
      }
    }

    observe("largest-contentful-paint", onLcp);
    observe("layout-shift", onShift);
    observe("event", onEvent, { durationThreshold: 40 });

    function report() {
      if (sent) return;
      sent = true;
      for (const [po, handler] of observers) {
        try {
          handler(po.takeRecords());
          po.disconnect();
        } catch {
          /* ignore */
        }
      }
      let ttfb: number | null = null;
      let navType: string | null = null;
      try {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        if (nav && nav.responseStart > 0) ttfb = nav.responseStart;
        navType = nav?.type ?? null;
      } catch {
        /* old browser */
      }
      if (lcp == null && ttfb == null) return;

      let conn: string | null = null;
      let coarse: boolean | null = null;
      try {
        conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? null;
        coarse = window.matchMedia("(pointer: coarse)").matches;
      } catch {
        /* optional */
      }

      const body = JSON.stringify({
        kind: "CTA_CLICKED",
        path,
        props: {
          cta: WEB_VITALS_CTA,
          lcp: lcp == null ? null : Math.round(lcp),
          cls: clsSeen ? Math.round(cls * 1000) / 1000 : 0,
          inp: inp == null ? null : Math.round(inp),
          ttfb: ttfb == null ? null : Math.round(ttfb),
          nav: navType,
          conn,
          coarse,
          lang: document.documentElement.lang || null,
          signedIn: hasSessionHint(),
        },
      });
      try {
        void fetch("/api/analytics", {
          method: "POST",
          keepalive: true,
          credentials: "omit",
          referrerPolicy: "no-referrer",
          headers: { "Content-Type": "application/json" },
          body,
        }).catch(() => {});
      } catch {
        /* best-effort */
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") report();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", report);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", report);
      for (const [po] of observers) {
        try {
          po.disconnect();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return null;
}
