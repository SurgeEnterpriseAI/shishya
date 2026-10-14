// Every writer of a question's translated text clears its cached translations
// in the same transaction (14 Oct 2026, src/lib/question-translation-cache.ts).
//
// The 13 Oct 2026 translation review found the student-report sweep
// (src/lib/question-sweep.ts), its CLI twin scripts/fix-reported-questions.ts,
// the admin editor (src/app/api/admin/questions/[id]/route.ts) and the answer
// check (scripts/verify-question-bank.ts) changing a question's key or
// solution and leaving its QuestionTranslation rows: Hindi, Telugu… readers
// saw the corrected key beside a translated solution for the old one.
//
// This scan walks src/ and scripts/ for every Question write (the ORM's
// question.update / updateMany / upsert on any client, and raw
// `UPDATE "Question"` SQL) and works out whether its data may set body,
// options, answerKey or solution: a top-level key, a spread that names one,
// an identifier whose declaration or later `x.key = …` assignment in the same
// file names one, or data the scan cannot read (treated as text). Each such
// write must run on an interactive transaction's client, inside that
// $transaction callback, and the same callback must call
// clearQuestionTranslations(<that client>, …). Raw SQL may not set those
// columns at all. A write the scan cannot place fails with its file and line,
// so a new writer is wired, not forgotten.
//
// Not scanned: scripts/ai-eval/ (untracked, read-only eval tooling: every
// write is refused by its ro-prisma guard, and selftest.ts writes on purpose
// to prove it) and scripts/tmp-* (local scratch, not part of the repository).
// Allowed without the helper: the 13 Oct hand bank fix, scripts/fix-bank-
// items-10-2026.ts (applied 13 Oct). Its apply deletes each logged
// translation itself, in the same transaction, for its --undo. Its undo puts
// the old text back but KEEPS a translation made since the fix (the 13 Oct
// script's tests, in the quality worktree, pin that), so a run of that undo
// needs scripts/clear-stale-translations-10-2026b.ts after it: reported, not
// changed here. Both writes are allowed only by their exact data expression,
// so any other write in that file is still checked. Its follow-up,
// scripts/fix-bank-items-10-2026b.ts, needs no exception: its apply and its
// undo both call clearQuestionTranslations(tx, …) in the write's transaction
// (the undo then re-creates the logged rows of the old text).
//
// No DB. Run: npx vitest run tests/unit/question-translation-cache-writers.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TRANSLATED_FIELDS } from "@/lib/question-translation-cache";

