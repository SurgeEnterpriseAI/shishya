// POST /api/exam-articles/[id]/react — toggle a 👍/👎 on an article.
//
// Body: { reaction: "LIKE" | "DISLIKE" | null }
//   - "LIKE" / "DISLIKE" → upsert the user's vote
//   - null               → remove the user's vote
//
// Identity:
//   - signed-in users vote with their userId
//   - anonymous users vote with the existing shishya_anon cookie
//     (issued by /api/analytics; we read but never set it here —
//      analytics is the canonical issuer)
//
// One vote per identity per article. Constraint is enforced at the
// DB level via the (articleId, userId) / (articleId, anonId) unique
// indexes on ExamArticleReaction.

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import type { ArticleReaction } from "@prisma/client";

export const runtime = "nodejs";

const ANON_COOKIE = "shishya_anon";
const VALID: Set<ArticleReaction> = new Set(["LIKE", "DISLIKE"] as const);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: articleId } = await params;

  let body: { reaction?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const reaction = body.reaction;
  const isClear = reaction === null;
  if (!isClear && (typeof reaction !== "string" || !VALID.has(reaction as ArticleReaction))) {
    return NextResponse.json({ error: "invalid reaction" }, { status: 400 });
  }

  // Confirm the article exists — better to 404 than to insert orphans.
  const exists = await prisma.examPhaseArticle.findUnique({
    where: { id: articleId },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "not found" }, { status: 404 });

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const anonId = userId ? null : req.cookies.get(ANON_COOKIE)?.value ?? null;

  // Anonymous voters MUST have the cookie. Without it we'd let one
  // browser cast unlimited votes, which would poison the counts.
  if (!userId && !anonId) {
    return NextResponse.json(
      { error: "no identity — visit a page first so the anon cookie can issue" },
      { status: 400 },
    );
  }

  if (isClear) {
    // Remove the user's existing vote, if any. Two queries because
    // deleteMany can't use unique-with-null semantics cleanly across
    // both identity columns; we just delete whichever applies.
    await prisma.examArticleReaction.deleteMany({
      where: { articleId, ...(userId ? { userId } : { anonId }) },
    });
    return NextResponse.json({ ok: true, cleared: true });
  }

  // Upsert the vote. We can't use Prisma's `upsert` straight because
  // the unique constraint involves whichever identity column is
  // populated — so we deleteMany + create. Cheap, correct, no race
  // window worth worrying about for a 👍 click.
  await prisma.examArticleReaction.deleteMany({
    where: { articleId, ...(userId ? { userId } : { anonId }) },
  });
  await prisma.examArticleReaction.create({
    data: {
      articleId,
      userId,
      anonId,
      reaction: reaction as ArticleReaction,
    },
  });

  return NextResponse.json({ ok: true, reaction });
}
