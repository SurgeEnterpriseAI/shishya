"use client";

// The hooks a client "Sign up with Google" placement uses (2 Oct 2026):
//   • useSignUpPageData() — what the page said about itself
//     (src/lib/signup-page-data.ts), for the path the browser is on now;
//   • useSignUpWords()    — the tooltip and the caption of a placement in the
//     reader's language, once that language's words and the rules that
//     choose the sentence are here (src/lib/signup-place-load.ts). Null until
//     then: the button shows without its explanation for a moment, as the
//     header's always did before the page's script ran. Words handed in by a
//     server component (`given`) are used as they are and nothing is fetched;
//   • wantSignUpWords()   — a button is hovered or took the keyboard focus
//     and its words are not here: fetch them now;
//   • useSignUpWordsFailed() — the fetch failed and the words are still not
//     here: a caption's line is no longer held open.
//
// Neither the words nor the rules are imported here — only their TYPES: both
// arrive in the kit, on demand (page weight). Both hooks read a store with
// useSyncExternalStore, with "nothing" as the server snapshot: the first
// client render is the server's HTML, whatever is already in memory (no
// hydration mismatch).
//
// WHEN THE WORDS ARE FETCHED (2 Oct 2026 review — page weight is this site's
// first suspect for a sign-up dip, and most readers are on a phone):
//   • a caption is waiting on screen (`now`: a "both" button, the timed bar):
//     at once;
//   • a tooltip only (the header, the site card, the early line), on a screen
//     with a mouse: after the window's load event, when the browser is idle —
//     never while the page is still loading; where the browser cannot say it
//     is idle (iOS Safari), two seconds after the load;
//   • a tooltip only, on a touch screen: NOT fetched. No tooltip ever opens
//     there, so about 9-12 KB per first page view would be read by nobody.
//     The words still come the moment the button takes the keyboard focus
//     (wantSignUpWords — a keyboard or a switch on a phone), and they are
//     there anyway once any caption on the page has fetched them. What this
//     costs: on a phone, until then, a screen reader hears the button's label
//     without the long description;
//   • a fetch that failed (a weak signal, a phone that went offline): tried
//     again after 4 and 8 seconds, when the browser says it is back online,
//     and when a button is hovered or focused. Until the words come a button
//     has no tooltip, and a caption's line is let go instead of standing
//     empty.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { cachedSignUpKit, loadSignUpKit, signUpKitFailures, signUpWordsLang, subscribeSignUpKits } from "@/lib/signup-place-load";
import { signUpPageDataFor, subscribeSignUpPageData } from "@/lib/signup-page-data";
import type { SignUpContext } from "@/lib/signup-cta-copy";
import type { SignUpPageData, SignUpPlace, SignUpPlaceInput, SignUpWords } from "@/lib/signup-place";

const NONE = () => null;
const ZERO = () => 0;

/** A failed fetch is tried again by itself this many times (then only when
 *  the browser is back online, or a button is hovered or focused). */
const SIGNUP_WORDS_RETRIES = 2;
const SIGNUP_WORDS_RETRY_MS = 4000;

function herePath(): string | null {
  try {
    return window.location.pathname;
  } catch {
    return null;
  }
}

/** What the page the browser is on said about itself, or null. */
export function useSignUpPageData(): SignUpPageData | null {
  return useSyncExternalStore(subscribeSignUpPageData, () => signUpPageDataFor(herePath()), NONE);
}

/** A mouse, or a pen that hovers: the only screens where a tooltip opens
 *  (the same test as the button's own, src/components/SignUpButton.tsx). */
function hoverScreen(): boolean {
  try {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    return false;
  }
}

/** Run `fn` once the window has loaded AND the browser is idle (two seconds
 *  after the load where it cannot say so) — never while the page is loading. */
