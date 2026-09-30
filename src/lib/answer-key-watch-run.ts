// The answer-key / result watch run (30 Sep 2026) — shared by the three
// cron routes under /api/cron/answer-key-watch so the handlers stay
// export-clean (a non-handler export from a route.ts breaks the Next build).
//
// Modes (vercel.json, UTC → IST):
//   plan     "30 0 * * 1"   Mon 06:00  the week's due set (in the report) + a
//                                      full check; AI for HOT pairs the HTML
//                                      could not settle, hard cap $3.00 (≤ 20)
//   check    "30 6 * * *"   12:00      HTML only, $0
//   evening  "30 15 * * *"  21:00      HTML + AI for HOT pairs only, ≤ 6
//                                      exams, hard cap $0.90 — the 09:45 IST
//                                      result-day mail picks up what it writes
// Hot (needsAi): an answer key whose exam was 1–10 days ago, a result
// expected within ±7 days. The due set is recomputed by every run from the
// tracker and the watch tables (selectDue — pure, one SQL read), so an exam
// that enters the window mid-week is checked the same day, not next Monday.
//
// Per run: load the due set → for each due (exam, kind), HTML-first: read
// every readable official listing page with its body's adapter
// (src/lib/official-listings.ts — plain HTML, UPSC's tables, SSC's records
// endpoint, IBPS cycle pages, RRB's tables; one read per listing per run;
// 12 s per fetchForWatch call, agent ladder and www retry included; 6 at a
// time; 240 s time guard, checked before every listing, every request inside
// a listing and every candidate, so each worker runs at most one 12 s fetch
// past it; no AI call starts after 165 s, each has a 60 s timeout — review
// 30 Sep 2026), keep the NEW links that name the kind, pass each through
// releaseGate (which needs our own fetch of the link) → write the release
// (src/lib/answer-key-watch-db.ts). Then, where the mode allows, the AI
// check proposes candidate URLs for the pairs HTML could not settle; they go
// through the same gate. Nothing an AI said is ever written as it said it.
// AI budget: charged BEFORE each call at AI_CHECK_COST_USD, trued up to the
// recorded cost, never past the mode's cap; a 4xx from the API (credit
// balance, auth, rate limit) stops all AI for the run. ?dry=1 → the full
// report, nothing written, no IndexNow (the AI still runs when allowed — use
// ?ai=0 for a $0 dry run). Spend is recorded as 'akr-check' (AiUsage).

import {
  AI_START_GUARD_MS,
  AiBudget,
  FETCH_CONCURRENCY,
  FETCH_TIMEOUT_MS,
  RUN_AI_CAP_USD,
  RUN_AI_MAX_EXAMS,
  TIME_GUARD_MS,
  WATCH_WRITES_PAUSED,
  classifyLink,
  examTermsFor,
  isoOfDay,
  kindMatches,
  looksLikePdf,
  needsAi,
  normLink,
  officialHostsFor,
  orderDue,
  pageHeading,
  releaseGate,
  releaseLabel,
  scanListing,
  selectDue,
  type DueItem,
  type GateContext,
  type LinkFetch,
  type ReleaseCandidate,
  type VerifiedRelease,
  type WatchMode,
} from "@/lib/answer-key-watch";
import { isOfficialSource } from "@/lib/official-source";
import { ListingReadCache, isFirewallPage, type ListingLink, type ListingRead } from "@/lib/official-listings";
import type { DueExamRecord, WatchRow, WriteReleaseArgs, WriteReleaseResult } from "@/lib/answer-key-watch-db";
import type { AiCandidate, AnswerKeyCheckInput, AnswerKeyCheckResult } from "@/lib/ai/answer-key-check";

