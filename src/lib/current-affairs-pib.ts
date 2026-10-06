// Filling a past current-affairs day from PIB's own list of that day's
// releases (6 Oct 2026, B2). No AI anywhere in this file or its script.
//
// The daily digest (src/lib/current-affairs.ts) writes only today. 12 of the
// 27 days from 10 Sep to 6 Oct 2026 have no rows (and 14 more since the
// table's first day, 22 Jul: 31 Jul, 7, 10, 17, 20-22, 24, 27 and 29-31 Aug,
// 4 and 6 Sep; read 6 Oct 2026), and a digest written now
// and filed under a past date would carry the wrong day's news, from model
// memory. A past day may instead hold what an official, date-scoped source
// states for that date: the Press Information Bureau's "All releases" page
// (https://www.pib.gov.in/allRel.aspx?reg=3&lang=1, PIB Delhi's list, English)
// lists the releases posted on a chosen day, ministry by ministry (a few of
// them posted by PIB's regional offices: 7 of 551 in the 6 Oct dry run). Read with
// plain HTTP on 6 Oct 2026: a GET returns today's list; the page's own
// ASP.NET postback (ddlday / ddlMonth / ddlYear) returns any past day's
// (35 releases for 11 Sep 2026, 22 for 3 Oct 2026). Each release page
// (PressReleasePage.aspx?PRID=…&reg=3&lang=1) prints "Posted On: 11 SEP 2026
// 5:31PM by PIB Delhi" and carries the headline as og:title.
//
// A stored row is the release's headline exactly as PIB gives it, a summary
// line that only restates what the release page prints (who issued it, who
// posted it, when) and says Shishya has not summarised it, and the link to
// the release. No exam tags and no "why it matters" (both would be our
// judgement). Category "PIB releases" for every row, so the day page shows
// what the day is.
//
// Guards (all pure, here; the script only fetches and writes):
//   - the date is before today's IST date (the cron owns today) and has no rows;
//   - the date is before the newest day the daily digest has stored: the
//     /current-affairs hub shows the newest day under "the day's most
//     exam-relevant current affairs", so a PIB day must never be the newest;
//   - the list page PIB sent back shows the date asked for (its selected
//     day / month / year), and its own count ("Displaying N Press Releases")
//     equals the releases parsed — otherwise the day is left empty;
//   - every release is read on its own page: kept only when its "Posted On"
//     date is the day and its og:title is the listed headline;
//   - a generic headline ("PRESS RELEASE") or a repeated one is dropped;
//   - fewer than MIN_BACKFILL_ITEMS kept → the day is left empty;
//   - --apply writes only a plan file a dry run wrote and a person read
//     (checkPibPlanFile re-checks its every row's shape before a write).
//
// Pure: no DB, no network, no clock.

/** PIB Delhi's English "All releases" page (the postback goes to the same URL). */
export const PIB_ALL_RELEASES_URL = "https://www.pib.gov.in/allRel.aspx?reg=3&lang=1";

/** The only host the backfill reads (a redirect elsewhere is refused). */
export const PIB_HOST = "www.pib.gov.in";

/** Our own name without a URL: PIB answers 403 to an agent carrying "https://"
 *  (tried 6 Oct 2026), as upsc.gov.in does; the same string as WATCH_UA_PLAIN in
 *  src/lib/answer-key-watch-run.ts. */
export const PIB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShishyaOfficialWatch/1.0 (+shishya.in/editorial-policy)";

/** Every backfilled row's category: the day page groups by it, so its heading names the source. */
export const PIB_CATEGORY = "PIB releases";

/** Fewer kept releases than this and the day is left empty. */
export const MIN_BACKFILL_ITEMS = 3;

/** The release page a stored row links to (English, PIB Delhi). */
export function pibReleaseUrl(prid: string): string {
  return `https://www.pib.gov.in/PressReleasePage.aspx?PRID=${prid}&reg=3&lang=1`;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Decode the HTML entities PIB uses, drop tags, collapse whitespace. */
export function htmlText(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const looseHeadline = (s: string) =>
  htmlText(s)
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.\s]+$/, "")
    .toLowerCase();

