// /exams/entrance social card (26 Sep 2026, share-images group).
//
// The entrance page sets its own openGraph without an image, which replaced
// the root card. This file-based image is added to it by Next (no `images`
// key on the page; twitter:image is filled from it too). Words: the page's
// H1 and the exam groups it renders — the ENTRANCE_GROUPS labels that have at
// least one exam in the catalogue (src/lib/og/page-card-data.ts). No counts:
// platforms cache the card.

import { pageCard, PAGE_CARD_SIZE } from "@/lib/og/page-card";
import { entranceGroupLabels } from "@/lib/og/page-card-data";
import { entranceCardText } from "@/lib/og/page-card-text";

export const runtime = "nodejs";
// Hourly, like the entrance page.
export const revalidate = 3600;
export const alt = "Shishya · Entrance exams in India: the exam groups this page lists";
export const size = PAGE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return pageCard(entranceCardText(await entranceGroupLabels()));
}
