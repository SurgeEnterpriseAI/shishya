// POST /api/institutions/login — institution admin sign-in.
//
// Body: { email, password }
//
// On success: issues a session cookie, returns the institution slug
// so the client can redirect to /i/dashboard.
// On failure: returns a generic 401 (don't leak whether the email
// exists vs the password being wrong — standard auth hygiene).
//
// We also bump InstitutionUser.lastLoginAt — useful for the admin
// audit log later.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { issueInstitutionSession, verifyPassword } from "@/lib/institution-auth";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(120).toLowerCase().trim(),
  password: z.string().min(1).max(120),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.institutionUser.findUnique({
    where: { email: body.email },
    include: { institution: true },
  });
  // Constant-time-ish: always run a bcrypt compare even if user is
  // null, against a dummy hash, so timing doesn't reveal account
  // existence. (bcrypt is slow either way; this is belt-and-braces.)
  const DUMMY_HASH = "$2a$12$" + "C".repeat(53);
  const ok = user
    ? await verifyPassword(body.password, user.passwordHash)
    : (await verifyPassword(body.password, DUMMY_HASH), false);

  if (!user || !ok) {
    return NextResponse.json(
      { error: "Wrong email or password" },
      { status: 401 },
    );
  }
  if (!user.institution.active) {
    return NextResponse.json(
      { error: "This institution account is currently disabled. Email shishya support." },
      { status: 403 },
    );
  }

  await prisma.institutionUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await issueInstitutionSession({
    userId: user.id,
    institutionId: user.institutionId,
    sessionEpoch: user.sessionEpoch,
  });

  return NextResponse.json({
    ok: true,
    slug: user.institution.slug,
    institutionId: user.institutionId,
  });
}
