// /distance-learning — Distance + Open Learning hub.
//
// IGNOU + NIOS + state Open Universities serve ~4-5M Indian students
// per year. Largely invisible in the mainstream Indian-education narrative
// despite being the realistic option for: working students, late-start
// students, rural students, second-degree seekers, gap-year people.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Distance + Open Learning in India — IGNOU, NIOS, Open Universities | Shishya",
  description:
    "Distance + open learning in India: IGNOU (4M+ students), NIOS (Class 10+12 open school), state Open Universities (BRAOU, KKHSOU, UPRTOU etc.). Realistic for working students, late-start learners, gap-year people. Most-undercovered education path in India.",
  alternates: { canonical: "https://shishya.in/distance-learning" },
  keywords: [
    "IGNOU courses",
    "NIOS class 10 12",
    "open university india",
    "distance learning india",
    "B.Ed correspondence",
    "MA distance india",
  ],
};

export const revalidate = 86_400;

const PROVIDERS = [
  {
    name: "IGNOU — Indira Gandhi National Open University",
    type: "Central Open University",
    students: "~4 million enrolled",
    programmes: "200+ programmes from Certificate → PhD across Arts, Sciences, Commerce, Management, IT, Education, Agriculture, Translation, Continuing Education",
    notable: [
      "BA / BCom / BSc (3-year programmes; ₹3-5k/year fees)",
      "MA / MCom / MSc (PG; ₹4-7k/year)",
      "MBA + Banking + Finance specialisations (recognised + AICTE-accredited PG)",
      "BEd (mandatory for govt teaching jobs)",
      "Certificate courses for upskilling (3-12 months)",
    ],
    whyThis: "Most-flexible national option. Recognised by govt for jobs, promotions, higher ed. Self-paced + study material posted. Multi-medium (English, Hindi + regional languages).",
    caveats: "Distance learning self-discipline is essential. Don't expect instructor proximity. Job market still favours regular-college degrees for entry-level CS/finance.",
    portal: "https://www.ignou.ac.in/",
  },
  {
    name: "NIOS — National Institute of Open Schooling",
    type: "Central Open School (Class 10 + 12)",
    students: "~3 million enrolled",
    programmes: "Class 10 (Secondary) + Class 12 (Senior Secondary) for school dropouts, working students, sportspeople, performers, students who need flexible timing.",
    notable: [
      "Class 10 (Secondary) — 24 subjects available",
      "Class 12 (Senior Secondary) — 28 subjects available",
      "TPT / VOE (Vocational Education) programmes",
      "Bridge between school + UG/diploma entry",
    ],
    whyThis: "Allows board completion outside fixed-schedule school. Recognised same as CBSE/ICSE for college admissions, exam eligibility. Common for: athletes, working students supporting family, students who fell behind, second-attempt boards.",
    caveats: "Stigma exists but is mostly out-of-date — top sportspeople, performers, and working students routinely use NIOS without career penalty.",
    portal: "https://www.nios.ac.in/",
  },
  {
    name: "BRAOU — Dr B.R. Ambedkar Open University (AP/Telangana)",
    type: "State Open University (Andhra Pradesh & Telangana)",
    students: "~3 lakh enrolled",
    programmes: "BA, BCom, BSc, MA, MCom, MSc, MBA, MEd. Strong Telugu-medium option.",
    notable: ["First open university in India (founded 1982)", "Strong regional-language support", "Affordable fees ~₹3-5k/year"],
    whyThis: "If you're based in AP/Telangana + want Telugu-medium degree affordably + UGC-recognised.",
    caveats: "Limited to AP/TS-domicile students for some programmes.",
    portal: "https://braou.ac.in/",
  },
  {
    name: "KKHSOU — Krishna Kanta Handiqui State Open University (Assam)",
    type: "State Open University (Assam)",
    students: "~2 lakh enrolled",
    programmes: "Assamese-medium + English-medium UG/PG. Strong agriculture + applied sciences focus.",
    notable: ["First state open university in NE India", "Affordable fees", "Recognition for state govt jobs"],
    whyThis: "Assam + NE-based students wanting affordable, UGC-recognised distance UG/PG.",
    caveats: "Recognition outside Assam varies; verify for specific career paths.",
    portal: "https://www.kkhsou.in/",
  },
  {
    name: "UPRTOU — Uttar Pradesh Rajarshi Tandon Open University",
    type: "State Open University (UP)",
    students: "~3 lakh enrolled",
    programmes: "BA, BSc, BCom, MA, MCom, MSc, MBA, MEd, MCA. Strong UP-state-job recognition.",
    notable: ["UP's state open uni since 1998", "Affordable fees", "Strong support centre network across UP"],
    whyThis: "UP-based working students + UP state govt job aspirants. Cheaper than IGNOU for state focus.",
    caveats: "UP state-govt-specific recognition; verify for central/private jobs.",
    portal: "https://www.uprtou.ac.in/",
  },
  {
    name: "Coursera / edX / Swayam (online MOOCs)",
    type: "MOOC Platforms",
    students: "Massive (tens of millions enrollments)",
    programmes: "Specialisations, Professional Certificates, Online Master's degrees (Coursera/edX from top US universities).",
    notable: [
      "Swayam (MoE govt platform) — free + verified-cert paid",
      "Coursera + edX — Indian Master's at IIT Madras + IIIT Hyderabad online + foreign degrees online",
      "IIT Madras BSc/BTech Data Science online (UGC-recognised)",
    ],
    whyThis: "Globally-respected certificates; flexibility; some Online Master's degrees fully accredited (IIT Madras, ASU online, Georgia Tech OMSCS).",
    caveats: "Standalone certificates have limited career signal. Online degrees vary in employer recognition — verify before enrolling.",
    portal: "https://swayam.gov.in/",
  },
];

