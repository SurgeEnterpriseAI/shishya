// scripts/generate-topic-notes.ts
//
// Generates structured student-facing study notes for every topic in the
// syllabus, ordered by exam popularity (candidatesPerYear DESC) so the
// most-attempted exams light up first.
//
// Output is a single Markdown blob per Topic.notes, structured as:
//   ## Overview                     (2–3 paragraphs, why this matters)
//   ## Key Concepts                 (bulleted, 4–8 items)
//   ## Formulas / Key Facts         (when applicable)
//   ## Worked Examples              (1–3 short examples with steps)
//   ## Common Mistakes              (3–5 student traps)
//   ## Quick Reference              (one-line takeaways)
//
// Idempotent + resumable: skips topics where notes already exist (unless
// --force). Hard $ budget cap; --top N caps to N most-popular exams.
//
// USAGE
//   tsx scripts/generate-topic-notes.ts --budget 100
//   tsx scripts/generate-topic-notes.ts --top 5 --budget 30
//   tsx scripts/generate-topic-notes.ts --exams SSC_CGL,NEET_UG --budget 20
//   tsx scripts/generate-topic-notes.ts --top 1 --dry-run

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const PRICE_INPUT_PER_M = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
// Notes are independent per topic, so we generate several concurrently.
// Sonnet on a paid tier comfortably handles this; the per-request timeout
// keeps any one hung call from blocking its worker. Override via env.
const CONCURRENCY = Math.max(1, Number(process.env.NOTES_CONCURRENCY ?? 6));

interface CliArgs {
  top: number;
  exams: string[] | null;
  budgetUsd: number;
  force: boolean;
  dryRun: boolean;
  maxTopics: number;
}

function parseArgs(argv: string[]): CliArgs {
  const a: any = { top: Infinity, exams: null, budgetUsd: 100, force: false, dryRun: false, maxTopics: Infinity };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--top":         a.top = parseInt(next(), 10); break;
      case "--exams":       a.exams = next().split(",").map((s: string) => s.trim()); break;
      case "--budget":      a.budgetUsd = parseFloat(next()); break;
      case "--max-topics":  a.maxTopics = parseInt(next(), 10); break;
      case "--force":       a.force = true; break;
      case "--dry-run":     a.dryRun = true; break;
      case "--help": case "-h":
        console.log(`Usage: tsx scripts/generate-topic-notes.ts [--top N | --exams CSV] [--budget USD] [--force] [--dry-run]`);
        process.exit(0);
    }
  }
  return a as CliArgs;
}

const SYSTEM_PERSONA = `You write concise, exam-focused study notes for Indian competitive exam preparation. Target audience: a student who has the textbook nearby but wants a clear, distilled study companion.

Style requirements:
- Use clear, plain English. Hindi/Tamil/etc. terms only when they're the canonical name (e.g. "Vedic period", "Sangam literature").
- Plain text math — no LaTeX. Write x² not x^2 or $x^2$.
- 600–1200 words total. Quality over quantity.
- Always-correct factual content. If you are unsure, omit rather than guess.
- Don't claim specific exam-year question patterns ("appeared in 2019 paper") unless verifiable.

Output strict markdown sections in this exact order. Skip a section only if not applicable to the topic:

## Overview
2–3 short paragraphs: why this topic matters, where it fits in the exam, what students must master.

## Key Concepts
4–8 bulleted ideas, each 1–2 sentences. The mental model a student must hold.

## Formulas / Key Facts
For math/science/quant topics: list the formulas with one-line context for each. For non-quant topics, list 5–8 must-remember facts/dates/definitions.

## Worked Examples
1–3 short examples with step-by-step solutions. Pick canonical exam-style problems.

## Common Mistakes
3–5 specific traps students fall into on this topic. Phrase each as the wrong thinking → the correct fix.

## Quick Reference
3–6 single-line takeaways a student would jot on a flashcard.`;

