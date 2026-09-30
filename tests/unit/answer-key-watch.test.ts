// Official watch — the pure gate (30 Sep 2026), src/lib/answer-key-watch.ts.
//
// Pins the rule the whole pipeline rests on: NEVER a release without the
// official page. A row is written only when (1) the link, its listing and
// where it landed are official hosts, (2) our own fetch answered 200 (a PDF
// begins %PDF), (3) the text beside the link names the key / result, the
// exam and the cycle year — and no future release, (4) the link is new
// (baseline / earlier hits), (5) the date is the one printed beside it, else
// "first seen". Plus the due-set windows, the printed-date parser (Indic
// digits, Hindi / Telugu months), link extraction, and the per-run budget.
// No DB, no network.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import {
  AI_CHECK_COST_USD,
  AiBudget,
  RUN_AI_CAP_USD,
  RUN_AI_MAX_EXAMS,
  classifyLink,
  crawlAiOff,
  crawlNeedsProbe,
  crawlResearchStep,
  cycleYearsFor,
  examNamed,
  examTermsFor,
  extractLinks,
  latestHeldSitting,
  needsAi,
  normLink,
  officialHostsFor,
  orderDue,
  parsePrintedDates,
  pickReleaseDay,
  releaseGate,
  releaseLabel,
  releasedSince,
  scanListing,
  selectDue,
  type DueExamInput,
  type GateContext,
  type LinkFetch,
  type ReleaseCandidate,
  type TrackerRowLite,
} from "@/lib/answer-key-watch";
import { OFFICIAL_WATCH_SOURCE, SUPPRESSED_SOURCE } from "@/lib/exam-timeline";

const NOW = new Date("2026-09-30T06:00:00Z"); // 11:30 IST, 30 Sep
const PORTAL = "https://upsc.gov.in";
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const NDA = { shortName: "NDA", name: "National Defence Academy (II)" };

const pdf200: LinkFetch = { status: 200, contentType: "application/pdf", head: "%PDF-1.7", finalUrl: null };

// The due sitting: NDA-II 2026, held 14 Sep (NDA-I was held in April, so
// another sitting falls in the same year); the listing page has a baseline.
function ctx(over: Partial<GateContext> = {}): GateContext {
  return {
    portalUrl: PORTAL,
    examTerms: examTermsFor(NDA, ["NDA & NA Examination"]),
    cycleYears: ["2026"],
    notBefore: day("2026-09-14"),
    lastExamDay: day("2026-09-14"),
    sittingLabels: ["NDA 2 2026 exam"],
    ordinalNames: ["NDA"],
    otherSittingThisYear: true,
    known: new Set<string>(),
    baselined: true,
    singleExamHeading: null,
    now: NOW,
    ...over,
  };
}

function cand(over: Partial<ReleaseCandidate> = {}): ReleaseCandidate {
  return {
    kind: "ANSWER_KEY",
    url: "https://upsc.gov.in/sites/default/files/AnsKey-NDA-NA-II-2026-Engl.pdf",
    listingUrl: "https://upsc.gov.in/examinations/answer-keys",
    anchorText: "Answer Key (English)",
    rowText: "National Defence Academy and Naval Academy Examination (II), 2026 Answer Key 22/09/2026",
    via: "html",
    ...over,
  };
}

