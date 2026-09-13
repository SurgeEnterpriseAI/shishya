// Mail-link utm tagging (src/lib/email.ts, 13 Sep 2026). The helpers run
// centrally in sendEmail, so a mistake here would re-tag or break every
// link in every mail — the .ics / unsubscribe exclusions and the
// entity-encoding rule are the load-bearing cases.

import { describe, expect, it } from "vitest";
import { tagMailLinks, tagMailText, withMailUtm } from "@/lib/email";

describe("withMailUtm", () => {
  it("tags a bare shishya.in href with source/medium/campaign", () => {
    const u = new URL(withMailUtm("https://shishya.in/coach", "welcome", "welcome"));
    expect(u.origin + u.pathname).toBe("https://shishya.in/coach");
    expect(u.searchParams.get("utm_source")).toBe("email");
    expect(u.searchParams.get("utm_medium")).toBe("welcome");
    expect(u.searchParams.get("utm_campaign")).toBe("welcome");
  });

  it("defaults campaign to kind and slugs both", () => {
    const u = new URL(withMailUtm("https://www.shishya.in/today", "Daily Five"));
    expect(u.searchParams.get("utm_medium")).toBe("daily-five");
    expect(u.searchParams.get("utm_campaign")).toBe("daily-five");
  });

  it("leaves the .ics calendar file untouched", () => {
    const ics = "https://shishya.in/exams/SSC_CGL/exam-week.ics";
    expect(withMailUtm(ics, "exam-eve")).toBe(ics);
  });

  it("leaves third-party, mailto and relative links untouched", () => {
    for (const href of [
      "https://wa.me/?text=hello",
      "https://ssc.gov.in/notice?id=1&x=2",
      "mailto:tutor@shishya.in",
      "tel:+919160057000",
      "/dashboard",
      "not a url",
    ]) {
      expect(withMailUtm(href, "welcome")).toBe(href);
    }
  });

  it("leaves unsubscribe and API links untouched", () => {
    const page = "https://shishya.in/unsubscribe?u=abc&t=123";
    const api = "https://shishya.in/api/unsubscribe?u=abc&t=123";
    expect(withMailUtm(page, "daily-five")).toBe(page);
    expect(withMailUtm(api, "daily-five")).toBe(api);
  });

  it("replaces an existing utm instead of doubling it and keeps other params + hash", () => {
    const out = withMailUtm("https://shishya.in/today?utm_source=email&utm_medium=daily-five&verdict=EASY#pyqs", "daily-five", "daily-five");
    const u = new URL(out);
    expect(u.searchParams.getAll("utm_source")).toEqual(["email"]);
    expect(u.searchParams.getAll("utm_medium")).toEqual(["daily-five"]);
    expect(u.searchParams.getAll("utm_campaign")).toEqual(["daily-five"]);
    expect(u.searchParams.get("verdict")).toBe("EASY");
    expect(u.hash).toBe("#pyqs");
  });

  it("is idempotent", () => {
    const once = withMailUtm("https://shishya.in/exams/x?a=1", "exam-eve", "exam-eve");
    expect(withMailUtm(once, "exam-eve", "exam-eve")).toBe(once);
  });
});

describe("tagMailLinks", () => {
  it("tags every double-quoted shishya.in href and leaves others byte-identical", () => {
    const html =
      '<a href="https://shishya.in/coach" style="x">Coach</a> <a href="https://wa.me/?text=hi">wa</a> <a href="https://shishya.in/exams/SSC_CGL/exam-week.ics">ics</a>';
    const out = tagMailLinks(html, "coach-morning", "coach-morning");
    expect(out).toContain('href="https://shishya.in/coach?utm_source=email&utm_medium=coach-morning&utm_campaign=coach-morning"');
    expect(out).toContain('href="https://wa.me/?text=hi"');
    expect(out).toContain('href="https://shishya.in/exams/SSC_CGL/exam-week.ics"');
  });

  it("re-encodes &amp; only for entity-encoded hrefs", () => {
    const enc = '<a href="https://shishya.in/exams/x?a=1&amp;b=2">x</a>';
    const out = tagMailLinks(enc, "demand-shipped", "demand-shipped-notes-hi");
    expect(out).toContain("&amp;utm_source=email&amp;utm_medium=demand-shipped&amp;utm_campaign=demand-shipped-notes-hi");
    expect(out).not.toMatch(/[^;]&utm_/);
    const plain = '<a href="https://shishya.in/exams/x?a=1">x</a>';
    expect(tagMailLinks(plain, "welcome")).toContain('href="https://shishya.in/exams/x?a=1&utm_source=email&utm_medium=welcome&utm_campaign=welcome"');
  });

  it("leaves the hand-tagged daily-five link with one set of values plus utm_campaign", () => {
    const html = '<a href="https://shishya.in/today?utm_source=email&utm_medium=daily-five">Start</a>';
    const out = tagMailLinks(html, "daily-five", "daily-five");
    const href = /href="([^"]*)"/.exec(out)?.[1] ?? "";
    const u = new URL(href);
    expect(u.searchParams.getAll("utm_source")).toEqual(["email"]);
    expect(u.searchParams.getAll("utm_medium")).toEqual(["daily-five"]);
    expect(u.searchParams.get("utm_campaign")).toBe("daily-five");
  });

  it("is idempotent", () => {
    const html = '<a href="https://shishya.in/coach">a</a><a href="https://shishya.in/exams/x?q=1&amp;r=2">b</a>';
    const once = tagMailLinks(html, "winback", "winback");
    expect(tagMailLinks(once, "winback", "winback")).toBe(once);
  });
});

describe("tagMailText", () => {
  it("tags bare URLs, keeps trailing punctuation outside the link, skips the .ics", () => {
    const text = `Open it: https://shishya.in/dashboard.
Calendar: https://shishya.in/exams/SSC_CGL/exam-week.ics
Poll (https://shishya.in/exams/SSC_CGL?utm_source=email&utm_medium=exam-eve), then https://ssc.gov.in/`;
    const out = tagMailText(text, "exam-eve", "exam-eve");
    expect(out).toContain("https://shishya.in/dashboard?utm_source=email&utm_medium=exam-eve&utm_campaign=exam-eve.\n");
    expect(out).toContain("https://shishya.in/exams/SSC_CGL/exam-week.ics\n");
    expect(out).toContain("(https://shishya.in/exams/SSC_CGL?utm_source=email&utm_medium=exam-eve&utm_campaign=exam-eve)");
    expect(out).toContain("https://ssc.gov.in/");
    expect(out).not.toContain("utm_medium=exam-eve&utm_medium=");
  });

  it("is idempotent", () => {
    const once = tagMailText("Go: https://shishya.in/coach now", "welcome", "welcome");
    expect(tagMailText(once, "welcome", "welcome")).toBe(once);
  });
});
