// scripts/scanned-cutoff-read.ts — the second, blind reading of a scanned
// official PDF (27 Sep 2026). Used by scripts/import-official-cutoffs.ts
// --scanned-reviewed; the rules it feeds are in src/lib/scanned-cutoff.ts.
//
// For one downloaded PDF (the importer's own download):
//   1. confirm it has NO text layer (pdftotext and pdfium both find nothing)
//      — a PDF with text goes through the importer's normal checks instead;
//   2. render its first SCANNED_READ_MAX_PAGES pages to PNG at ~200 dpi
//      (scripts/render-pdf-pages.py, pypdfium2) into the run's work folder;
//      a page sent to the model is first copied beside the journal (never
//      over an earlier image), so a person can hand-check a row against the
//      very image that was read — a later run or --apply never overwrites it;
//   3. send each page, alone, to SCANNED_READ_MODEL with SCANNED_READ_PROMPT —
//      which never carries the researcher's figures or labels;
//   4. journal every reply (raw text, usage, cost) under
//      D:/CodexProjects/shishya-data/scanned-cutoff-reads/<EXAM>-<sha8>.json,
//      page by page, so a stopped run resumes and --apply re-uses the
//      readings the dry run paid for. An --apply run NEVER calls the model:
//      a page the journal lacks stays unread and its rows fail.
//
// Spend: every call is checked against the run-wide cap BEFORE it is made,
// at its worst case (image at the high-resolution maximum, every output token
// used); actual cost is added from the reply's usage. The cap is
// SCANNED_READ_MAX_USD ($2) and --max-usd can only lower it. Nothing is
// written to the database (no AiUsage ledger row): the journal is the record.
//
// A reply is used only if it came from SCANNED_READ_MODEL (or a dated
// snapshot of it) and ended with end_turn; anything else is a page problem.
//
// Key: ANTHROPIC_BULK_API_KEY when set (standing rule since 15 Sep 2026 —
// scripts do not run on the tutor's key), else ANTHROPIC_API_KEY. Both draw on
// one org balance, so a "credit balance" error stops the run at once and says
// that the tutor may be down too.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  parseScannedReading,
  readCostUsd,
  SCANNED_READ_MAX_PAGES,
  SCANNED_READ_MAX_TOKENS,
  SCANNED_READ_MAX_USD,
  SCANNED_READ_MODEL,
  SCANNED_READ_PROMPT,
  SCANNED_READ_PROMPT_VERSION,
  withinCap,
  worstCaseReadUsd,
  type ReadUsage,
  type ScannedPageReading,
} from "../src/lib/scanned-cutoff";

export const SCANNED_JOURNAL_DIR = process.env.SCANNED_CUTOFF_READS_DIR ?? "D:/CodexProjects/shishya-data/scanned-cutoff-reads";
const RENDER_SCRIPT = resolve(process.cwd(), "scripts/render-pdf-pages.py");
const TARGET_DPI = 200;

export interface JournalPage {
  page: number;
  imageFile: string;
  imageSha256: string;
  width: number;
  height: number;
  dpi: number;
  readAt: string;
  model: string;
  stopReason: string | null;
  usage: ReadUsage;
  costUsd: number;
  text: string;
}
export interface ScanJournal {
  version: 1;
  exam: string;
  sourceId: string;
  url: string;
  sha256: string;
  bytes: number;
  pageCount: number;
  textLayerChars: number;
  model: string;
  promptVersion: string;
  prompt: string;
  maxTokens: number;
  pages: JournalPage[];
  costUsd: number;
  createdAt: string;
  updatedAt: string;
}

/** Shared across every source of one importer run. */
export interface SpendState {
  capUsd: number;
  spentUsd: number;
  calls: number;
}

export function newSpendState(maxUsdArg?: string): SpendState {
  const asked = maxUsdArg === undefined ? SCANNED_READ_MAX_USD : Number(maxUsdArg);
  if (!Number.isFinite(asked) || asked <= 0) throw new Error(`--max-usd "${maxUsdArg}" is not a positive number`);
  return { capUsd: Math.min(asked, SCANNED_READ_MAX_USD), spentUsd: 0, calls: 0 };
}

