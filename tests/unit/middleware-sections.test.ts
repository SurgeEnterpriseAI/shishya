// Middleware on the whole-education sections (26 Sep 2026, B-machine-crawl).
//
// ChatGPT answers deep-link /schooling/cbse/class-10, /colleges/{slug} and
// /scholarships/{id}; those arrivals (utm_source=chatgpt.com, no referrer)
// passed no middleware, so their sign-ups carried no attribution and their
// crawler fetches were invisible. The matcher now covers every page of each
// section and /context.md; isSectionPath is exact-or-prefix. Observe and
// attribute only: no rewrite, no redirect, and the attribution cookie only
// on a utm tag or an outside referrer, never over an existing one.
// Runs the real middleware against NextRequests with a browser user agent,
// so the AI-bot logger never fires a request.

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "@/middleware";

const event = { waitUntil() {}, sourcePage: "" } as never;
const CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const ATTRIB = "shishya_attrib";

function run(url: string, init?: { referer?: string; cookie?: string }) {
  const headers = new Headers({ "user-agent": CHROME });
  if (init?.referer) headers.set("referer", init.referer);
  if (init?.cookie) headers.set("cookie", init.cookie);
  return middleware(new NextRequest(url, { headers }), event);
}

describe("middleware matcher covers every section page and /context.md", () => {
  it.each([
    "/schooling/:path*",
    "/colleges/:path*",
    "/scholarships/:path*",
    "/careers",
    "/careers/:path*",
    "/career-map",
    "/distance-learning",
    "/for/:path*",
    "/worldwide/:path*",
    "/insights/:path*",
    "/jobs/:path*",
    "/context.md",
  ])("%s", (entry) => {
    expect(config.matcher).toContain(entry);
  });

  it("keeps every entry it had (exams, twins, login, crawler files)", () => {
    for (const e of ["/", "/hi/:path*", "/te/:path*", "/exams/:path*", "/login", "/mocks/:path*", "/api/auth/signin/:path*", "/llms.txt", "/llms-full.txt", "/robots.txt", "/sitemap.xml"]) {
      expect(config.matcher).toContain(e);
    }
  });
});

describe("attribution on section deep links", () => {
  it("a ChatGPT arrival on a school class page sets the attribution cookie", () => {
    const res = run("https://shishya.in/schooling/cbse/class-10?utm_source=chatgpt.com");
    const c = res.cookies.get(ATTRIB);
    expect(c).toBeDefined();
    expect(JSON.parse(c!.value)).toMatchObject({ utm_source: "chatgpt.com", direct: false });
    expect(c!.httpOnly).toBe(true);
  });

  it.each([
    "https://shishya.in/colleges/iit-madras?utm_source=chatgpt.com",
    "https://shishya.in/scholarships/nsp-post-matric?utm_source=chatgpt.com",
    "https://shishya.in/careers/software-engineer?utm_source=chatgpt.com",
    "https://shishya.in/career-map?utm_source=chatgpt.com",
    "https://shishya.in/distance-learning?utm_source=chatgpt.com",
    "https://shishya.in/for/class-10-student?utm_source=chatgpt.com",
    "https://shishya.in/worldwide/uk?utm_source=chatgpt.com",
    "https://shishya.in/insights/some-article?utm_source=chatgpt.com",
    "https://shishya.in/jobs/govt-jobs?utm_source=chatgpt.com",
    "https://shishya.in/post-graduation?utm_source=chatgpt.com",
  ])("%s sets it too", (u) => {
    expect(run(u).cookies.get(ATTRIB)).toBeDefined();
  });

  it("an outside referrer with no utm also counts", () => {
    const res = run("https://shishya.in/schooling/cbse/class-10", { referer: "https://www.bing.com/" });
    expect(JSON.parse(res.cookies.get(ATTRIB)!.value)).toMatchObject({ ref: "https://www.bing.com/", direct: false });
  });

  it("an internal click (shishya.in referrer, no utm) sets none", () => {
    const res = run("https://shishya.in/schooling/cbse/class-10", { referer: "https://shishya.in/schooling" });
    expect(res.cookies.get(ATTRIB)).toBeUndefined();
  });

  it("a plain organic view with no trail sets none (the first-visit slot waits for /login)", () => {
    expect(run("https://shishya.in/colleges/iit-madras").cookies.get(ATTRIB)).toBeUndefined();
  });

  it("an existing attribution cookie is never overwritten", () => {
    const res = run("https://shishya.in/schooling/cbse/class-10?utm_source=chatgpt.com", { cookie: `${ATTRIB}=${encodeURIComponent('{"utm_source":"whatsapp"}')}` });
    expect(res.cookies.get(ATTRIB)).toBeUndefined();
  });

  it("exact-or-prefix: /jobs-map and /forum-like paths are not section pages", () => {
    // /jobs-map is its own matcher entry but not a section path.
    expect(run("https://shishya.in/jobs-map?utm_source=chatgpt.com").cookies.get(ATTRIB)).toBeUndefined();
  });
});

describe("observe only: no rewrite, no redirect", () => {
  it.each(["https://shishya.in/schooling/cbse/class-10?utm_source=chatgpt.com", "https://shishya.in/colleges/iit-madras", "https://shishya.in/careers"])(
    "%s passes through untouched",
    (u) => {
      const res = run(u);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-next")).toBe("1");
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
      expect(res.headers.get("location")).toBeNull();
    },
  );

  it("/context.md is observe-only: passes through with no cookie even with utm tags", () => {
    const res = run("https://shishya.in/context.md?utm_source=chatgpt.com");
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.cookies.get(ATTRIB)).toBeUndefined();
  });
});
