// scripts/import-annual-calendars.ts — next-cycle OFFICIAL exam calendars
// into the exam tracker (27 Sep 2026, organic wave 3).
//
// Why: students search "<exam> 2027 exam date" and Shishya must answer with
// the conducting body's own date. On 27 Sep 2026 only 14 of 180 exams had an
// official-host next exam date: the UPSC Calendar 2027 was missing from the
// CSE tracker, JEE Main 2027 showed an estimate a day off NTA's calendar,
// GATE 2027's dates were cited to testbook, IBPS/UPPSC/RPSC dates to
// coaching sites.
//
// Input: data/official-calendars-2026-27.json — for every date the official
// document URL (the body's own host), the exact table cell / line it came
// from, and machine-checkable evidence. Nothing is taken on the file's word:
// every source is downloaded again (Node fetch, then curl) and every entry's
// evidence is re-checked before anything is planned:
//   • "cell"   — a ruled-table cell: the row holding `row`, the column whose
//                header (nearest header row above) holds `col`, must hold
//                `value`. PDFs are read with pdfplumber's grid (merged cells
//                repeated over the rows they cover — UPSC prints NDA (I) and
//                CDS (I) under one set of date cells), HTML with its <table>.
//   • "line"   — every token on one printed line (pdftotext -layout).
//   • "phrase" — one contiguous phrase in the document text.
//   A source marked verify:"hash" (a scanned calendar with no text layer, or
//   a legacy-font Hindi PDF) must also match the SHA-256 recorded when it was
//   read: a changed document is refused, never trusted. HTML text drops
//   struck-through <del> dates (GATE shows superseded dates struck out) and
//   HTML comments (TNPSC keeps old rows in comments).
// An entry whose source is not on an official host (isOfficialSource) is
// refused. Failures are printed and never written.
//
// Writes (only with --apply), per exam, never deleting a row:
//   + creates each verified entry as an ExamImportantDate: confidence
//     "official", url = the official document, source = the provenance tag
//     below (so src/lib/exam-data-writer.ts treats it as a curated row and
//     drops generated milestones near it), stored at midnight UTC of the IST
//     calendar day (repo convention).
//   - archives (archivedAt) generated rows the official date answers:
//       · same kind, same IST day, agreeing stage markers — the same event
//         (a testbook "GATE 2027 Result" beside IIT Madras's 19 Mar);
//       · an estimate or reported row that src/lib/official-source.ts
//         supersedingRow would settle with an imported row once its day has
//         passed — same kind, within SUPERSEDE_WINDOW_DAYS, same stage, not
//         naming another session (JEE Main's "Session 1 exam (expected)"
//         21 Jan beside NTA's 22 Jan) — archived now instead of waiting;
//       · the data file's explicit `archive` list (each with its reason —
//         a struck-through date, a paper-wise date the organiser has not
//         published, an estimate dated after the officially announced exam —
//         and the source that shows it; held back unless that source was
//         read and checked in the same run).
//     An OFFICIAL-tier generated row on a different day that would match is
//     printed as a CONFLICT and left alone — a human decides.
//   - archives an earlier row of this import that the data file no longer
//     carries, so the file stays the single answer.
// Curated rows (official research, KPSC timetable …) are never touched; when
// one already carries the same event the entry is skipped.
// Idempotent: a second run plans nothing.
//
// The dry run prints, per exam, the live rows before and after (from 30 days
// ago on, plus every row the run archives) and the change list.
//
// USAGE (from D:\CodexProjects\shishya):
//   npx tsx --env-file=.env.local scripts/import-annual-calendars.ts                     # verify + dry run
//   npx tsx --env-file=.env.local scripts/import-annual-calendars.ts --apply             # verify + write
//   … --apply --indexnow   # then submit the changed exams' fact pages to IndexNow
//   … --only NDA,CDS       # limit to exam codes
//   … --file <path>        # another data file (default data/official-calendars-2026-27.json)
//
// --indexnow: opt-in, honoured only with --apply (a dry run submits nothing).
// For every exam that had rows written it submits factUrlsForExam (hub,
// tracker, exam calendar, state page, localised twins only — gateTwinUrls).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../src/lib/db/prisma";
import { readPdfGrid } from "./cutoff-grid";
import { checkEvidence, htmlDoc, norm, pdfBytes, type Evidence, type EvidenceDoc } from "./annual-calendar-evidence";
import { isOfficialSource, sourceTier, supersedingRow, type EstimateRowLike, type SourceTier } from "../src/lib/official-source";
import { SUPPRESSED_SOURCE, resolveKind, rowCitation } from "../src/lib/exam-timeline";
import { stageMarkers } from "../src/lib/hub-title";
import { factUrlsForExam, submitIndexNow } from "../src/lib/indexnow";
import { gateTwinUrls, loadTwinVerdicts } from "../src/lib/twin-localisation";
import { STATES, stateSlug } from "../src/lib/state-info";