const ROOT = path.resolve(__dirname, "../..");
const SCAN_DIRS = ["src", "scripts"];
const SKIP = [/^scripts\/ai-eval\//, /^scripts\/tmp-/, /(^|\/)node_modules\//];
/** Writers allowed their own logged delete, by the exact data of each write. */
const BANK_FIX_WRITES = { apply: "updateData(p.after)", undoGap: "updateData(s.entry.before)" };
const OWN_DELETE_ALLOWED = new Map([["scripts/fix-bank-items-10-2026.ts", BANK_FIX_WRITES]]);

// ── A small source reader: brackets, strings, template literals, comments ──

function skipString(s: string, i: number): number {
  const q = s[i];
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === "\\") j++;
    else if (s[j] === q) return j;
    else if (s[j] === "\n") return j; // unterminated: stop at the line end
  }
  return s.length - 1;
}
function skipTemplate(s: string, i: number): number {
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === "\\") j++;
    else if (s[j] === "`") return j;
    else if (s[j] === "$" && s[j + 1] === "{") {
      const end = matchClose(s, j + 1);
      if (end < 0) return s.length - 1;
      j = end;
    }
  }
  return s.length - 1;
}
/** Index of the bracket closing the one at `open`, or -1. */
function matchClose(s: string, open: number): number {
  const closer: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const stack: string[] = [];
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") i = skipString(s, i);
    else if (c === "`") i = skipTemplate(s, i);
    else if (c === "/" && s[i + 1] === "/") {
      const nl = s.indexOf("\n", i);
      if (nl < 0) return -1;
      i = nl;
    } else if (c === "/" && s[i + 1] === "*") {
      const end = s.indexOf("*/", i + 2);
      if (end < 0) return -1;
      i = end + 1;
    } else if (closer[c]) stack.push(closer[c]);
    else if (c === ")" || c === "}" || c === "]") {
      if (stack.pop() !== c) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

type Entry = { kind: "prop"; key: string; value: string } | { kind: "shorthand"; key: string } | { kind: "spread"; expr: string } | { kind: "other"; text: string };

/** Top-level entries of an object literal's text ("{ … }"). */
function topLevelEntries(obj: string): Entry[] {
  const t = obj.trim();
  if (!t.startsWith("{")) throw new Error("not an object literal");
  const end = matchClose(t, 0);
  const body = t.slice(1, end < 0 ? t.length : end);
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '"' || c === "'") i = skipString(body, i);
    else if (c === "`") i = skipTemplate(body, i);
    else if (c === "(" || c === "{" || c === "[") {
      const close = matchClose(body, i);
      if (close < 0) break;
      i = close;
    } else if (c === ",") {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  const out: Entry[] = [];
  for (const raw of parts) {
    const p = raw.replace(/\/\/[^\n]*(\n|$)/g, "\n").trim();
    if (!p) continue;
    if (p.startsWith("...")) out.push({ kind: "spread", expr: p.slice(3).trim() });
    else {
      const m = p.match(/^(?:([A-Za-z_$][\w$]*)|"([^"]+)"|'([^']+)')\s*:\s*([\s\S]*)$/);
      if (m) out.push({ kind: "prop", key: m[1] ?? m[2] ?? m[3], value: m[4] });
      else if (/^[A-Za-z_$][\w$]*$/.test(p)) out.push({ kind: "shorthand", key: p });
      else out.push({ kind: "other", text: p });
    }
  }
  return out;
}

const FIELDS = TRANSLATED_FIELDS.join("|");
const TEXT_KEY_IN = new RegExp(`(?:^|[\\s{,(])(?:${FIELDS})\\s*(?::|,|\\}|$)`);
const isTextKey = (k: string) => (TRANSLATED_FIELDS as readonly string[]).includes(k);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Verdict = "yes" | "no" | "unknown";

/** Whether an update's data may set a translated field ("unknown" counts as yes).
 *  `src` (the whole file) lets a plain identifier be read from its declaration
 *  in that file, `const data: any = { … }`, plus every later `data.key = …`. */
function dataWritesText(dataExpr: string, src = ""): Verdict {
  const d = dataExpr.trim();
  if (/^[A-Za-z_$][\w$]*$/.test(d)) {
    if (!src) return "unknown";
    const decl = new RegExp(`\\b(?:const|let|var)\\s+${esc(d)}\\b[^=;]*=\\s*`).exec(src);
    if (!decl) return "unknown";
    const at = decl.index + decl[0].length;
    if (src[at] !== "{") return "unknown";
    const close = matchClose(src, at);
    if (close < 0) return "unknown";
    const assigned = [...src.matchAll(new RegExp(`\\b${esc(d)}\\.([A-Za-z_$][\\w$]*)\\s*=(?!=)`, "g"))].map((m) => m[1]);
    if (assigned.some(isTextKey)) return "yes";
    return dataWritesText(src.slice(at, close + 1));
  }
  if (!d.startsWith("{")) return "unknown";
  let unknown = false;
  for (const e of topLevelEntries(d)) {
    if ((e.kind === "prop" || e.kind === "shorthand") && isTextKey(e.key)) return "yes";
    if (e.kind === "spread") {
      if (TEXT_KEY_IN.test(e.expr)) return "yes";
      if (!e.expr.includes("{")) unknown = true; // a spread of a variable or a call
    }
    if (e.kind === "other") unknown = true;
  }
  return unknown ? "unknown" : "no";
}

interface WriteSite {
  file: string;
  line: number;
  kind: "orm" | "raw";
  receiver: string;
  method: string;
  /** The data the write sets (ORM: data, or update for an upsert; raw: the SET clause). */
  data: string;
  writesText: Verdict;
  /** The interactive transaction the write runs in, when its client is that callback's parameter. */
  tx: { param: string; body: string } | null;
}

const lineOf = (s: string, i: number) => s.slice(0, i).split("\n").length;

/** Every $transaction(async (p) => …) callback in the file: its parameter and span. */
function transactions(src: string): { param: string; start: number; end: number; body: string }[] {
  const out: { param: string; start: number; end: number; body: string }[] = [];
  for (const m of src.matchAll(/\$transaction\s*\(/g)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    const close = matchClose(src, open);
    if (close < 0) continue;
    const inner = src.slice(open + 1, close);
    const p = inner.match(/^\s*async\s*\(\s*([A-Za-z_$][\w$]*)\s*(?::[^)]*)?\)\s*=>/);
    if (p) out.push({ param: p[1], start: open, end: close, body: inner });
  }
  return out;
}

function scanSource(file: string, src: string): WriteSite[] {
  const sites: WriteSite[] = [];
  const txs = transactions(src);
  const enclosing = (at: number, receiver: string) => {
    const hit = txs.filter((t) => t.start < at && at < t.end && t.param === receiver).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    return hit ? { param: hit.param, body: hit.body } : null;
  };
  for (const m of src.matchAll(/\b([A-Za-z_$][\w$]*)\.question\.(update|updateMany|upsert)\s*\(/g)) {
    const at = m.index ?? 0;
    const open = at + m[0].length - 1;
    const close = matchClose(src, open);
    const args = close > 0 ? src.slice(open + 1, close).trim() : "";
    let data = "";
    if (args.startsWith("{")) {
      const want = m[2] === "upsert" ? "update" : "data";
      for (const e of topLevelEntries(args)) {
        if (e.kind === "prop" && e.key === want) data = e.value.trim();
        else if (e.kind === "shorthand" && e.key === want) data = want;
      }
    }
    sites.push({ file, line: lineOf(src, at), kind: "orm", receiver: m[1], method: m[2], data, writesText: data ? dataWritesText(data, src) : "unknown", tx: enclosing(at, m[1]) });
  }
  const cols = new RegExp(`(?:^|,)\\s*\\\\?"?(?:${FIELDS})\\\\?"?\\s*=`, "i");
  for (const m of src.matchAll(/UPDATE\s+\\?"Question\\?"/g)) {
    const at = m.index ?? 0;
    const rest = src.slice(at, at + 1500);
    const set = rest.match(/\bSET\b([\s\S]*?)\bWHERE\b/i)?.[1] ?? rest;
    sites.push({ file, line: lineOf(src, at), kind: "raw", receiver: "", method: "UPDATE", data: set.trim(), writesText: cols.test(set) ? "yes" : "no", tx: null });
  }
  return sites;
}

/** Why a site breaks the rule, or null. */
function violation(site: WriteSite): string | null {
  if (site.writesText === "no") return null;
  const where = `${site.file}:${site.line}`;
  if (site.kind === "raw") return `${where}: raw SQL sets ${site.data.slice(0, 60)}: write a question's text through the ORM in a transaction that calls clearQuestionTranslations`;
  const allowed = OWN_DELETE_ALLOWED.get(site.file);
  if (allowed && site.data === allowed.undoGap) return null; // its undo: the gap the header reports
  if (!site.tx) return `${where}: ${site.receiver}.question.${site.method} may set ${FIELDS} outside an interactive transaction: run it on the client of prisma.$transaction(async (tx) => …) and call clearQuestionTranslations(tx, id) there`;
  if (new RegExp(`\\bclearQuestionTranslations\\(\\s*${esc(site.tx.param)}\\s*,`).test(site.tx.body)) return null;
  if (allowed && site.data === allowed.apply && new RegExp(`\\b${esc(site.tx.param)}\\.questionTranslation\\.delete(?:Many)?\\(`).test(site.tx.body)) return null;
  return `${where}: ${site.receiver}.question.${site.method} may set ${FIELDS} but its transaction never calls clearQuestionTranslations(${site.tx.param}, …)`;
}

function listFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(ROOT, p).replace(/\\/g, "/") + (e.isDirectory() ? "/" : "");
    if (SKIP.some((re) => re.test(rel))) continue;
    if (e.isDirectory()) listFiles(p, out);
    else if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const read = (p: string) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const allSites: WriteSite[] = SCAN_DIRS.flatMap((d) => listFiles(path.join(ROOT, d))).flatMap((p) => scanSource(path.relative(ROOT, p).replace(/\\/g, "/"), read(p)));
const textSites = allSites.filter((s) => s.writesText !== "no");
const filesOf = (xs: WriteSite[]) => [...new Set(xs.map((s) => s.file))].sort();

describe("the scanner (synthetic sources)", () => {
  it("reads top-level data keys, spreads, identifiers and opaque data", () => {
    expect(dataWritesText("{ validated: false }")).toBe("no");
    expect(dataWritesText("{ answerKey: k, solution }")).toBe("yes");
    expect(dataWritesText('{ validated: pass, metadata: { factoryVerify: { ...prev, solution: "x" } } }')).toBe("no");
    expect(dataWritesText('{ ...(ok ? { source: "AI_VALIDATED" as const } : {}), validated: true }')).toBe("no");
    expect(dataWritesText("{ ...(corrected ? { answerKey: v.correctKey!, ...(b ? { solution: b } : {}) } : {}) }")).toBe("yes");
    expect(dataWritesText("{ ...updateData }")).toBe("unknown");
    expect(dataWritesText("updateData(p.after)")).toBe("unknown");
    expect(dataWritesText("data")).toBe("unknown");
    // An identifier is read from its declaration and later assignments in the same file.
    expect(dataWritesText("data", "const data: any = {};\nif (x) data.validated = true;\nif (y) data.solution = s;")).toBe("yes");
    expect(dataWritesText("updateData", "const updateData: any = { validated: true, validatedAt: new Date() };\nupdateData.source = S;")).toBe("no");
    expect(dataWritesText("data", "const data = { validated, ...(c ? { answerKey: k } : {}) };")).toBe("yes");
    expect(dataWritesText("data", "const data = build();")).toBe("unknown");
    expect(dataWritesText("data", "let other = 1;")).toBe("unknown");
  });

  it("passes a text write in a transaction that clears, fails one that does not", () => {
    const good = "await prisma.$transaction(async (tx) => {\n  await tx.question.update({ where: { id }, data: { answerKey: k } });\n  await clearQuestionTranslations(tx, id);\n});";
    const noTx = "await prisma.question.update({ where: { id }, data: { solution: s } });";
    const noClear = "const data = { body: b };\nawait prisma.$transaction(async (tx) => {\n  await tx.question.update({ where: { id }, data });\n});";
    const wrongClient = "await prisma.$transaction(async (tx) => {\n  await prisma.question.update({ where: { id }, data: { body: b } });\n  await clearQuestionTranslations(tx, id);\n});";
    const otherTxClears = "await prisma.$transaction(async (tx) => {\n  await tx.question.update({ where: { id }, data: { options: o } });\n});\nawait prisma.$transaction(async (tx) => { await clearQuestionTranslations(tx, id); });";
    const upsert = "await prisma.question.upsert({ where: { id }, create: { id }, update: { answerKey: k } });";
    const flagOnly = "await prisma.question.update({ where: { id }, data: { validated: false } });";
    const raw = 'await prisma.$executeRawUnsafe(`UPDATE "Question" SET "answerKey" = $2 WHERE id = $1`, id, k);';
    const rawMeta = "await prisma.$executeRawUnsafe(`UPDATE \"Question\"\n SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{x}', '1', true)\n WHERE id = $1`, id);";
    expect(scanSource("good.ts", good).map(violation)).toEqual([null]);
    expect(scanSource("noTx.ts", noTx).map(violation)[0]).toMatch(/outside an interactive transaction/);
    expect(scanSource("noClear.ts", noClear).map(violation)[0]).toMatch(/never calls clearQuestionTranslations/);
    expect(scanSource("wrongClient.ts", wrongClient).map(violation)[0]).toMatch(/outside an interactive transaction/);
    expect(scanSource("otherTx.ts", otherTxClears).map(violation)[0]).toMatch(/never calls clearQuestionTranslations/);
    expect(scanSource("upsert.ts", upsert).map(violation)[0]).toMatch(/outside an interactive transaction/);
    expect(scanSource("flag.ts", flagOnly).map(violation)).toEqual([null]);
    expect(scanSource("raw.ts", raw).map(violation)[0]).toMatch(/raw SQL sets/);
    expect(scanSource("rawMeta.ts", rawMeta).map(violation)).toEqual([null]);
  });

  it("allows the bank fix's own logged delete only for its two exact writes", () => {
    const f = "scripts/fix-bank-items-10-2026.ts";
    const apply = "await db.$transaction(async (tx) => {\n  await tx.question.update({ where: { id }, data: updateData(p.after) });\n  await tx.questionTranslation.delete({ where: { id: t.id } });\n});";
    const other = "await db.$transaction(async (tx) => {\n  await tx.question.update({ where: { id }, data: { solution: s } });\n  await tx.questionTranslation.delete({ where: { id: t.id } });\n});";
    expect(scanSource(f, apply).map(violation)).toEqual([null]);
    expect(scanSource(f, other).map(violation)[0]).toMatch(/never calls clearQuestionTranslations/);
    expect(scanSource("scripts/other.ts", apply).map(violation)[0]).toMatch(/never calls clearQuestionTranslations/);
  });
});

describe("every writer of a question's text clears its cached translations in the same transaction", () => {
  it("finds the known writers (the scan can see them)", () => {
    const files = filesOf(textSites);
    for (const f of ["src/lib/question-sweep.ts", "scripts/fix-reported-questions.ts", "src/app/api/admin/questions/[id]/route.ts", "scripts/verify-question-bank.ts", "scripts/fix-bank-items-10-2026b.ts"]) {
      expect(files, `the scan no longer finds ${f}'s text write: check the scanner`).toContain(f);
    }
    // The flag-only writers stay flag-only (validated / validatedBy / source / metadata).
    const flagOnly = filesOf(allSites.filter((s) => s.writesText === "no"));
    for (const f of ["src/app/api/admin/questions/bulk-validate/route.ts", "src/lib/question-sweep.ts", "scripts/sme-bulk-validate.ts", "scripts/validate-all-ai-questions.ts", "src/lib/pretranslate.ts"]) {
      expect(flagOnly, f).toContain(f);
    }
  });

  it("no Question write sets body/options/answerKey/solution without clearQuestionTranslations in its transaction", () => {
    const bad = allSites.map(violation).filter((v): v is string => v !== null);
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("each named writer: the text write and the clear share one transaction client", () => {
    const pins: [string, RegExp][] = [
      ["src/lib/question-sweep.ts", /prisma\.\$transaction\(async \(tx\) => \{\n\s+await tx\.question\.update\(\{ where: \{ id: questionId \}, data: \{ answerKey: newKey, solution \} \}\);\n\s+return clearQuestionTranslations\(tx, questionId\);/],
      ["scripts/fix-reported-questions.ts", /db\.\$transaction\(async \(tx\) => \{\n\s+await tx\.question\.update\(\{ where: \{ id: questionId \}, data: \{ answerKey, solution \} \}\);\n\s+return clearQuestionTranslations\(tx, questionId\);/],
      ["src/app/api/admin/questions/[id]/route.ts", /const textChanged = changedTranslatedFields\(existing, data\);[\s\S]{0,120}prisma\.\$transaction\(async \(tx\) => \{\n\s+const updated = await tx\.question\.update\(\{ where: \{ id \}, data \}\);\n\s+const translationsCleared = textChanged\.length > 0 \? await clearQuestionTranslations\(tx, id\) : 0;/],
      ["scripts/verify-question-bank.ts", /const textChanged = changedTranslatedFields\(r, data\)\.length > 0;\n\s+await prisma\.\$transaction\(async \(tx\) => \{\n\s+await tx\.question\.update\(\{ where: \{ id: r\.id \}, data \}\);\n\s+if \(textChanged\) await clearQuestionTranslations\(tx, r\.id\);/],
    ];
    for (const [f, re] of pins) expect(read(path.join(ROOT, f)), f).toMatch(re);
    // The sweep's two key-fix paths both go through writeKeyFix; nothing else in it writes text.
    const sweep = read(path.join(ROOT, "src/lib/question-sweep.ts"));
    expect(sweep.match(/await writeKeyFix\(/g)).toHaveLength(2);
    expect(scanSource("src/lib/question-sweep.ts", sweep).filter((s) => s.writesText !== "no")).toHaveLength(1);
  });

  it("scripts/fix-reported-questions.ts runs nothing when imported (so its write can be tested)", () => {
    const src = read(path.join(ROOT, "scripts/fix-reported-questions.ts"));
    expect(src).toContain('if (/fix-reported-questions\\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {\n  main()');
    expect(src).not.toMatch(/^const prisma = new PrismaClient\(\)/m);
  });
});
