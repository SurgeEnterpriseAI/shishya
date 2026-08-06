// /mentors — join the Shishya mentor network.
//
// The human layer's supply side: cleared-exam seniors who guide current
// aspirants. The pitch is honest — help the next batch, build your
// public teaching profile, earn through guidance work as the network
// grows. Applications reviewed personally; trust is the product.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { MentorApplyForm } from "./MentorApplyForm";

export const metadata: Metadata = {
  title: "Become a Shishya Mentor — guide aspirants of the exam you cleared | Shishya",
  description:
    "Cleared a government exam? Join Shishya's mentor network: guide current aspirants of your exam, build your teaching profile, and earn as the network grows. Free platform, real students, apply in 2 minutes.",
  alternates: { canonical: "https://shishya.in/mentors" },
  openGraph: {
    title: "Become a Shishya Mentor — guide aspirants of the exam you cleared",
    description:
      "Cleared a government exam? Guide current aspirants of your exam on your own time, build a verified public teaching profile, and earn as the network grows. Apply in 2 minutes.",
    url: "https://shishya.in/mentors",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Become a Shishya Mentor",
    description: "Cleared a govt exam? Guide the next batch of aspirants. Free platform, real students, apply in 2 minutes.",
  },
};

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Become a Shishya Mentor",
    url: "https://shishya.in/mentors",
    description:
      "Application page for Shishya's mentor network — cleared-exam seniors guiding current government-exam aspirants.",
    provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How can I become a mentor for government exam aspirants?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "If you have cleared a government exam — SSC, a state PSC, police, teaching (TET) or any recruitment — you can mentor current aspirants of that same exam on Shishya. Apply free at https://shishya.in/mentors with your exam, year cleared and rank/post; every application is verified personally by the founder. Mentors answer doubts from aspirants of their exam on their own time, build a verified public teaching profile, and earn as the network grows. No teaching certificate or coaching experience is required — clearing the exam is the qualification.",
        },
      },
      {
        "@type": "Question",
        name: "Do government exam toppers get paid for mentoring students online?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "On Shishya, mentoring starts as guidance work for aspirants of the exam you cleared and grows into paid work as the network scales — guidance sessions, cohort teaching and referral work. Founding mentors help shape that model and benefit from it first. The platform stays 100% free for students; mentors are never asked to pay to join.",
        },
      },
      {
        "@type": "Question",
        name: "What does a Shishya mentor actually do?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Mentors guide aspirants preparing for the exam they themselves cleared: answering subject and strategy doubts in writing, occasional calls when they choose, and sharing what actually worked in their own selection. There are no fixed hours and no targets — mentors respond when free. Shishya's AI tutor absorbs routine doubts, so mentors handle the questions where lived experience matters most.",
        },
      },
    ],
  },
];

const POINTS = [
  {
    icon: "🎓",
    title: "You cleared it — that's the qualification",
    body: "Rank-holders, serving officers, teachers who passed TET, constables who cracked the physical — the best guide for an aspirant is someone who sat in the same exam hall and won.",
  },
  {
    icon: "🕐",
    title: "On your time",
    body: "Answer doubts from aspirants of YOUR exam when you're free — written answers, calls when you choose. No fixed hours, no targets.",
  },
  {
    icon: "💰",
    title: "Grows into earning",
    body: "Mentoring starts as guidance work and grows with the network — guidance sessions, cohort teaching and referral work as Shishya scales. Founding mentors shape (and benefit from) that model first.",
  },
  {
    icon: "🏛️",
    title: "Your public profile",
    body: "A verified mentor profile on Shishya — your exam, your year, your story. The next batch learns your name.",
  },
];

export default function MentorsPage() {
  return (
    <main className="min-h-screen bg-paper-50">
      {JSON_LD.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />
      ))}
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          🧑‍🏫 The mentor network · founding batch
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
          You cleared the exam. Guide the ones still fighting for it.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
          Shishya is free for every aspirant — and the one thing an AI can&apos;t give them is a
          senior who&apos;s actually been selected. That&apos;s you. We&apos;re hand-picking the
          founding batch of mentors: one exam each, real credentials, personally verified.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {POINTS.map((p) => (
            <div key={p.title} className="rounded-xl border border-ink-200 bg-white p-4">
              <p className="text-sm font-bold text-ink-900">
                <span className="mr-1.5" aria-hidden>{p.icon}</span>
                {p.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border-2 border-saffron-300 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink-900">Apply in 2 minutes</h2>
          <p className="mt-1 text-xs text-ink-500">
            Reviewed personally by the founder. We&apos;ll reach you on WhatsApp/phone within a few
            days.
          </p>
          <MentorApplyForm />
        </div>
      </section>
    </main>
  );
}