describe("releaseGate — the five conditions", () => {
  it("passes a new official PDF with the key, the exam and the year printed beside it; the printed date is the release day", () => {
    const v = releaseGate(cand(), ctx(), pdf200);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.release.releasedOn.toISOString().slice(0, 10)).toBe("2026-09-22");
    expect(v.release.dateSource).toBe("printed");
    expect(v.release.host).toBe("upsc.gov.in");
    expect(v.release.isPdf).toBe(true);
    expect(v.release.note).toBe("date printed beside the link on upsc.gov.in");
  });

  describe("gate 1 — official hosts only", () => {
    it("a coaching-site link is never a release", () => {
      const v = releaseGate(cand({ url: "https://www.adda247.com/jobs/nda-answer-key-2026.pdf" }), ctx(), pdf200);
      expect(v).toMatchObject({ ok: false, gate: 1 });
    });
    it("nor a link read on a coaching listing", () => {
      const v = releaseGate(cand({ listingUrl: "https://testbook.com/nda/answer-key" }), ctx(), pdf200);
      expect(v).toMatchObject({ ok: false, gate: 1 });
    });
    it("nor a denylisted lookalike host", () => {
      const v = releaseGate(cand({ url: "https://sarkariresult.com.cm/nda-answer-key-2026.pdf" }), ctx(), pdf200);
      expect(v).toMatchObject({ ok: false, gate: 1 });
    });
    it("nor an official link that redirects off the official host", () => {
      const v = releaseGate(cand(), ctx(), { ...pdf200, finalUrl: "https://www.careerpower.in/nda-key.pdf" });
      expect(v).toMatchObject({ ok: false, gate: 1 });
    });
    it("the exam's own commercial-TLD portal counts — only as that exam's portal", () => {
      const c = cand({ url: "https://www.comedk.org/answer-key-2026.pdf", listingUrl: "https://www.comedk.org/notices" });
      expect(releaseGate(c, ctx({ portalUrl: "https://www.comedk.org" }), pdf200).ok).toBe(true);
      expect(releaseGate(c, ctx(), pdf200)).toMatchObject({ ok: false, gate: 1 });
    });
  });

  describe("gate 2 — our own fetch in this run", () => {
    it("an AI-only URL we did not fetch is never written", () => {
      expect(releaseGate(cand({ via: "ai" }), ctx(), null)).toMatchObject({ ok: false, gate: 2, reason: "not fetched in this run" });
    });
    it("non-200 fails", () => {
      expect(releaseGate(cand(), ctx(), { ...pdf200, status: 404 })).toMatchObject({ ok: false, gate: 2, reason: "HTTP 404" });
      expect(releaseGate(cand(), ctx(), { ...pdf200, status: 302 })).toMatchObject({ ok: false, gate: 2 });
    });
    it("a .pdf that is an HTML error page now fails", () => {
      const v = releaseGate(cand(), ctx(), { status: 200, contentType: "text/html", head: "<!DOCTYPE html>", finalUrl: null });
      expect(v).toMatchObject({ ok: false, gate: 2 });
    });
    it("an HTML notice page needs only the 200", () => {
      const v = releaseGate(
        cand({ url: "https://upsc.gov.in/examinations/nda-ii-2026-answer-key" }),
        ctx(),
        { status: 200, contentType: "text/html", head: "<html>", finalUrl: null },
      );
      expect(v.ok).toBe(true);
      if (v.ok) expect(v.release.isPdf).toBe(false);
    });
  });

  describe("gate 3 — what the body printed beside the link", () => {
    it("no answer-key term → no release", () => {
      const v = releaseGate(cand({ anchorText: "Download", rowText: "NDA & NA Examination (II), 2026 Marks 22/09/2026" }), ctx(), pdf200);
      expect(v).toMatchObject({ ok: false, gate: 3 });
    });
    it("a notice of a FUTURE release is not a release", () => {
      const v = releaseGate(cand({ rowText: "NDA & NA Examination (II), 2026: Answer Key will be released after the final result" }), ctx(), pdf200);
      expect(v).toMatchObject({ ok: false, gate: 3, reason: "the text announces a future release, not a release" });
    });
    it("another exam's key on the same body page is not this exam's", () => {
      const v = releaseGate(cand({ rowText: "Combined Defence Services Examination (II), 2026 Answer Key 22/09/2026" }), ctx(), pdf200);
      expect(v).toMatchObject({ ok: false, gate: 3, reason: "the exam is not named beside the link" });
    });
    it("an older cycle's year is not this cycle", () => {
      const v = releaseGate(cand({ rowText: "National Defence Academy and Naval Academy Examination (II), 2025 Answer Key 22/09/2025" }), ctx(), pdf200);
      expect(v).toMatchObject({ ok: false, gate: 3 });
    });
    it("a single-exam page's heading may name the exam; the row still needs the term and the year", () => {
      const row = cand({ anchorText: "Provisional Answer Key", rowText: "Provisional Answer Key 2026 — 22.09.2026" });
      expect(releaseGate(row, ctx(), pdf200)).toMatchObject({ ok: false, gate: 3 });
      expect(releaseGate(row, ctx({ singleExamHeading: "NDA & NA Examination — UPSC" }), pdf200).ok).toBe(true);
    });
    it("Hindi and Telugu key / result words count", () => {
      expect(classifyLink("उत्तर कुंजी 2026").ak).toBe(true);
      expect(classifyLink("आंसर की जारी").ak).toBe(true);
      expect(classifyLink("ఆన్సర్ కీ 2026").ak).toBe(true);
      expect(classifyLink("परिणाम घोषित").result).toBe(true);
      expect(classifyLink("ఫలితాలు").result).toBe(true);
      expect(classifyLink("Final Result of CGL 2025").result).toBe(true);
      expect(classifyLink("Admit card").ak || classifyLink("Admit card").result).toBe(false);
    });
  });

  describe("gate 4 — never an old link", () => {
    it("a link already on the page when the crawl first read it (the baseline) is not new", () => {
      const known = new Set([normLink("https://www.upsc.gov.in/sites/default/files/AnsKey-NDA-NA-II-2026-Engl.pdf/")]);
      expect(releaseGate(cand(), ctx({ known }), pdf200)).toMatchObject({ ok: false, gate: 4 });
    });
  });

  describe("gate 5 — the date", () => {
    it("no date printed → the day we first saw it, with the exact note", () => {
      const v = releaseGate(cand({ rowText: "National Defence Academy and Naval Academy Examination (II), 2026 Answer Key" }), ctx(), pdf200);
      expect(v.ok).toBe(true);
      if (!v.ok) return;
      expect(v.release.dateSource).toBe("first-seen");
      expect(v.release.releasedOn.toISOString().slice(0, 10)).toBe("2026-09-30");
      expect(v.release.note).toBe("first seen on upsc.gov.in 2026-09-30; the body printed no date");
    });
    it("two dates in range (key 22 Sep, objections till 26 Sep) → never a guess: first seen", () => {
      const v = releaseGate(cand({ rowText: "NDA & NA Examination (II), 2026 Answer Key 22/09/2026, objections till 26/09/2026" }), ctx(), pdf200);
      expect(v.ok && v.release.dateSource).toBe("first-seen");
      if (v.ok) expect(v.release.note).toMatch(/^first seen on upsc\.gov\.in 2026-09-30; the body printed more than one date/);
    });
    it("a date before the sitting (the exam day's own date) is not the release day", () => {
      const v = releaseGate(cand({ rowText: "NDA & NA Examination (II), 2026 held on 13/09/2026 — Answer Key 22/09/2026" }), ctx(), pdf200);
      expect(v.ok && v.release.releasedOn.toISOString().slice(0, 10)).toBe("2026-09-22");
    });
    it("Devanagari digits are read", () => {
      const v = releaseGate(cand({ rowText: "एनडीए NDA 2026 उत्तर कुंजी २२/०९/२०२६" }), ctx(), pdf200);
      expect(v.ok && v.release.releasedOn.toISOString().slice(0, 10)).toBe("2026-09-22");
    });
    // Review, 30 Sep 2026 (blocker 2): an old printed date was written as
    // "first seen today; the body printed no date" — both false.
    it("only a date BEFORE the sitting printed beside the link → an older release, rejected", () => {
      const v = releaseGate(cand({ anchorText: "NDA 2026 answer key", rowText: "NDA 2026 answer key uploaded 20.04.2026", via: "ai" }), ctx(), pdf200);
      expect(v).toMatchObject({ ok: false, gate: 5 });
      if (!v.ok) expect(v.reason).toMatch(/2026-04-20\) is before the sitting — an older release/);
    });
    it("only a FUTURE date printed (objections till …) → first seen, and the note says no date falls in the window", () => {
      const v = releaseGate(cand({ rowText: "NDA & NA Examination (II), 2026 Answer Key — objections till 12/10/2026" }), ctx(), pdf200);
      expect(v.ok).toBe(true);
      if (!v.ok) return;
      expect(v.release.dateSource).toBe("first-seen");
      expect(v.release.note).toBe("first seen on upsc.gov.in 2026-09-30; no date printed beside the link falls between the exam and today (2026-10-12)");
      expect(v.release.note.startsWith("first seen on ")).toBe(true); // FIRST_SEEN_NOTE_PREFIX still reads it
    });
    it("the exam's own date (a 'Date of examination' column) is never the release day", () => {
      const v = releaseGate(cand({ rowText: "NDA & NA Examination (II), 2026 · 14/09/2026 · Answer Key" }), ctx(), pdf200);
      expect(v.ok && v.release.dateSource).toBe("first-seen");
      if (v.ok) expect(v.release.note).toMatch(/no date printed beside the link falls between the exam and today \(2026-09-14\)/);
      // a multi-day sitting: every day of it is an exam date
      const w = releaseGate(cand({ rowText: "NDA & NA Examination (II), 2026 · 16/09/2026 · Answer Key" }), ctx({ lastExamDay: day("2026-09-18") }), pdf200);
      expect(w.ok && w.release.dateSource).toBe("first-seen");
    });
    // Review, 30 Sep 2026 (should-fix 3): no baseline → a printed date is required.
    it("a page with no stored baseline: undated → rejected; printed in range → written", () => {
      const undated = releaseGate(cand({ rowText: "National Defence Academy and Naval Academy Examination (II), 2026 Answer Key", via: "ai" }), ctx({ baselined: false }), pdf200);
      expect(undated).toMatchObject({ ok: false, gate: 5, reason: "no baseline for this page: an undated link cannot be told from an older cycle's (printed date required)" });
      const dated = releaseGate(cand({ via: "ai" }), ctx({ baselined: false }), pdf200);
      expect(dated.ok && dated.release.dateSource).toBe("printed");
    });
  });

  // Review, 30 Sep 2026 (blocker 1): the gate checked only the exam name and
  // the year — NDA (I)'s key passed while NDA (II) was due.
  describe("gate 3b — the due sitting / stage, not another", () => {
    it("NDA (I) 2026's key is rejected while NDA (II) 2026 is due", () => {
      const v = releaseGate(
        cand({
          url: "https://upsc.gov.in/sites/default/files/AnsKey-NDA-I-2026.pdf",
          anchorText: "Answer Key: National Defence Academy and Naval Academy Examination (I), 2026",
          rowText: "Answer Key: National Defence Academy and Naval Academy Examination (I), 2026 03/10/2026",
        }),
        ctx({ now: new Date("2026-10-06T10:00:00Z") }),
        pdf200,
      );
      expect(v).toMatchObject({ ok: false, gate: 3 });
      if (!v.ok) expect(v.reason).toMatch(/another sitting\/stage \(sitting/);
    });
    it("…and NDA (II)'s own key passes", () => {
      expect(releaseGate(cand(), ctx(), pdf200).ok).toBe(true);
    });
    const CGL = { shortName: "SSC CGL", name: "SSC Combined Graduate Level Examination" };
    const cgl = (labels: string[]) =>
      ctx({ portalUrl: "https://ssc.gov.in", examTerms: examTermsFor(CGL), sittingLabels: labels, ordinalNames: ["SSC CGL"], otherSittingThisYear: true });
    const t1Key = cand({
      url: "https://ssc.gov.in/api/attachment/cgl-t1-final-key.pdf",
      listingUrl: "https://ssc.gov.in/home/notice-board",
      anchorText: "Final Answer Key of Combined Graduate Level Examination 2026 (Tier-I)",
      rowText: "",
    });
    it("a Tier-I key is rejected while Tier 2 is due, accepted while Tier 1 is due", () => {
      expect(releaseGate(t1Key, cgl(["Tier 2 exam"]), pdf200)).toMatchObject({ ok: false, gate: 3 });
      expect(releaseGate(t1Key, cgl(["Tier 1 exam begins", "Tier 1 exam concludes"]), pdf200).ok).toBe(true);
    });
    it("a row naming no sitting or stage is still accepted", () => {
      const plain = cand({ ...t1Key, anchorText: "Final Answer Key of Combined Graduate Level Examination 2026" });
      expect(releaseGate(plain, cgl(["Tier 2 exam"]), pdf200).ok).toBe(true);
    });
    it("a sitting number with no number on the due sitting's labels: refused only when the exam has another sitting this year", () => {
      const noNumber = ctx({ sittingLabels: ["NDA 2026 written exam"] });
      expect(releaseGate(cand(), noNumber, pdf200)).toMatchObject({ ok: false, gate: 3 });
      expect(releaseGate(cand(), { ...noNumber, otherSittingThisYear: false }, pdf200).ok).toBe(true);
    });
    it("prelims text while mains is due is rejected; APPSC's 'Preliminary Key' is a provisional key, not the prelims", () => {
      const mains = ctx({ sittingLabels: ["Mains exam"], otherSittingThisYear: false });
      expect(releaseGate(cand({ rowText: "NDA & NA Examination 2026 Prelims Answer Key 22/09/2026" }), mains, pdf200)).toMatchObject({ ok: false, gate: 3 });
      expect(releaseGate(cand({ rowText: "NDA & NA Examination 2026 Preliminary Key 22/09/2026" }), mains, pdf200).ok).toBe(true);
    });
  });
});

