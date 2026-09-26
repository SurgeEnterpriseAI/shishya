// /exam-calendar — "upcoming government exams {year}" (23 Aug 2026).
// Every active exam with a dated milestone in the next 120 days, grouped
// by month, with official/expected honesty badges, plus this week's
// notifications/admit cards/deadlines and the latest material updates.
// English + Hindi (/hi/exam-calendar) + Telugu (/te/exam-calendar).

import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { getT, getUrlLocale, tFor } from "@/lib/i18n-server";
import { inLanguage, languageAlternates, localizedPath, localizedUrl, ogLocale, twinCanonical } from "@/lib/seo-locale";
import { getCalendarTwinVerdict } from "@/lib/twin-localisation";
import { KIND_ICON, MATERIAL_NEWS_RE, buildTimeline, fmtDay, type DateKind, type TimelineRow } from "@/lib/exam-timeline";
import { sourceTier } from "@/lib/official-source";
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

// 26 Sep 2026: the page lists government AND entrance exams (JEE, NEET,
// CUET, olympiads, state CETs), and its title said "Upcoming government
// exams 2026" with the calendar year. The English title and heading now say
// both, and the year range is computed from the exam days the page lists
// ("2026", or "2026–27" once the 120-day window crosses the new year; none
// when nothing is listed). The Hindi and Telugu twins keep their dictionary
// headings (src/lib/i18n.ts is shared), with the same computed range.
const EN_CALENDAR_HEADING = "Upcoming government and entrance exam dates";

/** One read of the listed window per request — generateMetadata and the page
 *  share it (React cache). */
const loadCalendarRaw = cache(async () => {
  const now = new Date();
  const from = new Date(now.getTime() - 1.5 * 86_400_000);
  const to = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);
  return prisma.examImportantDate
    .findMany({
      // 25 Sep 2026: real exams only (school class containers are not exams).
      where: { date: { gte: from, lte: to }, archivedAt: null, exam: REAL_EXAM_WHERE },
      orderBy: { date: "asc" },
      take: 800,
      include: {
        exam: {
          select: {
            id: true,
            code: true,
            shortName: true,
            // Portal domain widens the gold tier per exam (NABARD, LIC and
            // other bodies on commercial TLDs) — see official-source.ts.
            eligibility: { select: { officialUrl: true } },
          },
        },
      },
    })
    .catch(() => []);
});

/** "2026" or "2026–27" from ISO days; null for none. */
function calendarYearRange(days: readonly string[]): string | null {
  const years = [...new Set(days.map((d) => Number(d.slice(0, 4))).filter((y) => Number.isInteger(y) && y > 2000))].sort();
  if (years.length === 0) return null;
  const first = years[0];
  const last = years[years.length - 1];
  return first === last ? String(first) : `${first}–${String(last).slice(-2)}`;
}

/** The calendar heading in a locale, with the computed range or none. */
function calendarHeading(lc: string, t: TFn, range: string | null): string {
  if (lc === "en") return range ? `${EN_CALENDAR_HEADING} ${range}` : EN_CALENDAR_HEADING;
  const tpl = t("calendar.h1");
  return range ? fill(tpl, { year: range }) : fill(tpl.replace(/\s*\{year\}/g, ""), {});
}

