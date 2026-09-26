// One visible FAQPage per page (26 Sep 2026, discoverability wave 2 G3).
//
// The exam hub emitted two FAQPage blocks — ExamFaq's (visible) and a
// schema-only one in page.tsx — and the PYQ year page emitted a FAQPage no
// reader could see. Now: the hub's questions (src/lib/hub-faq.ts) join
// ExamFaq's list and render in its accordion AND its one FAQPage; the PYQ
// page renders src/lib/pyq-faq.ts's items visibly and as its only FAQPage.
// Pure builders + source checks of the wiring (vitest here cannot import
// TSX). No DB, no network.
// Run: npx vitest run tests/unit/faq-visible.test.ts

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { faqPageJsonLd, hubFaqExtraItems, hubPyqOffer, mergeFaqItems, type FaqItem, type HubFaqInput } from "@/lib/hub-faq";
import { pyqFaqItems } from "@/lib/pyq-faq";
import { verifiedPattern } from "@/lib/pattern-verified";
import { findForbiddenPhrases } from "@/lib/truth-lint";
import { INDIAN_LANGUAGE_COUNT, OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { G3_EXAMS } from "../fixtures/g3-exams";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const count = (s: string, needle: string) => s.split(needle).length - 1;

const base: HubFaqInput = {
  code: "SSC_CGL",
  short: "SSC CGL",
  name: "SSC Combined Graduate Level (Tier 1)",
  pattern: verifiedPattern(G3_EXAMS.SSC_CGL),
  cutoffPage: true,
  cutoffOfficial: null,
  realPatternMock: true,
  buildMock: true,
  hasContent: true,
  hasPyqSets: true,
  hasOfficialPapers: false,
  syllabus: true,
  notes: true,
  tricks: true,
  otherLanguageCount: OTHER_INDIAN_LANGUAGE_COUNT,
  tutorLanguageCount: INDIAN_LANGUAGE_COUNT,
};
const caLike: HubFaqInput = {
  ...base,
  code: "CA_FOUNDATION",
  short: "CA Foundation",
  name: "CA Foundation (ICAI)",
  pattern: verifiedPattern(G3_EXAMS.CA_FOUNDATION),
  cutoffPage: false,
  realPatternMock: false,
  buildMock: false,
  hasContent: false,
  hasPyqSets: false,
  syllabus: false,
  notes: false,
  tricks: false,
};
// ExamFaq's own four, as the component builds them (shape only).
const own: FaqItem[] = [
  { q: "Is Shishya free for SSC CGL preparation?", a: "Yes." },
  { q: "How many SSC CGL practice questions are on Shishya?", a: "595." },
];

/** What the hub renders: ExamFaq's list = its own items + the hub's extras. */
function hubRendered(extra: FaqItem[]) {
  const visible = mergeFaqItems(own, extra);
  return { visible, ld: faqPageJsonLd(visible) as { "@type": string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] } };
}

