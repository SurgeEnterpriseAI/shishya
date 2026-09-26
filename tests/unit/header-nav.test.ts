// The site header (26 Sep 2026, five-section platform) — a source scan of
// src/components/Header.tsx. No DB, no network, no render.
// Run: npx vitest run tests/unit/header-nav.test.ts
//
// What this pins:
//   1. the orange Primary row, in order, with hrefs: [Today island] Ask
//      Shishya · School · Entrance exams · Government exams · College &
//      scholarships · Careers │ Exam calendar · Results · Current affairs;
//   2. the five section labels ARE the home doors' titles
//      (HOME_DOORS_COPY.en.doors.*.title, HOME_DOOR_IDS order) — without
//      Header importing that per-locale map;
//   3. the anchor budget: ≤ 8 plain anchors + exactly one Ask chip, nothing
//      hidden per breakpoint (every phone and crawler reads the same row);
//      only the Ask chip has a tooltip, and the header's hard-coded English
//      stays within the /hi /te twin gate's baseline (257 letters);
//   4. the top rail: logo + Back + quote + language/auth island only — the
//      Jobs Map, Results and Aptitude pills are gone; Sign in stays the
//      filled button;
//   5. Header stays a pure synchronous server component (no auth(),
//      cookies(), headers(), getT());
//   6. honesty + independence: no retired links, nothing "coming soon", no
//      degree-study section linked, no journey wording in labels or titles;
//   7. every href in Header resolves to a page under src/app, and the
//      home page's Entrance door keeps its anchor (li#entrance).
//
// 27 Sep 2026: "Entrance exams" links /exams/entrance, the Entrance section's
// own page (was /#entrance, the home page's door, before that page existed).

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { HOME_DOORS_COPY } from "@/lib/home-doors-copy";
import { HOME_DOOR_IDS } from "@/lib/home-doors";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Source without comments, so a comment that names cookies() or a retired
 *  route is not code (same rule as tests/unit/cache-pilot-routes.test.ts). */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const HEADER_RAW = read("src/components/Header.tsx");
const HEADER = code(HEADER_RAW);

/** The Primary <nav> block: from aria-label="Primary" to its </nav>. */
function primaryBlock(): string {
  const start = HEADER.indexOf('aria-label="Primary"');
  expect(start, "Primary nav not found").toBeGreaterThan(-1);
  const end = HEADER.indexOf("</nav>", start);
  expect(end).toBeGreaterThan(start);
  return HEADER.slice(start, end);
}

/** The top row: everything before the Primary nav. */
function topBlock(): string {
  return HEADER.slice(0, HEADER.indexOf('aria-label="Primary"'));
}

interface RowItem {
  kind: "today" | "link" | "divider";
  href?: string;
  label?: string;
  attrs?: string;
}

const decode = (s: string) => s.replace(/\s+/g, " ").trim().replace(/&amp;/g, "&").replace(/&apos;/g, "'");
const attr = (attrs: string, name: string) => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1];

/** The row's children in DOM order. */
function rowItems(): RowItem[] {
  const block = primaryBlock();
  const items: RowItem[] = [];
  const re = /<TodayNavLink\s*\/>|<Link\b([^>]*)>([\s\S]*?)<\/Link>|<span\b([^>]*)\/>/g;
  for (const m of block.matchAll(re)) {
    if (m[0].startsWith("<TodayNavLink")) items.push({ kind: "today" });
    else if (m[0].startsWith("<Link")) items.push({ kind: "link", href: attr(m[1], "href"), label: decode(m[2]), attrs: m[1] });
    else items.push({ kind: "divider", attrs: m[3] });
  }
  return items;
}

const links = () => rowItems().filter((i) => i.kind === "link");

/** Does an app-router path exist under src/app? Dynamic segments ([x]) and
 *  route groups ((x)) are followed; the leaf must hold page.tsx. Same walk
 *  as tests/unit/home-doors.test.ts. */
function routeExists(href: string): boolean {
  const clean = href.split(/[?#]/)[0];
  const segs = clean.split("/").filter(Boolean);
  const expand = (dir: string): string[] => {
    const out = [dir];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && /^\(.+\)$/.test(e.name)) out.push(...expand(path.join(dir, e.name)));
    }
    return out;
  };
  let dirs = expand(path.join(ROOT, "src/app"));
  for (const seg of segs) {
    const next: string[] = [];
    for (const d of dirs) {
      const exact = path.join(d, seg);
      if (fs.existsSync(exact) && fs.statSync(exact).isDirectory()) next.push(...expand(exact));
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory() && /^\[.+\]$/.test(e.name)) next.push(...expand(path.join(d, e.name)));
      }
    }
    dirs = next;
    if (dirs.length === 0) return false;
  }
  return dirs.some((d) => fs.existsSync(path.join(d, "page.tsx")));
}

