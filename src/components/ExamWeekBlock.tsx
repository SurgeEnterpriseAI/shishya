// ExamWeekBlock — the exam-week state line on the exam hub and the
// tracker (6 Sep 2026, Exam Week Mode). Server component.
//
// Replaces the hub's countdown chip, which vanished at 05:30 IST on exam
// day — exactly when the page had the most visitors. One card whose
// content is decided by computeExamWeekState (src/lib/exam-week.ts):
//
//   week      exam date (tier) + days to go + checklist / real-pattern
//             paper / ask-the-tutor links + the .ics calendar link + the
//             compact "get alerted" box (11 Sep 2026: an anonymous
//             visitor used to leave the run-up with nothing to keep)
//   eve       tomorrow's date (tier) + the no-new-topics tip + reporting
//             line when the tracker holds an OFFICIAL admit-card row,
//             plus the same .ics link + alert box
//   today-am  good luck; once the first sitting is over (examDayPollOpen:
//             the end of the EXAM row's first time range, else noon IST)
//             the poll joins it as "Done with your paper? Tell us how it
//             was" — NDA ends 16:30, SBI PO Mains is a morning sitting,
//             and the fixed 18:00 gate asked hours too late
//   today-pm  "How was the paper?" poll + tally, the answer-key alert box
//             ("not announced yet — one email when it is") and, only when
//             sittingVerdict(exam, rows) is ok, the score-estimator link
//   window    window dates (tier) + shift tip + poll + tally
//   post      answer key / result (tracker dates with tier, or "not
//             announced yet" — never guessed), cutoff link, estimator link
//             (statable only), one-tap alert, next exam in the same track,
//             weakest-topic quiz, and the poll again so the day-after
//             mail's ?verdict= link lands
//   none      renders nothing (no DB reads either)
//
// Wave 2 (6 Sep 2026): a SIGNED-IN, ENROLLED student inside a multi-day
// CBT window gets a ShiftDayPicker (one chip per announced window day);
// once Enrollment.shiftDate is set the block's phase and the poll key off
// THAT day (applyShiftDay) — "week/eve" while their shift is ahead, the
// poll on their night, "post" after it, even while the window keeps
// running for everyone else. Anonymous visitors see nothing new.
//
// Honesty rules: every date carries its source tier word; answer-key and
// result dates come only from the tracker; the tally is counts from
// n >= 10 and is never called a prediction; no per-student model calls —
// everything here is a deterministic DB read.
//
// 16 Sep 2026 (MP RAEO / KSRP exam week):
//   • every sitting of the focus day is listed (sittingsOn) — KSRP's
//     10:30–12:00 and 15:00–16:30 official sittings, not whichever row
//     came first
//   • an open-ended start row (state.openEnded) reads "exam began {date};
//     end date not announced" instead of an invented window end, and keeps
//     what the post week carried: the answer-key / result status lines and
//     the answer-key alert box (review: RAEO's hub lost both for the week)
//   • the real-pattern paper chip hides when the sitting is another stage
//     (fullPaperFitsSitting — the checklist's rule); the estimator link uses
//     the row-aware sittingVerdict the /score-estimate page itself uses
//   • the post-phase cutoff link renders only when /cutoff does
//     (examPageGates); "Reporting:" only for notes that read as reporting
//     instructions; no second ↗ after strings that already carry one

