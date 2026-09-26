// /mock-tests — every free mock test on Shishya, on one crawlable page
// (26 Sep 2026, discoverability wave 2).
//
// Why: "mock test" is the most-typed intent in our logs, but no page a
// crawler may fetch listed the mocks — /mocks/{id} is robots-blocked (per-user
// state) and the resolver sent "free mock test" to the weekly live test. This
// page lists every active real exam with at least one shared mock, grouped by
// category and by state; each row gives the computed mock and question counts,
// the questions' written languages and the next exam date with its tier, and
// links to the hub's #mocks section. Rules and wording: src/lib/mock-catalogue.ts
// (pure, tested); reads: src/lib/db/mock-catalogue-db.ts.
//
// One page on purpose — no per-exam URL family: a page per exam would repeat
// the hub's own #mocks section. The /mock-tests path does not match the
// "/mocks/" robots disallow (tests/unit/mock-catalogue.test.ts runs the real
// robots rules). English only: /hi and /te prefixes are not twins here (the
// middleware redirects un-twinned prefixed paths to the plain path).
// ISR hourly; no cookie, header or session read. A failed read throws, so
// Next keeps serving the last good copy rather than caching an empty list.

import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { Header } from "@/components/Header";
import { loadMockCatalogueInput } from "@/lib/db/mock-catalogue-db";
import {
  MOCK_TESTS_PATH,
  SITE,
  buildMockCatalogue,
  examMocksHref,
  fmtCount,
  jsonLdText,
  languagesText,
  mockCatalogueDescription,
  mockCatalogueFaq,
  mockCatalogueHeading,
  mockCatalogueJsonLd,
  mockCatalogueLead,
  mockCatalogueTitle,
  nextExamParts,
  stateExamsHref,
  type MockCatalogueRow,
} from "@/lib/mock-catalogue";
import type { SourceTier } from "@/lib/exam-timeline";

export const revalidate = 3600;

/** One read per render — generateMetadata and the page share it. */
const loadCatalogue = cache(async () => buildMockCatalogue(await loadMockCatalogueInput(), new Date()));

const OG_IMAGE = `${SITE}/opengraph-image`;

/** Group anchors carry a prefix so "banking" or "teaching" never collides
 *  with an id elsewhere on the page. */
const anchor = (key: string) => `mt-${key}`;

export async function generateMetadata(): Promise<Metadata> {
  const c = await loadCatalogue();
  const url = `${SITE}${MOCK_TESTS_PATH}`;
  const title = mockCatalogueTitle(c.totals);
  const description = mockCatalogueDescription(c.totals);
  const ogTitle = title.replace(/ \| Shishya$/, "");
  return {
    title,
    description,
    alternates: { canonical: url },
    // An empty list is not a page worth indexing (never expected; a real
    // zero, not a failed read — a failed read throws above).
    ...(c.totals.exams === 0 ? { robots: { index: false, follow: true } } : {}),
    keywords: ["free mock test", "free online mock test", "mock tests for Indian exams", "state exam mock test", "government exam mock test"],
    // A page-level openGraph block replaces the root's, so the root card is named.
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Shishya — one smart place to study" }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description, images: [OG_IMAGE] },
  };
}

const TIER_BADGE: Record<SourceTier, string> = {
  official: "bg-emerald-100 text-emerald-800",
  reported: "bg-sky-100 text-sky-800",
  expected: "bg-amber-100 text-amber-800",
};

