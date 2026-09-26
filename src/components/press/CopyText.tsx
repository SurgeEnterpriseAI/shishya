"use client";

// Copy button for the press kit's ready-to-paste descriptions (27 Sep 2026).
//
// The one client island on /press: it copies a string the server already
// rendered on the page. No cookies, no storage, no analytics call — the page
// stays statically rendered and the text is readable (and selectable)
// without JavaScript.

import { useState } from "react";

const RESET_MS = 2_000;

export function CopyText({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), RESET_MS);
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-saffron-300 bg-white px-2.5 py-1 text-xs font-semibold text-saffron-700 hover:bg-saffron-50"
      >
        {label}
      </button>
      <span role="status" aria-live="polite" className="text-[11px] text-ink-500">
        {state === "copied" ? "Copied" : state === "failed" ? "Copy did not work here; select the text instead" : ""}
      </span>
    </span>
  );
}
