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

import { istDayNumber } from "@/lib/exam-phase";
import { sameStage, stageMarkers } from "@/lib/hub-title";

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
  // 23 Sep 2026: both bodies moved and their old domains now redirect -
  // sbi.co.in -> sbi.bank.in (RBI's .bank.in rule for banks), tslprb.in ->
  // tgprb.in (the Telangana board renamed TGPRB). Their notices on the new
  // domains were labelled "reported" on SBI Clerk, SBI PO and TS Police PC.
  "sbi.bank.in",
  "tgprb.in",
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

const suffixHit = (h: string, s: string) => h === s || h.endsWith("." + s);

// ── Source denylist (26 Sep 2026) ────────────────────────────────────────
// Why: the generator cited copycat and scraper sites as the source of
// "announced" dates and news, and every one of them was shown as tier
// "reported" with a "Source" link — a lookalike of the sarkariresult.com
// portal on a Cameroon / Isle of Man suffix (sarkariresult.com.cm: 11 live
// tracker rows + 13 news rows; sarkariresult.com.im 4 + 6; sarkarijob.com.im
// 1), a job-alert scraper (fastjobsearchers.com 6 + 3, ukexamalert.in 11 +
// 5), a business group's blog (gngroup.org 6 + 1) and a private college's
// news page (aryacollegejpr.com 6) — counts from scripts/tmp-w2-g1-probe.ts
// on 26 Sep 2026. A date such a site "announces" is not announced: it
// classifies as tier "expected" and its link is never offered as a source
// (citableSourceUrl). Checked before the official lists, so a denylisted
// host can never read as official.
//
// Two kinds of entry:
//   • SOURCE_DENYLIST_HOSTS — a host and all its subdomains;
//   • SOURCE_DENYLIST_SUFFIXES — lookalike country suffixes: ".com" typo
//     domains that clone Indian exam portals (".com.cm", ".com.im" …). No
//     conducting body, court or newspaper we cite publishes on them.
export const SOURCE_DENYLIST_HOSTS: readonly string[] = ["gngroup.org", "fastjobsearchers.com", "ukexamalert.in", "aryacollegejpr.com"];
export const SOURCE_DENYLIST_SUFFIXES: readonly string[] = ["cm", "com.im", "co.im", "com.co", "om"];
/** Both lists, for surfaces that print them (editorial notes, tests). */
export const SOURCE_DENYLIST: readonly string[] = [...SOURCE_DENYLIST_HOSTS, ...SOURCE_DENYLIST_SUFFIXES.map((s) => `*.${s}`)];

/** True when `url`'s host is on the source denylist. A missing or unparsable
 *  URL is not "untrusted" — it is simply not a citation. */
export function isUntrustedSource(url: string | null | undefined): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return SOURCE_DENYLIST_HOSTS.some((s) => suffixHit(host, s)) || SOURCE_DENYLIST_SUFFIXES.some((s) => host.endsWith("." + s));
}

/** The URL a surface may link as a row's source: the URL itself, or null
 *  when its host is denylisted (26 Sep 2026). Surfaces that print a
 *  "Source" / "Official notice" link take it from here. */
export function citableSourceUrl(url: string | null | undefined): string | null {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return isUntrustedSource(url) ? null : url;
}

