// scripts/crawl-official-answer-keys.ts
//
// One-time crawl of the conducting bodies' own answer-key and result pages
// (30 Sep 2026, official watch). Stored once so the weekly watch
// (/api/cron/answer-key-watch, src/lib/answer-key-watch-run.ts) can re-read
// the same pages as plain HTML for $0.
//
// Per exam:
//   1. AI research (src/lib/ai/answer-key-research.ts): web_search limited to
//      the exam's official hosts (the portal + the same body's other hosts);
//      it PROPOSES the answer-key and result listing pages, how the body names
//      the exam, the latest cycle's links, the previous cycle's. Spend is
//      recorded as 'akr-crawl' (AiUsage), charged before each call against
//      --max-usd, trued up to the recorded cost.
//   2. A deterministic verifier fetches every proposed URL itself — and, since
//      the pilot of 30 Sep 2026, the body's own listings (bodyListingsFor:
//      UPSC's answer-key / result tables and What's New, SSC's answer-key and
//      candidate-result pages, RRB's objection-tracker and exam-results tables)
//      — reading each with its body's adapter (src/lib/official-listings.ts:
//      plain HTML, UPSC tables, SSC's records endpoint behind its script-built
//      pages, IBPS cycle pages, RRB tables behind a cookie firewall). It keeps
//      only what passes: an official host; the listing is readable ("html"),
//      readable but lists nothing of the kind ("empty"), only in a browser
//      ("browser-only", printed BROWSER-NEEDED — never guessed at) or not at
//      all ("blocked") — those exams stay "not announced yet"; a coaching link
//      is never shown instead); exam terms the page itself prints; every link
//      on the page as the baseline (old cycles); the previous cycle's link
//      and, where the page prints it, its date → the lag that drives the
//      "expected" window (never a tracker row).
//   3. Current-cycle releases (the latest announced sitting held in the last
//      180 days) go through releaseGate (src/lib/answer-key-watch.ts) — AND,
//      on this first read, must carry a date printed beside the link: with no
//      baseline yet, an undated link cannot be told from an older cycle's.
//   4. Answer-key PDFs → importer JSON (<out>/papers/<CODE>.json) for
//      scripts/import-official-papers.ts --dir <out>/papers (its own checks).
//
// Dry by default: prints PASS / FAIL per exam and writes <out>/report.json;
// nothing touches the DB. --apply writes OfficialWatch rows (tables created
// by the raw-SQL ensure) and the verified current-cycle releases (source
// 'official-watch'), archiving the generated twins; --indexnow (only with
// --apply) submits the changed pages.
//
// Flags:
//   --only CODE,CODE     exams to crawl (default: every real exam with a portal)
//   --max-usd N          REQUIRED whenever research runs, and for --apply (0 =
//                        no new AI: journal only). Hard cap for the run.
//   --chunk N            exams per chunk (default 8); the key is probed between
//                        chunks, and any credit / 4xx error stops the crawl
//   --resume <runId>     reuse <out>/journal.jsonl: exams already researched
//                        are NOT researched again (no AI); the rest are
//   --out <dir>          default D:/CodexProjects/shishya-data/answer-keys/<runId>
//   --no-ai              verify only what the journal already holds
//   --apply, --indexnow  see above
//
// Pilot (dry):  npx tsx --env-file=.env.local scripts/crawl-official-answer-keys.ts --only NDA,CDS,MP_MPESB,RRB_NTPC,SSC_MTS,IBPS_PO --max-usd 2 --chunk 3
// Full (dry):   … --max-usd 45 --chunk 8 --out D:/CodexProjects/shishya-data/answer-keys/crawl-2026-10-01
// After the founder reviews the PASS / FAIL report:
//               … --resume crawl-2026-10-01 --out D:/CodexProjects/shishya-data/answer-keys/crawl-2026-10-01 --max-usd 0 --apply --indexnow
// Then:         npx tsx --env-file=.env.local scripts/import-official-papers.ts --dir <out>/papers (dry), then add --apply --indexnow

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { REAL_EXAM_WHERE } from "../src/lib/db/exam-scope";
import { istDay } from "../src/lib/exam-week";
import { isOfficialSource } from "../src/lib/official-source";
import { probeKey, researchAnswerKeys, type AnswerKeyResearch } from "../src/lib/ai/answer-key-research";
import { isStopError } from "../src/lib/ai/answer-key-check";
import {
  AiBudget,
  RESULT_DUE_EXAM_DAYS,
  WATCH_WRITES_PAUSED,
  classifyLink,
  crawlAiOff,
  crawlNeedsProbe,
  crawlResearchStep,
  examNamed,
  examTermsFor,
  kindMatches,
  latestHeldSitting,
  looksLikePdf,
  normLink,
  officialHostsFor,
  parsePrintedDates,
  releaseGate,
  releaseLabel,
  releasedSince,
  type FetchMode,
  type GateContext,
  type TrackerRowLite,
  type VerifiedRelease,
  type WatchKind,
} from "../src/lib/answer-key-watch";
import { ensureOfficialWatchTables, loadKnownLinks, upsertWatch, writeRelease, type LastCycle } from "../src/lib/answer-key-watch-db";
import { CookieJar, fetchForWatch } from "../src/lib/answer-key-watch-run";
import { ListingReadCache, bodyListingsFor, sharesKinds, type ListingAdapter, type ListingLink, type ListingRead } from "../src/lib/official-listings";

