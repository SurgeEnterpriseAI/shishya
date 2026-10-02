// Sign-in line + the quiet mentor line (26 Sep 2026): reachable, not
// shouted. Signed-in visitors get one "continue" link to Today's 5 instead.
// The site-wide footer (src/components/SiteFooter.tsx, in the root layout)
// already carries About / Editorial policy / Contact / Privacy, so this
// adds only the line for people the doors are not for. Server component.
//
// 2 Oct 2026 (founder, with a screenshot of the white Google button:
// "wherever the sign in or sign up … has to be replaced with Google sign up
// the way which I have showed … and everywhere try to say something why
// sign in will help them"): the guest's button was our own outlined "Sign in
// free" link; it is the one shared "Sign up with Google" button now
// (src/components/SignUpButton.tsx) in the page's language. The line under
// it — what Shishya remembers once you are signed in, and what Google
// shares — was already there and is its visible reason (explain="own": no
// second caption). Same link (/login, back to /dashboard), same door id
// ("home-signin"); the click is counted once by the button itself, and the
// home page's own delegated beacon (data-home-cta="signin", HomeBeacons)
// still fires from the wrapper. src/app/page.tsx is unchanged: the language
// is read from the copy it already passes.
// Review, same day: the wrapper is only as wide as the button (mx-auto
// w-fit — it was a full-width flex row, so a click on the empty space left
// or right of the button sent the home page's "signin" CTA beacon with
// nobody signing in).

import Link from "next/link";
import { SignUpButton } from "@/components/SignUpButton";
import { homeCopyLocaleOf } from "@/lib/home-ask-link";
import { signUpLabel } from "@/lib/signup-cta-copy";
import type { HomeDoorsCopy } from "@/lib/home-doors-copy";

export function HomeSignIn({ copy, signedIn }: { copy: HomeDoorsCopy; signedIn: boolean }) {
  // 2 Oct 2026 (the sentences pass): the section's name for a screen reader
  // was copy.signin.cta — "Sign in free", the old button's words. A guest's
  // section is named by the button it holds now ("Sign up with Google", in
  // the page's language); a member's section holds one "Welcome back" link
  // and is not named after a sign-up.
  return (
    <section className="mt-11 text-center" aria-label={signedIn ? undefined : signUpLabel(homeCopyLocaleOf(copy))}>
      {signedIn ? (
        <Link href="/today" data-home-cta="welcome-today" className="btn-secondary">
          {copy.signin.back}
        </Link>
      ) : (
        <>
          <div data-home-cta="signin" className="mx-auto w-fit max-w-full">
            <SignUpButton href="/login?callbackUrl=%2Fdashboard" surface="home-signin" locale={homeCopyLocaleOf(copy)} explain="own" center />
          </div>
          <p data-su-reason className="mx-auto mt-2 max-w-xl text-xs text-ink-500">{copy.signin.line}</p>
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
