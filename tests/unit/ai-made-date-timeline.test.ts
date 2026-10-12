// Release 2 (14 Oct 2026), part A — the buildTimeline half. Ships WITH the
// src/lib/exam-timeline.ts patch (buildTimeline tiers a row with dateRowTier
// and TimelineInput requires `source`); tests/unit/ai-made-date-tier.test.ts
// covers the rule itself and the surfaces that tier rows on their own.
//
// Every surface built on buildTimeline — the hub's Important Dates and title,
// /updates (key cards, table, FAQ, Event JSON-LD), context.md, llms-full's
// exam-week block, the exam-week / exam-eve / exam-alerts mails, the .ics,
// the Telegram bot, the coach's exam-week reads — prints an AI-made row
// ("ai-generated…" source) as "reported", never "official". No DB, no network.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildTimeline, stageOf, type TimelineInput } from "@/lib/exam-timeline";
import { GEN_SOURCE } from "@/lib/exam-data-writer";
import { contextDateTag, countdownQualifierWord, dateTierView, examSoonTitle, reportedGloss } from "@/lib/date-tier-view";
import { examWeekCalendarRows } from "@/lib/exam-week-ics";
import { whenWithTier } from "@/lib/exam-week-mail";
import { parseContextTimeline } from "@/lib/truth-lint";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const NOW = new Date("2026-10-12T06:30:00Z"); // 12 Oct 2026, 12:00 IST
const SSC = "https://ssc.gov.in/api/attachment/notice.pdf";
const CHECKED = "official-research:2026-10-10";
const row = (id: string, day: string, source: string | null, over: Partial<TimelineInput> = {}): TimelineInput => ({
  id,
  label: "Tier 1 exam",
  date: `${day}T00:00:00.000Z`,
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: SSC,
  notes: null,
  source,
  ...over,
});

describe("buildTimeline: an AI-made row is reported", () => {
  it("SSC CGL 30 Oct (ai-generated, cited to ssc.gov.in) is reported; a checked row official", () => {
    const tl = buildTimeline([row("ai", "2026-10-30", GEN_SOURCE), row("chk", "2026-11-30", CHECKED)], NOW, "https://ssc.gov.in");
    expect(tl.find((r) => r.id === "ai")).toMatchObject({ tier: "reported", official: false, verified: false });
    expect(tl.find((r) => r.id === "chk")).toMatchObject({ tier: "official", official: true });
  });

  it("fails closed: a loader that dropped `source` reads unchecked", () => {
    const { source: _drop, ...noSource } = row("x", "2026-10-30", CHECKED);
    const tl = buildTimeline([noSource as TimelineInput], NOW);
    expect(tl[0].tier).toBe("reported");
  });

  it("answer keys: an AI-made cited key stays listed (reported); an estimate is still dropped", () => {
    const tl = buildTimeline(
      [
        row("k", "2026-11-05", GEN_SOURCE, { kind: "ANSWER_KEY", label: "Answer key", isExamDay: false }),
        row("e", "2026-11-06", GEN_SOURCE, { kind: "ANSWER_KEY", label: "Answer key (expected)", isExamDay: false, confidence: "expected", url: null }),
      ],
      NOW,
    );
    expect(tl.map((r) => [r.id, r.tier])).toEqual([["k", "reported"]]);
  });

  it("the countdown and the reminder carry the word: 'Exam in 2 days (reported)'", () => {
    const { nextExam } = stageOf(buildTimeline([row("ai", "2026-10-30", GEN_SOURCE)], NOW));
    expect(nextExam?.tier).toBe("reported");
    expect(countdownQualifierWord(nextExam!.tier)).toBe("reported");
    expect(examSoonTitle({ ...nextExam!, daysFromToday: 2 })).toBe("Exam in 2 days (reported) — Tier 1 exam");
    expect(whenWithTier(nextExam!)).toMatch(/\(reported\)$/);
  });
});

