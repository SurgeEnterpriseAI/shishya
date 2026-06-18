// /aptitude — Surge admission aptitude test.
//
// A 30-minute, 30-MCQ screening test (Quant + Reasoning + Verbal, in the
// style of TCS / Infosys placement aptitude). Candidates seeking admission
// to the Surge process take this; clearing the cutoff shortlists them.
//
// Server component: builds a fresh 30-question set per load (answers
// stripped) and hands it to the client test runner. force-dynamic so each
// candidate gets a freshly shuffled selection.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { buildAptitudeTest, APTITUDE_CONFIG, SECTION_LABEL } from "@/data/aptitude";
import { AptitudeTest } from "./AptitudeTest";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Surge Aptitude Test — 30 Questions, 30 Minutes | Shishya",
  description:
    "Take the Surge admission aptitude test: 30 MCQs in 30 minutes covering Quantitative Aptitude, Logical Reasoning and Verbal Ability — modelled on TCS / Infosys placement tests. Clear the cutoff to be shortlisted.",
  robots: { index: false, follow: false }, // screening test — keep out of search
};

export default function AptitudePage() {
  // Seed the selection from the current time so each load shuffles a
  // different subset. (Server component — Date.now() is fine here.)
  const seed = Date.now() & 0x7fffffff;
  const questions = buildAptitudeTest(seed);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-8">
        <AptitudeTest
          questions={questions}
          config={{
            durationMinutes: APTITUDE_CONFIG.durationMinutes,
            totalQuestions: APTITUDE_CONFIG.totalQuestions,
            passPercent: APTITUDE_CONFIG.passPercent,
          }}
          sectionLabels={SECTION_LABEL}
        />
      </section>
    </main>
  );
}
