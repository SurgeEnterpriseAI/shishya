// Official listing adapters (30 Sep 2026, after the dry pilot of the answer-key
// watch passed 1 of 6 exams). PURE parsing plus one reader that takes the
// fetch as a dependency — no network of its own, so every adapter is tested on
// saved pages (tests/fixtures/official-listings/).
//
// Why: the watch read every listing as plain HTML with <a href> links. Four
// bodies publish their answer keys and results another way (checked with curl
// on 30 Sep 2026, a few polite requests each):
//
//   upsc   www.upsc.gov.in. The bare host redirects every path to the www
//          homepage, and its firewall answers 403 to an agent carrying
//          "https://…" (the fetch layer handles both — answer-key-watch-run).
//          Its answer-key / written-result / final-result pages are tables
//          "Exam Name | Download | Date of Upload" whose rows never say
//          "answer key" or "result": the page's own <h1> ("Answer Keys",
//          "Written Results", "Final Results") names the kind of every row. The
//          adapter prints that heading in front of the row — only for links
//          inside the page's data tables, only when the heading names a kind.
//   ssc    ssc.gov.in/home/answer-key and /home/candidate-result are an Angular
//          app (80 KB shell, 0 links). The app reads SSC's own JSON endpoint
//          https://ssc.gov.in/api/general-website/portal/records
//          (contentType=answer-key | results) and links its files at
//          /api/attachment/uploads/masterData/{AnswerKeys|Results}/{file}. The
//          two pages print different rows (SSC's bundle, review 30 Sep 2026):
//          the answer-key row prints only the headline and the file size and
//          opens only the record's FIRST attachment — no date; the results
//          table prints the upload date (createdAt, "dd-MM-yyyy") before the
//          headline and labels its two links "Result" and "Write Up". The
//          adapter reads that endpoint and rebuilds exactly those rows (the
//          results date in IST, as the page shows it in India) — never a date
//          the page does not print, which gate 5 would take as "printed".
//   ibps   www.ibps.in/index.php/{exam}/ (e.g. management-trainees/) is an index
//          of cycle pages ({exam}-xvi/, {exam}-xv/ …). A cycle page prints every
//          notice as a card "29 Sep 2026 {title}" (plain HTML). The adapter
//          follows the index to its two newest cycle pages. Results and scores
//          are candidate-login pages on ibpsreg.ibps.in (HTTP 500 to any
//          non-browser agent): such links are marked access "login" — gate 2
//          still decides, the report says why.
//   rrb    the regional RRB sites (rrbcdg.gov.in …) now redirect to
//          rrb.indianrailways.gov.in/{region}. Notices are listed per category
//          at /getdata?loc={region}&category={Objection Tracker | Exam Results
//          | …} as table rows "CEN Number | Title | Description | Publication
//          Date | Action", the files in <option value="/-/image/…"> of a
//          language picker (no <a href>). The firewall answers every getdata
//          page and file with an HTTP 200 "Request Rejected" page unless the
//          request carries the session cookies the region page sets — the
//          reader loads the region page first (the fetch layer keeps cookies).
//
// 1 Oct 2026 (the crawl of 30 Sep FAILed CLAT, GATE, IIT JAM, CAT and JEE
// (Advanced) with "no listing page proposed"; each page below was read with
// curl that day on the body's own site):
//   jeeadv jeeadv.ac.in. The home page is the body's notice board: every
//          announcement is a box "<h4 class=announcement__head>{title}</h4>
//          {text and links} [ Posted on June 01, 2026, 2:45 IST ]" — JEE
//          (Advanced) 2026's provisional keys (posted May 25), final keys and
//          results (June 01) went up there. Plain HTML reads a link's row as
//          the text box alone, without the title and the posted day; the
//          adapter reads the whole box as the row. HTML comments are dropped
//          (the page keeps old boxes commented out). Other links: plain HTML.
//          Its heading is "" (review, 1 Oct 2026): the page's own title "JEE
//          (Advanced) 2026" made the crawl read it as a single-exam page, so
//          every box counted as naming the exam — and the page also carries
//          JoSAA's and the AAT's boxes. Replayed on the 2026 cycle with RESULT
//          still due, "Registration for JoSAA 2026" ("…all qualified
//          candidates…", 3 Jun) and the AAT results box (7 Jun) passed as
//          "Result — JEE Advanced 2026 exam". Each box prints its own title,
//          so a row must name the exam itself.
//   gate   a GATE organising institute's site (gate{year}.iit…/iisc.ac.in;
//          GATE 2027: IIT Madras, gate2027.iitm.ac.in — its home page names
//          the "Organizing Institute"). Its Notifications page is a table
//          "Date | Activity" whose date cell spans all of that day's rows
//          (rowspan 2 … 7): plain HTML gives the 2nd–7th notice of a day no
//          date. The adapter carries a rowspan cell into every row it spans,
//          as the page shows it ("27<sup>th</sup>" read as "27th").
//
// ssc-api and rrb read a feed / category tables with no page heading of the
// body's, and jeeadv's page speaks for more than one exam (see above): their
// heading is "" (review, 30 Sep 2026: a made-up heading such as
// "RRB chandigarh · Objection Tracker" let a research term like "RRB" name
// the exam for every row, via the crawl's single-exam heading). Headings and
// page text are only ever what the body served.
//
// A page that is built by script and has no machine-readable source we know is
// reported "browser-needed" (fetchMode "browser-only"), never guessed at. The
// release gate (src/lib/answer-key-watch.ts releaseGate) is unchanged: every
// link an adapter returns goes through the same five conditions, and our own
// fetch of the link decides gate 2.

import { classifyLink, extractLinks, htmlText, pageHeading, type PageLink, type WatchKind } from "@/lib/answer-key-watch";
import { isOfficialSource } from "@/lib/official-source";

