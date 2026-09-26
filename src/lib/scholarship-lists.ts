// Scholarship lists and this year's dates (26 Sep 2026, G4 honest page families).
//
// Why: "scholarships for girls", "SC ST OBC scholarship", "minority
// scholarship", "scholarship for class 11" and "scholarship last date" are
// among the largest education searches in India, and Shishya had no crawlable
// page for any of them — only /scholarships (every scheme, filtered in the
// browser; its ?query URLs are robots-blocked) and one page per scheme.
// This module computes, from the catalogue alone (src/data/scholarships.ts):
//   • six filtered lists (/scholarships/for/{filter}) — girls, SC/ST/OBC,
//     minority, Class 9-10, Class 11-12, PhD. The quality critic vetoed
//     "undergraduate" (74% of the catalogue) and "postgraduate" (51%): near
//     copies of /scholarships. "sc-st" and "obc" are one list (their overlap
//     was 0.67), state lists wait until a state has at least 10 schemes (the
//     largest has 6), and there is no disability list (the catalogue has no
//     disability category — only free-text tags). A list is indexable only
//     with at least SCHOLARSHIP_LIST_MIN schemes and less than
//     LIST_OVERLAP_MAX Jaccard overlap with the full catalogue; the test pins
//     that no two indexable lists overlap that much either;
//   • /scholarships/closing-soon — schemes whose official 2026-27 last date
//     falls in the next CLOSING_SOON_DAYS days (IST), noindex until
//     CLOSING_SOON_MIN qualify;
//   • the date line every scholarship page leads with: this year's date only
//     from a cycle read on the official portal (with its tier, host and
//     checked day); otherwise the scheme's usual window, said to be that.
// A scheme the government has discontinued (Scholarship.closed) is in no list.
//
// 27 Sep 2026 (repair, adversarial review): the lists gathered every matching
// catalogue row, and the catalogue grew 49 → 208 rows in four days in May
// 2026 without a per-row check — the review found rows that are not
// scholarships (a bicycle scheme, a uniform scheme, skill training, coaching
// institutes' fee-waiver tests, a football academy), a scheme whose
// implementing body was ordered closed in Feb 2024, and apply links on
// non-official hosts, on pages titled "Official Links". So:
//   • a row marked Scholarship.unlisted is in no list (isListedScheme);
//   • a list is indexable only when EVERY row it lists carries
//     Scholarship.reviewed (re-checked on the awarding body's own page) —
//     until the catalogue audit marks rows, every list is noindex,follow and
//     out of the sitemap, and the page says how many rows were re-checked;
//   • the pages promise "apply links", never "official links".
//
// Pure: no DB, no Next imports, no clock unless the caller passes `now`
// (tests/unit/scholarship-lists.test.ts).

import type { MetadataRoute } from "next";
import type { Scholarship, ScholarshipCycle, ScholarshipLevel } from "@/data/scholarships";
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";

/** A list page is indexable only with at least this many schemes. */
export const SCHOLARSHIP_LIST_MIN = 5;
/** …and only while it overlaps the full catalogue (Jaccard) less than this. */
export const LIST_OVERLAP_MAX = 0.6;
/** /scholarships/closing-soon looks this many IST days ahead… */
export const CLOSING_SOON_DAYS = 30;
/** …and is indexable only with at least this many schemes in the window. */
export const CLOSING_SOON_MIN = 5;

const IST_OFFSET_MS = 330 * 60_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Today's IST calendar day, YYYY-MM-DD. */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** YYYY-MM-DD + n days (calendar arithmetic in UTC, no clock). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "2026-10-31" → "31 Oct 2026". */
export function formatIsoDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Host of a URL without "www.", or the URL itself when it does not parse. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** False for a scheme the awarding government has discontinued. */
export function isOpenScheme(s: Pick<Scholarship, "closed">): boolean {
  return !s.closed;
}

/** An open scheme that may appear in a list: not discontinued and not held
 *  out of lists (Scholarship.unlisted — not a scholarship, or status in doubt). */
export function isListedScheme(s: Pick<Scholarship, "closed" | "unlisted">): boolean {
  return isOpenScheme(s) && !s.unlisted;
}

