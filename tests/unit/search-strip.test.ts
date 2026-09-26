// The Shishya search strip (26 Sep 2026) — the home hero box and the /ask box,
// their copy, their decisions and the SEO around them. No DB, no network, no
// model. Run: npx vitest run tests/unit/search-strip.test.ts
//
// What is pinned:
//   1. copy (src/lib/search-copy.ts): en / hi / te carry the same keys; the
//      rotating examples cover all five sections and at least three scripts
//      per locale, and each lands where it claims — on the browser's lite
//      index AND the server's deep index — never on the AI; one "Try" row per
//      section; no typed counts or banned slogans;
//   2. the strip's decisions (src/components/search/strip-logic.ts): a clear
//      match is the Enter default and opens its page; a list goes to /ask; a
//      doubt puts "Ask Shishya's AI" first; Class 1-7 never offers the AI;
//   3. the component (source scan): a real GET form to /ask (works with no
//      JS), a 16 px+ input, IME-safe Enter, the intent token, the lazy engine
//      (no resolver in the first-load shell), never /api/ask or a model;
//   4. the home page: the strip sits in the hero between the H1 and the doors,
//      page.tsx stays CRLF; HomeHero renders the slot between the tagline and
//      the tutor line;
//   5. SEO: one WebSite + SearchAction (layout.tsx) → /ask?q={search_term_string},
//      no second one on "/"; /ask is sitemapped, robots-allowed, twinned and in
//      llms.txt / llms-full.txt; /ask?q= pages are noindex, follow.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureIndex } from "../fixtures/search-index-fixture";
import { resolveQuery } from "@/lib/search/resolve";
import { decodeIndex, encodeIndex } from "@/lib/search/index-codec";
import { detectScript } from "@/lib/search/normalize";
import { TWIN_PUBLIC_RE, isSafePath } from "@/lib/search/targets";
import type { Resolution, SearchSection } from "@/lib/search/types";
import { askBaseFor, searchCopy, type SearchCopy } from "@/lib/search-copy";
import { askHref, buildStripView, cleanQuery, enterTarget, isSitePath } from "@/components/search/strip-logic";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const deep = fixtureIndex("deep");
/** Exactly what the browser holds: the lite tier through the wire codec. */
const lite = decodeIndex(JSON.parse(JSON.stringify(encodeIndex(fixtureIndex("lite")))));
const LOCALES = ["en", "hi", "te"] as const;
const DOORS: SearchSection[] = ["school", "entrance", "government", "college", "careers"];

function leaves(o: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof o === "string") out[prefix] = o;
  else if (Array.isArray(o)) o.forEach((v, i) => Object.assign(out, leaves(v, `${prefix}[${i}]`)));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) Object.assign(out, leaves(v, prefix ? `${prefix}.${k}` : k));
  return out;
}
const shape = (c: SearchCopy) =>
  Object.keys(leaves(c))
    .map((k) => k.replace(/\[\d+\]/g, "[]"))
    .filter((k, i, a) => a.indexOf(k) === i)
    .sort();

// ── 1. copy ─────────────────────────────────────────────────────────────

