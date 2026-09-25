// School curriculum spine (25 Sep 2026) — integrity of data/curriculum/.
//
// The spine is built from official pages only (ncert.nic.in, cbseacademic.
// nic.in, cisce.org) and every fact must trace back to a committed snapshot.
// These tests re-derive what they can from those snapshots, independently of
// the Python builder (data/curriculum/tools/ncert_spine.py):
//   1. NCERT index: re-parse the saved textbook.php index script here and
//      require the same classes, subjects (in order), book codes and chapter
//      counts;
//   2. every chapter title (and subtitle, section, piece) is printed in its
//      committed contents evidence AND is complete there — 26 Sep 2026: eight
//      titles had been cut at the end of the first line of a wrapped entry
//      ("Chanda Mama Counts" for "Chanda Mama Counts the Stars") and a
//      substring check passed them; every chapter has an official PDF URL
//      that returned HTTP 200 in the saved check;
//   3. pieces printed inside a chapter PDF (First Flight's poems …) are in the
//      spine, were found in that PDF, and cover CBSE's prescribed lists;
//   4. the seed plan: unique codes, every row inactive SCHOOL_BOARD, one link
//      row per chapter, pieces as child topics, official hosts only;
//   5. CBSE / CISCE files point at books and URLs that exist, CBSE's XI-XII
//      links carry the class CBSE teaches each book in;
//   6. nothing beyond evidence lines of official text is committed (the repo
//      is public; NCERT, CBSE and CISCE reserve reproduction).
// No DB, no network. Run: npx vitest run tests/unit/school-spine.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
  CBSE,
  CISCE,
  NCERT_CLASS_FILES,
  SCHOOL_CLASSES,
  cbseBandForClass,
  cbseSubjectsWithNcertBooks,
  displayTitle,
  ncertBooksForClass,
  ncertChapterByTopicCode,
  ncertExamCode,
  ncertPieceCode,
  ncertSubjectsForClass,
  ncertTopicCode,
  subjectCodeFor,
} from "@/lib/school/spine";
import { buildSchoolSpinePlan } from "@/lib/school/seed-plan";

const ROOT = path.resolve(__dirname, "../../data/curriculum");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const pad2 = (n: number) => String(n).padStart(2, "0");

// ── an independent parser for the saved NCERT index script ─────────────
function stripJsComments(s: string): string {
  let out = "";
  let q: string | null = null;
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    if (q) {
      out += c;
      if (c === "\\" && i + 1 < s.length) { out += s[i + 1]; i += 2; continue; }
      if (c === q || c === "\n") q = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
    if (s.startsWith("//", i)) { const j = s.indexOf("\n", i); i = j < 0 ? s.length : j; continue; }
    if (s.startsWith("/*", i)) { const j = s.indexOf("*/", i + 2); i = j < 0 ? s.length : j + 2; continue; }
    out += c;
    i++;
  }
  return out;
}

