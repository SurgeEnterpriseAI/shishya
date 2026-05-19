// /careers/[slug] — per-career detail page.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { CAREERS, findCareer, careerCategoryLabel } from "@/data/careers";

interface PageParams { slug: string }

export async function generateStaticParams() {
  return CAREERS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { slug } = await params;
  const c = findCareer(slug);
  if (!c) return { title: "Career not found — Shishya" };
  const year = new Date().getUTCFullYear();
  const title = `${c.name} Career in India ${year} — Salary, Qualifications, Path | Shishya`;
  return {
    title,
    description: `${c.dek} ${c.outlook}`.slice(0, 280),
    alternates: { canonical: `https://shishya.in/careers/${c.slug}` },
    keywords: c.keywords,
    openGraph: {
      title,
      description: c.dek,
      url: `https://shishya.in/careers/${c.slug}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
    },
  };
}

export default async function CareerPage({
  params,
}: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const c = findCareer(slug);
  if (!c) notFound();

  // FAQ JSON-LD: high-volume "how to become X / X salary" queries.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How to become a ${c.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: c.entryRoutes.map((r) => `${r.title}. ${r.body}`).join(" "),
        },
      },
      {
        "@type": "Question",
        name: `What is the salary of a ${c.name} in India?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: c.salaryBands.map((b) => `${b.experience}: ${b.band}`).join(". "),
        },
      },
      {
        "@type": "Question",
        name: `What qualifications are needed to become a ${c.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: c.qualifications.join(". "),
        },
      },
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Careers", item: "https://shishya.in/careers" },
      { "@type": "ListItem", position: 3, name: c.name, item: `https://shishya.in/careers/${c.slug}` },
    ],
  };

  // Related careers (filter to those that exist)
  const related = (c.related ?? [])
    .map((s) => findCareer(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/careers" className="hover:text-ink-800">Careers</Link> · {careerCategoryLabel(c.category)}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{c.name}</h1>
          <span className="rounded bg-saffron-100 px-2 py-0.5 text-[10px] font-medium text-saffron-800">
            {careerCategoryLabel(c.category)}
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-base text-ink-700">{c.dek}</p>

        {/* What they do */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">What they actually do</h2>
        <p className="mt-2 text-sm text-ink-700">{c.whatTheyDo}</p>

        {/* Day to day */}
        <h2 className="mt-8 text-base font-semibold text-ink-900">A typical day</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
          {c.dayToDay.map((d, i) => <li key={i}>{d}</li>)}
        </ul>

        {/* Entry routes */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">How to become a {c.name}</h2>
        <p className="mt-1 text-xs text-ink-500">{c.entryRoutes.length} viable paths.</p>
        <ul className="mt-3 space-y-3">
          {c.entryRoutes.map((r, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">{r.title}</p>
              <p className="mt-1 text-xs text-ink-700">{r.body}</p>
              {r.links && r.links.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.links.map((l, j) => (
                    <Link
                      key={j}
                      href={l.href}
                      className="rounded-md border border-saffron-300 bg-saffron-50/40 px-2 py-0.5 text-[11px] text-saffron-800 hover:bg-saffron-100"
                    >
                      {l.label} →
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Qualifications + skills */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-ink-900">Qualifications</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-700">
              {c.qualifications.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-ink-900">Skills that matter</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-700">
              {c.skills.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>

        {/* Salary bands */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Salary bands by experience</h2>
        <p className="mt-1 text-xs text-ink-500">
          Wide bands — real salary depends on city, employer, performance. Pick the
          midpoint for planning.
        </p>
        <ul className="mt-3 space-y-2">
          {c.salaryBands.map((b, i) => (
            <li key={i} className="rounded-md border border-ink-100 bg-white p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-ink-800">{b.experience}</span>
                <span className="font-semibold text-saffron-800">{b.band}</span>
              </div>
              {b.note && <p className="mt-1 text-[11px] text-ink-500">{b.note}</p>}
            </li>
          ))}
        </ul>

        {/* Growth + employers */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Career growth + employers</h2>
        <p className="mt-2 text-sm text-ink-700">{c.growthPath}</p>
        {c.topEmployers && c.topEmployers.length > 0 && (
          <>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Top employers (informational, not endorsement)
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {c.topEmployers.map((e, i) => (
                <li key={i} className="rounded-md border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700">
                  {e}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Pros + cons */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Honest pros + cons</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Pros</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
              {c.pros.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">Cons</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
              {c.cons.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>

        {/* Outlook */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Demand outlook</h2>
        <p className="mt-2 text-sm text-ink-700">{c.outlook}</p>

        {/* Related careers */}
        {related.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Related careers</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/careers/${r.slug}`}
                    className="block h-full rounded-lg border border-ink-200 bg-white p-3 transition-colors hover:border-saffron-400"
                  >
                    <p className="text-sm font-semibold text-ink-900">{r.name}</p>
                    <p className="mt-0.5 text-xs text-ink-600 line-clamp-2">{r.dek}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Relevant exams */}
        {c.examCodes && c.examCodes.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Relevant exams</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {c.examCodes.map((e) => (
                <li key={e}>
                  <Link
                    href={`/exams/${e}`}
                    className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400"
                  >
                    {e.replace(/_/g, " ")}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
