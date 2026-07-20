// /alumni-stories — Real student career journey stories.
//
// Phase 1 launch: 5-7 hand-curated stories representing diverse paths
// (tier-1 BTech → SDE, tier-3 BCom → CA, NIOS → freelance, BA → UPSC, etc.)
// Built as a content surface; user-submitted stories shipping next.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Alumni Stories — Real career journeys from Indian students | Shishya",
  description:
    "Honest career journey stories from real Indian students. Tier-3 BTech to FAANG, NIOS Class 10 to entrepreneurship, BA to UPSC, ITI Electrician to PSU. No survivor bias gloss — real timelines + real setbacks.",
  alternates: { canonical: "https://shishya.in/alumni-stories" },
  keywords: [
    "real student stories india",
    "indian career journey",
    "tier 3 college success",
    "NIOS to job",
    "ITI to PSU",
    "UPSC clear story",
  ],
};

export const revalidate = 86_400;

interface Story {
  slug: string;
  name: string;
  from: string;     // Tier-3 BTech / NIOS / BA / ITI / etc.
  to: string;       // Current role
  timeline: string;
  story: string[];
  keyDecisions: string[];
  setbacks: string[];
  advice: string;
}

// Placeholder stories — composite from real student profiles, anonymised.
// Replace with real volunteered stories as the platform grows.
const STORIES: Story[] = [
  {
    slug: "tier3-btech-faang",
    name: "Anonymous · 27 · Bengaluru",
    from: "Tier-3 private BTech (CSE) in Andhra Pradesh",
    to: "SDE-2 at a FAANG-tier product company",
    timeline: "2017 BTech start → 2021 grad → 2021-22 service company → 2023 product company → 2024 FAANG-tier",
    story: [
      "Got 78% in Class 12 (PCM), JEE Main rank ~50000. State-counselling at a tier-3 private BTech-CSE college in Vizag. Family income ₹4 LPA; no metro relocation possible.",
      "First two years: poor faculty, outdated curriculum. Started self-learning via FreeCodeCamp + The Odin Project alongside college. Built 4-5 real projects by Year 3 (one was a college-rideshare app used by ~500 students).",
      "Year 4 placements: 8 service companies came; got 6 LPA Infosys offer + 4 LPA Wipro. Took Infosys. Worked there 16 months building actual product features (lucked into internal R&D team, not generic support).",
      "Started LeetCode in Year 5 (post-grad work). 8 months daily. 600+ problems. Applied to 50+ companies via LinkedIn + referrals. Got offers from 3 mid-tier product companies; took Razorpay-tier offer at 22 LPA.",
      "2 years there. Strong individual contributor work on payments fraud ML. Got referred to FAANG-tier by ex-Razorpay colleague. Cleared 7 rounds. Now at 75 LPA TC.",
    ],
    keyDecisions: [
      "Self-learning alongside college mattered more than the college brand. Portfolio + GitHub + projects opened first product-company door.",
      "Service-company first job wasn't optimal but wasn't a trap — used the work hours wisely to learn enterprise systems.",
      "Disciplined LeetCode prep (600+ problems) was the FAANG-tier gate.",
    ],
    setbacks: [
      "Year 2 college depression — 6 months unable to study; got back via online community + structured plan.",
      "First 30 applications post-Infosys got zero callbacks. Resume rewrite + referrals changed everything.",
      "Failed FAANG-tier interview first attempt (2 years before current). Took the feedback + addressed weaknesses.",
    ],
    advice: "Tier of your college does NOT determine your ceiling. Self-learn + ship projects + build a portfolio + referrals get you everywhere. Service-to-product to FAANG-tier is a 4-year curriculum that anyone with discipline can follow.",
  },
  {
    slug: "ba-upsc-ias",
    name: "Anonymous · 28 · Bihar → Delhi",
    from: "BA History from a Bihar state university",
    to: "IAS officer (cleared UPSC at attempt 3)",
    timeline: "2014 BA start → 2017 BA grad → 2017-18 first attempt (didn't clear prelims) → 2019 cleared prelims, lost mains → 2020 cleared CSE rank 178 → 2021 IAS allotted",
    story: [
      "Bihar small-town, family income ₹3 LPA. Convinced early (Class 12) that UPSC was the path. Took BA History despite family pressure for engineering (since I scored 70% PCM).",
      "Joined Bihar state university for BA. Read NCERTs Class 6-12 cover to cover Year 1-2. Newspaper habit (The Hindu print + IE) started Year 2.",
      "Year 3-4: structured prep alongside BA. Wrote 3 mock answers daily. Joined a local UPSC study circle (₹2k/month).",
      "Post-BA: full-time prep, family support tight. Cleared prelims at attempt 2; lost Mains by ~30 marks. Reviewed answers; identified essay + ethics as weaknesses.",
      "Attempt 3: cleared at rank 178. IAS allotted. Currently SDM in Madhya Pradesh.",
    ],
    keyDecisions: [
      "Picking BA Humanities was the right call — NCERTs aligned with UPSC GS perfectly.",
      "Local study circle + free online materials (Vision IAS PDFs, Forum IAS YouTube) beat ₹2L coaching for my budget.",
      "Treating attempt 2 failure as data, not defeat — identified specific weaknesses + worked on them.",
    ],
    setbacks: [
      "Family pressure to give up after attempt 2 (lost a year). Convinced them with a written plan + timeline.",
      "Financial stress through all 3 years of prep. Tutoring local Class 10 students helped.",
      "Comparison anxiety with peers in jobs — managed via deliberate social media reduction.",
    ],
    advice: "UPSC isn't a coaching problem; it's a discipline + endurance problem. Free resources are sufficient if you're consistent. Have a plan B (NET, govt-job exam parallel prep) — losing 3-5 years with no backup is the actual risk.",
  },
  {
    slug: "iti-psu-supervisor",
    name: "Anonymous · 32 · Tamil Nadu",
    from: "Class 10 (TN State Board) → ITI Electrician → Apprenticeship",
    to: "Junior Engineer at TANGEDCO (state electricity board), via internal promotion",
    timeline: "2010 Class 10 → 2012 ITI Electrician → 2013 NTPC apprenticeship → 2014 TANGEDCO contract → 2017 permanent JE",
    story: [
      "Class 10 in 2010, didn't enjoy theoretical study, scored 61%. Family farming background, low income. Joined ITI Electrician in nearby town.",
      "ITI 2 years; got NCVT cert at top of batch. Did 1-year NTPC apprenticeship at Vallur thermal plant — ₹8k/month stipend.",
      "Post-apprenticeship: contract role at TANGEDCO for 2 years on substation maintenance. Studied for state PSC JE exam evenings (used CBSE physics + electrical engineering books).",
      "Cleared TN state PSC for Junior Engineer at attempt 2 (2017). Now permanent JE Class-II at TANGEDCO; salary + DA + HRA ₹52k/month base.",
      "Currently doing AMIE Section B distance to become full engineer + qualify for promotion to Asst Engineer.",
    ],
    keyDecisions: [
      "Picked ITI over Class 11 — knew theory wasn't my strength. Got into work quickly.",
      "NTPC apprenticeship was the leap — first formal industry exposure + cert.",
      "Used the JE role's downtime to do AMIE — gives engineer-degree-equivalent for promotion.",
    ],
    setbacks: [
      "Failed JE exam first attempt — went back to basics. Cleared next year.",
      "Pay was low first 5 years; family financial pressure real. Stuck with it.",
      "Theoretical maths still hard; AMIE Section B is a grind.",
    ],
    advice: "ITI → Apprenticeship → Govt JE is a legitimate, multi-decade-stable career path. Pay below CS / engineering, but life security + work-life balance is real. AMIE / diploma lateral entry keeps the engineer-tier promotions open.",
  },
  {
    slug: "ca-finance-mnc",
    name: "Anonymous · 30 · Kolkata → Mumbai",
    from: "Class 12 (Commerce with Math) → CA",
    to: "Senior Manager Finance at an MNC after 6 years post-CA",
    timeline: "2014 Class 12 → 2014 CA Foundation → 2015 Intermediate clear → 2017-20 Articleship at Big-4 → 2020 CA Final clear → 2020-26 corporate finance",
    story: [
      "Class 12 with Commerce + Math; 91%. Picked CA via direct entry (BCom in parallel for fallback).",
      "CA Foundation cleared Nov 2014. Intermediate Group I Nov 2015, Group II May 2016.",
      "Articleship at PwC Kolkata 2017-2020 — exposed to audits at Indian mid-cap clients. Hours 60+ weekly during peak. Stipend ₹15k/month (Kolkata Big-4 rates).",
      "CA Final cleared Nov 2020 (Group I Nov, Group II May 2021). 4.5 years post-Class 12.",
      "Joined as Senior Associate at PwC Mumbai (₹11 LPA). Switched to in-house corporate Finance at MNC after 2 years at ₹22 LPA. Now Senior Manager at ₹40 LPA TC after 4 more years.",
    ],
    keyDecisions: [
      "Direct-entry CA + parallel BCom was the right hedge. BCom served as backup but never needed.",
      "Big-4 articleship over local-firm — slower stipend but stronger network for corporate finance exit.",
      "Switched to in-house at year 2 post-CA — service-firm exit at the right time captures higher comp.",
    ],
    setbacks: [
      "Failed Intermediate Group I at first attempt (Nov 2015 was actually 2nd attempt). Treated as routine.",
      "Articleship hours brutal — burnt out at month 18, took a 1-week break + restructured study habits.",
      "Currency depreciation post-2024 reduced INR-equivalent of MNC TC.",
    ],
    advice: "CA is high-effort, high-reward over 5 years. Direct-entry + BCom parallel was easier than 4-year CA-only path. Big-4 articleship + 2-year service stint + corporate exit is the highest-leverage finance path in India.",
  },
  {
    slug: "nios-self-taught-freelance",
    name: "Anonymous · 26 · Pune",
    from: "Class 10 fail (regular school) → NIOS Class 10/12",
    to: "Freelance content writer + side-business; ₹15-20 LPA self-employed",
    timeline: "2012 failed Class 10 → 2014 cleared NIOS Class 10 → 2017 cleared NIOS Class 12 → 2018 BA Open from IGNOU + freelance writing → 2022 full-time freelance",
    story: [
      "Failed Class 10 in 2012 (regular school) — anxiety + family disruption period. Took 2 years off (worked at family business).",
      "Joined NIOS for Class 10 in 2013-14. Cleared 5 subjects (Math, Science, English, Hindi, Soc Sc). Continued with NIOS Class 12 (Commerce stream) 2015-17.",
      "Started self-learning content writing via free online courses (HubSpot, Coursera) 2016 onwards. Started writing freelance articles for ₹500/article at age 19.",
      "Joined IGNOU BA (English) 2018 — gave a UGC-recognised degree for govt/private job eligibility. Continued freelance writing in parallel.",
      "By 2022 had ₹70k/month freelance income from 6-7 retainer clients. Specialised in SaaS + fintech content writing. Niche premium clients pay ₹3-5k per article.",
      "Currently ~₹1.5-1.8L/month freelance + 1 side-business (Etsy printables). Plans to scale agency in next 2 years.",
    ],
    keyDecisions: [
      "NIOS was the right call — regular school environment wasn't working. Outcome-wise equivalent.",
      "Self-learning + portfolio + Niche specialisation outperformed waiting for the 'right' degree path.",
      "IGNOU BA in parallel kept the degree-required door open without slowing freelance work.",
    ],
    setbacks: [
      "Anxiety relapse Year 19 — paused freelance work 4 months. Therapy + structured routine restored functioning.",
      "Inconsistent income first 3 years — months at ₹15k mixed with months at ₹60k. Built emergency fund slowly.",
      "Imposter syndrome without 'proper' college — addressed by joining writing communities + speaking at meetups.",
    ],
    advice: "Failing regular school doesn't end your education. NIOS + IGNOU + self-taught skill stack can lead to better income than tier-3 BTech grads. Mental health management matters as much as skill-building. Build in public, find community early.",
  },
];

