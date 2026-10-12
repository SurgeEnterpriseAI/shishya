// Release 2 (14 Oct 2026), part A: an AI-made tracker date is never "official".
//
// On 10 Oct 2026, 547 live ExamImportantDate rows written by the refresh
// generator (source "ai-generated:claude"; 1,640 stored with confidence
// "official") cited a conducting body's site and were labelled "official" —
// 52 of them dated in the next 180 days (SSC CGL 30 Oct, TNPSC Group 2 1 Nov,
// KPSC KAS 15 Nov, CAT 29 Nov, SSC CHSL 30 Nov, 24 on SOF / Silverzone
// olympiads; scripts/measure-ai-official-dates.ts). src/lib/official-source.ts dateRowTier
// caps such a row at "reported" until a person gives it a checked provenance.
//
// This file runs on the working tree as it is (no buildTimeline change needed):
// the tier rule, the exam calendar's rows, the context.md tag and the
// surfaces that read a date row's tier outside buildTimeline. The buildTimeline
// half (hub, /updates, context.md, mails, .ics) is in
// tests/unit/ai-made-date-timeline.test.ts, which ships with the
// src/lib/exam-timeline.ts patch. No DB, no network.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dateRowTier, isAiMadeProvenance, isCheckedProvenance, sourceTier } from "@/lib/official-source";
import { CONTEXT_KEY_DATES_HEADING, REPORTED_GLOSS, coachPrefillDateNote, contextDateTag, reportedGloss, reportedNote } from "@/lib/date-tier-view";
import { calendarRows, type CalendarSourceRow } from "@/lib/exam-calendar-rows";
import { announcedFactKeys, GEN_SOURCE } from "@/lib/exam-data-writer";
import { OFFICIAL_WATCH_SOURCE, SUPPRESSED_SOURCE } from "@/lib/exam-timeline";
import { parseContextTimeline } from "@/lib/truth-lint";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const SSC = "https://ssc.gov.in/api/attachment/notice.pdf";
const TESTBOOK = "https://testbook.com/ssc-cgl/exam-date";
const CHECKED = "official-research:2026-10-10";

describe("dateRowTier — who stands behind a date row", () => {
  it("an AI-made row citing the conducting body is reported, never official", () => {
    expect(dateRowTier("official", SSC, null, GEN_SOURCE)).toBe("reported");
    expect(dateRowTier("official", SSC, "https://ssc.gov.in", "ai-generated:claude")).toBe("reported");
    // Any ai-generated tag, any case — the suppressed tag included.
    expect(dateRowTier("official", SSC, null, SUPPRESSED_SOURCE)).toBe("reported");
    expect(dateRowTier("official", SSC, null, "AI-Generated:claude")).toBe("reported");
    expect(dateRowTier("official", SSC, null, "ai-generated")).toBe("reported");
  });

  it("a row a person checked (a curated tag, the official watch) stays official", () => {
    expect(dateRowTier("official", SSC, null, CHECKED)).toBe("official");
    expect(dateRowTier("official", SSC, null, "official-calendar:2026-27")).toBe("official");
    expect(dateRowTier("official", SSC, null, OFFICIAL_WATCH_SOURCE)).toBe("official");
  });

  it("only the checked tags count — an allowlist: a bare URL or any other tag is not a person's check", () => {
    // The 24 May 2026 bulk seed wrote bare URLs into source; no person checked them.
    expect(dateRowTier("official", SSC, null, "https://ssc.gov.in/notice")).toBe("reported");
    for (const s of ["manual", "official", "official-research", "official-research:", "official-watcher", "seed:2026-05-24", "x official-research:2026-10-10"]) {
      expect(dateRowTier("official", SSC, null, s), s).toBe("reported");
    }
    // Surrounding spaces are tolerated, as before.
    expect(dateRowTier("official", SSC, null, ` ${CHECKED} `)).toBe("official");
  });

  it("fails closed: no provenance, or a loader that did not select it, is not checked", () => {
    expect(dateRowTier("official", SSC, null, null)).toBe("reported");
    expect(dateRowTier("official", SSC, null, undefined)).toBe("reported");
    expect(dateRowTier("official", SSC, null, "")).toBe("reported");
    expect(dateRowTier("official", SSC, null, "   ")).toBe("reported");
  });

  it("never raises a tier: reported and expected rows are unchanged, whoever wrote them", () => {
    expect(dateRowTier("official", TESTBOOK, null, CHECKED)).toBe("reported");
    expect(dateRowTier("official", TESTBOOK, null, GEN_SOURCE)).toBe("reported");
    expect(dateRowTier("expected", SSC, null, CHECKED)).toBe("expected");
    expect(dateRowTier("expected", null, null, GEN_SOURCE)).toBe("expected");
    expect(dateRowTier("official", null, null, CHECKED)).toBe("expected");
    // A denylisted copycat is never even reported.
    expect(dateRowTier("official", "https://sarkariresult.com.cm/x", null, CHECKED)).toBe("expected");
  });

  it("the exam's own portal still widens the gold tier for a checked row", () => {
    expect(dateRowTier("official", "https://www.examportal.co/n", "https://examportal.co", CHECKED)).toBe("official");
    expect(dateRowTier("official", "https://www.examportal.co/n", "https://examportal.co", GEN_SOURCE)).toBe("reported");
  });

  it("sourceTier stays the citation-only check (cutoff sources, news links)", () => {
    expect(sourceTier("official", SSC)).toBe("official");
    expect(sourceTier("official", TESTBOOK)).toBe("reported");
    expect(sourceTier("expected", SSC)).toBe("expected");
  });

  it("isAiMadeProvenance / isCheckedProvenance", () => {
    for (const s of [GEN_SOURCE, SUPPRESSED_SOURCE, "ai-generated", " ai-generated:claude "]) expect(isAiMadeProvenance(s), s).toBe(true);
    for (const s of [null, undefined, "", CHECKED, OFFICIAL_WATCH_SOURCE, "https://x.gov.in", "aigenerated", "ai-generatedX"]) expect(isAiMadeProvenance(s), String(s)).toBe(false);
    for (const s of [CHECKED, "official-research:2026-09-27", "official-calendar:2026-27", OFFICIAL_WATCH_SOURCE]) expect(isCheckedProvenance(s), s).toBe(true);
    for (const s of [null, undefined, "", " ", GEN_SOURCE, SUPPRESSED_SOURCE, "https://ssc.gov.in", "manual"]) expect(isCheckedProvenance(s), String(s)).toBe(false);
  });
});

