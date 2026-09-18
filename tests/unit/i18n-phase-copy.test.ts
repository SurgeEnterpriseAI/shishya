// Exam-day / after-paper body copy in the reader's language (16 Sep 2026).
// src/lib/phase-article-copy.ts and examNightShareMessage used to hold their
// sentences as English literals; they now read phase.* / ew.night.* keys
// through an optional translator. No DB, no network.
// Run with: npx vitest run tests/unit/i18n-phase-copy.test.ts
//
// What it guards:
//   • without a translator every sentence is the English it always was,
//     byte for byte (the literals below are the pre-16-Sep templates);
//   • phaseArticleMeta — the <title> / description of /live and /reactions —
//     stays English whatever the body speaks;
//   • with a hi / te translator the badge, H1, tagline and empty state come
//     out in that script, keep the date's tier word in that language, keep
//     the honesty hedges, and never leak an unfilled {placeholder};
//   • `label` (JSON-LD) stays English while `crumb` (visible) is translated.

import { describe, it, expect } from "vitest";
import { dict, type Locale, type StringKey } from "@/lib/i18n";
import {
  examDayClaim,
  phaseArticleCopy,
  phaseArticleMeta,
  type ExamDayClaim,
  type ExamNightSummary,
} from "@/lib/phase-article-copy";
import { examNightShareMessage } from "@/lib/exam-night-facts";
import type { TimelineInput } from "@/lib/exam-timeline";

const tOf = (locale: Locale) => (key: StringKey) => (dict[locale] as Record<string, string>)[key] ?? dict.en[key];
const DEVANAGARI = /[ऀ-ॿ]/;
const TELUGU = /[ఀ-౿]/;

const row = (id: string, day: string, confidence = "official", url: string | null = "https://ssc.gov.in/n"): TimelineInput => ({
  id,
  label: "Tier 1 exam",
  date: `${day}T00:00:00.000Z`,
  isExamDay: true,
  kind: "EXAM",
  confidence,
  url,
});
const SSC_URL = "https://ssc.gov.in";
const TONIGHT = new Date("2026-09-13T13:00:00Z"); // 18:30 IST on exam day
const s = "SSC CGL";

const EVERYTHING: ExamNightSummary = {
  poll: true,
  tally: true,
  keyStatus: true,
  questionPaper: true,
  cutoffEstimate: true,
  estimator: true,
  pyq: true,
  nextStage: true,
  article: true,
};
const NOTHING: ExamNightSummary = {
  poll: false,
  tally: false,
  keyStatus: false,
  questionPaper: false,
  cutoffEstimate: false,
  estimator: false,
  pyq: false,
  nextStage: false,
  article: false,
};

