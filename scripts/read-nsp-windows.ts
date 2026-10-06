// Re-read NSP's 2026-27 pre-matric and post-matric windows by state
// (3 Oct 2026, non-exam value step 1).
//
// One GET of NSP's "Centrally Sponsored Schemes" list (the list the "Schemes
// On NSP" box on https://scholarships.gov.in/All-Scholarships shows), parsed
// by scripts/nsp-windows-read.ts, compared with
// data/scholarships/nsp-matric-windows-2026-27.json.
//
//   • DRY RUN by default: prints what changed (last dates, opening days, the
//     student chip as printed, NSP's state heading, cards added, cards NSP no
//     longer lists), a parse cross-check (the state src/lib/nsp-windows.ts
//     reads from each scheme string against NSP's own state heading) and the
//     file header --apply would write. Writes nothing.
//   • --apply writes the JSON with checkedOn = today (IST): every card NSP
//     lists now, with its days, the student-application chip as printed and
//     NSP's state heading; every older row NSP no longer lists is KEPT and
//     marked notListedSince (nothing is deleted). The header is rewritten
//     for this read (appliedHeader): the note names the read day, sourceUrl
//     stays the All-Scholarships page people visit and readUrl is the URL
//     fetched. It appends one line per run to
//     data/scholarships/nsp-matric-windows-reads.jsonl (when, the URL, the
//     HTTP status, the page's size and sha256, and the diff).
//   • It refuses to write when the read looks broken: not HTTP 200, fewer
//     than 50 cards, a chip it does not understand, a card with two student
//     or opening chips, a card outside a state heading, a card whose name and
//     NSP's heading name different states, a card with no state at all, or a
//     card with no pre/post in its name (it would be on neither page).
//
// No AI, no DB. One request, a browser user-agent, a 60-second timeout.
// After an --apply: review the git diff, run tests/unit/nsp-windows.test.ts,
// deploy, then IndexNow the two pages (/scholarships/nsp-post-matric,
// /scholarships/nsp-pre-matric).
//
// Run: npx tsx scripts/read-nsp-windows.ts [--apply] [--html <saved page>] [--save-html <path>]
//   --html parses a saved copy of the page instead of fetching (no network;
//          a dry run only — --apply needs a live read).
//   --save-html keeps a copy of the page this live read fetched (evidence,
//          or a new test fixture); it never writes the data file or the log.

import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  NSP_SPONSORED_URL,
  appliedHeader,
  crossCheckStates,
  diffLines,
  diffWindows,
  mergeWindows,
  parseSponsoredList,
  type WindowsFile,
} from "./nsp-windows-read";
import { formatIsoDay, istToday } from "../src/lib/scholarship-lists";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "data/scholarships/nsp-matric-windows-2026-27.json");
const LOG_FILE = path.join(ROOT, "data/scholarships/nsp-matric-windows-reads.jsonl");
const MIN_CARDS = 50;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

