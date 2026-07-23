// scripts/generate-official-sources.ts
//
// Populates ExamEligibility.officialUrl / officialName — the OFFICIAL
// conducting body where vacancies & notifications are really published,
// so students can verify our indicative vacancy figures at the source.
// Claude + web_search finds the authoritative government/board URL.
//
// USAGE: npx tsx scripts/generate-official-sources.ts [--budget 10]

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const MODEL = "claude-sonnet-4-5-20250929";
const CONCURRENCY = 4;
const IN_PER_M = 3, OUT_PER_M = 15;
const BUDGET = parseFloat(process.argv[process.argv.indexOf("--budget") + 1] || "10");

const totals = { in: 0, out: 0, done: 0, failed: 0 };
const spend = () => (totals.in * IN_PER_M + totals.out * OUT_PER_M) / 1_000_000;

function firstJson(text: string): any {
  const s = text.indexOf("{");
  if (s === -1) throw new Error("no json");
  let depth = 0;
  for (let i = s; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) return JSON.parse(text.slice(s, i + 1)); }
  }
  throw new Error("unbalanced json");
}

const SYSTEM = `You identify the OFFICIAL conducting body and its official website for an Indian government/entrance exam, so aspirants can verify vacancies and notifications at the authoritative source. Use web_search to confirm the real official domain (government/board site, not a coaching or aggregator site).

Return STRICT JSON only:
{
  "officialName": "Staff Selection Commission (SSC)",
  "officialUrl": "https://ssc.gov.in"
}

RULES: officialUrl MUST be the real official government/board domain (e.g. ssc.gov.in, rrbcdg.gov.in, ibps.in, upsc.gov.in, the state PSC/SSC site). NEVER a coaching/news/aggregator site (no testbook, adda247, careerpower, sarkariresult, etc.). If you cannot confidently find the official site, return null for both. Prefer the recruitment/notifications section root domain.`;

async function main() {
  const exams = await prisma.$queryRawUnsafe<
    { id: string; code: string; name: string; shortName: string; state: string | null }[]
  >(`
    SELECT e.id, e.code, e.name, e."shortName", e.state
    FROM "Exam" e JOIN "ExamEligibility" x ON x."examId" = e.id
    WHERE e.active = TRUE AND (x."officialUrl" IS NULL)
    ORDER BY e."candidatesPerYear" DESC NULLS LAST
  `);
  console.log(`Official-source backlog: ${exams.length} exams · budget $${BUDGET}`);

  const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }] as any[];
  let cursor = 0, stop = false;
  const worker = async () => {
    while (!stop) {
      if (spend() >= BUDGET) { stop = true; return; }
      const i = cursor++;
      if (i >= exams.length) return;
      const ex = exams[i];
      try {
        const res = await client.messages.create(
          {
            model: MODEL,
            max_tokens: 700,
            system: SYSTEM,
            tools,
            messages: [
              {
                role: "user",
                content: `Exam: ${ex.name} (${ex.shortName}).${ex.state ? ` State: ${ex.state}.` : ""} Find the official conducting body and its official website.`,
              },
            ],
          },
          { timeout: 120_000, maxRetries: 2 },
        );
        totals.in += res.usage.input_tokens;
        totals.out += res.usage.output_tokens;
        const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
        const j = firstJson(text);
        let url: string | null = j.officialUrl ?? null;
        // Guard: reject obvious non-official/aggregator domains.
        if (url && /(testbook|adda247|careerpower|sarkariresult|jagran|shiksha|collegedunia|byjus|unacademy|gradeup|oliveboard)/i.test(url)) url = null;
        if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
        if (!url) { totals.failed++; console.warn(`  ⚠ ${ex.code} no official url`); continue; }
        await prisma.$executeRawUnsafe(
          `UPDATE "ExamEligibility" SET "officialUrl" = $2, "officialName" = $3 WHERE "examId" = $1`,
          ex.id, url, j.officialName ?? null,
        );
        totals.done++;
        if (totals.done % 15 === 0) console.log(`  ✓ ${totals.done}/${exams.length}  ~$${spend().toFixed(2)}`);
      } catch (e: any) {
        totals.failed++;
        console.warn(`  ✗ ${ex.code}: ${String(e?.message ?? e).slice(0, 80)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\nDone. generated=${totals.done} failed=${totals.failed} est=$${spend().toFixed(2)}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
