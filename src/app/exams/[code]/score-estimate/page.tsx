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
// per correct" is false. markingSchemeStatable() below decides from the
// exam's own numbers whether the scheme may be stated; when it may not,
// the page says so and points at the official notice instead of running a
// calculator that would hand out wrong marks.
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
import { auth } from "@/lib/auth";
import { getT, getUrlLocale, tFor } from "@/lib/i18n-server";
import type { StringKey } from "@/lib/i18n";
import { languageAlternates, localizedPath, localizedUrl, ogLocale } from "@/lib/seo-locale";
import { computeExamWeekState, dateWithTier } from "@/lib/exam-week";
import type { SourceTier, TimelineRow } from "@/lib/exam-timeline";
import { alertPhase, examAlertLabels, getExamWeekInputs } from "@/lib/exam-week-inputs";
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
      totalMarks: true,
      marksPerQ: true,
      negativeMark: true,
    },
  });
}

/**
 * May we print "+{marksPerQ} per correct, −{negativeMark} per wrong" as THE
 * scheme for this paper, and do the arithmetic under it? (7 Sep 2026 review.)
 *
 * Not always: some exams store Exam.marksPerQ as a WEIGHTED AVERAGE across
 * papers that carry different marks per question — scripts/seed-ap-amvi.ts
 * says it in as many words ("marksPerQ: 1.5, // weighted average" over a
 * 150 Q / 150 mark Paper-I and a 150 Q / 300 mark Paper-II). For those exams
 * the printed line is false and every number the calculator returns is wrong.
 * The schema has no per-paper marking, so we test what the Exam row can
 * prove:
 *
 *   1. A per-question value an exam notice could actually print: a whole
 *      number, a half, a third or a quarter (1, 2, 1.5, 4/3 stored 1.33,
 *      2.5). 1.4, 1.6, 3.6 are fifths — nobody prints those, they are
 *      averages (NSEP is 3 marks in Part A1 and 6 in Part A2 → "3.6").
 *   2. A paper where every question carries m marks tops out at m × Q. When
 *      that does not equal totalMarks the paper is NOT uniform — different
 *      papers/sections score differently (NDA, UPPSC PCS, JEE Advanced,
 *      the SOF olympiads' Achievers section) or not every question counts
 *      towards the total (NEET's 200-attempt-180). Either way "+m per
 *      correct, Q questions, T marks" cannot all three be true. Tolerance
 *      of 1 mark / 0.5% only forgives schemes stored rounded (4/3 → 1.33).
 *   3. The exam's own description listing two or more DIFFERENT part totals
 *      ("Mathematics (300 marks…)" + "General Ability Test (600 marks…)",
 *      "Paper-I (150 Qs, 150 marks)" + "Paper-II (150 Qs, 300 marks)") is
 *      the tracker itself saying the papers do not score alike — this is
 *      what catches AP AMVI, whose averaged numbers are self-consistent.
 *
 * False positives cost a calculator and keep an honest page (status, cutoff
 * table, official link); a false negative is a wrong score in a student's
 * hands the evening of the exam. So this errs towards not stating.
 */
// (module-local: a page file must only export the Next.js entry points)
function markingSchemeStatable(exam: {
  totalQuestions: number;
  totalMarks: number;
  marksPerQ: number;
  description: string;
}): boolean {
  const { totalQuestions: q, totalMarks: total, marksPerQ: m } = exam;
  if (!(m > 0) || !(q > 0) || !(total > 0)) return false;
  // 1 — a value a notice could print: halves, thirds, quarters (0.02 slack
  // for 4/3 stored as "1.33"). Anything else is an average of its papers.
  if (![1, 2, 3, 4].some((d) => Math.abs(m * d - Math.round(m * d)) < 0.02)) return false;
  // 2 — full marks under the printed scheme must be the printed total.
  if (Math.abs(m * q - total) > Math.max(1, total * 0.005)) return false;
  // 3 — part totals the exam's own description lists.
  const partTotals = new Set(
    [...exam.description.matchAll(/(\d[\d,]*)\s*marks/gi)]
      .map((x) => Number(x[1].replace(/,/g, "")))
      .filter((n) => n > 0 && n < total),
  );
  return partTotals.size < 2;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const exam = await loadExam(code);
  if (!exam) return { title: "Score estimator — Shishya" };
  const urlLocale = await getUrlLocale();
  const tt = tFor(urlLocale) as TFn;
  const short = exam.shortName;
  // An exam whose scheme we cannot state honestly gets no calculator, so the
  // <title> must not promise one — it says what the page actually holds.
  const statable = markingSchemeStatable(exam);
  const title = `${fill(tt(statable ? "ew.score.title" : "ew.score.mixed.title"), { exam: short })} | Shishya`;
  const description = fill(tt(statable ? "ew.score.lead" : "ew.score.mixed.body"), { exam: short });
  const path = `/exams/${exam.code}/score-estimate`;
  const url = localizedUrl(path, urlLocale);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    keywords: [
      `${short} score calculator`,
      `${short} marks calculator`,
      `${short} answer key score`,
      `${short} expected score`,
      `${short} cutoff`,
    ],
    openGraph: { title, description, url, siteName: "Shishya", locale: ogLocale(urlLocale), type: "article" },
    twitter: { card: "summary_large_image", title, description },
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
  const state = computeExamWeekState(inputs.rows, inputs.officialUrl);
  // Alert / status surfaces follow the shared rule: an expected-tier exam
  // day may not open the answer-key / result copy.
  const phase = alertPhase(state);
  const showStatus = phase !== "none";
  const cat = parseCategoryCutoff(catRows[0]?.content);

  const path = `/exams/${exam.code}/score-estimate`;
  const url = localizedUrl(path, urlLocale);
  const p = (rel: string) => localizedPath(rel, urlLocale);
  // Marking scheme honesty (see markingSchemeStatable): when the exam's own
  // numbers say the paper does not score uniformly, the calculator and its
  // "+{plus} per correct" line are replaced by a note saying so.
  const statable = markingSchemeStatable(exam);
  const title = fill(t(statable ? "ew.score.title" : "ew.score.mixed.title"), { exam: short });
  const tierWord = (row: TimelineRow) => t(TIER_KEY[row.tier]);
  // Every date carries its tier word; a missing tracker row is said plainly.
  const status = (row: TimelineRow | null) => (row ? dateWithTier(row, tierWord(row), locale) : t("ew.post.notAnnounced"));
  const marking = fill(t("ew.score.marking"), {
    plus: num(exam.marksPerQ),
    minus: num(exam.negativeMark),
    total: exam.totalQuestions,
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
            question counts) there is no calculator — a wrong number the
            evening of the exam is worse than no number — just the reason
            and the two places the real scheme lives. */}
        <section className="mt-5 rounded-xl border-2 border-saffron-300 bg-white p-5">
          {statable ? (
            <>
              <p className="text-xs font-medium text-ink-600">{marking}</p>
              <ScoreEstimator
                marksPerQ={exam.marksPerQ}
                negativeMark={exam.negativeMark}
                totalQuestions={exam.totalQuestions}
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
              <p className="text-sm text-ink-700">{fill(t("ew.score.mixed.body"), { exam: short })}</p>
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
