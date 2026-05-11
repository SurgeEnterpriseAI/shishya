// Repository for the QuestionTranslation cache table.
//
// We use $queryRawUnsafe / $executeRawUnsafe instead of the typed Prisma
// client because the popularity-sweep job was holding the Windows DLL
// lock when this code first landed and we couldn't regenerate the client.
// Runtime is identical; only TypeScript loses awareness of this one
// table. Once the lock clears, this file can be rewritten to use
// prisma.questionTranslation.* without changing callers.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface CachedTranslation {
  questionId: string;
  locale: string;
  body: string;
  options: Array<{ key: string; text: string }>;
  solution: string;
}

/** Fetch any cached translations for these (questionId, locale) pairs. */
export async function findTranslations(
  questionIds: string[],
  locale: string,
): Promise<Map<string, CachedTranslation>> {
  if (questionIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{
    questionId: string;
    locale: string;
    body: string;
    options: any;
    solution: string;
  }>>(Prisma.sql`
    SELECT "questionId", "locale", "body", "options", "solution"
      FROM "QuestionTranslation"
     WHERE "locale" = ${locale}
       AND "questionId" IN (${Prisma.join(questionIds)})
  `);
  const out = new Map<string, CachedTranslation>();
  for (const r of rows) {
    out.set(r.questionId, {
      questionId: r.questionId,
      locale: r.locale,
      body: r.body,
      options: Array.isArray(r.options) ? r.options : [],
      solution: r.solution,
    });
  }
  return out;
}

/** Upsert a translation. Last-write-wins per (questionId, locale). */
export async function upsertTranslation(t: {
  questionId: string;
  locale: string;
  body: string;
  options: Array<{ key: string; text: string }>;
  solution: string;
  generator?: string;
}): Promise<void> {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "QuestionTranslation" ("id", "questionId", "locale", "body", "options", "solution", "generator", "createdAt")
    VALUES (
      ${`qt_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`},
      ${t.questionId},
      ${t.locale},
      ${t.body},
      ${JSON.stringify(t.options)}::jsonb,
      ${t.solution},
      ${t.generator ?? null},
      NOW()
    )
    ON CONFLICT ("questionId", "locale") DO UPDATE SET
      "body" = EXCLUDED."body",
      "options" = EXCLUDED."options",
      "solution" = EXCLUDED."solution",
      "generator" = EXCLUDED."generator",
      "createdAt" = NOW()
  `);
}
