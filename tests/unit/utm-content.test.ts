// utm_content on analytics events (30 Sep 2026): the YouTube test's per-video
// tag rides in props.utmContent, cleaned; never on Class 1-7 rows.
// Run: npx vitest run tests/unit/utm-content.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanUtmContent, withUtmContent } from "@/lib/utm-content";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("cleanUtmContent", () => {
  it("keeps a slug and trims junk", () => {
    expect(cleanUtmContent("ssc-cgl-tier1")).toBe("ssc-cgl-tier1");
    expect(cleanUtmContent("  SOF Sample Papers ")).toBe("sof-sample-papers");
    expect(cleanUtmContent("<script>")).toBe("script");
    expect(cleanUtmContent("a".repeat(100))).toHaveLength(64);
  });
  it("drops what is not a usable string", () => {
    expect(cleanUtmContent(undefined)).toBeNull();
    expect(cleanUtmContent(42)).toBeNull();
    expect(cleanUtmContent("  --  ")).toBeNull();
  });
});

describe("withUtmContent", () => {
  it("adds utmContent without losing props", () => {
    expect(withUtmContent({ cta: "x" }, "tnpsc-group4")).toEqual({ cta: "x", utmContent: "tnpsc-group4" });
    expect(withUtmContent(undefined, "ask-shishya")).toEqual({ utmContent: "ask-shishya" });
  });
  it("leaves props untouched when there is no tag", () => {
    const props = { a: 1 };
    expect(withUtmContent(props, undefined)).toBe(props);
    expect(withUtmContent(undefined, "")).toBeUndefined();
  });
});

describe("wiring", () => {
  it("the tracker reads utm_content into the blob it sends", () => {
    const src = read("src/components/AnalyticsTracker.tsx");
    expect(src).toContain(`const utmContent = params.get("utm_content") ?? undefined;`);
    expect(src).toContain("const blob: UtmBlob = { utmSource, utmMedium, utmCampaign, utmContent };");
  });
  it("the route keeps it in props, and never on Class 1-7 rows", () => {
    const src = read("src/app/api/analytics/route.ts");
    expect(src).toContain("props: child ? body.props : withUtmContent(body.props, body.utmContent),");
  });
});
