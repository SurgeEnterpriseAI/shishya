// /exams/entrance — entrance exams in India, one crawlable page (26 Sep 2026).
//
// Why: on 26 Sep 2026 Shishya became one smart place to study with an
// Entrance section of its own (JEE, NEET, CUET, NDA, olympiads, state CETs),
// but the only exam index was /exams/browse — 180 exams grouped by the DB
// enum, 128 of them state rows — and a search for "entrance exams in India"
// had no page that answered it. This page lists every entrance exam, olympiad
// and state CET Shishya has, grouped the way students think of them
// (src/lib/exam-kind.ts entranceGroupOf), each linked to its hub by its
// catalogue short name. Every count is computed from the catalogue
// (getExamCatalog → REAL_EXAM_WHERE); nothing is typed.
//
// Static segment: /exams/entrance never collides with /exams/[code] (exam
// codes are upper-case). English only — no hreflang twin is declared; the
// /hi and /te prefixes render this English page with the English canonical.
// ISR hourly; no cookie, header or session read, so the render is cached.
// A failed catalogue read throws (Next keeps serving the last good copy)
// rather than caching an empty list.
// No date is shown: no cached helper gives every exam's next announced date
// cheaply, and each hub's tracker already carries its dates with their tier.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { getExamCatalog } from "@/lib/db/exam-cache";
import { ENTRANCE_GROUPS, entranceGroupOf, type EntranceGroupKey } from "@/lib/exam-kind";
// 26 Sep 2026 (G4): links to the live entrance category hubs and the
// "exams after 12th" page — each shown only while it is live / indexable.
import { getExamListRows } from "@/lib/exam-list-rows";
import { EXAM_CATEGORIES, examsInCategory, isCategoryLive } from "@/lib/exam-categories";
import { levelCounts } from "@/lib/exam-qualification";

export const revalidate = 3600;

const SITE = "https://shishya.in";
const PATH = "/exams/entrance";
const TITLE = "Entrance exams in India — JEE, NEET, CUET, NDA, olympiads and state CETs | Shishya";

interface EntranceExam {
  code: string;
  shortName: string;
  name: string;
  group: EntranceGroupKey;
}

async function loadEntranceExams(): Promise<EntranceExam[]> {
  const catalog = await getExamCatalog();
  const out: EntranceExam[] = [];
  for (const e of catalog) {
    if (e.category === "SCHOOL_BOARD") continue;
    const group = entranceGroupOf({ code: e.code, category: String(e.category) });
    if (group) out.push({ code: e.code, shortName: e.shortName, name: e.name, group });
  }
  return out.sort((a, b) => a.shortName.localeCompare(b.shortName));
}

function counts(exams: readonly EntranceExam[]) {
  const olympiads = exams.filter((e) => e.group === "olympiad").length;
  const stateCets = exams.filter((e) => e.group === "state-cet").length;
  return { total: exams.length, olympiads, stateCets, national: exams.length - olympiads - stateCets };
}

