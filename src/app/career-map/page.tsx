// /career-map — Unified "you are here → next 5 steps" lifecycle rail.
//
// Visual map showing: Class 9-10 → Stream → Class 11-12 → Entrance Exam
// → College → Career → Mid-career evolution. Each stage has clickable
// destinations into the relevant Shishya section.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Career Map — From Class 9 to your first job in one rail | Shishya",
  description:
    "Visual lifecycle map of Indian education + career choices. From Class 9 → stream → Class 11-12 → entrance exam → college → first job → mid-career evolution. All paths visible at once.",
  alternates: { canonical: "https://shishya.in/career-map" },
  keywords: [
    "career path india",
    "education to career map",
    "lifecycle indian student",
    "what after class 10",
    "what after class 12",
    "what after graduation",
  ],
};

export const revalidate = 86_400;

interface PathNode {
  label: string;
  href: string;
  /** Sub-bullets visible on hover/under */
  hint?: string;
}

interface Stage {
  age: string;
  title: string;
  icon: string;
  description: string;
  paths: PathNode[];
}

const LIFECYCLE: Stage[] = [
  {
    age: "13-15",
    title: "Class 9-10",
    icon: "📘",
    description:
      "Build subject strength. Choose stream by Class 10 result + genuine interest. Olympiads + NTSE for early signals.",
    paths: [
      { label: "Schooling — your board's chapters", href: "/schooling", hint: "CBSE / ICSE / state — Class 9 + 10" },
      { label: "Stream selection (Science / Commerce / Humanities)", href: "/schooling/streams", hint: "The most consequential decision" },
      { label: "NTSE + Olympiads (NSEJS / NSO / IMO / NSO)", href: "/exams/NSEJS", hint: "Early-talent signal exams" },
    ],
  },
  {
    age: "15-16",
    title: "Class 10 → Stream Decision",
    icon: "🔀",
    description:
      "5 stream paths: PCM, PCB, PCMB, Commerce, Humanities. Each opens AND closes specific careers. Don't pick the 'high-status' one without genuine engagement.",
    paths: [
      { label: "Stream selection deep-dive", href: "/schooling/streams" },
      { label: "ITI Trades (alt to Class 11-12)", href: "/colleges/iti-diploma", hint: "2-year, Class 10 entry; ~6.5M students take this" },
      { label: "Polytechnic Diploma (alt to Class 11-12)", href: "/colleges/iti-diploma", hint: "3-year; lateral entry to BTech possible" },
      { label: "Career paths feeding each stream", href: "/careers" },
    ],
  },
  {
    age: "16-18",
    title: "Class 11-12 + Entrance Prep",
    icon: "🎯",
    description:
      "Stream-specific prep + entrance exams. 2 years that shape the next 4-6.",
    paths: [
      { label: "Class 11 + 12 subject pages", href: "/schooling", hint: "Per-subject chapter pages + quizzes" },
      { label: "JEE Main / Advanced (Engineering)", href: "/exams/JEE_MAIN" },
      { label: "NEET UG (Medical)", href: "/exams/NEET_UG" },
      { label: "CUET UG (Central Universities)", href: "/exams/CUET_UG" },
      { label: "CLAT (Law)", href: "/exams/CLAT" },
      { label: "BITSAT", href: "/exams" },
      { label: "All 163 entrance exams", href: "/exams" },
    ],
  },
  {
    age: "17-22",
    title: "Undergraduate (UG)",
    icon: "🎓",
    description:
      "3-5 years of UG. Branch + college tier matter for placements + senior career trajectory.",
    paths: [
      { label: "Top 77 NIRF colleges", href: "/colleges" },
      { label: "Branch-level placements + cutoffs", href: "/colleges/iit-bombay/cse", hint: "E.g., IIT Bombay CSE detail page" },
      { label: "How to read placement data honestly", href: "/colleges/placements" },
      { label: "How to read cutoffs honestly", href: "/colleges/cutoffs" },
      { label: "Scholarships you qualify for", href: "/scholarships/match" },
      { label: "Study abroad (alt to Indian UG)", href: "/worldwide" },
    ],
  },
  {
    age: "21-24",
    title: "First Career Decision (After UG)",
    icon: "🌳",
    description:
      "5 honest paths from UG: industry, PG India, research, civil services, abroad.",
    paths: [
      { label: "Post-Graduation hub (PG decision)", href: "/post-graduation" },
      { label: "Industry — careers + salaries", href: "/careers" },
      { label: "PG entrances (GATE / CAT / NEET-PG / UGC NET)", href: "/post-graduation#pg-entrances" },
      { label: "Civil Services (UPSC / state PSC)", href: "/careers/ias-officer" },
      { label: "Jobs & Government Recruitment", href: "/jobs" },
      { label: "Study abroad for PG", href: "/worldwide" },
    ],
  },
  {
    age: "23-30",
    title: "Early Career (First 5-7 years)",
    icon: "🚀",
    description:
      "Skill compounding + first promotions. Specialisation matters most here.",
    paths: [
      { label: "42 careers with salary growth bands", href: "/careers" },
      { label: "Skill-based careers (non-degree paths)", href: "/jobs/skill-careers" },
      { label: "Soft skills + employability", href: "/soft-skills" },
      { label: "Resume + interview prep", href: "/jobs/resume" },
      { label: "Distance learning (upskill while working)", href: "/distance-learning" },
    ],
  },
  {
    age: "28-40",
    title: "Mid-Career Pivots",
    icon: "🔄",
    description:
      "MBA, switch fields, abroad move, entrepreneurship. Mid-career has more options than students assume.",
    paths: [
      { label: "CAT / IIM MBA", href: "/exams/CAT" },
      { label: "Top study-abroad MBA destinations", href: "/worldwide/compare" },
      { label: "Career switch via skill paths", href: "/jobs/skill-careers" },
      { label: "Alumni stories — real mid-career journeys", href: "/alumni-stories" },
    ],
  },
];

