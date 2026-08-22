// Opt-out helper for crons that select recipients via the typed Prisma
// client. The generated client on dev machines predates User.emailOptOut
// (established pattern: raw SQL for new columns), so crons exclude
// opted-out users with `id: { notIn: await optedOutUserIds() }` instead
// of a typed `emailOptOut: false` filter. Selection-time exclusion is the
// first gate; sendEmail() enforces it again (fail-closed) at send time.

import { prisma } from "./db/prisma";

export async function optedOutUserIds(): Promise<string[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User" WHERE "emailOptOut" = TRUE`;
    return rows.map((r) => r.id);
  } catch {
    // If we can't read opt-outs, callers still hit the fail-closed check
    // inside sendEmail — so returning [] here is safe, not leaky.
    return [];
  }
}
