// X-Robots-Tag headers in next.config.ts (3 Oct 2026, crawl-audit fix C1).
//
//   • /discussions and /discussions/*: "noindex, follow" while
//     DISCUSSIONS_INDEXABLE (src/lib/discussion-visibility.ts) is false —
//     no student has posted and every stored thread was Shishya's.
//   • private pages: "noindex, nofollow" (dashboard, today, me, onboarding,
//     logout, mentor, attempts, admin, i, discussions/new, an exam's
//     attempts, api) or "noindex" (login, chat, mocks). A search engine
//     obeys noindex only on a URL it may fetch; a header is on every response,
//     a 307 and a streamed 200 alike.
// When two entries match a path and set the same key, Next keeps the LAST,
// so the private list comes after the discussions list and /discussions/new
// ends "noindex, nofollow". Each source is compiled with Next's own builder
// (the regex that goes into routes-manifest.json), so this matches what the
// deployment matches. No network.
// Run: npx vitest run tests/unit/robots-headers.test.ts

import { describe, expect, it } from "vitest";
import { buildCustomRoute } from "next/dist/lib/build-custom-route";
import nextConfig from "../../next.config";
import { DISCUSSIONS_INDEXABLE } from "@/lib/discussion-visibility";

type HeaderRoute = { source: string; headers: Array<{ key: string; value: string }> };

const routes = (await nextConfig.headers!()) as HeaderRoute[];
const compiled = routes.map((r) => ({ ...r, re: new RegExp(buildCustomRoute("header", r).regex) }));

/** The X-Robots-Tag a path ends up with: the value of the LAST matching entry. */
function robotsTag(pathname: string): string | undefined {
  let value: string | undefined;
  for (const r of compiled) {
    if (!r.re.test(pathname)) continue;
    const h = r.headers.find((x) => x.key.toLowerCase() === "x-robots-tag");
    if (h) value = h.value;
  }
  return value;
}

describe("next.config.ts headers(): X-Robots-Tag", () => {
  it("every entry sets only X-Robots-Tag", () => {
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) expect(r.headers.map((h) => h.key)).toEqual(["X-Robots-Tag"]);
  });

  it("/discussions and every thread: noindex, follow", () => {
    for (const p of ["/discussions", "/discussions/abc", "/discussions/cmoykr4jw0023rxwbnuai7m3p"]) {
      expect(robotsTag(p), p).toBe("noindex, follow");
    }
  });

  it("while DISCUSSIONS_INDEXABLE is false both discussion sources are present", () => {
    expect(DISCUSSIONS_INDEXABLE).toBe(false);
    const sources = routes.map((r) => r.source);
    expect(sources).toContain("/discussions");
    expect(sources).toContain("/discussions/:path*");
  });

  it("private pages: noindex, nofollow (the private list wins on /discussions/new)", () => {
    for (const p of [
      "/discussions/new",
      "/dashboard",
      "/me",
      "/me/settings",
      "/today",
      "/onboarding",
      "/logout",
      "/mentor/x",
      "/admin",
      "/admin/insights",
      "/attempts/1/results",
      "/exams/SSC_CGL/attempts",
      "/i/dashboard",
      "/api/x",
    ]) {
      expect(robotsTag(p), p).toBe("noindex, nofollow");
    }
  });

  it("login, chat and guest mocks: noindex", () => {
    for (const p of ["/login", "/login/institution", "/chat", "/mocks/1"]) {
      expect(robotsTag(p), p).toBe("noindex");
    }
  });

  it("public pages carry no X-Robots-Tag", () => {
    for (const p of ["/", "/mentors", "/mock-tests", "/exams/SSC_CGL", "/ask", "/coach", "/revision", "/share/1", "/menu", "/discussionsx"]) {
      expect(robotsTag(p), p).toBeUndefined();
    }
  });
});
