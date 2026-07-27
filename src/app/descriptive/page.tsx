// /descriptive — free AI evaluation of descriptive answers (essay,
// formal letter, précis, UPSC Mains answer). The paid platforms sell
// human evaluation with days of turnaround; Shishya evaluates
// instantly, free, 3 per day.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { DescriptiveStudio } from "./DescriptiveStudio";

export const metadata: Metadata = {
  title: "Free AI Essay & Letter Evaluation for SSC, Bank PO, UPSC Mains | Shishya",
  description:
    "Write an essay, formal letter, précis or UPSC Mains answer and get an instant examiner-style evaluation — score out of 25, strengths, specific improvements and grammar corrections. Free, 3 per day. For SSC CHSL/CGL descriptive paper, IBPS/SBI PO and UPSC.",
  alternates: { canonical: "https://shishya.in/descriptive" },
};

export default function DescriptivePage() {
  return (
    <main className="min-h-screen bg-paper-50">
      <Header />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900">✍️ Descriptive answer evaluation</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
          SSC&apos;s descriptive paper, bank PO essay &amp; letter, UPSC Mains — the sections
          nobody checks your practice for. Write here and an AI examiner scores you out of 25
          with specific corrections, instantly. Free, 3 evaluations a day.
        </p>
        <DescriptiveStudio />
      </section>
    </main>
  );
}
