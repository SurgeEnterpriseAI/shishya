// Answer-first leads (26 Sep 2026, discoverability wave 2 G3) —
// src/lib/answer-lead.ts, src/lib/pattern-verified.ts, src/lib/page-freshness.ts.
// Pure: fixture rows copied from the prod read of the same day
// (tests/fixtures/g3-exams.ts). No DB, no network.
// Run: npx vitest run tests/unit/answer-lead.test.ts
//
// What it pins:
//   • every lead is at most LEAD_MAX_WORDS words and comes from the rows;
//   • the hub lead states the SAME date decision as the hub <title>;
//   • non-official dates carry their tier word; an expected exam date never
//     leads the hub;
//   • pattern numbers appear only for a verifiedPattern exam, and only while
//     the stored tuple agrees with the notice (critic veto);
//   • the meta description a lead heads stays within ~160 characters;
//   • "checked" dates come only from check timestamps, never the clock.

import { describe, it, expect } from "vitest";
import { buildTimeline, stageOf, titleCycleYear } from "@/lib/exam-timeline";
import { heldDescriptionLead, heldYearDescriptionLead, hubDateLead, hubTitleDay, hubTitleYear } from "@/lib/hub-title";
import {
  HELD_NEXT_NONE_EN,
  LEAD_MAX_WORDS,
  LEAD_META_MAX,
  capLead,
  cutoffLead,
  heldLeadInTrackerWords,
  hubLead,
  leadDescription,
  leadWords,
  syllabusLead,
  tierNote,
  trackerNoDate,
  updatesLead,
  windowEnd,
} from "@/lib/answer-lead";
import { PATTERN_VERIFIED, patternSentence, verifiedPattern } from "@/lib/pattern-verified";
import { latestCheck, freshnessLine, istDayText } from "@/lib/page-freshness";
import { groupCutoffTables, type OfficialCutoffRow } from "@/lib/official-cutoffs";
import { pickCutoffHeadline } from "@/lib/official-cutoff-title";
import { findForbiddenPhrases } from "@/lib/truth-lint";
import { G3_EXAMS, G3_NOW, type G3Exam } from "../fixtures/g3-exams";

const exams = Object.values(G3_EXAMS);

function hubFor(e: G3Exam) {
  const timeline = buildTimeline(e.rows, G3_NOW, e.officialUrl);
  const dateLead = hubDateLead(timeline, e);
  const titleYear = hubTitleYear(dateLead, timeline, e, G3_NOW);
  const lead = hubLead({ short: e.shortName, dateLead, titleYear, timeline, pattern: verifiedPattern(e), officialUrl: e.officialUrl });
  return { timeline, dateLead, titleYear, lead };
}

function updatesFor(e: G3Exam) {
  const timeline = buildTimeline(e.rows, G3_NOW, e.officialUrl);
  const { next, nextExam } = stageOf(timeline);
  const last = [...timeline].reverse().find((r) => r.status === "done" && !r.passedEstimate) ?? null;
  const year = titleCycleYear(timeline, G3_NOW) ?? 2026;
  return updatesLead({ short: e.shortName, year, nextExam, next, last });
}

// Pattern numbers as the stored tuple would print them.
const tupleBits = (e: G3Exam) => [`${e.totalQuestions} questions`, `${e.totalMarks} marks`, `${e.durationMin} minutes`];

describe("verifiedPattern — numbers only as read from the notice", () => {
  it("SSC CGL Tier-I agrees with the SSC 2026 notice", () => {
    const v = verifiedPattern(G3_EXAMS.SSC_CGL);
    expect(v?.stage).toBe("Tier-I");
    expect(v?.sections.reduce((a, s) => a + s.questions, 0)).toBe(v?.questions);
    expect(v?.sections.reduce((a, s) => a + s.marks, 0)).toBe(v?.marks);
    expect(v?.source.url.startsWith("https://ssc.gov.in/")).toBe(true);
    expect(patternSentence(v!)).toBe("Tier-I: 100 questions, 200 marks, 60 minutes, −0.5 per wrong answer (SSC notice, 21 May 2026).");
  });

  it("a stored row that no longer agrees drops back to no numbers", () => {
    expect(verifiedPattern({ ...G3_EXAMS.SSC_CGL, totalQuestions: 120 })).toBeNull();
    expect(verifiedPattern({ ...G3_EXAMS.SSC_CGL, negativeMark: 0.25 })).toBeNull();
    expect(verifiedPattern({ ...G3_EXAMS.SSC_CGL, durationMin: 80 })).toBeNull();
  });

  it("exams not read from a notice have none (NEET UG, CA Foundation, JEE Main, UPSC Prelims)", () => {
    for (const code of ["NEET_UG", "CA_FOUNDATION", "JEE_MAIN", "UPSC_PRELIMS"]) {
      expect(verifiedPattern(G3_EXAMS[code]), code).toBeNull();
      expect(PATTERN_VERIFIED[code], code).toBeUndefined();
    }
  });
});

