// The press kit's copy and builders (27 Sep 2026).
//
// Why: founder ask (27 Sep 2026) — let the market (press, institutions,
// partners, AI assistants) slowly recognise Shishya, honestly. What a
// journalist needs is not a big number but how Shishya is built: grounded in
// official sources, answer-checked, school books linked instead of copied,
// with students as the subject. /press tells that story and hands over the
// facts, the brand files that already exist and a contact. Founder strategy
// (27 Sep 2026): no ranking or trust claims, no superlatives, no invented
// quotes or logos, no valuation, traction, growth-rate or infra-cost
// headlines, no boasting about AI-written content.
//
// Rules this file keeps (tests/unit/press-kit.test.ts pins them):
//   • company facts are only the ones /about and the root layout's
//     Organization JSON-LD already publish (name, place, website, email) — no
//     founder name and no phone number (/contact carries the phone; it is
//     linked, not copied);
//   • no statistic is typed: every number is read from the public-numbers
//     loaders (src/lib/public-numbers.ts, read-only) or a code constant, and
//     each links back to its definition on /shishya-in-numbers — none is
//     redefined here;
//   • every people count and share goes through the K_MIN gate
//     (src/lib/public-stats.ts) exactly as on /shishya-in-numbers;
//   • the brand-asset list names only files that exist (public/ or the
//     /opengraph-image route), with their real sizes.
//
// Pure: type-only imports from the DB modules (erased at build), no DB, no
// Next imports — safe in tests.

import type { CoverageRow, PublicNumbers } from "@/lib/public-numbers";
import { PULSE_HARD_MIN_ANSWERS, PULSE_HARD_MIN_TOPICS, PULSE_HARD_ROWS, PULSE_K, PULSE_TOPIC_MIN_PEOPLE, type PulseWeek, type TopicRow } from "@/lib/pulse-rules";
import { DEFAULT_CONFIG } from "@/lib/ai/factory/types";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { istDayLabel } from "@/lib/iso-week";
import { MENTOR_SESSION_FEE_PAISE } from "@/lib/razorpay";
import { K_MIN, SUPPRESSED, formatInt, formatPct, publishable, share, shareCell } from "@/lib/public-stats";
import { NUMBERS_PATH, aiSourceCount, solvesNeeded } from "@/lib/public-numbers-rules";
import { SOURCE_LIMITS, counterCell, headlineTiles } from "@/lib/public-numbers-view";
import { pulseCitation, pulseWeekPhrase } from "@/lib/pulse-view";
import { SITE_ORG_ID, SITE_URL } from "@/lib/site-description";

// ── Page identity ─────────────────────────────────────────────────────

export const PRESS_PATH = "/press";
export const PRESS_URL = `${SITE_URL}${PRESS_PATH}`;
export const PRESS_TITLE = "Press kit — Shishya, a free study platform for students in India";
export const PRESS_DESCRIPTION =
  "Facts, method, brand assets and contact for writing about Shishya: what it is, what is free, who runs it, how practice questions are answer-checked, and live numbers with definitions.";

// ── Who runs it (only facts already public) ───────────────────────────

/** The operator exactly as /about and the root layout's Organization
 *  JSON-LD (parentOrganization) publish it. */
export const COMPANY = {
  name: "Surge Software Solutions Pvt Ltd",
  url: "https://surgesoftware.co.in",
  email: "corp@surgesoftware.co.in",
  locality: "Bengaluru",
  region: "Karnataka",
} as const;

/** /about's own "Who runs Shishya?" sentence, word for word. */
export const WHO_RUNS_IT = `Shishya is built and operated by ${COMPANY.name}, an Indian software company in ${COMPANY.locality}, ${COMPANY.region}.`;

export const PRESS_EMAIL_SUBJECT = "Press";
export const PRESS_MAILTO = `mailto:${COMPANY.email}?subject=${encodeURIComponent(PRESS_EMAIL_SUBJECT)}`;

// ── What is free (the same facts as /about, /pricing, /editorial-policy) ──

/** The mentor fee as the payment code charges it (src/lib/razorpay.ts). */
export const MENTOR_FEE = `₹${MENTOR_SESSION_FEE_PAISE / 100}`;