describe("the outputs", () => {
  it("context.md: the AI row's line says REPORTED — not yet checked against an official notice", () => {
    const tl = buildTimeline([row("ai", "2026-10-30", GEN_SOURCE), row("chk", "2026-11-30", CHECKED)], NOW, "https://ssc.gov.in");
    const lines = tl.map((r) => `- ${r.day} — ${r.label}${r.isExamDay ? " (exam day)" : ""} — ${contextDateTag(r)}`);
    expect(lines[0]).toBe(`- 2026-10-30 — Tier 1 exam (exam day) — REPORTED (not yet checked against an official notice; via ssc.gov.in): ${SSC}`);
    expect(lines[1]).toBe(`- 2026-11-30 — Tier 1 exam (exam day) — OFFICIAL, notice: ${SSC}`);
    expect(parseContextTimeline(`## Key dates\n${lines.join("\n")}`).map((r) => r.tier)).toEqual(["reported", "official"]);
  });

  it("the hub's Important Dates line: Reported, the host as text, the gloss as the badge's title", () => {
    const [r] = buildTimeline([row("ai", "2026-10-30", GEN_SOURCE)], NOW);
    expect(dateTierView(r)).toMatchObject({ tier: "reported", badgeKey: "tracker.reported", sourceDisplay: "host", sourceHost: "ssc.gov.in" });
    const hub = read("src/app/exams/[code]/page.tsx");
    expect(hub).toContain("reportedNote={reportedGloss(locale)}");
    expect(hub).toContain('{hubDates.slice(0, 12).some((d) => hubDateRowById.get(d.id)?.tier === "reported") && (');
    expect(read("src/components/HubDateTier.tsx")).toContain('title={v.tier === "reported" && reportedNote ? reportedNote : undefined}');
    expect(reportedGloss("hi")).not.toBe(reportedGloss("en"));
  });

  it("/updates: legend, badge title, FAQ answer; Event JSON-LD only for an official exam day", () => {
    const page = read("src/app/exams/[code]/updates/page.tsx");
    expect(page).toContain('<p className="mt-1 text-xs text-ink-500">{reportedNote(locale)}</p>');
    expect(page).toContain("title={reportedGloss(locale)}");
    expect(page).toContain("if (nextExam && nextExam.official) {");
    const i18n = read("src/lib/i18n.ts");
    expect(i18n).toContain('"tracker.faq.a.reported": "{label}: {date} — reported, not yet checked against an official notice. Verify on the official website.",');
    expect(i18n).not.toContain("announced, as reported by the linked source");
  });

  it("the home page's rail and Events: tier from dateRowTier; Events only for official rows", () => {
    const home = read("src/app/page.tsx");
    expect(home).toContain("const tier = dateRowTier(r.confidence, r.url, r.exam.eligibility?.officialUrl, r.source);");
    expect(home).toContain('.filter((e) => (e.bucket ?? "upcoming") === "upcoming" && e.isExamDay && e.official)');
    expect(home).toContain('["home-upcoming-v11"]');
  });

  it("the exam-week .ics: an AI-made exam day is reported (TENTATIVE), never CONFIRMED", () => {
    const events = examWeekCalendarRows([row("ai", "2026-10-13", GEN_SOURCE)], "https://ssc.gov.in", NOW);
    expect(events.map((r) => r.tier)).toEqual(["reported"]);
  });
});

describe("no date row is tiered by sourceTier any more", () => {
  // The calls left are citation checks that are not date rows (cutoff
  // sources, news, an ExamResult link) or ask only "is it announced at all?"
  // (=== / !== "expected"), which dateRowTier never changes. A new call is a
  // decision: add it here with its reason, or use dateRowTier.
  const ALLOWED: Record<string, number> = {
    "src/lib/official-source.ts": 2, // the definition, and dateRowTier's own use
    "src/lib/exam-timeline.ts": 1, // isUnannouncedAnswerKey: === "expected"
    "src/app/page.tsx": 2, // passed estimates and the default tab: expected-only
    "src/app/exams/[code]/archive/page.tsx": 1, // isPassedEstimate: expected-only
    "src/app/api/cron/exam-alerts/route.ts": 1, // an ExamResult's official link
    "src/app/exams/[code]/context.md/route.ts": 1, // published cutoff sources
    "src/app/exams/[code]/cutoff/page.tsx": 1, // published cutoff sources
    "src/lib/official-cutoff-title.ts": 1, // published cutoff sources
    "src/lib/news-index-policy.ts": 1, // news rows
    "src/lib/result-day-trigger.ts": 1, // coversDays: days mailed under the pre-14-Oct rule (never fires)
  };
  it("every sourceTier( call in src/ is accounted for", () => {
    const found: Record<string, number> = {};
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(e.name)) {
          const code = read(rel).replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
          const n = (code.match(/\bsourceTier\(/g) ?? []).length;
          if (n) found[rel] = n;
        }
      }
    };
    walk("src");
    expect(found).toEqual(ALLOWED);
  });
});
