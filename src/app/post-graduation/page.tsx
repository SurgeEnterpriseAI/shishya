import type { Metadata } from "next";
import { SectionComingSoon } from "@/components/SectionComingSoon";

export const metadata: Metadata = {
  title: "Post-Graduation — GATE, CAT, NEET-PG, UGC-NET, fellowships | Shishya",
  description:
    "PG entrance exams + research pathways for Indian students. GATE, CAT, NEET-PG, UGC-NET, JAM, CMAT, GPAT, IIT JAM, fellowships and PhD admissions. Free, AI-tutored, sourced.",
  alternates: { canonical: "https://shishya.in/post-graduation" },
  keywords: [
    "PG entrance exams india",
    "GATE preparation",
    "CAT preparation",
    "NEET PG preparation",
    "UGC NET preparation",
    "JAM exam",
    "PhD admission india",
    "CSIR JRF",
    "DST INSPIRE fellowship",
    "PMRF",
  ],
  openGraph: {
    title: "Post-Graduation on Shishya",
    description: "PG entrances, research paths, fellowships. Free, AI-tutored.",
    url: "https://shishya.in/post-graduation",
    siteName: "Shishya",
    type: "website",
  },
};

export default function PostGraduationLanding() {
  return (
    <SectionComingSoon
      title="Post-Graduation"
      subtitle="PG entrances · Research · Fellowships"
      intro="The decision after graduation: PG entrance exam, direct industry job, research, civil services, or abroad? This section gives you the data to choose. Same adaptive-mock + AI-tutor engine as our entrance exam section, applied to GATE, CAT, NEET-PG, UGC-NET and the rest."
      eta="Shipping in Phase 4 of the roadmap (Week 13+)"
      breadcrumb="Post-Graduation"
      bullets={[
        { title: "PG entrance exam pages", body: "GATE (every branch), CAT, XAT, MAT, CMAT, SNAP, NMAT, NEET-PG, NEET-SS, CLAT-PG, UGC-NET, CSIR-NET, JAM, GPAT, CEED, NID PG, IIT JAM, ICAR AICE. Same template as our existing 163 exam pages." },
        { title: "Research and fellowship pathways", body: "DST INSPIRE, PMRF, CSIR JRF, ICMR JRF, ICSSR. Foreign fellowships accessible from India: Rhodes, Chevening, Fulbright, DAAD, MEXT, Endeavour." },
        { title: "Decision frameworks", body: "Industry vs Academic vs Civil Services — a guided flow that helps you see the trade-offs honestly, not a sales pitch for any one path." },
        { title: "State PG entrances", body: "Every state's PG entrance covered, with the same depth as our state-level UG exam coverage." },
        { title: "Cross-link to Colleges", body: "Each PG exam page links to the colleges/programmes where your score is realistic — same cutoff-trends approach we use for UG admissions." },
        { title: "Adaptive mocks + AI tutor", body: "The mock engine, weakness map and tutor that already work for SSC / UPSC / JEE / NEET get pointed at PG syllabi. No new mental model for returning students." },
      ]}
    />
  );
}
