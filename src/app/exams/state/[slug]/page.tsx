// /exams/state/[slug] — per-state landing page.
//
// One indexable URL per Indian state listing every entrance exam offered
// by / for that state, with SEO copy in both English and the state's
// native language. Goal: rank for queries like
//   "Tamil Nadu entrance exams 2026"
//   "Bihar government exams"
//   "महाराष्ट्र की परीक्षा"
//   "ఆంధ్రప్రదేశ్ పరీక్షలు"
//
// Crawl-friendly: no auth, no client JS for the main content, just a
// rendered list + JSON-LD ItemList. Sitemap.ts surfaces all 35 slugs.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { STATES, stateCodeFromSlug, stateSlug, languageList, languageName } from "@/lib/state-info";

export async function generateStaticParams() {
  return Object.keys(STATES).map((code) => ({ slug: stateSlug(code) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const code = stateCodeFromSlug(slug);
  if (!code) return { title: "State not found — Shishya" };
  const st = STATES[code];
  const year = new Date().getUTCFullYear();

  // Count exams for this state — used in the meta description for trust
  // ("47 exams covered" reads better than just "all exams").
  const examCount = await prisma.exam.count({ where: { state: code, active: true } });

  const title = `${st.name} Entrance Exams ${year} — Free Mock Tests, PYQ in ${languageList(st.languages)} | Shishya`;
  const description =
    `All ${examCount} ${st.name} entrance exams in one place — TET, PSC, Police, ` +
    `Polytechnic, CET and more. Free mock tests, previous year papers and AI tutor. ` +
    `Available in ${languageList(st.languages)}.`;
  const url = `https://shishya.in/exams/state/${slug}`;

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: url },
    keywords: [
      `${st.name} entrance exams`,
      `${st.name} government exams`,
      `${st.name} exams ${year}`,
      `${st.name} state exam mock test`,
      `${st.name} PSC`,
      `${st.name} TET`,
      `${st.name} Police exam`,
      `${st.nativeName} परीक्षा`,
      `${st.hindiName} entrance exams`,
      `${st.name} mock tests free`,
      `${st.name} previous year papers`,
      ...st.languages.map((l) => `${st.name} exam in ${languageName(l).en}`),
    ],
    openGraph: {
      title,
      description: description.slice(0, 300),
      url,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description.slice(0, 200),
    },
  };
}

export default async function StateIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const code = stateCodeFromSlug(slug);
  if (!code) notFound();
  const st = STATES[code];

  const exams = await prisma.exam.findMany({
    where: { state: code, active: true },
    select: {
      code: true, name: true, shortName: true, description: true,
      category: true, languages: true, totalQuestions: true, durationMin: true,
    },
    orderBy: { candidatesPerYear: "desc" },
  });
  if (exams.length === 0) notFound();

  const year = new Date().getUTCFullYear();

  // JSON-LD ItemList — gives Google a clean parseable list of every
  // exam covered for this state, eligible for sitelinks-style results.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${st.name} entrance exams ${year}`,
    itemListElement: exams.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://shishya.in/exams/${e.code}`,
      name: e.shortName,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Exams", item: "https://shishya.in/exams" },
      { "@type": "ListItem", position: 3, name: `${st.name} exams`, item: `https://shishya.in/exams/state/${slug}` },
    ],
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/exams" className="hover:text-ink-800">Exams</Link> · {st.name}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          {st.name} Entrance Exams {year}
        </h1>
        <p className="mt-1 text-lg text-ink-600">{st.nativeName} · {st.hindiName}</p>

        <p className="mt-4 max-w-3xl text-sm text-ink-700">
          Free preparation for all {exams.length} entrance exams in {st.name} — PSC,
          TET, Police, Polytechnic, CET and more. Generate adaptive mock tests in
          {" "}{languageList(st.languages)}, practice previous year papers, and use
          Shishya AI as your personal tutor. No payment, no premium tier.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {exams.map((e) => (
            <li key={e.code}>
              <Link
                href={`/exams/${e.code}`}
                className="block rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
              >
                <h2 className="text-sm font-semibold text-ink-900">{e.shortName}</h2>
                <p className="mt-0.5 text-xs text-ink-500">{e.name}</p>
                <p className="mt-2 line-clamp-2 text-xs text-ink-600">{e.description}</p>
                <p className="mt-2 text-[11px] text-ink-500">
                  {e.totalQuestions} questions · {e.durationMin} min ·{" "}
                  {languageList(e.languages)}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            About {st.name} entrance exams
          </h3>
          <p className="mt-2">
            {st.name} ({st.nativeName}) conducts {exams.length} major entrance exams
            covered on Shishya — from state PSC and teacher eligibility tests to
            police recruitment, polytechnic admissions and university entrances.
            Every question on this page is available in {languageList(st.languages)},
            and our AI tutor explains every answer the moment you submit a mock.
          </p>
          <p className="mt-2">
            All preparation is free. We don't charge students; the platform is
            subsidised by Surge Enterprise AI's separate consulting business.
          </p>
        </div>
      </section>
    </main>
  );
}
