// POST /api/study-room { examCode, topicCode } → { threadId }
//
// Group study Phase A: every (exam, topic) pair gets ONE shared study
// room — a Discussion thread (reusing the entire existing chat engine:
// messages, replies, moderation) marked with topicCode. Find-or-create
// on demand; everyone who opens the topic's room lands in the SAME
// thread, so invited friends meet there. Reading is public; posting
// requires sign-in (existing discussions behavior).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const Body = z.object({
  examCode: z.string().min(1),
  topicCode: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { examCode, topicCode } = parsed.data;

  const rows = await prisma.$queryRaw<{ examId: string; short: string; topicName: string }[]>`
    SELECT e.id AS "examId", e."shortName" AS short, t.name AS "topicName"
    FROM "Exam" e
    JOIN "Subject" s ON s."examId" = e.id
    JOIN "Topic" t ON t."subjectId" = s.id AND t.code = ${topicCode}
    WHERE e.code = ${examCode} AND e.active = TRUE
    LIMIT 1
  `;
  if (!rows[0]) return Response.json({ error: "not found" }, { status: 404 });
  const { examId, short, topicName } = rows[0];

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Discussion" WHERE "examId" = ${examId} AND "topicCode" = ${topicCode} LIMIT 1
  `;
  if (existing[0]) return Response.json({ threadId: existing[0].id });

  const created = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "Discussion" (id, title, "examId", "topicCode", "authorName", "isSeed", "messageCount", "lastActivityAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${`📚 Study room — ${short}: ${topicName}`}, ${examId}, ${topicCode}, ${"Shishya"}, TRUE, 0, NOW(), NOW(), NOW())
    ON CONFLICT DO NOTHING
    RETURNING id
  `;
  if (created[0]) return Response.json({ threadId: created[0].id });
  // Lost a race — fetch the winner.
  const winner = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Discussion" WHERE "examId" = ${examId} AND "topicCode" = ${topicCode} LIMIT 1
  `;
  return winner[0]
    ? Response.json({ threadId: winner[0].id })
    : Response.json({ error: "could not create room" }, { status: 500 });
}
