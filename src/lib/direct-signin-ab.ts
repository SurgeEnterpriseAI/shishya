// Skip-/login TEST (30 Sep 2026, sign-up build 1). The one switch.
//
// The audit: 590 guest visitor-days reached /login in 14 days and 176 went
// back to browsing within 30 minutes; only the mock gate's button goes
// straight to Google. So HALF of the guests who press an in-page sign-in
// button go straight to Google's account chooser (next-auth signIn("google"),
// as the mock gate already does — src/lib/google-handoff.ts), and the other
// half keep /login and its card. Same button, same label, same place: only
// the tap's destination differs.
//
// Arms: "direct" | "login", drawn 50/50 once per browser and kept in
// localStorage (shishya_direct_signin_ab_v1, the old wall test's
// shishya_*_ab_v1 pattern), so a person stays in one arm. No storage → "login".
// Both arms send the click beacon with props.bucket (src/lib/signin-cta.ts),
// plus props.via — where the tap actually went.
//
// Not in the test (always /login): the header button, every no-JavaScript
// fallback (the buttons are plain /login links until the click handler
// runs), the 401 redirects of practice buttons (the student pressed "start",
// not "sign in", and /login says why), a browser that already carries the
// signed-in hint, and in-app browsers (Google blocks sign-in there; /login
// shows how to get out). The mock gate stays direct, as before the test.
//
// DECISION: the 7-day read — sign-ups per clicker, by bucket (CTA_CLICKED
// cta "signin-click" with props.bucket, joined to SIGNUP by anonId within
// 2 hours) — decides. Stop it with DIRECT_SIGNIN_TEST_ON = false: every
// button then goes to /login again and no bucket is drawn.

export const DIRECT_SIGNIN_TEST_ON: boolean = true;

export const DIRECT_SIGNIN_AB_KEY = "shishya_direct_signin_ab_v1";

export type DirectSigninBucket = "direct" | "login";

/** The in-page sign-in buttons in the test (src/lib/signin-cta.ts ids). */
export const DIRECT_SIGNIN_SURFACES: ReadonlySet<string> = new Set([
  "hub-box",
  "hub-try-one",
  "pyq-year",
  "quiz-end",
  "build-mock-form",
  "signup-pitch",
  "signup-inline",
  "signup-nudge",
]);

export function inDirectSigninTest(surface: string): boolean {
  return DIRECT_SIGNIN_TEST_ON && DIRECT_SIGNIN_SURFACES.has(surface);
}

/** The stored arm, or a fresh 50/50 draw (stored). Test off → null (no
 *  bucket at all); storage refused or unreadable → "login". */
export function readOrAssignDirectBucket(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  rand: () => number = Math.random,
): DirectSigninBucket | null {
  if (!DIRECT_SIGNIN_TEST_ON) return null;
  try {
    if (!storage) return "login";
    const v = storage.getItem(DIRECT_SIGNIN_AB_KEY);
    if (v === "direct" || v === "login") return v;
    const b: DirectSigninBucket = rand() < 0.5 ? "direct" : "login";
    storage.setItem(DIRECT_SIGNIN_AB_KEY, b);
    // Only an arm that was really kept counts; otherwise the safe arm.
    return storage.getItem(DIRECT_SIGNIN_AB_KEY) === b ? b : "login";
  } catch {
    return "login";
  }
}

/** Where a sign-in tap goes: straight to Google only for the "direct" arm
 *  in a normal browser; everything else keeps /login. */
export function signinRoute(p: { bucket: DirectSigninBucket | null; inApp: string | null }): "google" | "login" {
  return p.bucket === "direct" && !p.inApp ? "google" : "login";
}
