// Pure unit tests for the 16 Sep 2026 exam-week rules in src/lib/exam-week.ts
// and src/lib/exam-timeline.ts. No DB.
// Run with: npx vitest run tests/unit/exam-week-open-ended.test.ts
//
// What is pinned:
//   • an open-ended start row (MP RAEO "Online exam begins — shifts … (end
//     date not announced)") never turns "post" the next morning — phase
//     "window" with openEnded for NEAR_DAYS, then nothing; the regex stays
//     narrow (JKSSB "begins … continues till", UPSC "Mains exam begins")
//   • same-day rows are picked deterministically whatever order the loader
//     returned them in: tier, then the earliest first shift, then id — and
//     inside the window the focus is the BEST row of the day (the KSRP
//     time-less "reported" copy used to win)
//   • sittingsOn lists every sitting of the day at its best tier
//   • latestOfKind returns the best tier on the latest day

import { describe, it, expect } from "vitest";
import {
  admitNotesAreReporting,
  alertCopyPhase,
  computeExamWeekState,
  examRowOrder,
  isOpenEndedRow,
  sittingsOn,
} from "@/lib/exam-week";
import { buildTimeline, latestOfKind, type TimelineInput } from "@/lib/exam-timeline";
import { examEveDecision, examRowOnDay } from "@/lib/exam-week-mail";

const d = (iso: string) => `${iso}T00:00:00.000Z`;
/** An instant on IST day `day` at IST clock time hh:mm. */
const ist = (day: string, hh: number, mm = 0) => new Date(Date.parse(`${day}T00:00:00Z`) - 330 * 60_000 + (hh * 60 + mm) * 60_000);

