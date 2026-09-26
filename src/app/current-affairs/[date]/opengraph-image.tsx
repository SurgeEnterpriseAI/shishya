// /current-affairs/{date} social card (26 Sep 2026, share-images group).
//
// Current affairs is the family with the most organic first landings outside
// exams (Bing 169 + ChatGPT 94 in 90 days), and the day page's own openGraph
// had no image. This file-based image is added to it by Next (no `images`
// key on the page; twitter:image is filled from it too). Words: the digest's
// date, its item count — the page's own "{n} updates", drawn only for a
// closed IST day, since today's digest can still grow and platforms cache the
// card — and the day's categories (src/lib/og/page-card-text.ts).

import { pageCard, PAGE_CARD_SIZE } from "@/lib/og/page-card";
import { currentAffairsCardInput } from "@/lib/og/page-card-data";
import { currentAffairsCardText } from "@/lib/og/page-card-text";

export const runtime = "nodejs";
// Hourly, like the day page.
export const revalidate = 3600;
export const alt = "Shishya · Current affairs: the date of the day's digest, its updates and their categories";
export const size = PAGE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  return pageCard(currentAffairsCardText(await currentAffairsCardInput(date)));
}
