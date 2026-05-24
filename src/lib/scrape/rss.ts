// Minimal RSS / Atom feed reader — no external dependency.
//
// India's major news sites (Indian Express, Times of India, NDTV,
// The Hindu) publish education / exam-specific RSS feeds. We pull
// the latest items per feed, normalise to ScrapedSnippet[], and
// hand them off to the summariser.
//
// Why hand-rolled instead of an RSS lib:
//   1. We only need title + link + description + pubDate — a regex
//      pass on the XML is fine and saves us a dependency.
//   2. Feed formats vary (RSS 2.0, Atom, mangled CDATA) — leaning
//      on a library tends to mask the cases that need normalisation
//      anyway. Cheaper to own the small surface.
//
// The reader is forgiving: malformed feeds yield an empty array
// rather than throwing, so a single bad feed doesn't break the
// whole refresh run.

import type { ScrapedSnippet } from "./types";

const USER_AGENT = "shishya-exam-watcher/1.0 (+https://shishya.in)";

export async function fetchRss(feedUrl: string, limit = 20): Promise<ScrapedSnippet[]> {
  let xml: string;
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  }

  // Use a forgiving regex split — works on both RSS <item> and
  // Atom <entry>. The non-greedy match avoids spilling across
  // adjacent items in feeds that don't pretty-print.
  const itemRe = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const items: ScrapedSnippet[] = [];
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) !== null) {
    const inner = match[2];
    const snip = parseItem(inner, feedUrl);
    if (snip) items.push(snip);
    if (items.length >= limit) break;
  }
  return items;
}

function parseItem(inner: string, feedUrl: string): ScrapedSnippet | null {
  const title = decodeXml(extractTag(inner, "title")).slice(0, 200);
  // RSS uses <link>URL</link>; Atom uses <link href="..." />.
  let url = extractTag(inner, "link");
  if (!url) {
    const m = inner.match(/<link[^>]*href=["']([^"']+)["']/i);
    if (m) url = m[1];
  }
  if (!title || !url) return null;

  // Body: prefer <description>, fall back to <summary> (Atom) or <content>.
  const rawBody =
    extractTag(inner, "description") ||
    extractTag(inner, "summary") ||
    extractTag(inner, "content") ||
    "";
  const body = stripHtml(decodeXml(rawBody)).slice(0, 800).trim();

  const pub =
    extractTag(inner, "pubDate") ||
    extractTag(inner, "published") ||
    extractTag(inner, "updated") ||
    "";
  const publishedAt = pub ? new Date(pub).toISOString() : new Date().toISOString();

  // Stable id: use <guid> when present, else fall back to the URL.
  const guid = extractTag(inner, "guid") || extractTag(inner, "id") || url;
  const channel = feedHostname(feedUrl);

  return {
    id: `rss:${guid}`,
    type: "rss",
    url,
    title,
    body,
    publishedAt,
    channel,
  };
}

function extractTag(xml: string, tag: string): string {
  // CDATA-aware. Handles <tag><![CDATA[ ... ]]></tag> AND <tag>...</tag>.
  const cdataRe = new RegExp(`<${tag}\\b[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const plainRe = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return (xml.match(cdataRe)?.[1] ?? xml.match(plainRe)?.[1] ?? "").trim();
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function feedHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "rss";
  }
}