describe("hub FAQ — every Question in the one FAQPage is in the visible list", () => {
  it("SSC CGL-like and CA Foundation-like hubs", () => {
    for (const input of [base, caLike]) {
      const extra = hubFaqExtraItems(input);
      const { visible, ld } = hubRendered(extra);
      const qs = visible.map((f) => f.q);
      for (const e of ld.mainEntity) expect(qs, input.code).toContain(e.name);
      for (const e of ld.mainEntity) expect(visible.find((f) => f.q === e.name)?.a).toBe(e.acceptedAnswer.text);
      for (const f of extra) expect(qs, `${input.code}: ${f.q}`).toContain(f.q);
      expect(ld["@type"]).toBe("FAQPage");
    }
  });

  it("a repeated question keeps its first answer and is listed once", () => {
    const merged = mergeFaqItems(own, [{ q: "is shishya free for ssc cgl preparation?", a: "other" }, { q: "New?", a: "Yes." }]);
    expect(merged.map((f) => f.q)).toEqual([own[0].q, own[1].q, "New?"]);
    expect(faqPageJsonLd([])).toBeNull();
  });

  it("pattern and negative-marking answers only with a verified pattern, citing the notice", () => {
    const ssc = hubFaqExtraItems(base);
    const pat = ssc.find((f) => f.q === "What is the exam pattern of SSC CGL?")!;
    expect(pat.a).toContain("100 questions for 200 marks in 60 minutes");
    expect(pat.a).toContain("SSC notice, 21 May 2026");
    expect(pat.a).toContain("https://ssc.gov.in/");
    expect(ssc.find((f) => f.q === "Is there negative marking in SSC CGL?")?.a).toBe(
      "Yes — 0.5 mark is deducted for every wrong answer in SSC CGL Tier-I (SSC notice, 21 May 2026).",
    );
    const ca = hubFaqExtraItems(caLike);
    expect(ca.some((f) => /pattern of|negative marking/i.test(f.q))).toBe(false);
    // NEET UG: stored 200 questions / 200 minutes, never read from a notice.
    const neet = hubFaqExtraItems({ ...base, short: "NEET UG", pattern: verifiedPattern(G3_EXAMS.NEET_UG) });
    expect(neet.some((f) => /pattern of|negative marking/i.test(f.q))).toBe(false);
    expect(neet.find((f) => /full-length/.test(f.q))?.a).not.toMatch(/\d+ questions/);
  });

  // 27 Sep 2026 (repair, adversarial review): the stored Exam.languages list
  // has no source (NEET UG stored 10 languages; NTA's bulletin lists 13).
  it("the languages answer only with a verified pattern, in the notice's own words and citation", () => {
    const ssc = hubFaqExtraItems(base).find((f) => f.q === "In which languages is SSC CGL conducted?")!;
    expect(ssc.a).toBe("SSC CGL Tier-I question paper: English and Hindi, except English Comprehension (SSC notice, 21 May 2026).");
    for (const input of [caLike, { ...base, short: "NEET UG", pattern: verifiedPattern(G3_EXAMS.NEET_UG) }]) {
      expect(hubFaqExtraItems(input).some((f) => /languages/i.test(f.q)), input.short).toBe(false);
    }
    const hub = fs.readFileSync(path.join(process.cwd(), "src/app/exams/[code]/page.tsx"), "utf8");
    expect(hub).not.toMatch(/languages: exam\.languages/);
  });

  it("'prepare for free' names only what the hub holds", () => {
    const ca = hubFaqExtraItems(caLike).find((f) => /prepare for/.test(f.q))!;
    expect(ca.a).toBe(`Shishya offers CA Foundation preparation 100% free: a free day-by-day coach plan and an AI tutor in ${INDIAN_LANGUAGE_COUNT} Indian languages.`);
    const ssc = hubFaqExtraItems(base).find((f) => /prepare for/.test(f.q))!;
    expect(ssc.a).toContain("adaptive mock tests");
    expect(ssc.a).toContain("PYQ-pattern papers");
    expect(ssc.a).toContain("the full syllabus with study notes (https://shishya.in/exams/SSC_CGL/syllabus)");
    expect(hubPyqOffer(false, true)).toBe("official previous year papers (linked from the conducting body)");
    expect(hubPyqOffer(false, false)).toBeNull();
  });

  it("the cutoff answer quotes the published figure when there is one, else says 'not official'", () => {
    const quoted = "SSC CGL cutoff 2025: UR 54.00000 (Cut-off Marks in Section-I) — Tier-II. Published by Staff Selection Commission on 1 Jan 2026 (official — ssc.gov.in).";
    const withOfficial = hubFaqExtraItems({ ...base, cutoffOfficial: quoted }).find((f) => /cutoff/.test(f.q))!;
    expect(withOfficial.q).toBe("What was the latest official SSC CGL cutoff?");
    expect(withOfficial.a.startsWith(quoted)).toBe(true);
    expect(withOfficial.a).toContain("https://shishya.in/exams/SSC_CGL/cutoff");
    const none = hubFaqExtraItems(base).find((f) => /cutoff/.test(f.q))!;
    expect(none.a).toContain("not official figures");
  });

  it("no trust phrase in any hub answer", () => {
    const all = [...hubFaqExtraItems(base), ...hubFaqExtraItems(caLike)].map((f) => `${f.q}\n${f.a}`).join("\n");
    expect(findForbiddenPhrases(all, "hub-faq")).toEqual([]);
  });

  it("wiring: the hub has no FAQPage of its own; ExamFaq renders one from the merged list", () => {
    const hub = read("src/app/exams/[code]/page.tsx");
    expect(hub).not.toContain('"FAQPage"');
    expect(hub).not.toContain("faqJsonLd");
    expect(hub).toMatch(/extraItems=\{hubFaqExtra\}/);
    const faq = read("src/components/ExamFaq.tsx");
    expect(count(faq, '"@type": "FAQPage"')).toBe(1);
    expect(faq).toContain("faqs.push(...mergeFaqItems(faqs, extraItems).slice(faqs.length));");
    // The accordion and the JSON-LD both map the same `faqs`.
    expect(faq).toMatch(/mainEntity: faqs\.map/);
    expect(faq).toMatch(/\{faqs\.map\(\(f, i\) =>/);
  });
});

describe("PYQ year FAQ — visible, and the page's only FAQPage", () => {
  const items = pyqFaqItems({
    short: "SSC CGL",
    year: 2024,
    pageUrl: "https://shishya.in/exams/SSC_CGL/pyq/2024",
    modelledEn: "23 PYQ-pattern questions modelled on the 2024 paper",
    partial: true,
    held: 23,
    officialPaperNote: "",
    fullMockNote: "",
  });

  it("four questions, every JSON-LD name visible, the set's depth stated without a paper length", () => {
    const ld = faqPageJsonLd(items) as { mainEntity: { name: string }[] };
    expect(ld.mainEntity.map((e) => e.name)).toEqual(items.map((f) => f.q));
    expect(items).toHaveLength(4);
    expect(items[0].a).toContain("this set holds 23 questions, not the whole paper");
    expect(items[1].a).toContain("not the original questions");
    expect(findForbiddenPhrases(items.map((f) => `${f.q}\n${f.a}`).join("\n"), "pyq-faq")).toEqual([]);
  });

  it("wiring: one FAQPage from the items, and the same items rendered", () => {
    const page = read("src/app/exams/[code]/pyq/[year]/page.tsx");
    expect(page).not.toContain('"FAQPage"');
    expect(page).toContain("const pyqFaq = faqPageJsonLd(faqItems);");
    expect(page).toMatch(/\{faqItems\.map\(\(f, i\) =>/);
    expect(count(page, "application/ld+json")).toBe(3);
  });
});
