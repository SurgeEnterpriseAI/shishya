// scripts/fix-reported-questions.ts
//
// Answer-key trust sweep. Students flagged questions with wrong keys via
// QuestionReport (7 open as of 2026-07-11) — the most trust-damaging bug an
// exam platform can have. For each UNRESOLVED report:
//   1. Re-solve the question independently with Claude (no sight of the
//      current key), get {correctKey, confidence, reasoning}.
//   2. Adjudicate:
//      - Claude agrees with CURRENT key (high conf)  → report rejected, key kept.
//      - Claude picks a DIFFERENT existing option (high conf) → fix the key,
//        append a correction note to the solution.
//      - Claude says no option is correct, or low confidence → invalidate the
//        question (validated=false pulls it from all live pools) — safe default.
//   3. Mark the report resolved (resolvedBy "claude:key-sweep").
//
// USAGE: npx tsx scripts/fix-reported-questions.ts [--dry-run]

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const MODEL = "claude-sonnet-4-5-20250929";
const DRY = process.argv.includes("--dry-run");

interface Verdict {
  correctKey: string | null; // option key, or null if none of the options is correct
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
}

async function solve(q: { body: string; options: { key: string; text: string }[] }): Promise<Verdict> {
  const prompt = `Solve this exam question INDEPENDENTLY and carefully. Show your working, then decide which option is correct.

QUESTION:
${q.body}

OPTIONS:
${q.options.map((o) => `${o.key}. ${o.text}`).join("\n")}

Reply with ONLY a JSON object, no other text:
{"correctKey": "<option key, or null if NO option matches your computed answer>", "confidence": "HIGH|MEDIUM|LOW", "reasoning": "<2-3 sentences: your computed answer and why>"}

Rules: work the problem fully before choosing. If your computed answer is not among the options, set correctKey to null. Only use HIGH confidence when the working is unambiguous.`;
  const res = await client.messages.create(
    { model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: prompt }] },
    { timeout: 90_000, maxRetries: 3 },
  );
  const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
  // Strip code fences and grab the LAST {...} block (models sometimes show
  // working with braces before the final JSON).
  const clean = text.replace(/```(json)?/g, "");
  const matches = clean.match(/\{[^{}]*\}/g);
  if (!matches?.length) throw new Error("no JSON in verdict");
  return JSON.parse(matches[matches.length - 1]) as Verdict;
}

async function main() {
  const reports = await prisma.questionReport.findMany({
    where: { resolved: false },
    include: { question: { select: { id: true, body: true, options: true, answerKey: true, solution: true, validated: true } } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Open reports: ${reports.length}${DRY ? " (DRY RUN)" : ""}\n`);

  // Multiple reports can point at one question — adjudicate each question once.
  const byQ = new Map<string, typeof reports>();
  for (const r of reports) {
    if (!byQ.has(r.questionId)) byQ.set(r.questionId, [] as any);
    (byQ.get(r.questionId) as any).push(r);
  }

  for (const [qid, rs] of byQ) {
    const q = rs[0].question;
    const opts = (q.options as { key: string; text: string }[]) ?? [];
    console.log(`─── Q ${qid.slice(-6)} (current key: ${q.answerKey}) — ${rs.length} report(s)`);
    console.log(`    "${q.body.slice(0, 100).replace(/\n/g, " ")}…"`);
    console.log(`    student says: ${rs.map((r) => `"${r.reason.slice(0, 60)}"`).join(" | ")}`);
    let v: Verdict;
    try {
      v = await solve({ body: q.body, options: opts });
    } catch (e: any) {
      console.log(`    ✗ solver failed: ${e.message} — skipping`);
      continue;
    }
    console.log(`    Claude: key=${v.correctKey} conf=${v.confidence} — ${v.reasoning.slice(0, 140)}`);

    let action: string;
    if (v.confidence === "HIGH" && v.correctKey && v.correctKey === q.answerKey) {
      action = "KEY CONFIRMED — reports rejected, question kept";
    } else if (v.confidence === "HIGH" && v.correctKey && opts.some((o) => o.key === v.correctKey)) {
      action = `KEY FIXED ${q.answerKey} → ${v.correctKey}`;
      if (!DRY) {
        await prisma.question.update({
          where: { id: qid },
          data: {
            answerKey: v.correctKey,
            solution: q.solution + `\n\n[Correction ${new Date().toISOString().slice(0, 10)}: answer key corrected to ${v.correctKey} after student report + independent re-verification. ${v.reasoning}]`,
          },
        });
      }
    } else {
      action = "INVALIDATED (no clear correct option / low confidence) — pulled from live pools";
      if (!DRY) {
        await prisma.question.update({ where: { id: qid }, data: { validated: false } });
      }
    }
    console.log(`    → ${action}`);
    if (!DRY) {
      await prisma.questionReport.updateMany({
        where: { questionId: qid, resolved: false },
        data: { resolved: true, resolvedBy: "claude:key-sweep", resolvedAt: new Date() },
      });
    }
    console.log("");
  }
  await prisma.$disconnect();
  console.log("Sweep complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });
