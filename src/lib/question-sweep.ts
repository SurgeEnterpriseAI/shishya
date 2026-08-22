// Answer-key sweep — adjudicate student-reported questions with Claude.
// SERVER-ONLY. Used by /api/cron/sweep-question-reports (weekly) and
// available for manual runs (scripts/fix-reported-questions.ts is the
// standalone CLI twin). For each UNRESOLVED QuestionReport:
//   - Re-solve the question independently (Claude never sees the current key).
//   - HIGH confidence + agrees with current key      → reports rejected, kept.
//   - HIGH confidence + different EXISTING option    → key corrected + note.
//   - No correct option / MEDIUM/LOW confidence      → question invalidated
//     (validated=false pulls it from every live pool) — the safe default.
//   - Reports marked resolved (resolvedBy tag provided by the caller).

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { anthropic, MODEL } from "@/lib/ai/client";
import { createNotification } from "@/lib/db/notifications";

// Close the loop back to the students who flagged a question: when a
// report leads to a key fix or an invalidation, the reporter was RIGHT
// and deserves to hear it (audit 18 Aug 2026 — this was a permanent
// one-way street before). Best-effort; dedup on the report event.
async function notifyReporters(questionId: string, action: "key-fixed" | "invalidated"): Promise<void> {
  try {
    // Question has examId (FK), not examCode — join Exam for the code.
    // (Review 22 Aug 2026: the original q."examCode" select threw 42703
    // and was swallowed, so no reporter was ever notified.)
    const reporters = await prisma.$queryRaw<Array<{ userId: string; examCode: string | null }>>`
      SELECT DISTINCT qr."userId", e.code AS "examCode"
      FROM "QuestionReport" qr
      JOIN "Question" q ON q.id = qr."questionId"
      LEFT JOIN "Exam" e ON e.id = q."examId"
      WHERE qr."questionId" = ${questionId} AND qr."userId" IS NOT NULL`;
    for (const r of reporters) {
      await createNotification({
        userId: r.userId,
        type: "FLAG_VALIDATED",
        title: action === "key-fixed" ? "You were right — we fixed an answer key" : "You were right — we pulled a flawed question",
        body:
          action === "key-fixed"
            ? "A question you reported had a wrong answer key. We re-verified it and corrected it. Thank you — you made Shishya more accurate for everyone."
            : "A question you reported didn't have a clean correct answer, so we've removed it from the practice pool. Thank you for the sharp eye.",
        link: r.examCode ? `/exams/${r.examCode}` : "/dashboard",
        dedupKey: `qreport:${questionId}:${action}`,
      });
    }
  } catch (err) {
    console.error("[question-sweep] reporter notify failed (non-fatal):", err);
  }
}

interface Verdict {
  correctKey: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
}

