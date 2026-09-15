// /exams/state/[slug] — a state's government exams on Shishya.
//
// The page to rank and be cited for "{state} government exams",
// "{state} govt exams 2026", "महाराष्ट्र सरकारी परीक्षा" and similar queries.
//
// 15 Sep 2026 (SEO/AEO wave 1): retitled from "Entrance Exams" to government
// exams, and every claim is now built from data (src/lib/state-exams.ts).
// The old copy named "PSC, TET, Police, Polytechnic, CET" for every state —
// including states with a single exam — and said every question was
// "available in" the state's languages (questions are English, readable in
// other languages inside a test). Added: exams grouped by the types that
// exist, announced upcoming dates (official / reported only), where to apply
// (the exams' own official portals), and an FAQ that matches its FAQPage
// JSON-LD. Hourly ISR — the page used to be frozen at build time.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { STATES, stateCodeFromSlug, stateSlug, languageList, languageName } from "@/lib/state-info";
import {
  EXAM_TYPE_ORDER,
  formatDay,
  getStateDirectory,
  loadStateUpcoming,
  stateFaq,
  statePortals,
  type ExamType,
} from "@/lib/state-exams";
import { prisma } from "@/lib/db/prisma";

export const revalidate = 3600;

const HORIZON_DAYS = 120;

export async function generateStaticParams() {
  return Object.keys(STATES).map((code) => ({ slug: stateSlug(code) }));
}

/** A language other than English the state's students read, for "readable in …". */
function readableIn(languages: string[]): string {
  return languageName(languages.find((l) => l !== "EN") ?? "HI").en;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const code = stateCodeFromSlug(slug);
  if (!code) return { title: "State not found — Shishya" };
  const st = STATES[code];
  const year = new Date().getUTCFullYear();
  const entry = (await getStateDirectory().catch(() => [])).find((s) => s.code === code);
  const exams = entry?.exams ?? [];
  const top = exams.slice(0, 4).map((e) => e.shortName);

  const title = `${st.name} Government Exams ${year} — Free Mock Tests, Dates & Syllabus | Shishya`;
  const description =
    `${exams.length} ${st.name} ${exams.length === 1 ? "exam" : "exams"} on Shishya${top.length ? `: ${top.join(", ")}${exams.length > 4 ? " and more" : ""}` : ""}. ` +
    `Free mock tests, announced exam dates with their source, where to apply, syllabus and cutoffs — questions readable in ${readableIn(st.languages)} inside every test.`;
  const url = `https://shishya.in/exams/state/${slug}`;

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: url },
    keywords: [
      `${st.name} government exams ${year}`,
      `${st.name} govt exams`,
      `${st.name} government jobs exams`,
      `${st.name} sarkari exam`,
      `${st.hindiName} सरकारी परीक्षा`,
      `${st.name} exam calendar ${year}`,
      `${st.name} mock tests free`,
      ...exams.slice(0, 8).map((e) => `${e.shortName} mock test`),
    ],
    openGraph: { title, description: description.slice(0, 300), url, siteName: "Shishya", locale: "en_IN", type: "website" },
    twitter: { card: "summary_large_image", title, description: description.slice(0, 200) },
  };
}

