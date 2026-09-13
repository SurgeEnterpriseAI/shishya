// Last-minute checklist, built from stored facts (13 Sep 2026).
//
// Audit (11 Sep 2026): /exams/[code]/checklist said "we compile it as the
// date nears" for most of the 178 exams, while every fact a student needs
// the night before was already on our records — the exam-day row and its
// timings, the admit-card row and its reporting notes, the pattern
// (questions, marks, duration, negative marking), the sections in order,
// the languages and the conducting body's portal. The exam-eve mail sent
// SBI PO students to the hub because the checklist was a placeholder.
//
// This module turns those facts into the checklist. Pure: no DB, no model
// call, no clock except the `now` a caller passes. The route
// (src/app/exams/[code]/checklist/page.tsx) loads the rows and renders.
//
// Honesty rules baked in:
//   • every date leaves here with its source tier word — official
//     (conducting body's own site), reported (secondary source) or expected
//     (typical-cycle estimate); a past estimate reads "was expected — not
//     confirmed" (PASSED_ESTIMATE_TEXT), never as a held paper
//   • only TYPED tracker rows count (the May-2026 seed rows with no kind are
//     ignored, exactly as the exam-week state machine ignores them)
//   • an expected answer-key date never appears (buildTimeline drops it);
//     missing rows are null and the page prints "not announced yet"
//   • the per-question mark and negative marking are stated ONLY when
//     markingSchemeVerdict (src/lib/marking-scheme.ts) says the stored
//     scheme is statable for the sitting in focus — otherwise its reason
//   • Subject.weight is a RELATIVE syllabus weight (hand seeds use 0.3 /
//     1.5; the AI syllabus seeder, src/lib/ai/syllabus.ts, asks the model
//     for "realistic weights" clamped to 0.1–5) — never the official
//     paper's weightage. So no share or percentage is ever derived from it.
//     A number is printed only when the weights ARE question counts:
//     integers adding up to the scored count, at least one above the AI
//     seeder's cap. Otherwise the list is "subjects on our syllabus", names
//     only (fix round, 13 Sep 2026)
//   • "what to carry" states only what is true of every Indian recruitment /
//     entrance exam hall (admit card, original photo ID, no phones);
//     anything that varies by conducting body is phrased "check your admit
//     card" — never a rule we invented. School-held olympiads (SOF,
//     Silverzone, NSTSE) often issue no hall ticket and the candidates are
//     children with no PAN or licence, so OLYMPIAD states NOTHING as fact
//   • meta / share-preview text is assembled from whole clauses — a number
//     is never sliced, and the stored pattern stays out of it when the
//     sitting in focus is a different stage
//
// Also home to pickExamsStrip(), the pure selection behind the homepage
// "Exams today" strip (src/components/ExamsTodayStrip.tsx): announced
// (official / reported) EXAM rows only, today first, else this week.

import {
  buildTimeline,
  focusExamRow,
  PASSED_ESTIMATE_TEXT,
  type DateKind,
  type SourceTier,
  type TimelineInput,
  type TimelineRow,
} from "@/lib/exam-timeline";
import {
  computeExamWeekState,
  firstShiftStartIst,
  istDay,
  istHour,
  POLL_DEFAULT_OPEN_IST_HOUR,
  TODAY_PM_IST_HOUR,
  type ExamWeekPhase,
  type ExamWeekState,
} from "@/lib/exam-week";
import { markingSchemeVerdict, scoredCount, stageMismatchReason } from "@/lib/marking-scheme";
import { sourceTier } from "@/lib/official-source";

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
/** An admit-card row further than this before the exam day belongs to another sitting. */
const ADMIT_LOOKBACK_DAYS = 60;
/** Exam days more than this apart are different stages (same as exam-week.ts). */
const STAGE_GAP_DAYS = 14;
const NOTE_MAX_CHARS = 400;

