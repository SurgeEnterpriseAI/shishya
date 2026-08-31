// Source-tier classification for exam dates (29 Aug 2026).
//
// The DB stores two confidence states on ExamImportantDate:
//   "official"  — the conducting body has announced this exact date this
//                 cycle, and the generator cited a URL for it
//   "expected"  — a typical-cycle estimate
//
// But "announced" citations vary enormously in authority: ssc.gov.in is
// the source; testbook.com merely reports it. The display tier is derived
// deterministically from the cited DOMAIN so it applies retroactively to
// every stored row and can never drift with generator behaviour:
//
//   official  — announced + cited on the conducting body's own site
//               (gov.in/nic.in/ac.in etc., or the exam's official portal)
//   reported  — announced, but cited via a secondary source (news /
//               coaching portal). Real, but students should verify.
//   expected  — estimate; never presented as the date.
//
// Only "official" rows earn the gold badge, the "Official notice" link
// text, and a place in schema.org Event/ItemList structured data.

export type SourceTier = "official" | "reported" | "expected";

// Regulated Indian TLD families that only government bodies / academic
// institutions can register under. Conducting bodies (SSC, UPSC, state
// PSCs, NTA, railways, defence) all live here.
const OFFICIAL_SUFFIXES = ["gov.in", "nic.in", "ac.in", "res.in", "edu.in", "mil.in"];

// Conducting bodies that sit on ordinary commercial TLDs.
const OFFICIAL_HOSTS = [
  "ibps.in", // banking recruitment body
  "rbi.org.in", // RBI recruitment
  "sbi.co.in", // SBI careers
  "cdac.in", // AFCAT + several govt CBTs run on cdac.in subdomains
  "isro.gov.in",
];

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Display label for a secondary source: bare hostname without www. */
export function sourceHostLabel(url: string): string {
  return hostOf(url) ?? url.replace(/^https?:\/\//, "").split("/")[0];
}

/** True when `url` is on the conducting body's own site or a regulated
 *  government/academic domain. `officialUrl` (from ExamEligibility) adds
 *  the exam's specific portal even when it's on a commercial TLD. */
export function isOfficialSource(url: string | null | undefined, officialUrl?: string | null): boolean {
  const host = hostOf(url);
  if (!host) return false;
  const suffixHit = (h: string, s: string) => h === s || h.endsWith("." + s);
  if (OFFICIAL_SUFFIXES.some((s) => suffixHit(host, s))) return true;
  if (OFFICIAL_HOSTS.some((s) => suffixHit(host, s))) return true;
  const own = hostOf(officialUrl);
  if (own && (host === own || host.endsWith("." + own))) return true;
  return false;
}

/** Tier of one date row. `confidence`/`url` come straight from the DB;
 *  rows written before the tracker fields existed classify as expected. */
export function sourceTier(
  confidence: string | null | undefined,
  url: string | null | undefined,
  officialUrl?: string | null,
): SourceTier {
  const announced = (confidence ?? "").toLowerCase() === "official" && !!url && /^https?:\/\//i.test(url);
  if (!announced) return "expected";
  return isOfficialSource(url, officialUrl) ? "official" : "reported";
}
