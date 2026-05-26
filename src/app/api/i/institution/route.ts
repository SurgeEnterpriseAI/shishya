// PATCH /api/i/institution — institution-admin updates their own
// institution's profile. Reads the session cookie via
// requireInstitutionSession so unauthenticated requests 302 to
// /login/institution.
//
// Editable fields (whitelist — never trust the client):
//   tagline, description, logoUrl, websiteUrl, contactPhone,
//   city, state, modes, examCodes
//
// Deliberately NOT editable from this endpoint:
//   - name, slug   (changing the slug breaks inbound links)
//   - contactEmail (tied to the admin login)
//   - verified, active (controlled by Shishya admins, not the
//     institution itself)
// Those need a separate /api/admin path with platform-admin rights.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireInstitutionSession } from "@/lib/institution-auth";

export const runtime = "nodejs";

const MODE_VALUES = ["ONLINE", "OFFLINE", "HYBRID"] as const;
const Body = z.object({
  tagline: z.string().max(160).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  logoUrl: z
    .string()
    .url()
    .max(500)
    .refine((u) => /^https:\/\//i.test(u), "logoUrl must be https://")
    .nullable()
    .optional(),
  websiteUrl: z
    .string()
    .url()
    .max(500)
    .refine((u) => /^https?:\/\//i.test(u), "websiteUrl must start with http(s)://")
    .nullable()
    .optional(),
  contactPhone: z.string().max(20).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  state: z.string().max(2).nullable().optional(), // ISO 2-letter
  modes: z.array(z.enum(MODE_VALUES)).max(3).optional(),
  examCodes: z.array(z.string().max(40)).max(50).optional(),
});

export async function PATCH(req: NextRequest) {
  const { institution } = await requireInstitutionSession();

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    const msg =
      err instanceof z.ZodError ? err.issues[0]?.message ?? "invalid input" : "bad body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Build the update object explicitly so undefined fields are
  // skipped (vs being set to null / empty array).
  const data: Record<string, unknown> = {};
  if (body.tagline !== undefined) data.tagline = body.tagline?.trim() || null;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl?.trim() || null;
  if (body.websiteUrl !== undefined) data.websiteUrl = body.websiteUrl?.trim() || null;
  if (body.contactPhone !== undefined) data.contactPhone = body.contactPhone?.trim() || null;
  if (body.city !== undefined) data.city = body.city?.trim() || null;
  if (body.state !== undefined) data.state = body.state?.toUpperCase().trim() || null;
  if (body.modes !== undefined) data.modes = body.modes;
  if (body.examCodes !== undefined) data.examCodes = body.examCodes.map((c) => c.toUpperCase());

  await prisma.institution.update({
    where: { id: institution.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
