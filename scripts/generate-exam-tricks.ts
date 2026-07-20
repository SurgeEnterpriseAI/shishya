// scripts/generate-exam-tricks.ts
//
// Gap-fill #5: memory tricks & mnemonics per exam. This is the content
// aspirants screenshot and forward in Telegram/WhatsApp study groups —
// high share-velocity, high "[exam] tricks" search volume, and we had
// none of it. For each active exam, generates ONE markdown block:
// "## Subject" sections with bullet tricks (mnemonic name in bold +
// the trick itself), grounded on the exam's actual subjects/topics.
// Sonnet, no web search, ~$0.03/exam → ~$5 for all 177. Stored in
// ExamTricks via raw SQL (works while another process holds the
// Prisma engine DLL).
//
// USAGE: npx tsx scripts/generate-exam-tricks.ts [--budget 7]

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const MODEL = "claude-sonnet-4-5-20250929";
const CONCURRENCY = 5;
const IN_PER_M = 3, OUT_PER_M = 15;
const BUDGET = parseFloat(process.argv[process.argv.indexOf("--budget") + 1] || "7");

const totals = { in: 0, out: 0, done: 0, failed: 0 };
const spend = () => (totals.in * IN_PER_M + totals.out * OUT_PER_M) / 1_000_000;

async function main() {
  const exams = await prisma.$queryRawUnsafe<
    { id: string; code: string; name: string; shortName: string }[]
  >(`
    SELECT e.id, e.code, e.name, e."shortName"
    FROM "Exam" e
    WHERE e.active = TRUE
      AND NOT EXISTS (SELECT 1 FROM "ExamTricks" t WHERE t."examId" = e.id)
    ORDER BY e."candidatesPerYear" DESC NULLS LAST
  `);
  console.log(`Tricks backlog: ${exams.length} exams · budget $${BUDGET}`);

  let cursor = 0, stop = false;
  const worker = async () => {
    while (!stop) {
      if (spend() >= BUDGET) { stop = true; return; }
      const i = cursor++;
      if (i >= exams.length) return;
      const ex = exams[i];
      try {
        const subjects = await prisma.$queryRawUnsafe<{ subject: string; topics: string }[]>(
          `SELECT s.name AS subject, string_agg(t.name, ', ') AS topics
           FROM "Subject" s JOIN "Topic" t ON t."subjectId" = s.id
           WHERE s."examId" = $1 GROUP BY s.id, s.name ORDER BY s.id LIMIT 8`,
          ex.id,
        );
        const syllabus = subjects
          .map((s) => `${s.subject}: ${s.topics.slice(0, 300)}`)
          .join("\n");
        const res = await client.messages.create(
          {
            model: MODEL,
            max_tokens: 2000,
            system:
              "You write memory tricks and mnemonics for Indian competitive-exam aspirants. Output STRICT markdown only: '## <Subject>' headings matching the given subjects (only those where genuine tricks exist), each followed by 3-5 bullet lines. Each bullet: **Trick name** — the trick/mnemonic itself, concrete and immediately usable (e.g. digit-sum divisibility rules, BODMAS traps, VIBGYOR-style letter mnemonics, date anchors for history, direction-sense shortcuts). Prefer well-known, battle-tested tricks over invented ones; keep each bullet under 40 words. Total 12-18 bullets. No preamble, no closing line, no # title.",
            messages: [
              {
                role: "user",
                content: `Exam: ${ex.name} (${ex.shortName}).\nSubjects and topics:\n${syllabus}\n\nProduce the tricks & mnemonics block.`,
              },
            ],
          },
          { timeout: 120_000, maxRetries: 3 },
        );
        totals.in += res.usage.input_tokens;
        totals.out += res.usage.output_tokens;
        const md = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
        if (md.length < 200 || !md.includes("## ")) { totals.failed++; console.warn(`  ⚠ ${ex.code} malformed`); continue; }
        await prisma.$executeRawUnsafe(
          `INSERT INTO "ExamTricks" (id, "examId", content, "generatedAt", "generatedBy")
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
