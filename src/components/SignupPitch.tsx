"use client";

// The free sign-up offer as a card (27 Sep 2026) — see src/lib/signup-pitch.ts.
//
// Mounted once in the root layout above the footer, so every page ends with
// it — for a GUEST only (fetchSignedIn: unknown → not shown), never on a
// school page a child under 13 may be reading, never mid-paper
// (pitchAllowedPath). It renders nothing on the server: crawlers and the
// /hi /te twins' literal budgets never see it, and a signed-in student never
// sees a flash of it. Content is never covered: it sits after the page.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchSignedIn } from "@/lib/session-hint";
import { clientUiLocale } from "@/lib/ui-locale-copy";
import { pitchAllowedPath, signupHref, signupPitchCopy, type SignupPitchCopy } from "@/lib/signup-pitch";

function beacon(cta: string, surface: string) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob([JSON.stringify({ kind: "CTA_CLICKED", path: location.pathname, props: { cta, surface } })], { type: "application/json" }),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export function SignupPitch({ surface = "site-card" }: { surface?: string }) {
  const pathname = usePathname();
  const [copy, setCopy] = useState<SignupPitchCopy | null>(null);
  const [href, setHref] = useState("/login");

  useEffect(() => {
    let alive = true;
    setCopy(null);
    if (!pitchAllowedPath(pathname)) return;
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
  }, [pathname]);

  if (!copy) return null;
  return (
    <section aria-label={copy.title} className="container-prose my-10">
      <div className="rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-50 to-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-ink-900">{copy.title}</h2>
        <p className="mt-1 text-sm text-ink-700">{copy.lead}</p>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-800">
          {copy.points.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden className="text-saffron-600">✓</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <a
          href={href}
          onClick={() => beacon("signup-pitch-click", surface)}
          className="mt-4 inline-block rounded-xl bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
        >
          {copy.cta}
        </a>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{copy.privacy}</p>
      </div>
    </section>
  );
}
