"use client";

// Client island inside /ideas — handles the upvote toggle without a
// full page reload. The server component renders the initial state
// (count + my upvote status) and this card just delta-updates locally.
//
// Built ideas (13 Sep 2026) render the team's one-line "what we built"
// with a link, and voting is closed on them: a vote cast after something
// is built is not a request, and it would not reach the people told.

import Link from "next/link";
import { useState } from "react";
import { apiPost } from "@/lib/api";
import { fillTemplate } from "@/lib/i18n";
import type { IdeaCardCopy } from "@/lib/ideas-copy";

interface IdeaCardProps {
  id: string;
  title: string;
  body: string;
  area: string;
  examCode: string | null;
  authorName: string | null;
  upvoteCount: number;
  statusLabel: string;
  statusTone: string;
  upvotedByMe: boolean;
  canUpvote: boolean;
  createdAt: string;
  /** Built: show the count without a vote button. */
  votingClosed?: boolean;
  /**
   * Built with a ship record: what we built + where. `markedLabel` is the
   * server-formatted "Marked built <date>" — the day it was marked, never
   * claimed as the day it was built.
   */
  ship?: { note: string; link: string; markedLabel: string } | null;
  /** Built without a ship record: the honest line shown instead of note + link. */
  noRecordLine?: string;
  /** The card's own words, built server-side from the page's locale
   *  (16 Sep 2026). Plain strings: functions cannot cross to a client island. */
  labels: IdeaCardCopy;
}

function relTime(iso: string, L: IdeaCardCopy): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return L.justNow;
  if (m < 60) return fillTemplate(L.minAgo, { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return fillTemplate(L.hourAgo, { n: h });
  const d = Math.floor(h / 24);
  if (d < 30) return fillTemplate(L.dayAgo, { n: d });
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function IdeaCard(props: IdeaCardProps) {
  const L = props.labels;
  const [count, setCount] = useState(props.upvoteCount);
  const [mine, setMine] = useState(props.upvotedByMe);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function toggle() {
    if (!props.canUpvote || busy || props.votingClosed) return;
    setBusy(true);
    // Optimistic flip — revert on error.
    const wasMine = mine;
    const wasCount = count;
    setMine(!mine);
    setCount(mine ? count - 1 : count + 1);
    try {
      const res = await apiPost<{ upvoted: boolean; upvoteCount: number }>(
        `/api/feedback/${props.id}/upvote`,
      );
      setMine(res.upvoted);
      setCount(res.upvoteCount);
    } catch {
      setMine(wasMine);
      setCount(wasCount);
    } finally {
      setBusy(false);
    }
  }

  const bodyLooksLong = props.body.length > 220;
  const bodyShown = expanded || !bodyLooksLong
    ? props.body
    : props.body.slice(0, 220).trimEnd() + "…";

  return (
    <article
      className={
        props.votingClosed
          ? "flex gap-3 rounded-md border border-emerald-200 bg-white p-4"
          : "flex gap-3 rounded-md border border-ink-200 bg-white p-4 hover:border-ink-300"
      }
    >
      {/* Upvote (or the closed count on a built idea) */}
      {props.votingClosed ? (
        <div
          className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-ink-200 bg-ink-50 text-ink-500"
          title={L.votingClosed}
          aria-label={fillTemplate(count === 1 ? L.votesClosedOne : L.votesClosedMany, { n: count })}
        >
          <span aria-hidden className="text-sm">▲</span>
          <span className="text-xs font-semibold tabular-nums">{count}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={!props.canUpvote || busy}
          className={
            mine
              ? "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-saffron-400 bg-saffron-100 text-saffron-900"
              : "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-ink-200 bg-white text-ink-700 hover:border-saffron-300 hover:bg-saffron-50"
          }
          aria-pressed={mine}
          title={props.canUpvote ? (mine ? L.removeUpvote : L.upvoteThis) : L.signInToUpvote}
        >
          <span aria-hidden className="text-sm">▲</span>
          <span className="text-xs font-semibold tabular-nums">{count}</span>
        </button>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-semibold text-ink-900">{props.title}</h2>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${props.statusTone}`}
          >
            {props.statusLabel}
          </span>
        </div>
        <p className="mt-1.5 whitespace-pre-line text-sm text-ink-700">{bodyShown}</p>
        {bodyLooksLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-xs text-saffron-700 hover:underline"
          >
            {expanded ? L.showLess : L.showMore}
          </button>
        )}
        {props.ship && (
          <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2">
            <p className="text-sm text-ink-800">
              <span className="font-semibold">{L.whatWeBuilt}</span> {props.ship.note}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <Link
                href={props.ship.link}
                prefetch={false}
                className="font-semibold text-emerald-700 hover:underline"
              >
                {L.openIt}
              </Link>
              <span className="text-ink-500">{props.ship.markedLabel}</span>
            </p>
          </div>
        )}
        {!props.ship && props.noRecordLine && (
          <p className="mt-2 text-xs text-ink-500">{props.noRecordLine}</p>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
          <span className="rounded bg-ink-100 px-1.5 py-0.5 font-medium text-ink-700">
            {props.area}
          </span>
          {props.examCode && (
            <Link
              href={`/exams/${props.examCode}`}
              prefetch={false}
              className="text-saffron-700 hover:underline"
            >
              {props.examCode}
            </Link>
          )}
          <span>{props.authorName ?? L.anon}</span>
          <span>·</span>
          <span>{relTime(props.createdAt, L)}</span>
        </p>
      </div>
    </article>
  );
}
