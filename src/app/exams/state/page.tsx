// /exams/state — government exams by state (15 Sep 2026, SEO/AEO wave 1).
//
// The index every state page hangs under: one card per state or union
// territory with at least one active exam, its exam count and first exams.
// Before this page the state pages' breadcrumb pointed at /exams (a redirect
// to /) and nothing listed all states in one crawlable place.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { getStateDirectory } from "@/lib/state-exams";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const year = new Date().getUTCFullYear();
  const dir = await getStateDirectory().catch(() => []);
  const examCount = dir.reduce((a, s) => a + s.exams.length, 0);
  const title = `Government Exams by State ${year} — All States & UTs | Shishya`;
  const description = `${examCount} state government exams across ${dir.length} states and union territories — pick your state for its exams, announced dates, where to apply, and free mock tests.`;
  const url = "https://shishya.in/exams/state";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StatesIndexPage() {
  const dir = await getStateDirectory().catch(() => []);
  const year = new Date().getUTCFullYear();
  const examCount = dir.reduce((a, s) => a + s.exams.length, 0);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Government exams by state ${year}`,
    itemListElement: dir.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://shishya.in/exams/state/${s.slug}`,
      name: `${s.name} government exams`,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Exams by state", item: "https://shishya.in/exams/state" },
    ],
  };
  const jsonLd = (d: object) => JSON.stringify(d).replace(/</g, "\\u003c");

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Exams by state
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">Government Exams by State {year}</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">
          {examCount} state government exams across {dir.length} states and union territories. Each state page
          lists its exams on Shishya, dates announced by the conducting body or reported with a source, where to
          apply, and free mock tests, syllabus and cutoffs for every exam.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dir.map((s) => (
            <li key={s.code}>
              <Link
                href={`/exams/state/${s.slug}`}
                className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
              >
                <h2 className="text-sm font-semibold text-ink-900">{s.name}</h2>
                <p className="text-xs text-ink-500">{s.nativeName === s.hindiName ? s.hindiName : `${s.nativeName} · ${s.hindiName}`}</p>
                <p className="mt-2 text-xs text-ink-700">
                  {s.exams.length} {s.exams.length === 1 ? "exam" : "exams"}: {s.exams.slice(0, 3).map((e) => e.shortName).join(", ")}
                  {s.exams.length > 3 ? "…" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/exam-calendar" className="font-medium text-saffron-700 hover:underline">Exam calendar</Link>
          <Link href="/exams/browse" className="font-medium text-saffron-700 hover:underline">Browse all exams</Link>
          <Link href="/find-your-exam" className="font-medium text-saffron-700 hover:underline">Which exam suits me?</Link>
          <Link href="/jobs-map" className="font-medium text-saffron-700 hover:underline">Government jobs map</Link>
        </p>
      </section>
    </main>
  );
}
