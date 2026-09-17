// Pure unit tests: the lapse day 4-6 nudge (16 Sep 2026). Who is eligible
// (window, exam, opt-out, one per 21 days, no mail in the last 20 hours, no
// check-in in the last 4 days), newest-lapsed first with a cap, and a
// template that names only what the cron holds — no guilt, no model call.
// Run: npx vitest run tests/unit/lapse-nudge.test.ts

import { describe, it, expect } from "vitest";
import {
  LAPSE_NUDGE_TAG,
  lapseDaysGone,
  lapseEligibility,
  pickLapseRecipients,
  type LapseCandidate,
} from "@/lib/lapse-nudge";
import { renderLapseNudgeEmail } from "@/lib/email";

const NOW = new Date("2026-09-17T04:30:00.000Z");
const H = 3600_000;
const D = 24 * H;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

function cand(over: Partial<LapseCandidate> = {}): LapseCandidate {
  return {
    id: "u1",
    email: "student@example.com",
    emailOptOut: false,
    lastSeen: ago(4 * D),
    enrolled: true,
    livePlan: false,
    touches: [],
    ...over,
  };
}

describe("lapseEligibility", () => {
  it("day 4 enrolled student with no recent mail is eligible", () => {
    expect(lapseEligibility(cand(), NOW)).toEqual({ ok: true, daysGone: 4 });
  });

  it("only inside the 72 h – 7 day window", () => {
    expect(lapseEligibility(cand({ lastSeen: ago(71 * H) }), NOW)).toEqual({ ok: false, reason: "window" });
    expect(lapseEligibility(cand({ lastSeen: ago(72 * H + 60_000) }), NOW)).toEqual({ ok: true, daysGone: 3 });
    expect(lapseEligibility(cand({ lastSeen: ago(6 * D + 23 * H) }), NOW)).toEqual({ ok: true, daysGone: 6 });
    expect(lapseEligibility(cand({ lastSeen: ago(7 * D) }), NOW)).toEqual({ ok: false, reason: "window" });
  });

  it("needs an exam (enrollment or live coach plan), an email, and no opt-out", () => {
    expect(lapseEligibility(cand({ enrolled: false }), NOW)).toEqual({ ok: false, reason: "no-exam" });
    expect(lapseEligibility(cand({ enrolled: false, livePlan: true }), NOW).ok).toBe(true);
    expect(lapseEligibility(cand({ email: "" }), NOW)).toEqual({ ok: false, reason: "no-email" });
    expect(lapseEligibility(cand({ emailOptOut: true }), NOW)).toEqual({ ok: false, reason: "opted-out" });
  });

  it("one per 21 days", () => {
    expect(lapseEligibility(cand({ touches: [{ tag: LAPSE_NUDGE_TAG, sentAt: ago(20 * D) }] }), NOW)).toEqual({ ok: false, reason: "repeat" });
    expect(lapseEligibility(cand({ touches: [{ tag: LAPSE_NUDGE_TAG, sentAt: ago(22 * D) }] }), NOW).ok).toBe(true);
    // The send log row alone ('sent:lapse-d4') holds it too: a failed guard
    // insert must not mean a second nudge the next day.
    expect(lapseEligibility(cand({ touches: [{ tag: "sent:lapse-d4", sentAt: ago(2 * D) }] }), NOW)).toEqual({ ok: false, reason: "repeat" });
    expect(lapseEligibility(cand({ touches: [{ tag: "sent:lapse-d4", sentAt: ago(22 * D) }] }), NOW).ok).toBe(true);
  });

  it("no mail of any kind in the last 20 hours (coach-morning, a same-morning Daily-5)", () => {
    expect(lapseEligibility(cand({ touches: [{ tag: "sent:coach-morning", sentAt: ago(21.5 * H) }] }), NOW).ok).toBe(true);
    expect(lapseEligibility(cand({ touches: [{ tag: "sent:coach-morning", sentAt: ago(19 * H) }] }), NOW)).toEqual({ ok: false, reason: "recent-mail" });
    expect(lapseEligibility(cand({ touches: [{ tag: "sent:daily-five", sentAt: ago(90 * 60_000) }] }), NOW)).toEqual({ ok: false, reason: "recent-mail" });
    // Delivery / open webhook rows are not sends.
    expect(lapseEligibility(cand({ touches: [{ tag: "open:daily-five", sentAt: ago(H) }] }), NOW).ok).toBe(true);
  });

  it("no day-3 nudge or win-back in the last 4 days", () => {
    expect(lapseEligibility(cand({ touches: [{ tag: "sent:day3-nudge", sentAt: ago(2 * D) }] }), NOW)).toEqual({ ok: false, reason: "recent-checkin" });
    expect(lapseEligibility(cand({ touches: [{ tag: "winback", sentAt: ago(3 * D) }] }), NOW)).toEqual({ ok: false, reason: "recent-checkin" });
    expect(lapseEligibility(cand({ touches: [{ tag: "sent:winback", sentAt: ago(5 * D) }] }), NOW).ok).toBe(true);
  });

  it("days gone are whole days", () => {
    expect(lapseDaysGone(ago(5 * D + 23 * H), NOW)).toBe(5);
  });
});

