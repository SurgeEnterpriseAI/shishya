// /exams/:code/cutoff — programmatic SEO landing for "[exam] cutoff" /
// "[exam] expected cutoff 2026" queries (among the highest-volume exam
// search patterns we didn't own a page for). Data: ExamRankBand — the same
// AI-curated, source-annotated score→rank→outcome bands that power the
// post-mock RankCard. PUBLIC + cached; honest disclaimer built in.
//
// Exam Week Mode (6 Sep 2026). This is the one page with a measured
// exam-day spike (39 landers on exam day across events; 41 of IOQM's 136
// first landings) and it was phase-blind — it ended with a coach pitch for
// the exam that had just finished. From D-1 to D+7 it now opens with what
// that lander wants: when the official cutoff arrives (result / answer-key
// status straight from the tracker — every date with its tier word,
// "not announced yet" when the tracker holds nothing), last cycle's table,
// where Shishya mock-takers scored (n>=10, and the copy says it is not a
// prediction), the paper-difficulty tally (n>=10, counts only) and a
// one-email alert. Outside that window the page renders exactly as before
// and stays ISR-cached: the locale / session reads that make a render
// request-time run only inside the exam-week branch.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { getVerdictTally } from "@/lib/exam-verdict";
import { auth } from "@/lib/auth";
import { getExamShared } from "@/lib/db/exam-cache";
import { getT, getUrlLocale } from "@/lib/i18n-server";
import { localizedPath } from "@/lib/seo-locale";
import { computeExamWeekState, dateWithTier, istDay, type ExamWeekPhase, type ExamWeekState } from "@/lib/exam-week";
import type { TimelineRow } from "@/lib/exam-timeline";
import { ShareExamButton } from "@/components/ShareExamButton";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { AnonExamNudge } from "@/components/AnonExamNudge";
import { CoachEntry } from "@/components/CoachEntry";
import { ExamAlertBox } from "@/components/ExamAlertBox";
import { inlineMd } from "@/components/NotesMarkdown";

// 900 (was 3600): the exam-week boundaries (D-1 in, D+7 out) must show up
// within 15 minutes. ISR applies while the render stays static — i.e.
// outside exam week. Inside it the page reads the locale header/cookie and
// the session, so it renders per request, like /updates and the hub.
export const revalidate = 900;

const YEAR = new Date().getFullYear();

type TFn = (key: any) => string;

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Phases the cutoff block covers: D-1 .. D+7 (not the run-up week). */
const CUTOFF_PHASES: ReadonlySet<ExamWeekPhase> = new Set<ExamWeekPhase>(["eve", "today-am", "today-pm", "window", "post"]);

// Tracker rows + official portal for the state machine, cached 15 min per
// exam so the static render adds one cache read, not two queries. Date
// fields come back from the cache as ISO strings, which buildTimeline
// accepts (TimelineInput.date is Date | string).
const getExamWeekInputs = unstable_cache(
  async (examId: string) => {
    const [rows, elig] = await Promise.all([
      prisma.examImportantDate
        .findMany({ where: { examId, archivedAt: null }, orderBy: { date: "asc" }, take: 60 })
        .catch(() => []),
      prisma
        .$queryRaw<{ officialUrl: string | null }[]>`
          SELECT "officialUrl" FROM "ExamEligibility" WHERE "examId" = ${examId} LIMIT 1`
        .catch(() => [] as { officialUrl: string | null }[]),
    ]);
    return { rows, officialUrl: elig[0]?.officialUrl ?? null };
  },
  ["cutoff-exam-week-v1"],
  { revalidate: 900, tags: ["exam-shared"] },
);

// Paper-difficulty poll counts come from the shared helper in
// src/lib/exam-verdict.ts so the hub, tracker, API and this page agree.
// Two minutes is fresh enough for a count that only shows from n>=10, and
// keeps exam-day landers from each hitting the poll table.
const getVerdictTallyCached = unstable_cache(
  (examId: string, day: string) => getVerdictTally(examId, day).catch(() => null),
  ["cutoff-verdict-tally-v1"],
  { revalidate: 120 },
);

