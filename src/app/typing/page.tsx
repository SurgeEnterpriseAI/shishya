// /typing — free typing speed test for govt-exam skill tests (SSC CHSL
// DEST, RRB NTPC, typist/steno posts) in English and Hindi. Fully
// client-side and anonymous-friendly: no sign-in, no friction.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { TypingTest } from "./TypingTest";

export const metadata: Metadata = {
  title: "Free Typing Test for SSC CHSL DEST, RRB NTPC — English & Hindi WPM | Shishya",
  description:
    "Practice the typing skill test for SSC CHSL/CGL DEST, RRB NTPC and typist posts — free, in English and Hindi. Real exam scoring: net WPM, accuracy and key depressions per hour, checked against actual pass benchmarks.",
  alternates: { canonical: "https://shishya.in/typing" },
  openGraph: {
    title: 'Free typing speed test for SSC CHSL, CGL DEST & RRB NTPC | Shishya'.replace(" | Shishya", ""),
    description: 'Practise English and Hindi typing scored as net WPM, accuracy and key depressions per hour against real SSC and RRB benchmarks. Free, unlimited.',
    url: "https://shishya.in/typing",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: 'Free typing speed test for SSC CHSL, CGL DEST & RRB NTPC | Shishya'.replace(" | Shishya", ""),
    description: 'Practise English and Hindi typing scored as net WPM, accuracy and key depressions per hour against real SSC and RRB benchmarks. Free, unlimited.',
  },
};

// AEO: "what typing speed is needed for SSC CHSL" and its siblings are
// high-volume queries with weak, contradictory answers online. These
// give AI engines a precise, citeable answer.
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Shishya Typing Test (English & Hindi)",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: "https://shishya.in/typing",
    description:
      "Free typing speed test for Indian government exam skill tests (SSC CHSL/CGL DEST, RRB NTPC, typist and stenographer posts) in English and Hindi, scored as net WPM, accuracy and key depressions per hour.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What typing speed is needed for the SSC CHSL DEST typing test?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SSC's Data Entry Speed Test is measured in key depressions per hour: 8,000 KDPH, which works out to roughly 27 words per minute sustained over the test. Accuracy matters as much as raw speed, because errors are deducted. You can practise it free at https://shishya.in/typing, which scores exactly this way.",
        },
      },
      {
        "@type": "Question",
        name: "What is the typing speed required for RRB NTPC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The RRB NTPC typing skill test generally requires about 30 words per minute in English or 25 words per minute in Hindi. It is qualifying in nature — you must clear it, but the score does not add to your merit position.",
        },
      },
      {
        "@type": "Question",
        name: "How can I practise the Hindi typing test for government exams free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Shishya offers a free Hindi typing practice test at https://shishya.in/typing with real exam-style Hindi passages, a 2 or 5 minute timer, and scoring in net WPM, accuracy and key depressions per hour, checked against the Hindi benchmarks used by SSC and RRB skill tests. No sign-up is needed.",
        },
      },
      {
        "@type": "Question",
        name: "How is net typing speed calculated?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Gross WPM = total characters typed ÷ 5 ÷ minutes. Net WPM subtracts wrong words per minute from that figure. This is why accuracy below roughly 90% usually means typing slower will actually raise your net score — each error costs more than the extra seconds.",
        },
      },
    ],
  },
];

export default function TypingPage() {
  return (
    <main className="min-h-screen bg-paper-50">
      {JSON_LD.map((j, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }}
        />
      ))}
      <Header />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900">⌨️ Typing skill test practice</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
          SSC CHSL &amp; CGL (DEST), RRB NTPC and typist posts all have a qualifying typing
          test — and most aspirants first touch typing two weeks before it. Practice here
          free, in English or Hindi, scored exactly the way the real test scores.
        </p>
        <TypingTest />
        <div className="mt-8 rounded-lg border border-ink-200 bg-white p-4 text-xs leading-relaxed text-ink-600">
          <p className="font-semibold text-ink-800">How scoring works</p>
          <p className="mt-1">
            Gross WPM = characters typed ÷ 5 ÷ minutes. Net WPM subtracts wrong words per
            minute. SSC&apos;s DEST measures key depressions per hour (8,000 KDPH ≈ 27 WPM
            sustained). Accuracy below ~90% usually means slowing down will raise your net
            speed — errors cost more than slow typing.
          </p>
        </div>
      </section>
    </main>
  );
}
