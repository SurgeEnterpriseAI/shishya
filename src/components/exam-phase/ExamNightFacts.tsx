// ExamNightFacts — the first-party block that LEADS /exams/[code]/live and
// /exams/[code]/reactions (13 Sep 2026). Server component; every line is
// shaped by buildExamNightFacts (src/lib/exam-night-facts.ts) from our own
// rows — no model calls.
//
// Order (what an exam-night lander came for, first):
//   1. the exam day (or window) with its tier word — and its stage when the
//      day is another stage than the exam's record ("Exam day (Mains)"),
//      and "end date not announced" for an open-ended start row (16 Sep
//      2026); "all the best" before the first sitting is over
//   2. the "how was the paper?" poll — announced days only; the poll prints
//      its own tally from n >= 10, or "be among the first", and its share
//      line; the hardest-section votes only from the floor
//   3. answer-key / result status from the tracker (tier words, "not
//      announced yet"), OFFICIAL question papers linked, the next stage
//   4. links: score estimator (only when one marking scheme can be stated
//      for this sitting), the indicative cutoff page (labelled estimate,
//      not official), the PYQ-pattern set ("modelled on"), the full-length
//      pattern paper, the tracker, the calendar file
//   5. the alert box (answer-key / result wording after the paper) and the
//      share control
//
// No "last declared cutoff" box (review, 13 Sep 2026): the only cutoff text
// per result is ExamResult.cutoffNote, a model-written expectation, so it
// is never printed as a declared or official figure. See
// src/lib/exam-night-facts.ts.
//
// Labels come from the page's getT() so the poll speaks the reader's
// language; the handful of lines with no i18n key yet are English.

import Link from "next/link";
import type { Locale, StringKey } from "@/lib/i18n";
import { VERDICT_MIN_N } from "@/lib/exam-verdict";
import { examAlertLabels } from "@/lib/exam-week-inputs";
import {
  examNightShareMessage,
  type DatedFact,
  type ExamNightExam,
  type ExamNightFactsView,
} from "@/lib/exam-night-facts";
import { ExamVerdictPoll } from "@/components/ExamVerdictPoll";
import { ExamAlertBox } from "@/components/ExamAlertBox";
import { ShareExamButton } from "@/components/ShareExamButton";

