// POST /api/discussions/:id/messages — post a reply (auth required)
//   { content: string }
//
// Updates the parent thread's messageCount + lastActivityAt atomically so
// the home-page list bubbles fresh threads to the top without a separate
// recompute step.
//
// AUTO-REPLY (added 27 May 2026)
// After persisting the user's message, we schedule an AI-generated
// peer reply via Next 15's `after()`. The reply lands 8-25 s later
// (random) so it feels like a fellow student typed it back rather
// than an instant bot. Guardrails:
//   - skip if user's content < 25 chars (low-signal posts)
//   - skip if last message in thread was already AI (avoid AI<>AI loop)
//   - skip if an AI reply was posted to this thread in the last 5 min
//   - swallow all errors silently — auto-reply failure must never
//     surface to the user; their post still succeeded.

import { z } from "zod";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, forbidden, notFound, ok, parseBody, serverError, unauth } from "@/lib/http";
import { generateAiReply } from "@/lib/ai/discussion-reply";

const Body = z.object({
  content: z.string().min(2).max(4000),
});

const AI_REPLY_COOLDOWN_MS = 5 * 60 * 1000; // 5 min between AI replies in same thread
const AI_REPLY_MIN_CHARS = 25;               // skip very short posts ("ok", "+1")
const AI_REPLY_DELAY_MIN_MS = 8_000;         // 8 s minimum "thinking" delay
const AI_REPLY_DELAY_MAX_MS = 25_000;        // 25 s maximum

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const { id } = await ctx.params;
    const body = await parseBody(req, Body);

    const thread = await prisma.discussion.findUnique({
      where: { id },
      select: { id: true, locked: true, title: true, exam: { select: { shortName: true } } },
    });
    if (!thread) return notFound("discussion");
    if (thread.locked) return forbidden();

    const author = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });
    const authorName = author?.name ?? author?.email?.split("@")[0] ?? "Anonymous";

    // Single transaction: append the message + bump thread denormalised counters.
    const [message] = await prisma.$transaction([
      prisma.discussionMessage.create({
        data: {
          threadId: id,
          authorId: session.user.id,
          authorName,
          content: body.content.trim(),
        },
      }),
      prisma.discussion.update({
        where: { id },
        data: {
          lastActivityAt: new Date(),
          messageCount: { increment: 1 },
        },
      }),
    ]);

    // Schedule an AI peer reply AFTER the response goes back to the
    // user. `after()` keeps the lambda alive until the callback
    // finishes (or it timeouts), but doesn't add latency to the
    // user-visible POST. All paths are guarded and any failure is
    // logged + swallowed.
    after(async () => {
      try {
        await maybeScheduleAiReply({
          threadId: id,
          threadTitle: thread.title,
          examShortName: thread.exam?.shortName ?? null,
          userMessageContent: body.content.trim(),
        });
      } catch (err) {
        console.error("[messages] after() ai-reply failed (non-fatal):", err);
      }
    });

    return ok({
      message: {
        id: message.id,
        authorName: message.authorName,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────
// AI auto-reply scheduler. Runs inside `after()` post-response.
// ─────────────────────────────────────────────────────────────────────
async function maybeScheduleAiReply({
  threadId,
  threadTitle,
  examShortName,
  userMessageContent,
}: {
  threadId: string;
  threadTitle: string;
  examShortName: string | null;
  userMessageContent: string;
}): Promise<void> {
  // Guard 1: short content → likely not worth replying.
  if (userMessageContent.length < AI_REPLY_MIN_CHARS) return;

  // Pull thread context — last 5 messages so Claude can match tone.
  // Most recent first then reversed (we want oldest → newest for prompt).
  const recent = await prisma.discussionMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { authorId: true, authorName: true, content: true, createdAt: true },
  });
  if (recent.length === 0) return;
  const messages = recent.slice().reverse();

  // Guard 2: last message was already from an AI persona (authorId is
  // null). Don't reply to ourselves — avoids an AI<>AI loop if a
  // human posts once and two cron-spawned synthetic posts arrive.
  // The most recent message is what we'd be replying to.
  const last = messages[messages.length - 1];
  if (last.authorId === null) return;

  // Guard 3: cool-down. If any synthetic message in this thread is
  // newer than 5 min ago, skip — we don't want one human post to
  // attract a flurry of AI replies if the lambda gets retried.
  const recentAi = recent.find((m) => m.authorId === null);
  if (recentAi && Date.now() - recentAi.createdAt.getTime() < AI_REPLY_COOLDOWN_MS) return;

  // Collect synthetic names that already replied in this thread so
  // we vary the persona across replies.
  const recentAiNames = recent
    .filter((m) => m.authorId === null && m.authorName)
    .map((m) => m.authorName!) as string[];

  // Generate reply via Claude. May return null (model failure / empty
  // / too-long output) — in that case we silently bail.
  const reply = await generateAiReply({
    threadTitle,
    examShortName,
    messages: messages.map((m) => ({ authorName: m.authorName, content: m.content })),
    recentAiNames,
  });
  if (!reply) return;

  // Natural "typing" delay so the reply doesn't pop in instantly.
  const delay =
    AI_REPLY_DELAY_MIN_MS +
    Math.floor(Math.random() * (AI_REPLY_DELAY_MAX_MS - AI_REPLY_DELAY_MIN_MS));
  await new Promise((res) => setTimeout(res, delay));

  // Persist the AI reply + bump thread counters in one txn.
  try {
    await prisma.$transaction([
      prisma.discussionMessage.create({
        data: {
          threadId,
          authorId: null, // synthetic — no real user backs it
          authorName: reply.authorName,
          content: reply.content,
        },
      }),
      prisma.discussion.update({
        where: { id: threadId },
        data: { lastActivityAt: new Date(), messageCount: { increment: 1 } },
      }),
    ]);
  } catch (err) {
    console.error("[messages] ai-reply write failed (non-fatal):", err);
  }
}
