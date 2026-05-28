// AI-generated peer reply for discussion threads.
//
// WHY THIS EXISTS
// 27 May 2026 stats: 98 signups, ~70 mock attempts, ~2 AI chats/24h.
// The Discussions sidebar reads "active" because of seeded threads,
// but real student posts get zero replies and the conversation dies.
// Visitors who post once and see silence don't post again.
//
// SOLUTION
// When a real user posts in a thread, after a small natural delay
// (8-25 s, randomised) we post back as a fellow student. The reply:
//   - is short (1-3 sentences)
//   - matches the tone of the thread (anxious → reassuring, factual
//     question → "wait for official key" / "I think it was 60..." )
//   - never claims definitive facts (cutoffs, dates) — those vary
//     and we don't want hallucinated misinfo to embarrass us
//   - signs off with a varied synthetic student name (NOT "Shishya
//     sample" or anything identifying it as AI)
//
// The reply is generated in src/app/api/discussions/[id]/messages
// via Next 15's `after()` so it runs AFTER the user's POST returns
// — adds zero latency to the post itself.

import { anthropic, MODEL } from "./client";
import { pickSyntheticHandle } from "@/data/synthetic-handles";

const SYSTEM_PROMPT = `You are writing a single short discussion-reply on an Indian exam-prep platform.

You are role-playing as a fellow student aspirant — NOT a tutor, NOT a moderator, NOT staff. Another student just posted in a thread; you're replying as someone preparing for the same exam.

STYLE
- 1-3 sentences. Short is good. Long reads as AI.
- Casual, peer-to-peer. Use "yaar / bhai / didi / sis" sparingly only if it fits the original post's tone. Sometimes Hinglish or a regional word is fine — don't force it.
- React to what they said. If they're anxious, normalise + share you felt the same. If they're asking a factual question, say what you think but qualify ("I think...", "in my batch we did...", "wait for the official key").
- Vary endings. Don't always close with "all the best" — sometimes a question back, sometimes a tip, sometimes just empathy.

DO NOT
- Don't introduce yourself or sign off with a name. The system handles the name.
- Don't claim hard facts you can't be sure of (specific cutoffs by category, exact dates, "the official answer is X"). Hallucinated specifics hurt us more than a vague reply helps.
- Don't sound robotic or formal. "Hope this helps!" / "Best regards" → never.
- Don't sound like a tutor explaining — you're a peer commiserating or asking back.
- Don't promote products / Shishya / coaching. Just be a student replying.
- Don't say you're an AI / bot / Shishya / Claude.
- Don't reply with just emoji. Words matter.

OUTPUT
A single reply string. No quotes around it, no "Reply:" prefix. Just the words you'd type.

EXAMPLES of good replies:

To "Scored 68 in mock, feeling hopeless":
"yaar 68 is honestly not bad at this stage, mock difficulty fluctuates a lot. main thing is to see which section dropped — fix that and the next one bumps up easy. don't compare with rankers' posts, they're outliers."

To "what's expected cutoff for general this year":
"hard to say, last year it was around 88 percentile but the paper was easier than this time. better to wait 2-3 days till coaching answer keys settle."

To "anyone from Bihar appeared today":
"yep gave the morning shift in Patna, paper was okay-ish. CSAT felt tight, GS was manageable. how was yours?"`;

/** Result envelope. authorName + content go straight into DiscussionMessage. */
export interface AiReply {
  authorName: string;
  content: string;
}

/** Input — caller passes the thread context and the recent messages
 *  (oldest first). Last entry is the user's just-posted message. */
export interface ReplyContext {
  threadTitle: string;
  examShortName?: string | null;
  /** Last 3-5 messages in the thread, oldest first. Last one is the
   *  user's message we're replying to. */
  messages: Array<{ authorName: string | null; content: string }>;
  /** Names already used by AI in this thread (so we vary). */
  recentAiNames?: ReadonlyArray<string>;
}

/**
 * Generate a peer-style reply via Claude. Returns null if the model
 * fails or returns something unusable — callers should silently skip
 * (the user's post still went through fine).
 */
export async function generateAiReply(ctx: ReplyContext): Promise<AiReply | null> {
  const exam = ctx.examShortName ? `Exam: ${ctx.examShortName}\n` : "";
  const thread = `Thread title: "${ctx.threadTitle}"\n`;
  const convo = ctx.messages
    .slice(-5)
    .map((m, i, arr) => {
      const who = i === arr.length - 1 ? "STUDENT (just posted, reply to this)" : (m.authorName ?? "someone");
      return `${who}: ${m.content}`;
    })
    .join("\n\n");

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 250,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${exam}${thread}\n${convo}\n\nWrite ONE short peer-style reply (1-3 sentences) to the last STUDENT post. Output the reply text only, no prefix.`,
        },
      ],
    });

    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;

    // Clean up — strip surrounding quotes, "Reply:" prefixes, leading
    // dashes Claude sometimes adds despite the prompt.
    let content = block.text.trim();
    content = content.replace(/^["“”'`]+|["“”'`]+$/g, "");
    content = content.replace(/^(reply|response)[:\-—]\s*/i, "");
    content = content.replace(/^[-—]\s*/, "");
    content = content.trim();

    if (content.length < 8 || content.length > 600) return null;

    return {
      authorName: pickSyntheticHandle(ctx.recentAiNames),
      content,
    };
  } catch (err) {
    console.error("[discussion-reply] Claude call failed:", err);
    return null;
  }
}
