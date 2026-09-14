// Beacons that ride the analytics ingest but are not visits (14 Sep 2026).
//
// The field web-vitals beacon (src/components/WebVitals.tsx) posts as
// CTA_CLICKED with props.cta = "web-vitals": one row per sampled page load,
// sent without cookies. Such a row is a measurement, never a person, so
// src/app/api/analytics/route.ts stores no uaHash / ipHash for it and event
// counts leave it out (src/lib/analytics.ts). Client-safe: no imports.

export const WEB_VITALS_CTA = "web-vitals";

/** Is this analytics event the page-speed beacon rather than a real click? */
export function isWebVitalsBeacon(kind: string | null | undefined, props: unknown): boolean {
  return (
    kind === "CTA_CLICKED" &&
    props !== null &&
    typeof props === "object" &&
    (props as { cta?: unknown }).cta === WEB_VITALS_CTA
  );
}
