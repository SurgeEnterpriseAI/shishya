// /for/[persona] — curated landing per student-intent.
//
// Each persona maps to:
//   - Hero (label, blurb, description)
//   - 3-5 curated exam cards (rich — name, category, "why this for you")
//   - 2-3 curated insight article links
//   - Step-by-step next-steps bullets
//   - Sign-up CTA
//
// All pages are statically generated via generateStaticParams so the
// list is enumerable + crawlable; revalidate after a day so any DB
// changes to exam meta flow through.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { LiveCountersStrip } from "@/components/LiveCounters";
import { PERSONAS, findPersona } from "@/data/personas";
import { findArticle } from "@/data/insights-articles";
import { prisma } from "@/lib/db/prisma";
import { unstable_cache } from "next/cache";

export const revalidate = 86_400; // 24h

export async function generateStaticParams() {
  return PERSONAS.map((p) => ({ persona: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ persona: string }>;
}): Promise<Metadata> {
  const { persona: slug } = await params;
  const persona = findPersona(slug);
  if (!persona) return { title: "Not found — Shishya" };
  return {
    title: `${persona.pageTitle} | Shishya`,
    description: persona.description,
    alternates: { canonical: `https://shishya.in/for/${persona.slug}` },
    keywords: [
      persona.label,
      persona.pageTitle,
      "indian student preparation",
      "free exam prep india",
      "Shishya",
    ],
    openGraph: {
      title: persona.pageTitle,
      description: persona.blurb,
      url: `https://shishya.in/for/${persona.slug}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
  };
}

interface ExamCardData {
  code: string;
  shortName: string;
  name: string;
  category: string;
}

// Load exam meta for a list of codes in one query. Cached so the
// persona pages stay fast on repeated visits.
const loadExams = unstable_cache(
  async (codes: string[]): Promise<ExamCardData[]> => {
    if (codes.length === 0) return [];
    try {
      const rows = await prisma.exam.findMany({
        where: { code: { in: codes }, active: true },
        select: { code: true, shortName: true, name: true, category: true },
      });
      // Cast category enum → string for the card render, then preserve
      // the order from the persona's examCodes array.
      const byCode = new Map<string, ExamCardData>(
        rows.map((r) => [
          r.code,
          { code: r.code, shortName: r.shortName, name: r.name, category: String(r.category) },
        ]),
      );
      return codes
        .map((c) => byCode.get(c))
        .filter((r): r is ExamCardData => Boolean(r));
    } catch {
      return [];
    }
  },
  ["persona-exam-meta-v1"],
  { revalidate: 300, tags: ["exams"] },
);

export default async function PersonaPage({
  params,
}: {
  params: Promise<{ persona: string }>;
}) {
  const { persona: slug } = await params;
  const persona = findPersona(slug);
  if (!persona) notFound();

  const [exams] = await Promise.all([loadExams(persona.examCodes)]);
  const articles = persona.articleSlugs
    .map((s) => findArticle(s))
    .filter((a): a is NonNullable<ReturnType<typeof findArticle>> => Boolean(a));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      {
        "@type": "ListItem",
        position: 2,
        name: persona.label,
        item: `https://shishya.in/for/${persona.slug}`,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />

      <LiveCountersStrip
        labels={{
          preparingNow: "preparing now",
          inMockNow: "in a mock right now",
          activeDiscussions: "live discussions",
          totalEver: "helped till now",
        }}
      />

      <section className="container-prose pt-10 pb-16 sm:pt-14">
        {/* Breadcrumb */}
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">
            Home
          </Link>{" "}
          · {persona.label}
        </p>

        {/* Hero */}
        <div className="mt-3 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-saffron-500 text-xl font-bold text-white">
            {persona.badge}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
              {persona.pageTitle}
            </h1>
            <p className="mt-2 text-sm text-ink-700 sm:text-base">{persona.description}</p>
          </div>
        </div>

        {/* Pinned exams */}
        {exams.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">
              Exams matched to your stage
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              These are the {exams.length} exams most relevant to you right now. Pick one to
              start, the rest can come later.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {exams.map((e) => (
                <li key={e.code}>
                  <Link
                    href={`/exams/${e.code}`}
                    className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                      {e.category.replace(/_/g, " ")}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-ink-900">{e.shortName}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-600">{e.name}</p>
                    <p className="mt-3 text-xs font-medium text-saffron-700">Open exam →</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Next steps */}
        {persona.nextSteps.length > 0 && (
          <>
            <h2 className="mt-12 text-base font-semibold text-ink-900">
              Your next steps
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              Honest, concrete actions — what to actually do this week and this month.
            </p>
            <ol className="mt-4 space-y-3">
              {persona.nextSteps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-md border border-ink-200 bg-white p-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-xs font-bold text-saffron-800">
                    {i + 1}
                  </span>
                  <p className="text-sm text-ink-800">{step}</p>
                </li>
              ))}
            </ol>
          </>
        )}

        {/* Pinned reading */}
        {articles.length > 0 && (
          <>
            <h2 className="mt-12 text-base font-semibold text-ink-900">
              Read these before you start
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              Honest essays + sourced data — the context most coaching sites won&apos;t give you.
            </p>
            <ul className="mt-4 space-y-3">
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/insights/${a.slug}`}
                    className="block rounded-md border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <h3 className="text-sm font-semibold text-ink-900">{a.title}</h3>
                    <p className="mt-1 text-xs text-ink-600 line-clamp-2">{a.dek}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-wider text-saffron-700">
                      {a.readMins} min read →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Sign-up CTA */}
        <div className="mt-14 rounded-xl border border-saffron-300 bg-saffron-50/60 p-6 text-center">
          <h3 className="text-lg font-semibold text-ink-900">
            Start preparing — free, no credit card
          </h3>
          <p className="mt-2 text-sm text-ink-700">
            Pin your target exam, take a diagnostic mock, see where you stand. Shishya is free
            because we&apos;re funded by Surge Enterprise AI&apos;s separate consulting business
            — not by you.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login?callbackUrl=/onboarding"
              className="btn-primary inline-block !py-2 !px-5 text-sm"
            >
              Sign up to start →
            </Link>
            <Link
              href="/exams"
              className="rounded-md border border-ink-300 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Browse all exams instead
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
