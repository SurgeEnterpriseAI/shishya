// scripts/import-official-papers.ts
//
// Official previous-year papers (14 Sep 2026). Re-verifies the researchers'
// JSON (one <EXAM_CODE>.json per exam) and stores what passes in
// "OfficialPaper"; the rules live in src/lib/official-papers.ts. Dry run by
// default — prints PASS / FAIL per file. --apply writes.
//
// A file passes only when all of these hold, checked now rather than taken
// from the research:
//   1. official: the file's host and its listing page's host are an Indian
//      government / public academic domain, or the exam's own portal domain;
//   2. it downloads and starts with %PDF;
//   3. its year is confirmed: printed beside the link on the listing page (its
//      row or item, or the heading of its short list), on page 1 of a PDF with
//      a text layer, in a year-specific official host (gate2026.iitg.ac.in), or
//      in a recorded browser check of the official listing (--browser-checked,
//      for listings built by JavaScript that plain HTML never shows). A year is
//      never taken from the research alone.
// Listing pages (--listings <file.json>): bodies that list their papers but
// serve the files only through that page (session-bound links). A listing
// passes when it is official, answers, and names the papers — in its HTML,
// or, for a page built by JavaScript, in a recorded browser check.
//
// Run:
//   npx dotenv-cli -e .env.local -- npx tsx scripts/import-official-papers.ts \
//     --dir D:/CodexProjects/shishya-data/official-papers/research-2026-09-14 [--dir <more>] \
//     [--listings D:/CodexProjects/shishya-data/official-papers/listing-pages-2026-09-14.json] \
//     [--rejected D:/CodexProjects/shishya-data/official-papers/hand-check-rejected.json] \
//     [--browser-checked D:/CodexProjects/shishya-data/official-papers/browser-checked-2026-09-14.json] \
//     [--only EXAM_CODE[,EXAM_CODE…]] [--apply] [--indexnow]
// --indexnow (26 Sep 2026, G1): opt-in, honoured only with --apply. After the
// writes it submits each changed exam's hub (the official-papers block) and
// every /pyq/{year} the written papers name that is indexable — a year with
// validated PYQ questions; an official-paper-only year renders
// noindex,follow and is never submitted (src/lib/indexnow.ts
// officialDataUrls). Without --apply nothing is written or submitted.
// --browser-checked: [{ "url", "year", "listingUrl", "evidence", "checkedAt" }], one entry per file whose
// official listing was read in a browser: the link and the year printed with it.
// --rejected: files a person rejected in the hand check before --apply (the
// checks above cannot tell, say, the 68th from the 69th exam of the same
// year): [{ "url": "...", "reason": "..." }]. They are skipped, never written,
// and archived if an earlier run stored them.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { asciiDigits, checkListing, hostOf, isOfficialHost, paperYear, yearPrinted } from "../src/lib/official-papers";
import { officialDataUrls, submitIndexNow } from "../src/lib/indexnow";