export const FREE_FACTS: readonly string[] = [
  "Every study feature is free, with no paywall and no premium tier: school chapters, practice questions, mock tests, previous-year-pattern sets, notes, exam trackers, the AI tutor, and the colleges, scholarships and careers pages.",
  `The only paid item is an optional session with a human mentor: the first session is free, later ones are ${MENTOR_FEE} each, inclusive of GST, paid only after a mentor accepts the request.`,
  "No ads, no affiliate links and no selling of student data.",
];

// ── Definitions live on /shishya-in-numbers ───────────────────────────

/** A definition anchor on /shishya-in-numbers. */
export function numbersAnchor(id: string): string {
  return `${NUMBERS_PATH}#${id}`;
}

/** The anchors this page links to — each is an element id on
 *  /shishya-in-numbers (tests/unit/press-kit.test.ts checks they exist). */
export const NUMBERS_ANCHORS = {
  exams: "exams",
  checkedQuestions: "checked-questions",
  chaptersWithNotes: "chapters-with-notes",
  chaptersWithPractice: "chapters-with-practice",
  ncertChapters: "ncert-chapters",
  schoolPending: "school-questions-awaiting-check",
  languages: "languages",
  accounts: "counter-totalSignups",
  cameBack7: "came-back-7-days",
  signupSources: "signup-sources",
  mocksPerActive: "mocks-per-active-account",
  answerCheck: "answer-check",
  officialPapers: "official-papers",
  officialCutoffs: "official-cutoffs",
  datesOfficial: "dates-official",
  datesReported: "dates-reported",
  datesExpected: "dates-expected",
} as const;

function coverageRow(p: PublicNumbers, id: string): CoverageRow | null {
  for (const g of p.coverage?.value ?? []) for (const r of g.rows) if (r.id === id) return r;
  return null;
}

// ── Key facts (live) ──────────────────────────────────────────────────

export interface KeyFact {
  id: string;
  label: string;
  /** Printed figure; null → "could not be computed right now". */
  value: string | null;
  sub: string | null;
  definition: string;
  period: string | null;
  asOf: string | null;
  /** The definition on /shishya-in-numbers. */
  href: string;
}

function coverageFact(p: PublicNumbers, id: string, fallbackLabel: string, sub?: (r: CoverageRow) => string | null): KeyFact {
  const r = coverageRow(p, id);
  return {
    id: `fact-${id}`,
    label: r?.label ?? fallbackLabel,
    value: r ? formatInt(r.value) : null,
    sub: r && sub ? sub(r) : null,
    definition: r?.definition ?? "",
    period: null,
    asOf: r ? (p.coverage?.asOf ?? null) : null,
    href: numbersAnchor(id),
  };
}

const NOT_PRINTED = `fewer than ${formatInt(K_MIN)} in the group; not printed`;
/** 27 Sep 2026 (fixer review): the AI share is also withheld when AI
 *  assistants are merged with a small group on the numbers page, so its own
 *  size may be 20 or more. */
const SUBSET_NOT_PRINTED = `not printed: it would show a group of fewer than ${formatInt(K_MIN)}`;

/** The eight key facts, in the order the press page prints them. Supply
 *  first (what Shishya holds), then use (whether students come back and
 *  practise) — no growth rate, no valuation, no ranking. */