// ── data file ────────────────────────────────────────────────────────────

interface SourceJson {
  id: string;
  url: string;
  publisher: string;
  title: string;
  publishedOn: string | null;
  format: "pdf" | "html";
  verify: "text" | "hash";
  grid?: boolean;
  session?: string;
  sha256?: string;
}
interface EntryJson {
  exam: string;
  sourceId: string;
  kind: string;
  date: string;
  label: string;
  notes: string;
  quote: string;
  evidence: Evidence[];
}
interface ArchiveJson {
  exam: string;
  /** The source whose verified reading justifies the archive — no reading, no archive. */
  sourceId: string;
  date: string;
  label: string;
  reason: string;
}
interface DataFile {
  provenance: string;
  sources: SourceJson[];
  entries: EntryJson[];
  archive: ArchiveJson[];
  noExamRow?: { name: string; body: string; facts: string }[];
  notIncluded?: string[];
}

const KINDS = new Set([
  "NOTIFICATION",
  "APPLICATION_START",
  "APPLICATION_END",
  "CORRECTION_WINDOW",
  "ADMIT_CARD",
  "EXAM",
  "ANSWER_KEY",
  "QUESTION_PAPER",
  "RESULT",
  "INTERVIEW",
  "OTHER",
]);
const GENERATED_PREFIX = "ai-generated";
// A plain browser user agent: upsc.gov.in answers 403 to any UA carrying a
// crawler token (checked 27 Sep 2026); these are public notices.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
const PDFTOTEXT = [process.env.PDFTOTEXT, "pdftotext", "C:/Program Files/Git/mingw64/bin/pdftotext.exe"].filter(Boolean) as string[];
const DAY_MS = 86_400_000;
const WINDOW_BACK_DAYS = 30;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ── document reading ─────────────────────────────────────────────────────

function pdftotextLayout(file: string): string {
  for (const bin of PDFTOTEXT) {
    try {
      return execFileSync(bin, ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      /* next binary */
    }
  }
  throw new Error("pdftotext not available (set PDFTOTEXT)");
}

/** fetchOnce with up to three attempts — ibps.in drops TLS handshakes now and then. */
async function fetchBytes(url: string, session?: string): Promise<Buffer> {
  let last: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchOnce(url, session);
    } catch (e) {
      last = e as Error;
    }
  }
  throw last ?? new Error("download failed");
}

async function fetchOnce(url: string, session?: string): Promise<Buffer> {
  let cookie = "";
  try {
    if (session) {
      const s = await fetch(session, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000), redirect: "follow" });
      cookie = s.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
      await s.arrayBuffer();
    }
    const headers: Record<string, string> = { "user-agent": UA };
    if (cookie) headers.cookie = cookie;
    if (session) headers.referer = session;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(90_000), redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (fetchErr) {
    // Some government servers refuse Node's TLS client; curl, with a cookie
    // jar when the link needs a session.
    const dir = mkdtempSync(join(tmpdir(), "annual-cal-curl-"));
    const out = join(dir, "doc");
    const jar = join(dir, "jar");
    try {
      if (session) execFileSync("curl", ["-L", "-s", "-f", "--max-time", "120", "-A", UA, "-c", jar, "-b", jar, "-o", join(dir, "home"), session], { stdio: "ignore" });
      const extra = session ? ["-c", jar, "-b", jar, "-e", session] : [];
      execFileSync("curl", ["-L", "-s", "-f", "--max-time", "120", "-A", UA, ...extra, "-o", out, url], { stdio: "ignore" });
      return readFileSync(out);
    } catch {
      throw new Error(`download failed (${(fetchErr as Error).message}; curl also failed)`);
    }
  }
}

interface ReadDoc extends EvidenceDoc {
  sha256: string;
}

