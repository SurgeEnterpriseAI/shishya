// GET /api/me/state?examCode=SSC_CGL — current StudentState for the signed-in user

import { auth } from "@/lib/auth";
import { getStudentState } from "@/lib/db/student-state";
import { bad, ok, serverError, unauth } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();

    const url = new URL(req.url);
    const examCode = url.searchParams.get("examCode");
    if (!examCode) return bad("examCode is required");

    const state = await getStudentState(session.user.id, examCode);
    return ok({ state });
  } catch (err: any) {
    if (String(err?.message ?? "").includes("not enrolled")) {
      // Not an error per se — just no state yet
      return ok({ state: null, reason: "NOT_ENROLLED" });
    }
    return serverError(err);
  }
}
