// /jobs/govt-jobs — Government job catalogue page.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { GOVT_JOBS, GOVT_JOB_CATEGORIES, govtJobsByCategory } from "@/data/govt-jobs";

export const metadata: Metadata = {
  title: "Government Jobs in India — UPSC, SSC, IBPS, RRB, RBI, Defence | Shishya",
  description:
    `${GOVT_JOBS.length} major recurring govt recruitments. Cadence, eligibility, pattern, official portal. UPSC CSE/ESE, SSC CGL/CHSL/MTS, IBPS PO/Clerk, SBI, RBI Grade B, SEBI, NABARD, NDA/CDS, RRB NTPC/Group D/ALP, KVS/NVS, State PSCs.`,
  alternates: { canonical: "https://shishya.in/jobs/govt-jobs" },
  keywords: [
    "government jobs india",
    "UPSC CSE recruitment",
    "SSC CGL CHSL MTS GD",
    "IBPS PO clerk",
    "SBI PO clerk",
    "RBI Grade B",
    "RRB NTPC Group D",
    "NDA CDS recruitment",
    "KVS NVS teacher recruitment",
  ],
};

export const revalidate = 86_400;

export default function GovtJobsPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/jobs" className="hover:text-ink-800">Jobs & Careers</Link> · Government Jobs
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          Government Jobs in India — {GOVT_JOBS.length} Major Recruitments
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          The recurring central + state govt recruitments worth tracking.
          For each: recruiting body, cadence, eligibility, pattern,
          starting salary, official portal. We link to the awarding body's
          own site — no third-party aggregators.
        </p>

        {/* Quick category nav */}
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Jump to category</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {GOVT_JOB_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <a href={`#${c.slug}`} className="rounded-md border border-ink-200 bg-saffron-50/40 px-2 py-1 text-[11px] text-ink-700 hover:border-saffron-400">
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Per-category sections */}
        {GOVT_JOB_CATEGORIES.map((cat) => {
          const jobs = govtJobsByCategory(cat.slug);
          if (jobs.length === 0) return null;
          return (
            <section key={cat.slug} id={cat.slug} className="mt-10">
              <h2 className="text-base font-semibold text-ink-900">{cat.label}</h2>
              <ul className="mt-3 space-y-3">
                {jobs.map((j) => (
                  <li key={j.slug} id={j.slug} className="rounded-lg border border-ink-200 bg-white p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base font-semibold text-ink-900">{j.name}</h3>
                      <span className="text-[10px] text-ink-500">{j.body}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-700">{j.dek}</p>

                    <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                      <div>
                        <dt className="font-semibold text-ink-500">Cadence</dt>
                        <dd className="mt-0.5 text-ink-800">{j.cadence}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink-500">Typical vacancies</dt>
                        <dd className="mt-0.5 text-ink-800">{j.typicalVacancies}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-semibold text-ink-500">Eligibility</dt>
                        <dd className="mt-0.5 text-ink-800">{j.eligibility}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-semibold text-ink-500">Pattern</dt>
                        <dd className="mt-0.5 text-ink-800">{j.pattern}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-ink-500">Starting salary</dt>
                        <dd className="mt-0.5 text-ink-800">{j.startingSalary}</dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={j.officialPortal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
                      >
                        Official portal ↗
                      </a>
                      {j.examCode && (
                        <Link
                          href={`/exams/${j.examCode}`}
                          className="inline-flex rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
                        >
                          Mocks + syllabus →
                        </Link>
                      )}
                      {j.careerSlug && (
                        <Link
                          href={`/careers/${j.careerSlug}`}
                          className="inline-flex rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
                        >
                          Career details →
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">How to track notifications</p>
          <p className="mt-2">
            Each recruitment has its own official portal (linked above). For
            real-time notifications, follow:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><a href="https://pib.gov.in/" target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">PIB India</a> — official press releases</li>
            <li><a href="https://employmentnews.gov.in/" target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">Employment News</a> — weekly digest of govt openings</li>
            <li>State-specific Employment Exchange portals</li>
            <li>Your local newspaper's recruitment classified section</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
