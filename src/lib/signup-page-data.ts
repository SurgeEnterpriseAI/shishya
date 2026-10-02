// What a page tells the "Sign up with Google" placements on it (2 Oct 2026).
//
// The header, the site card and the timed bar sit in the page's chrome and
// the root layout: they get no props from the page, and the path cannot tell
// them an exam's NAME, whether it can serve a mock, whether it is an olympiad,
// or whether the mock page rendered its sign-in gate. An exam page (and the
// guest tutor, and the mock gate) mounts <SignUpPageContext …>
// (src/components/SignUpPageContext.tsx), which writes those few facts here
// after mount, under the page's own path; the placements read them back
// (src/lib/use-signup-words.ts useSignUpPageData) and src/lib/signup-place.ts
// decides the sentence. No catalogue lookup happens in the browser: the page's
// server component already holds the facts.
//
// Never trusted across pages: the facts are kept with the path that wrote
// them and are read only while the browser is still on that path. Without
// them an exam page gets the sentence that names no exam (family.examPath) —
// the fail-closed default.
//
// Memory only: nothing is stored, nothing is sent.

import type { SignUpPageData } from "@/lib/signup-place";

let current: { path: string; data: SignUpPageData } | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  for (const fn of [...listeners]) fn();
}

/** The page at `path` says this about itself. */
export function setSignUpPageData(path: string, data: SignUpPageData): void {
  current = { path, data };
  tell();
}

/** The page at `path` is gone (its island unmounted). */
export function clearSignUpPageData(path: string, data: SignUpPageData): void {
  if (current && current.path === path && current.data === data) {
    current = null;
    tell();
  }
}

/** What the page at `path` said, or null (another page's facts are never returned). */
export function signUpPageDataFor(path: string | null | undefined): SignUpPageData | null {
  return current && typeof path === "string" && current.path === path ? current.data : null;
}

export function subscribeSignUpPageData(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
