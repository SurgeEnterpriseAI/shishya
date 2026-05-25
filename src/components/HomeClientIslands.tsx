"use client";

// Client-only wrappers for DiscussionsSidebar and LiveCountersStrip.
// They use a "mounted" gate (useState false → useEffect set true)
// instead of next/dynamic-with-ssr:false because the dynamic-import
// approach was loading the chunks but never actually mounting the
// inner components on production builds — possibly an interaction
// with the Next.js 15 app-router code-splitting strategy. The
// mounted-gate is functionally identical for our purposes:
//
//   Server SSR  → wrapper returns null (no HTML for these islands)
//   Client init → wrapper returns null again (SSR & hydration match)
//   useEffect   → setMounted(true) → real component renders
//
// Why we need this isolation at all:
// LiveCountersStrip + DiscussionsSidebar both render time-sensitive
// content. In browsers where extensions (MetaMask SES, MV3 lockdowns)
// mutate global objects between SSR and client init, React 19
// escalates the resulting hydration mismatch to a fatal "client-side
// exception" — which is what the founder kept seeing in his regular
// Chrome profile even after hard refresh. Skipping SSR entirely for
// these two islands removes the mismatch surface completely.

import { useEffect, useState } from "react";
import { DiscussionsSidebar, type ThreadItem } from "./DiscussionsSidebar";
import { LiveCountersStrip } from "./LiveCounters";

interface StripLabels {
  preparingNow: string;
  inMockNow: string;
  activeDiscussions: string;
  totalEver: string;
}

interface SidebarLabels {
  title: string;
  subtitle: string;
  replies: string;
  reply: string;
  viewAll: string;
  startNew: string;
  empty: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
  closeAria: string;
  openAria: string;
  liveTitle: string;
  liveOnline: string;
  liveInMock: string;
  liveTodaysMocks: string;
}

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

export function HomeLiveCountersStrip({ labels }: { labels: StripLabels }) {
  const mounted = useMounted();
  if (!mounted) return null;
  return <LiveCountersStrip labels={labels} />;
}

export function HomeDiscussionsSidebar({
  initial,
  signedIn,
  labels,
}: {
  initial: ThreadItem[];
  signedIn: boolean;
  labels: SidebarLabels;
}) {
  const mounted = useMounted();
  if (!mounted) return null;
  return <DiscussionsSidebar initial={initial} signedIn={signedIn} labels={labels} />;
}
