// SSC CGL Tier 1 — 2024 Shift 1 — sample seed (3 questions).
//
// This is a starter file demonstrating the PYQ ingestion flow. Real PYQ
// transcription should source from the official SSC answer-key PDF on
// ssc.nic.in, never from coaching-institute books.
//
// Run: npx tsx seed/pyqs/_seed.ts ./seed/pyqs/ssc-cgl-2024-shift1.ts

import type { PYQPaper } from "./_types";

const paper: PYQPaper = {
  examCode: "SSC_CGL",
  year: 2024,
  shift: "Tier 1 — Shift 1",
  conductedOn: "2024-09-09",
  sourceUrl: "https://ssc.nic.in/Portal/Notices",
  questions: [
    {
      slug: "q01-percentage",
      topicCode: "quant.percentage",
      difficulty: "EASY",
      body:
        "If 30% of a number is 90, what is 65% of the same number?",
      options: [
        { key: "A", text: "165" },
        { key: "B", text: "180" },
        { key: "C", text: "195" },
        { key: "D", text: "210" },
      ],
      answerKey: "C",
      solution:
        "30% of x = 90 ⇒ x = 300. 65% of 300 = 0.65 × 300 = 195.",
    },
    {
      slug: "q02-blood-relations",
      topicCode: "reason.blood_relations",
      difficulty: "MEDIUM",
      body:
        "Pointing to a man, Anita said, 'He is the only son of my mother's only daughter.' How is the man related to Anita?",
      options: [
        { key: "A", text: "Brother" },
        { key: "B", text: "Son" },
        { key: "C", text: "Cousin" },
        { key: "D", text: "Nephew" },
      ],
      answerKey: "B",
      solution:
        "Mother's only daughter = Anita herself. Her only son is therefore her son.",
    },
    {
      slug: "q03-sentence-correction",
      topicCode: "eng.sentence_improvement",
      difficulty: "EASY",
      body:
        "Choose the option that improves the underlined part:\n\nShe _denied to come_ with us to the picnic.",
      options: [
        { key: "A", text: "denied to come" },
        { key: "B", text: "denied coming" },
        { key: "C", text: "refused to come" },
        { key: "D", text: "refused coming" },
      ],
      answerKey: "C",
      solution:
        "'Deny' takes a noun-phrase object ('denied a charge'); the correct verb for declining an invitation is 'refuse', followed by the to-infinitive: 'refused to come'.",
    },
  ],
};

export default paper;
