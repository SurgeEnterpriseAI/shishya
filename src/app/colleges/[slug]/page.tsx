// /colleges/[slug] — per-college landing page.
//
// SEO-targeted: rank for "IIT Madras admission", "NIRF rank IIT Delhi",
// "AIIMS Delhi MBBS", "NLSIU Bangalore CLAT" — long-tail queries every
// college aspirant types. No invented rankings, no fee/cutoff numbers
// we can't source — we link out to the college's official site for
// anything that changes year to year.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import {
  COLLEGES,
  findCollege,
  formatNirfRanks,
  NIRF_SOURCE_YEAR,
  NIRF_SOURCE_URL,
  ALL_STREAMS,
} from "@/lib/colleges-data";
import { stateInfo } from "@/lib/state-info";
import { VerificationBadge, SectionVerificationSummary } from "@/components/VerificationBadge";

export async function generateStaticParams() {
  return COLLEGES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = findCollege(slug);
  if (!c) return { title: "College not found — Shishya" };
  const st = stateInfo(c.state);

  const ranksCopy = formatNirfRanks(c.nirf);
  const title = `${c.shortName} — ${ranksCopy || "Official Info"} | Shishya`;
  const description =
    `${c.name} (${c.city}, ${st?.name ?? c.state}). ${c.blurb} ` +
    (ranksCopy ? `${ranksCopy}. ` : "") +
    `Official website + verified info on Shishya.`;
  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: `https://shishya.in/colleges/${c.slug}` },
    keywords: [
      c.name,
      c.shortName,
      `${c.shortName} admission`,
      `${c.shortName} NIRF rank`,
      `${c.shortName} ${c.city}`,
      `${c.shortName} ${NIRF_SOURCE_YEAR}`,
      `${c.shortName} courses`,
      `${c.shortName} ${st?.name ?? c.state}`,
      ...c.streams.map((s) => `${c.shortName} ${s}`),
    ],
    openGraph: {
      title,
      description: description.slice(0, 300),
      url: `https://shishya.in/colleges/${c.slug}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function CollegePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = findCollege(slug);
  if (!c) notFound();
  const st = stateInfo(c.state);
  const ranksCopy = formatNirfRanks(c.nirf);

  // Cross-link to relevant exams for this college (best-effort by stream).
  // Doesn't fetch from the exams DB — uses well-known mappings so this
  // works at build time and stays cheap.
  const relevantExams: Array<{ shortName: string; code: string; reason: string }> = [];
  if (c.streams.includes("engineering")) {
    if (c.type === "Central" || c.shortName.startsWith("IIT")) {
      relevantExams.push({ shortName: "JEE Advanced", code: "JEE_ADVANCED", reason: "primary admission route to IITs" });
    }
    relevantExams.push({ shortName: "JEE Main", code: "JEE_MAIN", reason: "qualifying exam for engineering colleges" });
  }
  if (c.streams.includes("medical")) {
    relevantExams.push({ shortName: "NEET UG", code: "NEET_UG", reason: "MBBS admission" });
  }
  if (c.streams.includes("management")) {
    relevantExams.push({ shortName: "CAT", code: "CAT", reason: "PG management admission" });
  }
  if (c.streams.includes("law")) {
    relevantExams.push({ shortName: "CLAT", code: "CLAT", reason: "law school admission" });
  }

  // EducationalOrganization JSON-LD — Google rich-result eligible.
  const orgJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": c.streams.includes("university") ? "CollegeOrUniversity" : "EducationalOrganization",
    name: c.name,
    alternateName: c.shortName,
    url: c.website,
    foundingDate: String(c.established),
    address: {
      "@type": "PostalAddress",
      addressLocality: c.city,
      addressRegion: st?.name ?? c.state,
      addressCountry: "IN",
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Colleges", item: "https://shishya.in/colleges" },
      { "@type": "ListItem", position: 3, name: c.shortName, item: `https://shishya.in/colleges/${c.slug}` },
    ],
  };

  // "Similar colleges" — same state + at least one shared stream, excluding self.
  const similar = COLLEGES
    .filter((x) => x.slug !== c.slug && (x.state === c.state || x.streams.some((s) => c.streams.includes(s))))
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/colleges" className="hover:text-ink-800">Colleges</Link> · {c.shortName}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{c.shortName}</h1>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">{c.type}</span>
        </div>
        <p className="mt-1 text-sm text-ink-600">{c.name}</p>
        <p className="mt-1 text-xs text-ink-500">
          {c.city} · {st?.name ?? c.state} · established {c.established}{" "}
          <VerificationBadge status="ai" source="official college site" compact />
        </p>

        {ranksCopy && (
          <div className="mt-4 rounded-lg border border-saffron-200 bg-saffron-50/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">NIRF ranking</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-medium text-ink-900">{ranksCopy}</p>
              <VerificationBadge
                status="ai"
                source="NIRF"
                lastCheckedAt={`${NIRF_SOURCE_YEAR}-08-12`}
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-600">
              Source:{" "}
              <a href={NIRF_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
                National Institutional Ranking Framework
              </a>
              , Ministry of Education, Government of India.
            </p>
          </div>
        )}

        {/* Section-level verification summary — sets the trust tone for
            the whole page in one glance. */}
        <SectionVerificationSummary
          status="ai"
          source="NIRF + the college's official site"
          refreshCadence="every 30 days once the AI verification job ships"
        />

        <h2 className="mt-8 text-base font-semibold text-ink-900">About {c.shortName}</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">{c.blurb}</p>

        <h2 className="mt-8 text-base font-semibold text-ink-900">Streams &amp; faculty</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {c.streams.map((s) => {
            const label = ALL_STREAMS.find((x) => x.value === s)?.label ?? s;
            return (
              <Link
                key={s}
                href={`/colleges?stream=${s}`}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Cross-link to relevant exams — gives the visitor a direct path
            from "I want to apply here" to "let me start preparing". */}
        {relevantExams.length > 0 && (
          <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-900">
              Admission route
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              The entrance exam(s) typically required to apply here.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {relevantExams.map((e) => (
                <li key={e.code}>
                  <Link
                    href={`/exams/${e.code}`}
                    className="block rounded-md border border-ink-200 bg-saffron-50/20 p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/60"
                  >
                    <p className="text-sm font-medium text-ink-900">{e.shortName}</p>
                    <p className="mt-0.5 text-xs text-ink-600">{e.reason}</p>
                    <p className="mt-1 text-[10px] text-saffron-700">
                      Start a free mock test →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-base font-semibold text-ink-900">Official website &amp; sources</h2>
          <p className="mt-1 text-xs text-ink-500">
            For current courses, intake, fee structure, admission deadlines and
            placement reports, always check the official college site —
            those numbers change every cycle and Shishya intentionally doesn't
            republish them as if they're static facts.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={c.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
            >
              {c.website.replace(/^https?:\/\/(www\.)?/, "")} ↗
            </a>
            <a
              href={NIRF_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
            >
              NIRF rankings ↗
            </a>
          </div>
        </div>

        {/* Phase-2 note: stuff coming */}
        <div className="mt-8 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">What's still to come on this page</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Cutoff trends from past JoSAA / state counselling — last 3-5 years, branch + category breakdown</li>
            <li>Verified placement statistics from the college's own annual reports</li>
            <li>UG scholarship eligibility tied to this college</li>
            <li>Student discussion thread scoped to {c.shortName}</li>
          </ul>
        </div>

        {/* Similar colleges */}
        {similar.length > 0 && (
          <div className="mt-12">
            <h2 className="text-base font-semibold text-ink-900">You might also look at</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {similar.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/colleges/${s.slug}`}
                    className="block rounded-lg border border-ink-200 bg-white p-3 hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <p className="text-sm font-semibold text-ink-900">{s.shortName}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">{s.city} · {stateInfo(s.state)?.name ?? s.state}</p>
                    {formatNirfRanks(s.nirf) && (
                      <p className="mt-1 text-[10px] font-medium text-saffron-700">
                        {formatNirfRanks(s.nirf)}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
