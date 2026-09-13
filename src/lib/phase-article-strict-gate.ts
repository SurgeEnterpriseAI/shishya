// Stricter body gate for the LIVE / REACTIONS phase articles (13 Sep 2026).
//
// Audit 11 Sep 2026: one archived "LIVE" article whose body said "we don't
// have reliable data yet" passed the base quality gate
// (src/lib/phase-article-quality.ts — >= 2 cited sources, not a known
// placeholder phrasing, >= 400 chars / 150 words). On exam night these two
// pages now lead with deterministic first-party content (the verdict poll,
// official notices, cutoff, next stage) and render the model's article
// only BELOW it — so the article must clear a higher bar before it is
// worth the screen: longer, free of "no reliable data" / "zero content"
// phrasings, and it must actually name the exam it claims to cover.
//
// Used by the summariser loop (src/lib/refresh-phase-articles.ts — a LIVE /
// REACTIONS summary that fails is not written, the previous article is
// kept) and by the /live + /reactions pages (an active row that fails
// renders as absent). CHECKLIST keeps the base gate: it is evergreen prep
// content and the page has its own deterministic facts block.
// Pure, no DB, no model calls.

import { isRealArticle } from "@/lib/phase-article-quality";

export const STRICT_MIN_CHARS = 600;
export const STRICT_MIN_WORDS = 200;

// Hollow phrasings the base gate does not catch. Deliberately narrow: a
// real article may say "sources are thin" (the LIVE prompt asks for that
// when true); it may not say it has no reliable data at all.
const HOLLOW: RegExp[] = [
  /(?:we |shishya )?(?:do not|don'?t|did not|didn'?t) (?:yet )?have (?:any |enough |much |sufficient )?reliable (?:data|information|sources?|reports?)/i,
  /zero content/i,
  /no reliable (?:data|information|sources?|reports?)/i,
  /nothing (?:reliable|substantive|concrete) (?:was|is|could be|has been) (?:found|available|located)/i,
  /(?:reliable|verified) (?:data|information) (?:is|was) not (?:yet )?available/i,
];

/** Does the body mention the exam it is about (short name or full name,
 *  case-insensitive)? An article that never names its exam is generic
 *  filler, whatever its length. */
export function bodyNamesExam(body: string, exam: { shortName: string; name: string }): boolean {
  const b = body.toLowerCase();
  const short = exam.shortName.trim().toLowerCase();
  const full = exam.name.trim().toLowerCase();
  return (short.length > 0 && b.includes(short)) || (full.length > 0 && b.includes(full));
}

/** Base gate AND: >= STRICT_MIN_CHARS / STRICT_MIN_WORDS, no hollow
 *  phrasing, exam named in the body. */
export function passesStrictArticleGate(
  a: { bodyMarkdown: string; sourcesScraped: unknown },
  exam: { shortName: string; name: string },
): boolean {
  if (!isRealArticle(a)) return false;
  const text = (a.bodyMarkdown ?? "").trim();
  if (text.length < STRICT_MIN_CHARS) return false;
  if (text.split(/\s+/).length < STRICT_MIN_WORDS) return false;
  if (HOLLOW.some((re) => re.test(text))) return false;
  return bodyNamesExam(text, exam);
}
