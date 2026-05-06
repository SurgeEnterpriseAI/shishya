"use client";

// CTA on the exam page. Calls POST /api/mocks → redirects to /mocks/:id.
// Labels passed in by the server component so the strings can be in any locale.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

interface Labels {
  adaptive: string;
  diagnostic: string;
  firstDiagnostic: string;
  building: string;
}

export function StartMockButton({
  examCode,
  hasHistory,
  labels,
}: {
  examCode: string;
  hasHistory: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start(kind: "DIAGNOSTIC" | "ADAPTIVE") {
    setErr(null);
    setBusy(true);
    try {
      const res = await apiPost<{ mock: { id: string } }>("/api/mocks", {
        examCode,
        request:
          kind === "DIAGNOSTIC"
            ? { type: "DIAGNOSTIC", questionCount: 12 }
            : { type: "ADAPTIVE", questionCount: 15 },
      });
      router.push(`/mocks/${res.mock.id}`);
    } catch (e: any) {
      setErr(e.message ?? "Could not start mock");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {hasHistory ? (
        <>
          <button
            onClick={() => start("ADAPTIVE")}
            disabled={busy}
            className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
          >
            {busy ? labels.building : labels.adaptive}
          </button>
          <button
            onClick={() => start("DIAGNOSTIC")}
            disabled={busy}
            className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-50"
          >
            {labels.diagnostic}
          </button>
        </>
      ) : (
        <button
          onClick={() => start("DIAGNOSTIC")}
          disabled={busy}
          className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
        >
          {busy ? labels.building : labels.firstDiagnostic}
        </button>
      )}
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </div>
  );
}