/** English tier words — identical to i18n ew.tier.* (en). */
export const TIER_WORD_EN: Readonly<Record<SourceTier, string>> = {
  official: "official",
  reported: "reported",
  expected: "expected",
};

/** schema.prisma enum Language → display name. */
export const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  EN: "English",
  HI: "Hindi",
  TE: "Telugu",
  TA: "Tamil",
  KN: "Kannada",
  ML: "Malayalam",
  MR: "Marathi",
  BN: "Bengali",
  GU: "Gujarati",
  PA: "Punjabi",
};

// ── What to carry ────────────────────────────────────────────────────────

export interface CarryItem {
  text: string;
  /** false = true of every exam hall we cover; true = varies by conducting
   *  body, so the text itself sends the student to their admit card /
   *  call letter / notice. */
  check: boolean;
}

/** True of every Indian recruitment / entrance exam hall. */
const CARRY_CORE: readonly CarryItem[] = [
  {
    text: "Admit card (hall ticket / call letter), printed — the instructions printed on it override anything on this page",
    check: false,
  },
  {
    text: "Original photo ID with the same name as your admit card (Aadhaar, PAN, voter ID, passport or driving licence — your admit card lists which it accepts); a photocopy alone is not enough",
    check: false,
  },
  {
    text: "Leave your phone, smartwatch, earphones and other electronic gadgets at home or outside — they are not allowed in the exam hall, and do not count on a cloakroom at the centre",
    check: false,
  },
  {
    text: "Reporting time and gate-closing time are printed on your admit card — late entry is refused, so plan to reach well before",
    check: false,
  },
];

const PHOTO_CHECK: CarryItem = {
  text: "Passport-size photographs, if your admit card asks for them — use the same photo you uploaded in the application",
  check: true,
};
const PEN_OMR: CarryItem = {
  text: "Pen: an offline OMR sheet needs a ballpoint pen of the colour your admit card names (usually black); computer-based tests generally give you a pen and rough sheet at the centre — check your admit card",
  check: true,
};
const PEN_CBT: CarryItem = {
  text: "Pen and rough sheet: computer-based tests generally provide them at the centre — carry your own only if your admit card says so",
  check: true,
};
const WATER_CHECK: CarryItem = {
  text: "Transparent water bottle, sanitiser or a simple wrist watch: allowed at some exams and banned at others — check your admit card before you pack",
  check: true,
};
const PWD_CHECK: CarryItem = {
  text: "Using a scribe or compensatory time? Carry the certificate and the scribe's own photo ID in the format your admit card or notice asks for",
  check: true,
};
const SELF_DECLARATION: CarryItem = {
  text: "If your admit card has a self-declaration / undertaking page, fill it in and paste your photograph before you reach the centre — check your admit card",
  check: true,
};
const DRESS_CHECK: CarryItem = {
  text: "Dress code: some entrance exams publish one (medical entrance notices usually do) — follow the rules printed on your admit card",
  check: true,
};
const BANK_CALL_LETTER: CarryItem = {
  text: "Banking call letters usually ask for a photograph pasted on the call letter and a photocopy of your photo ID along with the original — do exactly what your call letter says",
  check: true,
};
/** School-held olympiads (SOF, Silverzone, NSTSE) are often sat at the
 *  child's own school with no hall ticket; HBCSE / IOQM issue admit cards.
 *  Nothing here is universal, so every item is a check. */
const CARRY_OLYMPIAD: readonly CarryItem[] = [
  {
    text: "Admit card or centre letter, if your olympiad issues one — many olympiads held at your own school do not; check your school notice",
    check: true,
  },
  {
    text: "Identity proof: a school identity card or the photo ID your admit card or school notice names — ask the school if unsure",
    check: true,
  },
  {
    text: "Phones, smartwatches and calculators are generally not allowed in the exam room — follow your admit card or school notice",
    check: true,
  },
  {
    text: "Reporting time: it is on your admit card or school notice — reach before it",
    check: true,
  },
  {
    text: "Pen or pencil: the OMR sheet's instructions say which (ballpoint pen or HB pencil) — check your admit card or school notice",
    check: true,
  },
];

