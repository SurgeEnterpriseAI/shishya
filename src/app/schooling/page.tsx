import type { Metadata } from "next";
import { SectionComingSoon } from "@/components/SectionComingSoon";

export const metadata: Metadata = {
  title: "Schooling — Class 1 to 12, every board, every state | Shishya",
  description:
    "Schooling section coming to Shishya: CBSE, ICSE, all state boards, every class from 1 to 12. Syllabus, practice, free resources, board exam hubs, scholarships, olympiads. In every Indian language.",
  alternates: { canonical: "https://shishya.in/schooling" },
  keywords: [
    "school preparation india",
    "CBSE syllabus",
    "ICSE syllabus",
    "state board class 10",
    "state board class 12",
    "board exam preparation",
    "NMMS scholarship",
    "INSPIRE scholarship",
    "olympiad preparation",
    "NCERT free",
  ],
  openGraph: {
    title: "Schooling — Class 1 to 12 on Shishya",
    description: "CBSE, ICSE, state boards. Syllabus, practice, free resources. Coming.",
    url: "https://shishya.in/schooling",
    siteName: "Shishya",
    type: "website",
  },
};

export default function SchoolingLanding() {
  return (
    <SectionComingSoon
      title="Schooling"
      subtitle="Class 1 — 12 · CBSE · ICSE · State Boards · NIOS"
      intro="Every Indian student between Class 1 and Class 12, on every board, in every state. Free syllabus-aligned practice, board exam preparation hubs, scholarship pathways and olympiad guidance — all in your language."
      eta="Shipping in Phase 3 of the roadmap (Week 7+)"
      breadcrumb="Schooling"
      bullets={[
        { title: "State × Board × Class structure", body: "Pick your state, your board (CBSE / ICSE / state-specific / NIOS / IB) and your class — get the exact syllabus and practice that matches your curriculum." },
        { title: "Board exam preparation hubs", body: "Class 10 and Class 12 dedicated hubs with sample papers, blueprint, marking scheme, last 10 years' papers, AI mocks and a study planner tied to your real exam date." },
        { title: "Subject-by-subject deep dives", body: "Chapter-wise concept summaries, key formulas, common mistakes, mastery quizzes — cross-linked to relevant entrance exam topics so your Class 11 Physics also preps you for JEE." },
        { title: "School scholarships hub", body: "NMMS, INSPIRE, PM Yashasvi and every state scheme — filterable by class, category, family income, gender, state. Direct links to official portals only." },
        { title: "Olympiad guidance", body: "NSO, IMO, IJSO, NTSE successors, regional science fairs. Eligibility, syllabus, registration windows, past papers where publicly released." },
        { title: "Free resources only", body: "DIKSHA, NCERT books, SWAYAM, NIOS, government-approved YouTube channels — surfaced and organised, never resold. No affiliate links anywhere." },
      ]}
    />
  );
}