describe("parsePrintedDates / pickReleaseDay", () => {
  it("reads the formats bodies print", () => {
    expect(parsePrintedDates("uploaded on 12.09.2026")).toEqual(["2026-09-12"]);
    expect(parsePrintedDates("dated 2026-09-12")).toEqual(["2026-09-12"]);
    expect(parsePrintedDates("12th September, 2026")).toEqual(["2026-09-12"]);
    expect(parsePrintedDates("Sep 12, 2026")).toEqual(["2026-09-12"]);
    expect(parsePrintedDates("12 सितंबर 2026 को जारी")).toEqual(["2026-09-12"]);
    expect(parsePrintedDates("12 సెప్టెంబర్ 2026")).toEqual(["2026-09-12"]);
    expect(parsePrintedDates("१२-०९-२०२६")).toEqual(["2026-09-12"]);
  });
  it("rejects impossible dates and bare years", () => {
    expect(parsePrintedDates("31/02/2026")).toEqual([]);
    expect(parsePrintedDates("Answer Key 2026")).toEqual([]);
  });
  it("a printed date after today is not a release day", () => {
    expect(pickReleaseDay("key out 05/10/2026", day("2026-09-14"), NOW)).toMatchObject({ source: "first-seen", why: "outside" });
  });
  it("why: none / several / outside / before; the exam days are excluded only with lastExamDay", () => {
    const lo = day("2026-09-14");
    expect(pickReleaseDay("Answer key", lo, NOW)).toMatchObject({ why: "none" });
    expect(pickReleaseDay("key 20/09/2026, objections till 24/09/2026", lo, NOW)).toMatchObject({ why: "several" });
    expect(pickReleaseDay("uploaded 20.04.2026", lo, NOW)).toMatchObject({ why: "before" });
    expect(pickReleaseDay("exam 14/09/2026", lo, NOW, lo)).toMatchObject({ why: "outside" });
    expect(pickReleaseDay("exam 14/09/2026", lo, NOW)).toMatchObject({ source: "printed" }); // without lastExamDay, as before
    expect(pickReleaseDay("exam 14/09/2026 · key 22/09/2026", lo, NOW, lo)).toMatchObject({ source: "printed" });
  });
});

