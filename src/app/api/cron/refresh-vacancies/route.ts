// GET /api/cron/refresh-vacancies — keep the live vacancy figures honest.
//
// The homepage vacancy explorer shows an "Updated <date>" stamp so
// aspirants trust the numbers are current. To make that stamp genuine,
// this cron re-verifies the MOST-STALE slice of exams each day (Claude +
// web_search), refreshing vacanciesApprox + vacanciesNote and rolling
// generatedAt forward. ~15 exams/day → all ~177 refresh every ~12 days,
// and the most-recent-update date is always today.
//
// Auth: Bearer ${CRON_SECRET}. Daily per vercel.json.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";

const MODEL = "claude-sonnet-4-5-20250929";
const BATCH = 15;
const TIME_BUDGET_MS = 250_000;

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

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  const started = Date.now();

  // Most-stale first — the rows whose vacancy data is oldest.
  const exams = await prisma.$queryRawUnsafe<
    { id: string; code: string; name: string; shortName: string }[]
  >(
    `SELECT e.id, e.code, e.name, e."shortName"
     FROM "ExamEligibility" x JOIN "Exam" e ON e.id = x."examId"
     WHERE e.active = TRUE
     ORDER BY x."generatedAt" ASC
     LIMIT ${BATCH}`,
  );

  const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }] as any[];
  let updated = 0, failed = 0;
  for (const ex of exams) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    try {
      const res = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 500,
          system:
            "You report the TYPICAL/latest annual vacancy count for an Indian government exam, verified via web_search against the official notification or recent recruitment news. Return STRICT JSON only: {\"vacanciesApprox\": int|null, \"vacanciesNote\": \"short context\"|null}. Use null if genuinely unsure; never invent. Prefer the most recent cycle's total posts.",
          tools,
          messages: [{ role: "user", content: `Exam: ${ex.name} (${ex.shortName}). Find the latest/typical annual vacancies and return the JSON.` }],
        },
        { timeout: 90_000, maxRetries: 1 },
      );
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
      const j = firstJson(text);
      const vac = Number.isInteger(j.vacanciesApprox) ? j.vacanciesApprox : null;
      // Always roll generatedAt forward (data was re-checked, even if the
      // number is unchanged) so the "updated" stamp stays honest.
      await prisma.$executeRawUnsafe(
        `UPDATE "ExamEligibility"
         SET "vacanciesApprox" = COALESCE($2, "vacanciesApprox"),
             "vacanciesNote" = COALESCE($3, "vacanciesNote"),
             "generatedAt" = NOW()
         WHERE "examId" = $1`,
        ex.id, vac, j.vacanciesNote ?? null,
      );
      updated++;
    } catch (err) {
      failed++;
      console.warn(`[refresh-vacancies] ${ex.code}: ${String((err as Error)?.message).slice(0, 80)}`);
    }
  }

  return Response.json({ ok: true, refreshed: updated, failed, batch: exams.length });
}
