"use client";

// The member strip at the top of an enrolled member's own exam hub (30 Sep
// 2026, "pick up where you left off" — src/lib/pickup.ts). The hub mounts it
// only for a signed-in member enrolled on this exam, and it renders nothing
// on the server: after mount it asks GET /api/me/pickup for this exam (the
// member's last question to this exam's tutor, their last result here and its
// weakest topics) and shows the card when there is something to pick up. So
// the hub's server HTML — for guests and crawlers, and for members too — is
// exactly what it was, and the hub's own server time does not grow.

import { useEffect, useState } from "react";
import { PickupCard } from "@/components/PickupCard";
import type { PickupView } from "@/lib/pickup";

export function MemberPickupStrip({ examCode, locale }: { examCode: string; locale: string }) {
  const [view, setView] = useState<PickupView | null>(null);
  useEffect(() => {
    let alive = true;
    const url = `/api/me/pickup?examCode=${encodeURIComponent(examCode)}&lang=${encodeURIComponent(locale)}`;
    fetch(url, { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { view?: PickupView | null } | null) => {
        // 1 Oct 2026: a late answer alone is something to pick up too.
        if (alive && j?.view && (j.view.answered || j.view.question || j.view.mock)) setView(j.view);
      })
      .catch(() => {
        /* best-effort: the hub is complete without it */
      });
    return () => {
      alive = false;
    };
  }, [examCode, locale]);
  if (!view) return null;
  return <PickupCard view={view} surface="hub" className="mt-5" />;
}
