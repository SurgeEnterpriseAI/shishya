// The exam hub's FAQ questions beyond ExamFaq's own four (26 Sep 2026,
// discoverability wave 2 G3).
//
// The hub emitted TWO FAQPage blocks: ExamFaq's (visible accordion) and a
// second, schema-only one built in page.tsx — pattern, negative marking,
// languages, cutoff, full-length mock, topic builder, "prepare for free".
// Google's FAQ policy wants every Question visible, and two FAQPage nodes on
// one URL is a structured-data error. The second block's questions now join
// ExamFaq's list (the `extraItems` prop), so one list renders both the
// accordion and the one FAQPage — they cannot disagree.
//
// On the way, every answer states only what is true of THIS exam:
//   • pattern and negative-marking answers (and their numbers) only for a
//     verifiedPattern exam (src/lib/pattern-verified.ts) — the stored tuple
//     has no source (critic veto, 26 Sep 2026);
//   • the languages answer only for a verifiedPattern exam, in the notice's
//     own words with its citation. 27 Sep 2026 (repair, adversarial
//     review): it printed the stored Exam.languages list, which has no
//     source — NEET UG, JEE Main and CUET UG showed 10 languages where
//     NTA's bulletins list 13, and OD TET / OD Police showed English only;
//   • the full-length mock answer names no question count or duration
//     unless the pattern is verified;
//   • "how can I prepare for free" names mock tests only with checked
//     questions, previous year papers only where they exist, study notes
//     only with notes;
//   • the cutoff answer quotes the published figure and its document when
//     one exists (src/lib/answer-lead.ts cutoffLead), else points at the
//     indicative bands as before.
// English only (the hub renders these for an English body; the /hi and /te
// twins keep ExamFaq's localised four). Pure
// (tests/unit/faq-visible.test.ts).

import { markText, patternCitation, type VerifiedPattern } from "@/lib/pattern-verified";

export interface FaqItem {
  q: string;
  a: string;
}

