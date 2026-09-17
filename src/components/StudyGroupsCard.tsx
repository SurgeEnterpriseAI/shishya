"use client";

// Study groups on the dashboard (14 Sep 2026). Each group's board for this IST
// week (study days, then questions practised), its invite link (WhatsApp /
// copy / share sheet, utm surface study-group) and "leave"; with no group, a
// one-field form to make one. Rows come from the server
// (src/lib/study-group-db.ts). Beacons CTA_CLICKED cta study-group-create |
// share (surface study-group) | study-group-leave.
//
// 16 Sep 2026: the group's maker gets "tell me on this phone when a friend
// joins" (beacon study-group-watch) once the server says it can work
// (board.watchReady), and the card sends one study-group-card-seen beacon
// {empty, surface: "card"} per mount once half of it (or half the screen,
// for a long board) is in view — "0 groups made" was unreadable without it
// (never scrolled to vs seen and passed over). The dashboard's one-line
// opener (src/app/dashboard/StudyGroupNudge.tsx) sends its own seen {surface:
// "dashboard"} and open beacons, so the card it opens should pass seenBeacon={false}.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PushWatchButton } from "@/components/ChallengeCard";
import type { BoardRow, StudyGroupLabels } from "@/lib/study-group";
import { shareUrl, type ShareChannel } from "@/lib/share-url";

export interface StudyGroupBoardView {
  token: string;
  name: string;
  rows: BoardRow[];
  /** The viewer made this group. */
  isOwner?: boolean;
  /** Phone notifications for this group can be turned on now (src/lib/study-group-db.ts). */
  watchReady?: boolean;
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function beacon(props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob([JSON.stringify({ kind: "CTA_CLICKED", path: typeof location !== "undefined" ? location.pathname : "/", props })], {
        type: "application/json",
      }),
    );
  } catch {
    /* analytics is best-effort */
  }
}

const smallBtn =
  "inline-flex items-center justify-center rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 transition-colors hover:bg-ink-50";

function CreateGroup({ labels, onCreated }: { labels: StudyGroupLabels; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/study-groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const j = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!res.ok || typeof j.token !== "string") {
        setError(j.error === "limit" ? labels.limit : labels.createError);
        return;
      }
      beacon({ cta: "study-group-create" });
      setName("");
      onCreated();
    } catch {
      setError(labels.createError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:opacity-60"
        >
          {busy ? labels.creating : labels.create}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </form>
  );
}

function InviteRow({ board, labels }: { board: StudyGroupBoardView; labels: StudyGroupLabels }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  const text = (channel: ShareChannel) =>
    fill(labels.inviteText, { name: board.name, url: shareUrl(`/g/${board.token}`, { surface: "study-group", channel }) });
  const track = (via: ShareChannel) => beacon({ cta: "share", surface: "study-group", via });

  async function copy() {
    try {
      await navigator.clipboard.writeText(text("copy"));
      setCopied(true);
      track("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* old browsers without the clipboard API */
    }
  }
  async function more() {
    try {
      await navigator.share({ text: text("native") });
      track("native");
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-ink-600">{labels.inviteLabel}:</span>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text("whatsapp"))}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp")}
        className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
      >
        {labels.whatsapp}
      </a>
      <button type="button" onClick={copy} className={smallBtn}>
        {copied ? labels.copied : labels.copy}
      </button>
      {canShare && (
        <button type="button" onClick={more} className={smallBtn}>
          {labels.more}
        </button>
      )}
    </div>
  );
}