export function keyFacts(p: PublicNumbers): KeyFact[] {
  const facts: KeyFact[] = [
    coverageFact(p, NUMBERS_ANCHORS.exams, "Exams covered"),
    coverageFact(p, NUMBERS_ANCHORS.checkedQuestions, "Practice questions that passed the answer check"),
    coverageFact(p, NUMBERS_ANCHORS.chaptersWithNotes, "School chapters with Shishya's own notes"),
    coverageFact(p, NUMBERS_ANCHORS.languages, "Languages", (r) => r.detail ?? null),
  ];

  // Accounts: the all-time counter, through the people gate.
  const acc = p.counters?.value.find((c) => c.key === "totalSignups") ?? null;
  const accValue = acc ? counterCell(acc) : null;
  facts.push({
    id: "fact-accounts",
    label: "Accounts",
    value: accValue,
    sub:
      accValue === null
        ? null
        : accValue === SUPPRESSED
          ? NOT_PRINTED
          : "An account is not a unique student: one person can hold more than one, and many study signed out.",
    definition: acc?.definition ?? "",
    period: acc ? "all time" : null,
    asOf: acc ? (p.counters?.asOf ?? null) : null,
    href: numbersAnchor(NUMBERS_ANCHORS.accounts),
  });

  // Came back within 7 days and mocks per active account: the numbers
  // page's own headline tiles, unchanged.
  const tiles = headlineTiles(p);
  const tileFact = (id: string): KeyFact => {
    const t = tiles.find((x) => x.id === id);
    return {
      id: `fact-${id}`,
      label: t?.label ?? id,
      value: t?.value ?? null,
      sub: t?.sub ?? null,
      definition: t?.definition ?? "",
      period: t?.period ?? null,
      asOf: t?.asOf ?? null,
      href: numbersAnchor(id),
    };
  };
  facts.push(tileFact(NUMBERS_ANCHORS.cameBack7));

  // New accounts whose first visit came from an AI assistant.
  const s = p.signupSources;
  const aiLabel = "New accounts whose first visit came from an AI assistant";
  if (s) {
    const v = s.value;
    // 27 Sep 2026 (fixer review): the numbers page's own gate — printed only
    // when AI assistants are a group of their own in its table, so the fact
    // can never give back a merged-away group by subtraction.
    const ai = aiSourceCount(v);
    const pct = ai === null ? SUPPRESSED : shareCell(ai, v.total);
    facts.push({
      id: "fact-ai-assistants",
      label: aiLabel,
      value: pct,
      sub: pct === SUPPRESSED || ai === null ? SUBSET_NOT_PRINTED : `${formatInt(ai)} of ${formatInt(v.total)} new accounts`,
      definition: `${s.definition} ${SOURCE_LIMITS}`,
      period: s.period,
      asOf: s.asOf,
      href: numbersAnchor(NUMBERS_ANCHORS.signupSources),
    });
  } else {
    facts.push({
      id: "fact-ai-assistants",
      label: aiLabel,
      value: null,
      sub: null,
      definition: "",
      period: null,
      asOf: null,
      href: numbersAnchor(NUMBERS_ANCHORS.signupSources),
    });
  }

  facts.push(tileFact(NUMBERS_ANCHORS.mocksPerActive));
  return facts;
}

// ── How Shishya is built ──────────────────────────────────────────────

export interface PressLink {
  href: string;
  label: string;
}

export interface MethodBlock {
  id: string;
  title: string;
  /** Sentences; the numeric ones are left out when their loader failed. */
  body: string[];
  links: PressLink[];
}

const onExamsText = (r: CoverageRow | null) => (r?.detail ? ` ${r.detail}` : "");

/** The short answer-check method, every number from DEFAULT_CONFIG (the
 *  config scripts/verify-question-bank.ts gates with) — the same rule as
 *  answerCheckMethod() on /shishya-in-numbers, in fewer words. */
export function answerCheckShort(cfg: { solveRuns: number; minAgreement: number; minVerifyConfidence: number } = DEFAULT_CONFIG): string[] {
  const need = solvesNeeded(cfg);
  const conf = Math.round(cfg.minVerifyConfidence * 100);
  return [
    `Every practice question is solved ${cfg.solveRuns} times by an AI model that is not shown the stored answer key, and an AI examiner then compares the key with the solves.`,
    `A question stays as written only when the examiner judges the key correct with at least ${conf}% confidence and at least ${need} of the ${cfg.solveRuns} solves reach it; when the examiner and at least ${need} solves agree on a different option, the key is corrected, and anything unclear is withdrawn from every practice pool.`,
    "The check is automated, not a human audit, and it can be wrong; every question keeps its Report button.",
  ];
}

/** "1,172 answer keys corrected and 3,196 questions withdrawn, of the
 *  36,690 questions that were already live when checked" — or null. */
