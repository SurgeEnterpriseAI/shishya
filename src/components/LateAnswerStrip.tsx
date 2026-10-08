"use client";

// "Your question is answered" under the header (7 Oct 2026, build B3 — rules
// and why in src/lib/late-answer-notice.ts). A member whose question an AI
// outage left unanswered, and who has not opened the late answer yet, sees one
// thin line with a link into that conversation on the pages members come back
// to (/today, a results page, an exam's build-mock or PYQ page …) — not where
// the pick-up card already leads with it (home, dashboard, an exam hub), not on
// /chat (its own line), not during a paper, never on a Class 1-7 page (Header
// does not mount it there) or a school list a child may read.
// It renders nothing on the server and nothing for a guest: the shared session
// probe (src/lib/session-hint.ts) answers a guest with no request. A member's
// tab asks GET /api/me/late-answer at most once in LATE_STRIP_CACHE_MS
// (sessionStorage); opening the answer, or any /chat page, drops that copy, so
// the next page asks again (the chat that shows the answer marks it seen). Any
// page seen without the signed-in hint drops it too (sign-out).
// One CTA_CLICKED beacon { cta: "late-answer-open", surface: "header-strip" }.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchSignedIn, hasSessionHint } from "@/lib/session-hint";
import { clientUiLocale } from "@/lib/ui-locale-copy";
import { ctaBeacon } from "@/lib/cta-beacon";
import {
  LATE_STRIP_CACHE_KEY,
  lateStripCacheValue,
  lateStripPathAllowed,
  lateStripViewOf,
  readLateStripCache,
} from "@/lib/late-answer-notice";
import type { PickupAnsweredView } from "@/lib/pickup";

function store(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function dropCache(): void {
  try {
    store()?.removeItem(LATE_STRIP_CACHE_KEY);
  } catch {
    /* storage blocked */
  }
}

export function LateAnswerStrip() {
  const pathname = usePathname();
  const [view, setView] = useState<PickupAnsweredView | null>(null);

  useEffect(() => {
    let alive = true;
    setView(null);
    // B3 review: a signed-out tab keeps no member's copy — after sign-out (the
    // signOut event clears the hint) a guest, or the next account on a shared
    // phone, never sees the last member's question from the tab cache.
    if (!hasSessionHint()) dropCache();
    if (!lateStripPathAllowed(pathname)) {
      // On /chat the answer is offered (and, once shown, marked seen) by the chat itself.
      if (pathname?.startsWith("/chat")) dropCache();
      return;
    }
    const s = store();
    let cached: ReturnType<typeof readLateStripCache> = null;
    try {
      cached = readLateStripCache(s?.getItem(LATE_STRIP_CACHE_KEY), Date.now());
    } catch {
      cached = null;
    }
    if (cached) {
      setView(cached.view);
      return;
    }
    fetchSignedIn().then((signedIn) => {
      if (!alive || signedIn !== true) return;
      fetch(`/api/me/late-answer?lang=${encodeURIComponent(clientUiLocale())}`, { credentials: "same-origin", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: unknown) => {
          if (j === null) return;
          const v = lateStripViewOf(j);
          try {
            s?.setItem(LATE_STRIP_CACHE_KEY, lateStripCacheValue(v, Date.now()));
          } catch {
            /* storage full or blocked: ask again next page */
          }
          if (alive) setView(v);
        })
        .catch(() => {
          /* best-effort: the page is complete without it */
        });
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  if (!view) return null;
  return (
    <div className="border-b border-emerald-200 bg-emerald-50" data-late-answer-strip>
      <div className="container-prose flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs">
        <p className="line-clamp-2 min-w-0 flex-1 text-ink-700" title={view.note}>
          <span className="font-semibold text-emerald-800">{view.label}</span>
          {view.text && <span className="text-ink-800"> · “{view.text}”</span>}
          <span className="text-ink-500"> · {view.meta}</span>
        </p>
        <Link
          href={view.href}
          prefetch={false}
          rel="nofollow"
          onClick={() => {
            dropCache();
            ctaBeacon("late-answer-open", { surface: "header-strip" });
          }}
          className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-700"
        >
          {view.cta}
        </Link>
      </div>
    </div>
  );
}
