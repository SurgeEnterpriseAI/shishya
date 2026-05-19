// /colleges — Colleges & Graduation section landing.
//
// Phase 2 first cut: ~50 NIRF-ranked colleges hardcoded, filterable by
// stream + state + type, every entry links to a per-college page at
// /colleges/[slug]. No invented rankings — every rank cites NIRF 2024
// with the official source URL.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import {
  COLLEGES,
  ALL_STREAMS,
  type CollegeStream,
  type CollegeType,
  statesWithColleges,
  typesWithCounts,
  formatNirfRanks,
  NIRF_SOURCE_YEAR,
  NIRF_SOURCE_URL,
} from "@/lib/colleges-data";
import { STATES, stateInfo } from "@/lib/state-info";

export const revalidate = 86_400; // 24h

export const metadata: Metadata = {
  title: `Colleges & Graduation — NIRF ${NIRF_SOURCE_YEAR} top colleges by stream | Shishya`,
  description: `Search top NIRF ${NIRF_SOURCE_YEAR}-ranked Indian colleges by stream, state and type. Engineering, Medical, Management, Law, Universities, Pharmacy. Every rank cites NIRF directly — no invented rankings, no paid placements.`,
  alternates: { canonical: "https://shishya.in/colleges" },
  keywords: [
    "NIRF top colleges 2024",
    "top engineering colleges india",
    "top medical colleges india",
    "top management colleges india",
    "top law colleges india",
    "IIT IIM AIIMS NLU rankings",
    "college search india",
    "best universities india",
  ],
  openGraph: {
    title: `Colleges & Graduation — NIRF ${NIRF_SOURCE_YEAR}`,
    description: "Top NIRF colleges by stream, state and type. Free, sourced.",
    url: "https://shishya.in/colleges",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

interface SP {
  stream?: string;
  state?: string;
  type?: string;
}

export default async function CollegesLanding({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const stream = sp.stream as CollegeStream | undefined;
  const state = sp.state?.toUpperCase();
  const type = sp.type as CollegeType | undefined;

  const filtered = COLLEGES.filter((c) => {
    if (stream && !c.streams.includes(stream)) return false;
    if (state && c.state !== state) return false;
    if (type && c.type !== type) return false;
    return true;
  });

  // Best-rank-first sort: prefer the smallest rank number across whichever
  // categories this college appears in. Falls back to alphabetical.
  filtered.sort((a, b) => {
    const ra = Math.min(...Object.values(a.nirf).filter((x): x is number => typeof x === "number"), 999);
    const rb = Math.min(...Object.values(b.nirf).filter((x): x is number => typeof x === "number"), 999);
    if (ra !== rb) return ra - rb;
    return a.shortName.localeCompare(b.shortName);
  });

  function chipHref(patch: Partial<SP>) {
    const next = new URLSearchParams();
    const merged: SP = { stream, state, type, ...patch };
    if (merged.stream) next.set("stream", merged.stream);
    if (merged.state) next.set("state", merged.state);
    if (merged.type) next.set("type", merged.type);
    const qs = next.toString();
    return qs ? `/colleges?${qs}` : "/colleges";
  }

  const stateChips = statesWithColleges().sort((a, b) => {
    const an = COLLEGES.filter((c) => c.state === a).length;
    const bn = COLLEGES.filter((c) => c.state === b).length;
    return bn - an;
  });

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `NIRF ${NIRF_SOURCE_YEAR} top Indian colleges`,
    numberOfItems: filtered.length,
    itemListElement: filtered.slice(0, 50).map((c, i) => ({
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
      { "@type": "ListItem", position: 2, name: "Colleges & Graduation", item: "https://shishya.in/colleges" },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Colleges &amp; Graduation
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          Top NIRF {NIRF_SOURCE_YEAR} colleges in India
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">
          {COLLEGES.length} colleges curated from the official NIRF {NIRF_SOURCE_YEAR}{" "}
          rankings — engineering, medical, management, law, universities and
          pharmacy. Every rank below is from NIRF directly; click any college
          for an indexable page with the official website, NIRF citation and
          our writeup. No invented rankings, no paid placements.
        </p>
        <p className="mt-2 text-[11px] text-ink-500">
          Source: <a href={NIRF_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">National Institutional Ranking Framework</a>, Ministry of Education, Government of India ({NIRF_SOURCE_YEAR}).
        </p>

        {/* Decision-support entries */}
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          <li>
            <Link
              href="/colleges/cutoffs"
              className="block h-full rounded-lg border border-saffron-200 bg-saffron-50/30 p-4 transition-colors hover:border-saffron-400"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">Cutoffs</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">Reading cutoffs honestly</p>
              <p className="mt-0.5 text-[11px] text-ink-600">JoSAA/MCC/NLU sources, 5-step method, rank predictor caveats.</p>
            </Link>
          </li>
          <li>
            <Link
              href="/colleges/placements"
              className="block h-full rounded-lg border border-saffron-200 bg-saffron-50/30 p-4 transition-colors hover:border-saffron-400"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">Placements</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">Reading placement data honestly</p>
              <p className="mt-0.5 text-[11px] text-ink-600">Median vs Highest CTC, opt-out math, foreign-offer skew.</p>
            </Link>
          </li>
          <li>
            <Link
              href="/colleges/iti-diploma"
              className="block h-full rounded-lg border border-saffron-200 bg-saffron-50/30 p-4 transition-colors hover:border-saffron-400"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">ITI · Diploma</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">The parallel education path</p>
              <p className="mt-0.5 text-[11px] text-ink-600">ITI trades + Polytechnic diplomas. 6.5M students; often better ROI than tier-3 BTech.</p>
            </Link>
          </li>
        </ul>

        {/* Stream filter */}
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By stream</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ stream: undefined })} className={chipClass(!stream)}>
              All streams
            </Link>
            {ALL_STREAMS.map((s) => {
              const n = COLLEGES.filter((c) => c.streams.includes(s.value)).length;
              if (n === 0) return null;
              return (
                <Link
                  key={s.value}
                  href={chipHref({ stream: stream === s.value ? undefined : s.value })}
                  className={chipClass(stream === s.value)}
                >
                  {s.label} <span className="ml-1 text-[10px] opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>
          {stream && (
            <p className="mt-2 text-[11px] text-ink-500">
              Tip:{" "}
              <Link href={`/colleges/stream/${stream}`} className="text-saffron-700 underline">
                jump to the dedicated {ALL_STREAMS.find((s) => s.value === stream)?.label} page
              </Link>{" "}
              for a NIRF-ranked ordered list.
            </p>
          )}
        </div>

        {/* Type filter */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ type: undefined })} className={chipClass(!type)}>All types</Link>
            {typesWithCounts().map((t) => (
              <Link
                key={t.type}
                href={chipHref({ type: type === t.type ? undefined : t.type })}
                className={chipClass(type === t.type)}
              >
                {t.type} <span className="ml-1 text-[10px] opacity-70">{t.n}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* State filter */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By state</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ state: undefined })} className={chipClass(!state)}>All India</Link>
            {stateChips.map((c) => {
              const n = COLLEGES.filter((coll) => coll.state === c).length;
              const st = stateInfo(c);
              return (
                <Link
                  key={c}
                  href={chipHref({ state: state === c ? undefined : c })}
                  className={chipClass(state === c)}
                  title={st?.nativeName}
                >
                  {st?.name ?? c} <span className="ml-1 text-[10px] opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Filter summary */}
        {(stream || state || type) && (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-md border border-saffron-200 bg-saffron-50/60 px-3 py-2 text-xs text-ink-700">
            <span className="font-medium">{filtered.length} match</span>
            {stream && <span className="rounded bg-white px-2 py-0.5">stream: {ALL_STREAMS.find((s) => s.value === stream)?.label}</span>}
            {type && <span className="rounded bg-white px-2 py-0.5">type: {type}</span>}
            {state && <span className="rounded bg-white px-2 py-0.5">state: {stateInfo(state)?.name ?? state}</span>}
            <Link href="/colleges" className="ml-auto text-saffron-700 underline hover:text-saffron-800">clear all</Link>
          </div>
        )}

        {/* Result list */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center">
            <p className="text-sm text-ink-700">
              No colleges match these filters. <Link href="/colleges" className="text-saffron-700 underline">Clear all</Link>.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {filtered.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/colleges/${c.slug}`}
                  className="block rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  <div className="flex items-baseline justify-between gap-2">
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
                  <p className="mt-2 text-[10px] font-medium text-saffron-700">
                    {formatNirfRanks(c.nirf)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Scholarships — sibling discovery */}
        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            Funding your education
          </h3>
          <p className="mt-2">
            Shishya maintains a curated database of scholarships every Indian
            student can apply for — central government, state portals, private
            foundations, and international fellowships. All free to apply,
            with the official link on every entry.
          </p>
          <Link
            href="/scholarships"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Browse scholarships →
          </Link>
        </div>

        {/* Phase-2 status: explain what's coming and what's already live */}
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            What's still coming to this section
          </h3>
          <p className="mt-2">
            Cutoff trends per college × exam × category × branch, fee
            structures linked to official college fee pages, placement
            statistics from official reports only, and AI counselling
            (&quot;I scored X in JEE Main, what colleges should I
            consider?&quot;) that pulls from cutoff data + your category +
            state preference.
          </p>
          <p className="mt-2 text-[11px] text-ink-500">
            Phase 2 of the roadmap. Cross-link to the existing{" "}
            <Link href="/exams" className="text-saffron-700 underline">Entrance &amp; Government Exams</Link>{" "}
            section for the prep side; the {COLLEGES.length} colleges above
            are the first cut.
          </p>
        </div>
      </section>
    </main>
  );
}

function chipClass(active: boolean): string {
  return active
    ? "inline-flex items-center rounded-full bg-saffron-500 px-3 py-1 text-xs font-medium text-white shadow-sm"
    : "inline-flex items-center rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30";
}