const prisma = new PrismaClient();
/** Estimated cost of one research call (Sonnet + ≤5 searches; measured
 *  exam-info average $0.20, p90 $0.225). Charged before each call. */
const RESEARCH_COST_USD = 0.22;
const KINDS: readonly WatchKind[] = ["ANSWER_KEY", "RESULT"];
const DAY_MS = 86_400_000;
/** One cookie jar for the crawl: RRB's firewall wants its session cookies. */
const jar = new CookieJar();
const watchFetch = (url: string, o: { maxBytes: number }) => fetchForWatch(url, { ...o, jar });
/** One read per listing for the whole crawl (review, 30 Sep 2026): every SSC,
 *  UPSC or RRB exam lists its body's shared listings — read them once. */
const listingReads = new ListingReadCache();

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}
const has = (name: string) => process.argv.includes(name);

interface JournalLine {
  code: string;
  at: string;
  research: AnswerKeyResearch | null;
  costUsd: number;
  error?: string;
}

interface WatchPlan {
  kind: WatchKind;
  listingUrl: string;
  host: string;
  fetchMode: FetchMode;
  /** Report only (not stored): the body's adapter and the URLs it read. */
  adapter: ListingAdapter;
  sources: string[];
  /** Report only: where the listing came from. */
  proposedBy: "research" | "body";
  singleExam: boolean;
  heading: string;
  examTerms: string[];
  baselineLinks: string[];
  lastCycle: LastCycle | null;
  lagDays: number | null;
  status: string;
}

interface ExamVerification {
  code: string;
  pass: boolean;
  watches: WatchPlan[];
  releases: { kind: WatchKind; release: VerifiedRelease; siblings: VerifiedRelease[]; label: string; stage: string; cycleYear: string }[];
  rejected: { kind: WatchKind; url: string; reason: string }[];
  papers: { year: string; paper: string; kind: "answer key"; url: string; listingUrl: string; publisher: string }[];
  notes: string[];
}

const dayNo = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);

/** The report's word for a fetch mode ("browser-only" is printed
 *  BROWSER-NEEDED: the page needs a browser and no machine-readable source of
 *  it is known). */
function modeLabel(w: Pick<WatchPlan, "fetchMode" | "adapter">): string {
  if (w.fetchMode === "html") return w.adapter === "html" ? "HTML" : `READABLE (${w.adapter})`;
  if (w.fetchMode === "browser-only") return "BROWSER-NEEDED";
  return w.fetchMode.toUpperCase();
}

