// The page-speed beacon is recognised so the analytics route stores no
// fingerprints for it and event counts leave it out (14 Sep 2026).
// Pure — no DB. Run: npx vitest run tests/unit/analytics-beacons.test.ts

import { describe, it, expect } from "vitest";
import { isWebVitalsBeacon, WEB_VITALS_CTA } from "@/lib/analytics-beacons";

describe("isWebVitalsBeacon", () => {
  it("recognises the page-speed beacon", () => {
    expect(isWebVitalsBeacon("CTA_CLICKED", { cta: WEB_VITALS_CTA, lcp: 1840, coarse: true })).toBe(true);
  });

  it("never takes a real click or another event kind for it", () => {
    expect(isWebVitalsBeacon("CTA_CLICKED", { cta: "hero-signup" })).toBe(false);
    expect(isWebVitalsBeacon("PAGE_VIEW", { cta: WEB_VITALS_CTA })).toBe(false);
    expect(isWebVitalsBeacon(undefined, { cta: WEB_VITALS_CTA })).toBe(false);
  });

  it("is false for missing or malformed props", () => {
    expect(isWebVitalsBeacon("CTA_CLICKED", null)).toBe(false);
    expect(isWebVitalsBeacon("CTA_CLICKED", undefined)).toBe(false);
    expect(isWebVitalsBeacon("CTA_CLICKED", WEB_VITALS_CTA)).toBe(false);
  });
});
