"use client";

// The Header's post-sign-in island (30 Sep 2026, sign-up build 2). Two jobs,
// both silent for everyone else (no cookie / no kept chat = no request):
//   1. a guest's tutor chat, kept when the guest pressed sign-in on the chat
//      (src/lib/guest-chat-carry.ts), is imported once on whichever page the
//      browser lands after signing in — the chat page does its own import,
//      so it is skipped there;
//   2. the one-time "Your Shishya is ready" strip: only when createUser left
//      its cookie (src/lib/welcome-strip.ts), only where a paper is not in
//      progress or about to open, and only if GET /api/me/welcome says so.
// Never on a Class 1-7 or class-agnostic school page (the Header also skips
// the island when childSafe). The strip's code and words load only when
// there is something to show (WelcomeStripPanel, next/dynamic), so the island
// costs every page almost nothing. Inline under the header, never a popup.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { isChildSchoolPath } from "@/lib/signup-pitch";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { hasSessionHint } from "@/lib/session-hint";
import { ctaBeacon } from "@/lib/cta-beacon";
import {
  carryDecision,
  dropKeptGuestChat,
  guestChatHref,
  markGuestChatImported,
  postGuestChatImport,
  readKeptGuestChat,
} from "@/lib/guest-chat-carry";
import { WELCOME_CTA, cookieHasWelcome, welcomeCookieClearString, welcomeStripAllowedHere, type WelcomeData } from "@/lib/welcome-strip";

const WelcomeStripPanel = dynamic(() => import("./WelcomeStripPanel").then((m) => m.WelcomeStripPanel), { ssr: false });

// One import attempt per page load, even when React runs the effect twice.
let carryStarted = false;

function isChatPath(p: string): boolean {
  return p === "/chat" || p.startsWith("/chat/");
}

export function WelcomeStrip() {
  const [data, setData] = useState<WelcomeData | null>(null);
  const [chatHref, setChatHref] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let path = "/";
    let search = "";
    try {
      path = location.pathname;
      search = location.search;
    } catch {
      return;
    }
    // Class 1-7 and the class-agnostic school pages: nothing at all.
    if (isChildSchoolPath(path) || isUnder13SchoolPath(path)) return;
    let alive = true;

    // 1. A kept guest chat → the account, once (signed in only: the hint).
    if (!carryStarted && hasSessionHint() && !isChatPath(path)) {
      carryStarted = true;
      const kept = readKeptGuestChat();
      const action = carryDecision(kept, { childPath: false, chatScope: null });
      if (action === "drop") dropKeptGuestChat();
      else if (action === "import" && kept && kept !== "expired") {
        void postGuestChatImport(kept).then((r) => {
          if (r.status === "imported") {
            markGuestChatImported(kept, r.sessionId, r.turns);
            ctaBeacon("chat-guest-imported", { surface: "page", examCode: kept.examCode, pairs: Math.floor(r.turns.length / 2) });
            if (alive) setChatHref(guestChatHref(kept.examCode));
          } else if (r.status === "done") {
            dropKeptGuestChat();
          }
        });
      }
    }

    // 2. The one-time strip — only with the cookie createUser set.
    let hasCookie = false;
    try {
      hasCookie = cookieHasWelcome(document.cookie);
    } catch {
      /* cookies blocked */
    }
    if (hasCookie && welcomeStripAllowedHere(path, search)) {
      fetch("/api/me/welcome", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<WelcomeData>) : null))
        .then((j) => {
          // No answer, or the page already left: keep the cookie, a later page asks again.
          if (!j || !alive) return;
          try {
            document.cookie = welcomeCookieClearString(location.protocol === "https:");
          } catch {
            /* cookies blocked — the server's "shown" check still holds */
          }
          if (!j.show) return;
          setData(j);
          ctaBeacon(WELCOME_CTA, { action: "shown", examCode: j.exam?.code ?? null });
        })
        .catch(() => {
          /* network: a later page asks again */
        });
    }
    return () => {
      alive = false;
    };
  }, []);

  if (closed || (!data && !chatHref)) return null;
  return <WelcomeStripPanel data={data} chatHref={chatHref} onClose={() => setClosed(true)} />;
}
