// Pure arithmetic behind /admin/loops (src/lib/loops-readout.ts). The
// K-factor box prints a formula the founder reads as a bound — its zero
// guards and the tag → family mapping are what keep that print honest.

import { describe, expect, it } from "vitest";
import {
  foldFunnel,
  istDayList,
  kFactor,
  mailFamily,
  orderFamilies,
  pivotByDay,
  splitTouchTag,
} from "@/lib/loops-readout";

describe("kFactor", () => {
  it("computes taps/user, signups/tap and K, and K equals their product", () => {
    const k = kFactor({ taps: 200, activeUsers: 1000, shareSignups: 10 });
    expect(k.tapsPerUser).toBeCloseTo(0.2, 10);
    expect(k.signupsPerTap).toBeCloseTo(0.05, 10);
    expect(k.k).toBeCloseTo(0.01, 10);
    expect(k.k).toBeCloseTo(k.tapsPerUser * k.signupsPerTap, 10);
  });

  it("returns zeros (never NaN/Infinity) when there are no active users", () => {
    const k = kFactor({ taps: 5, activeUsers: 0, shareSignups: 2 });
    expect(k).toEqual({ tapsPerUser: 0, signupsPerTap: 0.4, k: 0 });
  });

  it("keeps K defined when taps are zero but share signups exist", () => {
    const k = kFactor({ taps: 0, activeUsers: 500, shareSignups: 3 });
    expect(k.tapsPerUser).toBe(0);
    expect(k.signupsPerTap).toBe(0);
    expect(k.k).toBeCloseTo(0.006, 10);
  });
});

describe("mailFamily", () => {
  it("collapses per-instance tags onto their family and passes plain tags through", () => {
    expect(mailFamily("daily-five")).toBe("daily-five");
    expect(mailFamily("demand-shipped-notes-hi")).toBe("demand-shipped");
    expect(mailFamily("result-day-SSC_CGL-20260905")).toBe("result-day");
    expect(mailFamily("exam-eve-RRB_NTPC")).toBe("exam-eve");
    expect(mailFamily("exam-eve")).toBe("exam-eve");
    expect(mailFamily("lt-result:abc123")).toBe("lt-result");
    expect(mailFamily("lt-result-abc123")).toBe("lt-result");
    expect(mailFamily("lt-result")).toBe("lt-result");
    expect(mailFamily("lt-rehearsal-result")).toBe("lt-rehearsal-result");
    expect(mailFamily("welcome")).toBe("welcome");
    expect(mailFamily(undefined)).toBe("email");
    expect(mailFamily("")).toBe("email");
  });
});

describe("splitTouchTag", () => {
  it("recognises only the four event prefixes", () => {
    expect(splitTouchTag("open:daily-five")).toEqual({ event: "open", tag: "daily-five" });
    expect(splitTouchTag("click:exam-eve")).toEqual({ event: "click", tag: "exam-eve" });
    expect(splitTouchTag("delivered:welcome")).toEqual({ event: "delivered", tag: "welcome" });
    expect(splitTouchTag("sent:winback")).toEqual({ event: "sent", tag: "winback" });
  });

  it("treats cron guard rows as guard, colon or not", () => {
    expect(splitTouchTag("lt-result:abc")).toEqual({ event: "guard", tag: "lt-result:abc" });
    expect(splitTouchTag("winback")).toEqual({ event: "guard", tag: "winback" });
    expect(splitTouchTag("exam-eve-SSC_CGL")).toEqual({ event: "guard", tag: "exam-eve-SSC_CGL" });
    expect(splitTouchTag("coach-morning")).toEqual({ event: "guard", tag: "coach-morning" });
  });
});

describe("foldFunnel", () => {
  it("merges sent/delivered/open/click rows of one family and ignores guard rows", () => {
    const m = foldFunnel([
      { tag: "sent:daily-five", n: 100, users: 40 },
      { tag: "delivered:daily-five", n: 95, users: 40 },
      { tag: "open:daily-five", n: 30, users: 20 },
      { tag: "click:daily-five", n: 7, users: 6 },
      { tag: "coach-morning", n: 50, users: 50 },
      { tag: "lt-result:mock1", n: 9, users: 9 },
      { tag: "sent:result-day-SSC_CGL-20260905", n: 12, users: 12 },
      { tag: "sent:result-day-RRB_NTPC-20260906", n: 8, users: 8 },
    ]);
    expect(m.get("daily-five")).toEqual({ sent: 100, delivered: 95, open: 30, click: 7, sentUsers: 40 });
    expect(m.get("result-day")).toEqual({ sent: 20, delivered: 0, open: 0, click: 0, sentUsers: 20 });
    expect(m.has("coach-morning")).toBe(false);
    expect(m.has("lt-result")).toBe(false);
    expect(m.size).toBe(2);
  });
});

describe("orderFamilies", () => {
  it("puts the known order first and unknown families after, A→Z", () => {
    expect(orderFamilies(["zeta", "exam-eve", "alpha", "welcome"])).toEqual(["welcome", "exam-eve", "alpha", "zeta"]);
  });
});

describe("pivotByDay / istDayList", () => {
  it("lists the last N IST days ending today (IST)", () => {
    // 2026-09-12T20:00Z is already 13 Sep in IST.
    const days = istDayList(3, new Date("2026-09-12T20:00:00Z"));
    expect(days).toEqual(["2026-09-11", "2026-09-12", "2026-09-13"]);
  });

  it("pivots rows into per-day cells sorted by total desc, dropping days outside the window", () => {
    const days = ["2026-09-11", "2026-09-12", "2026-09-13"];
    const out = pivotByDay(
      [
        { key: "Googlebot", day: "2026-09-11", n: 5 },
        { key: "Googlebot", day: "2026-09-13", n: 2 },
        { key: "OAI-SearchBot", day: "2026-09-12", n: 40 },
        { key: "OAI-SearchBot", day: "2026-09-01", n: 999 },
      ],
      days,
    );
    expect(out).toEqual([
      { key: "OAI-SearchBot", total: 40, cells: [0, 40, 0] },
      { key: "Googlebot", total: 7, cells: [5, 0, 2] },
    ]);
  });
});
