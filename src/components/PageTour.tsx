"use client";

// Reusable first-visit coach-mark tour.
//
// Mount this once on any page that needs a guided "here's where stuff
// is" walk-through for new visitors. Each tour is identified by a
// unique tourId; completion is persisted in localStorage so the same
// visitor never sees the same tour twice from the same browser. Bump
// the tourId suffix (e.g. "home-v1" → "home-v2") to force everyone
// through again after a major UX change.
//
// Steps with an `anchor` (matching a [data-tour="<anchor>"] in the
// page DOM) render as a tooltip pointing at the element. Steps with
// no anchor render centered as a modal — used for the welcome /
// closing screens.
//
// Design choices:
//  - Backdrop dims everything; the spotlighted element gets a 4 px
//    saffron ring + z-index bump so it pops without being recoloured.
//  - Tooltip auto-positions above or below the anchor based on which
//    side has more room. Re-measures on resize + scroll.
//  - "Skip tour" link in every step header; "Next" advances; final
//    step's "Got it ✓" closes and persists.
//  - Soft-launches: if the anchored element is missing from the DOM
//    (page change in flight, slow chunk, etc.), the tour skips that
//    step rather than throwing.

import { useEffect, useMemo, useRef, useState } from "react";

interface TourStep {
  /** Stable id used in analytics. Doesn't have to match anything in the DOM. */
  key: string;
  /** Optional [data-tour="..."] selector. If omitted, step renders centered. */
  anchor?: string;
  /** Preferred side relative to the anchor — auto if omitted. */
  placement?: "top" | "bottom";
  title: string;
  body: string;
  /** Optional emoji / icon shown next to the title. */
  icon?: string;
}

interface Coords {
  top: number;
  left: number;
  width: number;
  height: number;
}

const STORAGE_PREFIX = "shishya_tour_";

export function PageTour({
  tourId,
  steps,
  delayMs = 600,
}: {
  tourId: string;
  steps: TourStep[];
  /** Wait a beat after mount so the page settles + anchors exist. */
  delayMs?: number;
}) {
  const [armed, setArmed] = useState(false);
  const [idx, setIdx] = useState(0);
  const [anchorBox, setAnchorBox] = useState<Coords | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const storageKey = `${STORAGE_PREFIX}${tourId}`;

  // Decide whether to arm at all.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let done = false;
    try {
      done = window.localStorage.getItem(storageKey) === "done";
    } catch {
      // localStorage blocked (private mode / strict cookies) — fall
      // through and run the tour. The done-flag persists per-session
      // in component state anyway via the index, so visitors only
      // get one tour per page-load in the worst case.
    }
    if (done) return;
    const t = window.setTimeout(() => setArmed(true), delayMs);
    return () => window.clearTimeout(t);
  }, [storageKey, delayMs]);

  // Lock body scroll while tour is active so the spotlight ring
  // stays glued to its element on touch devices.
  useEffect(() => {
    if (!armed) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [armed]);

  // Resolve the anchor for the current step. Recompute on resize,
  // scroll (capture phase to catch inner scrollers), and step changes.
  useEffect(() => {
    if (!armed) return;
    const step = steps[idx];
    if (!step?.anchor) {
      setAnchorBox(null);
      return;
    }
    function measure() {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);
      if (!el) {
        // Anchor missing — skip this step.
        setAnchorBox(null);
        return;
      }
      const r = el.getBoundingClientRect();
      // VIEWPORT coordinates (no scrollY/scrollX). The overlay below is
      // a `position: fixed` container, so its children must be placed in
      // viewport space. Adding scrollY here (document space) pushed the
      // spotlight ring + tooltip `scrollY` px off whenever the page was
      // scrolled — the ring floated to the wrong spot and the tooltip
      // landed off-screen. The scroll listener re-measures continuously
      // so the ring tracks the element as the page moves.
      setAnchorBox({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
      // Bring into view if scrolled away.
      if (r.top < 80 || r.bottom > window.innerHeight - 80) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    // Re-measure once more after the smooth-scroll likely finishes.
    const t = window.setTimeout(measure, 400);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearTimeout(t);
    };
  }, [armed, idx, steps]);

  // Esc closes (dismisses + persists).
  useEffect(() => {
    if (!armed) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish(true);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, idx]);

  function next() {
    if (idx < steps.length - 1) setIdx(idx + 1);
    else finish(true);
  }
  function prev() {
    if (idx > 0) setIdx(idx - 1);
  }
  function finish(persist: boolean) {
    setArmed(false);
    if (persist) {
      try {
        window.localStorage.setItem(storageKey, "done");
      } catch {
        /* swallow */
      }
    }
  }

  // Tooltip placement: above the anchor if it has room, otherwise below.
  const placement = useMemo<"top" | "bottom" | "center">(() => {
    if (!anchorBox) return "center";
    const step = steps[idx];
    if (step?.placement) return step.placement;
    // anchorBox is already in viewport coords.
    const spaceAbove = anchorBox.top;
    const spaceBelow = window.innerHeight - (anchorBox.top + anchorBox.height);
    return spaceAbove > spaceBelow ? "top" : "bottom";
  }, [anchorBox, idx, steps]);

  if (!armed || steps.length === 0) return null;
  const step = steps[idx];
  if (!step) return null;
  const isLast = idx === steps.length - 1;

  // Tooltip CSS — width 18rem, anchored to the spotlight or centered.
  const tooltipStyle: React.CSSProperties = anchorBox
    ? placement === "top"
      ? {
          position: "fixed",
          top: anchorBox.top - 16,
          left: Math.max(
            16,
            Math.min(window.innerWidth - 304, anchorBox.left + anchorBox.width / 2 - 144),
          ),
          transform: "translateY(-100%)",
          width: 288,
        }
      : {
          position: "fixed",
          top: anchorBox.top + anchorBox.height + 16,
          left: Math.max(
            16,
            Math.min(window.innerWidth - 304, anchorBox.left + anchorBox.width / 2 - 144),
          ),
          width: 288,
        }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 320,
      };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Backdrop — clicking outside skips */}
      <div
        className="absolute inset-0 bg-ink-900/55 backdrop-blur-[1px]"
        onClick={() => finish(true)}
      />

      {/* Spotlight ring around the anchored element */}
      {anchorBox && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: anchorBox.top - 6,
            left: anchorBox.left - 6,
            width: anchorBox.width + 12,
            height: anchorBox.height + 12,
            borderRadius: 12,
            boxShadow: "0 0 0 4px rgb(251 146 60 / 0.85), 0 0 0 9999px rgb(15 23 42 / 0)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* The tooltip */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="rounded-xl border border-ink-200 bg-white p-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
            Quick tour · {idx + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={() => finish(true)}
            className="-mr-1 -mt-1 rounded p-1 text-xs text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            aria-label="Skip tour"
          >
            Skip
          </button>
        </div>
        <h3 className="mt-1.5 text-base font-semibold text-ink-900">
          {step.icon && <span className="mr-1.5" aria-hidden>{step.icon}</span>}
          {step.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={idx === 0}
            className="text-xs font-medium text-ink-500 hover:text-ink-800 disabled:invisible"
          >
            ← Back
          </button>
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <span
                key={s.key}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === idx ? "bg-saffron-500" : "bg-ink-300"
                }`}
                aria-hidden
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            className="rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            {isLast ? "Got it ✓" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