async function fetchList(): Promise<{ html: string; status: number }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 60_000);
  try {
    const res = await fetch(NSP_SPONSORED_URL, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-IN,en;q=0.9" },
      signal: ctl.signal,
      redirect: "follow",
    });
    return { html: await res.text(), status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

const fmt = (iso: string | null) => (iso ? formatIsoDay(iso) : "none");

async function main() {
  const apply = process.argv.includes("--apply");
  const argOf = (flag: string): string | null => {
    const i = process.argv.indexOf(flag);
    return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
  };
  const savedPath = argOf("--html");
  const savePath = argOf("--save-html");
  if (process.argv.includes("--save-html") && !savePath) throw new Error("--save-html needs a file path");
  if (savePath && savedPath) throw new Error("--save-html keeps a live read; it cannot be used with --html");
  if (savePath && [DATA_FILE, LOG_FILE].includes(path.resolve(savePath))) throw new Error("--save-html may not overwrite the data file or the read log");

  const { html, status } = savedPath ? { html: readFileSync(savedPath, "utf8"), status: 0 } : await fetchList();
  const sha256 = createHash("sha256").update(html).digest("hex");
  const today = istToday();
  console.log(`${savedPath ? `Saved copy ${savedPath}` : `GET ${NSP_SPONSORED_URL}`} -> HTTP ${status || "n/a"}, ${html.length} chars, sha256 ${sha256.slice(0, 16)}…  (today IST ${today})`);
  if (savePath) {
    writeFileSync(savePath, html);
    console.log(`Saved this read's page to ${savePath} (the data file is not touched).`);
  }

  const file = JSON.parse(readFileSync(DATA_FILE, "utf8")) as WindowsFile;
  const { windows: read, groups, problems } = parseSponsoredList(html);
  console.log(`NSP cards read: ${read.length} under ${groups.length} state/UT headings. File: ${file.windows.length} rows, checked ${fmt(file.checkedOn)}.`);

  // Parse cross-check: the state read from the scheme string vs NSP's heading.
  const cc = crossCheckStates(read);
  const blocking = [...cc.mismatches, ...cc.unplaced, ...cc.noLevel];

  const diff = diffWindows(file.windows, read);
  const lines = diffLines(diff, fmt);
  const closesChanged = diff.changed.filter((c) => c.field === "closesOn").length;
  console.log(
    `\nDiff against the file: ${closesChanged} last date(s) changed, ${diff.changed.length - closesChanged} opening day(s) changed, ${diff.chipChanged.length} student chip(s) changed, ${diff.headingChanged.length} heading(s) changed, ${diff.added.length} card(s) added, ${diff.notListed.length} row(s) no longer listed, ${diff.listedAgain.length} listed again, ${diff.unchanged} unchanged.`,
  );
  for (const l of lines) console.log(`  ${l}`);
  if (blocking.length || cc.fromHeadingOnly.length) {
    console.log(`\nParse cross-check (${blocking.length} blocking, ${cc.fromHeadingOnly.length} placed by NSP's heading):`);
    for (const l of blocking) console.log(`  BLOCKS --apply: ${l}`);
    for (const l of cc.fromHeadingOnly) console.log(`  ${l}`);
  } else {
    console.log("\nParse cross-check: every card's state, read from NSP's scheme name, matches NSP's own state heading, and every card names pre- or post-matric.");
  }
  if (problems.length) {
    console.log(`\nRead problems (${problems.length}):`);
    for (const p of problems) console.log(`  ${p}`);
  }

  const header = appliedHeader(today, formatIsoDay(today), read);
  // Header first, any other field the file may hold next, the rows last.
  const extra = Object.fromEntries(Object.entries(file).filter(([k]) => !(k in header) && k !== "windows"));
  const next = { ...header, ...extra, windows: mergeWindows(file.windows, read, today) } as WindowsFile;
  console.log(`\nFile header --apply would write: checkedOn ${header.checkedOn}; sourceUrl ${header.sourceUrl}; readUrl ${header.readUrl}; ${next.windows.length} rows.\n  note: ${header.note}`);

  const broken = read.length < MIN_CARDS || problems.length > 0 || blocking.length > 0 || (!savedPath && status !== 200);
  if (!apply) {
    const tail = broken
      ? " This read would be refused by --apply: see above."
      : savedPath
        ? " This was a saved copy: --apply refuses saved copies, so the file can only be written from a live read (run without --html, then --apply)."
        : " Re-run with --apply to write the file.";
    console.log(`\nDRY RUN — nothing written.${tail}`);
    return;
  }
  if (broken) {
    console.error("\nREFUSED: the read looks broken (see the cross-check and read problems above, or not HTTP 200). Nothing written.");
    process.exitCode = 1;
    return;
  }
  if (savedPath) {
    console.error("\nREFUSED: --apply needs a live read (checkedOn must be the day NSP was read), not a saved copy.");
    process.exitCode = 1;
    return;
  }

  // Same shape and formatting as the file (1-space JSON, LF, no final newline).
  writeFileSync(DATA_FILE, JSON.stringify(next, null, 1));
  appendFileSync(
    LOG_FILE,
    JSON.stringify({
      checkedOn: today,
      readAt: new Date().toISOString(),
      url: NSP_SPONSORED_URL,
      httpStatus: status,
      chars: html.length,
      sha256,
      cards: read.length,
      previousCheckedOn: file.checkedOn,
      changes: lines,
    }) + "\n",
  );
  console.log(`\nWROTE ${path.relative(ROOT, DATA_FILE)} (checkedOn ${today}, ${next.windows.length} rows) and appended ${path.relative(ROOT, LOG_FILE)}.`);
  console.log("Next: review the git diff, run tests/unit/nsp-windows.test.ts, deploy, then IndexNow /scholarships/nsp-post-matric and /scholarships/nsp-pre-matric.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
