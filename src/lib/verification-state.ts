// What /verification may truthfully say about the fact-badge system.
//
// 26 Sep 2026: /verification used to open with "Every fact on Shishya carries
// a visible verification status … community members confirm what they
// personally know" and an og line claiming facts were AI-checked and
// confirmed by the community. The DB never backed it (read-only probe,
// 26 Sep 2026): 526 Fact rows, all status AI, only on college / scholarship /
// board pages; 0 AiCheck rows ever (the seed script wrote lastAiCheckDate
// itself); 2 VERIFY rows from 1 student; no user above NEWCOMER. Third-party
// snippets kept quoting that family of claim.
//
// Everything the page now says about the system's state comes from this
// file: the rules mirror the verify route's code (a test fails if they
// drift) and every count is computed from Fact / Verification / AiCheck /
// User rows by src/lib/db/verification-stats.ts. Nothing here is typed.
//
// Pure module (no prisma import) so tests can pin the wording.

export type FactStatusKey = "NONE" | "AI" | "VERIFIED" | "FULLY" | "NEEDS_REVIEW" | "DISPUTED";

/** The thresholds src/app/api/facts/[id]/verify/route.ts applies when it
 *  recomputes a fact's status after a student acts. The route inlines them;
 *  tests/unit/trust-pages.test.ts reads the route and fails on drift. */
export const FACT_STATUS_RULES = {
  /** flagCount at or above this → DISPUTED ("Flagged"). */
  disputedFlags: 3,
  /** FULLY: a source re-check younger than this many days … */
  fullyRecheckDays: 30,
  /** … plus this many student confirmations, */
  fullyCommunity: 5,
  /** or one Trusted Verifier plus this many student confirmations, or one Domain Expert. */
  fullyTrustedPlusCommunity: 2,
  /** VERIFIED: a source re-check younger than this many days … */
  verifiedRecheckDays: 60,
  /** … plus this many student confirmations (or one Trusted Verifier / Domain Expert). */
  verifiedCommunity: 3,
} as const;

/** Badge labels exactly as src/components/VerificationBadge.tsx prints them. */
export const FACT_STATUS_LABEL: Record<FactStatusKey, string> = {
  FULLY: "Fully verified",
  VERIFIED: "Verified",
  AI: "Sourced",
  NEEDS_REVIEW: "Needs verification",
  NONE: "Not yet verified",
  DISPUTED: "Flagged · review pending",
};

/** Fact sections whose pages render per-fact badges today: only
 *  src/app/colleges/[slug] and src/app/schooling/[slug] call getFactMap.
 *  Scholarship facts exist in the DB but no scholarship page shows them, so
 *  they are not described as badged (a test pins this list to the callers). */
export const BADGE_PAGE_SECTIONS = [
  { section: "COLLEGE", pages: "college pages" },
  { section: "BOARD", pages: "school-board pages" },
] as const;

export const BADGE_LEVEL_LABEL: Record<string, string> = {
  CONTRIBUTOR: "Contributor",
  VERIFIER: "Verifier",
  TRUSTED_VERIFIER: "Trusted Verifier",
  DOMAIN_EXPERT: "Domain Expert",
};
const LEVEL_ORDER = ["CONTRIBUTOR", "VERIFIER", "TRUSTED_VERIFIER", "DOMAIN_EXPERT"] as const;

export interface VerificationStats {
  /** Fact rows and distinct pages per FactSection. */
  sections: { section: string; facts: number; pages: number }[];
  /** Fact rows per (section, status). */
  statuses: { section: string; status: string; facts: number }[];
  /** Facts per section whose lastAiCheckDate is younger than verifiedRecheckDays. */
  recentlyChecked: { section: string; facts: number }[];
  /** AiCheck rows (automated source re-checks actually run). */
  aiChecks: number;
  lastAiCheckAt: Date | null;
  /** VERIFY rows not DISMISSED, and how many students made them. */
  confirmations: number;
  confirmers: number;
  flags: number;
  suggestions: number;
  /** Users per BadgeLevel above NEWCOMER. */
  levels: Record<string, number>;
}