/** Keyed by schema ExamCategory. Unknown / SCHOOL_BOARD / OTHER → OTHER.
 *  (SCHOOL_BOARD containers have no checklist page at all — hasChecklist.) */
export const WHAT_TO_CARRY: Readonly<Record<string, readonly CarryItem[]>> = {
  GOVT_JOBS: [...CARRY_CORE, PHOTO_CHECK, PEN_CBT, WATER_CHECK, PWD_CHECK],
  BANKING: [...CARRY_CORE, BANK_CALL_LETTER, PEN_CBT, WATER_CHECK, PWD_CHECK],
  CIVIL_SERVICES: [...CARRY_CORE, PHOTO_CHECK, PEN_OMR, WATER_CHECK, PWD_CHECK],
  MEDICAL: [...CARRY_CORE, SELF_DECLARATION, PHOTO_CHECK, DRESS_CHECK, WATER_CHECK, PWD_CHECK],
  ENGINEERING: [...CARRY_CORE, SELF_DECLARATION, PHOTO_CHECK, PEN_CBT, WATER_CHECK, PWD_CHECK],
  TEACHING: [...CARRY_CORE, PHOTO_CHECK, PEN_OMR, WATER_CHECK, PWD_CHECK],
  UNIVERSITY: [...CARRY_CORE, SELF_DECLARATION, PHOTO_CHECK, PEN_CBT, WATER_CHECK, PWD_CHECK],
  MBA: [...CARRY_CORE, PHOTO_CHECK, PEN_CBT, WATER_CHECK, PWD_CHECK],
  LAW: [...CARRY_CORE, PHOTO_CHECK, PEN_OMR, WATER_CHECK, PWD_CHECK],
  OLYMPIAD: [...CARRY_OLYMPIAD, WATER_CHECK],
  STATE_LEVEL: [...CARRY_CORE, PHOTO_CHECK, PEN_OMR, WATER_CHECK, PWD_CHECK],
  OTHER: [...CARRY_CORE, PHOTO_CHECK, PEN_OMR, WATER_CHECK, PWD_CHECK],
};

export function carryListFor(category: string | null | undefined): readonly CarryItem[] {
  return WHAT_TO_CARRY[(category ?? "").toUpperCase()] ?? WHAT_TO_CARRY.OTHER;
}

/** SCHOOL_BOARD rows are (Board, Class) containers for school content —
 *  "NOT real entrance exams" (schema.prisma). They get no checklist page. */
export function hasChecklist(category: string | null | undefined): boolean {
  return (category ?? "").toUpperCase() !== "SCHOOL_BOARD";
}

// ── Checklist ────────────────────────────────────────────────────────────

export interface ChecklistExam {
  code: string;
  shortName: string;
  name: string;
  category: string;
  description: string | null;
  durationMin: number | null;
  totalQuestions: number;
  scoredQuestions: number | null;
  totalMarks: number;
  marksPerQ: number;
  negativeMark: number | null;
  languages: string[];
}

export interface ChecklistSubject {
  name: string;
  weight: number | null;
}

export interface ChecklistInput {
  exam: ChecklistExam;
  /** Subject rows in their real order (orderIdx asc). */
  subjects: ChecklistSubject[];
  /** ExamImportantDate rows, archived excluded. Dates may be ISO strings. */
  rows: TimelineInput[];
  /** ExamEligibility.officialUrl — widens the official tier + the portal link. */
  officialUrl: string | null;
  /** ExamEligibility.officialName. */
  officialName?: string | null;
  now?: Date;
  /** Localised tier word; defaults to English. */
  tierWord?: (tier: SourceTier) => string;
  locale?: string;
}

