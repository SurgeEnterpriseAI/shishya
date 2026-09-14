"use client";

// "Share result card" on the results page (14 Sep 2026). Fetches the
// owner-only PNG (src/app/attempts/[id]/result-card/route.tsx) and hands it
// to the phone's share sheet as an image file, with the utm-tagged /share
// link as the caption. A browser that cannot share files gets the card
// shown with a save link instead. Beacons CTA_CLICKED cta 'result-card'
// (via native | save).

import { useEffect, useState } from "react";
import type { ResultCardLabels } from "@/lib/result-card";
import { shareUrl } from "@/lib/share-url";

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

export function ResultCardShare({
  attemptId,
  examCode,
  examShort,
  scoreDisplay,
  labels,
}: {
  attemptId: string;
  examCode: string;
  examShort: string;
  scoreDisplay: string;
  labels: ResultCardLabels;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileName = `shishya-${examCode.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-result.png`;

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function share() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/attempts/${attemptId}/result-card`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });
      const text = fill(labels.text, {
        exam: examShort,
        score: scoreDisplay,
        url: shareUrl(`/share/${attemptId}`, { surface: "result-card", channel: "native", exam: examCode }),
      });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text });
          beacon({ cta: "result-card", surface: "results", via: "native", exam: examCode });
        } catch {
          /* cancelled */
        }
        return;
      }
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-900">📸 {labels.title}</p>
          <p className="mt-0.5 text-xs text-ink-600">{labels.body}</p>
        </div>
        <button
          type="button"
          onClick={share}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:opacity-60"
        >
          {busy ? labels.preparing : labels.share}
        </button>
      </div>
      {failed && <p className="mt-2 text-xs text-rose-700">{labels.error}</p>}
      {preview && (
        <div className="mt-3 flex items-end gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob: URL */}
          <img src={preview} alt="" className="h-44 w-auto rounded-md border border-ink-200" />
          <div className="min-w-0">
            <p className="text-xs text-ink-600">{labels.saveHint}</p>
            <a
              href={preview}
              download={fileName}
              onClick={() => beacon({ cta: "result-card", surface: "results", via: "save", exam: examCode })}
              className="mt-2 inline-flex items-center justify-center rounded-md border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-800 hover:bg-ink-50"
            >
              {labels.save}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
