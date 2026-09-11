import { describe, expect, it } from "vitest";
import { isShareChannel, sharePath, shareUrl } from "@/lib/share-url";

describe("shareUrl", () => {
  it("tags a site-relative path with source/medium/campaign/content", () => {
    const u = new URL(shareUrl("/exams/sbi-po", { surface: "results", channel: "whatsapp", exam: "sbi-po" }));
    expect(u.origin).toBe("https://shishya.in");
    expect(u.pathname).toBe("/exams/sbi-po");
    expect(u.searchParams.get("utm_source")).toBe("whatsapp");
    expect(u.searchParams.get("utm_medium")).toBe("share");
    expect(u.searchParams.get("utm_campaign")).toBe("results");
    expect(u.searchParams.get("utm_content")).toBe("sbi-po");
  });

  it("keeps an absolute URL's host, existing query and hash", () => {
    const out = shareUrl("https://shishya.in/hi/exams/x/updates?foo=1#pyqs", { surface: "tracker", channel: "copy" });
    const u = new URL(out);
    expect(u.pathname).toBe("/hi/exams/x/updates");
    expect(u.searchParams.get("foo")).toBe("1");
    expect(u.searchParams.get("utm_campaign")).toBe("tracker");
    expect(u.searchParams.has("utm_content")).toBe(false);
    expect(u.hash).toBe("#pyqs");
  });

  it("replaces utm tags already on the URL instead of doubling them", () => {
    const out = shareUrl("/x?utm_source=old&utm_campaign=old&utm_content=old", { surface: "New Surface", channel: "native" });
    const u = new URL(out);
    expect(u.searchParams.getAll("utm_source")).toEqual(["native"]);
    expect(u.searchParams.get("utm_campaign")).toBe("new-surface");
    expect(u.searchParams.has("utm_content")).toBe(false);
  });

  it("sharePath returns a relative href with the same tags", () => {
    const p = sharePath("/exams/nda/quiz", { surface: "share-landing", channel: "telegram", exam: "nda" });
    expect(p.startsWith("/exams/nda/quiz?")).toBe(true);
    expect(p).toContain("utm_source=telegram");
    expect(p).toContain("utm_campaign=share-landing");
    expect(p).toContain("utm_content=nda");
  });

  it("isShareChannel accepts only the four channels", () => {
    expect(isShareChannel("whatsapp")).toBe(true);
    expect(isShareChannel("copy")).toBe(true);
    expect(isShareChannel("google")).toBe(false);
    expect(isShareChannel(undefined)).toBe(false);
  });
});