export function answerCheckSummary(p: PublicNumbers): string | null {
  const a = p.answerCheck?.value;
  if (!a || !publishable(a.liveBefore)) return null;
  return `${formatInt(a.liveCorrected)} answer keys corrected and ${formatInt(a.liveWithdrawn)} questions withdrawn, of the ${formatInt(a.liveBefore)} questions that were already live when checked`;
}

export function methodBlocks(p: PublicNumbers, opts: { upcomingDays: number }): MethodBlock[] {
  const papers = coverageRow(p, NUMBERS_ANCHORS.officialPapers);
  const cutoffs = coverageRow(p, NUMBERS_ANCHORS.officialCutoffs);
  const dOff = coverageRow(p, NUMBERS_ANCHORS.datesOfficial);
  const dRep = coverageRow(p, NUMBERS_ANCHORS.datesReported);
  const dExp = coverageRow(p, NUMBERS_ANCHORS.datesExpected);

  const official: string[] = [
    "On every exam tracker a date is marked Official only when it is cited from the conducting body's own site, Reported when it was announced but is cited through a secondary source such as a news or coaching site, and Expected when it is an estimate from previous cycles.",
  ];
  if (papers) official.push(`${formatInt(papers.value)} official previous-year papers and answer keys are linked${onExamsText(papers)}, on the conducting bodies' own sites.`);
  if (cutoffs) official.push(`${formatInt(cutoffs.value)} official cutoff rows${onExamsText(cutoffs)} are copied from the bodies' published documents, each with its source link.`);
  if (dOff && dRep && dExp) {
    official.push(
      `Of the tracker dates in the next ${formatInt(opts.upcomingDays)} days, ${formatInt(dOff.value)} are marked Official, ${formatInt(dRep.value)} Reported and ${formatInt(dExp.value)} Expected.`,
    );
  }

  const check: string[] = [...answerCheckShort()];
  const a = p.answerCheck;
  if (a) {
    const c = a.value;
    check.push(
      `By ${istDayLabel(a.asOf)}, ${formatInt(c.checked)} questions had been checked: ${formatInt(c.accepted)} accepted as written, ${formatInt(c.keyCorrected)} with a corrected key and ${formatInt(c.withdrawn)} withdrawn.`,
    );
    if (publishable(c.liveBefore)) {
      check.push(
        `Of the ${formatInt(c.liveBefore)} questions that were already live when checked, ${formatPct(share(c.liveCorrected, c.liveBefore))} had their key corrected and ${formatPct(share(c.liveWithdrawn, c.liveBefore))} were withdrawn.`,
      );
    }
    if (c.uncheckedLive > 0) {
      check.push(
        `${formatInt(c.uncheckedLive)} live question${c.uncheckedLive === 1 ? "" : "s"} on ${formatInt(c.uncheckedExams)} exam${c.uncheckedExams === 1 ? "" : "s"} ${c.uncheckedLive === 1 ? "has" : "have"} not been through the check yet; ${c.uncheckedLive === 1 ? "it was" : "they were"} validated before it existed.`,
      );
    }
  }

  const ai: string[] = [
    "Practice questions, study notes and exam summaries are drafted with AI, and Shishya says so in its editorial policy.",
    `The tutor is an AI tutor and is named as one; it works in English and ${formatInt(INDIAN_LANGUAGE_COUNT)} Indian languages.`,
    "Exam content is grounded in the conducting bodies' notifications, previous-year papers and each exam's published pattern, and students can report any question.",
  ];

  const ncert = coverageRow(p, NUMBERS_ANCHORS.ncertChapters);
  const notes = coverageRow(p, NUMBERS_ANCHORS.chaptersWithNotes);
  const practice = coverageRow(p, NUMBERS_ANCHORS.chaptersWithPractice);
  const pending = coverageRow(p, NUMBERS_ANCHORS.schoolPending);
  const school: string[] = [
    "School pages follow the NCERT textbooks: each class, subject and chapter page links NCERT's own book and chapter PDF on ncert.nic.in, and the textbook text is never copied, summarised or translated. For CISCE (ICSE and ISC), the council's own syllabus documents are linked.",
  ];
  if (ncert) school.push(`${formatInt(ncert.value)} NCERT chapters are listed, each linking the official book.`);
  if (notes && practice) {
    school.push(`Shishya's own chapter notes are on ${formatInt(notes.value)} school chapters so far, and checked practice on ${formatInt(practice.value)}.`);
  }
  if (pending && pending.value > 0) {
    school.push(`${formatInt(pending.value)} school questions are written but not shown to students until they pass the answer check.`);
  }

  return [
    {
      id: "official-sources",
      title: "Grounded in official sources",
      body: official,
      links: [
        { href: "/editorial-policy", label: "Editorial policy" },
        { href: "/exam-calendar", label: "Exam calendar" },
        { href: numbersAnchor(NUMBERS_ANCHORS.officialPapers), label: "Counts and definitions" },
      ],
    },
    {
      id: "answer-checked",
      title: "Answer-checked, with the results published",
      body: check,
      links: [
        { href: numbersAnchor(NUMBERS_ANCHORS.answerCheck), label: "Answer-check numbers" },
        { href: "/editorial-policy", label: "Editorial policy" },
      ],
    },
    {
      id: "ai-plainly",
      title: "AI, said plainly",
      body: ai,
      links: [{ href: "/editorial-policy", label: "What is AI-drafted and what is linked" }],
    },
    {
      id: "school-linked",
      title: "School books linked, not copied",
      body: school,
      links: [
        { href: "/schooling", label: "School section" },
        { href: numbersAnchor(NUMBERS_ANCHORS.chaptersWithNotes), label: "School counts" },
      ],
    },
  ];
}