/** True when the row was re-checked against the awarding body's own page. */
export function isReviewedScheme(s: Pick<Scholarship, "reviewed">): boolean {
  return !!s.reviewed?.on && !!s.reviewed.sourceUrl;
}

/** The line a list page prints about how many of its rows were re-checked
 *  on the awarding body's own page — the count is the list's own. */
export function listReviewLine(list: readonly Pick<Scholarship, "reviewed">[]): string {
  const n = list.length;
  const k = list.filter(isReviewedScheme).length;
  if (n === 0) return "";
  if (k === n) return `Every row here was re-checked against the awarding body's own page.`;
  if (k === 0) {
    return `None of these ${n} rows has been re-checked against the awarding body's own page yet — they come from Shishya's scholarship catalogue. Confirm each scheme on its official website before applying.`;
  }
  return `${k} of these ${n} rows were re-checked against the awarding body's own page; the rest come from Shishya's scholarship catalogue and have not been re-checked yet. Confirm each scheme on its official website before applying.`;
}

// ── This year's date ─────────────────────────────────────────────────────

export type LastDate =
  | { kind: "upcoming"; closesOn: string; opensOn?: string; cycle: ScholarshipCycle }
  | { kind: "passed"; closesOn: string; cycle: ScholarshipCycle }
  | { kind: "no-date"; cycle: ScholarshipCycle }
  | { kind: "usual"; deadline: string }
  | { kind: "discontinued"; note: string; sourceUrl: string; checkedOn: string };

/** What Shishya can say about a scheme's 2026-27 last date on `today` (IST). */
export function lastDateOf(s: Pick<Scholarship, "cycle" | "deadline" | "closed">, today: string): LastDate {
  if (s.closed) return { kind: "discontinued", ...s.closed };
  const c = s.cycle;
  if (!c) return { kind: "usual", deadline: s.deadline };
  if (!c.closesOn) return { kind: "no-date", cycle: c };
  if (c.closesOn < today) return { kind: "passed", closesOn: c.closesOn, cycle: c };
  return { kind: "upcoming", closesOn: c.closesOn, opensOn: c.opensOn, cycle: c };
}

/** "(official — scholarships.gov.in, checked 26 Sep 2026)" */
function provenance(c: ScholarshipCycle): string {
  return `(${c.tier} — ${hostOf(c.sourceUrl)}, checked ${formatIsoDay(c.checkedOn)})`;
}

/** The sentence a scholarship page leads with. Never states a date that was
 *  not read on the official portal; the usual window is called that. */
export function cycleLeadLine(s: Pick<Scholarship, "cycle" | "deadline" | "closed">, today: string): string {
  const d = lastDateOf(s, today);
  const note = s.cycle?.note ? ` ${s.cycle.note}` : "";
  switch (d.kind) {
    case "discontinued":
      return `Not open to new applicants: ${d.note}`;
    case "upcoming": {
      const opens = d.opensOn && d.opensOn > today ? `open ${formatIsoDay(d.opensOn)} and ` : "";
      return `${d.cycle.year}: applications ${opens}close ${formatIsoDay(d.closesOn)} ${provenance(d.cycle)}.${note}`;
    }
    case "passed":
      return `${d.cycle.year}: applications closed on ${formatIsoDay(d.closesOn)} ${provenance(d.cycle)}.${note}`;
    case "no-date":
      return `No ${d.cycle.year} date on the official portal yet (${hostOf(d.cycle.sourceUrl)}, checked ${formatIsoDay(d.cycle.checkedOn)}) — the usual window is ${usualWindow(s.deadline)}.${note}`;
    case "usual":
      return `Shishya has not checked a 2026-27 date for this scheme yet — the usual window is ${usualWindow(d.deadline)}. Confirm the date on the official portal before applying.`;
  }
}

/** The data's deadline prose without a leading "Usually", for "the usual window is …". */
function usualWindow(deadline: string): string {
  return deadline.replace(/^usually\s+/i, "").trim();
}

