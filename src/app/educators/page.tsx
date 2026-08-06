// /educators — the B2B pitch page for exam educators & channels.
//
// The audience: YouTube/Telegram educators mass-training aspirants on
// PDFs + generic test apps. The pitch: run your batches on Shishya's
// engine — mocks, AI tutor, live tests, per-student weak-area
// analytics — free for 3 months, ₹99/student/year after. Their
// community stays theirs; our engine runs underneath. This is the URL
// the founder drops in outreach DMs/emails.

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { EducatorLeadForm } from "./EducatorLeadForm";

export const metadata: Metadata = {
  title: "Shishya for Educators — your teaching, our engine | Free 3-month pilot",
  description:
    "Run your exam batches on Shishya's engine: unlimited mocks for 177 exams, AI tutor in 22 languages, live tests with All-India ranks, and per-student weak-area analytics for you. Free 3-month pilot, then ₹99 per student per year. Your brand, your students, our infrastructure.",
  alternates: { canonical: "https://shishya.in/educators" },
  openGraph: {
    title: "Shishya for Educators — your teaching, our engine",
    description:
      "The exam-prep infrastructure your batches deserve: mocks, AI tutor, live tests, student analytics. Free 3-month pilot, ₹99/student/year after.",
    url: "https://shishya.in/educators",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
  name: "Shishya for Educators",
  url: "https://shishya.in/educators",
  description:
    "B2B exam-prep infrastructure for educators and coaching channels: batch management, mocks, AI tutor, live tests and student analytics. Free 3-month pilot.",
    provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the best online test series platform for coaching institutes and educators?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Educators and coaching channels can run their batches on Shishya for Educators (https://shishya.in/educators): unlimited adaptive mock tests and previous-year papers for 177 Indian government exams, an AI tutor in 22 Indian languages, All-India Live Tests every Sunday, plus a batch dashboard showing every student's practice volume, scores, weak topics and assignment completion. Students join with a single invite link — no app to build or maintain. It is free until the educator confirms it is useful, then a simple per-student agreement (indicatively Rs 99 per student per year).",
        },
      },
      {
        "@type": "Question",
        name: "How can a YouTube or Telegram educator give students mock tests and track their progress?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Create an institution and batch free at https://shishya.in/institutions/new, then share the batch invite link in your WhatsApp, Telegram or YouTube community. Students who join practise under your batch; you see per-student mocks attempted, average scores, last-active dates and which topics your whole batch is weakest in. You can set assignments (for example 'complete one full SSC CGL mock by Sunday') and Shishya tracks who actually completed them. Your student list exports to CSV at any time.",
        },
      },
      {
        "@type": "Question",
        name: "Does Shishya compete with educators for their students?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Shishya provides the infrastructure — tests, AI tutoring, analytics — while the educator keeps their brand, their fees, their community and their students. Shishya does not market to an educator's batch or sit between the educator and their students, and the educator's data is exportable at any time, including on leaving.",
        },
      },
    ],
  },
];

const GETS = [
  {
    icon: "📝",
    title: "A complete test engine, day one",
    body: "Unlimited adaptive mocks + previous-year papers for 177 government exams — SSC, Banking, Railways, every state PSC, Police, TET. Your students practise under your banner; you schedule, they attempt, everyone sees ranks.",
  },
  {
    icon: "📋",
    title: "Your instructions, documented & tracked",
    body: "Set assignments — 'complete 1 full mock by Sunday' — and they appear on every student's dashboard. Shishya tracks who actually did it. Your guidance stays written down, reusable for every future batch: that's how one educator scales.",
  },
  {
    icon: "📊",
    title: "See every student's weak areas",
    body: "The dashboard coaching apps don't give you: who's practising, who's slipping, which topics your whole batch is bleeding marks on — so your next class targets exactly that.",
  },
  {
    icon: "🙋",
    title: "A doubt channel that reaches YOU",
    body: "Students raise doubts from their dashboard; you see them collected on your batch page. The AI tutor absorbs the routine ones between your classes — you handle the ones that build your reputation.",
  },
  {
    icon: "🤖",
    title: "An AI tutor between your classes",
    body: "Your students' 11 PM doubts get answered instantly, in 22 Indian languages, aware of their syllabus and mistakes. You teach; the AI handles the repetition.",
  },
  {
    icon: "🏆",
    title: "All-India Live Tests every Sunday",
    body: "Your batch competes on real Sunday papers with All-India ranks — the retention ritual that keeps students coming back to YOUR program.",
  },
  {
    icon: "🔗",
    title: "One invite link to onboard",
    body: "Create a batch, share one link in your WhatsApp/Telegram group, done. No app to build, no APK to maintain, no server bills.",
  },
  {
    icon: "🛡️",
    title: "Your students stay yours — provably",
    body: "Your batch, your brand, your fees, your community. We never market to your students or sit between you and them — and your student list (with progress data) exports to CSV from your dashboard any time, even on your way out.",
  },
];