async function verifyExam(
  exam: { id: string; code: string; name: string; shortName: string; portalUrl: string | null; rows: TrackerRowLite[] },
  research: AnswerKeyResearch,
  known: Set<string>,
  now: Date,
): Promise<ExamVerification> {
  const out: ExamVerification = { code: exam.code, pass: false, watches: [], releases: [], rejected: [], papers: [], notes: [] };
  const sitting = latestHeldSitting(exam, now, RESULT_DUE_EXAM_DAYS);
  // One read per listing for the crawl (per kind for RRB, whose tables are
  // per category): listingReadKey.
  const read = async (url: string, kind: WatchKind): Promise<ListingRead> => (await listingReads.read(url, kind, watchFetch, { portalUrl: exam.portalUrl })).read;
  /** The research's terms the page itself prints (its text, as the crawl
   *  always checked; SSC: the records' headlines). Only served text: the
   *  adapters never put a heading of their own into it. */
  const termsOn = (r: ListingRead) => research.examTerms.filter((t) => examNamed(r.pageText, examTermsFor({ shortName: t, name: t })));

  for (const kind of KINDS) {
    // The research's listing, the body's own listings (bodyListingsFor), and —
    // IBPS — the other kind's listing: a cycle page carries every notice of
    // the recruitment.
    const proposed = kind === "ANSWER_KEY" ? research.answerKeyListing : research.resultListing;
    const other = kind === "ANSWER_KEY" ? research.resultListing : research.answerKeyListing;
    const listings: { url: string; by: WatchPlan["proposedBy"] }[] = [];
    const addListing = (url: string | null | undefined, by: WatchPlan["proposedBy"]) => {
      if (url && !listings.some((l) => normLink(l.url) === normLink(url))) listings.push({ url, by });
    };
    addListing(proposed, "research");
    if (!proposed && other && sharesKinds(other)) addListing(other, "research");
    for (const u of bodyListingsFor(exam.portalUrl, kind)) addListing(u, "body");
    if (listings.length === 0) {
      out.notes.push(`${kind}: no listing page proposed, and none of this body's listings is known`);
      continue;
    }
    const current = !!sitting && !releasedSince(exam.rows, kind, sitting.notBefore);
    if (sitting && !current) out.notes.push(`${kind}: an official-watch row already covers the current sitting`);
    // baselined: false — this IS the first read, so gate 5 needs a date
    // printed beside the link (an undated link cannot be told from an older
    // cycle's). The sitting fields keep "(I)" / "Tier-I" / another CEN off the
    // due sitting (review, 30 Sep 2026).
    const ctxFor = (terms: string[], singleExamHeading: string | null): GateContext | null =>
      sitting
        ? {
            portalUrl: exam.portalUrl,
            examTerms: terms,
            cycleYears: sitting.cycleYears,
            notBefore: sitting.notBefore,
            lastExamDay: sitting.lastDay,
            sittingLabels: sitting.sittingLabels,
            ordinalNames: [exam.shortName],
            otherSittingThisYear: sitting.otherSittingThisYear,
            known,
            baselined: false,
            singleExamHeading,
            now,
          }
        : null;
    const verified: { r: VerifiedRelease; listingUrl: string }[] = [];
    const tried = new Set<string>();
    let loginLinks = 0;
    /** Gates 1, 3, 4 and 5 first (no request for an old cycle's link), then
     *  our own fetch and the full gate. */
    const tryCandidate = async (l: ListingLink, listingUrl: string, ctx: GateContext) => {
      if (tried.has(normLink(l.url))) return;
      tried.add(normLink(l.url));
      // Never request a link off the official hosts (gate 1 would refuse it anyway).
      if (!isOfficialSource(l.url, exam.portalUrl)) return;
      const c = { kind, url: l.url, listingUrl, anchorText: l.anchorText, rowText: l.rowText, via: "html" as const };
      const pre = releaseGate(c, ctx, { status: 200, contentType: looksLikePdf(l.url, null) ? "application/pdf" : "text/html", head: "%PDF-", finalUrl: null });
      if (!pre.ok) {
        // Old cycles are expected here (the whole page is read for the first
        // time); an undated link fails gate 5 (baselined: false).
        if (pre.gate !== 3) out.rejected.push({ kind, url: l.url, reason: `gate ${pre.gate}: ${pre.reason}` });
        return;
      }
      const fetched = await watchFetch(l.url, { maxBytes: 65_536 });
      const v = releaseGate(c, ctx, fetched.status === 0 ? null : fetched);
      if (!v.ok) {
        const why = `gate ${v.gate}: ${fetched.status === 0 ? `fetch failed (${fetched.error ?? "network"})` : v.reason}`;
        out.rejected.push({ kind, url: l.url, reason: l.access === "login" && v.gate === 2 ? `${why} — a candidate-login page (browser-needed)` : why });
        return;
      }
      verified.push({ r: v.release, listingUrl });
    };

    for (const { url: listingUrl, by } of listings) {
      if (!isOfficialSource(listingUrl, exam.portalUrl)) {
        out.rejected.push({ kind, url: listingUrl, reason: "listing host not official" });
        continue;
      }
      const r = await read(listingUrl, kind);
      const host = new URL(listingUrl).hostname.toLowerCase().replace(/^www\./, "");
      if (r.fetchMode !== "html") {
        out.watches.push({
          kind, listingUrl, host, fetchMode: r.fetchMode, adapter: r.adapter, sources: r.sources, proposedBy: by,
          singleExam: false, heading: "", examTerms: [], baselineLinks: [], lastCycle: null, lagDays: null, status: r.status,
        });
        continue;
      }
      const links = r.links;
      const kindLinks = links.filter((l) => kindMatches(kind, classifyLink(`${l.anchorText} ${l.rowText}`)));
      loginLinks += kindLinks.filter((l) => l.access === "login").length;
      const heading = r.heading;
      // Terms the page itself prints — the research's other words are dropped.
      const verifiedTerms = termsOn(r);
      const terms = examTermsFor(exam, verifiedTerms);
      // Readable, but nothing of the kind on it: "empty" — never browser-only.
      const fetchMode: FetchMode = kindLinks.length > 0 ? "html" : "empty";
      const plan: WatchPlan = {
        kind, listingUrl, host, fetchMode, adapter: r.adapter, sources: r.sources, proposedBy: by,
        // Only a heading the body printed may name the exam for every row
        // (ssc-api / rrb have none: ""); its sitting markers are then checked
        // by the gate as the row's own (review, 30 Sep 2026).
        singleExam: !!heading && examNamed(heading, terms), heading, examTerms: verifiedTerms,
        baselineLinks: [...new Set(links.map((l) => normLink(l.url)))], lastCycle: null, lagDays: null,
        status: `${r.status}; ${links.length} links, ${kindLinks.length} name the ${kind === "ANSWER_KEY" ? "answer key" : "result"}`,
      };

      // The previous cycle: its link must be on this page (or answer our fetch
      // on an official host); its date is the one printed beside it, else the
      // research's (drives only the expected window). Recorded on the
      // research's listing, or on the page that links it.
      const lc = research.lastCycle[kind];
      if (lc?.url && isOfficialSource(lc.url, exam.portalUrl)) {
        const onPage = links.find((l) => normLink(l.url) === normLink(lc.url!));
        if (onPage || (!!proposed && normLink(listingUrl) === normLink(proposed))) {
          const printed = onPage ? parsePrintedDates(`${onPage.anchorText} ${onPage.rowText}`) : [];
          const releasedOn = printed.length === 1 ? printed[0] : lc.releasedOn;
          const lag = lc.examDay && releasedOn ? dayNo(releasedOn) - dayNo(lc.examDay) : null;
          plan.lastCycle = { examDay: lc.examDay, releasedOn, url: lc.url, dateSource: printed.length === 1 ? "printed" : "research" };
          plan.lagDays = lag !== null && lag >= 0 && lag <= 365 ? lag : null;
          if (kind === "ANSWER_KEY" && onPage && looksLikePdf(lc.url, null) && !out.papers.some((p) => normLink(p.url) === normLink(onPage.url))) {
            out.papers.push({
              year: (lc.examDay ?? releasedOn ?? "").slice(0, 4),
              paper: onPage.anchorText.slice(0, 200) || "Answer key",
              kind: "answer key",
              url: onPage.url,
              listingUrl,
              publisher: host,
            });
          }
        }
      }
      out.watches.push(plan);

      // Current-cycle release, only while none is on the tracker yet.
      const ctx = current ? ctxFor(terms, plan.singleExam ? heading : null) : null;
      if (!ctx) continue;
      for (const l of kindLinks.slice(0, 25)) await tryCandidate(l, listingUrl, ctx);
    }
    if (loginLinks > 0) out.notes.push(`${kind}: ${loginLinks} link(s) are candidate-login pages (browser-needed: gate 2 needs our own fetch of the link)`);

    // The research's current-cycle links: each must be on an official page
    // that lists it, as WE read that page with its adapter.
    if (current) {
      for (const c of research.current.filter((x) => x.kind === kind)) {
        if (tried.has(normLink(c.url))) continue;
        if (!c.listingUrl || !isOfficialSource(c.listingUrl, exam.portalUrl)) {
          out.rejected.push({ kind, url: c.url, reason: "proposed without an official page that lists it" });
          continue;
        }
        const lp = await read(c.listingUrl, kind);
        const hit = lp.fetchMode === "html" ? lp.links.find((l) => normLink(l.url) === normLink(c.url)) : undefined;
        if (!hit) {
          out.rejected.push({ kind, url: c.url, reason: `the page it was proposed with does not link it (as we read it: ${lp.status})` });
          continue;
        }
        const terms = examTermsFor(exam, termsOn(lp));
        const single = lp.heading && examNamed(lp.heading, terms) ? lp.heading : null;
        await tryCandidate(hit, c.listingUrl, ctxFor(terms, single)!);
      }
    }

    if (sitting && verified.length) {
      const [first, ...rest] = verified.map((v) => v.r);
      out.releases.push({
        kind,
        release: first,
        siblings: rest,
        label: releaseLabel(kind, first.text, sitting.stage),
        stage: sitting.stage,
        cycleYear: sitting.cycleYears[sitting.cycleYears.length - 1] ?? "",
      });
      if (kind === "ANSWER_KEY") {
        for (const v of verified.filter((x) => x.r.isPdf)) {
          out.papers.push({
            year: out.releases[out.releases.length - 1].cycleYear,
            paper: v.r.text.slice(0, 200) || "Answer key",
            kind: "answer key",
            url: v.r.url,
            listingUrl: v.listingUrl,
            publisher: v.r.host,
          });
        }
      }
    }
  }
  out.pass = out.watches.some((w) => w.fetchMode === "html");
  return out;
}

