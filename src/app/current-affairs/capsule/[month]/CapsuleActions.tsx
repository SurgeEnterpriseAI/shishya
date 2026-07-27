"use client";

// Download-as-PDF (browser print — every phone/desktop can save the
// print dialog output as PDF) + WhatsApp share for the monthly capsule.

function track(cta: string) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: typeof location !== "undefined" ? location.pathname : "/current-affairs",
          props: { cta, surface: "ca-capsule" },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* best-effort */
  }
}

export function CapsuleActions({ month, label }: { month: string; label: string }) {
  const url = `https://shishya.in/current-affairs/capsule/${month}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `${label} current affairs capsule for govt exams — every day of the month, free:\n${url}`,
  )}`;

  return (
    <div className="flex shrink-0 gap-2 print:hidden">
      <button
        type="button"
        onClick={() => {
          track("capsule-download");
          window.print();
        }}
        className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
      >
        📥 Download PDF
      </button>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("capsule-share")}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600"
      >
        Share on WhatsApp
      </a>
    </div>
  );
}
