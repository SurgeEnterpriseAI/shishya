// /colleges social card (26 Sep 2026) — see src/lib/og/section-card.tsx.
// /colleges/[slug] keeps its own per-college card.
import { SECTION_CARD_SIZE, sectionCard } from "@/lib/og/section-card";

export const runtime = "nodejs";
export const alt = "Shishya · Colleges — colleges in India from the NIRF rankings, by stream and by state, with official links.";
export const size = SECTION_CARD_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return sectionCard({
    section: "Colleges",
    headline: "Colleges in India, by stream and state",
    subline: "Ranks cited from NIRF · official college sites linked · cutoffs and placements read honestly · Free",
  });
}