function Board({ board, labels }: { board: StudyGroupBoardView; labels: StudyGroupLabels }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    if (!window.confirm(labels.leaveConfirm)) return;
    setLeaving(true);
    try {
      const res = await fetch(`/api/study-groups/${board.token}/leave`, { method: "POST" });
      if (res.ok) {
        beacon({ cta: "study-group-leave" });
        router.refresh();
      }
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-ink-900">{board.name}</p>
        <p className="text-xs text-ink-500">{labels.week}</p>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-500">
              <th className="py-1 pr-2 font-medium">#</th>
              <th className="py-1 pr-2 font-medium" />
              <th className="py-1 px-2 text-right font-medium">{labels.colDays}</th>
              <th className="py-1 pl-2 text-right font-medium">{labels.colQuestions}</th>
            </tr>
          </thead>
          <tbody>
            {board.rows.map((r, i) => (
              <tr key={i} className={r.isYou ? "bg-saffron-50" : ""}>
                <td className="py-1 pr-2 tabular-nums text-ink-500">{r.rank}</td>
                <td className="py-1 pr-2 text-ink-900">
                  {r.name ?? labels.member}
                  {r.isYou && <span className="ml-1 text-xs text-ink-500">({labels.you})</span>}
                  {r.isNew && (
                    <span className="ml-1 rounded bg-emerald-100 px-1 text-[10px] font-semibold text-emerald-800">{labels.isNew}</span>
                  )}
                </td>
                <td className="py-1 px-2 text-right tabular-nums text-ink-900">{r.days}</td>
                <td className="py-1 pl-2 text-right tabular-nums text-ink-700">{r.questions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {board.rows.length === 1 && <p className="mt-2 text-xs text-ink-600">{labels.alone}</p>}
      <InviteRow board={board} labels={labels} />
      {board.isOwner && board.watchReady && (
        <PushWatchButton
          url={`/api/study-groups/${board.token}/watch`}
          cta="study-group-watch"
          labels={{
            button: labels.watchButton,
            busy: labels.watchBusy,
            on: labels.watchOn,
            denied: labels.watchDenied,
            error: labels.watchError,
          }}
        />
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-ink-500">{labels.note}</p>
        <button type="button" onClick={leave} disabled={leaving} className="text-xs text-ink-500 underline-offset-2 hover:underline disabled:opacity-60">
          {labels.leave}
        </button>
      </div>
    </div>
  );
}

export function StudyGroupsCard({
  boards,
  labels,
  canCreate,
  seenBeacon = true,
}: {
  boards: StudyGroupBoardView[];
  labels: StudyGroupLabels;
  canCreate: boolean;
  /** Send the study-group-card-seen impression. False where the opener already counted it. */
  seenBeacon?: boolean;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const empty = boards.length === 0;

  // Impression: once per mount, when half the card is in view — or half the
  // screen, for a board taller than two screens. isIntersecting alone is true
  // for any sliver (the observer also reports on observe()), so measure.
  useEffect(() => {
    const el = ref.current;
    if (!seenBeacon || !el || typeof IntersectionObserver === "undefined") return;
    let sent = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (sent) return;
        const inView = entries.some((e) => {
          const screen = e.rootBounds?.height ?? window.innerHeight;
          return e.isIntersecting && e.intersectionRect.height >= Math.min(e.boundingClientRect.height, screen) * 0.5;
        });
        if (!inView) return;
        sent = true;
        io.disconnect();
        beacon({ cta: "study-group-card-seen", empty, surface: "card" });
      },
      // 5% steps: a board many screens tall still reports as it scrolls by.
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one impression per mount
  }, []);

  return (
    <section ref={ref} id="study-groups" className="mt-6 scroll-mt-20 rounded-xl border border-saffron-200 bg-saffron-50/40 p-5">
      <p className="text-base font-bold text-ink-900">👥 {labels.title}</p>
      {boards.length === 0 ? (
        <>
          <p className="mt-1 text-sm text-ink-700">{labels.intro}</p>
          <CreateGroup labels={labels} onCreated={() => router.refresh()} />
        </>
      ) : (
        <>
          {boards.map((b) => (
            <Board key={b.token} board={b} labels={labels} />
          ))}
          {canCreate &&
            (showCreate ? (
              <CreateGroup
                labels={labels}
                onCreated={() => {
                  setShowCreate(false);
                  router.refresh();
                }}
              />
            ) : (
              <button type="button" onClick={() => setShowCreate(true)} className="mt-3 text-xs font-semibold text-saffron-700 hover:underline">
                + {labels.create}
              </button>
            ))}
        </>
      )}
    </section>
  );
}
