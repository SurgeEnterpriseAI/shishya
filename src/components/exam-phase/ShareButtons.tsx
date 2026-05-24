"use client";

// Share row for an exam-phase article.
//
// Six channels — Twitter (X), WhatsApp, Telegram, LinkedIn, Facebook,
// Copy-link. Every click fires-and-forgets a tracker hit at
// /api/exam-articles/[id]/share so we can measure which channel
// actually moves traffic and double down on whichever is winning
// in India (almost certainly WhatsApp + Telegram, but we want data).
//
// All channel URLs use the official share endpoints, so the user's
// composer pops with the title + URL pre-filled. WhatsApp uses
// wa.me which works on both wa.me/share schemes & native intents.

import { useState } from "react";
import type { ShareChannel } from "@prisma/client";

interface ShareButtonsProps {
  articleId: string;
  url: string;
  title: string;
}

const CHANNELS: Array<{
  id: ShareChannel;
  label: string;
  icon: string;
  href: (url: string, title: string) => string | null;
}> = [
  {
    id: "WHATSAPP",
    label: "WhatsApp",
    icon: "💬",
    href: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
  },
  {
    id: "TELEGRAM",
    label: "Telegram",
    icon: "✈️",
    href: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    id: "TWITTER",
    label: "X / Twitter",
    icon: "𝕏",
    href: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: "LINKEDIN",
    label: "LinkedIn",
    icon: "in",
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    id: "FACEBOOK",
    label: "Facebook",
    icon: "f",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    id: "COPY_LINK",
    label: "Copy link",
    icon: "🔗",
    // Special-case: handled inline below via navigator.clipboard.
    href: () => null,
  },
];

export function ShareButtons({ articleId, url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function track(channel: ShareChannel) {
    // Best-effort, no error handling — this should never block the
    // user's share action.
    try {
      await fetch(`/api/exam-articles/${articleId}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel }),
        keepalive: true,
      });
    } catch {
      /* swallow */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: prompt the user with the URL so they can copy manually.
      window.prompt("Copy this link:", url);
    }
    track("COPY_LINK");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium text-ink-500">Share:</span>
      {CHANNELS.map((ch) => {
        if (ch.id === "COPY_LINK") {
          return (
            <button
              key={ch.id}
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/40"
              aria-label={copied ? "Link copied" : "Copy link"}
            >
              <span aria-hidden>{ch.icon}</span>
              <span>{copied ? "Copied!" : ch.label}</span>
            </button>
          );
        }
        const href = ch.href(url, title);
        if (!href) return null;
        return (
          <a
            key={ch.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track(ch.id)}
            className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/40"
            aria-label={`Share on ${ch.label}`}
          >
            <span aria-hidden className="font-semibold">{ch.icon}</span>
            <span>{ch.label}</span>
          </a>
        );
      })}
    </div>
  );
}
