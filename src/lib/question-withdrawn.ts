// Withdrawn questions stay withdrawn under bulk validation.
//
// 25 Sep 2026: a question is withdrawn by tagging it "rejected" (with
// metadata.rejectedBy) and leaving it validated:false — the admin editor's
// Reject button, and the data fix (rejectedBy datafix:sbi-q-fix-sep24) that
// withdrew an SBI Clerk question with no correct option. The bulk
// validate route, /api/admin/questions/bulk-validate, re-validated EVERY
// unvalidated question matching its filter, withdrawn or not, so one bulk run
// would have put that question back in front of students. So did the two
// bulk scripts (scripts/sme-bulk-validate.ts, scripts/validate-all-ai-questions.ts).
//
// A bulk flip is for the never-reviewed pending pool only. It now holds back:
//   • rows tagged "rejected" — withdrawn by an admin or a data fix;
//   • rows that were validated once and later pulled (validatedAt set,
//     validated false) — the answer-key sweep's "no clean correct option"
//     invalidations and admin Un-validate ("found a bug post-publish"). 28
//     such rows sat in the pending pool on 25 Sep (17 AI_VALIDATED, 10 PYQ,
//     1 AI_GENERATED), none of them tagged;
//   • rows the answer-check firewall (scripts/verify-question-bank.ts) already
//     failed — metadata.factoryVerify on an unvalidated row. An ACCEPT (or a
//     corrected key) always sets validated:true, so a validated:false row with
//     factoryVerify was judged REJECT, REVIEW (ambiguous, low agreement) or
//     broken in shape. The firewall leaves validatedAt unset and adds no tag,
//     and never re-checks a row that carries factoryVerify, so without this a
//     bulk flip would put its failures live for good. 102 such rows sat in the
//     pending pool on 25 Sep (AP_APPSC_GROUP2 47, TS_POLICE_PC 29, UK_UKSSSC 26).
// Any of these can still be validated one at a time in the admin editor: that
// single-question Validate is the deliberate override, and it clears the
// tag (tagsAfterAdminEdit). A plain "Save edits" on a withdrawn question used
// to drop the tag too (the editor never sends it back); now the tag stays.
//
// Pure — no DB. Tests: tests/unit/question-withdrawn.test.ts

import { Prisma } from "@prisma/client";

/** The tag that marks a withdrawn question. */
export const WITHDRAWN_TAG = "rejected";

/** Rows the answer-check firewall has checked (metadata.factoryVerify present and not null). */
const FIREWALL_CHECKED: Prisma.QuestionWhereInput = {
  metadata: { path: ["factoryVerify"], not: Prisma.AnyNull },
};

/**
 * The rows a BULK validate may flip: unvalidated, never validated before,
 * not withdrawn, not failed by the answer-check firewall. Spread it over the
 * caller's own filter (exam, topic, source, search) — it sets only validated,
 * validatedAt and NOT.
 */
export const BULK_VALIDATABLE: Prisma.QuestionWhereInput = {
  validated: false,
  validatedAt: null,
  NOT: [{ tags: { has: WITHDRAWN_TAG } }, FIREWALL_CHECKED],
};

/**
 * The unvalidated rows a bulk validate holds back (the complement of
 * BULK_VALIDATABLE within validated:false) — for counts and messages.
 */
export const BULK_HELD_BACK: Prisma.QuestionWhereInput = {
  validated: false,
  OR: [{ tags: { has: WITHDRAWN_TAG } }, { validatedAt: { not: null } }, FIREWALL_CHECKED],
};

/** What a bulk validate would do with one row — the same rule as BULK_VALIDATABLE, for tests and scripts. */
export function bulkValidateVerdict(q: {
  validated: boolean;
  validatedAt?: Date | string | null;
  tags?: readonly string[] | null;
  metadata?: unknown;
}): "already-validated" | "withdrawn" | "pulled" | "failed-check" | "eligible" {
  if (q.validated) return "already-validated";
  if ((q.tags ?? []).includes(WITHDRAWN_TAG)) return "withdrawn";
  if (q.validatedAt != null) return "pulled";
  const meta = q.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta) && (meta as Record<string, unknown>).factoryVerify != null) {
    return "failed-check";
  }
  return "eligible";
}

/** The admin-facing note for held-back rows ("" when none). */
export function heldBackNote(heldBack: number): string {
  if (!heldBack) return "";
  return ` ${heldBack} withdrawn, previously pulled or answer-check-failed question${heldBack === 1 ? "" : "s"} left as they are — validate those one at a time in the editor.`;
}

/**
 * The bulk-validate guard: the admin confirms the number they saw. The admin
 * list shows every unvalidated row matching the filter (withdrawn and pulled
 * ones included), so that number is accepted as well as the exact eligible
 * count — each still has to match the rows as they are now.
 */
export function bulkConfirmMatches(confirmCount: number, eligible: number, heldBack: number): boolean {
  return confirmCount === eligible || confirmCount === eligible + heldBack;
}

export type AdminQuestionAction = "reject" | "validate" | "unvalidate" | "save";

/**
 * A question's tags after an admin PATCH. `requested` is the tag list the
 * editor sent (it always leaves "rejected" out), or null when none was sent.
 *   • reject   → the tag is added (once);
 *   • validate → the deliberate single-question override: the tag is cleared;
 *   • save / unvalidate → a withdrawn question stays withdrawn.
 */
export function tagsAfterAdminEdit(input: {
  existing: readonly string[] | null | undefined;
  requested?: readonly string[] | null;
  action: AdminQuestionAction;
}): string[] {
  const existing = input.existing ?? [];
  const base = [...(input.requested ?? existing)];
  const withTag = () => (base.includes(WITHDRAWN_TAG) ? base : [...base, WITHDRAWN_TAG]);
  switch (input.action) {
    case "reject":
      return withTag();
    case "validate":
      return base.filter((t) => t !== WITHDRAWN_TAG);
    default:
      return existing.includes(WITHDRAWN_TAG) ? withTag() : base;
  }
}
