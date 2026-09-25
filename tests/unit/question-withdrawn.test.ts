// Withdrawn questions stay withdrawn under bulk validation (25 Sep 2026).
//
// A question withdrawn with the "rejected" tag (the SBI Clerk question with
// no correct option, withdrawn by datafix:sbi-q-fix-sep24), validated once
// and later pulled, or already failed by the answer-check firewall
// (metadata.factoryVerify on an unvalidated row) must not come back through POST
// /api/admin/questions/bulk-validate; the single-question admin Validate is
// the deliberate way back, and a plain "Save edits" no longer drops the tag.
// The routes run against mocked admin auth and an in-memory Prisma that
// evaluates the where clauses they build (no DB, no network).
// Run: npx vitest run tests/unit/question-withdrawn.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  BULK_HELD_BACK,
  BULK_VALIDATABLE,
  bulkConfirmMatches,
  bulkValidateVerdict,
  heldBackNote,
  tagsAfterAdminEdit,
  WITHDRAWN_TAG,
} from "@/lib/question-withdrawn";

interface QRow {
  id: string;
  examCode: string;
  topicCode: string;
  source: string;
  body: string;
  validated: boolean;
  validatedBy: string | null;
  validatedAt: Date | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
}

const db = vi.hoisted(() => ({ rows: [] as any[] }));

/** Evaluates the subset of Prisma's QuestionWhereInput these routes use. */
function matches(row: any, where: any): boolean {
  for (const [k, v] of Object.entries(where ?? {})) {
    if (v === undefined) continue;
    if (k === "AND") {
      if (!(v as any[]).every((w) => matches(row, w))) return false;
    } else if (k === "OR") {
      if (!(v as any[]).some((w) => matches(row, w))) return false;
    } else if (k === "NOT") {
      if ((Array.isArray(v) ? v : [v]).some((w) => matches(row, w))) return false;
    } else if (k === "exam") {
      if (row.examCode !== (v as any).code) return false;
    } else if (k === "topic") {
      if (row.topicCode !== (v as any).code) return false;
    } else if (k === "tags") {
      if (!row.tags.includes((v as any).has)) return false;
    } else if (k === "id") {
      if (!(v as any).in.includes(row.id)) return false;
    } else if (k === "body") {
      if (!row.body.toLowerCase().includes(String((v as any).contains).toLowerCase())) return false;
    } else if (k === "metadata") {
      // JSON path filter against Prisma.AnyNull (a missing key, JSON null or
      // SQL NULL all count as null — checked against prod SQL on 25 Sep 2026).
      const f = v as any;
      let val: any = row.metadata;
      for (const p of f.path ?? []) val = val != null && typeof val === "object" ? val[p] : undefined;
      if ("not" in f && f.not === Prisma.AnyNull) {
        if (val == null) return false;
      } else if ("equals" in f && f.equals === Prisma.AnyNull) {
        if (val != null) return false;
      } else {
        throw new Error("unsupported metadata filter");
      }
    } else if (v === null) {
      if (row[k] != null) return false;
    } else if (typeof v === "object" && !(v instanceof Date)) {
      if (!("not" in (v as any))) throw new Error(`unsupported filter on ${k}`);
      const not = (v as any).not;
      if (not === null ? row[k] == null : row[k] === not) return false;
    } else if (row[k] !== v) {
      return false;
    }
  }
  return true;
}

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(async () => ({ userId: "admin1", email: "admin@shishya.in" })),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    question: {
      count: vi.fn(async ({ where }: any) => db.rows.filter((r) => matches(r, where)).length),
      findMany: vi.fn(async ({ where, take }: any) =>
        db.rows
          .filter((r) => matches(r, where))
          .slice(0, take ?? Infinity)
          .map((r) => ({ id: r.id })),
      ),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const hit = db.rows.filter((r) => matches(r, where));
        for (const r of hit) Object.assign(r, data);
        return { count: hit.length };
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        const r = db.rows.find((x) => x.id === where.id);
        return r ? { ...r, topic: { code: r.topicCode } } : null;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const r = db.rows.find((x) => x.id === where.id);
        Object.assign(r, data);
        return r;
      }),
    },
    topic: { findFirst: vi.fn(async () => null) },
  },
}));

