"use client";

// Compact "share this page" control for content pages (exam hub, PYQ,
// topic notes). Unlike the celebratory post-mock ShareScoreButton, this is
// a small inline pill — it sits in a page hero without dominating it.
//
// Why WhatsApp-first: Indian aspirants organise prep almost entirely in
// WhatsApp groups (batch / coaching / exam-specific). A one-tap pre-filled
// message to a group of 40-50 peers is the cheapest growth loop we have —
// and it spreads exactly the pages we most want indexed and visited
// (free PYQ, syllabus, study notes). Each share also seeds a real referral
// the analytics channel report can later attribute.

import { useState } from "react";

interface Props {
  /** Absolute URL to share (must be public + OG-rich). */
  url: string;
  /** Pre-filled message body. The URL is appended automatically. */
  message: string;
  /** Small label shown before the buttons. Defaults to a generic prompt. */
  label?: string;
  /** Optional analytics tag (e.g. "exam", "pyq", "topic"). */
  surface?: string;
}

export function ShareExamButton({ url, message, label, surface }: Props) {
  const [copied, setCopied] = useState(false);

  const shareText = `${message}\n${url}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  function track(via: string) {
    // Best-effort, non-blocking — routed through the first-party analytics
    // ingest (CTA_CLICKED) so shares land in the same channel/funnel report
    // the growth analyst reads. Failures are silently ignored.
    try {
      navigator.sendBeacon?.(
        "/api/analytics",
        new Blob(
          [
            JSON.stringify({
              kind: "CTA_CLICKED",
              path: typeof location !== "undefined" ? location.pathname : url,
              props: { cta: "share", surface: surface ?? "page", via },
            }),
          ],
          { type: "application/json" },
        ),
      );
    } catch {
      /* analytics is best-effort */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent — old browsers w/o clipboard API */
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: message, url });
        track("native");
      } catch {
        /* user cancelled — no-op */
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-ink-600">
        {label ?? "Share with your prep group:"}
      </span>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp")}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        WhatsApp
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center rounded-full border border-ink-300 bg-white px-3 py-1 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-saffron-300"
      >
        {copied ? "Copied ✓" : "Copy link"}
      </button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex items-center rounded-full border border-ink-300 bg-white px-3 py-1 text-xs font-medium text-ink-700 transition-colors hover:bg-ink-50 sm:hidden"
        >
          More…
        </button>
      )}
    </div>
  );
}