export type ListingAdapter = "html" | "upsc" | "ssc-api" | "ibps" | "rrb" | "jeeadv" | "gate";

/** A listing link, with how the body lets it be opened. "login": a
 *  candidate-login page (IBPS results / scores) — our fetch cannot open it. */
export interface ListingLink extends PageLink {
  access?: "login";
}

/** What the reader needs from a fetch (answer-key-watch-run FetchedPage). */
export interface ListingPage {
  status: number;
  contentType: string | null;
  body: string;
  finalUrl: string | null;
  error?: string;
}
export type ListingFetch = (url: string, opts: { maxBytes: number }) => Promise<ListingPage>;

export interface ListingRead {
  adapter: ListingAdapter;
  /** "html" readable (by HTML or the body's own JSON feed); "browser-only"
   *  (script-built, no machine-readable source known — "browser-needed");
   *  "blocked" (HTTP error, firewall page, off-host redirect, unreachable). */
  fetchMode: "html" | "browser-only" | "blocked";
  /** Human status: "HTTP 403", "browser-needed: …", "read via …". */
  status: string;
  /** The URLs actually read, in order (the machine-readable source for ssc). */
  sources: string[];
  /** Final URL of the last page read. */
  pageUrl: string;
  /** The heading the body printed on the page read (UPSC's h1, the page's
   *  title); "" for ssc-api and rrb, which read a feed / tables with none,
   *  and for jeeadv, whose page also carries JoSAA's and the AAT's boxes
   *  (1 Oct 2026) — never one the adapter made up. */
  heading: string;
  links: ListingLink[];
  /** The text the pages read print (htmlText; SSC: the headlines), capped —
   *  where the crawl checks which exam terms the body itself uses. */
  pageText: string;
  requests: number;
  /** The run's time guard stopped the read before one of its requests
   *  (fetchMode "blocked", status "time guard: …"): not read, not refused. */
  timeGuard?: boolean;
}

const HTML_MAX_BYTES = 3_000_000;
const PAGE_TEXT_MAX = 200_000;

