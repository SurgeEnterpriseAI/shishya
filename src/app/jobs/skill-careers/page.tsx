// /jobs/skill-careers — Non-degree skill-based careers.
//
// For students who didn't get into top colleges, can't afford traditional
// UG, or are pivoting. Real paths that work in India in 2026.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Skill-Based Careers in India — Non-degree paths that actually work | Shishya",
  description:
    "Honest guide to non-degree careers in India. Coding bootcamps, design portfolios, content writing, sales, digital marketing, video editing, finance ops. What you can earn without (or alongside) a traditional degree.",
  alternates: { canonical: "https://shishya.in/jobs/skill-careers" },
  keywords: [
    "skill based career india",
    "non degree career india",
    "coding bootcamp india",
    "freelance career india",
    "digital marketing career",
    "career without degree india",
  ],
};

export const revalidate = 86_400;

const PATHS = [
  {
    name: "Software Development (Self-Taught / Bootcamp)",
    summary:
      "1-2 strong frameworks + GitHub portfolio + 3-6 month bootcamp can land entry-level dev role. Compounds with experience.",
    investment: "₹0-1.5L (bootcamp optional)",
    timeline: "6-12 months from zero to first job",
    realistic1Yr: "₹3-8 LPA at first job, ₹8-15 LPA after 2 years if performance is strong",
    bestFor: "Anyone with logical aptitude. Doesn't need engineering degree.",
    resources: [
      "FreeCodeCamp.org (free)",
      "The Odin Project (free)",
      "Scaler / Coding Ninjas (paid bootcamp)",
      "MasaiSchool (income-share-agreement bootcamp)",
    ],
    caveats: "AI is changing entry-level coding work. Specialise early in something specific (DevOps, mobile, ML engineering) rather than generalist 'full stack'.",
  },
  {
    name: "Digital Marketing + Performance Marketing",
    summary:
      "Google Ads, Meta Ads, SEO, analytics. Strong remote-friendly career; agencies hire heavily; many freelance.",
    investment: "₹0-50k (cert tier optional)",
    timeline: "3-6 months from zero to first job",
    realistic1Yr: "₹3-7 LPA. Senior performance marketers at unicorns ₹15-30 LPA.",
    bestFor: "Communication-strong students; not math-heavy.",
    resources: [
      "Google Digital Garage (free)",
      "Meta Blueprint (free)",
      "Coursera Google Digital Marketing cert",
      "DigitalDeepak (paid, India-specific)",
    ],
    caveats: "Agency hours can be brutal. Specialise (ecommerce performance, B2B SaaS, edtech) for higher pay.",
  },
  {
    name: "UX / Product Design (Portfolio-led)",
    summary:
      "Figma + portfolio + 1 real shipped project. Bootcamps + self-taught both work; the portfolio is the gate.",
    investment: "₹0-2L (bootcamp optional)",
    timeline: "6-12 months",
    realistic1Yr: "₹4-12 LPA at first job; senior ₹20-50 LPA at top product cos",
    bestFor: "Visual + empathy-driven thinkers. Cross-functional collaboration is the job.",
    resources: [
      "Figma official tutorials (free)",
      "InVision DesignBetter.co (free)",
      "Designership / Design+Code (paid)",
      "Lollypop's Design Academy (Bangalore)",
    ],
    caveats: "Distinguish UX (research + interaction) from UI (visual design). Both viable; salaries similar.",
  },
  {
    name: "Content Writing + Technical Writing",
    summary:
      "Strong writing + niche specialisation (SaaS, fintech, healthcare). Freelance and in-house viable. AI-tool literacy is now table-stakes.",
    investment: "₹0",
    timeline: "3-6 months",
    realistic1Yr: "₹2-6 LPA agency, ₹6-15 LPA freelance senior, ₹10-25 LPA in-house specialist",
    bestFor: "Strong English + a niche interest. Most successful writers specialise in 1-2 domains.",
    resources: [
      "GrowthHackers content marketing guide",
      "Animalz (top B2B content agency blog)",
      "Niche Sites Project + Authority Hacker for SEO writing",
    ],
    caveats: "Generalist 'content writing' is under AI pressure. Technical writing (API docs, dev docs) is AI-resistant + better paid.",
  },
  {
    name: "Sales (B2B SaaS + Enterprise)",
    summary:
      "Inside Sales / SDR → BDR → AE. Strong careers at Indian SaaS unicorns + foreign-market remote sales.",
    investment: "₹0",
    timeline: "0-3 months entry (companies train)",
    realistic1Yr: "₹4-8 LPA base + variable. Senior AE ₹15-40 LPA inc. variable.",
    bestFor: "Conversational, persistent, ROI-oriented. Doesn't need degree pedigree.",
    resources: [
      "HubSpot Sales Hub (free training)",
      "Sandler Sales Methodology",
      "Cold email mastery (sales-focused YouTube channels)",
    ],
    caveats: "Quota-driven. First 6 months are stressful. Top performers can earn substantially more than engineers at similar tenure.",
  },
  {
    name: "Video Editing + Motion Design",
    summary:
      "DaVinci Resolve / Premiere / After Effects. Strong YouTube/Reels economy + agency work + content house roles.",
    investment: "₹0-30k (software + course)",
    timeline: "3-6 months",
    realistic1Yr: "₹3-7 LPA agency. Freelance ₹5-20 LPA depending on niche. Top creator editors ₹30L+.",
    bestFor: "Creative + detail-oriented. Visual storytelling matters.",
    resources: [
      "Adobe official tutorials (some free)",
      "School of Motion (paid, top tier)",
      "Casey Faris YouTube (DaVinci Resolve)",
    ],
    caveats: "Heavy AI disruption coming for routine cuts. Specialise in narrative/branded/motion-design over basic editing.",
  },
  {
    name: "Data Analytics (SQL + Tableau)",
    summary:
      "SQL + Excel + Tableau/Power BI is enough for entry. Cross-industry portable skill.",
    investment: "₹0-30k",
    timeline: "3-6 months",
    realistic1Yr: "₹3.5-8 LPA at first job; pivot to data science possible.",
    bestFor: "Math-comfortable students; strong communication for storytelling.",
    resources: [
      "Mode Analytics SQL tutorial (free)",
      "Google Data Analytics cert (Coursera)",
      "Microsoft PL-300 Power BI cert",
    ],
    caveats: "Mid-tier analyst pay can plateau without ML/DS upskill.",
  },
  {
    name: "Finance Operations + Bookkeeping",
    summary:
      "Tally + GST + basic accounting → SME bookkeeping + AR/AP + payroll. Outsourced finance for startups + SMEs.",
    investment: "₹0-25k (Tally cert)",
    timeline: "3 months",
    realistic1Yr: "₹2.5-5 LPA. Senior + multi-client ops ₹6-12 LPA freelance.",
    bestFor: "Detail-oriented + comfortable with numbers; no CA/CS required for entry.",
    resources: [
      "Tally Education (paid cert)",
      "GST portal tutorials (free)",
      "Practical Excel for accountants courses",
    ],
    caveats: "Specialise in startup finance ops (Razorpay/Zaggle/Quickbooks fluency) for foreign-payroll clients.",
  },
];

