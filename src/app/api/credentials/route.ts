// POST /api/credentials — submit a new credential claim.
//
// Auth required. Stays PENDING until verified via community vouching
// (3 DE vouches in the same domain) OR admin grant. The institutional-
// email path is stubbed; it'll activate once email infra is in place.

import { z } from "zod";
import { auth } from "@/lib/auth";
import { bad, ok, parseBody, serverError, unauth } from "@/lib/http";
import { submitCredential } from "@/lib/db/credentials";

export const runtime = "nodejs";

const Body = z.object({
  domain: z.enum([
    "civil-services",
    "iit-nit-iiit",
    "medical",
    "iim-management",
    "nlu-law",
    "defence",
    "banking",
    "railways",
    "teaching",
    "research",
    "foreign-universities",
  ]),
  claimType: z.enum([
    "alumnus", "current_student", "currently_at", "working_at", "exam_cleared",
  ]),
  institution: z.string().min(2).max(120),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const body = await parseBody(req, Body);
    const id = await submitCredential({
      userId: session.user.id,
      domain: body.domain,
      claimType: body.claimType,
      institution: body.institution.trim(),
      notes: body.notes,
    });
    return ok({ id });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}