export interface VerificationStateCopy {
  /** "Where this stands today" table rows. */
  rows: { label: string; value: string }[];
  /** Facts in each badge state on the badged page families. */
  perStatus: Record<FactStatusKey, number>;
  badgedFacts: number;
  recheckRunning: boolean;
  /** False while no badged fact has a recent re-check and no Trusted
   *  Verifier / Domain Expert exists: then no fact can reach Verified or
   *  Fully verified, whatever students do. */
  upperTiersReachable: boolean;
  /** Clause about badge levels, e.g. "none has been awarded yet". */
  levelsClause: string;
  /** Sentence about the two senior tiers. */
  seniorTiersSentence: string;
}

const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export function describeVerificationState(s: VerificationStats): VerificationStateCopy {
  const badgedSections = new Set<string>(BADGE_PAGE_SECTIONS.map((b) => b.section));
  const perStatus: Record<FactStatusKey, number> = { FULLY: 0, VERIFIED: 0, AI: 0, NEEDS_REVIEW: 0, NONE: 0, DISPUTED: 0 };
  for (const r of s.statuses) {
    if (!badgedSections.has(r.section)) continue;
    if (r.status in perStatus) perStatus[r.status as FactStatusKey] += r.facts;
  }
  const badged = BADGE_PAGE_SECTIONS
    .map((b) => ({ ...b, row: s.sections.find((x) => x.section === b.section) }))
    .filter((b) => (b.row?.facts ?? 0) > 0);
  const badgedFacts = badged.reduce((a, b) => a + (b.row?.facts ?? 0), 0);
  const recent = s.recentlyChecked
    .filter((r) => badgedSections.has(r.section))
    .reduce((a, r) => a + r.facts, 0);
  const tv = s.levels.TRUSTED_VERIFIER ?? 0;
  const de = s.levels.DOMAIN_EXPERT ?? 0;
  const recheckRunning = s.aiChecks > 0;
  const upperTiersReachable = recent > 0 || tv > 0 || de > 0;

  const rows: { label: string; value: string }[] = [];
  rows.push({
    label: "Facts with a badge",
    value: badged.length === 0
      ? "None yet"
      : badged.map((b) => `${fmt(b.row!.facts)} ${plural(b.row!.facts, "fact")} on ${fmt(b.row!.pages)} ${b.pages}`).join(" · "),
  });
  const states = (Object.keys(perStatus) as FactStatusKey[])
    .filter((k) => perStatus[k] > 0)
    .sort((a, b) => perStatus[b] - perStatus[a]);
  if (states.length === 1) {
    rows.push({ label: "Badge state today", value: `All ${fmt(perStatus[states[0]])} show “${FACT_STATUS_LABEL[states[0]]}”` });
  } else if (states.length > 1) {
    rows.push({ label: "Badge state today", value: states.map((k) => `${fmt(perStatus[k])} “${FACT_STATUS_LABEL[k]}”`).join(" · ") });
  }
  rows.push({
    label: "Automated source re-checks run",
    value: recheckRunning
      ? `${fmt(s.aiChecks)}${s.lastAiCheckAt ? `, latest on ${s.lastAiCheckAt.toISOString().slice(0, 10)}` : ""}`
      : "0 — not running yet",
  });
  rows.push({
    label: "Student confirmations",
    value: `${fmt(s.confirmations)} from ${fmt(s.confirmers)} ${plural(s.confirmers, "student")}`,
  });
  rows.push({ label: "Flags · suggested updates", value: `${fmt(s.flags)} · ${fmt(s.suggestions)}` });

  const awarded = LEVEL_ORDER.filter((l) => (s.levels[l] ?? 0) > 0);
  const awardedText = awarded.map((l) => `${fmt(s.levels[l])} ${BADGE_LEVEL_LABEL[l]}`);
  rows.push({ label: "Badge levels awarded", value: awarded.length === 0 ? "None yet" : awardedText.join(" · ") });
  const levelsClause = awarded.length === 0 ? "none has been awarded yet" : `awarded so far: ${awardedText.join(", ")}`;
  const seniorTiersSentence = tv === 0 && de === 0
    ? "Trusted Verifier and Domain Expert are future tiers, not yet awarded to anyone."
    : `Awarded so far: ${fmt(tv)} Trusted Verifier, ${fmt(de)} Domain Expert.`;

  return { rows, perStatus, badgedFacts, recheckRunning, upperTiersReachable, levelsClause, seniorTiersSentence };
}
