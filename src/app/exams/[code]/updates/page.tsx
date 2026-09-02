// /exams/:code/updates — the EXAM TRACKER (23 Aug 2026).
//
// Answers the single largest query class in Indian exam prep — "{exam}
// exam date / notification / admit card / answer key / result / cutoff"
// — on one page, honestly: OFFICIAL dates carry the cited notice,
// EXPECTED dates are labelled as estimates, and the page hands the
// visitor a mock at the moment of peak intent (the difference between a
// Sarkari-Result bounce and a Shishya signup). Email alerts for real
// changes. Served in English, Hindi (/hi/…) and Telugu (/te/…) — same
// component, URL-driven locale, hreflang-paired.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { getT, getUrlLocale, tFor } from "@/lib/i18n-server";
import { inLanguage, languageAlternates, localizedPath, localizedUrl, ogLocale } from "@/lib/seo-locale";
import {
  KIND_ICON,
  buildTimeline,
  cycleYear,
  fmtDay,
  latestOfKind,
  stageOf,
  upcomingOfKind,
  type DateKind,
  type TimelineRow,
} from "@/lib/exam-timeline";
import { ExamAlertBox } from "@/components/ExamAlertBox";
import { PulseAsk } from "@/components/PulseAsk";
import { ShareExamButton } from "@/components/ShareExamButton";
import { LangTwinLinks } from "@/components/LangTwinLinks";

/** JSON-LD safe for inline <script>: a "</script>" inside a model- or
 *  web-derived label must not break out of the block. */
function jsonLdText(d: object): string {
  return JSON.stringify(d).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export const revalidate = 1800;

type TFn = (key: any) => string;

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

const KEY_KINDS: DateKind[] = ["NOTIFICATION", "APPLICATION_END", "ADMIT_CARD", "EXAM", "ANSWER_KEY", "RESULT"];

async function loadExam(code: string) {
  return prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true, category: true, state: true },
  });
}

