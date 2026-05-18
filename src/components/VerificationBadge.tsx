// VerificationBadge — the core trust-differentiator UI component.
//
// Every factual claim on Shishya can carry a visible verification status.
// This component is intentionally small (single line, low-decoration) so
// it can be repeated dozens of times per page without visual noise. The
// visual treatment follows the five-state model from the spec:
//
//   fully    — green double-check (AI within 30d + 3+ community OR 1 trusted)
//   verified — green single-check  (AI within 60d OR 2+ community)
//   ai       — blue circle         (AI auto-verified against source)
//   needs    — amber circle        (stale > 60d OR source change OR mismatch)
//   none     — grey                (no verification yet)
//   disputed — red                 (multiple flags or AI fails consistently)
//
// In Phase 1 most facts will be hardcoded to "ai" — once the DB schema +
// AI verification job ships in Phase 2, the props will be wired up to
// real per-fact verification rows.
//
// Clicking the badge currently opens a non-interactive details popover
// that points at /verification. Once the verification panel ships as a
// route (Phase 2), the popover becomes the entry into the full history.

import Link from "next/link";

export type VerificationStatus =
  | "fully"
  | "verified"
  | "ai"
  | "needs"
  | "none"
  | "disputed";

interface Props {
  /** Current verification status of the claim. */
  status: VerificationStatus;
  /** Display name of the official source (e.g., "NIRF", "CBSE", "NTA"). */
  source?: string;
  /** Direct link to the source URL — opens in a new tab. */
  sourceUrl?: string;
  /** ISO date string of the last verification check. */
  lastCheckedAt?: string;
  /** Optional compact mode — uses just the icon, no label. */
  compact?: boolean;
  /**
   * How to render the badge wrapper:
   *   "link" (default) — renders as a <Link href="/verification"> so a
   *     bare badge on a page navigates to the explainer.
   *   "span" — renders as an inert <span>. Use this when the badge is
   *     nested inside a clickable parent (e.g., ClickableVerificationBadge)
   *     so the parent's onClick fires instead of the link swallowing it.
   */
  as?: "link" | "span";
  /**
   * Verification counts. When present, the badge shows an inline
   * "1/3 confirmed" progress indicator and the hover tooltip explains
   * exactly how many more confirmations would flip the status to the
   * next level. Makes the badge feel actively in-progress instead
   * of static.
   */
  communityCount?: number;
  trustedVerifierCount?: number;
  domainExpertCount?: number;
  flagCount?: number;
}

// Threshold table — mirrors src/lib/db/facts.ts computeFactStatus.
// Kept here as a local constant so the tooltip copy can compute
// progression without an extra import.
const THRESHOLD_VERIFIED = 3;     // community confirmations needed to flip AI → Verified
const THRESHOLD_FULLY    = 5;     // community confirmations needed for Fully (with AI ≤30d)

function progressionText(
  status: VerificationStatus,
  c: number,
  tv: number,
  de: number,
  flags: number,
): string {
  if (status === "ai") {
    if (tv >= 1 || de >= 1) return "Trusted reviewer just confirmed — flipping to Verified";
    const need = THRESHOLD_VERIFIED - c;
    if (need <= 0) return "Threshold reached — flipping to Verified";
    if (c === 0) return `Needs ${need} community confirmations to become Verified`;
    return `${c}/${THRESHOLD_VERIFIED} community confirmations · needs ${need} more for Verified`;
  }
  if (status === "verified") {
    const need = THRESHOLD_FULLY - c;
    if (need <= 0) return "Threshold reached — flipping to Fully verified";
    return `Verified · ${c}/${THRESHOLD_FULLY} confirmations toward Fully verified`;
  }
  if (status === "fully") {
    return `Fully verified · ${c} community confirmations + AI checked recently`;
  }
  if (status === "needs") {
    return "AI re-verification overdue — your confirmation helps refresh it";
  }
  if (status === "disputed") {
    return `${flags} flag${flags === 1 ? "" : "s"} under admin review`;
  }
  return "Not yet verified — be the first to confirm";
}

function progressionShort(status: VerificationStatus, c: number): string | null {
  // The inline "1/3" suffix that goes on the badge itself.
  // Only show for AI and Verified — Fully / Needs / Disputed have
  // other visual signals so suppressing the count keeps the badge tidy.
  if (status === "ai") return `${c}/${THRESHOLD_VERIFIED}`;
  if (status === "verified") return `${c}/${THRESHOLD_FULLY}`;
  return null;
}

const STATUS_LABELS: Record<VerificationStatus, string> = {
  fully:    "Fully verified",
  verified: "Verified",
  ai:       "AI-verified",
  needs:    "Needs verification",
  none:     "Not yet verified",
  disputed: "Flagged · review pending",
};

