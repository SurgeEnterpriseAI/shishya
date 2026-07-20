// scripts/generate-category-cutoffs.ts
//
// Gap-fill #4: category-wise expected cutoffs. Aspirants think in
// categories ("is 95 safe for OBC?") — our rank bands were category-blind.
// For each active exam, generates ONE markdown block: a General/EWS/OBC/
// SC/ST table of indicative cutoff ranges + 2-3 lines of guidance, grounded
// on the exam's existing rank bands as context. Sonnet, no web search,
// ~$0.02/exam → ~$4 for all 177. Stored in ExamCategoryCutoff via raw SQL
// (works even while another process holds the Prisma engine DLL).
//
// USAGE: npx tsx scripts/generate-category-cutoffs.ts [--budget 6]

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const MODEL = "claude-sonnet-4-5-20250929";
const CONCURRENCY = 5;
const IN_PER_M = 3, OUT_PER_M = 15;
const BUDGET = parseFloat(process.argv[process.argv.indexOf("--budget") + 1] || "6");

const totals = { in: 0, out: 0, done: 0, failed: 0 };
const spend = () => (totals.in * IN_PER_M + totals.out * OUT_PER_M) / 1_000_000;

async function main() {
  const exams = await prisma.$queryRawUnsafe<
    { id: string; code: string; name: string; shortName: string; totalMarks: number }[]
  >(`
    SELECT e.id, e.code, e.name, e."shortName", e."totalMarks"
    FROM "Exam" e
    WHERE e.active = TRUE
      AND NOT EXISTS (SELECT 1 FROM "ExamCategoryCutoff" c WHERE c."examId" = e.id)
    ORDER BY e."candidatesPerYear" DESC NULLS LAST
  `);
  console.log(`Category-cutoff backlog: ${exams.length} exams · budget $${BUDGET}`);

  let cursor = 0, stop = false;
  const worker = async () => {
    while (!stop) {
      if (spend() >= BUDGET) { stop = true; return; }
      const i = cursor++;
      if (i >= exams.length) return;
      const ex = exams[i];
      try {
        const bands = await prisma.$queryRawUnsafe<{ label: string; scorePctMin: number; scorePctMax: number }[]>(
          `SELECT label, "scorePctMin", "scorePctMax" FROM "ExamRankBand" WHERE "examId" = $1 AND "archivedAt" IS NULL ORDER BY "orderIdx" ASC LIMIT 8`,
          ex.id,
        );
        const res = await client.messages.create(
          {
            model: MODEL,
            max_tokens: 1200,
            system:
              "You produce category-wise expected cutoff guidance for Indian competitive exams. Output STRICT markdown only: first a table with columns | Category | Expected cutoff (indicative) | — rows General, EWS, OBC, SC, ST (and PwD if customary for this exam). Express cutoffs as a RANGE in the exam's own convention (marks out of total, or percentage). Then 2-3 short bullet lines of guidance (typical Gen-vs-OBC gap, what shifts cutoffs year to year). Never claim official figures; these are indicative patterns. No headings, no preamble.",
            messages: [
              {
                role: "user",
                content: `Exam: ${ex.name} (${ex.shortName}), total marks ${ex.totalMarks}.\nKnown score bands (percentage → outcome tier): ${bands
                  .map((b) => `${Math.round(b.scorePctMin)}-${Math.round(b.scorePctMax)}%: ${b.label}`)
                  .join("; ")}.\nProduce the category-wise indicative cutoff table + guidance.`,
              },
            ],
          },
          { timeout: 90_000, maxRetries: 3 },
        );
        totals.in += res.usage.input_tokens;
        totals.out += res.usage.output_tokens;
        const md = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
        if (md.length < 100 || !md.includes("|")) { totals.failed++; console.warn(`  ⚠ ${ex.code} malformed`); continue; }
        await prisma.$executeRawUnsafe(
          `INSERT INTO "ExamCategoryCutoff" (id, "examId", content, "generatedAt", "generatedBy")
           VALUES (gen_random_uuid()::text, $1, $2, NOW(), $3)
           ON CONFLICT ("examId") DO UPDATE SET content = $2, "generatedAt" = NOW(), "generatedBy" = $3`,
          ex.id, md, `claude:${MODEL}`,
        );
        totals.done++;
        if (totals.done % 15 === 0) console.log(`  ✓ ${totals.done}/${exams.length}  ~$${spend().toFixed(2)}`);
      } catch (e: any) {
        totals.failed++;
        console.warn(`  ✗ ${ex.code}: ${String(e?.message ?? e).slice(0, 90)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\nDone. generated=${totals.done} failed=${totals.failed} est=$${spend().toFixed(2)}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
