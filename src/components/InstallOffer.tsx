"use client";

// "Add Shishya to your home screen" — one quiet, once-only offer
// (13 Sep 2026, phone-first speed). Rules live in src/lib/install-offer.ts:
// Android, second visit or later, only after the browser fired
// `beforeinstallprompt`, never inside a mock / results / sign-in flow, never
// while another dialog is on screen, and once it has been shown it never
// comes back — "No thanks" is forever.
//
// Stacking (review fix): the bar is z-[45] — above the z-40 "Suggest a
// feature" pill (FeedbackWidget, bottom-right, signed-in pages), which used
// to sit exactly over "No thanks", and below every z-50 panel/modal. Being on
// top means it must not cover another sheet's controls (SignupNudge's "Sign
// up free" is a z-40 bottom sheet): it never opens while a dialog is on
// screen, and if one opens while the bar is up, the bar steps aside for good.
//
// We always call preventDefault() on beforeinstallprompt so Chrome's own
// mini-infobar never appears on top of (or instead of) this single offer;
// the browser menu's "Install app" keeps working regardless.
//
// Beacons: CTA_CLICKED { cta: "install-offer", surface, action } — same
// shape as SignupNudge, so the CTA report groups it. action "yielded" = the
// bar was taken away without the student choosing (blocked page / another
// sheet), so "shown" never reads as "seen and ignored". No service worker.
//
// Language (16 Sep 2026): the bar speaks the reader's language — URL
// prefix, else the shishya-lang cookie — from the dict-free
// INSTALL_OFFER_BY_LOCALE map. It is read at render time, which is safe
// here: the bar never renders on the server or in the first client render
// (phase starts "waiting"), so there is no hydration text to mismatch.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  INSTALL_OFFER_BY_LOCALE,
  INSTALL_OFFER_KEY,
  VISITS_KEY,
  VISIT_COUNTED_KEY,
  installOfferLocale,
  installOfferMustYield,
  isAndroidBrowserUA,
  nextVisitCount,
  readOfferState,
  shouldOfferInstall,
  type OfferState,
} from "@/lib/install-offer";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

type Action = "shown" | "accepted" | "prompt-dismissed" | "dismissed" | "yielded";

function beacon(action: Action) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: location.pathname,
          props: { cta: "install-offer", surface: "install-offer", action },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* best-effort */
  }
}

/** document.cookie, or "" where it cannot be read (sandboxed frames). */
function readCookies(): string {
  try {
    return document.cookie;
  } catch {
    return "";
  }
}

function store(state: Exclude<OfferState, null>) {
  try {
    localStorage.setItem(INSTALL_OFFER_KEY, state);
  } catch {
    /* private mode */
  }
}

/** Any other dialog / bottom sheet actually on screen (SignupNudge, the
 *  discussions drawer, tours, modals). All of them render only while open;
 *  getClientRects() also skips anything display:none. */
function otherDialogOnScreen(): boolean {
  try {
    const els = document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"]');
    for (const el of Array.from(els)) {
      if (el.getClientRects().length > 0) return true;
    }
  } catch {
    /* old browser */
  }
  return false;
}

interface Ctx {
  visits: number;
  state: OfferState;
  standalone: boolean;
  android: boolean;
}

type Phase = "waiting" | "visible" | "done";

export function InstallOffer() {
  const pathname = usePathname() ?? "/";
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [hasPrompt, setHasPrompt] = useState(false);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Count this visit, read the stored state, listen for the browser's
  // install signal. Storage unavailable → ctx stays null → never offered
  // (we could not promise "once").
  useEffect(() => {
    let standalone = false;
    try {
      standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
    } catch {
      /* old browser */
    }

    try {
      const counted = sessionStorage.getItem(VISIT_COUNTED_KEY) === "1";
      const visits = nextVisitCount(localStorage.getItem(VISITS_KEY), counted);
      if (!counted) {
        localStorage.setItem(VISITS_KEY, String(visits));
        sessionStorage.setItem(VISIT_COUNTED_KEY, "1");
      }
      setCtx({
        visits,
        state: readOfferState(localStorage.getItem(INSTALL_OFFER_KEY)),
        standalone,
        android: isAndroidBrowserUA(navigator.userAgent),
      });
    } catch {
      /* private mode — stay silent */
    }

    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setHasPrompt(true);
    };
    const onInstalled = () => {
      store("accepted");
      promptRef.current = null;
      setPhase("done");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Watch for other dialogs only while it matters: the offer is possible
  // except for a dialog, or the bar is up. One cheap DOM query a second.
  const armed =
    phase === "visible" ||
    (phase === "waiting" &&
      ctx !== null &&
      shouldOfferInstall({ ...ctx, hasPrompt, path: pathname, otherDialogOpen: false }));
  useEffect(() => {
    if (!armed) return;
    const check = () => setDialogOpen(otherDialogOnScreen());
    check();
    const id = window.setInterval(check, 1000);
    return () => window.clearInterval(id);
  }, [armed]);

  // Decide once. Writing "shown" BEFORE rendering is what makes it
  // once-only: a reload, a new tab or a later visit reads a non-null state.
  // The dialog check is read live here (the polled state can be ~1 s old).
  useEffect(() => {
    if (!ctx || phase !== "waiting") return;
    if (!shouldOfferInstall({ ...ctx, hasPrompt, path: pathname, otherDialogOpen: dialogOpen || otherDialogOnScreen() })) {
      return;
    }
    try {
      localStorage.setItem(INSTALL_OFFER_KEY, "shown");
    } catch {
      return;
    }
    setPhase("visible");
    beacon("shown");
  }, [ctx, hasPrompt, pathname, dialogOpen, phase]);

  // Client-side navigation into a mock / results / sign-in page keeps this
  // island mounted, and another sheet may open over the page — get out of
  // the way, for good.
  useEffect(() => {
    if (phase !== "visible") return;
    if (!installOfferMustYield(pathname, dialogOpen)) return;
    promptRef.current = null;
    setPhase("done");
    beacon("yielded");
  }, [phase, pathname, dialogOpen]);

  if (phase !== "visible") return null;

  async function add() {
    const ev = promptRef.current;
    promptRef.current = null;
    setPhase("done");
    if (!ev) return;
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice?.outcome === "accepted") {
        store("accepted");
        beacon("accepted");
      } else {
        store("dismissed");
        beacon("prompt-dismissed");
      }
    } catch {
      store("dismissed");
    }
  }

  function noThanks() {
    promptRef.current = null;
    store("dismissed");
    beacon("dismissed");
    setPhase("done");
  }

  const copy = INSTALL_OFFER_BY_LOCALE[installOfferLocale(pathname, readCookies())];

  return (
    <div
      role="region"
      aria-label={copy.aria}
      className="fixed inset-x-0 bottom-0 z-[45] px-3 pb-safe print:hidden"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-saffron-300 bg-white p-3 shadow-lg">
        {/* The installed icon itself (a PNG, so no Devanagari font fetch). */}
        <img src="/icons/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-md" />
        <p className="min-w-0 flex-1 text-sm text-ink-800">{copy.body}</p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => void add()}
            className="rounded-lg bg-saffron-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-saffron-600"
          >
            {copy.add}
          </button>
          <button
            type="button"
            onClick={noThanks}
            className="text-xs font-medium text-ink-500 hover:text-ink-700"
          >
            {copy.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
