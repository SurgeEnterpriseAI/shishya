// Question bookmarks for the Mistake Notebook (/revision).
// POST { questionId, action: "add" | "remove" } — toggle a star.
// GET  ?exam=CODE — bookmarked question ids for the signed-in user
// (used to hydrate star state on the results review).
//
// Raw SQL (not prisma.questionBookmark) — the generated client on this
// machine predates the table; same pattern as TopicStudyState.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const Body = z.object({
  questionId: z.string().min(1),
  action: z.enum(["add", "remove"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "sign in" }, { status: 401 });
  const userId = session.user.id;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { questionId, action } = parsed.data;

  if (action === "remove") {
    await prisma.$executeRaw`
      DELETE FROM "QuestionBookmark" WHERE "userId" = ${userId} AND "questionId" = ${questionId}`;
    return Response.json({ bookmarked: false });
  }

  const q = await prisma.question.findUnique({
    where: { id: questionId },
    select: { examId: true },
  });
  if (!q) return Response.json({ error: "not found" }, { status: 404 });

  await prisma.$executeRaw`
    INSERT INTO "QuestionBookmark" (id, "userId", "questionId", "examId", "createdAt")
    VALUES (gen_random_uuid()::text, ${userId}, ${questionId}, ${q.examId}, NOW())
    ON CONFLICT ("userId", "questionId") DO NOTHING`;
  return Response.json({ bookmarked: true });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ ids: [] });
  const examCode = new URL(req.url).searchParams.get("exam");

  const rows = examCode
    ? await prisma.$queryRaw<{ questionId: string }[]>`
        SELECT b."questionId" FROM "QuestionBookmark" b
        JOIN "Exam" e ON e.id = b."examId"
        WHERE b."userId" = ${session.user.id} AND e.code = ${examCode}
        ORDER BY b."createdAt" DESC LIMIT 500`
    : await prisma.$queryRaw<{ questionId: string }[]>`
        SELECT "questionId" FROM "QuestionBookmark"
        WHERE "userId" = ${session.user.id}
        ORDER BY "createdAt" DESC LIMIT 500`;

  return Response.json({ ids: rows.map((r) => r.questionId) });
}
