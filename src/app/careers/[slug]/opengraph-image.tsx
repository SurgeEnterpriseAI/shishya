// /careers/{slug} social card (26 Sep 2026, share-images group).
//
// The career page sets its own openGraph without an image, which replaced the
// /careers card: shares of a career guide showed no image. This file-based
// image is added to that openGraph by Next (no `images` key on the page).
// Words: the career's name, its field and the sections its data fills — how
// to get in, qualifications, indicative salary bands, pros and cons
// (src/lib/og/page-card-text.ts). No salary figures: the rupee sign does not
// draw in the card font, and a band is indicative — the page carries its
// sources.

import { careerCategoryLabel, findCareer } from "@/data/careers";
import { pageCard, PAGE_CARD_SIZE } from "@/lib/og/page-card";
import { careerCardText } from "@/lib/og/page-card-text";

export const runtime = "nodejs";
// Daily, like the career page.
export const revalidate = 86400;
export const alt = "Shishya · Careers: the career, its field and what this career guide covers";
export const size = PAGE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = findCareer(slug);
  return pageCard(careerCardText(c ? { ...c, categoryLabel: careerCategoryLabel(c.category) } : undefined));
}