export interface ChecklistDate {
  kind: DateKind;
  label: string;
  /** IST calendar day, YYYY-MM-DD. */
  day: string;
  /** "13 Sep (official)", or "13 Sep — was expected — not confirmed". */
  dated: string;
  tier: SourceTier;
  /** An expected-tier date that has gone by with nothing announced. */
  passedEstimate: boolean;
  daysFromToday: number;
  url: string | null;
  /** Gold tier only — the link may say "Official notice". */
  official: boolean;
  notes: string | null;
}

export interface ChecklistNote {
  /** Date (with tier) of the row the note belongs to. */
  dated: string;
  tier: SourceTier;
  text: string;
}

export interface ChecklistSection {
  name: string;
  /** Question count — only when the stored weights ARE counts. Relative
   *  syllabus weights (seeded or AI-estimated) never become a number. */
  questions: number | null;
}

/** The AI syllabus seeder clamps Subject.weight to [0.1, 5]
 *  (src/lib/ai/syllabus.ts). A weight set whose largest value is within
 *  that cap could be a model estimate, so it is never read as counts. */
export const AI_SEEDED_WEIGHT_MAX = 5;

export interface ChecklistPattern {
  /** exam.name — the paper the stored pattern describes. */
  paper: string;
  /** Questions asked (null when not on record). */
  questions: number | null;
  /** Questions that score, only when fewer than asked (NEET UG 180 of 200). */
  scoredQuestions: number | null;
  totalMarks: number | null;
  durationMin: number | null;
  /** "+2 per correct answer, −0.5 per wrong answer" — statable schemes only. */
  marking: string | null;
  /** Why the scheme cannot be stated (marking-scheme.ts reason), else null. */
  markingNote: string | null;
  /** The sitting in focus is a different stage from the stored pattern. */
  stageMismatch: string | null;
  description: string | null;
}

export interface ExamChecklist {
  state: ExamWeekState;
  phase: ExamWeekPhase;
  /** The exam-day row the checklist is about (focus, else next, else latest held). */
  examDay: ChecklistDate | null;
  /** One sentence about the exam day, tier word included; null when no typed exam day. */
  examDayLine: string | null;
  /** Days to the exam day when it is ahead, else null. */
  daysTo: number | null;
  /** Multi-day window: "12 Sep to 25 Sep (official)". */
  window: string | null;
  /** Notes (timings, reporting, shifts) from the exam-day rows, verbatim. */
  examNotes: ChecklistNote[];
  admitCard: ChecklistDate | null;
  /** Announced answer-key row for this sitting (expected keys never exist). */
  answerKey: ChecklistDate | null;
  result: ChecklistDate | null;
  /** Next exam day more than 14 days after this sitting (Tier 2 / Mains). */
  nextStage: ChecklistDate | null;
  pattern: ChecklistPattern;
  /** Subject names in order; `questions` set only when the weights are counts. */
  sections: ChecklistSection[];
  /** true → the list is the paper's sections with question counts;
   *  false → it is the subjects on our syllabus, names only. */
  sectionsAreCounts: boolean;
  /** Display names; empty when our records hold none (never guessed). */
  languages: string[];
  carry: readonly CarryItem[];
  portal: { url: string; name: string } | null;
}

function dayDiff(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(toDay + "T00:00:00Z") - Date.parse(fromDay + "T00:00:00Z")) / DAY_MS);
}

function localeTag(locale: string): string {
  return locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN";
}

/** "13 Sep", plus the year when it is not the current IST year. */
function dayText(date: Date, now: Date, locale: string): string {
  const d = new Date(date.getTime() + IST_OFFSET_MS);
  const sameYear = d.getUTCFullYear() === new Date(now.getTime() + IST_OFFSET_MS).getUTCFullYear();
  return d.toLocaleDateString(localeTag(locale), {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" as const }),
    timeZone: "UTC",
  });
}