// ── 1. the Primary row ─────────────────────────────────────────────────

const EXPECTED_ROW: ReadonlyArray<{ label: string; href: string; nav: string }> = [
  { label: "Ask Shishya", href: "/chat", nav: "ask" },
  { label: "School", href: "/schooling", nav: "school" },
  // 27 Sep 2026: the Entrance section's own page (was "/#entrance", the home page's door).
  { label: "Entrance exams", href: "/exams/entrance", nav: "entrance" },
  { label: "Government exams", href: "/exams/browse", nav: "government" },
  { label: "College & scholarships", href: "/colleges", nav: "college" },
  { label: "Careers", href: "/careers", nav: "careers" },
  { label: "Exam calendar", href: "/exam-calendar", nav: "calendar" },
  { label: "Live tests", href: "/live-test", nav: "live-tests" },
  { label: "Results", href: "/results", nav: "results" },
  { label: "Current affairs", href: "/current-affairs", nav: "current-affairs" },
];

describe("Header — the Primary row", () => {
  it("is exactly [Today island] Ask Shishya, the five sections, a divider, then the three exam utilities — in this order, with these hrefs", () => {
    const items = rowItems();
    expect(items[0].kind, "TodayNavLink must stay the row's first child").toBe("today");
    expect(items.filter((i) => i.kind === "today")).toHaveLength(1);
    expect(links().map((l) => ({ label: l.label, href: l.href }))).toEqual(
      EXPECTED_ROW.map(({ label, href }) => ({ label, href })),
    );
    // One divider, between Careers and Exam calendar.
    const kinds = items.map((i) => (i.kind === "link" ? i.label : i.kind));
    expect(kinds.filter((k) => k === "divider")).toHaveLength(1);
    expect(kinds.indexOf("divider")).toBe(kinds.indexOf("Careers") + 1);
    expect(kinds.indexOf("Exam calendar")).toBe(kinds.indexOf("divider") + 1);
  });

  it("each row link carries its data-nav name for tap attribution", () => {
    expect(links().map((l) => attr(l.attrs!, "data-nav"))).toEqual(EXPECTED_ROW.map((r) => r.nav));
  });

  it("the five section labels are the home doors' titles, in HOME_DOOR_IDS order", () => {
    const doorTitles = HOME_DOOR_IDS.map((id) => HOME_DOORS_COPY.en.doors[id].title);
    expect(doorTitles).toEqual(["School", "Entrance exams", "Government exams", "College & scholarships", "Careers"]);
    const sectionLabels = links().slice(1, 6).map((l) => l.label);
    expect(sectionLabels).toEqual(doorTitles);
  });

  it("the section hrefs are the doors' own targets on the home page", () => {
    const doors = read("src/components/home/HomeDoors.tsx");
    for (const [id, href] of [
      ["school", "/schooling"],
      ["government", "/exams/browse"],
      ["college", "/colleges"],
      ["careers", "/careers"],
    ] as const) {
      expect(doors, `door ${id}`).toMatch(new RegExp(`id="${id}"[\\s\\S]{0,200}?href="${href.replace(/\//g, "\\/")}"`));
    }
  });

  // 26 Sep 2026: budget 9 (was 8) — "Live tests" restored in the utility
  // group at integration; the header is its only permanent internal link.
  it("anchor budget: ≤ 9 plain anchors plus exactly one Ask chip; no link is hidden at any breakpoint", () => {
    const all = links();
    expect(all.length).toBeLessThanOrEqual(10);
    const ask = all.filter((l) => l.label === "Ask Shishya");
    expect(ask).toHaveLength(1);
    expect(all.length - ask.length).toBeLessThanOrEqual(9);
    // No per-breakpoint display toggles on any row item or on the shared
    // class constants the links use. (The row container's only "hidden" is
    // the scrollbar pseudo-element, [&::-webkit-scrollbar]:hidden.)
    const TOGGLE = /\bhidden\b|:inline\b|:block\b|:flex\b|:hidden\b/;
    for (const item of rowItems()) {
      const cls = item.attrs ? attr(item.attrs, "className") : undefined;
      if (cls) expect(cls, item.label ?? item.kind).not.toMatch(TOGGLE);
      if (item.attrs) expect(item.attrs, item.label ?? item.kind).toMatch(/className=/);
    }
    const container = primaryBlock().match(/<div className="([^"]*)">/)?.[1] ?? "";
    expect(container).toContain("overflow-x-auto");
    expect(container.replace("[&::-webkit-scrollbar]:hidden", "")).not.toMatch(TOGGLE);
    for (const name of ["SECTION_LINK", "UTILITY_LINK"]) {
      const value = HEADER.match(new RegExp(`const ${name} = "([^"]*)"`))?.[1];
      expect(value, name).toBeDefined();
      expect(value!).not.toMatch(/\bhidden\b|:inline\b|:block\b|:hidden\b/);
    }
  });

  it("Ask Shishya is the row's one chip: plain /chat, no prefetch, an honest title — and appears nowhere else in Header", () => {
    const ask = links()[0];
    expect(ask.attrs).toMatch(/prefetch=\{false\}/);
    expect(attr(ask.attrs!, "title")).toBe("Ask Shishya — free, no sign-in");
    expect(attr(ask.attrs!, "className")).toMatch(/\bbg-white\b/);
    expect(HEADER.match(/>\s*Ask Shishya\s*</g)).toHaveLength(1);
    expect(HEADER.match(/href="\/chat[^"]*"/g)).toEqual(['href="/chat"']);
    // Sections and utilities are plain text, not chips.
    for (const l of links().slice(1)) expect(attr(l.attrs!, "className") ?? "", l.label).not.toMatch(/\bbg-/);
  });

  it("the row keeps the 26 Aug contract: saffron-500 bar, one 36 px line, white bold 13 px, sideways scroll", () => {
    const block = primaryBlock();
    expect(block).toMatch(/className="border-t border-saffron-500 bg-saffron-500"/);
    expect(block).toMatch(/flex h-9 items-center/);
    expect(block).toMatch(/overflow-x-auto whitespace-nowrap text-\[13px\] font-bold text-white/);
    expect(HEADER).toMatch(/\{!admin && \(\s*<nav\s+aria-label="Primary"/);
  });

  it("only Ask Shishya carries a tooltip; the header's hard-coded English stays under the old header's (twin gate)", () => {
    // Integration 26 Sep 2026: src/lib/twin-localisation.ts counts every
    // /hi and /te twin page's hard-coded English — this header included —
    // against the pinned TWIN_CHROME.literalLatin. Eight English tooltips
    // (457 letters) broke tests/unit/index-shape-twins.test.ts on four
    // surfaces and would have let the live gate under-count English.
    const withTitle = links().filter((l) => attr(l.attrs!, "title") !== undefined);
    expect(withTitle.map((l) => l.label)).toEqual(["Ask Shishya"]);
    // Same measure as literalLatin() in tests/unit/index-shape-twins.test.ts:
    // Latin letters of JSX text and of ≥ 4-word string literals.
    const latin = (t: string) => (t.match(/[A-Za-z]/g) ?? []).length;
    const s = HEADER_RAW.replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`])\/\/.*$/gm, "$1")
      .replace(/className=("[^"]*"|\{`[^`]*`\})/g, "");
    let n = 0;
    for (const m of s.matchAll(/[>}]([^<>{}]+)(?=[<{])/g)) {
      const t = m[1].trim();
      if (/[A-Za-z]{2}/.test(t) && !/[;=()]|=>|&&|\|\|/.test(t) && (/\s/.test(t) || /^[A-Z]/.test(t))) n += latin(t);
    }
    for (const m of s.matchAll(/"([^"\n]{12,})"/g)) {
      const words = m[1].split(/\s+/);
      if (words.length >= 4 && words.filter((w) => /[-:/]/.test(w)).length < words.length / 3) n += latin(m[1]);
    }
    // 257 = the header before 26 Sep 2026 (the TWIN_CHROME calibration
    // baseline); 144 today. Above 257, re-measure the twin gate first.
    expect(n).toBeLessThanOrEqual(257);
  });
});

