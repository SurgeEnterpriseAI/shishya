// What an exam page says when the exam has no practice questions
// (27 Sep 2026) — the words for src/lib/exam-practice-state.ts's "no
// practice" branch, in the reader's language (en / hi / te, the hub twins'
// locales), and the pure model of the hub's official-facts panel
// (src/components/NoPracticeExamPanel.tsx renders it).
//
// Instead of mock / PYQ / "practice" promises the page gives:
//   • the official facts Shishya holds, each with its source — the conducting
//     body and its site, the pattern read from the body's notice
//     (src/lib/official-exam-facts.ts or src/lib/pattern-verified.ts, only
//     while the stored row agrees), the official syllabus link, the
//     eligibility read on the body's site (ExamEligibility rows written by
//     the official research, never the AI-indicative ones) and the ANNOUNCED
//     dates with their source tier (official / reported — an estimate is not
//     an official fact; the hub's Important Dates list and the tracker keep
//     those, labelled);
//   • ONE plain line: there are no practice questions for the exam on
//     Shishya yet (27 Sep 2026 fixer: it said they "are being written" —
//     nothing writes them: no scheduled job in vercel.json generates
//     questions, and bulk AI jobs are on hold; a present fact, no promise);
//   • the AI tutor line;
//   • links to related exams that DO have practice.
// Nothing here names a mock test, a PYQ, a quiz, a coach plan or a rank.
//
// 27 Sep 2026 (fixer): the title "{exam} — official facts" and the note
// "Facts are read on the conducting body's own pages" printed on every
// no-practice hub — but only the exams in data/national-exams-2026.json have
// official research (officialExamFacts non-null). On the twelve live hubs
// without it (AILET, NEET_PG, NIFT …) the one non-date fact is the
// conducting body's name and site from an AI-drafted ExamEligibility row.
// So the heading and the note follow provenance: with official research,
// "official facts" + "read on the body's own pages"; without it, "key facts"
// + "the conducting body's site is linked" (only when it is). The dates
// sentence is the same in both.
//
// Pure — no DB, no i18n dictionary (the exam-hub-copy.ts pattern; the twin
// localisation measure does not see these strings, as noted there).
// Tests: tests/unit/no-practice-hub.test.ts.

import type { OfficialExamFacts } from "@/lib/official-exam-facts";
import { officialPatternSentence } from "@/lib/official-exam-facts";
import { isoDayText, patternSentence, type VerifiedPattern } from "@/lib/pattern-verified";

export type NoPracticeLocale = "en" | "hi" | "te";

export function noPracticeLocale(locale: string | null | undefined): NoPracticeLocale {
  return locale === "hi" || locale === "te" ? locale : "en";
}

export interface NoPracticeCopy {
  /** Heading with official research on file (officialExamFacts non-null). */
  factsTitle: string;
  /** Heading without official research. */
  keyFactsTitle: string;
  /** With official research only: where the facts were read. */
  factsNote: string;
  /** Without official research, when the body's site is linked. */
  siteNote: string;
  /** Both cases: the dates are announced ones, each with its tier. */
  datesNote: string;
  conductedBy: string;
  pattern: string;
  /** "read 27 Sept 2026" beside a sourced fact. */
  readOn: string;
  syllabus: string;
  syllabusLink: string;
  eligibility: string;
  dates: string;
  noDates: string;
  tracker: string;
  /** The one plain line. */
  line: string;
  tutor: string;
  tutorCta: string;
  relatedTitle: string;
  /** The practice box on /updates and /cutoff, and the /syllabus footer.
   *  27 Sep 2026 (fixer): boxBody no longer says "the official facts …, each
   *  with its source" — it renders for every no-practice exam, most of them
   *  without official research on file. */
  boxTitle: string;
  boxBody: string;
  boxCta: string;
  /** /updates intro (tracker.intro without "Practice is one tap away"). */
  trackerIntro: string;
}

