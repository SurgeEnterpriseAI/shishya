// shareUrl — the ONE place an outbound share link gets its utm tags.
//
// Until 11 Sep 2026 no share URL carried any tag, so a WhatsApp forward
// and a typed URL were indistinguishable in the channel report ("direct").
// Every share surface (ShareExamButton, ShareScoreButton, StudyTogether,
// CapsuleActions, InviteFriendsCard, the tracker + cutoff shares) now
// builds its link here, so the report can answer "which surface, which
// channel, which exam" for every arrival:
//
//   utm_source   = channel   (whatsapp | telegram | native | copy)
//   utm_medium   = share
//   utm_campaign = surface   (results | tracker | cutoff | invite | …)
//   utm_content  = exam code (when the share is about one exam)
//
// Only OUTBOUND share links go through here. Canonical URLs, hreflang
// alternates and the sitemap stay bare — a tagged canonical would split
// the index. Pure function, safe on the client and the server.

export const SHARE_SITE = "https://shishya.in";

export type ShareChannel = "whatsapp" | "telegram" | "native" | "copy";

const CHANNELS: readonly ShareChannel[] = ["whatsapp", "telegram", "native", "copy"];

export function isShareChannel(v: unknown): v is ShareChannel {
  return typeof v === "string" && (CHANNELS as readonly string[]).includes(v);
}

export interface ShareUrlOptions {
  /** Where on the site the share was initiated (becomes utm_campaign). */
  surface: string;
  /** How the link leaves the site (becomes utm_source). */
  channel: ShareChannel;
  /** Exam code the share is about (becomes utm_content). Optional. */
  exam?: string | null;
}

/** utm values are lower-case slugs: letters, digits, dot, dash, underscore. */
function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Absolute, utm-tagged share URL. `path` may be a site-relative path
 * ("/exams/sbi-po", "/hi/exams/sbi-po/updates", "/exams/x#pyqs") or an
 * absolute URL; existing query params and the hash are preserved, and any
 * utm_* already on the URL is replaced so a link is never double-tagged.
 */
export function shareUrl(path: string, opts: ShareUrlOptions): string {
  const absolute = /^https?:\/\//i.test(path)
    ? path
    : `${SHARE_SITE}${path.startsWith("/") ? "" : "/"}${path}`;
  const u = new URL(absolute);
  u.searchParams.set("utm_source", opts.channel);
  u.searchParams.set("utm_medium", "share");
  u.searchParams.set("utm_campaign", slug(opts.surface) || "share");
  if (opts.exam) u.searchParams.set("utm_content", slug(opts.exam));
  else u.searchParams.delete("utm_content");
  return u.toString();
}

/**
 * Same tags, site-relative — for an ON-SITE link that should still be
 * attributed (e.g. the share landing's "check your own 5 questions" CTA).
 * A relative href keeps <Link> client-side and never sends a preview
 * deployment to the production host.
 */
export function sharePath(path: string, opts: ShareUrlOptions): string {
  const u = new URL(shareUrl(path, opts));
  return `${u.pathname}${u.search}${u.hash}`;
}
