// /colleges/iti-diploma — ITI + Polytechnic + Diploma pathway hub.
//
// ~6.5M Indian students follow this path. Largely invisible in
// mainstream education narrative. Real, employable, often better ROI
// than tier-3 BTech for many students.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ITI_TRADES, DIPLOMA_PROGRAMS, POLYTECHNIC_ENTRY_EXAMS } from "@/data/iti-diploma";

export const metadata: Metadata = {
  title: "ITI + Polytechnic + Diploma — Skill-based education pathways in India | Shishya",
  description:
    "ITI trades + Polytechnic diplomas — the parallel education track ~6.5M Indian students take. Electrician, fitter, welder, mechanic + Civil/Mech/Elec/CS diplomas. Realistic salary, lateral-entry to BTech, govt JE roles.",
  alternates: { canonical: "https://shishya.in/colleges/iti-diploma" },
  keywords: [
    "ITI courses india",
    "ITI electrician scope",
    "polytechnic admission india",
    "diploma engineering career",
    "lateral entry BTech",
    "junior engineer SSC JE",
    "diploma vs BTech",
  ],
};

export const revalidate = 86_400;

export default function ITIDiplomaPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/colleges" className="hover:text-ink-800">Colleges</Link> · ITI + Diploma
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          ITI, Polytechnic + Diploma — the parallel education path
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          ~6.5M Indian students take this path; the mainstream education
          discourse treats it as invisible. ITI trades (1-2 year, Class 10
          entry) + Polytechnic diplomas (3 year, Class 10 entry) lead to
          real, employable careers — often with better ROI than tier-3
          BTech.
        </p>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/40 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">An honest framing</p>
          <p className="mt-2 text-xs">
            ITI/Diploma vs BTech isn't "lower vs higher". It's "shorter,
            cheaper, hands-on, faster-to-earning vs longer, broader,
            theory-heavy, slower-to-earning". For students who don't get
            into tier-1 BTech AND don't want to spend 4 years + ₹5L+ at
            tier-3 BTech, the ITI/Diploma path is often the better bet.
            Lateral entry to BTech keeps the option open.
          </p>
        </div>

        {/* ITI Trades */}
        <h2 className="mt-10 text-xl font-bold text-ink-900">
          ITI Trades (10 most popular)
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          1-2 year programs entered after Class 10. NCVT/SCVT certified.
          Plus 1-year apprenticeship is standard.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {ITI_TRADES.map((t) => (
            <li key={t.slug} className="rounded-lg border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink-900">{t.name}</h3>
                <span className="text-[10px] text-ink-500">{t.duration}</span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-saffron-700">{t.startingSalary}</p>
              <p className="mt-2 text-xs text-ink-700">{t.whyThis}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                Career outcomes
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-ink-700">
                {t.outcomes.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">Where to apply for ITI</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Each state has its own ITI portal (e.g., scvtup.in for UP, vcsmsbpa.maharashtra.gov.in for Maharashtra)</li>
            <li>NCVT MIS portal — search for accredited govt + private ITIs in your district</li>
            <li>National Apprenticeship Promotion Scheme (NAPS) — apprenticeship + stipend after ITI</li>
            <li>Major employer apprenticeships: Railways, NTPC, BHEL, Maruti, Tata, Mahindra</li>
          </ul>
        </div>

        {/* Diploma Programs */}
        <h2 className="mt-12 text-xl font-bold text-ink-900">
          Polytechnic Diploma Programs
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          3-year programs entered after Class 10 (most) or Class 12 (some).
          Lateral entry to BTech 2nd year possible in most states.
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {DIPLOMA_PROGRAMS.map((d) => (
            <li key={d.slug} className="rounded-lg border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink-900">{d.name}</h3>
                <span className="text-[10px] text-ink-500">{d.duration}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-ink-500">Entry after {d.entryAfter}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-saffron-700">{d.startingSalary}</p>
              <p className="mt-2 text-xs text-ink-700">{d.whyThis}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Outcomes</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-ink-700">
                {d.outcomes.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
              <p className="mt-2 text-[11px] text-ink-600"><strong>Path to BTech:</strong> {d.pathToBTech}</p>
            </li>
          ))}
        </ul>

        {/* Polytechnic entrance exams */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          Polytechnic entrance exams (state)
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Each state runs its own polytechnic admission entrance after
          Class 10.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {POLYTECHNIC_ENTRY_EXAMS.map((e) => (
            <li key={e.code}>
              <Link
                href={`/exams/${e.code}`}
                className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                {e.name} →
              </Link>
            </li>
          ))}
        </ul>

        {/* Decision framework */}
        <div className="mt-12 rounded-lg border border-saffron-300 bg-saffron-50/50 p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">
            ITI vs Diploma vs BTech — which is right for you?
          </h2>
          <ul className="mt-3 space-y-3 text-xs">
            <li>
              <strong>Pick ITI</strong> if you want to earn within 2-3 years, prefer
              hands-on work, and want self-employment optionality. Best for
              students who didn't enjoy Class 9-10 theoretical learning but
              are good with hands + tools.
            </li>
            <li>
              <strong>Pick Polytechnic Diploma</strong> if you want junior engineer roles
              (PSU + govt) faster than BTech AND want to keep BTech open via
              lateral entry. Best for students who can handle some theory but
              don't want to invest 4 years at unknown college.
            </li>
            <li>
              <strong>Pick BTech</strong> if you can clear JEE / state CET into a
              reputable college (tier 1 or strong tier 2). Tier-3 BTech often
              has worse ROI than Diploma + lateral entry.
            </li>
          </ul>
        </div>

        {/* Cross-links */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/careers/iti-electrician" className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400">
            <p className="text-sm font-semibold text-ink-900">ITI Electrician — full career details →</p>
            <p className="mt-1 text-xs text-ink-600">Day-to-day, salary, growth path, top employers.</p>
          </Link>
          <Link href="/careers/iti-fitter" className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400">
            <p className="text-sm font-semibold text-ink-900">ITI Fitter / Machinist — career details →</p>
            <p className="mt-1 text-xs text-ink-600">Manufacturing + PSU career paths.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
