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
  buildNotesIndex,
  checkAnswerKey,
  checkHeldExamHidden,
  checkTitleDate,
  examNamesFromContext,
  findForbiddenPhrases,
  parseHubTitle,
  parseUpdatesTitle,
  rowKey,
  runChecksForExam,
  runTruthLint,
  type ContextRow,
  type ExamBundle,
  type UpdatesRow,
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

// ── 16 Sep 2026 rule changes ─────────────────────────────────────────────

// 16 Sep 2026, 11:30 IST.
const NOW = new Date("2026-09-16T06:00:00Z");
const TODAY16 = "2026-09-16";

function bundle(over: Partial<ExamBundle>): ExamBundle {
  const u = "https://shishya.in/exams/X";
  return {
    code: "X",
    hubUrl: u,
    hub: null,
    updatesUrl: `${u}/updates`,
    updates: null,
    cutoffUrl: `${u}/cutoff`,
    cutoff: null,
    scoreUrl: `${u}/score-estimate`,
    score: null,
    contextUrl: `${u}/context.md`,
    context: null,
    ...over,
  };
}

/** Hub Important Dates <li>, as src/app/exams/[code]/page.tsx renders it. */
function hubLi(label: string, dateText: string, notes?: string, examDay = false): string {
  return (
    `<li class="${examDay ? "rounded-md border-2 p-4 border-violet-300 bg-violet-50" : "rounded-md border border-ink-200 bg-ink-50/40 p-4 opacity-60"}">` +
    `<div class="flex items-baseline justify-between gap-2"><p class="text-sm font-medium text-ink-900">${examDay ? `<span class="mr-1">🧮</span>` : ""}${label}</p>` +
    `<span class="shrink-0 text-xs text-ink-500">Passed</span></div>` +
    `<p class="mt-1 text-xs text-ink-500">${dateText}</p>` +
    (notes ? `<p class="mt-1.5 text-xs text-ink-600">${notes}</p>` : "") +
    `</li>`
  );
}

/** Tracker table row, as src/app/exams/[code]/updates/page.tsx renders it. */
function trackerTr(label: string, dateText: string, tier: "emerald" | "sky" | "amber", notes?: string): string {
  return (
    `<tr class="border-t border-ink-100 text-ink-500"><td class="px-3 py-2"><span class="mr-1" aria-hidden="true">🔑</span><span class="">${label}</span>` +
    (notes ? `<p class="mt-0.5 text-xs text-ink-500">${notes}</p>` : "") +
    `</td><td class="whitespace-nowrap px-3 py-2"><span class="font-medium">${dateText}</span><span class="ml-2"><span class="rounded bg-${tier}-100 px-1.5">x</span></span></td>` +
    `<td class="whitespace-nowrap px-3 py-2 text-xs">Done</td></tr>`
  );
}

const tracker = (...trs: string[]) => `<html><title>t</title><table><tbody>${trs.join("")}</tbody></table></html>`;

describe("truthlint.3 — a failed context.md is a fetch error, never an answer-key FAIL", () => {
  const hub = `<html><title>GA GPSC 2026 — Exam Date Not Announced Yet, Free Mock Tests, PYQ | Shishya</title><ol>${hubLi("Junior Scale Officer answer key published", "Mon, 15 Jun, 2026")}</ol></html>`;
  it("context.md missing → no answer-key finding from the hub cross-check", () => {
    const f = runChecksForExam(bundle({ hub, context: null }), { now: NOW, liveExamCount: null });
    expect(f.filter((x) => x.check === "answer-key")).toEqual([]);
  });
  it("context.md present without the key row → the cross-check still fails (control)", () => {
    const context = "# Goa PSC (GA GPSC) — Shishya exam context\n## Key dates — rows\n- 2026-10-01 — Result — expected — in 15 days\n";
    const f = runChecksForExam(bundle({ hub, context }), { now: NOW, liveExamCount: null });
    expect(f.some((x) => x.check === "answer-key" && x.severity === "fail")).toBe(true);
  });
});

