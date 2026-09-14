// Exam Week Mode — the cached tracker reads behind every page-level
// surface that needs an exam's phase but does not already load the
// tracker rows itself (the hub and the tracker do): the cutoff page, the
// score estimator, the .ics calendar file, the anonymous quiz pages and
// the live / reactions article routes (6 Sep 2026, wave 2).
//
// One unstable_cache entry per exam, 15 minutes — the exam-week
// boundaries (D-1 in, D+7 out, 18:00 IST flip) show up within the same
// window the cutoff page already promised. Cache hits hand Date fields
// back as ISO strings; buildTimeline / computeExamWeekState accept both.
//
// Also home to the two small helpers the alert-capture surfaces share so
// the quiz pages, the cutoff page and the estimator agree on WHEN an
// alert box may talk about "the answer key / result" (never on an
// expected-tier exam day after the run-up) and on the translated labels.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { computeExamWeekState, type ExamWeekPhase, type ExamWeekState } from "@/lib/exam-week";
import type { TimelineInput } from "@/lib/exam-timeline";
import type { StringKey } from "@/lib/i18n";
import type { ExamAlertLabels, ExamAlertWeekLabels } from "@/components/ExamAlertBox";

export interface ExamWeekInputs {
  /** ExamImportantDate rows, archived rows excluded (typed + legacy; the
   *  state machine ignores untyped rows itself). */
  rows: TimelineInput[];
  /** ExamEligibility.officialUrl — widens the official tier to the exam's portal. */
  officialUrl: string | null;
}

export const getExamWeekInputs = unstable_cache(
  async (examId: string): Promise<ExamWeekInputs> => {
    const [rows, elig] = await Promise.all([
      prisma.examImportantDate
        .findMany({
          where: { examId, archivedAt: null },
          orderBy: { date: "asc" },
          take: 60,
          select: { id: true, label: true, date: true, isExamDay: true, kind: true, confidence: true, url: true, notes: true, source: true },
        })
        .catch(() => [] as TimelineInput[]),
      prisma
        .$queryRaw<{ officialUrl: string | null }[]>`
          SELECT "officialUrl" FROM "ExamEligibility" WHERE "examId" = ${examId} LIMIT 1`
        .catch(() => [] as { officialUrl: string | null }[]),
    ]);
    return { rows, officialUrl: elig[0]?.officialUrl ?? null };
  },
  ["exam-week-inputs-v1"],
  { revalidate: 900, tags: ["exam-shared"] },
);

/** Exam-week state for an exam id (one cache read). */
export async function getExamWeekStateById(examId: string, now: Date = new Date()): Promise<ExamWeekState> {
  const { rows, officialUrl } = await getExamWeekInputs(examId);
  return computeExamWeekState(rows, officialUrl, now);
}

/** Exam-week state for an exam code (pages that only know the code, e.g.
 *  the anonymous quiz). Unknown code → phase "none". */
export async function getExamWeekStateByCode(code: string, now: Date = new Date()): Promise<ExamWeekState> {
  const exam = await prisma.exam.findUnique({ where: { code }, select: { id: true } }).catch(() => null);
  if (!exam) return computeExamWeekState([], null, now);
  return getExamWeekStateById(exam.id, now);
}

/** The phase an ALERT surface may act on. An expected-tier exam day is a
 *  countdown estimate: it may drive the run-up copy (week / eve) but never
 *  "the paper is done — alert me for the key", so those phases collapse to
 *  "none" (same rule as ExamWeekBlock and the cutoff block). */
export function alertPhase(state: ExamWeekState): ExamWeekPhase {
  if (state.tier === "expected" && state.phase !== "week" && state.phase !== "eve") return "none";
  return state.phase;
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Translated ExamAlertBox props — the tracker.alert.* labels plus the
 *  ew.alert.* answer-key / result wording and the "one email, no spam" note. */
export function examAlertLabels(
  t: (key: StringKey) => string,
  examShort: string,
): { labels: ExamAlertLabels; weekLabels: ExamAlertWeekLabels; note: string } {
  return {
    labels: {
      title: fill(t("tracker.alert.title"), { exam: examShort }),
      body: t("tracker.alert.body"),
      emailPlaceholder: t("tracker.alert.email"),
      btn: t("tracker.alert.btn"),
      btnSigned: fill(t("tracker.alert.btnSigned"), { exam: examShort }),
      done: t("tracker.alert.done"),
      invalid: t("tracker.alert.invalid"),
      err: t("tracker.alert.err"),
      // Phone notifications (13 Sep 2026, reach program #3).
      push: {
        cta: t("tracker.alert.push"),
        done: t("tracker.alert.pushDone"),
        denied: t("tracker.alert.pushDenied"),
        err: t("tracker.alert.pushErr"),
      },
    },
    weekLabels: { cta: t("ew.alert.cta"), done: t("ew.alert.done") },
    note: t("tracker.alert.body"),
  };
}