export default function SkillCareersPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Skill-Based Careers in India — Non-degree paths that actually work",
            description: "Honest guide to non-degree careers in India: bootcamps, design portfolios, content, sales, digital marketing, video editing, finance ops.",
            path: "/jobs/skill-careers",
          }),
          breadcrumbLd([["Jobs","/jobs"],["Skill-based careers","/jobs/skill-careers"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/jobs" className="hover:text-ink-800">Jobs & Careers</Link> · Skill-Based Careers
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">
          Skill-based careers — non-degree paths
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          You don't need a top-tier engineering degree to build a career. 8
          legitimate paths where skill + portfolio matter more than
          credentials. Realistic about timelines, investment, and outcomes.
        </p>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/40 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">A few honest notes upfront</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>These are <strong>real paths</strong>, but they're not easy. 6-12 months of focused effort is the minimum.</li>
            <li>"Skill-based" doesn't mean "no learning". It means the learning is portable + portfolio-evidenced, not gatekept by a degree.</li>
            <li>Pay starts lower than top-tier engineering or finance. Compounds well over time IF you keep specialising.</li>
            <li>AI is changing entry-level work in most of these. Specialise early.</li>
          </ul>
        </div>

        <ul className="mt-10 space-y-4">
          {PATHS.map((p) => (
            <li key={p.name} className="rounded-lg border border-ink-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-ink-900">{p.name}</h2>
              <p className="mt-2 text-sm text-ink-700">{p.summary}</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div>
                  <dt className="font-semibold text-ink-500">Investment</dt>
                  <dd className="mt-0.5 text-ink-800">{p.investment}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-500">Timeline</dt>
                  <dd className="mt-0.5 text-ink-800">{p.timeline}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-ink-500">Realistic 1-2 yr outcome</dt>
                  <dd className="mt-0.5 text-ink-800">{p.realistic1Yr}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-ink-500">Best for</dt>
                  <dd className="mt-0.5 text-ink-800">{p.bestFor}</dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <dt className="font-semibold text-ink-500">Caveats</dt>
                  <dd className="mt-0.5 text-ink-800">{p.caveats}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Resources</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {p.resources.map((r, i) => (
                  <li key={i} className="rounded-md border border-ink-200 bg-ink-50/40 px-2 py-0.5 text-[11px] text-ink-700">
                    {r}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-lg border border-emerald-200 bg-emerald-50/30 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">If you're considering this seriously</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs">
            <li><strong>Pick ONE path</strong> and commit to it for 6 months minimum. Multi-tasking 3 skills produces 3 weak ones.</li>
            <li><strong>Build in public.</strong> GitHub, Behance, Medium, LinkedIn — your work needs an audience trail.</li>
            <li><strong>Find a community.</strong> Discord servers, Twitter, sub-reddits. Working in isolation kills motivation.</li>
            <li><strong>Apply early + often.</strong> Don't wait to "be ready". Reject letters are part of the path.</li>
            <li><strong>Stack the skill onto whatever degree you have.</strong> CS degree + design portfolio = product-engineering interview leverage. BCom + content writing = finance writer at SaaS.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