describe("English is unchanged, byte for byte", () => {
  const live = examDayClaim([row("a", "2026-09-13")], SSC_URL, TONIGHT);
  const later = examDayClaim([row("a", "2026-10-20")], SSC_URL, new Date("2026-09-06T04:00:00Z"));
  const none: ExamDayClaim = examDayClaim([], SSC_URL, TONIGHT);

  it("the claim itself", () => {
    expect(live.live).toBe(true);
    expect(live.dated).toMatch(/^13 Sept? \(official\)$/);
    expect(none.dated).toBeNull();
  });

  it("LIVE / REACTIONS / CHECKLIST without a summary", () => {
    const l = phaseArticleCopy("LIVE", s, live);
    expect(l.badge).toBe("🔴 Live — exam day");
    expect(l.label).toBe("Live — exam day");
    expect(l.crumb).toBe(l.label);
    expect(l.tagline).toBe(
      `${s} is happening today. Live difficulty and shift-by-shift analysis, compiled from public student discussion (Reddit, news, YouTube comments) during the exam window.`,
    );
    expect(l.fallbackTitle).toBe(`${s} — live exam-day analysis`);
    expect(l.emptyBody).toBe(
      `Live coverage for ${s} appears once students step out of the centre and real reactions exist in public discussion — first impressions, difficulty signals, section-wise complaints. Nothing is published before that, and never from fewer than two cited sources.`,
    );

    const d = phaseArticleCopy("LIVE", s, later);
    expect(d.badge).toBe("📝 Exam-day analysis");
    expect(d.tagline).toBe(
      `Exam-day coverage for the ${s} paper on ${later.dated}: difficulty and shift-by-shift analysis, compiled from public student discussion during the exam window.`,
    );
    expect(d.fallbackTitle).toBe(`${s} — exam-day analysis (${later.dated} paper)`);

    const n = phaseArticleCopy("LIVE", s, none);
    expect(n.tagline).toBe(
      `Exam-day coverage for ${s}: difficulty and shift-by-shift analysis, compiled from public student discussion during the exam window. No typed exam date is on our tracker yet.`,
    );
    expect(n.fallbackTitle).toBe(`${s} — exam-day analysis`);

    const r = phaseArticleCopy("REACTIONS", s, live);
    expect(r.badge).toBe("📊 Post-exam reactions");
    expect(r.tagline).toBe(
      `${s} is done — here's the verdict. Student consensus on difficulty, expected cutoff, answer-key analysis and "did you get Q-34?" threads.`,
    );
    expect(r.fallbackTitle).toBe(`${s} — post-exam reactions`);
    const rd = phaseArticleCopy("REACTIONS", s, later);
    expect(rd.tagline).toBe(
      `Post-exam reactions for the ${s} paper on ${later.dated}: student consensus on difficulty, expected cutoff and answer-key analysis, compiled from public discussion after the paper.`,
    );
    expect(rd.fallbackTitle).toBe(`${s} — post-exam reactions (${later.dated} paper)`);
    expect(rd.emptyBody).toBe(
      `Post-exam analysis for ${s} is compiled from public student discussion after the paper — expected cutoff, difficulty breakdown, answer-key analysis. It appears here once real reactions exist (at least two cited sources), not before.`,
    );

    const eve = examDayClaim([row("a", "2026-09-13")], SSC_URL, new Date("2026-09-12T04:00:00Z"));
    const c = phaseArticleCopy("CHECKLIST", s, eve);
    expect(c.badge).toBe("📋 Last-minute checklist");
    expect(c.crumb).toBe("Last-minute checklist");
    expect(c.tagline).toBe(
      `${s} is on ${eve.dated}. Here's the cheat-sheet to revise — what to carry, last-mile topics, formulae, mock targets.`,
    );
    expect(c.fallbackTitle).toBe(`${s} — last-minute checklist (exam ${eve.dated})`);
    const cn = phaseArticleCopy("CHECKLIST", s, none);
    expect(cn.tagline).toBe(`Last-minute checklist for ${s} — what to carry, last-mile topics, formulae, mock targets.`);
    expect(cn.fallbackTitle).toBe(`${s} — last-minute checklist`);
    expect(cn.emptyBody).toBe(
      `We're putting together the last-minute checklist for ${s}. Check back closer to the exam date — we compile it from the official notice and past papers as the date nears.`,
    );
  });

  it("exam-night copy (with a summary)", () => {
    const l = phaseArticleCopy("LIVE", s, live, EVERYTHING);
    expect(l.tagline).toBe(
      `${s} is happening today, ${live.dated}. On this page: rate the paper in one tap (no login) and see how other students rated it, answer-key and result status from the tracker, every date with its source tier, the official question paper, an indicative cutoff estimate (not official), a score estimator for when the answer key is out, the next stage's date, PYQ-pattern practice, difficulty and shift-by-shift notes compiled from public student discussion and free email alerts.`,
    );
    expect(l.fallbackTitle).toBe(`${s} — exam day today`);
    expect(l.badge).toBe("🔴 Live — exam day");

    const r = phaseArticleCopy("REACTIONS", s, live, EVERYTHING);
    expect(r.tagline.startsWith(`The ${s} paper on ${live.dated} has been held. On this page: `)).toBe(true);
    expect(r.tagline).toContain("student consensus compiled from public discussion after the paper and free email alerts.");
    expect(r.fallbackTitle).toBe(`${s} — after the ${live.dated} paper`);

    const bare = phaseArticleCopy("REACTIONS", s, later, NOTHING);
    expect(bare.badge).toBe("📊 After the paper");
    expect(bare.tagline).toBe(`The ${s} paper on ${later.dated}. On this page: free email alerts.`);
    expect(bare.fallbackTitle).toBe(`${s} — after the paper (${later.dated} paper)`);

    const noDate = phaseArticleCopy("LIVE", s, none, { ...NOTHING, poll: true });
    expect(noDate.badge).toBe("📝 Exam day");
    expect(noDate.tagline).toBe(
      `No typed ${s} exam date is on our tracker yet. On this page: rate the paper in one tap (no login) and free email alerts.`,
    );
    expect(noDate.fallbackTitle).toBe(`${s} — exam day`);
    expect(noDate.emptyBody).toBe(
      `The write-up compiled from public student discussion appears here once it cites at least two real sources and names the ${s} paper.`,
    );
  });

  it("the share message", () => {
    const facts = { examDay: { dated: "13 Sept (official)" }, examDayStage: null, summary: EVERYTHING };
    expect(examNightShareMessage(s, facts as never)).toBe(
      `${s} (13 Sept (official)): rate the paper in one tap, no login, answer-key status from the tracker — free on Shishya:`,
    );
    expect(examNightShareMessage(s, { ...facts, examDayStage: "Mains" } as never)).toBe(
      `${s} (13 Sept (official) Mains): rate the paper in one tap, no login, answer-key status from the tracker — free on Shishya:`,
    );
    expect(examNightShareMessage(s, { examDay: null, summary: NOTHING } as never)).toBe(
      `${s}: every exam date with its source tier, and free alerts — free on Shishya:`,
    );
  });
});

