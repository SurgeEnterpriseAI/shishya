// IndexNow — instant "this URL changed" pings to Bing/Yandex/etc. (Bing
// feeds ChatGPT search and Copilot). One shared helper (23 Aug 2026)
// replacing the three inline copies (results-extract, the weekly cron,
// the CLI). The key is public by design — it lives at /<key>.txt.
//
// 6 Sep 2026 (Exam Week Mode): event-driven submissions. The weekly
// sitemap re-submission is too slow for exam week, when /updates, /cutoff
// and the hub change daily and a phase article appears the same day —
// so the exam-data writer, the phase-article cron and the daily
// ?scope=examweek cron submit the exam-week URL set directly.

const INDEXNOW_HOST = "shishya.in";
export const INDEXNOW_KEY = "7e0b8421fc95cdb98187e2b89a6e2437";
export const SITE_ORIGIN = `https://${INDEXNOW_HOST}`;
const CHUNK = 10_000;
// A hanging api.indexnow.org must never hold a cron / writer open.
const FETCH_TIMEOUT_MS = 10_000;

/** Best-effort; never throws. Returns the number of chunks accepted. */
export async function pingIndexNow(urls: string[]): Promise<number> {
  const list = [...new Set(urls.filter((u) => typeof u === "string" && u.startsWith("https://")))];
  if (!list.length) return 0;
  let ok = 0;
  for (let i = 0; i < list.length; i += CHUNK) {
    try {
      const res = await fetch("https://api.indexnow.org/IndexNow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: INDEXNOW_HOST,
          key: INDEXNOW_KEY,
          keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
          urlList: list.slice(i, i + CHUNK),
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok || res.status === 202) ok++;
    } catch {
      /* best-effort — the weekly cron re-submits the whole sitemap anyway */
    }
  }
  return ok;
}

/** Fire-and-forget form for write paths: `void submitIndexNow(urls)`.
 *  Never rejects, never throws; resolves to the number of chunks accepted
 *  so callers that do await it can report the count. */
export function submitIndexNow(urls: string[]): Promise<number> {
  return pingIndexNow(urls).catch(() => 0);
}

/** The exam-week URL set for one exam: hub, tracker, cutoff, plus the
 *  Hindi/Telugu twins that exist (hub + tracker — the cutoff page has no
 *  locale twin; see src/app/sitemap.ts localeTwinUrls). */
export function examWeekUrls(code: string): string[] {
  const b = SITE_ORIGIN;
  return [
    `${b}/exams/${code}`,
    `${b}/exams/${code}/updates`,
    `${b}/exams/${code}/cutoff`,
    `${b}/hi/exams/${code}`,
    `${b}/te/exams/${code}`,
    `${b}/hi/exams/${code}/updates`,
    `${b}/te/exams/${code}/updates`,
  ];
}

/** Canonical URL of a phase article (/checklist, /live, /reactions). */
export function phaseArticleUrl(code: string, slug: string): string {
  return `${SITE_ORIGIN}/exams/${code}/${slug}`;
}
