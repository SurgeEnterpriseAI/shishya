"use client";

// Live discussions sidebar. Sits as a fixed right-side panel on xl+
// viewports (≥1280 px), and collapses to a floating action button on
// smaller screens that opens a slide-in drawer.
//
// Polling: every 30 s we re-fetch /api/discussions to keep the feed
// "rolling" — fresh threads bubble to the top without a page reload.

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRelative } from "@/lib/relative-time";
import { LiveCountersBlock } from "@/components/LiveCounters";

export interface ThreadItem {
  id: string;
  title: string;
  examShort: string | null;
  authorName: string | null;
  messageCount: number;
  pinned: boolean;
  lastActivityAt: string;
}

interface Labels {
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
  // Live counters block (shown above the thread list)
  liveTitle: string;
  liveOnline: string;
  liveInMock: string;
  liveTodaysMocks: string;
}

const POLL_MS = 30_000;
const FETCH_LIMIT = 12;

export function DiscussionsSidebar({
  initial,
  signedIn,
  labels,
}: {
  initial: ThreadItem[];
  signedIn: boolean;
  labels: Labels;
}) {
  const [threads, setThreads] = useState<ThreadItem[]>(initial);
  const [open, setOpen] = useState(false);

  // Periodic refresh so the sidebar feels live. Stops when the tab is hidden
  // to avoid wasted requests on backgrounded tabs.
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function refresh() {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/discussions?limit=${FETCH_LIMIT}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: ThreadItem[] };
        if (!cancelled) setThreads(data.items);
      } catch {
        // swallow — sidebar stays at last good state
      }
    }

    timer = window.setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  const newDiscHref = signedIn
    ? "/discussions/new"
    : `/api/auth/signin/google?callbackUrl=${encodeURIComponent("/discussions/new")}`;

  return (
    <>
      {/* ─── Desktop: fixed right-edge panel ───────────────────────────── */}
      <aside
        className="fixed bottom-0 right-0 top-16 z-20 hidden w-80 flex-col border-l border-ink-200 bg-white shadow-sm 2xl:flex"
        aria-label={labels.title}
      >
        <PanelHeader labels={labels} newHref={newDiscHref} />
        <LiveCountersBlock
          labels={{
            title:       labels.liveTitle,
            online:      labels.liveOnline,
            inMock:      labels.liveInMock,
            todaysMocks: labels.liveTodaysMocks,
          }}
        />
        <ThreadList threads={threads} labels={labels} />
        <PanelFooter labels={labels} />
      </aside>

      {/* ─── Mobile / tablet: floating action button ───────────────────── */}
      {/* bottom-safe positions the FAB above iOS home indicator + Android
          gesture nav. min-h-[44px] on the button ensures it's a comfortable
          thumb-tap target. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.openAria}
        className="bottom-safe fixed right-4 z-30 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-saffron-500 px-4 py-3 text-sm font-medium text-white shadow-lg ring-1 ring-saffron-700/20 hover:bg-saffron-600 2xl:hidden"
      >
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="hidden sm:inline">{labels.title}</span>
        <span className="sm:hidden">💬</span>
        {threads.length > 0 && (
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
            {threads.length}
          </span>
        )}
      </button>

      {/* ─── Mobile drawer ─────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-40 2xl:hidden" role="dialog" aria-modal="true">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* sheet */}
          <div className="absolute bottom-0 right-0 top-0 flex h-screen w-full max-w-md flex-col bg-white shadow-2xl sm:right-2 sm:top-2 sm:h-auto sm:max-h-[calc(100vh-1rem)] sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-ink-900">{labels.title}</h3>
                <p className="text-xs text-ink-500">{labels.subtitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={labels.closeAria}
                className="-mr-2 rounded-md p-2 text-ink-500 hover:bg-ink-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <LiveCountersBlock
              labels={{
                title:       labels.liveTitle,
                online:      labels.liveOnline,
                inMock:      labels.liveInMock,
                todaysMocks: labels.liveTodaysMocks,
              }}
            />
            <ThreadList threads={threads} labels={labels} onItemClick={() => setOpen(false)} />
            <div className="border-t border-ink-200 bg-ink-50/40 px-5 py-3">
              <Link
                href={newDiscHref}
                onClick={() => setOpen(false)}
                className="btn-primary w-full !py-2 text-sm"
              >
                {labels.startNew}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────
function PanelHeader({ labels, newHref }: { labels: Labels; newHref: string }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-ink-200 bg-ink-50/40 px-4 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </p>
        <h3 className="mt-0.5 truncate text-sm font-semibold text-ink-900">{labels.title}</h3>
      </div>
      <Link
        href={newHref}
        className="shrink-0 rounded-md border border-ink-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-100"
      >
        +
      </Link>
    </div>
  );
}

function PanelFooter({ labels }: { labels: Labels }) {
  return (
    <div className="border-t border-ink-200 bg-white px-4 py-3 text-center">
      <Link
        href="/discussions"
        className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
      >
        {labels.viewAll}
      </Link>
    </div>
  );
}

function ThreadList({
  threads,
  labels,
  onItemClick,
}: {
  threads: ThreadItem[];
  labels: Labels;
  onItemClick?: () => void;
}) {
  const now = new Date();
  if (threads.length === 0) {
    return (
      <div className="flex-1 px-4 py-10 text-center">
        <p className="text-sm text-ink-500">{labels.empty}</p>
      </div>
    );
  }
  return (
    <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
      {threads.map((t) => {
        const fresh = Date.now() - new Date(t.lastActivityAt).getTime() < 60 * 60 * 1000;
        return (
          <li key={t.id}>
            <Link
              href={`/discussions/${t.id}`}
              onClick={onItemClick}
              className="block px-4 py-3 transition-colors hover:bg-saffron-50/50"
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={
                    fresh
                      ? "h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
                      : "h-2 w-2 shrink-0 rounded-full bg-ink-300"
                  }
                  aria-hidden
                />
                <h4 className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">
                  {t.title}
                </h4>
              </div>
              <p className="ml-4 mt-1 truncate text-[11px] text-ink-500">
                {t.examShort && (
                  <span className="mr-1.5 rounded bg-ink-100 px-1 py-0.5 text-[10px] font-medium text-ink-600">
                    {t.examShort}
                  </span>
                )}
                <span className="font-medium text-ink-700">
                  {t.messageCount} {t.messageCount === 1 ? labels.reply : labels.replies}
                </span>
                <span className="mx-1 text-ink-300">·</span>
                {formatRelative(t.lastActivityAt, labels, now)}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
