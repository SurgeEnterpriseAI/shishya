// ExamWeekBlock — the exam-week state line on the exam hub and the
// tracker (6 Sep 2026, Exam Week Mode). Server component.
//
// Replaces the hub's countdown chip, which vanished at 05:30 IST on exam
// day — exactly when the page had the most visitors. One card whose
// content is decided by computeExamWeekState (src/lib/exam-week.ts):
//
//   week      exam date (tier) + days to go + checklist / real-pattern
//             paper / ask-the-tutor links
//   eve       tomorrow's date (tier) + the no-new-topics tip + reporting
//             line when the tracker holds an OFFICIAL admit-card row
//   today-am  good luck, come back tonight
//   today-pm  "How was the paper?" poll + tally
//   window    window dates (tier) + shift tip + poll + tally
//   post      answer key / result (tracker dates with tier, or "not
//             announced yet" — never guessed), cutoff link, one-tap alert,
//             next exam in the same track, weakest-topic quiz, and the poll
//             again so the day-after mail's ?verdict= link lands
//   none      renders nothing (no DB reads either)
//
// Honesty rules: every date carries its source tier word; answer-key and
// result dates come only from the tracker; the tally is counts from
// n >= 10 and is never called a prediction; no per-student model calls —
// everything here is a deterministic DB read.

