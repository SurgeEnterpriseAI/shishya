// GET /api/me/late-answer?lang=en|hi|te — "Your question is answered" for the
// signed-in member, or nothing (7 Oct 2026, build B3 — rules and why in
// src/lib/late-answer-notice.ts). The strip under the header
// (src/components/LateAnswerStrip.tsx) asks after mount, at most once per tab
// in 10 minutes, so no page's server HTML carries it. The member's own latest
// late answer not opened yet, in the pick-up card's scope (general chats and
// active real exams, never a school chat) — the card's own read. Guests get
// 401 and nothing is read. Private and never cached. It writes nothing: the
// answer is marked seen only by the chat that shows it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { loadPickupLateAnswer } from "@/lib/db/pickup";
import { lateAnswerView } from "@/lib/pickup";

const NO_STORE = { "cache-control": "private, no-store" };

export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  if (!userId) return Response.json({ answered: null }, { status: 401, headers: NO_STORE });

  const lang = new URL(req.url).searchParams.get("lang");
  const now = new Date();
  const late = await loadPickupLateAnswer(userId, { now }).catch((err) => {
    console.error("[late-answer] read failed:", err);
    return null;
  });
  return Response.json({ answered: late ? lateAnswerView(late, lang, now) : null }, { headers: NO_STORE });
}
