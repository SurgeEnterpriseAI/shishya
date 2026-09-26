"use client";

// The exits for an attempt already IN_PROGRESS on a mock that is "being
// rebuilt" (26 Sep 2026, review fix; see MockRebuilding.tsx). Same two
// actions as ExpiredAttemptGate, same endpoints:
//   • submit — POST /api/attempts/:id/submit with the answers this device
//     kept in the player's localStorage mirror (audit 11 Sep 2026: without
//     them a submit from a gate graded only what had reached the server);
//     the server grades the attempt over the questions that passed the
//     check and drops the rest. Offered only when at least one answer sits
//     on such a question — nothing to grade otherwise.
//   • discard — POST /api/attempts/:id/discard (ABANDONED), then the hub.
// Words come filled from the server (en/hi/te, src/lib/served-paper.ts).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mirrorKey, readMirror } from "@/lib/attempts-sync";

export function MockRebuildingAttempt({
  attemptId,
  userId,
  answered,
  examCode,
  copy,
  backHref = null,
}: {
  attemptId: string;
  /** Same key segment the player used for its localStorage mirror. */
  userId: string | null;
  /** Answers saved on questions submit would grade. */
  answered: number;
  examCode: string;
  copy: { line: string; submit: string; discard: string; busy: string };
  /** 26 Sep 2026 (student mode): where "discard" lands for a school chapter
   *  practice set — its chapter page (/exams/<school container> is a 404). */
  backHref?: string | null;
}) {
  const [busy, setBusy] = useState<null | "submit" | "discard">(null);
  const router = useRouter();

  function mirroredAnswers(): { answers?: unknown[] } {
    try {
      const m = readMirror(window.localStorage, mirrorKey(attemptId, userId ?? null), attemptId);
      return Array.isArray(m) && m.length > 0 ? { answers: m } : {};
    } catch {
      return {};
    }
  }

  async function submitWhatIHave() {
    setBusy("submit");
    const r = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto: true, ...mirroredAnswers() }),
    }).catch(() => null);
    if (r?.ok) router.push(`/attempts/${attemptId}/results`);
    else setBusy(null);
  }

  async function discardAttempt() {
    setBusy("discard");
    await fetch(`/api/attempts/${attemptId}/discard`, { method: "POST" }).catch(() => null);
    router.push(backHref ?? `/exams/${encodeURIComponent(examCode)}`);
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-white/70 p-3 text-left">
      <p className="text-sm text-ink-700">{copy.line}</p>
      <div className="mt-3 flex flex-col gap-2">
        {answered > 0 && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={submitWhatIHave}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy === "submit" ? copy.busy : copy.submit}
          </button>
        )}
        <button
          type="button"
          disabled={busy !== null}
          onClick={discardAttempt}
          className="rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
        >
          {busy === "discard" ? copy.busy : copy.discard}
        </button>
      </div>
    </div>
  );
}