import { POST as bulkValidate } from "@/app/api/admin/questions/bulk-validate/route";
import { PATCH as patchQuestion } from "@/app/api/admin/questions/[id]/route";

const q = (id: string, over: Partial<QRow> = {}): QRow => ({
  id,
  examCode: "SBI_CLERK",
  topicCode: "reasoning",
  source: "AI_GENERATED",
  body: `Question ${id}`,
  validated: false,
  validatedBy: null,
  validatedAt: null,
  tags: [],
  metadata: null,
  ...over,
});

const byId = (id: string): QRow => db.rows.find((r) => r.id === id);

async function runBulk(body: Record<string, unknown>) {
  const res = await bulkValidate(
    new Request("http://x/api/admin/questions/bulk-validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, json: (await res.json()) as any };
}

async function runPatch(id: string, body: Record<string, unknown>) {
  const res = await patchQuestion(
    new Request(`http://x/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, json: (await res.json()) as any };
}

beforeEach(() => {
  db.rows = [
    // Pending, never reviewed — the pool bulk validate is for.
    q("ai1"),
    q("ai2"),
    q("pyq1", { source: "PYQ" }),
    // Withdrawn: the SBI Clerk question with no correct option.
    q("withdrawn", {
      source: "PYQ",
      tags: ["pyq", WITHDRAWN_TAG],
      validatedAt: new Date("2026-09-01T00:00:00Z"),
      validatedBy: "system:pyq-pattern",
      metadata: { rejectedBy: "datafix:sbi-q-fix-sep24" },
    }),
    // Withdrawn by an admin before it was ever validated.
    q("rejectedDraft", { tags: [WITHDRAWN_TAG], metadata: { rejectedBy: "admin@shishya.in" } }),
    // Validated once, pulled later by the answer-key sweep (no tag).
    q("pulled", { source: "AI_VALIDATED", validatedAt: new Date("2026-08-20T00:00:00Z"), validatedBy: "system:bulk:overnight" }),
    // Never validated; the answer-check firewall (verify-question-bank)
    // judged it REJECT/FLAWED and left validatedAt unset, with no tag.
    q("firewallFailed", {
      examCode: "AP_APPSC_GROUP2",
      metadata: { factoryVerify: { pipeline: "factory-v1", decision: "REJECT", verdict: "FLAWED", prevValidated: false } },
    }),
    // Already live, and another exam's pending question.
    q("live", { validated: true, validatedAt: new Date("2026-08-01T00:00:00Z") }),
    q("otherExam", { examCode: "SSC_GD" }),
  ];
});

describe("bulkValidateVerdict / BULK_VALIDATABLE (pure)", () => {
  it("holds back withdrawn and previously pulled rows, flips only never-reviewed pending ones", () => {
    expect(bulkValidateVerdict({ validated: false, validatedAt: null, tags: [] })).toBe("eligible");
    expect(bulkValidateVerdict({ validated: false, validatedAt: null, tags: ["pyq", "rejected"] })).toBe("withdrawn");
    expect(bulkValidateVerdict({ validated: false, validatedAt: new Date(), tags: ["rejected"] })).toBe("withdrawn");
    expect(bulkValidateVerdict({ validated: false, validatedAt: "2026-08-20T00:00:00Z", tags: null })).toBe("pulled");
    expect(bulkValidateVerdict({ validated: true, validatedAt: new Date(), tags: [] })).toBe("already-validated");
  });

  it("holds back a row the answer-check firewall already failed (REJECT, REVIEW or SHAPE)", () => {
    for (const decision of ["REJECT", "REVIEW", "SHAPE"]) {
      expect(bulkValidateVerdict({ validated: false, validatedAt: null, tags: [], metadata: { factoryVerify: { decision } } })).toBe(
        "failed-check",
      );
    }
    // Other metadata, or a null factoryVerify, is not a check.
    expect(bulkValidateVerdict({ validated: false, validatedAt: null, tags: [], metadata: { sources: [] } })).toBe("eligible");
    expect(bulkValidateVerdict({ validated: false, validatedAt: null, tags: [], metadata: { factoryVerify: null } })).toBe("eligible");
    expect(bulkValidateVerdict({ validated: false, validatedAt: null, tags: [], metadata: null })).toBe("eligible");
    // A firewall ACCEPT always validates; if that row is later pulled it is "pulled".
    expect(
      bulkValidateVerdict({ validated: false, validatedAt: new Date(), tags: [], metadata: { factoryVerify: { decision: "ACCEPT" } } }),
    ).toBe("pulled");
  });

  it("heldBackNote names every held-back kind, singular and plural", () => {
    expect(heldBackNote(0)).toBe("");
    expect(heldBackNote(1)).toMatch(/^ 1 withdrawn, previously pulled or answer-check-failed question left as they are/);
    expect(heldBackNote(4)).toMatch(/^ 4 withdrawn, previously pulled or answer-check-failed questions left as they are/);
  });

  it("the where fragments agree with the verdict and split the unvalidated pool exactly", () => {
    const unvalidated = db.rows.filter((r) => !r.validated);
    const eligible = unvalidated.filter((r) => matches(r, BULK_VALIDATABLE));
    const held = unvalidated.filter((r) => matches(r, BULK_HELD_BACK));
    expect(eligible.map((r) => r.id).sort()).toEqual(["ai1", "ai2", "otherExam", "pyq1"]);
    expect(held.map((r) => r.id).sort()).toEqual(["firewallFailed", "pulled", "rejectedDraft", "withdrawn"]);
    expect(eligible.length + held.length).toBe(unvalidated.length);
    for (const r of db.rows) {
      expect(matches(r, BULK_VALIDATABLE)).toBe(bulkValidateVerdict(r) === "eligible");
    }
  });

  it("bulkConfirmMatches accepts the eligible count or the admin list's pending count, nothing else", () => {
    expect(bulkConfirmMatches(4, 4, 3)).toBe(true);
    expect(bulkConfirmMatches(7, 4, 3)).toBe(true);
    expect(bulkConfirmMatches(5, 4, 3)).toBe(false);
    expect(bulkConfirmMatches(3, 3, 0)).toBe(true);
    expect(bulkConfirmMatches(0, 3, 0)).toBe(false);
  });
});

describe("POST /api/admin/questions/bulk-validate", () => {
  it("never re-validates a withdrawn, pulled or firewall-failed question", async () => {
    // The admin list shows 8 pending (withdrawn, pulled and firewall-failed included).
    const { status, json } = await runBulk({ filter: {}, confirmCount: 8 });
    expect(status).toBe(200);
    expect(json.validated).toBe(4);
    expect(json.heldBack).toBe(4);
    expect(json.message).toMatch(/4 withdrawn, previously pulled or answer-check-failed questions left as they are/);
    for (const id of ["ai1", "ai2", "pyq1", "otherExam"]) expect(byId(id).validated).toBe(true);
    for (const id of ["withdrawn", "rejectedDraft", "pulled", "firewallFailed"]) {
      expect(byId(id).validated).toBe(false);
    }
    expect(byId("firewallFailed").source).toBe("AI_GENERATED");
    expect(byId("withdrawn").tags).toContain(WITHDRAWN_TAG);
    expect(byId("ai1").source).toBe("AI_VALIDATED");
    expect(byId("pyq1").source).toBe("PYQ");
  });

  it("accepts the exact eligible count too, and refuses any other number", async () => {
    expect((await runBulk({ filter: {}, confirmCount: 5 })).status).toBe(400);
    expect(db.rows.filter((r) => r.validated).length).toBe(1);
    const ok = await runBulk({ filter: {}, confirmCount: 4 });
    expect(ok.status).toBe(200);
    expect(ok.json.validated).toBe(4);
  });

  it("an exam whose only pending question failed the answer check validates nothing", async () => {
    // AP_APPSC_GROUP2 on 25 Sep: 47 such rows; the admin list counts them as pending.
    const { status, json } = await runBulk({ filter: { examCode: "AP_APPSC_GROUP2" }, confirmCount: 1 });
    expect(status).toBe(200);
    expect(json.validated).toBe(0);
    expect(json.heldBack).toBe(1);
    expect(byId("firewallFailed").validated).toBe(false);
    expect(byId("firewallFailed").validatedAt).toBeNull();
  });

  it("a filter that matches only the withdrawn question validates nothing", async () => {
    const { status, json } = await runBulk({ filter: { examCode: "SBI_CLERK", source: "PYQ", q: "withdrawn" }, confirmCount: 1 });
    expect(status).toBe(200);
    expect(json.validated).toBe(0);
    expect(json.heldBack).toBe(1);
    expect(byId("withdrawn").validated).toBe(false);
  });

  it("a source filter is kept: a PYQ run no longer flips the exam's AI_GENERATED rows", async () => {
    const { status, json } = await runBulk({ filter: { examCode: "SBI_CLERK", source: "PYQ" }, confirmCount: 2 });
    expect(status).toBe(200);
    expect(json.validated).toBe(1);
    expect(byId("pyq1").validated).toBe(true);
    expect(byId("ai1").validated).toBe(false);
    expect(byId("ai2").validated).toBe(false);
    expect(byId("withdrawn").validated).toBe(false);
  });
});

describe("tagsAfterAdminEdit (pure)", () => {
  it("a plain save or un-validate keeps a withdrawn question withdrawn, even when the editor sends tags without the tag", () => {
    expect(tagsAfterAdminEdit({ existing: ["pyq", "rejected"], requested: ["pyq"], action: "save" })).toEqual(["pyq", "rejected"]);
    expect(tagsAfterAdminEdit({ existing: ["rejected"], requested: null, action: "unvalidate" })).toEqual(["rejected"]);
  });

  it("validate is the deliberate override and clears the tag; reject adds it once", () => {
    expect(tagsAfterAdminEdit({ existing: ["pyq", "rejected"], requested: ["pyq"], action: "validate" })).toEqual(["pyq"]);
    expect(tagsAfterAdminEdit({ existing: ["pyq", "rejected"], requested: null, action: "validate" })).toEqual(["pyq"]);
    expect(tagsAfterAdminEdit({ existing: [], requested: ["a", "rejected"], action: "reject" })).toEqual(["a", "rejected"]);
    expect(tagsAfterAdminEdit({ existing: null, requested: null, action: "reject" })).toEqual(["rejected"]);
  });

  it("a question that was never withdrawn keeps the requested tags", () => {
    expect(tagsAfterAdminEdit({ existing: ["old"], requested: ["new"], action: "save" })).toEqual(["new"]);
    expect(tagsAfterAdminEdit({ existing: ["old"], requested: null, action: "save" })).toEqual(["old"]);
  });
});

describe("PATCH /api/admin/questions/:id", () => {
  it("Save edits on a withdrawn question keeps the tag, so a later bulk run still skips it", async () => {
    // What QuestionEditor sends: every field, tags with "rejected" filtered out.
    const res = await runPatch("rejectedDraft", { body: "Fixed typo", tags: [] });
    expect(res.status).toBe(200);
    expect(byId("rejectedDraft").tags).toEqual([WITHDRAWN_TAG]);
    expect(byId("rejectedDraft").body).toBe("Fixed typo");
    const bulk = await runBulk({ filter: {}, confirmCount: 8 });
    expect(bulk.json.validated).toBe(4);
    expect(byId("rejectedDraft").validated).toBe(false);
  });

  it("single-question Validate still reinstates a withdrawn question, deliberately and on the record", async () => {
    const res = await runPatch("withdrawn", { tags: ["pyq"], validated: true });
    expect(res.status).toBe(200);
    const row = byId("withdrawn");
    expect(row.validated).toBe(true);
    expect(row.tags).toEqual(["pyq"]);
    expect(row.validatedBy).toBe("admin@shishya.in");
    expect(row.metadata).toMatchObject({ rejectedBy: "datafix:sbi-q-fix-sep24", reinstatedBy: "admin@shishya.in" });
  });

  it("Reject tags the question once and records who withdrew it", async () => {
    const res = await runPatch("ai1", { tags: [], reject: true });
    expect(res.status).toBe(200);
    expect(byId("ai1").tags).toEqual([WITHDRAWN_TAG]);
    expect(byId("ai1").metadata).toMatchObject({ rejectedBy: "admin@shishya.in" });
    await runPatch("ai1", { tags: [WITHDRAWN_TAG], reject: true });
    expect(byId("ai1").tags).toEqual([WITHDRAWN_TAG]);
  });
});
