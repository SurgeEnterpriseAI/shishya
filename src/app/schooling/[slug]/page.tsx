// /schooling/[slug] — per-board landing page.
//
// SEO target: "CBSE Class 10 syllabus", "ICSE sample papers", "UP Board
// 2026 exam date", "Karnataka PUC syllabus", etc. — head-of-funnel
// queries for every Indian school student.
//
// 25 Sep 2026 (school build, Step 0): noindex (SCHOOLING_ROBOTS) until the
// school section has checked content. Dropped the untrue bits: "refreshed
// every 90 days" (no job refreshes these facts), "160+ exams / all state
// CETs", "scholarships tied to {board} students", and the feature roadmap.
// A verification badge now shows only when its Fact row is about the URL
// we actually link (the CBSE / CISCE URLs changed that day; their Fact rows
// still hold the old, dead ones until seed-facts is re-run).

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { BOARDS, findBoard, boardLinkCopy, CLASS_11_12_STREAMS, SCHOOLING_ROBOTS } from "@/lib/schooling-data";
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
  if (!b) return { title: "Board not found — Shishya", robots: SCHOOLING_ROBOTS };
  const st = b.state ? stateInfo(b.state) : null;
  const year = new Date().getUTCFullYear();

  // 26 Sep 2026: named only the links this board's page has (boardLinkCopy);
  // it promised syllabus + sample-paper links on all 20 boards.
  const copy = boardLinkCopy(b);
  const title = `${b.shortName} — ${copy.title} | Shishya`;
  const description =
    `${b.name}${st ? ` (${st.name})` : ""}. Class ${b.classes[0]}–${b.classes[b.classes.length - 1]}. Links to ${copy.phrase}.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/schooling/${b.slug}` },
    robots: SCHOOLING_ROBOTS,
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
  // A Fact vouches for one URL; hide it when we now link a different one.
  const factFor = (key: string, url: string | undefined) => {
    const f = factMap[key];
    return f && url && f.claimValue === url ? f : null;
  };
  const websiteFact  = factFor("official-website", b.websiteUrl);
  const syllabusFact = factFor("syllabus-url", b.syllabusUrl);
  const samplesFact  = factFor("sample-paper-url", b.samplePaperUrl);
  const perClassSamples = Object.entries(b.samplePapersByClass ?? {}).filter(
    (e): e is [string, string] => typeof e[1] === "string",
  );

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
            {perClassSamples.map(([cls, url]) => (
              <a
                key={cls}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
              >
                Class {cls} sample papers ↗
              </a>
            ))}
            {b.samplePaperUrl && perClassSamples.length === 0 && (
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
            <Link
              key={c}
              href={`/schooling/${b.slug}/class-${c}`}
              className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
            >
              Class {c} →
            </Link>
          ))}
        </div>

        {/* Class 11-12 streams (where applicable). 26 Sep 2026: Indian
            boards only (IB / Cambridge have no Science / Commerce /
            Humanities streams), and no "curriculum page" the board page
            may not link. */}
        {b.type !== "international" && (b.classes.includes(11) || b.classes.includes(12)) && (
          <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-900">
              Class 11–12 streams
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              The typical higher-secondary stream choices at this stage.
              Check {b.shortName}&apos;s own site for the exact subject lists.
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

        {/* What's coming (25 Sep 2026: the decided next step only).
            26 Sep 2026: outside CBSE it no longer reads as if this board's
            notes were next; the decided order starts with NCERT. */}
        <div className="mt-8 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">Coming soon</p>
          {b.slug === "cbse" ? (
            <p className="mt-2">
              Chapter-wise notes and practice questions written by Shishya,
              starting with NCERT Maths and Science. Until they are ready, the
              links above go straight to the board&apos;s own pages.
            </p>
          ) : (
            <p className="mt-2">
              Shishya&apos;s own chapter-wise notes and practice questions
              start with NCERT (CBSE) Maths and Science. There is nothing for{" "}
              {b.shortName} here yet; the links above go straight to the
              board&apos;s own pages.
            </p>
          )}
        </div>

        {/* Cross-link to exams + scholarships */}
        <div className="mt-8 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">Beyond Class 12</h3>
          <p className="mt-2">
            Once you&apos;re past Class 12, our{" "}
            <Link href="/" className="text-saffron-700 underline">
              Entrance &amp; Government Exams
            </Link>{" "}
            section covers entrance and government exams such as JEE, NEET
            and CUET, with free mock tests. Scholarships for students are
            listed under{" "}
            <Link href="/scholarships" className="text-saffron-700 underline">
              Scholarships
            </Link>
            .
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
      communityCount={props.communityCount}
      trustedVerifierCount={props.trustedVerifierCount}
      domainExpertCount={props.domainExpertCount}
      flagCount={props.flagCount}
    />
  );
}
