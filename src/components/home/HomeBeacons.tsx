"use client";

// One delegated click beacon for the home page (26 Sep 2026): every door,
// pill, chip and line carries data-home-cta="<name>"; a click on any of
// them sends CTA_CLICKED { cta, surface: "home-doors" } through the
// window.shishyaTrack the root AnalyticsTracker installs. This is how the
// redesign is read after deploy (which door people take, whether the
// tutor line holds) — one tiny island instead of a client component per
// link. Renders nothing; best-effort, never blocks navigation.

import { useEffect } from "react";

export const HOME_CTA_SURFACE = "home-doors";

export function HomeBeacons() {
  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as Element | null;
      const el = target?.closest?.("[data-home-cta]");
      const cta = el?.getAttribute("data-home-cta");
      if (!cta) return;
      try {
        window.shishyaTrack?.("CTA_CLICKED", { cta, surface: HOME_CTA_SURFACE });
      } catch {
        /* analytics is best-effort */
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
