// scripts/import-official-cutoffs.ts — verify researched cutoff tables
// against the published documents and store the rows that pass
// (13 Sep 2026, reach program #1). Rules: src/lib/official-cutoffs.ts.
//
// Input: a folder of <EXAM_CODE>.json files, each
//   { exam, sources: [{ id, url, title, publisher, publishedOn, kind, localText }], rows: [...], notes }
//
// For every source the script downloads the document again (Node fetch,
// then curl — some government servers refuse Node's TLS client). PDFs are
// read with `pdftotext -layout`; a row whose evidence is not in that text is
// checked once more against pdfplumber's reading of the SAME downloaded
// file (tables whose layout text shifts labels against numbers). Every row
// must pass verifyCutoffRow — evidence in the document, figure beside its
// label, and its column proven — and, for a PDF, verifyPrintedLine: the label
// printed on the figure's own line (layout text can join two rows). Or, when
// the text cannot show the column (an empty cell shifts the figures along the
// line), verifyCutoffRowByGrid against the PDF's own ruled table cells
// (scripts/cutoff-grid.ts), with the quoted line that holds the figure still
// printed in the document. Failures are printed and never written.
//
// Rows that would land in one page table must share a score type (a table
// printing "Percentile Score" and "Normalized Marks" rows becomes two tables,
// named in the stage), and two different figures for one database key are
// both dropped.
//
// Only when a download fails outright does the script check against the
// researcher's saved text; such rows are reported, and written only with
// --allow-saved-copy.
//
// USAGE (from D:\CodexProjects\shishya):
//   npx dotenv-cli -e .env.local -- npx tsx scripts/import-official-cutoffs.ts --dir <folder>           # verify only
//   npx dotenv-cli -e .env.local -- npx tsx scripts/import-official-cutoffs.ts --dir <folder> --apply   # verify + write
//   … --apply --indexnow   # verify + write, then submit the changed pages to IndexNow
//
// --indexnow (26 Sep 2026, G1): opt-in, honoured only with --apply. After the
// writes it submits, for every exam that had rows written, the hub and — when
// the page renders (live ExamRankBand rows; /cutoff 404s without them) — the
// /cutoff page (src/lib/indexnow.ts officialDataUrls), so Bing and ChatGPT
// search pick up a verified cutoff the same day instead of at the weekly
// sitemap re-submission. Without --apply the flag is ignored and nothing is
// sent: a dry run stays a dry run.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "../src/lib/db/prisma";
import {
  asciiDigits,
  canonicalRegion,
  dataLineInDocument,
  indexCutoffSource,
  verifyCutoffRow,
  verifyCutoffRowByGrid,
  verifyPrintedLine,
  type CutoffCandidate,
  type CutoffGrid,
  type CutoffSourceIndex,
  completeStateFragments,
  type CutoffVerdict,
  type GridVerdict,
} from "../src/lib/official-cutoffs";
import { pdfplumberGrid } from "./cutoff-grid";
import { officialDataUrls, submitIndexNow } from "../src/lib/indexnow";

interface SourceJson {
  id: string;
  url: string;
  title?: string;
  publisher?: string;
  publishedOn?: string;
  kind?: string;
  localText?: string;
}
interface ExamJson {
  exam: string;
  sources: SourceJson[];
  rows: (CutoffCandidate & { sourceId: string })[];
  notes?: string;
}
type Via = "download" | "download (pdfplumber)" | "download (grid)" | "saved copy";
interface Extracted {
  via: "download" | "saved copy";
  layout: CutoffSourceIndex;
  pdfFile: string | null;
  plumber?: CutoffSourceIndex | null;
  grid?: CutoffGrid | null;
}
interface Passed {
  row: ExamJson["rows"][number];
  src: SourceJson;
  via: Via;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShishyaCutoffVerifier/1.0 (+https://shishya.in/editorial-policy)";
const PDFTOTEXT = [process.env.PDFTOTEXT, "pdftotext", "C:/Program Files/Git/mingw64/bin/pdftotext.exe"].filter(Boolean) as string[];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function download(url: string, file: string): Promise<Buffer> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60_000), redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(file, buf);
    return buf;
  } catch (fetchErr) {
    try {
      execFileSync("curl", ["-L", "-s", "-f", "--max-time", "120", "-A", UA, "-o", file, url], { stdio: "ignore" });
      return readFileSync(file);
    } catch {
      throw new Error(`download failed (${(fetchErr as Error).message}; curl also failed)`);
    }
  }
}

