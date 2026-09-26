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
import { aiBotName, config, middleware } from "@/middleware";

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
    // 27 Sep 2026 (integration)
    "/mock-tests",
    "/subjects",
    "/subjects/:path*",
    "/sitemap-news.xml",
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
    "https://shishya.in/mock-tests?utm_source=chatgpt.com",
    "https://shishya.in/subjects/reasoning?utm_source=chatgpt.com",
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

  it("/sitemap-news.xml is observe-only too (27 Sep 2026)", () => {
    const res = run("https://shishya.in/sitemap-news.xml?utm_source=chatgpt.com");
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get(ATTRIB)).toBeUndefined();
  });

  it.each(["https://shishya.in/mock-tests", "https://shishya.in/subjects/reasoning", "https://shishya.in/subjects"])("%s passes through untouched (27 Sep 2026)", (u) => {
    const res = run(u);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("location")).toBeNull();
  });
});

// ── 26 Sep 2026 (discoverability G2): one 308 to the canonical URL ──────
// Typed and LLM-written URLs (lower-case codes, bare exam names, /Exams,
// /schooling/cbse/10/maths, /colleges/iitb, dead section paths) reach the
// canonical page with ONE permanent redirect; canonical paths, the static
// /exams folders and codes with no hub are untouched (src/lib/url-normalize.ts).

const location = (res: Response) => {
  const l = res.headers.get("location");
  if (!l) return null;
  const u = new URL(l);
  return `${u.pathname}${u.search}`;
};

describe("canonical redirects (308, one hop, query kept)", () => {
  it.each([
    ["/exams/ssc_cgl", "/exams/SSC_CGL"],
    ["/exams/neet", "/exams/NEET_UG"],
    ["/exams/jee-main/syllabus", "/exams/JEE_MAIN/syllabus"],
    ["/Exams/SSC_CGL", "/exams/SSC_CGL"],
    ["/EXAMS/upsc", "/exams/UPSC_PRELIMS"],
    ["/hi/exams/ssc_cgl", "/hi/exams/SSC_CGL"],
    ["/exams/SSC_CGL/news", "/exams/SSC_CGL/archive"],
    ["/exams/SSC_CGL/results", "/exams/SSC_CGL/updates"],
    ["/current-affairs/capsule", "/current-affairs"],
    ["/colleges/stream", "/colleges"],
    ["/colleges/state", "/colleges"],
    ["/for", "/"],
    ["/worldwide/test-prep", "/worldwide"],
    ["/schooling/CBSE/10/maths", "/schooling/cbse/class-10/mathematics"],
    ["/schooling/icse/class-9", "/schooling/icse-cisce/class-9"],
    ["/colleges/iitb", "/colleges/iit-bombay"],
    ["/careers/Data-Scientist", "/careers/data-scientist"],
    ["/scholarships/PM-Yasasvi", "/scholarships/pm-yasasvi"],
    ["/exams/clat", "/exams/CLAT"],
  ])("%s → 308 %s", (from, to) => {
    const res = run(`https://shishya.in${from}`);
    expect(res.status).toBe(308);
    expect(location(res)).toBe(to);
  });

  it("keeps the query string (utm tags survive the hop)", () => {
    const res = run("https://shishya.in/exams/neet?utm_source=chatgpt.com&x=1");
    expect(res.status).toBe(308);
    expect(location(res)).toBe("/exams/NEET_UG?utm_source=chatgpt.com&x=1");
  });

  it.each([
    "/exams/SSC_CGL",
    "/exams/SSC_CGL/cutoff",
    "/exams/SSC_CGL/news/abc123",
    "/exams/entrance",
    "/exams/state/x",
    "/exams/browse",
    "/exams/after/12th",
    "/exams/category/railway",
    "/exams/CLAT",
    "/hi/exams/SSC_CGL/updates",
    "/schooling/cbse/class-10/mathematics",
    "/colleges/iit-bombay",
    "/current-affairs/capsule/2026-09",
    "/for/class-10-student",
  ])("%s is canonical: no redirect", (p) => {
    const res = run(`https://shishya.in${p}`);
    expect(res.status, p).not.toBe(308);
    expect(res.headers.get("location"), p).toBeNull();
  });

  it("the matcher covers the capitalised /Exams forms and the bare /for", () => {
    for (const e of ["/Exams/:path*", "/EXAMS/:path*", "/for"]) expect(config.matcher).toContain(e);
  });
});

describe("Content-Language: only the native Hindi notes", () => {
  it("the Hindi topic notes (and their /hi twin) say hi-IN", () => {
    for (const u of ["https://shishya.in/exams/SSC_GD/topics/ga.history/hi", "https://shishya.in/hi/exams/SSC_GD/topics/ga.history/hi"]) {
      expect(run(u).headers.get("content-language"), u).toBe("hi-IN");
    }
  });

  it("English-bodied twins and English pages declare nothing", () => {
    for (const u of [
      "https://shishya.in/hi/exams/SSC_GD",
      "https://shishya.in/te/exams/SSC_GD/updates",
      "https://shishya.in/hi/exams/SSC_GD/guide",
      "https://shishya.in/hi",
      "https://shishya.in/exams/SSC_GD/topics/ga.history",
      "https://shishya.in/te/exams/SSC_GD/topics/ga.history/hi",
    ]) {
      expect(run(u).headers.get("content-language"), u).toBeNull();
    }
  });
});

describe("AI-crawler names (BotVisit)", () => {
  it.each([
    ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amzn-SearchBot/0.1) Chrome/119.0.6045.214 Safari/537.36", "Amzn-SearchBot"],
    ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amzn-User/0.1) Chrome/119.0.6045.214 Safari/537.36", "Amzn-User"],
    ["Mozilla/5.0 (compatible; Google-CloudVertexBot; +https://cloud.google.com/)", "Google-CloudVertexBot"],
    ["Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)", "Amazonbot"],
    ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "Googlebot"],
    [CHROME, null],
  ])("%s → %s", (ua, name) => {
    expect(aiBotName(ua)).toBe(name);
  });
});
