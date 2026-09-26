// robots.txt lets every search and AI crawler fetch every section
// (26 Sep 2026, B-machine-crawl).
//
// Until today the private-path rule "/me" was a bare prefix, and robots.txt
// rules are prefixes — so it also blocked the public /mentors page for
// Googlebot, Bingbot and every AI crawler. This runs the real robots() rules
// through a small RFC 9309 evaluator (longest match wins, allow wins a tie,
// "*" wildcard, "$" end anchor) and checks every section landing the sitemap
// lists, the new context files and a school class page are fetchable, while
// the private pages stay blocked.
// Prisma and next/cache are mocked: sitemap.ts is imported only for its
// SECTION_LANDING_PATHS list; nothing here reads the DB.

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import robots from "@/app/robots";
import { SECTION_LANDING_PATHS } from "@/app/sitemap";

type Rule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };

const list = (x: string | string[] | undefined): string[] => ([] as string[]).concat(x ?? []);

/** RFC 9309 path pattern → RegExp: "*" any run, trailing "$" end anchor,
 *  everything else literal; always anchored at the start (a prefix match). */
function patternRe(p: string): RegExp {
  const anchored = p.endsWith("$");
  const body = (anchored ? p.slice(0, -1) : p)
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/** The group for a user agent: an exact (case-insensitive) product-token
 *  match, else the "*" group. */
function groupFor(rules: Rule[], ua: string): Rule[] {
  const named = rules.filter((r) => list(r.userAgent).some((a) => a.toLowerCase() === ua.toLowerCase()));
  return named.length ? named : rules.filter((r) => list(r.userAgent).includes("*"));
}

/** Longest matching rule wins; allow wins a tie; no match = allowed. */
function allowed(rules: Rule[], ua: string, path: string): boolean {
  let best: { len: number; allow: boolean } | null = null;
  for (const r of groupFor(rules, ua)) {
    for (const [pats, allow] of [
      [list(r.allow), true],
      [list(r.disallow), false],
    ] as const) {
      for (const p of pats) {
        if (!p || !patternRe(p).test(path)) continue;
        const len = p.length;
        if (!best || len > best.len || (len === best.len && allow && !best.allow)) best = { len, allow };
      }
    }
  }
  return best ? best.allow : true;
}

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

  it.each(CRAWLERS)("%s is kept out of the private pages", (ua) => {
    for (const p of ["/me", "/me/x", "/me/settings", "/chat", "/chat/abc", "/dashboard", "/mentor", "/mentor/desk", "/api/x", "/login", "/admin", "/mocks/1", "/attempts/1"]) {
      expect(allowed(RULES, ua, p), `${ua} ${p}`).toBe(false);
    }
  });

  it("the '/me' rule is the page itself plus everything under it — never a bare prefix", () => {
    for (const rule of RULES) {
      const disallow = list(rule.disallow);
      if (rule.userAgent === "ia_archiver") continue;
      expect(disallow, String(rule.userAgent)).not.toContain("/me");
      expect(disallow, String(rule.userAgent)).toContain("/me$");
      expect(disallow, String(rule.userAgent)).toContain("/me/");
    }
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
