// POST /api/chat-route — Claude-powered intent router for the
// homepage chat popup. Visitor types a free-form sentence ("I'm in
// class 12 PCM and want IIT", "show me banking exams", "ssc cgl
// last year cutoff"); we return a destination URL plus a 1-line
// human-readable explanation of why we picked it.
//
// Why we route via Claude instead of a keyword matcher:
//   Indian aspirants describe intent in 22 languages, with code-
//   mixing, transliteration, and exam slang ("PSC", "NEET PG",
//   "civils", "CET"). Building a regex/lookup for that surface is
//   a rabbit hole; Claude handles it for ~$0.003 per call.
//
// Output is always one of a fixed set of URL templates so we can
// never route to a page that doesn't exist. The model picks WHICH
// template via tool-use, and we substitute the slug/code server-side.

import { NextResponse, type NextRequest } from "next/server";
import { anthropic, MODEL } from "@/lib/ai/client";
import { prisma } from "@/lib/db/prisma";
import { EXAM_GOALS } from "@/data/exam-goals";

export const runtime = "nodejs";
export const maxDuration = 15;

interface RouteResult {
  url: string;
  /** ≤ 120-char explanation shown to the user before the navigation. */
  why: string;
  /** Used by analytics + the client to decide auto-redirect vs confirm. */
  confidence: "high" | "medium" | "low";
}

const SYSTEM_PROMPT = `You are the intent router for Shishya, a free Indian exam-prep platform. A visitor has typed a message describing what they're looking for. Your job is to route them to the right page on the site.

ROUTING TARGETS (use the route_to tool):
- "exam_page": jump to /exams/<CODE> when the user names a specific exam (e.g. SSC CGL, NEET UG, JEE Main, UPSC Prelims, CAT, GATE CSE, RRB NTPC, IBPS PO, MHT-CET, NDA, CTET, etc.). Use the exact uppercase code with underscores.
- "goal_page": jump to /?g=<slug> when the user names a goal/category but not a specific exam. Valid slugs: engineering, medical, government-jobs, banking, civil-services, teaching, law, mba, defence, olympiad.
- "phase_article": jump to /exams/<CODE>/<phase> for time-sensitive coverage. Phases: checklist (T-7 to T-1), live (exam day), reactions (T+1 to T+3). Use only when the user explicitly asks for cutoff, analysis, difficulty, last-minute revision, or reactions.
- "discussions": jump to /discussions when the user wants to ask other students.
- "chat": jump to /chat for general study help, doubt-solving, or "explain this concept" requests.
- "unclear": when the message doesn't map to any of the above (e.g. "hi", "what is shishya"). Set url to "/" and explain we couldn't tell.

OUTPUT RULES:
- The "why" field is a friendly one-liner to display before navigation, e.g. "Taking you to UPSC Prelims — looks like that's your target exam."
- Always preserve the user's language: if they typed in Hindi, reply why in Hindi.
- confidence: "high" if exam name explicit; "medium" if goal/category; "low" if unclear.`;

const ROUTE_TOOL = {
  name: "route_to",
  description: "Send the visitor to the right page on Shishya.",
  input_schema: {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: ["exam_page", "goal_page", "phase_article", "discussions", "chat", "unclear"],
        description: "Which kind of page to send the visitor to.",
      },
      examCode: {
        type: "string",
        description: "Uppercase exam code with underscores (e.g. SSC_CGL, NEET_UG, JEE_MAIN). Required when target is exam_page or phase_article.",
      },
      goalSlug: {
        type: "string",
        enum: ["engineering", "medical", "government-jobs", "banking", "civil-services", "teaching", "law", "mba", "defence", "olympiad"],
        description: "Goal slug. Required when target is goal_page.",
      },
      phase: {
        type: "string",
        enum: ["checklist", "live", "reactions"],
        description: "Phase article variant. Required when target is phase_article.",
      },
      why: {
        type: "string",
        description: "One-line user-facing explanation. ≤120 chars. Preserve the user's language.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
    },
    required: ["target", "why", "confidence"],
  },
} as const;

export async function POST(req: NextRequest) {
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message || message.length < 2) {
    return NextResponse.json({ error: "message too short" }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
      tools: [ROUTE_TOOL],
      tool_choice: { type: "tool", name: ROUTE_TOOL.name },
    });

    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json<RouteResult>({
        url: "/",
        why: "Couldn't quite read that — try naming the exam (e.g. 'SSC CGL') or the goal ('engineering').",
        confidence: "low",
      });
    }

    const input = toolUse.input as {
      target: string;
      examCode?: string;
      goalSlug?: string;
      phase?: string;
      why: string;
      confidence: "high" | "medium" | "low";
    };

    const result = await resolveTarget(input);
    return NextResponse.json<RouteResult>(result);
  } catch (err) {
    console.error("[chat-route] Claude call failed:", err);
    return NextResponse.json<RouteResult>({
      url: "/",
      why: "Routing is having a hiccup — try the search bar or pick a goal directly.",
      confidence: "low",
    });
  }
}

async function resolveTarget(input: {
  target: string;
  examCode?: string;
  goalSlug?: string;
  phase?: string;
  why: string;
  confidence: "high" | "medium" | "low";
}): Promise<RouteResult> {
  const why = (input.why ?? "").slice(0, 180);
  const confidence = input.confidence ?? "medium";

  switch (input.target) {
    case "exam_page": {
      if (!input.examCode) break;
      // Validate against the DB — Claude can hallucinate exam codes.
      const exam = await prisma.exam.findUnique({
        where: { code: input.examCode },
        select: { code: true },
      });
      if (!exam) break;
      return { url: `/exams/${exam.code}`, why, confidence };
    }
    case "phase_article": {
      if (!input.examCode || !input.phase) break;
      const exam = await prisma.exam.findUnique({
        where: { code: input.examCode },
        select: { code: true },
      });
      if (!exam) break;
      return { url: `/exams/${exam.code}/${input.phase}`, why, confidence };
    }
    case "goal_page": {
      if (!input.goalSlug) break;
      const goal = EXAM_GOALS.find((g) => g.slug === input.goalSlug);
      if (!goal) break;
      return { url: `/?g=${goal.slug}`, why, confidence };
    }
    case "discussions":
      return { url: "/discussions", why, confidence };
    case "chat":
      return { url: "/chat", why, confidence };
    case "unclear":
    default:
      return { url: "/", why: why || "Tell me a bit more — name an exam or a stage.", confidence: "low" };
  }
  // Fall-through for validation failures
  return { url: "/", why: "Couldn't match that exactly — landing you on the goal picker.", confidence: "low" };
}