/** 2 → "2", 0.25 → "0.25", 0.333 → "0.33". */
function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}

function isTyped(r: TimelineInput): boolean {
  return typeof r.kind === "string" && r.kind.trim().length > 0;
}

function toDate(row: TimelineRow, tierWord: (t: SourceTier) => string, now: Date, locale: string): ChecklistDate {
  const day = dayText(row.date, now, locale);
  return {
    kind: row.kind,
    label: row.label,
    day: istDay(row.date),
    dated: row.passedEstimate ? `${day} — ${PASSED_ESTIMATE_TEXT}` : `${day} (${tierWord(row.tier)})`,
    tier: row.tier,
    passedEstimate: row.passedEstimate,
    daysFromToday: row.daysFromToday,
    url: row.url,
    official: row.official,
    notes: row.notes?.trim() || null,
  };
}

/** Subject names in order, with a question count ONLY when the stored
 *  weights are counts: all positive integers, adding up to the scored
 *  count, and at least one above AI_SEEDED_WEIGHT_MAX. Relative weights
 *  never become a share — they are syllabus estimates, not the paper. */
export function checklistSections(subjects: ChecklistSubject[], scored: number | null): ChecklistSection[] {
  const subs = subjects
    .map((s) => ({ name: (s.name ?? "").trim(), weight: s.weight == null ? NaN : Number(s.weight) }))
    .filter((s) => s.name.length > 0);
  if (subs.length === 0) return [];
  const areCounts =
    scored != null &&
    scored > 0 &&
    subs.every((s) => Number.isInteger(s.weight) && s.weight > 0) &&
    subs.some((s) => s.weight > AI_SEEDED_WEIGHT_MAX) &&
    subs.reduce((a, s) => a + s.weight, 0) === scored;
  return subs.map((s) => ({ name: s.name, questions: areCounts ? s.weight : null }));
}