/** Display label for a secondary source: bare hostname without www. */
export function sourceHostLabel(url: string): string {
  return hostOf(url) ?? url.replace(/^https?:\/\//, "").split("/")[0];
}

/** True when `url` is on the conducting body's own site or a regulated
 *  government/academic domain. `officialUrl` (from ExamEligibility) adds
 *  the exam's specific portal even when it's on a commercial TLD. A
 *  denylisted host is never official (26 Sep 2026). */
export function isOfficialSource(url: string | null | undefined, officialUrl?: string | null): boolean {
  const host = hostOf(url);
  if (!host) return false;
  if (isUntrustedSource(url)) return false;
  if (OFFICIAL_SUFFIXES.some((s) => suffixHit(host, s))) return true;
  if (OFFICIAL_HOSTS.some((s) => suffixHit(host, s))) return true;
  const own = hostOf(officialUrl);
  if (own && (host === own || host.endsWith("." + own))) return true;
  return false;
}

/** Tier of one date row. `confidence`/`url` come straight from the DB;
 *  rows written before the tracker fields existed classify as expected.
 *  26 Sep 2026: a row cited only to a denylisted host (isUntrustedSource)
 *  is "expected" — nothing trustworthy announced it. */
export function sourceTier(
  confidence: string | null | undefined,
  url: string | null | undefined,
  officialUrl?: string | null,
): SourceTier {
  const announced = (confidence ?? "").toLowerCase() === "official" && !!url && /^https?:\/\//i.test(url);
  if (!announced) return "expected";
  if (isUntrustedSource(url)) return "expected";
  return isOfficialSource(url, officialUrl) ? "official" : "reported";
}

// ── Passed estimates (24 Sep 2026) ───────────────────────────────────────
// An EXPECTED-tier date that has gone by is not a date a student can plan
// on: nothing was announced, so it is neither upcoming nor history. The
// September read (24 Sep 2026) found 135 live rows like that across 79
// exams, still printed with their dates — AP_APPSC_GROUP1 "Notification
// release 15 Aug" (every AP Group 1 row is an estimate), UK_TET "Admit
// card release (expected) 20 Sep", UK_UKSSSC "Graduate Level result
// (expected) 15 Sep". Every surface that prints tracker rows asks
// passedEstimateView() what to do with a row:
//   "date"   — print it as before (official / reported rows, and estimates
//              still ahead, with their tier word)
//   "line"   — nothing on the tracker says the milestone went ahead: print
//              passedEstimateLine() in the date's place, "No official date
//              yet — the expected notification date has passed"
//   "unsure" — announced rows on the tracker say it may well have gone
//              ahead, so "No official date yet" could be false: AR APPSC's
//              "Prelims admit card (expected)" 27 Aug beside the prelims it
//              admitted to, held 6 Sep (reported); TSPSC Group 4's
//              "Application start (expected)" 10 Mar four days after the
//              notification. Print the neutral line instead: "The expected
//              admit card date has passed — check the official website"
//   "omit"   — an announced row of the same event is on the tracker (GATE's
//              official "registration begins" a day before the generated
//              "registration opens" estimate): leave the estimate out, the
//              announced row answers.
// Official and reported rows are never passed estimates: a passed announced
// date is history. buildTimeline's `passedEstimate` flag
// (src/lib/exam-timeline.ts) is the same test for rows that went through it.
//
// Same event, not same kind (24 Sep 2026 review): the first cut left an
// estimate out whenever ANY announced row of its kind was on the tracker,
// and the /updates key cards, FAQ (its FAQPage JSON-LD) and share text then
// answered with that row — JKPSC's "CCE 2026 notification (expected)" 15 Sep
// 2026 gave way to "CCE 2025 notification" 22 Aug 2025, SSC GD's 2026 CBT
// result estimate to "SSC GD 2025 final result" (Jan 2026), a mains-result
// estimate to the prelims result. An announced row now supersedes only
// within SUPERSEDE_WINDOW_DAYS, at the same stage, and not naming another
// session; further off, a row nothing tells apart makes the estimate
// "unsure", and one that names another cycle, month or stage leaves the
// honest line standing.

/** True when an EXPECTED-tier row's IST calendar day is before today's. */
export function isPassedEstimate(row: { tier: SourceTier; date: Date | string }, now: Date = new Date()): boolean {
  if (row.tier !== "expected") return false;
  const d = row.date instanceof Date ? row.date : new Date(row.date);
  if (!Number.isFinite(d.getTime())) return false;
  return istDayNumber(d) < istDayNumber(now);
}

export type PassedEstimateView = "date" | "line" | "unsure" | "omit";

export interface EstimateRowLike {
  kind: string;
  tier: SourceTier;
  date: Date | string;
  label: string;
  /** The row's citation, when the caller has it (TimelineRow does). */
  url?: string | null;
  /** Set by a caller that strips a denylisted link before this call
   *  (citableSourceUrl): the row was cited, but only to a denylisted host. */
  untrustedSource?: boolean;
}

/** An announced row of the same kind this close to a passed estimate is
 *  the same event: GATE 1 day, CAT 1, CUET 3, AILET 3, SSC CGL 5-6, CTET
 *  15, GJ TET 19, OAS 20 in the 24 Sep 2026 read. */
export const SUPERSEDE_WINDOW_DAYS = 30;
/** Beyond that and up to this far, an announced row of the same kind that
 *  nothing tells apart may still be the same event — UPTET's reported
 *  notification 20 Mar beside "UPTET — notification expected" 15 Jul — so
 *  the estimate is "unsure", never the "No official date yet" line. */
export const SAME_CYCLE_WINDOW_DAYS = 180;
/** Notification, application window and correction window travel together:
 *  an announced one this close means the others went ahead too (TSPSC Group
 *  4, JKCET, CMI, SOF). */
const APPLICATION_GROUP_DAYS = 90;
/** How long after a passed estimate an announced LATER milestone of the
 *  cycle still shows the estimate's own milestone went ahead: a notification
 *  months before its prelims (AR APPSC: 19 Feb → 6 Sep), an admit card a
 *  few weeks before its exam, an exam a few months before its result. */
const WENT_AHEAD_DAYS: Record<string, number> = {
  NOTIFICATION: 240,
  APPLICATION_START: 240,
  CORRECTION_WINDOW: 240,
  APPLICATION_END: 240,
  ADMIT_CARD: 45,
  EXAM: 90,
  ANSWER_KEY: 90,
  QUESTION_PAPER: 90,
  RESULT: 90,
};
/** A later stage held this soon after (prelims → mains, Phase 1 → Phase 2)
 *  means the earlier stage's milestone went ahead. */
const LATER_STAGE_DAYS = 240;

/** A cycle's milestones in order — the tracker's KIND_ORDER without OTHER. */
const CYCLE_RANK: Record<string, number> = {
  NOTIFICATION: 0,
  APPLICATION_START: 1,
  CORRECTION_WINDOW: 2,
  APPLICATION_END: 3,
  ADMIT_CARD: 4,
  EXAM: 5,
  ANSWER_KEY: 6,
  QUESTION_PAPER: 7,
  RESULT: 8,
  INTERVIEW: 9,
};
const APPLICATION_KINDS = new Set(["NOTIFICATION", "APPLICATION_START", "CORRECTION_WINDOW", "APPLICATION_END"]);
const OUTCOME_KINDS = new Set(["ANSWER_KEY", "QUESTION_PAPER", "RESULT"]);
// Sittings are matched on the whole label (sameStage), as before: RBI Grade
// B's announced "Phase 1 — General cadre" does not settle "Phase 1 —
// DEPR/DSIM", nor CMI's "PhD Mathematics Interviews" the M.Sc. interview.
const SITTING_KINDS = new Set(["EXAM", "INTERVIEW"]);

const YEAR_RE = /\b20\d\d\b/g;
const MONTH_RE = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/gi;
const NUMBERED_STAGE_RE = /^(tier|phase|stage|part|level) (\d+)$/;

function dayOf(d: Date | string): number {
  return istDayNumber(d instanceof Date ? d : new Date(d));
}

/** Months a label names, by their first three letters. */
function named(label: string, re: RegExp): Set<string> {
  return new Set(Array.from(label.matchAll(re), (m) => m[0].slice(0, 3).toLowerCase()));
}

function disjoint(a: Set<string>, b: Set<string>): boolean {
  if (!a.size || !b.size) return false;
  for (const x of a) if (b.has(x)) return false;
  return true;
}

function subsetOf(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/** Stage markers without the window-end mark ("Application end (expected)"
 *  and "Last date to apply" are one milestone). */
function markers(label: string): Set<string> {
  const m = stageMarkers(label);
  m.delete("end");
  return m;
}

/** One label's stage markers contain the other's: an unspecific estimate
 *  ("Admit card (expected)") fits a specific announced row ("Prelims admit
 *  card released"); prelims never fits mains, Part-I never Part-II. */
function stagesAgree(a: string, b: string): boolean {
  const ma = markers(a);
  const mb = markers(b);
  return subsetOf(ma, mb) || subsetOf(mb, ma);
}

function sameStep(kind: string, a: string, b: string): boolean {
  return SITTING_KINDS.has(kind) ? sameStage(a, b) : stagesAgree(a, b);
}

/** Two labels name different sessions or cycles: different months ("HP TET
 *  November 2026 notification" vs "June 2026"), or — further apart than
 *  SUPERSEDE_WINDOW_DAYS — different years ("CCE 2026" vs "CCE 2025"). A
 *  generated estimate can carry the wrong year a day off the real row
 *  (GATE's "GATE 2026 — registration opens" beside "GATE 2027 registration
 *  begins"), so close rows are not told apart by year. Years are the first
 *  one of a span: "2025-26" names 2025. */
function namesOtherSession(a: string, b: string, gapDays: number): boolean {
  if (disjoint(named(a, MONTH_RE), named(b, MONTH_RE))) return true;
  return Math.abs(gapDays) > SUPERSEDE_WINDOW_DAYS && disjoint(new Set(a.match(YEAR_RE)), new Set(b.match(YEAR_RE)));
}

/** `later` names a later stage than `est`: prelims → mains, or the same
 *  numbered stage with a higher number (Phase 1 → Phase 2, Part-I →
 *  Part-II). Papers are one sitting, not stages. */
function namesLaterStage(est: string, later: string): boolean {
  const e = markers(est);
  const l = markers(later);
  if (e.has("prelims") && !e.has("mains") && l.has("mains") && !l.has("prelims")) return true;
  for (const x of e) {
    const m = NUMBERED_STAGE_RE.exec(x);
    if (!m) continue;
    for (const y of l) {
      const n = NUMBERED_STAGE_RE.exec(y);
      if (n && n[1] === m[1] && Number(n[2]) > Number(m[2])) return true;
    }
  }
  return false;
}

/** The announced row that settles a passed estimate — the same kind within
 *  SUPERSEDE_WINDOW_DAYS, at the same stage, not naming another session;
 *  the nearest when several do — or null. passedEstimateView says "omit"
 *  exactly when this finds one, and a surface that answered with the
 *  estimate answers with this row instead (ExamWeekBlock's result line). */
export function supersedingRow<T extends EstimateRowLike>(row: T, rows: readonly T[], now: Date = new Date()): T | null {
  if (!isPassedEstimate(row, now) || row.kind === "OTHER") return null;
  const d = dayOf(row.date);
  let best: T | null = null;
  let bestGap = Infinity;
  for (const r of rows) {
    if (r === row || r.tier === "expected" || r.kind !== row.kind) continue;
    const gap = dayOf(r.date) - d;
    if (Math.abs(gap) > SUPERSEDE_WINDOW_DAYS || Math.abs(gap) >= bestGap) continue;
    if (!sameStep(row.kind, row.label, r.label) || namesOtherSession(row.label, r.label, gap)) continue;
    best = r;
    bestGap = Math.abs(gap);
  }
  return best;
}

/** A same-kind announced row further off that nothing tells apart from the
 *  estimate (UPTET's 20 Mar notification vs the 15 Jul estimate). An
 *  outcome with an announced exam day between the two reports another
 *  sitting: SSC GD's "2025 final result" (Jan) before the 2026 CBT
 *  (Apr–May) says nothing about the 2026 result. */
function sameKindUnclear(row: EstimateRowLike, rows: readonly EstimateRowLike[], d: number): boolean {
  return rows.some((r) => {
    if (r === row || r.tier === "expected" || r.kind !== row.kind) return false;
    const rd = dayOf(r.date);
    const gap = rd - d;
    if (Math.abs(gap) <= SUPERSEDE_WINDOW_DAYS || Math.abs(gap) > SAME_CYCLE_WINDOW_DAYS) return false;
    if (!sameStep(row.kind, row.label, r.label) || namesOtherSession(row.label, r.label, gap)) return false;
    if (OUTCOME_KINDS.has(row.kind)) {
      const lo = Math.min(rd, d);
      const hi = Math.max(rd, d);
      const examBetween = rows.some((x) => x.kind === "EXAM" && x.tier !== "expected" && dayOf(x.date) > lo && dayOf(x.date) < hi);
      if (examBetween) return false;
    }
    return true;
  });
}

/** An announced milestone that has already happened says the estimate's own
 *  milestone went ahead: an application-stage row close by (either order), a
 *  later milestone of the cycle at the same stage (the prelims an admit card
 *  was for, the result of an exam), or a later stage (mains after a prelims
 *  result estimate). */
function wentAhead(row: EstimateRowLike, rows: readonly EstimateRowLike[], d: number, today: number): boolean {
  const rank = CYCLE_RANK[row.kind];
  if (rank === undefined) return false;
  return rows.some((r) => {
    if (r === row || r.tier === "expected" || CYCLE_RANK[r.kind] === undefined) return false;
    const rd = dayOf(r.date);
    if (rd > today) return false; // announced, but not happened yet
    const gap = rd - d;
    if (namesOtherSession(row.label, r.label, gap)) return false;
    if (r.kind !== row.kind && APPLICATION_KINDS.has(row.kind) && APPLICATION_KINDS.has(r.kind) && Math.abs(gap) <= APPLICATION_GROUP_DAYS) {
      return true;
    }
    if (gap < 0) return false;
    if (namesLaterStage(row.label, r.label)) return gap <= LATER_STAGE_DAYS;
    return CYCLE_RANK[r.kind] > rank && stagesAgree(row.label, r.label) && gap <= (WENT_AHEAD_DAYS[row.kind] ?? 0);
  });
}

/** What a date surface prints for `row`, given the other live rows of the
 *  same exam (`rows` may include `row`). See the note above: "omit" when an
 *  announced row of the same event settles it (supersedingRow), "unsure"
 *  when announced rows say it may have gone ahead, else "line". OTHER rows
 *  are a mixed bag (counselling rounds, city slips) and always get the line. */
export function passedEstimateView(row: EstimateRowLike, rows: readonly EstimateRowLike[], now: Date = new Date()): PassedEstimateView {
  if (!isPassedEstimate(row, now)) return "date";
  // 26 Sep 2026 (source denylist): a passed row whose only citation is a
  // denylisted copycat or scraper is tier "expected", but a copycat usually
  // copies a real notice — "No official date yet" could be false. 42 of the
  // 45 live rows the denylist demoted on 26 Sep 2026 were already past
  // (scripts/tmp-w2-g1-deny.ts). They read "unsure" ("… has passed — check
  // the official website"), which claims nothing either way, unless an
  // announced row of the same event settles them ("omit").
  const untrusted = row.untrustedSource === true || isUntrustedSource(row.url);
  if (row.kind === "OTHER") return untrusted ? "unsure" : "line";
  if (supersedingRow(row, rows, now)) return "omit";
  if (untrusted) return "unsure";
  const d = dayOf(row.date);
  if (sameKindUnclear(row, rows, d) || wentAhead(row, rows, d, istDayNumber(now))) return "unsure";
  return "line";
}

export type PassedEstimateLocale = "en" | "hi" | "te";

const PASSED_KIND_WORD: Record<PassedEstimateLocale, Partial<Record<string, string>>> = {
  en: {
    NOTIFICATION: "notification",
    APPLICATION_START: "application start",
    APPLICATION_END: "application closing",
    CORRECTION_WINDOW: "correction window",
    ADMIT_CARD: "admit card",
    EXAM: "exam",
    ANSWER_KEY: "answer key",
    QUESTION_PAPER: "question paper",
    RESULT: "result",
    INTERVIEW: "interview",
  },
  hi: {
    NOTIFICATION: "नोटिफ़िकेशन",
    APPLICATION_START: "आवेदन शुरू होने",
    APPLICATION_END: "आवेदन बंद होने",
    CORRECTION_WINDOW: "करेक्शन विंडो",
    ADMIT_CARD: "एडमिट कार्ड",
    EXAM: "परीक्षा",
    ANSWER_KEY: "आंसर की",
    QUESTION_PAPER: "प्रश्न पत्र",
    RESULT: "रिज़ल्ट",
    INTERVIEW: "इंटरव्यू",
  },
  te: {
    NOTIFICATION: "నోటిఫికేషన్",
    APPLICATION_START: "దరఖాస్తు ప్రారంభ",
    APPLICATION_END: "దరఖాస్తు ముగింపు",
    CORRECTION_WINDOW: "కరెక్షన్ విండో",
    ADMIT_CARD: "అడ్మిట్ కార్డ్",
    EXAM: "పరీక్ష",
    ANSWER_KEY: "ఆన్సర్ కీ",
    QUESTION_PAPER: "ప్రశ్నపత్రం",
    RESULT: "రిజల్ట్",
    INTERVIEW: "ఇంటర్వ్యూ",
  },
};

/** The line printed in a passed estimate's place — no date, no guess. For
 *  "line" (the default): "No official date yet — the expected admit card
 *  date has passed". For "unsure", which never claims nothing was
 *  announced: "The expected admit card date has passed — check the official
 *  website". hi / te in their own script; every other UI language gets the
 *  English line (the tracker's own dictionary covers en / hi / te only). */
export function passedEstimateLine(
  kind: string | null | undefined,
  locale: string,
  view: "line" | "unsure" = "line",
): string {
  const lc: PassedEstimateLocale = locale === "hi" || locale === "te" ? locale : "en";
  const word = kind ? PASSED_KIND_WORD[lc][kind] : undefined;
  if (view === "unsure") {
    if (lc === "hi") return word ? `${word} की अनुमानित तारीख निकल चुकी है — आधिकारिक वेबसाइट देखें` : "अनुमानित तारीख निकल चुकी है — आधिकारिक वेबसाइट देखें";
    if (lc === "te") return word ? `${word} అంచనా తేదీ దాటిపోయింది — అధికారిక వెబ్‌సైట్ చూడండి` : "అంచనా తేదీ దాటిపోయింది — అధికారిక వెబ్‌సైట్ చూడండి";
    return word ? `The expected ${word} date has passed — check the official website` : "The expected date has passed — check the official website";
  }
  if (lc === "hi") return word ? `अभी कोई आधिकारिक तारीख नहीं — ${word} की अनुमानित तारीख निकल चुकी है` : "अभी कोई आधिकारिक तारीख नहीं — अनुमानित तारीख निकल चुकी है";
  if (lc === "te") return word ? `ఇంకా అధికారిక తేదీ లేదు — ${word} అంచనా తేదీ దాటిపోయింది` : "ఇంకా అధికారిక తేదీ లేదు — అంచనా తేదీ దాటిపోయింది";
  return word ? `No official date yet — the expected ${word} date has passed` : "No official date yet — the expected date has passed";
}
