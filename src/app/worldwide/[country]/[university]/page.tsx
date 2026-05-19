// /worldwide/[country]/[university] — per-university detail page.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { findCountry, findUniversity, WORLDWIDE_COUNTRIES } from "@/lib/worldwide-data";

interface PageParams { country: string; university: string }

export async function generateStaticParams() {
  return WORLDWIDE_COUNTRIES.flatMap((c) =>
    c.universities.map((u) => ({ country: c.slug, university: u.slug })),
  );
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { country, university } = await params;
  const c = findCountry(country);
  const u = findUniversity(country, university);
  if (!c || !u) return { title: "Not found — Shishya" };
  const year = new Date().getUTCFullYear();
  return {
    title: `${u.name} — Admissions, Tuition, Indian Students ${year} | Shishya`,
    description: `${u.blurb} Tuition: ${u.tuitionRange}. Programs: ${u.strongPrograms.join(", ")}.`.slice(0, 280),
    alternates: { canonical: `https://shishya.in/worldwide/${country}/${university}` },
    keywords: [
      u.name,
      `${u.name} admission`,
      `${u.name} Indian students`,
      `${u.name} tuition`,
      `${u.name} ranking`,
      ...u.strongPrograms,
    ],
  };
}

export default async function UniversityPage({
  params,
}: { params: Promise<PageParams> }) {
  const { country, university } = await params;
  const c = findCountry(country);
  const u = findUniversity(country, university);
  if (!c || !u) notFound();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Worldwide", item: "https://shishya.in/worldwide" },
      { "@type": "ListItem", position: 3, name: c.name, item: `https://shishya.in/worldwide/${country}` },
      { "@type": "ListItem", position: 4, name: u.name, item: `https://shishya.in/worldwide/${country}/${university}` },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/worldwide" className="hover:text-ink-800">Worldwide</Link> ·{" "}
          <Link href={`/worldwide/${country}`} className="hover:text-ink-800">{c.emojiFlag} {c.name}</Link> · {u.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">{u.name}</h1>
        <p className="mt-1 text-sm text-ink-500">{u.location}</p>
        <p className="mt-4 max-w-3xl text-sm text-ink-700">{u.blurb}</p>

        {/* Rankings + facts grid */}
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {u.qsRank && <Fact label="QS World Rank" value={`#${u.qsRank}`} />}
          {u.timesRank && <Fact label="THE World Rank" value={`#${u.timesRank}`} />}
          {u.nationalRank && <Fact label="National Rank" value={`#${u.nationalRank}`} />}
          <Fact label="Tuition + living" value={u.tuitionRange} />
          {u.indianStudents && <Fact label="Indian students" value={u.indianStudents} />}
          <Fact label="Country" value={`${c.emojiFlag} ${c.name}`} />
        </dl>

        {/* Strong programs */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Strong programs for Indian applicants</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {u.strongPrograms.map((p) => (
            <li
              key={p}
              className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700"
            >
              {p}
            </li>
          ))}
        </ul>

        {/* Apply CTA */}
        <div className="mt-8 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">
            Apply directly
          </p>
          <p className="mt-1 text-sm text-ink-700">
            Shishya links go to the university's official admissions page.
            We have no agent/consultant agreement with any institution.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={u.admissionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600"
            >
              Open admissions page ↗
            </a>
            <a
              href={u.officialSite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-md border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              University website ↗
            </a>
          </div>
        </div>

        {/* Country context */}
        <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            Studying in {c.name} — the broader picture
          </h3>
          <p className="mt-2 text-xs">
            <strong className="text-ink-800">Visa:</strong> {c.visaType}.{" "}
            <strong className="text-ink-800">Post-study work:</strong> {c.postStudyWork}.{" "}
            <strong className="text-ink-800">PR pathway:</strong> {c.prPathway}
          </p>
          <Link
            href={`/worldwide/${country}`}
            className="mt-3 inline-flex text-xs text-saffron-700 underline"
          >
            Full {c.name} country guide →
          </Link>
        </div>

        {/* Sibling universities */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Other universities in {c.name}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {c.universities.filter((o) => o.slug !== u.slug).slice(0, 6).map((o) => (
            <li key={o.slug}>
              <Link
                href={`/worldwide/${country}/${o.slug}`}
                className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink-800">{value}</dd>
    </div>
  );
}