export const WATCH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShishyaOfficialWatch/1.0 (+https://shishya.in/editorial-policy)";
/** Our own name without the URL. 30 Sep 2026: upsc.gov.in's firewall answers
 *  403 to any agent carrying "https://…" — WATCH_UA and "(compatible;
 *  Shishya/1.0; +https://…)" were refused, "(+shishya.in/editorial-policy)"
 *  and a bare "ShishyaOfficialWatch/1.0" were served. */
export const WATCH_UA_PLAIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShishyaOfficialWatch/1.0 (+shishya.in/editorial-policy)";
/** curl's own default agent, as scripts/import-official-papers.ts falls back
 *  to curl (which sends it) when a server refuses our name. */
export const CURL_UA = "curl/8.11.0";
/** Tried in order; the next one only after an HTTP 403. Our own name
 *  everywhere (review, 30 Sep 2026: WATCH_UA_PLAIN is served by UPSC, and a
 *  curl agent sent to any host that refuses us would disguise the watch). */
export const WATCH_AGENTS: readonly string[] = [WATCH_UA, WATCH_UA_PLAIN];
/** The only hosts where curl's agent is a last rung: upsc.gov.in, known to
 *  answer curl when it refuses unknown agents (the pilot of 30 Sep 2026). */
export const CURL_UA_HOSTS: readonly string[] = ["upsc.gov.in"];
/** Hosts whose bare name redirects EVERY path to the www home page, so a
 *  bare-host link never reaches its page (upsc.gov.in → 307 to
 *  https://www.upsc.gov.in, path dropped — 30 Sep 2026). */
export const WWW_ONLY_HOSTS: readonly string[] = ["upsc.gov.in"];
const HTML_MAX_BYTES = 3_000_000;
const LINK_MAX_BYTES = 65_536;
/** A ladder rung or the www retry starts only with this much of the call's
 *  deadline left. */
const MIN_RUNG_MS = 1_000;

export interface FetchedPage extends LinkFetch {
  /** Decoded text for HTML-ish responses (capped); "" otherwise. */
  body: string;
  error?: string;
  /** The user agent that got this answer (watchAgentsFor). */
  agent?: string;
}

const bareHostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  } catch {
    return null;
  }
};

/** The agents to try for a URL, in order: WATCH_AGENTS, then curl's only on
 *  CURL_UA_HOSTS. */
export function watchAgentsFor(url: string): readonly string[] {
  const h = bareHostOf(url);
  return h && CURL_UA_HOSTS.includes(h) ? [...WATCH_AGENTS, CURL_UA] : WATCH_AGENTS;
}

/** The URL to request for a link: a WWW_ONLY_HOSTS bare host moved to www. */
export function officialFetchUrl(url: string): string {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase().replace(/\.$/, "");
    if (WWW_ONLY_HOSTS.includes(h)) {
      u.hostname = `www.${h}`;
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

/** Did a bare-host request land on the www home page with its path dropped
 *  (the upsc.gov.in redirect)? Then the www URL with the same path is the
 *  one to read. Null otherwise. */
export function wwwRetryUrl(requested: string, landed: string | null): string | null {
  if (!landed) return null;
  try {
    const a = new URL(requested);
    const b = new URL(landed);
    const bare = a.hostname.toLowerCase();
    if (bare.startsWith("www.") || b.hostname.toLowerCase() !== `www.${bare}`) return null;
    if ((b.pathname !== "/" && b.pathname !== "") || b.search) return null;
    if (a.pathname === "/" && !a.search) return null;
    a.hostname = `www.${bare}`;
    return a.toString();
  } catch {
    return null;
  }
}

/** Registry suffixes a cookie may never be scoped to (a Domain=gov.in cookie
 *  from one gov.in host would go to every gov.in host the run touches —
 *  review, 30 Sep 2026). The Indian second levels plus the bare TLDs. */
const COOKIE_PUBLIC_SUFFIXES: ReadonlySet<string> = new Set([
  "in", "gov.in", "nic.in", "ac.in", "co.in", "org.in", "res.in", "edu.in", "mil.in", "net.in", "firm.in", "gen.in", "ind.in",
  "com", "org", "net", "gov", "edu",
]);

/** Session cookies per host, as a browser keeps them (one per run / crawl).
 *  rrb.indianrailways.gov.in's firewall rejects getdata pages and files
 *  without the cookies its region page sets. Name=value only; Domain /
 *  host-only honoured (never a public suffix), Path / Expires ignored (a run
 *  lasts minutes). */
export class CookieJar {
  private readonly cookies = new Map<string, { domain: string; hostOnly: boolean; value: string }>();

  header(url: string): string | null {
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return null;
    }
    const out: string[] = [];
    for (const [key, c] of this.cookies) {
      const name = key.slice(key.indexOf("|") + 1);
      if (c.hostOnly ? host === c.domain : host === c.domain || host.endsWith(`.${c.domain}`)) out.push(`${name}=${c.value}`);
    }
    return out.length ? out.join("; ") : null;
  }

  store(url: string, setCookies: readonly string[]): void {
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return;
    }
    for (const sc of setCookies) {
      const [pair, ...attrs] = sc.split(";");
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const dom = attrs.map((a) => /^\s*domain\s*=\s*\.?([^;\s]+)/i.exec(a)?.[1]?.toLowerCase()).find(Boolean);
      // A cookie for another site, or for a whole registry suffix, is
      // rejected, as a browser would.
      if (dom && host !== dom && !host.endsWith(`.${dom}`)) continue;
      if (dom && (COOKIE_PUBLIC_SUFFIXES.has(dom) || !dom.includes("."))) continue;
      const domain = dom ?? host;
      this.cookies.set(`${domain}|${name}`, { domain, hostOnly: !dom, value });
    }
  }
}

