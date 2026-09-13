// scripts/indexnow-submit.ts
//
// Push every sitemap URL to IndexNow — the shared instant-indexing
// API behind Bing (which powers ChatGPT search + Copilot), Seznam,
// Naver and Yandex. This gets the whole site into the Bing index
// WITHOUT waiting on the manual Bing Webmaster Tools setup.
//
// Key is hosted at https://shishya.in/<KEY>.txt (public/ file) per the
// IndexNow verification protocol. Safe to re-run any time (idempotent
// server-side; engines dedupe). Max 10,000 URLs per POST — we chunk.
//
// Since 13 Sep 2026 (index shape) the weekly cron no longer pushes the whole
// sitemap, so after a ship push only the URL families that are new or
// changed: --match takes a regex over the sitemap URLs.
//
// USAGE: npx tsx scripts/indexnow-submit.ts                          # every sitemap URL
//        npx tsx scripts/indexnow-submit.ts --match "/checklist$|/ideas$"

const HOST = "shishya.in";
const KEY = "7e0b8421fc95cdb98187e2b89a6e2437";
const SITEMAP = `https://${HOST}/sitemap.xml`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const xml = await (await fetch(SITEMAP)).text();
  const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const match = arg("--match");
  const urls = match ? all.filter((u) => new RegExp(match).test(u)) : all;
  console.log(`sitemap URLs: ${all.length}${match ? ` · matching ${match}: ${urls.length}` : ""}`);
  if (urls.length === 0) throw new Error("no URLs to submit");

  for (let i = 0; i < urls.length; i += 10_000) {
    const chunk = urls.slice(i, i + 10_000);
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList: chunk,
      }),
    });
    console.log(`chunk ${i / 10_000 + 1}: ${chunk.length} URLs → HTTP ${res.status} ${res.statusText}`);
    const body = await res.text();
    if (body) console.log(`  response: ${body.slice(0, 200)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
