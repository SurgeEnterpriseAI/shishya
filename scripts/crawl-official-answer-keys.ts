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
//   2. A deterministic verifier fetches every proposed URL itself and keeps
//      only what passes: an official host; the listing answers as HTML
//      ("html"), or only in a browser / not at all ("browser-only" /
//      "blocked" — those exams stay "not announced yet"; a coaching link is
//      never shown instead); exam terms the page itself prints; every link on
//      the page as the baseline (old cycles); the previous cycle's link and,
//      where the page prints it, its date → the lag that drives the
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
  classifyLink,
  crawlAiOff,
  crawlNeedsProbe,
  crawlResearchStep,
  examNamed,
  examTermsFor,
  extractLinks,
  htmlText,
  kindMatches,
  latestHeldSitting,
  looksLikePdf,
  normLink,
  officialHostsFor,
  pageHeading,
  parsePrintedDates,
  releaseGate,
  releaseLabel,
  releasedSince,
  type FetchMode,
  type GateContext,
  type PageLink,
  type TrackerRowLite,
  type VerifiedRelease,
  type WatchKind,
} from "../src/lib/answer-key-watch";
import { ensureOfficialWatchTables, loadKnownLinks, upsertWatch, writeRelease, type LastCycle } from "../src/lib/answer-key-watch-db";
import { fetchForWatch } from "../src/lib/answer-key-watch-run";

const prisma = new PrismaClient();
/** Estimated cost of one research call (Sonnet + ≤5 searches; measured
 *  exam-info average $0.20, p90 $0.225). Charged before each call. */
const RESEARCH_COST_USD = 0.22;
const KINDS: readonly WatchKind[] = ["ANSWER_KEY", "RESULT"];
const DAY_MS = 86_400_000;

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

