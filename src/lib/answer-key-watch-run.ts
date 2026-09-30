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
// Per run: load the due set → for each due (exam, kind), HTML-first: fetch
// every readable official listing page (12 s timeout, 6 at a time, 240 s
// time guard; no AI call starts after 165 s, each has a 60 s timeout — review
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
  classifyLink,
  examTermsFor,
  extractLinks,
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
import type { DueExamRecord, WatchRow, WriteReleaseArgs, WriteReleaseResult } from "@/lib/answer-key-watch-db";
import type { AiCandidate, AnswerKeyCheckInput, AnswerKeyCheckResult } from "@/lib/ai/answer-key-check";

export const WATCH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShishyaOfficialWatch/1.0 (+https://shishya.in/editorial-policy)";
const HTML_MAX_BYTES = 3_000_000;
const LINK_MAX_BYTES = 65_536;

export interface FetchedPage extends LinkFetch {
  /** Decoded text for HTML-ish responses (capped); "" otherwise. */
  body: string;
  error?: string;
}

/** GET with a hard timeout and a byte cap; never throws (status 0 on a
 *  network error or timeout). Redirects are followed; finalUrl says where. */
export async function fetchForWatch(url: string, opts: { maxBytes: number; timeoutMs?: number }): Promise<FetchedPage> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": WATCH_UA, accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(opts.timeoutMs ?? FETCH_TIMEOUT_MS),
    });
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
    return { status: res.status, contentType, head, body: htmlish ? buf.toString("utf8") : "", finalUrl: res.url || url };
  } catch (err) {
    return { status: 0, contentType: null, head: "", body: "", finalUrl: null, error: String((err as Error)?.message ?? err).slice(0, 160) };
  }
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
  const gateOne = async (d: DueItem, c: ReleaseCandidate, ctx: GateContext): Promise<{ release: VerifiedRelease | null; gate: number }> => {
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
      reject(d, c.url, v.gate, fetched.status === 0 ? `fetch failed (${fetched.error ?? "network"})` : v.reason, c.via);
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
    const pages = watches.filter((w) => w.examId === d.examId && w.kind === d.kind && w.fetchMode === "html");
    const verified: { r: VerifiedRelease; watchId: string | null }[] = [];
    for (const w of pages) {
      if (outOfTime()) {
        report.timeGuardHit = true;
        break;
      }
      const page = await deps.fetchUrl(w.listingUrl, { maxBytes: HTML_MAX_BYTES });
      report.pagesFetched++;
      // Review, 30 Sep 2026: a listing that redirected off the official
      // hosts (an expired portal page) supplies no candidates.
      const offHost = !!page.finalUrl && !isOfficialSource(page.finalUrl, exam.portalUrl);
      if (page.status !== 200 || !page.body || offHost) {
        const status = offHost
          ? `redirected off the official host (${page.finalUrl})`
          : page.status === 0
            ? `unreachable (${page.error ?? "network"})`
            : `HTTP ${page.status}`;
        report.pagesUnreadable.push({ code: d.code, url: w.listingUrl, status });
        if (!opts.dry) await deps.markChecked(w.id, status);
        continue;
      }
      outcome.readablePages++;
      const links = extractLinks(page.body, page.finalUrl ?? w.listingUrl);
      const scan = scanListing(links, d.kind, knownOf(d.examId));
      const ctx = contextFor(d, exam, w);
      for (const l of scan.kindLinks) {
        if (outOfTime()) break;
        const c: ReleaseCandidate = { kind: d.kind, url: l.url, listingUrl: w.listingUrl, anchorText: l.anchorText, rowText: l.rowText, via: "html" };
        const g = await gateOne(d, c, ctx);
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
        if (outOfTime()) break;
        // Gate 1 before any fetch: we never request a URL the AI proposed
        // off the official hosts.
        if (!isOfficialSource(cand.url, exam.portalUrl) || (cand.listingUrl && !isOfficialSource(cand.listingUrl, exam.portalUrl))) {
          reject(d, cand.url, 1, "proposed off the official hosts", "ai");
          continue;
        }
        const c = await candidateFromAi(cand, d, exam.portalUrl, deps);
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
 *  proposed with no listing we could read linking it is not a candidate. */
async function candidateFromAi(
  cand: AiCandidate,
  d: DueItem,
  portalUrl: string | null,
  deps: Pick<WatchRunDeps, "fetchUrl">,
): Promise<ReleaseCandidate | null> {
  // A page whose redirect left the official hosts reads as unreadable
  // (review, 30 Sep 2026).
  const onHost = (p: FetchedPage) => !p.finalUrl || isOfficialSource(p.finalUrl, portalUrl);
  if (cand.listingUrl) {
    const page = await deps.fetchUrl(cand.listingUrl, { maxBytes: HTML_MAX_BYTES });
    if (page.status === 200 && page.body && onHost(page)) {
      const want = normLink(cand.url);
      const link = extractLinks(page.body, page.finalUrl ?? cand.listingUrl).find((l) => normLink(l.url) === want);
      if (link) return { kind: d.kind, url: link.url, listingUrl: cand.listingUrl, anchorText: link.anchorText, rowText: link.rowText, via: "ai" };
    }
  }
  if (looksLikePdf(cand.url, null)) return null;
  const page = await deps.fetchUrl(cand.url, { maxBytes: HTML_MAX_BYTES });
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
  const dry = q.get("dry") === "1";
  const ai = q.get("ai") !== "0";
  const maxUsdRaw = q.get("maxUsd");
  const maxUsd = maxUsdRaw !== null && Number.isFinite(Number(maxUsdRaw)) ? Number(maxUsdRaw) : null;
  const only = (q.get("only") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const [{ prisma }, db, aiMod] = await Promise.all([import("@/lib/db/prisma"), import("@/lib/answer-key-watch-db"), import("@/lib/ai/answer-key-check")]);
  const now = new Date();
  try {
    const report = await runAnswerKeyWatch(
      { mode, dry, ai, maxUsd },
      {
        now,
        loadDue: () => db.loadDueInputs(prisma, now, only),
        loadWatches: (ids) => db.loadWatches(prisma, ids),
        loadKnown: (ids, watches) => db.loadKnownLinks(prisma, ids, watches),
        fetchUrl: (url, o) => fetchForWatch(url, o),
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