export function buildExamChecklist(input: ChecklistInput): ExamChecklist {
  const now = input.now ?? new Date();
  const locale = input.locale ?? "en";
  const tierWord = input.tierWord ?? ((t: SourceTier) => TIER_WORD_EN[t]);
  const { exam } = input;

  const typed = input.rows.filter(isTyped);
  const timeline = buildTimeline(typed, now, input.officialUrl);
  const state = computeExamWeekState(typed, input.officialUrl, now);
  const date = (r: TimelineRow | null | undefined) => (r ? toDate(r, tierWord, now, locale) : null);

  // ── Exam day ──────────────────────────────────────────────────────────
  const examRow = state.focus ?? focusExamRow(timeline);
  const examDay = date(examRow);
  const firstDay = state.windowDays[0] ?? examRow;
  const lastDay = state.windowEnd ?? examRow;
  const windowText =
    state.windowDays.length > 1 && firstDay && lastDay
      ? `${dayText(firstDay.date, now, locale)} to ${dayText(lastDay.date, now, locale)} (${
          firstDay.tier === lastDay.tier ? tierWord(lastDay.tier) : `${tierWord(firstDay.tier)} / ${tierWord(lastDay.tier)}`
        })`
      : null;
  const daysTo = examDay && examDay.daysFromToday > 0 ? examDay.daysFromToday : null;
  const announced = !!examDay && examDay.tier !== "expected";

  let examDayLine: string | null = null;
  if (examDay) {
    const d = examDay.dated;
    if (examDay.passedEstimate) {
      examDayLine = `Exam day: ${d}. No date has been announced since — check the official portal.`;
    } else if (state.phase === "week") {
      examDayLine = `Exam on ${d} — ${daysTo} days to go.`;
    } else if (state.phase === "eve") {
      examDayLine = `Exam tomorrow, ${d}.`;
    } else if ((state.phase === "today-am" || state.phase === "today-pm") && announced) {
      examDayLine = `Exam today, ${d}.`;
    } else if (state.phase === "window" && announced && windowText) {
      examDayLine = `Exam window: ${windowText}. Your shift day is on your admit card.`;
    } else if (state.phase === "post" && announced) {
      examDayLine = `The paper was held on ${d}.`;
    } else if (examDay.daysFromToday >= 0) {
      examDayLine = examDay.daysFromToday === 0 ? `Exam day: ${d}.` : `Next exam day: ${d}${daysTo ? ` — ${daysTo} days to go` : ""}.`;
    } else {
      examDayLine = `Most recent exam day on our tracker: ${d}.`;
    }
  }

  // Timings / reporting / shift notes from the exam-day rows of this sitting.
  const noteRows = [examRow, ...state.windowDays].filter((r): r is TimelineRow => !!r && !!r.notes?.trim());
  const seenNotes = new Set<string>();
  const examNotes: ChecklistNote[] = [];
  for (const r of noteRows) {
    const text = r.notes!.trim().slice(0, NOTE_MAX_CHARS);
    if (seenNotes.has(text)) continue;
    seenNotes.add(text);
    examNotes.push({ dated: toDate(r, tierWord, now, locale).dated, tier: r.tier, text });
    if (examNotes.length >= 3) break;
  }

  // ── Admit card for this sitting ───────────────────────────────────────
  const admitRows = timeline.filter((r) => r.kind === "ADMIT_CARD");
  let admitRow: TimelineRow | null = null;
  if (firstDay) {
    const before = admitRows.filter((r) => r.day <= firstDay.day && dayDiff(r.day, firstDay.day) <= ADMIT_LOOKBACK_DAYS);
    admitRow = before[before.length - 1] ?? null;
  } else {
    admitRow = admitRows.find((r) => r.status !== "done") ?? null;
  }

  // ── After the paper: key / result / next stage ────────────────────────
  const afterSitting = (kind: DateKind) =>
    firstDay ? timeline.find((r) => r.kind === kind && r.day >= firstDay.day) ?? null : null;
  const nextStageRow =
    state.nextStage ??
    (lastDay ? timeline.find((r) => r.kind === "EXAM" && dayDiff(lastDay.day, r.day) > STAGE_GAP_DAYS) ?? null : null);

  // ── Pattern ───────────────────────────────────────────────────────────
  const questions = exam.totalQuestions > 0 ? exam.totalQuestions : null;
  const scored = questions ? scoredCount({ totalQuestions: exam.totalQuestions, scoredQuestions: exam.scoredQuestions }) : null;
  const schemeInput = {
    totalQuestions: exam.totalQuestions,
    scoredQuestions: exam.scoredQuestions,
    totalMarks: exam.totalMarks,
    marksPerQ: exam.marksPerQ,
    description: exam.description ?? "",
    code: exam.code,
    name: exam.name,
    shortName: exam.shortName,
  };
  const rowOpts = { rowLabel: examRow?.label ?? null, rowDate: examRow?.date ?? null };
  const verdict = markingSchemeVerdict(schemeInput, rowOpts);
  const neg = Number(exam.negativeMark ?? 0);
  const marking = verdict.ok
    ? `+${num(exam.marksPerQ)} per correct answer, ${
        neg > 0 ? `−${num(neg)} per wrong answer` : "no negative mark on our records — confirm it in the official notice"
      }`
    : null;

  const pattern: ChecklistPattern = {
    paper: exam.name,
    questions,
    scoredQuestions: scored != null && questions != null && scored < questions ? scored : null,
    totalMarks: exam.totalMarks > 0 ? exam.totalMarks : null,
    durationMin: exam.durationMin != null && exam.durationMin > 0 ? exam.durationMin : null,
    marking,
    markingNote: verdict.ok ? null : verdict.reason,
    stageMismatch: stageMismatchReason(schemeInput, rowOpts.rowLabel, rowOpts.rowDate),
    description: exam.description?.trim() || null,
  };

  const sections = checklistSections(input.subjects, scored);

  const portalUrl = input.officialUrl && /^https?:\/\//i.test(input.officialUrl) ? input.officialUrl : null;
  let portalName = input.officialName?.trim() || null;
  if (portalUrl && !portalName) {
    try {
      portalName = new URL(portalUrl).hostname.replace(/^www\./, "");
    } catch {
      portalName = portalUrl;
    }
  }

  return {
    state,
    phase: state.phase,
    examDay,
    examDayLine,
    daysTo,
    window: windowText,
    examNotes,
    admitCard: date(admitRow),
    answerKey: date(afterSitting("ANSWER_KEY")),
    result: date(afterSitting("RESULT")),
    nextStage: date(nextStageRow),
    pattern,
    sections,
    sectionsAreCounts: sections.some((s) => s.questions != null),
    languages: [...new Set(exam.languages.map((l) => LANGUAGE_NAMES[l.toUpperCase()] ?? l))],
    carry: carryListFor(exam.category),
    portal: portalUrl ? { url: portalUrl, name: portalName ?? portalUrl } : null,
  };
}

