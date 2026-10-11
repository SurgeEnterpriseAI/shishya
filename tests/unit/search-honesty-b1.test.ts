// Honesty of claims (6 Oct 2026, search plan doNow 1-4, build B1).
// No DB, no network. Run: npx vitest run tests/unit/search-honesty-b1.test.ts
//
// What it pins:
//   1. the unbacked "checked against the official notification" claim (and its
//      "grounded in official notifications" twin, en / hi / te) cannot return
//      to any shipped string, and the editorial policy says what is true;
//   2. the Hindi topic notes carry the AI-translation disclosure and the same
//      Article author entity as the English notes;
//   3. news permalinks show the stored source link, label AI bodies "AI
//      summary", and say "from official notifications" only beside an
//      official-site link;
//   4. the tracker (/updates) title year is the hub's cycle year — one
//      function, checked on GATE CSE, GATE CE, CLAT and two state exams with
//      the live rows of 6 Oct 2026 (tests/fixtures/title-year-exams-2026-10-06.ts).

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FORBIDDEN_PHRASES, findForbiddenPhrases } from "@/lib/truth-lint";
import { EXAM_HUB_COPY } from "@/lib/exam-hub-copy";
import { HINDI_NOTE_AUTHOR, HINDI_NOTE_DISCLOSURE, NOTE_AUTHOR } from "@/lib/note-disclosure";
import {
  GOVERNMENT_NEWS_HOSTS,
  NEWS_AI_LABEL,
  NOT_LISTED_LINE,
  isAiNewsSource,
  isOfficialNoticeSource,
  newsProvenance,
  resultProvenance,
} from "@/lib/news-provenance";
import { methodBlocks } from "@/lib/press-kit";
import type { PublicNumbers } from "@/lib/public-numbers";
import { LAYOUT_PENDING_LINE, isPendingLayoutLine } from "../fixtures/pending-patches";
import { buildTimeline, cycleYear } from "@/lib/exam-timeline";
import {
  cycleYearOf,
  examYearName,
  examYearTemplate,
  hubDateLead,
  hubTitleDecision,
  hubTitlePrefix,
  hubTitleYear,
} from "@/lib/hub-title";
import { updatesLead } from "@/lib/answer-lead";
import { dict } from "@/lib/i18n";
import { TY_EXAMS, TY_NOW } from "../fixtures/title-year-exams-2026-10-06";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Comments out, line count kept (as the truth-lint source scan does). */
function stripComments(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
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

const UNBACKED = [
  "checked against the official notification",
  "grounded in official notifications",
  "अधिसूचना से मिलाकर जाँची",
  "నోటిఫికేషన్‌తో సరిచూసినది",
  // Review r1 (6 Oct 2026): the same claim in other words — /press, the hub
  // tutor card and the hub eligibility block.
  "grounded in the conducting bodies",
  "grounded in verified content",
  "verified against the official notification",
];

// ── 1. The unbacked claim ────────────────────────────────────────────────

describe("the unbacked 'checked against the official notification' claim", () => {
  it("is on the forbidden-phrase list in all three languages", () => {
    for (const p of UNBACKED) expect(FORBIDDEN_PHRASES).toContain(p);
    expect(findForbiddenPhrases("Free mocks — AI-drafted, checked against the official notification.", "u")).toHaveLength(1);
  });

  it("source scan: no shipped string in src/ or public/llms.txt carries it", () => {
    // src/app/layout.tsx belongs to build B3 this week; its one line ships in
    // scratchpad patches/layout.tsx.patch. Until that patch lands, this exact
    // HEAD line is the only allowance (tests/fixtures/pending-patches.ts) —
    // any other hit, anywhere, fails.
    const PENDING_PATCH = (rel: string, line: string) => isPendingLayoutLine(rel, line);
    const hits: string[] = [];
    for (const file of sourceFiles(path.join(ROOT, "src"))) {
      const rel = path.relative(ROOT, file);
      if (rel === path.join("src", "lib", "truth-lint.ts")) continue; // the phrase list itself
      const text = stripComments(fs.readFileSync(file, "utf8"));
      for (const f of findForbiddenPhrases(text, rel, { phrases: UNBACKED, allow: (_p, line) => PENDING_PATCH(rel, line) })) {
        hits.push(`${f.url}:${f.line} ${f.detail}`);
      }
    }
    const llms = path.join(ROOT, "public", "llms.txt");
    if (fs.existsSync(llms)) {
      for (const f of findForbiddenPhrases(fs.readFileSync(llms, "utf8"), "public/llms.txt", { phrases: UNBACKED })) hits.push(`${f.url} ${f.detail}`);
    }
    expect(hits).toEqual([]);
  }, 30_000);

  it("the layout.tsx allowance is that one HEAD line, live only until patches/layout.tsx.patch lands", () => {
    // Review r1: a stale allowance fails — the release commit that applies the
    // patch must also set LAYOUT_PENDING_LINE to null (b1-layout-release.py).
    if (LAYOUT_PENDING_LINE === null) return;
    expect(LAYOUT_PENDING_LINE).toContain("grounded in official notifications");
    expect(isPendingLayoutLine("src/app/layout.tsx", LAYOUT_PENDING_LINE)).toBe(true);
    expect(isPendingLayoutLine("src/app/layout.tsx", `${LAYOUT_PENDING_LINE} `)).toBe(false);
    expect(isPendingLayoutLine("src/app/page.tsx", LAYOUT_PENDING_LINE)).toBe(false);
    const lines = read("src/app/layout.tsx").split(/\r?\n/);
    expect(
      lines.filter((l) => l === LAYOUT_PENDING_LINE),
      "patches/layout.tsx.patch has landed: set LAYOUT_PENDING_LINE to null in tests/fixtures/pending-patches.ts",
    ).toHaveLength(1);
  });

  it("/press says what is backed — no 'grounded in' claim in the 'AI, said plainly' block", () => {
    // The method copy is fixed text: loaders that all failed leave it whole.
    const empty: PublicNumbers = {
      today: "2026-10-06",
      cohorts: null,
      actives: null,
      weekly: null,
      signupSources: null,
      newPeople: null,
      answerCheck: null,
      reports: null,
      counters: null,
      coverage: null,
    };
    const ai = methodBlocks(empty, { upcomingDays: 90 }).find((b) => b.id === "ai-plainly");
    const text = (ai?.body ?? []).join(" ");
    expect(text).not.toMatch(/grounded in/i);
    expect(text).toContain("Study notes are drafted by AI from Shishya's syllabus outline for each exam, not from an official document");
    expect(text).toContain("no person reviews a note unless its page says so");
    expect(text).toContain("Hindi notes are AI translations of the English note");
    expect(text).toContain("Practice questions are written by AI and go through the automated answer check described above, apart from the few validated before it existed.");
    expect(text).toContain("hold questions written in each year's pattern, not the original paper, and link the original where Shishya has found it");
    expect(text).toContain("Dates marked Official link the conducting body's own site, and students can report any question.");
    expect(findForbiddenPhrases(text, "/press")).toEqual([]);
  });

  it("the hub tutor card (and the unrendered twins) no longer claim 'grounded in verified content'", () => {
    expect(dict.en["exam.shishya.body"]).toBe("Ask Shishya, the AI tutor — it knows this exam's syllabus and your weak topics.");
    expect(dict.en["values.tutor.body"]).toBe("Stuck on a concept? Ask Shishya. The AI tutor knows your syllabus and your weak areas.");
    expect(stripComments(read("src/components/OnboardingTour.tsx"))).not.toMatch(/grounded in verified|sources you can check/i);
  });

  it("the hub's eligibility, cutoff, paper and salary blocks claim no verification nobody recorded", () => {
    const block = stripComments(read("src/components/ExamDeepContentBlock.tsx"));
    expect(block).not.toMatch(/Verified against the official notification/i);
    expect(block).not.toMatch(/last reconciled/);
    expect(block).not.toMatch(/·\s*verified\s*\{/);
    expect(block).toContain("Shishya&apos;s summary, as of {eligibility.verifiedAt} — confirm the details on the");
    expect(block.match(/· as of \{(t|analysis|b)\.verifiedAt\}\./g)).toHaveLength(3);
  });

  it("the hub sign-in box says only what is backed, en / hi / te", () => {
    expect(EXAM_HUB_COPY.en.coachBodyB).toContain("Content is written with AI; dates marked Official link the conducting body's own site.");
    for (const lc of ["en", "hi", "te"] as const) {
      expect(EXAM_HUB_COPY[lc].coachBodyB).toContain("AI");
      expect(findForbiddenPhrases(EXAM_HUB_COPY[lc].coachBodyB, lc)).toEqual([]);
    }
    expect(EXAM_HUB_COPY.hi.coachBodyB).toContain("आधिकारिक");
    expect(EXAM_HUB_COPY.te.coachBodyB).toContain("అధికారిక");
  });

  it("the hub description, Course JSON-LD fallback and /exams/browse carry the replacement", () => {
    const hub = stripComments(read("src/app/exams/[code]/page.tsx"));
    expect(hub).toContain("— AI-written; dates marked official link the conducting body. ");
    expect(hub).toContain("Content is written with AI; dates marked official link the conducting body.");
    expect(stripComments(read("src/app/exams/browse/page.tsx"))).toContain("— written with AI; dates marked official link the conducting body.");
  });

  it("/editorial-policy says how notes, questions, PYQ pages and news are made", () => {
    const page = stripComments(read("src/app/editorial-policy/page.tsx"));
    // The old over-claim is gone from the description and the body.
    expect(page).not.toMatch(/grounded in official notifications/i);
    expect(page).not.toMatch(/grounded in the material that matters/i);
    expect(page).not.toMatch(/source-grounded/i);
    // What is true, as the code and the 6 Oct read back it.
    expect(page).toContain("drafted by AI from Shishya&apos;s syllabus");
    expect(page).toContain("No\n            official document is read");
    expect(page).toContain("not reviewed by a\n            person</b> unless the page says so");
    expect(page).toContain("Hindi notes are AI translations of\n            the English note");
    expect(page).toContain("checked by an automated AI answer check");
    expect(page).toContain("The check is automated, not a person, and it can\n            be wrong.");
    expect(page).toContain("not the original paper&apos;s questions");
    expect(page).toContain("the page links it");
    expect(page).toContain("<b>Exam news</b> items are AI summaries");
    expect(page).toMatch(/study notes drafted with AI from a syllabus outline and not reviewed by a person/);
    expect(page).toMatch(/previous-year pages that hold pattern questions, not the original paper/);
  });

  it("the hub's pattern badge cites a read notice or says 'Not yet verified' — never a blanket official source", () => {
    const hub = stripComments(read("src/app/exams/[code]/page.tsx"));
    expect(hub).not.toContain('source="official exam authority notification"');
    expect(hub).not.toContain('refreshCadence="weekly"');
    expect(hub).toContain('<SectionVerificationSummary status="ai" source={patternCitation(pattern)} />');
    expect(hub).toContain('<SectionVerificationSummary status="none" />');
    const verification = stripComments(read("src/app/verification/page.tsx"));
    expect(verification).not.toMatch(/naming the official\s+notification instead/);
  });

  it("no code comment calls AI_VALIDATED 'reviewed by SME' or PYQ 'legally sourced' (admin page; schema via patch)", () => {
    const admin = read("src/app/admin/sme-stats/page.tsx");
    expect(admin).not.toContain("= SME reviewed and approved");
    // Review r1: a dated fact, since an admin can validate one by hand.
    expect(admin).toContain("On 6 Oct 2026 none had been validated by a person.");
    expect(stripComments(read("src/app/admin/questions/page.tsx"))).not.toContain("SME-validated");
    expect(read("scripts/build-mocks.ts")).not.toContain("Only SME-validated questions.");
  });
});

// ── 2. Hindi notes disclosure ────────────────────────────────────────────

describe("Hindi topic notes: AI disclosure and author", () => {
  const hiPage = read("src/app/exams/[code]/topics/[topicCode]/hi/page.tsx");
  const enPage = read("src/app/exams/[code]/topics/[topicCode]/page.tsx");

  it("the disclosure says AI translation and no person's review, in Hindi and English", () => {
    expect(HINDI_NOTE_DISCLOSURE.hi).toContain("AI अनुवाद");
    expect(HINDI_NOTE_DISCLOSURE.hi).toContain("किसी व्यक्ति ने जाँचा: अभी नहीं");
    expect(HINDI_NOTE_DISCLOSURE.en).toContain("AI-translated from the English note");
    expect(HINDI_NOTE_DISCLOSURE.en).toContain("Reviewed by a person: not yet");
    // The English note's own words for the source, unchanged.
    expect(enPage).toContain("Drafted with AI from Shishya&apos;s syllabus outline for this exam · Reviewed by a person:");
    expect(HINDI_NOTE_DISCLOSURE.en).toContain("drafted with AI from Shishya's syllabus outline");
  });

  it("the Hindi page renders the line with the English page's provenance marker", () => {
    const code = stripComments(hiPage);
    expect(code).toContain("{HINDI_NOTE_DISCLOSURE.hi}");
    expect(code).toContain("{HINDI_NOTE_DISCLOSURE.en}");
    expect(code).toMatch(/<p className="mt-4 text-xs text-ink-500" data-notes-provenance>/);
    expect(enPage).toContain("data-notes-provenance");
    // The footer no longer says only "prepared by Shishya".
    expect(code).toContain("यह हिंदी अनुवाद Shishya ने AI से तैयार किया है।");
  });

  it("Article JSON-LD author = the English notes' Organization entity, no person", () => {
    expect(HINDI_NOTE_AUTHOR).toBe(NOTE_AUTHOR);
    expect(JSON.stringify(NOTE_AUTHOR)).toBe('{"@type":"Organization","name":"Shishya","url":"https://shishya.in"}');
    expect(stripComments(hiPage)).toContain("author: HINDI_NOTE_AUTHOR,");
    expect(stripComments(enPage)).toContain("author: NOTE_AUTHOR,");
    expect(stripComments(hiPage)).toContain('translationOfWork: { "@type": "Article", url: enUrl, inLanguage: "en-IN" }');
    expect(`${hiPage}${enPage}`).not.toMatch(/"@type":\s*"Person"/);
  });
});

// ── 3. News permalinks ───────────────────────────────────────────────────

describe("news permalinks: source link, AI label, official wording only with a source", () => {
  const AI = "ai-generated:claude";

  it("an AI row with an official-site URL: label, link, the official wording", () => {
    const p = newsProvenance({ source: AI, url: "https://ssc.gov.in/api/attachment/notice.pdf" });
    expect(p.aiSummary).toBe(true);
    expect(p.link).toBe("https://ssc.gov.in/api/attachment/notice.pdf");
    expect(p.host).toBe("ssc.gov.in");
    expect(p.kind).toBe("official");
    expect(p.line).toBe("Compiled by Shishya from official notifications — always verify dates on the official exam portal.");
  });

  it("the exam's own portal on a commercial TLD counts as official", () => {
    const p = newsProvenance({ source: AI, url: "https://www.ibps.in/crp-po-xvi/" }, "https://www.ibps.in/");
    expect(p.kind).toBe("official");
    expect(p.host).toBe("ibps.in");
  });

  it("an AI row with a coaching or news URL: link shown, never 'official notifications'", () => {
    const p = newsProvenance({ source: AI, url: "https://testbook.com/ssc-cgl/notification" });
    expect(p.link).toBe("https://testbook.com/ssc-cgl/notification");
    expect(p.kind).toBe("secondary");
    expect(p.line).not.toMatch(/official notifications/);
    // Review r1: neutral — only what Shishya's own lists say.
    expect(p.line).toBe(`${NOT_LISTED_LINE} — always verify dates on the official exam portal.`);
    expect(p.line).toContain("Shishya does not list this site as the conducting body's own site");
    expect(p.line).not.toMatch(/\bis not the conducting body/);
  });

  it("NATA's own portal (nata.in) is not on Shishya's lists: the line says only that, never that it is not NATA's site", () => {
    // 6 Oct 2026: NATA's stored portal is coa.gov.in; 4 news rows link nata.in.
    const p = newsProvenance({ source: AI, url: "https://www.nata.in/" }, "https://coa.gov.in");
    expect(p.kind).toBe("secondary");
    expect(p.host).toBe("nata.in");
    expect(p.line).toContain("Shishya does not list this site");
    expect(p.line).not.toMatch(/\bis not the conducting body/);
    expect(p.line).not.toMatch(/official notifications/);
  });

  it("a government news site (newsonair.gov.in) never gets the 'official notifications' wording", () => {
    // 6 Oct 2026: 11 news rows linked All India Radio news.
    expect(GOVERNMENT_NEWS_HOSTS).toContain("newsonair.gov.in");
    const p = newsProvenance({ source: AI, url: "https://newsonair.gov.in/ssc-cgl-2026-tier-1/" });
    expect(p.link).toBe("https://newsonair.gov.in/ssc-cgl-2026-tier-1/");
    expect(p.kind).toBe("secondary");
    expect(p.line).not.toMatch(/official notifications/);
    expect(isOfficialNoticeSource("https://www.pib.gov.in/PressReleasePage.aspx?PRID=1")).toBe(false);
    expect(isOfficialNoticeSource("https://ddnews.gov.in/x")).toBe(false);
    // A conducting body on gov.in still is one.
    expect(isOfficialNoticeSource("https://ssc.gov.in/notice.pdf")).toBe(true);
    expect(newsProvenance({ source: AI, url: "https://upsc.gov.in/whats-new" }).kind).toBe("official");
  });

  it("an AI row with no URL says plainly that no source link is stored", () => {
    const p = newsProvenance({ source: AI, url: null });
    expect(p.aiSummary).toBe(true);
    expect(p.link).toBeNull();
    expect(p.kind).toBe("none");
    expect(p.line).toBe("No source link is stored for this item — always verify dates on the official exam portal.");
    expect(p.line).not.toMatch(/official notifications/);
  });

  it("a denylisted copycat URL is never linked", () => {
    const p = newsProvenance({ source: AI, url: "https://sarkariresult.com.cm/ssc-cgl/" });
    expect(p.link).toBeNull();
    expect(p.kind).toBe("denylisted");
    expect(p.line).not.toMatch(/official notifications/);
  });

  it("a curated row whose source is a URL keeps its link; it is not labelled AI", () => {
    const p = newsProvenance({ source: "https://upsc.gov.in/whats-new", url: null });
    expect(p.link).toBe("https://upsc.gov.in/whats-new");
    expect(p.aiSummary).toBe(false);
    expect(isAiNewsSource("ai-generated:claude")).toBe(true);
    expect(isAiNewsSource(null)).toBe(false);
  });

  it("the page renders the label, the link and the line — and no unconditional official claim", () => {
    const page = stripComments(read("src/app/exams/[code]/news/[id]/page.tsx"));
    expect(NEWS_AI_LABEL).toBe("AI summary");
    expect(page).toContain("{NEWS_AI_LABEL}");
    expect(page).toContain("href={provenance.link}");
    expect(page).toContain("{provenance.host}");
    expect(page).toContain("{provenance.line}");
    expect(page).toContain("newsProvenance({ source: row.source, url: row.url }");
    expect(page).toContain("isBasedOn: provenance.link");
    // The old JSX printed "from official notifications" for every AI row.
    expect(page).not.toMatch(/from\s+official notifications/);
  });

  it("result permalinks: one rule with the news — AI label always, official wording only beside an official link", () => {
    // Review r1. 6 Oct 2026 rows: OD_OJEE → ojee.nic.in (its own portal),
    // NATA → nata.in (portal stored as coa.gov.in), 52 with no URL.
    const ojee = resultProvenance("https://ojee.nic.in", "https://ojee.nic.in");
    expect(ojee.aiSummary).toBe(true);
    expect(ojee.kind).toBe("official");
    expect(ojee.link).toBe("https://ojee.nic.in");
    expect(ojee.line).toBe("Compiled by Shishya from official notifications — always verify dates and lists on the official portal");
    const nata = resultProvenance("https://nata.in", "https://coa.gov.in");
    expect(nata.kind).toBe("secondary");
    expect(nata.link).toBe("https://nata.in");
    expect(nata.line).not.toMatch(/official notifications/);
    expect(nata.line).toContain("Shishya does not list this site as the conducting body's own site");
    const none = resultProvenance(null, "https://ssc.gov.in");
    expect(none.kind).toBe("none");
    expect(none.link).toBeNull();
    expect(none.line).toContain("no official source link is stored for this result");
    const copycat = resultProvenance("https://sarkariresult.com.cm/x", null);
    expect(copycat.kind).toBe("denylisted");
    expect(copycat.link).toBeNull();
    expect(copycat.line).not.toMatch(/official notifications/);

    const page = stripComments(read("src/app/exams/[code]/results/[id]/page.tsx"));
    expect(page).toContain("resultProvenance(r.officialUrl, r.examPortal)");
    expect(page).toContain('LEFT JOIN "ExamEligibility" el ON el."examId" = e.id');
    expect(page).toContain("{NEWS_AI_LABEL}");
    expect(page).toContain("{provenance.line}");
    expect(page).toContain("isBasedOn: provenance.link");
    expect(page).toContain('provenance.kind === "official" ? "Official portal ↗" : `Source: ${sourceHostLabel(provenance.link)} ↗`');
    expect(page).not.toMatch(/href=\{r\.officialUrl\}/);
    expect(page).not.toMatch(/"Compiled by Shishya from official notifications/);
  });
});

// ── 4. Tracker title year = hub title year ───────────────────────────────

describe("tracker (/updates) title year agrees with the hub — one function", () => {
  const decide = (code: string) => {
    const e = TY_EXAMS[code];
    return hubTitleDecision(e.rows, e, e.officialUrl, TY_NOW);
  };

  // Review r1: the fixture's hubYear was computed by hubTitleDecision in the
  // 6 Oct probe, not read from live hub HTML — so this pins the decision on
  // those rows (a regression check), and the next test pins that the decision
  // is the hub's own HEAD composition, unchanged.
  it.each(["GATE_CSE", "GATE_CE", "CLAT", "HR_TET", "UP_UPTET", "JEE_MAIN"])(
    "%s: hubTitleDecision on the 6 Oct 2026 rows gives the recorded hub year",
    (code) => {
      expect(decide(code).year).toEqual(TY_EXAMS[code].hubYear);
    },
  );

  it.each(["GATE_CSE", "GATE_CE", "CLAT", "HR_TET", "UP_UPTET", "JEE_MAIN"])(
    "%s: hubTitleDecision is the hub's HEAD composition (buildTimeline → hubDateLead → hubTitleYear)",
    (code) => {
      const e = TY_EXAMS[code];
      const timeline = buildTimeline(e.rows, TY_NOW, e.officialUrl);
      const lead = hubDateLead(timeline, e, new Map(e.rows.map((r) => [r.id, r.createdAt] as const)));
      expect(decide(code).year).toEqual(hubTitleYear(lead, timeline, e, TY_NOW));
      expect(decide(code).lead).toEqual(lead);
    },
  );

  it.each([
    ["GATE_CSE", "GATE CSE 2027"],
    ["GATE_CE", "GATE CE 2027"],
    ["CLAT", "CLAT 2027"],
    ["HR_TET", "HTET 2027"], // a state exam (Haryana TET)
  ])("%s: tracker and hub both name %s", (code, name) => {
    const e = TY_EXAMS[code];
    const { year } = decide(code);
    const trackerYear = cycleYearOf(year); // what examTitleYear() hands /updates
    expect(examYearName(e.shortName, trackerYear)).toBe(name);
    const hubPrefix = hubTitlePrefix("en", e.shortName, year, "Exam Date Not Announced Yet, ");
    expect(hubPrefix.startsWith(`${name} — `)).toBe(true);
  });

  it("the old rule (cycleYear, calendar year of the next dated row) said 2026 for GATE CSE, GATE CE, CLAT and HTET", () => {
    for (const code of ["GATE_CSE", "GATE_CE", "CLAT", "HR_TET"]) {
      const e = TY_EXAMS[code];
      expect(cycleYear(buildTimeline(e.rows, TY_NOW, e.officialUrl), TY_NOW)).toBe(2026);
      expect(e.updatesOld).toBe(2026);
    }
  });

  it("a state exam whose hub prints no cycle year (UP TET, held 2026): the tracker prints none either", () => {
    const e = TY_EXAMS.UP_UPTET;
    const { year } = decide("UP_UPTET");
    expect(year.kind).toBe("held-year");
    expect(cycleYearOf(year)).toBeNull();
    expect(examYearName(e.shortName, null)).toBe("UPTET");
    expect(hubTitlePrefix("en", e.shortName, year, "")).toBe("UPTET — 2026 Exam Held; Next Exam Date Not Announced Yet, ");
  });

  it("with no year the tracker's h1 and FAQ templates collapse to the exam's name (en / hi / te)", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      const d = dict[lc] as Record<string, string>;
      for (const key of ["tracker.h1", "tracker.faq.q.examDate", "tracker.faq.q.notification"]) {
        const t = examYearTemplate(d[key], null);
        expect(t).not.toContain("{year}");
        expect(t).toContain("{exam}");
        expect(examYearTemplate(d[key], 2027)).toBe(d[key]);
      }
    }
    expect(examYearTemplate(dict.en["tracker.h1"], null)).toBe("{exam}: exam date, notification, admit card, result & cutoff");
  });

  it("the answer lead names the exam alone when there is no year", () => {
    expect(updatesLead({ short: "UPTET", year: null, nextExam: null, next: null, last: null })).toBe(
      "Shishya's tracker has no announced UPTET exam date yet.",
    );
    expect(updatesLead({ short: "CLAT", year: 2027, nextExam: null, next: null, last: null })).toBe(
      "Shishya's tracker has no announced CLAT 2027 exam date yet.",
    );
  });

  it("/updates reads examTitleYear (the hub's decision), never cycleYear()", () => {
    const page = stripComments(read("src/app/exams/[code]/updates/page.tsx"));
    expect(page).not.toMatch(/\bcycleYear\(/);
    expect(page.match(/await examTitleYear\(exam\.code\)/g)).toHaveLength(2);
    const lib = stripComments(read("src/lib/exam-title-year.ts"));
    expect(lib).toContain("hubTitleDecision(rows, shared.exam, shared.officialUrl, now)");
    const hub = stripComments(read("src/app/exams/[code]/page.tsx"));
    expect(hub.match(/hubTitleDecision\(/g)?.length).toBe(2);
    expect(hub).not.toMatch(/\bhubDateLead\(|\bhubTitleYear\(/);
  });
});
