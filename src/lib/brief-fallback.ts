// The daily brief without the model (16 Sep 2026).
//
// The nightly brief cron (src/app/api/cron/daily-brief/route.ts) asks the
// model for a 2-3 sentence note per enrollment. When that call fails (credit
// outage nights 12 and 14 Sep wrote no brief at all) the cron now stores a
// note built HERE from facts already on record:
//   • the weakest topics on record (WeaknessMap, ≥ 2 questions): the running
//     record, correctCount of attemptsCount — never masteryScore, which each
//     submit overwrites with THAT set's accuracy while attemptsCount keeps
//     adding up ("mastery 0% after 22 questions" for a 12/22 record; review,
//     16 Sep 2026),
//   • the last submitted mock's score on that exam,
//   • the next exam day on the tracker, with its tier word — the day the hub
//     title leads with (src/lib/hub-title.ts: announced only, none while a
//     same-stage row contradicts it), named for its own stage when the
//     exam's record is another stage ("IBPS PO Mains", not "IBPS PO", for a
//     Mains row on the Prelims exam; review, 16 Sep 2026),
//   • today's coach task (the dashboard fills it in at view time),
//   • whether a practice set is linked under the note.
// Pure — no DB, no model. A missing fact drops its sentence; nothing is
// estimated, rounded up or invented. The facts are stored on the brief
// (inputs.facts) so the dashboard re-renders the note in the reader's
// language instead of freezing the cron's English.

import { istDayNumber } from "@/lib/exam-phase";
import type { SourceTier } from "@/lib/official-source";
import { formatDisplayScorePct } from "@/lib/scoring";
import { declaredStages, sittingExamName, sittingStageLabel } from "@/lib/marking-scheme";

export type BriefLang = "en" | "hi" | "te";

/** DailyBrief.inputs.source for a note built here (model unavailable). */
export const RULE_BRIEF_SOURCE = "rule:ai-unavailable";

export interface BriefWeakTopic {
  name: string;
  /** WeaknessMap.attemptsCount — questions on the topic across submitted sets
   *  (a skipped question counts, as not right). */
  attemptsCount: number;
  /** WeaknessMap.correctCount — of those, answered right. */
  correctCount: number;
}

/** What the note may say. JSON-safe: stored as DailyBrief.inputs.facts. */
export interface BriefFacts {
  examShort: string;
  /** Lowest running accuracy (correctCount / attemptsCount) first; only
   *  topics with ≥ 2 questions on record. */
  weakest: BriefWeakTopic[];
  /** Latest submitted attempt on this exam; null = none on record. */
  lastScorePct: number | null;
  /** Next announced exam day on the tracker (ISO instant of the row's date)
   *  + tier. `sitting` names the exam for that day when the row is another
   *  stage than the exam's record ("IBPS PO Mains"); absent/null = the
   *  exam's own stage. */
  nextExam: { date: string; tier: SourceTier; sitting?: string | null } | null;
}

export interface BriefExtras {
  /** Today's coach task label for THIS exam (null = no plan / all done). */
  coachTask?: string | null;
  /** A practice set is linked under the note. */
  hasMock: boolean;
  now?: Date;
}

const COPY: Record<
  BriefLang,
  {
    tier: Record<SourceTier, string>;
    weak: string;
    noWeak: string;
    last: string;
    examToday: string;
    examTomorrow: string;
    examDays: string;
    coach: string;
    mockTopic: string;
    mock: string;
    hubTopic: string;
    hub: string;
  }
