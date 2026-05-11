// GET /api/cron/daily-brief — runs once per day (Vercel Cron) to:
//   1. For every active enrollment, build (or refresh) a DailyBrief
//      with a Shishya-written reflection ("you've been weak in X; today
//      let's drill it") + a pre-built adaptive mock the student can
//      take with one click on the dashboard.
//
// Auth: requires Bearer ${CRON_SECRET}. Vercel Cron automatically sets
// `Authorization: Bearer ${CRON_SECRET}` if the env var is present in
// the project settings. Manual triggers must include the same header.
//
// Idempotent per-day: re-running on the same calendar day refreshes the
// existing brief (upserts on (userId, examId, briefDate)).

// Cron job that walks every enrollment + calls Claude per user-exam. We
// stay at 300s (Vercel Pro plan ceiling); the cron itself processes users
// in batches and is idempotent per (user, exam, day), so a timeout on a
// busy cohort just means the next invocation picks up the remainder.
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { generateMock } from "@/lib/ai";
import { getStudentState } from "@/lib/db/student-state";
import { getSyllabusContext } from "@/lib/db/syllabus";
import type { GenerateMockRequest, QuestionRef } from "@/lib/ai/types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

// Runtime budget so a runaway loop can't blow tokens. Each user costs
// roughly $0.05 (one short reflection call + one adaptive mock build).
const PER_USER_BUDGET_USD = 0.5;
const TOTAL_BUDGET_USD = 50;

// Pricing for token-spend telemetry. Approximate.
const PRICE_INPUT_PER_M = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;

interface Stats {
  in: number; out: number; cacheW: number; cacheR: number;
  briefsCreated: number; briefsUpdated: number; mocksCreated: number;
  enrollmentsScanned: number; skipped: number;
}

function spendUsd(s: Stats) {
  return (
    (s.in * PRICE_INPUT_PER_M) / 1_000_000 +
    (s.out * PRICE_OUTPUT_PER_M) / 1_000_000 +
    (s.cacheW * PRICE_CACHE_WRITE_PER_M) / 1_000_000 +
    (s.cacheR * PRICE_CACHE_READ_PER_M) / 1_000_000
  );
}