function pdftotextLayout(file: string): string {
  for (const bin of PDFTOTEXT) {
    try {
      return execFileSync(bin, ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    } catch {
      /* try the next binary */
    }
  }
  throw new Error("pdftotext not available (set PDFTOTEXT)");
}

function pdfplumberText(file: string): string | null {
  const code = "import sys, pdfplumber\nwith pdfplumber.open(sys.argv[1]) as pdf:\n    print('\\n'.join((p.extract_text() or '') for p in pdf.pages))";
  try {
    return execFileSync("python", ["-c", code, file], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      timeout: 45 * 60_000,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
  } catch {
    return null;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|\/p|\/tr|\/div|\/li|\/h\d)[^>]*>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

/** Some portals (MPSC) answer a document URL with JSON that carries the PDF
 *  as base64 (e.g. a `pdfData` field, sometimes as a data: URL). */
function pdfFromJsonEnvelope(buf: Buffer): Buffer | null {
  const first = buf.subarray(0, 1).toString("utf8");
  if (first !== "{" && first !== "[") return null;
  const find = (v: unknown, depth: number): string | null => {
    if (depth > 5 || v == null) return null;
    if (typeof v === "string") {
      const b64 = v.includes("base64,") ? v.slice(v.indexOf("base64,") + 7) : v;
      return b64.startsWith("JVBERi0") ? b64 : null;
    }
    for (const x of Array.isArray(v) ? v : typeof v === "object" ? Object.values(v as Record<string, unknown>) : []) {
      const hit = find(x, depth + 1);
      if (hit) return hit;
    }
    return null;
  };
  try {
    const b64 = find(JSON.parse(buf.toString("utf8")), 0);
    return b64 ? Buffer.from(b64, "base64") : null;
  } catch {
    return null;
  }
}

async function extract(src: SourceJson, work: string): Promise<Extracted> {
  const raw = join(work, `${src.id.replace(/[^\w.-]+/g, "_")}.bin`);
  try {
    let buf = await download(src.url, raw);
    buf = pdfFromJsonEnvelope(buf) ?? buf;
    if (buf.subarray(0, 5).toString("latin1") === "%PDF-") {
      const pdf = raw.replace(/\.bin$/, ".pdf");
      writeFileSync(pdf, buf);
      return { via: "download", layout: indexCutoffSource(pdftotextLayout(pdf)), pdfFile: pdf };
    }
    return { via: "download", layout: indexCutoffSource(htmlToText(buf.toString("utf8"))), pdfFile: null };
  } catch (err) {
    if (src.localText && existsSync(src.localText)) {
      console.log(`    ! ${src.id}: ${(err as Error).message}; checking against the researcher's saved text instead`);
      return { via: "saved copy", layout: indexCutoffSource(readFileSync(src.localText, "utf8")), pdfFile: null };
    }
    throw new Error(`${src.id}: ${(err as Error).message}, and no saved text`);
  }
}

function verify(row: ExamJson["rows"][number], doc: Extracted | undefined): { verdict: GridVerdict; via: Via | null } {
  if (!doc) return { verdict: { ok: false, reasons: ["source not available"] }, via: null };
  const pdfFile = doc.pdfFile;
  const grid = (): CutoffGrid | null => {
    if (doc.grid === undefined && pdfFile) doc.grid = pdfplumberGrid(pdfFile);
    return doc.grid ?? null;
  };
  // A text proof from a PDF also needs the label printed on the figure's line.
  const printed = (v: CutoffVerdict): CutoffVerdict => {
    if (!v.ok || !pdfFile) return v;
    const g = grid();
    return g ? verifyPrintedLine(row, g) : { ok: false, reasons: ["the document's printed lines could not be read"] };
  };

  let verdict = printed(verifyCutoffRow(row, doc.layout));
  if (verdict.ok) return { verdict, via: doc.via };
  if (!pdfFile) return { verdict, via: null };

  const plumber = () => {
    if (doc.plumber === undefined) {
      const text = pdfplumberText(pdfFile);
      doc.plumber = text ? indexCutoffSource(text) : null;
    }
    return doc.plumber;
  };
  if (verdict.reasons.includes("evidence line not found in the source document")) {
    const text = plumber();
    const second = text ? printed(verifyCutoffRow(row, text)) : null;
    if (second?.ok) return { verdict: second, via: "download (pdfplumber)" };
  }
  // A column the text cannot prove: read it off the PDF's ruled cells — for
  // a quoted line (the one holding the figure) the document actually prints.
  const inDocument =
    dataLineInDocument(row, doc.layout) ||
    (() => {
      const text = plumber();
      return text ? dataLineInDocument(row, text) : false;
    })();
  if (!inDocument) return { verdict, via: null };
  const g = grid();
  if (!g) return { verdict, via: null };
  const byGrid = verifyCutoffRowByGrid(row, g);
  if (byGrid.ok) return { verdict: byGrid, via: "download (grid)" };
  verdict = { ok: false, reasons: [...verdict.reasons, ...byGrid.reasons.map((r) => `grid: ${r}`)] };
  return { verdict, via: null };
}

/** One score type per page table (split by naming the type in the stage);
 *  one figure per database key (disagreeing rows are all dropped). */
function settleCollisions(passed: readonly Passed[]): { kept: Passed[]; dropped: string[] } {
  const byTable = new Map<string, Passed[]>();
  for (const p of passed) {
    const k = [p.row.cycle, p.row.stage, p.row.post, p.row.gender, p.src.url].map((s) => (s ?? "").trim()).join("|");
    byTable.set(k, [...(byTable.get(k) ?? []), p]);
  }
  const settled: Passed[] = [];
  for (const group of byTable.values()) {
    const kinds = new Set(group.map((p) => (p.row.scoreType ?? "").trim()));
    for (const p of group) {
      const kind = (p.row.scoreType ?? "").trim();
      settled.push(kinds.size > 1 && kind ? { ...p, row: { ...p.row, stage: `${p.row.stage.trim()} · ${kind}` } } : p);
    }
  }
  const byKey = new Map<string, Passed[]>();
  for (const p of settled) {
    const k = [p.row.cycle, p.row.stage, p.row.post, p.row.region, p.row.gender, p.row.categoryLabel].map((s) => (s ?? "").trim()).join(" | ");
    byKey.set(k, [...(byKey.get(k) ?? []), p]);
  }
  const kept: Passed[] = [];
  const dropped: string[] = [];
  for (const [k, group] of byKey) {
    const figures = [...new Set(group.map((p) => asciiDigits(p.row.marks).trim()))];
    if (figures.length === 1) kept.push(group[0]);
    else dropped.push(`${k} = ${figures.join(" vs ")}`);
  }
  return { kept, dropped };
}

async function main() {
  const dir = arg("--dir");
  const apply = process.argv.includes("--apply");
  const allowSaved = process.argv.includes("--allow-saved-copy");
  // 26 Sep 2026: IndexNow only after real writes — never on a dry run.
  const indexNow = apply && process.argv.includes("--indexnow");
  if (process.argv.includes("--indexnow") && !apply) console.log("--indexnow ignored without --apply (dry run: nothing is written or submitted)");
  const changed: { code: string; examId: string }[] = [];
  if (!dir || !existsSync(dir)) throw new Error("--dir <folder of EXAM_CODE.json files> is required");
  const work = mkdtempSync(join(tmpdir(), "cutoff-verify-"));
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  let passTotal = 0;
  let failTotal = 0;
  let writtenTotal = 0;

  for (const f of files) {
    const data = JSON.parse(readFileSync(join(dir, f), "utf8")) as ExamJson;
    const exam = await prisma.exam.findUnique({ where: { code: data.exam }, select: { id: true } });
    console.log(`\n== ${data.exam}: ${data.rows?.length ?? 0} candidate rows, ${data.sources?.length ?? 0} sources`);
    if (!exam) {
      console.log("   x unknown exam code — skipped");
      continue;
    }
    const docs = new Map<string, Extracted>();
    for (const s of data.sources ?? []) {
      if (!/^https:\/\//.test(s.url)) {
        console.log(`   x ${s.id}: not an https URL — its rows will fail`);
        continue;
      }
      try {
        docs.set(s.id, await extract(s, work));
      } catch (err) {
        console.log(`   x ${(err as Error).message}`);
      }
    }

    const passed: Passed[] = [];
    for (const row of data.rows ?? []) {
      const src = data.sources.find((s) => s.id === row.sourceId);
      const { verdict, via } = verify(row, src ? docs.get(src.id) : undefined);
      const label = [row.cycle, row.stage, row.post, row.region, row.gender, row.categoryLabel].filter(Boolean).join(" · ");
      if (verdict.ok && src && via) {
        // A state / UT in one spelling — read from the printed region cell when
        // the grid proof matched one ("Andhra" in the research, "Andhra Pradesh" on the page).
        const region = canonicalRegion(verdict.regionCell ?? "") ?? canonicalRegion(row.region ?? "") ?? (row.region ?? "").trim();
        passed.push({ row: { ...row, region }, src, via });
      } else {
        failTotal++;
        console.log(`   FAIL ${label} = ${row.marks}: ${verdict.reasons.join("; ")}`);
      }
    }
    // A wrapped state cell can reach the grid as its first line only ("Madhya", "Chhattisga";
    // 46 SSC GD rows on 14 Sep 2026). Complete it per document, and only in a state-wise one.
    const bySource = new Map<string, Passed[]>();
    for (const p of passed) {
      const list = bySource.get(p.src.id) ?? [];
      list.push(p);
      bySource.set(p.src.id, list);
    }
    for (const group of bySource.values()) {
      for (const [from, to] of completeStateFragments(group.map((p) => p.row.region ?? ""))) {
        const hits = group.filter((p) => (p.row.region ?? "").trim() === from);
        for (const p of hits) p.row = { ...p.row, region: to };
        console.log(`   region "${from}" completed to "${to}" (${hits.length} rows, source ${group[0].src.id})`);
      }
    }
    const { kept, dropped } = settleCollisions(passed);
    for (const d of dropped) console.log(`   DROP two figures for one key: ${d}`);
    failTotal += passed.length - kept.length;
    passTotal += kept.length;
    const byVia = kept.reduce<Record<string, number>>((m, p) => ((m[p.via] = (m[p.via] ?? 0) + 1), m), {});
    console.log(`   pass ${kept.length} / ${data.rows?.length ?? 0} ${JSON.stringify(byVia)}${dropped.length ? ` (${dropped.length} keys dropped)` : ""}`);

    if (!apply) continue;
    let written = 0;
    for (const { row, src, via } of kept) {
      if (via === "saved copy" && !allowSaved) continue;
      const publishedOn = /^\d{4}-\d{2}-\d{2}$/.test(src.publishedOn ?? "") ? new Date(`${src.publishedOn}T00:00:00Z`) : null;
      await prisma.$executeRaw`
        INSERT INTO "OfficialCutoff" (id, "examId", cycle, stage, post, region, gender, category, "categoryLabel", marks,
          "maxMarks", "scoreType", "sourceUrl", "sourceTitle", publisher, "publishedOn", evidence, "verifiedAt", "createdAt")
        VALUES (${crypto.randomUUID()}, ${exam.id}, ${row.cycle.trim()}, ${row.stage.trim()}, ${(row.post ?? "").trim()},
          ${(row.region ?? "").trim()}, ${(row.gender ?? "").trim()}, ${row.category}, ${row.categoryLabel.trim()},
          ${asciiDigits(row.marks).trim()}, ${asciiDigits(row.maxMarks ?? "").trim()}, ${(row.scoreType ?? "").trim()},
          ${src.url}, ${(src.title ?? "").trim()}, ${(src.publisher ?? "").trim()}, ${publishedOn}, ${row.evidence}, NOW(), NOW())
        ON CONFLICT ("examId", cycle, stage, post, region, gender, "categoryLabel") DO UPDATE SET
          category = EXCLUDED.category, marks = EXCLUDED.marks, "maxMarks" = EXCLUDED."maxMarks",
          "scoreType" = EXCLUDED."scoreType", "sourceUrl" = EXCLUDED."sourceUrl", "sourceTitle" = EXCLUDED."sourceTitle",
          publisher = EXCLUDED.publisher, "publishedOn" = EXCLUDED."publishedOn", evidence = EXCLUDED.evidence,
          "verifiedAt" = NOW(), "archivedAt" = NULL`;
      written++;
    }
    writtenTotal += written;
    console.log(`   wrote ${written} rows`);
    if (written > 0) changed.push({ code: data.exam, examId: exam.id });
  }

  if (indexNow && changed.length > 0) {
    const urls: string[] = [];
    for (const c of changed) {
      const bands = await prisma.$queryRaw<{ n: number }[]>`
        SELECT COUNT(*)::int AS n FROM "ExamRankBand" WHERE "examId" = ${c.examId} AND "archivedAt" IS NULL`;
      urls.push(...officialDataUrls(c.code, { cutoff: Number(bands[0]?.n ?? 0) > 0 }));
    }
    const list = [...new Set(urls)];
    const accepted = await submitIndexNow(list);
    console.log(`\nIndexNow: ${list.length} URLs for ${changed.length} exams — ${accepted ? "accepted" : "not accepted (the weekly sitemap submission will carry them)"}`);
    for (const u of list) console.log(`   ${u}`);
  }

  console.log(
    `\nTOTAL: ${passTotal} rows pass, ${failTotal} fail${apply ? `; ${writtenTotal} written` : " (dry run — nothing written; add --apply)"}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