export const NO_PRACTICE_COPY: Readonly<Record<NoPracticeLocale, NoPracticeCopy>> = {
  en: {
    factsTitle: "{exam} — official facts",
    keyFactsTitle: "{exam} — key facts",
    factsNote: "Facts are read on the conducting body's own pages.",
    siteNote: "The conducting body's site is linked.",
    datesNote: "Dates are announced ones only, each with its tier: official (the body's own notice) or reported (a secondary source).",
    conductedBy: "Conducting body",
    pattern: "Exam pattern",
    readOn: "read {date}",
    syllabus: "Official syllabus",
    syllabusLink: "Open the official syllabus",
    eligibility: "Eligibility",
    dates: "Dates",
    noDates: "No date for the next cycle is announced yet.",
    tracker: "Every milestone, with email alerts →",
    line: "There are no {exam} practice questions on Shishya yet.",
    tutor: "Ask the AI tutor about {exam} — the pattern, the syllabus, eligibility — in English and {n} Indian languages, free.",
    tutorCta: "Ask the AI tutor →",
    relatedTitle: "Exams with practice questions on Shishya",
    boxTitle: "{exam} on Shishya",
    boxBody: "The {exam} page has the facts and dates Shishya holds, and the AI tutor answers {exam} questions free.",
    boxCta: "Open the {exam} page →",
    trackerIntro:
      "Live tracker for {exam} — every milestone of the current cycle in one place. Official dates link the notice; expected dates are clearly marked.",
  },
  hi: {
    factsTitle: "{exam} — आधिकारिक जानकारी",
    keyFactsTitle: "{exam} — मुख्य जानकारी",
    factsNote: "जानकारी परीक्षा कराने वाली संस्था के अपने पेजों से पढ़ी गई है।",
    siteNote: "परीक्षा कराने वाली संस्था की साइट का लिंक दिया गया है।",
    datesNote: "तारीख़ें सिर्फ़ घोषित वाली हैं, हर एक के साथ उसका स्तर: आधिकारिक (संस्था का अपना नोटिस) या रिपोर्टेड (दूसरा स्रोत)।",
    conductedBy: "परीक्षा कराने वाली संस्था",
    pattern: "परीक्षा पैटर्न",
    readOn: "{date} को पढ़ा गया",
    syllabus: "आधिकारिक सिलेबस",
    syllabusLink: "आधिकारिक सिलेबस खोलें",
    eligibility: "पात्रता",
    dates: "तिथियाँ",
    noDates: "अगली साइकिल की कोई तारीख़ अभी घोषित नहीं हुई है।",
    tracker: "हर तारीख़, ईमेल अलर्ट के साथ →",
    line: "Shishya पर अभी {exam} के प्रैक्टिस सवाल नहीं हैं।",
    tutor: "{exam} के बारे में AI ट्यूटर से पूछिए — पैटर्न, सिलेबस, पात्रता — अंग्रेज़ी और {n} भारतीय भाषाओं में, मुफ़्त।",
    tutorCta: "AI ट्यूटर से पूछें →",
    relatedTitle: "Shishya पर प्रैक्टिस सवालों वाली परीक्षाएँ",
    boxTitle: "Shishya पर {exam}",
    boxBody: "{exam} पेज पर Shishya के पास मौजूद जानकारी और तारीख़ें हैं, और AI ट्यूटर {exam} के सवालों के जवाब मुफ़्त देता है।",
    boxCta: "{exam} पेज खोलें →",
    trackerIntro:
      "{exam} का लाइव ट्रैकर — इस साइकिल की हर अहम तारीख़ एक जगह। आधिकारिक तारीख़ों के साथ नोटिस का लिंक है; अनुमानित तारीख़ें साफ़ चिह्नित हैं।",
  },
  te: {
    factsTitle: "{exam} — అధికారిక వివరాలు",
    keyFactsTitle: "{exam} — ముఖ్య వివరాలు",
    factsNote: "వివరాలు పరీక్ష నిర్వహించే సంస్థ సొంత పేజీల నుంచి చదివినవి.",
    siteNote: "పరీక్ష నిర్వహించే సంస్థ సైట్ లింక్ ఇచ్చాం.",
    datesNote: "తేదీలు ప్రకటించినవే, ప్రతిదానికి దాని స్థాయి: అధికారిక (సంస్థ సొంత నోటీసు) లేదా రిపోర్టెడ్ (మరో మూలం).",
    conductedBy: "పరీక్ష నిర్వహించే సంస్థ",
    pattern: "పరీక్ష విధానం",
    readOn: "{date}న చదివినది",
    syllabus: "అధికారిక సిలబస్",
    syllabusLink: "అధికారిక సిలబస్ తెరవండి",
    eligibility: "అర్హత",
    dates: "తేదీలు",
    noDates: "తదుపరి సైకిల్ తేదీ ఏదీ ఇంకా ప్రకటించలేదు.",
    tracker: "ప్రతి తేదీ, ఈమెయిల్ అలర్ట్‌లతో →",
    line: "Shishyaలో ఇంకా {exam} ప్రాక్టీస్ ప్రశ్నలు లేవు.",
    tutor: "{exam} గురించి AI ట్యూటర్‌ను అడగండి — విధానం, సిలబస్, అర్హత — ఇంగ్లీష్‌లో, {n} భారతీయ భాషల్లో, ఉచితంగా.",
    tutorCta: "AI ట్యూటర్‌ను అడగండి →",
    relatedTitle: "Shishyaలో ప్రాక్టీస్ ప్రశ్నలు ఉన్న పరీక్షలు",
    boxTitle: "Shishyaలో {exam}",
    boxBody: "{exam} పేజీలో Shishya దగ్గర ఉన్న వివరాలు, తేదీలు ఉన్నాయి; AI ట్యూటర్ {exam} ప్రశ్నలకు ఉచితంగా జవాబిస్తుంది.",
    boxCta: "{exam} పేజీ తెరవండి →",
    trackerIntro:
      "{exam} లైవ్ ట్రాకర్ — ఈ సైకిల్‌లోని ప్రతి ముఖ్యమైన తేదీ ఒకే చోట. అధికారిక తేదీలకు నోటీసు లింక్ ఉంది; అంచనా తేదీలు స్పష్టంగా గుర్తించాం.",
  },
};

