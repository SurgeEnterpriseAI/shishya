// /exams/:code/score-estimate — the zero-LLM score estimator (6 Sep 2026,
// Exam Week Mode wave 2).
//
// After the answer key a student wants one number: "how many marks did I
// get?" This page is that arithmetic under the exam's own marking scheme
// (Exam.marksPerQ / negativeMark / totalQuestions / totalMarks) — three
// inputs, recomputed in the browser, nothing stored, no model call.
//
// Honesty gate (7 Sep 2026): Exam.marksPerQ is sometimes a WEIGHTED AVERAGE
// across papers with different per-question marks, and then "+{marksPerQ}
// per correct" is false. markingSchemeVerdict() (src/lib/marking-scheme.ts)
// decides from the exam's own numbers whether the scheme may be stated;
// when it may not, the page says so — the specific reason, in words — and
// points at the official notice instead of running a calculator that
// would hand out wrong marks.
//
// Stage gate (11 Sep 2026): the Exam row describes ONE stage. SBI_PO is the
// Prelims pattern (100 Q, 100 marks) but its 12 Sep 2026 sitting is Mains
// (200 marks, unequal section weights) — the numbers passed, the page
// printed Prelims arithmetic for a Mains paper. The verdict now also takes
// the exam-day row this sitting belongs to (the exam-week focus row, else
// the next / just-held exam day on the tracker) and refuses when its label
// names a different stage from the exam's name.
//
// Below it: the answer-key / result status straight from the tracker (every
// date with its tier word, "not announced yet" when the tracker holds
// nothing) and last cycle's category-wise indicative cutoff, labelled as
// an estimate and never as a prediction. Served in English, Hindi (/hi/…)
// and Telugu (/te/…) — same component, URL-driven locale, hreflang-paired.
// Linked from the cutoff page's exam-week block (today-pm onwards); in the
// sitemap (all three locales) for exams with a typed exam day within ±30 days.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { markingSchemeVerdict, scoredCount } from "@/lib/marking-scheme";
import { auth } from "@/lib/auth";
import { getT, getUrlLocale, tFor } from "@/lib/i18n-server";
import type { StringKey } from "@/lib/i18n";
import { languageAlternates, localizedPath, localizedUrl, ogLocale, twinCanonical } from "@/lib/seo-locale";
import { getTwinVerdict } from "@/lib/twin-localisation";
import { computeExamWeekState, dateWithTier } from "@/lib/exam-week";
import { buildTimeline, focusExamRow, type SourceTier, type TimelineRow } from "@/lib/exam-timeline";
import { alertPhase, examAlertLabels, getExamWeekInputs, type ExamWeekInputs } from "@/lib/exam-week-inputs";
import { categoryHeaderKey, parseCategoryCutoff } from "@/lib/category-cutoff";
import { ExamAlertBox } from "@/components/ExamAlertBox";
import { LangTwinLinks } from "@/components/LangTwinLinks";
import { inlineMd } from "@/components/NotesMarkdown";
import { ScoreEstimator } from "./ScoreEstimator";

export const revalidate = 900;

type TFn = (key: StringKey) => string;

const TIER_KEY: Record<SourceTier, StringKey> = {
  official: "ew.tier.official",
  reported: "ew.tier.reported",
  expected: "ew.tier.expected",
};

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** JSON-LD safe for inline <script>. */
function jsonLdText(d: object): string {
  return JSON.stringify(d).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

/** 2 → "2", 0.25 → "0.25", 0.333 → "0.33". */
function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
}

async function loadExam(code: string) {
  return prisma.exam.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      shortName: true,
      name: true,
      active: true,
      description: true,
      totalQuestions: true,
      scoredQuestions: true,
      totalMarks: true,
      marksPerQ: true,
      negativeMark: true,
    },
  });
}

type ExamRow = NonNullable<Awaited<ReturnType<typeof loadExam>>>;

/**
 * The sitting this page is about and whether ONE marking scheme can be
 * stated for it. The exam-day row is the exam-week focus row (inside the
 * ±7-day window) or else the next / just-held typed exam day on the
 * tracker; its label carries the stage ("Mains Exam") the verdict checks
 * against the exam's name ("… (Prelims)"). Shared by generateMetadata and
 * the page so the <title> can never promise a calculator the body refuses.
 */