describe("links and names", () => {
  it("extractLinks resolves relative links, keeps the row text and the title, skips javascript:", () => {
    const html = `<table><tr><td>NDA &amp; NA (II), 2026</td><td><a href="/files/key.pdf" title="Answer Key">Download</a></td><td>22/09/2026</td></tr>
      <tr><td><a href="javascript:void(0)">x</a></td></tr></table><p><a href="#top">top</a></p>`;
    const links = extractLinks(html, "https://upsc.gov.in/examinations/answer-keys");
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://upsc.gov.in/files/key.pdf");
    expect(links[0].anchorText).toBe("Download Answer Key");
    expect(links[0].rowText).toContain("NDA & NA (II), 2026");
    expect(links[0].rowText).toContain("22/09/2026");
  });
  it("scanListing: every link is baseline; only new links naming the kind are candidates", () => {
    const links = extractLinks(
      `<ul><li><a href="/a.pdf">Answer Key NDA 2026</a></li><li><a href="/b.pdf">Result NDA 2026</a></li><li><a href="/c.pdf">Answer Key NDA 2025</a></li><li><a href="/d.pdf">Answer key will be released soon</a></li></ul>`,
      "https://upsc.gov.in/x",
    );
    const known = new Set([normLink("https://upsc.gov.in/c.pdf")]);
    const s = scanListing(links, "ANSWER_KEY", known);
    expect(s.baseline).toHaveLength(4);
    expect(s.kindLinks.map((l) => l.url)).toEqual(["https://upsc.gov.in/a.pdf"]);
  });
  it("examNamed: SSC's own wording names the exam, a sibling exam does not", () => {
    const terms = examTermsFor({ shortName: "SSC CGL", name: "SSC Combined Graduate Level Examination" });
    expect(examNamed("Combined Graduate Level Examination, 2025 (Tier-I): Tentative Answer Keys", terms)).toBe(true);
    expect(examNamed("Combined Higher Secondary (10+2) Level Examination, 2025", terms)).toBe(false);
    expect(examNamed("SSC CGL 2025 answer key", terms)).toBe(true);
  });
  it("generic words never name an exam", () => {
    expect(examTermsFor({ shortName: "Exam", name: "Examination (2026)" })).toEqual([]);
  });
  it("cycle years: the exam day's year and every year its label names", () => {
    expect(cycleYearsFor(day("2026-09-14"), "SSC CGL 2025 Tier 1")).toEqual(["2025", "2026"]);
    expect(cycleYearsFor(day("2026-12-06"), "CLAT 2027 exam")).toEqual(["2026", "2027"]);
  });
  it("official hosts for the AI: the portal plus the same body's other hosts, never a coaching site", () => {
    expect(officialHostsFor("https://ssc.gov.in/")).toEqual(["ssc.gov.in", "ssc.nic.in"]);
    expect(officialHostsFor("https://www.tnpsc.gov.in", ["testbook.com", "apply.tnpscexams.in"])).toEqual(["tnpsc.gov.in"]);
    expect(officialHostsFor(null)).toEqual([]);
  });
  it("release labels name the key / result so the tracker resolves the kind", () => {
    expect(releaseLabel("ANSWER_KEY", "Final Answer Key", "Tier 1 exam")).toBe("Answer key (final) — Tier 1 exam");
    expect(releaseLabel("ANSWER_KEY", "Tentative Answer Keys", "Prelims")).toBe("Answer key (provisional) — Prelims");
    expect(releaseLabel("RESULT", "Result", "Mains")).toBe("Result — Mains");
  });
  it("TSPSC / APPSC 'Preliminary Key' / 'Initial Key' is a (provisional) answer key", () => {
    expect(classifyLink("Group-II Services Preliminary Keys").ak).toBe(true);
    expect(classifyLink("Initial Key of Group-I Mains").ak).toBe(true);
    expect(releaseLabel("ANSWER_KEY", "Preliminary Key", "Group 2 exam")).toBe("Answer key (provisional) — Group 2 exam");
  });
});

