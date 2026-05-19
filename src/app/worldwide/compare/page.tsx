// /worldwide/compare — Country comparison table.
//
// Side-by-side comparison of all 10 destination countries on the axes
// Indian students actually care about: cost, PSW visa length, PR
// pathway difficulty, English-medium availability, Indian community size.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { WORLDWIDE_COUNTRIES } from "@/lib/worldwide-data";

export const metadata: Metadata = {
  title: "Country Comparison — US, UK, Canada, Australia, Germany + more | Shishya",
  description:
    "Compare 10 study-abroad destinations side-by-side: cost, post-study work permit length, PR pathway difficulty, English-medium availability, Indian student community. Pick based on YOUR priorities.",
  alternates: { canonical: "https://shishya.in/worldwide/compare" },
  keywords: [
    "study abroad comparison",
    "best country to study abroad india",
    "US vs UK vs Canada vs Australia",
    "cheapest country to study abroad",
    "easiest PR for Indians",
  ],
};

export const revalidate = 86_400;

// Compact comparison rows — short labels to fit a wide table.
function compactCost(c: { costSummary: string }): string {
  // Try to find an annual range in the cost summary
  const m = c.costSummary.match(/(\$|£|€|CAD|AUD|SGD|NZD)\s?\d+k[^.]*?year/i);
  if (m) return m[0];
  return "see country page";
}

function compactPSW(c: { postStudyWork: string }): string {
  const m = c.postStudyWork.match(/(\d+\s?[–-]\s?\d+|\d+(\.5)?)\s?year/i);
  return m ? m[0].replace(/\s/g, "") : "varies";
}

function prDifficulty(slug: string): { label: string; tone: "green" | "amber" | "red" } {
  const map: Record<string, { label: string; tone: "green" | "amber" | "red" }> = {
    us: { label: "Hard (10-15 yr backlog)", tone: "red" },
    uk: { label: "Medium (salary gate £38k)", tone: "amber" },
    ca: { label: "Easy (Express Entry)", tone: "green" },
    au: { label: "Medium (occupation list)", tone: "amber" },
    de: { label: "Easy (EU Blue Card)", tone: "green" },
    ie: { label: "Easy (Critical Skills)", tone: "green" },
    sg: { label: "Hard (EP gate + selective)", tone: "red" },
    nz: { label: "Medium (point-based)", tone: "amber" },
    fr: { label: "Medium (Talent Passport)", tone: "amber" },
    nl: { label: "Easy (Highly Skilled Migrant)", tone: "green" },
  };
  return map[slug] ?? { label: "see country page", tone: "amber" };
}

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/worldwide" className="hover:text-ink-800">Worldwide</Link> · Country Comparison
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          Side-by-side country comparison
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          {WORLDWIDE_COUNTRIES.length} destinations on the axes Indian
          students actually weigh: cost, post-study work, PR difficulty,
          English-medium availability, top university count.
        </p>

        {/* Comparison table */}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink-300">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Country</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Tuition (intl)</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">PSW Visa</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">PR Pathway</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Top Unis</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-700">Indian Cohort</th>
              </tr>
            </thead>
            <tbody>
              {WORLDWIDE_COUNTRIES.map((c) => {
                const pr = prDifficulty(c.slug);
                const toneClass =
                  pr.tone === "green" ? "bg-emerald-100 text-emerald-800"
                  : pr.tone === "amber" ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800";
                return (
                  <tr key={c.slug} className="border-b border-ink-100 hover:bg-saffron-50/30">
                    <td className="px-3 py-3">
                      <Link href={`/worldwide/${c.slug}`} className="flex items-baseline gap-2 hover:text-saffron-800">
                        <span className="text-lg">{c.emojiFlag}</span>
                        <span className="font-semibold text-ink-900">{c.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-700">{compactCost(c)}</td>
                    <td className="px-3 py-3 text-xs text-ink-700">{compactPSW(c)}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${toneClass}`}>
                        {pr.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-700 tabular-nums">{c.universities.length}</td>
                    <td className="px-3 py-3 text-xs text-ink-700">{c.indianStudentCount.split("(")[0].trim()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-ink-500">
          PR difficulty is for Indian-born applicants specifically (US backlog
          + Singapore gate are reasons why "easy in general" countries become
          harder for Indians). Tuition figures are headline ranges — actual
          cost depends on programme + scholarships.
        </p>

        {/* Pick-by-priority shortcuts */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">Pick by priority</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              priority: "Cheapest tuition",
              recommendation: "🇩🇪 Germany (~€0)",
              detail: "Public universities are free even for non-EU. €170-1500/year admin fees only.",
              countrySlug: "de",
            },
            {
              priority: "Easiest PR for Indians",
              recommendation: "🇨🇦 Canada",
              detail: "Express Entry post-PGWP work. Indians make up ~25% of Canadian PR intake.",
              countrySlug: "ca",
            },
            {
              priority: "Best for STEM top-tier",
              recommendation: "🇺🇸 US",
              detail: "MIT, Stanford, CMU, Berkeley + ecosystem. Hard PR but unmatched programme depth.",
              countrySlug: "us",
            },
            {
              priority: "Shortest Master's (cost-effective)",
              recommendation: "🇬🇧 UK (1 year)",
              detail: "1-year Master's + 2-year Graduate Route work permit. Total time 3 years.",
              countrySlug: "uk",
            },
            {
              priority: "Best quality of life",
              recommendation: "🇳🇿 NZ or 🇳🇱 Netherlands",
              detail: "Consistently top-5 globally. Smaller cohort means less Indian community concentration but better integration.",
              countrySlug: "nz",
            },
            {
              priority: "Fast path to skilled job",
              recommendation: "🇮🇪 Ireland or 🇳🇱 Netherlands",
              detail: "Critical Skills / Highly Skilled Migrant visa thresholds are achievable for tech roles.",
              countrySlug: "ie",
            },
            {
              priority: "Asia hub + tax efficient",
              recommendation: "🇸🇬 Singapore",
              detail: "Top universities + Asia financial hub + low tax. Selective admission + tighter PR.",
              countrySlug: "sg",
            },
            {
              priority: "Best for engineering on a budget",
              recommendation: "🇩🇪 Germany",
              detail: "TUM, RWTH Aachen, KIT, Stuttgart — top engineering at near-zero tuition.",
              countrySlug: "de",
            },
            {
              priority: "EU residency pathway",
              recommendation: "🇩🇪 🇫🇷 🇳🇱 🇮🇪",
              detail: "All four offer EU/equivalent residency after 5 years of skilled work. Pick by language preference.",
              countrySlug: "fr",
            },
          ].map((p, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">{p.priority}</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{p.recommendation}</p>
              <p className="mt-1 text-xs text-ink-600">{p.detail}</p>
              <Link
                href={`/worldwide/${p.countrySlug}`}
                className="mt-2 inline-flex text-[11px] text-saffron-700 underline"
              >
                Open country page →
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">Cross-check before deciding</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
            <li>Read our <Link href="/insights/indian-students-abroad-shift" className="text-saffron-700 underline">study-abroad shift insights article</Link> for context.</li>
            <li>Review <Link href="/worldwide/loans" className="text-saffron-700 underline">education loan landscape</Link> for funding feasibility.</li>
            <li>Test prep: <Link href="/worldwide/test-prep/ielts" className="text-saffron-700 underline">IELTS</Link> / <Link href="/worldwide/test-prep/gre" className="text-saffron-700 underline">GRE</Link> / <Link href="/worldwide/test-prep/gmat" className="text-saffron-700 underline">GMAT</Link>.</li>
            <li>Talk to alumni — most countries have active Indian student associations.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
