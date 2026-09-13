import { describe, expect, it } from "vitest";
import {
  LEGACY_PROBE_UNTIL_MS,
  SESSION_HINT_COOKIE,
  SESSION_HINT_MAX_AGE_S,
  cookieHasSessionHint,
  decideSessionProbe,
  fetchSignedIn,
  hasSessionHint,
  isSignedInOnlyPath,
  routeTemplatePath,
  sessionHintCookieString,
} from "@/lib/session-hint";

const AFTER_LEGACY = LEGACY_PROBE_UNTIL_MS + 1;
const DURING_LEGACY = Date.UTC(2026, 8, 14);

describe("cookieHasSessionHint", () => {
  it("finds the hint anywhere in a cookie string", () => {
    expect(cookieHasSessionHint("shishya_in=1")).toBe(true);
    expect(cookieHasSessionHint("a=b; shishya_in=1")).toBe(true);
    expect(cookieHasSessionHint("shishya_in=1; shishya-lang=hi")).toBe(true);
  });
  it("does not match a cleared, different-valued or look-alike cookie", () => {
    expect(cookieHasSessionHint("")).toBe(false);
    expect(cookieHasSessionHint(null)).toBe(false);
    expect(cookieHasSessionHint("shishya_in=")).toBe(false);
    expect(cookieHasSessionHint("shishya_in=0")).toBe(false);
    expect(cookieHasSessionHint("shishya_in=10")).toBe(false);
    expect(cookieHasSessionHint("xshishya_in=1")).toBe(false);
    expect(cookieHasSessionHint("shishya_install=1")).toBe(false);
  });
});

describe("isSignedInOnlyPath", () => {
  it("covers the routes whose server page redirects guests to /login", () => {
    for (const p of ["/dashboard", "/today", "/onboarding", "/me", "/me/settings", "/me/report/pack", "/mentor", "/mentor/abc", "/mocks/ck123", "/attempts/ck1/results", "/dashboard/"]) {
      expect(isSignedInOnlyPath(p), p).toBe(true);
    }
  });
  it("never covers public pages guests land on", () => {
    for (const p of ["/", "/login", "/exams", "/exams/SSC_CGL", "/exams/SSC_CGL/topics/x", "/mocks", "/mocks/ck1/print", "/attempts/ck1", "/hi", "/meet", "/mentors", "/today-x", "/exam-calendar"]) {
      expect(isSignedInOnlyPath(p), p).toBe(false);
    }
  });
  it("ignores query strings and hashes", () => {
    expect(isSignedInOnlyPath("/today?utm_source=pwa")).toBe(true);
    expect(isSignedInOnlyPath("/exams/X?start=diagnostic#mocks")).toBe(false);
  });
});

describe("routeTemplatePath (web-vitals beacon path)", () => {
  it("replaces every route param value with its name", () => {
    expect(routeTemplatePath("/attempts/ck9/results", { id: "ck9" })).toBe("/attempts/[id]/results");
    expect(routeTemplatePath("/mocks/abc", { id: "abc" })).toBe("/mocks/[id]");
    expect(routeTemplatePath("/u/venu", { handle: "venu" })).toBe("/u/[handle]");
    expect(routeTemplatePath("/join/AB12", { inviteCode: "AB12" })).toBe("/join/[inviteCode]");
    expect(routeTemplatePath("/mentor/m1", { id: "m1" })).toBe("/mentor/[id]");
    expect(routeTemplatePath("/exams/SSC_CGL/topics/percentages", { code: "SSC_CGL", topicCode: "percentages" })).toBe(
      "/exams/[code]/topics/[topicCode]",
    );
    expect(routeTemplatePath("/hi/exams/SSC_CGL", { code: "SSC_CGL" })).toBe("/hi/exams/[code]");
  });
  it("matches URL-encoded segments and catch-all arrays", () => {
    expect(routeTemplatePath("/u/ravi%20k", { handle: "ravi k" })).toBe("/u/[handle]");
    expect(routeTemplatePath("/docs/a/b", { slug: ["a", "b"] })).toBe("/docs/[slug]/[slug]");
  });
  it("redacts id-shaped segments even without params", () => {
    expect(routeTemplatePath("/attempts/clx7q2k9f0000abcd1234efgh/results", {})).toBe("/attempts/[id]/results");
    expect(routeTemplatePath("/share/3f2b8c1e-9a4d-4e21-b7a0-5c6d7e8f9a0b", null)).toBe("/share/[id]");
    expect(routeTemplatePath("/x/1234567", undefined)).toBe("/x/[id]");
  });
  it("keeps static routes, drops query and hash", () => {
    expect(routeTemplatePath("/", {})).toBe("/");
    expect(routeTemplatePath("/exam-calendar?utm_source=pwa#top", {})).toBe("/exam-calendar");
    expect(routeTemplatePath("/me/report", {})).toBe("/me/report");
    expect(routeTemplatePath("/exams/SSC_CGL/pyq/2023", {})).toBe("/exams/SSC_CGL/pyq/2023");
    expect(routeTemplatePath("", {})).toBe("/");
  });
});

