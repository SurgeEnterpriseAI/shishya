// /scholarships/closing-soon — schemes whose 2026-27 last date, read on the
// official portal, falls in the next 30 IST days (26 Sep 2026, G4).
//
// Only a cycle with an official (or reported) closesOn counts
// (src/lib/scholarship-lists.ts closingSoon); a scheme's "usual window" is
// never treated as a date. noindex,follow until CLOSING_SOON_MIN schemes
// qualify; with none, the page says so and points to the full catalogue.
// Hourly ISR — the window moves with the IST day.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { CLOSING_SOON_DAYS, SCHOLARSHIP_FILTERS, closingSoon, formatIsoDay, isClosingSoonIndexable, istToday } from "@/lib/scholarship-lists";
import { ScholarshipTable } from "../ScholarshipTable";

export const revalidate = 3600;

const SITE = "https://shishya.in";
const URL = `${SITE}/scholarships/closing-soon`;

function lead(n: number, today: string): string {
  return n > 0
    ? `${n} ${n === 1 ? "scholarship closes" : "scholarships close"} in the ${CLOSING_SOON_DAYS} days from ${formatIsoDay(today)}, by the last date read on each scheme's official portal.`
    : `No scholarship in Shishya's catalogue has an official last date in the next ${CLOSING_SOON_DAYS} days that Shishya has read on its portal.`;
}

export async function generateMetadata(): Promise<Metadata> {
  const today = istToday();
  const list = closingSoon(today);
  const title = "Scholarships Closing Soon — Official 2026-27 Last Dates";
  const description = `${lead(list.length, today)} Each row links the official portal.`;
  return {
    title: `${title} | Shishya`,
    description,
    alternates: { canonical: URL },
    robots: isClosingSoonIndexable(list) ? undefined : { index: false, follow: true },
    openGraph: { title, description, url: URL, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default function ClosingSoonPage() {
  const today = istToday();
  const list = closingSoon(today);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Scholarships closing in the next 30 days",
      numberOfItems: list.length,
      itemListElement: list.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: `${SITE}/scholarships/${s.id}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Scholarships", item: `${SITE}/scholarships` },
        { "@type": "ListItem", position: 3, name: "Closing soon", item: URL },
      ],
    },
  ];
  const ld = (d: object) => JSON.stringify(d).replace(/</g, "\\u003c");

  return (
    <main className="min-h-screen bg-ink-50/40">
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(d) }} />
      ))}
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/scholarships" className="hover:text-ink-800">Scholarships</Link> · Closing soon
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">Scholarships closing soon</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">{lead(list.length, today)}</p>
        <p className="mt-2 max-w-3xl text-xs text-ink-500">
          Only dates read on the official portal are counted, with the day they were checked. Most schemes in the catalogue have no
          2026-27 date checked yet — their pages show the usual window instead. Confirm on the official link before you apply.
        </p>

        {list.length > 0 ? (
          <ScholarshipTable rows={list} today={today} />
        ) : (
          <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-8 text-center text-sm text-ink-600">
            Nothing to show today. Browse{" "}
            <Link href="/scholarships" className="text-saffron-700 underline">
              all scholarships
            </Link>{" "}
            or answer five questions in the{" "}
            <Link href="/scholarships/match" className="text-saffron-700 underline">
              match wizard
            </Link>
            .
          </p>
        )}

        <nav aria-label="Scholarship lists" className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-base font-semibold text-ink-900">Scholarship lists</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {SCHOLARSHIP_FILTERS.map((f) => (
              <li key={f.slug}>
                <Link href={`/scholarships/for/${f.slug}`} className="inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
                  {f.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/scholarships" className="inline-block rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
                All scholarships
              </Link>
            </li>
          </ul>
        </nav>
      </section>
    </main>
  );
}