const STATUS_CLASS: Record<VerificationStatus, string> = {
  fully:    "border-emerald-200 bg-emerald-50/80 text-emerald-800",
  verified: "border-emerald-200 bg-emerald-50/50 text-emerald-700",
  ai:       "border-blue-200 bg-blue-50/60 text-blue-700",
  needs:    "border-amber-200 bg-amber-50/60 text-amber-800",
  none:     "border-ink-200 bg-ink-50/60 text-ink-600",
  disputed: "border-rose-200 bg-rose-50/60 text-rose-700",
};

function Icon({ status }: { status: VerificationStatus }) {
  // Inline SVG icons — bundled (no external font / icon library).
  const common = "h-3 w-3 flex-shrink-0";
  switch (status) {
    case "fully":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7M5 19l4 4 10-10" />
        </svg>
      );
    case "verified":
    case "ai":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" />
        </svg>
      );
    case "needs":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 8v4" />
          <path strokeLinecap="round" d="M12 16v.01" />
        </svg>
      );
    case "disputed":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      );
    case "none":
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export function VerificationBadge({
  status,
  source,
  sourceUrl,
  lastCheckedAt,
  compact = false,
  as = "link",
  communityCount,
  trustedVerifierCount = 0,
  domainExpertCount = 0,
  flagCount = 0,
}: Props) {
  void sourceUrl;
  const c = communityCount ?? 0;
  // Compose the tooltip text. We use `title` because it works in every
  // browser without JS — accessibility win + cheaper than a popover for
  // the high-frequency badge-everywhere pattern.
  //
  // Tooltip format:
  //   "AI-verified against NIRF (2026-05-17)
  //    1/3 community confirmations · needs 2 more for Verified
  //    Click to confirm or flag"
  // The progression line makes the badge feel actively in-progress
  // instead of static, addressing "thinks its under verification process".
  const dateBit = lastCheckedAt
    ? new Date(lastCheckedAt).toISOString().slice(0, 10)
    : null;
  const headLine = [
    STATUS_LABELS[status],
    source ? `against ${source}` : null,
    dateBit ? `(${dateBit})` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const progress = (communityCount !== undefined)
    ? progressionText(status, c, trustedVerifierCount, domainExpertCount, flagCount)
    : null;
  const cta = as === "link"
    ? "Click to learn how verification works"
    : "Click to confirm, flag, or suggest an update";
  const tooltip = [headLine, progress, cta].filter(Boolean).join(" · ");

  // Cursor pointer + hover affordance so users understand "click me".
  // The exact wrapper element depends on `as` — Link for navigation-mode,
  // span when nested inside a clickable parent so the parent's onClick
  // actually fires (an inner <a> would swallow the click and navigate).
  const className = `inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium align-middle leading-none cursor-pointer transition-colors hover:brightness-95 ${STATUS_CLASS[status]}`;
  // Inline "1/3" progress — only on AI + Verified states where the
  // student can move the number by acting. Suppressed on terminal
  // states (Fully / Disputed) and on bare AI badges without count data.
  const progShort = (communityCount !== undefined)
    ? progressionShort(status, c)
    : null;
  const inner = (
    <>
      <Icon status={status} />
      {!compact && (
        <>
          {/* Label + source: truncated so a long source name doesn't
              break the badge layout. */}
          <span className="truncate max-w-[140px]">
            {STATUS_LABELS[status]}
            {source ? ` · ${source}` : ""}
          </span>
          {/* Progress indicator stays OUTSIDE the truncated span so
              it never gets clipped — it's the most important signal
              on the badge ("this is in process, your click moves it"). */}
          {progShort && (
            <span className="ml-1 rounded bg-white/50 px-1 py-[1px] text-[9px] font-semibold tabular-nums">
              {progShort}
            </span>
          )}
        </>
      )}
    </>
  );

  if (as === "span") {
    return (
      <span title={tooltip} className={className} aria-label={tooltip}>
        {inner}
      </span>
    );
  }
  return (
    <Link href="/verification" title={tooltip} className={className} aria-label={tooltip}>
      {inner}
    </Link>
  );
}

/**
 * Section-level summary badge. Shown ONCE at the top of a content-heavy
 * page (e.g., per-exam page) instead of, or in addition to, per-fact
 * badges on mobile. Reads: "All facts on this page AI-verified against
 * official sources · refreshed weekly".
 */
export function SectionVerificationSummary({
  status,
  source,
  refreshCadence,
}: {
  status: VerificationStatus;
  source?: string;
  refreshCadence?: string;
}) {
  return (
    <div className={`mt-3 inline-flex items-start gap-2 rounded-md border px-3 py-2 text-[11px] ${STATUS_CLASS[status]}`}>
      <Icon status={status} />
      <div>
        <p className="font-medium">{STATUS_LABELS[status]}</p>
        <p className="mt-0.5 opacity-80">
          {source ? `Sourced from ${source}. ` : ""}
          {refreshCadence ? `Re-verified ${refreshCadence}. ` : ""}
          <Link href="/verification" className="underline">How this works →</Link>
        </p>
      </div>
    </div>
  );
}
