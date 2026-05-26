// POST /api/institutions/signup — self-service institution signup.
//
// Body: {
//   institutionName: string,
//   adminName: string,
//   email: string,
//   password: string,
// }
//
// Creates an Institution + the first InstitutionUser (role ADMIN) in
// a single transaction, hashes the password, issues a session cookie,
// and returns the new institution's slug so the client can redirect
// to /i/dashboard.
//
// Validation:
//   - email format (basic regex; we don't email-verify on v1)
//   - password ≥ 8 chars, has letter + digit
//   - institutionName ≥ 3 chars
//   - email must not exist anywhere in InstitutionUser
//
// Slug generation: slugify(name) → fall back to suffix-counter if
// already taken so different "Rao IAS Academy" listings don't collide.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  hashPassword,
  issueInstitutionSession,
  slugify,
} from "@/lib/institution-auth";

export const runtime = "nodejs";

const Body = z.object({
  institutionName: z.string().min(3).max(120).trim(),
  adminName: z.string().min(2).max(80).trim(),
  email: z.string().email().max(120).toLowerCase().trim(),
  password: z.string().min(8).max(120).regex(/[A-Za-z]/, "need a letter").regex(/[0-9]/, "need a digit"),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.issues[0]?.message ?? "invalid input" : "bad body";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Email collision check — InstitutionUser.email is @unique so the
  // insert would throw anyway, but a friendly pre-check avoids
  // confusing 500-style error messages on the form.
  const existing = await prisma.institutionUser.findUnique({
    where: { email: body.email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try logging in instead." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(body.password);
  const slug = await pickUniqueSlug(body.institutionName);

  // Transaction so we never end up with an orphan Institution row
  // if the admin-user insert fails.
  const created = await prisma.$transaction(async (tx) => {
    const inst = await tx.institution.create({
      data: {
        slug,
        name: body.institutionName,
        contactEmail: body.email,
        // Defaults handle active/verified/etc.
      },
    });
    const admin = await tx.institutionUser.create({
      data: {
        institutionId: inst.id,
        email: body.email,
        passwordHash,
        name: body.adminName,
        role: "ADMIN",
        lastLoginAt: new Date(),
      },
    });
    return { inst, admin };
  });

  await issueInstitutionSession({
    userId: created.admin.id,
    institutionId: created.inst.id,
    sessionEpoch: created.admin.sessionEpoch,
  });

  return NextResponse.json({
    ok: true,
    slug: created.inst.slug,
    institutionId: created.inst.id,
  });
}

async function pickUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  // Try the base first; then -2, -3, … up to 50. After that we just
  // append a short random suffix so we don't loop forever on a
  // pathological name.
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const taken = await prisma.institution.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36).slice(-5)}`;
}
