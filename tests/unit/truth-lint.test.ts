// Truth-lint (src/lib/truth-lint.ts) — the honesty rules as tests.
// No DB, no network. Run with: npm test
//
// Two parts:
//  1. the page checks behave (a claim is caught, a true line is not);
//  2. a SOURCE SCAN: no string literal or JSX text in src/ or public/llms.txt
//     may carry a forbidden trust phrase or a stale count. Comments are
//     stripped first, because the audit history in comments quotes them.
//     A reintroduced "verified by students" fails CI here.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  checkAnswerKey,
  checkTitleDate,
  findForbiddenPhrases,
  parseUpdatesTitle,
  type ContextRow,
} from "@/lib/truth-lint";

const TODAY = "2026-09-13";

function ctxRow(day: string, tier: ContextRow["tier"], label = "Exam", examDay = true): ContextRow {
  return { day, label, examDay, tier, passed: false, line: 1, raw: `- ${label} — ${day} (${tier})` };
}

describe("findForbiddenPhrases", () => {
  it("catches an unbacked trust claim, case-insensitively", () => {
    const f = findForbiddenPhrases("Free mocks — Verified by students who cleared it.", "https://shishya.in/x");
    expect(f.map((x) => x.detail).join(" ")).toMatch(/verified by students/);
  });
  it("passes the honest replacement line", () => {
    const f = findForbiddenPhrases("AI-drafted, checked against the official notification.", "https://shishya.in/x");
    expect(f).toEqual([]);
  });
});

describe("checkAnswerKey — wire forms", () => {
  const base = { url: "u", contextRows: [], updatesRows: [], updatesCards: [], hubDates: [], todayIst: TODAY };
  it("does not pin a later row's (expected) on the answer key", () => {
    const f = checkAnswerKey({
      ...base,
      texts: [{ url: "u", text: "Answer key: not announced yet · Result: 15 Oct 2026 (expected)" }],
    });
    expect(f).toEqual([]);
  });
  it("does not flag a reported key followed by an expected result", () => {
    const f = checkAnswerKey({
      ...base,
      texts: [{ url: "u", text: "Answer key: 21 Jul 2026 (reported) · Result: 15 Sept 2026 (expected)" }],
    });
    expect(f).toEqual([]);
  });
  it("flags an answer key printed with an expected date", () => {
    const f = checkAnswerKey({ ...base, texts: [{ url: "u", text: "Answer key: 17 Sept (expected)" }] });
    expect(f).toHaveLength(1);
    expect(f[0].check).toBe("answer-key");
  });
});

describe("checkTitleDate — updates page tier word", () => {
  it("fails a bare title date when the exam day is only reported", () => {
    const title = parseUpdatesTitle("MPSC Group C 2026 Exam day 27 Sept 2026 — Exam date, notification | Shishya")!;
    const f = checkTitleDate({ title, contextRows: [ctxRow("2026-09-27", "reported")], todayIst: TODAY, url: "u", page: "updates" });
    expect(f.some((x) => x.severity === "fail")).toBe(true);
  });
  it("passes the same title once it says (reported)", () => {
    const title = parseUpdatesTitle("MPSC Group C 2026 Exam day 27 Sept 2026 (reported) — Exam date, notification | Shishya")!;
    expect(title.tier).toBe("reported");
    const f = checkTitleDate({ title, contextRows: [ctxRow("2026-09-27", "reported")], todayIst: TODAY, url: "u", page: "updates" });
    expect(f).toEqual([]);
  });
  it("passes a bare title date on an official exam day", () => {
    const title = parseUpdatesTitle("CDS 2026 Exam day 13 Sept 2026 — Exam date | Shishya")!;
    const f = checkTitleDate({ title, contextRows: [ctxRow("2026-09-13", "official")], todayIst: TODAY, url: "u", page: "updates" });
    expect(f).toEqual([]);
  });
});

// ── Source scan ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..", "..");

/** Replace comments with blank space of the same line count, so line
 *  numbers survive and only code / strings / JSX text remain. */
function stripComments(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  // Line comments: only when // starts the line (after whitespace) — a
  // mid-line // is too often part of a URL inside a string.
  out = out.replace(/^[ \t]*\/\/.*$/gm, "");
  return out;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

describe("source scan — no forbidden trust phrase or stale count ships", () => {
  it("src/**/*.{ts,tsx} and public/llms.txt are clean", () => {
    const files = sourceFiles(path.join(ROOT, "src")).filter(
      // The linter itself holds the phrase list.
      (f) => !f.endsWith(path.join("lib", "truth-lint.ts")),
    );
    // Instruction text that FORBIDS the claim is not the claim: the PYQ
    // generator's prompt tells the model never to reproduce a real PYQ.
    const ALLOWED_LINE = /(?:never|not|don'?t|do not)\s+(?:reproduce|copy)\s+(?:any\s+|a\s+)?real pyq|not (?:a |the )?real pyq|no real pyq/i;
    const hits: string[] = [];
    for (const file of files) {
      const text = stripComments(fs.readFileSync(file, "utf8"));
      for (const f of findForbiddenPhrases(text, path.relative(ROOT, file), { allow: (_p, line) => ALLOWED_LINE.test(line) })) {
        hits.push(`${f.url}:${f.line} ${f.detail} — ${f.snippet ?? ""}`);
      }
    }
    const llms = path.join(ROOT, "public", "llms.txt");
    if (fs.existsSync(llms)) {
      for (const f of findForbiddenPhrases(fs.readFileSync(llms, "utf8"), "public/llms.txt")) {
        hits.push(`${f.url}:${f.line} ${f.detail} — ${f.snippet ?? ""}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
