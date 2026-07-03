"use client";

// Growth lever #4 — tighten the post-results loop.
//
// The journey data shows the retention engine is exam hub → mock → results
// → exam hub → mock… but the "take another mock" CTA sent students back to
// the hub to choose again (an extra step). This creates the next ADAPTIVE
// mock (auto-targeted at their weak topics from their now-updated mastery)
// in one tap and drops them straight into the player — no detour. Falls
// back to the hub link if generation hiccups.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  examCode: string;
  label: string;
}

export function NextMockButton({ examCode, label }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examCode,
          request: { type: "ADAPTIVE", questionCount: 10 },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.mock?.id) {
        setFailed(true);
        setBusy(false);
        return;
      }
      router.push(`/mocks/${data.mock.id}`);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  // If generation failed, degrade gracefully to the old behaviour (hub).
  if (failed) {
    return (
      <Link
        href={`/exams/${examCode}`}
        className="btn-primary block w-full !py-2 !px-4 text-center text-sm"
      >
        {label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="btn-primary block w-full !py-2 !px-4 text-center text-sm disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Building your next mock…" : label}
      </button>
      <p className="mt-1 text-center text-[11px] text-ink-500">
        Adaptive — targets the topics you just struggled with
      </p>
    </div>
  );
}