describe("truthlint.4 — an out-of-window hub answer key is read off the tracker", () => {
  const hubDates = [{ label: "Final answer key released", dateText: "Thu, 7 May, 2026", date: "2026-05-07" }];
  const base = { url: "u", contextRows: [], updatesCards: [], texts: [], todayIst: TODAY16, hubDates };
  const row = (tier: UpdatesRow["tier"], label = "Final answer key released"): UpdatesRow => ({ label, dateText: "Thu, 7 May, 2026", date: "2026-05-07", tier, status: "Done" });
  it("a Reported tracker row backs it: no finding", () => {
    expect(checkAnswerKey({ ...base, updatesRows: [row("reported")] })).toEqual([]);
  });
  it("an Official row with another answer-key label that day backs it too", () => {
    expect(checkAnswerKey({ ...base, updatesRows: [row("official", "Provisional answer key")] })).toEqual([]);
  });
  it("an Expected tracker row is a FAIL for the hub row too (not only the tracker row)", () => {
    const f = checkAnswerKey({ ...base, updatesRows: [row("expected")] });
    expect(f.map((x) => x.severity)).toEqual(["fail", "fail"]);
    expect(f.some((x) => /^hub answer-key row .* is Expected on the tracker$/.test(x.detail))).toBe(true);
  });
  it("not on the tracker at all: still a warn", () => {
    const f = checkAnswerKey({ ...base, updatesRows: [] });
    expect(f.map((x) => x.severity)).toEqual(["warn"]);
  });
});

describe("truthlint.5 — an expected tracker title past the +365-day window is not cache skew", () => {
  it("NL_NPSC 15 Nov 2027 (expected), no context row → no finding", () => {
    const title = parseUpdatesTitle("Nagaland PSC 2027 Exam day 15 Nov 2027 (expected) — Exam date, notification | Shishya")!;
    expect(checkTitleDate({ title, contextRows: [], todayIst: TODAY16, url: "u", page: "updates" })).toEqual([]);
  });
  it("inside the window a missing row still warns (control)", () => {
    const title = parseUpdatesTitle("X 2026 Exam day 15 Nov 2026 (expected) — Exam date | Shishya")!;
    expect(checkTitleDate({ title, contextRows: [], todayIst: TODAY16, url: "u", page: "updates" }).map((x) => x.severity)).toEqual(["warn"]);
  });
});

describe("truthlint.6 — Hindi / Telugu trackers are checked for expected answer keys", () => {
  it("an Expected answer-key row only on /hi/…/updates is a FAIL on that URL", () => {
    const hiUrl = "https://shishya.in/hi/exams/X/updates";
    const f = runChecksForExam(
      bundle({
        updates: tracker(trackerTr("Result", "सोम, 5 अक्टू॰ 2026", "amber")),
        twins: [{ url: hiUrl, kind: "updates", html: tracker(trackerTr("Answer key (expected)", "सोम, 5 अक्टू॰ 2026", "amber")) }],
      }),
      { now: NOW, liveExamCount: null },
    );
    const keys = f.filter((x) => x.check === "answer-key");
    expect(keys).toHaveLength(1);
    expect(keys[0].severity).toBe("fail");
    expect(keys[0].url).toBe(hiUrl);
  });
});

describe("a /cutoff 404 is a finding only while the hub links it", () => {
  const run = (hub: string) =>
    runTruthLint({
      base: "https://t.example",
      codes: ["MP_RAEO"],
      now: NOW,
      fetchImpl: async (url) => {
        const body = url.endsWith("/exams/MP_RAEO") ? hub : url.endsWith("/cutoff") || url.endsWith("/score-estimate") ? null : "<html><title>x</title></html>";
        return { status: body == null ? 404 : 200, text: async () => body ?? "" };
      },
    });
  it("unlinked (the page gate is closed) → no fetch warn", async () => {
    const r = await run("<html><title>MP RAEO 2026 — Exam Date 17 Sept 2026, Free Mock Tests, PYQ | Shishya</title></html>");
    expect(r.findings.filter((f) => f.check === "fetch")).toEqual([]);
  });
  it("still linked from the hub → HTTP 404 warn", async () => {
    const r = await run(`<html><title>t</title><a href="/exams/MP_RAEO/cutoff">Cutoff</a></html>`);
    expect(r.findings.filter((f) => f.check === "fetch").map((f) => f.url)).toEqual(["https://t.example/exams/MP_RAEO/cutoff"]);
  });
});

describe("truthlint.7 — the route comment tells the truth about its schedule", () => {
  it("claims a vercel.json schedule only when vercel.json has one", () => {
    const vercel = fs.readFileSync(path.resolve(__dirname, "..", "..", "vercel.json"), "utf8");
    const route = fs.readFileSync(path.resolve(__dirname, "..", "..", "src", "app", "api", "cron", "truth-lint", "route.ts"), "utf8");
    const scheduled = vercel.includes("/api/cron/truth-lint");
    expect(/Schedule: vercel\.json/.test(route)).toBe(scheduled);
    if (!scheduled) expect(route).toMatch(/NOT scheduled/);
  });
});