export interface ScannedRead {
  ok: boolean;
  /** Why the scanned path does not apply / could not read (ok false). */
  problem?: string;
  /** The PDF has a text layer: the caller uses its normal checks instead. */
  hasTextLayer?: boolean;
  sha256: string;
  pageCount: number;
  pagesRead: number[];
  journalFile: string;
  readings: ScannedPageReading[];
  /** Pages whose reply could not be used, with why. */
  pageProblems: string[];
  /** New spend for this source in this run. */
  costUsd: number;
  reusedPages: number;
}

class SpendCapError extends Error {}
export class BillingStopError extends Error {}

function saveJournal(file: string, j: ScanJournal): void {
  j.updatedAt = new Date().toISOString();
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(j, null, 1));
  renameSync(tmp, file);
}

function renderPages(pdfFile: string, outDir: string): { pageCount: number; pages: { page: number; file: string; width: number; height: number; dpi: number; textChars: number; sha256: string }[] } {
  const out = execFileSync("python", [RENDER_SCRIPT, pdfFile, outDir, "--dpi", String(TARGET_DPI), "--max-pages", String(SCANNED_READ_MAX_PAGES)], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 10 * 60_000,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  return JSON.parse(out.trim().split(/\r?\n/).pop() ?? "{}");
}

/** The key the second reading uses (the bulk key when set; never printed). */
export const visionKeyName = () => (process.env.ANTHROPIC_BULK_API_KEY ? "ANTHROPIC_BULK_API_KEY" : "ANTHROPIC_API_KEY");

let client: Anthropic | null = null;
function visionClient(): Anthropic {
  const key = process.env[visionKeyName()];
  if (!key) throw new Error("neither ANTHROPIC_BULK_API_KEY nor ANTHROPIC_API_KEY is set (run with --env-file=.env.local)");
  client ??= new Anthropic({ apiKey: key, maxRetries: 2, timeout: 5 * 60_000 });
  return client;
}

async function readPage(imageFile: string): Promise<{ text: string; model: string; stopReason: string | null; usage: ReadUsage }> {
  const c = visionClient();
  const data = readFileSync(imageFile).toString("base64");
  try {
    const m = await c.messages.create({
      model: SCANNED_READ_MODEL,
      max_tokens: SCANNED_READ_MAX_TOKENS,
      // A transcription, not a reasoning task: no thinking tokens, so the
      // output ceiling bounds the spend exactly.
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data } },
            { type: "text", text: SCANNED_READ_PROMPT },
          ],
        },
      ],
    });
    const text = m.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return {
      text,
      model: m.model,
      stopReason: m.stop_reason ?? null,
      usage: {
        input_tokens: m.usage.input_tokens,
        output_tokens: m.usage.output_tokens,
        cache_creation_input_tokens: m.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: m.usage.cache_read_input_tokens ?? 0,
      },
    };
  } catch (e) {
    const err = e as { status?: number; message?: string; error?: { error?: { type?: string; message?: string } } };
    const detail = `${err.error?.error?.type ?? "error"}: ${(err.error?.error?.message ?? err.message ?? String(e)).split("\n")[0].slice(0, 200)}`;
    if (/credit balance|billing|usage limits/i.test(detail)) {
      throw new BillingStopError(`the API refused on billing (${detail}) — the tutor's key shares this balance, so production AI may be down too: tell the founder`);
    }
    throw new Error(`vision call failed (HTTP ${err.status ?? "?"}, ${detail})`);
  }
}

/**
 * Read one downloaded scanned PDF. `apply` = never call the model (journal only).
 */
