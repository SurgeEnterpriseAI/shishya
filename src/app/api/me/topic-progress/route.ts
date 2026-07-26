// Topic-progress API — the mastery loop's read/write endpoint.
//
// GET  ?exam=CODE           → { topics: { [topicCode]: { read, completed,
//                              mastery } } } for the signed-in student —
//                              powers syllabus checkmarks + topic meters
//                              without making those ISR pages dynamic.
// POST { topicCode, action } → action "read" (auto-stamped on opening a
//                              topic) | "complete" (explicit mark-done)
//                              | "uncomplete".
// Anonymous: GET returns { topics: {} } (signed-out pages just show no
// overlay), POST is 401. Raw SQL for writes (no client regen needed).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return Response.json({ topics: {} });
  const examCode = new URL(req.url).searchParams.get("exam") ?? "";
  if (!examCode) return Response.json({ topics: {} });

  const rows = await prisma
    .$queryRaw<{ code: string; read: Date | null; completed: Date | null; mastery: number | null }[]>`
      SELECT t.code,
             s."readAt" AS read,
             s."completedAt" AS completed,
             w."masteryScore" AS mastery
      FROM "Topic" t
      JOIN "Subject" sub ON sub.id = t."subjectId"
      JOIN "Exam" e ON e.id = sub."examId" AND e.code = ${examCode}
      LEFT JOIN "TopicStudyState" s ON s."topicId" = t.id AND s."userId" = ${session.user.id}
      LEFT JOIN "WeaknessMap" w ON w."topicId" = t.id AND w."userId" = ${session.user.id}
      WHERE s.id IS NOT NULL OR w.id IS NOT NULL
    `.catch(() => []);

  const topics: Record<string, { read: boolean; completed: boolean; mastery: number | null }> = {};
  for (const r of rows) {
    topics[r.code] = {
      read: r.read != null,
      completed: r.completed != null,
      mastery: r.mastery,
    };
  }
  return Response.json({ topics }, { headers: { "cache-control": "no-store" } });
}

const Body = z.object({
  examCode: z.string().min(1),
  topicCode: z.string().min(1),
  action: z.enum(["read", "complete", "uncomplete"]),
});

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { examCode, topicCode, action } = parsed.data;

  const topic = await prisma.$queryRaw<{ id: string }[]>`
    SELECT t.id FROM "Topic" t
    JOIN "Subject" s ON s.id = t."subjectId"
    JOIN "Exam" e ON e.id = s."examId"
    WHERE e.code = ${examCode} AND t.code = ${topicCode} LIMIT 1
  `;
  if (!topic[0]) return Response.json({ error: "topic not found" }, { status: 404 });

  const completedSql =
    action === "complete" ? "NOW()" : action === "uncomplete" ? "NULL" : `"TopicStudyState"."completedAt"`;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "TopicStudyState" (id, "userId", "topicId", "readAt", "completedAt")
     VALUES (gen_random_uuid()::text, $1, $2, NOW(), ${action === "complete" ? "NOW()" : "NULL"})
     ON CONFLICT ("userId", "topicId")
     DO UPDATE SET "readAt" = NOW(), "completedAt" = ${completedSql}`,
    session.user.id,
    topic[0].id,
  );
  return Response.json({ ok: true });
}
