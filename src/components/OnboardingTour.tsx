"use client";

// First-time dashboard tour — anchored tooltips that highlight real UI
// pieces and walk the new user through "pick exam → take mock →
// weakness map → ask Shishya".
//
// Design choices:
// - Anchored to data-onboard="<key>" attributes on the actual DOM so the
//   tour never gets out of sync when copy changes (vs hardcoded coords).
// - Steps with no anchor render as a centered modal (welcome + done).
// - Backdrop dims the whole page, but the spotlighted element keeps its
//   colours via a transparent cutout (positioned ring + raised z-index).
// - One "Skip" link, "Next" advances, last step "Got it ✓" → POSTs to
//   /api/me/onboard, sets a sessionStorage flag so re-opens within the
//   same tab don't flicker the tour back on while the route is reloading.

import { useEffect, useMemo, useRef, useState } from "react";

type StepBase = {
  key: string;
  title: string;
  body: string;
};
type AnchorStep = StepBase & {
  anchor: string;
  placement?: "top" | "bottom"; // auto if unset
};
type CenterStep = StepBase & { anchor?: undefined };
type Step = AnchorStep | CenterStep;

const STEPS: Step[] = [
  {
    key: "welcome",
    title: "Welcome to Shishya 👋",
    body:
      "30 seconds. Let me show you the 3 things that matter, then you can start your first mock.",
  },
  {
    key: "exam-picker",
    anchor: "explore",
    title: "1 · Pick your exam",
    body:
      "Search or browse 163 Indian entrance exams — SSC, RRB, banking, JEE, NEET, UPSC, state boards, olympiads, and more. Click any card to open it.",
  },
  {
    key: "start-mock",
    anchor: "explore",
    title: "2 · Start a mock",
    body:
      "Inside each exam: previous year papers, fresh daily mocks, and adaptive practice. Take one to see where you stand — every question has a worked solution.",
  },
  {
    key: "shishya-ai",
    anchor: "header-tutor",
    placement: "bottom",
    title: "3 · Ask Shishya anytime",
    body:
      "Stuck on a concept? Click the help icon up here. Answers grounded in verified Shishya content, with sources you can check — in English, Hindi, or your language. All free.",
  },
  {
    key: "done",
    title: "That's it. You're set ✨",
    body:
      "Every mock you take builds your personal weakness map. Come back daily — fresh practice is queued up for you each morning.",
  },
];

const SKIPPED_KEY = "shishya:onboarding-done";

export function OnboardingTour() {
  const [idx, setIdx] = useState(0);
  // Whether to render at all — flip off after the user finishes/skips so the
  // backdrop disappears immediately before the server route refreshes.
  const [open, setOpen] = useState(true);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const step = STEPS[idx];
  const isFirst = idx === 0;
  const isLast = idx === STEPS.length - 1;

  // Already finished in this tab? Don't re-open during a route refresh.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SKIPPED_KEY) === "1") setOpen(false);
  }, []);

  // Measure the anchor when the step changes (and on resize). We do NOT
  // listen to scroll here — scrollIntoView + a scroll-event remeasure
  // creates a self-triggering loop that hangs the tab (smooth scroll
  // fires scroll events → measure → scrollIntoView → repeat). Step 1
  // scrolls the anchor in once; the user's own scroll after that just
  // shifts the spotlight off-screen, which is fine.
  useEffect(() => {
    if (!open) return;
    if (!("anchor" in step) || !step.anchor) {
      setAnchorRect(null);
      return;
    }
    const anchor = step.anchor;
    let cancelled = false;

    const remeasure = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-onboard="${anchor}"]`);
      if (!el) {
        setAnchorRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setAnchorRect(r);
    };

    // One-time: bring the anchor into view for this step.
    const el = document.querySelector<HTMLElement>(`[data-onboard="${anchor}"]`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    // Measure shortly after the scroll has had time to settle.
    const t1 = window.setTimeout(remeasure, 350);
    const t2 = window.setTimeout(remeasure, 800);

    window.addEventListener("resize", remeasure);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", remeasure);
    };
  }, [idx, open, step]);

  async function finish() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SKIPPED_KEY, "1");
    }
    setOpen(false);
    // Fire-and-forget — even if it fails, the user won't see the tour again
    // in this tab thanks to sessionStorage.
    try {
      await fetch("/api/me/onboard", { method: "POST" });
    } catch {
      /* best-effort */
    }
  }

  function next() {
    if (isLast) {
      void finish();
    } else {
      setIdx((i) => Math.min(STEPS.length - 1, i + 1));
    }
  }
  function back() {
    setIdx((i) => Math.max(0, i - 1));
  }

  // Position the card near the anchor (below by default, above if no room).
  const cardPos = useMemo(() => {
    if (!anchorRect) return null;
    if (typeof window === "undefined") return null;
    const vh = window.innerHeight;
    const placement =
      ("placement" in step && step.placement) ||
      (anchorRect.bottom + 200 < vh ? "bottom" : "top");
    const cardW = Math.min(360, window.innerWidth - 32);
    const left = Math.max(
      16,
      Math.min(window.innerWidth - cardW - 16, anchorRect.left + anchorRect.width / 2 - cardW / 2),
    );
    const top =
      placement === "bottom"
        ? anchorRect.bottom + 12
        : Math.max(16, anchorRect.top - 12);
    return { top, left, width: cardW, placement };
  }, [anchorRect, step]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shishya-onboarding-title"
    >
      {/* Backdrop. We do a "punch-out" effect for anchored steps by stacking
          a transparent box at the anchor coords with a heavy outline so the
          area looks lit up against the dimmed page. */}
      <div className="absolute inset-0 bg-ink-900/55 backdrop-blur-[1px]" />

      {anchorRect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-4 ring-saffron-400 ring-offset-2 ring-offset-saffron-50 transition-all"
          style={{
            top: anchorRect.top - 6,
            left: anchorRect.left - 6,
            width: anchorRect.width + 12,
            height: anchorRect.height + 12,
            boxShadow: "0 0 0 9999px rgba(15, 18, 33, 0.0)", // safety: keeps composite layer
          }}
        />
      )}

      {/* Card */}
      <div
        ref={cardRef}
        className="absolute rounded-xl border border-saffron-200 bg-white p-5 shadow-2xl"
        style={
          cardPos
            ? {
                top:
                  cardPos.placement === "top"
                    ? Math.max(16, cardPos.top - 180)
                    : cardPos.top,
                left: cardPos.left,
                width: cardPos.width,
              }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(420px, calc(100vw - 32px))",
              }
        }
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
            Step {idx + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-xs text-ink-400 hover:text-ink-700"
            aria-label="Skip the tour"
          >
            Skip
          </button>
        </div>
        <h3
          id="shishya-onboarding-title"
          className="mt-2 text-base font-semibold text-ink-900"
        >
          {step.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{step.body}</p>

        {/* Pip indicator */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-saffron-500" : "w-1.5 bg-ink-300"
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={back}
            disabled={isFirst}
            className="text-xs text-ink-500 hover:text-ink-800 disabled:opacity-30 disabled:hover:text-ink-500"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={next}
            className="btn-primary !py-1.5 !px-4 text-xs"
            autoFocus
          >
            {isLast ? "Got it ✓" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