/** The short last-date cell of a list table. */
export function lastDateCell(s: Pick<Scholarship, "cycle" | "deadline" | "closed">, today: string): { text: string; tier: "official" | "reported" | null } {
  const d = lastDateOf(s, today);
  switch (d.kind) {
    case "upcoming":
      return { text: `${formatIsoDay(d.closesOn)} (${d.cycle.tier})`, tier: d.cycle.tier };
    case "passed":
      return { text: `Closed ${formatIsoDay(d.closesOn)} (${d.cycle.tier})`, tier: d.cycle.tier };
    case "no-date":
      return { text: `Not on the portal yet (checked ${formatIsoDay(d.cycle.checkedOn)})`, tier: d.cycle.tier };
    case "usual":
      return { text: `Usual window: ${usualWindow(d.deadline)}`, tier: null };
    case "discontinued":
      return { text: "Discontinued", tier: null };
  }
}

/** The newest checkedOn among the schemes' cycles — a real timestamp, or null. */
export function newestCheckedOn(list: readonly Pick<Scholarship, "cycle">[]): string | null {
  let best: string | null = null;
  for (const s of list) if (s.cycle && (best === null || s.cycle.checkedOn > best)) best = s.cycle.checkedOn;
  return best;
}

// ── Lists ────────────────────────────────────────────────────────────────

export type ScholarshipFilterSlug = "girls" | "sc-st-obc" | "minority" | "class-9-10" | "class-11-12" | "phd";

export interface ScholarshipFilter {
  slug: ScholarshipFilterSlug;
  /** Completes "Scholarships for …" in a sentence. */
  audience: string;
  /** Completes "Scholarships for …" in a title (title case). */
  audienceTitle: string;
  /** Short chip label. */
  label: string;
  /** How membership is decided — printed on the page, so a reader can check it. */
  rule: string;
  match: (s: Scholarship) => boolean;
}

/** Eligibility limited to named categories, none of them General. */
function reserved(s: Scholarship): boolean {
  const c = s.eligibility.categories;
  return !!c && c.length > 0 && !c.includes("GEN");
}
const hasLevel = (s: Scholarship, l: ScholarshipLevel) => s.levels.includes(l);

export const SCHOLARSHIP_FILTERS: readonly ScholarshipFilter[] = [
  {
    slug: "girls",
    audience: "girls and women",
    audienceTitle: "Girls",
    label: "Girls",
    rule: "Schemes whose rules admit girls or women only.",
    match: (s) => s.eligibility.gender === "F",
  },
  {
    slug: "sc-st-obc",
    audience: "SC, ST and OBC students",
    audienceTitle: "SC, ST and OBC Students",
    label: "SC / ST / OBC",
    rule: "Schemes whose eligibility is limited to listed categories that include Scheduled Castes, Scheduled Tribes or Other Backward Classes (some also admit EWS or minority students). Schemes open to every category are not repeated here.",
    match: (s) => reserved(s) && s.eligibility.categories!.some((c) => c === "SC" || c === "ST" || c === "OBC"),
  },
  {
    slug: "minority",
    audience: "minority-community students",
    audienceTitle: "Minority Students",
    label: "Minority",
    rule: "Schemes whose eligibility is limited to listed categories that include students of minority communities. Schemes open to every category are not repeated here.",
    match: (s) => reserved(s) && s.eligibility.categories!.includes("MIN"),
  },
  {
    slug: "class-9-10",
    audience: "Class 9 and 10 students",
    audienceTitle: "Class 9 and 10 Students",
    label: "Class 9–10",
    rule: "Schemes that fund students in Class 9 or Class 10.",
    match: (s) => hasLevel(s, "CLASS_9_10"),
  },
  {
    slug: "class-11-12",
    audience: "Class 11 and 12 students",
    audienceTitle: "Class 11 and 12 Students",
    label: "Class 11–12",
    rule: "Schemes that fund students in Class 11 or Class 12.",
    match: (s) => hasLevel(s, "CLASS_11_12"),
  },
  {
    slug: "phd",
    audience: "PhD and research students",
    audienceTitle: "PhD and Research Students",
    label: "PhD / research",
    rule: "Scholarships and fellowships that fund PhD or research study.",
    match: (s) => hasLevel(s, "PHD"),
  },
];

