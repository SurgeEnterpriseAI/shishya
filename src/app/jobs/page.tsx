// /jobs — Jobs & Careers section landing.
//
// Information aggregator (not a job board). Surfaces:
//   1. Government job recruitment cadence (where to track + how to apply)
//   2. Internship discovery
//   3. Resume + interview prep
//   4. Skill-based career paths (non-degree)
//   5. Salaries (cross-link to /careers — single source of truth)

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { GOVT_JOBS, GOVT_JOB_CATEGORIES, govtJobsByCategory } from "@/data/govt-jobs";
import { CAREERS } from "@/data/careers";

export const metadata: Metadata = {
  title: "Jobs & Careers — Govt jobs, internships, resume + interview prep | Shishya",
  description:
    "Career pathways for Indian students. Government job catalogue (UPSC, SSC, IBPS, RRB, RBI, defence, teaching, judicial), internships, resume + interview prep, skill-based non-degree careers. Information aggregator — not a job board. No recruiter fees.",
  alternates: { canonical: "https://shishya.in/jobs" },
  keywords: [
    "government jobs india",
    "PIB notifications",
    "SSC CGL recruitment",
    "UPSC recruitment",
    "IBPS RBI SBI recruitment",
    "internships india",
    "AICTE internship",
    "career path india",
    "resume template fresher",
    "interview prep fresher",
    "skill based career india",
  ],
  openGraph: {
    title: "Jobs & Careers on Shishya",
    description: "Government job tracking, internships, resume + interview prep, skill careers.",
    url: "https://shishya.in/jobs",
    siteName: "Shishya",
    type: "website",
  },
};

export const revalidate = 86_400;

export default function JobsLanding() {
  const totalGovtJobs = GOVT_JOBS.length;
  const totalCareers = CAREERS.length;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Jobs & Careers
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          From your last exam to your first job — and beyond
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          Government job notifications, career paths, salary benchmarks,
          interview prep. Sourced from official portals and real professionals.
          Shishya is not a job board — we don&apos;t list openings or take
          recruiter fees. We help you understand career pathways: what&apos;s
          possible after your education, what each role actually involves, and
          where to find official applications.
        </p>

        {/* Four primary surfaces */}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          <li>
            <Link
              href="/jobs/govt-jobs"
              className="block h-full rounded-lg border border-ink-200 bg-white p-5 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                Government jobs
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">
                {totalGovtJobs} major recurring recruitments
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                UPSC CSE/ESE, SSC CGL/CHSL/MTS/GD, IBPS PO/Clerk, SBI, RBI,
                SEBI, NABARD, NDA/CDS, RRB, KVS/NVS, State PSCs. Cadence,
                eligibility, pattern, official portal — no aggregator links.
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/careers"
              className="block h-full rounded-lg border border-ink-200 bg-white p-5 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                Career paths + salaries
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">
                {totalCareers} careers with salary bands
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                What each career actually involves, entry routes,
                qualifications, salary bands by experience, day-to-day work,
                pros + cons. Sourced from NASSCOM, Naukri, 7th CPC, official
                pay scales.
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/jobs/internships"
              className="block h-full rounded-lg border border-ink-200 bg-white p-5 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                Internships
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">
                Where to actually find them
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                AICTE Internship Portal, government schemes (PM Internship,
                state internships), Internshala, college TPOs — what works
                and what's gimmick.
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/jobs/resume"
              className="block h-full rounded-lg border border-ink-200 bg-white p-5 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                Resume + interview prep
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">
                Templates + question banks
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                Fresher resume templates by career path, ATS-friendly formats,
                common interview questions per role, salary negotiation basics.
              </p>
            </Link>
          </li>
          <li>
            <Link
              href="/jobs/skill-careers"
              className="block h-full rounded-lg border border-ink-200 bg-white p-5 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                Skill-based careers
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">
                Non-degree paths that actually work
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                Coding, design, content, sales, finance ops, video editing,
                digital marketing. What you can earn without (or alongside) a
                traditional degree.
              </p>
            </Link>
          </li>
        </ul>

        {/* Govt jobs preview by category */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          Government recruitment — by category
        </h2>
        <ul className="mt-3 space-y-3">
          {GOVT_JOB_CATEGORIES.map((cat) => {
            const jobs = govtJobsByCategory(cat.slug);
            if (jobs.length === 0) return null;
            return (
              <li key={cat.slug} className="rounded-lg border border-ink-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink-900">{cat.label}</h3>
                  <span className="text-[10px] text-ink-500">{jobs.length} recurring recruitment{jobs.length === 1 ? "" : "s"}</span>
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {jobs.map((j) => (
                    <li key={j.slug}>
                      <Link
                        href={`/jobs/govt-jobs#${j.slug}`}
                        className="rounded-md border border-ink-200 bg-ink-50/40 px-2 py-1 text-[11px] text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
                      >
                        {j.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">Our position on job listings</p>
          <p className="mt-2">
            We don't aggregate daily notifications — there are 100+ sites
            doing that. Instead we surface: (1) what recurring recruitments
            exist; (2) when they typically happen; (3) what eligibility +
            pattern looks like; (4) where the official notification lives.
            That's the durable information; daily aggregation isn't our
            job.
          </p>
        </div>
      </section>
    </main>
  );
}