function setCookiesOf(res: Response): string[] {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === "function") return h.getSetCookie();
  const one = res.headers.get("set-cookie");
  return one ? [one] : [];
}

async function fetchOnce(url: string, agent: string, opts: { maxBytes: number; timeoutMs?: number; jar?: CookieJar }): Promise<FetchedPage> {
  const headers: Record<string, string> = { "user-agent": agent, accept: "text/html,application/xhtml+xml,application/json;q=0.9,application/pdf;q=0.9,*/*;q=0.8" };
  const cookie = opts.jar?.header(url);
  if (cookie) headers.cookie = cookie;
  const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(opts.timeoutMs ?? FETCH_TIMEOUT_MS) });
  opts.jar?.store(res.url || url, setCookiesOf(res));
  const chunks: Uint8Array[] = [];
  let got = 0;
  const reader = res.body?.getReader();
  while (reader && got < opts.maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
  }
  await reader?.cancel().catch(() => {});
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, opts.maxBytes);
  const contentType = res.headers.get("content-type");
  const head = buf.subarray(0, 16).toString("latin1");
  const htmlish = !head.startsWith("%PDF") && (!contentType || /html|xml|text|json/i.test(contentType));
  const body = htmlish ? buf.toString("utf8") : "";
  // A firewall's "Request Rejected" page is not the page (nor the file) asked
  // for, whatever its status: gate 2 must never take it for one.
  if (res.status === 200 && htmlish && isFirewallPage(body)) {
    return { status: 403, contentType, head, body: "", finalUrl: res.url || url, agent, error: "firewall 'Request Rejected' page (HTTP 200)" };
  }
  return { status: res.status, contentType, head, body, finalUrl: res.url || url, agent };
}

const failedFetch = (err: unknown): FetchedPage => ({
  status: 0,
  contentType: null,
  head: "",
  body: "",
  finalUrl: null,
  error: String((err as Error)?.message ?? err).slice(0, 160),
});

/** GET with a hard timeout and a byte cap; never throws (status 0 on a
 *  network error or timeout). Redirects are followed; finalUrl says where.
 *  30 Sep 2026 (the pilot read UPSC as HTTP 403): a WWW_ONLY_HOSTS bare host
 *  is requested on www; a bare host that still lands on its www home page is
 *  read again on www with the path; an HTTP 403 is retried under the next
 *  agent (watchAgentsFor: our name without the URL; curl's default only on
 *  CURL_UA_HOSTS); a firewall "Request Rejected" page reads as HTTP 403. With
 *  a jar, cookies a host set are sent back to it. `timeoutMs` (default
 *  FETCH_TIMEOUT_MS) is ONE deadline for the whole call — every rung and the
 *  www retry share it (review, 30 Sep 2026: a fresh 12 s per attempt made one
 *  call up to ~48 s, past the run's time budget). */
