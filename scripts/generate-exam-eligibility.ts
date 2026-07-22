// scripts/generate-exam-eligibility.ts
//
// Populates ExamEligibility for the "which government exam suits ME?"
// matcher (/find-your-exam). For each exam, Claude + web_search fetch
// the factual eligibility — age band, education requirement, whether a
// state domicile is needed, typical annual vacancies — plus a skill
// profile (quant/reasoning/gk/english/technical weighting) used to rank
// fit against a user's self-rated strengths.
//
// Facts are indicative and always defer to the official notification.
// Stored via raw SQL (works without a Prisma client regen).
//
// USAGE: npx tsx scripts/generate-exam-eligibility.ts [--budget 12]

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const MODEL = "claude-sonnet-4-5-20250929";
const CONCURRENCY = 4;
const IN_PER_M = 3, OUT_PER_M = 15;
const BUDGET = parseFloat(process.argv[process.argv.indexOf("--budget") + 1] || "12");

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

const SYSTEM = `You are an eligibility-data researcher for Shishya, a free Indian government-exam platform. For ONE exam, return STRICT JSON (no fences, no prose) with its eligibility facts. Use web_search to verify age limits, education requirements and typical vacancies from the official conducting body / recent notifications.

Shape:
{
  "minAge": int|null,           // general-category minimum age (years)
  "maxAge": int|null,           // general-category maximum age before relaxation
  "ageRelaxation": "OBC +3, SC/ST +5, PwD +10" | null,
  "educationTags": ["GRADUATE","ANY_STREAM", ...],  // from: 10TH,12TH,ITI,DIPLOMA,GRADUATE,POSTGRADUATE,ANY_STREAM,ENGINEERING,MEDICAL,COMMERCE,SCIENCE,ARTS,LAW,SPECIFIC_DEGREE
  "educationNote": "Bachelor's degree in any discipline",   // one human sentence
  "domicileState": "AP" | null,  // ISO state code IF a state domicile is required, else null
  "vacanciesApprox": int|null,   // typical annual vacancies/posts (indicative)
  "vacanciesNote": "~short context" | null,
  "skillProfile": { "quant": 0-5, "reasoning": 0-5, "gk": 0-5, "english": 0-5, "technical": 0-5 },
  "eligibilityNote": "any other key eligibility detail" | null
}

RULES: Be factual; prefer official sources. If genuinely unsure of a number, use null rather than inventing. educationTags MUST include the minimum qualification tag plus a stream tag (ANY_STREAM unless a specific stream is mandatory). skillProfile reflects what the exam actually tests (e.g. SSC CGL: quant 5, reasoning 5, gk 4, english 4, technical 0; a technical/engineering-services exam: technical 5).`;

async function main() {
  const exams = await prisma.$queryRawUnsafe<
    { id: string; code: string; name: string; shortName: string; category: string; state: string | null }[]
  >(`
    SELECT e.id, e.code, e.name, e."shortName", e.category::text, e.state
    FROM "Exam" e
    WHERE e.active = TRUE
      AND NOT EXISTS (SELECT 1 FROM "ExamEligibility" x WHERE x."examId" = e.id)
    ORDER BY e."candidatesPerYear" DESC NULLS LAST
  `);
  console.log(`Eligibility backlog: ${exams.length} exams · budget $${BUDGET}`);

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
            max_tokens: 1500,
            system: SYSTEM,
            tools,
            messages: [
              {
                role: "user",
                content: `Exam: ${ex.name} (${ex.shortName}). Category: ${ex.category}. ${ex.state ? `State-level exam, state code ${ex.state}.` : "National-level exam."}\nResearch and return the eligibility JSON.`,
              },
            ],
          },
          { timeout: 150_000, maxRetries: 2 },
        );
        totals.in += res.usage.input_tokens;
        totals.out += res.usage.output_tokens;
        const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
        const j = firstJson(text);
        const sp = j.skillProfile || {};
        await prisma.$executeRawUnsafe(
          `INSERT INTO "ExamEligibility"
             (id, "examId", "minAge", "maxAge", "ageRelaxation", "educationTags", "educationNote",
              "domicileState", "vacanciesApprox", "vacanciesNote", "skillProfile", "eligibilityNote",
              "generatedAt", "generatedBy")
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::text[], $6, $7, $8, $9, $10::jsonb, $11, NOW(), $12)
           ON CONFLICT ("examId") DO UPDATE SET
             "minAge"=$2, "maxAge"=$3, "ageRelaxation"=$4, "educationTags"=$5::text[], "educationNote"=$6,
             "domicileState"=$7, "vacanciesApprox"=$8, "vacanciesNote"=$9, "skillProfile"=$10::jsonb,
             "eligibilityNote"=$11, "generatedAt"=NOW(), "generatedBy"=$12`,
          ex.id,
          Number.isInteger(j.minAge) ? j.minAge : null,
          Number.isInteger(j.maxAge) ? j.maxAge : null,
          j.ageRelaxation ?? null,
          Array.isArray(j.educationTags) ? j.educationTags.slice(0, 8) : [],
          j.educationNote ?? null,
          j.domicileState ?? (ex.state ?? null),
          Number.isInteger(j.vacanciesApprox) ? j.vacanciesApprox : null,
          j.vacanciesNote ?? null,
          JSON.stringify({
            quant: +sp.quant || 0, reasoning: +sp.reasoning || 0, gk: +sp.gk || 0,
            english: +sp.english || 0, technical: +sp.technical || 0,
          }),
          j.eligibilityNote ?? null,
          `claude:${MODEL}`,
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
