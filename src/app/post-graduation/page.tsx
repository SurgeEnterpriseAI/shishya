// /post-graduation — Post-Graduation hub.
//
// Reuses the Exam catalogue we already have (GATE, CAT, NEET PG,
// UGC NET, CSIR NET etc are already in /exams) and adds a decision
// surface on top: Industry vs Academic vs Civil Services vs Abroad.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Post-Graduation — GATE, CAT, NEET-PG, UGC-NET, fellowships | Shishya",
  description:
    "After UG, what next? PG entrance exams, research pathways, fellowships, civil services or industry — honest comparison. GATE, CAT, NEET-PG, UGC-NET, CSIR-NET, JAM, GPAT, CLAT-PG, IIM admissions.",
  alternates: { canonical: "https://shishya.in/post-graduation" },
  keywords: [
    "PG entrance exams india",
    "GATE preparation",
    "CAT preparation",
    "NEET PG preparation",
    "UGC NET preparation",
    "JAM exam",
    "PhD admission india",
    "CSIR JRF",
    "DST INSPIRE fellowship",
    "PMRF",
    "post graduation india",
    "after UG what next",
  ],
  openGraph: {
    title: "Post-Graduation on Shishya",
    description: "After UG: PG entrances, research, fellowships, civil services or industry. Honest decision support.",
    url: "https://shishya.in/post-graduation",
    siteName: "Shishya",
    type: "website",
  },
};

export const revalidate = 86_400;

// PG-relevant exam codes already in our Exam catalogue.
const PG_EXAM_CODES = [
  "GATE_CSE", "CAT", "UGC_NET", "CSIR_NET", "UPSC_PRELIMS",
  // Add more as they get seeded; the page survives if a code is absent.
];

interface ExamRow {
  code: string;
  shortName: string;
  name: string;
  category: string;
  candidatesPerYear: number | null;
}

const PATHWAYS = [
  {
    slug: "industry",
    icon: "💼",
    title: "Industry / Job",
    blurb: "Straight to work with a UG degree. Fastest path to earnings.",
    pros: ["Earning starts at 22-23", "Real-world skills compound fastest", "No PG opportunity cost"],
    cons: ["Lower starting ceiling without specialisation", "May plateau without later upskilling", "Service vs Product gap visible without strong UG college"],
    next: { label: "Browse Jobs & Careers", href: "/jobs" },
  },
  {
    slug: "pg-india",
    icon: "📚",
    title: "PG in India",
    blurb: "MTech / MSc / MBA / MD / MA — 1-2 more years for specialisation + better placements.",
    pros: ["Premium-institution leap (IIM/IIT MTech) materially boosts career", "GATE/CAT scores convert to PSU + corporate roles", "Civil-services entry stays open"],
    cons: ["1-2 years opportunity cost", "Top PG is as competitive as UG", "Not all PG produces ROI — pick programme + institution carefully"],
    next: { label: "PG entrance exams", href: "#pg-entrances" },
  },
  {
    slug: "research",
    icon: "🔬",
    title: "Research / PhD",
    blurb: "5-6 years for a doctorate. Stipend-funded via UGC NET-JRF, CSIR, ICMR, DST INSPIRE.",
    pros: ["UGC NET-JRF / CSIR JRF pays ₹37k-42k/month for 5 years", "Academic + R&D career path", "Strongest route to overseas faculty roles"],
    cons: ["5+ years before earning rises", "Academic job market in India is tight", "Industry PhD ROI is real but specific to fields"],
    next: { label: "Research + fellowships", href: "#research" },
  },
  {
    slug: "civil-services",
    icon: "🏛️",
    title: "Civil Services",
    blurb: "UPSC / state PSC — IAS, IPS, IFS, group A/B services.",
    pros: ["Compensation + status durable for 30+ years", "Public-service impact at scale", "Entry once cleared is irreversible"],
    cons: ["Multi-year prep, low success rate (~0.2% UPSC clears)", "Age limit reality (32 general, 35 OBC, 37 SC/ST)", "Opportunity cost real if you don't clear"],
    next: { label: "UPSC + state PSC", href: "/exams/UPSC_PRELIMS" },
  },
  {
    slug: "study-abroad",
    icon: "🌏",
    title: "PG Abroad",
    blurb: "MS in US, MBA UK/Europe, MEng/MASc Canada. 1-2 years; significant tuition; PR pathways vary.",
    pros: ["Top-rank programmes outclass Indian PG in some fields (CS, ML, biomed)", "Post-study work permit + PR pathway in some countries", "Income jump on graduation in target markets"],
    cons: ["$30k-200k tuition + living cost", "PR backlog reality (US for Indians especially)", "Cost-of-living + healthcare is on-student"],
    next: { label: "Worldwide section", href: "/worldwide" },
  },
];

