// Crawlable entry points to /ask (26 Sep 2026, entry points).
//
// The header's "Ask Shishya" chip and the home tutor line open /chat, which
// robots.txt blocks for every crawler, so /ask — the whole-platform search
// with AI answers, the crawlable tutor page — had almost no internal link
// (only /jobs-map and /login, plus the sitemap). The site footer (every page)
// and the home page's "How Shishya works" row now link it in plain HTML.
// Source scans plus pure helpers: no DB, no render.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_ASK_PAGE_LINK, homeCopyLocaleOf } from "@/lib/home-ask-link";
import { HOME_DOORS_COPY } from "@/lib/home-doors-copy";
import robots from "@/app/robots";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** robots.txt semantics: prefix match, `*` any run, trailing `$` = end. */
function disallows(rule: string, p: string): boolean {
  const end = rule.endsWith("$");
  const body = (end ? rule.slice(0, -1) : rule).replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${body}${end ? "$" : ""}`).test(p);
}

describe("site footer: one plain /ask link on every page", () => {
  const src = read("src/components/SiteFooter.tsx");

  it("links /ask with the page's own H1 as the anchor, in the utility row", () => {
    expect(src).toContain(`<Link href="/ask" className="hover:text-ink-800">Search or ask Shishya</Link>`);
    // Plain link: not the /chat tutor, not a query URL.
    expect(src).not.toMatch(/href="\/chat/);
    expect(src).not.toMatch(/href="\/ask\?/);
    // The legal links (the payment-gateway requirement) stay.
    for (const p of ["/terms", "/privacy", "/refunds", "/contact"]) expect(src).toContain(`href="${p}"`);
  });

  it("the /ask route exists", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/ask/page.tsx"))).toBe(true);
  });
});

describe("home 'How Shishya works': /ask beside the /chat tutor line", () => {
  const src = read("src/components/home/HomeHowItWorks.tsx");

  it("keeps the /chat call to action for people and adds the /ask link, both tagged", () => {
    expect(src).toMatch(/href="\/chat\?general=1" data-home-cta="how-ask"/);
    expect(src).toMatch(/href=\{askPage\.href\}\s+data-home-cta="how-search"/);
  });

  it("opens the /ask twin in the reader's language, labelled in that language", () => {
    expect(HOME_ASK_PAGE_LINK.en).toEqual({ href: "/ask", label: "Search or ask Shishya →" });
    expect(HOME_ASK_PAGE_LINK.hi.href).toBe("/hi/ask");
    expect(HOME_ASK_PAGE_LINK.te.href).toBe("/te/ask");
    expect(HOME_ASK_PAGE_LINK.hi.label).toMatch(/[ऀ-ॿ]/);
    expect(HOME_ASK_PAGE_LINK.te.label).toMatch(/[ఀ-౿]/);
    for (const l of Object.values(HOME_ASK_PAGE_LINK)) expect(l.label).toContain("Shishya");
  });

  it("reads the locale off the copy object the page passes", () => {
    expect(homeCopyLocaleOf(HOME_DOORS_COPY.en)).toBe("en");
    expect(homeCopyLocaleOf(HOME_DOORS_COPY.hi)).toBe("hi");
    expect(homeCopyLocaleOf(HOME_DOORS_COPY.te)).toBe("te");
    // A copy object that is none of them (a future locale) reads English.
    expect(homeCopyLocaleOf({ ...HOME_DOORS_COPY.hi })).toBe("en");
  });

  it("/hi/ask and /te/ask are public twins in the middleware, not redirected away", () => {
    const m = /const TWIN_PUBLIC_RE =\s*\n?\s*(\/\^.*\/);/.exec(read("src/middleware.ts"));
    expect(m, "TWIN_PUBLIC_RE in src/middleware.ts").toBeTruthy();
    const re = new RegExp(m![1].slice(1, -1));
    expect(re.test("/ask")).toBe(true);
  });
});

describe("robots.txt lets every crawler fetch /ask and its twins (and still blocks /chat)", () => {
  const rules = robots().rules;
  const groups = Array.isArray(rules) ? rules : [rules];

  it("no disallow rule in any user-agent group matches /ask, /hi/ask or /te/ask", () => {
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      const dis = g.disallow == null ? [] : Array.isArray(g.disallow) ? g.disallow : [g.disallow];
      for (const p of ["/ask", "/hi/ask", "/te/ask"]) {
        for (const r of dis) expect(disallows(r, p), `${JSON.stringify(g.userAgent)} ${r} blocks ${p}`).toBe(false);
      }
    }
  });

  it("the matcher is real: /chat is blocked for every group that has the private list", () => {
    const blocked = groups.filter((g) => {
      const dis = g.disallow == null ? [] : Array.isArray(g.disallow) ? g.disallow : [g.disallow];
      return dis.some((r) => disallows(r, "/chat"));
    });
    expect(blocked.length).toBeGreaterThan(0);
  });
});