export async function fetchForWatch(url: string, opts: { maxBytes: number; timeoutMs?: number; jar?: CookieJar }): Promise<FetchedPage> {
  let target = officialFetchUrl(url);
  const deadline = Date.now() + (opts.timeoutMs ?? FETCH_TIMEOUT_MS);
  const left = () => deadline - Date.now();
  const attempt = (u: string, agent: string) => fetchOnce(u, agent, { ...opts, timeoutMs: Math.max(1, left()) });
  const agents = watchAgentsFor(target);
  let page: FetchedPage;
  try {
    page = await attempt(target, agents[0]);
  } catch (err) {
    return failedFetch(err);
  }
  for (const agent of agents.slice(1)) {
    if (page.status !== 403 || page.error || left() < MIN_RUNG_MS) break;
    try {
      page = await attempt(target, agent);
    } catch {
      break; // out of time on a later rung: the 403 stands
    }
  }
  const retry = wwwRetryUrl(target, page.finalUrl);
  if (retry) {
    // The www home page is never the page asked for: without the retry, the
    // call failed.
    if (left() < MIN_RUNG_MS) return failedFetch(`no time left to read ${retry}`);
    target = retry;
    try {
      page = await attempt(target, page.agent ?? WATCH_UA);
    } catch (err) {
      return failedFetch(err);
    }
  }
  return page;
}

export interface WatchRunDeps {
  now: Date;
  loadDue(): Promise<DueExamRecord[]>;
  loadWatches(examIds: string[]): Promise<WatchRow[]>;
  loadKnown(examIds: string[], watches: WatchRow[]): Promise<Map<string, Set<string>>>;
  fetchUrl(url: string, opts: { maxBytes: number }): Promise<FetchedPage>;
  /** Null → no AI in this process (tests, ?ai=0). */
  aiCheck: ((input: AnswerKeyCheckInput) => Promise<AnswerKeyCheckResult>) | null;
  isStopError(err: unknown): boolean;
  ensureTables(): Promise<void>;
  writeRelease(args: WriteReleaseArgs): Promise<WriteReleaseResult>;
  markChecked(watchId: string, status: string): Promise<void>;
  /** Monotonic clock for the time guard (ms). */
  clock?: () => number;
}

export interface WatchRunOptions {
  mode: WatchMode;
  dry: boolean;
  /** Allow AI (still subject to the mode's cap; plan / evening only). */
  ai: boolean;
  /** Lower the mode's cap for this run (never raises it). */
  maxUsd?: number | null;
  indexNow?: boolean;
}

export interface WatchReport {
  ok: true;
  mode: WatchMode;
  dry: boolean;
  today: string;
  due: { code: string; kind: string; hot: boolean; since: string; expectedOn: string | null; reasons: string[] }[];
  pagesFetched: number;
  pagesUnreadable: { code: string; url: string; status: string }[];
  released: { code: string; kind: string; url: string; releasedOn: string; dateSource: string; via: string; status: string; reason?: string; archivedTwins: number }[];
  rejected: { code: string; kind: string; url: string; gate: number; reason: string; via: string }[];
  ai: { allowed: boolean; capUsd: number; calls: number; spentUsd: number; stopped: string | null };
  timeGuardHit: boolean;
  elapsedMs: number;
}

interface HtmlOutcome {
  readablePages: number;
  ambiguous: number;
  found: number;
}

async function pool<T>(items: readonly T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const x = items[i++];
      await fn(x);
    }
  });
  await Promise.all(workers);
}

const MAX_REJECTED_IN_REPORT = 150;

