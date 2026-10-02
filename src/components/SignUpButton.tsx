"use client";

// "Sign up with Google" — the ONE guest sign-up button (2 Oct 2026, founder,
// standing: sign-up buttons visible and clear; "Sign up with Google" because
// students may think sign-up needs a lot of details; on hover, a description
// of how signing up is useful). Words: the label in
// src/lib/signup-cta-copy.ts; the explanation in the table
// src/data/signup-places/ (see THE WORDS OF THE EXPLANATION below). Styles:
// src/app/globals.css (.su-google, .su-wrap, .su-tip, .su-float).
//
// THE WORDS OF THE EXPLANATION (2 Oct 2026, later — founder: "Each sign in
// with Google should be contextualized from the location where it is. It
// should not be the same tooltip information for all the Google sign up
// buttons"). Every placement has its own entry in a table of 76 (a tooltip
// and a caption each, en / hi / te). The button decides its entry from its
// door id, its own /login link and what the caller passes
// (src/lib/signup-place.ts signUpPlaceFor — fail closed: an exam is named
// only where the link returns to it, mocks are promised only for an exam
// that can serve one), plus what the page said about itself
// (src/components/SignUpPageContext.tsx). The words then come one of two ways:
//   • a SERVER page resolves them (src/lib/signup-place-words.ts) and passes
//     `text` and `short`: they are in the page's HTML with the button;
//   • a client island passes neither: the reader's ONE language is loaded on
//     demand, with the rules that choose the entry
//     (src/lib/use-signup-words.ts) — the table is about 150 KB, the rules
//     another 10, and this component is in the header's bundle on every page,
//     so no client code imports either statically (only their types). Until
//     they arrive the button shows without its tooltip (as the header's
//     always did before the script ran), and a caption's line is held open so
//     nothing moves when it fills. If the fetch FAILS (a weak signal), the
//     line is let go — a button never stands over an empty line — the fetch
//     is tried again by itself, and a hover or a keyboard focus on the button
//     asks for the words again (`onWant`; src/lib/use-signup-words.ts says
//     when the words are fetched, and that a touch screen fetches none for a
//     tooltip nobody can open).
//
// What it renders:
//   • the label "Sign up with Google" (en / hi / te), never a surface's own
//     wording;
//   • ALWAYS Google's LIGHT button — white fill, #747775 stroke, #1F1F1F
//     text, the standard colour "G", 12 / 10 / 12 px paddings, pill shape —
//     to Google's branding guidelines (read 2 Oct 2026). ONE LOOK EVERYWHERE
//     (2 Oct 2026, founder, with a screenshot of the white button: "wherever
//     the sign in or sign up … has to be replaced with Google sign up the
//     way which I have showed"). There is no saffron sign-up button and no
//     dark one: the `theme` prop is gone, a caller cannot ask for another
//     look. History, so nobody brings the dark one back without reading it:
//     for a few hours on 2 Oct nine placements wore Google's DARK button
//     (#131314), because on 28 Sep sign-ups from hubs fell from about 11 a
//     day to 4 when the sign-in became the quieter of two buttons. The rule
//     that replaces it lives with the CALLERS: in every block where this
//     button sits beside or above an alternative, this button comes first
//     and the alternative is a text link or a 1 px ink outline — never a
//     filled or saffron-outlined button (tests/unit/signup-everywhere.test.ts).
//     The "G" below is the SVG Google's own HTML-button generator on that
//     page emits, unchanged (see the note on GoogleG for what is still open);
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
//   • A VISIBLE REASON on every device (2 Oct 2026, founder: "everywhere try
//     to say something why sign in will help them"). `explain` says where
//     the visible line comes from:
//       "both" (the default) — the SHORT caption (signUpExplainShort: "No
//         forms. SSC CGL is set up as your exam.") sits under the button, in
//         the flow, on a phone AND on a desktop (.su-cap; until this build a
//         screen with a mouse showed no caption);
//       "own" — the placement has its own benefit line right beside the
//         button (the site card's points, the early line's sentence, "to
//         join this group"): no caption is rendered, so there are never two.
//         The caller marks that line with data-su-reason (the test finds it);
//       "tooltip" — no visible line of the button's own: the header (no
//         room, and nothing may sit over that tap) and the timed bar (its
//         own line is beside the button). Only those two files may use it.
//   • the explanation. The full sentence is ONE element in the page
//     (role="tooltip", the button's aria-describedby) — what a screen reader
//     hears, on every screen, in every mode. What a mouse user SEES on hover
//     and on keyboard focus is a copy of it in a TOP LAYER (SignUpTipFloat
//     below): rendered into <body>, position: fixed, above every other layer
//     of the site, never in the way of a click (pointer-events: none),
//     aria-hidden. So nothing the button sits in can cut it off or paint over
//     it — the header's tooltip used to go under the home page's sticky live
//     strip, and the guest tutor's was cut by the scrolling message pane
//     (founder, 2 Oct 2026: "the hover is hiding behind"). It is placed from
//     the button's box by src/lib/signup-tip-place.ts: under the button
//     (over the caption, whose words it repeats and adds to), or ABOVE it
//     (side="top") wherever another action sits under the button — the "or
//     practise without sign-in" links, the tutor and quiz buttons — so the
//     pointer's way to that action is never covered; on the other side when
//     there is no room; hung from the button's left or right edge
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
//     On a touch screen the full sentence is never shown; the caption (or
//     the placement's own line) is what a phone reads.
//   • a page that speaks all 22 languages (a study-group invite, a
//     discussion, the paper-rating poll) passes `continueLabel`
//     (t("login.continue")): en / hi / te read "Sign up with Google", any
//     other language its own "Continue with Google" — also an approved
//     Google wording — instead of an English label, and gets no caption (the
//     caption's words exist in three languages only).
//
// What it does NOT change: the click. In-page buttons are still the shared
// SignInLink (one "signin-click" beacon with the same surface ids, and the
// skip-/login test's two arms exactly as before); the header is still a
// plain /login link counted by the root layout's listener.
//
// Measuring: one "signup-explain" beacon when the explanation is opened on a
// hover device, at most once per page view, never on a school page a child
// may be reading (Class 1-7, /schooling, a board hub) — and only when there
// IS an explanation to open (2 Oct 2026 review): while a client island's
// words have not arrived, or their fetch failed, a hover or a focus shows
// nothing and is not counted.
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
  googleButtonLabel,
  isSignUpLocale,
  signUpLabel,
  signUpLabelParts,
  type SignUpContext,
} from "@/lib/signup-cta-copy";
import type { SignUpPlace, SignUpPractice, SignUpVars } from "@/lib/signup-place";
import { placeSignUpTip } from "@/lib/signup-tip-place";
import { useSignUpPageData, useSignUpWords, useSignUpWordsFailed, wantSignUpWords } from "@/lib/use-signup-words";