export default function EducatorsPage() {
  return (
    <main className="min-h-screen bg-paper-50">
      {JSON_LD.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />
      ))}
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          🤝 Shishya for Educators · founding pilot batch
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
          Your teaching. Our engine.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
          Here&apos;s our honest math: platforms like Shishya are only <strong>10–20% of a
          selection</strong> — the practice, the mocks, the data. The other 80% is what YOU do:
          handholding, discipline, strategy, belief. Aspirants don&apos;t crack exams alone;
          educator-led aspirants do. So we built the 20% properly — and we&apos;re handing it to
          the people who own the 80%.
        </p>

        {/* Honest traction */}
        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-500">
          One month since launch, fully organic: <strong>2,200+ aspirants</strong>, ~100 arriving
          daily, <strong>1,400+ mocks completed</strong>, growing ~15% week on week. Real numbers
          from our public live counters — we don&apos;t inflate.
        </p>

        {/* The offer — free until THEY call it useful */}
        <div className="mt-5 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-bold text-emerald-900">
            Free until you yourself say &ldquo;this is useful.&rdquo;
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">
            No fees, no card, no timer. On your onboarding call we&apos;ll agree what
            &ldquo;useful&rdquo; means <em>together</em> — for example, &ldquo;60% of my batch
            active every week for a month&rdquo; — and only when you confirm your own milestone do
            we sit down for a simple per-student agreement (indicatively ₹99/student/year). Until
            then — and if you leave — you owe nothing, and your student list exports to CSV
            whenever you ask.
          </p>
        </div>

        {/* The ship-in-a-day promise */}
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
          <p className="text-xs leading-relaxed text-indigo-900">
            ⚡ <strong>Missing something you need?</strong> Tell us on the onboarding call —
            batch-workflow features (assignments, reports, views like the ones on this page) ship
            in <strong>1–2 days</strong>; bigger builds get an honest timeline upfront. This
            entire educator suite was built and shipped in days. Your feature list becomes our
            roadmap.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {GETS.map((g) => (
            <div key={g.title} className="rounded-xl border border-ink-200 bg-white p-4">
              <p className="text-sm font-bold text-ink-900">
                <span className="mr-1.5" aria-hidden>{g.icon}</span>
                {g.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">{g.body}</p>
            </div>
          ))}
        </div>

        {/* Proof strip */}
        <p className="mt-6 rounded-lg border border-ink-200 bg-white px-4 py-3 text-xs leading-relaxed text-ink-600">
          Already running on Shishya: <strong>1,400+ mocks completed</strong>, an AI tutor answering
          in 22 languages, Sunday All-India Live Tests, 3,700+ topics of study notes, and live
          vacancy data for 177 exams — see{" "}
          <Link href="/jobs-map" className="font-semibold text-indigo-700 underline">
            India&apos;s Government Jobs Map
          </Link>{" "}
          for the scale.
        </p>

        {/* See it yourself — the navigable sample flow */}
        <div className="mt-8 rounded-xl border border-ink-200 bg-white p-5">
          <h2 className="text-base font-bold text-ink-900">See it yourself — 3 links, 5 minutes</h2>
          <ol className="mt-2 space-y-2 text-sm leading-relaxed text-ink-700">
            <li>
              1️⃣ <strong>Feel the student side:</strong> join our demo batch with your Google
              account —{" "}
              <Link href="/educators/demo" className="font-semibold text-indigo-700 underline">
                shishya.in/educators/demo
              </Link>{" "}
              — then attempt any mock. That&apos;s exactly what your students experience under your
              banner.
            </li>
            <li>
              2️⃣ <strong>Create your own institution</strong> in 2 minutes, self-serve:{" "}
              <Link href="/institutions/new" className="font-semibold text-indigo-700 underline">
                shishya.in/institutions/new
              </Link>{" "}
              — make a course, make a batch, get your invite link.
            </li>
            <li>
              3️⃣ <strong>Watch the dashboard fill:</strong> as students join and practise, your
              batch page shows live per-student mocks, scores, weak areas, and assignment
              completion — the view we&apos;ll walk through together on your onboarding call.
            </li>
          </ol>
        </div>

        {/* Lead form + self-serve */}
        <div className="mt-8 rounded-2xl border-2 border-saffron-300 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink-900">Start your pilot</h2>
          <p className="mt-1 text-xs text-ink-500">
            Tell us about your channel or institute — the founder personally sets up your first
            batch within 24 hours. Prefer self-serve? Create your institution directly at{" "}
            <Link href="/institutions/new" className="font-semibold text-indigo-700 underline">
              shishya.in/institutions/new
            </Link>
            .
          </p>
          <EducatorLeadForm />
        </div>
      </section>
    </main>
  );
}
