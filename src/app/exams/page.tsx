// /exams — public catalog of every active exam on Shishya.
//
// This page targets head SEO queries like "list of entrance exams in India",
// "free mock test exams", "SSC RRB NEET JEE preparation" by giving Google a
// single indexable hub that links to all 163 exam pages.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";

export const revalidate = 300; // 5 min — the underlying list barely changes

export const metadata: Metadata = {
  title: "All Entrance Exams in India — Free Mocks & AI Tutor | Shishya",
  description:
    "163 entrance exams across India in one place — national, state-level, olympiads, civil services, banking, teaching, defence. Free expert-curated mocks, previous year papers, and Shishya AI as your personal tutor.",
  alternates: { canonical: "https://shishya.in/exams" },
  keywords: [
    "entrance exams india",
    "free mock tests",
    "previous year papers",
    "exam preparation online",
    "SSC RRB NEET JEE UPSC preparation",
    "state level exams india",
    "olympiad mock tests",
    "Shishya AI tutor",
  ],
  openGraph: {
    title: "All Entrance Exams in India — Free Mocks & AI Tutor",
    description:
      "163 entrance exams across India in one place. Free, AI-tutored. Pick yours.",
    url: "https://shishya.in/exams",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  GOVT_JOBS: "Government Jobs",
  BANKING: "Banking",
  CIVIL_SERVICES: "Civil Services",
  MEDICAL: "Medical Entrance",
  ENGINEERING: "Engineering Entrance",
  TEACHING: "Teaching",
  UNIVERSITY: "University Entrance",
  MBA: "MBA Entrance",
  LAW: "Law Entrance",
  DEFENCE: "Defence",
  OLYMPIAD: "Olympiads",
  STATE_LEVEL: "State-Level Exams",
};

export default async function ExamsCatalogPage() {
  const exams = await prisma.exam.findMany({
    where: { active: true },
    select: {
      code: true,
      name: true,
      shortName: true,
      category: true,
      description: true,
      candidatesPerYear: true,
      _count: {
        select: {
          questions: { where: { validated: true } },
          mocks: { where: { userId: null } },
        },
      },
    },
    orderBy: [{ candidatesPerYear: "desc" }, { code: "asc" }],
  });

  // Group by category for an obvious topical structure (good for SEO outline
  // + students scanning by interest).
  const grouped = new Map<string, typeof exams>();
  for (const e of exams) {
    const key = e.category ?? "OTHER";
    const list = grouped.get(key) ?? [];
    list.push(e);
    grouped.set(key, list);
  }
  const sections = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);

  // Page-level Course/ItemList JSON-LD so Google can show the catalog as
  // a rich result.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Entrance Exams on Shishya",
    numberOfItems: exams.length,
    itemListElement: exams.slice(0, 50).map((e, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: e.shortName,
      url: `https://shishya.in/exams/${e.code}`,
    })),
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · All exams
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          All entrance exams on Shishya
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          {exams.length} entrance exams across India — national, state-level,
          olympiads, civil services, banking, teaching, defence. Free
          expert-curated mocks, previous year papers, and{" "}
          <strong>Shishya AI</strong> as your personal tutor on every exam.
          Pick yours below.
        </p>

        {sections.map(([cat, list]) => (
          <section key={cat} className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">
              {CATEGORY_LABELS[cat] ?? cat}{" "}
              <span className="text-xs font-normal text-ink-500">
                ({list.length})
              </span>
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((e) => {
                const isLive =
                  (e._count?.questions ?? 0) > 0 ||
                  (e._count?.mocks ?? 0) > 0;
                return (
                  <li key={e.code}>
                    <Link
                      href={`/exams/${e.code}`}
                      className="block rounded-md border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-ink-900">
                          {e.shortName}
                        </p>
                        <span
                          className={
                            isLive
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                              : "rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600"
                          }
                        >
                          {isLive ? "Live" : "Coming"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">
                        {e.name}
                      </p>
                      {e.description && (
                        <p className="mt-2 text-xs text-ink-600 line-clamp-2">
                          {e.description}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </section>
    </main>
  );
}
