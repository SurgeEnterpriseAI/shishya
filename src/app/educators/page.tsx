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

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Shishya for Educators",
  url: "https://shishya.in/educators",
  description:
    "B2B exam-prep infrastructure for educators and coaching channels: batch management, mocks, AI tutor, live tests and student analytics. Free 3-month pilot.",
  provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
};

const GETS = [
  {
    icon: "📝",
    title: "A complete test engine, day one",
    body: "Unlimited adaptive mocks + previous-year papers for 177 government exams — SSC, Banking, Railways, every state PSC, Police, TET. Your students practise under your banner; you schedule, they attempt, everyone sees ranks.",
  },
  {
    icon: "📊",
    title: "See every student's weak areas",
    body: "The dashboard coaching apps don't give you: who's practising, who's slipping, which topics your whole batch is bleeding marks on — so your next class targets exactly that.",
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
    title: "Your students stay yours",
    body: "Your batch, your brand, your fees, your community. We never market to your students or sit between you and them — Shishya is the engine, you are the teacher.",
  },
];

export default function EducatorsPage() {
  return (
    <main className="min-h-screen bg-paper-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          🤝 Shishya for Educators · founding pilot batch
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
          Your teaching. Our engine.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
          You&apos;ve built the audience and the teaching. Give your batches the infrastructure the
          big apps charge lakhs for — mocks, AI tutoring, live tests, student analytics — running
          under <strong>your</strong> brand, shared with one invite link.
        </p>

        {/* The offer */}
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-bold text-emerald-900">
            Free for your first 3 months — every feature, every student.
          </p>
          <p className="text-xs text-emerald-800">
            Then ₹99 per student per year. No setup fee, no lock-in, leave anytime with your data.
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
