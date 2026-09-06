// Phase-article quality gate (6 Sep 2026, Exam Week Mode).
//
// Measured 1 Aug → 6 Sep: 356 phase articles generated, 15 human visitors,
// ~$1.6/day — most of them hollow "no student discussion found yet"
// placeholders, and CDS got a false "live today" page from a stale row.
// This module is the single definition of what a REAL article is, shared
// by the summariser (reject before writing), the AEO surfaces (only link
// real articles) and the IndexNow scope (only submit real article URLs):
//
//   real  = cites >= MIN_ARTICLE_SOURCES distinct http(s) sources
//           AND the body is not a placeholder (see isPlaceholderArticle)
//
// Pure functions, no DB, no model calls.

export const MIN_ARTICLE_SOURCES = 2;
/** Bodies shorter than this are placeholders by definition (a real LIVE /
 *  REACTIONS / CHECKLIST article is 500+ words). */
export const MIN_ARTICLE_CHARS = 400;
export const MIN_ARTICLE_WORDS = 150;

// Known hollow-article phrasings. Deliberately does NOT match "sources are
// thin" — the LIVE prompt asks the model to say so explicitly when true,
// and a thin-but-real article with two cited sources may keep that line.
const PLACEHOLDER_PHRASES: RegExp[] = [
  /no (?:student|aspirant|public|online)?\s*(?:discussion|chatter|reactions?|feedback|posts?)\s+(?:was |were |has been |have been |could be |is |are )?(?:found|available|located|surfaced|yet)/i,
  /(?:could not|couldn't|did not|didn't|unable to|were unable to|was unable to) (?:find|locate|surface|identify) (?:any |enough |sufficient |substantive )?(?:student|aspirant|public|online|substantive|specific|reliable|meaningful)/i,
  /check back (?:later|soon|shortly|closer|in a few hours|after|tomorrow)/i,
  /(?:coverage|analysis|article|verdict|update|report)s? (?:is|are|will be) (?:being )?(?:compiled|prepared|published|updated|added) (?:shortly|soon|once|as soon as|when|as reactions)/i,
  /no (?:data|information|sources?|snippets?) (?:is |are |was |were )?(?:yet |currently |presently )?available/i,
  /(?:not enough|insufficient|too little) (?:data|information|discussion|chatter|sources|reactions|student)/i,
  /this (?:page|article) will be updated (?:once|when|as)/i,
  /\bplaceholder\b/i,
  /\bas an ai\b/i,
  /based on the (?:data|snippets|information) provided/i,
];

/** True when the body is hollow: too short, or carries a known
 *  "nothing found yet" phrasing. */
export function isPlaceholderArticle(body: string | null | undefined): boolean {
  const text = (body ?? "").trim();
  if (text.length < MIN_ARTICLE_CHARS) return true;
  if (text.split(/\s+/).length < MIN_ARTICLE_WORDS) return true;
  return PLACEHOLDER_PHRASES.some((re) => re.test(text));
}

/** Distinct http(s) URLs in a sourcesScraped / sourcesUsed array. */
export function realSourceCount(sources: unknown): number {
  if (!Array.isArray(sources)) return 0;
  const urls = new Set<string>();
  for (const s of sources) {
    const url = s && typeof s === "object" ? (s as { url?: unknown }).url : null;
    if (typeof url === "string" && /^https?:\/\//i.test(url.trim())) urls.add(url.trim());
  }
  return urls.size;
}

/** The one predicate every surface uses before showing / linking / indexing
 *  a phase article. */
export function isRealArticle(a: { bodyMarkdown: string; sourcesScraped: unknown }): boolean {
  return realSourceCount(a.sourcesScraped) >= MIN_ARTICLE_SOURCES && !isPlaceholderArticle(a.bodyMarkdown);
}