// ── due set ──────────────────────────────────────────────────────────────

const U = "https://upsc.gov.in/notice.pdf";
let n = 0;
function row(over: Partial<TrackerRowLite> & { date: Date; label: string }): TrackerRowLite {
  return { id: `r${++n}`, isExamDay: false, kind: null, confidence: "official", url: U, source: "ai-generated:claude", notes: null, ...over };
}
const examRow = (iso: string, label = "NDA (II) 2026 exam", over: Omit<Partial<TrackerRowLite>, "date"> = {}) =>
  row({ label, kind: "EXAM", isExamDay: true, ...over, date: day(iso) });
function input(rows: TrackerRowLite[], over: Partial<DueExamInput> = {}): DueExamInput {
  return { examId: "e1", code: "NDA", shortName: "NDA", name: "National Defence Academy", portalUrl: PORTAL, rows, ...over };
}

describe("selectDue — the windows", () => {
  it("answer key: an announced exam held in the last 45 days with no official-watch key; hot 1–10 days after", () => {
    const warm = selectDue(input([examRow("2026-09-14")]), NOW);
    expect(warm).toHaveLength(1);
    expect(warm[0]).toMatchObject({ kind: "ANSWER_KEY", hot: false, stage: "NDA (II) 2026 exam", cycleYears: ["2026"] });
    expect(warm[0].notBefore.toISOString().slice(0, 10)).toBe("2026-09-14");
    const hot = selectDue(input([examRow("2026-09-25")]), NOW);
    expect(hot[0]).toMatchObject({ kind: "ANSWER_KEY", hot: true });
  });
  it("not due: exam today (0 days), more than 45 days ago, in the future, or only an estimate", () => {
    expect(selectDue(input([examRow("2026-08-10")]), NOW).filter((d) => d.kind === "ANSWER_KEY")).toEqual([]);
    expect(selectDue(input([examRow("2026-10-10")]), NOW)).toEqual([]);
    expect(selectDue(input([examRow("2026-09-20", "NDA exam (expected)", { confidence: "expected", url: null })]), NOW)).toEqual([]);
    const today = selectDue(input([examRow("2026-09-30")]), NOW);
    expect(today).toHaveLength(1);
    expect(today[0].hot).toBe(false); // due, but the evening AI waits for day 1
  });
  it("an official-watch key since the sitting closes the answer-key pair", () => {
    const rows = [examRow("2026-09-14"), row({ date: day("2026-09-22"), label: "Answer key — NDA", kind: "ANSWER_KEY", source: OFFICIAL_WATCH_SOURCE })];
    expect(selectDue(input(rows), NOW).filter((d) => d.kind === "ANSWER_KEY")).toEqual([]);
  });
  it("a multi-day window is one sitting: first day bounds the release, last day names the stage", () => {
    const rows = [examRow("2026-09-12", "CBT day 1"), examRow("2026-09-16", "CBT day 3"), examRow("2026-09-20", "CBT last day")];
    const d = selectDue(input(rows), NOW);
    expect(d).toHaveLength(1);
    expect(d[0].notBefore.toISOString().slice(0, 10)).toBe("2026-09-12");
    expect(d[0].stage).toBe("CBT last day");
    expect(d[0].hot).toBe(true); // last day 10 days ago
  });
  it("result: exam in the last 180 days and a result expected within ±7 days (tracker row or last cycle's lag); always hot", () => {
    const byRow = selectDue(input([examRow("2026-07-20"), row({ date: day("2026-10-04"), label: "Result (expected)", kind: "RESULT", confidence: "expected", url: null })]), NOW);
    expect(byRow.find((d) => d.kind === "RESULT")).toMatchObject({ hot: true });
    expect(byRow.find((d) => d.kind === "RESULT")!.expectedOn!.toISOString().slice(0, 10)).toBe("2026-10-04");
    const byLag = selectDue(input([examRow("2026-08-01")], { lagDays: { RESULT: 60 } }), NOW);
    expect(byLag.map((d) => d.kind)).toEqual(["RESULT"]);
    expect(byLag[0].expectedOn!.toISOString().slice(0, 10)).toBe("2026-09-30");
    expect(selectDue(input([examRow("2026-08-01")], { lagDays: { RESULT: 20 } }), NOW)).toEqual([]);
  });
  it("any answer-key / result row today-21..today+7 that is not official-watch is re-checked", () => {
    const reported = row({ date: day("2026-09-20"), label: "Answer key out", kind: "ANSWER_KEY", url: "https://www.careerpower.in/nda-key" });
    const d = selectDue(input([examRow("2026-06-01"), reported]), NOW);
    expect(d).toHaveLength(1);
    expect(d[0].kind).toBe("ANSWER_KEY");
    expect(d[0].reasons[0]).toMatch(/answer-key row dated 2026-09-20 is not official-watch/);
    const far = row({ date: day("2026-08-20"), label: "Answer key out", kind: "ANSWER_KEY" });
    expect(selectDue(input([far]), NOW)).toEqual([]);
  });
  it("a suppressed row never makes an exam due", () => {
    const s = row({ date: day("2026-09-20"), label: "Answer key", kind: "ANSWER_KEY", source: SUPPRESSED_SOURCE });
    expect(selectDue(input([s]), NOW)).toEqual([]);
  });
  it("orderDue puts hot pairs first", () => {
    const a = selectDue(input([examRow("2026-09-14")], { examId: "a", code: "A" }), NOW);
    const b = selectDue(input([examRow("2026-09-26")], { examId: "b", code: "B" }), NOW);
    expect(orderDue([...a, ...b], NOW).map((d) => d.code)).toEqual(["B", "A"]);
  });
  it("latestHeldSitting / releasedSince (the crawl's current cycle)", () => {
    const rows = [examRow("2026-05-01", "Prelims 2026"), examRow("2026-09-14", "Mains 2026")];
    expect(latestHeldSitting({ rows, portalUrl: PORTAL }, NOW, 180)).toMatchObject({ stage: "Mains 2026" });
    expect(latestHeldSitting({ rows: [examRow("2026-01-01")], portalUrl: PORTAL }, NOW, 180)).toBeNull();
    expect(releasedSince([row({ date: day("2026-09-20"), label: "Result", kind: "RESULT", source: OFFICIAL_WATCH_SOURCE })], "RESULT", day("2026-09-14"))).toBe(true);
    expect(releasedSince([row({ date: day("2026-09-20"), label: "Result", kind: "RESULT" })], "RESULT", day("2026-09-14"))).toBe(false);
  });
  // Review, 30 Sep 2026: the gate needs the due sitting's labels, its last
  // exam day and whether another sitting falls in the same year.
  it("the due item carries the sitting: every exam-day label, the last exam day, another sitting this year", () => {
    const rows = [examRow("2026-04-12", "NDA 1 2026 exam"), examRow("2026-09-12", "NDA 2 2026 exam (Paper 1)"), examRow("2026-09-13", "NDA 2 2026 exam (Paper 2)")];
    const d = selectDue(input(rows), NOW).find((x) => x.kind === "ANSWER_KEY")!;
    expect(d.sittingLabels).toEqual(["NDA 2 2026 exam (Paper 1)", "NDA 2 2026 exam (Paper 2)"]);
    expect(d.lastExamDay.toISOString().slice(0, 10)).toBe("2026-09-13");
    expect(d.otherSittingThisYear).toBe(true);
    const alone = selectDue(input([examRow("2026-09-14")]), NOW)[0];
    expect(alone.otherSittingThisYear).toBe(false);
    expect(latestHeldSitting({ rows, portalUrl: PORTAL }, NOW, 180)).toMatchObject({
      sittingLabels: ["NDA 2 2026 exam (Paper 1)", "NDA 2 2026 exam (Paper 2)"],
      otherSittingThisYear: true,
    });
  });
  it("a key row with no exam day before it: no labels, the assumed window's first day is also its last", () => {
    const d = selectDue(input([row({ date: day("2026-09-20"), label: "Answer key out", kind: "ANSWER_KEY", url: "https://www.careerpower.in/nda-key" })]), NOW)[0];
    expect(d.sittingLabels).toEqual([]);
    expect(d.lastExamDay.getTime()).toBe(d.notBefore.getTime());
  });
});