describe("hubLead — the title's decision, answer first", () => {
  it("every fixture exam: ≤ LEAD_MAX_WORDS words, no trust phrase, pattern numbers only when verified", () => {
    for (const e of exams) {
      const { lead } = hubFor(e);
      expect(lead, e.code).toBeTruthy();
      expect(leadWords(lead!), e.code).toBeLessThanOrEqual(LEAD_MAX_WORDS);
      expect(findForbiddenPhrases(lead!, e.code)).toEqual([]);
      if (!verifiedPattern(e)) for (const bit of tupleBits(e)) expect(lead, `${e.code}: ${bit}`).not.toContain(bit);
    }
  });

  it("SSC CGL: the announced Tier 1 window with its official source, then the verified pattern", () => {
    const { dateLead, lead } = hubFor(G3_EXAMS.SSC_CGL);
    expect(dateLead.kind).toBe("announced");
    // The same day the <title> prints.
    expect(lead).toContain(dateLead.kind === "announced" ? hubTitleDay(dateLead.row.date) : "");
    expect(lead).toBe(
      "SSC CGL — Tier 1 exam begins: 30 Sept 2026 (official — ssc.gov.in); Tier 1 exam ends: 30 Oct 2026 (official — ssc.gov.in). " +
        "SSC CGL Tier-I: 100 questions, 200 marks, 60 minutes, −0.5 per wrong answer (SSC notice, 21 May 2026). Official site: ssc.gov.in.",
    );
  });

  // 27 Sep 2026 (repair, adversarial review): "not announced yet" claimed
  // the conducting body had said nothing — false for JEE Main (NTA notice,
  // 16 Sep 2026) and UPSC Prelims / CDS (UPSC Calendar 2027, 20 May 2026)
  // while the tracker held neither. The lead now says what the tracker holds.
  it("JEE Main: nothing announced on the tracker — said as the tracker's gap, never the expected 21 Jan date", () => {
    const { dateLead, lead } = hubFor(G3_EXAMS.JEE_MAIN);
    expect(dateLead.kind).toBe("none");
    expect(lead).toBe("Shishya's tracker has no announced JEE Main exam date yet. Official site: nta.ac.in.");
    expect(lead).not.toContain("Jan");
  });

  it("NEET UG: 200 questions / 200 minutes stored, no notice read — the lead states no pattern", () => {
    const { lead } = hubFor(G3_EXAMS.NEET_UG);
    expect(lead).toBe("Shishya's tracker has no announced NEET UG exam date yet. Official site: neet.nta.nic.in.");
  });

  it("UPSC Prelims: the held lead the title uses, the next date in the tracker's words", () => {
    const { dateLead, lead } = hubFor(G3_EXAMS.UPSC_PRELIMS);
    expect(dateLead.kind).toBe("held");
    expect(lead).toBe("UPSC Prelims Mains exam began 21 Aug 2026; Shishya's tracker has no announced date for the next exam yet. Official site: upsc.gov.in.");
  });

  it("CA Foundation: four papers stored as one 100-question tuple — no numbers, no date on the tracker", () => {
    const { lead } = hubFor(G3_EXAMS.CA_FOUNDATION);
    expect(lead).toBe("Shishya's tracker has no announced CA Foundation exam date yet. Official site: icai.org.");
  });

  it("no hub or /updates lead claims a date is 'not announced yet' (a claim about the body, not the tracker)", () => {
    for (const e of exams) {
      expect(hubFor(e).lead, e.code).not.toMatch(/not announced yet/i);
      expect(updatesFor(e), e.code).not.toMatch(/not announced yet/i);
    }
    // The held leads' wording the rewrite relies on (src/lib/hub-title.ts).
    const held = { row: buildTimeline(G3_EXAMS.UPSC_PRELIMS.rows, G3_NOW, null)[0], stage: null, verb: "held" } as unknown as Parameters<typeof heldDescriptionLead>[2];
    expect(heldDescriptionLead("en", "CDS", held, null).trim().endsWith(HELD_NEXT_NONE_EN)).toBe(true);
    expect(heldYearDescriptionLead("en", "CDS", 2026).trim().endsWith(HELD_NEXT_NONE_EN)).toBe(true);
    expect(heldLeadInTrackerWords(heldYearDescriptionLead("en", "CDS", 2026))).toBe("CDS 2026 exam held; Shishya's tracker has no announced date for the next exam yet.");
    expect(trackerNoDate("SSC CGL 2027")).toBe("Shishya's tracker has no announced SSC CGL 2027 exam date yet.");
  });

  it("a reported date carries its tier and host", () => {
    const e: G3Exam = {
      ...G3_EXAMS.JEE_MAIN,
      rows: [{ id: "x", label: "JEE Main 2027 Session 1 exam", date: "2027-01-22T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://www.adda247.com/jee" }],
    };
    expect(hubFor(e).lead).toContain("JEE Main 2027 Session 1 exam: 22 Jan 2027 (reported — adda247.com).");
  });

  it("windowEnd pairs 'begins' with 'ends' of the same stage only", () => {
    const t = buildTimeline(G3_EXAMS.SSC_CGL.rows, G3_NOW, G3_EXAMS.SSC_CGL.officialUrl);
    const begins = t.find((r) => r.label === "Tier 1 exam begins")!;
    expect(windowEnd(begins, t)?.label).toBe("Tier 1 exam ends");
    const tier2 = t.find((r) => r.label === "Tier 2 exam (expected)")!;
    expect(windowEnd(tier2, t)).toBeNull();
  });
});