export async function runAnswerKeyWatch(opts: WatchRunOptions, deps: WatchRunDeps): Promise<WatchReport> {
  const clock = deps.clock ?? (() => Date.now());
  const started = clock();
  const outOfTime = () => clock() - started > TIME_GUARD_MS;
  const now = deps.now;
  const capUsd = Math.max(0, Math.min(RUN_AI_CAP_USD[opts.mode], opts.maxUsd ?? Number.POSITIVE_INFINITY));
  const aiAllowed = opts.ai && !!deps.aiCheck && capUsd > 0 && opts.mode !== "check";
  const budget = new AiBudget(capUsd, undefined, RUN_AI_MAX_EXAMS[opts.mode]);
  const report: WatchReport = {
    ok: true,
    mode: opts.mode,
    dry: opts.dry,
    today: isoOfDay(Math.floor((now.getTime() + 330 * 60_000) / 86_400_000)),
    due: [],
    pagesFetched: 0,
    pagesUnreadable: [],
    released: [],
    rejected: [],
    ai: { allowed: aiAllowed, capUsd, calls: 0, spentUsd: 0, stopped: null },
    timeGuardHit: false,
    elapsedMs: 0,
  };

  const exams = await deps.loadDue();
  const byId = new Map(exams.map((e) => [e.examId, e]));
  const due = orderDue(
    exams.flatMap((e) => selectDue(e, now)),
    now,
  );
  report.due = due.map((d) => ({
    code: d.code,
    kind: d.kind,
    hot: d.hot,
    since: d.notBefore.toISOString().slice(0, 10),
    expectedOn: d.expectedOn ? d.expectedOn.toISOString().slice(0, 10) : null,
    reasons: d.reasons,
  }));
  if (due.length === 0) {
    report.elapsedMs = clock() - started;
    return report;
  }
  if (!opts.dry) await deps.ensureTables();
  const examIds = [...new Set(due.map((d) => d.examId))];
  const watches = await deps.loadWatches(examIds);
  const known = await deps.loadKnown(examIds, watches);
  const knownOf = (examId: string) => known.get(examId) ?? new Set<string>();

  // One read per listing for the run (review, 30 Sep 2026): due exams of one
  // body share its listings (SSC's endpoint, UPSC's tables, RRB's pages).
  const listings = new ListingReadCache();
  const readListing = async (listingUrl: string, d: DueItem, exam: DueExamRecord) => {
    const { read, fresh } = await listings.read(listingUrl, d.kind, deps.fetchUrl, { portalUrl: exam.portalUrl, maxBytes: HTML_MAX_BYTES, outOfTime });
    if (fresh) report.pagesFetched += read.requests;
    if (read.timeGuard) report.timeGuardHit = true;
    return read;
  };

  const reject = (d: DueItem, url: string, gate: number, reason: string, via: string) => {
    if (report.rejected.length < MAX_REJECTED_IN_REPORT) report.rejected.push({ code: d.code, kind: d.kind, url, gate, reason, via });
  };

  // Review, 30 Sep 2026: the gate also gets the due sitting (its labels, the
  // exam's short name for "NDA 2" / "CDS-II", another sitting this year) and
  // whether the page the link was read on has a stored baseline — a page
  // without one (a notice page, a page only the AI named) needs a printed
  // date, exactly as the crawl's first read.
  const contextFor = (d: DueItem, exam: DueExamRecord, watch: WatchRow | null): GateContext => ({
    portalUrl: exam.portalUrl,
    examTerms: examTermsFor(exam, [...new Set(watches.filter((w) => w.examId === d.examId).flatMap((w) => w.examTerms))]),
    cycleYears: d.cycleYears,
    notBefore: d.notBefore,
    lastExamDay: d.lastExamDay,
    sittingLabels: d.sittingLabels,
    ordinalNames: [exam.shortName],
    otherSittingThisYear: d.otherSittingThisYear,
    known: knownOf(d.examId),
    baselined: !!watch && watch.baselineLinks.length > 0,
    singleExamHeading: watch?.singleExam ? watch.heading : null,
    now,
  });

  /** Gate + write one (exam, kind): the first verified candidate is the
   *  release; the other verified links of the same run are its siblings. */
  const settle = async (d: DueItem, exam: DueExamRecord, verified: { r: VerifiedRelease; watchId: string | null }[]) => {
    if (verified.length === 0) return;
    const [first, ...rest] = verified;
    const res = await deps.writeRelease({
      exam: { id: exam.examId, code: exam.code, state: exam.state, shortName: exam.shortName },
      release: first.r,
      label: releaseLabel(d.kind, first.r.text, d.stage),
      stage: d.stage,
      cycleYear: d.cycleYears[d.cycleYears.length - 1] ?? "",
      watchId: first.watchId,
      siblings: rest.map((x) => x.r),
      now,
      dry: opts.dry,
      indexNow: !opts.dry && opts.indexNow !== false,
    });
    for (const v of verified) knownOf(d.examId).add(normLink(v.r.url));
    report.released.push({
      code: d.code,
      kind: d.kind,
      url: first.r.url,
      releasedOn: first.r.releasedOn.toISOString().slice(0, 10),
      dateSource: first.r.dateSource,
      via: first.r.via,
      status: res.status,
      reason: res.reason,
      archivedTwins: res.archivedTwins,
    });
  };

  /** Our fetch of one candidate link, then the gate. Returns the failing
   *  gate (0 = passed) so the caller can count ambiguous links. */
  const gateOne = async (d: DueItem, c: ReleaseCandidate, ctx: GateContext, access?: "login"): Promise<{ release: VerifiedRelease | null; gate: number }> => {
    // Gates 1, 3 and 4 need no fetch: check them first (with a stand-in
    // fetch that passes gate 2) so an obviously wrong link costs no request.
    const pre = releaseGate(c, ctx, { status: 200, contentType: looksLikePdf(c.url, null) ? "application/pdf" : "text/html", head: "%PDF-", finalUrl: null });
    if (!pre.ok) {
      reject(d, c.url, pre.gate, pre.reason, c.via);
      return { release: null, gate: pre.gate };
    }
    const fetched = await deps.fetchUrl(c.url, { maxBytes: LINK_MAX_BYTES });
    const v = releaseGate(c, ctx, fetched.status === 0 ? null : fetched);
    if (!v.ok) {
      // A candidate-login page (IBPS results) is the body's, but our fetch
      // cannot open it: gate 2 says so, the report says why.
      const why = fetched.status === 0 ? `fetch failed (${fetched.error ?? "network"})` : v.reason;
      reject(d, c.url, v.gate, access === "login" && v.gate === 2 ? `${why} — a candidate-login page (browser-needed)` : why, c.via);
      return { release: null, gate: v.gate };
    }
    return { release: v.release, gate: 0 };
  };

  // ── HTML first ───────────────────────────────────────────────────────
  const html = new Map<DueItem, HtmlOutcome>();
  await pool(due, FETCH_CONCURRENCY, async (d) => {
    const outcome: HtmlOutcome = { readablePages: 0, ambiguous: 0, found: 0 };
    html.set(d, outcome);
    const exam = byId.get(d.examId);
    if (!exam) return;
    // "html" pages, and "empty" ones — readable, listing nothing of the kind
    // when the crawl read them (review, 30 Sep 2026: a new cycle's page before
    // its first key was never read until the next crawl).
    const pages = watches.filter((w) => w.examId === d.examId && w.kind === d.kind && (w.fetchMode === "html" || w.fetchMode === "empty"));
    const verified: { r: VerifiedRelease; watchId: string | null }[] = [];
    for (const w of pages) {
      if (outOfTime()) {
        report.timeGuardHit = true;
        break;
      }
      // The body's adapter (src/lib/official-listings.ts): plain HTML, UPSC's
      // tables, SSC's records endpoint, IBPS cycle pages, RRB's tables. Review,
      // 30 Sep 2026: a listing that redirected off the official hosts (an
      // expired portal page), a firewall page or a script-built shell supplies
      // no candidates.
      const read = await readListing(w.listingUrl, d, exam);
      if (read.timeGuard) {
        // Not read, not refused: the watch keeps its last status.
        report.pagesUnreadable.push({ code: d.code, url: w.listingUrl, status: read.status });
        break;
      }
      if (read.fetchMode !== "html") {
        report.pagesUnreadable.push({ code: d.code, url: w.listingUrl, status: read.status });
        if (!opts.dry) await deps.markChecked(w.id, read.status);
        continue;
      }
      const links = read.links;
      const scan = scanListing(links, d.kind, knownOf(d.examId));
      // An "empty" page counts as a readable page for the kind only once it
      // lists something of the kind: until then the AI rule sees what it saw
      // before (no readable page).
      if (w.fetchMode === "html" || scan.kindLinks.length > 0) outcome.readablePages++;
      const ctx = contextFor(d, exam, w);
      for (const l of scan.kindLinks) {
        if (outOfTime()) {
          report.timeGuardHit = true;
          break;
        }
        const c: ReleaseCandidate = { kind: d.kind, url: l.url, listingUrl: w.listingUrl, anchorText: l.anchorText, rowText: l.rowText, via: "html" };
        const g = await gateOne(d, c, ctx, (l as ListingLink).access);
        if (g.release) verified.push({ r: g.release, watchId: w.id });
        else if (g.gate === 3) outcome.ambiguous++;
      }
      if (!opts.dry) await deps.markChecked(w.id, `ok: ${links.length} links, ${scan.kindLinks.length} new ${d.kind === "ANSWER_KEY" ? "answer-key" : "result"} links`);
    }
    outcome.found = verified.length;
    await settle(d, exam, verified);
  });

  // ── AI fallback ──────────────────────────────────────────────────────
  if (aiAllowed) {
    for (const d of due) {
      if (report.ai.stopped) break;
      // No AI call STARTS after AI_START_GUARD_MS (review, 30 Sep 2026): a
      // call begun near the 240 s guard could run past maxDuration.
      if (clock() - started > AI_START_GUARD_MS) {
        report.timeGuardHit = true;
        break;
      }
      const exam = byId.get(d.examId);
      const outcome = html.get(d) ?? { readablePages: 0, ambiguous: 0, found: 0 };
      if (!exam || !needsAi(opts.mode, d, { readablePages: outcome.readablePages, ambiguous: outcome.ambiguous > 0, found: outcome.found })) continue;
      const examWatches = watches.filter((w) => w.examId === d.examId);
      const hosts = officialHostsFor(exam.portalUrl, examWatches.map((w) => w.host));
      if (hosts.length === 0) continue;
      if (!budget.charge()) {
        report.ai.stopped = `cap reached ($${capUsd.toFixed(2)}, ${budget.calls} calls)`;
        break;
      }
      let result: AnswerKeyCheckResult;
      try {
        result = await deps.aiCheck!({
          examCode: exam.code,
          examName: exam.name,
          shortName: exam.shortName,
          kind: d.kind,
          stage: d.stage,
          cycleYears: d.cycleYears,
          examDay: d.notBefore.toISOString().slice(0, 10),
          officialHosts: hosts,
          listingUrls: examWatches.filter((w) => w.kind === d.kind).map((w) => w.listingUrl),
        });
      } catch (err) {
        if (deps.isStopError(err)) {
          report.ai.stopped = `API refused (${String((err as { status?: unknown })?.status ?? "4xx")}): no more AI this run`;
          break;
        }
        reject(d, "(ai)", 0, `AI check failed: ${String((err as Error)?.message ?? err).slice(0, 120)}`, "ai");
        continue;
      }
      budget.trueUp(result.costUsd);
      const verified: { r: VerifiedRelease; watchId: string | null }[] = [];
      for (const cand of result.candidates.filter((c) => c.kind === d.kind).slice(0, 4)) {
        if (outOfTime()) {
          report.timeGuardHit = true;
          break;
        }
        // Gate 1 before any fetch: we never request a URL the AI proposed
        // off the official hosts.
        if (!isOfficialSource(cand.url, exam.portalUrl) || (cand.listingUrl && !isOfficialSource(cand.listingUrl, exam.portalUrl))) {
          reject(d, cand.url, 1, "proposed off the official hosts", "ai");
          continue;
        }
        const c = await candidateFromAi(cand, d, exam, { fetchUrl: deps.fetchUrl, readListing, outOfTime });
        if (c === "time-guard" || outOfTime()) {
          // Stopped between requests, or the last one ended past the guard:
          // no gate fetch starts now.
          report.timeGuardHit = true;
          break;
        }
        if (!c) {
          reject(d, cand.url, 3, "no official page we fetched names it (a bare file the AI proposed is never enough)", "ai");
          continue;
        }
        const watch = c.listingUrl ? examWatches.find((w) => normLink(w.listingUrl) === normLink(c.listingUrl!)) ?? null : null;
        const g = await gateOne(d, c, contextFor(d, exam, watch));
        if (g.release) verified.push({ r: g.release, watchId: watch?.id ?? null });
      }
      await settle(d, exam, verified);
    }
  }
  report.ai.calls = budget.calls;
  report.ai.spentUsd = Number(budget.spent.toFixed(4));
  report.elapsedMs = clock() - started;
  return report;
}

