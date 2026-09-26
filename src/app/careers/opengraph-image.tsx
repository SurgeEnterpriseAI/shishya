// /careers social card (26 Sep 2026) — see src/lib/og/section-card.tsx.
import { SECTION_CARD_SIZE, sectionCard } from "@/lib/og/section-card";

export const runtime = "nodejs";
export const alt = "Shishya · Careers — career guides for students in India: entry routes, qualifications and indicative salary bands.";
export const size = SECTION_CARD_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return sectionCard({
    section: "Careers",
    headline: "Career guides for students in India",
    subline: "Entry routes · qualifications · indicative salary bands · the exams and colleges on the way · Free",
  });
}