export async function readScannedPdf(opts: {
  exam: string;
  sourceId: string;
  url: string;
  pdfFile: string;
  pdfBytes: Buffer;
  pdftotextText: string;
  apply: boolean;
  spend: SpendState;
  log: (line: string) => void;
}): Promise<ScannedRead> {
  const { exam, sourceId, url, pdfFile, pdfBytes, apply, spend, log } = opts;
  const sha256 = createHash("sha256").update(pdfBytes).digest("hex");
  const base = `${exam}-${sha256.slice(0, 8)}`;
  mkdirSync(SCANNED_JOURNAL_DIR, { recursive: true });
  const journalFile = join(SCANNED_JOURNAL_DIR, `${base}.json`);
  const empty = (problem: string, extra: Partial<ScannedRead> = {}): ScannedRead => ({
    ok: false,
    problem,
    sha256,
    pageCount: 0,
    pagesRead: [],
    journalFile,
    readings: [],
    pageProblems: [],
    costUsd: 0,
    reusedPages: 0,
    ...extra,
  });

  const textLayerChars = (opts.pdftotextText ?? "").replace(/\s+/g, "").length;
  if (textLayerChars > 0) return empty(`the PDF has a text layer (${textLayerChars} characters) — not scan-only`, { hasTextLayer: true });

  // Kept images live beside the journal; this run renders into its own work
  // folder, so re-rendering never replaces an image a journal entry names.
  const imageDir = join(SCANNED_JOURNAL_DIR, base);
  const rendered = renderPages(pdfFile, join(dirname(pdfFile), `${base}-pages`));
  const pdfiumChars = rendered.pages.reduce((n, p) => n + (p.textChars ?? 0), 0);
  if (pdfiumChars > 0) return empty(`pdfium finds a text layer (${pdfiumChars} characters) — not scan-only`, { hasTextLayer: true, pageCount: rendered.pageCount });
  log(
    `    scan ${sourceId}: sha256 ${sha256}, ${pdfBytes.length} bytes, ${rendered.pageCount} page(s), no text layer (pdftotext 0, pdfium 0); ` +
      `reading pages 1-${rendered.pages.length} at ~${rendered.pages[0]?.dpi ?? TARGET_DPI} dpi`,
  );

  let journal: ScanJournal | null = null;
  if (existsSync(journalFile)) {
    const old = JSON.parse(readFileSync(journalFile, "utf8")) as ScanJournal;
    if (old.sha256 !== sha256) throw new Error(`${journalFile} belongs to another file (sha ${old.sha256})`);
    // Re-used only when read by this model with this exact prompt text — an
    // edited prompt that kept its version string is not this rule's reading.
    const sameRead = old.promptVersion === SCANNED_READ_PROMPT_VERSION && old.model === SCANNED_READ_MODEL && old.prompt === SCANNED_READ_PROMPT;
    if (sameRead) journal = old;
    else if (apply) {
      // --apply never pays: a journal read another way is not this rule's reading.
      return empty(`the journal was read with ${old.model} / ${old.promptVersion}${old.prompt === SCANNED_READ_PROMPT ? "" : " (different prompt text)"}, not ${SCANNED_READ_MODEL} / ${SCANNED_READ_PROMPT_VERSION}; run the dry run first`, {
        pageCount: rendered.pageCount,
      });
    } else {
      // Archived, never deleted: the old reading stays on disk beside the new one.
      let archived = journalFile.replace(/\.json$/, `.${old.promptVersion}.json`);
      if (existsSync(archived)) archived = archived.replace(/\.json$/, `.${Date.now()}.json`);
      renameSync(journalFile, archived);
      log(`    journal read with ${old.model} / ${old.promptVersion} archived to ${archived}; reading again with ${SCANNED_READ_PROMPT_VERSION}`);
    }
  }
  if (!journal) {
    const now = new Date().toISOString();
    journal = {
      version: 1,
      exam,
      sourceId,
      url,
      sha256,
      bytes: pdfBytes.length,
      pageCount: rendered.pageCount,
      textLayerChars: 0,
      model: SCANNED_READ_MODEL,
      promptVersion: SCANNED_READ_PROMPT_VERSION,
      prompt: SCANNED_READ_PROMPT,
      maxTokens: SCANNED_READ_MAX_TOKENS,
      pages: [],
      costUsd: 0,
      createdAt: now,
      updatedAt: now,
    };
  }
  const j: ScanJournal = journal;

  let costUsd = 0;
  let reusedPages = 0;
  const pageProblems: string[] = [];
  const worst = worstCaseReadUsd(SCANNED_READ_PROMPT.length);
  for (const p of rendered.pages) {
    // The journal belongs to this exact PDF (sha256 above), so a page it
    // holds is re-used even if this machine renders it to different bytes.
    const done = j.pages.find((x) => x.page === p.page);
    if (done) {
      if (done.imageSha256 !== p.sha256) log(`    ! page ${p.page} renders differently now (image sha changed); the journal's reading is re-used`);
      reusedPages++;
      continue;
    }
    if (apply) {
      pageProblems.push(`page ${p.page}: not in the journal — --apply never calls the model; run the dry run first`);
      continue;
    }
    if (!withinCap(spend.spentUsd, worst, spend.capUsd)) {
      saveJournal(journalFile, j);
      throw new SpendCapError(
        `spend cap: $${spend.spentUsd.toFixed(4)} spent this run; the next page's worst case ($${worst.toFixed(4)}) would pass the $${spend.capUsd} cap. ` +
          `Stopped before page ${p.page} of ${sourceId}; the journal keeps every page read so far (${journalFile}) — rerun to continue.`,
      );
    }
    mkdirSync(imageDir, { recursive: true });
    let kept = join(imageDir, `page-${p.page}.png`);
    if (existsSync(kept) && createHash("sha256").update(readFileSync(kept)).digest("hex") !== p.sha256) {
      kept = join(imageDir, `page-${p.page}-${p.sha256.slice(0, 8)}.png`);
    }
    copyFileSync(p.file, kept);
    const reply = await readPage(kept);
    const cost = readCostUsd(reply.usage);
    spend.spentUsd += cost;
    spend.calls++;
    costUsd += cost;
    j.pages = j.pages.filter((x) => x.page !== p.page);
    j.pages.push({
      page: p.page,
      imageFile: kept,
      imageSha256: p.sha256,
      width: p.width,
      height: p.height,
      dpi: p.dpi,
      readAt: new Date().toISOString(),
      model: reply.model,
      stopReason: reply.stopReason,
      usage: reply.usage,
      costUsd: cost,
      text: reply.text,
    });
    j.pages.sort((a, b) => a.page - b.page);
    j.costUsd = j.pages.reduce((s, x) => s + x.costUsd, 0);
    saveJournal(journalFile, j);
    log(
      `    read page ${p.page}: ${reply.model}, ${reply.usage.input_tokens} in / ${reply.usage.output_tokens} out, $${cost.toFixed(4)} ` +
        `(run total $${spend.spentUsd.toFixed(4)} of $${spend.capUsd})${reply.stopReason === "end_turn" ? "" : ` — stop_reason ${reply.stopReason}`}`,
    );
    if (spend.spentUsd > spend.capUsd) {
      throw new SpendCapError(`spend cap exceeded: $${spend.spentUsd.toFixed(4)} > $${spend.capUsd}; stopped (journal ${journalFile})`);
    }
  }
  if (!existsSync(journalFile) && !apply) saveJournal(journalFile, j);

  const readings: ScannedPageReading[] = [];
  const pagesRead: number[] = [];
  for (const p of rendered.pages) {
    const jp = j.pages.find((x) => x.page === p.page);
    if (!jp) continue;
    // Only this rule's reader, and only a reply that finished, counts.
    const snapshot = jp.model.startsWith(`${SCANNED_READ_MODEL}-`) && /^\d{8}$/.test(jp.model.slice(SCANNED_READ_MODEL.length + 1));
    if (jp.model !== SCANNED_READ_MODEL && !snapshot) {
      pageProblems.push(`page ${p.page}: read by ${jp.model}, not ${SCANNED_READ_MODEL} — not used`);
      continue;
    }
    if (jp.stopReason !== "end_turn") {
      pageProblems.push(`page ${p.page}: the reply ended with ${jp.stopReason ?? "no stop reason"}, not end_turn — not used`);
      continue;
    }
    const parsed = parseScannedReading(p.page, jp.text);
    if (parsed.ok) {
      readings.push(parsed.reading);
      pagesRead.push(p.page);
    } else pageProblems.push(`page ${p.page}: ${parsed.reason}${jp.stopReason && jp.stopReason !== "end_turn" ? ` (stop_reason ${jp.stopReason})` : ""}`);
  }
  return { ok: true, sha256, pageCount: rendered.pageCount, pagesRead, journalFile, readings, pageProblems, costUsd, reusedPages };
}

export { SpendCapError };
