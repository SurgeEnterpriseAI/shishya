"use client";

import { useState } from "react";

export function InviteLinkCopy({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  }
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Join our batch on Shishya: ${url}`,
  )}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={url}
          className="min-w-0 flex-1 rounded-md border border-saffron-300 bg-white px-3 py-2 font-mono text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-saffron-300"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md bg-saffron-500 px-3 py-2 text-xs font-semibold text-white hover:bg-saffron-600"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 font-medium text-emerald-800 hover:bg-emerald-50"
        >
          💬 Share via WhatsApp
        </a>
      </div>
    </div>
  );
}