describe("updatesLead — next exam day, next milestone, last milestone", () => {
  it("SSC CGL: tier words on every date; a passed estimate is never 'Last'", () => {
    const lead = updatesFor(G3_EXAMS.SSC_CGL)!;
    expect(lead).toBe(
      "SSC CGL 2026 — Tier 1 exam begins: 30 Sept 2026 (official — ssc.gov.in). " +
        "Next: Tier 1 admit card (expected): 27 Sept 2026 (not announced). " +
        "Last: SSC CGL 2026 correction window: 29 Jun 2026 (reported — xylemlearning.com).",
    );
    expect(lead).not.toContain("admit card release");
    expect(lead).not.toContain("City intimation");
  });

  it("JEE Main: an expected exam day is stated only with its tier", () => {
    const lead = updatesFor(G3_EXAMS.JEE_MAIN)!;
    expect(lead.startsWith("JEE Main 2027 Session 1 exam (expected): 21 Jan 2027 (not announced).")).toBe(true);
    expect(lead).toContain("Last: CSAB Round 2 seat allotment result: 12 Aug 2026 (reported — sarvgyan.com).");
  });

  it("every fixture: ≤ LEAD_MAX_WORDS, and every date is followed by its tier", () => {
    for (const e of exams) {
      const lead = updatesFor(e)!;
      expect(leadWords(lead), e.code).toBeLessThanOrEqual(LEAD_MAX_WORDS);
      for (const m of lead.matchAll(/\d{1,2} [A-Z][a-z]+ \d{4}/g)) {
        expect(lead.slice(m.index! + m[0].length), `${e.code} ${m[0]}`).toMatch(/^ \((official|reported|expected|not announced)/);
      }
    }
  });
});

describe("cutoffLead — the published figure first, or plainly none", () => {
  const row = (over: Partial<OfficialCutoffRow>): OfficialCutoffRow => ({
    cycle: "2025",
    stage: "Tier-I (shortlisting for Tier-II)",
    post: "List-1: Junior Statistical Officer (JSO)",
    region: "",
    gender: "",
    category: "UR",
    categoryLabel: "UR",
    marks: "153.46108",
    maxMarks: "",
    scoreType: "normalised marks",
    sourceUrl: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/writeup_181225.pdf",
    sourceTitle: "Tier-I result write-up",
    publisher: "Staff Selection Commission",
    publishedOn: "2025-12-18",
    ...over,
  });

  it("names the headline figure, the publisher, the date and the tier", () => {
    const tables = groupCutoffTables([row({}), row({ category: "OBC", categoryLabel: "OBC", marks: "153.46108" })]);
    const h = pickCutoffHeadline(tables, "https://ssc.gov.in");
    const lead = cutoffLead({ short: "SSC CGL", year: 2025, headline: h, officialUrl: "https://ssc.gov.in" })!;
    expect(lead).toBe(
      "SSC CGL cutoff 2025: UR 153.46108 (normalised marks) — Tier-I (shortlisting for Tier-II), List-1: Junior Statistical Officer (JSO). " +
        "Published by Staff Selection Commission on 18 Dec 2025 (official — ssc.gov.in). The score bands further down are indicative, not official.",
    );
    expect(leadWords(lead)).toBeLessThanOrEqual(LEAD_MAX_WORDS);
  });

  it("a newspaper's reproduction is 'reported', never official", () => {
    const tables = groupCutoffTables([row({ sourceUrl: "https://www.amarujala.com/x", publisher: "Amar Ujala", publishedOn: "2024-11-21" })]);
    const h = pickCutoffHeadline(tables, "https://uppbpb.gov.in");
    expect(cutoffLead({ short: "UP Police", year: 2023, headline: h, officialUrl: "https://uppbpb.gov.in" })).toContain(
      "(reported — amarujala.com)",
    );
  });

  it("no published row: the bands are called indicative and the body's site is named", () => {
    expect(cutoffLead({ short: "NEET UG", year: null, headline: null, officialUrl: "https://neet.nta.nic.in" })).toBe(
      "No official NEET UG cutoff is published on Shishya yet — the score bands below are indicative, not official. Official cutoffs are published at neet.nta.nic.in.",
    );
  });
});

describe("syllabusLead", () => {
  it("SSC CGL: subjects, topic count, verified pattern, official site", () => {
    const e = G3_EXAMS.SSC_CGL;
    expect(syllabusLead({ short: e.shortName, subjects: e.subjects, topicCount: e.topicCount, pattern: verifiedPattern(e), officialUrl: e.officialUrl })).toBe(
      "SSC CGL syllabus: 4 subjects (General Intelligence and Reasoning, General Awareness, Quantitative Aptitude, English Comprehension) and 61 topics. " +
        "SSC CGL Tier-I: 100 questions, 200 marks, 60 minutes, −0.5 per wrong answer (SSC notice, 21 May 2026). Official syllabus and notification: ssc.gov.in.",
    );
  });

  it("NEET UG: no pattern numbers; many subjects are summarised; none → no lead", () => {
    const e = G3_EXAMS.NEET_UG;
    const lead = syllabusLead({ short: e.shortName, subjects: e.subjects, topicCount: e.topicCount, pattern: verifiedPattern(e), officialUrl: e.officialUrl })!;
    for (const bit of tupleBits(e)) expect(lead).not.toContain(bit);
    const many = syllabusLead({ short: "X", subjects: ["A", "B", "C", "D", "E", "F", "G", "H"], topicCount: 1, pattern: null, officialUrl: null })!;
    expect(many).toBe("X syllabus: 8 subjects (A, B, C, D, E and 3 more) and 1 topic.");
    expect(syllabusLead({ short: "X", subjects: [], topicCount: 0, pattern: null, officialUrl: null })).toBeNull();
  });
});

describe("capLead / leadDescription / tierNote", () => {
  it("drops later sentences first, then cuts at a word", () => {
    const long = Array.from({ length: 50 }, (_, i) => `w${i}`).join(" ") + ".";
    expect(capLead([long, "Second sentence here with more words than fit in the lead at all, really."])).toBe(long);
    const huge = Array.from({ length: 90 }, (_, i) => `w${i}`).join(" ");
    const cut = capLead([huge])!;
    expect(leadWords(cut)).toBe(LEAD_MAX_WORDS);
    expect(cut.endsWith("…")).toBe(true);
    expect(capLead([null, "", false])).toBeNull();
  });

  it("the lead heads the description, ~160 characters in all", () => {
    for (const e of exams) {
      const { lead } = hubFor(e);
      const d = leadDescription(lead, "Free preparation: mock tests, AI tutor and a free day-by-day coach plan. No paywall.");
      expect(d.length, e.code).toBeLessThanOrEqual(LEAD_META_MAX);
      expect(d.startsWith(lead!.split(" ").slice(0, 4).join(" ")), e.code).toBe(true);
    }
  });

  it("tier words", () => {
    expect(tierNote("official", "https://www.ssc.gov.in/x.pdf")).toBe("official — ssc.gov.in");
    expect(tierNote("reported", "https://adda247.com/a")).toBe("reported — adda247.com");
    expect(tierNote("expected", null)).toBe("expected, not announced");
    expect(tierNote("expected", null, true)).toBe("not announced");
  });
});

describe("page-freshness — a check date, never the clock", () => {
  it("the latest check in IST; future and empty values ignored", () => {
    const now = new Date("2026-09-26T17:00:00Z");
    const f = latestCheck(["2026-09-13T18:31:11.347Z", new Date("2026-09-14T04:40:22Z"), null, "not a date", "2027-01-01T00:00:00Z"], now)!;
    expect(f.iso).toBe("2026-09-14T04:40:22.000Z");
    expect(f.day).toBe("14 Sept 2026");
    expect(istDayText(new Date("2026-09-13T18:31:11Z"))).toBe("14 Sept 2026");
    expect(latestCheck([], now)).toBeNull();
    expect(latestCheck([null, undefined], now)).toBeNull();
    expect(freshnessLine(f, "Published figures")).toBe("Published figures last checked 14 Sept 2026 (IST).");
  });

  it("no page reads a render time as its check date", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
    const cutoff = read("src/app/exams/[code]/cutoff/page.tsx");
    expect(cutoff).not.toMatch(/dateModified: istDay\(new Date\(\)\)/);
    expect(cutoff).toMatch(/latestCheck\(publishedRows\.map\(\(r\) => r\.verifiedAt\)\)/);
    const syllabus = read("src/app/exams/[code]/syllabus/page.tsx");
    expect(syllabus).toMatch(/const checked = pattern \? latestCheck\(/);
    expect(syllabus).not.toMatch(/generatedAt|updatedAt/);
  });
});