export default async function PostGraduationLanding() {
  // Cross-link to the PG exams we already have built — reuses the
  // exam catalogue rather than duplicating data.
  const pgExams = await prisma.$queryRaw<ExamRow[]>`
    SELECT "code", "shortName", "name", "category"::text AS category,
           "candidatesPerYear"
    FROM "Exam"
    WHERE "code" = ANY(${PG_EXAM_CODES}::text[]) AND "active" = TRUE
    ORDER BY "candidatesPerYear" DESC NULLS LAST
  `.catch(() => [] as ExamRow[]);

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Post-Graduation
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          After graduation — your next step, mapped out
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          PG entrances, research paths, fellowships, careers. Real outcomes
          from students who took each path. Verified, free. Pick on YOUR
          priorities — opportunity cost, earning curve, risk tolerance, family
          situation — not on what your peer group is doing.
        </p>

        {/* Five pathways grid — each card holds title + blurb + Pros
            list + Cons list + CTA, so they need real width. 3 columns
            at lg (~960px container, ~310px/card) squished the lists.
            2-col at lg, 3-col only at xl+ keeps them readable. */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Five real paths</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PATHWAYS.map((p) => (
            <li key={p.slug} className="rounded-lg border border-ink-200 bg-white p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl">{p.icon}</span>
                <h3 className="text-base font-semibold text-ink-900">{p.title}</h3>
              </div>
              <p className="mt-2 text-xs text-ink-600">{p.blurb}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Pros</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-ink-700">
                {p.pros.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-rose-700">Cons</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] text-ink-700">
                {p.cons.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
              <Link
                href={p.next.href}
                className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
              >
                {p.next.label} →
              </Link>
            </li>
          ))}
        </ul>

        {/* PG entrance exams — cross-link to existing exam pages */}
        <h2 id="pg-entrances" className="mt-12 text-base font-semibold text-ink-900">
          PG entrance exams
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Each entrance gets the same Shishya treatment: mock tests, PYQ, AI
          tutor, syllabus. Click any to enter.
        </p>
        {pgExams.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pgExams.map((e) => (
              <li key={e.code}>
                <Link
                  href={`/exams/${e.code}`}
                  className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                    {e.category.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{e.shortName}</p>
                  <p className="mt-0.5 text-[11px] text-ink-600 line-clamp-2">{e.name}</p>
                  {e.candidatesPerYear && (
                    <p className="mt-1 text-[10px] text-ink-500">
                      ~{(e.candidatesPerYear / 100000).toFixed(1)}L candidates/year
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded border border-dashed border-ink-300 bg-white p-4 text-xs text-ink-600">
            PG entrance exams are populated via the seeding pipeline.
            Browse <Link href="/exams" className="text-saffron-700 underline">all exams</Link> for
            the complete catalogue.
          </div>
        )}

        {/* Research + fellowships */}
        <h2 id="research" className="mt-12 text-base font-semibold text-ink-900">
          Research + fellowships
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { name: "UGC NET-JRF", body: "₹37k/month for 2 years + ₹42k/month for next 3. Most-used PhD funding gateway.", href: "/scholarships/ugc-net-jrf" },
            { name: "CSIR NET-JRF", body: "Same stipend as UGC NET-JRF; for life sciences, physics, chem, math.", href: "/scholarships/ugc-net-jrf" },
            { name: "ICMR JRF", body: "₹37k/month for medical/biomedical research at any ICMR institute or recognised university.", href: "/scholarships/icmr-jrf-srf" },
            { name: "DST INSPIRE-SHE", body: "₹80k/year for 5 years for top 1% Class 12 students in basic + natural sciences.", href: "/scholarships/inspire-she" },
            { name: "Maulana Azad Fellowship", body: "5-year MPhil/PhD fellowship for minority students. ₹31-35k/month + HRA + contingency.", href: "/scholarships/maulana-azad-fellowship" },
            { name: "PMRF", body: "Prime Minister's Research Fellowship — ₹70k-80k/month + ₹2L/year research grant for PhD at IITs/IISc.", href: "/post-graduation#pmrf" },
          ].map((f) => (
            <li key={f.name} className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">{f.name}</p>
              <p className="mt-1 text-xs text-ink-600">{f.body}</p>
              <Link href={f.href} className="mt-2 inline-flex text-[11px] text-saffron-700 underline">
                Details →
              </Link>
            </li>
          ))}
        </ul>

        {/* Decision framework */}
        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">
            How to actually decide
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs">
            <li><strong>Estimate ROI honestly.</strong> Lifetime earning curve of each path vs the next 2-year opportunity cost. PG only beats industry if the institution rank is high enough OR you're switching fields.</li>
            <li><strong>Risk tolerance.</strong> Civil services + PhD are long bets with low probability of clearing/finishing. Industry + PG-tier-2 are higher-probability medium-outcome bets.</li>
            <li><strong>Family situation.</strong> Single earner expected? PhD's 5-year stipend timeline may not fit. Stay realistic.</li>
            <li><strong>Country preference.</strong> If you're settled on staying in India, US MS is overrated for the PR backlog Indians face. If you want to leave, prioritise countries by realistic PR pathway (Canada, Germany, Australia &gt; US/UK for Indian-born applicants).</li>
            <li><strong>Backup plan.</strong> Civil services aspirants who don't clear typically lose 3-5 years. Plan a parallel track (NET-JRF, MBA, govt-job entrance) so the time doesn't fully disappear.</li>
          </ol>
        </div>

        <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">Roadmap</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Cutoff trends per (PG exam × institution × category) — same approach as our UG cutoff section</li>
            <li>Programme-level pages for IIM PGP, IIT MTech specialisations, NEET-SS branches</li>
            <li>"Worked it out the hard way" alumni stories — community-sourced as the user base grows</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