/** One-line pattern summary: "100 questions, 200 marks, 60 minutes". */
export function patternSummary(p: ChecklistPattern): string | null {
  const parts: string[] = [];
  if (p.questions != null) parts.push(`${p.questions} questions${p.scoredQuestions != null ? ` (${p.scoredQuestions} scored)` : ""}`);
  if (p.totalMarks != null) parts.push(`${num(p.totalMarks)} marks`);
  if (p.durationMin != null) parts.push(`${p.durationMin} minutes`);
  return parts.length ? parts.join(", ") : null;
}

export const META_DESCRIPTION_MAX = 300;
export const OG_DESCRIPTION_MAX = 200;

/** First candidate that fits `max`. Candidates are whole sentences, so a
 *  number or a hedge is never cut; the last one is the short fallback. */
function firstFitting(candidates: string[], max: number): string {
  return candidates.find((x) => x.length <= max) ?? candidates[candidates.length - 1];
}

/** <title>, meta description and share-preview (og) description for the
 *  checklist route — the same facts the body prints, never a sliced clause.
 *  The stored pattern's figures stay out when the sitting in focus is a
 *  different stage (the body shows them only under its amber warning). */
export function examChecklistMeta(
  exam: Pick<ChecklistExam, "shortName" | "name">,
  c: ExamChecklist,
): { title: string; description: string; ogDescription: string } {
  const s = exam.shortName;
  const upcoming = c.examDay && !c.examDay.passedEstimate && c.examDay.daysFromToday >= 0 ? c.examDay.dated : null;
  const title = `${s} last-minute checklist${upcoming ? ` — exam ${upcoming}` : ""}: what to carry, admit card, pattern | Shishya`;
  const summary = c.pattern.stageMismatch ? null : patternSummary(c.pattern);
  const marking = c.pattern.stageMismatch ? null : c.pattern.marking;
  const tiers = "Every date carries its source tier — official, reported or expected. Free.";

  const lead = `Last-minute checklist for ${exam.name}: what to carry to the centre, admit card and reporting details`;
  const description = firstFitting(
    [
      ...(summary && marking ? [`${lead}, and the pattern on our records (${summary}; ${marking}). ${tiers}`] : []),
      ...(summary ? [`${lead}, and the pattern on our records (${summary}). ${tiers}`] : []),
      `${lead}. ${tiers}`,
      `${s} last-minute checklist: what to carry, admit card and reporting details. ${tiers}`,
    ],
    META_DESCRIPTION_MAX,
  );
  // Share previews (WhatsApp / Telegram) are screenshotted and forwarded:
  // no marking clause at all, the pattern only when it fits whole.
  const ogDescription = firstFitting(
    [
      ...(summary ? [`What to carry, admit card and reporting details, and the pattern on our records (${summary}). ${tiers}`] : []),
      `What to carry, admit card and reporting details, and the exam pattern on our records. ${tiers}`,
      `What to carry, admit card, exam pattern. Free.`,
    ],
    OG_DESCRIPTION_MAX,
  );
  return { title, description, ogDescription };
}