// ── Story angles (data, not claims) ───────────────────────────────────

/** What the press page quotes from the latest Shishya Pulse. */
export interface PressPulse {
  week: PulseWeek;
  /** "24 Aug–20 Sep 2026" — the four weeks the topic tables read. */
  windowLabel: string | null;
  /** IST day the Pulse numbers were computed. */
  computedDay: string | null;
  /** Pulse's hardest-topics rows, lowest share correct first (gated there). */
  hardest: readonly TopicRow[] | null;
  /** Pulse's most-practised rows, most answers first (gated there). */
  practised: readonly TopicRow[] | null;
}

/** "Lowest share of correct answers" is only said when at least this many
 *  topics passed Pulse's hardest-topic gate — the lowest of one or two is
 *  not a finding (27 Sep 2026 probe: week 38's window had one). Otherwise the
 *  angle quotes the most-practised topic instead. 27 Sep 2026 (fixer
 *  review): Pulse itself now applies the same rule (PULSE_HARD_MIN_TOPICS),
 *  so the two can never disagree. */
export const PRESS_HARDEST_MIN_TOPICS = PULSE_HARD_MIN_TOPICS;

/** The one Pulse finding the press page quotes (with the Pulse section it
 *  comes from), or null when Pulse has none to give. */
export function pulseFinding(pulse: PressPulse | null): { sentence: string; anchor: "hardest" | "topics" } | null {
  if (!pulse) return null;
  const over = pulse.windowLabel ?? pulseWeekPhrase(pulse.week);
  const hard = pulse.hardest ?? [];
  const h = hard[0];
  if (hard.length >= PRESS_HARDEST_MIN_TOPICS && h && h.sharePct !== null) {
    // 27 Sep 2026 (fixer review): Pulse keeps at most PULSE_HARD_ROWS rows,
    // so a full table's length is not the number of qualifying topics.
    const pool = hard.length < PULSE_HARD_ROWS ? `the ${formatInt(hard.length)} topics` : "the topics";
    return {
      anchor: "hardest",
      sentence:
        `Over ${over}, of ${pool} with at least ${formatInt(PULSE_HARD_MIN_ANSWERS)} answers from at least ${formatInt(PULSE_TOPIC_MIN_PEOPLE)} students, ` +
        `the one with the lowest share of correct answers was ${h.topicName} (${h.examName}): ${h.sharePct.toFixed(1)}% of ${formatInt(h.answers)} answers were correct. ` +
        "That is a share of answers, not a difficulty rating.",
    };
  }
  const top = pulse.practised?.[0];
  if (top) {
    return {
      anchor: "topics",
      sentence: `Over ${over}, the topic students on Shishya practised most was ${top.topicName} (${top.examName}), with ${formatInt(top.answers)} answers.`,
    };
  }
  return null;
}

