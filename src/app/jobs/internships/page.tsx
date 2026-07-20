// /jobs/internships — Internship discovery guide.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Internships in India — Where to actually find them | Shishya",
  description:
    "Honest guide to internships for Indian students. AICTE Internship Portal, PM Internship Scheme, state schemes, Internshala, college TPOs, direct outreach. What works, what's a gimmick.",
  alternates: { canonical: "https://shishya.in/jobs/internships" },
  keywords: [
    "internships india",
    "AICTE internship portal",
    "PM internship scheme",
    "Internshala",
    "winter internship india",
    "summer internship india",
    "research internship india",
  ],
};

export const revalidate = 86_400;

const CHANNELS = [
  {
    name: "AICTE Internship Portal",
    type: "Govt — Direct apply",
    url: "https://internship.aicte-india.org/",
    coverage: "Engineering + tech + research internships at PSUs, ministries, R&D labs, AICTE-approved institutions",
    works: "When you're a BTech student at an AICTE-approved college. PSU + govt-research internships listed are real.",
    doesnt: "Not strong for non-engineering students. Limited private-sector listings.",
  },
  {
    name: "PM Internship Scheme (2024+)",
    type: "Govt — New, cohort-based",
    url: "https://pminternship.mca.gov.in/",
    coverage: "12-month internships at top 500 Indian companies for 21-24 yr-old students. Stipend ₹5,000/month + ₹6,000 one-time grant",
    works: "If shortlisted, gives real exposure at named companies (Reliance, Tata, ITC, HDFC, ICICI etc.)",
    doesnt: "First cycle just started — outcomes still emerging. Selection ratio competitive.",
  },
  {
    name: "Internshala",
    type: "Private — Listings + apply",
    url: "https://internshala.com/",
    coverage: "Largest India internship aggregator. Tech, marketing, design, content, finance internships",
    works: "Strong volume of legitimate openings. Many startups + mid-tier firms list here. Stipends ₹0-25k/month typical.",
    doesnt: "Unpaid internships are common — verify before accepting. 'Internship Online Training' upsells are mostly avoidable.",
  },
  {
    name: "LinkedIn",
    type: "Private — Listings + direct outreach",
    url: "https://www.linkedin.com/jobs/",
    coverage: "Mid-tier + top company internships; especially strong for tech + finance + marketing roles",
    works: "Direct outreach to alumni at target companies often gets a response. Listings credible.",
    doesnt: "Less useful for tier-3 city students with weak network. Requires LinkedIn Premium for many features.",
  },
  {
    name: "College TPO (Training & Placement)",
    type: "Direct — College-mediated",
    url: "",
    coverage: "Companies that already recruit from your college; faculty network for research internships",
    works: "Highest hit rate IF your college has strong placements. IIT/NIT TPOs run summer internship cycles to FAANG/MBB.",
    doesnt: "Tier-3 college TPOs often have limited internship channels.",
  },
  {
    name: "IIT/IISc/IISER summer programs",
    type: "Direct — Research",
    url: "https://www.iiscsre.iisc.ac.in/",
    coverage: "Summer Research Fellowship Programs at IIT/IISc/IISER for BSc/BTech students. Stipend ₹15-25k/month for 2 months",
    works: "For students aiming at research careers (MS/PhD abroad or India). Strong CV builder.",
    doesnt: "Application cycle starts in Oct-Dec for May-Jul slots. Highly selective.",
  },
  {
    name: "DAAD / Mitacs / international research internships",
    type: "Direct — Abroad",
    url: "https://www.daad.in/en/find-funding/funding-programmes/",
    coverage: "DAAD WISE (Germany), Mitacs Globalink (Canada), Khorana (US-India), SN Bose (US-India)",
    works: "Top performers from IIT/NIT/IISc with 9+ CGPA get research summer internships abroad. Stipend + travel covered.",
    doesnt: "Hyper-selective; application starts 8-10 months in advance.",
  },
  {
    name: "Direct outreach (cold email)",
    type: "Direct — Self-initiated",
    url: "",
    coverage: "Any company you're genuinely interested in — startups especially open to cold-email outreach for interns",
    works: "If your email is specific (not 'I'm interested in your company'), mentions a project they shipped + how you'd contribute. Hit rate ~5-10% for thoughtful emails.",
    doesnt: "Template emails get 0 response. Volume without quality wastes time.",
  },
];

const RED_FLAGS = [
  '"Pay ₹5,000 for internship enrollment" — never legitimate. Real internships pay you, not vice versa.',
  '"Unpaid internship at unknown company" — fine for portfolio building if the work is real; verify they have employees + revenue first.',
  '"Internship certificate without work" — useless. ATS systems + interviewers ignore unverified certificates.',
  '"Pre-placement offer guaranteed" — not guaranteed by anyone. Companies extend PPOs based on intern performance.',
  '"International internship via paid agency" — most are scams. DAAD / Mitacs / Khorana are the legitimate channels; they don\'t charge agency fees.',
];

export default function InternshipsPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Internships in India — Where to actually find them",
            description: "Honest guide to internships for Indian students. AICTE Internship Portal, PM Internship Scheme, state schemes, Internshala, college TPOs, direct outreach.",
            path: "/jobs/internships",
          }),
          breadcrumbLd([["Jobs","/jobs"],["Internships","/jobs/internships"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/jobs" className="hover:text-ink-800">Jobs & Careers</Link> · Internships
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          Where to actually find internships
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          Internships matter — they convert to PPOs, build resumes, teach
          you what work actually looks like. The discovery problem is
          knowing which channels are real vs which sell ads. Here are the
          legitimate ones.
        </p>

        <h2 className="mt-10 text-base font-semibold text-ink-900">8 channels worth knowing</h2>
        <ul className="mt-4 space-y-3">
          {CHANNELS.map((c) => (
            <li key={c.name} className="rounded-lg border border-ink-200 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-ink-900">{c.name}</h3>
                <span className="rounded bg-ink-100 px-2 py-0.5 text-[10px] text-ink-700">{c.type}</span>
              </div>
              <p className="mt-2 text-sm text-ink-700"><strong>Coverage:</strong> {c.coverage}</p>
              <p className="mt-2 text-xs text-emerald-700"><strong>Works when:</strong> {c.works}</p>
              <p className="mt-1 text-xs text-rose-700"><strong>Limits:</strong> {c.doesnt}</p>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-xs text-saffron-700 underline"
                >
                  Open portal ↗
                </a>
              )}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-base font-semibold text-ink-900">Red flags to avoid</h2>
        <ul className="mt-3 space-y-2 rounded-lg border border-rose-200 bg-rose-50/30 p-4 text-sm text-ink-700">
          {RED_FLAGS.map((r, i) => <li key={i} className="flex gap-2"><span>🚩</span><span>{r}</span></li>)}
        </ul>

        <div className="mt-10 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">Practical sequence</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
            <li><strong>Year 1 (BTech) / Class 11:</strong> Build a small portfolio. 1-2 real side projects with public GitHub / Behance / Medium presence.</li>
            <li><strong>Year 2 / Class 12:</strong> First internship — typically a startup via Internshala or direct outreach. Don't worry about brand; focus on real work.</li>
            <li><strong>Year 3:</strong> Premium summer internship — top product company, MBB, IB, research lab. Brand matters here; PPO conversion is the target.</li>
            <li><strong>Year 4:</strong> Either convert the PPO or apply to similar-tier full-time roles using your year-3 internship as resume anchor.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
