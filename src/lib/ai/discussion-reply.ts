// AI reply for discussion threads — signed "Shishya AI".
//
// WHY THIS EXISTS
// 27 May 2026 stats: 98 signups, ~70 mock attempts, ~2 AI chats/24h.
// Real student posts got zero replies and the conversation died.
// Visitors who post once and see silence don't post again.
//
// WHAT IT IS (rewritten 11 Sep 2026 audit)
// When a real user posts in a thread, after a small delay (8-25 s) the
// platform's AI posts back. The reply:
//   - is short (1-3 sentences), warm and peer-like in TONE
//   - is openly the platform's AI: stored and rendered under the name
//     AI_REPLY_AUTHOR ("Shishya AI"), and the prompt no longer forbids
//     saying so. Until this rewrite it role-played a fellow student under
//     an invented name ("Aarav S.") with fabricated exam-hall anecdotes,
//     under an instruction never to disclose it was AI — a fabricated
//     peer, which the founder rules (no synthetic social proof) forbid.
//   - never claims definitive facts (cutoffs, dates) — those vary and a
//     hallucinated number hurts a student
//
// The reply is generated in src/app/api/discussions/[id]/messages via
// Next 15's `after()` so it runs AFTER the user's POST returns — adds
// zero latency to the post itself. That route stores it with
// authorId = null, which together with this name is the AI marker the
// thread page renders on.

import { anthropic, MODEL } from "./client";
import { recordAiUsage } from "./usage";

/** The one name AI replies are stored and rendered under. */
export const AI_REPLY_AUTHOR = "Shishya AI";

const SYSTEM_PROMPT = `You are Shishya AI, replying in a discussion thread on Shishya, a free Indian government-exam prep platform. Your reply is shown under the name "Shishya AI", so everyone can see it comes from the platform's AI — never pretend otherwise.

You are NOT a fellow student. You have not sat any exam; you have no batch, no shift, no city, no score of your own. Never invent a personal experience ("I gave the morning shift", "in my batch we did…"). When it helps, say plainly that you are Shishya's AI.

STYLE
- 1-3 sentences. Short is good.
- Warm, casual, peer-to-peer tone. Hinglish or a regional word is fine when it matches the post — don't force it.
- React to what they actually said. Anxious → normalise it and give one concrete next step. Factual question → say what is generally known and point them to the official notification / answer key for the exact figure.
- Vary endings: sometimes a question back, sometimes a tip, sometimes plain encouragement.

DO NOT
- Don't sign off with a name. The system shows "Shishya AI".
- Don't claim hard facts you can't be sure of (category-wise cutoffs, exact dates, "the official answer is X"). A wrong number hurts a student more than a vague reply helps.
- Don't sound like a formal tutor or a customer-care bot. "Hope this helps!" / "Best regards" → never.
- Don't promote products or coaching.
- Don't reply with just emoji. Words matter.

OUTPUT
A single reply string. No quotes around it, no "Reply:" prefix.

EXAMPLES of good replies:

To "Scored 68 in mock, feeling hopeless":
"68 at this stage is honestly fine — mock difficulty swings a lot. Look at which section dropped, fix that one, and the next score usually moves. Don't measure yourself against rankers' posts, they're outliers."

To "what's expected cutoff for general this year":
"Hard to say till the answer keys settle — last cycle's number is a rough anchor, but paper difficulty and vacancies move it every year. Give it 2-3 days after the official key, then compare with your own count."

To "anyone from Bihar appeared today":
"I'm Shishya's AI, so I wasn't in the hall — but plenty of Bihar aspirants practise here. Post how your shift went (which section felt tight) and others in the thread can compare notes."`;

/** Result envelope. authorName + content go straight into DiscussionMessage. */
export interface AiReply {
  /** Always AI_REPLY_AUTHOR — the visible marker that this is the platform's AI. */
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
  /** Legacy — the caller still passes the names of earlier AI replies in
   *  the thread. Ignored since 11 Sep 2026: every AI reply is signed
   *  AI_REPLY_AUTHOR; there are no personas to rotate. */
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

    recordAiUsage("discussion-reply", res, { model: MODEL });

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
      authorName: AI_REPLY_AUTHOR,
      content,
    };
  } catch (err) {
    console.error("[discussion-reply] Claude call failed:", err);
    return null;
  }
}
