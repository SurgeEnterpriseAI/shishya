// /careers — Career path catalogue landing.
//
// Every career page has: what they do, day-to-day, entry routes, skills,
// salary bands, growth path, pros, cons. Designed to be the SEO + decision
// surface for India's #1 search-query family: "career after X", "how to
// become X", "salary of X".

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { CAREERS, CAREER_CATEGORIES, careersByCategory } from "@/data/careers";

export const metadata: Metadata = {
  title: "Careers in India — 40+ career paths with salary, qualifications, growth | Shishya",
  description:
    "Honest career path guides for Indian students. What each career actually involves, entry routes, qualifications, salary bands by experience, day-to-day, pros + cons. Software engineer, doctor, IAS, CA, lawyer, designer, teacher, and more.",
  alternates: { canonical: "https://shishya.in/careers" },
  keywords: [
    "career options india",
    "career after 12th",
    "career after graduation",
    "how to become",
    "career salary india",
    "career path india",
    "career guidance india",
    "Indian career options",
  ],
  openGraph: {
    title: "Careers on Shishya",
    description: "40+ career path guides with salary, qualifications, growth — honest, sourced, free.",
    url: "https://shishya.in/careers",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

export const revalidate = 86_400;

export default function CareersLanding() {
  // ItemList JSON-LD for richer SERP
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Career paths covered by Shishya",
    numberOfItems: CAREERS.length,
    itemListElement: CAREERS.slice(0, 20).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `https://shishya.in/careers/${c.slug}`,
    })),
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Careers
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          Careers in India — what each actually involves
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          {CAREERS.length} career paths with honest salary bands, entry routes,
          qualifications, day-to-day work, growth ceiling, pros and cons. No
          marketing tone. No "all careers are great" — we tell you when one is
          oversupplied or when entry-level pay is suppressed.
        </p>

        <div className="mt-6 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">A note on salary numbers</p>
          <p className="mt-2 text-xs">
            Salary bands are wide on purpose. Real salaries vary by city,
            employer, performance, and timing. The bands give you an anchor —
            not a promise. Sources: NASSCOM, Naukri JobSpeak, 7th Pay
            Commission, PayScale aggregates, official ministry salary
            structures. Updated yearly.
          </p>
        </div>

        {/* Categories */}
        {CAREER_CATEGORIES.map((cat) => {
          const careers = careersByCategory(cat.slug);
          if (careers.length === 0) return null;
          return (
            <div key={cat.slug} className="mt-10">
              <h2 className="text-base font-semibold text-ink-900">{cat.label}</h2>
              <p className="mt-0.5 text-xs text-ink-500">{careers.length} career{careers.length === 1 ? "" : "s"}</p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {careers.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/careers/${c.slug}`}
                      className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                    >
                      <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                      <p className="mt-1 text-xs text-ink-600 line-clamp-2">{c.dek}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wider text-saffron-700">
                        {c.salaryBands[0]?.band} (entry) → {c.salaryBands[c.salaryBands.length - 1]?.band} (senior)
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Don't see your career? */}
        <div className="mt-12 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">Don't see your career here?</p>
          <p className="mt-2">
            Send feedback via the chat widget — we add new careers monthly. The
            catalogue grows as students ask for what they're considering.
            Roadmap: 100+ careers including aerospace engineer, marine
            biologist, chef, professional sportsperson, entrepreneur, urban
            planner, pilot, judge advocate, scientific officer, etc.
          </p>
        </div>
      </section>
    </main>
  );
}
