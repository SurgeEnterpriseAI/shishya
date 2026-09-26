// /pricing — the shortest pricing page in ed-tech: everything free,
// one optional human service at ₹9. Razorpay KYC-review requirement.
//
// 26 Sep 2026 (whole-education identity): the typed "175+ exams" is gone
// from the page and its FAQPage JSON-LD; the free list now covers every
// section (school, entrance and government exams, colleges, scholarships,
// careers). The fee in the new copy is MENTOR_SESSION_FEE_PAISE — what
// src/app/api/mentor-sessions/[id]/route.ts charges: nothing for a student's
// first session, the fee from the second (a prior DONE session), and free
// whenever the payment link cannot be created.

import type { Metadata } from "next";
import Link from "next/link";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { MENTOR_SESSION_FEE_PAISE } from "@/lib/razorpay";

const MENTOR_FEE = `₹${MENTOR_SESSION_FEE_PAISE / 100}`;
const PRICING_TITLE = "Pricing — Shishya";
const PRICING_DESCRIPTION = `Every study feature on Shishya is free with no paywall — school, entrance and government exams, colleges, scholarships and careers. The only paid item is an optional mentor session: first free, then ${MENTOR_FEE} per session inclusive of GST.`;

/** The one free sentence — the same wording on the page and in the FAQ. */
const FREE_SENTENCE = `Every study feature is free with no paywall; the only paid item is an optional ${MENTOR_FEE} session with a human mentor (first session free).`;

export const metadata: Metadata = {
  title: PRICING_TITLE,
  description: PRICING_DESCRIPTION,
  // Self canonical (16 Sep 2026): one of 7 sitemap landings the crawl found without one.
  alternates: { canonical: "https://shishya.in/pricing" },
  openGraph: {
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    url: "https://shishya.in/pricing",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

// FAQPage JSON-LD: this is the schema AI engines and Google quote when
// someone asks "is Shishya free?" — the pricing story, machine-readable.
const pricingFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Shishya really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes. ${FREE_SENTENCE} Free on Shishya, with no premium tier: school chapters with the official books linked and Shishya's own notes and checked practice where ready; mock tests, previous-year papers and PYQ-pattern practice, study notes, trackers, cutoffs and guides for entrance and government exams; the AI tutor in English and ${INDIAN_LANGUAGE_COUNT} Indian languages; personal coach plans, daily status reports, personalised study packs and All-India live tests; and the colleges, scholarships and careers pages. No trial, no credit card.`,
      },
    },
    {
      "@type": "Question",
      name: "What does the ₹9 mentor session fee cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "₹9 (inclusive of 18% GST) pays only for a human mentor's personal time — a ~10-minute one-on-one session with a verified mentor who has cleared that exam. It is never a platform charge. The first mentor session is completely free; the fee applies from the second session onwards, and is collected only after a mentor accepts the request.",
      },
    },
    {
      "@type": "Question",
      name: "Why does Shishya charge for mentors but not the platform?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Software scales for free; a human's time does not. The small fee honours the mentor who sits down personally with an aspirant, keeps sessions serious, and lets Shishya keep every AI-powered preparation feature free for every aspirant forever.",
      },
    },
  ],
};

export default function PricingPage() {
  return (
    <main className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingFaq) }} />
      <h1 className="text-2xl font-bold text-ink-900">Pricing</h1>

      <div className="mt-5 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-5">
        <p className="text-base font-bold text-ink-900">The platform: ₹0. Free, always.</p>
        <p className="mt-1">{FREE_SENTENCE}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>School:</b> CBSE/NCERT and CISCE class pages with the official books linked, and Shishya&apos;s own chapter notes and checked practice where they are ready.</li>
          <li><b>Entrance and government exams:</b> mock tests, previous-year papers and PYQ-pattern practice, study notes, date trackers, cutoffs and guides.</li>
          <li><b>AI tutor</b> in English and {INDIAN_LANGUAGE_COUNT} Indian languages, personal coach plans, daily status reports, personalised study packs and All-India live tests.</li>
          <li><b>Colleges, scholarships and careers:</b> every page, free to read.</li>
        </ul>
        <p className="mt-2">No trial, no credit card, no premium tier.</p>
      </div>

      <div className="mt-4 rounded-xl border border-ink-200 bg-white p-5">
        <p className="text-base font-bold text-ink-900">Mentor sessions (optional): first free, then ₹9</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A live ~10-minute one-on-one session with a verified mentor who has cleared your exam.</li>
          <li><b>Your first session is free.</b></li>
          <li>From the second session: <b>₹9 per session, inclusive of 18% GST</b> (₹7.63 + ₹1.37 tax, SAC 999293).</li>
          <li>You pay only after a mentor accepts your request; the session room unlocks on payment.</li>
          <li>The fee honours the mentor&apos;s time — it is not a platform charge. See{" "}
            <Link href="/refunds" className="text-saffron-700 underline">refund policy</Link>.</li>
        </ul>
      </div>

      <p className="mt-6 text-xs text-ink-500">
        Prices in Indian Rupees. Payments processed by our payment partner; we never see your card
        or UPI details. Operated by Surge Software Solutions Pvt Ltd.
      </p>
    </main>
  );
}