export default async function StateExamsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const code = stateCodeFromSlug(slug);
  if (!code) notFound();
  const st = STATES[code];
  const entry = (await getStateDirectory().catch(() => [])).find((s) => s.code === code);
  if (!entry || entry.exams.length === 0) notFound();

  const exams = entry.exams;
  const year = new Date().getUTCFullYear();
  // Card facts (pattern, description) are read fresh; the directory carries names and types.
  const details = new Map(
    (
      await prisma.exam
        .findMany({
          where: { code: { in: exams.map((e) => e.code) } },
          select: { code: true, description: true, totalQuestions: true, durationMin: true, languages: true },
        })
        .catch(() => [])
    ).map((d) => [d.code, d]),
  );
  const upcoming = await loadStateUpcoming(exams, HORIZON_DAYS).catch(() => []);
  const faq = stateFaq({ name: st.name, slug }, exams, upcoming, HORIZON_DAYS);
  const portals = statePortals(exams);
  const groups = EXAM_TYPE_ORDER.map((type) => ({ type, list: exams.filter((e) => e.type === type) })).filter((g) => g.list.length > 0);
  const typeNames = groups.map((g) => g.type).filter((t) => t !== "Other");

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${st.name} government exams on Shishya`,
    itemListElement: exams.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `https://shishya.in/exams/${e.code}`, name: e.shortName })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Exams by state", item: "https://shishya.in/exams/state" },
      { "@type": "ListItem", position: 3, name: `${st.name} government exams`, item: `https://shishya.in/exams/state/${slug}` },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const jsonLd = (d: object) => JSON.stringify(d).replace(/</g, "\\u003c");
  const typeLabel = (t: ExamType) => (t === "Other" ? "Other exams" : `${t} exams`);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/exams/state" className="hover:text-ink-800">Exams by state</Link> · {st.name}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          {st.name} Government Exams {year}
        </h1>
        <p className="mt-1 text-lg text-ink-600">
          {st.nativeName === st.hindiName ? st.hindiName : `${st.nativeName} · ${st.hindiName}`}
        </p>

        <p className="mt-4 max-w-3xl text-sm text-ink-700">
          Shishya has {exams.length} {st.name} exam {exams.length === 1 ? "page" : "pages"}
          {typeNames.length ? ` — ${typeNames.join(", ")}` : ""}. Each is free: mock tests in the real
          pattern, the syllabus, cutoffs and an exam tracker that labels every date official, reported or
          expected. Questions are in English and can be read in {readableIn(st.languages)} and other
          Indian languages inside any test.
        </p>

        {groups.map((g) => (
          <div key={g.type} className="mt-8">
            <h2 className="text-lg font-semibold text-ink-900">{typeLabel(g.type)}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {g.list.map((e) => {
                const d = details.get(e.code);
                return (
                  <li key={e.code}>
                    <Link
                      href={`/exams/${e.code}`}
                      className="block rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
                    >
                      <h3 className="text-sm font-semibold text-ink-900">{e.shortName}</h3>
                      <p className="mt-0.5 text-xs text-ink-500">{e.name}</p>
                      {d?.description && <p className="mt-2 line-clamp-2 text-xs text-ink-600">{d.description}</p>}
                      {d && (
                        <p className="mt-2 text-[11px] text-ink-500">
                          {d.totalQuestions} questions · {d.durationMin} min ·{" "}
                          {d.languages.length > 0 ? languageList(d.languages) : "language not stated"}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink-900">Upcoming announced dates</h2>
          {upcoming.length > 0 ? (
            <ul className="mt-3 divide-y divide-ink-100 text-sm">
              {upcoming.map((d, i) => (
                <li key={`${d.examCode}-${d.day}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                  <span className="w-28 shrink-0 font-medium text-ink-900">{formatDay(d.day)}</span>
                  <Link href={`/exams/${d.examCode}/updates`} className="font-semibold text-saffron-700 hover:underline">
                    {d.examShort}
                  </Link>
                  <span className="text-ink-700">{d.label}</span>
                  <span className={d.tier === "official" ? "rounded bg-amber-100 px-1.5 text-[11px] text-amber-900" : "rounded bg-ink-100 px-1.5 text-[11px] text-ink-700"}>
                    {d.tier}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-600">
              No {st.name} date on Shishya&apos;s tracker is announced for the next {HORIZON_DAYS} days. Each
              exam&apos;s tracker page lists its expected dates, marked as estimates.
            </p>
          )}
          <p className="mt-3 text-xs text-ink-500">
            Official = the conducting body&apos;s own notice · reported = announced, cited via a secondary source.
          </p>
        </div>

        {portals.length > 0 && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-ink-900">Where to apply</h2>
            <p className="mt-1 text-sm text-ink-600">Apply only on the conducting body&apos;s own website.</p>
            <ul className="mt-3 space-y-1 text-sm">
              {portals.map((p) => (
                <li key={p.host}>
                  <a href={p.url} rel="noopener" target="_blank" className="text-saffron-700 hover:underline">
                    {p.name}
                  </a>{" "}
                  <span className="text-xs text-ink-500">({p.host})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink-900">Questions students ask</h2>
          <dl className="mt-3 space-y-4 text-sm">
            {faq.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-ink-900">{f.q}</dt>
                <dd className="mt-1 text-ink-700">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/exams/state" className="font-medium text-saffron-700 hover:underline">All states</Link>
          <Link href="/exam-calendar" className="font-medium text-saffron-700 hover:underline">Exam calendar</Link>
          <Link href="/find-your-exam" className="font-medium text-saffron-700 hover:underline">Which exam suits me?</Link>
          <Link href="/jobs-map" className="font-medium text-saffron-700 hover:underline">Government jobs map</Link>
        </p>
      </section>
    </main>
  );
}
