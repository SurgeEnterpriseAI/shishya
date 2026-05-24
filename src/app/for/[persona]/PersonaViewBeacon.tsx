"use client";

// Fires a single "persona_landing_view" analytics event when a visitor
// lands on /for/[persona]. Client island so the rest of the page stays
// statically renderable + edge-cacheable.
//
// Uses kind=CTA_CLICKED (the generic ad-hoc event in the AnalyticsEvent
// enum) with the actual event subtype + persona slug in props. Keeps
// us off the schema-migration path while still letting the admin
// dashboard slice by persona.

import { useEffect, useRef } from "react";

export function PersonaViewBeacon({ personaSlug }: { personaSlug: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "CTA_CLICKED",
        path: `/for/${personaSlug}`,
        props: { event: "persona_landing_view", persona: personaSlug },
      }),
      // Keep the request fire-and-forget — page rendering doesn't wait.
      keepalive: true,
    }).catch(() => {
      // analytics failures must not break UX
    });
  }, [personaSlug]);
  return null;
}