// ── 2. the top row ─────────────────────────────────────────────────────

describe("Header — the top row", () => {
  it("holds the logo, Back, the quote and the language/auth island — no pills", () => {
    const top = topBlock();
    const hrefs = [...top.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["/"]);
    expect(top).toMatch(/<BackLink \/>/);
    expect(top).toMatch(/getDailyQuote\(\)/);
    expect(top).toMatch(/<HeaderAuthControls locale=\{DEFAULT_LOCALE\} labels=\{RAIL_LABELS\} \/>/);
    for (const gone of ["/results", "/aptitude", "/jobs-map", "Aptitude Test", "Govt Jobs Map", "🎉"]) {
      expect(top, gone).not.toContain(gone);
    }
  });

  it("fits a 360 px phone: wordmark from 400 px, Back from sm, 8 px gaps below sm; admin keeps the old brand and Back", () => {
    const top = topBlock();
    expect(top).toMatch(/className="hidden flex-col min-\[400px\]:flex"/);
    expect(top).toMatch(/<div className="hidden sm:contents">\s*<BackLink \/>\s*<\/div>/);
    expect(top).toMatch(/container-prose flex h-16 items-center gap-2 sm:gap-3/);
    expect(top).toMatch(/ml-auto flex shrink-0 items-center gap-2 text-sm text-ink-700 sm:gap-3/);
    // Admin branch: plain wordmark, unwrapped BackLink.
    expect(top).toMatch(/\{admin \? \(\s*<span className="text-lg font-semibold tracking-tight text-ink-900">Shishya<\/span>/);
    expect(top).toMatch(/\{admin \? \(\s*<BackLink \/>/);
  });

  it("the tagline under the wordmark is the home page's h1, verbatim", () => {
    expect(HOME_DOORS_COPY.en.hero.h1).toBe("One smart place to study");
    expect(topBlock()).toContain(HOME_DOORS_COPY.en.hero.h1);
  });

  it("Sign in stays the filled primary button (HeaderAuthControls, read-only check)", () => {
    const controls = read("src/components/HeaderAuthControls.tsx");
    expect(controls).toMatch(/<Link rel="nofollow" href="\/login" className="btn-primary/);
  });
});

// ── 3. static rendering ────────────────────────────────────────────────

describe("Header — pure synchronous server component", () => {
  it("calls no dynamic API and imports no per-locale copy", () => {
    for (const call of ["auth(", "cookies(", "headers(", "getT(", "getLocale(", "searchParams", "await "]) {
      expect(HEADER, call).not.toContain(call);
    }
    expect(HEADER_RAW).not.toMatch(/^\s*["']use client["']/m);
    expect(HEADER).toMatch(/export function Header\(/);
    expect(HEADER).not.toMatch(/async function Header/);
    expect(HEADER).not.toMatch(/from "@\/lib\/home-doors-copy"|from "@\/lib\/i18n/);
  });
});

// ── 4. honesty + independence ──────────────────────────────────────────

const SEQUENCE_EN = /\b(then|next step|next steps|after that|after which|step [1-9]|finally|once you|and then|journey)\b|\bfirst,/i;

describe("Header — honesty and independence", () => {
  it("links no retired header route and no section that is only being built", () => {
    for (const gone of ["/aptitude", "/pricing", "/jobs-map", "/find-your-exam", "/mentors", "/post-graduation"]) {
      expect(HEADER, gone).not.toContain(`"${gone}`);
    }
    expect(HEADER).not.toMatch(/Graduation|PhD|coming soon|being built/i);
  });

  it("no label or title reads as a step or a journey", () => {
    const strings: string[] = [];
    for (const l of links()) {
      strings.push(l.label!);
      const title = attr(l.attrs!, "title");
      if (title) strings.push(title);
    }
    expect(strings.length).toBeGreaterThan(9);
    for (const s of strings) expect(SEQUENCE_EN.test(s), s).toBe(false);
  });
});

// ── 5. links resolve ───────────────────────────────────────────────────

describe("Header — every href resolves", () => {
  it("each static href in Header.tsx has a page.tsx under src/app", () => {
    const hrefs = [...new Set([...HEADER.matchAll(/href=\{?["'`](\/[^"'`{}]*)["'`]\}?/g)].map((m) => m[1]))];
    expect(hrefs.length).toBe(EXPECTED_ROW.length + 1); // the row + the logo
    for (const h of hrefs) expect(routeExists(h), `${h} has no page.tsx under src/app`).toBe(true);
  });

  // 27 Sep 2026: the header now links /exams/entrance; other pages may still link the door's anchor.
  it("/#entrance still has its target: the Entrance door's <li id> on the home page (read-only)", () => {
    expect(HOME_DOOR_IDS).toContain("entrance");
    const doors = read("src/components/home/HomeDoors.tsx");
    expect(doors).toMatch(/<Door id="entrance"/);
    expect(doors).toMatch(/<li id=\{id\}/);
    expect(read("src/app/page.tsx")).toMatch(/HomeDoors/);
  });
});