import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db/prisma";
import { tFor } from "@/lib/i18n-server";
import type { Locale, StringKey } from "@/lib/i18n";
import { localizedPath, type PageLocale } from "@/lib/seo-locale";
import { computeExamWeekState, dateWithTier } from "@/lib/exam-week";
import { buildTimeline, type SourceTier, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import { sourceTier } from "@/lib/official-source";
import { getVerdictTally, VERDICT_MIN_N } from "@/lib/exam-verdict";
import { ExamAlertBox } from "@/components/ExamAlertBox";
import { ExamVerdictPoll } from "@/components/ExamVerdictPoll";

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
  exam: { id: string; code: string; shortName: string; category: string; state: string | null };
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
}: ExamWeekBlockProps) {
  const now = new Date();
  const state = computeExamWeekState(rows, officialUrl, now);
  if (state.phase === "none" || !state.focus || !state.focusDay) return null;

  const t = tFor(locale) as (key: StringKey) => string;
  const tierWord = (tier: SourceTier) => t(`ew.tier.${tier}` as StringKey);
  const p = (rel: string) => localizedPath(rel, urlLocale);
  const short = exam.shortName;
  const focus = state.focus;
  const tier = state.tier ?? focus.tier;
  const { phase } = state;

  const pollLabels = {
    prompt: t("ew.today.pm"),
    easy: t("ew.verdict.easy"),
    moderate: t("ew.verdict.moderate"),
    tough: t("ew.verdict.tough"),
    section: t("ew.verdict.section"),
    thanks: t("ew.verdict.thanks"),
    tally: t("ew.verdict.tally"),
    few: t("ew.verdict.few"),
  };

  const wrap = (children: ReactNode) => (
    <section
      aria-label={`${short} — ${t("tracker.title")}`}
      className="mt-5 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 px-4 py-3"
    >
      {children}
    </section>
  );

  const linkCls =
    "inline-flex items-center gap-1 rounded-full border border-saffron-300 bg-white px-3 py-1 text-xs font-semibold text-saffron-800 hover:bg-saffron-100";

  // ── week ────────────────────────────────────────────────────────────
  if (phase === "week") {
    const [checklist, fullMock] = await Promise.all([
      // Only a SOURCED checklist earns a link (>= 2 sources read).
      prisma.examPhaseArticle
        .findFirst({
          where: { examId: exam.id, phase: "CHECKLIST", archivedAt: null },
          orderBy: { lastUpdatedAt: "desc" },
          select: { sourcesScraped: true },
        })
        .then((a) => !!a && Array.isArray(a.sourcesScraped) && a.sourcesScraped.length >= 2)
        .catch(() => false),
      prisma.mock
        .findFirst({
          where: { examId: exam.id, userId: null, generatedBy: { startsWith: "system:full-pattern" } },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
        .catch(() => null),
    ]);
    const seed = `My ${short} exam is in ${state.daysTo} days. What should I revise and what should I skip?`;
    return wrap(
      <>
        <p className="text-sm font-bold text-ink-900">
          🎯 {fill(t("ew.week.title"), { date: dayLabel(focus.date, locale), tier: tierWord(tier) })}
          <span className="ml-2 rounded-full bg-saffron-500 px-2 py-0.5 text-xs font-bold text-white">
            {fill(t("ew.week.days"), { n: state.daysTo ?? 0 })}
          </span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {checklist && (
            <Link href={p(`/exams/${exam.code}/checklist`)} className={linkCls}>
              📋 {t("ew.week.checklist")}
            </Link>
          )}
          {fullMock && (
            <Link href={`/mocks/${fullMock.id}`} prefetch={false} className={linkCls}>
              📝 {t("ew.week.paper")}
            </Link>
          )}
          <Link rel="nofollow" href={`/chat?examCode=${exam.code}&seed=${encodeURIComponent(seed)}`} className={linkCls}>
            💬 {fill(t("ew.week.ask"), { exam: short })}
          </Link>
        </div>
      </>,
    );
  }

  // ── eve ─────────────────────────────────────────────────────────────
  if (phase === "eve") {
    const timeline = buildTimeline(rows, now, officialUrl);
    const admit = timeline.filter((r) => r.kind === "ADMIT_CARD" && r.tier === "official").pop() ?? null;
    const admitText = admit
      ? admit.notes?.trim() || `${admit.label}, ${dateWithTier(admit, tierWord(admit.tier), locale)}`
      : null;
    return wrap(
      <>
        <p className="text-sm font-bold text-ink-900">
          🎯 {fill(t("ew.eve.title"), { date: dayLabel(focus.date, locale), tier: tierWord(tier) })}
        </p>
        <p className="mt-1 text-sm text-ink-800">{t("ew.eve.tip")}</p>
        {admit && admitText && (
          <p className="mt-1 text-xs text-ink-700">
            🎫 {fill(t("ew.eve.admit"), { text: admitText })}
            {admit.url && (
              <>
                {" "}
                <a
                  href={admit.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="font-semibold text-saffron-700 hover:text-saffron-800"
                >
                  {t("tracker.officialNotice")} ↗
                </a>
              </>
            )}
          </p>
        )}
      </>,
    );
  }

  // ── today, before 18:00 IST ─────────────────────────────────────────
  if (phase === "today-am") {
    return wrap(<p className="text-sm font-bold text-ink-900">🎯 {t("ew.today.am")}</p>);
  }

  // Poll phases share the tally + section chips.
  const [tally, subjects] = await Promise.all([
    getVerdictTally(exam.id, state.focusDay),
    prisma.subject
      .findMany({ where: { examId: exam.id }, orderBy: { orderIdx: "asc" }, select: { name: true }, take: 6 })
      .then((s) => s.map((x) => x.name.trim()).filter(Boolean))
      .catch(() => [] as string[]),
  ]);
  const poll = (
    <ExamVerdictPoll
      examCode={exam.code}
      examDate={state.focusDay}
      labels={pollLabels}
      sections={subjects}
      initialTally={tally}
      minN={VERDICT_MIN_N}
    />
  );

  // ── exam night / inside a multi-day window ──────────────────────────
  if (phase === "today-pm" || phase === "window") {
    const end = state.windowEnd ?? focus;
    return wrap(
      <>
        {phase === "window" && (
          <>
            <p className="text-sm font-bold text-ink-900">
              🎯{" "}
              {fill(t("ew.window.title"), {
                from: dayLabel(state.windowDays[0]?.date ?? focus.date, locale),
                to: dayLabel(end.date, locale),
                tier: tierWord(tier),
              })}
            </p>
            <p className="mt-1 text-xs text-ink-700">{t("ew.window.tip")}</p>
          </>
        )}
        {poll}
      </>,
    );
  }

  // ── post: 1..7 days after the (last) exam day ───────────────────────
  const nextInTrack = await loadNextInTrack(exam, now).catch(() => null);
  const keyText = state.answerKey
    ? dateWithTier(state.answerKey, tierWord(state.answerKey.tier), locale)
    : t("ew.post.notAnnounced");
  const resultText = state.result
    ? dateWithTier(state.result, tierWord(state.result.tier), locale)
    : t("ew.post.notAnnounced");
  const noticeLink = (r: TimelineRow | null) =>
    r?.url ? (
      <>
        {" "}
        <a href={r.url} target="_blank" rel="nofollow noopener noreferrer" className="font-semibold text-saffron-700 hover:text-saffron-800">
          {r.official ? t("tracker.officialNotice") : t("tracker.source")} ↗
        </a>
      </>
    ) : null;

  return wrap(
    <>
      <p className="text-sm font-bold text-ink-900">🏁 {fill(t("ew.post.title"), { exam: short })}</p>
      <ul className="mt-1 space-y-0.5 text-sm text-ink-800">
        <li>
          🔑 {fill(t("ew.post.key"), { text: keyText })}
          {noticeLink(state.answerKey)}
        </li>
        <li>
          📊 {fill(t("ew.post.result"), { text: resultText })}
          {noticeLink(state.result)}
        </li>
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link href={p(`/exams/${exam.code}/cutoff`)} className={linkCls}>
          🎯 {t("ew.post.cutoff")}
        </Link>
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
      {showAlert && (
        <div className="mt-3">
          <ExamAlertBox
            examCode={exam.code}
            signedIn={signedIn}
            compact
            labels={{
              title: t("ew.alert.cta"),
              body: t("tracker.alert.body"),
              emailPlaceholder: t("tracker.alert.email"),
              btn: t("tracker.alert.btn"),
              btnSigned: `🔔 ${t("tracker.alert.btn")}`,
              done: t("ew.alert.done"),
              invalid: t("tracker.alert.invalid"),
              err: t("tracker.alert.err"),
            }}
          />
        </div>
      )}
      <div className="mt-2 border-t border-saffron-200 pt-2">{poll}</div>
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