// Review, 30 Sep 2026 (should-fix 5): `--resume … --max-usd 0 --apply`
// stopped at the first unresearched exam and probed the key first.
describe("the crawl's research step", () => {
  it("--max-usd 0 is no new AI, like --no-ai", () => {
    expect(crawlAiOff(false, 0)).toBe(true);
    expect(crawlAiOff(true, 45)).toBe(true);
    expect(crawlAiOff(false, 45)).toBe(false);
    expect(crawlAiOff(false, null)).toBe(false);
  });
  it("with AI off: journal exams go on, the rest are skipped one by one — never a stop, never a charge, never a probe", () => {
    const b = new AiBudget(0, 0.22);
    expect(["X", "J", "Y", "K"].map((c) => crawlResearchStep(c === "J" || c === "K", true, b))).toEqual(["skip-no-ai", "journal", "skip-no-ai", "journal"]);
    expect(b.calls).toBe(0);
    expect(crawlNeedsProbe(true, b, true)).toBe(false);
  });
  it("with AI on: research while the cap allows, then skip (the journal exams after it still run)", () => {
    const b = new AiBudget(0.44, 0.22);
    expect(crawlNeedsProbe(false, b, true)).toBe(true);
    expect(["A", "B", "C", "J"].map((c) => crawlResearchStep(c === "J", false, b))).toEqual(["research", "research", "skip-cap", "journal"]);
    expect(crawlNeedsProbe(false, b, true)).toBe(false); // cap reached: no probe
    expect(crawlNeedsProbe(false, new AiBudget(1, 0.22), false)).toBe(false); // nothing to research in the chunk
  });
  it("the crawl script uses the helpers and never breaks the loop on a skip", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "scripts/crawl-official-answer-keys.ts"), "utf8");
    expect(src).toMatch(/const aiOff = crawlAiOff\(noAi, maxUsd\);/);
    expect(src).toMatch(/const step = crawlResearchStep\(!!research, aiOff, budget\);/);
    expect(src).toMatch(/crawlNeedsProbe\(aiOff, budget, /);
    expect(src).toMatch(/skipped\.push\(e\.code\);\s*continue;/);
    expect(src).toMatch(/baselined: false,/);
  });
});