function sittingVerdict(exam: ExamRow, inputs: ExamWeekInputs, now: Date = new Date()) {
  const state = computeExamWeekState(inputs.rows, inputs.officialUrl, now);
  const typed = inputs.rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
  const sitting = state.focus ?? focusExamRow(buildTimeline(typed, now, inputs.officialUrl));
  const verdict = markingSchemeVerdict(exam, { rowLabel: sitting?.label, rowDate: sitting?.date });
  return { state, sitting, verdict };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const exam = await loadExam(code);
  if (!exam) return { title: "Score estimator — Shishya" };
  const [urlLocale, inputs] = await Promise.all([getUrlLocale(), getExamWeekInputs(exam.id)]);
  const tt = tFor(urlLocale) as TFn;
  const short = exam.shortName;
  // An exam whose scheme we cannot state honestly gets no calculator, so the
  // <title> must not promise one — it says what the page actually holds,
  // and the description carries the reason (English: it is the verdict's
  // own sentence, the same one the body prints).
  const { verdict } = sittingVerdict(exam, inputs);
  const title = `${fill(tt(verdict.ok ? "ew.score.title" : "ew.score.mixed.title"), { exam: short })} | Shishya`;
  const description = verdict.ok
    ? fill(tt("ew.score.lead"), { exam: short })
    : `${verdict.reason} Shishya shows no calculator for this sitting — take the marking scheme from the official notice.`;
  const path = `/exams/${exam.code}/score-estimate`;
  const url = localizedUrl(path, urlLocale);
  // The per-exam social card (src/app/exams/[code]/opengraph-image.tsx) —
  // absolute so WhatsApp / Slack unfurl it whatever metadataBase says.
  const ogImage = `https://shishya.in/exams/${exam.code}/opengraph-image`;
  // Index shape (13 Sep 2026): a twin is self-canonical + hreflang-declared
  // only when its rendered body is ≥ 30% native script; otherwise its
  // canonical is the English estimator (src/lib/twin-localisation.ts).
  const twins = await getTwinVerdict("score-estimate", exam.id);
  return {
    title,
    description,
    alternates: { canonical: twinCanonical(path, urlLocale, twins), languages: languageAlternates(path, twins) },
    keywords: [
      `${short} score calculator`,
      `${short} marks calculator`,
      `${short} answer key score`,
      `${short} expected score`,
      `${short} cutoff`,
    ],
    openGraph: {
      title,
      description,
      url,
      siteName: "Shishya",
      locale: ogLocale(urlLocale),
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${short} — Shishya` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function ScoreEstimatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await loadExam(code);
  if (!exam || !exam.active) notFound();

  const [{ t: tRaw, locale }, urlLocale, session, inputs, catRows] = await Promise.all([
    getT(),
    getUrlLocale(),
    auth().catch(() => null),
    getExamWeekInputs(exam.id),
    prisma
      .$queryRaw<{ content: string }[]>`
        SELECT content FROM "ExamCategoryCutoff" WHERE "examId" = ${exam.id} LIMIT 1`
      .catch(() => [] as { content: string }[]),
  ]);
  const t = tRaw as TFn;
  const short = exam.shortName;
  // Marking scheme honesty (see markingSchemeVerdict): when the exam's own
  // numbers say the paper does not score uniformly, or the sitting in focus
  // is a different stage from the stored pattern, the calculator and its
  // "+{plus} per correct" line are replaced by the reason, in words.
  const { state, verdict } = sittingVerdict(exam, inputs);
  const statable = verdict.ok;
  // Alert / status surfaces follow the shared rule: an expected-tier exam
  // day may not open the answer-key / result copy.
  const phase = alertPhase(state);
  const showStatus = phase !== "none";
  const cat = parseCategoryCutoff(catRows[0]?.content);

  const path = `/exams/${exam.code}/score-estimate`;
  const url = localizedUrl(path, urlLocale);
  const p = (rel: string) => localizedPath(rel, urlLocale);
  const title = fill(t(statable ? "ew.score.title" : "ew.score.mixed.title"), { exam: short });
  const tierWord = (row: TimelineRow) => t(TIER_KEY[row.tier]);
  // Every date carries its tier word; a missing tracker row is said plainly.
  // A passed estimate (the expected date went by, nothing announced) is
  // worded as such — same rule and same ew.date.overdue string as the
  // cutoff page — never as the thing still to come.
  const status = (row: TimelineRow | null) => {
    if (!row) return t("ew.post.notAnnounced");
    const dated = dateWithTier(row, tierWord(row), locale);
    return row.passedEstimate ? fill(t("ew.date.overdue"), { date: dated }) : dated;
  };
  // The scheme applies to the questions that SCORE, so that is the count the
  // marking line prints and the count the calculator works in. On a paper
  // that asks more than it scores (NEET UG: 180 of 200), printing 200 beside
  // "+4 per correct … 720 marks" would not add up, and a student entering 200
  // correct would be handed 800 out of 720. Printed as "{scored} / {asked}"
  // so the optional questions still show; it stays numeric because
  // ew.score.marking is one shared sentence across en/hi/te.
  const scored = scoredCount(exam);
  const marking = fill(t("ew.score.marking"), {
    plus: num(exam.marksPerQ),
    minus: num(exam.negativeMark),
    total: scored === exam.totalQuestions ? scored : `${scored} / ${exam.totalQuestions}`,
    marks: num(exam.totalMarks),
  });
  const th = (h: string) => {
    const k = categoryHeaderKey(h);
    return k ? t(k) : h;
  };
  const alert = examAlertLabels(t, short);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: short, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };

  const noticeLink = (r: TimelineRow | null) =>
    r?.url ? (
      <>
        {" "}
        <a href={r.url} target="_blank" rel="nofollow noopener noreferrer" className="font-semibold text-saffron-700 hover:text-saffron-800">
          {r.official ? t("tracker.officialNotice") : t("tracker.source")}
        </a>
      </>
    ) : null;

  const pill =
    "inline-flex items-center gap-1 rounded-full border border-saffron-300 bg-white px-3 py-1 text-xs font-semibold text-saffron-800 hover:bg-saffron-100";

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(breadcrumbs) }} />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={p(`/exams/${exam.code}`)} className="hover:text-ink-800">
            {short}
          </Link>{" "}
          · {t("ew.score.cta")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{title}</h1>
        {statable && <p className="mt-2 max-w-3xl text-sm text-ink-700">{fill(t("ew.score.lead"), { exam: short })}</p>}

        {/* Language twins — real links for humans AND the crawl graph. */}
        <LangTwinLinks path={path} current={urlLocale} />

        {/* The calculator: marking scheme line + three inputs. When the
            scheme cannot be stated honestly (mixed papers / not every
            question counts / the sitting is a different stage from the
            stored pattern) there is no calculator — a wrong number the
            evening of the exam is worse than no number — just the specific
            reason, the general note, and the two places the real scheme
            lives. The reason is the verdict's own English sentence on every
            locale: honesty outranks translation here. */}
        <section className="mt-5 rounded-xl border-2 border-saffron-300 bg-white p-5">
          {statable ? (
            <>
              <p className="text-xs font-medium text-ink-600">{marking}</p>
              <ScoreEstimator
                marksPerQ={exam.marksPerQ}
                negativeMark={exam.negativeMark}
                /* The scored count, not the asked count: ScoreEstimator clamps
                   every input to this and caps correct + wrong by it, which is
                   the sensible handling of a student who attempted more than
                   scores — the score can never exceed totalMarks or 100%. */
                totalQuestions={scored}
                totalMarks={exam.totalMarks}
                labels={{
                  attempted: t("ew.score.attempted"),
                  correct: t("ew.score.correct"),
                  wrong: t("ew.score.wrong"),
                  result: t("ew.score.result"),
                  pct: t("ew.score.pct"),
                  invalid: t("ew.score.invalid"),
                }}
              />
            </>
          ) : (
            <>
              {verdict.reason && <p className="text-sm font-semibold text-ink-900">{verdict.reason}</p>}
              <p className="mt-2 text-sm text-ink-700">{fill(t("ew.score.mixed.body"), { exam: short })}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {inputs.officialUrl && (
                  <a href={inputs.officialUrl} target="_blank" rel="nofollow noopener noreferrer" className={pill}>
                    🔗 {t("tracker.officialSite")}
                  </a>
                )}
                <Link href={p(`/exams/${exam.code}/updates`)} className={pill}>
                  📅 {t("tracker.title")}
                </Link>
              </div>
            </>
          )}
        </section>

        {/* Answer key / result — tracker dates with their tier, or "not
            announced yet". Only inside exam week on an announced exam day:
            outside it the state machine holds no rows for this cycle. */}
        {showStatus && (
          <ul className="mt-4 space-y-0.5 text-sm text-ink-800">
            <li>
              🔑 {fill(t("ew.post.key"), { text: status(state.answerKey) })}
              {noticeLink(state.answerKey)}
            </li>
            <li>
              📊 {fill(t("ew.post.result"), { text: status(state.result) })}
              {noticeLink(state.result)}
            </li>
          </ul>
        )}

        {/* Last cycle's category table — an estimate from score bands,
            said so in the note; never a prediction. */}
        {cat.table.length > 1 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-ink-900">{t("ew.cutoff.lastCycle")}</h2>
            <p className="mt-1 text-xs text-ink-600">{t("ew.score.compare")}</p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-ink-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/60 text-left">
                    {cat.table[0].map((h, i) => (
                      <th key={i} className="px-4 py-2 font-semibold text-ink-800">
                        {th(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cat.table.slice(1).map((row, i) => (
                    <tr key={i} className="border-b border-ink-100 last:border-0">
                      {row.map((c, j) => (
                        <td key={j} className={`px-4 py-2 ${j === 0 ? "font-medium text-ink-900" : "tabular-nums text-ink-700"}`}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cat.notes.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-600">
                {cat.notes.map((n, i) => (
                  <li key={i}>{inlineMd(n)}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={p(`/exams/${exam.code}/cutoff`)} className={pill}>
            🎯 {t("ew.post.cutoff")}
          </Link>
          <Link href={p(`/exams/${exam.code}/updates`)} className={pill}>
            📅 {t("tracker.title")}
          </Link>
        </div>

        {/* One-email alert for the official answer key / result. */}
        {phase !== "none" && (
          <div className="mt-4">
            <ExamAlertBox
              examCode={exam.code}
              compact
              signedIn={!!session?.user?.id}
              labels={alert.labels}
              phase={phase}
              weekLabels={alert.weekLabels}
              note={alert.note}
            />
          </div>
        )}
      </section>
    </main>
  );
}
