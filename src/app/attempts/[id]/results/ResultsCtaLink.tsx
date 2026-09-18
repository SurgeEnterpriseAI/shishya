"use client";

// A results-page link that reports its own tap (18 Sep 2026): CTA_CLICKED with
// props.cta = "results-setup-card" (the setup card's button) or
// "results-tutor-first" (the tutor card / the ask-the-AI-tutor line), plus
// whatever the page passes — `first` says whether this was the student's
// first-ever finished attempt, `variant` which tutor offer was tapped, `order`
// where the challenge card sat. sendBeacon, so the tap is recorded even though
// the page is left at once. prefetch={false} keeps CHAT_OPENED honest — /chat
// must not be opened by the router before a person taps.

import Link from "next/link";
import type { ReactNode } from "react";

function beacon(props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({ kind: "CTA_CLICKED", path: typeof location !== "undefined" ? location.pathname : "/attempts", props })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export function ResultsCtaLink({
  href,
  cta,
  props,
  className,
  children,
}: {
  href: string;
  cta: "results-setup-card" | "results-tutor-first";
  props?: Record<string, string | number | boolean | null>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onClick={() => beacon({ cta, surface: "results", ...(props ?? {}) })}
    >
      {children}
    </Link>
  );
}