type IndexBook = { title: string; value: string };
function parseIndex(html: string): Map<number, { subject: string; books: IndexBook[] }[]> {
  const a = html.indexOf("function change()");
  const b = html.indexOf("function change1(sind)");
  const e = html.indexOf("</script>", b);
  const subjJs = stripJsComments(html.slice(a, b));
  const bookJs = stripJsComments(html.slice(b, e));
  const classes = new Map<number, string[]>();
  const cm = [...subjJs.matchAll(/if\s*\(\s*document\.test\.tclass\.value\s*==\s*(-?\d+)\s*\)/g)];
  cm.forEach((m, k) => {
    const block = subjJs.slice(m.index!, k + 1 < cm.length ? cm[k + 1].index! : subjJs.length);
    const opts = new Map<number, string>();
    for (const o of block.matchAll(/document\.test\.tsubject\.options\[(\d+)\]\.text\s*=\s*"([^"]*)"/g)) opts.set(Number(o[1]), o[2].trim());
    const cl = Number(m[1]);
    if (cl >= 1) classes.set(cl, [...opts.entries()].sort((x, y) => x[0] - y[0]).filter(([i, t]) => i > 0 && t).map(([, t]) => t));
  });
  const books = new Map<string, IndexBook[]>();
  const bm = [...bookJs.matchAll(/if\s*\(\s*\(\s*document\.test\.tclass\.value\s*==\s*(\d+)\s*\)\s*&&\s*\(\s*document\.test\.tsubject\.options\[sind\]\.text\s*==\s*"([^"]*)"\s*\)\s*\)/g)];
  bm.forEach((m, k) => {
    const block = bookJs.slice(m.index!, k + 1 < bm.length ? bm[k + 1].index! : bookJs.length);
    const opts = new Map<number, { text?: string; value?: string }>();
    for (const o of block.matchAll(/document\.test\.tbook\.options\[(\d+)\]\.(text|value)\s*=\s*"([^"]*)"/g)) {
      const cur = opts.get(Number(o[1])) ?? {};
      cur[o[2] as "text" | "value"] = o[3].trim();
      opts.set(Number(o[1]), cur);
    }
    const key = `${m[1]}|${m[2]}`;
    if (!books.has(key)) {
      books.set(key, [...opts.entries()].sort((x, y) => x[0] - y[0]).filter(([i, o]) => i > 0 && (o.text || o.value)).map(([, o]) => ({ title: o.text ?? "", value: o.value ?? "" })));
    }
  });
  const out = new Map<number, { subject: string; books: IndexBook[] }[]>();
  for (const [cl, subs] of classes) out.set(cl, subs.map((s) => ({ subject: s, books: books.get(`${cl}|${s}`) ?? [] })));
  return out;
}

// Same normalisation as ncert_spine.py norm_text() (chapter-title-lines).
function normText(t: string): string {
  const lines = t.normalize("NFKC").split("\n").map((l) =>
    l.replace(/\t/g, " ").replace(/[.…_�]{5,}.*$/, "").replace(/\s+/g, " ").trim());
  const kept = lines.filter((l) => l && !/^(\d{1,3}(\s*[-–]\s*\d{1,3})?|[ivxlc]{1,6}|\([ivxlc]+\)|reprint 20\d\d-\d\d|=== .* ===|#.*|•|–)$/i.test(l));
  return kept.join(" ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").toLowerCase();
}

// ── contents evidence rules: mirror ncert_spine.py (ev_norm, is_page_line,
// TITLE_PREFIX, boundary) — keep the two in step ───────────────────────
const CTRL = /[\u0000-\u0008\u000b-\u001f\u007f]/g;
const LEADERS = /[.…_�·]{2,}/g;
const PAGE_ONLY = /^(\d{1,3}(-\d{1,3})?|[ivxlc]{1,6}|\([ivxlc]+\)|reprint|(reprint )?20\d\d-\d\d|:)$/i;
const FUNCTION_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"]);
const TITLE_PREFIX = /(^|[\s:])(((mandatory|optional)\s+)?(chapter|unit|lesson|theme|part|section|module|project)\s*[0-9ivxl]*|\d{1,2}(\.\d{1,2})*|[ivxl]{1,5}|[a-h])\s*[.:)\-]?\s*$|^\s*$|[•●▪◦:\-(]\s*$/i;
const LABELS = new Set(["end", "page", "number", "sub-entry", "known", "boilerplate", "caps-line", "author", "heading", "sub-entry-list", "unit-lesson", "complete"]);
const EV_SWAPS: [string, string][] = [["’", "'"], ["‘", "'"], ["“", '"'], ["”", '"'], ["—", "-"], ["–", "-"], ["‐", "-"], ["‑", "-"], [" ", " "], [" ", " "], [" ", " "]];

function evNorm(s: string): string {
  let t = s.replace(CTRL, "").normalize("NFKC");
  for (const [a, b] of EV_SWAPS) t = t.split(a).join(b);
  return t.replace(/\s+/g, " ").trim();
}
function isPageLine(l: string): boolean {
  const t = evNorm(l.replace(LEADERS, " ")).replace(/\s*-\s*/g, "-").trim();
  return !t || t.split(" ").every((x) => PAGE_ONLY.test(x));
}
const isLower = (c: string) => c.toLowerCase() === c && c.toUpperCase() !== c;

/** Hard boundary problems: the printed entry visibly goes on past the title. */
function boundaryProblems(title: string, rest: string, after: string[]): string[] {
  const out: string[] = [];
  let r = rest.replace(LEADERS, " ").trim();
  r = (r + " ").replace(/^(\d{1,3}(\s*[-–]\s*\d{1,3})?\s+)+/, "").trim();
  r = r.replace(/^["'”’)\]]+/, "").trim();
  const t = evNorm(title);
  if (r && (isLower(r[0]) || ":-,&/".includes(r[0]))) out.push(`goes on after the title on the same line: ${JSON.stringify(r.slice(0, 50))}`);
  const last = t.split(" ").pop()!.toLowerCase();
  if (t && (":-,&/".includes(t[t.length - 1]) || FUNCTION_WORDS.has(last))) out.push("ends on a connector or function word");
  const nextRaw = after.find((a) => !isPageLine(a));
  const nxt = nextRaw === undefined ? "" : evNorm(nextRaw.replace(LEADERS, " "));
  if (nxt && isLower(nxt[0])) out.push(`next line continues in lowercase: ${JSON.stringify(nxt.slice(0, 50))}`);
  return out;
}

type EvBlock = { key: string; what: string; label: string; reviewed: string | null; match: string[]; windowed: boolean; after: string[] };
function parseEvidence(text: string): { header: string[]; blocks: Map<string, EvBlock>; stray: string[] } {
  const header: string[] = [];
  const blocks = new Map<string, EvBlock>();
  const stray: string[] = [];
  let cur: EvBlock | null = null;
  for (const line of text.split("\n")) {
    if (!line) continue;
    const m = line.match(/^@(\S+) (title|subtitle|section|include) \[(pdftotext|pymupdf) p\d+\] next=([a-z?-]+)(?: \(reviewed: (.+)\))?$/);
    if (m) {
      cur = { key: m[1], what: m[2], label: m[4], reviewed: m[5] ?? null, match: [], windowed: false, after: [] };
      blocks.set(cur.key, cur);
    } else if (line.startsWith("#") && !cur) header.push(line);
    else if (cur && line.startsWith("  ") && !cur.after.length) cur.match.push(line.slice(2));
    else if (cur && line.startsWith("~ ") && !cur.after.length) { cur.match.push(line.slice(2)); cur.windowed = true; }
    else if (cur && line.startsWith("+ ")) cur.after.push(line.slice(2));
    else stray.push(line);
  }
  return { header, blocks, stray };
}

/** Problems with one transcribed string against its evidence block ([] = ok). */
function checkEvidence(block: EvBlock | undefined, text: string): string[] {
  if (!block) return ["no evidence block"];
  if (!LABELS.has(block.label)) return [`unreviewed boundary label ${block.label}`];
  const lines = block.windowed ? block.match : block.match.filter((l) => !isPageLine(l));
  if (!lines.length) return ["empty evidence block"];
  const acc = lines.map(evNorm).join(" ").trim();
  const low = acc.toLowerCase();
  const want = evNorm(text).toLowerCase();
  const firstLen = evNorm(lines[0]).length;
  const rests: string[] = [];
  for (let pos = low.indexOf(want); pos >= 0 && pos <= firstLen; pos = low.indexOf(want, pos + 1)) {
    if (TITLE_PREFIX.test(low.slice(0, pos))) rests.push(acc.slice(pos + want.length));
  }
  if (!rests.length) return ["not printed as an entry in its evidence lines"];
  if (block.label === "complete") return block.reviewed ? [] : ["'complete' without a reviewed reason"];
  const perRest = rests.map((r) => boundaryProblems(text, r, block.after));
  return perRest.some((p) => p.length === 0) ? [] : perRest[0];
}

const indexFile = fs.readdirSync(path.join(ROOT, "sources/ncert")).filter((f) => /^textbook-php-.*\.html$/.test(f)).sort().pop()!;
const INDEX_TEXT = read(`sources/ncert/${indexFile}`);
const INDEX = parseIndex(INDEX_TEXT);
const latestTsv = (prefix: RegExp) => fs.readdirSync(path.join(ROOT, "sources/ncert")).filter((f) => prefix.test(f)).sort().pop()!;
function readTsv(rel: string): Record<string, string>[] {
  const lines = read(rel).split("\n").filter((l) => l && !l.startsWith("#"));
  const head = lines[0].split("\t");
  return lines.slice(1).map((l) => Object.fromEntries(l.split("\t").map((v, i) => [head[i], v])));
}
const PDF_STATUS = new Map(readTsv(`sources/ncert/${latestTsv(/^chapter-pdfs-.*\.tsv$/)}`).map((r) => [r.url, Number(r.status)]));
const CHAPTER_CHECKS = readTsv(`sources/ncert/${latestTsv(/^chapter-checks-.*\.tsv$/)}`);
const allBooks = NCERT_CLASS_FILES.flatMap((f) => f.subjects.flatMap((s) => s.books.map((b) => ({ file: f, subject: s, book: b }))));
const bookByCode = (code: string) => allBooks.find((b) => b.book.code === code)!.book;
const EVIDENCE = new Map<string, ReturnType<typeof parseEvidence>>();
const evidenceFor = (code: string) => {
  if (!EVIDENCE.has(code)) EVIDENCE.set(code, parseEvidence(read(`sources/ncert/contents/${code}.txt`)));
  return EVIDENCE.get(code)!;
};

describe("NCERT spine vs the saved ncert.nic.in index", () => {
  it("has a file for every index class 1-12 plus the XI & XII combined set", () => {
    expect([...INDEX.keys()].filter((c) => c <= 13).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(NCERT_CLASS_FILES.map((f) => f.indexClassValue)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    for (const f of NCERT_CLASS_FILES) expect(f.source.snapshot).toBe(`data/curriculum/sources/ncert/${indexFile}`);
  });

  it("the saved index is the index script only, with the whole page's sha256 in its header", () => {
    const m = INDEX_TEXT.match(/^<!-- NCERT textbook index: https:\/\/ncert\.nic\.in\/textbook\.php\n\s*fetched: (\S+)\s+bytes: (\d+)\s+sha256: ([0-9a-f]{64})/);
    expect(m, "trimmed index header").not.toBeNull();
    for (const f of NCERT_CLASS_FILES) {
      expect(f.source.snapshotSha256).toBe(m![3]);
      expect(f.source.fetchedOn).toBe(m![1].slice(0, 10));
    }
    expect(INDEX_TEXT).not.toMatch(/<body|<form|<table|<footer/i);
  });

  it("lists the same subjects, in the same order, per class", () => {
    for (const f of NCERT_CLASS_FILES) {
      expect(f.subjects.map((s) => s.name)).toEqual(INDEX.get(f.indexClassValue)!.map((s) => s.subject));
    }
  });

  it("accounts for every book the index lists (primary book, linked edition, unlinked edition or not-yet-published)", () => {
    for (const f of NCERT_CLASS_FILES) {
      for (const s of f.subjects) {
        const idx = INDEX.get(f.indexClassValue)!.find((x) => x.subject === s.name)!;
        const fromIndex = idx.books.map((b) => b.value.match(/^textbook\.php\?([a-z0-9]+)=/)?.[1] ?? `none:${b.title}`).sort();
        const fromSpine = [
          ...s.books.map((b) => b.code),
          ...s.books.flatMap((b) => b.editions.map((e) => e.code)),
          ...(s.unlinkedEditions ?? []).map((e) => e.code),
          ...(s.notYetPublished ?? []).map((n) => `none:${n.title}`),
        ].sort();
        expect(fromSpine, `${f.classLabel} ${s.name}`).toEqual(fromIndex);
      }
    }
  });

  it("chapter counts per book match the index snapshot (0-N), with the sectioned readers explained", () => {
    // The index's own JS lists these differently from their 0-N value.
    const sectioned: Record<string, number> = { kehb1: 12, lhat1: 17 };
    for (const { file, subject, book } of allBooks) {
      const idx = INDEX.get(file.indexClassValue)!.find((x) => x.subject === subject.name)!.books.find((b) => b.value.includes(`?${book.code}=`))!;
      const n = Number(idx.value.match(/-(\d+)$/)![1]);
      expect(book.indexChapterCount, book.code).toBe(n);
      expect(book.listedChapterCount, book.code).toBe(sectioned[book.code] ?? n);
      expect(book.chapters.length + book.unresolved.length, book.code).toBe(book.listedChapterCount);
      const seqs = [...book.chapters, ...book.unresolved].map((c) => c.seq).sort((a, b) => a - b);
      expect(seqs, book.code).toEqual(Array.from({ length: book.listedChapterCount }, (_, i) => i + 1));
    }
  });

  it("per-class counts in each file add up", () => {
    for (const f of NCERT_CLASS_FILES) {
      const books = f.subjects.flatMap((s) => s.books);
      expect(f.counts.books).toBe(books.length);
      expect(f.counts.chapters).toBe(books.reduce((a, b) => a + b.chapters.length, 0));
      expect(f.counts.unresolvedChapters).toBe(books.reduce((a, b) => a + b.unresolved.length, 0));
    }
  });

  it("pins the Maths/Science first slice (Classes 6-10) to the current NCERT books", () => {
    const code = (cls: number, subj: string) => ncertSubjectsForClass(cls).find((s) => s.name === subj)!.books.map((b) => `${b.code}:${b.chapters.length}`);
    expect(code(6, "Mathematics")).toEqual(["fegp1:10"]);
    expect(code(6, "Science")).toEqual(["fecu1:12"]);
    expect(code(7, "Mathematics")).toEqual(["gegp1:8", "gegp2:7"]);
    expect(code(8, "Science")).toEqual(["hecu1:13"]);
    expect(code(9, "Mathematics")).toEqual(["iemh1:8"]);
    expect(code(9, "Science")).toEqual(["iesc1:13"]);
    expect(code(10, "Mathematics")).toEqual(["jemh1:14"]);
    expect(code(10, "Science")).toEqual(["jesc1:13"]);
    expect(ncertChapterByTopicCode(9, "iemh1.ch03")?.chapter.title).toBe("The World of Numbers");
  });
});

describe("NCERT chapters: complete title from the book, official PDF that answered 200", () => {
  it("every chapter has a non-empty clean title and the official PDF URL for its book and number", () => {
    for (const { book } of allBooks) {
      for (const c of book.chapters) {
        expect(c.title.trim(), `${book.code} ${c.seq}`).toBe(c.title);
        expect(c.title.length).toBeGreaterThan(0);
        expect(/[\u0000-\u001f�]/.test(c.title), `${book.code} ${c.seq} control char`).toBe(false);
        expect(c.pdfUrl).toBe(`https://ncert.nic.in/textbook/pdf/${book.code}${pad2(c.pdfSeq)}.pdf`);
        expect(["contents", "chapter-pdf"]).toContain(c.titleSource);
      }
      for (const u of book.unresolved) {
        expect(u.pdfUrl).toBe(`https://ncert.nic.in/textbook/pdf/${book.code}${pad2(u.pdfSeq)}.pdf`);
        expect(u.reason.length).toBeGreaterThan(10);
      }
    }
  });

  it("every chapter PDF returned HTTP 200 in the saved check", () => {
    for (const { book } of allBooks) for (const c of book.chapters) expect(PDF_STATUS.get(c.pdfUrl), c.pdfUrl).toBe(200);
  });

  it("every chapter title, subtitle, section and piece is printed in its contents evidence and ends where NCERT's entry ends", () => {
    let checked = 0;
    const problems: string[] = [];
    for (const { book } of allBooks) {
      const seenSections = new Set<string>();
      for (const c of book.chapters) {
        if (c.titleSource === "chapter-pdf") {
          const src = normText(read(`sources/ncert/chapter-title-lines/${book.code}${pad2(c.pdfSeq)}.txt`));
          if (!src.includes(normText(c.title))) problems.push(`${book.code} #${c.seq} "${c.title}" not in its chapter-title lines`);
          checked++;
          continue;
        }
        const ev = evidenceFor(book.code).blocks;
        const items: [string, string][] = [[`${book.code}#${c.seq}`, c.title]];
        if (c.subtitle) items.push([`${book.code}#${c.seq}:subtitle`, c.subtitle]);
        if (c.section && !seenSections.has(c.section)) { seenSections.add(c.section); items.push([`${book.code}#${c.seq}:section`, c.section]); }
        (c.includes ?? []).forEach((inc, k) => items.push([`${book.code}#${c.seq}/${k + 1}`, inc.title]));
        for (const [key, text] of items) {
          const p = checkEvidence(ev.get(key), text);
          if (p.length) problems.push(`${key} "${text}": ${p.join("; ")}`);
          checked++;
        }
      }
    }
    expect(problems).toEqual([]);
    expect(checked).toBeGreaterThan(1200);
  });

  it("the boundary rules reject the cut-short titles found in review (26 Sep 2026)", () => {
    // [book#seq, title as first transcribed, corrected title]; evidence = the committed block
    const cut: [string, string, string][] = [
      ["iemh1#8", "Predicting What Comes Next: Exploring Sequences", "Predicting What Comes Next: Exploring Sequences and Progressions"],
      ["iest1#8", "Building Blocks in Economics", "Building Blocks in Economics: The Problem of Choice"],
      ["fees1#11", "Grassroots Democracy — Part 2: Local Government", "Grassroots Democracy — Part 2: Local Government in Rural Areas"],
      ["fees1#12", "Grassroots Democracy — Part 3: Local Government", "Grassroots Democracy — Part 3: Local Government in Urban Areas"],
      ["leac1#2", "Reconstitution of a Partnership Firm – Admission", "Reconstitution of a Partnership Firm – Admission of a Partner"],
      ["leac1#3", "Reconstitution of a Partnership Firm", "Reconstitution of a Partnership Firm – Retirement/Death of a Partner"],
      ["cesa1#11", "Chanda Mama Counts", "Chanda Mama Counts the Stars"],
    ];
    for (const [key, old, fixed] of cut) {
      const block = evidenceFor(key.split("#")[0]).blocks.get(key);
      expect(checkEvidence(block, fixed), `${key} corrected`).toEqual([]);
      expect(checkEvidence(block, old).length, `${key} cut-short title must fail`).toBeGreaterThan(0);
      const seq = Number(key.split("#")[1]);
      expect(bookByCode(key.split("#")[0]).chapters.find((c) => c.seq === seq)!.title).toBe(fixed);
    }
    // The eighth ("The Summer of the Beautiful" for "... White Horse") wraps
    // onto a capitalised line, which no mechanical rule can tell from an
    // author line: the builder refuses it until a person labels that line,
    // CBSE's prescribed list below names the whole title, and the chapter PDF
    // heading check says "exact" for the corrected title.
    expect(bookByCode("kesp1").chapters[0].title).toBe("The Summer of the Beautiful White Horse");
  });

  it("chapters re-checked from their own PDF (26 Sep 2026) print the whole title as the heading or carry a piece list", () => {
    const titleRows = new Map(CHAPTER_CHECKS.filter((r) => r.item === "title").map((r) => [`${r.code}#${r.pdfSeq}`, r]));
    for (const stem of ["iemh1#8", "iest1#8", "fees1#11", "fees1#12", "leac1#2", "leac1#3", "cesa1#11", "kesp1#1"]) {
      const [code, seq] = stem.split("#");
      const ch = bookByCode(code).chapters.find((c) => c.seq === Number(seq))!;
      expect(titleRows.get(`${code}#${ch.pdfSeq}`)?.result, stem).toBe("exact");
      expect(titleRows.get(`${code}#${ch.pdfSeq}`)?.text).toBe(ch.title);
      expect(ch.titleHeading).toBe("exact");
      expect(ch.titleOnFirstPages).toBeUndefined();
    }
    for (const r of CHAPTER_CHECKS) {
      expect(r.url).toBe(`https://ncert.nic.in/textbook/pdf/${r.code}${pad2(Number(r.pdfSeq))}.pdf`);
      expect(r.status).toBe("200");
      expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("contents evidence names its official source URL", () => {
    for (const { book } of allBooks) {
      expect(book.prelims.url).toBe(`https://ncert.nic.in/textbook/pdf/${book.code}ps.pdf`);
      expect(read(book.prelims.contentsSnapshot.replace("data/curriculum/", ""))).toContain(`# source: ${book.prelims.url}`);
    }
  });
});

describe("pieces printed inside a chapter PDF", () => {
  const pieceRows = CHAPTER_CHECKS.filter((r) => r.item === "include");

  it("every piece was found in its own chapter PDF", () => {
    let n = 0;
    for (const { book } of allBooks) {
      for (const c of book.chapters) {
        for (const inc of c.includes ?? []) {
          const row = pieceRows.find((r) => r.code === book.code && Number(r.pdfSeq) === c.pdfSeq && r.text === inc.title);
          expect(row?.result, `${book.code} ch${c.pdfSeq} ${inc.title}`).toBe("found");
          expect(row!.pages.split(",").map(Number).every((p) => p >= 1)).toBe(true);
          expect(["piece", "part"]).toContain(inc.kind);
          n++;
        }
      }
    }
    expect(n).toBe(pieceRows.length);
  });

  it("First Flight's poems sit inside the prose chapters' PDFs", () => {
    const ff = bookByCode("jeff1");
    expect(ff.chapters[0].includes?.map((i) => i.title)).toEqual(["Dust of Snow", "Fire and Ice"]);
    expect(ff.chapters.flatMap((c) => c.includes ?? []).filter((i) => i.kind === "piece").map((i) => i.title)).toEqual([
      "Dust of Snow", "Fire and Ice", "A Tiger in the Zoo", "How to Tell Wild Animals", "The Ball Poem", "Amanda!", "The Trees", "Fog",
      "The Tale of Custard the Dragon", "For Anne Gregory",
    ]);
  });

  it("CBSE's prescribed pieces for every linked NCERT reader are in the spine", () => {
    const words = (s: string) => evNorm(s).toLowerCase().replace(/\((prose|poem|play)\)/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
    let n = 0;
    for (const band of CBSE.bands) {
      for (const s of band.subjects ?? []) {
        for (const l of s.ncertBooks ?? []) {
          if (!l.pieces) continue;
          const book = bookByCode(l.book);
          const have = book.chapters.flatMap((c) => [c.title, ...(c.includes ?? []).map((i) => i.title)]).map(words);
          for (const piece of l.pieces) {
            const w = words(piece);
            const hit = have.some((h) => w.every((x) => h.includes(x)) && h.length - w.length <= 2);
            expect(hit, `${s.name} → ${l.book}: "${piece}" not in the NCERT spine`).toBe(true);
            n++;
          }
        }
      }
    }
    expect(n).toBeGreaterThanOrEqual(60);
  });
});

describe("seed plan", () => {
  const plan = buildSchoolSpinePlan();
  const chapterTopics = plan.topics.filter((t) => !t.parentCode);
  const pieceTopics = plan.topics.filter((t) => t.parentCode);

  it("one inactive SCHOOL_BOARD exam per (curriculum, class)", () => {
    const codes = plan.exams.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.filter((c) => c.startsWith("NCERT_"))).toEqual(SCHOOL_CLASSES.map(ncertExamCode));
    expect(codes.filter((c) => c.startsWith("CISCE_"))).toEqual(SCHOOL_CLASSES.map((c) => `CISCE_C${pad2(c)}`));
    for (const e of plan.exams) {
      expect(e.active).toBe(false);
      expect(e.category).toBe("SCHOOL_BOARD");
      expect(e.description).toMatch(/not an exam/);
    }
  });

  it("no duplicate subject codes per exam, topic codes per subject, link keys overall", () => {
    const sub = plan.subjects.map((s) => `${s.examCode}|${s.code}`);
    expect(new Set(sub).size).toBe(sub.length);
    const top = plan.topics.map((t) => `${t.examCode}|${t.subjectCode}|${t.code}`);
    expect(new Set(top).size).toBe(top.length);
    const links = plan.links.map((l) => l.contentHash);
    expect(new Set(links).size).toBe(links.length);
    for (const t of plan.topics) expect(sub).toContain(`${t.examCode}|${t.subjectCode}`);
    for (const s of plan.subjects) expect(s.code).toMatch(/^[A-Z0-9_]+$/);
  });

  it("one topic per verified chapter, each with its official PDF link row", () => {
    const chapters = SCHOOL_CLASSES.reduce((a, cls) => a + ncertBooksForClass(cls).reduce((x, b) => x + b.book.chapters.length, 0), 0);
    expect(chapterTopics.length).toBe(chapters);
    const linkByTopic = new Map(plan.links.filter((l) => l.topicCode).map((l) => [`${l.examCode}|${l.topicCode}`, l]));
    for (const t of chapterTopics) {
      expect(t.code).toMatch(/^[a-z0-9]+\.ch\d{2}$/);
      const l = linkByTopic.get(`${t.examCode}|${t.code}`);
      expect(l?.url, t.code).toBe(`https://ncert.nic.in/textbook/pdf/${t.code.replace(".ch", "")}.pdf`);
      expect(l?.tier).toBe("STANDARD_TEXT");
    }
  });

  it("every piece inside a chapter PDF is a child topic of that chapter", () => {
    const pieces = SCHOOL_CLASSES.reduce((a, cls) => a + ncertBooksForClass(cls).reduce((x, b) => x + b.book.chapters.reduce((y, c) => y + (c.includes?.length ?? 0), 0), 0), 0);
    expect(pieceTopics.length).toBe(pieces);
    const chapterKeys = new Set(chapterTopics.map((t) => `${t.examCode}|${t.subjectCode}|${t.code}`));
    for (const t of pieceTopics) {
      expect(t.code).toMatch(/^[a-z0-9]+\.ch\d{2}\.p\d{2}$/);
      expect(t.code.startsWith(`${t.parentCode}.p`)).toBe(true);
      expect(chapterKeys.has(`${t.examCode}|${t.subjectCode}|${t.parentCode}`), t.code).toBe(true);
      expect(plan.links.some((l) => l.topicCode === t.code)).toBe(false);
    }
    const ff = pieceTopics.filter((t) => t.examCode === "NCERT_C10" && t.parentCode === "jeff1.ch01").map((t) => [t.code, t.name]);
    expect(ff).toEqual([[ncertPieceCode("jeff1.ch01", 1), "Dust of Snow"], [ncertPieceCode("jeff1.ch01", 2), "Fire and Ice"]]);
    expect(plan.summary.reduce((a, s) => a + s.pieces, 0)).toBe(pieces);
  });

  it("links only to official hosts and never carry textbook text", () => {
    for (const l of plan.links) {
      expect(l.url).toMatch(/^https:\/\/(ncert\.nic\.in\/textbook\/pdf\/|cisce\.org\/wp-content\/uploads\/)/);
      expect(l.contentHash.startsWith(`official-link:${l.examCode}:`)).toBe(true);
    }
  });

  it("topic codes are stable functions of book code + PDF number", () => {
    expect(ncertTopicCode("iemh1", 3)).toBe("iemh1.ch03");
    expect(ncertTopicCode("lekl1", 11)).toBe("lekl1.ch11");
    expect(ncertTopicCode("iemh1", 3, "2026")).toBe("iemh1-2026.ch03");
    expect(ncertPieceCode("jeff1.ch05", 4)).toBe("jeff1.ch05.p04");
    expect(subjectCodeFor("Creative Writing & Translation")).toBe(subjectCodeFor("Creative Writing and Translation"));
  });
});

describe("CBSE and CISCE files", () => {
  it("CBSE covers classes 1-12 once, links only to cbseacademic.nic.in and to NCERT books that exist", () => {
    const covered = CBSE.bands.flatMap((b) => b.classes).sort((a, b) => a - b);
    expect(covered).toEqual([...SCHOOL_CLASSES]);
    const known = new Set(allBooks.map((b) => b.book.code));
    for (const band of CBSE.bands) {
      for (const s of band.subjects ?? []) {
        expect(s.syllabusUrl).toMatch(/^https:\/\/cbseacademic\.nic\.in\//);
        for (const l of s.ncertBooks ?? []) {
          expect(known.has(l.book), `${s.name} → ${l.book}`).toBe(true);
          expect(Object.keys(CBSE.linkMethods)).toContain(l.method);
          expect(l.evidence.length).toBeGreaterThan(10);
        }
      }
    }
    expect(cbseSubjectsWithNcertBooks(10).find((s) => s.name === "Mathematics")?.books).toEqual(["jemh1"]);
    expect(cbseSubjectsWithNcertBooks(9).find((s) => s.name === "Science")?.books).toEqual(["iesc1"]);
  });

  it("every XI-XII link says which class CBSE teaches the book in", () => {
    const band = cbseBandForClass(11)!;
    expect(band.classes).toEqual([11, 12]);
    for (const s of band.subjects ?? []) {
      for (const l of s.ncertBooks ?? []) {
        expect(l.classes?.length, `${s.name} → ${l.book}`).toBeGreaterThan(0);
        expect(l.classes!.every((c) => c === 11 || c === 12)).toBe(true);
        expect(Object.keys(CBSE.classMethods)).toContain(l.classFrom);
        if (l.classFrom === "cbse-course-structure") expect(l.classEvidence?.length).toBeGreaterThan(20);
      }
    }
  });

  it("pins the CBSE → NCERT links corrected in review (26 Sep 2026)", () => {
    const books = (cls: number, name: string) => cbseSubjectsWithNcertBooks(cls).find((s) => s.name === name);
    // CBSE Economics: XI = Statistics + Introductory Microeconomics; XII = Introductory Macroeconomics + Indian Economic Development
    expect(books(11, "Economics")?.books.sort()).toEqual(["kest1", "leec2"]);
    expect(books(12, "Economics")?.books.sort()).toEqual(["keec1", "leec1"]);
    // Accountancy XII = Accountancy I + II (+ the Computerised Accounting option)
    expect(books(12, "Accountancy")?.books.sort()).toEqual(["leac1", "leac2", "leca1"]);
    expect(books(11, "Accountancy")?.books.sort()).toEqual(["keac1", "keac2"]);
    // English Elective XII = Kaleidoscope (NCERT's index spells it "Kaliedoscope")
    expect(books(12, "English Elective")?.books).toEqual(["lekl1"]);
    expect(books(11, "English Elective")?.books).toEqual(["keww1"]);
    // Biotechnology: CBSE prescribes its own textbook; NCERT's is a reference
    expect(books(11, "Biotechnology")).toMatchObject({ books: [], referenceBooks: ["kebt1"] });
    // English X: First Flight, Footprints Without Feet, Words and Expressions 2
    expect(books(10, "English - Language and Literature")?.books).toEqual(["jeff1", "jefp1", "jewe2"]);
  });

  it("CISCE covers classes 1-12 once, lists no textbooks, and links only to cisce.org", () => {
    const covered = CISCE.levels.flatMap((l) => l.classes).sort((a, b) => a - b);
    expect(covered).toEqual([...SCHOOL_CLASSES]);
    for (const lv of CISCE.levels) {
      expect(lv.subjects.length).toBeGreaterThan(0);
      for (const s of lv.subjects) for (const u of s.syllabusUrls ?? []) expect(u).toMatch(/^https:\/\/cisce\.org\/wp-content\/uploads\//);
      if (lv.classes[0] >= 9) expect(lv.subjects.every((s) => (s.syllabusUrls ?? []).length > 0)).toBe(true);
      expect(JSON.stringify(lv)).not.toMatch(/"books"|"chapters"/);
    }
  });
});

describe("no copies of official text beyond evidence lines (public repo)", () => {
  it("CBSE and CISCE sources are hash lists and link lists only", () => {
    expect(fs.readdirSync(path.join(ROOT, "sources/cbse"))).toEqual(["syllabus-pdfs-2026-09-25.tsv"]);
    for (const f of fs.readdirSync(path.join(ROOT, "sources/cisce"))) expect(f).toMatch(/\.links\.json$/);
    expect(JSON.stringify(CBSE.sources)).not.toMatch(/excerpt|snapshot/);
  });

  it("NCERT contents files hold only evidence blocks: header, title lines (or a short window) and two following lines", () => {
    const files = fs.readdirSync(path.join(ROOT, "sources/ncert/contents"));
    // one per book the builder read (also the two Hindi-script Home Science books it then filed as editions)
    for (const { book } of allBooks) expect(files).toContain(`${book.code}.txt`);
    for (const f of files) {
      const ev = evidenceFor(f.replace(/\.txt$/, ""));
      expect(ev.stray, f).toEqual([]);
      expect(ev.header.length, f).toBeLessThanOrEqual(10);
      for (const b of ev.blocks.values()) {
        expect(b.after.length, `${f} ${b.key}`).toBeLessThanOrEqual(2);
        expect(b.match.length, `${f} ${b.key}`).toBeLessThanOrEqual(8);
        for (const l of [...b.match, ...b.after]) expect(l.length, `${f} ${b.key}`).toBeLessThanOrEqual(260);
      }
    }
  });
});

describe("displayTitle", () => {
  it("title-cases ALL-CAPS contents lines and leaves printed mixed case alone", () => {
    expect(displayTitle("WORK, ENERGY AND POWER")).toBe("Work, Energy and Power");
    expect(displayTitle("CONSTITUTION: WHY AND HOW?")).toBe("Constitution: Why and How?");
    expect(displayTitle("INDIAN ECONOMY 1950-1990")).toBe("Indian Economy 1950-1990");
    expect(displayTitle("THEMES IN WORLD HISTORY PART II")).toBe("Themes in World History Part II");
    expect(displayTitle("Recent developments in indian politics")).toBe("Recent developments in indian politics");
    expect(displayTitle("I’m Up and Down, and Round and Round")).toBe("I’m Up and Down, and Round and Round");
  });
});
