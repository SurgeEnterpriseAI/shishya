"use client";

// Thin client wrapper that lazily loads DiscussionsSidebar and
// LiveCountersStrip with ssr: false. Next.js 15 forbids `ssr: false`
// on dynamic imports inside Server Components, so the wrapper sits
// here in client-land. The parent (src/app/page.tsx) imports
// HomeClientIslands and passes the server-fetched props through.
//
// Why we skip SSR for just these two:
//   - LiveCountersStrip computes a time-bucketed initial state.
//     Server and client almost always land in different minute
//     buckets, producing different counts and triggering a React 19
//     hydration mismatch.
//   - DiscussionsSidebar renders relative-time strings ("5 min ago")
//     that drift between server render and client mount.
//
// Both bugs were patched in commit f876c89 (static initial state +
// `now: null` until mount), but the founder still hit the error in
// his regular Chrome profile due to extensions (MetaMask SES) that
// mutate global objects between SSR and client. Skipping SSR
// entirely removes any HTML for the extension-poisoned globals to
// disagree with — the only fix that's robust to whatever a visitor's
// browser does to its runtime.

import dynamic from "next/dynamic";
import type { ThreadItem } from "./DiscussionsSidebar";

const DiscussionsSidebar = dynamic(
  () => import("./DiscussionsSidebar").then((m) => m.DiscussionsSidebar),
  { ssr: false },
);

const LiveCountersStrip = dynamic(
  () => import("./LiveCounters").then((m) => m.LiveCountersStrip),
  { ssr: false },
);

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

export function HomeLiveCountersStrip({ labels }: { labels: StripLabels }) {
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
  return <DiscussionsSidebar initial={initial} signedIn={signedIn} labels={labels} />;
}
