// scripts/generate-exam-guides.ts
//
// Reach: the "How to crack [exam]" guide — one authoritative page per
// exam that captures the biggest long-tail search intents in a single
// doc (modern SEO: one strong page > many thin ones):
//   • how to prepare, with or WITHOUT coaching (huge query — most
//     aspirants can't afford coaching and search exactly this)
//   • a realistic study plan
//   • honest difficulty for an average student
//   • salary / job profile / career growth
//   • an FAQ (also parsed out for FAQPage schema)
//
// Grounded on the exam's own stored facts + subjects. Sonnet, no web
// search. Honest, indicative framing on pay/cutoffs (no fabricated
// figures). Stored in ExamGuide via raw SQL. ~$0.05/exam → ~$9 for 177.
//
// USAGE: npx tsx scripts/generate-exam-guides.ts [--budget 10]

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const MODEL = "claude-sonnet-4-5-20250929";
const CONCURRENCY = 5;
const IN_PER_M = 3, OUT_PER_M = 15;
const BUDGET = parseFloat(process.argv[process.argv.indexOf("--budget") + 1] || "10");

const totals = { in: 0, out: 0, done: 0, failed: 0 };
const spend = () => (totals.in * IN_PER_M + totals.out * OUT_PER_M) / 1_000_000;

// Parse "**Q.** …\n**A.** …" pairs out of the FAQ section for FAQPage schema.
function parseFaq(md: string): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  const re = /\*\*Q[.:]\*\*\s*(.+?)\s*\n+\s*\*\*A[.:]\*\*\s*([\s\S]*?)(?=\n\s*\*\*Q[.:]\*\*|\n##\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const q = m[1].trim();
    const a = m[2].trim().replace(/\s+/g, " ");
    if (q && a && a.length < 600) out.push({ q, a });
  }
  return out;
}

async function main() {
  // Regenerate exams that have NO guide yet OR whose guide truncated
  // before the FAQ (the old 3000-token cap cut the salary section mid-
  // sentence). `faq` shorter than 3 items ⇒ the doc didn't complete.
  const exams = await prisma.$queryRawUnsafe<
    { id: string; code: string; name: string; shortName: string; totalMarks: number; durationMin: number; category: string }[]
  >(`
    SELECT e.id, e.code, e.name, e."shortName", e."totalMarks", e."durationMin", e.category::text
    FROM "Exam" e
    WHERE e.active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM "ExamGuide" g
        WHERE g."examId" = e.id AND jsonb_array_length(g.faq) >= 3
      )
    ORDER BY e."candidatesPerYear" DESC NULLS LAST
  `);
  console.log(`Guide backlog: ${exams.length} exams · budget $${BUDGET}`);

  let cursor = 0, stop = false;
  const worker = async () => {
    while (!stop) {
      if (spend() >= BUDGET) { stop = true; return; }
      const i = cursor++;
      if (i >= exams.length) return;
      const ex = exams[i];
      try {
        const subjects = await prisma.$queryRawUnsafe<{ name: string }[]>(
          `SELECT name FROM "Subject" WHERE "examId" = $1 ORDER BY id LIMIT 10`,
          ex.id,
        );
        const subjList = subjects.map((s) => s.name).join(", ") || "the standard syllabus";
        const res = await client.messages.create(
          {
            model: MODEL,
            max_tokens: 4500,
            system:
              "You write a comprehensive, honest 'how to crack this exam' guide for Indian competitive-exam aspirants — most of whom cannot afford coaching. Output STRICT markdown with EXACTLY these five sections in order, each a '## ' heading:\n" +
              "## How to prepare (with or without coaching)\n" +
              "## Study plan\n" +
              "## Is it tough? An honest take for an average student\n" +
              "## Salary, job profile & career growth\n" +
              "## Frequently asked questions\n" +
              "Rules: practical and specific, not generic pep talk. The prep section MUST give a genuine free/self-study path (Shishya's free mocks, PYQs, notes are the backbone). The study plan should be a realistic weekly structure. Be honest about difficulty — encouraging but not misleading. Keep the salary/career section to ~150 words: INDICATIVE pay bands and typical posts/cadres only; never state exact figures as official, say 'approximately' and 'varies by cadre/posting'. The FAQ section is MANDATORY and must be the last thing you write — do not let earlier sections crowd it out. It must contain exactly 5 items, EACH formatted exactly as '**Q.** question' on one line, a blank line, then '**A.** answer' (this exact format is parsed downstream; keep each answer under 60 words). No preamble, no # title, no closing pep line.",
            messages: [
              {
                role: "user",
                content: `Exam: ${ex.name} (${ex.shortName}), category ${ex.category}. Pattern: ${ex.totalMarks} marks in ${ex.durationMin} minutes. Subjects: ${subjList}.\nWrite the full guide.`,
              },
            ],
          },
          { timeout: 120_000, maxRetries: 3 },
        );
        totals.in += res.usage.input_tokens;
        totals.out += res.usage.output_tokens;
        const md = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
        if (md.length < 400 || (md.match(/^## /gm)?.length ?? 0) < 4) { totals.failed++; console.warn(`  ⚠ ${ex.code} malformed`); continue; }
        const faq = parseFaq(md);
        await prisma.$executeRawUnsafe(
          `INSERT INTO "ExamGuide" (id, "examId", content, faq, "generatedAt", "generatedBy")
           VALUES (gen_random_uuid()::text, $1, $2, $3::jsonb, NOW(), $4)
           ON CONFLICT ("examId") DO UPDATE SET content = $2, faq = $3::jsonb, "generatedAt" = NOW(), "generatedBy" = $4`,
          ex.id, md, JSON.stringify(faq), `claude:${MODEL}`,
        );
        totals.done++;
        if (totals.done % 15 === 0) console.log(`  ✓ ${totals.done}/${exams.length}  ~$${spend().toFixed(2)}  (faq:${faq.length})`);
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