/** Google's standard colour "G", exactly as Google's HTML-button generator
 *  (developers.google.com/identity/branding-guidelines) emits it. Do not
 *  redraw, recolour or stretch it, and render it only on Google's white
 *  button fill (the guidelines also allow their neutral #F2F2F2 and dark
 *  #131314 fills; this site uses the white one only). Decorative here: the
 *  button's text names Google.
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

/** Where the VISIBLE reason comes from (the tooltip and the screen reader's
 *  description are there in every mode):
 *  "both": the short caption under the button, on every device.
 *  "own": the placement's own benefit line sits right beside the button
 *  (marked data-su-reason by the caller) — no caption, so never two.
 *  "tooltip": no visible line — the header and the timed bar only. */
export type SignUpExplainMode = "both" | "own" | "tooltip";

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
  onWant,
  children,
}: {
  /** The full explanation (the entry's tooltip): the tooltip, and the
   *  button's description for a screen reader. Empty while a client island's
   *  words are still loading: no tooltip and no description until then. */
  text: string;
  /** A client island's words are not here (`text` is empty) and the button
   *  is hovered or took the keyboard focus: ask for them now
   *  (src/lib/use-signup-words.ts wantSignUpWords). Not passed where a server
   *  page gave the words. */
  onWant?: () => void;
  /** The short caption shown under the button on every device (the entry's
   *  caption) — rendered for explain "both" only. */
  short?: string;
  /** The sign-in door this button is (the "signup-explain" beacon's surface). */
  surface: string;
  explain?: SignUpExplainMode;
  /** Full width (the button stretches). */
  block?: boolean;
  /** Centre the button and the caption. */
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
  // The frame may show its words (the header: only after mount) …
  const shown = mounted || !deferText;
  // … and has the full sentence to show (a client island's words load on demand).
  const ready = shown && text !== "";
  // The same, for the hover timer, which fires 0.6 s after the pointer came:
  // the "explanation opened" beacon goes out only if there is one to open.
  const readyNow = useRef(false);
  useEffect(() => {
    readyNow.current = ready;
  }, [ready]);
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
        // The words are not here (not fetched yet, or the fetch failed): ask for them.
        if (text === "") onWant?.();
        // Counted for a resting MOUSE only, as before — and only when the explanation is there to open.
        if (e.pointerType !== "mouse") return;
        if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(() => {
          if (readyNow.current) explainOpened(surface, "hover");
        }, SIGNUP_EXPLAIN_HOVER_MS);
      }}
      onPointerLeave={() => {
        setHovered(false);
        if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }}
      onFocus={(e) => {
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
        // The words are not here: a keyboard focus asks for them — on a touch
        // screen too (a keyboard or a switch on a phone), where they are the
        // button's description for a screen reader. A tap does not.
        if (opens && text === "") onWant?.();
        if (!canHover()) return;
        if (opens) setFocused(true);
        // Counted only when the explanation is there to open.
        if (keyboard && ready) explainOpened(surface, "focus");
      }}
      onBlur={() => setFocused(false)}
    >
      {children(ready ? tipId : undefined)}
      {/* The short caption: in the flow under the button on EVERY device
          (explain "both" only) — plain text, no role, nothing the button
          points at. It is in the server HTML with the button, so nothing
          moves when the script runs. */}
      {shown && short && explain === "both" && <span className="su-cap">{short}</span>}
      {/* .su-tip is the frame the CSS places: never displayed on touch; with
          a mouse the tooltip, until the script takes over. Inside it the
          full sentence, which carries the id the button points at, so a
          screen reader always gets the full one — also while it is not
          displayed. */}
      {ready && (
        <span className="su-tip">
          <span id={tipId} role="tooltip" className="su-tip-text">
            {text}
          </span>
        </span>
      )}
      {/* The tooltip a mouse user sees, in the top layer: only once the
          script runs (mounted — by then the sentence is in the page too, the
          header's included, and a client island's words have arrived).
          hovered / focused are only ever set on a screen with a mouse
          (canHover). */}
      {mounted && active && !closed && text !== "" && <SignUpTipFloat frame={frame} text={text} side={side} align={align} />}
    </span>
  );
}

