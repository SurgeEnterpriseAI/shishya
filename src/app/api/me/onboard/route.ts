// POST /api/me/onboard — mark the signed-in user as having seen the
// first-time onboarding tour. Idempotent: if already set, returns 200.
//
// The dashboard reads User.onboardedAt to decide whether to mount
// <OnboardingTour />. Setting this stamps the tour as "Done" or
// "Skipped" — either way it never shows again unless the column is
// nulled manually.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ok, serverError, unauth } from "@/lib/http";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();

    // Use raw SQL so we don't depend on Prisma client re-generation. Once
    // the next deploy regenerates the client, this can switch to the typed
    // prisma.user.update path — leaving the raw form is harmless either way.
    await prisma.$executeRaw`
      UPDATE "User"
      SET "onboardedAt" = NOW()
      WHERE "id" = ${session.user.id}
        AND "onboardedAt" IS NULL
    `;
    return ok({ ok: true });
  } catch (err: any) {
    return serverError(err);
  }
}
