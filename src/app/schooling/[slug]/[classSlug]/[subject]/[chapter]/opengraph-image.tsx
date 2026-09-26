// /schooling/{board}/class-{n}/{subject}/{chapter} social card (26 Sep 2026,
// share-images group). The chapter page's own openGraph (no `images` key)
// replaced the inherited card; the parent folders' cards do not reach it
// (Next merges openGraph per segment). Words: board, class and subject names,
// the chapter's number label ("Chapter 3" — never the chapter title or any
// textbook text), and what the chapter has: Shishya's own notes, checked
// practice, the official NCERT chapter PDF (src/lib/og/page-card-text.ts).
// Latin script only.

import { pageCard, PAGE_CARD_SIZE } from "@/lib/og/page-card";
import { schoolChapterCardInput } from "@/lib/og/page-card-data";
import { schoolChapterCardText } from "@/lib/og/page-card-text";

export const runtime = "nodejs";
// 10 minutes = SCHOOL_REVALIDATE, the chapter page's own window (Next needs the literal).
export const revalidate = 600;
export const alt = "Shishya · School: the board, class, subject and chapter number, and what the chapter page has";
export const size = PAGE_CARD_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; classSlug: string; subject: string; chapter: string }>;
}) {
  const { slug, classSlug, subject, chapter } = await params;
  return pageCard(schoolChapterCardText(await schoolChapterCardInput(slug, classSlug, subject, chapter)));
}
