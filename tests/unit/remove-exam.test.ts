// The dashboard's "Remove this exam" words and call (src/lib/remove-exam.ts,
// 7 Oct 2026, inbox fix B5). Pins: every locale carries every line, the
// lines that name the exam have {exam}, the English is exactly what the
// system does, and the call is DELETE to remove / POST to put back, true
// only on an ok answer. No network.
// Run: npx vitest run tests/unit/remove-exam.test.ts

import { describe, expect, it, vi } from "vitest";
import { removeExamCopy, setExamOnList, withExam, type RemoveExamCopy } from "@/lib/remove-exam";

const KEYS: (keyof RemoveExamCopy)[] = ["remove", "removeAria", "confirm", "yes", "keep", "working", "removed", "undo", "undoing", "failed", "undoFailed"];

describe("removeExamCopy", () => {
  it("en, hi and te carry every line; the exam-naming lines have {exam}", () => {
    for (const locale of ["en", "hi", "te"]) {
      const c = removeExamCopy(locale);
      for (const k of KEYS) expect(c[k].trim(), `${locale}.${k}`).not.toBe("");
      for (const k of ["removeAria", "confirm", "removed"] as const) expect(c[k], `${locale}.${k}`).toContain("{exam}");
    }
    expect(removeExamCopy("hi").remove).not.toBe(removeExamCopy("en").remove);
    expect(removeExamCopy("te").remove).not.toBe(removeExamCopy("en").remove);
  });

  it("any other locale is English", () => {
    expect(removeExamCopy("ta")).toEqual(removeExamCopy("en"));
    expect(removeExamCopy(null)).toEqual(removeExamCopy("en"));
  });

  it("English says what happens: scores stay, a mock on it adds it back", () => {
    const en = removeExamCopy("en");
    expect(withExam(en.confirm, "SSC CGL")).toBe("Remove SSC CGL from your exams? Your past mocks and scores stay.");
    expect(withExam(en.removed, "SSC CGL")).toBe("SSC CGL is off your exams. Your mocks and scores stay; starting a mock on it adds it back.");
    expect(withExam(en.removeAria, "SOF IMO")).toBe("Remove SOF IMO from your exams");
  });
});

describe("setExamOnList", () => {
  const answer = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("remove = DELETE, put back = POST, on the encoded code", async () => {
    const f = vi.fn(async () => answer(200, { ok: true, removed: true }));
    expect(await setExamOnList("SSC_CGL", false, f as unknown as typeof fetch)).toBe(true);
    expect(await setExamOnList("A&B", true, f as unknown as typeof fetch)).toBe(true);
    expect(f.mock.calls).toEqual([
      ["/api/me/exams/SSC_CGL", { method: "DELETE" }],
      ["/api/me/exams/A%26B", { method: "POST" }],
    ]);
  });

  it("an idempotent repeat (removed: false) still counts as done", async () => {
    const f = vi.fn(async () => answer(200, { ok: true, removed: false }));
    expect(await setExamOnList("SSC_CGL", false, f as unknown as typeof fetch)).toBe(true);
  });

  it("401 / 404 / 500, a body without ok, and a network error are failures", async () => {
    for (const res of [answer(401, { error: "UNAUTHENTICATED" }), answer(404, { error: "exam not found" }), answer(500, {}), answer(200, { removed: true })]) {
      expect(await setExamOnList("SSC_CGL", false, (async () => res) as unknown as typeof fetch)).toBe(false);
    }
    expect(await setExamOnList("SSC_CGL", false, (async () => { throw new Error("offline"); }) as unknown as typeof fetch)).toBe(false);
  });
});
