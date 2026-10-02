"use client";

// "Sign up with Google" — the ONE guest sign-up button (2 Oct 2026, founder,
// standing: sign-up buttons visible and clear; "Sign up with Google" because
// students may think sign-up needs a lot of details; on hover, a description
// of how signing up is useful). Words: src/lib/signup-cta-copy.ts. Styles:
// src/app/globals.css (.su-google, .su-wrap, .su-tip).
//
// What it renders:
//   • the label "Sign up with Google" (en / hi / te), never a surface's own
//     wording;
//   • variant "google" (default, every in-page button): Google's button
//     with the standard colour "G", 12 / 10 / 12 px paddings, pill shape — to
//     Google's branding guidelines (read 2 Oct 2026). Two of Google's three
//     themes: LIGHT (white fill, #747775 stroke, #1F1F1F text) inside our
//     own tinted cards (site card, early line, school line, tutor card), and
//     DARK (#131314 fill, #8E918F stroke, #E3E3E3 text; theme="dark") where
//     the button is a block's main action beside or above an outlined
//     alternative — hub box, PYQ year, builder, quiz end, try-one, /login,
//     the mock gate, a challenge result, a persona page. Why dark there
//     (2 Oct 2026 review): on 28 Sep the founder put the free sign-in back
//     as the FILLED button and the quiz as the outlined one, after sign-ups
//     from hubs fell from about 11 a day to 4 when sign-in was demoted; the
//     white button beside a 2 px saffron outline was the quieter of the two
//     again. Google's "G" may not sit on saffron, so the filled form is
//     Google's own dark one. The "G" below is the SVG Google's own
//     HTML-button generator on that page emits, unchanged (see the note on
//     GoogleG for what is still open);
//   • variant "brand": our saffron button with TEXT ONLY and no "G" — for
//     the header's 44 px button and the timed bar, where a compact
//     brand-coloured button is needed. The guidelines forbid the colour "G"
//     on a coloured fill and forbid a one-colour "G", so no mark is the only
//     form such a button can take; it is not a Google-branded button;
//   • the explanation. The full sentence is ONE element (role="tooltip",
//     the button's aria-describedby): on a screen with a mouse it is a
//     tooltip on hover and on keyboard focus — CSS only, so it works before
//     and without JavaScript, absolutely positioned (no layout shift),
//     starting at the button's edge (never over the button), Escape closes
//     it. It opens ABOVE the button (side="top") wherever another action
//     sits under the button — the "or practise without sign-in" links, the
//     tutor and quiz buttons — so the pointer's way to that action is never
//     covered; the text above these buttons is not interactive. If there is
//     no room above (the button is at the top of the screen) it drops below.
//     On a touch screen the full sentence is not shown; in its place a SHORT
//     caption, one line at 360 px, sits under the button (explain "both"),
//     or nothing (explain "tooltip": the header — nothing may sit over that
//     tap — and buttons already beside their own benefit line). A screen
//     reader gets the full sentence as the button's description either way.
//
// What it does NOT change: the click. In-page buttons are still the shared
// SignInLink (one "signin-click" beacon with the same surface ids, and the
// skip-/login test's two arms exactly as before); the header is still a
// plain /login link counted by the root layout's listener.
//
// Measuring: one "signup-explain" beacon when the explanation is opened on a
// hover device, at most once per page view, never on a school page a child
// may be reading (Class 1-7, /schooling, a board hub).
//
// Never rendered on a Class 1-7 school page or any under-13 context: that
// rule stays with the callers (pitchAllowedPath / isUnder13SchoolPath /
// schoolScope), exactly as for SignInLink.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SignInLink } from "@/components/SignInLink";
import { ctaBeacon } from "@/lib/cta-beacon";
import { callbackOfLoginHref, type SigninSurface } from "@/lib/signin-cta";
import {
  SIGNUP_EXPLAIN_CTA,
  SIGNUP_EXPLAIN_HOVER_MS,
  explainBeaconDue,
  signUpContextFor,
  signUpExplain,
  signUpExplainShort,
  signUpLabel,
  signUpLabelParts,
  type SignUpContext,
} from "@/lib/signup-cta-copy";

/** Google's standard colour "G", exactly as Google's HTML-button generator
 *  (developers.google.com/identity/branding-guidelines) emits it. Do not
 *  redraw, recolour or stretch it, and render it only on Google's white,
 *  neutral (#F2F2F2) or dark (#131314) button fill — the same colour mark on
 *  all three. Decorative here: the button's text names Google.
 *  OPEN (2 Oct 2026 review, accepted deviations until the founder says
 *  otherwise — settle both before any Google app-verification review):
 *   1. the guidelines' text asks for "the standard color gradient super G"
 *      and lists "an outdated Google G" under Don't; this is the flat
 *      four-colour G. The gradient mark is in Google's signin-assets.zip
 *      (linked on that page) — a download, which needs the founder's OK.
 *      When taken, replace the paths below unchanged and update the test
 *      that pins this SVG (tests/unit/signup-cta.test.ts, section 5);
 *   2. the guidelines ask for Google Sans Medium 14/20. Google Sans is not
 *      loaded (no web font is downloaded for the button — page weight on
 *      every page), so the button falls back to Roboto, then the page font
 *      (src/app/globals.css .su-google). */
