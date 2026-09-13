import { describe, expect, it } from "vitest";
import {
  INSTALL_OFFER_COPY,
  MIN_VISITS,
  blockedInstallPath,
  installOfferMustYield,
  isAndroidBrowserUA,
  nextVisitCount,
  readOfferState,
  shouldOfferInstall,
  type OfferInput,
} from "@/lib/install-offer";

const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36";
const ANDROID_WEBVIEW =
  "Mozilla/5.0 (Linux; Android 13; RMX3630 Build/TP1A.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36";
const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36";

describe("isAndroidBrowserUA", () => {
  it("accepts an Android browser", () => {
    expect(isAndroidBrowserUA(ANDROID_CHROME)).toBe(true);
  });
  it("rejects in-app WebViews, iOS and desktop", () => {
    expect(isAndroidBrowserUA(ANDROID_WEBVIEW)).toBe(false);
    expect(isAndroidBrowserUA(IOS_SAFARI)).toBe(false);
    expect(isAndroidBrowserUA(DESKTOP_CHROME)).toBe(false);
    expect(isAndroidBrowserUA("")).toBe(false);
    expect(isAndroidBrowserUA(null)).toBe(false);
  });
});

describe("nextVisitCount", () => {
  it("counts a new tab session once", () => {
    expect(nextVisitCount(null, false)).toBe(1);
    expect(nextVisitCount("1", false)).toBe(2);
    expect(nextVisitCount("1", true)).toBe(1);
  });
  it("treats garbage as zero", () => {
    expect(nextVisitCount("abc", false)).toBe(1);
    expect(nextVisitCount("-4", false)).toBe(1);
    expect(nextVisitCount("", true)).toBe(0);
  });
});

describe("readOfferState", () => {
  it("keeps known states and reads empty as never shown", () => {
    expect(readOfferState(null)).toBe(null);
    expect(readOfferState("")).toBe(null);
    expect(readOfferState("dismissed")).toBe("dismissed");
    expect(readOfferState("accepted")).toBe("accepted");
    expect(readOfferState("shown")).toBe("shown");
  });
  it("reads an unexpected value as already shown (stay quiet when unsure)", () => {
    expect(readOfferState("later")).toBe("shown");
  });
});

describe("blockedInstallPath", () => {
  it("blocks mock, results, sign-in and admin flows", () => {
    for (const p of ["/mocks/ck1", "/live-test/x", "/attempts/1/results", "/login", "/logout", "/admin/analytics", "/onboarding", "/i/dashboard", "/join/abc", "/aptitude"]) {
      expect(blockedInstallPath(p), p).toBe(true);
    }
  });
  it("allows study pages", () => {
    for (const p of ["/", "/exams/SSC_CGL", "/today", "/exam-calendar", "/hi/exams/X"]) {
      expect(blockedInstallPath(p), p).toBe(false);
    }
  });
});

describe("shouldOfferInstall", () => {
  const ok: OfferInput = { visits: 2, state: null, standalone: false, android: true, hasPrompt: true, path: "/exams/SSC_CGL", otherDialogOpen: false };

  it("offers on the second visit after the browser's install signal", () => {
    expect(MIN_VISITS).toBe(2);
    expect(shouldOfferInstall(ok)).toBe(true);
    expect(shouldOfferInstall({ ...ok, visits: 5 })).toBe(true);
  });
  it("never on the first visit", () => {
    expect(shouldOfferInstall({ ...ok, visits: 1 })).toBe(false);
  });
  it("never without beforeinstallprompt", () => {
    expect(shouldOfferInstall({ ...ok, hasPrompt: false })).toBe(false);
  });
  it("never once shown, dismissed or accepted", () => {
    expect(shouldOfferInstall({ ...ok, state: "shown" })).toBe(false);
    expect(shouldOfferInstall({ ...ok, state: "dismissed" })).toBe(false);
    expect(shouldOfferInstall({ ...ok, state: "accepted" })).toBe(false);
  });
  it("never inside the installed app, off Android, or on a blocked path", () => {
    expect(shouldOfferInstall({ ...ok, standalone: true })).toBe(false);
    expect(shouldOfferInstall({ ...ok, android: false })).toBe(false);
    expect(shouldOfferInstall({ ...ok, path: "/mocks/ck1" })).toBe(false);
  });
  it("never opens over another dialog (it stacks above SignupNudge's sheet)", () => {
    expect(shouldOfferInstall({ ...ok, otherDialogOpen: true })).toBe(false);
  });
});

describe("installOfferMustYield", () => {
  it("steps aside when a sheet opens or the student enters a blocked flow", () => {
    expect(installOfferMustYield("/exams/SSC_CGL", true)).toBe(true);
    expect(installOfferMustYield("/mocks/ck1", false)).toBe(true);
    expect(installOfferMustYield("/login", false)).toBe(true);
  });
  it("stays on a study page with nothing else on screen", () => {
    expect(installOfferMustYield("/exams/SSC_CGL", false)).toBe(false);
    expect(installOfferMustYield(null, false)).toBe(false);
  });
});

describe("INSTALL_OFFER_COPY", () => {
  it("is the approved line — no counts, no urgency", () => {
    expect(INSTALL_OFFER_COPY).toBe("Add Shishya to your home screen — opens in one tap, no app store");
    expect(INSTALL_OFFER_COPY).not.toMatch(/\d/);
  });
});
