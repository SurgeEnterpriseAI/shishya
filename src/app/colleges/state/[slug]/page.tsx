// /colleges/state/[slug] — per-state college landing.
//
// One indexable URL per Indian state with at least one ranked college,
// listing every college in our NIRF set in that state. Targets
// queries like "top colleges in Tamil Nadu", "best colleges in
// Karnataka", "उत्तर प्रदेश के कॉलेज", etc.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import {
  COLLEGES,
  formatNirfRanks,
  NIRF_SOURCE_YEAR,
  NIRF_SOURCE_URL,
  ALL_STREAMS,
} from "@/lib/colleges-data";
import { STATES, stateCodeFromSlug, stateSlug, languageList } from "@/lib/state-info";

export async function generateStaticParams() {
  const states = new Set<string>();
  for (const c of COLLEGES) states.add(c.state);
  return Array.from(states).map((code) => ({ slug: stateSlug(code) }));
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
  const count = COLLEGES.filter((c) => c.state === code).length;
  const year = new Date().getUTCFullYear();

  const title = `Top Colleges in ${st.name} ${year} (NIRF ${NIRF_SOURCE_YEAR}) | Shishya`;
  const description =
    `${count} ${st.name} (${st.nativeName} / ${st.hindiName}) colleges from the official NIRF ${NIRF_SOURCE_YEAR} rankings — ` +
    `IITs, IIMs, NITs, AIIMS, state and private universities. Free, sourced, no invented rankings.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/colleges/state/${slug}` },
    keywords: [
      `top colleges ${st.name}`,
      `${st.name} colleges`,
      `${st.name} NIRF ranking`,
      `${st.nativeName} colleges`,
      `${st.hindiName} कॉलेज`,
      `best colleges in ${st.name}`,
      `${st.name} engineering colleges`,
      `${st.name} medical colleges`,
      `${st.name} universities`,
      `${st.name} ${year}`,
    ],
    openGraph: {
      title,
      description,
      url: `https://shishya.in/colleges/state/${slug}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function CollegesByStatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const code = stateCodeFromSlug(slug);
  if (!code) notFound();
  const st = STATES[code];

  const filtered = COLLEGES.filter((c) => c.state === code).sort((a, b) => {
    const ar = Math.min(...Object.values(a.nirf).filter((x): x is number => typeof x === "number"), 999);
    const br = Math.min(...Object.values(b.nirf).filter((x): x is number => typeof x === "number"), 999);
    return ar - br;
  });
  if (filtered.length === 0) notFound();
  const year = new Date().getUTCFullYear();

  // Group by stream for the per-state breakdown.
  const byStream = new Map<string, typeof filtered>();
  for (const c of filtered) {
    for (const s of c.streams) {
      const list = byStream.get(s) ?? [];
      list.push(c);
      byStream.set(s, list);
    }
  }
  const streamSections = ALL_STREAMS.filter((s) => byStream.has(s.value));

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top colleges in ${st.name} (NIRF ${NIRF_SOURCE_YEAR})`,
    itemListElement: filtered.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://shishya.in/colleges/${c.slug}`,
      name: c.shortName,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Colleges", item: "https://shishya.in/colleges" },
      { "@type": "ListItem", position: 3, name: `${st.name} colleges`, item: `https://shishya.in/colleges/state/${slug}` },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/colleges" className="hover:text-ink-800">Colleges</Link> · {st.name}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          Top colleges in {st.name}
        </h1>
        <p className="mt-1 text-lg text-ink-500">{st.nativeName} · {st.hindiName}</p>

        <p className="mt-4 max-w-3xl text-sm text-ink-700">
          {filtered.length} colleges from {st.name} are in our curated NIRF
          {" "}{NIRF_SOURCE_YEAR} set — engineering, medical, management, law,
          universities and pharmacy. All free to browse, every rank cited
          directly from NIRF, every link goes to the college's own site.
        </p>
        <p className="mt-2 text-[11px] text-ink-500">
          Languages of instruction commonly available in this state:{" "}
          {languageList(st.languages)}. Source:{" "}
          <a href={NIRF_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
            National Institutional Ranking Framework
          </a>{" "}({NIRF_SOURCE_YEAR}).
        </p>

        {/* Show all colleges first as a flat ranked list, then a by-stream breakdown */}
        <h2 className="mt-8 text-base font-semibold text-ink-900">
          All {filtered.length} colleges in {st.name}
        </h2>
        <ol className="mt-3 space-y-3">
          {filtered.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/colleges/${c.slug}`}
                className="flex items-start gap-4 rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink-900">{c.shortName}</h3>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                      {c.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">{c.name}</p>
                  <p className="mt-1 text-[11px] text-ink-500">
                    {c.city} · est. {c.established}
                  </p>
                  <p className="mt-2 text-xs text-ink-700 line-clamp-2">{c.blurb}</p>
                  {formatNirfRanks(c.nirf) && (
                    <p className="mt-2 text-[10px] font-medium text-saffron-700">
                      {formatNirfRanks(c.nirf)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>

        {/* By-stream breakdown — useful for "engineering colleges in Tamil Nadu" type queries */}
        {streamSections.length > 1 && (
          <div className="mt-12">
            <h2 className="text-base font-semibold text-ink-900">
              By stream in {st.name}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {streamSections.map((s) => (
                <Link
                  key={s.value}
                  href={`/colleges?state=${code}&stream=${s.value}`}
                  className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  {s.label}{" "}
                  <span className="text-[10px] text-ink-500">
                    {byStream.get(s.value)?.length}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cross-link to state-specific exams */}
        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            Prepping for a {st.name} entrance exam?
          </h3>
          <p className="mt-2">
            Shishya covers all of {st.name}'s state-level entrance exams —
            TET, PSC, Police, CET, Polytechnic and more — with free adaptive
            mock tests, previous year papers and a built-in AI tutor.
          </p>
          <Link
            href={`/exams/state/${slug}`}
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Browse {st.name} entrance exams →
          </Link>
        </div>

        {/* Cross-link to other states */}
        <div className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Browse other states</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.keys(STATES)
              .filter((c) => c !== code && COLLEGES.some((coll) => coll.state === c))
              .map((c) => (
                <Link
                  key={c}
                  href={`/colleges/state/${stateSlug(c)}`}
                  className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  {STATES[c].name}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </main>
  );
}