async function readSource(src: SourceJson, dir: string): Promise<ReadDoc> {
  const raw = await fetchBytes(src.url, src.session);
  if (src.format === "html") return { sha256: createHash("sha256").update(raw).digest("hex"), ...htmlDoc(raw.toString("utf8")) };
  if (raw.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("not a PDF (the link may need a session, or the file moved)");
  const bytes = pdfBytes(raw);
  const file = join(dir, `${src.id}.pdf`);
  writeFileSync(file, bytes);
  let layout = "";
  try {
    layout = pdftotextLayout(file);
  } catch {
    layout = ""; // image-only PDF: a verify:"hash" source carries it
  }
  const tables = src.grid ? readPdfGrid(file).flatMap((p) => p.tables.map((t) => t.rows.map((r) => r.map(norm)))) : [];
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    text: norm(layout),
    lines: layout.split(/\r?\n/).map(norm).filter(Boolean),
    tables,
  };
}

// ── plan ─────────────────────────────────────────────────────────────────

interface LiveRow {
  id: string;
  label: string;
  date: Date;
  kind: string | null;
  confidence: string | null;
  url: string | null;
  source: string | null;
  isExamDay: boolean;
  notes: string | null;
}

interface Create {
  entry: EntryJson;
  url: string;
}
interface Archive {
  row: LiveRow;
  why: string;
}
interface Update {
  row: LiveRow;
  entry: EntryJson;
  url: string;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const dayDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const kindOf = (r: Pick<LiveRow, "kind" | "label" | "isExamDay">) => resolveKind({ kind: r.kind, label: r.label, isExamDay: r.isExamDay });
const isGenerated = (r: LiveRow) => (r.source ?? "").startsWith(GENERATED_PREFIX) && r.source !== SUPPRESSED_SOURCE;

/** Stage markers without the window-end mark, as official-source.ts compares them. */
function markers(label: string): Set<string> {
  const m = stageMarkers(label);
  m.delete("end");
  return m;
}
function markersAgree(a: string, b: string): boolean {
  const ma = markers(a);
  const mb = markers(b);
  const sub = (x: Set<string>, y: Set<string>) => [...x].every((v) => y.has(v));
  return sub(ma, mb) || sub(mb, ma);
}

function tierOf(r: LiveRow, officialUrl: string | null): SourceTier {
  return sourceTier(r.confidence, rowCitation(r), officialUrl);
}

/** The imported row that settles `r` the way supersedingRow settles a passed
 *  estimate: asked on the day after `r`, with `r` treated as an estimate. */
function settledBy(r: LiveRow, imported: { entry: EntryJson; est: EstimateRowLike }[]): EntryJson | null {
  const kind = kindOf(r);
  if (kind === "OTHER") return null;
  const est: EstimateRowLike = { kind, tier: "expected", date: r.date, label: r.label };
  const dayAfter = new Date(r.date.getTime() + DAY_MS + 60_000);
  const hit = supersedingRow(est, [est, ...imported.map((i) => i.est)], dayAfter);
  return hit ? (imported.find((i) => i.est === hit)?.entry ?? null) : null;
}

function show(r: { date: Date; kind: string | null; label: string; confidence: string | null; url: string | null; source: string | null; isExamDay: boolean }, officialUrl: string | null): string {
  const tier = sourceTier(r.confidence, rowCitation(r), officialUrl);
  const cite = rowCitation(r);
  let host = "";
  try {
    host = cite ? new URL(cite).hostname.replace(/^www\./, "") : "";
  } catch {
    host = cite ?? "";
  }
  const src = (r.source ?? "").startsWith(GENERATED_PREFIX) ? "generated" : r.source ? r.source : "seed";
  return `${isoDay(r.date)} ${(r.kind ?? resolveKind({ kind: null, label: r.label, isExamDay: r.isExamDay })).padEnd(17)} ${tier.padEnd(8)} "${r.label}"  [${src}${host ? ` · ${host}` : ""}]`;
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
  const apply = process.argv.includes("--apply");
  const indexNow = apply && process.argv.includes("--indexnow");
  if (process.argv.includes("--indexnow") && !apply) console.log("--indexnow ignored without --apply (dry run: nothing is written or submitted)");
  const only = arg("--only") ? new Set(arg("--only")!.split(",").map((s) => s.trim().toUpperCase())) : null;
  const file = arg("--file") ?? "data/official-calendars-2026-27.json";
  const data = JSON.parse(readFileSync(file, "utf8")) as DataFile;
  const PROVENANCE = data.provenance;
  if (!/^official-calendar:/.test(PROVENANCE)) throw new Error(`provenance "${PROVENANCE}" must start with official-calendar: — stop.`);
  const now = new Date();
  console.log(`Annual calendars — ${file} — ${data.entries.length} entries, ${data.sources.length} sources, ${data.archive.length} explicit archives. ${apply ? "APPLY" : "DRY RUN"}\n`);

  // 1. Re-read every source and check every entry.
  const dir = mkdtempSync(join(tmpdir(), "annual-cal-"));
  const docs = new Map<string, ReadDoc | Error>();
  console.log("Sources:");
  for (const src of data.sources) {
    try {
      const doc = await readSource(src, dir);
      let hashNote = "";
      if (src.verify === "hash") {
        if (!src.sha256) throw new Error("verify:hash without a recorded sha256");
        if (doc.sha256 !== src.sha256) throw new Error(`document changed since it was read (sha256 ${doc.sha256.slice(0, 12)}…, recorded ${src.sha256.slice(0, 12)}…) — re-read it before importing`);
        hashNote = " · sha256 matches the copy read on research day";
      } else if (src.sha256 && src.sha256 !== doc.sha256) {
        hashNote = " · (file differs from the research copy — evidence decides)";
      }
      docs.set(src.id, doc);
      console.log(`  ✓ ${src.id} — ${src.url}${hashNote}`);
    } catch (e) {
      docs.set(src.id, e as Error);
      console.log(`  ✗ ${src.id} — ${src.url}: ${(e as Error).message}`);
    }
  }

  const srcById = new Map(data.sources.map((s) => [s.id, s]));
  const verified: EntryJson[] = [];
  const failed: { entry: EntryJson; why: string }[] = [];
  for (const e of data.entries) {
    if (only && !only.has(e.exam)) continue;
    const src = srcById.get(e.sourceId);
    const why = (() => {
      if (!src) return `unknown source ${e.sourceId}`;
      if (!KINDS.has(e.kind)) return `unknown kind ${e.kind}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || isoDay(dayDate(e.date)) !== e.date) return `bad date ${e.date}`;
      if (!isOfficialSource(src.url)) return `source host is not an official host: ${src.url}`;
      const doc = docs.get(e.sourceId);
      if (!doc || doc instanceof Error) return `source not read: ${doc instanceof Error ? doc.message : "missing"}`;
      if (src.verify !== "hash" && e.evidence.length === 0) return "no evidence to check on a text source";
      for (const ev of e.evidence) {
        const bad = checkEvidence(doc, ev);
        if (bad) return bad;
      }
      return null;
    })();
    if (why) failed.push({ entry: e, why });
    else verified.push(e);
  }
  console.log(`\nEntries: ${verified.length} verified, ${failed.length} refused.`);
  for (const f of failed) console.log(`  ✗ ${f.entry.exam} ${f.entry.date} ${f.entry.kind} "${f.entry.label}" — ${f.why}`);

  // 2. Plan per exam.
  const codes = [...new Set([...data.entries.map((e) => e.exam), ...data.archive.map((a) => a.exam)])].filter((c) => !only || only.has(c)).sort();
  const exams = await prisma.exam.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, shortName: true, active: true, category: true, state: true, eligibility: { select: { officialUrl: true } } },
  });
  const byCode = new Map(exams.map((x) => [x.code, x]));
  let totalCreate = 0;
  let totalArchive = 0;
  let totalUpdate = 0;
  let totalSkip = 0;
  const conflicts: string[] = [];
  const changedExams: { id: string; code: string; state: string | null }[] = [];

  for (const code of codes) {
    const exam = byCode.get(code);
    if (!exam || !exam.active || exam.category === "SCHOOL_BOARD") {
      console.log(`\n== ${code}: ${exam ? "not a live exam" : "no exam row"} — skipped`);
      continue;
    }
    const officialUrl = exam.eligibility?.officialUrl ?? null;
    const live: LiveRow[] = await prisma.examImportantDate.findMany({
      where: { examId: exam.id, archivedAt: null },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: { id: true, label: true, date: true, kind: true, confidence: true, url: true, source: true, isExamDay: true, notes: true },
    });
    const mine = verified.filter((e) => e.exam === code);
    const allMineKeys = new Set(data.entries.filter((e) => e.exam === code).map((e) => `${e.kind}|${e.date}|${e.label}`));
    const creates: Create[] = [];
    const updates: Update[] = [];
    const archives = new Map<string, Archive>();
    const skipped: string[] = [];
    const addArchive = (row: LiveRow, why: string) => {
      if (!archives.has(row.id)) archives.set(row.id, { row, why });
    };

    // Entries: already imported, already curated, or new.
    for (const e of mine) {
      const url = srcById.get(e.sourceId)!.url;
      const own = live.find((r) => r.source === PROVENANCE && r.kind === e.kind && isoDay(r.date) === e.date && r.label === e.label);
      if (own) {
        if (own.url !== url || own.notes !== e.notes || own.confidence !== "official" || own.isExamDay !== (e.kind === "EXAM")) updates.push({ row: own, entry: e, url });
        continue;
      }
      const curated = live.find(
        (r) =>
          r.source !== PROVENANCE &&
          !isGenerated(r) &&
          r.source !== SUPPRESSED_SOURCE &&
          tierOf(r, officialUrl) === "official" &&
          kindOf(r) === e.kind &&
          isoDay(r.date) === e.date &&
          markersAgree(r.label, e.label),
      );
      if (curated) {
        skipped.push(`${e.date} ${e.kind} "${e.label}" — already on the tracker as a curated official row: "${curated.label}"`);
        continue;
      }
      creates.push({ entry: e, url });
    }

    // Explicit archive list — only when its source was read and checked this run.
    for (const a of data.archive.filter((x) => x.exam === code)) {
      const doc = docs.get(a.sourceId);
      if (!srcById.has(a.sourceId) || !doc || doc instanceof Error) {
        skipped.push(`archive ${a.date} "${a.label}" — held back: its source ${a.sourceId} was not read this run`);
        continue;
      }
      const r = live.find((x) => isoDay(x.date) === a.date && x.label.trim() === a.label.trim());
      if (!r) {
        skipped.push(`archive ${a.date} "${a.label}" — not live (already archived or relabelled)`);
        continue;
      }
      if (r.source === PROVENANCE) {
        skipped.push(`archive ${a.date} "${a.label}" — refused: it is a row of this import`);
        continue;
      }
      if (!isGenerated(r)) {
        skipped.push(`archive ${a.date} "${a.label}" — refused: not a generated row (curated rows are never touched here)`);
        continue;
      }
      addArchive(r, a.reason);
    }

    // Generated rows the official dates answer.
    const imported = mine.map((entry) => ({ entry, est: { kind: entry.kind, tier: "official" as SourceTier, date: dayDate(entry.date), label: entry.label } }));
    for (const r of live.filter(isGenerated)) {
      if (archives.has(r.id)) continue;
      const k = kindOf(r);
      const same = mine.find((e) => e.kind === k && e.date === isoDay(r.date) && markersAgree(r.label, e.label));
      if (same) {
        addArchive(r, `replaced by the official row "${same.label}" (same day, same event)`);
        continue;
      }
      const hit = settledBy(r, imported);
      if (!hit) continue;
      if (tierOf(r, officialUrl) === "official") {
        conflicts.push(`${code}: ${show(r, officialUrl)} vs official ${hit.date} "${hit.label}" — both official, different days; left alone`);
        continue;
      }
      addArchive(r, `superseded by the official row "${hit.label}" (${hit.date}) — supersedingRow`);
    }

    // Earlier rows of this import that the file no longer carries.
    for (const r of live.filter((x) => x.source === PROVENANCE)) {
      if (!allMineKeys.has(`${r.kind}|${isoDay(r.date)}|${r.label}`)) addArchive(r, "row of an earlier import that the data file no longer carries");
    }

    const changes = creates.length + archives.size + updates.length;
    totalCreate += creates.length;
    totalArchive += archives.size;
    totalUpdate += updates.length;
    totalSkip += skipped.length;

    // Print before / after.
    const from = Math.floor(now.getTime() / DAY_MS) - WINDOW_BACK_DAYS;
    const inView = (d: Date) => Math.floor(d.getTime() / DAY_MS) >= from;
    console.log(`\n== ${code} (${exam.shortName}) — officialUrl ${officialUrl ?? "(none)"}${changes ? "" : " — nothing to change"}`);
    const before = live.filter((r) => inView(r.date) || archives.has(r.id));
    console.log(`  BEFORE (${before.length} live rows from ${isoDay(new Date(from * DAY_MS))} on${archives.size ? ", plus rows this run archives" : ""}):`);
    for (const r of before) console.log(`    ${archives.has(r.id) ? "-" : " "} ${show(r, officialUrl)}`);
    if (changes || skipped.length) console.log("  CHANGES:");
    for (const c of creates) console.log(`    + create  ${c.entry.date} ${c.entry.kind} official "${c.entry.label}"  url=${c.url}`);
    for (const u of updates) console.log(`    ~ update  ${u.entry.date} ${u.entry.kind} "${u.entry.label}" (url / notes / flags to the data file's)`);
    for (const a of archives.values()) console.log(`    - archive ${isoDay(a.row.date)} ${kindOf(a.row)} "${a.row.label}" — ${a.why}`);
    for (const s of skipped) console.log(`    · skip    ${s}`);
    if (changes) {
      type ViewRow = { date: Date; kind: string | null; label: string; confidence: string | null; url: string | null; source: string | null; isExamDay: boolean };
      const after: ViewRow[] = [
        ...live.filter((r) => !archives.has(r.id) && inView(r.date)),
        ...creates.map((c) => ({ date: dayDate(c.entry.date), kind: c.entry.kind, label: c.entry.label, confidence: "official", url: c.url, source: PROVENANCE, isExamDay: c.entry.kind === "EXAM" })),
      ].sort((a, b) => a.date.getTime() - b.date.getTime());
      console.log(`  AFTER (${after.length} live rows from ${isoDay(new Date(from * DAY_MS))} on):`);
      for (const r of after) console.log(`      ${show(r, officialUrl)}`);
    }

    if (!apply || !changes) continue;
    await prisma.$transaction(async (tx) => {
      if (archives.size) {
        await tx.examImportantDate.updateMany({ where: { id: { in: [...archives.keys()] }, archivedAt: null }, data: { archivedAt: now } });
      }
      for (const u of updates) {
        await tx.examImportantDate.update({ where: { id: u.row.id }, data: { url: u.url, notes: u.entry.notes, confidence: "official", isExamDay: u.entry.kind === "EXAM" } });
      }
      for (const c of creates) {
        await tx.examImportantDate.create({
          data: {
            examId: exam.id,
            label: c.entry.label,
            date: dayDate(c.entry.date),
            isExamDay: c.entry.kind === "EXAM",
            kind: c.entry.kind,
            confidence: "official",
            url: c.url,
            source: PROVENANCE,
            notes: c.entry.notes,
          },
        });
      }
    });
    changedExams.push({ id: exam.id, code: exam.code, state: exam.state });
    console.log(`  written: ${creates.length} created, ${updates.length} updated, ${archives.size} archived`);
  }

  // 3. Summary.
  console.log(`\nTotal: ${totalCreate} to create, ${totalUpdate} to update, ${totalArchive} to archive, ${totalSkip} skipped, ${failed.length} entries refused.`);
  if (conflicts.length) {
    console.log(`\nCONFLICTS (official generated rows on a different day — not touched, check by hand):`);
    for (const c of conflicts) console.log(`  ! ${c}`);
  }
  if (data.noExamRow?.length && !only) {
    console.log(`\nOfficial dates for exams with no exam row (not written — for the new-exam pages):`);
    for (const n of data.noExamRow) console.log(`  · ${n.body}: ${n.name} — ${n.facts}`);
  }
  if (data.notIncluded?.length && !only) {
    console.log(`\nChecked and left out:`);
    for (const n of data.notIncluded) console.log(`  · ${n}`);
  }
  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }
  if (indexNow && changedExams.length) {
    const urls = changedExams.flatMap((x) => factUrlsForExam(x.code, x.state && x.state in STATES ? stateSlug(x.state) : null));
    const twins = await loadTwinVerdicts(
      changedExams.map((x) => x.id),
      now,
    ).catch(() => []);
    const list = gateTwinUrls([...new Set(urls)], new Map(twins.map((t) => [t.code, t.verdicts])));
    const accepted = await submitIndexNow(list);
    console.log(`\nIndexNow: ${list.length} URLs for ${changedExams.length} exams — ${accepted ? "accepted" : "not accepted (the weekly sitemap submission will carry them)"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
