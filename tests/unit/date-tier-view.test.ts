// The tier words a tracker date carries on the page (3 Oct 2026, signup-100
// lever 4). src/lib/date-tier-view.ts decides what a surface prints for a
// row's source tier; src/components/HubDateTier.tsx is the hub's Important
// Dates line; the tracker (/exams/[code]/updates) counts down to a reported
// day with "(reported)" and never links a denylisted copycat.
// The component is transpiled with TypeScript and rendered with
// renderToStaticMarkup (the pattern of tests/unit/hindi-note-incomplete.test.ts).
// No DB, no network. Run: npx vitest run tests/unit/date-tier-view.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as dateTierViewMod from "@/lib/date-tier-view";
import { countdownQualifierKey, countdownQualifierWord, dateTierView, examSoonTitle, TIER_BADGE_CLASS } from "@/lib/date-tier-view";
import { buildTimeline } from "@/lib/exam-timeline";
import { parseHubDates } from "@/lib/truth-lint";

const ROOT = path.resolve(__dirname, "../..");
const NOW = new Date("2026-10-03T06:30:00Z");

function loadHubDateTier(): (p: { row: unknown; labels: Record<string, string> }) => React.ReactElement | null {
  const file = path.join(ROOT, "src/components/HubDateTier.tsx");
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const stubs: Record<string, unknown> = { "react/jsx-runtime": jsxRuntime, react: React, "@/lib/date-tier-view": dateTierViewMod };
  const req = (spec: string): unknown => {
    if (spec in stubs) return stubs[spec];
    throw new Error(`unexpected import ${spec}`);
  };
  new Function("require", "module", "exports", out)(req, mod, mod.exports);
  return mod.exports.HubDateTier as (p: { row: unknown; labels: Record<string, string> }) => React.ReactElement | null;
}

const LABELS = { official: "Official", reported: "Reported", expected: "Expected" };

describe("dateTierView", () => {
  it("links the body's own notice on an official row", () => {
    const v = dateTierView({ tier: "official", url: "https://upsssc.gov.in/ViewPdf.aspx?x=1" });
    expect(v.badgeKey).toBe("tracker.official");
    expect(v.sourceDisplay).toBe("link");
    expect(v.sourceHost).toBe("upsssc.gov.in");
    expect(v.badgeClass).toBe(TIER_BADGE_CLASS.official);
  });

  it("names the reporting host as text on a reported row, never as the official word", () => {
    const v = dateTierView({ tier: "reported", url: "https://testbook.com/news/upsssc-pet-exam-date-2026-out/" });
    expect(v.badgeKey).toBe("tracker.reported");
    expect(v.sourceDisplay).toBe("host");
    expect(v.sourceHost).toBe("testbook.com");
  });

  it("shows no source for an estimate", () => {
    const v = dateTierView({ tier: "expected", url: "https://www.adda247.com/x" });
    expect(v.badgeKey).toBe("tracker.expected");
    expect(v.sourceDisplay).toBe("none");
  });

  it("never offers a denylisted copycat as a source", () => {
    const v = dateTierView({ tier: "reported", url: "https://sarkariresult.com.cm/up-police-constable-2026/" });
    expect(v.sourceUrl).toBeNull();
    expect(v.sourceDisplay).toBe("none");
  });

  it("takes the tier buildTimeline derives from the cited host", () => {
    const [row] = buildTimeline(
      [{ id: "a", label: "PET 2026 exam - Day 1", date: "2026-10-23T00:00:00Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://testbook.com/news/upsssc-pet-exam-date-2026-out/" }],
      NOW,
      "https://upsssc.gov.in",
    );
    expect(row.tier).toBe("reported");
    expect(dateTierView(row).badgeKey).toBe("tracker.reported");
  });
});

describe("countdownQualifierKey", () => {
  it("counts down bare only to an official day", () => {
    expect(countdownQualifierKey("official")).toBeNull();
    expect(countdownQualifierKey("reported")).toBe("tracker.reported");
    expect(countdownQualifierKey("expected")).toBe("tracker.expected");
  });

  it("has a plain-English twin for the surfaces with no dictionary", () => {
    expect(countdownQualifierWord("official")).toBeNull();
    expect(countdownQualifierWord("reported")).toBe("reported");
    expect(countdownQualifierWord("expected")).toBe("expected");
  });
});