type TFn = (key: StringKey) => string;

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function ExamNightFacts({
  facts,
  exam,
  slug,
  signedIn,
  t,
  locale,
}: {
  facts: ExamNightFactsView;
  exam: Pick<ExamNightExam, "code" | "shortName">;
  slug: "live" | "reactions";
  signedIn: boolean;
  t: TFn;
  locale: Locale;
}) {
  const short = exam.shortName;
  const code = exam.code;
  const pageUrl = `https://shishya.in/exams/${code}/${slug}`;
  const linkCls =
    "inline-flex items-center gap-1 rounded-full border border-saffron-300 bg-white px-3 py-1 text-xs font-semibold text-saffron-800 hover:bg-saffron-100";
  const aCls = "font-semibold text-saffron-700 hover:text-saffron-800";

  // "Official notice ↗" only for official-tier rows; "Source ↗" otherwise.
  const notice = (r: Pick<DatedFact, "url" | "official"> | null) =>
    r?.url ? (
      <>
        {" "}
        <a href={r.url} target="_blank" rel="nofollow noopener noreferrer" className={aCls}>
          {r.official ? t("tracker.officialNotice") : t("tracker.source")}
        </a>
      </>
    ) : null;

  const pollLabels = {
    prompt: facts.poll?.morning ? t("ew.today.done") : t("ew.today.pm"),
    easy: t("ew.verdict.easy"),
    moderate: t("ew.verdict.moderate"),
    tough: t("ew.verdict.tough"),
    section: t("ew.verdict.section"),
    thanks: t("ew.verdict.thanks"),
    tally: t("ew.verdict.tally"),
    few: t("ew.verdict.few"),
    err: t("tracker.alert.err"),
    nudge: t("ew.signup.nudge"),
    shareTally: t("ew.share.tally"),
    shareCta: t("ew.share.cta"),
    sharePre: t("ew.share.pre"),
    sharePreFirst: t("ew.share.preFirst"),
    shareCopy: t("ew.share.copy"),
    shareCopied: t("ew.share.copied"),
  };

  const alert = examAlertLabels(t, short);
  const keyMode = facts.alertPhase === "today-pm" || facts.alertPhase === "post";

  const pyqLabel = facts.pyq
    ? facts.pyq.total > 0
      ? fill(t("exam.pyq.partialLine"), { n: facts.pyq.count, year: facts.pyq.year, m: facts.pyq.total })
      : `${facts.pyq.count} PYQ-pattern questions modelled on the ${facts.pyq.year} paper`
    : null;

  return (
    <section
      aria-label={`${short} — ${t("tracker.title")}`}
      className="mt-6 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 px-4 py-4"
    >
      {/* 1. The exam day / window, with its tier word. */}
      {facts.window ? (
        <p className="text-sm font-bold text-ink-900">
          {/* Another stage's window names that stage, as the exam-day line
              does (16 Sep 2026: "APSC CCE Mains — Exam window: 9 Oct to
              11 Oct (reported)" on the Prelims-named exam's page). */}
          🎯 {facts.examDayStage ? `${short} ${facts.examDayStage} — ` : ""}
          {fill(t("ew.window.title"), facts.window)}
        </p>
      ) : facts.examDay ? (
        <p className="text-sm font-bold text-ink-900">
          🎯 {short} — {t("tracker.kind.EXAM")}
          {facts.examDayStage ? ` (${facts.examDayStage})` : ""}: {facts.examDay.dated}
          <span className="font-normal">{notice(facts.examDay)}</span>
        </p>
      ) : (
        <p className="text-sm font-bold text-ink-900">
          🎯 No typed {short} exam date is on our tracker yet.{" "}
          <Link href={`/exams/${code}/updates`} className={aCls}>
            {t("tracker.title")} →
          </Link>
        </p>
      )}
      {/* Open-ended start row (MP RAEO, 16 Sep 2026): no end date to print.
          English until an i18n key exists for it. */}
      {facts.state.openEnded && facts.announced && (
        <p className="mt-1 text-xs text-ink-700">End date not announced on the tracker — your shift day is on your admit card.</p>
      )}
      {facts.state.phase === "window" && facts.poll && <p className="mt-1 text-xs text-ink-700">{t("ew.window.tip")}</p>}
      {facts.pollPending && <p className="mt-1 text-sm text-ink-800">{t("ew.today.am")}</p>}

      {/* 2. Poll — announced days only; tally inside from n >= 10. */}
      {facts.poll && (
        <ExamVerdictPoll
          examCode={code}
          examDate={facts.poll.examDate}
          labels={pollLabels}
          sections={facts.sections}
          initialTally={facts.tally}
          minN={VERDICT_MIN_N}
          signedIn={signedIn}
          examShort={short}
          shareUrl={pageUrl}
          examDayLabel={facts.poll.examDayLabel}
          surface={slug}
        />
      )}
      {facts.hardestSections.length > 0 && (
        <p className="mt-1 text-xs text-ink-700">
          Hardest section (self-reported, not a prediction):{" "}
          {facts.hardestSections.map((x) => `${x.label} (${x.n})`).join(", ")}
        </p>
      )}

      {/* 3. Tracker status — dates with tier, never guessed. */}
      {facts.keyStatus && (
        <ul className="mt-3 space-y-1 border-t border-saffron-200 pt-3 text-sm text-ink-800">
          <li>
            🔑 {fill(t("ew.post.key"), { text: facts.answerKey ? facts.answerKey.dated : t("ew.post.notAnnounced") })}
            {notice(facts.answerKey)}
          </li>
          <li>
            📊 {fill(t("ew.post.result"), { text: facts.result ? facts.result.dated : t("ew.post.notAnnounced") })}
            {notice(facts.result)}
          </li>
          {facts.questionPapers.map((qp) => (
            <li key={qp.id}>
              📄 {qp.label}: {qp.dated}
              {notice(qp)}
            </li>
          ))}
          {facts.nextStage && (
            <li>
              ➡️ Next stage: {facts.nextStage.label} — {facts.nextStage.dated}
              {notice(facts.nextStage)}
            </li>
          )}
        </ul>
      )}

      {/* 4. Links — each only when its destination can honestly deliver.
          The only cutoff link is the indicative page, labelled estimate,
          not official. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {facts.estimator && (
          <Link href={`/exams/${code}/score-estimate`} className={linkCls}>
            🧮 {t("ew.score.when")}
          </Link>
        )}
        {facts.hasCutoffPage && (
          <Link href={`/exams/${code}/cutoff`} className={linkCls}>
            🎯 {t("ew.post.cutoff")}
            <span className="font-normal text-ink-600">· {t("ew.cutoff.lastCycle")}</span>
          </Link>
        )}
        {facts.pyq && pyqLabel && (
          <Link href={`/exams/${code}/pyq/${facts.pyq.year}`} prefetch={false} className={linkCls}>
            📝 {pyqLabel}
          </Link>
        )}
        {facts.fullMockId && (
          <Link href={`/mocks/${facts.fullMockId}`} prefetch={false} className={linkCls}>
            📝 {t("ew.week.paper")}
          </Link>
        )}
        <Link href={`/exams/${code}/updates`} className={linkCls}>
          🗓️ {t("tracker.title")}
        </Link>
        <a href={`/exams/${code}/exam-week.ics`} rel="nofollow" className={linkCls}>
          📅 {t("ew.ics.dates")}
        </a>
      </div>
      <p className="mt-1 text-xs text-ink-600">{t("ew.ics.note")}</p>

      {/* 6. Things to keep: alert + share. */}
      <div className="mt-3">
        <ExamAlertBox
          examCode={code}
          signedIn={signedIn}
          compact
          labels={alert.labels}
          phase={facts.alertPhase}
          weekLabels={
            keyMode ? { cta: facts.answerKey ? t("ew.alert.cta") : t("ew.alert.key"), done: t("ew.alert.done") } : undefined
          }
          note={alert.note}
        />
      </div>
      <div className="mt-3" lang={locale === "en" ? undefined : "en"}>
        <ShareExamButton url={pageUrl} message={examNightShareMessage(short, facts)} surface={slug} exam={code} />
      </div>
    </section>
  );
}