/** One FAQPage node from the items that are rendered visibly; null for none. */
export function faqPageJsonLd(items: readonly FaqItem[]): Record<string, unknown> | null {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** Lists joined in order; a question asked twice keeps its first answer. */
export function mergeFaqItems(...lists: readonly (readonly FaqItem[])[]): FaqItem[] {
  const seen = new Set<string>();
  const out: FaqItem[] = [];
  for (const list of lists) {
    for (const f of list) {
      const k = f.q.trim().toLowerCase();
      if (!f.q.trim() || !f.a.trim() || seen.has(k)) continue;
      seen.add(k);
      out.push(f);
    }
  }
  return out;
}

/** What the hub offers under "previous year papers", named for what exists:
 *  the body's own papers (linked) and/or PYQ-pattern sets. Null for neither. */
export function hubPyqOffer(hasPyqSets: boolean, hasOfficialPapers: boolean): string | null {
  if (hasOfficialPapers && hasPyqSets) {
    return "official previous year papers (linked from the conducting body) and PYQ-pattern practice papers modelled on each year's paper";
  }
  if (hasOfficialPapers) return "official previous year papers (linked from the conducting body)";
  if (hasPyqSets) return "previous year paper practice (PYQ-pattern papers modelled on each year's paper)";
  return null;
}

export interface HubFaqInput {
  code: string;
  short: string;
  name: string;
  pattern: VerifiedPattern | null;
  /** The /cutoff page renders (it has score bands). */
  cutoffPage: boolean;
  /** The published-figure sentences (cutoffLead) when official rows exist. */
  cutoffOfficial: string | null;
  /** A system full-length real-pattern mock exists. */
  realPatternMock: boolean;
  buildMock: boolean;
  /** Checked (validated) questions exist. */
  hasContent: boolean;
  hasPyqSets: boolean;
  hasOfficialPapers: boolean;
  syllabus: boolean;
  notes: boolean;
  tricks: boolean;
  /** Other Indian languages a question can be read in inside a test. */
  otherLanguageCount: number;
  /** Languages the AI tutor answers in. */
  tutorLanguageCount: number;
}

const SITE = "https://shishya.in";

function listText(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function hubFaqExtraItems(i: HubFaqInput): FaqItem[] {
  const out: FaqItem[] = [];
  const p = i.pattern;
  if (p) {
    out.push({
      q: `What is the exam pattern of ${i.short}?`,
      a: `${i.short} ${p.stage} has ${p.questions} questions for ${p.marks} marks in ${p.durationMin} minutes: ${p.sections
        .map((s) => `${s.name} ${s.questions} questions (${s.marks} marks)`)
        .join(", ")}. Source: ${patternCitation(p)} — ${p.source.url}`,
    });
    out.push({
      q: `Is there negative marking in ${i.short}?`,
      a:
        p.negativePerWrong > 0
          ? `Yes — ${markText(p.negativePerWrong)} mark is deducted for every wrong answer in ${i.short} ${p.stage} (${patternCitation(p)}).`
          : `No — ${i.short} ${p.stage} has no negative marking (${patternCitation(p)}).`,
    });
  }
  if (p) {
    out.push({ q: `In which languages is ${i.short} conducted?`, a: `${i.short} ${p.stage} question paper: ${p.languages} (${patternCitation(p)}).` });
  }
  if (i.cutoffPage) {
    out.push(
      i.cutoffOfficial
        ? {
            q: `What was the latest official ${i.short} cutoff?`,
            a: `${i.cutoffOfficial} Every published table, with its document link, and indicative score-to-rank bands: ${SITE}/exams/${i.code}/cutoff`,
          }
        : {
            q: `What is the expected cutoff for ${i.short}?`,
            a: `Cutoffs change every cycle with paper difficulty and vacancies. Shishya maintains indicative score-to-rank bands and category-wise (General/EWS/OBC/SC/ST) expected cutoffs — not official figures — at ${SITE}/exams/${i.code}/cutoff.`,
          },
    );
  }
  if (i.realPatternMock) {
    out.push({
      q: `Is there a full-length ${i.short} mock test in the real exam pattern?`,
      a: p
        ? `Yes — Shishya has a free full-length ${i.name} mock in the ${p.stage} pattern: ${p.questions} questions in ${p.durationMin} minutes, sections in the paper's order, scored with solutions. It is the "Full-Length Mock (Real Pattern)" tile on this page.`
        : `Yes — Shishya has a free full-length ${i.name} mock built to the exam's pattern, with sections in the paper's order, scored with solutions. It is the "Full-Length Mock (Real Pattern)" tile on this page.`,
    });
  }
  if (i.buildMock) {
    out.push({
      q: `Can I build a topic-wise ${i.short} mock test?`,
      a: `Yes — pick any topics from the ${i.short} syllabus, choose 10, 25 or 50 questions and the difficulty, and attempt it as a timed mock with solutions and weak-topic analysis, free, at ${SITE}/exams/${i.code}/build-mock. Questions can be read in Hindi and ${i.otherLanguageCount} other Indian languages inside the test.`,
    });
  }
  const pyq = hubPyqOffer(i.hasPyqSets, i.hasOfficialPapers);
  const offers = [
    i.hasContent ? "adaptive mock tests" : null,
    pyq,
    i.syllabus ? `${i.notes ? "the full syllabus with study notes" : "the full syllabus"} (${SITE}/exams/${i.code}/syllabus)` : null,
    i.tricks ? `subject-wise memory tricks (${SITE}/exams/${i.code}/tricks)` : null,
    "a free day-by-day coach plan",
    `an AI tutor in ${i.tutorLanguageCount} Indian languages`,
  ].filter((x): x is string => !!x);
  out.push({
    q: `How can I prepare for ${i.short} for free?`,
    a: `Shishya offers ${i.short} preparation 100% free: ${listText(offers)}.`,
  });
  return out;
}
