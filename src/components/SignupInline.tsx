"use client";

// The free sign-up offer in one compact block, for a guest (27 Sep 2026) —
// inside "Next on Shishya" (src/components/LandingActions.tsx), right under a
// landing page's answer. Same words and page rule as the site card
// (src/lib/signup-pitch.ts); renders nothing on the server, for a signed-in
// student, or on a child school page.

import { useEffect, useState } from "react";
import { fetchSignedIn } from "@/lib/session-hint";
import { clientUiLocale } from "@/lib/ui-locale-copy";
import { pitchAllowedPath, signupHref, signupPitchCopy, type SignupPitchCopy } from "@/lib/signup-pitch";

export function SignupInline({ surface }: { surface: string }) {
  const [copy, setCopy] = useState<SignupPitchCopy | null>(null);
  const [href, setHref] = useState("/login");
  useEffect(() => {
    let alive = true;
    if (!pitchAllowedPath(location.pathname)) return;
    fetchSignedIn()
      .then((signedIn) => {
        if (!alive || signedIn !== false) return;
        setHref(signupHref(location.pathname + location.search));
        setCopy(signupPitchCopy(clientUiLocale()));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!copy) return null;
  return (
    <div className="mt-4 rounded-xl border border-saffron-200 bg-saffron-50/70 p-3">
      <p className="text-sm font-semibold text-ink-900">{copy.title}</p>
      <p className="mt-0.5 text-xs text-ink-700">{copy.short}</p>
      <a
        href={href}
        onClick={() => {
          try {
            navigator.sendBeacon?.(
              "/api/analytics",
              new Blob([JSON.stringify({ kind: "CTA_CLICKED", path: location.pathname, props: { cta: "signup-inline-click", surface } })], { type: "application/json" }),
            );
          } catch {
            /* best-effort */
          }
        }}
        className="mt-2 inline-block rounded-lg bg-saffron-500 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-saffron-600"
      >
        {copy.cta}
      </a>
      <p className="mt-1.5 text-[11px] text-ink-500">{copy.privacy}</p>
    </div>
  );
}
