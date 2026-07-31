// POST /api/ask { question } → { answer, usedWeb }
// The AI answer engine — anonymous-allowed (zero friction), rate
// limited per user/IP. Web-fallback queries are logged as content-gap
// signals: what people ask that Shishya can't yet answer internally is
// the content factory's next assignment.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { z } from "zod";
import { auth } from "@/lib/auth";
import { runAsk } from "@/lib/ask-engine";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { recordEvent } from "@/lib/analytics";

const Body = z.object({ question: z.string().min(3).max(800) });

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  const rl = await checkRateLimit("ask", userId ?? `anon:${clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a real question (3+ characters)." }, { status: 400 });

  try {
    const result = await runAsk(parsed.data.question);

    // Content-gap flywheel: a web-fallback means Shishya's own data
    // couldn't answer — log the question so the factory can close it.
    void recordEvent({
      kind: "CTA_CLICKED",
      userId,
      anonId: null,
      path: "/ask",
      props: {
        surface: "ask",
        webFallback: result.usedWeb,
        tools: result.toolsUsed.join(","),
        q: parsed.data.question.slice(0, 200),
      },
    });

    return Response.json({ answer: result.answer, usedWeb: result.usedWeb });
  } catch {
    return Response.json(
      { error: "The answer engine hiccuped — please try again." },
      { status: 502 },
    );
  }
}