/** The list's headline is the release page's: equal when case, spacing,
 *  curly quotes and a final full stop are ignored, or — when the list cut a
 *  long headline short with "..." / "…" (3 Oct 2026: "…the Father of the ...")
 *  — the page's headline begins with what the list shows. */
export function sameHeadline(page: string, listed: string): boolean {
  const p = looseHeadline(page);
  const l = looseHeadline(listed);
  if (p === l) return true;
  const cut = htmlText(listed).match(/^(.*?)\s*(?:\.\.\.|…)$/);
  if (!cut) return false;
  const prefix = looseHeadline(cut[1]);
  return prefix.length >= 20 && p.startsWith(prefix);
}

export interface PibListedRelease {
  prid: string;
  ministry: string;
  title: string;
}

export interface PibListing {
  /** The day the page says it shows (its selected day / month / year), YYYY-MM-DD; null when unreadable. */
  shows: string | null;
  /** The page's own count ("Displaying N Press Releases"); null when absent. */
  displayed: number | null;
  releases: PibListedRelease[];
}

function selectedOption(html: string, nameEnd: string): string | null {
  const sel = html.match(new RegExp(`<select[^>]*name="[^"]*\\$${nameEnd}"[^>]*>([\\s\\S]*?)</select>`));
  if (!sel) return null;
  const opt = sel[1].match(/<option[^>]*\bselected(?:="selected")?[^>]*\bvalue="([^"]*)"/) ?? sel[1].match(/<option[^>]*\bvalue="([^"]*)"[^>]*\bselected/);
  return opt ? opt[1] : null;
}

