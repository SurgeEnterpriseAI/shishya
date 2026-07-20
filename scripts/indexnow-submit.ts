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
// USAGE: npx tsx scripts/indexnow-submit.ts

const HOST = "shishya.in";
const KEY = "7e0b8421fc95cdb98187e2b89a6e2437";
const SITEMAP = `https://${HOST}/sitemap.xml`;

async function main() {
  const xml = await (await fetch(SITEMAP)).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`sitemap URLs: ${urls.length}`);
  if (urls.length === 0) throw new Error("no URLs parsed from sitemap");

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