export interface StoryAngle {
  id: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

export function storyAngles(p: PublicNumbers, pulse: PressPulse | null): StoryAngle[] {
  const a = p.answerCheck?.value;
  // 27 Sep 2026 (integrator): "what it changed" quotes only the questions that
  // were live before the check — the all-checked totals include questions
  // that were never served, so they overstate the change.
  const changed = answerCheckSummary(p);
  const answerKeys = a && changed
    ? `Shishya put ${formatInt(a.checked)} practice questions through an automated answer check and published what it changed — ${changed} — with the method and every definition.`
    : "Shishya put its practice questions through an automated answer check and published what it changed, with the method and every definition.";

  const s = p.signupSources;
  // 27 Sep 2026 (fixer review): same gate as the key fact above.
  const aiN = s ? aiSourceCount(s.value) : null;
  const aiPct = s && aiN !== null ? shareCell(aiN, s.value.total) : SUPPRESSED;
  const arrivals =
    s && aiPct !== SUPPRESSED
      ? `${aiPct} of the new accounts created in ${s.period} arrived on a first visit from an AI assistant such as ChatGPT. It is a floor: some apps strip both the referrer and the tag.`
      : "How new students reach Shishya — search, AI assistants, links from other sites — is published by the source of their first visit, with its definition.";

  const notes = coverageRow(p, NUMBERS_ANCHORS.chaptersWithNotes);
  const textbook = `School pages link NCERT's own chapter PDFs instead of copying them; Shishya adds its own notes only where they are written${notes ? ` (${formatInt(notes.value)} chapters so far)` : ""} and practice only where it has passed the answer check.`;

  const pulseBase = `A new week appears each Monday: the exams students took the most mocks for, the most-practised and hardest topics, and the week's official exam dates. Every printed group counts at least ${formatInt(PULSE_K)}.`;
  const finding = pulseFinding(pulse);

  return [
    {
      id: "angle-answer-keys",
      title: "How a free study platform re-checked its own answer keys",
      body: answerKeys,
      href: numbersAnchor(NUMBERS_ANCHORS.answerCheck),
      linkLabel: "The answer-check numbers",
    },
    {
      id: "angle-ai-assistants",
      title: "Where students arrive from now: links in AI assistants",
      body: arrivals,
      href: numbersAnchor(NUMBERS_ANCHORS.signupSources),
      linkLabel: "Sign-ups by source",
    },
    { id: "angle-textbook", title: "Linking the textbook instead of copying it", body: textbook, href: "/schooling", linkLabel: "The school section" },
    {
      id: "angle-pulse",
      title: "Shishya Pulse: a weekly note on what students practised",
      body: finding ? `${pulseBase} ${finding.sentence}` : pulseBase,
      href: pulse ? `/pulse/${pulse.week.slug}${finding ? `#${finding.anchor}` : ""}` : "/pulse",
      linkLabel: pulse ? `Shishya Pulse, ${pulseWeekPhrase(pulse.week)}` : "Shishya Pulse",
    },
  ];
}

// ── What Shishya is not ───────────────────────────────────────────────

export const NOT_LIST: readonly { title: string; body: string }[] = [
  {
    title: "Not an official source",
    body: "Shishya is independent: it is not run by, or affiliated with, any exam-conducting body, NCERT, CBSE or CISCE. Its trackers link the bodies' own notices; dates and rules should be confirmed there.",
  },
  {
    title: "Practice questions are not official papers",
    body: "Mock tests and previous-year-pattern sets use Shishya's own questions, drafted with AI and put through the answer check. Official previous-year papers are linked separately, on the conducting bodies' own sites.",
  },
  {
    title: "An account is not a student",
    body: "One person can hold more than one account and many study signed out, so account counts are not student counts. The home page's 'learners' counter counts people who came, which proves a visit, not learning.",
  },
  {
    title: "No outcome or ranking claims",
    body: "The numbers Shishya publishes count use and content. None of them measures exam selections, ranks or score gains, and Shishya claims none for its students and no ranking for itself.",
  },
];

// ── Brand assets (existing files only) ────────────────────────────────

export interface BrandAsset {
  /** Site path. */
  path: string;
  /** Where the file comes from: public/ or a Next route file. */
  origin: { kind: "public" | "route"; file: string };
  format: "PNG" | "SVG";
  width: number;
  height: number;
  use: string;
  note?: string;
  /** Show a small preview on the page. */
  preview: boolean;
}

const SVG_TEXT_NOTE =
  "The शि in this file is live text set in Noto Sans Devanagari, so it draws correctly only where that font is installed; use the PNG for print.";

// 27 Sep 2026: /favicon.ico is left out on purpose — the file in public/ is
// an SVG under an .ico name, so it is not a real ICO a newsroom could use.
export const BRAND_ASSETS: readonly BrandAsset[] = [
  {
    path: "/icons/icon-512.png",
    origin: { kind: "public", file: "public/icons/icon-512.png" },
    format: "PNG",
    width: 512,
    height: 512,
    use: "The शि mark on its saffron tile, rounded corners. The file to use in articles and print.",
    preview: true,
  },
  {
    path: "/icons/icon-192.png",
    origin: { kind: "public", file: "public/icons/icon-192.png" },
    format: "PNG",
    width: 192,
    height: 192,
    use: "The same mark, small.",
    preview: false,
  },
  {
    path: "/icons/icon-maskable-512.png",
    origin: { kind: "public", file: "public/icons/icon-maskable-512.png" },
    format: "PNG",
    width: 512,
    height: 512,
    use: "A full-bleed square with the mark inside the safe zone, for round or rounded-square crops.",
    preview: true,
  },
  {
    path: "/icon.svg",
    origin: { kind: "public", file: "public/icon.svg" },
    format: "SVG",
    width: 64,
    height: 64,
    use: "The mark as a vector file.",
    note: SVG_TEXT_NOTE,
    preview: false,
  },
  {
    path: "/apple-icon.svg",
    origin: { kind: "public", file: "public/apple-icon.svg" },
    format: "SVG",
    width: 180,
    height: 180,
    use: "The mark as a vector file, on a larger tile.",
    note: SVG_TEXT_NOTE,
    preview: false,
  },
  {
    path: "/opengraph-image",
    origin: { kind: "route", file: "src/app/opengraph-image.tsx" },
    format: "PNG",
    width: 1200,
    height: 630,
    use: "The social card shown when a Shishya link is shared. The site generates it.",
    preview: true,
  },
];

export const BRAND_COLOURS: readonly { hex: string; name: string; where: string }[] = [
  { hex: "#f97316", name: "Saffron", where: "the mark's tile" },
  { hex: "#fff7ed", name: "Cream", where: "the page and app background" },
];

/** The names the root layout's Organization JSON-LD gives Shishya. */
export const BRAND_NAMES: readonly string[] = ["Shishya", "शिष्य"];

export const BRAND_RULE =
  "Use the files as supplied. Do not redraw, recolour or stretch the mark, and do not use it in a way that suggests Shishya endorses a product, an institution or a story.";

// ── JSON-LD ───────────────────────────────────────────────────────────

export function pressPageLd(today: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${PRESS_URL}#page`,
    url: PRESS_URL,
    name: PRESS_TITLE,
    description: PRESS_DESCRIPTION,
    inLanguage: "en-IN",
    isPartOf: { "@type": "WebSite", name: "Shishya", url: SITE_URL },
    about: { "@id": SITE_ORG_ID },
    mainEntity: { "@id": SITE_ORG_ID },
    publisher: { "@id": SITE_ORG_ID },
    dateModified: today,
  };
}

// ── Citation ──────────────────────────────────────────────────────────

/** Pulse's own citation line for the latest week, or null before the first. */
export function pulseCitationLine(pulse: PressPulse | null, today: string): string | null {
  return pulse ? pulseCitation(pulse.week, pulse.computedDay ?? today) : null;
}
