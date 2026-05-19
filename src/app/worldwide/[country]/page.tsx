// /worldwide/[country] — per-country page.
//
// Shows cost summary, visa info, post-study work, PR pathway, language
// tests required, pros + cons for Indian applicants, university grid.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { findCountry, WORLDWIDE_COUNTRIES } from "@/lib/worldwide-data";

interface PageParams { country: string }

export async function generateStaticParams() {
  return WORLDWIDE_COUNTRIES.map((c) => ({ country: c.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { country } = await params;
  const c = findCountry(country);
  if (!c) return { title: "Not found — Shishya" };
  const year = new Date().getUTCFullYear();
  const title = `Study in ${c.name} from India ${year} — Tuition, Visa, PR, Top Universities | Shishya`;
  return {
    title,
    description: `Study in ${c.name} from India — ${c.indianStudentCount}. ${c.costSummary.slice(0, 120)} Visa: ${c.visaType}.`.slice(0, 280),
    alternates: { canonical: `https://shishya.in/worldwide/${country}` },
    keywords: [
      `study in ${c.name} from India`,
      `${c.name} student visa`,
      `${c.name} top universities`,
      `${c.name} post study work permit`,
      `${c.name} PR for Indians`,
      `${c.name} education loan`,
      `${c.name} tuition fees ${year}`,
    ],
    openGraph: {
      title,
      description: c.costSummary.slice(0, 200),
      url: `https://shishya.in/worldwide/${country}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
    },
  };
}

export default async function CountryPage({
  params,
}: { params: Promise<PageParams> }) {
  const { country } = await params;
  const c = findCountry(country);
  if (!c) notFound();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Worldwide", item: "https://shishya.in/worldwide" },
      { "@type": "ListItem", position: 3, name: c.name, item: `https://shishya.in/worldwide/${country}` },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/worldwide" className="hover:text-ink-800">Worldwide</Link> · {c.name}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <span className="text-4xl">{c.emojiFlag}</span>
          <h1 className="text-3xl font-bold text-ink-900">{c.name}</h1>
        </div>
        <p className="mt-1 text-sm text-ink-500">{c.indianStudentCount}</p>

        {/* Quick facts grid */}
        <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact label="Cost summary" value={c.costSummary} />
          <Fact label="Application timeline" value={c.applicationTimeline} />
          <Fact label="Visa type" value={c.visaType} />
          <Fact label="Post-study work" value={c.postStudyWork} />
          <Fact label="PR pathway" value={c.prPathway} />
          <Fact label="English test required" value={c.englishTest.join(", ")} />
        </dl>

        {/* Visa link CTA */}
        <div className="mt-6 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">
            Official visa portal
          </p>
          <p className="mt-1 text-sm text-ink-700">
            We never collect documents or process applications. Visa
            applications are filed directly with the {c.name} government.
          </p>
          <a
            href={c.visaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Open official {c.visaType} info ↗
          </a>
        </div>

        {/* Pros + cons */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">
          Pros and cons for Indian applicants
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              Pros
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
              {c.pros.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
              Cons
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
              {c.cons.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>

        {/* Universities */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">
          Top universities ({c.universities.length})
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Rankings shown are QS World University Rankings. THE/national
          rankings are visible on each university's detail page.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {c.universities.map((u) => (
            <li key={u.slug}>
              <Link
                href={`/worldwide/${country}/${u.slug}`}
                className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink-900">{u.name}</h3>
                  {u.qsRank && (
                    <span className="rounded bg-saffron-100 px-2 py-0.5 text-[10px] font-medium text-saffron-800">
                      QS #{u.qsRank}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-ink-500">{u.location}</p>
                <p className="mt-2 text-xs text-ink-700 line-clamp-2">{u.blurb}</p>
                <p className="mt-2 text-[11px] text-ink-500">
                  {u.tuitionRange}
                  {u.indianStudents && <> · {u.indianStudents} Indian students</>}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        {/* Cross-link to test prep + loans */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            href="/worldwide/test-prep/ielts"
            className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
          >
            <p className="text-sm font-semibold text-ink-900">
              English test prep ({c.englishTest[0]})
            </p>
            <p className="mt-1 text-xs text-ink-600">
              The first hurdle. We have an honest prep guide for {c.englishTest[0]}.
            </p>
          </Link>
          <Link
            href="/worldwide/loans"
            className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
          >
            <p className="text-sm font-semibold text-ink-900">
              Education loan landscape
            </p>
            <p className="mt-1 text-xs text-ink-600">
              SBI / HDFC / Axis / ICICI / NBFCs compared. No affiliate links.
            </p>
          </Link>
        </div>

        {/* Other countries */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Other countries</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {WORLDWIDE_COUNTRIES.filter((o) => o.slug !== c.slug).map((o) => (
            <li key={o.slug}>
              <Link
                href={`/worldwide/${o.slug}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                <span>{o.emojiFlag}</span> {o.name}
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
      <dd className="mt-1 text-xs text-ink-700">{value}</dd>
    </div>
  );
}