function whenLoadedAndIdle(fn: () => void): () => void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  let cancel: () => void = () => {};
  const idle = () => {
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(fn, { timeout: 2000 });
      cancel = () => w.cancelIdleCallback?.(id);
      return;
    }
    const id = window.setTimeout(fn, 2000);
    cancel = () => window.clearTimeout(id);
  };
  if (document.readyState === "complete") idle();
  else {
    window.addEventListener("load", idle, { once: true });
    cancel = () => window.removeEventListener("load", idle);
  }
  return () => cancel();
}

/** A button's words are wanted NOW — the pointer is on it, or it took the
 *  keyboard focus — and are not here (not fetched yet, or the fetch failed):
 *  fetch the reader's language. Nothing happens when they are here. */
export function wantSignUpWords(locale: string | null | undefined): void {
  const lang = signUpWordsLang(locale);
  if (!cachedSignUpKit(lang)) void loadSignUpKit(lang).catch(() => {});
}

/** The fetch of this language's words has failed and they are still not
 *  here. False on the server and in the first client render. */
export function useSignUpWordsFailed(locale: string | null | undefined): boolean {
  const lang = signUpWordsLang(locale);
  return useSyncExternalStore(subscribeSignUpKits, () => signUpKitFailures(lang), ZERO) > 0;
}

/** The words of a placement in the reader's language (en / hi / te; anything
 *  else reads English), or null while that language's kit is not loaded.
 *  `input`: the placement, as src/lib/signup-place.ts signUpPlaceFor reads it
 *  (its door, the page its link returns to, what the caller knows). Null: no
 *  button is rendered.
 *  `given`: words a server component already resolved — returned as they are.
 *  `place` / `context`: a fixed entry, or one of the five old variants (an
 *  alias), instead of the door's own rules.
 *  `now`: fetch at once (the caption is on screen); otherwise see WHEN THE
 *  WORDS ARE FETCHED at the top of this file.
 *  `off`: fetch nothing. */
export function useSignUpWords(
  locale: string | null | undefined,
  input: SignUpPlaceInput | null,
  opts?: { given?: SignUpWords | null; place?: SignUpPlace | null; context?: SignUpContext | null; now?: boolean; off?: boolean },
): SignUpWords | null {
  const lang = signUpWordsLang(locale);
  const givenText = opts?.given?.text ?? null;
  const givenShort = opts?.given?.short ?? null;
  const skip = givenText !== null || !!opts?.off || !input;
  const now = !!opts?.now;
  const kit = useSyncExternalStore(subscribeSignUpKits, () => cachedSignUpKit(lang), NONE);
  const failures = useSyncExternalStore(subscribeSignUpKits, () => signUpKitFailures(lang), ZERO);
  useEffect(() => {
    if (skip || cachedSignUpKit(lang)) return;
    const go = () => void loadSignUpKit(lang).catch(() => {});
    if (now) {
      go();
      return;
    }
    // A tooltip only: a touch screen never opens one, so nothing is fetched for it there.
    if (!hoverScreen()) return;
    return whenLoadedAndIdle(go);
  }, [lang, skip, now]);
  // The fetch failed: again in a few seconds (twice at most), and when the browser is back online.
  useEffect(() => {
    if (skip || failures === 0) return;
    const again = () => void loadSignUpKit(lang).catch(() => {});
    const timer = failures <= SIGNUP_WORDS_RETRIES ? window.setTimeout(again, SIGNUP_WORDS_RETRY_MS * failures) : null;
    window.addEventListener("online", again);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("online", again);
    };
  }, [lang, skip, failures]);
  // The placement as one value: the memo below then holds while nothing about it changes.
  const what = skip ? "" : JSON.stringify([input, opts?.place ?? null, opts?.context ?? null]);
  return useMemo(() => {
    if (givenText !== null) return { text: givenText, short: givenShort ?? "" };
    if (!kit || !what) return null;
    const [at, place, context] = JSON.parse(what) as [SignUpPlaceInput, SignUpPlace | null, SignUpContext | null];
    const { rules, table } = kit;
    return rules.signUpWordsFrom(table, place ?? (context ? rules.signUpPlaceOfContext(context) : rules.signUpPlaceFor(at)));
  }, [givenText, givenShort, kit, what]);
}
