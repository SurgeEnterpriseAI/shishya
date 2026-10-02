"use client";

// The sign-up wall experiment's client wrapper (27 Sep 2026) — see src/lib/soft-wall.ts;
// the server part (src/components/SoftWall.tsx) adds the registration-wall markup.
// Server render = the full content, always (crawlers, signed-in students, the
// "open" arm). After mount, a signed-out human in the "wall" arm sees the
// first few lines and the rest blurred behind a free sign-in card.
//
// 2 Oct 2026 (founder: every sign-in call is the white Google button, with
// a line saying why): the card's button was our filled saffron one with the
// words "Sign up with Google" and no "G". It is the one shared button now;
// the card's body line is its reason. Its own "softwall-signin-click" beacon
// still fires on the click; the door id is "soft-wall". The wall is STOPPED
// (SOFT_WALL_ON is false since 29 Sep, src/lib/soft-wall.ts) — converted so
// it cannot come back saffron.

import { useEffect, useState, type ReactNode } from "react";
import { SignUpButton } from "@/components/SignUpButton";
import { classifyClient } from "@/lib/client-class";
import { fetchSignedIn } from "@/lib/session-hint";
import { clientUiLocale } from "@/lib/ui-locale-copy";
import { pitchAllowedPath, signupHref, signupPitchCopy } from "@/lib/signup-pitch";
import { readOrAssignBucket, softWallCopy, softWallFamily } from "@/lib/soft-wall";

function beacon(cta: string, props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob([JSON.stringify({ kind: "CTA_CLICKED", path: location.pathname, props: { cta, ...props } })], { type: "application/json" }),
    );
  } catch {
    /* best-effort */
  }
}

export function SoftWallClient({ children }: { children: ReactNode }) {
  const [wall, setWall] = useState<null | { title: string; body: string; lang: string; privacy: string; href: string; family: string }>(null);

  useEffect(() => {
    let alive = true;
    const path = location.pathname;
    const family = softWallFamily(path);
    if (!family || !pitchAllowedPath(path) || classifyClient(navigator.userAgent) === "bot") return;
    fetchSignedIn()
      .then((signedIn) => {
        if (!alive || signedIn !== false) return;
        let storage: Storage | null = null;
        try {
          storage = window.localStorage;
        } catch {
          storage = null;
        }
        const bucket = readOrAssignBucket(storage);
        beacon("softwall-exposed", { bucket, surface: family });
        if (bucket !== "wall") return;
        const lang = clientUiLocale();
        const c = softWallCopy(lang);
        const p = signupPitchCopy(lang);
        setWall({ title: c.title, body: c.body, lang, privacy: p.privacy, href: signupHref(path + location.search).replace("from=pitch", "from=wall"), family });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={wall ? "shishya-wall relative max-h-[520px] overflow-hidden" : "shishya-wall"}>
      {children}
      {wall && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-[150px] bg-gradient-to-b from-white/10 via-white/80 to-white backdrop-blur-[5px]" />
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-2 pb-4">
            <div role="region" aria-label={wall.title} className="w-full max-w-md rounded-2xl border border-saffron-300 bg-white p-5 text-center shadow-xl">
              <p className="text-base font-bold text-ink-900">🔓 {wall.title}</p>
              <p data-su-reason className="mt-1.5 text-sm text-ink-700">{wall.body}</p>
              <div className="mt-3 flex justify-center">
                <SignUpButton
                  href={wall.href}
                  surface="soft-wall"
                  locale={wall.lang}
                  explain="own"
                  center
                  side="top"
                  beaconProps={{ placement: wall.family }}
                  onSignInClick={() => beacon("softwall-signin-click", { bucket: "wall", surface: wall.family })}
                />
              </div>
              <p className="mt-2 text-[11px] text-ink-500">{wall.privacy}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
