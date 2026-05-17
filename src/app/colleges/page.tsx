import type { Metadata } from "next";
import { SectionComingSoon } from "@/components/SectionComingSoon";

export const metadata: Metadata = {
  title: "Colleges & Graduation — NIRF colleges, cutoffs, scholarships | Shishya",
  description:
    "Find your undergraduate path: NIRF-ranked colleges, entrance exam cutoffs, scholarships, fees, branch guidance. Engineering, Medical, Law, Commerce, Arts, Design, Pharmacy and more.",
  alternates: { canonical: "https://shishya.in/colleges" },
  keywords: [
    "college admission india",
    "NIRF ranking",
    "engineering colleges",
    "medical colleges",
    "UG entrance exam",
    "JoSAA counselling",
    "college cutoff trends",
    "UG scholarships India",
    "private colleges fees",
    "state quota colleges",
  ],
  openGraph: {
    title: "Colleges & Graduation on Shishya",
    description: "NIRF colleges, cutoffs, scholarships, fees. Free, neutral, sourced.",
    url: "https://shishya.in/colleges",
    siteName: "Shishya",
    type: "website",
  },
};

export default function CollegesLanding() {
  return (
    <SectionComingSoon
      title="Colleges & Graduation"
      subtitle="Engineering · Medical · Commerce · Arts · Law · Design · Pharmacy · Agriculture"
      intro="Where do you go after Class 12? This section helps Indian students navigate undergraduate admissions — NIRF top colleges, cutoff trends, scholarships, fees, counselling and branch selection — all neutrally sourced. No paid recommendations, no invented rankings."
      eta="Shipping in Phase 2 of the roadmap (Week 2+)"
      breadcrumb="Colleges & Graduation"
      bullets={[
        { title: "NIRF top 200 colleges, sourced", body: "Current and historical NIRF ranks per college, with the original NIRF link beside every claim. Plus state-level rankings where they exist officially." },
        { title: "Per-college pages", body: "Official name, courses, intake, fee structure (linked to college fee page), cutoff trends by exam × category × branch, placement statistics from official college reports only — never third-party claims." },
        { title: "Cutoff trends visualised", body: "Last 3-5 years of cutoff data for major entrance exams, broken down by category, branch and college tier. Helps you target realistically." },
        { title: "UG scholarships database", body: "National Scholarship Portal entries, state schemes and private foundation scholarships. Filterable by eligibility, sortable by amount and deadline. Official application links only." },
        { title: "AI counselling", body: "\"I scored X in JEE Main, what colleges should I consider?\" The AI tutor pulls from the cutoff data + your category + your state preference to suggest realistic targets — never a paid list." },
        { title: "Class 12 → college planner", body: "If you're in Class 12, the section guides you from your entrance-exam choice through JoSAA / state counselling to the right shortlist." },
      ]}
    />
  );
}