describe("search copy (en / hi / te)", () => {
  it("every locale has the same keys, and the strip's own lines are translated", () => {
    expect(shape(searchCopy("hi"))).toEqual(shape(searchCopy("en")));
    expect(shape(searchCopy("te"))).toEqual(shape(searchCopy("en")));
    for (const [k, v] of Object.entries(searchCopy("hi").strip)) expect(/[ऀ-ॿ]/.test(v), `hi strip.${k}`).toBe(true);
    for (const [k, v] of Object.entries(searchCopy("te").strip)) expect(/[ఀ-౿]/.test(v), `te strip.${k}`).toBe(true);
    expect(/[ऀ-ॿ]/.test(searchCopy("hi").helper)).toBe(true);
    expect(/[ఀ-౿]/.test(searchCopy("te").helper)).toBe(true);
    for (const l of LOCALES) expect(searchCopy(l).strip.seeAll, l).toContain("{q}");
  });

  it("other locales read English and submit to /ask; hi / te submit to their twin", () => {
    expect(searchCopy("mr")).toBe(searchCopy("en"));
    expect(searchCopy(null)).toBe(searchCopy("en"));
    expect(askBaseFor("hi")).toBe("/hi/ask");
    expect(askBaseFor("te")).toBe("/te/ask");
    expect(askBaseFor("en")).toBe("/ask");
    expect(askBaseFor("ta")).toBe("/ask");
    for (const b of ["/ask", "/hi/ask", "/te/ask"]) expect(b === "/ask" || TWIN_PUBLIC_RE.test(b.replace(/^\/(hi|te)/, ""))).toBe(true);
  });

  it("the rotating examples cover all five sections and at least three scripts in every locale; hi and te lead with their own script", () => {
    for (const l of LOCALES) {
      const ex = searchCopy(l).placeholder;
      for (const s of DOORS) expect(ex.some((e) => e.section === s), `${l}: no ${s} example`).toBe(true);
      const scripts = new Set(ex.map((e) => detectScript(e.text)));
      expect(scripts.size, `${l}: scripts ${[...scripts].join(",")}`).toBeGreaterThanOrEqual(3);
      for (const s of ["latin", "deva", "telu"]) expect(scripts.has(s as never), `${l}: ${s}`).toBe(true);
      expect(ex.length).toBeGreaterThanOrEqual(8);
    }
    expect(detectScript(searchCopy("hi").placeholder[0].text)).toBe("deva");
    expect(detectScript(searchCopy("te").placeholder[0].text)).toBe("telu");
  });

  it("each example lands as promised, in its section, on the browser's lite index and the server's deep index — never on the AI", () => {
    for (const l of LOCALES) {
      for (const ex of searchCopy(l).placeholder) {
        for (const [tier, idx] of [["lite", lite], ["deep", deep]] as const) {
          const r = resolveQuery(ex.text, idx, { pageLocale: l });
          const where = `${l}/${tier}: ${ex.text}`;
          expect(r.outcome, where).toBe(ex.expect);
          expect(r.outcome, where).not.toBe("ai");
          expect((r.best ?? r.hits[0])?.section, where).toBe(ex.section);
          if (r.best) expect(isSafePath(r.best.url), where).toBe(true);
        }
      }
    }
  });

  it("one Try row per section, each opening its page directly (lite and deep)", () => {
    for (const l of LOCALES) {
      const rows = searchCopy(l).tryRows;
      expect(rows.map((t) => t.section), l).toEqual(DOORS);
      for (const t of rows) {
        for (const idx of [lite, deep]) {
          const r = resolveQuery(t.q, idx, { pageLocale: l });
          expect(r.outcome, `${l}: ${t.q}`).toBe("direct");
          expect(r.best?.section, `${l}: ${t.q}`).toBe(t.section);
        }
      }
    }
  });

  it("no typed count, no banned slogan, the AI is called an AI", () => {
    const banned = [/\b\d{2,}\s*\+/, /\b1[0-9]{2}\s*(exams|परीक्षा|పరీక్ష)/i, /AI[- ]powered/i, /trusted by/i, /expert-curated/i, /verified by students/i, /#1\b/, /\bbest\b(?! match)/i];
    for (const l of LOCALES) {
      for (const [k, v] of Object.entries(leaves(searchCopy(l)))) for (const re of banned) expect(re.test(v), `${l} ${k}: ${re} in "${v}"`).toBe(false);
      expect(searchCopy(l).askRow).toMatch(/AI/);
    }
  });
});

// ── 2. the strip's decisions ────────────────────────────────────────────

const both = (q: string): { typing: Resolution; submit: Resolution } => ({
  typing: resolveQuery(q, lite, { typing: true }),
  submit: resolveQuery(q, lite, { typing: false }),
});
const EN = searchCopy("en");

describe("strip decisions (strip-logic.ts)", () => {
  it("empty box: one Try row per section, then the viewer's recent searches; Enter runs the example on show", () => {
    const v = buildStripView("", null, "idle", EN, ["mpsc group c"]);
    expect(v.def).toBe(-1);
    expect(v.opts.filter((o) => o.kind === "try").map((o) => (o.kind === "try" ? o.section : null))).toEqual(DOORS);
    expect(v.opts.at(-1)).toEqual({ kind: "recent", q: "mpsc group c" });
    expect(v.rows.some((r) => r.type === "head" && r.clear)).toBe(true);
    expect(buildStripView("", null, "idle", EN, []).rows.some((r) => r.type === "head" && r.clear)).toBe(false);
  });

  it("a clear match heads the list as Best match, is the Enter default, and opens its page", () => {
    const res = both("ssc cgl cutoff");
    const v = buildStripView("ssc cgl cutoff", res, "ready", EN, []);
    const d = v.opts[v.def];
    expect(d.kind === "hit" && d.best && d.hit.url).toBe("/exams/SSC_CGL/cutoff");
    expect(v.rows[0]).toMatchObject({ type: "head", key: "best" });
    expect(v.chips).toEqual(expect.arrayContaining(["SSC CGL"]));
    // The page appears once, and the AI is still one row away.
    const urls = v.opts.flatMap((o) => (o.kind === "hit" ? [o.hit.url] : []));
    expect(new Set(urls).size).toBe(urls.length);
    expect(v.opts.at(-1)).toEqual({ kind: "ask" });
    const t = enterTarget(res.submit);
    expect(t.kind === "open" && t.hit.url).toBe("/exams/SSC_CGL/cutoff");
  });

  // 27 Sep 2026 (wave 2 search): "scholarships for girls" now opens its list page; "group 2"
  // (three states' Group 2 exams) is the several-pages case.
  it("several pages: grouped rows, then 'See every page' as the Enter default (→ /ask, no model), then the AI row", () => {
    const res = both("group 2");
    expect(res.submit.outcome).toBe("list");
    const v = buildStripView("group 2", res, "ready", EN, []);
    expect(v.opts[v.def]).toEqual({ kind: "all" });
    expect(v.opts.at(-1)).toEqual({ kind: "ask" });
    expect(v.aiMode).toBe(false);
    expect(v.rows.some((r) => r.type === "head" && r.key.startsWith("g-"))).toBe(true);
    expect(enterTarget(res.submit)).toEqual({ kind: "ask", action: "list" });
  });

  it("a real doubt: 'Ask Shishya's AI' comes first and is the Enter default", () => {
    const q = "I am 29 — which government exams can I still write?";
    const res = both(q);
    expect(res.submit.outcome).toBe("ai");
    const v = buildStripView(q, res, "ready", EN, []);
    expect(v.aiMode).toBe(true);
    expect(v.opts[0]).toEqual({ kind: "ask" });
    expect(v.def).toBe(0);
    expect(v.opts.filter((o) => o.kind === "ask")).toHaveLength(1);
    expect(enterTarget(res.submit)).toEqual({ kind: "ask", action: "ai" });
  });

  it("Class 1-7: pages only — the AI row is never offered", () => {
    const res = both("class 6 science what is a magnet explain");
    expect(res.submit.schoolScope).toBe("class1to7");
    const v = buildStripView("class 6 science what is a magnet explain", res, "ready", EN, []);
    expect(v.opts.some((o) => o.kind === "ask")).toBe(false);
    expect(v.aiMode).toBe(false);
  });

  it("before the index arrives: a loading line, Enter goes to /ask (the server resolves), the AI row is offered", () => {
    const v = buildStripView("ssc cgl", null, "loading", EN, []);
    expect(v.rows[0]).toEqual({ type: "loading" });
    expect(v.opts[v.def]).toEqual({ kind: "all" });
    expect(buildStripView("ssc cgl", null, "error", EN, []).rows.some((r) => r.type === "loading")).toBe(false);
    expect(enterTarget(null)).toEqual({ kind: "ask", action: "list" });
  });

  it("URLs: the query is encoded, capped at 200 characters, and only single-slash site paths open", () => {
    expect(askHref("/hi/ask", "एसएससी & cgl?", false)).toBe(`/hi/ask?q=${encodeURIComponent("एसएससी & cgl?")}`);
    expect(askHref("/ask", "rrb je", true)).toBe("/ask?q=rrb%20je&ai=1");
    expect(cleanQuery("  ssc \n  cgl  ")).toBe("ssc cgl");
    expect(cleanQuery("x".repeat(500))).toHaveLength(200);
    expect(isSitePath("/exams/SSC_CGL")).toBe(true);
    for (const bad of ["//evil.example", "/\\evil", "https://evil.example", "javascript:alert(1)"]) expect(isSitePath(bad), bad).toBe(false);
  });
});

// ── 3. the component (source scan) ─────────────────────────────────────

describe("SearchStrip.tsx", () => {
  const src = read("src/components/search/SearchStrip.tsx");
  const engine = read("src/components/search/strip-engine.ts");
  const logic = read("src/components/search/strip-logic.ts");
  const valueImports = (s: string) => [...s.matchAll(/^import\s+(?!type\b)[\s\S]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);

  it("is a real GET form to /ask with name=q, so it works with no JavaScript", () => {
    expect(src.startsWith('"use client"')).toBe(true);
    expect(src).toMatch(/<form role="search" method="get" action=\{askBase\}/);
    expect(src).toMatch(/name="q"/);
    expect(src).toMatch(/<button\s+type="submit"/);
  });

  it("phone and keyboard friendly: 16 px+ input, search key, IME-safe Enter, ↑/↓, Esc, '/' and Ctrl/Cmd+K", () => {
    expect(src).toMatch(/text-\[17px\]/);
    expect(src).toMatch(/enterKeyHint="search"/);
    expect(src).toMatch(/nativeEvent\.isComposing \|\| e\.keyCode === 229/);
    expect(src).toMatch(/ArrowDown/);
    expect(src).toMatch(/"Escape"/);
    expect(src).toMatch(/e\.key === "\/"/);
    expect(src).toMatch(/e\.ctrlKey \|\| e\.metaKey/);
    expect(src).toMatch(/role="combobox"/);
    expect(src).toMatch(/aria-activedescendant/);
    expect(src).toMatch(/prefers-reduced-motion/);
    expect(src).toMatch(/visualViewport/);
  });

  it("a human submit writes the intent token; the strip never calls /api/ask or a model", () => {
    expect(src).toMatch(/sessionStorage\.setItem\(ASK_INTENT_KEY/);
    // Code only: the header comments say, in words, that the strip never calls it.
    const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const s of [src, engine, logic].map(code)) {
      expect(s).not.toMatch(/\/api\/ask|anthropic|runAsk|ask-engine/i);
    }
    expect(src).not.toMatch(/\bfetch\(/);
    expect(engine.match(/\bfetch\(/g)).toHaveLength(1);
    expect(engine).toMatch(/SEARCH_INDEX_URL = "\/api\/search\/index"/);
  });

  it("the first-load shell carries no resolver, index or copy tables: the engine is a dynamic import", () => {
    expect(src).toMatch(/import\("\.\/strip-engine"\)/);
    const imports = valueImports(src);
    // 26 Sep 2026: + @/lib/ask-distress (7 KB of patterns, no imports) — a distress
    // sign must never open a study page directly, even before the engine loads.
    expect(imports.sort()).toEqual(["./strip-logic", "@/lib/ask-distress", "@/lib/search/types", "next/navigation", "react"].sort());
    expect(valueImports(logic)).toEqual(["@/lib/search/types"]);
    for (const i of valueImports(engine)) expect(i).toMatch(/^@\/lib\/search\/(resolve|index-codec)$/);
    // No exam list rides in the page payload: the strip takes copy and askBase only.
    expect(src).not.toMatch(/exams\??:/);
  });

  it("storage is best-effort and per viewer: every access is inside try", () => {
    const uses = src.match(/(localStorage|sessionStorage)\.(getItem|setItem|removeItem)/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(3);
    for (const fn of ["writeIntent", "readRecent", "writeRecent"]) {
      const body = src.slice(src.indexOf(`function ${fn}`), src.indexOf("\n}\n", src.indexOf(`function ${fn}`)));
      expect(body, fn).toMatch(/try \{/);
    }
  });

  it("status chips come from data; the section glyph uses the section icons", () => {
    expect(src).toMatch(/copy\.badges\[h\.status\]/);
    expect(src).toMatch(/SECTION_ICON\[/);
    expect(src).not.toMatch(/\b1[0-9]{2}\+?\s*exams/);
  });
});

// ── 4. the home page ────────────────────────────────────────────────────

describe("home page: the strip in the hero", () => {
  const page = read("src/app/page.tsx");
  const hero = read("src/components/home/HomeHero.tsx");

  it("page.tsx passes the strip into HomeHero — after the header, before the doors — and stays CRLF", () => {
    expect(page).toMatch(/import \{ SearchStrip \} from "@\/components\/search\/SearchStrip";/);
    expect(page).toMatch(/import \{ askBaseFor, searchCopy \} from "@\/lib\/search-copy";/);
    expect(page).toContain('<HomeHero copy={copy} search={<SearchStrip variant="hero" copy={searchCopy(locale)} askBase={askBaseFor(locale)} />} />');
    expect(page.match(/<SearchStrip\b/g)).toHaveLength(1);
    const at = (m: string) => page.indexOf(m);
    expect(at("<Header />")).toBeLessThan(at("<HomeHero"));
    expect(at("<HomeHero")).toBeLessThan(at("<SearchStrip"));
    expect(at("<SearchStrip")).toBeLessThan(at("<HomeDoors"));
    // Outside the sticky live-stats block (the stats workflow's region).
    expect(at("<SearchStrip")).toBeGreaterThan(at("<LiveCountersStrip"));
    expect(page.includes("\r\n")).toBe(true);
    expect(/[^\r]\n/.test(page)).toBe(false);
  });

  it("HomeHero renders the slot between the tagline and the tutor line, and no longer holds the interim Ask box", () => {
    expect(hero).toMatch(/search\?: ReactNode/);
    expect(hero).not.toMatch(/AskSearchBar/);
    const tagline = hero.indexOf("{copy.hero.tagline}");
    const slot = hero.indexOf("{search && ");
    const tutor = hero.indexOf('href="/chat?general=1"');
    expect(tagline).toBeGreaterThan(0);
    expect(slot).toBeGreaterThan(tagline);
    expect(tutor).toBeGreaterThan(slot);
  });
});

// ── 5. SEO: SearchAction, crawl surfaces, noindex query pages ───────────

describe("searchability of the search", () => {
  it("one WebSite + SearchAction for every page, '/' included, pointing at /ask?q={search_term_string}", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toMatch(/"@type": "WebSite"/);
    expect(layout).toMatch(/"@type": "SearchAction"/);
    expect(layout).toContain("urlTemplate: `${SITE_BASE}/ask?q={search_term_string}`");
    expect(layout).toContain('"query-input": "required name=search_term_string"');
    expect(layout).toMatch(/JSON\.stringify\(websiteJsonLd\)/);
    // No second WebSite node on the home page; its own JSON-LD (exam-day events) stays.
    const page = read("src/app/page.tsx");
    expect(page).not.toMatch(/"WebSite"|SearchAction/);
    expect(page).toMatch(/application\/ld\+json/);
  });

  it("/ask: the landing keeps the SearchAction and is indexable; a query page is noindex, follow, canonical /ask", () => {
    const ask = read("src/app/ask/page.tsx");
    expect(ask).toContain('urlTemplate: "https://shishya.in/ask?q={search_term_string}"');
    expect(ask).toMatch(/canonical: "https:\/\/shishya\.in\/ask"/);
    expect(ask).toMatch(/q \? \{ robots: \{ index: false, follow: true \} \} : \{\}/);
    // The page's box is the strip, still a plain GET form.
    expect(ask).toMatch(/<SearchStrip variant="page" copy=\{copy\} askBase=\{askBase\} initialQuery=\{q\} \/>/);
    expect(ask).not.toMatch(/<AskSearchForm/);
  });

  it("/ask is in the sitemap, allowed in robots.txt, twinned in /hi and /te; the index route sits under the disallowed /api/", () => {
    const sitemap = read("src/app/sitemap.ts");
    const landings = sitemap.slice(sitemap.indexOf("SECTION_LANDING_PATHS"), sitemap.indexOf("];", sitemap.indexOf("SECTION_LANDING_PATHS")));
    expect(landings).toMatch(/"\/ask",/);
    const robots = read("src/app/robots.ts");
    const privatePaths = robots.slice(robots.indexOf("const privatePaths"), robots.indexOf("];", robots.indexOf("const privatePaths")));
    expect(privatePaths).not.toMatch(/"\/ask/);
    expect(privatePaths).toMatch(/"\/api\/"/);
    expect(TWIN_PUBLIC_RE.test("/ask")).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "src/app/api/search/index/route.ts"))).toBe(true);
  });

  it("llms.txt and llms-full.txt describe the whole-platform search and its deep link, with no voice claim or typed count", () => {
    const llms = read("public/llms.txt");
    const line = llms.split(/\r?\n/).find((l) => l.startsWith("- Search / Ask Shishya at https://shishya.in/ask")) ?? "";
    expect(line).toContain("https://shishya.in/ask?q={urlencoded query}");
    expect(line).toMatch(/school class, subject or chapter/);
    expect(line).toMatch(/Class 1-7 searches get pages only/);
    expect(line).not.toMatch(/voice|170\+|\b1[0-9]{2}\+? exams/i);
    expect(llms).not.toMatch(/\*\*Voice input supported\*\*/);
    const full = read("src/app/llms-full.txt/route.ts");
    expect(full).toContain("`- Search / Ask Shishya — ${SITE}/ask (deep link: ${SITE}/ask?q={urlencoded query})");
    expect(full).toMatch(/one of the \$\{exams\.length\} exam hubs/);
  });
});

// 26 Sep 2026 (founder): the empty box first says what it does — "type
// anything you want to learn or know, we'll take you to your page" — then
// alternates that prompt with the tested examples.
describe("search prompt (founder wording)", () => {
  it("every locale has a prompt in its own script that promises the page, with no counts", () => {
    expect(searchCopy("en").prompt).toMatch(/type what you want to learn/i);
    expect(searchCopy("en").prompt).toMatch(/your page/i);
    expect(detectScript(searchCopy("hi").prompt)).toBe("deva");
    expect(detectScript(searchCopy("te").prompt)).toBe("telu");
    for (const l of ["en", "hi", "te"] as const) expect(searchCopy(l).prompt).not.toMatch(/\d/);
  });

  it("the strip shows the prompt first and alternates it with the examples", () => {
    const src = read("src/components/search/SearchStrip.tsx");
    expect(src).toContain("placeholder={showing?.text ?? copy.prompt}");
    expect(src).toContain("const cycle = examples.length * 2;");
    expect(src).toContain("sample % 2 === 1 ? examples[(sample - 1) / 2] : undefined");
  });
});
