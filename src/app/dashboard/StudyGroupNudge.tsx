"use client";

// Study groups for a student with no group (16 Sep 2026). The make-a-group
// card sits at the very bottom of the dashboard (0 groups, 0 taps since the
// 14 Sep launch), while members see their board right under the streak. An
// enrolled student with no group now gets ONE line in that slot, linking
// down to the card (#study-groups) — the card itself stays where it is, and
// the coach plan and the Daily 5 below the line don't move on a 375 px
// phone.
//
// Measurement: study-group-create only fired after a successful create, so
// "0 groups" could not tell "never seen" from "seen, not wanted". This line
// sends CTA_CLICKED {cta: "study-group-line-seen"} once per page view when it
// scrolls into sight, and {cta: "study-group-card-open"} on tap. The card
// counts its own impressions (study-group-card-seen, surface "card",
// src/components/StudyGroupsCard.tsx) — separate names, so a line impression
// is never counted as a card impression (review, 16 Sep 2026).

import { useEffect, useRef } from "react";
import type { StudyGroupLabels } from "@/lib/study-group";

const COPY = {
  en: { line: "Study with friends this week" },
  hi: { line: "इस हफ़्ते दोस्तों के साथ पढ़ाई करें" },
  te: { line: "ఈ వారం స్నేహితులతో కలిసి చదవండి" },
} as const;

function beacon(props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob([JSON.stringify({ kind: "CTA_CLICKED", path: typeof location !== "undefined" ? location.pathname : "/dashboard", props })], {
        type: "application/json",
      }),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export function StudyGroupNudge({ labels, locale }: { labels: StudyGroupLabels; locale: string }) {
  const copy = locale === "hi" ? COPY.hi : locale === "te" ? COPY.te : COPY.en;
  const rowRef = useRef<HTMLAnchorElement | null>(null);
  const seenSent = useRef(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el || seenSent.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seenSent.current || !entries.some((e) => e.isIntersecting)) return;
        seenSent.current = true;
        beacon({ cta: "study-group-line-seen", empty: true, surface: "dashboard" });
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <a
      ref={rowRef}
      href="#study-groups"
      onClick={() => beacon({ cta: "study-group-card-open", surface: "dashboard" })}
      className="mt-3 flex w-full items-center justify-between gap-3 rounded-lg border border-saffron-200 bg-saffron-50/40 px-4 py-2.5 text-left transition-colors hover:border-saffron-400"
    >
      <span className="min-w-0 text-sm text-ink-800">
        👥 <span className="font-semibold">{labels.title}</span> · {copy.line}
      </span>
      <span className="shrink-0 text-sm font-bold text-saffron-700">{labels.create} →</span>
    </a>
  );
}