async function main() {
  const now = new Date();
  const apply = has("--apply");
  const indexNow = apply && has("--indexnow");
  if (has("--indexnow") && !apply) console.log("--indexnow ignored without --apply (dry run: nothing is written or submitted)");
  const noAi = has("--no-ai");
  const maxUsdArg = arg("--max-usd");
  const maxUsd = maxUsdArg !== null && Number.isFinite(Number(maxUsdArg)) && Number(maxUsdArg) >= 0 ? Number(maxUsdArg) : null;
  if (apply && maxUsd === null) throw new Error("--max-usd is required with --apply (use --max-usd 0 to apply from the journal with no new AI)");
  const chunk = Math.max(1, Number(arg("--chunk") ?? 8) || 8);
  const only = (arg("--only") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const runId = arg("--resume") ?? `crawl-${istDay(now)}`;
  const outDir = arg("--out") ?? `D:/CodexProjects/shishya-data/answer-keys/${runId}`;
  mkdirSync(join(outDir, "papers"), { recursive: true });
  const journalPath = join(outDir, "journal.jsonl");

  const journal = new Map<string, JournalLine>();
  if (existsSync(journalPath)) {
    for (const line of readFileSync(journalPath, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line) as JournalLine;
        if (j.research) journal.set(j.code, j);
      } catch {
        /* a torn last line from a killed run */
      }
    }
  }

  const exams = await prisma.exam.findMany({
    where: { ...REAL_EXAM_WHERE, ...(only.length ? { code: { in: only } } : {}) },
    orderBy: [{ candidatesPerYear: "desc" }, { code: "asc" }],
    select: { id: true, code: true, name: true, shortName: true, state: true, eligibility: { select: { officialUrl: true } } },
  });
  const withPortal = exams.filter((e) => e.eligibility?.officialUrl);
  const needAi = withPortal.filter((e) => !journal.has(e.code));
  // --max-usd 0 means NO new AI (review, 30 Sep 2026): it used to charge the
  // budget for the first unresearched exam, stop the whole run on "cap
  // reached" (every later exam silently not applied) and probe the key
  // first. Now it is --no-ai: journal only, the rest skipped and counted.
  const aiOff = crawlAiOff(noAi, maxUsd);
  console.log(
    `run ${runId} · ${withPortal.length} exams with an official portal (${exams.length - withPortal.length} without: skipped) · ${journal.size} already researched · ${aiOff ? 0 : needAi.length} to research${aiOff && needAi.length ? ` (${needAi.length} not researched: no AI this run, skipped)` : ""}${apply ? " · APPLY" : " · dry run"}`,
  );
  if (!aiOff && needAi.length > 0 && maxUsd === null) {
    throw new Error(`--max-usd is required: ${needAi.length} exams need research (estimate $${(needAi.length * RESEARCH_COST_USD).toFixed(2)})`);
  }
  const budget = new AiBudget(maxUsd ?? 0, RESEARCH_COST_USD);
  const skipped: string[] = [];

  const today = Math.floor((now.getTime() + 330 * 60_000) / DAY_MS);
  const rows = await prisma.examImportantDate.findMany({
    where: { examId: { in: withPortal.map((e) => e.id) }, archivedAt: null, date: { gte: new Date((today - 220) * DAY_MS), lte: new Date((today + 30) * DAY_MS) } },
    select: { id: true, examId: true, label: true, date: true, isExamDay: true, kind: true, confidence: true, url: true, source: true, notes: true },
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });
  const known = await loadKnownLinks(prisma, withPortal.map((e) => e.id), []);
  // 1 Oct 2026: no writes while the release gate is being fixed (WATCH_WRITES_PAUSED).
  if (apply && WATCH_WRITES_PAUSED) throw new Error("--apply refused: WATCH_WRITES_PAUSED is true in src/lib/answer-key-watch.ts (labels and exam naming under repair)");
  if (apply) await ensureOfficialWatchTables(prisma);

  const report: ExamVerification[] = [];
  let stopped: string | null = null;
  for (let i = 0; i < withPortal.length; i += chunk) {
    const part = withPortal.slice(i, i + chunk);
    // No probe when no research can run (AI off, or the cap already reached).
    const partNeedsAi = crawlNeedsProbe(aiOff, budget, part.some((e) => !journal.has(e.code)));
    if (partNeedsAi && i > 0) {
      // Between chunks: the smallest possible call on the key. A credit,
      // auth or rate-limit error stops the crawl before the next research.
      try {
        budget.spent += await probeKey(); // ~$0.00001, still counted against --max-usd
      } catch (err) {
        stopped = `key probe refused (${String((err as { status?: unknown })?.status ?? "error")}): ${String((err as Error)?.message ?? err).slice(0, 160)}`;
        break;
      }
    }
    for (const e of part) {
      let research = journal.get(e.code)?.research ?? null;
      // Never `break` on a skip: the exams after this one may be in the
      // journal and still need verifying / applying.
      const step = crawlResearchStep(!!research, aiOff, budget);
      if (step === "skip-no-ai" || step === "skip-cap") {
        console.log(`\n== ${e.code}: SKIP (not researched; ${step === "skip-no-ai" ? "no AI this run" : "--max-usd cap reached"})`);
        skipped.push(e.code);
        continue;
      }
      if (step === "research") {
        const portal = e.eligibility?.officialUrl ?? null;
        const examRows = rows.filter((r) => r.examId === e.id);
        const sittings = examRows
          .filter((r) => (r.kind ?? "") === "EXAM" || (!r.kind && r.isExamDay))
          .slice(-6)
          .map((r) => `${r.date.toISOString().slice(0, 10)} — ${r.label}`);
        try {
          const res = await researchAnswerKeys({
            examCode: e.code,
            examName: e.name,
            shortName: e.shortName,
            officialHosts: officialHostsFor(portal),
            portalUrl: portal,
            sittings,
          });
          budget.trueUp(res.costUsd);
          research = res.research;
          const line: JournalLine = { code: e.code, at: new Date().toISOString(), research, costUsd: res.costUsd };
          appendFileSync(journalPath, `${JSON.stringify(line)}\n`);
          journal.set(e.code, line);
        } catch (err) {
          const msg = String((err as Error)?.message ?? err).slice(0, 200);
          appendFileSync(journalPath, `${JSON.stringify({ code: e.code, at: new Date().toISOString(), research: null, costUsd: 0, error: msg })}\n`);
          if (isStopError(err)) {
            stopped = `API refused on ${e.code} (${String((err as { status?: unknown })?.status)}): ${msg}`;
            break;
          }
          console.log(`\n== ${e.code}: research failed (${msg}) — resumable`);
          continue;
        }
      }
      if (!research) continue; // unreachable: "journal" carries research, "research" set it
      const v = await verifyExam(
        { id: e.id, code: e.code, name: e.name, shortName: e.shortName, portalUrl: e.eligibility?.officialUrl ?? null, rows: rows.filter((r) => r.examId === e.id) },
        research,
        known.get(e.id) ?? new Set(),
        now,
      );
      report.push(v);
      console.log(`\n== ${e.code}: ${v.pass ? "PASS" : "FAIL"}`);
      for (const w of v.watches) console.log(`   ${w.kind} ${modeLabel(w)} ${w.listingUrl}${w.proposedBy === "body" ? " (body's listing)" : ""} — ${w.status}${w.lagDays !== null ? ` · last-cycle lag ${w.lagDays} d (${w.lastCycle?.dateSource})` : ""}`);
      for (const r of v.releases) console.log(`   RELEASE ${r.kind} ${r.release.releasedOn.toISOString().slice(0, 10)} ${r.release.url} — "${r.label}"${r.siblings.length ? ` (+${r.siblings.length} sibling links)` : ""}`);
      for (const r of v.rejected.slice(0, 8)) console.log(`   x ${r.kind} ${r.url}: ${r.reason}`);
      for (const n of v.notes) console.log(`   · ${n}`);
      if (v.papers.length) writeFileSync(join(outDir, "papers", `${e.code}.json`), JSON.stringify({ exam: e.code, papers: v.papers }, null, 2));

      if (apply) {
        for (const w of v.watches) {
          await upsertWatch(prisma, {
            examId: e.id, kind: w.kind, listingUrl: w.listingUrl, host: w.host, fetchMode: w.fetchMode, singleExam: w.singleExam,
            heading: w.heading, examTerms: w.examTerms, baselineLinks: w.baselineLinks, lastCycle: w.lastCycle, lagDays: w.lagDays, now,
          });
        }
        for (const r of v.releases) {
          const res = await writeRelease(prisma, {
            exam: { id: e.id, code: e.code, state: e.state, shortName: e.shortName },
            release: r.release,
            label: r.label,
            stage: r.stage,
            cycleYear: r.cycleYear,
            watchId: null,
            siblings: r.siblings,
            now,
            dry: false,
            indexNow,
            via: "crawl",
          });
          console.log(`   ${res.status.toUpperCase()} ${r.kind}${res.reason ? ` (${res.reason})` : ""}${res.archivedTwins ? ` · ${res.archivedTwins} generated rows archived` : ""}${res.indexNowUrls ? ` · IndexNow ${res.indexNowUrls} URLs` : ""}`);
        }
      }
    }
    if (stopped) break;
  }

  writeFileSync(
    join(outDir, "report.json"),
    JSON.stringify(
      report.map((r) => ({ ...r, releases: r.releases.map((x) => ({ ...x, release: { ...x.release, releasedOn: x.release.releasedOn.toISOString().slice(0, 10) } })) })),
      null,
      2,
    ),
  );
  const pass = report.filter((r) => r.pass).length;
  console.log(
    `\n${pass} PASS · ${report.length - pass} FAIL · ${report.reduce((n, r) => n + r.releases.length, 0)} current-cycle releases · AI ${budget.calls} calls, $${budget.spent.toFixed(2)}${maxUsd !== null ? ` of $${maxUsd.toFixed(2)}` : ""}${apply ? "" : " (dry run: nothing written)"}`,
  );
  console.log(`report: ${join(outDir, "report.json")} · journal: ${journalPath} · importer JSON: ${join(outDir, "papers")}`);
  if (skipped.length) {
    console.log(
      `PARTIAL: ${skipped.length} exam(s) skipped, not researched (${aiOff ? "no AI this run" : "--max-usd cap reached"}): ${skipped.slice(0, 40).join(", ")}${skipped.length > 40 ? " …" : ""}`,
    );
    process.exitCode = 2;
  }
  if (stopped) {
    console.log(`STOPPED: ${stopped}. Resume with --resume ${runId} --out ${outDir}`);
    process.exitCode = 2;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
