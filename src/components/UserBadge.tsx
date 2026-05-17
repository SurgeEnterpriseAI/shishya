// UserBadge — inline badge shown next to a user's name in community posts,
// dashboard, profile etc. Renders only for non-NEWCOMER levels so we
// don't clutter every author byline with "Newcomer".
//
// Server component — pure presentational. Caller passes the user's
// current badgeLevel (read from User.badgeLevel column).

export type UserBadgeLevel =
  | "NEWCOMER"
  | "CONTRIBUTOR"
  | "VERIFIER"
  | "TRUSTED_VERIFIER"
  | "DOMAIN_EXPERT";

interface Props {
  level: UserBadgeLevel | null | undefined;
  /** Optional domain string for DOMAIN_EXPERT (e.g., "UPSC", "IIT Madras"). */
  domain?: string | null;
  /** Compact mode hides the label; just shows the icon dot. */
  compact?: boolean;
}

const LABELS: Record<UserBadgeLevel, string> = {
  NEWCOMER:         "Newcomer",
  CONTRIBUTOR:      "Contributor",
  VERIFIER:         "Verifier",
  TRUSTED_VERIFIER: "Trusted Verifier",
  DOMAIN_EXPERT:    "Domain Expert",
};

const STYLE: Record<UserBadgeLevel, string> = {
  NEWCOMER:         "border-ink-200 bg-ink-50 text-ink-600",
  CONTRIBUTOR:      "border-emerald-200 bg-emerald-50 text-emerald-700",
  VERIFIER:         "border-emerald-300 bg-emerald-100/70 text-emerald-800",
  TRUSTED_VERIFIER: "border-amber-300 bg-amber-50 text-amber-800",
  DOMAIN_EXPERT:    "border-saffron-300 bg-saffron-50 text-saffron-800",
};

function Icon({ level }: { level: UserBadgeLevel }) {
  const common = "h-2.5 w-2.5 flex-shrink-0";
  switch (level) {
    case "CONTRIBUTOR":
      // small dot
      return <span className={`${common} rounded-full bg-current`} aria-hidden />;
    case "VERIFIER":
      // single check
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" />
        </svg>
      );
    case "TRUSTED_VERIFIER":
      // gold double-check
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7M5 19l4 4 10-10" />
        </svg>
      );
    case "DOMAIN_EXPERT":
      // briefcase glyph
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a48.07 48.07 0 0 1-13.595 0l-1.32-.377a2.25 2.25 0 0 1-1.633-2.163V14.15M16.5 4.5h-9a2.25 2.25 0 0 0-2.25 2.25v.75h13.5v-.75A2.25 2.25 0 0 0 16.5 4.5Z" />
        </svg>
      );
    case "NEWCOMER":
    default:
      return null;
  }
}

export function UserBadge({ level, domain, compact = false }: Props) {
  // Newcomer gets no visible badge — keeps the byline clean for the
  // majority of users who haven't contributed yet.
  if (!level || level === "NEWCOMER") return null;

  const label =
    level === "DOMAIN_EXPERT" && domain
      ? `Domain Expert · ${domain}`
      : LABELS[level];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium align-middle leading-none ${STYLE[level]}`}
      title={label}
      aria-label={label}
    >
      <Icon level={level} />
      {!compact && <span>{label}</span>}
    </span>
  );
}
