// robots.txt lets every search and AI crawler fetch every section
// (26 Sep 2026, B-machine-crawl).
//
// Until today the private-path rule "/me" was a bare prefix, and robots.txt
// rules are prefixes — so it also blocked the public /mentors page for
// Googlebot, Bingbot and every AI crawler. This runs the real robots() rules
// through a small RFC 9309 evaluator (longest match wins, allow wins a tie,
// "*" wildcard, "$" end anchor) and checks every section landing the sitemap
// lists, the new context files and a school class page are fetchable, while
// the API, mocks, chat and login stay blocked (3 Oct 2026, fix C14: the
// private pages that answer noindex are fetchable, so crawlers read it).
// Prisma and next/cache are mocked: sitemap.ts is imported only for its
// SECTION_LANDING_PATHS list; nothing here reads the DB.

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import robots from "@/app/robots";
import { SECTION_LANDING_PATHS } from "@/app/sitemap";

// 27 Sep 2026: the evaluator moved to a shared fixture (the search tests ask the same question); unchanged.
import { allowed, list, type Rule } from "../fixtures/robots-eval";

const r = robots();
const RULES = (Array.isArray(r.rules) ? r.rules : [r.rules]) as Rule[];

describe("the RFC 9309 evaluator itself", () => {
  const rules: Rule[] = [{ userAgent: "*", allow: ["/"], disallow: ["/me$", "/me/", "/mentor$", "/exams/browse?*", "/api/"] }];
  it("prefix, $ anchor and * wildcard", () => {
    expect(allowed(rules, "x", "/me")).toBe(false);
    expect(allowed(rules, "x", "/me/settings")).toBe(false);
    expect(allowed(rules, "x", "/mentors")).toBe(true);
    expect(allowed(rules, "x", "/mentor")).toBe(false);
    expect(allowed(rules, "x", "/mentor/desk")).toBe(true);
    expect(allowed(rules, "x", "/exams/browse")).toBe(true);
    expect(allowed(rules, "x", "/exams/browse?category=BANKING")).toBe(false);
    expect(allowed(rules, "x", "/api/x")).toBe(false);
  });
  it("a bare prefix would have blocked /mentors (the bug this fixes)", () => {
    expect(allowed([{ userAgent: "*", allow: ["/"], disallow: ["/me"] }], "x", "/mentors")).toBe(false);
  });
  it("a named group replaces '*', it does not add to it", () => {
    const g: Rule[] = [
      { userAgent: "*", disallow: ["/a"] },
      { userAgent: "GPTBot", allow: ["/"] },
    ];
    expect(allowed(g, "GPTBot", "/a")).toBe(true);
    expect(allowed(g, "bingbot", "/a")).toBe(false);
  });
});

// 26 Sep 2026 (G1): + the four answer-engine fetchers that now have their own group.
const NEW_AI_GROUPS = ["Amzn-SearchBot", "Amzn-User", "meta-externalfetcher", "Google-CloudVertexBot"];
const CRAWLERS = ["*", "Googlebot", "bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Claude-SearchBot", "Google-Extended", "Applebot-Extended", ...NEW_AI_GROUPS];

const PUBLIC_EXTRA = [
  "/",
  "/mentors",
  "/schooling",
  "/schooling/cbse",
  "/schooling/cbse/class-6",
  "/schooling/cbse/class-6/mathematics",
  "/context.md",
  "/schooling/context.md",
  "/colleges/context.md",
  "/scholarships/context.md",
  "/careers/context.md",
  "/exams/SSC_CGL/context.md",
  "/exams/entrance",
  "/exams/SSC_CGL",
  "/colleges/iit-madras",
  "/scholarships/nsp-post-matric",
  "/careers/software-engineer",
  "/for/class-10-student",
  "/llms.txt",
  "/llms-full.txt",
  "/ask",
];

describe("robots.txt: every section is fetchable by search and AI crawlers", () => {
  it("the sitemap's section landings include the new hubs and /mentors", () => {
    expect(SECTION_LANDING_PATHS).toContain("/mentors");
    expect(SECTION_LANDING_PATHS).toContain("/exams/entrance");
    expect(SECTION_LANDING_PATHS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(SECTION_LANDING_PATHS).size).toBe(SECTION_LANDING_PATHS.length);
  });

  it.each(CRAWLERS)("%s may fetch every sitemap section landing and the extra public pages", (ua) => {
    const blocked = [...SECTION_LANDING_PATHS, ...PUBLIC_EXTRA].filter((p) => !allowed(RULES, ua, p));
    expect(blocked).toEqual([]);
  });

  // 3 Oct 2026 (fix C14): a crawler obeys noindex only on a URL it may fetch.
  // The private pages that answer noindex (header + their own tag) are now
  // fetchable; the API, mocks, chat and login stay blocked.
  it.each(CRAWLERS)("%s is still kept out of the API, mocks, chat and login", (ua) => {
    for (const p of ["/api/x", "/mocks/1", "/chat", "/chat/abc", "/login"]) {
      expect(allowed(RULES, ua, p), `${ua} ${p}`).toBe(false);
    }
  });

  it.each(CRAWLERS)("%s may fetch the private pages that answer noindex, so it can read the noindex", (ua) => {
    for (const p of ["/dashboard", "/me", "/me/x", "/me/settings", "/today", "/onboarding", "/logout", "/mentor", "/mentor/desk", "/admin", "/admin/insights", "/attempts/1/results"]) {
      expect(allowed(RULES, ua, p), `${ua} ${p}`).toBe(true);
    }
  });

  it("no group lists /me, /me$ or /me/ (a bare /me would block /mentors); /mentors stays allowed", () => {
    for (const rule of RULES) {
      const disallow = list(rule.disallow);
      if (rule.userAgent === "ia_archiver") continue;
      for (const p of ["/me", "/me$", "/me/"]) expect(disallow, `${String(rule.userAgent)} ${p}`).not.toContain(p);
    }
    for (const ua of CRAWLERS) expect(allowed(RULES, ua, "/mentors"), ua).toBe(true);
  });
});

describe("answer-engine groups added 26 Sep 2026 (G1)", () => {
  it.each(NEW_AI_GROUPS)("%s has its own group with the same allow list and private-path disallows as '*'", (ua) => {
    const star = RULES.find((x) => list(x.userAgent).includes("*"))!;
    const own = RULES.filter((x) => list(x.userAgent).includes(ua));
    expect(own).toHaveLength(1);
    expect(list(own[0].allow)).toEqual(list(star.allow));
    expect(list(own[0].disallow)).toEqual(list(star.disallow));
    expect(own[0]).not.toHaveProperty("crawlDelay");
  });

  it("robots.txt names only /sitemap.xml — never the Bing-only news sitemap", () => {
    expect(String(r.sitemap).endsWith("/sitemap.xml")).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/sitemap-news/);
  });
});
