// POST /api/me/preferences — persist the signed-in student's language.
//
// Body: { lang: string } — an i18n locale ("hi") or a Language enum code
// ("HI"). Writes User.preferredLang and nothing else.
//
// Called fire-and-forget by <LangSwitcher /> (header) and
// <QuestionLangSwitcher /> (in-mock / results picker), and by the onboarding
// wizard through /api/me/onboarding-profile. Guests get a 401 and nothing
// else happens — the shishya-lang cookie path is untouched. Locales with no
// Language enum value (as, kok, ks, mni, ne, or, sa, sd, ur) reply
// ok + stored:null and write nothing. Never a model call.
//
// Constants and the resolution rule live in src/lib/preferred-lang.ts —
// route files export handlers only (a non-handler export breaks the Next
// build type-check).

export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, ok, parseBody, serverError, unauth } from "@/lib/http";
import { localeToLanguage } from "@/lib/preferred-lang";

const Body = z.object({ lang: z.string().min(2).max(3) });

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();
    const body = await parseBody(req, Body);

    // "hi" and "HI" both land on HI; "kok" (no enum value) → null.
    const code = localeToLanguage(body.lang);
    if (!code) return ok({ ok: true, stored: null, reason: "UNSUPPORTED_LOCALE" });

    // Raw UPDATE with an explicit enum cast (same pattern as
    // /api/facts/[id]/verify) — keeps this independent of client typegen.
    await prisma.$executeRaw`
      UPDATE "User"
      SET "preferredLang" = ${code}::"Language",
          "updatedAt" = NOW()
      WHERE "id" = ${session.user.id}
    `;
    return ok({ ok: true, stored: code });
  } catch (err: any) {
    if (err?.status === 400) return bad(String(err.message ?? "Invalid body"));
    return serverError(err);
  }
}
