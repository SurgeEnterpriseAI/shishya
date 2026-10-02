// Where the "Sign up with Google" explanation goes on a screen with a mouse
// (2 Oct 2026, founder: "the hover is hiding behind").
//
// The explanation used to be a CSS tooltip inside the button's own frame, so
// whatever the button sat in could cut it off or paint over it: the header's
// tooltip went under the home page's sticky live strip (the header is its
// own layer, below that strip), and the guest tutor's was cut by the
// scrolling message pane. src/components/SignUpButton.tsx now shows it in a
// top layer — a copy rendered into <body>, position: fixed, above every
// other layer of the site (.su-float in src/app/globals.css) — and this
// module says where that copy goes, from three measurements: the button's
// box, the tooltip's size and the window's size.
//
// The rules, in this order of priority:
//   1. never over the button: the tooltip starts `gap` px under the button's
//      bottom edge, or ends `gap` px above its top edge — never between;
//   2. on the side asked for (under the button; above it where another
//      action sits under the button), unless it does not fit there and fits
//      on the other side — then the other side. If it fits on neither (a
//      window shorter than about 250 px) it takes the side with more room
//      and runs past the window's edge there rather than cover the button;
//   3. inside the window, at least `margin` px from every edge: sideways it
//      slides along the button; up and down it only ever moves AWAY from the
//      button;
//   4. hung from the button's left edge, or from its right edge (a button at
//      the right of the screen), before the slide in 3;
//   5. hidden while the button itself is wholly outside the window (it kept
//      the keyboard focus and the page was scrolled away from it).
//
// Pure: no React, no DOM — the component measures, this decides, the test
// (tests/unit/signup-cta.test.ts) pins it.

/** Px between the button's edge and the tooltip. */
export const SIGNUP_TIP_GAP = 8;
/** Px the tooltip keeps from every edge of the window. */
export const SIGNUP_TIP_MARGIN = 8;

/** A box in window coordinates (what getBoundingClientRect returns). */
export interface TipBox {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface TipPlaceInput {
  /** The button (the link or <button>, not its frame). */
  button: TipBox;
  /** The tooltip's own measured size. */
  tip: { width: number; height: number };
  /** The window, without its scrollbars. */
  viewport: { width: number; height: number };
  /** Preferred side: under the button (default) or above it. */
  side?: "top" | "bottom";
  /** Hang from the button's left edge (default) or its right edge. */
  align?: "start" | "end";
  gap?: number;
  margin?: number;
}

export interface TipPlacement {
  /** position: fixed coordinates, whole pixels. */
  top: number;
  left: number;
  /** The side it ended on. */
  side: "top" | "bottom";
  /** The button is not on screen (or a measurement is missing): show nothing. */
  hidden: boolean;
}

const finite = (...n: number[]) => n.every((x) => Number.isFinite(x));

export function placeSignUpTip(input: TipPlaceInput): TipPlacement {
  const { button: b, tip, viewport: v } = input;
  const gap = input.gap ?? SIGNUP_TIP_GAP;
  const margin = input.margin ?? SIGNUP_TIP_MARGIN;
  const wanted = input.side === "top" ? "top" : "bottom";

  if (!finite(b.top, b.left, b.right, b.bottom, tip.width, tip.height, v.width, v.height) || !(v.width > 0) || !(v.height > 0) || !(tip.width > 0) || !(tip.height > 0)) {
    return { top: 0, left: 0, side: wanted, hidden: true };
  }

  // Whole pixels, each rounded AWAY from the button and from the window's
  // edge, so neither the gap nor the margin is ever short by a fraction.
  const w = Math.ceil(tip.width);
  const h = Math.ceil(tip.height);
  const vw = Math.floor(v.width);
  const vh = Math.floor(v.height);

  // Rule 2: the side.
  const below = Math.ceil(b.bottom + gap); // the tooltip's top when it sits under the button
  const above = Math.floor(b.top - gap) - h; // … and when it sits above it
  const fitsBelow = below + h <= vh - margin;
  const fitsAbove = above >= margin;
  const roomBelow = vh - margin - below;
  const roomAbove = above + h - margin;
  let side: "top" | "bottom" = wanted;
  if (wanted === "bottom" && !fitsBelow) side = fitsAbove || roomAbove > roomBelow ? "top" : "bottom";
  else if (wanted === "top" && !fitsAbove) side = fitsBelow || roomBelow > roomAbove ? "bottom" : "top";

  // Rules 1 and 3 (up and down): pushed into the window only away from the button.
  const top = side === "bottom" ? Math.max(below, margin) : Math.min(above, vh - margin - h);

  // Rules 4 and 3 (sideways): the right edge first, then the left one — a
  // tooltip wider than the window keeps its start on screen.
  let left = Math.round(input.align === "end" ? b.right - w : b.left);
  left = Math.min(left, vw - margin - w);
  left = Math.max(left, margin);

  // Rule 5.
  const hidden = b.bottom <= 0 || b.top >= vh || b.right <= 0 || b.left >= vw;

  return { top, left, side, hidden };
}