const SHORTCUTS = [
  {
    persona: "🎒 I'm in Class 10",
    do: "Read the stream selection guide → explore 5-7 careers → pick Class 11 stream",
    links: [
      { label: "Stream selection", href: "/schooling/streams" },
      { label: "All careers", href: "/careers" },
    ],
  },
  {
    persona: "📐 I'm in Class 12 PCM",
    do: "Prep for JEE / state CET → research engineering branches → set 5-college choice list",
    links: [
      { label: "JEE Main page", href: "/exams/JEE_MAIN" },
      { label: "IIT Bombay branches", href: "/colleges/iit-bombay" },
      { label: "Top engineering colleges", href: "/colleges/stream/engineering" },
    ],
  },
  {
    persona: "💉 I'm in Class 12 PCB",
    do: "NEET UG prep → research medical colleges → understand MBBS → MD path",
    links: [
      { label: "NEET UG", href: "/exams/NEET_UG" },
      { label: "AIIMS Delhi", href: "/colleges/aiims-delhi/mbbs" },
      { label: "Doctor career", href: "/careers/doctor-mbbs" },
    ],
  },
  {
    persona: "💼 I'm in Class 12 Commerce",
    do: "CA Foundation OR CUET for BCom Hons → CA / CS / IPMAT options",
    links: [
      { label: "CA career", href: "/careers/chartered-accountant" },
      { label: "Banking PO career", href: "/careers/bank-po" },
      { label: "CUET UG", href: "/exams/CUET_UG" },
    ],
  },
  {
    persona: "📜 I'm in Class 12 Humanities",
    do: "CLAT for law OR CUET for BA Hons → UPSC prep in parallel from year 1",
    links: [
      { label: "Stream selection", href: "/schooling/streams" },
      { label: "CLAT", href: "/exams/CLAT" },
      { label: "IAS career", href: "/careers/ias-officer" },
      { label: "UPSC CSE", href: "/exams/UPSC_PRELIMS" },
    ],
  },
  {
    persona: "🎓 I just finished UG",
    do: "Pick: industry / PG / civil services / abroad. PG hub helps you compare honestly.",
    links: [
      { label: "PG hub", href: "/post-graduation" },
      { label: "Worldwide", href: "/worldwide" },
      { label: "Govt jobs", href: "/jobs/govt-jobs" },
    ],
  },
  {
    persona: "👔 I'm working + want to change track",
    do: "Skill-based careers OR MBA OR distance PG. Don't quit before securing the next step.",
    links: [
      { label: "Skill-based careers", href: "/jobs/skill-careers" },
      { label: "CAT / MBA", href: "/exams/CAT" },
      { label: "Distance learning", href: "/distance-learning" },
    ],
  },
  {
    persona: "📉 I didn't get into a tier-1 college",
    do: "Tier of UG isn't a ceiling. Self-learning + portfolio + skill careers compound to top outcomes.",
    links: [
      { label: "Skill-based careers", href: "/jobs/skill-careers" },
      { label: "Alumni stories (tier-3 → FAANG)", href: "/alumni-stories#tier3-btech-faang" },
      { label: "Soft skills", href: "/soft-skills" },
    ],
  },
];