async function loadTimeline(examId: string) {
  const [rows, elig] = await Promise.all([
    prisma.examImportantDate
      .findMany({ where: { examId, archivedAt: null }, orderBy: { date: "asc" }, take: 60 })
      .catch(() => []),
    prisma
      .$queryRaw<{ officialUrl: string | null }[]>`
        SELECT "officialUrl" FROM "ExamEligibility" WHERE "examId" = ${examId} LIMIT 1`
      .catch(() => [] as { officialUrl: string | null }[]),
  ]);
  return buildTimeline(rows, new Date(), elig[0]?.officialUrl ?? null);
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const exam = await loadExam(code);
  if (!exam) return { title: "Exam tracker — Shishya" };
  const urlLocale = await getUrlLocale();
  const tt = tFor(urlLocale) as TFn;
  const timeline = await loadTimeline(exam.id);
  const year = cycleYear(timeline);
  const { nextExam } = stageOf(timeline);
  // Lead with the answer (the date) so it survives SERP truncation; the
  // qualifier "(expected)" stays glued to an estimated date.
  const dateLead = nextExam
    ? `${tt("tracker.kind.EXAM")} ${fmtDay(nextExam.date, urlLocale)}${nextExam.tier === "expected" ? ` (${tt("tracker.expected").toLowerCase()})` : ""} — `
    : "";
  const title = `${exam.shortName} ${year} ${dateLead}${tt("tracker.title")} | Shishya`;
  const description = `${fill(tt("tracker.intro"), { exam: exam.shortName })} ${exam.name}.`.slice(0, 300);
  const path = `/exams/${exam.code}/updates`;
  const url = localizedUrl(path, urlLocale);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    keywords: [
      `${exam.shortName} exam date ${year}`,
      `${exam.shortName} notification ${year}`,
      `${exam.shortName} admit card`,
      `${exam.shortName} result ${year}`,
      `${exam.shortName} answer key`,
      `${exam.shortName} last date to apply`,
      `${exam.shortName} cutoff`,
      `${exam.shortName} latest news`,
    ],
    openGraph: { title, description, url, siteName: "Shishya", locale: ogLocale(urlLocale), type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ExamUpdatesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await loadExam(code);
  if (!exam || !exam.active) notFound();

  const [{ t: tRaw, locale }, urlLocale, session] = await Promise.all([getT(), getUrlLocale(), auth().catch(() => null)]);
  const t = tRaw as TFn;
  const signedIn = !!session?.user?.id;

  const [timeline, news, results, elig, pyqCount, dataTs] = await Promise.all([
    loadTimeline(exam.id),
    prisma.examNewsItem
      .findMany({ where: { examId: exam.id, archivedAt: null }, orderBy: { publishedAt: "desc" }, take: 8 })
      .catch(() => []),
    prisma
      .$queryRaw<{ id: string; stage: string; headline: string; declaredOn: Date; officialUrl: string | null }[]>`
        SELECT id, stage, headline, "declaredOn", "officialUrl" FROM "ExamResult"
        WHERE "examId" = ${exam.id} ORDER BY "declaredOn" DESC LIMIT 5`
      .catch(() => []),
    prisma
      .$queryRaw<{ officialUrl: string | null; officialName: string | null }[]>`
        SELECT "officialUrl", "officialName" FROM "ExamEligibility" WHERE "examId" = ${exam.id} LIMIT 1`
      .catch(() => []),
    prisma
      .$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(DISTINCT "pyqYear")::bigint AS n FROM "Question"
        WHERE "examId" = ${exam.id} AND source = 'PYQ' AND validated = TRUE AND "pyqYear" IS NOT NULL`
      .catch(() => [] as { n: bigint }[]),
    // When the DATA last changed — honest dateModified for humans and
    // schema (never render-time; claiming freshness we don't have is
    // exactly the kind of signal the index diet exists to remove).
    prisma
      .$queryRaw<{ t: Date | null }[]>`
        SELECT GREATEST(
          (SELECT MAX("createdAt") FROM "ExamImportantDate" WHERE "examId" = ${exam.id} AND "archivedAt" IS NULL),
          (SELECT MAX("createdAt") FROM "ExamNewsItem" WHERE "examId" = ${exam.id} AND "archivedAt" IS NULL)
        ) AS t`
      .catch(() => [] as { t: Date | null }[]),
  ]);
  const dataUpdatedAt = dataTs[0]?.t ? new Date(dataTs[0].t) : null;

  const year = cycleYear(timeline);
  const { next, last, nextExam } = stageOf(timeline);
  const officialUrl = elig[0]?.officialUrl ?? null;
  const officialName = elig[0]?.officialName ?? null;
  const hasPyq = Number(pyqCount[0]?.n ?? 0) > 0;
  const short = exam.shortName;
  const path = `/exams/${exam.code}/updates`;
  const url = localizedUrl(path, urlLocale);
  const p = (rel: string) => localizedPath(rel, urlLocale); // locale-preserving internal link

  // Status line — what a visitor wants in the first second.
  let statusLine: string | null = null;
  if (nextExam && nextExam.daysFromToday === 0) statusLine = t("tracker.status.examToday");
  else if (nextExam && nextExam.daysFromToday === 1) statusLine = t("tracker.status.examTomorrow");
  else if (nextExam) statusLine = fill(t("tracker.status.examIn"), { n: nextExam.daysFromToday });
  // An estimated exam day is never stated bare — same qualifier as the
  // title. Announced days (official OR reported) carry no qualifier.
  if (statusLine && nextExam && nextExam.tier === "expected") statusLine = `${statusLine} (${t("tracker.expected").toLowerCase()})`;
  const nextLine = next && next !== nextExam ? fill(t("tracker.status.next"), { label: next.label }) : null;
  const lastLine = last ? fill(t("tracker.status.last"), { label: last.label }) : null;

  const kindLabel = (k: DateKind) => t(`tracker.kind.${k}`);
  const statusLabel = (r: TimelineRow) =>
    r.status === "done"
      ? t("tracker.done")
      : r.status === "today"
        ? t("tracker.today")
        : fill(t("tracker.inDays"), { n: r.daysFromToday });

  // Key-dates strip: one card per key kind (upcoming first, else latest).
  const keyCards = KEY_KINDS.map((k) => ({ kind: k, row: upcomingOfKind(timeline, k) ?? latestOfKind(timeline, k) }));

  // FAQ — generated from the data, never from imagination.
  const faqFor = (qKey: string, kind: DateKind) => {
    const row = upcomingOfKind(timeline, kind) ?? latestOfKind(timeline, kind);
    const q = fill(t(qKey), { exam: short, year });
    let a: string;
    if (!row) a = t("tracker.faq.a.unknown");
    else if (row.status === "done")
      a = fill(t(row.tier === "expected" ? "tracker.faq.a.doneExpected" : "tracker.faq.a.done"), { label: row.label, date: fmtDay(row.date, locale) });
    else if (row.tier === "official") a = fill(t("tracker.faq.a.official"), { label: row.label, date: fmtDay(row.date, locale) });
    else if (row.tier === "reported") a = fill(t("tracker.faq.a.reported"), { label: row.label, date: fmtDay(row.date, locale) });
    else a = fill(t("tracker.faq.a.expected"), { label: row.label, date: fmtDay(row.date, locale) });
    return { q, a };
  };
  const faq = [
    faqFor("tracker.faq.q.examDate", "EXAM"),
    faqFor("tracker.faq.q.notification", "NOTIFICATION"),
    faqFor("tracker.faq.q.apply", "APPLICATION_END"),
    faqFor("tracker.faq.q.admit", "ADMIT_CARD"),
    faqFor("tracker.faq.q.result", "RESULT"),
  ];

  const lang = inLanguage(urlLocale);
  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${short} ${year} — ${t("tracker.title")}`,
      description: fill(t("tracker.intro"), { exam: short }),
      url,
      inLanguage: lang,
      isAccessibleForFree: true,
      ...(dataUpdatedAt ? { dateModified: dataUpdatedAt.toISOString() } : {}),
      about: [{ "@type": "Thing", name: exam.name }],
      publisher: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
      isPartOf: { "@type": "Course", name: `${short} preparation`, url: `https://shishya.in/exams/${exam.code}` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
        { "@type": "ListItem", position: 2, name: short, item: `https://shishya.in/exams/${exam.code}` },
        { "@type": "ListItem", position: 3, name: t("tracker.title"), item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: lang,
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  // Event schema ONLY for an officially dated exam day — we never put an
  // estimate into structured data that search engines treat as fact.
  if (nextExam && nextExam.official) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "Event",
      name: `${short} ${year} — ${nextExam.label}`,
      // GSC "improve item appearance" (2 Sep 2026): description, endDate,
      // image were missing on every valid Event.
      description: `${exam.name} — ${nextExam.label}, ${fmtDay(nextExam.date, "en")}, per the conducting body's official notice. Free mock tests, syllabus, cutoffs and a date tracker on Shishya.`,
      startDate: nextExam.day,
      endDate: nextExam.day,
      image: [`https://shishya.in/exams/${exam.code}/opengraph-image`],
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: "Exam centres across India", address: { "@type": "PostalAddress", addressCountry: "IN" } },
      organizer: { "@type": "Organization", name: officialName ?? short, ...(officialUrl ? { url: officialUrl } : {}) },
      url,
      ...(nextExam.url ? { sameAs: nextExam.url } : {}),
    });
  }

  const badge = (r: TimelineRow) =>
    r.tier === "official" ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{t("tracker.official")}</span>
    ) : r.tier === "reported" ? (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">{t("tracker.reported")}</span>
    ) : (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{t("tracker.expected")}</span>
    );

  return (
    <main className="min-h-screen bg-ink-50/40">
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(d) }} />
      ))}
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={p(`/exams/${exam.code}`)} className="hover:text-ink-800">{short}</Link> · {t("tracker.title")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{fill(t("tracker.h1"), { exam: short, year })}</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">{fill(t("tracker.intro"), { exam: short })}</p>

        {/* Language twins — real links for humans AND the crawl graph. */}
        <LangTwinLinks path={path} current={urlLocale} />

        {/* Status strip */}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          {statusLine ? (
            <span className="rounded-full bg-saffron-500 px-3 py-1 font-bold text-white">🎯 {statusLine}</span>
          ) : timeline.length === 0 ? (
            <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-ink-700">{t("tracker.status.none")}</span>
          ) : null}
          {nextLine && <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-ink-800">{nextLine}</span>}
          {lastLine && <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-ink-600">{lastLine}</span>}
        </div>

        {/* Key dates */}
        {timeline.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-ink-800">{t("tracker.keyDates")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {keyCards.map(({ kind, row }) => (
                <div
                  key={kind}
                  className={`rounded-xl border p-3 ${row?.status === "today" ? "border-saffron-400 bg-saffron-50" : "border-ink-200 bg-white"} ${row?.status === "done" ? "opacity-75" : ""}`}
                >
                  <p className="text-xs font-medium text-ink-500">
                    <span className="mr-1" aria-hidden>{KIND_ICON[kind]}</span>
                    {kindLabel(kind)}
                  </p>
                  {row ? (
                    <>
                      <p className="mt-1 text-sm font-bold text-ink-900">{fmtDay(row.date, locale)}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-600">
                        {badge(row)}
                        <span>{statusLabel(row)}</span>
                      </p>
                      {row.url && (
                        <a href={row.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs font-medium text-saffron-700 hover:text-saffron-800">
                          {row.official ? t("tracker.officialNotice") : t("tracker.source")}
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-ink-500">{t("tracker.notAnnounced")}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-500">
              {t("tracker.expected.note")}
              {dataUpdatedAt && <> · {fill(t("tracker.updated"), { date: fmtDay(dataUpdatedAt, locale) })}</>}
            </p>
          </section>
        )}

        {/* Alerts — the moment of peak intent. */}
        <div className="mt-6">
          <ExamAlertBox
            examCode={exam.code}
            signedIn={signedIn}
            labels={{
              title: fill(t("tracker.alert.title"), { exam: short }),
              body: t("tracker.alert.body"),
              emailPlaceholder: t("tracker.alert.email"),
              btn: t("tracker.alert.btn"),
              btnSigned: fill(t("tracker.alert.btnSigned"), { exam: short }),
              done: t("tracker.alert.done"),
              invalid: t("tracker.alert.invalid"),
              err: t("tracker.alert.err"),
            }}
          />
        </div>

        {/* PulseAsk (1 Sep 2026): date-coverage pulse right under the
            alert box — the honesty surface invites corrections. */}
        <PulseAsk
          surface="updates"
          promptKey={`updates-${exam.code}`}
          prompt={fill(t("pulse.updates.prompt"), { exam: short })}
          chips={[t("pulse.updates.c1"), t("pulse.updates.c2"), t("pulse.updates.c3")]}
          signedIn={signedIn}
          examCode={exam.code}
        />

        {/* Full timeline */}
        {timeline.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-ink-800">{t("tracker.timeline")}</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-ink-200 bg-white">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-ink-50 text-left text-xs text-ink-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("tracker.col.event")}</th>
                    <th className="px-3 py-2 font-medium">{t("tracker.col.date")}</th>
                    <th className="px-3 py-2 font-medium">{t("tracker.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((r) => (
                    <tr key={r.id} className={`border-t border-ink-100 ${r.status === "today" ? "bg-saffron-50" : r.status === "done" ? "text-ink-500" : ""}`}>
                      <td className="px-3 py-2">
                        <span className="mr-1" aria-hidden>{KIND_ICON[r.kind]}</span>
                        <span className={r.isExamDay && r.status !== "done" ? "font-semibold text-ink-900" : ""}>{r.label}</span>
                        {r.notes && <p className="mt-0.5 text-xs text-ink-500">{r.notes}</p>}
                        {r.url && (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs font-medium text-saffron-700 hover:text-saffron-800">
                            {r.official ? t("tracker.officialNotice") : t("tracker.source")}
                          </a>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="font-medium">{fmtDay(r.date, locale, true)}</span>
                        <span className="ml-2">{badge(r)}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">{statusLabel(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Latest updates */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("tracker.updates")}</h2>
            <Link href={`/exams/${exam.code}/archive`} prefetch={false} className="text-xs font-medium text-saffron-700 hover:text-saffron-800">
              {t("tracker.archive")}
            </Link>
          </div>
          {news.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">{t("tracker.updates.empty")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {news.map((n) => {
                const publishedAt = new Date(n.publishedAt as unknown as string | Date);
                const link = n.url && /^https?:\/\//.test(n.url) ? n.url : n.source && /^https?:\/\//.test(n.source) ? n.source : null;
                return (
                  <li key={n.id} className="rounded-md border border-ink-200 bg-white p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold text-ink-900">
                        <Link href={`/exams/${exam.code}/news/${n.id}`} prefetch={false} className="hover:text-saffron-700">{n.title}</Link>
                      </h3>
                      <span className="shrink-0 text-xs text-ink-500">{fmtDay(publishedAt, locale)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-700">{n.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <Link href={`/exams/${exam.code}/news/${n.id}`} prefetch={false} className="font-medium text-saffron-700 hover:text-saffron-800">{t("tracker.readMore")}</Link>
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-ink-500 hover:text-ink-700">{t("tracker.source")}</a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Declared results */}
        {results.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-ink-800">{t("tracker.results")}</h2>
            <ul className="mt-3 space-y-2">
              {results.map((r) => (
                <li key={r.id} className="rounded-md border border-ink-200 bg-white p-3 text-sm">
                  <Link href={`/exams/${exam.code}/results/${r.id}`} className="font-semibold text-ink-900 hover:text-saffron-700">{r.headline}</Link>
                  <span className="ml-2 text-xs text-ink-500">{r.stage} · {fmtDay(new Date(r.declaredOn), locale)}</span>
                  {r.officialUrl && (
                    <a href={r.officialUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs font-medium text-saffron-700 hover:text-saffron-800">{t("tracker.officialNotice")}</a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Cutoff + official site */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-sm font-semibold text-ink-900">🎯 {t("tracker.cutoff")}</p>
            <Link href={p(`/exams/${exam.code}/cutoff`)} className="mt-1 block text-sm font-medium text-saffron-700 hover:text-saffron-800">{t("tracker.cutoff.link")}</Link>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-sm font-semibold text-ink-900">🏛️ {t("tracker.officialSite")}</p>
            {officialUrl ? (
              <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-sm font-medium text-saffron-700 hover:text-saffron-800">
                {officialName ?? officialUrl.replace(/^https?:\/\//, "")} ↗
              </a>
            ) : (
              <p className="mt-1 text-sm text-ink-600">{officialName ?? "—"}</p>
            )}
            <p className="mt-1 text-xs text-ink-500">{t("tracker.verify")}</p>
          </div>
        </section>

        {/* Practice CTA — the whole point of owning this query. */}
        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">{t("tracker.practice.title")}</p>
          <p className="mt-1 text-sm text-ink-700">{fill(t("tracker.practice.body"), { exam: short })}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={p(`/exams/${exam.code}`)} className="btn-primary !py-2 !px-4 text-sm">{fill(t("tracker.practice.mock"), { exam: short })}</Link>
            <Link href={`/exams/${exam.code}/quiz`} className="inline-flex items-center rounded-md border-2 border-saffron-500 bg-white px-4 py-2 text-sm font-bold text-saffron-700 hover:bg-saffron-50">{t("tracker.practice.quiz")}</Link>
            {hasPyq && (
              <Link href={`/exams/${exam.code}#pyqs`} className="inline-flex items-center rounded-md border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">{t("tracker.practice.pyq")}</Link>
            )}
          </div>
        </div>

        <div className="mt-4">
          <ShareExamButton url={url} message={`${short} ${year} — ${t("tracker.title")} (official vs expected, one page):`} surface="exam" />
        </div>

        {/* FAQ (visible; same text as the FAQPage schema above). */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-ink-800">{t("tracker.faq.title")}</h2>
          <div className="mt-3 space-y-2">
            {faq.map((f) => (
              <details key={f.q} className="rounded-md border border-ink-200 bg-white px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink-900">{f.q}</summary>
                <p className="mt-2 text-sm text-ink-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-6 text-xs text-ink-500">
          <Link href={p("/exam-calendar")} className="font-medium text-saffron-700 hover:text-saffron-800">{t("calendar.title")} →</Link>
        </p>
      </section>
    </main>
  );
}
