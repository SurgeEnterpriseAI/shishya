"use client";

// "Sign up with Google" — the ONE guest sign-up button (2 Oct 2026, founder,
// standing: sign-up buttons visible and clear; "Sign up with Google" because
// students may think sign-up needs a lot of details; on hover, a description
// of how signing up is useful). Words: src/lib/signup-cta-copy.ts. Styles:
// src/app/globals.css (.su-google, .su-wrap, .su-tip, .su-float).
//
// What it renders:
//   • the label "Sign up with Google" (en / hi / te), never a surface's own
//     wording;
//   • ALWAYS Google's button with the standard colour "G", 12 / 10 / 12 px
//     paddings, pill shape — to Google's branding guidelines (read 2 Oct
//     2026). There is no saffron sign-up button any more (founder, 2 Oct
//     2026, with a screenshot of the white button: "sign up should show like
//     this instead of the orange color one at the top … check all the
//     places"): the header's button and the timed bar's were our saffron
//     TEXT-ONLY button; both are Google's light button now. Two of Google's
//     three themes are used: LIGHT (white fill, #747775 stroke, #1F1F1F
//     text) in the header, the timed bar and inside our own tinted cards
//     (site card, early line, school line, tutor card, finder), and DARK
//     (#131314 fill, #8E918F stroke, #E3E3E3 text; theme="dark") where the
//     button is a block's main action beside or above an outlined
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
//   • a narrow place (the header on a phone, the timed bar): the label's two
//     halves sit on two lines beside the "G" ("Sign up" over "with Google",
//     signUpLabelParts — the full approved words, no other label), and below
//     sm the button is the COMPACT size (.su-google-compact: 12 px text,
//     10 / 6 / 10 px paddings, an 18 px "G", still 44 px tall). One line
//     does not fit a 360 px header row in any of the three languages. The
//     header joins the halves into one line from sm; the timed bar keeps two
//     lines at every width (its card is 448 px wide and the line beside the
//     button needs the room). ACCEPTED DEVIATION: Google's page shows
//     one-line buttons at 14 / 20 px with 12 / 10 / 12 px paddings only —
//     settle it with the other two (see GoogleG) before any Google
//     app-verification review. The "G" itself is unchanged, on white;
//   • the explanation. The full sentence is ONE element in the page
//     (role="tooltip", the button's aria-describedby) — what a screen reader
//     hears, on every screen. What a mouse user SEES on hover and on
//     keyboard focus is a copy of it in a TOP LAYER (SignUpTipFloat below):
//     rendered into <body>, position: fixed, above every other layer of the
//     site, never in the way of a click (pointer-events: none), aria-hidden.
//     So nothing the button sits in can cut it off or paint over it — the
//     header's tooltip used to go under the home page's sticky live strip,
//     and the guest tutor's was cut by the scrolling message pane (founder,
//     2 Oct 2026: "the hover is hiding behind"). It is placed from the
//     button's box by src/lib/signup-tip-place.ts: under the button, or
//     ABOVE it (side="top") wherever another action sits under the button —
//     the "or practise without sign-in" links, the tutor and quiz buttons —
//     so the pointer's way to that action is never covered; on the other
//     side when there is no room; hung from the button's left or right edge
//     (align="end"); at least 8 px inside the window; never over the button;
//     re-placed while the page scrolls or the window is resized, and when
//     the button moves or grows for another reason (an animation or
//     transition ends, the page or the button changes size); not shown while
//     the button is scrolled out of sight inside a pane. Escape closes it.
//     It opens for a pointer that hovers (a mouse, a pen — never a finger)
//     and for KEYBOARD focus (:focus-visible) — not for the focus a mouse
//     click leaves on the button, which would keep it open after the pointer
//     has gone. Before the page's JavaScript runs, and without JavaScript,
//     the in-page element itself is the tooltip — CSS only, absolutely
//     positioned (no layout shift). Once the script runs the frame carries
//     data-su-float="on", which turns that CSS tooltip off, so the two are
//     never on screen together.
//     ACCEPTED TRADE-OFF (2 Oct 2026 review): the top-layer copy takes no
//     pointer events, so the pointer cannot be moved onto it — it closes as
//     soon as the pointer leaves the button. WCAG 1.4.13 asks for content
//     shown on hover to be hoverable itself (it matters to people who use
//     screen magnification); the other two parts of that rule hold (Escape
//     dismisses it; it stays while the pointer or the focus is on the
//     button). Chosen so the tooltip can never take a click meant for what
//     is under it. A screen reader is not affected: it reads the in-page
//     element.
//     On a touch screen the full sentence is not shown; in its place a SHORT
//     caption, one line at 360 px, sits under the button (explain "both"),
//     or nothing (explain "tooltip": the header — nothing may sit over that
//     tap — and buttons already beside their own benefit line).
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

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
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
import { placeSignUpTip } from "@/lib/signup-tip-place";

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
 *      (src/app/globals.css .su-google);
 *   3. the compact, two-line form in the header on a phone and in the timed
 *      bar (SignUpStackedFace, .su-google-compact): Google's page shows
 *      one-line buttons at 14 / 20 px with 12 / 10 / 12 px paddings only. */
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