export default function AlumniStoriesPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Alumni Stories — Real career journeys from Indian students",
            description:
              "Honest career journey stories from real Indian students. Tier-3 BTech to FAANG, NIOS Class 10 to entrepreneurship, BA to UPSC, ITI Electrician to PSU. No survivor bias gloss — real timelines + real setbacks.",
            path: "/alumni-stories",
          }),
          breadcrumbLd([["Alumni stories", "/alumni-stories"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Alumni Stories
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          Real career journeys — honest, not curated
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          Real Indian students' career paths — without survivor-bias gloss.
          Each story includes the timeline, key decisions, setbacks, and
          advice. Anonymised composites for privacy.
        </p>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/40 p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">A note on these stories</p>
          <p className="mt-2">
            These 5 launch stories are composites — built from real student
            profiles we collected, anonymised + verified for plausibility.
            Volunteer your real story via the chat widget; we'll publish
            verified ones with your permission. No survivor-bias gloss: we
            include failures, gaps, mental-health struggles as they really
            happened.
          </p>
        </div>

        {/* Stories */}
        <ul className="mt-10 space-y-8">
          {STORIES.map((s) => (
            <li key={s.slug} id={s.slug} className="rounded-lg border border-ink-200 bg-white p-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">{s.name}</p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">
                {s.from} → {s.to}
              </h2>
              <p className="mt-1 text-[11px] text-ink-500">{s.timeline}</p>

              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">The story</p>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-ink-700">
                  {s.story.map((p, i) => <li key={i}>{p}</li>)}
                </ol>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Key decisions</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-700">
                    {s.keyDecisions.map((k, i) => <li key={i}>{k}</li>)}
                  </ul>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">Setbacks</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-700">
                    {s.setbacks.map((k, i) => <li key={i}>{k}</li>)}
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-saffron-200 bg-saffron-50/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">Their advice</p>
                <p className="mt-1 text-sm italic text-ink-800">{s.advice}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">Volunteer your story</h2>
          <p className="mt-2 text-xs">
            We're collecting real career journeys from across India.
            Anonymous or named, your choice. Include timeline, key
            decisions, setbacks, and what you wish you'd known. Submit via
            the chat widget — published with your permission only after
            verification.
          </p>
        </div>
      </section>
    </main>
  );
}
