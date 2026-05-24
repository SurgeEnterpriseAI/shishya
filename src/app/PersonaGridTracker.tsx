"use client";

// Tracks persona tile clicks on the homepage. Sits invisibly under
// the persona <ul> and intercepts clicks on any <a href="/for/...">
// child, firing an analytics event BEFORE the navigation.
//
// This lets us measure tile CTR per persona without rewriting the
// server-rendered grid into a client component (which would defeat
// the static / edge-cached homepage). Adds one event-listener at the
// root; lightweight.

import { useEffect } from "react";

export function PersonaGridTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Only handle plain-link clicks (no modifier-key new-tab cases).
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a[href^='/for/']") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      // /for/<slug> — extract the slug.
      const m = href.match(/^\/for\/([^/?#]+)/);
      if (!m) return;
      const personaSlug = m[1];
      // Fire and forget; don't block the navigation.
      try {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "CTA_CLICKED",
            path: window.location.pathname,
            props: { event: "persona_tile_click", persona: personaSlug },
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // never throw — analytics is non-essential
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
