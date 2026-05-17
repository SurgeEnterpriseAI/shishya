import type { Metadata } from "next";
import { SectionComingSoon } from "@/components/SectionComingSoon";

export const metadata: Metadata = {
  title: "Insights — Public-good data on Indian education decisions | Shishya",
  description:
    "Anonymised, aggregated platform data on how Indian students prepare, where they apply, which careers they pick, and what they struggle with. Free annual State of Indian Education Decisions report.",
  alternates: { canonical: "https://shishya.in/insights" },
  keywords: [
    "indian education data",
    "exam preparation trends india",
    "college interest trends",
    "scholarship trends india",
    "career path data india",
    "study abroad trends",
    "education research india",
    "anonymised student data",
  ],
  openGraph: {
    title: "Insights on Shishya",
    description: "Public-good research on Indian education decisions. Anonymised, free.",
    url: "https://shishya.in/insights",
    siteName: "Shishya",
    type: "website",
  },
};

export default function InsightsLanding() {
  return (
    <SectionComingSoon
      title="Insights"
      subtitle="Anonymised, aggregated, public-good"
      intro="As Shishya grows, the aggregate signal of how Indian students prepare becomes a public good. This section will publish anonymised dashboards and an annual report — no individual user data, no resale, no advertising integrations. Just the kind of evidence-base Indian education policy has lacked."
      eta="Phase 7 — activates as user data permits"
      breadcrumb="Insights"
      bullets={[
        { title: "Exam preparation trends", body: "Year-on-year growth per exam, state-wise interest shifts, language preference signals. Helps coaching policy and government workforce planning." },
        { title: "Topic-wise weakness aggregates", body: "Across all UPSC aspirants, which topic do students struggle with most this cycle? Across all SSC CGL aspirants, which subject decides cutoff outcomes? Answers from real attempt data." },
        { title: "College interest trends", body: "Most-searched colleges this admission cycle, by state, by stream. Useful signal for colleges trying to understand their own demand." },
        { title: "Scholarship discovery rates", body: "Which scholarships are aspirants finding and applying to? Which deserving ones are under-discovered? Helps philanthropies and government schemes target outreach." },
        { title: "Study abroad shifts", body: "Rising destinations, declining destinations, by Indian state of origin. Visa policy impact signals before they hit headlines." },
        { title: "Annual report", body: "The State of Indian Education Decisions — published free every March. Plain English, full methodology, raw aggregate data downloadable." },
      ]}
    />
  );
}
