"use client";

// Is this browser a returning member's? (src/lib/member-cookie.ts.) False on
// the server and on the first client render, so hydration always matches the
// cached HTML; the buttons switch to "Sign in with Google" right after.

import { useSyncExternalStore } from "react";
import { MEMBER_EVENT, hasMemberCookie, memberCookieString } from "@/lib/member-cookie";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(MEMBER_EVENT, onChange);
  return () => window.removeEventListener(MEMBER_EVENT, onChange);
}

function snapshot(): boolean {
  try {
    return hasMemberCookie(document.cookie);
  } catch {
    return false; // a sandboxed frame cannot read cookies
  }
}

export function useReturningMember(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

/** Remember this browser as a member's (once; a signed-in page calls it). */
export function markMember(): void {
  try {
    if (hasMemberCookie(document.cookie)) return;
    document.cookie = memberCookieString(window.location.protocol === "https:");
    window.dispatchEvent(new Event(MEMBER_EVENT));
  } catch {
    /* cookies blocked: the buttons keep the sign-up words */
  }
}