async function verifyExam(
  exam: { id: string; code: string; name: string; shortName: string; portalUrl: string | null; rows: TrackerRowLite[] },
  research: AnswerKeyResearch,
  known: Set<string>,
  now: Date,
): Promise<ExamVerification> {
  const out: ExamVerification = { code: exam.code, pass: false, watches: [], releases: [], rejected: [], papers: [], notes: [] };
  const sitting = latestHeldSitting(exam, now, RESULT_DUE_EXAM_DAYS);
  const pages = new Map<string, Awaited<ReturnType<typeof fetchForWatch>>>();
  const page = async (url: string) => {
    if (!pages.has(url)) pages.set(url, await fetchForWatch(url, { maxBytes: 3_000_000 }));
    return pages.get(url)!;
  };

  for (const kind of KINDS) {
    const listingUrl = kind === "ANSWER_KEY" ? research.answerKeyListing : research.resultListing;
    if (!listingUrl) {
      out.notes.push(`${kind}: no listing page proposed`);
      continue;
    }
    if (!isOfficialSource(listingUrl, exam.portalUrl)) {
      out.rejected.push({ kind, url: listingUrl, reason: "listing host not official" });
      continue;
    }
    const p = await page(listingUrl);
    const host = new URL(listingUrl).hostname.toLowerCase().replace(/^www\./, "");
    // A listing whose redirect left the official hosts is not an official
    // page (review, 30 Sep 2026).
    const offHost = !!p.finalUrl && !isOfficialSource(p.finalUrl, exam.portalUrl);
    if (p.status !== 200 || !p.body || offHost) {
      out.watches.push({
        kind, listingUrl, host, fetchMode: "blocked", singleExam: false, heading: "", examTerms: [], baselineLinks: [], lastCycle: null, lagDays: null,
        status: offHost ? `redirected off the official host (${p.finalUrl})` : p.status === 0 ? `unreachable (${p.error ?? "network"})` : `HTTP ${p.status}`,
      });
      continue;
    }
    const links = extractLinks(p.body, p.finalUrl ?? listingUrl);
    const kindLinks = links.filter((l) => kindMatches(kind, classifyLink(`${l.anchorText} ${l.rowText}`)));
    const heading = pageHeading(p.body);
    const pageText = htmlText(p.body);
    // Terms the page itself prints — the research's other words are dropped.
    const verifiedTerms = research.examTerms.filter((t) => examNamed(pageText, examTermsFor({ shortName: t, name: t })));
    const terms = examTermsFor(exam, verifiedTerms);
    const fetchMode: FetchMode = kindLinks.length > 0 ? "html" : "browser-only";
    const plan: WatchPlan = {
      kind, listingUrl, host, fetchMode, singleExam: examNamed(heading, terms), heading, examTerms: verifiedTerms,
      baselineLinks: [...new Set(links.map((l) => normLink(l.url)))], lastCycle: null, lagDays: null,
      status: `${links.length} links, ${kindLinks.length} name the ${kind === "ANSWER_KEY" ? "answer key" : "result"}`,
    };

    // The previous cycle: its link must be on this page (or answer our fetch
    // on an official host); its date is the one printed beside it, else the
    // research's (drives only the expected window).
    const lc = research.lastCycle[kind];
    if (lc?.url && isOfficialSource(lc.url, exam.portalUrl)) {
      const onPage = links.find((l) => normLink(l.url) === normLink(lc.url!));
      const printed = onPage ? parsePrintedDates(`${onPage.anchorText} ${onPage.rowText}`) : [];
      const releasedOn = printed.length === 1 ? printed[0] : lc.releasedOn;
      const lag = lc.examDay && releasedOn ? dayNo(releasedOn) - dayNo(lc.examDay) : null;
      plan.lastCycle = { examDay: lc.examDay, releasedOn, url: lc.url, dateSource: printed.length === 1 ? "printed" : "research" };
      plan.lagDays = lag !== null && lag >= 0 && lag <= 365 ? lag : null;
      if (kind === "ANSWER_KEY" && onPage && looksLikePdf(lc.url, null)) {
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
    out.watches.push(plan);

    // Current-cycle release, only while none is on the tracker yet.
    if (!sitting) continue;
    if (releasedSince(exam.rows, kind, sitting.notBefore)) {
      out.notes.push(`${kind}: an official-watch row already covers the current sitting`);
      continue;
    }
    // baselined: false — this IS the first read, so gate 5 needs a date
    // printed beside the link (an undated link cannot be told from an older
    // cycle's). The sitting fields keep "(I)" / "Tier-I" off a (II) / Tier 2
    // sitting (review, 30 Sep 2026).
    const ctx: GateContext = {
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
      singleExamHeading: plan.singleExam ? heading : null,
      now,
    };
    const candidates: PageLink[] = [...kindLinks];
    for (const c of research.current.filter((x) => x.kind === kind)) {
      if (candidates.some((l) => normLink(l.url) === normLink(c.url))) continue;
      if (!c.listingUrl || !isOfficialSource(c.listingUrl, exam.portalUrl)) {
        out.rejected.push({ kind, url: c.url, reason: "proposed without an official page that lists it" });
        continue;
      }
      const lp = await page(c.listingUrl);
      const hit = lp.status === 200 && lp.body ? extractLinks(lp.body, lp.finalUrl ?? c.listingUrl).find((l) => normLink(l.url) === normLink(c.url)) : null;
      if (hit) candidates.push(hit);
      else out.rejected.push({ kind, url: c.url, reason: "the page it was proposed with does not link it (as we read it)" });
    }
    const verified: VerifiedRelease[] = [];
    for (const l of candidates.slice(0, 25)) {
      // Never request a link off the official hosts (gate 1 would refuse it anyway).
      if (!isOfficialSource(l.url, exam.portalUrl)) continue;
      const fetched = await fetchForWatch(l.url, { maxBytes: 65_536 });
      const v = releaseGate(
        { kind, url: l.url, listingUrl, anchorText: l.anchorText, rowText: l.rowText, via: "html" },
        ctx,
        fetched.status === 0 ? null : fetched,
      );
      if (!v.ok) {
        // Old cycles are expected here (the whole page is read for the first
        // time); an undated link fails gate 5 (baselined: false).
        if (v.gate !== 3) out.rejected.push({ kind, url: l.url, reason: `gate ${v.gate}: ${v.reason}` });
        continue;
      }
      verified.push(v.release);
    }
    if (verified.length) {
      const [first, ...rest] = verified;
      out.releases.push({
        kind,
        release: first,
        siblings: rest,
        label: releaseLabel(kind, first.text, sitting.stage),
        stage: sitting.stage,
        cycleYear: sitting.cycleYears[sitting.cycleYears.length - 1] ?? "",
      });
      if (kind === "ANSWER_KEY") {
        for (const r of verified.filter((x) => x.isPdf)) {
          out.papers.push({ year: out.releases[out.releases.length - 1].cycleYear, paper: r.text.slice(0, 200) || "Answer key", kind: "answer key", url: r.url, listingUrl, publisher: host });
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
      for (const w of v.watches) console.log(`   ${w.kind} ${w.fetchMode.toUpperCase()} ${w.listingUrl} — ${w.status}${w.lagDays !== null ? ` · last-cycle lag ${w.lagDays} d (${w.lastCycle?.dateSource})` : ""}`);
      for (const r of v.releases) console.log(`   RELEASE ${r.kind} ${r.release.releasedOn.toISOString().slice(0, 10)} ${r.release.url} — "${r.label}"${r.siblings.length ? ` (+${r.siblings.length} sibling links)` : ""}`);
      for (const r of v.rejected.slice(0, 8)) console.log(`   x ${r.kind} ${r.url}: ${r.reason}`);
      for (const n of v.notes) console.log(`   · ${n}`);
      if (v.papers.length) writeFileSync(join(outDir, "papers", `${e.code}.json`), JSON.stringify({ exam: e.code, papers: v.papers }, null, 2));

      if (apply) {
        for (const w of v.watches) {
          await upsertWatch(prisma, { examId: e.id, ...w, now });
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
