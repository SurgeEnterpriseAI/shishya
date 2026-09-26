// /exams/state — government exams by state (15 Sep 2026, SEO/AEO wave 1).
//
// The index every state page hangs under: one card per state or union
// territory with at least one active exam, its exam count and first exams.
// Before this page the state pages' breadcrumb pointed at /exams (a redirect
// to /) and nothing listed all states in one crawlable place.
//
// 16 Sep 2026: the body is written in en / hi / te and its language is the
// URL's (an optional `lang` route param), never getT() — this page is
// prerendered and CDN-cached, and a cookie/header read would make it a
// per-request render for everyone. This route has no `lang` param, so it is
// English as before; see src/app/exams/state/[slug]/page.tsx.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { getStateDirectory } from "@/lib/state-exams";
import { notFound } from "next/navigation";
import { isUrlLocale } from "@/lib/seo-locale";
import { fillState, stateCopy, stateCopyLocale, stateDisplayName, stateOtherNames } from "@/lib/state-exams-copy";
import { STATES } from "@/lib/state-info";
import { stateEntranceCount } from "@/lib/state-exam-sections";

export const revalidate = 3600;

// 26 Sep 2026: 28 of the state exams are admission tests (src/lib/exam-kind.ts
// STATE_CET_CODES), so the index says "government and entrance exams" and
// counts the two kinds apart — every count from the directory, none typed.
function kindCounts(dir: readonly { exams: readonly { code: string }[] }[]): { gov: number; ent: number } {
  const ent = dir.reduce((a, s) => a + stateEntranceCount(s.exams), 0);
  const total = dir.reduce((a, s) => a + s.exams.length, 0);
  return { gov: total - ent, ent };
}

export async function generateMetadata(): Promise<Metadata> {
  const year = new Date().getUTCFullYear();
  const dir = await getStateDirectory().catch(() => []);
  const { gov, ent } = kindCounts(dir);
  const title = `Government and Entrance Exams by State ${year} — All States & UTs | Shishya`;
  const description = `${gov} state government exams and ${ent} state entrance tests across ${dir.length} states and UTs — pick your state for its exams, announced dates, where to apply, and free mock tests.`;
  const url = "https://shishya.in/exams/state";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StatesIndexPage({ params }: { params?: Promise<{ lang?: string }> }) {
  const lang = (await params)?.lang;
  // hi / te only from a [lang] twin route; anything else is not a twin prefix.
  if (lang !== undefined && !isUrlLocale(lang)) notFound();
  const dir = await getStateDirectory().catch(() => []);
  const { gov, ent } = kindCounts(dir);
  // 16 Sep 2026: body in the URL's language (file header). generateMetadata
  // stays English — this page canonicalises to the English URL for every
  // locale.
  const lc = stateCopyLocale(lang);
  const C = stateCopy(lc);
  const nameOf = (s: { code: string; name: string }) => {
    const st = STATES[s.code];
    return st ? stateDisplayName(st, lc) : s.name;
  };
  const otherNamesOf = (s: { code: string; nativeName: string; hindiName: string }) => {
    const st = STATES[s.code];
    if (st) return stateOtherNames(st, lc);
    return s.nativeName === s.hindiName ? s.hindiName : `${s.nativeName} · ${s.hindiName}`;
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Government and entrance exams by state",
    itemListElement: dir.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://shishya.in/exams/state/${s.slug}`,
      name: `${s.name} ${stateEntranceCount(s.exams) > 0 ? "government and entrance exams" : "government exams"}`,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Exams by state", item: "https://shishya.in/exams/state" },
    ],
  };
  const jsonLd = (d: object) => JSON.stringify(d).replace(/</g, "\\u003c");

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">{C.home}</Link> · {C.examsByState}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{C.indexH1}</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">
          {fillState(C.indexIntro, { govCount: gov, entCount: ent, stateCount: dir.length })}
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dir.map((s) => (
            <li key={s.code}>
              <Link
                href={`/exams/state/${s.slug}`}
                className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
              >
                <h2 className="text-sm font-semibold text-ink-900">{nameOf(s)}</h2>
                <p className="text-xs text-ink-500">{otherNamesOf(s)}</p>
                <p className="mt-2 text-xs text-ink-700">
                  {s.exams.length} {s.exams.length === 1 ? C.indexExamOne : C.indexExamMany}: {s.exams.slice(0, 3).map((e) => e.shortName).join(", ")}
                  {s.exams.length > 3 ? "…" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/exam-calendar" className="font-medium text-saffron-700 hover:underline">{C.examCalendar}</Link>
          <Link href="/exams/browse" className="font-medium text-saffron-700 hover:underline">{C.browseAll}</Link>
          <Link href="/find-your-exam" className="font-medium text-saffron-700 hover:underline">{C.findExam}</Link>
          <Link href="/jobs-map" className="font-medium text-saffron-700 hover:underline">{C.jobsMap}</Link>
        </p>
      </section>
    </main>
  );
}
