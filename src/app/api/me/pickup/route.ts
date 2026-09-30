// GET /api/me/pickup?examCode=CODE&lang=en|hi|te — "Pick up where you left
// off" for the signed-in member (30 Sep 2026; rules in src/lib/pickup.ts).
//
// The hub's member strip (src/components/MemberPickupStrip.tsx) calls it
// after mount, so the hub's server HTML never carries it. With examCode: this
// exam only (a real exam, resolved through realExamKey — a school container,
// an inactive exam or an unknown code is 404); without: general chats and
// every active real exam. Always the member's own rows; guests get 401 and
// nothing is read. Private and never cached.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { loadPickup } from "@/lib/db/pickup";
import { pickupView } from "@/lib/pickup";

const NO_STORE = { "cache-control": "private, no-store" };
const EXAM_CODE_RE = /^[A-Za-z0-9_-]{2,64}$/;

export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  if (!userId) return Response.json({ view: null }, { status: 401, headers: NO_STORE });

  const sp = new URL(req.url).searchParams;
  const lang = sp.get("lang");
  const code = (sp.get("examCode") ?? "").trim();
  let examId: string | null = null;
  if (code) {
    if (!EXAM_CODE_RE.test(code)) return Response.json({ view: null }, { status: 400, headers: NO_STORE });
    const exam = await prisma.exam
      .findUnique({ where: realExamKey({ code }), select: { id: true, active: true } })
      .catch(() => null);
    if (!exam || !exam.active) return Response.json({ view: null }, { status: 404, headers: NO_STORE });
    examId = exam.id;
  }

  const now = new Date();
  const data = await loadPickup(userId, { examId, now });
  return Response.json({ view: pickupView(data, lang, now) }, { headers: NO_STORE });
}
