// Passed estimates (24 Sep 2026) — src/lib/official-source.ts
// isPassedEstimate / passedEstimateView / passedEstimateLine, the one rule
// every tracker-date surface (hub Important Dates, /updates, ExamWeekBlock,
// the homepage calendar rail, /archive, context.md) now shares.
//
// The case that started it: AP_APPSC_GROUP1's tracker holds only estimates,
// and "Notification release 15 Aug" still printed as a date in late
// September; UK_TET's "Admit card release (expected) 20 Sep" and UK_UKSSSC's
// "Graduate Level result (expected) 15 Sep" likewise. No surface may show a
// passed estimate as a date a student can rely on — and the hub title must
// never be built from one.

//
// Review of the first cut (24 Sep 2026): "any announced row of the same
// kind" left out estimates for pending events because of an older cycle's or
// another stage's row (JKPSC CCE 2025 vs the 2026 estimate, SSC GD's 2025
// final result vs the 2026 CBT result estimate), and the /updates cards and
// FAQ JSON-LD then answered with the older row; and the "No official date
// yet" line stood beside announced rows showing the milestone went ahead (AR
// APPSC's prelims held after a passed admit-card estimate). The fixtures
// below are those prod shapes.

import { describe, it, expect } from "vitest";
import { isPassedEstimate, passedEstimateLine, passedEstimateView, supersedingRow } from "@/lib/official-source";
import { buildTimeline, latestOfKind, upcomingOfKind, type DateKind, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import { hubDateLead } from "@/lib/hub-title";

// 24 Sep 2026, 11:00 IST.
const NOW = new Date("2026-09-24T05:30:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`); // stored convention: midnight UTC of the IST day

const row = (id: string, label: string, iso: string, kind: string, tier: "official" | "reported" | "expected"): TimelineInput => ({
  id,
  label,
  date: day(iso),
  isExamDay: kind === "EXAM",
  kind,
  confidence: tier === "expected" ? "expected" : "official",
  url: tier === "official" ? "https://psc.ap.gov.in/notice.pdf" : tier === "reported" ? "https://testbook.com/news/x" : null,
});

describe("isPassedEstimate — expected tier, IST day before today", () => {
  it("an expected row dated yesterday (IST) has passed; today's has not", () => {
    expect(isPassedEstimate({ tier: "expected", date: day("2026-09-23") }, NOW)).toBe(true);
    expect(isPassedEstimate({ tier: "expected", date: day("2026-09-24") }, NOW)).toBe(false);
    expect(isPassedEstimate({ tier: "expected", date: day("2026-10-15") }, NOW)).toBe(false);
  });

  it("announced rows are never passed estimates — a passed announced date is history", () => {
    expect(isPassedEstimate({ tier: "official", date: day("2026-08-15") }, NOW)).toBe(false);
    expect(isPassedEstimate({ tier: "reported", date: day("2026-08-15") }, NOW)).toBe(false);
  });

  it("turns over at IST midnight, not UTC midnight", () => {
    const row24 = { tier: "expected" as const, date: day("2026-09-24") };
    expect(isPassedEstimate(row24, new Date("2026-09-24T18:00:00Z"))).toBe(false); // 23:30 IST, 24 Sep
    expect(isPassedEstimate(row24, new Date("2026-09-24T18:31:00Z"))).toBe(true); // 00:01 IST, 25 Sep
  });

  it("accepts ISO strings (unstable_cache hands dates back as strings) and ignores a bad date", () => {
    expect(isPassedEstimate({ tier: "expected", date: "2026-08-15T00:00:00.000Z" }, NOW)).toBe(true);
    expect(isPassedEstimate({ tier: "expected", date: "not a date" }, NOW)).toBe(false);
  });

  it("agrees with buildTimeline's passedEstimate flag row for row", () => {
    const rows = [
      row("a", "Notification release", "2026-08-15", "NOTIFICATION", "expected"),
      row("b", "Admit card release (expected)", "2026-09-20", "ADMIT_CARD", "expected"),
      row("c", "Exam", "2026-09-24", "EXAM", "expected"),
      row("d", "Result", "2026-10-15", "RESULT", "expected"),
      row("e", "Prelims exam", "2026-09-01", "EXAM", "official"),
      row("f", "Result", "2026-09-10", "RESULT", "reported"),
    ];
    for (const r of buildTimeline(rows, NOW)) expect(isPassedEstimate(r, NOW), r.label).toBe(r.passedEstimate);
  });
});

describe("passedEstimateView — date, honest line, or left out", () => {
  it("AP Group 1: an all-estimate tracker prints the line for the passed rows, the date for the rest", () => {
    const tl = buildTimeline(
      [
        row("n", "Notification release", "2026-08-15", "NOTIFICATION", "expected"),
        row("s", "Application window opens", "2026-08-15", "APPLICATION_START", "expected"),
        row("x", "Prelims exam (expected)", "2026-12-20", "EXAM", "expected"),
      ],
      NOW,
    );
    const view = Object.fromEntries(tl.map((r) => [r.id, passedEstimateView(r, tl, NOW)]));
    expect(view).toEqual({ n: "line", s: "line", x: "date" });
  });

  it("an announced row of the same event supersedes the estimate: left out (GATE registration)", () => {
    const tl = buildTimeline(
      [
        row("est", "GATE 2026 — registration opens", "2026-08-28", "APPLICATION_START", "expected"),
        row("off", "GATE 2027 registration begins", "2026-08-27", "APPLICATION_START", "official"),
      ],
      NOW,
    );
    const est = tl.find((r) => r.id === "est")!;
    expect(passedEstimateView(est, tl, NOW)).toBe("omit");
    expect(passedEstimateView(tl.find((r) => r.id === "off")!, tl, NOW)).toBe("date");
  });

  it("an exam day is superseded only by the same stage (RBI Grade B cadres stay apart)", () => {
    const tl = buildTimeline(
      [
        row("dsim", "Phase 1 exam - DEPR/DSIM", "2026-06-14", "EXAM", "expected"),
        row("gen", "Phase 1 exam - General cadre", "2026-06-13", "EXAM", "official"),
        row("pre", "Prelims exam (expected)", "2026-09-10", "EXAM", "expected"),
        row("preOff", "Preliminary Examination", "2026-09-12", "EXAM", "reported"),
      ],
      NOW,
    );
    const by = (id: string) => tl.find((r) => r.id === id)!;
    expect(passedEstimateView(by("dsim"), tl, NOW)).toBe("line");
    expect(passedEstimateView(by("pre"), tl, NOW)).toBe("omit");
  });

  it("OTHER rows are never superseded by kind alone (counselling rounds differ)", () => {
    const tl = buildTimeline(
      [
        row("spot", "Spot counselling (expected)", "2026-08-10", "OTHER", "expected"),
        row("p1", "Phase 1 counselling registration", "2026-06-18", "OTHER", "reported"),
      ],
      NOW,
    );
    expect(passedEstimateView(tl.find((r) => r.id === "spot")!, tl, NOW)).toBe("line");
  });

  it("a row is never superseded by itself or by another estimate", () => {
    const tl = buildTimeline(
      [
        row("a", "Admit card release (expected)", "2026-09-20", "ADMIT_CARD", "expected"),
        row("b", "Admit card (expected)", "2026-09-22", "ADMIT_CARD", "expected"),
      ],
      NOW,
    );
    for (const r of tl) expect(passedEstimateView(r, tl, NOW)).toBe("line");
  });
});

// The /updates page's pick for a key card, the FAQ (its FAQPage JSON-LD) and
// the share text: drop "omit" rows, then upcoming-else-latest of the kind.
function keyAnswer(tl: TimelineRow[], kind: DateKind): string | null {
  const view = new Map(tl.map((r) => [r.id, passedEstimateView(r, tl, NOW)] as const));
  const shown = tl.filter((r) => view.get(r.id) !== "omit");
  const row = upcomingOfKind(shown, kind) ?? latestOfKind(shown, kind);
  if (!row) return null;
  if (!row.passedEstimate) return `${row.label} (${row.day})`;
  return passedEstimateLine(row.kind, "en", view.get(row.id) === "unsure" ? "unsure" : "line");
}

describe("passedEstimateView — the same event, not just the same kind (24 Sep 2026 review)", () => {
  const viewOf = (tl: TimelineRow[], id: string) => passedEstimateView(tl.find((r) => r.id === id)!, tl, NOW);

  it("JKPSC: last cycle's announced notification never settles this cycle's estimate — the line, not 'CCE 2025 … 22 Aug 2025'", () => {
    const tl = buildTimeline(
      [
        row("n25", "CCE 2025 notification", "2025-08-22", "NOTIFICATION", "reported"),
        row("n26", "CCE 2026 notification (expected)", "2026-09-15", "NOTIFICATION", "expected"),
      ],
      NOW,
    );
    expect(viewOf(tl, "n26")).toBe("line");
    expect(keyAnswer(tl, "NOTIFICATION")).toBe("No official date yet — the expected notification date has passed");
  });

  it("SSC GD: last cycle's final result, with this cycle's CBT between, never answers for the 2026 result", () => {
    const tl = buildTimeline(
      [
        row("r25", "SSC GD 2025 final result", "2026-01-15", "RESULT", "official"),
        row("x1", "Computer-Based Exam — Phase 1 start", "2026-04-27", "EXAM", "official"),
        row("x2", "SSC GD 2026 CBT exam", "2026-05-09", "EXAM", "reported"),
        row("r26", "CBT Result (expected)", "2026-07-15", "RESULT", "expected"),
      ],
      NOW,
    );
    expect(viewOf(tl, "r26")).toBe("line");
    expect(keyAnswer(tl, "RESULT")).toBe("No official date yet — the expected result date has passed");
  });

  it("another named session (HP TET November vs June) or cycle year (NID DAT 2027 vs 2026) leaves the line", () => {
    const hp = buildTimeline(
      [
        row("jun", "HP TET June 2026 notification released", "2026-04-28", "NOTIFICATION", "reported"),
        row("nov", "HP TET November 2026 notification (expected)", "2026-09-10", "NOTIFICATION", "expected"),
      ],
      NOW,
    );
    expect(viewOf(hp, "nov")).toBe("line");
    const nid = buildTimeline(
      [
        row("n26", "NID DAT 2026 Notification released", "2026-04-11", "NOTIFICATION", "reported"),
        row("n27", "NID DAT 2027 notification (expected)", "2026-09-11", "NOTIFICATION", "expected"),
      ],
      NOW,
    );
    expect(viewOf(nid, "n27")).toBe("line");
  });

  it("another stage never supersedes, even close by: mains result vs prelims result, Part-II vs Part-I", () => {
    const tl = buildTimeline(
      [
        row("pre", "Prelims result", "2026-09-01", "RESULT", "reported"),
        row("mains", "Mains result (expected)", "2026-09-10", "RESULT", "expected"),
        row("p1", "Part-I Result (2023 cycle) declared", "2026-09-05", "RESULT", "reported"),
        row("p2", "Part-II Result & Typing Test (2023 cycle) (expected)", "2026-09-15", "RESULT", "expected"),
      ],
      NOW,
    );
    expect(viewOf(tl, "mains")).toBe("line");
    expect(viewOf(tl, "p2")).toBe("line");
  });

  it("an interview is a sitting: CMI's PhD interviews do not settle the M.Sc. interview estimate", () => {
    const tl = buildTimeline(
      [
        row("phd", "PhD Mathematics Interviews", "2026-06-10", "INTERVIEW", "reported"),
        row("msc", "M.Sc. Mathematics interview (expected)", "2026-06-15", "INTERVIEW", "expected"),
      ],
      NOW,
    );
    expect(viewOf(tl, "msc")).toBe("line");
  });

  it("a real duplicate close by is still left out, and supersedingRow names the nearest announced row", () => {
    const tl = buildTimeline(
      [
        row("bstat", "B.Stat result (merit list)", "2026-06-11", "RESULT", "reported"),
        row("merit", "Interview shortlist / Merit List (B.Stat & B.Math)", "2026-06-23", "RESULT", "reported"),
        row("bmath", "B.Math result (merit list, expected)", "2026-06-25", "RESULT", "expected"),
      ],
      NOW,
    );
    const est = tl.find((r) => r.id === "bmath")!;
    expect(passedEstimateView(est, tl, NOW)).toBe("omit");
    expect(supersedingRow(est, tl, NOW)?.id).toBe("merit");
    expect(keyAnswer(tl, "RESULT")).toBe("Interview shortlist / Merit List (B.Stat & B.Math) (2026-06-23)");
  });

  it("the omit window is SUPERSEDE_WINDOW_DAYS: a same-kind announced row further off never drops the estimate", () => {
    const tl = buildTimeline(
      [
        row("off", "UPTET 2026 Notification released", "2026-03-20", "NOTIFICATION", "reported"),
        row("est", "UPTET — notification expected", "2026-07-15", "NOTIFICATION", "expected"),
      ],
      NOW,
    );
    const est = tl.find((r) => r.id === "est")!;
    expect(supersedingRow(est, tl, NOW)).toBeNull();
    // …but nothing tells the two apart, so "No official date yet" could be
    // false: the neutral line.
    expect(passedEstimateView(est, tl, NOW)).toBe("unsure");
  });
});

describe("passedEstimateView — 'unsure' when announced rows say the milestone went ahead", () => {
  const viewOf = (tl: TimelineRow[], id: string) => passedEstimateView(tl.find((r) => r.id === id)!, tl, NOW);

  it("AR APPSC: a prelims held 6 Sep (reported) makes every earlier passed estimate unsure — never 'No official date yet'", () => {
    const tl = buildTimeline(
      [
        row("n", "APPSC CCE 2026 Notification Released", "2026-02-19", "NOTIFICATION", "expected"),
        row("s", "Application window start (expected)", "2026-03-01", "APPLICATION_START", "expected"),
        row("e", "Application window close (expected)", "2026-04-15", "APPLICATION_END", "expected"),
        row("a", "Prelims admit card release (expected)", "2026-08-27", "ADMIT_CARD", "expected"),
        row("x", "APPSC CCE Prelims Exam", "2026-09-06", "EXAM", "reported"),
      ],
      NOW,
    );
    for (const id of ["n", "s", "e", "a"]) expect(viewOf(tl, id), id).toBe("unsure");
    expect(keyAnswer(tl, "ADMIT_CARD")).toBe("The expected admit card date has passed — check the official website");
    expect(keyAnswer(tl, "NOTIFICATION")).toBe("The expected notification date has passed — check the official website");
  });

  it("UK TET: an announced exam still AHEAD proves nothing — the admit card keeps the line", () => {
    const tl = buildTimeline(
      [
        row("a", "Admit card release (expected)", "2026-09-20", "ADMIT_CARD", "expected"),
        row("x", "UTET Paper I & Paper II exam", "2026-09-29", "EXAM", "reported"),
      ],
      NOW,
    );
    expect(viewOf(tl, "a")).toBe("line");
    expect(keyAnswer(tl, "ADMIT_CARD")).toBe("No official date yet — the expected admit card date has passed");
  });

  it("an exam of another stage does not vouch for an admit card (prelims admit card vs mains exam)", () => {
    const tl = buildTimeline(
      [
        row("a", "Mains admit card (expected)", "2026-09-01", "ADMIT_CARD", "expected"),
        row("x", "Prelims exam", "2026-09-10", "EXAM", "official"),
      ],
      NOW,
    );
    expect(viewOf(tl, "a")).toBe("line");
  });

  it("TSPSC Group 4: application milestones travel together — a notification 4 days before the application-start estimate", () => {
    const tl = buildTimeline(
      [
        row("n", "Notification released", "2026-03-06", "NOTIFICATION", "reported"),
        row("s", "Application start (expected)", "2026-03-10", "APPLICATION_START", "expected"),
      ],
      NOW,
    );
    expect(viewOf(tl, "s")).toBe("unsure");
  });

  it("a later stage held after it (UPSC mains after a prelims-result estimate) makes it unsure", () => {
    const tl = buildTimeline(
      [
        row("r", "UPSC CSE 2026 Prelims Result (expected)", "2026-07-15", "RESULT", "expected"),
        row("m", "UPSC CSE 2026 Mains Exam - Day 1", "2026-08-21", "EXAM", "reported"),
      ],
      NOW,
    );
    expect(viewOf(tl, "r")).toBe("unsure");
  });

  it("last cycle's rows vouch for nothing: JKPSC's 2025 mains rows beside the 2026 notification estimate", () => {
    const tl = buildTimeline(
      [
        row("app", "CCE 2025 Mains application end", "2026-08-01", "APPLICATION_END", "reported"),
        row("est", "CCE 2026 notification (expected)", "2026-09-15", "NOTIFICATION", "expected"),
      ],
      NOW,
    );
    expect(viewOf(tl, "est")).toBe("line");
  });
});

describe("passedEstimateLine — the honest line, never a date", () => {
  it("names the kind in en / hi / te", () => {
    expect(passedEstimateLine("NOTIFICATION", "en")).toBe("No official date yet — the expected notification date has passed");
    expect(passedEstimateLine("ADMIT_CARD", "en")).toBe("No official date yet — the expected admit card date has passed");
    expect(passedEstimateLine("RESULT", "hi")).toBe("अभी कोई आधिकारिक तारीख नहीं — रिज़ल्ट की अनुमानित तारीख निकल चुकी है");
    expect(passedEstimateLine("NOTIFICATION", "te")).toBe("ఇంకా అధికారిక తేదీ లేదు — నోటిఫికేషన్ అంచనా తేదీ దాటిపోయింది");
  });

  it("OTHER / unknown kinds get the generic line; other UI languages get English", () => {
    expect(passedEstimateLine("OTHER", "en")).toBe("No official date yet — the expected date has passed");
    expect(passedEstimateLine(null, "te")).toBe("ఇంకా అధికారిక తేదీ లేదు — అంచనా తేదీ దాటిపోయింది");
    expect(passedEstimateLine("EXAM", "mr")).toBe("No official date yet — the expected exam date has passed");
  });

  it("carries no digit and no month in any locale — it can never state a date", () => {
    const kinds = ["NOTIFICATION", "APPLICATION_START", "APPLICATION_END", "CORRECTION_WINDOW", "ADMIT_CARD", "EXAM", "ANSWER_KEY", "QUESTION_PAPER", "RESULT", "INTERVIEW", "OTHER", null];
    for (const lc of ["en", "hi", "te"]) {
      for (const k of kinds) {
        for (const view of ["line", "unsure"] as const) {
          const s = passedEstimateLine(k, lc, view);
          expect(s, `${lc} ${k} ${view}`).not.toMatch(/[0-9०-९౦-౯]/);
          expect(s, `${lc} ${k} ${view}`).not.toMatch(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
        }
      }
    }
  });

  it("the 'unsure' line never says nothing was announced — it points to the official website", () => {
    expect(passedEstimateLine("ADMIT_CARD", "en", "unsure")).toBe("The expected admit card date has passed — check the official website");
    expect(passedEstimateLine("RESULT", "hi", "unsure")).toBe("रिज़ल्ट की अनुमानित तारीख निकल चुकी है — आधिकारिक वेबसाइट देखें");
    expect(passedEstimateLine("NOTIFICATION", "te", "unsure")).toBe("నోటిఫికేషన్ అంచనా తేదీ దాటిపోయింది — అధికారిక వెబ్‌సైట్ చూడండి");
    expect(passedEstimateLine(null, "mr", "unsure")).toBe("The expected date has passed — check the official website");
    for (const lc of ["en", "hi", "te"]) {
      const s = passedEstimateLine("NOTIFICATION", lc, "unsure");
      expect(s).not.toMatch(/No official date yet|अभी कोई आधिकारिक तारीख नहीं|ఇంకా అధికారిక తేదీ లేదు/);
    }
  });
});

describe("hub title — never built from an expected row, passed or ahead", () => {
  const exam = { code: "AP_APPSC_GROUP1", shortName: "APPSC Group 1", name: "APPSC Group I Services" };

  it("an all-estimate tracker (AP Group 1) leads with 'Not Announced Yet'", () => {
    const tl = buildTimeline(
      [
        row("n", "Notification release", "2026-08-15", "NOTIFICATION", "expected"),
        row("p", "Prelims exam (expected)", "2026-09-14", "EXAM", "expected"),
        row("m", "Mains exam (expected)", "2027-01-20", "EXAM", "expected"),
      ],
      NOW,
    );
    expect(hubDateLead(tl, exam)).toEqual({ kind: "none" });
  });

  it("a passed expected exam day is not 'held', even inside the held window", () => {
    const tl = buildTimeline([row("p", "Prelims exam", "2026-09-20", "EXAM", "expected")], NOW);
    expect(tl[0].passedEstimate).toBe(true);
    expect(hubDateLead(tl, exam).kind).toBe("none");
  });

  it("with an announced day ahead, the title leads with that day, never the passed estimate", () => {
    const tl = buildTimeline(
      [
        row("est", "Prelims exam (expected)", "2026-09-14", "EXAM", "expected"),
        row("off", "Prelims exam", "2026-11-02", "EXAM", "official"),
      ],
      NOW,
    );
    const lead = hubDateLead(tl, exam);
    expect(lead.kind).toBe("announced");
    expect(lead.kind === "announced" && lead.row.id).toBe("off");
  });
});