/** Everything the exam-week block renders, resolved server-side in the
 *  page's language. Only called for D-1 .. D+7 — this is where the
 *  request-time reads (locale, session) live. */
async function loadExamWeekView(exam: { id: string; code: string; shortName: string }, ew: ExamWeekState) {
  const [{ t: tRaw, locale }, urlLocale, session, shared, tally] = await Promise.all([
    getT(),
    getUrlLocale(),
    auth().catch(() => null),
    // Cohort stats the hub already computes (10-min cache); cold cache
    // pays the hub payload once, which exam-day traffic keeps warm anyway.
    getExamShared(exam.code).catch(() => null),
    ew.focusDay ? getVerdictTallyCached(exam.id, ew.focusDay) : Promise.resolve(null),
  ]);
  const t = tRaw as TFn;
  const short = exam.shortName;
  // Every date carries its tier word; a missing tracker row is said plainly.
  const status = (row: TimelineRow | null) =>
    row ? dateWithTier(row, t(`ew.tier.${row.tier}`), locale) : t("ew.post.notAnnounced");
  const stats = shared?.examStats ?? null;
  const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

  return {
    phase: ew.phase,
    urlLocale,
    signedIn: !!session?.user?.id,
    title: fill(t("ew.cutoff.title"), { exam: short }),
    lead: fill(t("ew.cutoff.lead"), { result: status(ew.result), key: status(ew.answerKey) }),
    lastCycle: t("ew.cutoff.lastCycle"),
    // Cohort line from 10 students only; the copy itself says it is where
    // mock-takers scored, not a prediction.
    mockAvg:
      stats && stats.students >= 10 && stats.avgPct != null
        ? fill(t("ew.cutoff.mockAvg"), { n: stats.students.toLocaleString("en-IN"), pct: Math.round(stats.avgPct), exam: short })
        : null,
    // Verdict tally from 10 ratings only — counts and shares, never a prediction.
    tally:
      tally && tally.n >= 10
        ? fill(t("ew.verdict.tally"), {
            n: tally.n,
            easy: pct(tally.easy, tally.n),
            moderate: pct(tally.moderate, tally.n),
            tough: pct(tally.tough, tally.n),
          })
        : null,
    hubLink: fill(t("ew.post.title"), { exam: short }),
    alert: {
      labels: {
        title: fill(t("tracker.alert.title"), { exam: short }),
        body: t("tracker.alert.body"),
        emailPlaceholder: t("tracker.alert.email"),
        btn: t("tracker.alert.btn"),
        btnSigned: fill(t("tracker.alert.btnSigned"), { exam: short }),
        done: t("tracker.alert.done"),
        invalid: t("tracker.alert.invalid"),
        err: t("tracker.alert.err"),
      },
      weekLabels: { cta: t("ew.alert.cta"), done: t("ew.alert.done") },
      // The existing "one email … no spam, unsubscribe anytime" line.
      note: t("tracker.alert.body"),
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { code: true, shortName: true, name: true },
  });
  if (!exam) return { title: "Exam cutoff — Shishya" };
  const title = `${exam.shortName} Cutoff ${YEAR} — Expected Score, Rank & What It Gets You | Shishya`;
  const description =
    `${exam.shortName} (${exam.name}) expected cutoff ${YEAR}: score-to-rank bands, what each score range typically achieves, ` +
    `curated from historic patterns. Take a free mock to see exactly where you stand.`;
  const url = `https://shishya.in/exams/${exam.code}/cutoff`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${exam.shortName} cutoff ${YEAR}`,
      `${exam.shortName} expected cutoff`,
      `${exam.shortName} cutoff marks`,
      `${exam.shortName} safe score`,
      `${exam.shortName} rank predictor`,
    ],
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CutoffPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true, totalMarks: true },
  });
  if (!exam || !exam.active) notFound();

  const bands = await prisma.examRankBand.findMany({
    where: { examId: exam.id, archivedAt: null },
    orderBy: { orderIdx: "asc" },
    select: {
      label: true,
      scorePctMin: true,
      scorePctMax: true,
      rankMin: true,
      rankMax: true,
      outcomes: true,
      source: true,
    },
  });
  if (bands.length === 0) notFound();

  // Exam Week Mode: phase from the cached tracker reads (static-safe);
  // the request-time work runs only for D-1 .. D+7.
  const { rows: dateRows, officialUrl } = await getExamWeekInputs(exam.id);
  const ew = computeExamWeekState(dateRows, officialUrl);
  const view = CUTOFF_PHASES.has(ew.phase) && ew.tier !== "expected" ? await loadExamWeekView(exam, ew) : null;

  const url = `https://shishya.in/exams/${exam.code}/cutoff`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${exam.shortName} Cutoff ${YEAR} — Expected Score & Rank Bands`,
    description: `Score-to-rank cutoff bands for ${exam.name}, curated from historic patterns.`,
    url,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    // In exam-week mode the page's lead really does change day by day.
    ...(view ? { dateModified: istDay(new Date()) } : {}),
    about: [{ "@type": "Thing", name: exam.name }, { "@type": "Thing", name: `${exam.shortName} cutoff` }],
    publisher: { "@type": "Organization", name: "Shishya", url: "https://shishya.in" },
    isPartOf: { "@type": "Course", name: `${exam.shortName} preparation`, url: `https://shishya.in/exams/${exam.code}` },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 3, name: "Cutoff", item: url },
    ],
  };

  const outcomesList = (md: string) =>
    md
      .split("\n")
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);

  // Category-wise expected cutoffs (gap-fill #4 — "is 95 safe for OBC?"
  // is how aspirants actually frame the question). Raw SQL keeps this
  // independent of client typegen; renders when generated.
  const catRows = await prisma
    .$queryRaw<{ content: string }[]>`
      SELECT content FROM "ExamCategoryCutoff" WHERE "examId" = ${exam.id} LIMIT 1
    `.catch(() => [] as { content: string }[]);
  const categoryMd = catRows[0]?.content ?? null;
  // Parse the strict markdown the generator emits: a pipe table + bullets.
  const catTable: string[][] = [];
  const catNotes: string[] = [];
  if (categoryMd) {
    for (const raw of categoryMd.split("\n")) {
      const line = raw.trim();
      if (/^\|/.test(line)) {
        if (/^\|[\s:-]+\|/.test(line.replace(/-/g, "-"))&& /---/.test(line)) continue; // separator row
        catTable.push(line.split("|").map((c) => c.trim()).filter(Boolean));
      } else if (/^[-*•]\s+/.test(line)) {
        catNotes.push(line.replace(/^[-*•]\s+/, ""));
      }
    }
  }

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${exam.code}`} className="hover:text-ink-800">
            {exam.shortName}
          </Link>{" "}
          · Cutoff
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          {exam.shortName} Cutoff {YEAR} — expected score &amp; rank bands
        </h1>

        {/* Exam-week block (D-1 .. D+7): the answer the exam-day lander
            came for — when the official cutoff arrives — before the
            historic bands. Dates carry their tier; nothing is guessed. */}
        {view && (
          <section className="mt-4 rounded-xl border border-saffron-300 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">{view.title}</h2>
            <p className="mt-1 text-sm text-ink-700">{view.lead}</p>
            {view.mockAvg && <p className="mt-2 text-sm text-ink-700">{view.mockAvg}</p>}
            {view.tally && <p className="mt-1 text-sm text-ink-700">{view.tally}</p>}
            <div className="mt-3">
              <ExamAlertBox
                examCode={exam.code}
                compact
                signedIn={view.signedIn}
                labels={view.alert.labels}
                phase={view.phase}
                weekLabels={view.alert.weekLabels}
                note={view.alert.note}
              />
            </div>
          </section>
        )}

        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          What does your score in {exam.name} actually get you? These bands map a mock/exam
          percentage to the rank window and outcomes that score range has typically achieved.
        </p>
        <p className="mt-2 max-w-3xl rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          AI-curated from historic cutoff patterns — indicative, not official. Always verify with
          the latest official notification.
        </p>

        <div className="mt-4">
          <ShareExamButton
            url={url}
            message={`${exam.shortName} expected cutoff ${YEAR} — score-to-rank bands + what each range gets you (free on Shishya):`}
            surface="exam"
          />
        </div>

        {/* Category-wise table — the way aspirants actually ask the
            question ("safe for OBC?"). In exam-week mode it is framed as
            last cycle's figure; the source bullets below it are kept. */}
        {catTable.length > 1 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-ink-900">
              {view ? view.lastCycle : "Category-wise expected cutoff (indicative)"}
            </h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-ink-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/60 text-left">
                    {catTable[0].map((h, i) => (
                      <th key={i} className="px-4 py-2 font-semibold text-ink-800">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catTable.slice(1).map((row, i) => (
                    <tr key={i} className="border-b border-ink-100 last:border-0">
                      {row.map((c, j) => (
                        <td key={j} className={`px-4 py-2 ${j === 0 ? "font-medium text-ink-900" : "tabular-nums text-ink-700"}`}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {catNotes.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-600">
                {catNotes.map((n, i) => (
                  <li key={i}>{inlineMd(n)}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Cutoff anxiety is the single most expert-worthy moment — surface
            the human option right where the doubt forms. */}
        <p className="mt-3 text-sm text-ink-600">
          Not sure if your score is safe for your category?{" "}
          <TalkToTeacher
            surface="exam"
            examCode={exam.code}
            variant="link"
            contextLabel={`${exam.shortName} cutoff — am I safe for my category?`}
            linkLabel="Ask our subject expert — free"
          />
        </p>

        {/* Signup nudge for anonymous SEO landers at the same anxiety
            moment — session checked client-side so this page keeps its
            ISR caching outside exam week; content is never gated. */}
        <AnonExamNudge
          examCode={exam.code}
          headline={`Will your score clear the ${exam.shortName} cutoff?`}
          body="Sign in free — take a mock and see exactly where you stand against these bands."
          cta="See where I stand — free →"
          surface="cutoff-nudge"
        />

        {/* Knowing the target score is step one; the plan to reach it is
            step two — the coach's most natural handoff on the site. After
            the exam that pitch is wrong; the hub's "what next" block is
            the door instead. */}
        {view?.phase === "post" ? (
          <Link
            href={localizedPath(`/exams/${exam.code}`, view.urlLocale)}
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-saffron-300 bg-saffron-50/70 px-4 py-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50"
          >
            <span className="min-w-0 text-sm font-semibold text-ink-800">{view.hubLink}</span>
            <span className="shrink-0 text-sm font-bold text-saffron-700">→</span>
          </Link>
        ) : (
          <CoachEntry examCode={exam.code} examShort={exam.shortName} variant="cutoff" />
        )}

        <h2 className="mt-8 text-base font-semibold text-ink-900">Score → rank → outcome bands</h2>
        <ul className="mt-3 space-y-3">
          {bands.map((b, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-ink-900">{b.label}</p>
                <p className="text-xs font-semibold tabular-nums text-saffron-700">
                  {Math.round(b.scorePctMin)}–{Math.round(b.scorePctMax)}%
                  {b.rankMin != null && b.rankMax != null && (
                    <span className="ml-2 text-ink-500">rank ~{b.rankMin.toLocaleString("en-IN")}–{b.rankMax.toLocaleString("en-IN")}</span>
                  )}
                </p>
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-700">
                {outcomesList(b.outcomes).slice(0, 6).map((o, j) => (
                  <li key={j}>{o}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">Where would YOUR score land?</p>
          <p className="mt-1 text-sm text-ink-600">
            Take a free {exam.shortName} mock — instant score, this exact rank mapping, and your
            weak topics identified. No coaching fees.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/exams/${exam.code}`} className="btn-primary !py-2 !px-4 text-sm">
              Start free preparation →
            </Link>
            <Link
              href={`/exams/${exam.code}/quiz`}
              className="inline-flex items-center rounded-md border-2 border-saffron-500 bg-white px-4 py-2 text-sm font-bold text-saffron-700 hover:bg-saffron-50"
            >
              5-question quiz — no signup →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
