"use client";

// 👍 / 👎 reaction strip for exam-phase articles.
//
// Anonymous-friendly: the existing /api/exam-articles/[id]/react
// endpoint reads the `shishya_anon` cookie and treats it as the
// voter identity when no session exists. One vote per anonId per
// article — re-clicking the same button removes the vote, clicking
// the opposite button swaps it.
//
// Optimistic UI: counts update immediately on click. If the POST
// fails we roll back and show a tiny error toast (silently for now —
// reactions aren't load-bearing).

import { useState } from "react";
import type { ArticleReaction } from "@prisma/client";

export function ReactionButtons({
  articleId,
  likes: initialLikes,
  dislikes: initialDislikes,
  myReaction: initialMyReaction,
}: {
  articleId: string;
  likes: number;
  dislikes: number;
  myReaction: ArticleReaction | null;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [my, setMy] = useState<ArticleReaction | null>(initialMyReaction);
  const [pending, setPending] = useState(false);

  async function vote(target: ArticleReaction) {
    if (pending) return;
    setPending(true);

    // Optimistic transition:
    //   - re-click of current reaction → remove (decrement, my=null)
    //   - click of opposite reaction   → swap  (decrement old, increment new)
    //   - first click                  → add   (increment, my=target)
    const prev = { likes, dislikes, my };
    let nextLikes = likes;
    let nextDislikes = dislikes;
    let nextMy: ArticleReaction | null = target;
    if (my === target) {
      // unvote
      if (target === "LIKE") nextLikes--;
      else nextDislikes--;
      nextMy = null;
    } else if (my && my !== target) {
      // swap
      if (target === "LIKE") {
        nextLikes++;
        nextDislikes--;
      } else {
        nextDislikes++;
        nextLikes--;
      }
    } else {
      // first vote
      if (target === "LIKE") nextLikes++;
      else nextDislikes++;
    }
    setLikes(Math.max(0, nextLikes));
    setDislikes(Math.max(0, nextDislikes));
    setMy(nextMy);

    try {
      const res = await fetch(`/api/exam-articles/${articleId}/react`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reaction: nextMy }),
      });
      if (!res.ok) throw new Error("vote failed");
    } catch {
      // Rollback on failure — keeps counts honest even when the API hiccups.
      setLikes(prev.likes);
      setDislikes(prev.dislikes);
      setMy(prev.my);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => vote("LIKE")}
        disabled={pending}
        aria-pressed={my === "LIKE"}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          my === "LIKE"
            ? "border-emerald-400 bg-emerald-50 text-emerald-800"
            : "border-ink-200 bg-white text-ink-700 hover:border-emerald-400 hover:bg-emerald-50/40"
        }`}
      >
        <span aria-hidden>👍</span>
        <span className="tabular-nums">{likes}</span>
      </button>
      <button
        type="button"
        onClick={() => vote("DISLIKE")}
        disabled={pending}
        aria-pressed={my === "DISLIKE"}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          my === "DISLIKE"
            ? "border-rose-400 bg-rose-50 text-rose-800"
            : "border-ink-200 bg-white text-ink-700 hover:border-rose-400 hover:bg-rose-50/40"
        }`}
      >
        <span aria-hidden>👎</span>
        <span className="tabular-nums">{dislikes}</span>
      </button>
    </div>
  );
}