export function GoogleG() {
  return (
    <svg className="su-google-g" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

/** "both": a tooltip with a mouse, a caption under the button on touch.
 *  "tooltip": a tooltip with a mouse, nothing on touch. */
export type SignUpExplainMode = "both" | "tooltip";

// The path the "explanation opened" beacon was last sent on (memory only).
let explainSentPath: string | null = null;

function canHover(): boolean {
  try {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    return false;
  }
}

function explainOpened(surface: string, via: "hover" | "focus"): void {
  try {
    const path = location.pathname;
    if (!explainBeaconDue(path, explainSentPath)) return;
    explainSentPath = path;
    ctaBeacon(SIGNUP_EXPLAIN_CTA, { surface, via });
  } catch {
    /* analytics is best-effort */
  }
}

/** The button's frame: the explanation element and its behaviour. Children
 *  get the id to put in aria-describedby (undefined while there is no
 *  explanation element in the page). Client components only — a server page
 *  uses SignUpButton / GoogleSignInButton. */
export function SignUpShell({
  text,
  short,
  surface,
  explain = "both",
  block,
  center,
  side,
  align,
  className,
  deferText,
  children,
}: {
  /** The full explanation (signUpExplain): the tooltip, and the button's
   *  description for a screen reader. */
  text: string;
  /** The short caption a touch screen shows under the button
   *  (signUpExplainShort) — rendered for explain "both" only. */
  short?: string;
  /** The sign-in door this button is (the "signup-explain" beacon's surface). */
  surface: string;
  explain?: SignUpExplainMode;
  /** Full width (the button stretches). */
  block?: boolean;
  /** Centre the button and the touch caption. */
  center?: boolean;
  /** Tooltip above the button instead of under it: a bar at the bottom of
   *  the screen, and every button with another action under it. */
  side?: "top";
  /** Tooltip hangs from the button's right edge (a button at the right of the screen). */
  align?: "end";
  /** The frame's own layout classes (margins). */
  className?: string;
  /** Render the explanation only after mount — the header, so the words are
   *  not in the cached HTML of every page (and not in the /hi and /te twins'
   *  English count). Until then: no tooltip, no aria-describedby. */
  deferText?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const tipId = `su-tip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const frame = useRef<HTMLSpanElement | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const [ready, setReady] = useState(!deferText);
  // Escape was pressed: closed until the pointer and the focus have left.
  const [closed, setClosed] = useState(false);
  // The pointer or the keyboard focus is on the button (Escape is listened for).
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // The tooltip would leave the screen on the right: hang it from the right edge.
  const [flip, setFlip] = useState(false);
  // side="top" with no room above (the button is at the top of the screen):
  // open below this once. Re-measured on the next hover or focus.
  const [drop, setDrop] = useState(false);

  useEffect(() => {
    if (deferText) setReady(true);
  }, [deferText]);

  const active = hovered || focused;
  useEffect(() => {
    if (!active) {
      setClosed(false);
      setDrop(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClosed(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  useEffect(
    () => () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  // Keep the tooltip on screen: measured once it is shown (CSS has opened it).
  const fit = () => {
    try {
      const tip = frame.current?.querySelector<HTMLElement>(".su-tip");
      if (!tip) return;
      const r = tip.getBoundingClientRect();
      if (r.width > 0 && r.right > window.innerWidth - 8) setFlip(true);
      if (side === "top" && r.height > 0 && r.top < 8) setDrop(true);
    } catch {
      /* old browser: the tooltip keeps its side */
    }
  };

  return (
    <span
      ref={frame}
      className={`su-wrap${block ? " su-block" : ""}${center ? " su-center" : ""}${className ? ` ${className}` : ""}`}
      data-su-explain={explain}
      data-su-side={drop ? undefined : side}
      data-su-align={flip || align === "end" ? "end" : undefined}
      data-su-closed={closed ? "true" : undefined}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || !canHover()) return;
        setHovered(true);
        window.requestAnimationFrame(fit);
        if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(() => explainOpened(surface, "hover"), SIGNUP_EXPLAIN_HOVER_MS);
      }}
      onPointerLeave={() => {
        setHovered(false);
        if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }}
      onFocus={(e) => {
        if (!canHover()) return;
        setFocused(true);
        window.requestAnimationFrame(fit);
        let keyboard = false;
        try {
          keyboard = (e.target as HTMLElement).matches(":focus-visible");
        } catch {
          keyboard = false;
        }
        if (keyboard) explainOpened(surface, "focus");
      }}
      onBlur={() => setFocused(false)}
    >
      {children(ready ? tipId : undefined)}
      {/* .su-tip is the frame the CSS places (caption in the flow on touch,
          floating with a mouse). Inside it: the short caption (touch only)
          and the full sentence — the tooltip, which carries the id the
          button points at, so a screen reader always gets the full one. */}
      {ready && (
        <span className="su-tip">
          {short && explain === "both" && <span className="su-tip-short">{short}</span>}
          <span id={tipId} role="tooltip" className="su-tip-text">
            {text}
          </span>
        </span>
      )}
    </span>
  );
}

/** The Google-branded button's classes: Google's light theme, or its dark
 *  one (src/app/globals.css .su-google / .su-google-dark). */
export function googleButtonClass(theme: "light" | "dark" = "light"): string {
  return theme === "dark" ? "su-google su-google-dark" : "su-google";
}

/** The inside of the Google-branded button: the "G", then the label. */
export function SignUpFace({ label }: { label: string }) {
  return (
    <>
      <GoogleG />
      <span>{label}</span>
    </>
  );
}

/** The label for a "brand" (text-only) button. `stack`: the two halves sit
 *  on two lines below sm ("Sign up" over "with Google") — the header on a
 *  phone, where one line does not fit the 360 px row. */
export function SignUpBrandLabel({ locale, stack }: { locale: string | null | undefined; stack?: boolean }) {
  if (!stack) return <>{signUpLabel(locale)}</>;
  const [a, b] = signUpLabelParts(locale);
  return (
    <span className="flex flex-col items-center leading-[1.15] sm:flex-row sm:gap-1 sm:leading-normal">
      <span className="whitespace-nowrap">{a}</span> <span className="whitespace-nowrap">{b}</span>
    </span>
  );
}

export interface SignUpButtonProps {
  /** The /login?callbackUrl=… link (the no-JavaScript and "login" arm route). */
  href: string;
  /** The sign-in door (src/lib/signin-cta.ts) — unchanged ids. */
  surface: SigninSurface;
  /** The page's language when the caller knows it; otherwise English. */
  locale?: string | null;
  /** The exam this page is about. The explanation names it ONLY when the
   *  link returns to a page of that exam (signUpContextFor). */
  exam?: string | null;
  examCode?: string | null;
  /** That exam has practice — only then are "tests and progress" promised. */
  practice?: boolean | null;
  /** A fixed context instead (the guest tutor's card). */
  context?: SignUpContext;
  variant?: "google" | "brand";
  /** "google" only: Google's light (white) or dark (#131314) button. Dark
   *  where this is a block's main action beside or above an outlined
   *  alternative (see the note at the top); light inside our tinted cards. */
  theme?: "light" | "dark";
  /** "brand" only: stack the label's two halves below sm (a narrow bar). */
  stack?: boolean;
  explain?: SignUpExplainMode;
  block?: boolean;
  center?: boolean;
  side?: "top";
  align?: "end";
  /** The frame's layout classes (margins, width). */
  className?: string;
  /** Extra classes on the button itself ("brand": the whole button style). */
  buttonClassName?: string;
  beaconProps?: Record<string, string | number | boolean | null | undefined>;
  onSignInClick?: () => void;
  rel?: string;
}

/** An in-page "Sign up with Google" button for a GUEST: the shared SignInLink
 *  (beacon + the skip-/login test) with the one label and the explanation. */
export function SignUpButton({
  href,
  surface,
  locale,
  exam,
  examCode,
  practice,
  context,
  variant = "google",
  theme = "light",
  stack,
  explain = "both",
  block,
  center,
  side,
  align,
  className,
  buttonClassName,
  beaconProps,
  onSignInClick,
  rel,
}: SignUpButtonProps) {
  const ctx = context ?? signUpContextFor({ callback: callbackOfLoginHref(href), exam, examCode, practice });
  const text = signUpExplain(locale, ctx);
  const short = signUpExplainShort(locale, ctx);
  const cls = variant === "google" ? `${googleButtonClass(theme)}${block ? " w-full" : ""}${buttonClassName ? ` ${buttonClassName}` : ""}` : buttonClassName ?? "btn-primary";
  return (
    <SignUpShell text={text} short={short} surface={surface} explain={explain} block={block} center={center} side={side} align={align} className={className}>
      {(describedBy) => (
        <SignInLink href={href} surface={surface} className={cls} beaconProps={beaconProps} onSignInClick={onSignInClick} rel={rel} describedBy={describedBy}>
          {variant === "google" ? <SignUpFace label={signUpLabel(locale)} /> : <SignUpBrandLabel locale={locale} stack={stack} />}
        </SignInLink>
      )}
    </SignUpShell>
  );
}
