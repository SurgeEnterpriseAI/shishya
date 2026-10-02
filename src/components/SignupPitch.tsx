"use client";

// The free sign-up offer as a card (27 Sep 2026) — see src/lib/signup-pitch.ts.
//
// Mounted once in the root layout above the footer, so every page ends with
// it — for a GUEST only (fetchSignedIn: unknown → not shown), never on a
// school page a child under 13 may be reading, never mid-paper
// (pitchAllowedPath). It renders nothing on the server: crawlers and the
// /hi /te twins' literal budgets never see it, and a signed-in student never
// sees a flash of it. Content is never covered: it sits after the page.
//
// 30 Sep 2026 (founder: "move the sign-in card to the right of" Exams today):
// on the home page, from lg up, the card sits beside the week's events
// (placement "home-side", mounted by src/app/page.tsx) and this footer copy
// hides at lg there. Phones keep the page's flow — content first, the offer
// at the end — so below lg nothing moves. Same guest / path / server rules.
//
// 30 Sep 2026 (sign-up build 1): the card's button is the shared in-page
// sign-in (src/components/SignInLink.tsx) — one "signin-click" beacon with
// surface "signup-pitch" and this card's placement (it was cta
// "signup-pitch-click" with surface = placement), and the skip-/login test's
// direct arm. Its /login link keeps from=pitch (a general sign-in card).
//
// 2 Oct 2026 (founder, standing: "Sign up with Google", visible and clear,
// with a description of how signing up is useful): the card's button is the
// one shared sign-up button (src/components/SignUpButton.tsx) — Google's
// white button with the "G" (their guidelines do not allow the "G" on our
// saffron) and the one label. As a tooltip on hover or keyboard focus with a
// mouse, the explanation from src/lib/signup-cta-copy.ts: the general words,
// or the school words on a Class 8-12 page (no exam, no "tutor remembers").
// No caption under it on a phone (2 Oct 2026 review): the card's four points
// are above the button and its privacy line is right under it — a caption
// made two small paragraphs in a row. Same link, same "signin-click" beacon
// (surface "signup-pitch" + placement), same test arms.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchSignedIn } from "@/lib/session-hint";
import { clientUiLocale } from "@/lib/ui-locale-copy";
import { pitchAllowedPath, signupHref, signupPitchCopy, type SignupPitchCopy } from "@/lib/signup-pitch";
import { SignUpButton } from "@/components/SignUpButton";

/** Home page paths (the /hi and /te twins included), where the card also sits beside the events at lg. */
const HOME_PATHS = new Set(["/", "/hi", "/te"]);

export function SignupPitch({
  surface = "site-card",
  placement = "footer",
}: {
  surface?: string;
  /** "footer" = the root layout's card above the footer; "home-side" = beside the home page's events, lg and up only. */
  placement?: "footer" | "home-side";
}) {
  const pathname = usePathname();
  const [copy, setCopy] = useState<SignupPitchCopy | null>(null);
  const [locale, setLocale] = useState<string>("en");
  const [href, setHref] = useState("/login");

  useEffect(() => {
    let alive = true;
    setCopy(null);
    if (!pitchAllowedPath(pathname)) return;
    fetchSignedIn()
      .then((signedIn) => {
        if (!alive || signedIn !== false) return;
        setHref(signupHref(location.pathname + location.search));
        const lc = clientUiLocale();
        setLocale(lc);
        setCopy(signupPitchCopy(lc));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  if (!copy) return null;
  const side = placement === "home-side";
  // The home page shows the card beside its events from lg (side), so the footer copy steps aside there.
  const footerOnHome = !side && HOME_PATHS.has(pathname ?? "");
  const sectionClass = side
    ? "hidden lg:block lg:[&:first-child]:col-span-2 lg:[&:nth-child(3)]:col-span-2"
    : `container-prose my-10${footerOnHome ? " lg:hidden" : ""}`;
  return (
    <section aria-label={copy.title} className={sectionClass} data-signup-pitch={placement}>
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
        <SignUpButton href={href} surface="signup-pitch" locale={locale} explain="tooltip" className="mt-4" beaconProps={{ placement: surface }} />
        <p className="mt-2 text-[11px] leading-relaxed text-ink-500">{copy.privacy}</p>
      </div>
    </section>
  );
}
