// /hi/exams/:code/guide and /te/exams/:code/guide — cache pilot (16 Sep 2026).
//
// The Hindi and Telugu twins of the guide page used to be middleware
// rewrites of the English route with the language in a request header, which
// forced a per-request render (src/lib/cache-pilot-routes.ts has the whole
// story). This route takes the language from the URL segment and renders the
// very same page component, so each twin URL is ISR-cached like the English
// one. Metadata is the English page's: guide twins canonicalise to the
// English URL and carry no hreflang, unchanged.
//
// Any other value of [lang] is a 404 — only /hi and /te are twin prefixes.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuidePage, { generateMetadata as guideMetadata } from "@/app/exams/[code]/guide/page";
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
  return guideMetadata(props);
}

export default async function LocalisedGuidePage(props: Props) {
  const { lang } = await props.params;
  if (!isUrlLocale(lang)) notFound();
  return <GuidePage params={props.params} />;
}