describe("AI allowance and the per-run caps", () => {
  it("noon check never spends; the plan and the evening only on hot pairs HTML could not settle", () => {
    const unsettled = { readablePages: 0, ambiguous: false, found: 0 };
    expect(needsAi("check", { hot: true }, unsettled)).toBe(false);
    expect(needsAi("evening", { hot: false }, unsettled)).toBe(false);
    expect(needsAi("evening", { hot: true }, unsettled)).toBe(true);
    expect(needsAi("plan", { hot: false }, unsettled)).toBe(false);
    expect(needsAi("plan", { hot: true }, unsettled)).toBe(true);
    expect(needsAi("plan", { hot: true }, { readablePages: 1, ambiguous: false, found: 0 })).toBe(false); // page read, nothing new
    expect(needsAi("plan", { hot: true }, { readablePages: 1, ambiguous: true, found: 0 })).toBe(true);
    expect(needsAi("evening", { hot: true }, { readablePages: 0, ambiguous: false, found: 1 })).toBe(false);
  });
  it("caps from the plan: $3.00 Monday, $0 noon, $0.90 evening (≤ 6 exams), $0.15 a call", () => {
    expect(RUN_AI_CAP_USD).toEqual({ plan: 3.0, check: 0, evening: 0.9 });
    expect(RUN_AI_MAX_EXAMS.evening).toBe(6);
    expect(AI_CHECK_COST_USD).toBe(0.15);
  });
  it("AiBudget charges before the call and never passes the cap", () => {
    const b = new AiBudget(0.9, 0.15);
    let calls = 0;
    while (b.charge()) calls++;
    expect(calls).toBe(6);
    expect(b.spent).toBeCloseTo(0.9, 9);
    const c = new AiBudget(0.9, 0.15);
    c.charge();
    c.trueUp(0.4); // the call cost more than estimated
    expect(c.spent).toBeCloseTo(0.4, 9);
    let more = 0;
    while (c.charge()) more++;
    expect(more).toBe(3);
    expect(new AiBudget(0, 0.15).charge()).toBe(false);
    const capped = new AiBudget(3, 0.15, 2);
    expect([capped.charge(), capped.charge(), capped.charge()]).toEqual([true, true, false]);
  });
});