/** Read PIB's "All releases" page: the day it shows, its count, and each release (ministry, PRID, headline). */
export function parsePibListing(html: string): PibListing {
  const d = selectedOption(html, "ddlday");
  const m = selectedOption(html, "ddlMonth");
  const y = selectedOption(html, "ddlYear");
  const shows =
    d && m && y && /^\d{1,2}$/.test(d) && /^\d{1,2}$/.test(m) && /^\d{4}$/.test(y)
      ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
      : null;
  const count = html.match(/Displaying\s+(\d+)\s+Press\s+Releases?/i);
  const releases: PibListedRelease[] = [];
  const group = /<h3[^>]*class=['"][^'"]*font104[^'"]*['"][^>]*>([\s\S]*?)<\/h3>\s*<ul[^>]*class=['"][^'"]*num[^'"]*['"][^>]*>([\s\S]*?)<\/ul>/g;
  for (const g of html.matchAll(group)) {
    const ministry = htmlText(g[1]);
    // Attributes are skipped as quoted strings: a title attribute can hold
    // markup ("NHRC, India takes <i>suo motu</i> cognizance…", 15 and 25 Sep).
    for (const a of g[2].matchAll(/<a\b(?:[^>'"]|'[^']*'|"[^"]*")*?\bhref=['"][^'"]*[?&]PRID=(\d+)[^'"]*['"](?:[^>'"]|'[^']*'|"[^"]*")*>([\s\S]*?)<\/a>/gi)) {
      releases.push({ prid: a[1], ministry, title: htmlText(a[2]) });
    }
  }
  return { shows, displayed: count ? Number(count[1]) : null, releases };
}

export interface PibRelease {
  /** "Posted On" as YYYY-MM-DD; null when the page has none. */
  postedOn: string | null;
  /** The time as printed ("5:31 PM"); null when absent. */
  postedTime: string | null;
  /** Who posted it ("PIB Delhi"); null when absent. */
  postedBy: string | null;
  /** The page's og:title (the headline). */
  title: string | null;
}

/** Read one release page: its "Posted On" line and its og:title. */
export function parsePibRelease(html: string): PibRelease {
  const p = html.match(/Posted On:\s*(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})(?:\s+(\d{1,2}:\d{2})\s*([AP]M))?(?:\s+by\s+([^<\n\r]+?))?\s*</i);
  let postedOn: string | null = null;
  let postedTime: string | null = null;
  let postedBy: string | null = null;
  if (p) {
    const mi = MONTHS.indexOf(p[2].toUpperCase());
    if (mi >= 0) postedOn = `${p[3]}-${String(mi + 1).padStart(2, "0")}-${p[1].padStart(2, "0")}`;
    if (p[4] && p[5]) postedTime = `${p[4]} ${p[5].toUpperCase()}`;
    if (p[6]) postedBy = htmlText(p[6]) || null;
  }
  const og =
    html.match(/<meta[^>]*property=["']og:title["'][^>]*content="([^"]*)"/i) ??
    html.match(/<meta[^>]*content="([^"]*)"[^>]*property=["']og:title["']/i);
  return { postedOn, postedTime, postedBy, title: og ? htmlText(og[1]) || null : null };
}

/** Why the day's list cannot be used; null when it can. */
export function listingProblem(date: string, listing: PibListing): string | null {
  if (listing.shows !== date) return `PIB's page showed ${listing.shows ?? "no readable date"}, not ${date}`;
  if (listing.displayed === null) return "PIB's page gave no release count";
  if (listing.displayed !== listing.releases.length) {
    return `PIB's page counts ${listing.displayed} releases but ${listing.releases.length} were read`;
  }
  if (listing.releases.length === 0) return "PIB lists no release for the day";
  return null;
}

const GENERIC = new Set(["press release", "press note", "press communique", "press communiqué", "pressrelease"]);

/** Why a listed release is not kept; null when it is. */
export function releaseProblem(date: string, listed: PibListedRelease, page: PibRelease | { error: string }): string | null {
  if ("error" in page) return `release page not read (${page.error})`;
  if (GENERIC.has(looseHeadline(listed.title))) return "generic headline";
  if (page.postedOn !== date) return `posted on ${page.postedOn ?? "no readable date"}`;
  if (!page.title || !sameHeadline(page.title, listed.title)) return "release page headline differs from the list";
  return null;
}

/** "11 Sep 2026" for a YYYY-MM-DD date. */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1].charAt(0)}${MONTHS[m - 1].slice(1).toLowerCase()} ${y}`;
}

/** The summary line: only what the release page prints, and that Shishya has not summarised it. */
export function pibSummary(ministry: string, page: PibRelease): string {
  // The ministry is PIB's own group heading ("Ministry of Coal", "AYUSH", "PIB Backgrounder").
  const by = page.postedBy ? ` posted by ${page.postedBy}` : "";
  const when = page.postedOn ? ` on ${shortDate(page.postedOn)}${page.postedTime ? ` at ${page.postedTime}` : ""}` : "";
  return `${ministry}: press release${by}${when}. Headline as PIB gives it; Shishya has not summarised it. Full text at the source link.`;
}

export interface PibRow {
  date: string;
  title: string;
  summary: string;
  category: string;
  examTags: string[];
  whyItMatters: null;
  source: string;
}

export interface PibDayPlan {
  date: string;
  /** "fill": write `rows`; "leave-empty": write nothing, `reason` says why. */
  action: "fill" | "leave-empty";
  reason: string | null;
  listed: number;
  rows: PibRow[];
  dropped: { prid: string; title: string; reason: string }[];
}

/**
 * The plan for one past day. `listing` is null with `listingError` when the
 * list page could not be read; `pages` holds each listed release's page (or
 * its read error) by PRID.
 */
export function planPibDay(input: {
  date: string;
  todayIst: string;
  existingRows: number;
  /** The newest date with a daily-digest (non-PIB) row; null when there is none. */
  newestDigestDay: string | null;
  listing: PibListing | null;
  listingError?: string;
  pages: ReadonlyMap<string, PibRelease | { error: string }>;
}): PibDayPlan {
  const empty = (reason: string, listed = 0, dropped: PibDayPlan["dropped"] = []): PibDayPlan => ({
    date: input.date,
    action: "leave-empty",
    reason,
    listed,
    rows: [],
    dropped,
  });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return empty("not a YYYY-MM-DD date");
  if (input.date >= input.todayIst) return empty(`not a past day (today in IST is ${input.todayIst}); the daily cron writes today`);
  if (input.existingRows > 0) return empty(`the day already has ${input.existingRows} row(s)`);
  const newest = newestDigestProblem(input.date, input.newestDigestDay);
  if (newest) return empty(newest);
  if (!input.listing) return empty(`PIB's list was not read (${input.listingError ?? "unknown error"})`);
  const problem = listingProblem(input.date, input.listing);
  if (problem) return empty(problem, input.listing.releases.length);

  const rows: PibRow[] = [];
  const dropped: PibDayPlan["dropped"] = [];
  const seen = new Set<string>();
  for (const r of input.listing.releases) {
    const page = input.pages.get(r.prid) ?? { error: "not fetched" };
    const why = releaseProblem(input.date, r, page);
    if (why) {
      dropped.push({ prid: r.prid, title: r.title, reason: why });
      continue;
    }
    // The stored headline is the release page's own og:title (the list may cut it short).
    const title = (page as PibRelease).title as string;
    const key = looseHeadline(title).slice(0, 300);
    if (seen.has(key)) {
      dropped.push({ prid: r.prid, title: r.title, reason: "same headline as an earlier release that day" });
      continue;
    }
    seen.add(key);
    rows.push({
      date: input.date,
      title: title.slice(0, 300),
      summary: pibSummary(r.ministry, page as PibRelease),
      category: PIB_CATEGORY,
      examTags: [],
      whyItMatters: null,
      source: pibReleaseUrl(r.prid),
    });
  }
  if (rows.length < MIN_BACKFILL_ITEMS) {
    return empty(`${rows.length} release(s) kept of ${input.listing.releases.length}; at least ${MIN_BACKFILL_ITEMS} are needed`, input.listing.releases.length, dropped);
  }
  return { date: input.date, action: "fill", reason: null, listed: input.listing.releases.length, rows, dropped };
}

