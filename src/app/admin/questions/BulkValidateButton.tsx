"use client";

// Client component wrapping the "Validate all unvalidated matching this filter"
// action. Two-step confirmation to avoid accidents.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

interface Filter {
  examCode?: string;
  topicCode?: string;
  source?: string;
  q?: string;
}

export function BulkValidateButton({
  filter,
  unvalidatedCount,
}: {
  filter: Filter;
  unvalidatedCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (unvalidatedCount === 0) return null;

  async function go() {
    setErr(null);
    setBusy(true);
    try {
      await apiPost("/api/admin/questions/bulk-validate", {
        filter,
        confirmCount: unvalidatedCount,
      });
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e.message ?? "Bulk validate failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
      >
        Bulk validate {unvalidatedCount} pending
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink-900/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-ink-900">Validate {unvalidatedCount} questions?</h3>
            <p className="mt-2 text-sm text-ink-600">
              This will mark every <strong>unvalidated</strong> question matching the current filter as validated.
              AI-generated questions will be promoted to <code>AI_VALIDATED</code>.
            </p>
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
                {busy ? "Validating…" : `Validate ${unvalidatedCount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