function entranceDescription(c: ReturnType<typeof counts>): string {
  return (
    `${c.total} entrance exams on Shishya: ${c.national} national entrance exams (JEE, NEET, CUET, NDA, law, management, ` +
    `design and university tests), ${c.olympiads} olympiads and ${c.stateCets} state CETs. Free mock tests, previous-year-pattern ` +
    `practice, syllabus and exam dates marked official, reported or expected — no paywall.`
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const c = counts(await loadEntranceExams());
  const description = entranceDescription(c);
  const url = `${SITE}${PATH}`;
  return {
    title: TITLE,
    description,
    alternates: { canonical: url },
    keywords: [
      "entrance exams in India",
      "entrance exams after 12th",
      "JEE NEET CUET NDA",
      "olympiad exams India",
      "state CET exams",
      "engineering entrance exams",
      "medical entrance exams",
      "free mock tests entrance exams",
    ],
    openGraph: {
      title: TITLE.replace(" | Shishya", ""),
      description,
      url,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: TITLE.replace(" | Shishya", ""), description },
  };
}

const RELATED: readonly { href: string; label: string }[] = [
  { href: "/for/engineering-aspirant", label: "For engineering aspirants" },
  { href: "/for/medical-aspirant", label: "For medical aspirants" },
  { href: "/schooling/streams", label: "Class 11-12 streams" },
  { href: "/colleges", label: "Colleges" },
  { href: "/scholarships", label: "Scholarships" },
];

export default async function EntranceExamsPage() {
  const exams = await loadEntranceExams();
  const listRows = await getExamListRows().catch(() => []);
  const entranceHubs = EXAM_CATEGORIES.filter((c) => c.slug.endsWith("-entrance") && isCategoryLive(examsInCategory(c, listRows)));
  const after12 = levelCounts(listRows).find((x) => x.level.slug === "12th" && x.indexable);
  const c = counts(exams);
  const groups = ENTRANCE_GROUPS.map((g) => ({ ...g, list: exams.filter((e) => e.group === g.key) })).filter((g) => g.list.length > 0);
  const url = `${SITE}${PATH}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Entrance exams in India",
      description: entranceDescription(c),
      url,
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      isPartOf: { "@type": "WebSite", name: "Shishya", url: SITE },
      publisher: { "@type": "EducationalOrganization", "@id": `${SITE}/#organization`, name: "Shishya", url: SITE },
      mainEntity: { "@id": `${url}#exams` },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${url}#exams`,
      name: "Entrance exams on Shishya",
      numberOfItems: exams.length,
      itemListElement: groups
        .flatMap((g) => g.list)
        .map((e, i) => ({ "@type": "ListItem", position: i + 1, name: e.shortName, url: `${SITE}/exams/${e.code}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "All exams", item: `${SITE}/exams/browse` },
        { "@type": "ListItem", position: 3, name: "Entrance exams", item: url },
      ],
    },
  ];
  const jsonLdText = (d: object) => JSON.stringify(d).replace(/</g, "\\u003c");

  return (
    <main className="min-h-screen bg-ink-50/40">
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(d) }} />
      ))}
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/exams/browse" className="hover:text-ink-800">All exams</Link> · Entrance exams
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">Entrance exams in India</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">{entranceDescription(c)}</p>
        <p className="mt-2 max-w-3xl text-xs text-ink-500">
          Practice questions are written with AI, and most have passed an automated answer check. Each exam page has its own date tracker; apply
          only on the conducting body&apos;s official website.
        </p>

        {groups.map((g) => (
          <section key={g.key} className="mt-8" aria-labelledby={`entrance-${g.key}`}>
            <h2 id={`entrance-${g.key}`} className="text-lg font-semibold text-ink-900">
              {g.label} <span className="text-xs font-normal text-ink-500">({g.list.length})</span>
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.list.map((e) => (
                <li key={e.code}>
                  <Link
                    href={`/exams/${e.code}`}
                    className="block h-full rounded-md border border-ink-200 bg-white p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <span className="block text-sm font-semibold text-ink-900">{e.shortName}</span>
                    {e.name !== e.shortName && <span className="mt-0.5 block text-xs text-ink-500 line-clamp-2">{e.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {(entranceHubs.length > 0 || after12) && (
          <nav aria-label="Compare entrance exams" className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-900">Compare side by side</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {entranceHubs.map((c) => (
                <li key={c.slug}>
                  <Link href={`/exams/category/${c.slug}`} className="font-medium text-saffron-700 hover:underline">
                    {c.heading}
                  </Link>
                </li>
              ))}
              {after12 && (
                <li>
                  <Link href="/exams/after/12th" className="font-medium text-saffron-700 hover:underline">
                    Exams after 12th ({after12.total})
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        )}

        <nav aria-label="Related" className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-base font-semibold text-ink-900">Also on Shishya</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {RELATED.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="font-medium text-saffron-700 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/exams/browse" className="font-medium text-saffron-700 hover:underline">
                Government and entrance exams
              </Link>
            </li>
            <li>
              <Link href="/exams/state" className="font-medium text-saffron-700 hover:underline">
                Exams by state
              </Link>
            </li>
          </ul>
        </nav>
      </section>
    </main>
  );
}