/** Turn an AI candidate into what WE read: the official listing it names
 *  (fetched now) and the row beside the link there; or, for a candidate that
 *  is itself an HTML notice page, that page's own heading. A PDF the AI
 *  proposed with no listing we could read linking it is not a candidate.
 *  "time-guard": the run's guard stopped it between requests. */
async function candidateFromAi(
  cand: AiCandidate,
  d: DueItem,
  exam: DueExamRecord,
  io: {
    fetchUrl: WatchRunDeps["fetchUrl"];
    readListing: (listingUrl: string, d: DueItem, exam: DueExamRecord) => Promise<ListingRead>;
    outOfTime: () => boolean;
  },
): Promise<ReleaseCandidate | null | "time-guard"> {
  const portalUrl = exam.portalUrl;
  // A page whose redirect left the official hosts reads as unreadable
  // (review, 30 Sep 2026).
  const onHost = (p: FetchedPage) => !p.finalUrl || isOfficialSource(p.finalUrl, portalUrl);
  if (cand.listingUrl) {
    // Read with the body's adapter, as the HTML-first pass does (and the
    // same read, when that pass already made it).
    const read = await io.readListing(cand.listingUrl, d, exam);
    if (read.timeGuard) return "time-guard";
    if (read.fetchMode === "html") {
      const want = normLink(cand.url);
      const link = read.links.find((l) => normLink(l.url) === want);
      if (link) return { kind: d.kind, url: link.url, listingUrl: cand.listingUrl, anchorText: link.anchorText, rowText: link.rowText, via: "ai" };
    }
  }
  if (looksLikePdf(cand.url, null)) return null;
  if (io.outOfTime()) return "time-guard";
  const page = await io.fetchUrl(cand.url, { maxBytes: HTML_MAX_BYTES });
  if (page.status !== 200 || !page.body || !onHost(page)) return null;
  const heading = pageHeading(page.body);
  if (!kindMatches(d.kind, classifyLink(heading))) return null;
  return { kind: d.kind, url: cand.url, listingUrl: null, anchorText: heading, rowText: "", via: "ai" };
}