// Rows as read from prod, 16 Sep 2026 (scripts/tmp-w1-pb-examweek-rows.ts).
const MPESB_URL = "https://esb.mp.gov.in";
const RAEO_EXAM: TimelineInput = {
  id: "cmu1n5jyf003yhfwbwi7kmt7n",
  label: "Online exam begins — shifts 09:00–12:00 and 14:30–17:30 (end date not announced)",
  date: d("2026-09-17"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://esb.mp.gov.in/rulebooks/RB_2026/Group2_SG1_2026_ExamDateExtended_Rulebookpage_1_28__31072026.pdf",
  notes: null,
};

const KEA_URL = "https://cetonline.karnataka.gov.in";
const KSRP_MORNING: TimelineInput = {
  id: "cmu1n5l6d005bhfwbmcxt8izx",
  label: "Written test — outside Kalyana Karnataka (1,455 posts), 10:30–12:00",
  date: d("2026-09-20"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://cetonline.karnataka.gov.in/keawebentry456/kisrpc2026/ksrpnkkkannada.pdf",
  notes: null,
};
const KSRP_AFTERNOON: TimelineInput = {
  id: "cmu1n5l7z005dhfwby22wojft",
  label: "Written test — Kalyana Karnataka (KSRP, KSISF, IRB; 859 posts), 15:00–16:30",
  date: d("2026-09-20"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://cetonline.karnataka.gov.in/keawebentry456/kiskk2026/KSRP_KK_3-5_SCHDkannada.pdf",
  notes: null,
};
/** The time-less AI copy (karmasandhan.com → reported), archived on prod 16 Sep. */
const KSRP_AI: TimelineInput = {
  id: "cmu2p8pl00045ov8iob363eyv",
  label: "Written exam — KSRP/KSISF/IRB",
  date: d("2026-09-20"),
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://www.karmasandhan.com/ksrp-police-constable-recruitment-2026/",
  notes: "Single OMR-based exam for all three cadres; 100 marks in 90 minutes",
};

describe("open-ended start row (MP RAEO, 17 Sep 2026)", () => {
  it("eve and exam day behave as before", () => {
    expect(computeExamWeekState([RAEO_EXAM], MPESB_URL, ist("2026-09-16", 18, 30)).phase).toBe("eve");
    const am = computeExamWeekState([RAEO_EXAM], MPESB_URL, ist("2026-09-17", 10));
    expect(am.phase).toBe("today-am");
    expect(am.openEnded).toBe(false);
    expect(computeExamWeekState([RAEO_EXAM], MPESB_URL, ist("2026-09-17", 19)).phase).toBe("today-pm");
  });

  it("the next morning is an open-ended window, not 'post' — focus stays on the start row", () => {
    const s = computeExamWeekState([RAEO_EXAM], MPESB_URL, ist("2026-09-18", 0, 1));
    expect(s.phase).toBe("window");
    expect(s.openEnded).toBe(true);
    expect(s.focus?.id).toBe(RAEO_EXAM.id);
    expect(s.focusDay).toBe("2026-09-17");
    expect(s.tier).toBe("official");
    expect(s.daysTo).toBe(-1);
    const later = computeExamWeekState([RAEO_EXAM], MPESB_URL, ist("2026-09-24", 12));
    expect(later.phase).toBe("window");
    expect(later.openEnded).toBe(true);
  });

  it("after NEAR_DAYS it drops out of exam week — never 'post' on a guess", () => {
    const s = computeExamWeekState([RAEO_EXAM], MPESB_URL, ist("2026-09-25", 12));
    expect(s.phase).toBe("none");
    expect(s.openEnded).toBe(false);
  });

  it("a later announced row closes the question: the window runs to it, then 'post'", () => {
    const day2: TimelineInput = { ...RAEO_EXAM, id: "raeo-d2", label: "Online exam — last day", date: d("2026-09-19") };
    const inside = computeExamWeekState([RAEO_EXAM, day2], MPESB_URL, ist("2026-09-18", 10));
    expect(inside.phase).toBe("window");
    expect(inside.openEnded).toBe(false);
    const after = computeExamWeekState([RAEO_EXAM, day2], MPESB_URL, ist("2026-09-20", 10));
    expect(after.phase).toBe("post");
    expect(after.openEnded).toBe(false);
  });

  it("an EXPECTED open-ended row never keeps a window open", () => {
    const est: TimelineInput = { ...RAEO_EXAM, id: "est", confidence: "expected", url: null };
    const s = computeExamWeekState([est], MPESB_URL, ist("2026-09-18", 10));
    expect(s.phase).toBe("post");
    expect(s.openEnded).toBe(false);
  });

  it("the alert box keeps the answer-key promise in the open-ended week (review, 16 Sep 2026)", () => {
    const s = computeExamWeekState([RAEO_EXAM], MPESB_URL, ist("2026-09-20", 10));
    expect(s.phase).toBe("window");
    expect(alertCopyPhase(s.phase, s)).toBe("post");
    expect(alertCopyPhase("window", { openEnded: false })).toBe("window");
    expect(alertCopyPhase("post", { openEnded: false })).toBe("post");
    expect(alertCopyPhase("none", { openEnded: false })).toBe("none");
  });

  it("a plain single-day exam still turns 'post' the next day", () => {
    const plain: TimelineInput = { ...RAEO_EXAM, id: "plain", label: "Online exam — shifts 09:00–12:00 and 14:30–17:30" };
    const s = computeExamWeekState([plain], MPESB_URL, ist("2026-09-18", 10));
    expect(s.phase).toBe("post");
    expect(s.openEnded).toBe(false);
  });

  it("the regex is narrow: begins / starts / onwards with an end on record do not match", () => {
    expect(isOpenEndedRow({ label: RAEO_EXAM.label, notes: null })).toBe(true);
    expect(isOpenEndedRow({ label: "Exam", notes: "End date to be announced" })).toBe(true);
    expect(isOpenEndedRow({ label: "Exam", notes: "end date not yet announced" })).toBe(true);
    expect(
      isOpenEndedRow({
        label: "Health & Medical posts (518 vacancies) – Exam begins",
        notes: "OMR-based exams for Health & Medical Education Dept posts; continues till 15 November 2026",
      }),
    ).toBe(false);
    expect(isOpenEndedRow({ label: "Mains exam begins", notes: "Mains scheduled: Aug 21, 22, 23, 29, 30 (9 papers over 5 days)" })).toBe(false);
    expect(isOpenEndedRow({ label: "Group 3 Sub Engineer exam starts", notes: null })).toBe(false);
    expect(isOpenEndedRow({ label: "Group 2 Sub Group 4 Patwari Exam", notes: "CBT exam from 22nd September onwards in two shifts" })).toBe(false);
    expect(isOpenEndedRow(null)).toBe(false);
  });
});

describe("same-day rows — deterministic, best row first (KSRP, 20 Sep 2026)", () => {
  const orders: TimelineInput[][] = [
    [KSRP_MORNING, KSRP_AFTERNOON, KSRP_AI],
    [KSRP_AI, KSRP_AFTERNOON, KSRP_MORNING],
    [KSRP_AFTERNOON, KSRP_AI, KSRP_MORNING],
  ];

  it("eve, exam morning and the day after all focus the same official row, whatever the loader order", () => {
    for (const rows of orders) {
      const eve = computeExamWeekState(rows, KEA_URL, ist("2026-09-19", 18, 30));
      expect(eve.phase).toBe("eve");
      expect(eve.focus?.id).toBe(KSRP_MORNING.id);
      expect(eve.windowDays[0]?.id).toBe(KSRP_MORNING.id);
      const am = computeExamWeekState(rows, KEA_URL, ist("2026-09-20", 8));
      expect(am.phase).toBe("today-am");
      expect(am.focus?.id).toBe(KSRP_MORNING.id);
      expect(am.tier).toBe("official");
      const post = computeExamWeekState(rows, KEA_URL, ist("2026-09-21", 10));
      expect(post.phase).toBe("post");
      expect(post.focus?.id).toBe(KSRP_MORNING.id);
      expect(post.windowEnd?.id).toBe(KSRP_MORNING.id);
    }
  });

  it("the eve mail's row is the morning sitting, and a one-day, two-sitting exam has no 'window to' end", () => {
    for (const rows of orders) {
      const decision = examEveDecision(rows, KEA_URL, ist("2026-09-19", 18, 30));
      expect(decision.ok).toBe(true);
      if (!decision.ok) continue;
      expect(decision.eveRow.id).toBe(KSRP_MORNING.id);
      // exam-eve/route.ts prints a window range only when windowEnd is a
      // different row — the worst-ordered same-day row used to be.
      expect(decision.state.windowEnd?.id).toBe(decision.eveRow.id);
      const tl = buildTimeline(rows, ist("2026-09-21", 8, 30), KEA_URL);
      expect(examRowOnDay(tl, "2026-09-20")?.id).toBe(KSRP_MORNING.id);
    }
  });

  it("sittingsOn lists both official sittings, earliest first, and drops the reported copy", () => {
    for (const rows of orders) {
      const s = computeExamWeekState(rows, KEA_URL, ist("2026-09-20", 8));
      expect(sittingsOn(s.windowDays, s.focusDay).map((r) => r.id)).toEqual([KSRP_MORNING.id, KSRP_AFTERNOON.id]);
    }
    // With only the reported copy on the day, that is the day's sitting.
    const onlyAi = computeExamWeekState([KSRP_AI], KEA_URL, ist("2026-09-20", 8));
    expect(sittingsOn(onlyAi.windowDays, onlyAi.focusDay).map((r) => r.id)).toEqual([KSRP_AI.id]);
    expect(sittingsOn(onlyAi.windowDays, null)).toEqual([]);
  });

  it("examRowOrder: tier, then earliest first shift (a row naming no time goes last), then id", () => {
    const tl = buildTimeline([KSRP_AI, KSRP_AFTERNOON, KSRP_MORNING], ist("2026-09-16", 12), KEA_URL);
    expect([...tl].sort(examRowOrder).map((r) => r.id)).toEqual([KSRP_MORNING.id, KSRP_AFTERNOON.id, KSRP_AI.id]);
    const untimedA: TimelineInput = { ...KSRP_MORNING, id: "b-untimed", label: "Written test" };
    const untimedB: TimelineInput = { ...KSRP_MORNING, id: "a-untimed", label: "Written test (second centre list)" };
    const tl2 = buildTimeline([untimedA, KSRP_AFTERNOON, untimedB], ist("2026-09-16", 12), KEA_URL);
    expect([...tl2].sort(examRowOrder).map((r) => r.id)).toEqual([KSRP_AFTERNOON.id, "a-untimed", "b-untimed"]);
  });
});

describe("latestOfKind — best tier among the rows on the latest day", () => {
  const apply = (id: string, confidence: string, url: string | null): TimelineInput => ({
    id,
    label: "Online application opens",
    date: d("2026-07-13"),
    isExamDay: false,
    kind: "APPLICATION_START",
    confidence,
    url,
    notes: null,
  });
  it("prefers the official row over a reported / expected copy on the same day, in any input order", () => {
    const official = apply("zz-official", "official", "https://cetonline.karnataka.gov.in/notice.pdf");
    const reported = apply("aa-reported", "official", "https://www.karmasandhan.com/ksrp");
    const expected = apply("mm-expected", "expected", null);
    for (const rows of [
      [official, reported, expected],
      [expected, reported, official],
      [reported, expected, official],
    ]) {
      const tl = buildTimeline(rows, ist("2026-09-16", 12), KEA_URL);
      expect(latestOfKind(tl, "APPLICATION_START")?.id).toBe("zz-official");
    }
  });

  it("a later day still wins over a better tier on an earlier day", () => {
    const early = apply("early", "official", "https://cetonline.karnataka.gov.in/notice.pdf");
    const late = { ...apply("late", "expected", null), date: d("2026-07-20") };
    const tl = buildTimeline([late, early], ist("2026-09-16", 12), KEA_URL);
    expect(latestOfKind(tl, "APPLICATION_START")?.id).toBe("late");
  });
});

describe("admitNotesAreReporting", () => {
  it("reads gate / reporting / entry wording as reporting instructions", () => {
    expect(admitNotesAreReporting("Reporting time 8:30 AM; gate closes 9:30 AM")).toBe(true);
    expect(admitNotesAreReporting("Gates close 30 minutes before the exam")).toBe(true);
    expect(admitNotesAreReporting("Entry to the centre from 07:45")).toBe(true);
  });
  it("a release note is not reporting instructions", () => {
    expect(admitNotesAreReporting("Test admit card available for download from MPESB portal")).toBe(false);
    // Live release notes (review, 16 Sep 2026): a clock time alone is a
    // release time, and "GATE" is an exam's name.
    expect(admitNotesAreReporting("Available from 5:00 PM onwards via OTR portal")).toBe(false);
    expect(admitNotesAreReporting("Available from 11:00 AM onwards via ASSEB portal")).toBe(false);
    expect(admitNotesAreReporting("To be released by 5 PM on October 4, 2026")).toBe(false);
    expect(admitNotesAreReporting("Admit card released at 9:30 AM")).toBe(false);
    expect(admitNotesAreReporting("PET/PST admit card released at 2:00 PM on OJAS")).toBe(false);
    expect(admitNotesAreReporting("Expected based on GATE 2027 schedule; downloadable from GOAPS portal")).toBe(false);
    expect(admitNotesAreReporting("Exam at 10:00 AM")).toBe(false);
    expect(admitNotesAreReporting("")).toBe(false);
    expect(admitNotesAreReporting(null)).toBe(false);
  });
});
