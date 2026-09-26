// What a search engine or AI crawler reads off one served page, as plain
// strings — for byte-for-byte before/after checks of a caching change
// (27 Sep 2026, cache wave 2: /exams/[code]/syllabus, then /cutoff and
// /updates, move from per-request rendering to the ISR cache, and the brief
// is that no URL, title, description, canonical, hreflang (the twin gate's
// output), robots line, JSON-LD or body text may change on the way).
//
// Pure: no fetch, no DB, no Node APIs. scripts/cache-check.ts fetches the
// pages, times them and writes/compares snapshots; this module only reads
// HTML. Tested in tests/unit/page-head-snapshot.test.ts.
//
// Placement-proof on purpose: a per-request render streams its metadata to
// a non-bot user agent (Next 15.2+; src/app/robots.ts and next.config.ts
// htmlLimitedBots decide who gets blocking metadata), so <title>, <meta>
// and <link rel="canonical"> can sit after </head>, while a cached render
// has them in <head>. Tags are collected from the whole document, in
// document order, so the same tags compare equal wherever they were placed.
// Each tag is kept as served (raw text), so "byte for byte" means exactly
// that for the tags a crawler reads.

/** The checker's own user agent: not in src/middleware.ts's AI-bot list (no
 *  BotVisit row, crawler analytics stay clean) and never a search engine's
 *  name. Pinned in tests/unit/page-head-snapshot.test.ts. */
export const CACHE_CHECK_UA = "shishya-cache-check/1.0 (+https://shishya.in; read-only cache check)";

export interface PageHeadSnapshot {
  /** <html lang="…"> as served, or null. */
  htmlLang: string | null;
  /** Every <title> element's inner text, raw (entities as served). */
  titles: string[];
  /** Every <meta> tag carrying name=, property= or http-equiv=, raw. */
  metas: string[];
  /** Every <link> whose rel is canonical or alternate, raw. */
  links: string[];
  /** Inner text of every <script type="application/ld+json">, raw. */
  jsonLd: string[];
  /** Visible text of the first <main>: scripts, styles, templates and
   *  hidden blocks' tags removed, tags stripped, whitespace collapsed.
   *  Entities stay as served. null when the page has no <main>. */
  mainText: string | null;
}

/** Derived, human-readable reads of a snapshot (for reports only). */
export interface PageHeadSummary {
  canonical: string | null;
  hreflang: { lang: string; href: string }[];
  robots: string[];
  description: string | null;
}

const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag);
  return m ? m[1] : null;
};

const TAG_RE = (name: string) => new RegExp(`<${name}\\b[^>]*>`, "gi");

export function extractHeadSnapshot(html: string): PageHeadSnapshot {
  const htmlTag = /<html\b[^>]*>/i.exec(html)?.[0] ?? null;
  // JSON-LD first, then everything else is read with the script bodies
  // blanked, so a "<meta" or "<title>" inside an inline script string (the
  // RSC payload) is never taken for a tag.
  const jsonLd = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const noScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "<script></script>");
  // An icon's <svg><title> is not the page title.
  const noSvg = noScripts.replace(/<svg\b[\s\S]*?<\/svg>/gi, "<svg></svg>");
  const titles = [...noSvg.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => m[1]);
  const metas = [...noScripts.matchAll(TAG_RE("meta"))]
    .map((m) => m[0])
    .filter((t) => attr(t, "name") !== null || attr(t, "property") !== null || attr(t, "http-equiv") !== null);
  const links = [...noScripts.matchAll(TAG_RE("link"))]
    .map((m) => m[0])
    .filter((t) => {
      const rel = (attr(t, "rel") ?? "").toLowerCase().split(/\s+/);
      return rel.includes("canonical") || rel.includes("alternate");
    });
  return {
    htmlLang: htmlTag ? attr(htmlTag, "lang") : null,
    titles,
    metas,
    links,
    jsonLd,
    mainText: mainVisibleText(noScripts),
  };
}

/** Visible text of the first <main> (see PageHeadSnapshot.mainText). */
export function mainVisibleText(html: string): string | null {
  const open = /<main\b[^>]*>/i.exec(html);
  if (!open) return null;
  const from = open.index + open[0].length;
  const close = html.lastIndexOf("</main>");
  const inner = html.slice(from, close > from ? close : undefined);
  return inner
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeSnapshot(s: PageHeadSnapshot): PageHeadSummary {
  const canonicalTag = s.links.find((t) => (attr(t, "rel") ?? "").toLowerCase().split(/\s+/).includes("canonical"));
  const hreflang = s.links
    .filter((t) => attr(t, "hreflang") !== null)
    .map((t) => ({ lang: attr(t, "hreflang")!, href: attr(t, "href") ?? "" }));
  const robots = s.metas
    .filter((t) => /^(robots|googlebot|bingbot)$/i.test(attr(t, "name") ?? ""))
    .map((t) => `${attr(t, "name")}: ${attr(t, "content") ?? ""}`);
  const desc = s.metas.find((t) => (attr(t, "name") ?? "").toLowerCase() === "description");
  return {
    canonical: canonicalTag ? attr(canonicalTag, "href") : null,
    hreflang,
    robots,
    description: desc ? attr(desc, "content") : null,
  };
}

export type SnapshotField = keyof PageHeadSnapshot;

export interface SnapshotDiff {
  field: SnapshotField;
  /** Items only in `before` / only in `after` (list fields), or the two
   *  values (scalar fields), or a window around the first differing
   *  character (mainText). */
  removed: string[];
  added: string[];
}

const SNAPSHOT_FIELDS: SnapshotField[] = ["htmlLang", "titles", "metas", "links", "jsonLd", "mainText"];

/** Field-by-field, byte-for-byte comparison. Lists compare in order: the
 *  same tags in a different order are a difference (a crawler that takes
 *  the first canonical or the first title reads them in order). */
export function compareSnapshots(before: PageHeadSnapshot, after: PageHeadSnapshot): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];
  for (const field of SNAPSHOT_FIELDS) {
    const a = before[field];
    const b = after[field];
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length === b.length && a.every((x, i) => x === b[i])) continue;
      const removed = a.filter((x) => !b.includes(x));
      const added = b.filter((x) => !a.includes(x));
      // Same items, different order.
      if (removed.length === 0 && added.length === 0) diffs.push({ field, removed: [a.join(" | ")], added: [b.join(" | ")] });
      else diffs.push({ field, removed, added });
      continue;
    }
    if (a === b) continue;
    if (field === "mainText" && typeof a === "string" && typeof b === "string") {
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      const from = Math.max(0, i - 60);
      diffs.push({ field, removed: [`@${i}: …${a.slice(from, i + 80)}…`], added: [`@${i}: …${b.slice(from, i + 80)}…`] });
      continue;
    }
    diffs.push({ field, removed: a === null ? [] : [String(a)], added: b === null ? [] : [String(b)] });
  }
  return diffs;
}

/** Whether a response may be served from the CDN / ISR cache, from its
 *  Cache-Control header alone ("private" or "no-store" → no). */
export function cacheableByHeader(cacheControl: string | null): boolean {
  if (!cacheControl) return false;
  const v = cacheControl.toLowerCase();
  return !/\bprivate\b|\bno-store\b/.test(v);
}