describe("decideSessionProbe", () => {
  const guestPage = { hint: false, path: "/exams/SSC_CGL", nowMs: AFTER_LEGACY, legacyProbed: true };

  it("a guest on a public page makes no request", () => {
    expect(decideSessionProbe(guestPage)).toBe("guest");
  });
  it("probes whenever the hint is present", () => {
    expect(decideSessionProbe({ ...guestPage, hint: true })).toBe("probe");
  });
  it("probes on a signed-in-only page even without the hint (lost-hint recovery)", () => {
    expect(decideSessionProbe({ ...guestPage, path: "/dashboard" })).toBe("probe");
  });
  it("probes once per browser during the legacy window, then never", () => {
    expect(decideSessionProbe({ ...guestPage, nowMs: DURING_LEGACY, legacyProbed: false })).toBe("probe");
    expect(decideSessionProbe({ ...guestPage, nowMs: DURING_LEGACY, legacyProbed: true })).toBe("guest");
    expect(decideSessionProbe({ ...guestPage, nowMs: AFTER_LEGACY, legacyProbed: false })).toBe("guest");
  });
  it("the legacy window closes after the 30-day JWT lifetime from the deploy", () => {
    expect(LEGACY_PROBE_UNTIL_MS).toBeGreaterThan(Date.UTC(2026, 9, 13));
    expect(LEGACY_PROBE_UNTIL_MS).toBeLessThan(Date.UTC(2026, 10, 1));
  });
});

describe("sessionHintCookieString", () => {
  it("sets a PII-free, path-wide, 30-day, lax cookie", () => {
    const s = sessionHintCookieString(true, true);
    expect(s.startsWith(`${SESSION_HINT_COOKIE}=1;`)).toBe(true);
    expect(s).toContain("path=/");
    expect(s).toContain(`max-age=${SESSION_HINT_MAX_AGE_S}`);
    expect(SESSION_HINT_MAX_AGE_S).toBe(30 * 24 * 3600);
    expect(s).toContain("samesite=lax");
    expect(s).toContain("secure");
    expect(s.toLowerCase()).not.toContain("httponly");
  });
  it("clears with max-age=0 and omits secure on http", () => {
    const s = sessionHintCookieString(false, false);
    expect(s.startsWith(`${SESSION_HINT_COOKIE}=;`)).toBe(true);
    expect(s).toContain("max-age=0");
    expect(s).not.toContain("secure");
  });
});

describe("DOM wrappers without a DOM (node / server import)", () => {
  it("hasSessionHint is false and never throws", () => {
    expect(hasSessionHint()).toBe(false);
  });
  it("fetchSignedIn answers guest with no request when nothing says signed in", async () => {
    const realFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("{}");
    }) as typeof fetch;
    try {
      // No document, no localStorage (→ treated as already probed), path "/".
      await expect(fetchSignedIn()).resolves.toBe(false);
      expect(calls).toBe(0);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