const WHY_DISTANCE = [
  {
    audience: "Working students",
    why: "Earn while learning. Promotion + salary band gating often needs a recognised UG/PG; distance lets you complete without quitting.",
  },
  {
    audience: "Late starters / gap-year students",
    why: "Returning to studies in your 20s+ — regular colleges may have age constraints; distance has no upper limit.",
  },
  {
    audience: "Athletes + performers",
    why: "Training/performance schedules don't fit regular-school timing. NIOS Class 10/12, IGNOU UG, even MBBS via state open systems work.",
  },
  {
    audience: "Government job aspirants",
    why: "Many govt jobs require just graduation — IGNOU BA gets you there cheaply while you prep for UPSC/SSC/banking.",
  },
  {
    audience: "Second-degree seekers",
    why: "B.Ed (most common second degree for teachers) is widely available via IGNOU + state open universities — cheaper + faster than regular B.Ed.",
  },
  {
    audience: "Rural students",
    why: "When physical college access is hard, distance + study centres + online materials make UG/PG completion possible.",
  },
];

export default function DistanceLearningPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Distance + Open Learning in India — IGNOU, NIOS, Open Universities",
            description:
              "Distance + open learning in India: IGNOU (4M+ students), NIOS (Class 10+12 open school), state Open Universities (BRAOU, KKHSOU, UPRTOU etc.). Realistic for working students, late-start learners, gap-year people. Most-undercovered education path in India.",
            path: "/distance-learning",
          }),
          breadcrumbLd([["Distance learning", "/distance-learning"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Distance + Open Learning
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          Distance + Open Learning in India
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          IGNOU + NIOS + state Open Universities serve ~4-5M Indian
          students per year. Largely invisible in the typical Indian-
          education narrative despite being the realistic option for
          millions. Here's the honest map.
        </p>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/40 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">A note on stigma</p>
          <p className="mt-2 text-xs">
            "Distance degree is worth less" is a fading stereotype. For govt
            jobs + most public-sector roles, UGC-recognised distance
            degrees are treated equal. Private-sector entry-level CS/finance
            still favours regular-college candidates, but for mid-career
            promotions, second degrees, or career switches, distance is
            often the smartest path.
          </p>
        </div>

        {/* Providers */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">
          {PROVIDERS.length} providers worth knowing
        </h2>
        <ul className="mt-4 space-y-4">
          {PROVIDERS.map((p, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold text-ink-900">{p.name}</h3>
                <span className="rounded bg-ink-100 px-2 py-0.5 text-[10px] text-ink-700">{p.type}</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-500">{p.students}</p>
              <p className="mt-2 text-sm text-ink-700">{p.programmes}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Notable programmes</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-700">
                {p.notable.map((n, j) => <li key={j}>{n}</li>)}
              </ul>
              <p className="mt-3 text-xs text-emerald-700"><strong>Why this works:</strong> {p.whyThis}</p>
              <p className="mt-1 text-xs text-rose-700"><strong>Caveats:</strong> {p.caveats}</p>
              <a
                href={p.portal}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
              >
                Official portal ↗
              </a>
            </li>
          ))}
        </ul>

        {/* Why distance? */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">Who benefits most</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {WHY_DISTANCE.map((w, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">{w.audience}</p>
              <p className="mt-1 text-xs text-ink-700">{w.why}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">How to actually evaluate</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs">
            <li><strong>UGC + DEB (Distance Education Bureau) recognition.</strong> All providers above are UGC-recognised — but verify on UGC website if you're considering anything else.</li>
            <li><strong>Match programme to goal.</strong> IGNOU BA for "I just need a degree" works. For specialised CS, an online Master's from IIT Madras / Georgia Tech is better.</li>
            <li><strong>Self-discipline assessment.</strong> Distance dropout rates are 40-50%. Be honest about whether you'll actually finish.</li>
            <li><strong>Job market check.</strong> For your target role (govt, private, public sector), check whether distance degrees are accepted equal — most are, some niche aren't.</li>
            <li><strong>Cost vs ROI.</strong> IGNOU ₹15-20k total for BA; online IIT Madras BSc Data Science ₹2.5L total. Both worth it for different audiences.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
