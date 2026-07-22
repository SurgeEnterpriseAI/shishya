"use client";

// Fires CHAT_OPENED exactly once, client-side, when a REAL browser opens
// the tutor. Replaces the old server-side recordEvent, which fired on
// every render of /chat — including AI-crawler / search-bot GETs to the
// exam-scoped /chat?examCode=… links (they carry no anonId cookie and
// aren't router prefetches, so they slipped past the header guard and
// inflated the count ~130×). Bots don't execute effects and prefetches
// don't mount client components, so this counts only genuine opens.

import { useEffect, useRef } from "react";

export function ChatOpenedBeacon({ props }: { props: Record<string, unknown> }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return; // guard React StrictMode double-invoke
    fired.current = true;
    window.shishyaTrack?.("CHAT_OPENED", props);
    // props identity is stable per mount; deliberately fire once only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
