// Machine surfaces follow the page gates (16 Sep 2026): the IndexNow
// exam-week URL set and the "## Exam week" block in context.md /
// llms-full.txt name /cutoff only when the cutoff page renders
// (src/lib/exam-page-gates.ts). MP_RAEO and KA_KSRP — no rank bands, /cutoff
// 404 — were in the daily IndexNow set and described to answer engines as
// "indicative cutoff (estimate from score bands)".
// Prisma is mocked; nothing here reads the DB.
// Run with: npx vitest run tests/unit/page-gates-machine.test.ts

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { GATES_CLOSED, GATES_OPEN } from "@/lib/exam-page-gates";
import { examWeekUrls } from "@/lib/indexnow";
import { examWeekAeoLines, examWeekIndexNowUrls, type ExamWeekExam } from "@/lib/exam-week-aeo";
import { computeExamWeekState } from "@/lib/exam-week";

// 16 Sep 2026, 16:30 IST — the eve of MP_RAEO's official exam day.
const now = new Date("2026-09-16T11:00:00Z");
const raeo: ExamWeekExam = {
  id: "e-raeo",
  code: "MP_RAEO",
  shortName: "MP RAEO",
  name: "MP RAEO Recruitment Test",
  officialUrl: "https://esb.mp.gov.in",
  state: computeExamWeekState(
    [
      {
        id: "exam",
        label: "Online exam begins",
        date: "2026-09-17T00:00:00.000Z",
        isExamDay: true,
        kind: "EXAM",
        confidence: "official",
        url: "https://esb.mp.gov.in/notice.pdf",
      },
    ],
    "https://esb.mp.gov.in",
    now,
  ),
  scheme: { totalQuestions: 200, scoredQuestions: null, totalMarks: 200, marksPerQ: 1, negativeMark: 0, description: "" },
};
const CUTOFF = "https://shishya.in/exams/MP_RAEO/cutoff";

describe("IndexNow exam-week URLs", () => {
  it("leave /cutoff out when the page does not render (and on a failed gate read)", () => {
    const urls = examWeekUrls("MP_RAEO", GATES_CLOSED);
    expect(urls).not.toContain(CUTOFF);
    expect(urls).toContain("https://shishya.in/exams/MP_RAEO");
    expect(urls).toContain("https://shishya.in/exams/MP_RAEO/updates");
    expect(urls).toContain("https://shishya.in/exams/MP_RAEO/checklist");
    expect(urls).toHaveLength(9);
  });

  it("keep /cutoff when the page renders", () => {
    const urls = examWeekUrls("SSC_CGL", GATES_OPEN);
    expect(urls).toContain("https://shishya.in/exams/SSC_CGL/cutoff");
    expect(urls).toHaveLength(10);
  });

  it("the cron's per-exam set passes the gate through, articles once", () => {
    const art = [{ slug: "live", phase: "LIVE", title: "t", sources: 3, lastUpdatedAt: now }];
    const closed = examWeekIndexNowUrls(raeo, art, { cutoff: false });
    expect(closed).not.toContain(CUTOFF);
    expect(closed.filter((u) => u.endsWith("/live"))).toHaveLength(1);
    expect(examWeekIndexNowUrls(raeo, art, { cutoff: true })).toContain(CUTOFF);
  });
});

describe("## Exam week block — cutoff line", () => {
  const cutoffLine = (lines: string[]) => lines.filter((l) => l.includes("/cutoff"));

  it("is in exam week on the eve (fixture sanity)", () => {
    expect(raeo.state.phase).toBe("eve");
    expect(examWeekAeoLines(raeo, { now, cutoffPage: false }).some((l) => l.startsWith("- Status: exam day is tomorrow"))).toBe(true);
  });

  it("is absent without bands, and when the caller does not know", () => {
    expect(cutoffLine(examWeekAeoLines(raeo, { now, cutoffPage: false }))).toEqual([]);
    expect(cutoffLine(examWeekAeoLines(raeo, { now }))).toEqual([]);
    const text = examWeekAeoLines(raeo, { now }).join("\n");
    expect(text).not.toContain("estimate from score bands");
    // The tracker line stays.
    expect(text).toContain("https://shishya.in/exams/MP_RAEO/updates");
  });

  it("is printed, unchanged, when the cutoff page renders", () => {
    expect(cutoffLine(examWeekAeoLines(raeo, { now, cutoffPage: true, site: "https://shishya.in" }))).toEqual([
      "- Category-wise indicative cutoff (estimate from score bands, NOT official; the official cutoff comes with the result):https://shishya.in/exams/MP_RAEO/cutoff",
    ]);
  });
});
