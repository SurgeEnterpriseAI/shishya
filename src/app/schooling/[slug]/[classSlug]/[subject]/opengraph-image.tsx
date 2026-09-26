// /schooling/{board}/class-{n}/{subject} social card (26 Sep 2026,
// share-images group). The subject page's own openGraph (no `images` key)
// replaced the inherited card, and the class folder's card does not reach it
// (Next merges openGraph per segment), so the subject folder has its own.
// Words: board, class and subject names, what the page links and whether
// Shishya's own notes / checked practice exist, computed from the chapter
// rows (src/lib/og/page-card-text.ts). Latin script only; no textbook text.

import { pageCard, PAGE_CARD_SIZE } from "@/lib/og/page-card";
import { schoolSubjectCardInput } from "@/lib/og/page-card-data";
import { schoolSubjectCardText } from "@/lib/og/page-card-text";

export const runtime = "nodejs";
// 10 minutes = SCHOOL_REVALIDATE, the subject page's own window (Next needs the literal).
export const revalidate = 600;
export const alt = "Shishya · School: the board, class and subject, and what the subject page links";
export const size = PAGE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string; classSlug: string; subject: string }> }) {
  const { slug, classSlug, subject } = await params;
  return pageCard(schoolSubjectCardText(await schoolSubjectCardInput(slug, classSlug, subject)));
}