> = {
  en: {
    tier: { official: "official", reported: "reported", expected: "expected — not confirmed" },
    weak: "Your weakest {exam} topic on record is {topic}: {correct} of {n} questions right ({pct}%).",
    noWeak: "No {exam} topic has enough answered questions on record yet to name a weak spot.",
    last: "Your last {exam} mock: {score}.",
    examToday: "{exam} exam: today, {date} ({tier}).",
    examTomorrow: "{exam} exam: tomorrow, {date} ({tier}).",
    examDays: "{exam} exam: {date} ({tier}), {n} days to go.",
    coach: "Today's coach task: {task}.",
    mockTopic: "Today: take the practice set below, then revise {topic}.",
    mock: "Today: take the practice set below.",
    hubTopic: "Today: open the {exam} hub and practise {topic}.",
    hub: "Today: open the {exam} hub and take a short practice set.",
  },
  hi: {
    tier: { official: "आधिकारिक", reported: "रिपोर्टेड", expected: "अनुमानित — पुष्टि नहीं" },
    weak: "रिकॉर्ड के अनुसार आपका सबसे कमज़ोर {exam} टॉपिक {topic} है: {n} में से {correct} सवाल सही ({pct}%)।",
    noWeak: "अभी किसी {exam} टॉपिक में इतने सवाल हल नहीं हुए कि कमज़ोर हिस्सा बताया जा सके।",
    last: "आपका पिछला {exam} मॉक: {score}।",
    examToday: "{exam} परीक्षा: आज, {date} ({tier})।",
    examTomorrow: "{exam} परीक्षा: कल, {date} ({tier})।",
    examDays: "{exam} परीक्षा: {date} ({tier}), {n} दिन बाकी।",
    coach: "आज का कोच टास्क: {task}।",
    mockTopic: "आज: नीचे दिया अभ्यास सेट करें, फिर {topic} दोहराएँ।",
    mock: "आज: नीचे दिया अभ्यास सेट करें।",
    hubTopic: "आज: {exam} हब खोलें और {topic} का अभ्यास करें।",
    hub: "आज: {exam} हब खोलें और एक छोटा अभ्यास सेट करें।",
  },
  te: {
    tier: { official: "అధికారిక", reported: "నివేదిత", expected: "అంచనా — నిర్ధారించలేదు" },
    weak: "రికార్డు ప్రకారం మీ బలహీనమైన {exam} టాపిక్ {topic}: {n} ప్రశ్నల్లో {correct} సరైనవి ({pct}%).",
    noWeak: "బలహీన అంశాన్ని చెప్పేంత ప్రశ్నలు ఇంకా ఏ {exam} టాపిక్‌లోనూ రికార్డులో లేవు.",
    last: "మీ చివరి {exam} మాక్: {score}.",
    examToday: "{exam} పరీక్ష: ఈరోజు, {date} ({tier}).",
    examTomorrow: "{exam} పరీక్ష: రేపు, {date} ({tier}).",
    examDays: "{exam} పరీక్ష: {date} ({tier}), ఇంకా {n} రోజులు.",
    coach: "ఈరోజు కోచ్ టాస్క్: {task}.",
    mockTopic: "ఈరోజు: కింద ఉన్న ప్రాక్టీస్ సెట్ చేయండి, తర్వాత {topic} రివైజ్ చేయండి.",
    mock: "ఈరోజు: కింద ఉన్న ప్రాక్టీస్ సెట్ చేయండి.",
    hubTopic: "ఈరోజు: {exam} హబ్ తెరిచి {topic} ప్రాక్టీస్ చేయండి.",
    hub: "ఈరోజు: {exam} హబ్ తెరిచి ఒక చిన్న ప్రాక్టీస్ సెట్ చేయండి.",
  },
};

const IST_OFFSET_MS = 5.5 * 3600_000;

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** The row's IST calendar day, e.g. "18 Sept" — same rendering as
 *  dateWithTier (src/lib/exam-week.ts). */
function examDay(d: Date, lang: BriefLang): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toLocaleDateString(
    lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : "en-IN",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );
}

/** A topic's record is usable: a name and 0 ≤ correct ≤ questions, questions > 0. */
function validRecord(w: BriefWeakTopic): boolean {
  return (
    !!w.name &&
    Number.isInteger(w.attemptsCount) &&
    Number.isInteger(w.correctCount) &&
    w.attemptsCount > 0 &&
    w.correctCount >= 0 &&
    w.correctCount <= w.attemptsCount
  );
}

/** Weakest first on the running record: lowest share right, then more
 *  questions (a firmer record), then name. For the cron's WeaknessMap rows. */
export function rankWeakTopics<T extends BriefWeakTopic>(rows: T[]): T[] {
  return rows
    .filter(validRecord)
    .sort(
      (a, b) =>
        a.correctCount / a.attemptsCount - b.correctCount / b.attemptsCount ||
        b.attemptsCount - a.attemptsCount ||
        a.name.localeCompare(b.name),
    );
}

/** The exam's short name for an exam-day row of ANOTHER stage than the
 *  exam's record names (src/lib/marking-scheme.ts rule 4): "IBPS PO" + a
 *  "Mains exam" row on "IBPS Probationary Officer (Prelims)" → "IBPS PO
 *  Mains"; "UPSC Prelims" + "Mains exam begins" → "UPSC Mains". Null when
 *  the stages agree or either side is silent. */
