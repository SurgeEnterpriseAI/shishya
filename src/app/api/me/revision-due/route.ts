// GET /api/me/revision-due?exam=SSC_CGL&limit=8
//
// Topics whose FSRS memory is due for review — "what should I revise
// today". Backed by ReviewState, which updates on every mock submission.
// Returns an empty list (not an error) for students with no review history
// yet, so the dashboard card can simply hide itself.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { ok, unauth, serverError } from "@/lib/http";
import { getDueRevisions } from "@/lib/db/revision-due";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();

    const url = new URL(req.url);
    const examCode = url.searchParams.get("exam") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? 8);

    const due = await getDueRevisions(session.user.id, {
      examCode,
      limit: Number.isFinite(limit) ? limit : 8,
    });

    return ok({ due });
  } catch (err) {
    return serverError(err);
  }
}
