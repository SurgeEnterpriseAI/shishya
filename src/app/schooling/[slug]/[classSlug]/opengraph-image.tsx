// /schooling/{board}/class-{n} social card (26 Sep 2026, share-images group).
//
// The class page sets its own openGraph (title, description, url) without an
// image, which replaced the inherited card: WhatsApp / Telegram shares of a
// class page showed no image. A file-based image in the page's own folder is
// added to that openGraph by Next (the page's openGraph has no `images` key),
// so no page.tsx edit is needed. Words: board, class and subject names, what
// the page links and — computed from the chapter rows — whether Shishya's own
// notes / checked practice exist (src/lib/og/page-card-text.ts). Latin script
// only; never any textbook text.

import { pageCard, PAGE_CARD_SIZE } from "@/lib/og/page-card";
import { schoolClassCardInput } from "@/lib/og/page-card-data";
import { schoolClassCardText } from "@/lib/og/page-card-text";

export const runtime = "nodejs";
// 10 minutes = SCHOOL_REVALIDATE, the class page's own window (Next needs the literal).
export const revalidate = 600;
export const alt = "Shishya · School: the board and class, and what the class page lists and links";
export const size = PAGE_CARD_SIZE;
export const contentType = "image/png";

// Next 15: params is a Promise (a sync read gave undefined → 500 in prod).
export default async function Image({ params }: { params: Promise<{ slug: string; classSlug: string }> }) {
  const { slug, classSlug } = await params;
  return pageCard(schoolClassCardText(await schoolClassCardInput(slug, classSlug)));
}
