// Sign-in line + the quiet mentor line (26 Sep 2026): reachable, not
// shouted. Signed-in visitors get one "continue" link to Today's 5 instead.
// The site-wide footer (src/components/SiteFooter.tsx, in the root layout)
// already carries About / Editorial policy / Contact / Privacy, so this
// adds only the line for people the doors are not for. Server component.

import Link from "next/link";
import type { HomeDoorsCopy } from "@/lib/home-doors-copy";

export function HomeSignIn({ copy, signedIn }: { copy: HomeDoorsCopy; signedIn: boolean }) {
  return (
    <section className="mt-11 text-center" aria-label={copy.signin.cta}>
      {signedIn ? (
        <Link href="/today" data-home-cta="welcome-today" className="btn-secondary">
          {copy.signin.back}
        </Link>
      ) : (
        <>
          <Link href="/login?callbackUrl=%2Fdashboard" data-home-cta="signin" className="btn-secondary">
            {copy.signin.cta}
          </Link>
          <p className="mx-auto mt-2 max-w-xl text-xs text-ink-500">{copy.signin.line}</p>
        </>
      )}
      <p className="mt-12 border-t border-ink-200 pt-5 text-xs">
        <Link href="/mentors" data-home-cta="mentor" className="font-semibold text-saffron-700 hover:text-saffron-800">
          {copy.foot.mentor}
        </Link>
      </p>
    </section>
  );
}