interface Counts {
  in: number; out: number; cacheW: number; cacheR: number; calls: number;
  topicsDone: number; topicsSkipped: number; topicsFailed: number;
}
const totals: Counts = { in: 0, out: 0, cacheW: 0, cacheR: 0, calls: 0, topicsDone: 0, topicsSkipped: 0, topicsFailed: 0 };
function spendUsd(): number {
  return (
    (totals.in * PRICE_INPUT_PER_M) / 1_000_000 +
    (totals.out * PRICE_OUTPUT_PER_M) / 1_000_000 +
    (totals.cacheW * PRICE_CACHE_WRITE_PER_M) / 1_000_000 +
    (totals.cacheR * PRICE_CACHE_READ_PER_M) / 1_000_000
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const prisma = new PrismaClient();
  const client = args.dryRun ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  if (!args.dryRun && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set. Use --dry-run to plan without spending.");
  }

  const examWhere: any = { active: true };
  if (args.exams) examWhere.code = { in: args.exams };

  const allExams = await prisma.exam.findMany({
    where: examWhere,
    orderBy: [
      { candidatesPerYear: { sort: "desc", nulls: "last" } },
      { code: "asc" },
    ],
    include: {
      subjects: {
        include: {
          topics: {
            include: { children: { include: { teachingNote: true } }, teachingNote: true },
          },
        },
      },
    },
  });
  const examsInScope = Number.isFinite(args.top) ? allExams.slice(0, args.top) : allExams;

  console.log(`\n=== generate-topic-notes ===`);
  console.log(`Exams in scope:  ${examsInScope.length} (of ${allExams.length} matching)`);
  console.log(`Budget cap:      $${args.budgetUsd.toFixed(2)}`);
  console.log(`Force re-gen:    ${args.force ? "yes" : "no"}`);
  console.log(`Mode:            ${args.dryRun ? "DRY RUN" : "LIVE"}\n`);

  let stopAll = false;
  for (const exam of examsInScope) {
    if (stopAll) break;
    // NOTE: children come back BOTH as their own top-level `s.topics` rows
    // AND via each parent's `.children` spread, so the naive flatMap yields
    // every child twice. Dedupe by id — without this we generate (and pay
    // for) each sub-topic's notes twice.
    const seenTopicIds = new Set<string>();
    const allTopics = exam.subjects
      .flatMap((s) => s.topics)
      .flatMap((t) => [t, ...t.children])
      .filter((t: any) => {
        if (seenTopicIds.has(t.id)) return false;
        seenTopicIds.add(t.id);
        return true;
      });
    if (allTopics.length === 0) continue;

    const cps = exam.candidatesPerYear ? `${(exam.candidatesPerYear / 1_000_000).toFixed(1)}M` : "—";
    const haveCount = allTopics.filter((t: any) => !!t.teachingNote).length;
    console.log(`\n→ ${exam.code.padEnd(22)} ${exam.shortName.padEnd(30)} cps=${cps.padStart(6)}  notes=${haveCount}/${allTopics.length}`);

    // Cached system block per-exam: persona + syllabus context
    const syllabusBlock = renderSyllabusBlock(exam);

    // Topics that still need notes (idempotent skip up-front).
    const todo = allTopics.filter((t: any) => args.force || !(t as any).teachingNote);
    totals.topicsSkipped += allTopics.length - todo.length;

    // Generate one topic's notes. Self-contained — updates shared totals
    // and persists immediately, so a crash mid-run loses nothing.
    const genTopic = async (topic: any): Promise<void> => {

      const userPrompt = `Generate study notes for this topic.

# Topic
- Exam: ${exam.name} (${exam.code})
- Subject: ${exam.subjects.find((s) => s.topics.some((t) => t.id === topic.id || t.children?.some((c) => c.id === topic.id)))?.name ?? ""}
- Topic name: **${topic.name}**
- Topic code: \`${topic.code}\`
${topic.description ? `- Scope: ${topic.description}` : ""}

Produce the notes per the section structure in the system prompt. Aim for 600–1200 words total. Keep it tight and exam-focused.`;

      try {
        // Per-request timeout + extra retries: without a timeout a single
        // hung request blocks the whole sequential run indefinitely (we hit
        // exactly this — 15 notes then a silent stall). 90s is generous for
        // a ~1k-word note; the SDK auto-retries transient failures.
        const response = await client!.messages.create(
          {
            model: MODEL,
            max_tokens: 4000,
            system: [
              { type: "text", text: SYSTEM_PERSONA, cache_control: { type: "ephemeral" } },
              { type: "text", text: syllabusBlock, cache_control: { type: "ephemeral" } },
            ],
            messages: [{ role: "user", content: userPrompt }],
          },
          { timeout: 90_000, maxRetries: 5 },
        );
        totals.calls += 1;
        totals.in += response.usage.input_tokens;
        totals.out += response.usage.output_tokens;
        totals.cacheW += response.usage.cache_creation_input_tokens ?? 0;
        totals.cacheR += response.usage.cache_read_input_tokens ?? 0;

        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text).join("\n").trim();

        if (text.length < 200) {
          console.warn(`  ⚠ ${topic.code} too short (${text.length} chars), skipping`);
          totals.topicsFailed += 1;
          return;
        }

        // Persist into the dedicated TopicTeachingNote model (1:1 by topicId).
        // On re-generation (--force) the content changed, so reset the human
        // validation state back to needs-review.
        await prisma.topicTeachingNote.upsert({
          where: { topicId: topic.id },
          create: {
            topicId: topic.id,
            content: text,
            generatedAt: new Date(),
            generatedBy: `claude:${MODEL}`,
          },
          update: {
            content: text,
            generatedAt: new Date(),
            generatedBy: `claude:${MODEL}`,
            validatedAt: null,
            validatorId: null,
          },
        });
        totals.topicsDone += 1;
        // Per-topic progress so a long background run is observable
        // (previously only failures logged, so a stall looked identical
        // to silent success).
        console.log(`  ✓ ${topic.code.padEnd(34)} ${text.length} chars  $${spendUsd().toFixed(2)}`);
      } catch (err: any) {
        console.warn(`  ✗ ${topic.code}: ${err.message?.slice(0, 120)}`);
        totals.topicsFailed += 1;
      }
    };

    // Concurrency pool over todo[]. Budget / max-topics are checked before
    // each dispatch; up to CONCURRENCY requests may be in flight when the
    // cap trips, so spend can overshoot by at most CONCURRENCY notes.
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (true) {
        if (stopAll) return;
        if (totals.topicsDone + totals.topicsSkipped + totals.topicsFailed >= args.maxTopics) {
          stopAll = true;
          console.log(`(stop) max-topics reached`);
          return;
        }
        if (spendUsd() >= args.budgetUsd) {
          stopAll = true;
          console.log(`(stop) budget reached: $${spendUsd().toFixed(2)} ≥ $${args.budgetUsd}`);
          return;
        }
        const i = cursor++;
        if (i >= todo.length) return;
        const topic = todo[i];
        if (args.dryRun) {
          console.log(`  [dry] ${topic.code}`);
          totals.topicsDone += 1;
          continue;
        }
        await genTopic(topic);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    const after = await prisma.topic.count({
      where: { subject: { examId: exam.id }, teachingNote: { isNot: null } } as any,
    });
    console.log(`  ${exam.code} done. notes=${after}/${allTopics.length}  spent=$${spendUsd().toFixed(2)}`);
  }

  await prisma.$disconnect();

  console.log(`\n=== generate-topic-notes summary ===`);
  console.log(`Topics generated: ${totals.topicsDone}`);
  console.log(`Topics skipped (already had notes): ${totals.topicsSkipped}`);
  console.log(`Topics failed: ${totals.topicsFailed}`);
  console.log(`Claude calls: ${totals.calls}`);
  console.log(`Tokens — in:${totals.in} out:${totals.out} cacheW:${totals.cacheW} cacheR:${totals.cacheR}`);
  console.log(`Estimated spend: $${spendUsd().toFixed(2)}`);
}

function renderSyllabusBlock(exam: any): string {
  const lines: string[] = [`# Syllabus context — ${exam.name} (${exam.code})`];
  for (const subject of exam.subjects) {
    lines.push(`\n## ${subject.name}`);
    for (const t of subject.topics) {
      lines.push(`- ${t.name}${t.description ? ` — ${t.description}` : ""}`);
      for (const c of t.children ?? []) {
        lines.push(`  - ${c.name}${c.description ? ` — ${c.description}` : ""}`);
      }
    }
  }
  return lines.join("\n");
}

main().catch((err) => { console.error(err); process.exit(1); });