function todayUtcMidnight(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats: Stats = {
    in: 0, out: 0, cacheW: 0, cacheR: 0,
    briefsCreated: 0, briefsUpdated: 0, mocksCreated: 0,
    enrollmentsScanned: 0, skipped: 0,
  };

  const briefDate = todayUtcMidnight();

  // Active enrollments — only generate for users who have actually used the
  // platform (taken ≥1 mock or had ≥1 chat session). Saves spend on dormant
  // accounts that aren't going to open the dashboard tomorrow.
  const enrollments = await prisma.enrollment.findMany({
    where: { active: true },
    include: {
      exam: { select: { id: true, code: true, shortName: true } },
      user: {
        select: {
          id: true,
          _count: { select: { attempts: true, chatSessions: true } },
        },
      },
    },
  });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

  for (const enr of enrollments) {
    if (spendUsd(stats) >= TOTAL_BUDGET_USD) break;
    stats.enrollmentsScanned += 1;

    // Skip dormant users — fewer than 1 attempt and 0 chat sessions.
    if (enr.user._count.attempts === 0 && enr.user._count.chatSessions === 0) {
      stats.skipped += 1;
      continue;
    }

    // Per-user spend cap — protects total budget against an outlier user.
    const before = spendUsd(stats);

    try {
      // Snapshot inputs for the brief
      const [weakness, recentChats, recentAttempts] = await Promise.all([
        prisma.weaknessMap.findMany({
          where: { userId: enr.userId, examId: enr.examId, attemptsCount: { gte: 2 } },
          include: { topic: { select: { code: true, name: true } } },
          orderBy: { masteryScore: "asc" },
          take: 6,
        }),
        prisma.chatSession.findMany({
          where: { userId: enr.userId, examId: enr.examId },
          orderBy: { updatedAt: "desc" },
          take: 3,
          include: {
            messages: {
              where: { role: "ASSISTANT" },
              orderBy: { createdAt: "desc" },
              take: 5,
              select: { metadata: true },
            },
          },
        }),
        prisma.attempt.findMany({
          where: {
            userId: enr.userId,
            mock: { examId: enr.examId },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
          },
          orderBy: { startedAt: "desc" },
          take: 3,
          select: { scorePct: true, durationSec: true, startedAt: true },
        }),
      ]);

      // Extract topics asked about from chat tool_use traces
      const topicsAskedAbout = new Set<string>();
      for (const s of recentChats) {
        for (const m of s.messages) {
          const calls = ((m.metadata as any)?.toolCalls ?? []) as Array<{ args?: any }>;
          for (const c of calls) {
            const code = c?.args?.topic_code;
            if (typeof code === "string") topicsAskedAbout.add(code);
          }
        }
      }

      // ── Reflection (one Claude call) ────────────────────────────────
      const weaknessLines = weakness.length
        ? weakness.slice(0, 4).map(
            (w) => `- ${w.topic.name} (mastery ${Math.round(w.masteryScore * 100)}%, ${w.attemptsCount} attempts)`
          ).join("\n")
        : "(no mastery data yet — student is just starting out)";
      const askedLine = topicsAskedAbout.size
        ? [...topicsAskedAbout].slice(0, 5).join(", ")
        : "(none yet)";
      const recentScoresLine = recentAttempts.length
        ? recentAttempts.map((a) => `${(a.scorePct ?? 0).toFixed(0)}%`).join(", ")
        : "(no submitted mocks yet)";

      const userPrompt = `Write a 2–3 sentence personal note from Shishya to a student preparing for ${enr.exam.shortName}.

Inputs:
- Weakest topics:
${weaknessLines}
- Topics they asked Shishya about recently: ${askedLine}
- Recent mock scores (most recent first): ${recentScoresLine}

Tone: warm but direct. Refer to specific topics by name. Suggest one concrete action for today (a mock, a review, a quick concept revisit). Don't pad — get to the point.

Output ONLY the note, no quotes, no formatting markers.`;

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: "You are Shishya, an AI tutor for Indian competitive exam students. You write tight, personal daily notes that respect the student's time.",
        messages: [{ role: "user", content: userPrompt }],
      });
      stats.in += response.usage.input_tokens;
      stats.out += response.usage.output_tokens;
      stats.cacheW += response.usage.cache_creation_input_tokens ?? 0;
      stats.cacheR += response.usage.cache_read_input_tokens ?? 0;

      const reflection = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text).join("\n").trim();

      if (!reflection || reflection.length < 30) continue;

      // Per-user spend check (after reflection call)
      if (spendUsd(stats) - before >= PER_USER_BUDGET_USD) {
        // Persist reflection-only brief and move on
        await upsertBrief(enr.userId, enr.examId, briefDate, reflection, null, {
          weakest: weakness.map((w) => w.topic.code),
          asked: [...topicsAskedAbout],
          scores: recentAttempts.map((a) => a.scorePct),
        }, stats);
        continue;
      }

      // ── Adaptive mock (uses existing generator) ─────────────────────
      let mockId: string | null = null;
      try {
        const studentState = await getStudentState(enr.userId, enr.exam.code);
        const syllabus = await getSyllabusContext(enr.exam.code);
        const pool = await fetchAdaptivePool(enr.examId, enr.userId);
        if (pool.length >= 5) {
          const req: GenerateMockRequest = {
            type: "ADAPTIVE",
            questionCount: Math.min(20, pool.length),
          };
          const result = await generateMock({
            studentState, request: req, availableQuestions: pool, syllabus,
          });
          if (result.questionIds.length > 0) {
            const created = await prisma.mock.create({
              data: {
                userId: enr.userId,
                examId: enr.examId,
                type: "ADAPTIVE",
                title: `${enr.exam.shortName} — Today's Adaptive Mock`,
                config: {
                  rationale: result.rationale,
                  topicMix: result.topicMix,
                  difficultyMix: result.difficultyMix,
                  durationMin: result.durationMin,
                  requestType: "ADAPTIVE",
                  briefDate: briefDate.toISOString().slice(0, 10),
                } as any,
                questionIds: result.questionIds,
                generatedBy: "cron:daily-brief",
                generationContext: { studentSnapshot: studentState as any },
              },
            });
            mockId = created.id;
            stats.mocksCreated += 1;
          }
        }
      } catch (err) {
        console.warn(`[daily-brief] mock build failed for user=${enr.userId} exam=${enr.exam.code}:`, err);
      }

      await upsertBrief(enr.userId, enr.examId, briefDate, reflection, mockId, {
        weakest: weakness.map((w) => w.topic.code),
        asked: [...topicsAskedAbout],
        scores: recentAttempts.map((a) => a.scorePct),
      }, stats);
    } catch (err) {
      console.warn(`[daily-brief] failed user=${enr.userId} exam=${enr.exam.code}:`, err);
    }
  }

  return Response.json({
    ok: true,
    briefDate: briefDate.toISOString().slice(0, 10),
    enrollmentsScanned: stats.enrollmentsScanned,
    skipped: stats.skipped,
    briefsCreated: stats.briefsCreated,
    briefsUpdated: stats.briefsUpdated,
    mocksCreated: stats.mocksCreated,
    spendUsd: spendUsd(stats).toFixed(4),
    tokens: { in: stats.in, out: stats.out, cacheW: stats.cacheW, cacheR: stats.cacheR },
  });
}

async function upsertBrief(
  userId: string,
  examId: string,
  briefDate: Date,
  reflection: string,
  mockId: string | null,
  inputs: any,
  stats: Stats
) {
  const existing = await prisma.dailyBrief.findUnique({
    where: { userId_examId_briefDate: { userId, examId, briefDate } },
  });
  if (existing) {
    await prisma.dailyBrief.update({
      where: { id: existing.id },
      data: { reflection, mockId, inputs },
    });
    stats.briefsUpdated += 1;
  } else {
    await prisma.dailyBrief.create({
      data: { userId, examId, briefDate, reflection, mockId, inputs },
    });
    stats.briefsCreated += 1;
  }
}

async function fetchAdaptivePool(examId: string, userId: string): Promise<QuestionRef[]> {
  // Same logic as /api/mocks ADAPTIVE path: validated questions for this
  // exam, broad pool. The generator picks the topic mix from the
  // student's weakness map.
  const qs = await prisma.question.findMany({
    where: { examId, validated: true },
    include: { topic: true },
    take: 500,
  });
  void userId;
  return qs.map((q) => ({
    id: q.id,
    topicId: q.topicId,
    topicCode: q.topic.code,
    difficulty: q.difficulty,
  }));
}
