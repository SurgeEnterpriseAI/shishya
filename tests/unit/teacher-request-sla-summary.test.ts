// The SLA cron's team summary (src/lib/teacher-request-sla-summary.ts,
// 7 Oct 2026, inbox fix B5). It used the new-request template and arrived
// as "🙋 New teacher request (from sla)" from "Student (guest)". Pins: its
// own subject with the count, no From / Contact rows or "new request"
// wording, one line per answered request (reopens marked), the student's
// ask cut and escaped, and the send itself. No network.
// Run: npx vitest run tests/unit/teacher-request-sla-summary.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => ({ calls: [] as Array<Record<string, unknown>>, result: true as boolean | Error }));
vi.mock("@/lib/email", () => ({
  sendEmail: async (p: Record<string, unknown>) => {
    sent.calls.push(p);
    if (sent.result instanceof Error) throw sent.result;
    return sent.result;
  },
}));

import { QUEUE_URL, sendTeacherRequestSlaSummary, slaSummaryEmail, type SlaAnswered } from "@/lib/teacher-request-sla-summary";

const TWO: SlaAnswered[] = [
  { id: "req1", examCode: "IBPS_CLERK", ask: "is my self-study plan realistic?", reopen: true },
  { id: "req2", examCode: null, ask: "", reopen: false },
];

beforeEach(() => {
  sent.calls = [];
  sent.result = true;
});

describe("slaSummaryEmail", () => {
  it("is a summary: its own subject with the count, no student-request rows", () => {
    const m = slaSummaryEmail(TWO);
    expect(m.subject).toBe("Teacher requests — 24h AI answers sent (2)");
    for (const body of [m.text, m.html]) {
      expect(body).not.toMatch(/New teacher request|Student \(guest\)|\(signed in\)|From:|>From<|Contact|Came from/);
      expect(body).toContain("The 24h safety net wrote an AI answer on 2 waiting requests.");
      expect(body).toContain(QUEUE_URL);
    }
    expect(m.subject).not.toMatch(/New|from sla/);
  });

  it("one line per request: id, exam, reopen marked, the student's ask", () => {
    const { text } = slaSummaryEmail(TWO);
    expect(text).toContain("• req1 · IBPS_CLERK · reopened (second answer)\n  is my self-study plan realistic?");
    expect(text).toContain("• req2 · no exam\n  (no question left — a check-in was sent)");
    expect(text.match(/reopened/g)).toHaveLength(1);
  });

  it("singular for one; a long ask is cut to 90 characters; html is escaped", () => {
    const long = "x".repeat(200);
    const m = slaSummaryEmail([{ id: "r", examCode: "SSC_CGL", ask: `<script>alert(1)</script> ${long}`, reopen: false }]);
    expect(m.subject).toBe("Teacher requests — 24h AI answers sent (1)");
    expect(m.text).toContain("on 1 waiting request.");
    const askLine = m.text.split("\n").find((l) => l.startsWith("  <script>"))!;
    expect(Array.from(askLine.trim()).length).toBe(90);
    expect(askLine.trim().endsWith("…")).toBe(true);
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
  });
});

describe("sendTeacherRequestSlaSummary", () => {
  it("sends the summary to the team inbox under its own tag", async () => {
    expect(await sendTeacherRequestSlaSummary("team@example.com", TWO)).toBe(true);
    expect(sent.calls).toHaveLength(1);
    expect(sent.calls[0]).toMatchObject({ to: "team@example.com", subject: "Teacher requests — 24h AI answers sent (2)", tag: "teacher-request-sla" });
    expect(sent.calls[0]).not.toHaveProperty("unsubUserId");
  });

  it("nothing answered → no mail; a failed send never throws", async () => {
    expect(await sendTeacherRequestSlaSummary("team@example.com", [])).toBe(false);
    expect(sent.calls).toHaveLength(0);
    sent.result = new Error("resend down");
    expect(await sendTeacherRequestSlaSummary("team@example.com", TWO)).toBe(false);
  });
});