describe("examSoonTitle (the exam-alerts reminder, review of 3 Oct 2026)", () => {
  it("says (reported) for a day cited only to a news or coaching site", () => {
    expect(examSoonTitle({ daysFromToday: 2, label: "Mains exam (Day 1)", tier: "reported" })).toBe("Exam in 2 days (reported) — Mains exam (Day 1)");
    expect(examSoonTitle({ daysFromToday: 1, label: "Mains", tier: "reported" })).toBe("Exam in 1 day (reported) — Mains");
    expect(examSoonTitle({ daysFromToday: 0, label: "Mains", tier: "reported" })).toBe("Exam is today (reported) — Mains");
  });

  it("is bare for an official day", () => {
    expect(examSoonTitle({ daysFromToday: 3, label: "PET 2026 exam", tier: "official" })).toBe("Exam in 3 days — PET 2026 exam");
    expect(examSoonTitle({ daysFromToday: 0, label: "PET 2026 exam", tier: "official" })).toBe("Exam is today — PET 2026 exam");
  });
});

describe("the alert surfaces outside the pages", () => {
  const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

  it("exam-alerts: the reminder and the next-date line carry the tier word", () => {
    const src = read("src/app/api/cron/exam-alerts/route.ts");
    expect(src).toContain("title: examSoonTitle(nextExam),");
    expect(src).not.toContain("`Exam in ${nextExam.daysFromToday} day");
    expect(src).toContain('next.tier === "reported" ? `${fmtDay(next.date)} (reported)`');
  });

  it("the Telegram /exam card qualifies a reported countdown", () => {
    const src = read("src/app/api/telegram/webhook/route.ts");
    expect(src).toContain("countdownQualifierWord(nextExam.tier)");
    expect(src).not.toContain('nextExam.tier === "expected" ? " (expected)" : ""');
  });
});

describe("HubDateTier (the hub's Important Dates line)", () => {
  const HubDateTier = loadHubDateTier();
  const html = (row: unknown) => renderToStaticMarkup(React.createElement(HubDateTier, { row, labels: LABELS }));

  it("prints the badge and the official notice link", () => {
    const h = html({ tier: "official", url: "https://iapt.org.in/?id=2423" });
    expect(h).toContain(">Official</span>");
    expect(h).toContain('href="https://iapt.org.in/?id=2423"');
    expect(h).toContain("iapt.org.in ↗");
  });

  it("prints Reported and the host as text, with no link", () => {
    const h = html({ tier: "reported", url: "https://www.careerpower.in/upsssc-pet.html" });
    expect(h).toContain(">Reported</span>");
    expect(h).toContain("<span>careerpower.in</span>");
    expect(h).not.toContain("href=");
  });

  it("prints Expected alone, and nothing without a row", () => {
    expect(html({ tier: "expected", url: null })).toContain(">Expected</span>");
    expect(html(null)).toBe("");
  });

  it("uses no <p>, so truth-lint still reads the hub list the same way", () => {
    const tier = html({ tier: "reported", url: "https://testbook.com/x" });
    expect(tier).not.toMatch(/<p[\s>]/);
    const li = (extra: string) =>
      `<ol><li class="rounded-md border border-ink-200 bg-white p-4"><div class="flex"><p class="text-sm font-medium text-ink-900">PET 2026 exam - Day 1</p><span>20 days away</span></div><p class="mt-1 text-xs text-ink-500">Fri, 23 Oct, 2026</p>${extra}</li></ol>`;
    expect(parseHubDates(li(tier))).toEqual(parseHubDates(li("")));
    expect(parseHubDates(li(tier))[0]).toMatchObject({ label: "PET 2026 exam - Day 1", date: "2026-10-23", notes: null });
  });
});

describe("the tracker page", () => {
  const src = fs.readFileSync(path.join(ROOT, "src/app/exams/[code]/updates/page.tsx"), "utf8");

  it("qualifies a countdown to a reported or expected exam day", () => {
    expect(src).toContain("countdownQualifierKey(nextExam.tier)");
    expect(src).not.toMatch(/nextExam\.tier === "expected"\) statusLine/);
  });

  it("links a row's source only through citableSourceUrl", () => {
    expect(src).toContain("const sourceLink = (r: TimelineRow) => dateTierView(r).sourceUrl;");
    expect(src).not.toMatch(/href=\{row\.url\}|href=\{r\.url\}/);
  });
});
