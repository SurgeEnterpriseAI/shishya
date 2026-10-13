// "This browser has had a Shishya account" (13 Oct 2026, founder: "for all
// already signed-up people we are always showing Sign up with Google — make
// sure sign up and sign in are separated").
//
// A first-party flag, set the first time a page sees a signed-in session
// (src/components/HeaderAuthControls.tsx) and kept after logout — that is its
// purpose: the next time this browser is signed out, every Google button
// reads "Sign in with Google" and welcomes the person back instead of
// pitching sign-up. It carries no id and nothing about the person: just "1".
// Not httpOnly — only the browser reads it (the buttons decide after mount,
// so cached server HTML stays the same for everyone).
//
// Pure: no React, no DOM access at import time.

export const MEMBER_COOKIE = "shishya_member";
/** Fired on window when the flag is set, so mounted buttons switch at once. */
export const MEMBER_EVENT = "shishya:member";
/** 400 days — the longest a browser keeps a cookie. */
export const MEMBER_MAX_AGE_S = 400 * 24 * 60 * 60;

export function hasMemberCookie(cookie: string | null | undefined): boolean {
  return /(?:^|;\s*)shishya_member=1(?:;|$)/.test(cookie ?? "");
}

export function memberCookieString(secure: boolean): string {
  return `${MEMBER_COOKIE}=1; Max-Age=${MEMBER_MAX_AGE_S}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}
