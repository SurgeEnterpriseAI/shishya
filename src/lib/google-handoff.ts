// The hand-off to Google in one round trip (30 Sep 2026, sign-up build 1).
//
// next-auth v4's signIn("google") makes three calls one after another before
// the browser leaves for Google: GET /api/auth/providers, GET
// /api/auth/csrf, then POST /api/auth/signin/google (json) — and only then
// sets window.location. Median /login view → account is 17 s; the part
// before Google's screen is ours to cut.
//
// Now: the CSRF token is fetched once, ahead of the tap (on mount of a
// sign-in page's button, or on hover / touch / focus of an in-page button in
// the skip-/login test's direct arm), and the tap submits the same form
// NextAuth's own sign-in page submits — POST /api/auth/signin/google with
// csrfToken + callbackUrl, no json — so the server answers with the 302 to
// Google and the browser follows it: one request. Without a token (the
// fetch failed or has not come back) the tap falls back to signIn("google"),
// exactly as before. A token that does not match its cookie lands on /login
// again (NextAuth's own CSRF rule); the next page load fetches a fresh one.
//
// Browser only. Imported by client components (GoogleSignInButton,
// SignInLink).

import { getCsrfToken, signIn } from "next-auth/react";

export const GOOGLE_SIGNIN_ACTION = "/api/auth/signin/google";

let tokenP: Promise<string | null> | null = null;

/** Start (or reuse) the CSRF token fetch. Never rejects. */
export function warmGoogleHandoff(): Promise<string | null> {
  if (!tokenP) {
    const p: Promise<string | null> = getCsrfToken()
      .then((t) => (typeof t === "string" && t ? t : null))
      .catch(() => null);
    tokenP = p;
    // A failed fetch is not cached: the next warm or tap tries again.
    void p.then((t) => {
      if (!t && tokenP === p) tokenP = null;
    });
  }
  return tokenP;
}

/** The hidden fields of the one-request hand-off. */
export function googleHandoffFields(csrfToken: string, callbackUrl: string): Array<[string, string]> {
  return [
    ["csrfToken", csrfToken],
    ["callbackUrl", callbackUrl],
  ];
}

/** Leave for Google's account chooser, returning to `callbackUrl`. */
export async function goToGoogle(callbackUrl: string): Promise<void> {
  const token = await warmGoogleHandoff();
  if (token && typeof document !== "undefined") {
    try {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = GOOGLE_SIGNIN_ACTION;
      form.style.display = "none";
      for (const [name, value] of googleHandoffFields(token, callbackUrl)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
      return;
    } catch {
      /* fall through to next-auth's own call */
    }
  }
  await signIn("google", { callbackUrl });
}
