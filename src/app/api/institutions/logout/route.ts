// POST /api/institutions/logout — clears the shishya_inst cookie.
// No body, no auth required (idempotent — calling it without a
// session is fine, the user just stays logged-out).

import { NextResponse } from "next/server";
import { clearInstitutionSession } from "@/lib/institution-auth";

export const runtime = "nodejs";

export async function POST() {
  await clearInstitutionSession();
  return NextResponse.json({ ok: true });
}
