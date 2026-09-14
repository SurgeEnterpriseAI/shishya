// Exam alerts on the phone: which endpoints we accept and what a
// notification says (13 Sep 2026). Pure — no network, no VAPID keys.
// Run: npx vitest run tests/unit/push-alert-rules.test.ts

import { describe, it, expect } from "vitest";
import { clipText, examAlertPushPayload, isAllowedPushEndpoint, welcomePushPayload } from "@/lib/push-alert-rules";

describe("isAllowedPushEndpoint", () => {
  it("accepts the browser push services", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc:APA91b")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/gAAAA")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/QGuQyavXutnMsf")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-bl2p.notify.windows.com/w/?token=BQYAAA")).toBe(true);
  });

  it("refuses anything that would let a caller aim our server elsewhere", () => {
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://evil.example/fcm.googleapis.com")).toBe(false);
    expect(isAllowedPushEndpoint("https://notify.windows.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://user:pw@fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/fcm/send/abc")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });
});

describe("notification text", () => {
  it("leads with the newest change, keeps its tier detail and opens the tracker", () => {
    const p = examAlertPushPayload({
      examCode: "SSC_GD",
      examShort: "SSC GD",
      changes: [
        { title: "Admit card: 15 Sep", detail: "official date" },
        { title: "Exam in 2 days — CBT", detail: "17 Sep" },
      ],
    });
    expect(p.title).toBe("SSC GD: Admit card: 15 Sep");
    expect(p.body).toBe("official date · +1 more on the tracker");
    expect(p.url).toBe("/exams/SSC_GD/updates?utm_source=push&utm_medium=alert");
    expect(p.tag).toBe("exam-SSC_GD");
  });

  it("never exceeds the notification limits", () => {
    const p = examAlertPushPayload({ examCode: "X", examShort: "X", changes: [{ title: "a".repeat(200), detail: "b".repeat(300) }] });
    expect(p.title.length).toBeLessThanOrEqual(72);
    expect(p.body.length).toBeLessThanOrEqual(140);
    expect(clipText("  one   two  ", 20)).toBe("one two");
  });

  it("the welcome says exactly what will come", () => {
    const w = welcomePushPayload("RRB NTPC", "RRB_NTPC");
    expect(w.title).toBe("Alerts on for RRB NTPC");
    expect(w.body).toMatch(/date, the admit card, the answer key or the result/);
    expect(w.url.startsWith("/exams/RRB_NTPC/updates")).toBe(true);
  });
});