/** The explanation in the top layer, for a screen with a mouse: a copy of
 *  the sentence rendered into <body> (a portal), position: fixed and above
 *  every other layer (.su-float), so no ancestor of the button can cut it off
 *  and nothing can paint over it. Mounted only while the explanation is open
 *  — never on the server, never in the first client render. aria-hidden: the
 *  button's description is the in-page element (role="tooltip"), not this
 *  copy. It starts hidden; the layout effect measures it and the button and
 *  puts it in place before the browser paints, then again (once a frame)
 *  while anything scrolls or the window is resized, and when an animation
 *  or transition ends or the page or the button changes size. It is hidden
 *  while the button is outside the window or cut off by a scrolling pane. */
function SignUpTipFloat({ frame, text, side, align }: { frame: RefObject<HTMLSpanElement | null>; text: string; side?: "top"; align?: "end" }) {
  const tip = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    let raf = 0;
    // The button is cut off by something it sits in (it kept the keyboard
    // focus and was scrolled out of the tutor's message pane): it is inside
    // the window but cannot be seen, so the tooltip is not shown either.
    let cut = false;
    const place = () => {
      raf = 0;
      try {
        const el = tip.current;
        const wrap = frame.current;
        if (!el || !wrap) return;
        const size = el.getBoundingClientRect();
        const root = document.documentElement;
        const p = placeSignUpTip({
          button: (wrap.querySelector("a, button") ?? wrap).getBoundingClientRect(),
          tip: { width: size.width, height: size.height },
          viewport: { width: root.clientWidth, height: root.clientHeight },
          side,
          align,
        });
        el.style.top = `${p.top}px`;
        el.style.left = `${p.left}px`;
        el.style.visibility = p.hidden || cut ? "hidden" : "visible";
      } catch {
        /* old browser: the copy stays hidden */
      }
    };
    const later = () => {
      if (!raf) raf = window.requestAnimationFrame(place);
    };
    place();
    // capture: a scroll inside a pane (the tutor's messages) does not bubble.
    window.addEventListener("scroll", later, { passive: true, capture: true });
    window.addEventListener("resize", later, { passive: true });
    // The button can move with no scroll and no resize: the timed bar slides
    // up for 0.3 s (measured mid-slide, the tooltip would end over the
    // button), content above the button loads, the header label changes
    // language and the button grows.
    window.addEventListener("animationend", later, { passive: true, capture: true });
    window.addEventListener("transitionend", later, { passive: true, capture: true });
    let sizes: ResizeObserver | null = null;
    let seen: IntersectionObserver | null = null;
    try {
      const button = frame.current?.querySelector("a, button") ?? frame.current;
      if (button && typeof ResizeObserver !== "undefined") {
        sizes = new ResizeObserver(later);
        sizes.observe(document.body);
        sizes.observe(button);
      }
      // The default root is the window, and the answer takes every ancestor
      // that clips (overflow) into account.
      if (button && typeof IntersectionObserver !== "undefined") {
        seen = new IntersectionObserver((entries) => {
          const last = entries[entries.length - 1];
          if (!last) return;
          cut = !last.isIntersecting;
          later();
        });
        seen.observe(button);
      }
    } catch {
      /* old browser: placed on scroll and resize only */
    }
    return () => {
      window.removeEventListener("scroll", later, { capture: true });
      window.removeEventListener("resize", later);
      window.removeEventListener("animationend", later, { capture: true });
      window.removeEventListener("transitionend", later, { capture: true });
      sizes?.disconnect();
      seen?.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [frame, text, side, align]);
  return createPortal(
    <span ref={tip} className="su-float" aria-hidden="true">
      {text}
    </span>,
    document.body,
  );
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
   *  the screen, and every button with another action under it. Where there
   *  is no room on the side asked for, it goes to the other one. */
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
  // The page's JavaScript is running here: the top-layer copy is the tooltip
  // from now on, and the CSS one is switched off (data-su-float). False on
  // the server and in the first client render, so the HTML is the same.
  const [mounted, setMounted] = useState(false);
  const ready = mounted || !deferText;
  // Escape was pressed: closed until the pointer and the focus have left.
  const [closed, setClosed] = useState(false);
  // The pointer or the keyboard focus is on the button (Escape is listened for).
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setMounted(true);
    // The pointer or the keyboard focus was on the button before the script
    // woke up: the CSS tooltip that was showing hands over to the top-layer
    // copy. (A focus left behind by a mouse click does not: see onFocus.)
    try {
      const el = frame.current;
      if (!el || !canHover()) return;
      const button = el.querySelector("a, button");
      if (button?.matches(":hover")) setHovered(true);
      if (button?.matches(":focus-visible")) setFocused(true);
    } catch {
      /* old browser: it opens on the next hover or focus */
    }
  }, []);

  const active = hovered || focused;
  useEffect(() => {
    if (!active) {
      setClosed(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClosed(true);
    };
    // Leaving the page (a tap on this very button): closed, so a return by
    // the back button never finds it open with no pointer on the button.
    const onHide = () => {
      setHovered(false);
      setFocused(false);
    };
    // The focus or the pointer went away without telling the frame. /login's
    // button turns disabled on its own click, and a disabled button sends no
    // blur (old Chrome: no pointer-leave either), so the tooltip — now above
    // every bar and modal — would stay open with nobody on it. Asked again
    // whenever the focus moves, a pointer goes down, or the pointer enters
    // another element.
    const onElsewhere = (e: Event) => {
      const el = frame.current;
      if (!el) return;
      const button = el.querySelector("a, button");
      if (!el.contains(document.activeElement) || (button instanceof HTMLButtonElement && button.disabled)) setFocused(false);
      if (e.type === "pointerover" && !(e.target instanceof Node && el.contains(e.target))) setHovered(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onElsewhere, true);
    document.addEventListener("pointerdown", onElsewhere, true);
    document.addEventListener("pointerover", onElsewhere, true);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onElsewhere, true);
      document.removeEventListener("pointerdown", onElsewhere, true);
      document.removeEventListener("pointerover", onElsewhere, true);
      window.removeEventListener("pagehide", onHide);
    };
  }, [active]);

  useEffect(
    () => () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  return (
    <span
      ref={frame}
      className={`su-wrap${block ? " su-block" : ""}${center ? " su-center" : ""}${className ? ` ${className}` : ""}`}
      data-su-explain={explain}
      data-su-side={side}
      data-su-align={align}
      data-su-float={mounted ? "on" : undefined}
      onPointerEnter={(e) => {
        // A finger never opens it. A pen that hovers (a drawing tablet, a
        // Surface pen) does, as the CSS tooltip did.
        if (e.pointerType === "touch" || !canHover()) return;
        setHovered(true);
        // Counted for a resting MOUSE only, as before.
        if (e.pointerType !== "mouse") return;
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
        // KEYBOARD focus only. A mouse click focuses a link or button too
        // (Chrome, Firefox): after a Ctrl-click or a middle click the focus
        // stays on the button, and the tooltip would stay on screen with
        // nobody on it. A browser too old to know :focus-visible opens it on
        // any focus (and counts none, as before).
        let keyboard = false;
        let opens = true;
        try {
          keyboard = (e.target as HTMLElement).matches(":focus-visible");
          opens = keyboard;
        } catch {
          keyboard = false;
        }
        if (opens) setFocused(true);
        if (keyboard) explainOpened(surface, "focus");
      }}
      onBlur={() => setFocused(false)}
    >
      {children(ready ? tipId : undefined)}
      {/* .su-tip is the frame the CSS places (caption in the flow on touch;
          with a mouse the tooltip, until the script takes over). Inside it:
          the short caption (touch only) and the full sentence, which carries
          the id the button points at, so a screen reader always gets the
          full one — also while it is not displayed. */}
      {ready && (
        <span className="su-tip">
          {short && explain === "both" && <span className="su-tip-short">{short}</span>}
          <span id={tipId} role="tooltip" className="su-tip-text">
            {text}
          </span>
        </span>
      )}
      {/* The tooltip a mouse user sees, in the top layer: only once the
          script runs (mounted — by then the sentence is in the page too, the
          header's included). hovered / focused are only ever set on a screen
          with a mouse (canHover). */}
      {mounted && active && !closed && <SignUpTipFloat frame={frame} text={text} side={side} align={align} />}
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

/** The inside of the button in a narrow place: the "G", then the label's two
 *  halves on two lines ("Sign up" over "with Google") — the same words, in
 *  the same order. `joinFromSm`: one line again from sm (the header); without
 *  it, two lines at every width (the timed bar). The button itself also
 *  takes "su-google-compact" (the smaller size, below sm only). */
export function SignUpStackedFace({ locale, joinFromSm }: { locale: string | null | undefined; joinFromSm?: boolean }) {
  const [a, b] = signUpLabelParts(locale);
  return (
    <>
      <GoogleG />
      <span className={joinFromSm ? "flex flex-col items-start sm:flex-row sm:gap-1" : "flex flex-col items-start"}>
        <span className="whitespace-nowrap">{a}</span> <span className="whitespace-nowrap">{b}</span>
      </span>
    </>
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
  /** Google's light (white) or dark (#131314) button. Dark where this is a
   *  block's main action beside or above an outlined alternative (see the
   *  note at the top); light everywhere else. */
  theme?: "light" | "dark";
  /** A narrow place (the timed bar): the label on two lines beside the "G",
   *  and the compact size below sm. */
  stack?: boolean;
  explain?: SignUpExplainMode;
  block?: boolean;
  center?: boolean;
  side?: "top";
  align?: "end";
  /** The frame's layout classes (margins, width). */
  className?: string;
  /** Extra classes on the button itself (never a fill: see .su-google). */
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
  const cls = `${googleButtonClass(theme)}${stack ? " su-google-compact" : ""}${block ? " w-full" : ""}${buttonClassName ? ` ${buttonClassName}` : ""}`;
  return (
    <SignUpShell text={text} short={short} surface={surface} explain={explain} block={block} center={center} side={side} align={align} className={className}>
      {(describedBy) => (
        <SignInLink href={href} surface={surface} className={cls} beaconProps={beaconProps} onSignInClick={onSignInClick} rel={rel} describedBy={describedBy}>
          {stack ? <SignUpStackedFace locale={locale} /> : <SignUpFace label={signUpLabel(locale)} />}
        </SignInLink>
      )}
    </SignUpShell>
  );
}
