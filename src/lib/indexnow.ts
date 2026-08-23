// IndexNow — instant "this URL changed" pings to Bing/Yandex/etc. (Bing
// feeds ChatGPT search and Copilot). One shared helper (23 Aug 2026)
// replacing the three inline copies (results-extract, the weekly cron,
// the CLI). The key is public by design — it lives at /<key>.txt.

const INDEXNOW_HOST = "shishya.in";
export const INDEXNOW_KEY = "7e0b8421fc95cdb98187e2b89a6e2437";
const CHUNK = 10_000;

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
      });
      if (res.ok || res.status === 202) ok++;
    } catch {
      /* best-effort — the weekly cron re-submits the whole sitemap anyway */
    }
  }
  return ok;
}
