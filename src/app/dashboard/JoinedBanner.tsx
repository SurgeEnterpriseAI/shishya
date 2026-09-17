"use client";

// Post-join confirmation (16 Sep 2026). JoinBatchButton sends a student to
// /dashboard?joined=1 after joining an educator's batch; the dashboard used
// to ignore the flag, so the join looked like nothing happened. The server
// renders this only for an ACTIVE batch enrollment made in the last 15
// minutes (a hand-typed ?joined=1, or a reload days later, shows nothing).
// Dismiss hides it and drops the flag from the URL, so a reload does not
// bring it back.

import { useState } from "react";

const COPY = {
  en: {
    title: "✓ You joined {batch}",
    body: "Your educator's assignments and the doubt channel are in the card below.",
    dismiss: "Dismiss",
  },
  hi: {
    title: "✓ आप {batch} बैच में जुड़ गए",
    body: "आपके शिक्षक के असाइनमेंट और डाउट चैनल नीचे वाले कार्ड में हैं।",
    dismiss: "बंद करें",
  },
  te: {
    title: "✓ మీరు {batch} బ్యాచ్‌లో చేరారు",
    body: "మీ ఎడ్యుకేటర్ అసైన్‌మెంట్లు, డౌట్ ఛానల్ కింది కార్డులో ఉన్నాయి.",
    dismiss: "మూసివేయండి",
  },
} as const;

export function JoinedBanner({ batchName, locale }: { batchName: string; locale: string }) {
  const copy = locale === "hi" ? COPY.hi : locale === "te" ? COPY.te : COPY.en;
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("joined");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    } catch {
      /* the banner is hidden either way */
    }
  }

  return (
    <div role="status" className="mt-5 flex items-start justify-between gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-emerald-900">{copy.title.replace("{batch}", batchName)}</p>
        <p className="mt-0.5 text-xs text-ink-700">{copy.body}</p>
      </div>
      <button type="button" onClick={dismiss} className="shrink-0 text-xs font-medium text-ink-500 underline-offset-2 hover:underline">
        {copy.dismiss}
      </button>
    </div>
  );
}