export function findScholarshipFilter(slug: string): ScholarshipFilter | undefined {
  return SCHOLARSHIP_FILTERS.find((f) => f.slug === slug);
}

/** Type order for ties: government schemes before private ones. */
const TYPE_ORDER: Record<Scholarship["type"], number> = { CENTRAL: 0, MERIT: 1, RESEARCH: 2, EXAM_SPECIFIC: 3, STATE: 4, PRIVATE: 5 };

/** Schemes with an upcoming official last date first (soonest first), then
 *  government before private, then by name. */
export function sortForList(list: readonly Scholarship[], today: string): Scholarship[] {
  const upcoming = (s: Scholarship) => {
    const d = lastDateOf(s, today);
    return d.kind === "upcoming" ? d.closesOn : null;
  };
  return [...list].sort((a, b) => {
    const ua = upcoming(a);
    const ub = upcoming(b);
    if (ua && ub && ua !== ub) return ua < ub ? -1 : 1;
    if (!!ua !== !!ub) return ua ? -1 : 1;
    return TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.name.localeCompare(b.name);
  });
}

/** The open schemes a filter lists, in page order. */
export function schemesForFilter(
  filter: ScholarshipFilter,
  today: string,
  schemes: readonly Scholarship[] = SCHOLARSHIP_SCHEMES,
): Scholarship[] {
  return sortForList(schemes.filter((s) => isListedScheme(s) && filter.match(s)), today);
}

