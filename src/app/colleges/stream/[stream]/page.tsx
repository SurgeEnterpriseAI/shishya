// /colleges/stream/[stream] — per-stream college landing.
//
// One indexable URL per stream (Engineering, Medical, Management, Law,
// University, Pharmacy, Architecture, Research). Each lists every
// college in our NIRF set offering that stream, ranked by the college's
// NIRF rank in THAT category specifically.
//
// SEO target: "top engineering colleges in India 2026", "best medical
// colleges India NIRF", "top NLU India law" etc. — head terms that
// students type every single day.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import {
  COLLEGES,
  ALL_STREAMS,
  type CollegeStream,
  formatNirfRanks,
  NIRF_SOURCE_YEAR,
  NIRF_SOURCE_URL,
} from "@/lib/colleges-data";
import { stateInfo } from "@/lib/state-info";

const STREAM_NAMES: Record<CollegeStream, { title: string; subtitle: string; nirfKey: keyof import("@/lib/colleges-data").NirfRanks }> = {
  engineering:  { title: "Engineering",     subtitle: "IIT system, NITs, top state and private engineering schools", nirfKey: "engineering" },
  medical:      { title: "Medical",         subtitle: "AIIMS network, top private medical colleges, specialised PG institutes", nirfKey: "medical" },
  management:   { title: "Management",      subtitle: "IIM system, top non-IIM B-schools, IIT management departments", nirfKey: "management" },
  law:          { title: "Law",             subtitle: "National Law Universities and other top law schools", nirfKey: "law" },
  university:   { title: "University / Sciences", subtitle: "Central and state research universities", nirfKey: "university" },
  pharmacy:     { title: "Pharmacy",        subtitle: "NIPER system and top pharmacy schools", nirfKey: "pharmacy" },
  architecture: { title: "Architecture",    subtitle: "Top architecture schools in India", nirfKey: "architecture" },
  research:     { title: "Research",        subtitle: "IISc, IITs and other top research institutions", nirfKey: "research" },
};

export async function generateStaticParams() {
  return ALL_STREAMS.map((s) => ({ stream: s.value }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stream: string }>;
}): Promise<Metadata> {
  const { stream } = await params;
  if (!(stream in STREAM_NAMES)) return { title: "Stream not found — Shishya" };
  const info = STREAM_NAMES[stream as CollegeStream];
  const year = new Date().getUTCFullYear();
  const count = COLLEGES.filter((c) => c.streams.includes(stream as CollegeStream)).length;

  const title = `Top ${info.title} Colleges in India ${year} (NIRF ${NIRF_SOURCE_YEAR}) | Shishya`;
  const description = `${count} ${info.title.toLowerCase()} colleges curated from NIRF ${NIRF_SOURCE_YEAR}. ${info.subtitle}. Free, sourced, no invented rankings.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/colleges/stream/${stream}` },
    keywords: [
      `top ${info.title.toLowerCase()} colleges india`,
      `best ${info.title.toLowerCase()} colleges india`,
      `${info.title} NIRF ${NIRF_SOURCE_YEAR}`,
      `top ${info.title.toLowerCase()} ${year}`,
      `${info.title.toLowerCase()} college rankings`,
      `${info.title.toLowerCase()} entrance exams`,
    ],
    openGraph: {
      title,
      description,
      url: `https://shishya.in/colleges/stream/${stream}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function CollegeStreamPage({
  params,
}: {
  params: Promise<{ stream: string }>;
}) {
  const { stream } = await params;
  if (!(stream in STREAM_NAMES)) notFound();
  const info = STREAM_NAMES[stream as CollegeStream];
  const streamKey = stream as CollegeStream;

  const filtered = COLLEGES.filter((c) => c.streams.includes(streamKey));
  if (filtered.length === 0) notFound();

  // Sort by the stream-specific NIRF rank if available; colleges without
  // that specific category rank go after, sorted by their best overall rank.
  filtered.sort((a, b) => {
    const ar = a.nirf[info.nirfKey];
    const br = b.nirf[info.nirfKey];
    if (ar !== undefined && br !== undefined) return ar - br;
    if (ar !== undefined) return -1;
    if (br !== undefined) return 1;
    // Both missing this stream's rank — fall back to overall
    const ao = a.nirf.overall ?? 999;
    const bo = b.nirf.overall ?? 999;
    return ao - bo;
  });

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Top ${info.title} colleges in India (NIRF ${NIRF_SOURCE_YEAR})`,
    numberOfItems: filtered.length,
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
      { "@type": "ListItem", position: 3, name: info.title, item: `https://shishya.in/colleges/stream/${stream}` },
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
          <Link href="/colleges" className="hover:text-ink-800">Colleges</Link> · {info.title}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          Top {info.title} colleges in India
        </h1>
        <p className="mt-1 text-sm text-ink-500">{info.subtitle}</p>
        <p className="mt-4 max-w-3xl text-sm text-ink-700">
          {filtered.length} colleges in our NIRF {NIRF_SOURCE_YEAR} set
          offer {info.title.toLowerCase()} programmes. The list below is
          ordered by NIRF {info.title} rank — colleges without a separate
          rank in this category fall to the end, sorted by their overall
          NIRF rank where available.
        </p>
        <p className="mt-2 text-[11px] text-ink-500">
          Source:{" "}
          <a href={NIRF_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
            National Institutional Ranking Framework
          </a>
          , Ministry of Education, Government of India ({NIRF_SOURCE_YEAR}).
        </p>

        <ol className="mt-8 space-y-3">
          {filtered.map((c) => {
            const streamRank = c.nirf[info.nirfKey];
            const fallbackOverall = streamRank === undefined ? c.nirf.overall : undefined;
            return (
              <li key={c.slug}>
                <Link
                  href={`/colleges/${c.slug}`}
                  className="flex items-start gap-4 rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  {/* Rank circle: stream-specific rank when present; "—"
                      otherwise (NOT a positional index — that would suggest
                      "this is the Nth college in the stream", which is
                      misleading for entries ranked only by overall NIRF). */}
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-saffron-100 font-bold text-saffron-800">
                    {streamRank !== undefined ? (
                      <span className="text-sm">#{streamRank}</span>
                    ) : fallbackOverall !== undefined ? (
                      <>
                        <span className="text-[9px] font-medium leading-none">Overall</span>
                        <span className="mt-0.5 text-sm leading-none">#{fallbackOverall}</span>
                      </>
                    ) : (
                      <span className="text-sm">—</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-sm font-semibold text-ink-900">{c.shortName}</h2>
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                        {c.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">{c.name}</p>
                    <p className="mt-1 text-[11px] text-ink-500">
                      {c.city} · {stateInfo(c.state)?.name ?? c.state} · est. {c.established}
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
            );
          })}
        </ol>

        {/* Cross-link to other streams */}
        <div className="mt-12 rounded-lg border border-ink-200 bg-white p-5">
          <h3 className="text-base font-semibold text-ink-900">Other streams</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_STREAMS.filter((s) => s.value !== streamKey).map((s) => (
              <Link
                key={s.value}
                href={`/colleges/stream/${s.value}`}
                className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
