"use client";

// Client component wrapping the "Validate all unvalidated matching this filter"
// action. Two-step confirmation to avoid accidents.
//
// 25 Sep 2026: the counts are the bulk-validate route's own rule
// (src/lib/question-withdrawn.ts). `pendingCount` is what a run may flip
// (BULK_VALIDATABLE); `heldBackCount` is the withdrawn, previously pulled and
// answer-check-failed rows it leaves alone (BULK_HELD_BACK). The dialog used
// to offer every unvalidated row as "Validate N", held-back ones included,
// and closed without saying what the server did; it now confirms the
// eligible number and shows the server's message (with its held-back note).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

interface Filter {
  examCode?: string;
  topicCode?: string;
  source?: string;
  q?: string;
}

interface BulkValidateResult {
  validated: number;
  heldBack?: number;
  message?: string;
}

export function BulkValidateButton({
  filter,
  pendingCount,
  heldBackCount,
}: {
  filter: Filter;
  pendingCount: number;
  heldBackCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // After a run the page refreshes to 0 pending; keep the server's message.
  if (pendingCount === 0 && !done) return null;

  async function go() {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiPost<BulkValidateResult>("/api/admin/questions/bulk-validate", {
        filter,
        // The exact eligible count — the route also accepts eligible + held
        // back, but the number the admin confirmed is this one.
        confirmCount: pendingCount,
      });
      setDone(res?.message ?? `Marked ${res?.validated ?? 0} questions as validated.`);
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e.message ?? "Bulk validate failed");
    } finally {
      setBusy(false);
    }
  }

  const heldBackLine =
    heldBackCount > 0
      ? `${heldBackCount} withdrawn, previously pulled or answer-check-failed question${heldBackCount === 1 ? "" : "s"} matching this filter will be left as ${heldBackCount === 1 ? "it is" : "they are"} — validate those one at a time in the editor.`
      : null;

  return (
    <div className="flex max-w-md flex-col items-end gap-1">
      {pendingCount > 0 && (
        <button
          onClick={() => {
            setDone(null);
            setOpen(true);
          }}
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
        >
          Bulk validate {pendingCount} pending
        </button>
      )}
      {done && (
        <p role="status" className="text-right text-xs text-ink-700">
          {done}
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink-900/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-ink-900">Validate {pendingCount} questions?</h3>
            <p className="mt-2 text-sm text-ink-600">
              This will mark every <strong>pending</strong> (never reviewed) question matching the current filter as validated.
              AI-generated questions will be promoted to <code>AI_VALIDATED</code>.
            </p>
            {heldBackLine && <p className="mt-2 text-sm text-ink-600">{heldBackLine}</p>}
            <ul className="mt-3 list-disc rounded-md bg-ink-50 p-3 pl-7 text-xs text-ink-700">
              {filter.examCode && <li>Exam: {filter.examCode}</li>}
              {filter.topicCode && <li>Topic: {filter.topicCode}</li>}
              {filter.source && <li>Source: {filter.source}</li>}
              {filter.q && <li>Search: "{filter.q}"</li>}
              {!filter.examCode && !filter.topicCode && !filter.source && !filter.q && (
                <li className="text-rose-700">⚠ No filter — this validates ALL pending questions across every exam.</li>
              )}
            </ul>
            <p className="mt-3 text-xs text-amber-800">
              Only validate questions you have actually spot-checked. Bad questions reach students if you don't.
            </p>
            {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="btn-secondary !py-2 !px-4 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={go}
                disabled={busy}
                className="btn-primary !py-2 !px-4 text-sm"
              >
                {busy ? "Validating…" : `Validate ${pendingCount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