/** The form fields of PIB's postback for one day, from the GET page's hidden fields. */
export function pibPostbackForm(getHtml: string, date: string): URLSearchParams {
  const hidden = (name: string) => {
    const esc = name.replace(/\$/g, "\\$");
    const m =
      getHtml.match(new RegExp(`<input[^>]*name="${esc}"[^>]*value="([^"]*)"`)) ??
      getHtml.match(new RegExp(`<input[^>]*value="([^"]*)"[^>]*name="${esc}"`));
    return m ? m[1] : "";
  };
  const [y, m, d] = date.split("-").map(Number);
  const form = new URLSearchParams();
  // ASP.NET's state fields go back exactly as the GET page printed them.
  for (const n of ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION", "__VIEWSTATEENCRYPTED"]) form.set(n, hidden(n));
  form.set("__EVENTTARGET", "ctl00$ContentPlaceHolder1$ddlday");
  form.set("__EVENTARGUMENT", "");
  form.set("__LASTFOCUS", "");
  form.set("ctl00$Bar1$ddlregion", "3");
  form.set("ctl00$Bar1$ddlLang", "1");
  form.set("ctl00$ContentPlaceHolder1$hydregionid", hidden("ctl00$ContentPlaceHolder1$hydregionid") || "3");
  form.set("ctl00$ContentPlaceHolder1$hydLangid", hidden("ctl00$ContentPlaceHolder1$hydLangid") || "1");
  form.set("ctl00$ContentPlaceHolder1$ddlMinistry", "0");
  form.set("ctl00$ContentPlaceHolder1$ddlday", String(d));
  form.set("ctl00$ContentPlaceHolder1$ddlMonth", String(m));
  form.set("ctl00$ContentPlaceHolder1$ddlYear", String(y));
  return form;
}

/** Why a day may not be filled because of where it falls; null when it may.
 *  The hub (/current-affairs) shows the newest stored day as "the day's most
 *  exam-relevant current affairs": a PIB day must not become that day. */
export function newestDigestProblem(date: string, newestDigestDay: string | null): string | null {
  if (newestDigestDay === null) return "the daily digest has stored no day yet";
  if (date >= newestDigestDay) {
    return `not before the newest digest day (${newestDigestDay}); fill it once a later digest day is stored`;
  }
  return null;
}

const PIB_SOURCE_RE = /^https:\/\/www\.pib\.gov\.in\/PressReleasePage\.aspx\?PRID=\d+&reg=3&lang=1$/;
const PIB_SUMMARY_END = "Headline as PIB gives it; Shishya has not summarised it. Full text at the source link.";

/**
 * Check a plan file (the --out of a dry run) before --apply writes it: every
 * day a past day before the newest digest day, every row exactly the shape
 * planPibDay makes (that day, category "PIB releases", no tags, no "why it
 * matters", a PIB release link, a headline, the fixed summary ending), no
 * repeated headline or link, at least MIN_BACKFILL_ITEMS rows. Returns the
 * days to fill; throws on the first row that fails, so nothing is written.
 */
export function checkPibPlanFile(json: unknown, o: { todayIst: string; newestDigestDay: string | null }): PibDayPlan[] {
  const fail = (why: string): never => {
    throw new Error(`plan file refused: ${why}`);
  };
  const plans = (json as { plans?: unknown })?.plans;
  if (!Array.isArray(plans)) fail("no plans array");
  const seenDays = new Set<string>();
  const fills: PibDayPlan[] = [];
  for (const p of plans as PibDayPlan[]) {
    if (!p || typeof p.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) fail("a plan without a YYYY-MM-DD date");
    if (seenDays.has(p.date)) fail(`${p.date} appears twice`);
    seenDays.add(p.date);
    if (p.action === "leave-empty") continue;
    if (p.action !== "fill" || !Array.isArray(p.rows)) fail(`${p.date}: not a fill plan`);
    if (p.date >= o.todayIst) fail(`${p.date}: not a past day (today in IST is ${o.todayIst})`);
    const newest = newestDigestProblem(p.date, o.newestDigestDay);
    if (newest) fail(`${p.date}: ${newest}`);
    if (p.rows.length < MIN_BACKFILL_ITEMS) fail(`${p.date}: ${p.rows.length} row(s), at least ${MIN_BACKFILL_ITEMS} are needed`);
    const titles = new Set<string>();
    const sources = new Set<string>();
    for (const r of p.rows) {
      const where = `${p.date}: row "${String(r?.title).slice(0, 60)}"`;
      if (!r || r.date !== p.date) fail(`${where} is dated ${r?.date}`);
      if (r.category !== PIB_CATEGORY) fail(`${where} has category ${JSON.stringify(r.category)}`);
      if (!Array.isArray(r.examTags) || r.examTags.length !== 0) fail(`${where} has exam tags`);
      if (r.whyItMatters !== null) fail(`${where} has a "why it matters"`);
      if (typeof r.source !== "string" || !PIB_SOURCE_RE.test(r.source)) fail(`${where} does not link a PIB release`);
      if (typeof r.title !== "string" || !r.title.trim() || r.title.length > 300) fail(`${where} has no usable headline`);
      if (typeof r.summary !== "string" || !r.summary.endsWith(PIB_SUMMARY_END)) fail(`${where} has another summary`);
      const t = looseHeadline(r.title);
      if (titles.has(t)) fail(`${where} repeats a headline`);
      if (sources.has(r.source)) fail(`${where} repeats a link`);
      titles.add(t);
      sources.add(r.source);
    }
    fills.push(p);
  }
  return fills;
}

/** True when every row of a day is a PIB backfill row (the day page then says so). */
export function isPibBackfillDay(rows: readonly { category: string }[]): boolean {
  return rows.length > 0 && rows.every((r) => r.category === PIB_CATEGORY);
}
