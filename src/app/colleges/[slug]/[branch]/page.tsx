// /colleges/[slug]/[branch] — per-branch detail page.
//
// Long-tail SEO + decision-utility for "[College] [Branch] cutoff /
// placement" queries. Highest-volume Indian-education search family
// outside of "[career] salary".

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { COLLEGES } from "@/lib/colleges-data";
import {
  findCollegeDetail,
  findBranch,
  allBranchPaths,
} from "@/data/college-details";
import { findCareer } from "@/data/careers";

interface PageParams { slug: string; branch: string }

export async function generateStaticParams() {
  return allBranchPaths().map((p) => ({ slug: p.collegeSlug, branch: p.branchSlug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { slug, branch } = await params;
  const college = COLLEGES.find((c) => c.slug === slug);
  const b = findBranch(slug, branch);
  if (!college || !b) return { title: "Not found — Shishya" };
  const year = new Date().getUTCFullYear();
  const title = `${college.shortName} ${b.shortName} ${year} — Placements, Cutoff, Salary | Shishya`;
  return {
    title,
    description: `${college.shortName} ${b.name} (${b.degree}) ${year}: placements (median + top), JoSAA/MCC closing ranks, career outcomes, salary. ${b.blurb}`.slice(0, 280),
    alternates: { canonical: `https://shishya.in/colleges/${slug}/${branch}` },
    keywords: [
      `${college.shortName} ${b.shortName} placement`,
      `${college.shortName} ${b.shortName} cutoff`,
      `${college.shortName} ${b.name} salary`,
      `${college.shortName} ${b.shortName} fees`,
      `${college.shortName} ${b.shortName} ${year}`,
      `${college.shortName} ${b.shortName} JoSAA cutoff`,
    ],
  };
}

export default async function BranchPage({
  params,
}: { params: Promise<PageParams> }) {
  const { slug, branch } = await params;
  const college = COLLEGES.find((c) => c.slug === slug);
  const detail = findCollegeDetail(slug);
  const b = findBranch(slug, branch);
  if (!college || !detail || !b) notFound();

  // Related branches at the same college
  const siblings = detail.branches.filter((x) => x.slug !== b.slug);

  // Career cross-links
  const relatedCareers = (b.careerSlugs ?? [])
    .map((s) => findCareer(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  // Aggregate cutoffs by category for the latest year
  const latestYear = Math.max(...b.cutoffs.map((c) => c.year), 0);
  const latestYearCutoffs = b.cutoffs.filter((c) => c.year === latestYear && !c.gender);

  // Aggregate placement data
  const latestPlacement = b.placements.length > 0
    ? b.placements.reduce((a, c) => (a.year > c.year ? a : c))
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Colleges", item: "https://shishya.in/colleges" },
      { "@type": "ListItem", position: 3, name: college.shortName, item: `https://shishya.in/colleges/${slug}` },
      { "@type": "ListItem", position: 4, name: b.name, item: `https://shishya.in/colleges/${slug}/${branch}` },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/colleges" className="hover:text-ink-800">Colleges</Link> ·{" "}
          <Link href={`/colleges/${slug}`} className="hover:text-ink-800">{college.shortName}</Link> · {b.shortName}
        </p>

        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">
            {college.shortName} — {b.name}
          </h1>
          <span className="rounded bg-saffron-100 px-2 py-0.5 text-[10px] font-medium text-saffron-800">
            {b.degree} · {b.durationYears} years{b.seats ? ` · ${b.seats} seats` : ""}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-500">{college.name}</p>
        <p className="mt-4 max-w-3xl text-sm text-ink-700">{b.blurb}</p>

        {/* Headline numbers */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {latestPlacement && (
            <>
              <Stat label={`Median CTC ${latestPlacement.year}`} value={`₹${latestPlacement.medianLpa}L`} />
              {latestPlacement.topLpa && (
                <Stat label="Top CTC" value={`₹${latestPlacement.topLpa}L`} note="One offer; not representative" />
              )}
              {latestPlacement.placementPct !== undefined && (
                <Stat label="Placement %" value={`${latestPlacement.placementPct}%`} />
              )}
            </>
          )}
          {latestYearCutoffs.length > 0 && (
            <Stat
              label={`JoSAA ${latestYear} (Gen)`}
              value={`#${latestYearCutoffs.find((c) => c.category === "GEN")?.closingRank ?? "—"}`}
              note="Round-6 closing rank"
            />
          )}
        </div>

        {/* Placements table */}
        {b.placements.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">
              Placement trend — last {b.placements.length} years
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              Median CTC = middle 50%, not "highest". Read{" "}
              <Link href="/colleges/placements" className="text-saffron-700 underline">how to interpret placement data</Link> first.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-ink-300">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Year</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Median CTC</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Top CTC</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Placement %</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {b.placements.map((p, i) => (
                    <tr key={i} className="border-b border-ink-100">
                      <td className="px-3 py-2 text-sm text-ink-800 tabular-nums">{p.year}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-saffron-800 tabular-nums">₹{p.medianLpa}L</td>
                      <td className="px-3 py-2 text-xs text-ink-700 tabular-nums">{p.topLpa ? `₹${p.topLpa}L` : "—"}</td>
                      <td className="px-3 py-2 text-xs text-ink-700 tabular-nums">{p.placementPct !== undefined ? `${p.placementPct}%` : "—"}</td>
                      <td className="px-3 py-2 text-[10px]">
                        <a href={p.source} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
                          Official report ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Cutoff table */}
        {b.cutoffs.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">
              JoSAA / MCC closing ranks by category
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              Round-6 closing ranks (final cutoff). Read{" "}
              <Link href="/colleges/cutoffs" className="text-saffron-700 underline">how to interpret cutoffs</Link>.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[500px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-ink-300">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Year</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Category</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Closing rank</th>
                  </tr>
                </thead>
                <tbody>
                  {b.cutoffs.map((c, i) => (
                    <tr key={i} className="border-b border-ink-100">
                      <td className="px-3 py-2 text-sm text-ink-800 tabular-nums">{c.year}</td>
                      <td className="px-3 py-2 text-sm text-ink-800">
                        {c.category}{c.gender === "female" ? " (Female pool)" : ""}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-saffron-800 tabular-nums">#{c.closingRank.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Career outcomes */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Career outcomes</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
          {b.outcomes.map((o, i) => <li key={i}>{o}</li>)}
        </ul>

        {/* Related careers */}
        {relatedCareers.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Related career deep-dives</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relatedCareers.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/careers/${c.slug}`}
                    className="block h-full rounded-lg border border-ink-200 bg-white p-3 transition-colors hover:border-saffron-400"
                  >
                    <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                    <p className="mt-1 text-xs text-ink-600 line-clamp-2">{c.dek}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Entry exam */}
        {detail.entryExamCode && (
          <div className="mt-10 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">Entry exam</p>
            <p className="mt-1 text-sm text-ink-700">
              Admission via{" "}
              <Link href={`/exams/${detail.entryExamCode}`} className="text-saffron-700 underline">
                {detail.entryExamCode.replace(/_/g, " ")}
              </Link>{" "}
              — open the exam page for syllabus, PYQ, mocks, and study help.
            </p>
          </div>
        )}

        {/* Sibling branches */}
        {siblings.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">
              Other branches at {college.shortName}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {siblings.map((sb) => (
                <li key={sb.slug}>
                  <Link
                    href={`/colleges/${slug}/${sb.slug}`}
                    className="block h-full rounded-lg border border-ink-200 bg-white p-3 transition-colors hover:border-saffron-400"
                  >
                    <p className="text-sm font-semibold text-ink-900">{sb.name}</p>
                    {sb.placements.length > 0 && (
                      <p className="mt-1 text-[11px] text-saffron-700">
                        Median ₹{sb.placements[0].medianLpa}L · {sb.placements[0].year}
                      </p>
                    )}
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

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{value}</p>
      {note && <p className="mt-0.5 text-[10px] text-ink-500">{note}</p>}
    </div>
  );
}
