// Sign up and sign in, separated (13 Oct 2026): the "this browser has had an
// account" flag, and the words a returning member gets. No DOM.
// Run: npx vitest run tests/unit/member-cookie.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MEMBER_MAX_AGE_S, hasMemberCookie, memberCookieString } from "@/lib/member-cookie";
import { googleButtonLabel, signInLabel, signInLabelParts, signUpLabel, welcomeBack } from "@/lib/signup-cta-copy";

const read = (rel: string) => fs.readFileSync(path.join(__dirname, "../..", rel), "utf8");

describe("the member flag", () => {
  it("is read exactly, among other cookies", () => {
    expect(hasMemberCookie("a=1; shishya_member=1; b=2")).toBe(true);
    expect(hasMemberCookie("shishya_member=1")).toBe(true);
    expect(hasMemberCookie("shishya_member=0")).toBe(false);
    expect(hasMemberCookie("xshishya_member=1")).toBe(false);
    expect(hasMemberCookie("")).toBe(false);
    expect(hasMemberCookie(null)).toBe(false);
  });
  it("holds only '1', for 400 days, site-wide; Secure on https", () => {
    expect(memberCookieString(true)).toBe(`shishya_member=1; Max-Age=${MEMBER_MAX_AGE_S}; Path=/; SameSite=Lax; Secure`);
    expect(memberCookieString(false)).not.toContain("Secure");
    expect(MEMBER_MAX_AGE_S).toBe(400 * 86400);
  });
  it("is set by a signed-in page (the header) and never cleared on logout", () => {
    const header = read("src/components/HeaderAuthControls.tsx");
    expect(header).toMatch(/useEffect\(\(\) => \{\s*if \(signedIn\) markMember\(\);\s*\}, \[signedIn\]\);/);
    const logout = fs.existsSync(path.join(__dirname, "../..", "src/app/logout")) ? read("src/app/logout/page.tsx") : "";
    expect(logout).not.toContain("shishya_member");
  });
});

describe("the words", () => {
  it("a returning member: 'Sign in with Google' in en / hi / te, a welcome back, no sign-up pitch", () => {
    expect(signInLabel("en")).toBe("Sign in with Google");
    expect(signInLabel("hi")).toBe("Google से साइन इन करें");
    expect(signInLabel("te")).toBe("Google తో సైన్ ఇన్ చేయండి");
    expect(signInLabelParts("en")).toEqual(["Sign in", "with Google"]);
    for (const l of ["en", "hi", "te"]) {
      expect(signInLabel(l)).not.toBe(signUpLabel(l));
      expect(welcomeBack(l).short.length).toBeGreaterThan(10);
      expect(welcomeBack(l).text.length).toBeGreaterThan(welcomeBack(l).short.length);
    }
    expect(googleButtonLabel("en", "Continue with Google", true)).toBe("Sign in with Google");
    expect(googleButtonLabel("en", "Continue with Google", false)).toBe("Sign up with Google");
  });
  it("/login offers the other way in, quieter, under the main button", () => {
    const alt = read("src/components/LoginAltLine.tsx");
    expect(alt).toContain('en: { guest: "Already have an account?", member: "New here?" }');
    expect(alt).toContain("const action = member ? signUpLabel(locale) : signInLabel(locale);");
    const page = read("src/app/login/page.tsx");
    expect(page.indexOf("<LoginAltLine")).toBeGreaterThan(page.indexOf("<GoogleSignInButton"));
  });
});
