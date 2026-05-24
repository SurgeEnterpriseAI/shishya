// Reddit scraper — free, no auth, no rate limits beyond Reddit's
// soft 60 req/min cap (we use a polite 1 req/sec spacing).
//
// We hit Reddit's public JSON endpoint:
//
//   https://www.reddit.com/r/<sub>/new.json?limit=25
//   https://www.reddit.com/search.json?q=<term>&sort=new&t=week
//
// Both work without an OAuth token as long as we send a User-Agent
// that identifies the bot. Without UA Reddit returns 429.
//
// Returned posts are normalised into ScrapedSnippet[].

import type { ScrapedSnippet } from "./types";

const USER_AGENT = "shishya-exam-watcher/1.0 (+https://shishya.in)";

interface RedditListing {
  data: {
    children: Array<{
      kind: string;
      data: RedditPost;
    }>;
  };
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  created_utc: number;
  score: number;
  num_comments: number;
  subreddit: string;
  url?: string;
  link_flair_text?: string | null;
  /** True when post is text-only; we drop image/link posts (lower signal). */
  is_self?: boolean;
}

async function fetchListing(url: string): Promise<RedditListing | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      // Reddit's CDN sometimes throttles aggressively; 8s should cover
      // a healthy response. Failures fall through to the catch and we
      // skip this source for this run.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as RedditListing;
  } catch {
    return null;
  }
}

/**
 * Fetch the N most recent text posts from a subreddit.
 * Image / link posts are filtered out — the signal lives in self-text
 * threads ("How was the UPSC prelims today?"), not in posted images.
 */
export async function fetchSubredditNew(
  subreddit: string,
  limit = 20,
): Promise<ScrapedSnippet[]> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${limit}`;
  const data = await fetchListing(url);
  if (!data) return [];
  return data.data.children
    .filter((c) => c.kind === "t3" && c.data.is_self)
    .map((c) => toSnippet(c.data));
}

/**
 * Search reddit-wide for posts matching a query. Used to catch
 * discussion outside the canonical subreddits (e.g. r/UPSC posts
 * about JEE — happens — or fresh subs we haven't mapped yet).
 *
 * `time` is one of hour|day|week|month|year — we always pass week
 * during exam windows so the result set is recency-biased.
 */
export async function searchReddit(
  query: string,
  time: "day" | "week" | "month" = "week",
  limit = 25,
): Promise<ScrapedSnippet[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    query,
  )}&sort=new&t=${time}&limit=${limit}`;
  const data = await fetchListing(url);
  if (!data) return [];
  return data.data.children
    .filter((c) => c.kind === "t3" && c.data.is_self)
    .map((c) => toSnippet(c.data));
}

function toSnippet(p: RedditPost): ScrapedSnippet {
  // Trim selftext to ≤ 800 chars — keeps Claude's input context
  // bounded across 50+ posts per refresh.
  const body = p.selftext.slice(0, 800).trim();
  return {
    id: `reddit:${p.id}`,
    type: "reddit",
    url: `https://www.reddit.com${p.permalink}`,
    title: p.title.slice(0, 200),
    body,
    publishedAt: new Date(p.created_utc * 1000).toISOString(),
    score: p.score,
    channel: `r/${p.subreddit}`,
  };
}