function safeUrl(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

const bareHost = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");

// ── which adapter ────────────────────────────────────────────────────────

/** The SSC portal content type a listing URL stands for, or null. */
export function sscContentType(url: string): "answer-key" | "results" | null {
  const u = safeUrl(url);
  if (!u || bareHost(u) !== "ssc.gov.in") return null;
  const p = u.pathname.replace(/\/+$/, "").toLowerCase();
  if (p === "/api/general-website/portal/records") {
    const ct = u.searchParams.get("contentType");
    return ct === "answer-key" || ct === "results" ? ct : null;
  }
  if (/^(?:\/home)?\/answer-key$/.test(p)) return "answer-key";
  if (/^(?:\/home)?\/(?:candidate-result|result|results)$/.test(p)) return "results";
  return null;
}

/** Legacy regional RRB hosts → their region on rrb.indianrailways.gov.in.
 *  rrbcdg.gov.in → /chandigarh is observed (30 Sep 2026: http 302); the others
 *  follow the region list printed on rrb.indianrailways.gov.in. */
const RRB_LEGACY: Readonly<Record<string, string>> = {
  "rrbcdg.gov.in": "chandigarh",
  "rrbahmedabad.gov.in": "ahmedabad",
  "rrbajmer.gov.in": "ajmer",
  "rrbbnc.gov.in": "bengaluru",
  "rrbbhopal.gov.in": "bhopal",
  "rrbbbs.gov.in": "bhubaneswar",
  "rrbbilaspur.gov.in": "bilaspur",
  "rrbchennai.gov.in": "chennai",
  "rrbgkp.gov.in": "gorakhpur",
  "rrbguwahati.gov.in": "guwahati",
  "rrbjammu.nic.in": "jammu",
  "rrbkolkata.gov.in": "kolkata",
  "rrbmalda.gov.in": "malda",
  "rrbmumbai.gov.in": "mumbai",
  "rrbmuzaffarpur.gov.in": "muzaffarpur",
  "rrbpatna.gov.in": "patna",
  "rrbald.gov.in": "prayagraj",
  "rrbranchi.gov.in": "ranchi",
  "rrbsecunderabad.gov.in": "secunderabad",
  "rrbsiliguri.gov.in": "siliguri",
  "rrbthiruvananthapuram.gov.in": "thiruvananthapuram",
};
/** The regions rrb.indianrailways.gov.in lists (its home page, 30 Sep 2026). */
export const RRB_REGIONS: readonly string[] = [
  "ahmedabad", "ajmer", "bengaluru", "bhopal", "bhubaneswar", "bilaspur", "chandigarh", "chennai", "gorakhpur", "guwahati", "jammu",
  "kolkata", "malda", "mumbai", "muzaffarpur", "patna", "prayagraj", "ranchi", "secunderabad", "siliguri", "thiruvananthapuram",
];
export const RRB_HOST = "rrb.indianrailways.gov.in";
/** Centralised notices (CENs) are posted on every region's page alike; with
 *  no region named, the watch reads RRB Chandigarh's (rrbcdg.gov.in's). */
const RRB_DEFAULT_REGION = "chandigarh";

/** A GATE organising institute's site: gate2027.iitm.ac.in, gate2026.iitg.ac.in,
 *  gate2024.iisc.ac.in … (1 Oct 2026). */
const GATE_HOST_RE = /^gate20\d\d\.(?:iit[a-z]{1,8}|iisc)\.ac\.in$/;

export function listingAdapterFor(listingUrl: string): ListingAdapter {
  const u = safeUrl(listingUrl);
  if (!u) return "html";
  const h = bareHost(u);
  if (h === "upsc.gov.in") return "upsc";
  if (h === "ssc.gov.in" && sscContentType(listingUrl)) return "ssc-api";
  if (h === "ibps.in" && /^\/index\.php\/[a-z0-9-]+\/?$/i.test(u.pathname)) return "ibps";
  if (h === RRB_HOST || h in RRB_LEGACY) return "rrb";
  if (h === "jeeadv.ac.in") return "jeeadv";
  if (GATE_HOST_RE.test(h)) return "gate";
  return "html";
}

// ── shared checks ────────────────────────────────────────────────────────

/** A page built by script: an app root / "enable JavaScript" shell with (almost)
 *  no text and no links. ssc.gov.in: 80 KB, 41 characters of text, 0 links. */
export function isScriptShell(html: string): boolean {
  const h = html ?? "";
  const marker = /<app-root\b|<div[^>]+id=["'](?:root|app|__next)["'][^>]*>\s*<\/div>|\bng-version=|enable\s+javascript\s+to\s+run\s+this\s+app/i.test(h);
  if (!marker) return false;
  const links = (h.match(/<a\s[^>]*href=/gi) ?? []).length;
  return links === 0 || htmlText(h).length < 200;
}

/** The F5 firewall page rrb.indianrailways.gov.in answers with HTTP 200. */
export function isFirewallPage(body: string): boolean {
  return /<title>\s*Request Rejected\s*<\/title>|The requested URL was rejected\. Please consult with your administrator/i.test((body ?? "").slice(0, 4000));
}

// ── upsc ─────────────────────────────────────────────────────────────────

/** UPSC's own page title (<h1 class="heading1">), not the "enable JavaScript"
 *  noscript heading. */
export function upscHeading(html: string): string {
  const m = /<h1[^>]*class=["'][^"']*heading1[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i.exec(html ?? "");
  return m ? htmlText(m[1]) : "";
}

/** Every link of a UPSC page; links inside its data tables (views-table) carry
 *  the page heading in front of their row when that heading names a kind
 *  ("Answer Keys · CISF AC(EXE) LDCE-2026 (1.72 MB) 10/09/2026"). */
export function parseUpscListing(html: string, pageUrl: string): { heading: string; links: ListingLink[] } {
  const h1 = upscHeading(html);
  const all = extractLinks(html, pageUrl);
  const cls = classifyLink(h1);
  if (!h1 || (!cls.ak && !cls.result)) return { heading: h1 || pageHeading(html), links: all };
  const inTables = new Map<string, PageLink>();
  for (const m of (html ?? "").matchAll(/<table[^>]*class=["'][^"']*views-table[^"']*["'][^>]*>[\s\S]*?<\/table>/gi)) {
    for (const l of extractLinks(m[0], pageUrl)) inTables.set(l.url, l);
  }
  const links = all.map((l) => {
    const t = inTables.get(l.url);
    return t ? { ...t, rowText: `${h1} · ${t.rowText}`.slice(0, 1200) } : l;
  });
  return { heading: h1, links };
}

/** Most What's New item pages followed per read, newest first (rows only move
 *  down the list, so an item past the cap never comes back into it). */
export const UPSC_ITEM_MAX = 24;

/** A What's New row's own page, /whats-new/{exam}/{document type}. */
export function isUpscWhatsNewItem(url: string): boolean {
  const u = safeUrl(url);
  if (!u || bareHost(u) !== "upsc.gov.in") return false;
  const parts = u.pathname.split("/").filter(Boolean);
  return parts.length === 3 && parts[0] === "whats-new";
}

/** The files a What's New item page carries: the PDFs in its views-table
 *  (30 Sep 2026: "Name of Examination | Document Type | Documents"). An item
 *  page that has left What's New prints only its breadcrumb — no files. */
export function parseUpscItemFiles(html: string, pageUrl: string): string[] {
  const files = new Set<string>();
  for (const m of (html ?? "").matchAll(/<table[^>]*class=["'][^"']*views-table[^"']*["'][^>]*>[\s\S]*?<\/table>/gi)) {
    for (const l of extractLinks(m[0], pageUrl)) {
      const u = safeUrl(l.url);
      if (u && bareHost(u) === "upsc.gov.in" && /\.pdf$/i.test(u.pathname)) files.add(l.url);
    }
  }
  return [...files];
}

// ── ssc ──────────────────────────────────────────────────────────────────

export const SSC_RECORDS_API = "https://ssc.gov.in/api/general-website/portal/records";

/** The query the SSC app itself sends (its answer-key / candidate-result
 *  pages, 30 Sep 2026), with a longer first page. */
export function sscRecordsUrl(contentType: "answer-key" | "results", limit = 20): string {
  const attributes =
    contentType === "results"
      ? "id,headline,examId,examYear,contentType,redirectUrl,startDate,endDate,language,createdAt"
      : "id,headline,examId,examYear,contentType,startDate,endDate,language,createdAt";
  const q: [string, string][] = [
    ["page", "1"],
    ["limit", String(limit)],
    ["contentType", contentType],
    ...(contentType === "results" ? ([["pageType", "filter"]] as [string, string][]) : []),
    ["key", "createdAt"],
    ["order", "DESC"],
    ["isAttachment", "true"],
    ["attributes", attributes],
    ["language", "english"],
  ];
  return `${SSC_RECORDS_API}?${q.map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%2C/g, ",")}`).join("&")}`;
}

interface SscAttachment {
  fileName?: string | null;
  path?: string | null;
  documentType?: string | null;
}
interface SscRecord {
  headline?: string | null;
  createdAt?: string | null;
  attachments?: SscAttachment[] | null;
}

/** "dd-MM-yyyy" of an instant, in IST (how SSC's page prints createdAt in India). */
export function istDdMmYyyy(iso: string | null | undefined): string {
  const t = Date.parse(iso ?? "");
  if (!Number.isFinite(t)) return "";
  const d = new Date(t + 330 * 60_000);
  return `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
}

/** The file URL SSC's page opens: /api/attachment/{path} (the stored path),
 *  else /api/attachment/uploads/masterData/{location}/{fileName}. */
export function sscFileUrl(a: SscAttachment, location: "AnswerKeys" | "Results"): string | null {
  const raw = (a.path ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
  const rel = /^uploads\//i.test(raw) ? raw : a.fileName ? `uploads/masterData/${location}/${a.fileName}` : "";
  if (!rel) return null;
  const esc = rel.replace(/%/g, "%25").replace(/#/g, "%23").replace(/\?/g, "%3F");
  try {
    return new URL(`https://ssc.gov.in/api/attachment/${esc}`).toString();
  } catch {
    return null;
  }
}

/** SSC's JSON records → the rows its pages print. Answer keys: the headline
 *  is the link's text and the row's (the page prints no date), the record's
 *  first attachment only (the one the page opens); results: the printed
 *  upload date + the headline, the "Result" link first, then "Write Up".
 *  Null when the body is not SSC's records JSON. */
export function parseSscRecords(json: string, contentType: "answer-key" | "results"): ListingLink[] | null {
  let data: { statusCode?: unknown; data?: unknown };
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (String(data?.statusCode ?? "") !== "200" || !Array.isArray(data.data)) return null;
  const location = contentType === "answer-key" ? "AnswerKeys" : "Results";
  const out: ListingLink[] = [];
  for (const r of data.data as SscRecord[]) {
    const headline = String(r?.headline ?? "").replace(/\s+/g, " ").trim();
    if (!headline) continue;
    // The answer-key page prints no date: createdAt never enters the text the
    // gate reads (review, 30 Sep 2026), so gate 5 sees an undated row.
    const rowText = contentType === "results" ? [istDdMmYyyy(r.createdAt), headline].filter(Boolean).join(" · ") : headline;
    const atts = Array.isArray(r.attachments) ? r.attachments : [];
    const isWriteup = (a: SscAttachment) => (a.documentType ?? "").toLowerCase() === "writeup";
    const ordered = contentType === "results" ? [...atts.filter((a) => !isWriteup(a)), ...atts.filter(isWriteup)] : atts.slice(0, 1);
    const seen = new Set<string>();
    for (const a of ordered) {
      const url = sscFileUrl(a, location);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const anchorText = contentType === "results" ? (isWriteup(a) ? "Write Up" : "Result") : headline;
      out.push({ url, anchorText, rowText });
    }
  }
  return out;
}

// ── ibps ─────────────────────────────────────────────────────────────────

const ROMAN_VALUE: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };
export function romanValue(s: string): number | null {
  const t = (s ?? "").toLowerCase();
  if (!/^[ivxlc]+$/.test(t)) return null;
  let n = 0;
  for (let i = 0; i < t.length; i++) {
    const v = ROMAN_VALUE[t[i]];
    const next = ROMAN_VALUE[t[i + 1]] ?? 0;
    n += v < next ? -v : v;
  }
  return n > 0 ? n : null;
}

/** "/index.php/management-trainees-xvi/" → { slug: "management-trainees", n: 16 }. */
function ibpsCycleOf(path: string): { slug: string; n: number } | null {
  const m = /^\/index\.php\/([a-z0-9-]+?)-([ivxlc]+)\/?$/i.exec(path);
  if (!m) return null;
  const n = romanValue(m[2]);
  return n ? { slug: m[1].toLowerCase(), n } : null;
}

/** The newest cycle pages an IBPS exam index links ({slug}-{roman}/), newest
 *  first, at most `max`. [] when the page is not such an index. */
export function ibpsCyclePages(html: string, pageUrl: string, max = 2): string[] {
  const u = safeUrl(pageUrl);
  if (!u) return [];
  const slug = /^\/index\.php\/([a-z0-9-]+)\/?$/i.exec(u.pathname)?.[1]?.toLowerCase();
  if (!slug || ibpsCycleOf(u.pathname)) return [];
  const found = new Map<string, number>();
  for (const l of extractLinks(html, pageUrl)) {
    const lu = safeUrl(l.url);
    if (!lu || bareHost(lu) !== "ibps.in") continue;
    const c = ibpsCycleOf(lu.pathname);
    if (c && c.slug === slug) found.set(`https://www.ibps.in${lu.pathname.replace(/\/?$/, "/")}`, c.n);
  }
  return [...found.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([url]) => url);
}

const IBPS_LOGIN_RE = /(?:^|\.)ibpsreg\.ibps\.in$/i;

/** A cycle page's notices (plain HTML cards "dd Mon yyyy {title}"); links to
 *  candidate-login pages marked. */
export function parseIbpsCycle(html: string, pageUrl: string): ListingLink[] {
  return extractLinks(html, pageUrl).map((l) => {
    const u = safeUrl(l.url);
    return u && IBPS_LOGIN_RE.test(u.hostname) && /login|\.php/i.test(u.pathname) ? { ...l, access: "login" as const } : l;
  });
}

// ── rrb ──────────────────────────────────────────────────────────────────

/** The categories of rrb.indianrailways.gov.in that carry each kind: answer
 *  keys go up with the objection tracker ("questions, responses and answer
 *  keys"), results under "Exam Results" and "Selection List". */
export const RRB_CATEGORIES: Readonly<Record<WatchKind, readonly string[]>> = {
  ANSWER_KEY: ["Objection Tracker"],
  RESULT: ["Exam Results", "Selection List"],
};

export function rrbRegionOf(listingUrl: string): string {
  const u = safeUrl(listingUrl);
  if (!u) return RRB_DEFAULT_REGION;
  const h = bareHost(u);
  if (h !== RRB_HOST) return RRB_LEGACY[h] ?? RRB_DEFAULT_REGION;
  const loc = (u.searchParams.get("loc") ?? "").toLowerCase();
  if (RRB_REGIONS.includes(loc)) return loc;
  const first = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  return RRB_REGIONS.includes(first) ? first : RRB_DEFAULT_REGION;
}

export function rrbRegionUrl(region: string): string {
  return `https://${RRB_HOST}/${region}`;
}

export function rrbCategoryUrl(region: string, category: string): string {
  return `https://${RRB_HOST}/getdata?loc=${encodeURIComponent(region)}&category=${encodeURIComponent(category)}`;
}

/** The category pages to read for a listing URL: the one it names
 *  (getdata?category=…), else the kind's categories. */
export function rrbListingPages(listingUrl: string, kind: WatchKind): string[] {
  const region = rrbRegionOf(listingUrl);
  const u = safeUrl(listingUrl);
  const named = u && bareHost(u) === RRB_HOST && /^\/getdata\/?$/i.test(u.pathname) ? u.searchParams.get("category") : null;
  return (named ? [named] : RRB_CATEGORIES[kind]).map((c) => rrbCategoryUrl(region, c));
}

function cellText(html: string): string {
  return htmlText(html).replace(/\s+/g, " ").trim();
}

/** Rows of an RRB getdata table ("CEN Number | Title | Description |
 *  Publication Date | Action") → one link per file / page the row offers.
 *  Row text: "CEN {cen} · {title} · {description} · {date}" — what the row
 *  prints, the CEN column named by its header. */
export function parseRrbTable(html: string, pageUrl: string): ListingLink[] {
  const out: ListingLink[] = [];
  for (const m of (html ?? "").matchAll(/<tr[^>]*class=["'][^"']*\bpublicR\b[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = m[1];
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)(?=<td\b|$)/gi)].map((c) => c[1]);
    if (cells.length < 5) continue;
    const [, cen, title, description, date] = cells.map(cellText);
    const action = cells.slice(5).join(" ");
    const rowText = [cen ? `CEN ${cen}` : "", title, description, date].filter(Boolean).join(" · ").slice(0, 1200);
    const targets: { raw: string; label: string }[] = [];
    for (const o of action.matchAll(/<option\b[^>]*\bvalue\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi)) {
      targets.push({ raw: o[1], label: cellText(o[2]) });
    }
    for (const o of action.matchAll(/confirmAndOpen\(\s*['"]([^'"]+)['"]\s*\)/gi)) targets.push({ raw: o[1], label: "" });
    for (const o of action.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
      if (!/^(?:javascript|#|mailto|tel)/i.test(o[1].trim())) targets.push({ raw: o[1], label: "" });
    }
    const seen = new Set<string>();
    for (const t of targets) {
      let url: string;
      try {
        url = new URL(t.raw.trim().replace(/&amp;/gi, "&"), pageUrl).toString();
      } catch {
        continue;
      }
      if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
      seen.add(url);
      out.push({ url, anchorText: [description, t.label ? `(${t.label})` : ""].filter(Boolean).join(" ").slice(0, 400), rowText });
    }
  }
  return out;
}

// ── jeeadv: announcement boxes (1 Oct 2026) ─────────────────────────────

const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const ANNOUNCEMENT_HEAD_RE = /<h4\b[^>]*\bclass\s*=\s*["'][^"']*\bannouncement__head\b[^"']*["'][^>]*>/gi;

/** Every link of a page whose notices are announcement boxes (jeeadv.ac.in);
 *  a link inside a box carries the whole box as its row: title, text and the
 *  "[ Posted on … ]" day. A box runs from its title to the next title (the
 *  page leaves one title unclosed); the last one ends with its section. HTML
 *  comments are no part of the page. [] boxes → plain links. */
export function parseAnnouncementBoxes(html: string, pageUrl: string): ListingLink[] {
  const h = (html ?? "").replace(HTML_COMMENT_RE, " ");
  const heads = [...h.matchAll(ANNOUNCEMENT_HEAD_RE)].map((m) => m.index ?? 0);
  if (heads.length === 0) return extractLinks(h, pageUrl);
  const sectionEnd = h.toLowerCase().indexOf("</section>", heads[heads.length - 1]);
  const lastEnd = sectionEnd === -1 ? h.length : sectionEnd;
  const out: ListingLink[] = [...extractLinks(h.slice(0, heads[0]), pageUrl)];
  heads.forEach((at, i) => {
    const box = h.slice(at, i + 1 < heads.length ? heads[i + 1] : lastEnd);
    const rowText = htmlText(box).slice(0, 1200);
    for (const l of extractLinks(box, pageUrl)) out.push({ ...l, rowText });
  });
  out.push(...extractLinks(h.slice(lastEnd), pageUrl));
  return out;
}

// ── gate: tables whose date cell spans rows (1 Oct 2026) ────────────────

/** "27<sup>th</sup>" → "27th": the ordinal is part of the printed date. */
const supOrdinals = (html: string) => html.replace(/(\d)\s*<sup\b[^>]*>\s*(st|nd|rd|th)\s*<\/sup\s*>/gi, "$1$2");

/** The rows of one table: their HTML and their text, a cell with rowspan="N"
 *  carried into the N-1 rows below it (before the row's own cells, as the
 *  page shows it). */
function spannedRows(tableHtml: string): { html: string; text: string }[] {
  const rows: { html: string; text: string }[] = [];
  let carry: { text: string; left: number }[] = [];
  for (const r of tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/table\s*>|$)/gi)) {
    const rowHtml = r[1];
    const carried = carry.map((c) => c.text);
    carry = carry.map((c) => ({ ...c, left: c.left - 1 })).filter((c) => c.left > 0);
    for (const c of rowHtml.matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)(?=<t[dh]\b|<\/tr\s*>|$)/gi)) {
      const span = Number(/\browspan\s*=\s*["']?(\d{1,2})/i.exec(c[1])?.[1] ?? "1");
      if (span > 1) carry.push({ text: cellText(c[2]), left: span - 1 });
    }
    rows.push({ html: rowHtml, text: [...carried, cellText(rowHtml)].filter(Boolean).join(" · ").slice(0, 1200) });
  }
  return rows;
}

/** The texts of a page's table rows, rowspan cells carried (what a reader
 *  sees on each row). */
export function tableRowTexts(html: string): string[] {
  const h = supOrdinals((html ?? "").replace(HTML_COMMENT_RE, " "));
  return [...h.matchAll(/<table\b[\s\S]*?<\/table\s*>/gi)].flatMap((t) => spannedRows(t[0]).map((r) => r.text));
}

/** Every link of a page; a link in a table row carries the row's text with
 *  the rowspan cells above it (GATE's day of the notice). */
export function parseRowspanTables(html: string, pageUrl: string): ListingLink[] {
  const h = supOrdinals((html ?? "").replace(HTML_COMMENT_RE, " "));
  const out: ListingLink[] = [];
  let at = 0;
  for (const t of h.matchAll(/<table\b[\s\S]*?<\/table\s*>/gi)) {
    const start = t.index ?? 0;
    out.push(...extractLinks(h.slice(at, start), pageUrl));
    at = start + t[0].length;
    for (const r of spannedRows(t[0])) for (const l of extractLinks(r.html, pageUrl)) out.push({ ...l, rowText: r.text });
  }
  out.push(...extractLinks(h.slice(at), pageUrl));
  return out;
}

// ── the reader ──────────────────────────────────────────────────────────

export interface ReadListingOptions {
  /** ExamEligibility.officialUrl — a page that lands off the official hosts is unreadable. */
  portalUrl: string | null;
  maxBytes?: number;
  /** The run's time guard, checked before each request (a listing may take
   *  2–3: RRB's region page + tables, IBPS's index + cycle pages). True →
   *  the read stops there and says "time guard" (review, 30 Sep 2026). */
  outOfTime?: () => boolean;
}

/** Read one official listing for one kind with its body's adapter. Never
 *  throws; every page it reads must answer 200 on an official host and not
 *  be a firewall page. The links are what the body printed — the caller's
 *  release gate decides what they are. */
export async function readOfficialListing(listingUrl: string, kind: WatchKind, fetchPage: ListingFetch, opts: ReadListingOptions): Promise<ListingRead> {
  const adapter = listingAdapterFor(listingUrl);
  const maxBytes = opts.maxBytes ?? HTML_MAX_BYTES;
  const sources: string[] = [];
  let requests = 0;
  const fail = (fetchMode: "browser-only" | "blocked", status: string, pageUrl = listingUrl, timeGuard = false): ListingRead => ({
    adapter,
    fetchMode,
    status,
    sources,
    pageUrl,
    heading: "",
    links: [],
    pageText: "",
    requests,
    ...(timeGuard ? { timeGuard: true } : {}),
  });
  type Got = { ok: true; body: string; url: string } | { ok: false; why: string; guard?: true };
  /** One page: ok, or the reason it is unreadable (or the time guard). */
  const get = async (url: string): Promise<Got> => {
    if (opts.outOfTime?.()) return { ok: false, why: `time guard: stopped before ${url}`, guard: true };
    requests++;
    sources.push(url);
    const p = await fetchPage(url, { maxBytes });
    if (p.finalUrl && !isOfficialSource(p.finalUrl, opts.portalUrl)) return { ok: false, why: `redirected off the official host (${p.finalUrl})` };
    if (p.status === 0) return { ok: false, why: `unreachable (${p.error ?? "network"})` };
    if (p.status !== 200) return { ok: false, why: p.error ? `HTTP ${p.status} (${p.error})` : `HTTP ${p.status}` };
    if (!p.body) return { ok: false, why: "empty body" };
    if (isFirewallPage(p.body)) return { ok: false, why: "firewall 'Request Rejected' page (HTTP 200)" };
    return { ok: true, body: p.body, url: p.finalUrl ?? url };
  };
  /** An unreadable page ends the read: "blocked" with the reason — or, at
   *  the time guard, not read at all. */
  const stop = (r: Extract<Got, { ok: false }>, what: string, pageUrl = listingUrl): ListingRead =>
    r.guard ? fail("blocked", r.why, pageUrl, true) : fail("blocked", `${what}${r.why}`, pageUrl);
  const texts: string[] = [];
  const ok = (pageUrl: string, heading: string, links: ListingLink[], status: string): ListingRead => ({
    adapter,
    fetchMode: "html",
    status,
    sources,
    pageUrl,
    heading,
    links,
    // Only what the body served (ssc-api / rrb: no heading).
    pageText: [heading, ...texts].filter(Boolean).join(" \n ").slice(0, PAGE_TEXT_MAX),
    requests,
  });

  if (adapter === "ssc-api") {
    const ct = sscContentType(listingUrl)!;
    const r = await get(sscRecordsUrl(ct));
    if (!r.ok) return stop(r, "SSC records endpoint: ");
    const links = parseSscRecords(r.body, ct);
    if (!links) return fail("blocked", "SSC records endpoint: not the records JSON");
    texts.push(...new Set(links.map((l) => l.rowText)));
    // No heading: the feed has none, and a made-up one must never name an exam.
    return ok(listingUrl, "", links, `read via SSC's records endpoint, ${ct} (${links.length} files)`);
  }

  if (adapter === "rrb") {
    const region = rrbRegionOf(listingUrl);
    // The region page sets the session cookies the firewall wants.
    const prime = await get(rrbRegionUrl(region));
    if (!prime.ok) return stop(prime, `RRB ${region} page: `);
    const links: ListingLink[] = [];
    const cats: string[] = [];
    for (const page of rrbListingPages(listingUrl, kind)) {
      const r = await get(page);
      const cat = new URL(page).searchParams.get("category") ?? "";
      if (!r.ok) return stop(r, `RRB ${region} "${cat}": `, page);
      links.push(...parseRrbTable(r.body, r.url));
      texts.push(htmlText(r.body));
      cats.push(cat);
    }
    // No heading: the tables print none, and a made-up "RRB {region}" must
    // never name an exam for every row (review, 30 Sep 2026).
    return ok(sources[sources.length - 1], "", links, `read ${cats.length} RRB ${region} table(s): ${cats.join(", ")} (${links.length} files)`);
  }

  const first = await get(listingUrl);
  if (!first.ok) return stop(first, "");
  if (isScriptShell(first.body)) {
    return fail("browser-only", "browser-needed: the page is built by script (no links in its HTML) and no machine-readable source of it is known", first.url);
  }

  if (adapter === "upsc") {
    const { heading, links } = parseUpscListing(first.body, first.url);
    texts.push(htmlText(first.body));
    // What's New rows link an item page, not the file, and the item page
    // empties once the row leaves What's New (30 Sep 2026: NDA-II 2026's
    // "Provisional Answer Key" printed only its breadcrumb). A row naming an
    // answer key or a result — either kind: the run shares one read of the
    // page between kinds (listingReadKey) — is followed to the PDFs it
    // carries, permanent links the importer can read. Never a partial read: a
    // failed item page or the time guard ends the read, so a link never flips
    // from item page to file between runs (the baseline would take the file
    // for a new release).
    const items = links.filter((l) => {
      if (!isUpscWhatsNewItem(l.url)) return false;
      const c = classifyLink(`${l.anchorText} ${l.rowText}`);
      return c.ak || c.result;
    });
    const follow = new Set(items.slice(0, UPSC_ITEM_MAX).map((l) => l.url));
    const out: ListingLink[] = [];
    let followed = 0;
    for (const l of links) {
      if (!follow.has(l.url)) {
        out.push(l);
        continue;
      }
      const r = await get(l.url);
      if (!r.ok) return stop(r, "UPSC What's New item page: ", l.url);
      const files = parseUpscItemFiles(r.body, r.url);
      followed++;
      // No files: the item page is the release's only page — the gate decides.
      if (files.length === 0) out.push(l);
      else for (const f of files) out.push({ ...l, url: f });
    }
    const capped = items.length - follow.size;
    const note = followed ? `; followed ${followed} What's New item page(s) to their files${capped ? ` (${capped} older not followed, cap ${UPSC_ITEM_MAX})` : ""}` : "";
    return ok(first.url, heading, out, `read as a UPSC page ("${heading}")${note}`);
  }

  if (adapter === "ibps") {
    const cycles = ibpsCyclePages(first.body, first.url);
    if (cycles.length === 0) {
      texts.push(htmlText(first.body));
      return ok(first.url, pageHeading(first.body), parseIbpsCycle(first.body, first.url), "read as an IBPS cycle page");
    }
    // The newest cycle page is required: an older cycle must never stand in
    // for it (live check, 30 Sep 2026: XVI timed out once and XV — with no
    // new notice — read as the listing). The one before it is optional.
    const links: ListingLink[] = [];
    let heading = "";
    const notes: string[] = [];
    for (const [i, c] of cycles.entries()) {
      const r = await get(c);
      if (!r.ok) {
        if (i === 0 || r.guard) return stop(r, `IBPS newest cycle page ${c}: `, c);
        notes.push(`${c} unreadable (${r.why})`);
        continue;
      }
      heading ||= pageHeading(r.body);
      links.push(...parseIbpsCycle(r.body, r.url));
      texts.push(htmlText(r.body));
      notes.push(`read ${c}`);
    }
    return ok(cycles[0], heading, links, `IBPS cycle pages: ${notes.join("; ")}`);
  }

  if (adapter === "jeeadv" || adapter === "gate") {
    // What the page shows: never the text of its HTML comments.
    const shown = first.body.replace(HTML_COMMENT_RE, " ");
    texts.push(htmlText(shown));
    // jeeadv: no heading (review, 1 Oct 2026). The title "JEE (Advanced) 2026"
    // would make the crawl read the page as one exam's, and its JoSAA / AAT
    // boxes would pass as JEE (Advanced) results; each box names its own exam.
    return adapter === "jeeadv"
      ? ok(first.url, "", parseAnnouncementBoxes(shown, first.url), "read as announcement boxes (title, text and posted day per row)")
      : ok(first.url, pageHeading(shown), parseRowspanTables(shown, first.url), "read as a GATE notice table (a date cell spanning rows is carried into each)");
  }

  texts.push(htmlText(first.body));
  return ok(first.url, pageHeading(first.body), extractLinks(first.body, first.url), "plain HTML");
}

/** What a listing read actually requests, as one key: SSC's records query,
 *  RRB's category pages (region + categories), else the page itself (www /
 *  trailing slash folded) — plus the portal whose hosts judged it. The kind
 *  counts only where it picks the pages (RRB with no category named). */
export function listingReadKey(listingUrl: string, kind: WatchKind, portalUrl: string | null): string {
  const adapter = listingAdapterFor(listingUrl);
  const pu = safeUrl(portalUrl ?? "");
  const portal = pu ? bareHost(pu) : "";
  const what =
    adapter === "ssc-api"
      ? sscRecordsUrl(sscContentType(listingUrl)!)
      : adapter === "rrb"
        ? rrbListingPages(listingUrl, kind).join(" ")
        : (() => {
            const u = safeUrl(listingUrl);
            return u ? `${u.protocol}//${bareHost(u)}${u.port ? `:${u.port}` : ""}${u.pathname.replace(/\/+$/, "") || "/"}${u.search}` : listingUrl.trim();
          })();
  return `${adapter}|${portal}|${what}`;
}

/** One read per listing for a whole run / crawl (review, 30 Sep 2026: every
 *  due SSC, UPSC or RRB exam re-fetched its body's shared listings — the same
 *  SSC endpoint, UPSC tables, RRB region page and tables — up to 6 at a time).
 *  Concurrent callers share the one in-flight read; `fresh` is true only for
 *  the caller whose read made the requests. A read the time guard stopped is
 *  not kept. */
export class ListingReadCache {
  private readonly reads = new Map<string, Promise<ListingRead>>();

  async read(listingUrl: string, kind: WatchKind, fetchPage: ListingFetch, opts: ReadListingOptions): Promise<{ read: ListingRead; fresh: boolean }> {
    const key = listingReadKey(listingUrl, kind, opts.portalUrl);
    const hit = this.reads.get(key);
    if (hit) return { read: await hit, fresh: false };
    const pending = readOfficialListing(listingUrl, kind, fetchPage, opts);
    this.reads.set(key, pending);
    const read = await pending;
    if (read.timeGuard) this.reads.delete(key);
    return { read, fresh: true };
  }
}

// ── the bodies' own listings (the crawl adds them to the research's) ─────

/** The official listing pages of a body, per kind, known without research
 *  (30 Sep 2026). UPSC: its answer-key, written-result and final-result
 *  tables and What's New; SSC: its answer-key and candidate-result pages
 *  (read through the records endpoint); RRB: the region's objection-tracker
 *  and exam-results tables. IBPS has one index per exam — the research names
 *  it. 1 Oct 2026: JEE (Advanced), GATE 2027 and JAM 2027 by their portal's
 *  host (KNOWN_LISTINGS). */
export function bodyListingsFor(portalUrl: string | null | undefined, kind: WatchKind): string[] {
  const u = safeUrl(portalUrl ?? "");
  if (!u) return [];
  const h = bareHost(u);
  if (h === "upsc.gov.in") {
    return kind === "ANSWER_KEY"
      ? ["https://www.upsc.gov.in/examinations/answer-key", "https://www.upsc.gov.in/whats-new"]
      : ["https://www.upsc.gov.in/exams-related-info/written-result", "https://www.upsc.gov.in/exams-related-info/final-result", "https://www.upsc.gov.in/whats-new"];
  }
  if (h === "ssc.gov.in" || h === "ssc.nic.in") {
    return [kind === "ANSWER_KEY" ? "https://ssc.gov.in/home/answer-key" : "https://ssc.gov.in/home/candidate-result"];
  }
  if (h === RRB_HOST || h in RRB_LEGACY) {
    const region = rrbRegionOf(portalUrl!);
    return RRB_CATEGORIES[kind].map((c) => rrbCategoryUrl(region, c));
  }
  return [...(KNOWN_LISTINGS[h]?.[kind] ?? [])];
}

/** 1 Oct 2026: the listings of bodies the crawl of 30 Sep FAILed with "no
 *  listing page proposed", by the exam portal's host — each read that day on
 *  the body's own site (curl) and confirmed as where it posts the kind, or the
 *  notice page that announces it. Not here, and why (unconfirmed — never
 *  guessed at): CLAT (consortiumofnlus.ac.in lists its notices through a
 *  script feed whose files sit on s3.ap-south-1.amazonaws.com, a host the gate
 *  rightly refuses), CAT (iimcat.ac.in is a script-built portal; its results
 *  and responses are candidate logins on cdn.digialm.com). */
const KNOWN_LISTINGS: Readonly<Record<string, Readonly<Record<WatchKind, readonly string[]>>>> = {
  // JEE (Advanced): the home page's announcement boxes — "JEE (Advanced) 2026
  // Provisional Answer Keys [ Posted on May 25, 2026 ]", "… Final Answer Keys
  // [ Posted on June 01, 2026 ]", "JEE (Advanced) 2026 Results" (adapter
  // "jeeadv"). The host stays jeeadv.ac.in whichever IIT organises the year.
  "jeeadv.ac.in": { ANSWER_KEY: ["https://jeeadv.ac.in/"], RESULT: ["https://jeeadv.ac.in/"] },
  // GATE 2027, organised by IIT Madras: "Notifications", the dated list of
  // every GATE 2027 notice (adapter "gate"); "Announcement of results: 19th
  // March 2027" on its Important Dates. GATE 2026's organiser (IIT Guwahati)
  // announced its keys and results in its notices the same way ("Master
  // Question Papers and Answer Keys … are released", "GATE 2026 results are
  // live at GOAPS portal").
  "gate2027.iitm.ac.in": { ANSWER_KEY: ["https://gate2027.iitm.ac.in/notifications"], RESULT: ["https://gate2027.iitm.ac.in/notifications"] },
  // JAM 2027, organised by IIT Kharagpur: "All Announcements for JAM 2027
  // examination", and the "Question Papers & Answer Keys" page its Examination
  // menu links (qp-key26.html: "Master Question Papers & Answer Keys", today
  // JAM 2026's final keys and cut-offs, its key buttons "#"). Results are on
  // the JOAPS candidate portal; the announcements page is where they are
  // announced.
  "jam.iitkgp.ac.in": {
    ANSWER_KEY: ["https://jam.iitkgp.ac.in/announcements.html", "https://jam.iitkgp.ac.in/qp-key26.html"],
    RESULT: ["https://jam.iitkgp.ac.in/announcements.html"],
  },
};

/** An IBPS listing proposed for one kind also lists the other kind's notices
 *  (a cycle page carries every notice of the recruitment). */
export function sharesKinds(listingUrl: string): boolean {
  return listingAdapterFor(listingUrl) === "ibps";
}
