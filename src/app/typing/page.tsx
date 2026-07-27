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
};

export default function TypingPage() {
  return (
    <main className="min-h-screen bg-paper-50">
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