// ── the cron handler ─────────────────────────────────────────────────────

/** Shared GET handler of /api/cron/answer-key-watch (+ /plan, /evening).
 *  Auth: Bearer ${CRON_SECRET}. Query: ?mode=plan|check|evening (the path's
 *  default otherwise), ?dry=1 (report only, nothing written), ?ai=0 (no AI),
 *  ?maxUsd=<lower cap>, ?only=CODE,CODE. */
export async function handleAnswerKeyWatchCron(req: Request, defaultMode: WatchMode): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const modeParam = q.get("mode");
  const mode: WatchMode = modeParam === "plan" || modeParam === "check" || modeParam === "evening" ? modeParam : defaultMode;
  // WATCH_WRITES_PAUSED (1 Oct 2026): report only until the gate fix ships.
  const dry = q.get("dry") === "1" || WATCH_WRITES_PAUSED;
  const ai = q.get("ai") !== "0";
  const maxUsdRaw = q.get("maxUsd");
  const maxUsd = maxUsdRaw !== null && Number.isFinite(Number(maxUsdRaw)) ? Number(maxUsdRaw) : null;
  const only = (q.get("only") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const [{ prisma }, db, aiMod] = await Promise.all([import("@/lib/db/prisma"), import("@/lib/answer-key-watch-db"), import("@/lib/ai/answer-key-check")]);
  const now = new Date();
  const jar = new CookieJar();
  try {
    const report = await runAnswerKeyWatch(
      { mode, dry, ai, maxUsd },
      {
        now,
        loadDue: () => db.loadDueInputs(prisma, now, only),
        loadWatches: (ids) => db.loadWatches(prisma, ids),
        loadKnown: (ids, watches) => db.loadKnownLinks(prisma, ids, watches),
        // One cookie jar per run: RRB's firewall wants its session cookies.
        fetchUrl: (url, o) => fetchForWatch(url, { ...o, jar }),
        // awaitUsage (review, 30 Sep 2026): the AiUsage row lands before the
        // response, so a function ended at maxDuration never loses spend.
        aiCheck: (input) => aiMod.checkAnswerKeyWithAi(input, { awaitUsage: true }),
        isStopError: aiMod.isStopError,
        ensureTables: () => db.ensureOfficialWatchTables(prisma),
        writeRelease: (args) => db.writeRelease(prisma, args),
        markChecked: (id, status) => db.markWatchChecked(prisma, id, status, now),
      },
    );
    return Response.json(report);
  } catch (err) {
    console.error("[answer-key-watch] run failed", err);
    return Response.json({ ok: false, error: String((err as Error)?.message ?? err).slice(0, 300) }, { status: 500 });
  }
}