describe("pickLapseRecipients", () => {
  it("newest-lapsed first, ineligible dropped, capped", () => {
    const list = [
      cand({ id: "old", lastSeen: ago(6 * D) }),
      cand({ id: "fresh", lastSeen: ago(3.5 * D) }),
      cand({ id: "optout", lastSeen: ago(4 * D), emailOptOut: true }),
      cand({ id: "mid", lastSeen: ago(5 * D) }),
    ];
    expect(pickLapseRecipients(list, NOW).map((c) => c.id)).toEqual(["fresh", "mid", "old"]);
    expect(pickLapseRecipients(list, NOW, 2).map((c) => [c.id, c.daysGone])).toEqual([
      ["fresh", 3],
      ["mid", 5],
    ]);
  });
});

describe("renderLapseNudgeEmail", () => {
  it("names the exam and the facts it was given, links /today, no guilt words", () => {
    const m = renderLapseNudgeEmail({ name: "Riya Kumar", examShort: "SSC CGL", daysGone: 4 });
    expect(m.subject).toBe("Riya, 5 questions to get your SSC CGL prep moving again");
    // "since you last opened Shishya" was a claim the cron can't make: it sees
    // only signed-in visits (review, 16 Sep 2026). Win-back's "about N days".
    expect(m.text).toContain("It's been about 4 days — no catching up needed.");
    expect(m.html).toContain("it's been about 4 days — no catching up needed.");
    for (const s of [m.text, m.html]) expect(s).not.toMatch(/since you last/i);
    expect(m.text).toContain("https://shishya.in/today");
    expect(m.html).toContain("https://shishya.in/today");
    for (const s of [m.subject, m.text, m.html]) {
      expect(s).not.toMatch(/you missed|failed to|last chance|hurry|only \d+ left/i);
    }
    expect(m.text).not.toContain("coach");
  });

  it("generic when no exam may be named; coach line only with a live plan", () => {
    const g = renderLapseNudgeEmail({ name: null, examShort: null, daysGone: 5, coachDaysLeft: 30 });
    expect(g.subject).toBe("Aspirant, 5 questions to get your prep moving again");
    expect(g.text).not.toContain("coach");
    const c = renderLapseNudgeEmail({ name: "Arun", examShort: "IBPS PO", daysGone: 3, coachDaysLeft: 18 });
    expect(c.text).toContain("Your coach has already rebuilt your IBPS PO plan for the 18 days left: https://shishya.in/coach");
  });

  it("a finished exam rolls over inside the rollover block only", () => {
    const r = renderLapseNudgeEmail({
      name: "Sai",
      examShort: null,
      daysGone: 6,
      rollover: { done: "SBI PO", next: { code: "IBPS_PO", short: "IBPS PO", when: "4 Oct (reported)" } },
    });
    expect(r.subject).not.toContain("SBI PO");
    expect(r.text).toContain("Your SBI PO is done. Next exam in your track: IBPS PO on 4 Oct (reported)");
  });

  it("escapes names in HTML", () => {
    const m = renderLapseNudgeEmail({ name: "<b>x</b>", examShort: "A&B", daysGone: 4 });
    expect(m.html).not.toContain("<b>x</b>");
    expect(m.html).toContain("A&amp;B");
  });
});
