// Shared types for the phase-article scraping pipeline.

export interface ScrapedSnippet {
  /** Stable id from the source (reddit post id, RSS guid, etc.). */
  id: string;
  /** Where the snippet came from. */
  type: "reddit" | "rss" | "manual";
  /** Public URL the snippet links back to. */
  url: string;
  /** Short headline / post title. */
  title: string;
  /** Plain-text body excerpt (≤ 800 chars after normalisation). */
  body: string;
  /** ISO timestamp the source was published / posted. */
  publishedAt: string;
  /** Optional engagement signal (reddit score, comment count). Used to weight summarisation. */
  score?: number;
  /** Optional sub-source label (subreddit name, RSS feed name). */
  channel?: string;
}
