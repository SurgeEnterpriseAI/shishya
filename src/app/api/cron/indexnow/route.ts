// GET /api/cron/indexnow — weekly re-submission of every sitemap URL to
// IndexNow (the shared instant-indexing API behind Bing → Copilot +
// ChatGPT-search grounding, and consumed by Perplexity's pipeline).
//
// The original submission was a one-shot script; every page shipped
// since (finder, current-affairs days, guides…) was never pushed. This
// cron keeps the index continuously fresh. Idempotent — engines dedupe
// re-submitted URLs. Auth: Bearer ${CRON_SECRET}. Weekly per vercel.json.

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const HOST = "shishya.in";
const KEY = "7e0b8421fc95cdb98187e2b89a6e2437"; // key file lives at /<KEY>.txt

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const xml = await (await fetch(`https://${HOST}/sitemap.xml`, { cache: "no-store" })).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (urls.length === 0) return Response.json({ ok: false, error: "no urls parsed" }, { status: 500 });

    let submitted = 0;
    const statuses: number[] = [];
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
      statuses.push(res.status);
      if (res.ok) submitted += chunk.length;
    }
    return Response.json({ ok: true, urls: urls.length, submitted, statuses });
  } catch (err) {
    return Response.json({ ok: false, error: String((err as Error)?.message).slice(0, 200) }, { status: 500 });
  }
}
