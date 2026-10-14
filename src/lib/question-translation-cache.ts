// A question's cached translations go in the same transaction as any write
// that changes the text they were made from (14 Oct 2026).
//
// Why: a QuestionTranslation row is a translation of the question's stem,
// options and solution AS THEY WERE when it was written. The readers (mock
// player, results page, guest quiz, topic pages) serve a cached row whenever
// one exists, and the cache writers (src/lib/db/questionTranslations.ts
// upsertTranslation: the translate routes, the night pre-translation, the
// backfill and prewarm scripts) only fill a missing row, never refresh one.
// So a writer that changed the key or the solution and left the cache gave
// Hindi, Telugu, Tamil… readers the corrected key beside a translated
// solution that argues for the old one. The 13 Oct 2026 translation review
// found it from every writer: the answer check (scripts/verify-question-bank.ts,
// 1,199 rows, cleared by scripts/clear-stale-translations-10-2026.ts), the
// student-report sweep (src/lib/question-sweep.ts and its CLI twin
// scripts/fix-reported-questions.ts: 34 rows on 26 questions on 14 Oct) and the admin
// editor (src/app/api/admin/questions/[id]/route.ts, which records no edit at
// all). scripts/clear-stale-translations-10-2026b.ts clears what is left.
//
// The rule: a write that changes a question's body, options, answerKey or
// solution runs inside an interactive transaction and calls
// clearQuestionTranslations(tx, questionId) in it, so the question and its
// cache can never disagree after a commit: both change, or neither does.
// changedTranslatedFields() says whether an update changes any of them (the
// admin editor sends every field on every save; an unchanged save keeps the
// cache). The next reader in that language gets a fresh translation of the
// new text on demand or from the night pre-translation; until then the
// question shows in English, never a translation of text that is gone.
// tests/unit/question-translation-cache-writers.test.ts scans src/ and
// scripts/ for every Question write and fails on one that may change these
// fields outside a transaction that calls this helper.
//
// Not closed by the transaction: a translate request that READ the old row
// before the commit and writes its translation after it (seconds for a
// student's request; up to a batch's run for the night pre-translation).
// The window is that request's own latency. None has been seen: on 14 Oct
// the nearest cache row written after an exactly-timed key change came 3.2 h
// later (the margin scripts/clear-stale-translations-10-2026b.ts prints).
// Closing it fully means a source check in upsertTranslation (write only if
// the question still has the text that was translated).
//
// No prisma import here: the caller passes its transaction client, so this
// module is safe to import from scripts and tests.

/** The question fields a cached translation is made from (body, options,
 *  solution) or argues for (answerKey). */
export const TRANSLATED_FIELDS = ["body", "options", "answerKey", "solution"] as const;
export type TranslatedField = (typeof TRANSLATED_FIELDS)[number];

/** The slice of a Prisma (interactive-transaction) client the helper uses. */
export interface TranslationCacheTx {
  questionTranslation: {
    deleteMany(args: { where: { questionId: string } }): PromiseLike<{ count: number }>;
  };
}

/** Removes every cached translation of the question. Call it with the
 *  transaction client of the write that changes the question's body,
 *  options, key or solution, in that same transaction. Returns how many
 *  cache rows went. */
export async function clearQuestionTranslations(tx: TranslationCacheTx, questionId: string): Promise<number> {
  if (typeof questionId !== "string" || !questionId) throw new Error("clearQuestionTranslations: a question id is required");
  const r = await tx.questionTranslation.deleteMany({ where: { questionId } });
  return r.count;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** JSON with object keys sorted, so two option lists compare by content. */
function canonical(v: unknown): string {
  return JSON.stringify(v ?? null, (_k, x) => (isObj(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
}

/** The translated fields an update's `data` changes, compared with the row as
 *  read before the write. A field the update leaves out (absent or
 *  undefined) is unchanged; null and "" are the same empty text. */
export function changedTranslatedFields(
  before: Partial<Record<TranslatedField, unknown>>,
  data: Partial<Record<TranslatedField, unknown>>,
): TranslatedField[] {
  const out: TranslatedField[] = [];
  for (const f of TRANSLATED_FIELDS) {
    if (!(f in data) || data[f] === undefined) continue;
    const same = f === "options" ? canonical(data[f]) === canonical(before[f]) : String(data[f] ?? "") === String(before[f] ?? "");
    if (!same) out.push(f);
  }
  return out;
}
