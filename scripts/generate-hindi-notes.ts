// scripts/generate-hindi-notes.ts
//
// Gap-fill #3: Hindi study notes. "In hindi" is a literal tutor ask and the
// Hindi-belt (UP/MP/BR/HR) is the biggest cohort — but every SEO page was
// English-only, so Hindi searches ("एसएससी जीडी गणित नोट्स") never found us.
// Translates existing English TopicTeachingNotes to Hindi with Haiku
// (translation is a strength of the small model; ~$0.004/note) into
// TopicNoteTranslation rows, served at /topics/[code]/hi with hreflang.
//
// USAGE:
//   npx tsx scripts/generate-hindi-notes.ts --exams SSC_GD,RRB_NTPC --budget 10
//   npx tsx scripts/generate-hindi-notes.ts --top-traffic 12 --budget 10
//
// Idempotent: skips topics that already have a "hi" translation.

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const MODEL = "claude-haiku-4-5-20251001";
const CONCURRENCY = Math.max(1, Number(process.env.NOTES_CONCURRENCY ?? 6));
// Haiku pricing ($1/M in, $5/M out) — a 1,100-word note ≈ $0.004.
const IN_PER_M = 1.0, OUT_PER_M = 5.0;

function arg(name: string, dflt: string | null): string | null {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : dflt;
}
const EXAMS = arg("--exams", null)?.split(",").map((s) => s.trim()) ?? null;
const TOP_TRAFFIC = parseInt(arg("--top-traffic", "0") ?? "0", 10);
const BUDGET = parseFloat(arg("--budget", "10") ?? "10");

const totals = { in: 0, out: 0, done: 0, skipped: 0, failed: 0 };
const spend = () => (totals.in * IN_PER_M + totals.out * OUT_PER_M) / 1_000_000;

async function translate(name: string, content: string): Promise<string> {
  const res = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 4000,
      system:
        "You translate Indian competitive-exam study notes from English to natural, fluent Hindi (Devanagari). Rules: keep ALL markdown structure (headings, bullets) exactly; keep formulas, numbers, equations and English technical terms that Indian students use as-is (e.g. 'Percentage', 'LCM', option letters); translate explanatory prose fully into Hindi; do not add or remove content; output ONLY the translated markdown.",
      messages: [{ role: "user", content: `Topic: ${name}\n\n${content}` }],
    },
    { timeout: 90_000, maxRetries: 4 },
  );
  totals.in += res.usage.input_tokens;
  totals.out += res.usage.output_tokens;
  return res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
}

async function main() {
  let examIds: string[];
  if (EXAMS) {
    const rows = await prisma.exam.findMany({ where: { code: { in: EXAMS } }, select: { id: true } });
    examIds = rows.map((r) => r.id);
  } else {
    // Top exams by mock activity (proxy for real traffic/priority).
    const top = await prisma.mock.groupBy({
      by: ["examId"], _count: true, orderBy: { _count: { examId: "desc" } }, take: TOP_TRAFFIC || 12,
    });
    examIds = top.map((t) => t.examId);
  }

  const topics = await prisma.topic.findMany({
    where: {
      subject: { examId: { in: examIds } },
      teachingNote: { isNot: null },
      noteTranslations: { none: { locale: "hi" } },
    },
    select: { id: true, name: true, code: true, teachingNote: { select: { content: true } } },
  });
  console.log(`Hindi backlog: ${topics.length} topics across ${examIds.length} exams · budget $${BUDGET} · conc ${CONCURRENCY}`);

  let cursor = 0, stop = false;
  const worker = async () => {
    while (!stop) {
      if (spend() >= BUDGET) { stop = true; return; }
      const i = cursor++;
      if (i >= topics.length) return;
      const t = topics[i];
      try {
        const hi = await translate(t.name, t.teachingNote!.content);
        if (hi.length < 200) { totals.failed++; console.warn(`  ⚠ ${t.code} too short`); continue; }
        await prisma.topicNoteTranslation.upsert({
          where: { topicId_locale: { topicId: t.id, locale: "hi" } },
          create: { topicId: t.id, locale: "hi", content: hi, generatedBy: `haiku:${MODEL}` },
          update: { content: hi, generatedAt: new Date(), generatedBy: `haiku:${MODEL}` },
        });
        totals.done++;
        if (totals.done % 20 === 0) console.log(`  ✓ ${totals.done}/${topics.length}  ~$${spend().toFixed(2)}`);
      } catch (e: any) {
        totals.failed++;
        console.warn(`  ✗ ${t.code}: ${String(e?.message ?? e).slice(0, 90)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\nDone. translated=${totals.done} failed=${totals.failed} est=$${spend().toFixed(2)}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