export function noPracticeCopy(locale: string | null | undefined): NoPracticeCopy {
  return NO_PRACTICE_COPY[noPracticeLocale(locale)];
}

/** {placeholder} fill — unknown names stay as they are. */
export function fillNoPractice(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
}

/**
 * A description without its closing practice sentence ("Take a free mock to
 * see exactly where you stand." / "मुफ़्त मॉक दें …" / "ఉచిత మాక్ రాసి …") —
 * for an exam with no practice questions. Any other text is returned as is.
 */
export function dropPracticeSentence(text: string): string {
  const m = /^(.*[.।])\s+([^.।]*(?:mock|मॉक|మాక్)[^.।]*[.।])\s*$/iu.exec(text);
  return m ? m[1] : text;
}

// ── The hub's official-facts panel, as data ─────────────────────────────

export interface NoPracticeDateInput {
  label: string;
  /** Already formatted in the reader's language (fmtDay). */
  dayText: string;
  /** "official" / "reported" / "expected" in the reader's language. */
  tierWord: string;
  /** The notice, linked only for an official-tier row. */
  url: string | null;
}

export interface NoPracticePanelInput {
  locale: string;
  examCode: string;
  examShort: string;
  /** ExamEligibility.officialName / officialUrl — the conducting body. */
  officialName: string | null;
  officialUrl: string | null;
  /** src/lib/official-exam-facts.ts officialExamFacts(code). */
  facts: OfficialExamFacts | null;
  /** officialPattern(code, stored row) — null unless the stored row agrees. */
  officialPattern: OfficialExamFacts["pattern"] | null;
  /** verifiedPattern(exam) — the hand-read notice list. */
  verifiedPattern: VerifiedPattern | null;
  /** Only an ExamEligibility row written by the official research. */
  eligibility: { minAge: number | null; maxAge: number | null; ageRelaxation: string | null; educationNote: string | null } | null;
  /** Upcoming ANNOUNCED tracker rows (official / reported tier), soonest first. */
  dates: readonly NoPracticeDateInput[];
  related: readonly { code: string; shortName: string }[];
  tutorLanguageCount: number;
}

export interface PanelFact {
  label: string;
  text: string;
  href: string | null;
  hrefLabel: string | null;
  /** "read 27 Sept 2026" — when the source was read. */
  readOn: string | null;
}

export interface NoPracticePanelModel {
  title: string;
  note: string;
  facts: PanelFact[];
  datesLabel: string;
  dates: { text: string; href: string | null }[];
  noDates: string | null;
  trackerHref: string;
  trackerLabel: string;
  line: string;
  tutor: string;
  tutorHref: string;
  tutorCta: string;
  relatedTitle: string | null;
  related: { href: string; label: string }[];
}

const oneLine = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

