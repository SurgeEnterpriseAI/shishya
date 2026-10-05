"use client";

// The inline sign-up at a hub practice button's 401 (3 Oct 2026, sign-ups-to-100
// plan lever 5 — the rules, the callbacks and the beacons are in
// src/lib/signin-cta.ts, "The 401 doors").
//
// A guest pressed the five-question diagnostic (StartMockButton), a subject
// test (SubjectTestButton) or "Generate my mock" (CustomMockBuilder) and
// /api/mocks answered 401. Until this build they were sent to /login at once;
// now this takes the pressed button's place — the start can only work after
// signing up, so there is nothing louder beside it:
//   • the shared "Sign up with Google" button (src/components/SignUpButton.tsx)
//     under the door's own id, with the /login link the redirect used (same
//     callback: it brings them back to start that test; same from=). It is a
//     SignInLink: the click sends the one "signin-click" beacon. These doors
//     are not in the skip-/login test, so the tap still passes /login;
//   • its reason line — the caption, and the tooltip with a mouse — is the
//     entry src/lib/signup-place.ts chooses for the door: door.hub-box for the
//     diagnostic of an exam that can serve a mock, else the exam's family
//     entry. No new words. The exam is named only because the hub page passes
//     its short name and the link returns to that exam's page (rule 3 there);
//     the practice value and the olympiad flag come from what the hub page
//     said about itself (SignUpPageContext), never from this file;
//   • under it the age line, "Free · For students 13 and above" — the timed
//     bar's own small print (src/lib/content-signup.ts nudgeBarCopy), in the
//     page's en / hi / te.
// Never rendered for a kids' exam (the SOF, Silverzone and NSTSE olympiads,
// JNVST) or a school class container: practiceDoorInline() says no and the
// caller keeps the old /login redirect. This file checks it again and renders
// nothing.
//
// SIZE AND ORDER (3 Oct 2026 review; the founder's rule in
// src/components/SignUpButton.tsx: the sign-up comes first and never looks
// smaller than the action beside it). The diagnostic's door and the custom
// mock's door are full width on a phone and their own width from sm
// (block + className "sm:w-auto", as the hub box's HubSignInLink), so the
// door is never narrower than the full-width "Ask the AI tutor" button beside
// it or the full-width "Generate my mock" button it replaces. The order is
// the hub page's: its action row turns itself around while it holds a door
// (data-signin-door below; src/app/exams/[code]/page.tsx), so the door comes
// before the tutor button — above it on a phone, to its left from sm.

import { SignUpButton } from "@/components/SignUpButton";
import { nudgeBarCopy } from "@/lib/content-signup";
import { loginHrefFor, practiceDoorCallback, practiceDoorInline, type Practice401Door } from "@/lib/signin-cta";

export function PracticeSignUpDoor({
  door,
  examCode,
  exam,
  locale,
  block,
  align,
  className,
}: {
  /** The door id (src/lib/signin-cta.ts PRACTICE_401_DOORS). */
  door: Practice401Door;
  examCode: string;
  /** The exam's short name, passed by the hub page. Without it nothing is named. */
  exam?: string | null;
  /** The hub page's language (en / hi / te; anything else reads English). */
  locale?: string | null;
  /** Full width (a subject card's button is). */
  block?: boolean;
  /** The tooltip hangs from the button's right edge (the hub's start button sits at the right). */
  align?: "end";
  /** Classes for the button's frame (SignUpButton's own `className`), e.g.
   *  "sm:w-auto" beside `block`: full width on a phone, its own width from sm. */
  className?: string;
}) {
  if (!practiceDoorInline(examCode)) return null;
  return (
    <div data-signin-door={door}>
      <SignUpButton
        href={loginHrefFor(practiceDoorCallback(door, examCode), door)}
        surface={door}
        locale={locale}
        exam={exam}
        examCode={examCode}
        beaconProps={{ examCode }}
        block={block}
        align={align}
        className={className}
      />
      <p className="mt-1 text-[11px] text-ink-500">{nudgeBarCopy(locale).privacy}</p>
    </div>
  );
}
