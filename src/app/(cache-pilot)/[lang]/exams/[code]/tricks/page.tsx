// /hi/exams/:code/tricks and /te/exams/:code/tricks — cache pilot (16 Sep 2026).
//
// Same shape as the guide twin next to it: the language comes from the URL
// segment, the English page component renders, and the twin URL is
// ISR-cached instead of re-rendered on every request (see
// src/lib/cache-pilot-routes.ts). Metadata is the English page's: tricks
// twins canonicalise to the English URL and carry no hreflang, unchanged.
//
// Any other value of [lang] is a 404 — only /hi and /te are twin prefixes.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TricksPage, { generateMetadata as tricksMetadata } from "@/app/exams/[code]/tricks/page";
import { isUrlLocale } from "@/lib/seo-locale";

export const revalidate = 3600;
// Same safety net as the English page: a request-scoped call that slips into
// the tree returns empty values (anonymous, cacheable) instead of a
// production 500. Segment config is per route file, so it is repeated here.
export const dynamic = "force-static";

// Render each twin on its first visit and serve it from the ISR cache — a
// dynamic route without generateStaticParams is rendered on every request.
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ lang: string; code: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isUrlLocale(lang)) return {};
  return tricksMetadata(props);
}

export default async function LocalisedTricksPage(props: Props) {
  const { lang } = await props.params;
  if (!isUrlLocale(lang)) notFound();
  return <TricksPage params={props.params} />;
}