function ageText(lc: NoPracticeLocale, e: NonNullable<NoPracticePanelInput["eligibility"]>): string | null {
  if (e.minAge == null && e.maxAge == null) return null;
  const range = `${e.minAge ?? "?"}–${e.maxAge ?? "?"}`;
  const rel = oneLine(e.ageRelaxation);
  if (lc === "hi") return `आयु: ${range} वर्ष${rel ? `; छूट: ${rel}` : ""}`;
  if (lc === "te") return `వయస్సు: ${range} సంవత్సరాలు${rel ? `; సడలింపు: ${rel}` : ""}`;
  return `Age: ${range} years${rel ? `; relaxation: ${rel}` : ""}`;
}

/** The panel for an exam with no practice questions — pure. */
export function noPracticePanel(i: NoPracticePanelInput): NoPracticePanelModel {
  const lc = noPracticeLocale(i.locale);
  const C = NO_PRACTICE_COPY[lc];
  const v = { exam: i.examShort, n: i.tutorLanguageCount };
  const facts: PanelFact[] = [];
  const readOn = i.facts ? isoDayText(i.facts.readOn) : null;

  // Conducting body: the official research's name where it exists, else the
  // stored row's; the link is the body's own site.
  const bodyName = i.facts?.officialName ?? oneLine(i.officialName);
  const bodyUrl = i.facts?.officialUrl ?? i.officialUrl;
  if (bodyName || bodyUrl) {
    facts.push({
      label: C.conductedBy,
      text: bodyName || (bodyUrl ?? "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
      href: bodyUrl ?? null,
      hrefLabel: bodyUrl ? `${bodyUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗` : null,
      readOn: null,
    });
  }

  // Pattern: the official research's scheme while the stored row agrees,
  // else a hand-read notice (pattern-verified), else nothing.
  if (i.officialPattern && readOn) {
    const p = i.officialPattern;
    facts.push({
      label: C.pattern,
      text: officialPatternSentence(p),
      href: p.url,
      hrefLabel: `${p.source ?? new URL(p.url).hostname} ↗`,
      readOn: fillNoPractice(C.readOn, { date: readOn }),
    });
  } else if (i.verifiedPattern) {
    const vp = i.verifiedPattern;
    facts.push({
      label: C.pattern,
      text: patternSentence(vp),
      href: vp.source.url,
      hrefLabel: `${vp.source.title} ↗`,
      readOn: fillNoPractice(C.readOn, { date: isoDayText(vp.checkedOn) }),
    });
  }

  if (i.facts?.syllabusUrl) {
    facts.push({ label: C.syllabus, text: "", href: i.facts.syllabusUrl, hrefLabel: `${C.syllabusLink} ↗`, readOn: readOn ? fillNoPractice(C.readOn, { date: readOn }) : null });
  }

  if (i.eligibility && readOn) {
    const parts = [oneLine(i.eligibility.educationNote), ageText(lc, i.eligibility)].filter((x): x is string => !!x);
    if (parts.length) {
      const src = i.facts?.eligibilitySourceUrl ?? null;
      facts.push({
        label: C.eligibility,
        text: parts.join(" "),
        href: src,
        hrefLabel: src ? `${new URL(src).hostname} ↗` : null,
        readOn: src ? fillNoPractice(C.readOn, { date: readOn }) : null,
      });
    }
  }

  const dates = i.dates.map((d) => ({ text: `${d.label} — ${d.dayText} (${d.tierWord})`, href: d.url }));
  const related = i.related.map((r) => ({ href: `/exams/${r.code}`, label: `${r.shortName} →` }));
  // Provenance (27 Sep 2026 fixer): "official facts … read on the body's own
  // pages" only with official research on file; otherwise "key facts" and,
  // when the body's site is linked, only that.
  const researched = i.facts != null;
  const note = [researched ? C.factsNote : bodyUrl ? C.siteNote : null, C.datesNote].filter((x): x is string => !!x).join(" ");
  return {
    title: fillNoPractice(researched ? C.factsTitle : C.keyFactsTitle, v),
    note,
    facts,
    datesLabel: C.dates,
    dates,
    noDates: dates.length ? null : C.noDates,
    trackerHref: `/exams/${i.examCode}/updates`,
    trackerLabel: C.tracker,
    line: fillNoPractice(C.line, v),
    tutor: fillNoPractice(C.tutor, v),
    tutorHref: `/chat?examCode=${encodeURIComponent(i.examCode)}`,
    tutorCta: C.tutorCta,
    relatedTitle: related.length ? C.relatedTitle : null,
    related,
  };
}
