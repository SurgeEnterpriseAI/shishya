// "← Back" parents (26 Sep 2026, discoverability G2) — inferParent in
// src/lib/url-normalize.ts, used by src/components/BackLink.tsx.
//
// Stripping the last segment sent /exams/X/news/{id}, /exams/X/results/{id},
// /current-affairs/capsule/{month}, /colleges/stream/*, /for/*, /u/*, /c/*,
// /g/* … to paths with no page.tsx (404s a crawler follows from every one of
// those pages) or to redirect-only routes (/exams, /exams/X/pyq,
// /exams/X/topics). This walks EVERY page.tsx under src/app, fills its
// dynamic segments with a sample value, and requires the parent to be a page
// that renders — not a 404, not a redirect-only route. The /hi and /te twins
// of the public pages are walked too. Pure: the file tree, no DB.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inferParent } from "@/lib/url-normalize";
import { TWIN_PUBLIC_RE } from "@/lib/search/targets";

const APP = path.join(process.cwd(), "src/app");

/** Every static folder path under src/app (route groups dropped) — "/scholarships/for". */
const STATIC_DIRS = new Set<string>();

/** Every page.tsx under src/app as its route pattern ("/exams/[code]/pyq/[year]"), route groups dropped. */
function routePatterns(): { pattern: string; file: string }[] {
  const out: { pattern: string; file: string }[] = [];
  const walk = (dir: string, segs: string[]) => {
    if (segs.length && segs.every((s) => !/^\[.+\]$/.test(s))) STATIC_DIRS.add(`/${segs.join("/")}`);
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, /^\(.+\)$/.test(e.name) ? segs : [...segs, e.name]);
      else if (e.name === "page.tsx") out.push({ pattern: `/${segs.join("/")}`, file: p });
    }
  };
  walk(APP, []);
  return out;
}

