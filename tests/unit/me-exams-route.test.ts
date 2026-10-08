// /api/me/exams/[code] — "Remove this exam" (7 Oct 2026, inbox fix B5), run
// against the real handlers and the real enrolment door
// (src/lib/db/enrollment.ts removeEnrollment / restoreEnrollment) with auth
// and an in-memory Enrollment table stubbed. What it pins:
//   • signed out → 401, nothing read or written;
//   • an unknown code, and a school class container, → 404;
//   • DELETE turns off the caller's OWN row only (found by session user +
//     exam, never by an id from the client) and keeps it — no delete;
//   • another student's row on the same exam is never touched;
//   • DELETE again (or on an exam never held) answers 200 removed: false;
//   • POST (the Undo) turns the same row back on, never creates one;
//   • starting a mock passes active: true, so a removed exam comes back
//     when the student practises it (the hub's "this becomes your exam").
// No network, no model call.
// Run: npx vitest run tests/unit/me-exams-route.test.ts

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface Row {
  userId: string;
  examId: string;
  active: boolean;
}

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  rows: [] as Row[],
  updateCalls: [] as Array<{ where: Record<string, unknown>; data: Record<string, unknown> }>,
  examReads: 0,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/db/prisma", () => {
  const EXAMS = [
    { id: "e-ssc", code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS" },
    { id: "e-imo", code: "SOF_IMO", shortName: "SOF IMO", category: "OLYMPIAD" },
    { id: "e-c09", code: "NCERT_C09", shortName: "Class 9", category: "SCHOOL_BOARD" },
  ];
  return {
    prisma: {
      exam: {
        findUnique: async ({ where }: { where: { code: string; category?: { not?: string } } }) => {
          state.examReads++;
          const e = EXAMS.find((x) => x.code === where.code);
          if (!e || (where.category?.not && e.category === where.category.not)) return null;
          return { id: e.id, code: e.code, shortName: e.shortName };
        },
      },
      // Only updateMany exists: any delete / create would throw here.
      enrollment: {
        updateMany: async (args: { where: { userId: string; examId: string; active: boolean }; data: { active: boolean } }) => {
          state.updateCalls.push(args);
          let count = 0;
          for (const r of state.rows) {
            if (r.userId === args.where.userId && r.examId === args.where.examId && r.active === args.where.active) {
              r.active = args.data.active;
              count++;
            }
          }
          return { count };
        },
      },
    },
  };
});

import { DELETE, POST } from "@/app/api/me/exams/[code]/route";
import { notRemovedExamWhere } from "@/lib/db/enrollment";

const ctx = (code: string) => ({ params: Promise.resolve({ code }) });
const req = (method: string) => new Request("http://localhost/api/me/exams/x", { method });
const row = (userId: string, examId: string) => state.rows.find((r) => r.userId === userId && r.examId === examId);

beforeEach(() => {
  state.session = { user: { id: "u1" } };
  state.rows = [
    { userId: "u1", examId: "e-ssc", active: true },
    { userId: "u1", examId: "e-imo", active: true },
    { userId: "u2", examId: "e-ssc", active: true },
  ];
  state.updateCalls = [];
  state.examReads = 0;
});

describe("auth and the exam in the URL", () => {
  it("signed out → 401, nothing read or written", async () => {
    state.session = null;
    for (const handler of [DELETE, POST]) {
      const res = await handler(req("DELETE"), ctx("SSC_CGL"));
      expect(res.status).toBe(401);
    }
    expect(state.examReads).toBe(0);
    expect(state.updateCalls).toEqual([]);
  });

  it("an unknown code and a school class container are 404, nothing written", async () => {
    expect((await DELETE(req("DELETE"), ctx("NOPE"))).status).toBe(404);
    expect((await DELETE(req("DELETE"), ctx("NCERT_C09"))).status).toBe(404);
    expect((await POST(req("POST"), ctx("NCERT_C09"))).status).toBe(404);
    expect(state.updateCalls).toEqual([]);
  });
});

describe("DELETE — remove from my exams", () => {
  it("turns off the caller's own row, keeps it, and answers the exam", async () => {
    const res = await DELETE(req("DELETE"), ctx("SSC_CGL"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, removed: true, exam: { code: "SSC_CGL", shortName: "SSC CGL" } });
    expect(row("u1", "e-ssc")).toEqual({ userId: "u1", examId: "e-ssc", active: false });
    expect(state.rows).toHaveLength(3); // kept, not deleted
    expect(state.updateCalls).toEqual([{ where: { userId: "u1", examId: "e-ssc", active: true }, data: { active: false } }]);
  });

  it("never reaches another student's row: the where is always the session user", async () => {
    state.session = { user: { id: "u2" } };
    const res = await DELETE(req("DELETE"), ctx("SOF_IMO")); // only u1 holds SOF IMO
    expect(await res.json()).toMatchObject({ ok: true, removed: false });
    expect(row("u1", "e-imo")?.active).toBe(true);
    expect(row("u2", "e-ssc")?.active).toBe(true);
    for (const c of state.updateCalls) expect(c.where.userId).toBe("u2");
  });

  it("removing mine leaves the other student on the same exam enrolled", async () => {
    await DELETE(req("DELETE"), ctx("SSC_CGL"));
    expect(row("u2", "e-ssc")?.active).toBe(true);
  });

  it("is idempotent: a second call answers removed: false and changes nothing", async () => {
    await DELETE(req("DELETE"), ctx("SSC_CGL"));
    const again = await DELETE(req("DELETE"), ctx("SSC_CGL"));
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ ok: true, removed: false });
    expect(row("u1", "e-ssc")?.active).toBe(false);
    expect(state.rows).toHaveLength(3);
  });
});

describe("POST — the Undo", () => {
  it("turns the removed row back on; again → restored: false", async () => {
    await DELETE(req("DELETE"), ctx("SSC_CGL"));
    const res = await POST(req("POST"), ctx("SSC_CGL"));
    expect(await res.json()).toEqual({ ok: true, restored: true, exam: { code: "SSC_CGL", shortName: "SSC CGL" } });
    expect(row("u1", "e-ssc")?.active).toBe(true);
    expect(await (await POST(req("POST"), ctx("SSC_CGL"))).json()).toMatchObject({ restored: false });
  });

  it("never creates an enrolment for an exam the student did not hold", async () => {
    state.session = { user: { id: "u2" } };
    const res = await POST(req("POST"), ctx("SOF_IMO"));
    expect(await res.json()).toMatchObject({ ok: true, restored: false });
    expect(state.rows).toHaveLength(3);
    expect(row("u2", "e-imo")).toBeUndefined();
  });
});

describe("what follows the list", () => {
  it("notRemovedExamWhere: an exam with no inactive enrolment of this student", () => {
    expect(notRemovedExamWhere("u1")).toEqual({ enrollments: { none: { userId: "u1", active: false } } });
  });

  it("starting a mock passes active: true — a removed exam comes back when practised", () => {
    const ROOT = path.resolve(__dirname, "../..");
    for (const f of ["src/app/api/attempts/route.ts", "src/app/mocks/[id]/page.tsx"]) {
      const src = fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
      expect(src, f).toMatch(
        /ensureEnrollment\(\n\s+\w+(?:\.user\.id)?,\n\s+\{ id: mock\.examId, category: mock\.exam\.category, code: mock\.exam\.code \},\n\s+\{ active: true \},\n\s+\{ school: mock\.generatedBy === "school-chapter" \},\n\s+\);/,
      );
    }
  });
});
