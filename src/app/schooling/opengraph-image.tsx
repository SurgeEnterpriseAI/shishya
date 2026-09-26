// /schooling social card (26 Sep 2026) — see src/lib/og/section-card.tsx.
import { SECTION_CARD_SIZE, sectionCard } from "@/lib/og/section-card";

export const runtime = "nodejs";
export const alt = "Shishya · School — CBSE and CISCE, Classes 1-12: official books linked, Shishya's own notes and checked practice where ready.";
export const size = SECTION_CARD_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return sectionCard({
    section: "School",
    headline: "CBSE & CISCE, Classes 1-12",
    subline: "Official books and syllabuses linked · Shishya's own notes and checked practice where ready · Free",
  });
}