describe("the <title> and description stay English", () => {
  it("phaseArticleMeta has no translator and names the English phrases", () => {
    expect(phaseArticleMeta.length).toBe(4);
    const claim = examDayClaim([row("a", "2026-09-13")], SSC_URL, TONIGHT);
    const meta = phaseArticleMeta("LIVE", { shortName: s, name: "SSC CGL Tier 1" }, claim, EVERYTHING);
    for (const v of Object.values(meta)) {
      expect(v).not.toMatch(DEVANAGARI);
      expect(v).not.toMatch(TELUGU);
    }
    expect(meta.ogDescription).toMatch(/^On this page: rate the paper in one tap \(no login\)/);
    expect(meta.ogDescription).toMatch(/ and free email alerts\.$/);
  });
});

describe("hi and te bodies", () => {
  for (const [locale, script, tier, listAnd] of [
    ["hi", DEVANAGARI, "आधिकारिक", " और "],
    ["te", TELUGU, dict.te["ew.tier.official"], ` ${dict.te["phase.listAnd"]} `],
  ] as const) {
    const t = tOf(locale);
    const claim = examDayClaim([row("a", "2026-09-13")], SSC_URL, TONIGHT, { t, locale });
    const expected = examDayClaim([row("a", "2026-09-13", "expected", null)], SSC_URL, TONIGHT, { t, locale });
    const passed = examDayClaim([row("a", "2026-09-08", "expected", null)], SSC_URL, TONIGHT, { t, locale });

    it(`${locale}: the date carries that language's tier word, and the honesty rules still hold`, () => {
      expect(claim.dated).toContain(`(${tier})`);
      expect(claim.dated).not.toContain("(official)");
      expect(claim.live).toBe(true);
      // An expected-tier day is never "today", in any language.
      expect(expected.live).toBe(false);
      expect(expected.dated).toContain(`(${t("ew.tier.expected")})`);
      expect(passed.dated).toContain(`(${t("tracker.passedEstimate")})`);
      // "Live" is itself a claim: never on an expected-tier day.
      expect(phaseArticleCopy("LIVE", s, expected, EVERYTHING, t).badge).toBe(t("phase.badge.examDay"));
      expect(phaseArticleCopy("LIVE", s, claim, EVERYTHING, t).badge).toBe(t("phase.badge.live"));
    });

    it(`${locale}: every sentence is in its own script with no placeholder left`, () => {
      for (const phase of ["LIVE", "REACTIONS", "CHECKLIST"] as const) {
        for (const summary of [undefined, EVERYTHING, NOTHING]) {
          for (const c of [claim, expected, passed, examDayClaim([], SSC_URL, TONIGHT, { t, locale })]) {
            const copy = phaseArticleCopy(phase, s, c, summary, t);
            for (const v of [copy.badge, copy.crumb, copy.tagline, copy.fallbackTitle, copy.emptyBody]) {
              expect(v).toMatch(script);
              expect(v).not.toMatch(/\{\w+\}/);
              expect(v).toContain(v === copy.badge || v === copy.crumb ? "" : s);
            }
            // JSON-LD section name: English, always.
            expect(copy.label).toMatch(/^[A-Za-z —-]+$/);
            // The exam-night copy always names the dated paper (the plain live /
            // held taglines say "today" / "done" instead, as in English).
            if (c.dated && summary) expect(copy.fallbackTitle + copy.tagline).toContain(c.dated);
          }
        }
      }
    });

    it(`${locale}: the list of what the page holds keeps its hedges and joins in that language`, () => {
      const tagline = phaseArticleCopy("REACTIONS", s, claim, EVERYTHING, t).tagline;
      expect(tagline).toContain(t("phase.holds.cutoff"));
      expect(tagline).toContain(t("phase.holds.pyq"));
      expect(tagline).toContain(listAnd);
      expect(tagline).not.toContain(" and ");
    });

    it(`${locale}: the share message`, () => {
      const msg = examNightShareMessage(s, { examDay: { dated: claim.dated }, examDayStage: "Mains", summary: EVERYTHING } as never, t);
      expect(msg).toMatch(script);
      expect(msg).toContain(`${s} (${claim.dated} Mains): `);
      expect(msg).toContain("Shishya");
      expect(msg).not.toMatch(/\{\w+\}/);
      expect(msg).not.toMatch(/cutoff|कट-?ऑफ़|కటాఫ్/i);
    });
  }
});
