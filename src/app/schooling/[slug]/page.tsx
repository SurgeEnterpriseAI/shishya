// /schooling/[slug] — per-board landing page.
//
// SEO target: "CBSE Class 10 syllabus", "ICSE sample papers", "UP Board
// 2026 exam date", "Karnataka PUC syllabus", etc. — head-of-funnel
// queries for every Indian school student.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { BOARDS, findBoard, CLASS_11_12_STREAMS } from "@/lib/schooling-data";
import { stateInfo } from "@/lib/state-info";
import { SectionVerificationSummary, VerificationBadge } from "@/components/VerificationBadge";
import { ClickableVerificationBadge } from "@/components/ClickableVerificationBadge";
import { getFactMap, factToBadgeProps } from "@/lib/db/facts";
import { auth } from "@/lib/auth";

export async function generateStaticParams() {
  return BOARDS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = findBoard(slug);
  if (!b) return { title: "Board not found — Shishya" };
  const st = b.state ? stateInfo(b.state) : null;
  const year = new Date().getUTCFullYear();

  const title = `${b.shortName} — Syllabus, Sample Papers, Board Exam Info ${year} | Shishya`;
  const description =
    `${b.name}${st ? ` (${st.name})` : ""}. Class ${b.classes[0]}–${b.classes[b.classes.length - 1]}. Official syllabus + sample papers + board exam guidance. Free, sourced.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/schooling/${b.slug}` },
    keywords: [
      b.name,
      b.shortName,
      `${b.shortName} syllabus`,
      `${b.shortName} sample papers`,
      `${b.shortName} class 10`,
      `${b.shortName} class 12`,
      `${b.shortName} ${year}`,
      `${b.shortName} board exam`,
      ...(st ? [`${st.name} board`, `${st.name} education board`] : []),
    ],
    openGraph: {
      title,
      description,
      url: `https://shishya.in/schooling/${b.slug}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const b = findBoard(slug);
  if (!b) notFound();
  const st = b.state ? stateInfo(b.state) : null;
  const year = new Date().getUTCFullYear();

  const factMap = await getFactMap(`/schooling/${slug}`).catch(() => ({} as Record<string, any>));
  const websiteFact  = factMap["official-website"];
  const syllabusFact = factMap["syllabus-url"];
  const samplesFact  = factMap["sample-paper-url"];

  const session = await auth().catch(() => null);
  const signedIn = Boolean(session?.user);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Schooling", item: "https://shishya.in/schooling" },
      { "@type": "ListItem", position: 3, name: b.shortName, item: `https://shishya.in/schooling/${b.slug}` },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/schooling" className="hover:text-ink-800">Schooling</Link> · {b.shortName}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{b.shortName}</h1>
        <p className="mt-1 text-sm text-ink-600">{b.name}</p>
        {st && (
          <p className="mt-1 text-xs text-ink-500">
            {st.name} · {st.nativeName}
          </p>
        )}

        <p className="mt-4 max-w-3xl text-sm text-ink-700">{b.blurb}</p>

        <SectionVerificationSummary
          status="ai"
          source={`${b.shortName} official website`}
          refreshCadence="every 90 days (board syllabi update annually)"
        />

        {/* Official links */}
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-base font-semibold text-ink-900">Official resources</h2>
          <p className="mt-1 text-xs text-ink-500">
            Always check the board's own site for current syllabus and sample
            papers — these change cycle to cycle and Shishya intentionally
            doesn't cache them as static facts.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1">
              <a
                href={b.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
              >
                Board website ↗
              </a>
              <FactBadge fact={websiteFact} signedIn={signedIn} compact />
            </span>
            {b.syllabusUrl && (
              <span className="inline-flex items-center gap-1">
                <a
                  href={b.syllabusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
                >
                  Syllabus / Curriculum ↗
                </a>
                <FactBadge fact={syllabusFact} signedIn={signedIn} compact />
              </span>
            )}
            {b.samplePaperUrl && (
              <span className="inline-flex items-center gap-1">
                <a
                  href={b.samplePaperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
                >
                  Sample papers ↗
                </a>
                <FactBadge fact={samplesFact} signedIn={signedIn} compact />
              </span>
            )}
          </div>
        </div>

        {/* Classes covered */}
        <h2 className="mt-8 text-base font-semibold text-ink-900">Classes covered</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {b.classes.map((c) => (
            <span
              key={c}
              className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700"
            >
              Class {c}
            </span>
          ))}
        </div>

        {/* Class 11-12 streams (where applicable) */}
        {(b.classes.includes(11) || b.classes.includes(12)) && (
          <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-900">
              Class 11–12 streams
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              The typical higher-secondary stream choices at this stage.
              Check {b.shortName} curriculum page for the exact subject lists.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {Object.entries(CLASS_11_12_STREAMS).map(([k, s]) => (
                <div key={k} className="rounded-md border border-ink-100 bg-ink-50/30 p-3">
                  <p className="text-xs font-semibold text-ink-800">{s.label}</p>
                  <p className="mt-1 text-[11px] text-ink-600">
                    {s.subjects.slice(0, 6).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What's coming */}
        <div className="mt-8 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">What's still to come on this page</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Subject-wise chapter summaries, formulas and mastery quizzes for Class 9–12</li>
            <li>Board exam preparation hub for Class 10 + Class 12 with a personalised study planner</li>
            <li>Last 10 years' question papers from the board's archive (linked)</li>
            <li>Cross-links to scholarships tied to {b.shortName} students</li>
          </ul>
        </div>

        {/* Cross-link to exams + scholarships */}
        <div className="mt-8 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">Beyond Class 12</h3>
          <p className="mt-2">
            Once you're past Class 12, our{" "}
            <Link href="/exams" className="text-saffron-700 underline">
              Entrance &amp; Government Exams
            </Link>{" "}
            section covers JEE, NEET, CUET, all state CETs, plus 160+ other
            entrance and government exams. Free adaptive mock tests + AI tutor.
            Scholarships tied to {b.shortName} students are aggregated in our{" "}
            <Link href="/scholarships" className="text-saffron-700 underline">
              Scholarships
            </Link>{" "}
            database.
          </p>
        </div>

        {/* Other boards */}
        <div className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Other boards</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BOARDS.filter((other) => other.slug !== b.slug)
              .slice(0, 12)
              .map((other) => (
                <Link
                  key={other.slug}
                  href={`/schooling/${other.slug}`}
                  className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  {other.shortName}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function FactBadge({
  fact,
  signedIn,
  compact,
}: {
  fact: any | null | undefined;
  signedIn: boolean;
  compact?: boolean;
}) {
  const props = factToBadgeProps(fact);
  if (!fact) {
    return <VerificationBadge {...props} compact={compact} />;
  }
  return (
    <ClickableVerificationBadge
      factId={fact.id}
      status={props.status}
      source={props.source}
      sourceUrl={props.sourceUrl}
      lastCheckedAt={props.lastCheckedAt}
      signedIn={signedIn}
      compact={compact}
    />
  );
}
