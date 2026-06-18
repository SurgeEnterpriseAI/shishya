// /aptitude — Surge admission aptitude test.
//
// A 30-minute, 30-MCQ screening test (Quant + Reasoning + Verbal, in the
// style of TCS / Infosys placement aptitude). Candidates seeking admission
// to the Surge process take this; clearing the cutoff shortlists them.
//
// The paper is GENERATED PER CANDIDATE (POST /api/aptitude/start) so no two
// students get the same questions. This page just renders the intro + the
// client runner, which fetches a fresh paper when the candidate begins.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { APTITUDE_CONFIG, SECTION_LABEL } from "@/data/aptitude";
import { AptitudeTest } from "./AptitudeTest";

export const metadata: Metadata = {
  title: "Surge Aptitude Test — 30 Questions, 30 Minutes | Shishya",
  description:
    "Take the Surge admission aptitude test: 30 MCQs in 30 minutes covering Quantitative Aptitude, Logical Reasoning and Verbal Ability — modelled on TCS / Infosys placement tests. Every candidate gets a unique paper. Clear the cutoff to be shortlisted.",
  robots: { index: false, follow: false }, // screening test — keep out of search
};

export default function AptitudePage() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-8">
        <AptitudeTest
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