async function solve(q: { body: string; options: { key: string; text: string }[] }): Promise<Verdict> {
  const prompt = `Solve this exam question INDEPENDENTLY and carefully. Show your working, then decide which option is correct.

QUESTION:
${q.body}

OPTIONS:
${q.options.map((o) => `${o.key}. ${o.text}`).join("\n")}

Reply with ONLY a JSON object on a single line, no code fences, no other text, and do NOT use curly braces inside the reasoning string:
{"correctKey": "<option key, or null if NO option matches your computed answer>", "confidence": "HIGH|MEDIUM|LOW", "reasoning": "<2-3 sentences: your computed answer and why>"}

Rules: work the problem fully before choosing. If your computed answer is not among the options, set correctKey to null. Only use HIGH confidence when the working is unambiguous.`;
  const res = await anthropic.messages.create(
    { model: MODEL, max_tokens: 1500, messages: [{ role: "user", content: prompt }] },
    { timeout: 90_000, maxRetries: 3 },
  );
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  // Fence-strip, then take the LAST balanced {...} (reasoning may quote
  // braces from the question despite the instruction — scan balanced).
  const clean = text.replace(/```(json)?/g, "");
  let best: string | null = null;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] !== "{") continue;
    let depth = 0;
    for (let j = i; j < clean.length; j++) {
      if (clean[j] === "{") depth++;
      else if (clean[j] === "}") {
        depth--;
        if (depth === 0) {
          const cand = clean.slice(i, j + 1);
          if (/"correctKey"/.test(cand)) best = cand;
          i = j;
          break;
        }
      }
    }
  }
  if (!best) throw new Error("no verdict JSON in response");
  return JSON.parse(best) as Verdict;
}

export interface SweepResult {
  questionId: string;
  action: "confirmed" | "key-fixed" | "invalidated" | "error";
  detail: string;
}

/**
 * Adjudicate ONE reported question immediately: re-solve it independently,
 * fix the key if a different option is clearly right, invalidate if
 * unsalvageable, then mark all its open reports resolved. Called
 * fire-and-forget the moment a student flags a question — so a wrong key
 * is corrected within seconds, not at the next weekly sweep. Best-effort:
 * any error leaves the report open for the weekly sweep to retry.
 */
export async function adjudicateQuestion(
  questionId: string,
  resolvedBy: string,
): Promise<SweepResult> {
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, body: true, options: true, answerKey: true, solution: true },
  });
  if (!q) return { questionId, action: "error", detail: "question not found" };
  const options = (q.options as { key: string; text: string }[]) ?? [];

  let verdict: Verdict;
  try {
    verdict = await solve({ body: q.body, options });
  } catch (e: any) {
    return { questionId, action: "error", detail: String(e?.message ?? e).slice(0, 120) };
  }

  let result: SweepResult;
  if (verdict.confidence === "HIGH" && verdict.correctKey === q.answerKey) {
    result = { questionId, action: "confirmed", detail: `key ${q.answerKey} verified` };
  } else if (
    verdict.confidence === "HIGH" &&
    verdict.correctKey &&
    options.some((o) => o.key === verdict.correctKey)
  ) {
    await prisma.question.update({
      where: { id: questionId },
      data: {
        answerKey: verdict.correctKey,
        solution:
          (q.solution ?? "") +
          `\n\n[Correction ${new Date().toISOString().slice(0, 10)}: answer key corrected to ${verdict.correctKey} after student report + independent re-verification. ${verdict.reasoning}]`,
      },
    });
    result = { questionId, action: "key-fixed", detail: `${q.answerKey} → ${verdict.correctKey}` };
  } else {
    await prisma.question.update({ where: { id: questionId }, data: { validated: false } });
    result = {
      questionId,
      action: "invalidated",
      detail: `no clear correct option (verdict: ${verdict.correctKey ?? "none"}, ${verdict.confidence})`,
    };
  }
  await prisma.questionReport.updateMany({
    where: { questionId, resolved: false },
    data: { resolved: true, resolvedBy, resolvedAt: new Date() },
  });
  if (result.action === "key-fixed" || result.action === "invalidated") {
    await notifyReporters(questionId, result.action);
  }
  return result;
}

export async function sweepReportedQuestions(opts: {
  resolvedBy: string;
  maxQuestions?: number;
}): Promise<SweepResult[]> {
  const reports = await prisma.questionReport.findMany({
    where: { resolved: false },
    include: {
      question: {
        select: { id: true, body: true, options: true, answerKey: true, solution: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const byQ = new Map<string, typeof reports>();
  for (const r of reports) {
    if (!byQ.has(r.questionId)) byQ.set(r.questionId, [] as typeof reports);
    byQ.get(r.questionId)!.push(r);
  }

  const results: SweepResult[] = [];
  let n = 0;
  for (const [qid, rs] of byQ) {
    if (opts.maxQuestions && n++ >= opts.maxQuestions) break;
    const q = rs[0].question;
    const options = (q.options as { key: string; text: string }[]) ?? [];
    let verdict: Verdict;
    try {
      verdict = await solve({ body: q.body, options });
    } catch (e: any) {
      results.push({ questionId: qid, action: "error", detail: String(e?.message ?? e).slice(0, 120) });
      continue; // leave reports open for the next run
    }

    if (verdict.confidence === "HIGH" && verdict.correctKey === q.answerKey) {
      results.push({ questionId: qid, action: "confirmed", detail: `key ${q.answerKey} verified` });
    } else if (
      verdict.confidence === "HIGH" &&
      verdict.correctKey &&
      options.some((o) => o.key === verdict.correctKey)
    ) {
      await prisma.question.update({
        where: { id: qid },
        data: {
          answerKey: verdict.correctKey,
          solution:
            q.solution +
            `\n\n[Correction ${new Date().toISOString().slice(0, 10)}: answer key corrected to ${verdict.correctKey} after student report + independent re-verification. ${verdict.reasoning}]`,
        },
      });
      results.push({ questionId: qid, action: "key-fixed", detail: `${q.answerKey} → ${verdict.correctKey}` });
    } else {
      await prisma.question.update({ where: { id: qid }, data: { validated: false } });
      results.push({
        questionId: qid,
        action: "invalidated",
        detail: `no clear correct option (verdict: ${verdict.correctKey ?? "none"}, ${verdict.confidence})`,
      });
    }
    await prisma.questionReport.updateMany({
      where: { questionId: qid, resolved: false },
      data: { resolved: true, resolvedBy: opts.resolvedBy, resolvedAt: new Date() },
    });
    const last = results[results.length - 1];
    if (last && (last.action === "key-fixed" || last.action === "invalidated")) {
      await notifyReporters(qid, last.action);
    }
  }
  return results;
}