const prisma = new PrismaClient();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShishyaPaperVerifier/1.0 (+https://shishya.in/editorial-policy)";
const MAX_BYTES = 80_000_000;
const FILE_KINDS = new Set(["question paper", "question paper with answer key", "answer key"]);

interface PaperJson {
  year: string;
  paper: string;
  kind: string;
  language?: string;
  url: string;
  listingUrl: string;
  publisher: string;
}
interface ExamJson {
  exam: string;
  papers?: PaperJson[];
}
interface ListingJson {
  exam: string;
  url: string;
  paper: string;
  publisher: string;
  keywords?: string[];
  handChecked?: string;
}
interface Passed {
  examId: string;
  code: string;
  year: string;
  paper: string;
  kind: string;
  language: string;
  url: string;
  listingUrl: string;
  publisher: string;
  bytes: number;
  pages: number;
  scan: boolean;
  yearEvidence: string;
}

function argValues(name: string): string[] {
  const out: string[] = [];
  process.argv.forEach((a, i) => {
    if (a === name && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
}

async function fetchBuffer(url: string, file: string): Promise<Buffer> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(90_000), redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("larger than 80 MB");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error("larger than 80 MB");
    return buf;
  } catch (fetchErr) {
    // Some government servers refuse Node's TLS client, and some firewalls
    // (upsc.gov.in answers 403) refuse a user agent they don't know. curl gets
    // through: first under our own name, then under curl's default one.
    for (const agent of [["-A", UA], []]) {
      try {
        execFileSync("curl", ["-L", "-s", "-f", "--max-time", "150", "--max-filesize", String(MAX_BYTES), ...agent, "-o", file, url], {
          stdio: "ignore",
        });
        return readFileSync(file);
      } catch {
        /* next attempt */
      }
    }
    throw new Error(`download failed (${(fetchErr as Error).message}; curl also failed)`);
  }
}

/** A file over the download cap (MPESB publishes every shift in one 241 MB PDF): read only its first
 *  64 KB to confirm it is a PDF, and its full size from the server. No page-1 text, so its year must
 *  come from the listing. */
async function probeLargePdf(url: string, file: string): Promise<{ head: Buffer; size: number }> {
  const sizeFrom = (contentRange: string | null, contentLength: string | null) =>
    Number((contentRange ?? "").split("/")[1] ?? 0) || Number(contentLength ?? 0);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, range: "bytes=0-65535" },
      signal: AbortSignal.timeout(90_000),
      redirect: "follow",
    });
    if (res.status !== 206 && res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const size = sizeFrom(res.headers.get("content-range"), res.status === 200 ? res.headers.get("content-length") : null);
    const reader = res.body?.getReader();
    const chunks: Buffer[] = [];
    let got = 0;
    while (reader && got < 65536) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
      got += value.length;
    }
    await reader?.cancel().catch(() => {});
    return { head: Buffer.concat(chunks).subarray(0, 65536), size };
  } catch (fetchErr) {
    const hdr = `${file}.headers`;
    try {
      execFileSync("curl", ["-L", "-s", "-f", "--max-time", "90", "-A", UA, "-r", "0-65535", "-D", hdr, "-o", file, url], { stdio: "ignore" });
      const headers = readFileSync(hdr, "utf8");
      const size = sizeFrom((headers.match(/^content-range:\s*(.+)$/im) ?? [])[1] ?? null, null);
      return { head: readFileSync(file).subarray(0, 65536), size };
    } catch {
      throw new Error(`large-file check failed (${(fetchErr as Error).message}; curl also failed)`);
    }
  }
}

