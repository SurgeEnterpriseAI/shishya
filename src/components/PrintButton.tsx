"use client";

// One-tap "save as PDF" — window.print() with print CSS on the page
// gives every device a native download path with zero infra (same
// pattern as the current-affairs capsule).

export function PrintButton({ label = "Download as PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600"
    >
      📥 {label}
    </button>
  );
}
