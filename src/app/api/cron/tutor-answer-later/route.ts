// GET /api/cron/tutor-answer-later — answer the questions an AI outage left
// unanswered (1 Oct 2026). Every 15 minutes per vercel.json (was hourly: one
// run clears about one student's questions; an idle run makes no AI call).
//
// Why: 30 Sep 06:47-12:01 IST the organisation's Anthropic credit was at
// zero — 12 member tutor questions from 7 people (4 signed up that day)
// failed and none was ever answered. The chat now tells the student their
// question is saved and will be answered here (src/lib/tutor-unavailable.ts);
// this run keeps that promise: failed member questions of the last 72 hours,
// oldest first, one cheap probe first, stop at the first AI-unavailable
// error, at most 20 answers and $4.00 a run, the chat's own pipeline, an
// atomic claim per question, then the pick-up card and one mail per student
// (at most one a day). Every rule: src/lib/tutor-late-answer.ts; the steps:
// src/lib/db/tutor-late-answer.ts.
//
// Query: ?dry=1 (count the candidates, and the students with late answers
// still waiting to be told — no model call, nothing written), ?max=<n> and
// ?maxUsd=<usd> (LOWER caps for this run; never above the hard caps). The
// report carries counts and minutes only — no question text, no address.
// 1 Oct 2026 review: a student's mail goes right after their questions are
// done, and a mail a run could not send (it died, a cap cut the student's
// questions, the 24-hour guard) is sent by a later run — the questions
// themselves record whether they were told (lateMailAt).
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { runLateAnswers } from "@/lib/tutor-late-answer";
import { lateAnswerDeps } from "@/lib/db/tutor-late-answer";

function numParam(q: URLSearchParams, key: string): number | null {
  const raw = q.get(key);
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const q = new URL(req.url).searchParams;
  try {
    const report = await runLateAnswers(lateAnswerDeps(), {
      now: new Date(),
      dry: q.get("dry") === "1",
      maxAnswers: numParam(q, "max"),
      maxUsd: numParam(q, "maxUsd"),
    });
    return Response.json(report);
  } catch (err) {
    console.error("[tutor-answer-later] run failed", err);
    return Response.json({ ok: false, error: String((err as Error)?.message ?? err).slice(0, 300) }, { status: 500 });
  }
}
