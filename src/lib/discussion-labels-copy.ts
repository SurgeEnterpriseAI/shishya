// The disclosure labels on the discussion surfaces, in the student's
// language (16 Sep 2026 — i18n.14).
//
// These labels ARE the honesty fix of 11 Sep 2026: seed threads are
// Shishya's own starter questions (they had been stripped of their label so
// they would "read like organic student posts"), and a reply with no
// backing user is the platform's AI, never a person. A Hindi or Telugu
// reader must be told exactly the same thing, so every translation keeps
// the "· Shishya" and "not a student" halves.
//
// The four disclosure labels (starter, Shishya AI, AI reply, Anonymous) are
// the same chips the home page's thread rail shows, so they have ONE home:
// src/lib/home-strip-copy.ts (starterQuestion / shishyaAi / aiReply /
// anonymous — kept there for this surface to reuse). Reading them from
// there means "/" and /discussions can never disagree on how a seed thread
// or an AI reply is labelled in Hindi or Telugu (16 Sep 2026 fixer: the
// two surfaces had each translated them, with different wording). Only
// "Pinned" and "Locked" — thread state, not disclosure — live here.
//
// "Shishya AI" is the product's name and stays in Latin script in every
// language — as does "AI", which Hindi and Telugu aspirants use as-is.
// The DiscussionForumPosting structured data keeps its English author names
// ("Shishya aspirant"): that is machine-read, one stable answer per URL.
//
// The discussion pages are not /hi or /te twins; their locale is the one
// getT() resolves (cookie or preferredLang), so a crawler with no cookie
// still receives the English labels the search index already holds.

import { homeStripCopy } from "@/lib/home-strip-copy";
import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export interface DiscussionLabelsCopy {
  /** Seed thread: Shishya's own starter question, said plainly. */
  starter: string;
  /** A message with no backing user — the platform's AI. */
  shishyaAi: string;
  aiReply: string;
  /** A real student who left no name. */
  anonymous: string;
  pinned: string;
  locked: string;
}

/** Thread-state chips — the only labels that are this surface's alone. */
const THREAD_STATE: Readonly<Record<CopyLocale, Pick<DiscussionLabelsCopy, "pinned" | "locked">>> = {
  en: { pinned: "Pinned", locked: "Locked" },
  hi: { pinned: "पिन किया", locked: "बंद" },
  te: { pinned: "పిన్ చేసినది", locked: "లాక్ చేసినది" },
};

export function discussionLabelsCopy(locale: string | null | undefined): DiscussionLabelsCopy {
  const home = homeStripCopy(locale);
  const state = pickCopy(THREAD_STATE, locale);
  return {
    starter: home.starterQuestion,
    shishyaAi: home.shishyaAi,
    aiReply: home.aiReply,
    anonymous: home.anonymous,
    pinned: state.pinned,
    locked: state.locked,
  };
}
