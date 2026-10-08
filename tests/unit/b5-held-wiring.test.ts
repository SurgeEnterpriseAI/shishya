// Wiring of inbox fix B5 (7 Oct 2026) in the two files that were held by
// other work when it was written, so they shipped as patches
// (dashboard-page.patch, teacher-request-sla-route.patch). Pins:
//   • the SLA cron's team mail goes through its own summary
//     (src/lib/teacher-request-sla-summary.ts), not the new-request template
//     that made it read "New teacher request (from sla)" / "Student (guest)";
//   • the dashboard's "Your exams" cards carry the Remove control, and its
//     learning loop skips exams the student removed.
// Behaviour of the pieces: tests/unit/teacher-request-sla-summary.test.ts,
// tests/unit/me-exams-route.test.ts, tests/unit/remove-exam.test.ts.
// Run: npx vitest run tests/unit/b5-held-wiring.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

describe("teacher-request SLA cron: the summary mail", () => {
  const src = read("src/app/api/cron/teacher-request-sla/route.ts");

  it("sends its own summary, awaited, and never the new-request template", () => {
    expect(src).toContain('import { sendTeacherRequestSlaSummary, type SlaAnswered } from "@/lib/teacher-request-sla-summary";');
    expect(src).not.toContain("sendTeacherRequestEmail");
    expect(src).not.toMatch(/surface: "sla"|signedIn: false/);
    expect(src).toMatch(/if \(notifyTo\) await sendTeacherRequestSlaSummary\(notifyTo, answered\);/);
  });

  it("each line carries the student's own ask and the reopen flag, not the engine prompt", () => {
    expect(src).toContain("const answered: SlaAnswered[] = [];");
    expect(src).toContain('answered.push({ id: r.id, examCode: r.examCode, ask: cleaned.length >= 8 ? cleaned : "", reopen: r.isReopen });');
  });
});

describe("dashboard: Your exams", () => {
  const src = read("src/app/dashboard/page.tsx");

  it("every exam card is a RemovableExamCard with the page-locale copy", () => {
    expect(src).toContain('import { RemovableExamCard } from "./RemovableExamCard";');
    expect(src).toContain("const removeCopy = removeExamCopy(locale);");
    expect(src).toMatch(/\{enrollments\.map\(\(e\) => \([\s\S]{0,400}<RemovableExamCard examCode=\{e\.exam\.code\} examShort=\{e\.exam\.shortName\} copy=\{removeCopy\}>/);
  });

  it("the learning loop's weakness read skips removed exams", () => {
    expect(src).toMatch(/prisma\.weaknessMap\.findMany\(\{\n\s+where: \{ userId, exam: notRemovedExamWhere\(userId\) \},/);
  });
});