/** |A ∩ B| / |A ∪ B| over scheme ids. */
export function jaccard(a: readonly { id: string }[], b: readonly { id: string }[]): number {
  const A = new Set(a.map((x) => x.id));
  const B = new Set(b.map((x) => x.id));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** A filter list is indexable when it has enough schemes, every one of them
 *  was re-checked on the awarding body's own page (27 Sep 2026 repair), and
 *  it is not a near copy of the whole catalogue. */
export function isFilterListIndexable(list: readonly Scholarship[], schemes: readonly Scholarship[] = SCHOLARSHIP_SCHEMES): boolean {
  if (list.length < SCHOLARSHIP_LIST_MIN) return false;
  if (!list.every(isReviewedScheme)) return false;
  return jaccard(list, schemes.filter(isListedScheme)) < LIST_OVERLAP_MAX;
}

/** "{N} scholarships for girls and women on Shishya: a open across India and b for one state's students." */
export function filterLeadLine(filter: ScholarshipFilter, list: readonly Scholarship[], today: string): string {
  const national = list.filter((s) => !s.state).length;
  const oneState = list.length - national;
  const dated = list.filter((s) => lastDateOf(s, today).kind === "upcoming").length;
  const parts = [
    national > 0 ? `${national} open across India` : "",
    oneState > 0 ? `${oneState} for students of one state` : "",
  ].filter(Boolean);
  const n = list.length;
  const head = `${n} ${n === 1 ? "scholarship" : "scholarships"} for ${filter.audience} on Shishya${parts.length ? `: ${parts.join(" and ")}` : ""}.`;
  const datedLine =
    dated > 0
      ? ` ${dated} ${dated === 1 ? "has" : "have"} a 2026-27 last date still ahead, read on the official portal; the rest show their usual window.`
      : " None has a 2026-27 last date still ahead that Shishya has read on an official portal yet; each row shows its usual window.";
  return head + datedLine;
}

export interface FaqItem {
  q: string;
  a: string;
}

/** The one visible FAQ item of a list page (also its FAQPage JSON-LD). */
export function filterFaq(filter: ScholarshipFilter, list: readonly Scholarship[], today: string): FaqItem {
  const dated = list
    .map((s) => ({ s, d: lastDateOf(s, today) }))
    .filter((x): x is { s: Scholarship; d: Extract<LastDate, { kind: "upcoming" }> } => x.d.kind === "upcoming");
  const q = `When do scholarships for ${filter.audience} close in 2026-27?`;
  if (dated.length === 0) {
    return {
      q,
      a: `None of the ${list.length} schemes listed here has a 2026-27 last date still ahead that Shishya has read on an official portal yet. Each row shows the scheme's usual window; confirm the date on the official link before applying.`,
    };
  }
  const shown = dated.slice(0, 5).map((x) => `${x.s.name} — ${formatIsoDay(x.d.closesOn)} (${x.d.cycle.tier}, ${hostOf(x.d.cycle.sourceUrl)})`);
  const rest = list.length - dated.length;
  return {
    q,
    a:
      `${dated.length} of the ${list.length} schemes listed here ${dated.length === 1 ? "has" : "have"} a 2026-27 last date still ahead, read on the official portal: ${shown.join("; ")}${dated.length > 5 ? `; and ${dated.length - 5} more in the table` : ""}.` +
      (rest > 0 ? ` For the other ${rest}, the table shows the usual window — confirm on the official link before applying.` : ""),
  };
}

// ── Closing soon ─────────────────────────────────────────────────────────

/** Open schemes whose official closesOn is today or within the next `days` IST days, soonest first. */
export function closingSoon(today: string, days: number = CLOSING_SOON_DAYS, schemes: readonly Scholarship[] = SCHOLARSHIP_SCHEMES): Scholarship[] {
  const end = addDays(today, days);
  return schemes
    .filter((s) => isListedScheme(s) && s.cycle?.closesOn && s.cycle.closesOn >= today && s.cycle.closesOn <= end)
    .sort((a, b) => (a.cycle!.closesOn! < b.cycle!.closesOn! ? -1 : a.cycle!.closesOn! > b.cycle!.closesOn! ? 1 : a.name.localeCompare(b.name)));
}

export function isClosingSoonIndexable(list: readonly Scholarship[]): boolean {
  return list.length >= CLOSING_SOON_MIN;
}

// ── A scheme's own FAQ (the detail page renders it visibly) ──────────────

/** The questions a scholarship page answers, each from the data; an answer
 *  with nothing to say is left out rather than padded. */
export function scholarshipFaq(s: Scholarship, today: string): FaqItem[] {
  const out: FaqItem[] = [];
  const elig = [
    s.eligibility.note ?? "",
    s.eligibility.categories ? `Reserved for ${s.eligibility.categories.join("/")} categories.` : "",
    s.eligibility.incomeMaxLakhs !== undefined ? `Family income ceiling ₹${s.eligibility.incomeMaxLakhs} lakh a year.` : "",
    s.eligibility.gender === "F" ? "For girls/women only." : s.eligibility.gender === "M" ? "For boys/men only." : "",
    s.eligibility.minMarksPct !== undefined ? `Minimum ${s.eligibility.minMarksPct}% marks required.` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (elig) out.push({ q: `Who is eligible for ${s.name}?`, a: elig });
  out.push({ q: `How much does ${s.name} pay?`, a: s.amount });
  out.push({
    q: `How do I apply for ${s.name}?`,
    a: s.closed
      ? `It no longer takes new applicants. ${s.closed.note}`
      : `Apply on the awarding body's official portal: ${s.applyUrl}. Shishya does not collect applications. ${cycleLeadLine(s, today)}`,
  });
  return out;
}

// ── Sitemap (the main session wires this into src/lib/sitemap-sections.ts) ──

/** Every indexable list page, and /scholarships/closing-soon while it is
 *  indexable. lastModified = the newest official date check among the
 *  page's schemes (a real day), else omitted. */
export function scholarshipListSitemapEntries(base: string, now: Date = new Date()): MetadataRoute.Sitemap {
  const today = istToday(now);
  const out: MetadataRoute.Sitemap = [];
  for (const f of SCHOLARSHIP_FILTERS) {
    const list = schemesForFilter(f, today);
    if (!isFilterListIndexable(list)) continue;
    const lm = newestCheckedOn(list);
    out.push({ url: `${base}/scholarships/for/${f.slug}`, ...(lm ? { lastModified: lm } : {}), changeFrequency: "weekly", priority: 0.6 });
  }
  const soon = closingSoon(today);
  if (isClosingSoonIndexable(soon)) {
    const lm = newestCheckedOn(soon);
    out.push({ url: `${base}/scholarships/closing-soon`, ...(lm ? { lastModified: lm } : {}), changeFrequency: "daily", priority: 0.6 });
  }
  return out;
}
