"use client";

// Group study Phase A — study a topic WITH friends:
//   • "Invite to study" → WhatsApp share of this topic page (prep
//     groups live on WhatsApp; the link lands friends on these notes)
//   • "Open study room" → the shared per-(exam,topic) chat thread —
//     find-or-created server-side, so everyone meets in the SAME room.
// Async-friendly by design (works even when friends aren't online at
// the same moment). Voice rooms come later, once rooms have people.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StudyTogether({
  examCode,
  examShort,
  topicCode,
  topicName,
}: {
  examCode: string;
  examShort: string;
  topicCode: string;
  topicName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pageUrl = `https://shishya.in/exams/${examCode}/topics/${encodeURIComponent(topicCode)}`;
  const waText = `Let's study ${topicName} (${examShort}) together on Shishya — free notes + practice:\n${pageUrl}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  async function openRoom() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/study-room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, topicCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.threadId) {
        setErr("Couldn't open the room — try again.");
        setBusy(false);
        return;
      }
      router.push(`/discussions/${data.threadId}`);
    } catch {
      setErr("Network hiccup — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-ink-200 bg-ink-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink-900">👥 Study this together</p>
        <p className="mt-0.5 text-xs text-ink-600">
          Invite your prep group — read the same notes, then discuss doubts in this topic&apos;s
          shared room.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          Invite to study
        </a>
        <button
          type="button"
          onClick={openRoom}
          disabled={busy}
          className="inline-flex items-center rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-saffron-400 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "Opening…" : "Open study room →"}
        </button>
      </div>
      {err && <p className="text-xs text-rose-700">{err}</p>}
    </div>
  );
}
