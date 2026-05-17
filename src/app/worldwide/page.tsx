import type { Metadata } from "next";
import { SectionComingSoon } from "@/components/SectionComingSoon";

export const metadata: Metadata = {
  title: "Worldwide — Study abroad from India, work visas, global careers | Shishya",
  description:
    "Study abroad from India neutrally: US, UK, Canada, Australia, Germany, France, Netherlands, Singapore, Ireland, NZ, UAE, Japan and more. Tuition, visas, post-study work, PR, IELTS / TOEFL / GRE / GMAT prep. No agent referrals.",
  alternates: { canonical: "https://shishya.in/worldwide" },
  keywords: [
    "study abroad india",
    "MS in US from india",
    "study in Canada from india",
    "study in UK from india",
    "IELTS preparation free",
    "GRE preparation free",
    "GMAT preparation",
    "student visa india",
    "post study work visa",
    "education loan india",
  ],
  openGraph: {
    title: "Worldwide on Shishya",
    description: "Study abroad neutrally — 14 countries, free test prep, official visa info.",
    url: "https://shishya.in/worldwide",
    siteName: "Shishya",
    type: "website",
  },
};

export default function WorldwideLanding() {
  return (
    <SectionComingSoon
      title="Worldwide"
      subtitle="Study abroad · Work visas · Global careers"
      intro={`The unfiltered version of every "study abroad consultant" website. Tuition costs, visa processes, post-study work, PR pathways and scholarships — sourced from official embassies, universities and government portals. No agent partnerships. No affiliate links. No loan referrals.`}
      eta="Shipping in Phase 6 of the roadmap (Week 23+)"
      breadcrumb="Worldwide"
      bullets={[
        { title: "14 country pages", body: "US, UK, Canada, Australia, Germany, France, Netherlands, Singapore, Ireland, NZ, UAE, Japan, Sweden, more. Education system, top universities (QS / THE sourced), tuition + living costs, application timelines, post-study work, PR pathways." },
        { title: "Test prep modules", body: "IELTS, TOEFL, PTE, GRE, GMAT, country-specific tests. Adaptive mocks + AI tutor, same engine as our exam section. Free." },
        { title: "Visa information", body: `Per country, per visa type. Document checklist, processing timeline, fees, common rejection reasons. Every visa page shows "Last verified: [date]" and gets auto-flagged for re-verification every 90 days.` },
        { title: "Education loan landscape", body: `SBI Global Ed-Vantage, HDFC Credila, ICICI, Axis, BoB, GyanDhan, Avanse — collateral vs non-collateral, interest rates, moratorium, Section 80E tax benefit. Informational comparison only — no "recommended lender" badges, no referral kickbacks.` },
        { title: "Country comparison tool", body: "Side-by-side: cost, work permit duration, PR difficulty, Indian student count. Helps you pick honestly based on YOUR priorities, not the consultant's commission rate." },
        { title: "Indian student community", body: "Real resources by country: city-wise student WhatsApp groups (where they exist publicly), official Indian student associations, university Indian student clubs." },
      ]}
    />
  );
}
