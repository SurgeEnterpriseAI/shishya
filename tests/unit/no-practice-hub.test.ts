// A hub for an exam with NO practice questions (27 Sep 2026): what it shows,
// what it never says. The panel (src/lib/no-practice-copy.ts noPracticePanel,
// rendered by src/components/NoPracticeExamPanel.tsx — transpiled here with
// TypeScript and rendered with react-dom/server, next/link stubbed) for a real
// new exam (CLAT, data/national-exams-2026.json) and a live one with no
// official research (NEET PG); the FAQ's no-practice answer; the copy in all
// three locales; and source checks that the hub and its sub-pages gate every
// practice promise on the one rule (src/lib/exam-practice-state.ts). No DB.
// 27 Sep 2026 (fixer): no surface says practice questions "are being
// written" (nothing writes them), and "official facts … read on the
// conducting body's own pages" / "with their sources" only for an exam with
// official research on file (NEET PG's conducting body is an AI-drafted row).
// Run: npx vitest run tests/unit/no-practice-hub.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import {
  NO_PRACTICE_COPY,
  dropPracticeSentence,
  fillNoPractice,
  noPracticeCopy,
  noPracticePanel,
  type NoPracticePanelInput,
  type NoPracticePanelModel,
} from "@/lib/no-practice-copy";
import { officialExamFacts, officialPattern } from "@/lib/official-exam-facts";
import { EXAM_HUB_COPY, fillHub } from "@/lib/exam-hub-copy";
import { hubFaqExtraItems } from "@/lib/hub-faq";
import { newsPermalinkCopy, syllabusPageCopy } from "@/lib/page-gates-copy";
import { findForbiddenPhrases } from "@/lib/truth-lint";
import { INDIAN_LANGUAGE_COUNT, OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** Words a hub with no practice must never say (any locale). */
const PRACTICE_PROMISE = /mock|\bPYQ\b|previous year|quiz|start (a |your )?(free )?(diagnostic|mock|preparation)|coach plan|day-by-day|leaderboard|your rank|मॉक|మాక్|क्विज़/i;

// ── The panel for CLAT as the hub builds it ─────────────────────────────
const clatFacts = officialExamFacts("CLAT")!;
const clatRow = { totalQuestions: 120, totalMarks: 120, durationMin: 120, marksPerQ: 1, negativeMark: 0.25 };
const clatInput: NoPracticePanelInput = {
  locale: "en",
  examCode: "CLAT",
  examShort: "CLAT",
  officialName: "Consortium of National Law Universities",
  officialUrl: "https://consortiumofnlus.ac.in/",
  facts: clatFacts,
  officialPattern: officialPattern("CLAT", clatRow),
  verifiedPattern: null,
  eligibility: { minAge: null, maxAge: null, ageRelaxation: null, educationNote: "10+2 with 45% marks (40% for SC/ST)." },
  dates: [
    { label: "CLAT 2027 exam", dayText: "6 Dec 2026", tierWord: "official", url: "https://consortiumofnlus.ac.in/clat-2027/" },
    { label: "Admit card", dayText: "20 Nov 2026", tierWord: "reported", url: null },
  ],
  related: [
    { code: "MH_MAHCET_LAW", shortName: "MAH CET Law" },
    { code: "AP_LAWCET", shortName: "AP LAWCET" },
  ],
  tutorLanguageCount: INDIAN_LANGUAGE_COUNT,
};

// ── NoPracticeExamPanel, rendered ───────────────────────────────────────
function loadPanel(): (props: { model: NoPracticePanelModel }) => React.ReactElement {
  const out = ts.transpileModule(read("src/components/NoPracticeExamPanel.tsx"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const Link = ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => React.createElement("a", { href, ...rest }, children);
  const stubs: Record<string, unknown> = { react: React, "react/jsx-runtime": jsxRuntime, "next/link": { __esModule: true, default: Link } };
  const mod = { exports: {} as Record<string, unknown> };
  const req = (id: string) => {
    if (!(id in stubs)) throw new Error(`NoPracticeExamPanel imports an unexpected module: ${id}`);
    return stubs[id];
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports.NoPracticeExamPanel as (props: { model: NoPracticePanelModel }) => React.ReactElement;
}
const Panel = loadPanel();
const html = (m: NoPracticePanelModel) => renderToStaticMarkup(React.createElement(Panel, { model: m }));
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("the no-practice panel — CLAT (official research on file)", () => {
  const model = noPracticePanel(clatInput);
  const out = html(model);
  const body = text(out);

  it("official facts with their sources: body, pattern, syllabus, eligibility", () => {
    expect(model.title).toBe("CLAT — official facts");
    expect(model.note).toBe(
      "Facts are read on the conducting body's own pages. Dates are announced ones only, each with its tier: official (the body's own notice) or reported (a secondary source).",
    );
    expect(model.facts.map((f) => f.label)).toEqual(["Conducting body", "Exam pattern", "Official syllabus", "Eligibility"]);
    expect(body).toContain("Consortium of National Law Universities");
    expect(out).toContain('href="https://consortiumofnlus.ac.in/"');
    expect(body).toContain("UG paper: 120 questions, 120 marks, 120 minutes, −0.25 per wrong answer.");
    expect(out).toContain(`href="${clatFacts.pattern.url}"`);
    expect(out).toContain(`href="${clatFacts.syllabusUrl}"`);
    expect(body).toContain("Open the official syllabus");
    expect(body).toContain("10+2 with 45% marks (40% for SC/ST).");
    expect(body).toMatch(/read 27 Sept? 2026/);
    // External sources open in a new tab, never passing rank.
    for (const m of out.matchAll(/<a href="https:[^"]*"([^>]*)>/g)) expect(m[1]).toContain('rel="nofollow noopener noreferrer"');
  });

  it("dates carry their tier word; only an official row links its notice", () => {
    expect(body).toContain("CLAT 2027 exam — 6 Dec 2026 (official)");
    expect(body).toContain("Admit card — 20 Nov 2026 (reported)");
    expect(out).toContain('href="https://consortiumofnlus.ac.in/clat-2027/"');
    expect(out).toContain('href="/exams/CLAT/updates"');
    expect(model.noDates).toBeNull();
  });

  it("one plain line, the AI tutor (nofollow chat), related exams with practice", () => {
    // 27 Sep 2026 (fixer): a present fact — it said "are being written".
    expect(body).toContain("There are no CLAT practice questions on Shishya yet.");
    expect(body).not.toMatch(/being written/i);
    expect(body).toContain(`Ask the AI tutor about CLAT — the pattern, the syllabus, eligibility — in English and ${INDIAN_LANGUAGE_COUNT} Indian languages, free.`);
    expect(out).toMatch(/<a href="\/chat\?examCode=CLAT" rel="nofollow"/);
    expect(body).toContain("Exams with practice questions on Shishya");
    expect(out).toContain('href="/exams/MH_MAHCET_LAW"');
    expect(out).toContain('href="/exams/AP_LAWCET"');
  });

  it("no practice promise, no trust phrase", () => {
    expect(body).not.toMatch(PRACTICE_PROMISE);
    expect(findForbiddenPhrases(body, "no-practice-panel")).toEqual([]);
  });
});

describe("the no-practice panel — NEET PG (live, no official research, no verified pattern)", () => {
  const model = noPracticePanel({
    ...clatInput,
    examCode: "NEET_PG",
    examShort: "NEET PG",
    officialName: null,
    officialUrl: "https://natboard.edu.in",
    facts: null,
    officialPattern: null,
    eligibility: null,
    dates: [],
    related: [],
  });
  const body = text(html(model));

  it("prints only what is sourced: the body's site; no pattern numbers, no syllabus or eligibility claim", () => {
    expect(model.facts.map((f) => f.label)).toEqual(["Conducting body"]);
    expect(body).toContain("natboard.edu.in");
    expect(body).not.toMatch(/\d+ questions|\d+ marks|\d+ minutes/);
    expect(body).toContain("No date for the next cycle is announced yet.");
    expect(model.relatedTitle).toBeNull();
    expect(body).not.toContain("Exams with practice questions");
    expect(body).not.toMatch(PRACTICE_PROMISE);
  });

  it("27 Sep 2026 (fixer): no official research → 'key facts', and no claim the facts were read on the body's pages", () => {
    expect(model.title).toBe("NEET PG — key facts");
    expect(model.note).toBe(
      "The conducting body's site is linked. Dates are announced ones only, each with its tier: official (the body's own notice) or reported (a secondary source).",
    );
    expect(body).not.toMatch(/official facts|read on the conducting body/i);
    // No body site on file → the note promises only the dates.
    const bare = noPracticePanel({ ...clatInput, examCode: "NEET_PG", examShort: "NEET PG", officialName: "NBEMS", officialUrl: null, facts: null, officialPattern: null, eligibility: null });
    expect(bare.note).toBe(NO_PRACTICE_COPY.en.datesNote);
    for (const lc of ["hi", "te"] as const) {
      const m = noPracticePanel({ ...clatInput, locale: lc, examCode: "NEET_PG", examShort: "NEET PG", facts: null, officialPattern: null, eligibility: null });
      expect(m.title, lc).toBe(fillNoPractice(NO_PRACTICE_COPY[lc].keyFactsTitle, { exam: "NEET PG" }));
      expect(m.note, lc).toBe(`${NO_PRACTICE_COPY[lc].siteNote} ${NO_PRACTICE_COPY[lc].datesNote}`);
      expect(m.note, lc).not.toContain(NO_PRACTICE_COPY[lc].factsNote);
    }
  });

  it("an AI-indicative eligibility row never reaches the panel (the hub passes only official-research rows)", () => {
    const hub = code("src/app/exams/[code]/page.tsx");
    expect(hub).toContain('eligibility: elig && (elig.generatedBy ?? "").startsWith("official-research:") ? elig : null,');
    expect(hub).toContain("officialPattern: officialPattern(exam.code, exam),");
    // Announced rows only — an estimate is not an official fact.
    expect(hub).toContain(".filter((r) => r.daysFromToday >= 0 && r.tier !== \"expected\")");
  });
});

describe("the copy — three locales, same placeholders, no practice promise", () => {
  it("every key in hi and te, placeholders intact", () => {
    const keys = Object.keys(NO_PRACTICE_COPY.en).sort();
    for (const lc of ["hi", "te"] as const) {
      expect(Object.keys(NO_PRACTICE_COPY[lc]).sort(), lc).toEqual(keys);
      for (const k of keys) {
        const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        expect(ph(NO_PRACTICE_COPY[lc][k as keyof typeof NO_PRACTICE_COPY.en]), `${lc}.${k}`).toEqual(ph(NO_PRACTICE_COPY.en[k as keyof typeof NO_PRACTICE_COPY.en]));
      }
    }
    expect(noPracticeCopy("ta")).toBe(NO_PRACTICE_COPY.en);
  });

  it("no string promises a mock, a PYQ, a quiz or a coach plan", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      const all = Object.values(NO_PRACTICE_COPY[lc]).join("\n");
      expect(all, lc).not.toMatch(PRACTICE_PROMISE);
      expect(findForbiddenPhrases(all, `no-practice-copy:${lc}`), lc).toEqual([]);
    }
    expect(fillNoPractice(NO_PRACTICE_COPY.en.trackerIntro, { exam: "CLAT" })).not.toMatch(/practice/i);
  });

  it("27 Sep 2026 (fixer): no locale says practice questions are being written — nothing writes them", () => {
    const WRITING = /being written|लिखे जा रहे|రాస్తున్నాం/;
    for (const lc of ["en", "hi", "te"] as const) {
      expect(Object.values(NO_PRACTICE_COPY[lc]).join("\n"), lc).not.toMatch(WRITING);
      expect(EXAM_HUB_COPY[lc].faqFreeNoPracticeA, lc).not.toMatch(WRITING);
      expect(EXAM_HUB_COPY[lc].faqFreeNoPracticePlainA, lc).not.toMatch(WRITING);
    }
    expect(NO_PRACTICE_COPY.hi.line).toBe("Shishya पर अभी {exam} के प्रैक्टिस सवाल नहीं हैं।");
    expect(NO_PRACTICE_COPY.te.line).toBe("Shishyaలో ఇంకా {exam} ప్రాక్టీస్ ప్రశ్నలు లేవు.");
    for (const f of ["src/app/exams/[code]/page.tsx", "src/app/exams/[code]/context.md/route.ts", "src/app/llms-full.txt/route.ts", "src/components/NoPracticeExamPanel.tsx"]) {
      expect(code(f), f).not.toMatch(/being written/);
    }
  });

  it("dropPracticeSentence removes the closing mock sentence of the cutoff description, in each locale", () => {
    const en = "CLAT (Common Law Admission Test) expected cutoff 2027: score-to-rank bands, curated from historic patterns. Take a free mock to see exactly where you stand.";
    expect(dropPracticeSentence(en)).toBe("CLAT (Common Law Admission Test) expected cutoff 2027: score-to-rank bands, curated from historic patterns.");
    expect(dropPracticeSentence("X अपेक्षित कटऑफ — पिछले कटऑफ पैटर्न से तैयार। मुफ़्त मॉक दें और देखें कि आप कहाँ खड़े हैं।")).toBe("X अपेक्षित कटऑफ — पिछले कटऑफ पैटर्न से तैयार।");
    expect(dropPracticeSentence("X అంచనా కటాఫ్ — రూపొందించినది. ఉచిత మాక్ రాసి మీరు ఎక్కడ ఉన్నారో చూడండి.")).toBe("X అంచనా కటాఫ్ — రూపొందించినది.");
    const plain = "CLAT cutoff 2025 as the body published it.";
    expect(dropPracticeSentence(plain)).toBe(plain);
  });
});

describe("the FAQ on a hub with no practice", () => {
  it("the free answer names no mock test or PYQ paper, in every locale", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      for (const key of ["faqFreeNoPracticeA", "faqFreeNoPracticePlainA"] as const) {
        const a = fillHub(EXAM_HUB_COPY[lc][key], { short: "CLAT" });
        expect(a, `${lc}.${key}`).toContain("CLAT");
        expect(a, `${lc}.${key}`).not.toMatch(/PYQ|पैटर्न पेपर|ప్యాటర్న్ పేపర్/);
        expect(findForbiddenPhrases(a, `${key}:${lc}`), lc).toEqual([]);
      }
    }
    // 27 Sep 2026 (fixer): "the exam dates tracker" (it lists reported and
    // expected dates too), no "they are being written", and "with their
    // sources" only with official research on file.
    expect(fillHub(EXAM_HUB_COPY.en.faqFreeNoPracticeA, { short: "CLAT" })).toBe(
      "Yes. Everything Shishya has for CLAT is free — no subscription and no credit card: the exam dates tracker, the official facts on this page with their sources, and the AI tutor. There are no CLAT practice questions or mock tests on Shishya yet.",
    );
    expect(fillHub(EXAM_HUB_COPY.en.faqFreeNoPracticePlainA, { short: "NEET PG" })).toBe(
      "Yes. Everything Shishya has for NEET PG is free — no subscription and no credit card: the exam dates tracker, the facts on this page and the AI tutor. There are no NEET PG practice questions or mock tests on Shishya yet.",
    );
    for (const lc of ["en", "hi", "te"] as const) {
      expect(EXAM_HUB_COPY[lc].faqFreeNoPracticePlainA, lc).not.toMatch(/sources|स्रोत|మూలా|official|आधिकारिक|అధికారిక/i);
    }
    const faq = code("src/components/ExamFaq.tsx");
    expect(faq).toContain("fillHub(hasPractice ? C.faqFreeA : hasOfficialFacts ? C.faqFreeNoPracticeA : C.faqFreeNoPracticePlainA, { short: examShortName })");
    expect(faq).toContain("hasOfficialFacts = false,");
    expect(code("src/app/exams/[code]/page.tsx")).toContain("hasOfficialFacts={officialExamFacts(exam.code) != null}");
  });

  it("'prepare for free' offers no coach plan and no mock without checked questions", () => {
    const a = hubFaqExtraItems({
      code: "CLAT",
      short: "CLAT",
      name: "Common Law Admission Test",
      pattern: null,
      cutoffPage: false,
      cutoffOfficial: null,
      realPatternMock: false,
      buildMock: false,
      hasContent: false,
      hasPyqSets: false,
      hasOfficialPapers: false,
      syllabus: false,
      notes: false,
      tricks: false,
      otherLanguageCount: OTHER_INDIAN_LANGUAGE_COUNT,
      tutorLanguageCount: INDIAN_LANGUAGE_COUNT,
    });
    expect(a.map((f) => f.a).join("\n")).not.toMatch(PRACTICE_PROMISE);
  });
});

describe("the hub page gates every practice promise on the rule (source)", () => {
  const hub = code("src/app/exams/[code]/page.tsx");

  it("no practice → the panel instead of the action panel; no Mock Tests, empty PYQ, Rank or Syllabus section", () => {
    expect(hub).toMatch(/\{noPractice \? \(\s*<NoPracticeExamPanel model=\{noPractice\} \/>\s*\) : \(/);
    expect(hub).toMatch(/\{practice\.hasPractice && \(\s*<section id="mocks"/);
    expect(hub).toMatch(/\{\(practice\.hasPractice \|\| hubOfficialRows\.length > 0\) && \(\s*<section id="pyqs"/);
    expect(hub).toMatch(/\{\(practice\.hasPractice \|\| myBest\) && \(\s*<section id="rank"/);
    expect(hub).toMatch(/\{exam\.subjects\.length > 0 && \(\s*<section id="syllabus"/);
    // The old empty state ("ask me what I need … so it can be built") and the
    // "We're seeding questions" line are gone from the no-practice path.
    expect(hub).not.toContain("ew.empty.title");
    expect(hub).not.toContain("emptySeed");
  });

  it("no practice → no coach door, no Mistake Notebook, no raw pattern chips, no tour, no Course node", () => {
    expect(hub).toContain("{!hasCoachPlan && practice.hasPractice && <CoachEntry examCode={exam.code} examShort={exam.shortName} />}");
    expect(hub).toMatch(/\{practice\.hasPractice && \(\s*<Link\s+href="\/revision"/);
    expect(hub).toMatch(/\{practice\.hasPractice && \(\s*<>\s*<span className="rounded-full bg-white border border-ink-200 px-3 py-1">\{exam\.totalQuestions\}/);
    // 27 Sep 2026 (founder rule 1: no overlay before content): the hub tour is gone for everyone.
    expect(hub).not.toContain("<PageTour");
    expect(hub).toMatch(/\{practice\.hasPractice && \(\s*<script\s+type="application\/ld\+json"\s+dangerouslySetInnerHTML=\{\{ __html: JSON\.stringify\(courseJsonLd\) \}\}/);
    expect(hub).toContain("hasPractice={practice.hasPractice}");
    expect(hub).toContain("durationMin={pattern && practice.hasPractice ? pattern.durationMin : null}");
  });

  it("metadata: mock / PYQ keywords and the coach plan only with practice", () => {
    expect(hub).toMatch(/\.\.\.\(metaPractice\.hasPractice\s*\? \[\s*`\$\{exam\.shortName\} mock test`/);
    expect(hub).toContain("...(offers.hasPyq ? [`${exam.shortName} previous year papers`, `${exam.shortName} PYQ`] : []),");
    expect(hub).toContain("const descriptionOffer = metaPractice.hasPractice");
    // 27 Sep 2026 (fixer): it said "Practice questions are being written — none yet."
    expect(hub).toContain("`No practice questions yet. ${stateCopy}No paywall.`");
    // 27 Sep 2026 (integrate): "exam dates" only with a date row (BITSAT passes
    // activation with none), and one held item reads without a dangling "and".
    expect(hub).toContain("timeline.length > 0 ? \"exam dates with their source tier\" : null,");
    expect(hub).toContain("on Shishya: ${noPracticeHoldsText}. ` +");
    expect(hub).toMatch(/noPracticeHolds\.length > 1\s*\?[^:]+:\s*noPracticeHolds\[0\];/);
  });
});

describe("the sub-pages gate their practice boxes on the rule (source)", () => {
  it("/updates: intro without 'Practice is one tap away', the box, the Event description", () => {
    const p = code("src/app/exams/[code]/updates/page.tsx");
    expect(p).toContain("const introLine = practice.hasPractice ? fill(t(\"tracker.intro\"), { exam: short }) : fillNoPractice(NP.trackerIntro, { exam: short });");
    expect(p).toMatch(/\{practice\.hasPractice \? \(\s*<div className="mt-8 rounded-xl border-2 border-saffron-300/);
    expect(p).toContain('practice.hasPractice ? "Free mock tests, syllabus, cutoffs and a date tracker on Shishya." : "Official dates and a date tracker on Shishya."');
  });

  it("/cutoff: the 10-question nudge, the coach door and the mock box", () => {
    const p = code("src/app/exams/[code]/cutoff/page.tsx");
    expect(p).toMatch(/\{practice\.hasPractice && \(\s*<AnonExamNudge/);
    expect(p).toMatch(/\) : practice\.hasPractice \? \(\s*<CoachEntry examCode=\{exam\.code\} examShort=\{short\} variant="cutoff" \/>\s*\) : null\}/);
    expect(p).toMatch(/\{practice\.hasPractice \? \(\s*<div className="mt-8 rounded-xl border-2 border-saffron-300/);
    expect(p).toContain("metaPractice.hasPractice ? baseDescription : dropPracticeSentence(baseDescription)");
  });

  it("/syllabus: the diagnostic box, the coach door and the description's 'practice questions'", () => {
    const p = code("src/app/exams/[code]/syllabus/page.tsx");
    expect(p).toContain('{practice.hasPractice && <CoachEntry examCode={exam.code} examShort={exam.shortName} variant="syllabus" />}');
    expect(p).toMatch(/\{!practice\.hasPractice \? \(/);
    const c = syllabusPageCopy({ examShort: "CLAT", examName: "Common Law Admission Test", year: 2027, subjects: 5, topicCount: 30, linkedTopics: 0, weightageShown: false, buildMock: false, practice: false });
    expect(`${c.description}\n${c.shareMessage}\n${c.intro}`).not.toMatch(/practice|mock/i);
    expect(c.description).toBe("Complete CLAT (Common Law Admission Test) syllabus 2027: every subject and topic. No coaching fees, in your language.");
    expect(syllabusPageCopy({ examShort: "X", examName: "Y", year: null, subjects: 1, topicCount: 2, linkedTopics: 1, weightageShown: false, buildMock: false, practice: false }).shareMessage).toBe(
      "Complete X syllabus — topics with free study notes (Shishya):",
    );
  });

  it("news permalinks, the share card, context.md and llms-full.txt", () => {
    for (const notes of [true, false, null]) expect(newsPermalinkCopy("CLAT", notes, false).descriptionTail).not.toMatch(/mock|PYQ/i);
    expect(newsPermalinkCopy("SSC CGL", true).descriptionTail).toBe("Free SSC CGL mock tests, PYQs & study notes on Shishya.");
    // 27 Sep 2026 (fixer): "exam facts" / "Exam dates" — most no-practice hubs
    // have no official research on file, and some dates are reported or expected.
    expect(code("src/app/exams/[code]/news/[id]/page.tsx")).toContain("practice.hasPractice ? `Free ${row.exam.shortName} mock tests →` : `${row.exam.shortName} — exam facts and dates →`");
    expect(code("src/app/exams/[code]/opengraph-image.tsx")).toContain('practice ? "Free mocks · syllabus · PYQ pattern · AI tutor" : "Exam dates · key facts · AI tutor"');
    const ctx = code("src/app/exams/[code]/context.md/route.ts");
    expect(ctx).toContain("if (practice.hasPractice) L.push(`- Free day-by-day study plan (personal coach): ${SITE}/coach`);");
    expect(ctx).toContain("none on Shishya yet. Do not tell a student Shishya has ${exam.shortName} mocks.");
    expect(ctx).toContain('const researched = officialExamFacts(exam.code) != null;');
    expect(ctx).toContain('${researched ? "official facts with their sources" : "the conducting body\'s site"}');
    const llms = code("src/app/llms-full.txt/route.ts");
    expect(llms).toContain("no practice questions or mock tests on Shishya yet");
    expect(llms).toContain('${officialExamFacts(e.code) ? "official facts with their sources" : "the conducting body\'s site"}');
  });
});