// ── Homepage "Exams today" strip ─────────────────────────────────────────

export interface StripRowInput {
  id: string;
  examCode: string;
  examShort: string;
  label: string;
  date: Date | string;
  kind: string | null;
  confidence: string | null;
  url: string | null;
  source: string | null;
  notes: string | null;
  /** ExamEligibility.officialUrl of the row's exam. */
  officialUrl: string | null;
}

export interface StripItem {
  id: string;
  examCode: string;
  examShort: string;
  label: string;
  /** IST calendar day, YYYY-MM-DD. */
  day: string;
  tier: Exclude<SourceTier, "expected">;
  /** "13 Sep (official)". */
  dated: string;
  daysTo: number;
  /** Exam day only: the first shift has plausibly started ("how was it?"). */
  pollOpen: boolean;
}

export interface ExamsStrip {
  mode: "today" | "week" | "none";
  items: StripItem[];
  /** Items beyond the cap (the strip links the calendar for them). */
  more: number;
}

export const STRIP_MAX_ITEMS = 8;
const STRIP_WEEK_DAYS = 7;

/** Announced EXAM rows whose IST day is today; if none, the next 7 days'.
 *  Expected-tier rows never appear. `mode: "none"` → render nothing. */
export function pickExamsStrip(rows: StripRowInput[], now: Date = new Date(), max: number = STRIP_MAX_ITEMS): ExamsStrip {
  const today = istDay(now);
  const hour = istHour(now) + new Date(now.getTime() + IST_OFFSET_MS).getUTCMinutes() / 60;
  const best = new Map<string, StripItem>();
  for (const r of rows) {
    if ((r.kind ?? "").trim().toUpperCase() !== "EXAM") continue;
    const date = r.date instanceof Date ? r.date : new Date(r.date);
    if (!Number.isFinite(date.getTime())) continue;
    const url = r.url && /^https?:\/\//i.test(r.url) ? r.url : r.source && /^https?:\/\//i.test(r.source) ? r.source : null;
    const tier = sourceTier(r.confidence, url, r.officialUrl);
    if (tier === "expected") continue;
    const day = istDay(date);
    const daysTo = dayDiff(today, day);
    if (daysTo < 0 || daysTo > STRIP_WEEK_DAYS) continue;
    const start = firstShiftStartIst(`${r.label ?? ""}\n${r.notes ?? ""}`);
    const item: StripItem = {
      id: r.id,
      examCode: r.examCode,
      examShort: r.examShort,
      label: r.label,
      day,
      tier,
      dated: `${dayText(date, now, "en")} (${TIER_WORD_EN[tier]})`,
      daysTo,
      pollOpen: daysTo === 0 && (hour >= TODAY_PM_IST_HOUR || hour >= (start ?? POLL_DEFAULT_OPEN_IST_HOUR)),
    };
    const key = `${r.examCode}:${day}`;
    const prev = best.get(key);
    if (!prev || (prev.tier === "reported" && tier === "official")) best.set(key, item);
  }
  const all = [...best.values()];
  const todayItems = all.filter((i) => i.daysTo === 0);
  const pool = todayItems.length > 0 ? todayItems : all.filter((i) => i.daysTo > 0);
  if (pool.length === 0) return { mode: "none", items: [], more: 0 };
  pool.sort(
    (a, b) =>
      a.daysTo - b.daysTo ||
      (a.tier === b.tier ? 0 : a.tier === "official" ? -1 : 1) ||
      a.examShort.localeCompare(b.examShort),
  );
  return {
    mode: todayItems.length > 0 ? "today" : "week",
    items: pool.slice(0, max),
    more: Math.max(0, pool.length - max),
  };
}
