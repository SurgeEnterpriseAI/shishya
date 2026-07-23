// scripts/generate-inspiration-videos.ts
//
// Populates the homepage inspiration carousel with REAL, popular
// YouTube success-story / "how I cracked it" videos for govt-exam
// aspirants. Claude + web_search surfaces candidates; each is then
// VALIDATED via YouTube oEmbed (200 = real video) which also returns
// the true title / channel / thumbnail — so no hallucinated IDs and
// every thumbnail resolves. Stored in InspirationVideo.
//
// USAGE: npx tsx scripts/generate-inspiration-videos.ts [--limit 15]

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const MODEL = "claude-sonnet-4-5-20250929";
const LIMIT = parseInt(process.argv[process.argv.indexOf("--limit") + 1] || "15", 10);

const SYSTEM = `You curate INSPIRING YouTube videos for Indian government-exam aspirants: topper interviews, "how I cracked UPSC/SSC/Banking without coaching", success stories, motivational strategy talks from real toppers/educators. Prefer widely-viewed, well-known videos from reputable channels.

Use web_search to find real videos. Return STRICT JSON only — an array:
[
  { "url": "https://www.youtube.com/watch?v=REALID", "reason": "one short line on why it inspires (e.g. 'IAS topper who cleared in first attempt while working')", "examTag": "UPSC" | "SSC" | "Banking" | "General" | ... }
]

RULES: 12-18 items. Every url MUST be a real https://www.youtube.com/watch?v=… link taken from an actual search result — never invent an ID. Diverse exams (UPSC, SSC, Banking, Railways, TET, Defence). Keep reasons factual and motivating, under 90 chars.`;

function extractId(url: string): string | null {
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/) || url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Validate + enrich via YouTube oEmbed (no API key needed). Returns the
// real title/channel when the video exists, null otherwise.
async function oembed(id: string): Promise<{ title: string; channel: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: string; author_name?: string };
    if (!j.title) return null;
    return { title: j.title, channel: j.author_name ?? "" };
  } catch {
    return null;
  }
}

async function main() {
  const res = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 2500,
      system: SYSTEM,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 } as any],
      messages: [{ role: "user", content: "Find the most inspiring, popular YouTube success-story videos for Indian government-exam aspirants and return the STRICT JSON array." }],
    },
    { timeout: 180_000, maxRetries: 2 },
  );
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
  const s = text.indexOf("["), e = text.lastIndexOf("]");
  if (s === -1 || e === -1) { console.error("no json array in output"); process.exit(1); }
  const candidates = JSON.parse(text.slice(s, e + 1)) as { url: string; reason?: string; examTag?: string }[];
  console.log(`candidates: ${candidates.length}`);

  let idx = 0, stored = 0, rejected = 0;
  const seen = new Set<string>();
  for (const c of candidates) {
    const id = extractId(c.url || "");
    if (!id || seen.has(id)) { rejected++; continue; }
    seen.add(id);
    const meta = await oembed(id);
    if (!meta) { console.warn(`  ✗ ${id} not a valid/public video`); rejected++; continue; }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "InspirationVideo" (id, "youtubeId", title, channel, "thumbnailUrl", reason, "examTag", "orderIdx", active, "addedAt", "generatedBy")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), $8)
       ON CONFLICT ("youtubeId") DO UPDATE SET title=$2, channel=$3, "thumbnailUrl"=$4, reason=$5, "examTag"=$6, "orderIdx"=$7, active=TRUE`,
      id, meta.title, meta.channel, `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      c.reason ?? null, c.examTag ?? null, idx++, `claude:${MODEL}`,
    );
    stored++;
    console.log(`  ✓ ${id} — ${meta.title.slice(0, 60)}`);
    if (stored >= LIMIT) break;
  }
  console.log(`\nDone. stored=${stored} rejected=${rejected}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