/** A page file that only redirects: it calls redirect() / permanentRedirect() and renders nothing. */
function redirectOnly(file: string): boolean {
  const src = fs.readFileSync(file, "utf8");
  return /redirect\(/i.test(src) && !/return\s*\(|return\s*</.test(src);
}

const ROUTES = routePatterns();
const RENDERING = ROUTES.filter((r) => !redirectOnly(r.file));
const REDIRECT_ONLY = ROUTES.filter((r) => redirectOnly(r.file)).map((r) => r.pattern);

const SAMPLE: Readonly<Record<string, string>> = { "[code]": "SSC_CGL", "[lang]": "hi", "[year]": "2024", "[month]": "2026-09", "[date]": "2026-09-26" };
const sampleUrl = (pattern: string) => pattern.split("/").map((s) => (/^\[.+\]$/.test(s) ? (SAMPLE[s] ?? "sample") : s)).join("/") || "/";

const toRegex = (pattern: string) => new RegExp(`^${pattern.split("/").map((s) => (/^\[.+\]$/.test(s) ? "[^/]+" : s.replace(/[.]/g, "[.]"))).join("/")}$`);
const RENDER_RES = RENDERING.map((r) => ({ ...r, re: toRegex(r.pattern === "/" ? "" : r.pattern) }));
const REDIRECT_RES = REDIRECT_ONLY.map((p) => toRegex(p));

/** Static routes win over dynamic ones, as in Next: a path is served by the most specific matching pattern.
 *  27 Sep 2026 (integration): a path that IS a static folder with no page.tsx
 *  of its own ("/scholarships/for", which holds only [filter]) is a 404 — the
 *  dynamic sibling ([id]) only receives the folder's name as a slug it
 *  rejects. Before this the walk counted /scholarships/for as served. */
function servedBy(url: string): { pattern: string; rendering: boolean } | null {
  const bare = url === "/" ? "" : url;
  if (STATIC_DIRS.has(url) && !ROUTES.some((r) => r.pattern === url)) return null;
  const all = [...RENDER_RES.map((r) => ({ pattern: r.pattern, re: r.re, rendering: true })), ...REDIRECT_ONLY.map((p, i) => ({ pattern: p, re: REDIRECT_RES[i], rendering: false }))];
  const hits = all.filter((r) => r.re.test(bare));
  if (!hits.length) return null;
  const dyn = (p: string) => p.split("/").filter((s) => /^\[.+\]$/.test(s)).length;
  hits.sort((a, b) => dyn(a.pattern) - dyn(b.pattern));
  return hits[0];
}

describe("inferParent: every page's Back link lands on a page that renders", () => {
  it("the walk found the app (sanity)", () => {
    expect(ROUTES.length).toBeGreaterThan(100);
    expect(REDIRECT_ONLY).toEqual(expect.arrayContaining(["/exams", "/exams/[code]/pyq", "/exams/[code]/topics"]));
  });

  it.each(ROUTES.map((r) => r.pattern).filter((p) => p !== "/" && !p.startsWith("/[lang]")))("%s", (pattern) => {
    const url = sampleUrl(pattern);
    const parent = inferParent(url);
    expect(parent, url).toBeTruthy();
    const served = servedBy(parent!);
    expect(served, `${url} → ${parent} has no page.tsx`).not.toBeNull();
    expect(served!.rendering, `${url} → ${parent} is a redirect-only route (${served!.pattern})`).toBe(true);
  });

  it("the /hi and /te twins keep their language where the parent has a twin, and render", () => {
    const twins = ROUTES.map((r) => sampleUrl(r.pattern)).filter((u) => u !== "/" && TWIN_PUBLIC_RE.test(u));
    expect(twins.length).toBeGreaterThan(10);
    for (const lang of ["hi", "te"]) {
      for (const u of twins) {
        const parent = inferParent(`/${lang}${u}`)!;
        expect(parent, u).toBeTruthy();
        const bare = parent.replace(/^\/(hi|te)(?=\/|$)/, "") || "/";
        if (parent !== bare) expect(bare === "/" || TWIN_PUBLIC_RE.test(bare), `${lang}${u} → ${parent} has no twin`).toBe(true);
        const served = servedBy(bare);
        expect(served?.rendering, `/${lang}${u} → ${parent}`).toBe(true);
      }
    }
  });

  it.each([
    ["/exams/SSC_CGL/news/abc", "/exams/SSC_CGL/archive"],
    ["/exams/SSC_CGL/results/abc", "/exams/SSC_CGL/updates"],
    ["/exams/SSC_CGL/topics/quant.percentage", "/exams/SSC_CGL/syllabus"],
    ["/exams/SSC_CGL/topics/quant.percentage/hi", "/exams/SSC_CGL/syllabus"],
    ["/exams/SSC_CGL/topics/quant.percentage/quiz", "/exams/SSC_CGL/topics/quant.percentage"],
    ["/exams/SSC_CGL/pyq/2024", "/exams/SSC_CGL"],
    ["/exams/SSC_CGL/cutoff", "/exams/SSC_CGL"],
    ["/exams/SSC_CGL", "/exams/browse"],
    ["/exams/state/bihar", "/exams/state"],
    ["/exams/browse", "/"],
    ["/current-affairs/capsule/2026-09", "/current-affairs"],
    ["/current-affairs/2026-09-26", "/current-affairs"],
    ["/colleges/stream/engineering", "/colleges"],
    ["/colleges/state/karnataka", "/colleges"],
    ["/colleges/iit-bombay/cse", "/colleges/iit-bombay"],
    ["/for/class-10-student", "/"],
    ["/worldwide/test-prep/ielts", "/worldwide"],
    ["/scholarships/for/girls", "/scholarships"],
    ["/scholarships/closing-soon", "/scholarships"],
    ["/exams/category/banking", "/exams/browse"],
    ["/exams/after/12th", "/exams/browse"],
    ["/u/someone", "/"],
    ["/c/token", "/"],
    ["/g/token", "/"],
    ["/hi/exams/SSC_CGL/topics/x", "/hi/exams/SSC_CGL/syllabus"],
    ["/hi/exams/SSC_CGL/guide", "/hi/exams/SSC_CGL"],
    ["/te/for/banking-aspirant", "/te"],
    ["/exams/SSC_CGL?x=1#y", "/exams/browse"],
    ["/", null],
    ["/hi", null],
  ] as [string, string | null][])("%s → %s", (input, parent) => {
    expect(inferParent(input)).toBe(parent);
  });
});