// ── the exam calendar ──────────────────────────────────────────────────────

const NOW = new Date("2026-10-12T06:30:00Z"); // 12 Oct 2026, 12:00 IST
const exam = (code: string, officialUrl: string | null = null) => ({ id: `id-${code}`, code, shortName: code.replace(/_/g, " "), eligibility: { officialUrl } });
const calRow = (id: string, code: string, day: string, source: string | null, url: string | null = SSC, confidence = "official"): CalendarSourceRow => ({
  id,
  label: "Exam",
  date: new Date(`${day}T00:00:00.000Z`),
  isExamDay: true,
  kind: "EXAM",
  confidence,
  url,
  notes: null,
  source,
  exam: exam(code),
});

describe("exam calendar rows (src/lib/exam-calendar-rows.ts — /exam-calendar and its twins)", () => {
  const rows = calendarRows(
    [
      calRow("ai", "SSC_CGL", "2026-10-30", GEN_SOURCE),
      calRow("checked", "UP_UPSSSC_PET", "2026-10-25", CHECKED, "https://upsssc.gov.in/notice.pdf"),
      calRow("kids", "SOF_IMO", "2026-10-23", GEN_SOURCE, "https://sofworld.org/imo"),
      calRow("press", "CAT", "2026-11-29", GEN_SOURCE, "https://www.shiksha.com/cat"),
      calRow("past", "SSC_CHSL", "2026-10-01", CHECKED),
    ].map((r) => (r.id === "kids" ? { ...r, exam: exam("SOF_IMO", "https://sofworld.org") } : r)),
    NOW,
  );
  const by = (id: string) => rows.find((r) => r.id === id);

  it("an AI-made row is Reported, with no gold flag — so no Event in the page's JSON-LD", () => {
    expect(by("ai")).toMatchObject({ tier: "reported", official: false, examCode: "SSC_CGL" });
    // The exam's own portal (sofworld.org) would make the citation official; the row is AI-made.
    expect(by("kids")).toMatchObject({ tier: "reported", official: false });
    expect(by("press")).toMatchObject({ tier: "reported", official: false });
  });

  it("a checked row keeps the gold tier", () => {
    expect(by("checked")).toMatchObject({ tier: "official", official: true, examCode: "UP_UPSSSC_PET" });
  });

  it("past rows leave the calendar; the page's Event list is the official exam days only", () => {
    expect(by("past")).toBeUndefined();
    expect(rows.filter((r) => r.isExamDay && r.official).map((r) => r.id)).toEqual(["checked"]);
    const page = read("src/app/exam-calendar/page.tsx");
    expect(page).toContain("const rows: Row[] = calendarRows(raw, now);");
    expect(page).toContain("const officialEvents = [...examDays.values()].filter((r) => r.official).slice(0, 50);");
    expect(page).not.toMatch(/\bsourceTier\(/);
  });

  it("the page says what Reported means (en / hi / te) beside the expected note", () => {
    const page = read("src/app/exam-calendar/page.tsx");
    expect(page).toContain('<p className="mt-1 text-xs text-ink-500">{reportedNote(locale)}</p>');
    expect(page).toContain("title={reportedGloss(locale)}");
    expect(reportedNote("en")).toBe("Reported dates are not yet checked against an official notice. Confirm on the official website before you act.");
    expect(reportedGloss("en")).toBe(REPORTED_GLOSS);
    expect(reportedGloss("hi")).toMatch(/[ऀ-ॿ]/);
    expect(reportedGloss("te")).toMatch(/[ఀ-౿]/);
    expect(reportedNote("ta")).toBe(reportedNote("en"));
  });
});

// ── context.md ─────────────────────────────────────────────────────────────

describe("context.md key-dates tag (src/lib/date-tier-view.ts contextDateTag)", () => {
  it("REPORTED says not yet checked against an official notice; OFFICIAL links the notice", () => {
    expect(contextDateTag({ tier: "reported", url: SSC })).toBe(`REPORTED (not yet checked against an official notice; via ssc.gov.in): ${SSC}`);
    expect(contextDateTag({ tier: "official", url: SSC })).toBe(`OFFICIAL, notice: ${SSC}`);
    expect(contextDateTag({ tier: "expected", url: null })).toBe("expected");
    expect(CONTEXT_KEY_DATES_HEADING.startsWith("## Key dates")).toBe(true);
    expect(CONTEXT_KEY_DATES_HEADING).toContain("REPORTED = not yet checked against an official notice");
  });

  it("truth-lint still reads the line and its tier", () => {
    const md = [
      CONTEXT_KEY_DATES_HEADING,
      `- 2026-10-30 — SSC CGL Tier 1 (exam day) — ${contextDateTag({ tier: "reported", url: SSC })} — in 18 days`,
      `- 2026-10-25 — PET Day 1 (exam day) — ${contextDateTag({ tier: "official", url: "https://upsssc.gov.in/n.pdf" })}`,
    ].join("\n");
    const rows = parseContextTimeline(md);
    expect(rows.map((r) => [r.day, r.tier, r.examDay])).toEqual([
      ["2026-10-30", "reported", true],
      ["2026-10-25", "official", true],
    ]);
  });

  it("the route prints the shared tag and heading", () => {
    const route = read("src/app/exams/[code]/context.md/route.ts");
    expect(route).toContain("const tag = (r: TimelineRow) => contextDateTag(r);");
    expect(route).toContain("L.push(CONTEXT_KEY_DATES_HEADING);");
    expect(route).not.toContain("REPORTED (announced; via");
  });
});

// ── the writer's announced-fact keys (IndexNow) ───────────────────────────

describe("announcedFactKeys use the tier the pages print", () => {
  it("a generated row is reported; a checked row official", () => {
    const base = { kind: "EXAM", label: "Exam", date: new Date("2026-10-30T00:00:00Z"), isExamDay: true, confidence: "official", url: SSC };
    expect([...announcedFactKeys([{ ...base, source: GEN_SOURCE }])]).toEqual(["EXAM|2026-10-30|reported"]);
    expect([...announcedFactKeys([{ ...base, source: CHECKED }])]).toEqual(["EXAM|2026-10-30|official"]);
  });
});

// ── surfaces that read a date row's tier themselves ───────────────────────

describe("every surface that tiers a date row outside buildTimeline passes its provenance", () => {
  const uses = (file: string, ...needles: string[]) => {
    const src = read(file);
    for (const n of needles) expect(src, `${file}: ${n}`).toContain(n);
    return src;
  };

  it("Telegram 9 AM digest: marks, legend and the new-dates list", () => {
    const src = uses(
      "src/app/api/cron/telegram-daily/route.ts",
      "const tier = dateRowTier(src.confidence, r.url, src.exam.eligibility?.officialUrl, src.source);",
      'SELECT d.label, d.date, e."shortName" AS short, e.code, d.url, d.source, el."officialUrl"',
      'const gold = dateRowTier("official", f.url, f.officialUrl, f.source) === "official";',
      "📌 reported — ${REPORTED_GLOSS}",
    );
    expect(src).not.toMatch(/\bsourceTier\(/);
    expect(src).not.toContain("New dates announced");
  });

  it("Telegram bot: /calendar marks and the /exam card footer", () => {
    const src = uses(
      "src/app/api/telegram/webhook/route.ts",
      "const tier = dateRowTier(src.confidence, r.url, src.exam.eligibility?.officialUrl, src.source);",
      "Reported = ${REPORTED_GLOSS}",
    );
    expect(src).not.toMatch(/\bsourceTier\(/);
    expect(src).not.toContain("Reported = per press reports");
  });

  it("exam-alerts mail / phone alert: both date reads select source; no 'via press reports' for an AI row", () => {
    const src = uses(
      "src/app/api/cron/exam-alerts/route.ts",
      'SELECT label, date, url, kind, source, "createdAt" FROM "ExamImportantDate" d',
      'SELECT id, label, date, "isExamDay", kind, confidence, url, notes, source FROM "ExamImportantDate"',
      'const gold = dateRowTier("official", d.url, ex.officialUrl, d.source) === "official";',
      "reported date — ${REPORTED_GLOSS}",
    );
    expect(src).not.toContain("announced date (via press reports)");
  });

  it("the ask engine, the exams-today strip, the exam-week block, releases, result-day mail and the coach", () => {
    uses("src/lib/ask-engine.ts", "SELECT label, date, confidence, url, source FROM", "const tier = dateRowTier(d.confidence, d.url, e.officialUrl, d.source);");
    uses("src/lib/exam-checklist.ts", "const tier = dateRowTier(r.confidence, url, r.officialUrl, r.source);");
    uses("src/components/ExamWeekBlock.tsx", "tier: dateRowTier(r.confidence, url, r.officialUrl, r.source),");
    uses("src/lib/official-release.ts", 'return dateRowTier(r.confidence, url, officialUrl, r.source) === "official";');
    uses("src/lib/result-day-trigger.ts", 'return dateRowTier(r.confidence, rowCitation(r), officialUrl, r.source) === "official";');
    uses("src/app/coach/page.tsx", "i.confidence, i.url, i.source, el.\"officialUrl\"", "dateRowTier(x.confidence, cite, x.officialUrl, x.source)");
    uses("src/lib/exam-data-writer.ts", "const tier = dateRowTier(r.confidence, rowCitation(r), officialUrl, r.source);");
  });

  it("the tutor's tracker rows carry their provenance", () => {
    uses("src/lib/db/syllabus.ts", "source: r.source ?? null,");
    uses("src/lib/ai/types.ts", "  source: string | null;\n}\n\n/** The date-free input to buildTutorExamFacts");
  });
});

describe("coach intake: the prefilled exam date says its tier", () => {
  it("never 'from the official calendar' for an AI-made or estimated date", () => {
    const prefillDateNote = coachPrefillDateNote;
    expect(prefillDateNote({ nextDate: "2026-10-30", nextDateTier: "official" })).toBe("(from the official notice — confirm or change)");
    expect(prefillDateNote({ nextDate: "2026-10-30", nextDateTier: "reported" })).toBe("(reported, not yet checked against an official notice — confirm or change)");
    expect(prefillDateNote({ nextDate: "2026-10-30", nextDateTier: "expected" })).toBe("(expected — an estimate, not announced; confirm or change)");
    expect(prefillDateNote({ nextDate: "2026-10-30", nextDateTier: null })).toBe("(from our exam calendar — confirm or change)");
    expect(prefillDateNote({ nextDate: null, nextDateTier: "official" })).toBe("");
    const intake = read("src/app/coach/CoachIntake.tsx");
    expect(intake).not.toContain("from the official calendar");
    expect(intake).toContain("2 · Exam date {coachPrefillDateNote(options.find((o) => o.code === examCode))}");
  });
});
