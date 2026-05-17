import type { Metadata } from "next";
import { SectionComingSoon } from "@/components/SectionComingSoon";

export const metadata: Metadata = {
  title: "Jobs & Careers — Government jobs, careers, fresher guidance | Shishya",
  description:
    "Career pathways for Indian students. Government job notifications (PIB-sourced), private sector freshers, internships, skill-based careers, resume help, interview prep. Information aggregator — not a job board.",
  alternates: { canonical: "https://shishya.in/jobs" },
  keywords: [
    "government jobs india",
    "PIB notifications",
    "fresher jobs india",
    "internships india",
    "AICTE internship",
    "Internshala alternative",
    "career path india",
    "salary benchmark india",
    "resume template fresher",
    "interview prep fresher",
  ],
  openGraph: {
    title: "Jobs & Careers on Shishya",
    description: "Government job tracking, career paths, fresher guidance.",
    url: "https://shishya.in/jobs",
    siteName: "Shishya",
    type: "website",
  },
};

export default function JobsLanding() {
  return (
    <SectionComingSoon
      title="Jobs & Careers"
      subtitle="Government jobs · Private freshers · Internships · Career switches"
      intro="Shishya is not a job board — we don't list openings or take recruiter fees. We're an information aggregator that helps you understand career pathways: what's possible after your education, what each role actually involves, how to break in, and where to find official applications."
      eta="Shipping in Phase 5 of the roadmap (Week 19+)"
      breadcrumb="Jobs & Careers"
      bullets={[
        { title: "Government job tracking", body: "Daily-updated list of notifications, sourced from PIB releases, Employment News and official department websites. Categorised by qualification, location, department. Application links go to the official portal only." },
        { title: "Career path pages", body: "What this career actually involves, typical entry routes, required qualifications, technical and soft skills, top employers (informational not promotional), salary by experience with cited source, typical progression, related career switches." },
        { title: "Skill-based careers", body: "Coding, design, content, sales, finance, operations, education — the non-degree paths that real students take. Honest about what each requires." },
        { title: "Internship landscape", body: "Where to find them: AICTE Internship, official government schemes, Internshala. No paid \"resume review\" upsells. Just where to apply." },
        { title: "Resume and interview prep", body: "Templates by career path, AI-customised to your background. Interview question banks per role. Negotiation guidance for first jobs." },
        { title: "Real student stories", body: "Community-sourced, moderated. \"I went from Class 12 in Bihar to a software job in Bengaluru — here's exactly what I did.\" No paid testimonials, no influencer content." },
      ]}
    />
  );
}