describe("held exam behind 'Exam Date Not Announced Yet' (hub-title.ts decision)", () => {
  const IOQM = { code: "IOQM", shortName: "IOQM", name: "Indian Olympiad Qualifier in Mathematics" };
  const notAnnounced = parseHubTitle("IOQM 2026 — Exam Date Not Announced Yet, Free Mock Tests, PYQ | Shishya");
  const heldRow = ctxRow("2026-09-06", "reported", "IOQM 2026 exam day");
  const seen = (rows: ContextRow[], notes: string | null = null) => new Map(rows.map((r) => [rowKey(r.day, r.label), notes] as const));
  const run = (title = notAnnounced, rows: ContextRow[] = [heldRow], notes = seen(rows), exam = IOQM) =>
    checkTitleDate({ title, contextRows: rows, todayIst: TODAY16, url: "u", page: "hub", exam, notes });

  it("an announced exam held 10 days ago → FAIL", () => {
    const f = run();
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("fail");
    expect(f[0].detail).toMatch(/2026-09-06/);
  });

  it("the held title the page now renders passes, and parses its date and tier", () => {
    const title = parseHubTitle("IOQM 2026 — Exam Held 6 Sept 2026 (reported), Next Exam Date Not Announced Yet, Free Mock Tests, PYQ | Shishya");
    expect(title.kind).toBe("not-announced");
    expect(title.held).toEqual({ date: "2026-09-06", tier: "reported" });
    expect(run(title)).toEqual([]);
  });

  it("hi / te held titles parse", () => {
    const hi = parseHubTitle("SBI PO 2026 — मेन्स परीक्षा 12 Sept 2026 को हुई (रिपोर्टेड), अगली परीक्षा तिथि अभी घोषित नहीं, मुफ़्त मॉक टेस्ट, पिछले साल के पेपर | Shishya");
    const te = parseHubTitle("CDS 2026 — పరీక్ష 13 Sept 2026న జరిగింది, తదుపరి పరీక్ష తేదీ ఇంకా ప్రకటించలేదు, ఉచిత మాక్ టెస్టులు, గత సంవత్సరాల పేపర్లు | Shishya");
    expect(hi.held).toEqual({ date: "2026-09-12", tier: "reported" });
    expect(te.held).toEqual({ date: "2026-09-13", tier: null });
  });

  it("a held lead must name an announced exam day with its tier word", () => {
    const bare = parseHubTitle("IOQM 2026 — Exam Held 6 Sept 2026, Next Exam Date Not Announced Yet, Free Mock Tests, PYQ | Shishya");
    expect(run(bare).map((x) => x.severity)).toEqual(["fail"]);
    const wrongDay = parseHubTitle("IOQM 2026 — Exam Held 7 Sept 2026 (reported), Next Exam Date Not Announced Yet, Free Mock Tests, PYQ | Shishya");
    expect(run(wrongDay).map((x) => x.severity)).toEqual(["fail"]);
  });

  it("rows the decision rejects are not a FAIL: another exam's row, a called-off row, older than 60 days, an estimate", () => {
    const LA = { code: "LA_LPSC", shortName: "LPSC", name: "Ladakh Public Service Commission" };
    expect(run(notAnnounced, [ctxRow("2026-09-10", "reported", "UPSC CSE 2026 Mains Exam")], undefined, LA)).toEqual([]);
    expect(run(notAnnounced, [heldRow], seen([heldRow], "Postponed; new date to be announced"))).toEqual([]);
    expect(run(notAnnounced, [ctxRow("2026-07-10", "official", "IOQM 2026 exam day")])).toEqual([]);
    expect(run(notAnnounced, [ctxRow("2026-09-06", "expected", "IOQM 2026 exam day")])).toEqual([]);
  });

  it("notes the tracker and hub never showed could decide it → warn, not FAIL", () => {
    const f = checkHeldExamHidden({ title: notAnnounced, contextRows: [heldRow], todayIst: TODAY16, url: "u", exam: IOQM, notes: new Map() });
    expect(f.map((x) => x.severity)).toEqual(["warn"]);
  });

  it("a held lead the decision does not give over every context.md row → FAIL (AP TET, capped hub rows)", () => {
    // Live 16 Sep 2026: the hub's cached rows (3 before the last 10 days)
    // drop the 5 Aug row whose notes put the CBT on 5-16 Aug, so the page
    // leads "Exam Ended 21 Aug 2026 (reported)"; over all rows hub-title.ts
    // gives no held date.
    const AP_TET = { code: "AP_TET", shortName: "AP TET", name: "Andhra Pradesh Teacher Eligibility Test" };
    const title = parseHubTitle("AP TET (Andhra Pradesh) 2026 — Exam Ended 21 Aug 2026 (reported), Next Exam Date Not Announced Yet, Free Mock Tests, PYQ | Shishya");
    expect(title.held).toEqual({ date: "2026-08-21", tier: "reported" });
    const cbtWindow = ctxRow("2026-08-05", "reported", "AP TET Exam (June 2026 - Paper 1 & 2)");
    const lastDay = ctxRow("2026-08-21", "reported", "AP TET Exam last day");
    const notes = new Map<string, string | null>([
      [rowKey(cbtWindow.day, cbtWindow.label), "CBT conducted from August 5-16, 2026 in two daily shifts"],
      [rowKey(lastDay.day, lastDay.label), null],
    ]);
    const f = run(title, [cbtWindow, lastDay], notes, AP_TET);
    expect(f.map((x) => x.severity)).toEqual(["fail"]);
    expect(f[0].detail).toMatch(/no held date/);
    // The rows the capped page saw: held, as the page says.
    expect(run(title, [lastDay], notes, AP_TET)).toEqual([]);
    // A past exam-day row whose notes the checker never saw: quiet.
    expect(run(title, [cbtWindow, lastDay], new Map<string, string | null>([[rowKey(lastDay.day, lastDay.label), null]]), AP_TET)).toEqual([]);
  });

  it("context.md header names parse, including a bracketed short name", () => {
    expect(examNamesFromContext("# Arunachal Pradesh PSC Civil Services Prelims (APPSC (AR)) — Shishya exam context\n", "AR_APPSC_AR")).toEqual({
      code: "AR_APPSC_AR",
      name: "Arunachal Pradesh PSC Civil Services Prelims",
      shortName: "APPSC (AR)",
    });
    expect(examNamesFromContext("# CS Foundation (ICSI / CSEET) (CS Foundation (CSEET)) — Shishya exam context\n", "CS_FOUNDATION")).toEqual({
      code: "CS_FOUNDATION",
      name: "CS Foundation (ICSI / CSEET)",
      shortName: "CS Foundation (CSEET)",
    });
    expect(examNamesFromContext("# no header here\n", "X")).toBeNull();
  });

  it("no exam names (context.md header unread) → the rule is skipped", () => {
    expect(checkTitleDate({ title: notAnnounced, contextRows: [heldRow], todayIst: TODAY16, url: "u", page: "hub" })).toEqual([]);
  });

  it("end to end over the wire grammars: context.md + hub + tracker notes", () => {
    const context =
      "# Indian Olympiad Qualifier in Mathematics (IOQM) — Shishya exam context\n" +
      "## Key dates — every tracker row\n" +
      "- 2026-09-06 — IOQM 2026 exam day (exam day) — REPORTED (announced; via adda247.com): https://www.adda247.com/x\n";
    expect(examNamesFromContext(context, "IOQM")).toEqual(IOQM);
    const hub = `<html><title>IOQM 2026 — Exam Date Not Announced Yet, Free Mock Tests, PYQ | Shishya</title><ol>${hubLi("IOQM 2026 exam day", "Sun, 6 Sept, 2026", undefined, true)}</ol></html>`;
    const f = runChecksForExam(bundle({ code: "IOQM", hub, context }), { now: NOW, liveExamCount: null });
    expect(f.filter((x) => x.check === "title-date").map((x) => x.severity)).toEqual(["fail"]);

    // The same row on the tracker with a multi-day window in its notes: the
    // page's decision keeps "Not Announced Yet", so the checker does too.
    const updates = tracker(trackerTr("IOQM 2026 exam day", "Sun, 6 Sept, 2026", "sky", "Exam held over multiple days"));
    const notes = buildNotesIndex([
      { date: "2026-09-06", label: "IOQM 2026 exam day", notes: "Exam held over multiple days" },
      { date: "2026-09-06", label: "🧮 IOQM 2026 exam day", notes: "Exam held over multiple days" },
    ]);
    expect(notes.get(rowKey("2026-09-06", "IOQM 2026 exam day"))).toBe("Exam held over multiple days");
    const hub2 = `<html><title>IOQM 2026 — Exam Date Not Announced Yet, Free Mock Tests, PYQ | Shishya</title><ol></ol></html>`;
    const g = runChecksForExam(bundle({ code: "IOQM", hub: hub2, updates, context }), { now: NOW, liveExamCount: null });
    expect(g.filter((x) => x.check === "title-date")).toEqual([]);
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