export async function generateMetadata(): Promise<Metadata> {
  const urlLocale = await getUrlLocale();
  const tt = tFor(urlLocale) as TFn;
  const listedDays = buildTimeline(await loadCalendarRaw())
    .filter((r) => r.isExamDay && r.daysFromToday >= 0)
    .map((r) => r.day);
  const range = calendarYearRange(listedDays);
  const years = [...new Set(listedDays.map((d) => d.slice(0, 4)))].sort();
  const heading = calendarHeading(urlLocale, tt, range);
  const title = urlLocale === "en" ? `${heading} — notifications, admit cards | Shishya` : `${heading} | Shishya`;
  const description = tt("calendar.intro");
  const path = "/exam-calendar";
  const url = localizedUrl(path, urlLocale);
  // Index shape (13 Sep 2026): a twin is self-canonical + hreflang-declared
  // only when its rendered body is ≥ 30% native script; otherwise its
  // canonical is the English calendar (src/lib/twin-localisation.ts).
  const twins = await getCalendarTwinVerdict();
  return {
    title,
    description,
    alternates: { canonical: twinCanonical(path, urlLocale, twins), languages: languageAlternates(path, twins) },
    keywords: [
      ...years.flatMap((y) => [
        `upcoming government exams ${y}`,
        `upcoming entrance exams ${y}`,
        `government exam calendar ${y}`,
        `sarkari exam dates ${y}`,
        `exam notifications ${y}`,
        `admit card ${y}`,
      ]),
      "upcoming exams in India",
      "entrance exam dates",
    ],
    // Explicit og:image: a page-level openGraph block replaces the root's,
    // so the root card (src/app/opengraph-image.tsx) was not inherited.
    openGraph: {
      title,
      description,
      url,
      siteName: "Shishya",
      locale: ogLocale(urlLocale),
      type: "website",
      images: [{ url: "https://shishya.in/opengraph-image", width: 1200, height: 630, alt: "Shishya — free Indian exam prep" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["https://shishya.in/opengraph-image"] },
  };
}

type Row = TimelineRow & { examCode: string; examShort: string; examId: string };

export default async function ExamCalendarPage() {
  const [{ t: tRaw, locale }, urlLocale] = await Promise.all([getT(), getUrlLocale()]);
  const t = tRaw as TFn;
  const now = new Date();
  const today = istDayNumber(now);

  const raw = await loadCalendarRaw();

  const rows: Row[] = buildTimeline(raw).map((r) => {
    const src = raw.find((x) => x.id === r.id)!;
    // buildTimeline takes ONE officialUrl; this page spans every exam, so
    // re-derive the tier per row with that exam's own portal.
    const tier = sourceTier(src.confidence, r.url, src.exam.eligibility?.officialUrl);
    return { ...r, tier, official: tier === "official", examCode: src.exam.code, examShort: src.exam.shortName, examId: src.exam.id };
  }).filter((r) => r.daysFromToday >= 0);

  // Exam days grouped by IST month; one row per (exam, day) — prefer the
  // highest source tier (official > reported > expected).
  const tierRank = { official: 2, reported: 1, expected: 0 } as const;
  const examDays = new Map<string, Row>();
  for (const r of rows) {
    if (!r.isExamDay) continue;
    const key = `${r.examId}:${r.day}`;
    const prev = examDays.get(key);
    if (!prev || tierRank[prev.tier] < tierRank[r.tier]) examDays.set(key, r);
  }
  const byMonth = new Map<string, Row[]>();
  for (const r of examDays.values()) {
    const m = r.date.toLocaleDateString(locale === "hi" ? "hi-IN" : locale === "te" ? "te-IN" : "en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
    (byMonth.get(m) ?? byMonth.set(m, []).get(m)!).push(r);
  }
  const distinctExams = new Set([...examDays.values()].map((r) => r.examId)).size;
  const range = calendarYearRange([...examDays.values()].map((r) => r.day));

  // This week: non-exam milestones (notification / admit card / deadlines / results) within 7 days.
  const WEEK_KINDS: DateKind[] = ["NOTIFICATION", "APPLICATION_START", "APPLICATION_END", "ADMIT_CARD", "ANSWER_KEY", "RESULT"];
  const thisWeek = rows.filter((r) => !r.isExamDay && r.daysFromToday <= 7 && WEEK_KINDS.includes(r.kind)).slice(0, 30);

  // Latest material updates (14 days), one per exam.
  const newsRaw = await prisma.examNewsItem
    .findMany({
      where: { archivedAt: null, createdAt: { gte: new Date(now.getTime() - 14 * 86_400_000) }, exam: REAL_EXAM_WHERE },
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
      name: calendarHeading(urlLocale, tFor(urlLocale) as TFn, range),
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
          <Link href={p("/")} className="hover:text-ink-800">Shishya</Link> · {t("calendar.title")}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{calendarHeading(locale, t, range)}</h1>
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