export function briefSittingName(
  exam: { code: string; name: string; shortName: string },
  rowLabel: string,
): string | null {
  const stage = sittingStageLabel(exam, rowLabel);
  if (!stage) return null;
  if (declaredStages(exam.shortName).size === 0) return `${exam.shortName} ${stage}`;
  // The short name carries the other stage itself: swap it, never "UPSC Prelims Mains".
  const swapped = sittingExamName({ code: exam.code, name: exam.shortName, shortName: exam.shortName }, rowLabel);
  return swapped && swapped !== exam.shortName ? swapped : null;
}

/** The note, one sentence per known fact. */
export function buildFallbackBrief(facts: BriefFacts, extras: BriefExtras, lang: BriefLang = "en"): string {
  const c = COPY[lang] ?? COPY.en;
  const now = extras.now ?? new Date();
  const exam = facts.examShort;
  const out: string[] = [];

  const weak = facts.weakest.find(validRecord) ?? null;
  out.push(
    weak
      ? fill(c.weak, {
          exam,
          topic: weak.name,
          correct: weak.correctCount,
          n: weak.attemptsCount,
          pct: Math.round((100 * weak.correctCount) / weak.attemptsCount),
        })
      : fill(c.noWeak, { exam }),
  );

  if (facts.lastScorePct != null && Number.isFinite(facts.lastScorePct)) {
    out.push(fill(c.last, { exam, score: formatDisplayScorePct(facts.lastScorePct) }));
  }

  if (facts.nextExam) {
    const d = new Date(facts.nextExam.date);
    const days = Number.isNaN(d.getTime()) ? -1 : istDayNumber(d) - istDayNumber(now);
    const tier = c.tier[facts.nextExam.tier];
    if (days >= 0 && tier) {
      const date = examDay(d, lang);
      const sitting = facts.nextExam.sitting?.trim() || exam;
      out.push(
        days === 0
          ? fill(c.examToday, { exam: sitting, date, tier })
          : days === 1
            ? fill(c.examTomorrow, { exam: sitting, date, tier })
            : fill(c.examDays, { exam: sitting, date, tier, n: days }),
      );
    }
  }

  const task = extras.coachTask?.trim().replace(/[.。।]+$/, "");
  if (task) out.push(fill(c.coach, { task }));
  else if (extras.hasMock) out.push(weak ? fill(c.mockTopic, { topic: weak.name }) : c.mock);
  else out.push(weak ? fill(c.hubTopic, { exam, topic: weak.name }) : fill(c.hub, { exam }));

  return out.join(" ");
}

/** Read stored facts back (DailyBrief.inputs). Null unless the brief was
 *  built by the rule path AND its facts have the expected shape. */
export function storedBriefFacts(inputs: unknown): BriefFacts | null {
  if (!inputs || typeof inputs !== "object") return null;
  const i = inputs as { source?: unknown; facts?: unknown };
  if (i.source !== RULE_BRIEF_SOURCE || !i.facts || typeof i.facts !== "object") return null;
  const f = i.facts as Record<string, unknown>;
  if (typeof f.examShort !== "string" || !f.examShort || !Array.isArray(f.weakest)) return null;
  const weakest: BriefWeakTopic[] = [];
  for (const w of f.weakest) {
    const r = w as Record<string, unknown> | null;
    if (r && typeof r.name === "string" && typeof r.attemptsCount === "number" && typeof r.correctCount === "number") {
      weakest.push({ name: r.name, attemptsCount: r.attemptsCount, correctCount: r.correctCount });
    }
  }
  const ne = f.nextExam as Record<string, unknown> | null | undefined;
  const nextExam =
    ne && typeof ne.date === "string" && (ne.tier === "official" || ne.tier === "reported" || ne.tier === "expected")
      ? { date: ne.date, tier: ne.tier as SourceTier, sitting: typeof ne.sitting === "string" && ne.sitting ? ne.sitting : null }
      : null;
  return {
    examShort: f.examShort,
    weakest,
    lastScorePct: typeof f.lastScorePct === "number" ? f.lastScorePct : null,
    nextExam,
  };
}

/** The dashboard locale → the three languages the note is written in. */
export function briefLang(locale: string): BriefLang {
  return locale === "hi" || locale === "te" ? locale : "en";
}
