"use client";

// "Join the group" on /g/:token (14 Sep 2026). On success the member lands on
// their dashboard's study-group card. Beacons CTA_CLICKED cta study-group-join.

import { useState } from "react";

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

export function JoinGroupButton({
  token,
  labels,
}: {
  token: string;
  labels: { button: string; joining: string; error: string; full: string; limit: string };
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/study-groups/${token}/join`, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        beacon({ cta: "study-group-join" });
        window.location.assign("/dashboard#study-groups");
        return;
      }
      setMessage(j.error === "limit" ? labels.limit : j.error === "full" ? labels.full : labels.error);
    } catch {
      setMessage(labels.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={join} disabled={busy} className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-60">
        {busy ? labels.joining : labels.button}
      </button>
      {message && <p className="mt-2 text-sm text-rose-700">{message}</p>}
    </div>
  );
}
