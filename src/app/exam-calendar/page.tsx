// /exam-calendar — "upcoming government exams {year}" (23 Aug 2026).
// Every active exam with a dated milestone in the next 120 days, grouped
// by month, with official/expected honesty badges, plus this week's
// notifications/admit cards/deadlines and the latest material updates.
// English + Hindi (/hi/exam-calendar) + Telugu (/te/exam-calendar).

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { getT, getUrlLocale, tFor } from "@/lib/i18n-server";
import { inLanguage, languageAlternates, localizedPath, localizedUrl, ogLocale } from "@/lib/seo-locale";
import { KIND_ICON, MATERIAL_NEWS_RE, buildTimeline, fmtDay, type DateKind, type TimelineRow } from "@/lib/exam-timeline";
import { istDayNumber } from "@/lib/exam-phase";
import { LangTwinLinks } from "@/components/LangTwinLinks";

export const revalidate = 1800;

function jsonLdText(d: object): string {
  return JSON.stringify(d).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

type TFn = (key: any) => string;
const HORIZON_DAYS = 120;

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export async function generateMetadata(): Promise<Metadata> {
  const urlLocale = await getUrlLocale();
  const tt = tFor(urlLocale) as TFn;
  const year = new Date().getUTCFullYear();
  const title = `${fill(tt("calendar.h1"), { year })} | Shishya`;
  const description = tt("calendar.intro");
  const path = "/exam-calendar";
  const url = localizedUrl(path, urlLocale);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    keywords: [
      `upcoming government exams ${year}`,
      `government exam calendar ${year}`,
      `sarkari exam dates ${year}`,
      `exam notifications ${year}`,
      `admit card ${year}`,
      "upcoming exams in India",
    ],
    openGraph: { title, description, url, siteName: "Shishya", locale: ogLocale(urlLocale), type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

type Row = TimelineRow & { examCode: string; examShort: string; examId: string };

export default async function ExamCalendarPage() {
  const [{ t: tRaw, locale }, urlLocale] = await Promise.all([getT(), getUrlLocale()]);
  const t = tRaw as TFn;
  const now = new Date();
  const year = now.getUTCFullYear();
  const today = istDayNumber(now);
  const from = new Date(now.getTime() - 1.5 * 86_400_000);
  const to = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);

  const raw = await prisma.examImportantDate
    .findMany({
      where: { date: { gte: from, lte: to }, archivedAt: null, exam: { active: true } },
      orderBy: { date: "asc" },
      take: 800,
      include: { exam: { select: { id: true, code: true, shortName: true } } },
    })
    .catch(() => []);

  const rows: Row[] = buildTimeline(raw).map((r) => {
    const src = raw.find((x) => x.id === r.id)!;
    return { ...r, examCode: src.exam.code, examShort: src.exam.shortName, examId: src.exam.id };
  }).filter((r) => r.daysFromToday >= 0);

  // Exam days grouped by IST month; one row per (exam, day) — prefer official.
  const examDays = new Map<string, Row>();
  for (const r of rows) {
    if (!r.isExamDay) continue;
    const key = `${r.examId}:${r.day}`;
    const prev = examDays.get(key);
    if (!prev || (!prev.official && r.official)) examDays.set(key, r);
  }
  const byMonth = new Map<string, Row[]>();
  for (const r of examDays.values()) {
    const m = r.date.toLocaleDateString(locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
    (byMonth.get(m) ?? byMonth.set(m, []).get(m)!).push(r);
  }
  const distinctExams = new Set([...examDays.values()].map((r) => r.examId)).size;

  // This week: non-exam milestones (notification / admit card / deadlines / results) within 7 days.
  const WEEK_KINDS: DateKind[] = ["NOTIFICATION", "APPLICATION_START", "APPLICATION_END", "ADMIT_CARD", "ANSWER_KEY", "RESULT"];
  const thisWeek = rows.filter((r) => !r.isExamDay && r.daysFromToday <= 7 && WEEK_KINDS.includes(r.kind)).slice(0, 30);

  // Latest material updates (14 days), one per exam.
  const newsRaw = await prisma.examNewsItem
    .findMany({
      where: { archivedAt: null, createdAt: { gte: new Date(now.getTime() - 14 * 86_400_000) }, exam: { active: true } },
      orderBy: { publishedAt: "desc" },
      take: 200,
      include: { exam: { select: { code: true, shortName: true } } },
    })
    .catch(() => []);
  const seenExam = new Set<string>();
  const news = newsRaw.filter((n) => MATERIAL_NEWS_RE.test(n.title) && !seenExam.has(n.exam.code) && seenExam.add(n.exam.code)).slice(0, 20);

  const path = "/exam-calendar";
  const url = localizedUrl(path, urlLocale);
  const p = (rel: string) => localizedPath(rel, urlLocale);
  const lang = inLanguage(urlLocale);
  const officialEvents = [...examDays.values()].filter((r) => r.official).slice(0, 50);
  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: fill(t("calendar.h1"), { year }),
      description: t("calendar.intro"),
      url,
      inLanguage: lang,
      isAccessibleForFree: true,
      isPartOf: { "@type": "WebSite", name: "Shishya", url: "https://shishya.in" },
      publisher: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
        { "@type": "ListItem", position: 2, name: t("calendar.title"), item: url },
      ],
    },
  ];
  if (officialEvents.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: officialEvents.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Event",
          name: `${r.examShort} — ${r.label}`,
          startDate: r.day,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: { "@type": "Place", name: "Exam centres across India", address: { "@type": "PostalAddress", addressCountry: "IN" } },
          url: `https://shishya.in/exams/${r.examCode}/updates`,
        },
      })),
    });
  }

  const badge = (r: TimelineRow) =>
    r.official ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{t("tracker.official")}</span>
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
          <Link href={p("/")} className="hover:text-ink-800">Shishya</Link> · {t("calendar.title")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{fill(t("calendar.h1"), { year })}</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">{t("calendar.intro")}</p>
        <LangTwinLinks path={path} current={urlLocale} />
        <p className="mt-3 inline-block rounded-full bg-saffron-500 px-3 py-1 text-sm font-bold text-white">
          {fill(t("calendar.count"), { n: distinctExams, d: HORIZON_DAYS })}
        </p>
        <p className="mt-2 text-xs text-ink-500">{t("tracker.expected.note")}</p>

        {thisWeek.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-ink-800">{t("calendar.thisWeek")}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {thisWeek.map((r) => (
                <li key={r.id} className="rounded-md border border-ink-200 bg-white p-3 text-sm">
                  <span className="mr-1" aria-hidden>{KIND_ICON[r.kind]}</span>
                  <Link href={p(`/exams/${r.examCode}/updates`)} className="font-semibold text-ink-900 hover:text-saffron-700">{r.examShort}</Link>
                  <span className="text-ink-700"> — {r.label}</span>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-600">
                    <span className="font-medium">{fmtDay(r.date, locale, true)}</span>
                    {badge(r)}
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-saffron-700 hover:text-saffron-800">{r.official ? t("tracker.officialNotice") : t("tracker.source")}</a>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {byMonth.size === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">{t("calendar.empty")}</p>
        ) : (
          [...byMonth.entries()].map(([month, list]) => (
            <section key={month} className="mt-8">
              <h2 className="text-base font-semibold text-ink-800">{month}</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-ink-200 bg-white">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-ink-50 text-left text-xs text-ink-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("tracker.col.date")}</th>
                      <th className="px-3 py-2 font-medium">{t("tracker.col.event")}</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} className={`border-t border-ink-100 ${r.status === "today" ? "bg-saffron-50" : ""}`}>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="font-medium">{fmtDay(r.date, locale, true)}</span>
                          <span className="ml-2">{badge(r)}</span>
                          {r.daysFromToday === 0 && <span className="ml-2 rounded bg-saffron-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{t("tracker.today")}</span>}
                        </td>
                        <td className="px-3 py-2">
                          <Link href={p(`/exams/${r.examCode}`)} className="font-semibold text-ink-900 hover:text-saffron-700">{r.examShort}</Link>
                          <span className="text-ink-600"> — {r.label}</span>
                          {r.url && (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs font-medium text-saffron-700 hover:text-saffron-800">{r.official ? t("tracker.officialNotice") : t("tracker.source")}</a>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs">
                          <Link href={p(`/exams/${r.examCode}/updates`)} className="mr-3 font-medium text-saffron-700 hover:text-saffron-800">{t("calendar.tracker")}</Link>
                          <Link href={p(`/exams/${r.examCode}`)} className="font-medium text-ink-600 hover:text-ink-900">{t("calendar.mock")}</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}

        {news.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-ink-800">{t("calendar.news")}</h2>
            <ul className="mt-3 space-y-2">
              {news.map((n) => {
                const link = n.url && /^https?:\/\//.test(n.url) ? n.url : null;
                return (
                  <li key={n.id} className="rounded-md border border-ink-200 bg-white p-3 text-sm">
                    <Link href={p(`/exams/${n.exam.code}/updates`)} className="font-semibold text-saffron-800 hover:text-saffron-900">{n.exam.shortName}</Link>
                    <span className="text-ink-700"> — </span>
                    <Link href={`/exams/${n.exam.code}/news/${n.id}`} prefetch={false} className="text-ink-900 hover:text-saffron-700">{n.title}</Link>
                    <span className="ml-2 text-xs text-ink-500">{fmtDay(new Date(n.publishedAt as unknown as string | Date), locale)}</span>
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs font-medium text-saffron-700 hover:text-saffron-800">{t("tracker.source")}</a>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p className="mt-8 text-xs text-ink-500">{t("tracker.verify")}</p>
      </section>
    </main>
  );
}