function NextExamLine({ row }: { row: MockCatalogueRow }) {
  const p = nextExamParts(row.next);
  return (
    <p className="mt-1 text-xs text-ink-600">
      {p.lead}
      {p.date && <span className="font-medium text-ink-800"> {p.date}</span>}
      {p.tier && <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_BADGE[p.tier]}`}>{p.tier}</span>}
      {p.tail && <span> — {p.tail}</span>}
    </p>
  );
}

const RELATED: readonly { href: string; label: string }[] = [
  { href: "/live-test", label: "Weekly live test" },
  { href: "/exam-calendar", label: "Exam calendar" },
  { href: "/exams/browse", label: "All exams" },
  { href: "/exams/entrance", label: "Entrance exams" },
  { href: "/exams/state", label: "Exams by state" },
  { href: "/current-affairs", label: "Current affairs" },
];

export default async function MockTestsPage() {
  const c = await loadCatalogue();
  const t = c.totals;
  const faq = mockCatalogueFaq(t);
  const national = c.groups.filter((g) => g.kind === "category");
  const states = c.groups.filter((g) => g.kind === "state");

  return (
    <main className="min-h-screen bg-ink-50/40">
      {mockCatalogueJsonLd(c).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(d) }} />
      ))}
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Mock tests
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{mockCatalogueHeading(t)}</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">{mockCatalogueLead(t)}</p>
        <p className="mt-2 max-w-3xl text-xs text-ink-500">
          Each exam links to its own mock tests. Dates come from that exam&apos;s tracker: <b>official</b> — cited on the conducting
          body&apos;s website; <b>reported</b> — announced, cited from another source such as a news site; <b>expected</b> — an estimate from the usual cycle,
          not announced. Apply only on the official website. For a ranked test with other students, try the{" "}
          <Link href="/live-test" className="font-medium text-saffron-700 hover:underline">weekly live test</Link>.
        </p>

        {c.groups.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
            No mock tests are listed right now. Each exam page shows its practice as it is added.
          </p>
        ) : (
          <nav aria-label="Jump to a group" className="mt-6 rounded-lg border border-ink-200 bg-white p-4 text-sm">
            {national.length > 0 && (
              <p>
                <span className="font-semibold text-ink-800">National: </span>
                {national.map((g, i) => (
                  <span key={g.key}>
                    {i > 0 && " · "}
                    <a href={`#${anchor(g.key)}`} className="text-saffron-700 hover:underline">
                      {g.label}
                    </a>
                  </span>
                ))}
              </p>
            )}
            {states.length > 0 && (
              <p className="mt-2">
                <span className="font-semibold text-ink-800">States: </span>
                {states.map((g, i) => (
                  <span key={g.key}>
                    {i > 0 && " · "}
                    <a href={`#${anchor(g.key)}`} className="text-saffron-700 hover:underline">
                      {g.label}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </nav>
        )}

        {c.groups.map((g) => {
          const stateHref = g.kind === "state" ? stateExamsHref(g.stateCode) : null;
          return (
            <section key={g.key} id={anchor(g.key)} className="mt-8 scroll-mt-20" aria-labelledby={`${anchor(g.key)}-h`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h2 id={`${anchor(g.key)}-h`} className="text-lg font-semibold text-ink-900">
                  {g.label} <span className="text-xs font-normal text-ink-500">({g.rows.length === 1 ? "1 exam" : `${g.rows.length} exams`})</span>
                </h2>
                {stateHref && (
                  <Link href={stateHref} className="text-xs font-medium text-saffron-700 hover:underline">
                    All {g.label} exams →
                  </Link>
                )}
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {g.rows.map((r) => (
                  <li key={r.code} className="rounded-md border border-ink-200 bg-white p-3">
                    <Link href={examMocksHref(r.code)} prefetch={false} className="text-sm font-semibold text-ink-900 hover:text-saffron-700">
                      {r.shortName} mock tests
                    </Link>
                    {r.name !== r.shortName && <p className="mt-0.5 text-xs text-ink-500 line-clamp-2">{r.name}</p>}
                    <p className="mt-1 text-xs text-ink-600">
                      {r.mocks === 1 ? "1 mock test" : `${fmtCount(r.mocks)} mock tests`} ·{" "}
                      {r.questions === 1 ? "1 question" : `${fmtCount(r.questions)} questions`} · written in {languagesText(r.languages)}
                    </p>
                    <NextExamLine row={r} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {c.groups.length > 0 && (
          <section className="mt-10 rounded-lg border border-ink-200 bg-white p-5" aria-labelledby="mock-tests-faq">
            <h2 id="mock-tests-faq" className="text-base font-semibold text-ink-900">
              {faq.question}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-ink-700">{faq.answer}</p>
          </section>
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
          </ul>
        </nav>
      </section>
    </main>
  );
}
