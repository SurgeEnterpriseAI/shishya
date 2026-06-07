// Seed realistic synthetic replies onto seed discussion threads.
//
// The homepage right-rail seed threads (isSeed=true) showed "0 replies"
// — reads as a dead forum. This generates 4-6 peer-style replies per
// thread via Claude, attributes them to varied synthetic student
// handles (authorId=null, authorName=handle), staggers the timestamps
// so the conversation looks organic, and bumps each thread's
// messageCount + lastActivityAt.
//
// Idempotent-ish: only adds replies to threads that currently have
// messageCount === 0, so re-running won't pile duplicates onto threads
// that already got seeded.
//
// Usage:
//   node -e "<env-loader>; require('child_process').execSync(
//     'npx tsx scripts/seed-discussion-replies.ts',
//     { stdio:'inherit', env:process.env })"

import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { pickSyntheticHandle } from "../src/data/synthetic-handles";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

const MIN_REPLIES = 4;
const MAX_REPLIES = 6;

const TOOL = {
  name: "publish_replies",
  description: "Submit the thread replies.",
  input_schema: {
    type: "object",
    properties: {
      replies: {
        type: "array",
        minItems: MIN_REPLIES,
        maxItems: MAX_REPLIES,
        items: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description:
                "One student reply, 1-3 sentences. Casual peer voice, Hinglish ok, varied — some answer, some commiserate, some add info, some ask a follow-up.",
            },
          },
          required: ["content"],
        },
      },
    },
    required: ["replies"],
  },
} as const;

const SYSTEM = `You are writing a short, realistic reply thread for an Indian exam-prep discussion forum.

Given a thread TITLE and exam, write ${MIN_REPLIES}-${MAX_REPLIES} replies as if different student aspirants are responding to each other.

STYLE
- Each reply 1-3 sentences. Short. Real.
- Casual peer-to-peer. Hinglish / regional words fine if natural ("yaar", "bhai", "didi").
- VARY the replies: some answer the question, some agree/commiserate, some add a fact or their own score, some ask a follow-up, some gently disagree. A real thread is not all one note.
- Later replies can reference earlier ones ("agree with the above", "same as what X said").

DO NOT
- Don't claim hard facts you can't be sure of (exact cutoffs/dates) — qualify with "I think", "heard that", "in my batch".
- Don't sign names (the system adds them).
- Don't sound like staff, a tutor, or marketing. Pure peer students.
- Don't be all positive or all negative — mix the emotional range.`;

async function generateReplies(title: string, examShort: string): Promise<string[]> {
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `EXAM: ${examShort}\nTHREAD TITLE: "${title}"\n\nWrite ${MIN_REPLIES}-${MAX_REPLIES} replies via publish_replies.`,
        },
      ],
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
    });
    const tu = res.content.find((b) => b.type === "tool_use");
    if (!tu || tu.type !== "tool_use") return [];
    const input = tu.input as { replies?: Array<{ content?: string }> };
    if (!Array.isArray(input.replies)) return [];
    return input.replies
      .map((r) => (typeof r?.content === "string" ? r.content.trim() : ""))
      .filter((c) => c.length >= 5 && c.length <= 600);
  } catch (err) {
    console.error("  reply generation failed:", (err as Error).message);
    return [];
  }
}

async function main() {
  const threads = await prisma.discussion.findMany({
    where: { isSeed: true, messageCount: 0 },
    select: {
      id: true,
      title: true,
      createdAt: true,
      exam: { select: { shortName: true } },
    },
    orderBy: { lastActivityAt: "desc" },
  });
  console.log(`${threads.length} seed threads with 0 replies\n`);

  let totalReplies = 0;
  const now = Date.now();

  for (const t of threads) {
    const examShort = t.exam?.shortName ?? "this exam";
    const replies = await generateReplies(t.title, examShort);
    if (replies.length === 0) {
      console.log(`  ⏭  ${t.title.slice(0, 45)} — no replies generated`);
      continue;
    }

    // Stagger reply timestamps between the thread's creation and ~30 min
    // ago, evenly spaced, so the conversation reads as organic.
    const start = t.createdAt.getTime();
    const end = now - 30 * 60_000;
    const span = Math.max(end - start, 60 * 60_000); // ≥1h span
    const step = span / (replies.length + 1);

    const usedNames: string[] = [];
    const rows = replies.map((content, i) => {
      const handle = pickSyntheticHandle(usedNames);
      usedNames.push(handle);
      return {
        threadId: t.id,
        authorId: null as string | null,
        authorName: handle,
        content,
        createdAt: new Date(start + step * (i + 1)),
      };
    });

    const lastAt = rows[rows.length - 1].createdAt;
    await prisma.$transaction([
      prisma.discussionMessage.createMany({ data: rows }),
      prisma.discussion.update({
        where: { id: t.id },
        data: { messageCount: rows.length, lastActivityAt: lastAt },
      }),
    ]);

    totalReplies += rows.length;
    console.log(`  ✓ ${t.title.slice(0, 45)} — +${rows.length} replies`);
  }

  console.log(`\n✅ Added ${totalReplies} synthetic replies across ${threads.length} threads.`);
}

main()
  .then(() => prisma.$disconnect().then(() => process.exit(0)))
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().then(() => process.exit(1));
  });