export default function CareerMapPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Career Map — From Class 9 to your first job in one rail",
            description:
              "Visual lifecycle map of Indian education + career choices. From Class 9 → stream → Class 11-12 → entrance exam → college → first job → mid-career evolution. All paths visible at once.",
            path: "/career-map",
          }),
          breadcrumbLd([["Career map", "/career-map"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Career Map
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          Career Map — Class 9 to mid-career, in one rail
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          The full Indian-education-to-career lifecycle. Use this to see
          where you are and what's next — at every stage, you'll see honest
          alternatives, not just the "standard" path.
        </p>

        {/* Shortcuts by persona */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Pick your starting point</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {SHORTCUTS.map((s, i) => (
            <li key={i} className="rounded-lg border border-ink-200 bg-white p-4">
              <p className="text-sm font-semibold text-ink-900">{s.persona}</p>
              <p className="mt-1 text-xs text-ink-700">{s.do}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {s.links.map((l, j) => (
                  <li key={j}>
                    <Link
                      href={l.href}
                      className="rounded-md border border-saffron-300 bg-saffron-50/40 px-2 py-0.5 text-[11px] text-saffron-800 hover:bg-saffron-100"
                    >
                      {l.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {/* Full lifecycle rail */}
        <h2 className="mt-12 text-base font-semibold text-ink-900">
          The full lifecycle — 7 stages
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Each stage links to the relevant Shishya section. Read in order if
          you're planning ahead, or jump to your current stage.
        </p>

        <ol className="mt-6 space-y-6">
          {LIFECYCLE.map((stage, i) => (
            <li key={i} className="relative rounded-lg border border-ink-200 bg-white p-5">
              {/* Connecting line to next stage (visual) */}
              {i < LIFECYCLE.length - 1 && (
                <div className="absolute -bottom-6 left-1/2 h-6 w-0.5 -translate-x-1/2 bg-saffron-300" aria-hidden />
              )}
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl">{stage.icon}</span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                    Age {stage.age}
                  </p>
                  <h3 className="text-lg font-semibold text-ink-900">{stage.title}</h3>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-700">{stage.description}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {stage.paths.map((p, j) => (
                  <li key={j}>
                    <Link
                      href={p.href}
                      className="block rounded-md border border-ink-100 bg-saffron-50/30 px-3 py-2 text-xs hover:border-saffron-400 hover:bg-saffron-50/60"
                    >
                      <span className="font-semibold text-ink-900">{p.label}</span>
                      {p.hint && <span className="mt-0.5 block text-[11px] text-ink-600">{p.hint}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        {/* Closing note */}
        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">A note on linearity</h2>
          <p className="mt-2 text-xs">
            This rail looks linear; real life isn't. People take gap years,
            switch streams late, drop UG to start companies, return to
            school in their 30s. The map is a default view — if your path
            looks different, that's normal. Use Shishya sections as
            building blocks, not a fixed sequence.
          </p>
        </div>
      </section>
    </main>
  );
}