function page1Text(file: string): string {
  try {
    return execFileSync("pdftotext", ["-l", "1", "-layout", file, "-"], { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

function pageCount(file: string): number {
  try {
    const out = execFileSync("python", ["-c", "import sys, pypdf; print(len(pypdf.PdfReader(sys.argv[1]).pages))", file], {
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return Number(out.trim()) || 0;
  } catch {
    return 0;
  }
}

/** ~120 characters of text around the first printing of the year. */
function around(text: string, year: string): string {
  const flat = asciiDigits(text).replace(/\s+/g, " ");
  const i = flat.search(new RegExp(`(?<!\\d)${year}(?!\\d)`));
  return i === -1 ? "" : flat.slice(Math.max(0, i - 60), i + 60).trim();
}

async function ensureTable() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "OfficialPaper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "paper" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "listingUrl" TEXT NOT NULL DEFAULT '',
    "publisher" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "scan" BOOLEAN NOT NULL DEFAULT false,
    "yearEvidence" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3)
  )`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OfficialPaper_examId_url_key" ON "OfficialPaper"("examId", "url")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "OfficialPaper_examId_archivedAt_idx" ON "OfficialPaper"("examId", "archivedAt")`);
}

async function main() {
  const dirs = argValues("--dir");
  const listingsFile = argValues("--listings")[0];
  const rejectedFile = argValues("--rejected")[0];
  const onlyArg = argValues("--only")[0];
  const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim()).filter(Boolean)) : null;
  const apply = process.argv.includes("--apply");
  // 26 Sep 2026: IndexNow only after real writes — never on a dry run.
  const indexNow = apply && process.argv.includes("--indexnow");
  if (process.argv.includes("--indexnow") && !apply) console.log("--indexnow ignored without --apply (dry run: nothing is written or submitted)");
  if (dirs.length === 0 && !listingsFile) throw new Error("--dir <research folder> (repeatable) and/or --listings <file.json> is required");
  const rejected = new Map<string, string>(
    rejectedFile
      ? (JSON.parse(readFileSync(rejectedFile, "utf8")) as { url: string; reason: string }[]).map((r) => [r.url, r.reason])
      : [],
  );
  interface BrowserCheck {
    url: string;
    year: string;
    listingUrl: string;
    evidence: string;
    checkedAt: string;
  }
  const browserCheckedFile = argValues("--browser-checked")[0];
  const browserChecked = new Map<string, BrowserCheck>(
    browserCheckedFile ? (JSON.parse(readFileSync(browserCheckedFile, "utf8")) as BrowserCheck[]).map((b) => [b.url, b]) : [],
  );

  const work = mkdtempSync(join(tmpdir(), "papers-verify-"));
  const passed: Passed[] = [];
  let failed = 0;
  let tmpN = 0;

  const exams = new Map<string, { id: string; portalHost: string | null } | null>();
  async function examOf(code: string) {
    if (!exams.has(code)) {
      const exam = await prisma.exam.findUnique({ where: { code }, select: { id: true } });
      let portalHost: string | null = null;
      if (exam) {
        const elig = await prisma.$queryRaw<{ officialUrl: string | null }[]>`
          SELECT "officialUrl" FROM "ExamEligibility" WHERE "examId" = ${exam.id} LIMIT 1`;
        portalHost = elig[0]?.officialUrl ? hostOf(elig[0].officialUrl) : null;
      }
      exams.set(code, exam ? { id: exam.id, portalHost } : null);
    }
    return exams.get(code) ?? null;
  }

  const listings = new Map<string, string | null>();
  const refetched = new Set<string>();
  async function listingHtml(url: string): Promise<string | null> {
    if (!listings.has(url)) {
      try {
        listings.set(url, (await fetchBuffer(url, join(work, `listing-${tmpN++}.html`))).toString("utf8"));
      } catch {
        listings.set(url, null);
      }
    }
    return listings.get(url) ?? null;
  }

  for (const dir of dirs) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
      const data = JSON.parse(readFileSync(join(dir, f), "utf8")) as ExamJson;
      if (only && !only.has(data.exam)) continue;
      const papers = data.papers ?? [];
      if (papers.length === 0) continue;
      console.log(`\n== ${data.exam}: ${papers.length} files (${f})`);
      const exam = await examOf(data.exam);
      if (!exam) {
        console.log("   x not a Shishya exam code: skipped");
        failed += papers.length;
        continue;
      }
      const seen = new Set<string>();
      for (const p of papers) {
        if (seen.has(p.url)) continue;
        seen.add(p.url);
        const label = `${p.year} · ${p.kind} · ${p.paper}`.replace(/\s+/g, " ").slice(0, 110);
        if (rejected.has(p.url)) {
          failed++;
          console.log(`   SKIP ${label}: rejected in the hand check (${rejected.get(p.url)})`);
          continue;
        }
        const reasons: string[] = [];
        const year = paperYear(p.year ?? "");
        if (!FILE_KINDS.has(p.kind)) reasons.push(`unknown kind "${p.kind}"`);
        if (!year) reasons.push(`no year in "${p.year}"`);
        if (!p.publisher?.trim()) reasons.push("no publisher");
        const fileHost = hostOf(p.url);
        const listingHost = hostOf(p.listingUrl ?? "");
        if (!isOfficialHost(fileHost, exam.portalHost)) reasons.push(`file host not official (${fileHost ?? "bad URL"})`);
        if (!isOfficialHost(listingHost, exam.portalHost)) reasons.push(`listing host not official (${listingHost ?? "bad URL"})`);
        if (reasons.length) {
          failed++;
          console.log(`   FAIL ${label}: ${reasons.join("; ")}`);
          continue;
        }

        let listingUsed = p.listingUrl;
        let html = await listingHtml(p.listingUrl);
        if (html === null && listingHost?.startsWith("www.")) {
          // A www host whose certificate names only the bare domain (www.hssc.gov.in): read the page there.
          const bareUrl = p.listingUrl.replace(`//${listingHost}`, `//${listingHost.slice(4)}`);
          const bareHtml = await listingHtml(bareUrl);
          if (bareHtml !== null) {
            listingUsed = bareUrl;
            html = bareHtml;
          }
        }
        let listing = html ? checkListing(html, p.url, p.year) : { linked: false, yearBeside: false, evidence: "", context: "" };
        if (!listing.linked && html && !refetched.has(listingUsed)) {
          // A large listing (RPSC's is 1.7 MB) can come back without rows it printed
          // minutes earlier: read it once more before calling a file unlinked.
          refetched.add(listingUsed);
          listings.delete(listingUsed);
          const again = await listingHtml(listingUsed);
          if (again === null) listings.set(listingUsed, html);
          const retry = again ? checkListing(again, p.url, p.year) : null;
          if (retry?.linked) {
            html = again;
            listing = retry;
          }
        }
        if (!listing.linked && listingHost && !listingHost.startsWith("www.")) {
          // A bare host can redirect to its www homepage and drop the path (upsc.gov.in
          // does): read the listing on the www host before calling the file unlinked.
          const wwwUrl = p.listingUrl.replace(`//${listingHost}`, `//www.${listingHost}`);
          const wwwHtml = await listingHtml(wwwUrl);
          const retry = wwwHtml ? checkListing(wwwHtml, p.url, p.year) : null;
          if (retry?.linked) {
            listingUsed = wwwUrl;
            html = wwwHtml;
            listing = retry;
          }
        }
        const file = join(work, `paper-${tmpN++}.pdf`);
        let fileUrlUsed = p.url;
        let buf = null as Buffer | null;
        let largeSize = 0;
        let large = false;
        const download = async (url: string): Promise<string> => {
          try {
            buf = await fetchBuffer(url, file);
            return "";
          } catch (err) {
            const message = (err as Error).message;
            // A file over the cap can also fail as a timeout or a refused transfer (MPESB's 241 MB PDF):
            // ask the server for its first 64 KB and its size before giving up on it.
            const probe = await probeLargePdf(url, file).catch(() => null);
            const tooBig = /larger than 80 MB/.test(message) || (probe?.size ?? 0) > MAX_BYTES;
            if (!probe || !tooBig) return message;
            buf = probe.head;
            large = true;
            largeSize = probe.size;
            return "";
          }
        };
        let downloadError = await download(p.url);
        if (downloadError && fileHost?.startsWith("www.")) {
          // www.hssc.gov.in's certificate names only hssc.gov.in, so a student's browser warns there
          // too: when the bare host serves the file, that is the link to keep.
          const bareUrl = p.url.replace(`//${fileHost}`, `//${fileHost.slice(4)}`);
          if (!(await download(bareUrl))) {
            fileUrlUsed = bareUrl;
            downloadError = "";
          }
        }
        if (downloadError) reasons.push(downloadError);
        if (buf && buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
          reasons.push(`not a PDF now (starts "${buf.subarray(0, 16).toString("latin1").replace(/\s+/g, " ")}")`);
        }
        let pages = 0;
        let scan = false;
        let yearEvidence = "";
        let yearHow = "";
        let page1 = "";
        if (buf && reasons.length === 0) {
          writeFileSync(file, buf);
          page1 = large ? "" : page1Text(file);
          pages = large ? 0 : pageCount(file);
          scan = !large && page1.replace(/\s+/g, "").length < 40;
          if (listing.yearBeside) {
            yearHow = "beside the link";
            yearEvidence = `beside the link on ${listingUsed}: "${listing.evidence}"`;
          } else if (!scan && year && yearPrinted(page1, year)) {
            yearHow = "on page 1";
            yearEvidence = `page 1 of the file: "${around(page1, year)}"`;
          } else if (year && yearPrinted(fileHost ?? "", year)) {
            // A year-specific official site (gate2026.iitg.ac.in). The host only:
            // a path such as /uploads/2024/05/ is an upload date, not the exam's year.
            yearHow = "in the site's own name";
            yearEvidence = `the file is on that year's own official site: ${fileHost}`;
          } else if (
            year &&
            paperYear(browserChecked.get(p.url)?.year ?? "") === year &&
            isOfficialHost(hostOf(browserChecked.get(p.url)!.listingUrl), exam.portalHost)
          ) {
            const b = browserChecked.get(p.url)!;
            yearHow = "in a browser check of the listing";
            yearEvidence = `browser check of ${b.listingUrl} on ${b.checkedAt}: "${b.evidence}"`;
          } else {
            const where = !html ? "listing page not reachable" : listing.linked ? "listing links it but prints no year beside the link" : "listing does not link the file";
            reasons.push(`year ${year} not confirmed (${where}; ${large ? "too large to read page 1" : scan ? "scanned file" : "not printed on page 1"})`);
          }
        }
        try {
          if (existsSync(file)) unlinkSync(file);
        } catch {
          /* temp file */
        }
        if (reasons.length) {
          failed++;
          console.log(`   FAIL ${label}: ${reasons.join("; ")}`);
          continue;
        }
        passed.push({
          examId: exam.id,
          code: data.exam,
          year: p.year.trim(),
          paper: p.paper.replace(/\s+/g, " ").trim(),
          kind: p.kind,
          language: (p.language ?? "").trim(),
          url: fileUrlUsed,
          listingUrl: listingUsed,
          publisher: p.publisher.trim(),
          bytes: large ? largeSize : buf!.length,
          pages,
          scan,
          yearEvidence,
        });
        console.log(
          `   PASS ${label} (${large ? "large file, first 64 KB read" : scan ? "scan" : "text"}, ${large ? largeSize || "size unknown" : buf!.length} B, ${pages || "?"} pages, year ${yearHow}${listing.linked ? "" : "; not linked from the listing"}${fileUrlUsed !== p.url ? `; kept as ${fileUrlUsed}` : ""})`,
        );
        // For the hand check before --apply: is this file really this exam's paper?
        if (listing.context) console.log(`        listing: ${listing.context.slice(0, 300)}`);
        if (yearHow === "in a browser check of the listing") console.log(`        browser check: ${browserChecked.get(p.url)!.evidence.slice(0, 300)}`);
        if (!scan && page1.trim()) console.log(`        page 1: ${page1.replace(/\s+/g, " ").trim().slice(0, 160)}`);
      }
    }
  }

  if (listingsFile) {
    console.log(`\n== listing pages (${listingsFile})`);
    for (const e of JSON.parse(readFileSync(listingsFile, "utf8")) as ListingJson[]) {
      if (only && !only.has(e.exam)) continue;
      const label = `${e.exam} · ${e.url}`;
      const exam = await examOf(e.exam);
      const html = exam && isOfficialHost(hostOf(e.url), exam.portalHost) ? await listingHtml(e.url) : null;
      const text = (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase();
      const named = (e.keywords ?? []).find((k) => text.includes(k.toLowerCase()));
      const evidence = named ? `the page names "${named}"` : e.handChecked ? `browser check: ${e.handChecked}` : "";
      const reason = !exam
        ? "not a Shishya exam code"
        : !isOfficialHost(hostOf(e.url), exam.portalHost)
          ? "host not official"
          : html == null
            ? "not reachable"
            : !evidence
              ? "the page does not name the papers and has no recorded browser check"
              : "";
      if (reason || !exam) {
        failed++;
        console.log(`   FAIL ${label}: ${reason}`);
        continue;
      }
      passed.push({
        examId: exam.id,
        code: e.exam,
        year: "",
        paper: e.paper,
        kind: "listing page",
        language: "",
        url: e.url,
        listingUrl: e.url,
        publisher: e.publisher,
        bytes: 0,
        pages: 0,
        scan: false,
        yearEvidence: evidence,
      });
      console.log(`   PASS ${label} (${evidence.slice(0, 90)})`);
    }
  }

  const byExam = passed.reduce<Record<string, number>>((m, p) => ((m[p.code] = (m[p.code] ?? 0) + 1), m), {});
  console.log(`\npass ${passed.length} · fail ${failed}${apply ? "" : " (dry run: nothing written)"}`);
  console.log(`by exam: ${JSON.stringify(byExam)}`);

  if (apply && rejected.size) {
    await ensureTable();
    const archived = await prisma.$executeRaw`
      UPDATE "OfficialPaper" SET "archivedAt" = NOW() WHERE url = ANY(${[...rejected.keys()]}::text[]) AND "archivedAt" IS NULL`;
    if (archived) console.log(`archived ${archived} rows rejected in the hand check`);
  }
  if (apply && passed.length) {
    await ensureTable();
    for (const p of passed) {
      await prisma.$executeRaw`
        INSERT INTO "OfficialPaper" (id, "examId", year, paper, kind, language, url, "listingUrl", publisher, bytes, pages, scan,
          "yearEvidence", "verifiedAt", "createdAt")
        VALUES (${crypto.randomUUID()}, ${p.examId}, ${p.year}, ${p.paper}, ${p.kind}, ${p.language}, ${p.url}, ${p.listingUrl},
          ${p.publisher}, ${p.bytes}, ${p.pages}, ${p.scan}, ${p.yearEvidence}, NOW(), NOW())
        ON CONFLICT ("examId", url) DO UPDATE SET
          year = EXCLUDED.year, paper = EXCLUDED.paper, kind = EXCLUDED.kind, language = EXCLUDED.language,
          "listingUrl" = EXCLUDED."listingUrl", publisher = EXCLUDED.publisher, bytes = EXCLUDED.bytes, pages = EXCLUDED.pages,
          scan = EXCLUDED.scan, "yearEvidence" = EXCLUDED."yearEvidence", "verifiedAt" = NOW(), "archivedAt" = NULL`;
    }
    console.log(`written ${passed.length} rows`);

    if (indexNow) {
      const urls: string[] = [];
      const byExamWritten = new Map<string, { examId: string; years: Set<string> }>();
      for (const p of passed) {
        const e = byExamWritten.get(p.code) ?? { examId: p.examId, years: new Set<string>() };
        const y = paperYear(p.year);
        if (y) e.years.add(y);
        byExamWritten.set(p.code, e);
      }
      for (const [code, e] of byExamWritten) {
        // Indexable years only: the sitemap's own rule (validated PYQ questions).
        const years = e.years.size
          ? await prisma.$queryRaw<{ year: number }[]>`
              SELECT DISTINCT q."pyqYear" AS year FROM "Question" q
              WHERE q."examId" = ${e.examId} AND q.source = 'PYQ' AND q.validated = TRUE
                AND q."pyqYear" = ANY(${[...e.years].map(Number)}::int[])`
          : [];
        urls.push(...officialDataUrls(code, { pyqYears: years.map((r) => Number(r.year)) }));
      }
      const list = [...new Set(urls)];
      const accepted = await submitIndexNow(list);
      console.log(`IndexNow: ${list.length} URLs for ${byExamWritten.size} exams — ${accepted ? "accepted" : "not accepted (the weekly sitemap submission will carry them)"}`);
      for (const u of list) console.log(`   ${u}`);
    }
  }
  rmSync(work, { recursive: true, force: true });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
