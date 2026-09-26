// /careers/[slug] — per-career detail page.
//
// 26 Sep 2026 (every-education-search wave):
//   • Occupation JSON-LD: name, description, qualifications, skills,
//     responsibilities, occupationLocation India, and estimatedSalary — one
//     MonetaryAmountDistribution per salary band, named "indicative", with
//     the band's own text and the sources src/data/careers.ts cites. The
//     10th/90th-percentile numbers are the band's own ends, read only from a
//     plain "₹a - ₹b LPA" / "Cr" band; any other band stays text only.
//   • exam chips (and exam links inside entry routes) link only codes in the
//     live catalogue — /exams/CLAT and /exams/BITSAT 404'd — other codes are
//     plain labels; careers whose data named no entrance exam get the one
//     their degree route needs (src/lib/section-related.ts);
//   • links to the /colleges/stream/* pages the career runs through;
//   • description cut at a sentence / word boundary (was .slice(0, 280));
//   • revalidate daily (the page now reads the live exam list).
// 26 Sep 2026 (G4): the FAQPage questions render visibly ("Questions").

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ExamChip } from "@/components/ExamChip";
import { CAREERS, findCareer, careerCategoryLabel, type CareerSalaryBand } from "@/data/careers";
import { loadLiveExams } from "@/lib/live-exam-codes";
import { CAREER_SALARY_SOURCES, careerCollegeStreams, careerExamCodes, salaryBandRange } from "@/lib/section-related";
import { clipDescription, examHubHref } from "@/lib/section-seo";

export const revalidate = 86_400;

function salaryDistribution(b: CareerSalaryBand) {
  const range = salaryBandRange(b.band);
  return {
    "@type": "MonetaryAmountDistribution",
    name: `${b.experience} (indicative)`,
    currency: "INR",
    duration: "P1Y",
    ...(range ? { percentile10: range[0], percentile90: range[1] } : {}),
    description: `Indicative band: ${b.band}${b.note ? ` (${b.note})` : ""}. Sources: ${CAREER_SALARY_SOURCES}.`,
  };
}

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
    description: clipDescription(`${c.dek} ${c.outlook}`),
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
  const [live] = await Promise.all([loadLiveExams()]);
  const examCodes = careerExamCodes(c);
  const streams = careerCollegeStreams(c);
  const url = `https://shishya.in/careers/${c.slug}`;

  const occupationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Occupation",
    name: c.name,
    url,
    description: clipDescription(`${c.dek} ${c.whatTheyDo}`, 300),
    qualifications: c.qualifications.join("; "),
    skills: c.skills.join("; "),
    responsibilities: c.dayToDay,
    occupationLocation: { "@type": "Country", name: "India" },
    estimatedSalary: c.salaryBands.map(salaryDistribution),
  };

  // FAQ (26 Sep 2026, G4): the three questions render visibly ("Questions"
  // below) from this one array, so the FAQPage markup never describes text a
  // reader cannot see. An answer with nothing in it is left out.
  const faq = [
    { q: `How to become a ${c.name}?`, a: c.entryRoutes.map((r) => `${r.title}. ${r.body}`).join(" ") },
    { q: `What is the salary of a ${c.name} in India?`, a: c.salaryBands.map((b) => `${b.experience}: ${b.band}`).join(". ") },
    { q: `What qualifications are needed to become a ${c.name}?`, a: c.qualifications.join(". ") },
  ].filter((f) => f.a.trim().length > 0);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(occupationJsonLd) }} />
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
                  {r.links.map((l, j) => {
                    // 26 Sep 2026: an /exams/{CODE} link renders only for a live exam.
                    const exam = /^\/exams\/([A-Z0-9_]+)$/.exec(l.href)?.[1];
                    if (exam && !examHubHref(exam, live)) {
                      return (
                        <span key={j} className="rounded-md border border-ink-200 bg-white px-2 py-0.5 text-[11px] text-ink-600">
                          {l.label}
                        </span>
                      );
                    }
                    return (
                      <Link
                        key={j}
                        href={l.href === "/exams" ? "/exams/browse" : l.href}
                        className="rounded-md border border-saffron-300 bg-saffron-50/40 px-2 py-0.5 text-[11px] text-saffron-800 hover:bg-saffron-100"
                      >
                        {l.label} →
                      </Link>
                    );
                  })}
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
          Indicative, wide bands — real salary depends on city, employer, performance. Pick the
          midpoint for planning. Sources: {CAREER_SALARY_SOURCES}.
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

        {/* Questions (26 Sep 2026, G4): the FAQPage items, visible. */}
        {faq.length > 0 && (
          <section className="mt-10" aria-labelledby="career-questions">
            <h2 id="career-questions" className="text-base font-semibold text-ink-900">Questions</h2>
            <dl className="mt-3 space-y-4 text-sm">
              {faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold text-ink-900">{f.q}</dt>
                  <dd className="mt-1 text-ink-700">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

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

        {/* Relevant exams — linked only when the exam has a live page. */}
        {examCodes.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Relevant exams</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {examCodes.map((e) => (
                <li key={e}>
                  <ExamChip
                    code={e}
                    live={live}
                    className="inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400"
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Colleges on the route (26 Sep 2026). */}
        {streams.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Colleges on this route</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {streams.map((s) => (
                <li key={s.value}>
                  <Link
                    href={`/colleges/stream/${s.value}`}
                    className="inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400"
                  >
                    {s.label} colleges →
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <nav aria-label="More on Shishya" className="mt-10 flex flex-wrap gap-2 text-xs">
          <Link href="/careers" className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
            All career guides →
          </Link>
          <Link href="/career-map" className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
            Career map →
          </Link>
          <Link href="/scholarships" className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
            Scholarships →
          </Link>
          <Link href="/exams/browse" className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
            Entrance and government exams →
          </Link>
        </nav>
      </section>
    </main>
  );
}