import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db/prisma";
import { tFor } from "@/lib/i18n-server";
import type { Locale, StringKey } from "@/lib/i18n";
import { localizedPath, localizedUrl, type PageLocale } from "@/lib/seo-locale";
import {
  admitNotesAreReporting,
  alertCopyPhase,
  computeExamWeekState,
  dateWithTier,
  examDayPollOpen,
  istDay,
  sittingsOn,
} from "@/lib/exam-week";
import { applyShiftDay, shiftableDays } from "@/lib/exam-week-student";
import { buildTimeline, type SourceTier, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import { passedEstimateLine, passedEstimateView, sourceTier, supersedingRow } from "@/lib/official-source";
import { getVerdictTally, publicTally, VERDICT_MIN_N } from "@/lib/exam-verdict";
import { fullPaperFitsSitting } from "@/lib/marking-scheme";
import { sittingVerdict } from "@/lib/score-sitting";
import { examPageGates } from "@/lib/exam-page-gates";
import { ExamAlertBox } from "@/components/ExamAlertBox";
import { ExamVerdictPoll } from "@/components/ExamVerdictPoll";
import { ShiftDayPicker } from "@/components/ShiftDayPicker";

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Bare "13 Sep" for templates that carry their own "({tier})" slot. Same
 *  IST shift + formatting as dateWithTier so the two never disagree. */
function dayLabel(date: Date, locale: string): string {
  const d = new Date(date.getTime() + IST_OFFSET_MS);
  return d.toLocaleDateString(locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export interface ExamWeekBlockProps {
  /** `name` (Exam.name) carries the stage the stored pattern describes
   *  ("SBI Probationary Officer (Prelims)") for the full-paper chip's stage
   *  check. Optional while callers catch up: when omitted, the block reads
   *  it itself in the week phase (one small query). */
  exam: { id: string; code: string; shortName: string; category: string; state: string | null; name?: string | null };
  /** ExamImportantDate rows, archived rows already excluded. Dates may be
   *  ISO strings (unstable_cache hits) — buildTimeline coerces. */
  rows: TimelineInput[];
  /** ExamEligibility.officialUrl — widens the official tier to the exam's portal. */
  officialUrl: string | null;
  /** UI language (getT().locale). */
  locale: Locale;
  /** URL locale for /hi and /te link twins. */
  urlLocale?: PageLocale;
  signedIn: boolean;
  /** Signed-in student's weakest topic code on this exam, when the page
   *  already knows it (hub). Omitted → no weak-topic link. */
  weakTopicCode?: string | null;
  /** The tracker page carries its own alert box — pass false there. */
  showAlert?: boolean;
  /** The signed-in student's relationship to this exam (wave 2). Omitted /
   *  null for anonymous visitors → no shift picker, shared phase. */
  viewer?: ExamWeekViewer | null;
  /** Which page mounts the block — travels on the poll's vote / share
   *  events. Defaults to "hub", or "tracker" when showAlert is false. */
  surface?: "hub" | "tracker";
}

export interface ExamWeekViewer {
  /** Has an Enrollment row on this exam. */
  enrolled: boolean;
  /** Enrollment.shiftDate as IST "YYYY-MM-DD" (shiftDayIso), or null. */
  shiftDay: string | null;
}

export async function ExamWeekBlock({
  exam,
  rows,
  officialUrl,
  locale,
  urlLocale = "en",
  signedIn,
  weakTopicCode = null,
  showAlert = true,
  viewer = null,
  surface = showAlert ? "hub" : "tracker",
}: ExamWeekBlockProps) {
  const now = new Date();
  const base = computeExamWeekState(rows, officialUrl, now);
  if (base.phase === "none") return null;
  // A stored shift day re-keys the phase for THIS student only; the base
  // state still decides that the block mounts at all.
  const state = signedIn && viewer?.shiftDay ? applyShiftDay(base, viewer.shiftDay, now) : base;
  if (state.phase === "none" || !state.focus || !state.focusDay) return null;

  const t = tFor(locale) as (key: StringKey) => string;
  const tierWord = (tier: SourceTier) => t(`ew.tier.${tier}` as StringKey);
  const p = (rel: string) => localizedPath(rel, urlLocale);
  const short = exam.shortName;
  const linkCls =
    "inline-flex items-center gap-1 rounded-full border border-saffron-300 bg-white px-3 py-1 text-xs font-semibold text-saffron-800 hover:bg-saffron-100";
  const focus = state.focus;
  const tier = state.tier ?? focus.tier;
  const { phase } = state;
  // An "expected" exam day is an estimate, not an announcement. Show the
  // countdown with its tier word in the run-up, but never ask "how was the
  // paper?" or say the exam is done on a date nobody has confirmed.
  if (tier === "expected" && phase !== "week" && phase !== "eve") return null;

  const pollLabels = {
    prompt: t("ew.today.pm"),
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

  // ── Things a visitor can KEEP (11 Sep 2026) ─────────────────────────
  // The .ics calendar link (every tracker date with its tier word; missing
  // dates omitted, never invented) and the email-keyed alert box. Before
  // the paper the box carries the standard "Get alerted for {exam}" copy;
  // on exam night and after it, the answer-key / result promise — with
  // "not announced yet — one email when it is" while the tracker holds no
  // key row. Both respect showAlert (the tracker page has its own box).
  const icsLink = (
    <a href={`/exams/${exam.code}/exam-week.ics`} rel="nofollow" className={linkCls}>
      📅 {t("ew.ics.dates")}
    </a>
  );
  const alertBox = (mode: "get" | "key") =>
    showAlert ? (
      <div className="mt-3">
        <ExamAlertBox
          examCode={exam.code}
          signedIn={signedIn}
          compact
          phase={mode === "key" ? alertCopyPhase(phase, state) : undefined}
          weekLabels={
            mode === "key"
              ? { cta: state.answerKey ? t("ew.alert.cta") : t("ew.alert.key"), done: t("ew.alert.done") }
              : undefined
          }
          labels={{
            title: mode === "key" ? t("ew.alert.cta") : fill(t("tracker.alert.title"), { exam: short }),
            body: t("tracker.alert.body"),
            emailPlaceholder: t("tracker.alert.email"),
            btn: t("tracker.alert.btn"),
            btnSigned: mode === "key" ? `🔔 ${t("tracker.alert.btn")}` : fill(t("tracker.alert.btnSigned"), { exam: short }),
            done: mode === "key" ? t("ew.alert.done") : t("tracker.alert.done"),
            invalid: t("tracker.alert.invalid"),
            err: t("tracker.alert.err"),
            push: {
              cta: t("tracker.alert.push"),
              done: t("tracker.alert.pushDone"),
              denied: t("tracker.alert.pushDenied"),
              err: t("tracker.alert.pushErr"),
            },
          }}
        />
      </div>
    ) : null;

  // Shift-day picker: signed-in + enrolled, a window with more than one
  // announced day, and the window itself not yet over (base phase). The
  // chips are the BASE window's days, so a student who picked the wrong
  // day — and whose own phase is therefore already "post" — can still
  // change it while the window runs.
  const shiftDays = base.windowDays.length > 1 ? shiftableDays(base) : [];
  const picker =
    signedIn && viewer?.enrolled && shiftDays.length > 1 && base.phase !== "post" ? (
      <ShiftDayPicker
        examCode={exam.code}
        days={shiftDays.map((r) => ({ iso: istDay(r.date), label: dateWithTier(r, tierWord(r.tier), locale) }))}
        initial={viewer.shiftDay && shiftDays.some((r) => istDay(r.date) === viewer.shiftDay) ? viewer.shiftDay : null}
        labels={{
          prompt: t("ew.shift.prompt"),
          save: t("ew.shift.save"),
          saved: t("ew.shift.saved"),
          change: t("ew.shift.change"),
          err: t("tracker.alert.err"),
        }}
      />
    ) : null;

  // Every sitting of the focus day, when there is more than one (KSRP,
  // 20 Sep 2026: two official sittings in different regions and hours).
  // Row labels are tracker text, printed verbatim with the day's tier.
  const sittings = sittingsOn(state.windowDays, state.focusDay);
  const sittingsList =
    sittings.length > 1 ? (
      <ul className="mt-1 space-y-0.5 text-xs text-ink-700">
        {sittings.map((r) => (
          <li key={r.id}>
            🕘 {r.label} ({tierWord(r.tier)})
          </li>
        ))}
      </ul>
    ) : null;

  const wrap = (children: ReactNode) => (
    <section
      aria-label={`${short} — ${t("tracker.title")}`}
      className="mt-5 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 px-4 py-3"
    >
      {children}
    </section>
  );

  // ── week ────────────────────────────────────────────────────────────
  if (phase === "week") {
    // The checklist link is unconditional since 13 Sep 2026: the page is
    // built from stored facts for every exam (src/lib/exam-checklist.ts)
    // instead of waiting for a cited article, and the eve mail links it the
    // same way (checklistLink, src/lib/exam-week-mail.ts).
    // The system full-pattern paper follows the STORED pattern: hidden when
    // the sitting in focus is another stage (16 Sep 2026: LA_LPSC's Prelims
    // paper was offered for an 18 Sep "Mains" row while /checklist hid it).
    // exam.name carries the stage; read it when the caller did not pass it.
    const [fullMock, examName] = await Promise.all([
      prisma.mock
        .findFirst({
          where: { examId: exam.id, userId: null, generatedBy: { startsWith: "system:full-pattern" } },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
        .catch(() => null),
      exam.name !== undefined
        ? Promise.resolve(exam.name)
        : prisma.exam
            .findUnique({ where: { id: exam.id }, select: { name: true } })
            .then((e) => e?.name ?? null)
            .catch(() => null),
    ]);
    const paperFits = fullPaperFitsSitting({ code: exam.code, name: examName, shortName: exam.shortName }, focus);
    const seed = `My ${short} exam is in ${state.daysTo} days. What should I revise and what should I skip?`;
    return wrap(
      <>
        <p className="text-sm font-bold text-ink-900">
          🎯 {fill(t("ew.week.title"), { date: dayLabel(focus.date, locale), tier: tierWord(tier) })}
          <span className="ml-2 rounded-full bg-saffron-500 px-2 py-0.5 text-xs font-bold text-white">
            {fill(t("ew.week.days"), { n: state.daysTo ?? 0 })}
          </span>
        </p>
        {sittingsList}
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={p(`/exams/${exam.code}/checklist`)} className={linkCls}>
            📋 {t("ew.week.checklist")}
          </Link>
          {fullMock && paperFits && (
            <Link href={`/mocks/${fullMock.id}`} prefetch={false} className={linkCls}>
              📝 {t("ew.week.paper")}
            </Link>
          )}
          <Link rel="nofollow" href={`/chat?examCode=${exam.code}&seed=${encodeURIComponent(seed)}`} className={linkCls}>
            💬 {fill(t("ew.week.ask"), { exam: short })}
          </Link>
          {icsLink}
        </div>
        {picker}
        {alertBox("get")}
      </>,
    );
  }

  // ── eve ─────────────────────────────────────────────────────────────
  if (phase === "eve") {
    const timeline = buildTimeline(rows, now, officialUrl);
    const admit = timeline.filter((r) => r.kind === "ADMIT_CARD" && r.tier === "official").pop() ?? null;
    // Reporting instructions live in the row's notes; without them the line
    // describes the admit-card RELEASE date, so it gets the admit-card label.
    // Notes count as reporting instructions only when they read as such
    // (16 Sep 2026: "Test admit card available for download from MPESB
    // portal" was printed as "Reporting: …").
    const admitNotes = admit && admitNotesAreReporting(admit.notes) ? admit.notes!.trim() : null;
    const admitText = admit ? admitNotes || dateWithTier(admit, tierWord(admit.tier), locale) : null;
    const admitKey = admitNotes ? "ew.eve.admit" : "ew.eve.admitCard";
    return wrap(
      <>
        <p className="text-sm font-bold text-ink-900">
          🎯 {fill(t("ew.eve.title"), { date: dayLabel(focus.date, locale), tier: tierWord(tier) })}
        </p>
        {sittingsList}
        <p className="mt-1 text-sm text-ink-800">{t("ew.eve.tip")}</p>
        {admit && admitText && (
          <p className="mt-1 text-xs text-ink-700">
            🎫 {fill(t(admitKey as StringKey), { text: admitText })}
            {admit.url && (
              <>
                {" "}
                <a
                  href={admit.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="font-semibold text-saffron-700 hover:text-saffron-800"
                >
                  {t("tracker.officialNotice")}
                </a>
              </>
            )}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">{icsLink}</div>
        {picker}
        {alertBox("get")}
      </>,
    );
  }

  // ── today, before 18:00 IST ─────────────────────────────────────────
  // "All the best" alone until the first sitting is over (the end of the
  // EXAM row's first time range, else noon IST); from then the poll joins
  // it. The announced-tier gate above already keeps an "expected" day
  // out of here, so the question is only ever asked about a paper that
  // was announced for today.
  const morningPoll = phase === "today-am" && examDayPollOpen(state, now);
  if (phase === "today-am" && !morningPoll) {
    return wrap(
      <>
        <p className="text-sm font-bold text-ink-900">🎯 {t("ew.today.am")}</p>
        {sittingsList}
        {picker}
      </>,
    );
  }

  // Poll phases share the tally + section chips. The tally handed to the
  // client is the PUBLIC one (only n below the floor) — the RSC payload
  // is readable by anyone. The marking-scheme read decides whether the
  // score-estimator link may appear at all — a false negative is a wrong
  // score in a student's hands on exam night. Row-aware since 16 Sep 2026:
  // sittingVerdict is the check /score-estimate itself runs (stage rule +
  // per-exam list), so the hub never links a page that refuses this sitting
  // (SBI PO Mains on its Prelims record, 12-13 Sep).
  const [tally, subjects, statable, gates] = await Promise.all([
    getVerdictTally(exam.id, state.focusDay).then(publicTally),
    prisma.subject
      .findMany({ where: { examId: exam.id }, orderBy: { orderIdx: "asc" }, select: { name: true }, take: 6 })
      .then((s) => s.map((x) => x.name.trim()).filter(Boolean))
      .catch(() => [] as string[]),
    phase === "today-pm" || phase === "post"
      ? prisma.exam
          .findUnique({
            where: { id: exam.id },
            select: {
              code: true,
              name: true,
              shortName: true,
              totalQuestions: true,
              scoredQuestions: true,
              totalMarks: true,
              marksPerQ: true,
              description: true,
            },
          })
          .then((e) => !!e && sittingVerdict(e, { rows, officialUrl }, now).verdict.ok)
          .catch(() => false)
      : Promise.resolve(false),
    // /cutoff 404s without rank bands (MP RAEO, KA KSRP): link it only when
    // it renders. A failed gate read keeps the link (GATES_OPEN).
    phase === "post" ? examPageGates(exam.code) : Promise.resolve(null),
  ]);
  const poll = (
    <ExamVerdictPoll
      examCode={exam.code}
      examDate={state.focusDay}
      labels={morningPoll ? { ...pollLabels, prompt: t("ew.today.done") } : pollLabels}
      sections={subjects}
      initialTally={tally}
      minN={VERDICT_MIN_N}
      signedIn={signedIn}
      examShort={short}
      shareUrl={localizedUrl(`/exams/${exam.code}`, urlLocale)}
      examDayLabel={dateWithTier(focus, tierWord(tier), locale)}
      surface={surface}
    />
  );
  const estimatorLink = statable ? (
    <Link href={p(`/exams/${exam.code}/score-estimate`)} className={linkCls}>
      🧮 {t("ew.score.when")}
    </Link>
  ) : null;

  // ── exam day, first shift over ──────────────────────────────────────
  if (morningPoll) {
    return wrap(
      <>
        <p className="text-sm font-bold text-ink-900">🎯 {t("ew.today.am")}</p>
        {sittingsList}
        {picker}
        {poll}
      </>,
    );
  }

  // Answer-key / result status from the tracker (dates with tier, or "not
  // announced yet" — never guessed): the post week and an open-ended window.
  const keyText = state.answerKey
    ? dateWithTier(state.answerKey, tierWord(state.answerKey.tier), locale)
    : t("ew.post.notAnnounced");
  // Passed estimates (24 Sep 2026, src/lib/official-source.ts): a result
  // estimate whose day has gone by is never printed as a date — it reads "No
  // official date yet — the expected result date has passed" (or "The
  // expected result date has passed — check the official website" where
  // announced rows say it may have come out), or gives way to the announced
  // result row of the same event that supersedes it.
  const resultTimeline = state.result?.passedEstimate ? buildTimeline(rows, now, officialUrl) : [];
  const resultView = state.result ? passedEstimateView(state.result, resultTimeline, now) : "date";
  const resultRow = resultView === "omit" && state.result ? supersedingRow(state.result, resultTimeline, now) : state.result;
  const resultText = !resultRow
    ? t("ew.post.notAnnounced")
    : resultView === "line" || resultView === "unsure"
      ? passedEstimateLine("RESULT", locale, resultView)
      : dateWithTier(resultRow, tierWord(resultRow.tier), locale);
  const noticeLink = (r: TimelineRow | null) =>
    r?.url ? (
      <>
        {" "}
        <a href={r.url} target="_blank" rel="nofollow noopener noreferrer" className="font-semibold text-saffron-700 hover:text-saffron-800">
          {r.official ? t("tracker.officialNotice") : t("tracker.source")}
        </a>
      </>
    ) : null;
  const keyStatus = (
    <ul className="mt-1 space-y-0.5 text-sm text-ink-800">
      <li>
        🔑 {fill(t("ew.post.key"), { text: keyText })}
        {noticeLink(state.answerKey)}
      </li>
      <li>
        📊 {fill(t("ew.post.result"), { text: resultText })}
        {noticeLink(resultRow)}
      </li>
    </ul>
  );

  // ── exam night / inside a multi-day window ──────────────────────────
  if (phase === "today-pm" || phase === "window") {
    const end = state.windowEnd ?? focus;
    return wrap(
      <>
        {phase === "today-pm" && sittingsList}
        {phase === "window" && state.openEnded && (
          // Open-ended start row (MP RAEO, 16 Sep 2026): the tracker holds a
          // start and says the end is not announced, so no "to" date is
          // printed. English until an i18n key exists for it.
          <>
            <p className="text-sm font-bold text-ink-900">
              🎯 {short}: exam began{" "}
              {dateWithTier(state.windowDays[0] ?? focus, tierWord((state.windowDays[0] ?? focus).tier), locale)}; end date
              not announced — your shift day is on your admit card.
            </p>
            <p className="mt-1 text-xs text-ink-700">{t("ew.window.tip")}</p>
          </>
        )}
        {phase === "window" && !state.openEnded && (
          <>
            <p className="text-sm font-bold text-ink-900">
              🎯{" "}
              {fill(t("ew.window.title"), {
                from: dayLabel(state.windowDays[0]?.date ?? focus.date, locale),
                to: dayLabel(end.date, locale),
                // A mixed-tier window prints both tier words, as the eve mail does.
                tier:
                  (state.windowDays[0]?.tier ?? tier) === end.tier
                    ? tierWord(end.tier)
                    : `${tierWord(state.windowDays[0]?.tier ?? tier)} / ${tierWord(end.tier)}`,
              })}
            </p>
            <p className="mt-1 text-xs text-ink-700">{t("ew.window.tip")}</p>
          </>
        )}
        {picker}
        {poll}
        {phase === "today-pm" && (
          <>
            {estimatorLink && <div className="mt-2 flex flex-wrap gap-2">{estimatorLink}</div>}
            {alertBox("key")}
          </>
        )}
        {/* Open-ended: a paper has been sat, so the week keeps the post
            block's key / result lines and the answer-key alert box (16 Sep
            2026, review) — without the "is done" title. */}
        {phase === "window" && state.openEnded && (
          <div className="mt-2 border-t border-saffron-200 pt-2">
            {keyStatus}
            {alertBox("key")}
          </div>
        )}
      </>,
    );
  }

  // ── post: 1..7 days after the (last) exam day ───────────────────────
  const nextInTrack = await loadNextInTrack(exam, now).catch(() => null);

  return wrap(
    <>
      <p className="text-sm font-bold text-ink-900">🏁 {fill(t("ew.post.title"), { exam: short })}</p>
      {keyStatus}
      <div className="mt-2 flex flex-wrap gap-2">
        {(gates?.cutoff ?? true) && (
          <Link href={p(`/exams/${exam.code}/cutoff`)} className={linkCls}>
            🎯 {t("ew.post.cutoff")}
          </Link>
        )}
        {estimatorLink}
        {weakTopicCode && (
          <Link href={`/exams/${exam.code}/topics/${encodeURIComponent(weakTopicCode)}/quiz`} prefetch={false} className={linkCls}>
            🧠 {t("ew.post.weak")}
          </Link>
        )}
      </div>
      {nextInTrack && (
        <p className="mt-2 text-xs text-ink-700">
          ➡️{" "}
          <Link href={p(`/exams/${nextInTrack.code}`)} className="font-semibold text-saffron-700 hover:text-saffron-800">
            {fill(t("ew.post.next"), {
              exam: nextInTrack.shortName,
              date: dayLabel(nextInTrack.date, locale),
              tier: tierWord(nextInTrack.tier),
            })}
          </Link>
        </p>
      )}
      {alertBox("key")}
      <div className="mt-2 border-t border-saffron-200 pt-2">
        {picker}
        {poll}
      </div>
    </>,
  );
}

/** Next exam in the same category (and state, for STATE_LEVEL) with an
 *  exam day 7..60 IST days out — the "what next" pointer after a paper.
 *  Tier is derived exactly like the tracker's rows (source domain vs the
 *  target exam's own portal). */
async function loadNextInTrack(
  exam: { id: string; category: string; state: string | null },
  now: Date,
): Promise<{ code: string; shortName: string; date: Date; tier: SourceTier } | null> {
  const todayUtc = new Date(`${new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)}T00:00:00.000Z`);
  const from = new Date(todayUtc.getTime() + 7 * DAY_MS);
  const to = new Date(todayUtc.getTime() + 60 * DAY_MS);
  const stateFilter = exam.category === "STATE_LEVEL" && exam.state ? exam.state : null;
  const rows = await prisma.$queryRaw<
    { code: string; shortName: string; date: Date; confidence: string | null; url: string | null; source: string | null; officialUrl: string | null }[]
  >`
    SELECT e.code, e."shortName", d.date, d.confidence, d.url, d.source, el."officialUrl"
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId"
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE e.active = TRUE
      AND e.category::text = ${exam.category}
      AND e.id <> ${exam.id}
      AND (${stateFilter}::text IS NULL OR e.state = ${stateFilter})
      AND d."archivedAt" IS NULL
      AND (d.kind = 'EXAM' OR (d.kind IS NULL AND d."isExamDay" = TRUE))
      AND d.date >= ${from} AND d.date <= ${to}
    ORDER BY d.date ASC
    LIMIT 1`;
  const r = rows[0];
  if (!r) return null;
  const url = r.url && /^https?:\/\//i.test(r.url) ? r.url : r.source && /^https?:\/\//i.test(r.source) ? r.source : null;
  return {
    code: r.code,
    shortName: r.shortName,
    date: new Date(r.date),
    tier: sourceTier(r.confidence, url, r.officialUrl),
  };
}