/** The Google-branded button's class: Google's light button
 *  (src/app/globals.css .su-google). It takes no argument on purpose — there
 *  is one look, and no caller can ask for another. */
export function googleButtonClass(): string {
  return "su-google";
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
   *  link returns to a page of that exam (signUpPlaceFor). */
  exam?: string | null;
  examCode?: string | null;
  /** That exam can serve a mock ("canServe": 5 or more checked questions) or
   *  is known to hold no practice ("none"). Not known: leave it out — mocks
   *  are promised for "canServe" only. Without it the button takes what the
   *  page said about this exam (SignUpPageContext), if anything. */
  practice?: SignUpPractice | null;
  /** That exam is an olympiad (the catalogue's category). */
  olympiad?: boolean | null;
  /** What fills the entry and claims nothing about the account: {year} of a
   *  previous-year-pattern set, {n} of a chapter's set, {institute} of a
   *  batch, the live paper's {exam}. */
  vars?: SignUpVars | null;
  /** "pyq-year": the questions in this year's set (a timed set needs five). */
  setQuestions?: number | null;
  /** A fixed entry of the table instead of the door's own rules. */
  place?: SignUpPlace;
  /** One of the five old variants, as an alias (signUpPlaceOfContext). */
  context?: SignUpContext;
  /** The words, already resolved by a SERVER component
   *  (src/lib/signup-place-words.ts signUpWords): the tooltip and the
   *  caption. With them nothing is decided or loaded here. */
  text?: string;
  short?: string;
  /** t("login.continue") on a page that speaks all 22 languages: the label
   *  for a language other than en / hi / te (its own "Continue with Google")
   *  instead of English. Such a language gets no caption. */
  continueLabel?: string;
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

/** Holds a caption's line open while a client island's words load, so the
 *  page does not move when the caption fills (a no-break space). Let go
 *  ("") when the fetch has failed: no button stands over an empty line. */
export const SIGNUP_CAPTION_PENDING = "\u00a0";

/** An in-page "Sign up with Google" button for a GUEST: the shared SignInLink
 *  (beacon + the skip-/login test) with the one label and the explanation. */
export function SignUpButton({
  href,
  surface,
  locale,
  exam,
  examCode,
  practice,
  olympiad,
  vars,
  setQuestions,
  place,
  context,
  text: givenText,
  short: givenShort,
  continueLabel,
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
  // What the page said about itself (null on the server and until its island mounts).
  const page = useSignUpPageData();
  const cls = `${googleButtonClass()}${stack ? " su-google-compact" : ""}${block ? " w-full" : ""}${buttonClassName ? ` ${buttonClassName}` : ""}`;
  const label = continueLabel ? googleButtonLabel(locale, continueLabel) : signUpLabel(locale);
  // The caption's words exist in en / hi / te: on a 22-language page another
  // language gets none (English small print under a Tamil button helps no one).
  const mode: SignUpExplainMode = explain === "both" && continueLabel && !isSignUpLocale(locale ?? "en") ? "own" : explain;
  // A server page passed the words. Otherwise the placement — its door, the
  // page its own link returns to, what the caller and the page know — is
  // resolved once the reader's language and the rules have loaded (on demand;
  // at once where a caption is waiting for them).
  const words = useSignUpWords(
    locale,
    { surface, callback: callbackOfLoginHref(href), exam, examCode, practice, olympiad, page, vars, setQuestions },
    { given: typeof givenText === "string" ? { text: givenText, short: givenShort ?? "" } : null, place, context, now: mode === "both" },
  );
  // The fetch of the words failed (a weak signal): the caption's line is let go until a retry brings them.
  const failed = useSignUpWordsFailed(locale);
  const text = words?.text ?? "";
  const short = words ? words.short : failed ? "" : SIGNUP_CAPTION_PENDING;
  return (
    <SignUpShell
      text={text}
      short={short}
      surface={surface}
      explain={mode}
      block={block}
      center={center}
      side={side}
      align={align}
      className={className}
      onWant={typeof givenText === "string" ? undefined : () => wantSignUpWords(locale)}
    >
      {(describedBy) => (
        <SignInLink href={href} surface={surface} className={cls} beaconProps={beaconProps} onSignInClick={onSignInClick} rel={rel} describedBy={describedBy}>
          {stack ? <SignUpStackedFace locale={locale} /> : <SignUpFace label={label} />}
        </SignInLink>
      )}
    </SignUpShell>
  );
}
