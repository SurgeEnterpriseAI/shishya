"use client";

// Share-to-WhatsApp button shown on the post-mock results page.
//
// Indian students share study material in WhatsApp groups (college
// batch, coaching cohort, NEET/JEE prep groups) — 40-50 contacts
// each. A successful mock result IS the most natural moment to share
// (proud + bragging + helpful). Capturing that ONE-tap is the viral
// loop.
//
// Flow:
//   1. Click 'Share on WhatsApp'
//   2. wa.me link opens with pre-filled "I scored X% on [exam] — try"
//      text + the /share/[id] short URL
//   3. Recipient sees an OG-rich preview (dynamic card from
//      src/app/share/[id]/opengraph-image.tsx) in WhatsApp
//   4. Tap → /share/[id] public page → 5-question quiz, no sign-in
//
// Also handles the generic "Copy link" path for non-WhatsApp shares
// + a Web Share API fallback for mobile browsers that support it.
//
// Attribution (11 Sep 2026): until now this fired no analytics and the
// link carried no tag, so the biggest share surface on the site was
// invisible in the channel report. Every link is now utm-tagged per
// channel (src/lib/share-url.ts: utm_campaign=results, utm_content=exam)
// and each tap beacons CTA_CLICKED exactly like ShareExamButton.
//
// Language (16 Sep 2026): the block and the WhatsApp message it pre-fills
// are the STUDENT's words, so the results page passes its own locale's
// strings down (src/lib/dashboard-cards-copy.ts). The utm tags and the
// analytics shape are untouched. A Hindi or Telugu message also tags its link
// ?lang=hi|te (src/lib/share-landing-copy.ts), so a friend with no language
// of their own lands on a page in the language of the message, not an
// English one; the English link is byte-identical to before.

import { useState } from "react";
import { shareUrl, type ShareChannel } from "@/lib/share-url";
import { fillTemplate } from "@/lib/i18n";
import type { ShareScoreCopy } from "@/lib/dashboard-cards-copy";
import { shareLandingPath } from "@/lib/share-landing-copy";

interface Props {
  attemptId: string;
  examCode: string;
  examShortName: string;
  scoreDisplay: string;
  labels: ShareScoreCopy;
  /** The locale `labels` was built for — the link carries it for hi/te. */
  locale?: string;
}

export function ShareScoreButton({ attemptId, examCode, examShortName, scoreDisplay, labels, locale }: Props) {
  const [copied, setCopied] = useState(false);

  const tagged = (channel: ShareChannel) =>
    shareUrl(shareLandingPath(attemptId, locale), { surface: "results", channel, exam: examCode });
  const textFor = (link: string) =>
    fillTemplate(labels.message, { score: scoreDisplay, exam: examShortName, link });
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textFor(tagged("whatsapp")))}`;

  function track(via: string) {
    // Best-effort, non-blocking — same first-party CTA_CLICKED beacon as
    // ShareExamButton, so results-page shares sit in the same report.
    try {
      navigator.sendBeacon?.(
        "/api/analytics",
        new Blob(
          [
            JSON.stringify({
              kind: "CTA_CLICKED",
              path: typeof location !== "undefined" ? location.pathname : `/attempts/${attemptId}/results`,
              props: { cta: "share", surface: "results", via, examCode },
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
      await navigator.clipboard.writeText(tagged("copy"));
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
        const link = tagged("native");
        await navigator.share({
          title: fillTemplate(labels.nativeTitle, { score: scoreDisplay, exam: examShortName }),
          text: textFor(link),
          url: link,
        });
        track("native");
      } catch {
        /* user cancelled — no-op */
      }
    }
  }

  return (
    <div className="mt-6 rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-saffron-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {labels.kicker}
          </p>
          <p className="mt-1 text-base font-bold text-ink-900 sm:text-lg">
            {labels.heading}
          </p>
          <p className="mt-1 text-xs text-ink-600">
            {labels.sub}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("whatsapp")}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            {labels.whatsapp}
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center justify-center rounded-md border border-ink-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-saffron-300"
          >
            {copied ? labels.copied : labels.copy}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={nativeShare}
              className="inline-flex items-center justify-center rounded-md border border-ink-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-50 sm:hidden"
            >
              {labels.more}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
