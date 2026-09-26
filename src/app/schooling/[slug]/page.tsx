// /schooling/[slug] — per-board landing page.
//
// 26 Sep 2026 (school go-live): a board whose classes are seeded (CBSE →
// the NCERT_Cnn containers, CISCE → CISCE_Cnn; src/lib/school/surface.ts)
// lists every seeded class with counts computed from the rows — subjects,
// chapters, how many chapters have Shishya's notes and how many have
// checked practice — and a "today" line built from the same numbers. The
// page is indexable when it holds more than the board's website link
// (syllabus / sample-paper pages, or a seeded class tree). Every other
// board keeps its 25 Sep form: the official links it has, and one honest
// line that Shishya's own chapter content is NCERT-only so far.
//
// 25 Sep 2026 (school build, Step 0): dropped "refreshed every 90 days",
// "160+ exams", the scholarships claim and the feature roadmap. A
// verification badge shows only when its Fact row is about the URL we
// actually link.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { OfficialLink, SchoolCrumbs } from "@/components/school/SchoolBits";
import { BOARDS, findBoard, boardLinkCopy, CLASS_11_12_STREAMS, SCHOOLING_ROBOTS, isSchoolBoardIndexable, schoolRobots } from "@/lib/schooling-data";
import { stateInfo } from "@/lib/state-info";
import { SectionVerificationSummary, VerificationBadge } from "@/components/VerificationBadge";
import { ClickableVerificationBadge } from "@/components/ClickableVerificationBadge";
import { getFactMap, factToBadgeProps } from "@/lib/db/facts";
import { auth } from "@/lib/auth";
import { cisceSubjectsWithPdf } from "@/lib/school/books";
import { BOARD_COPY, SCHOOL_SITE, oursTitleBit } from "@/lib/school/copy";
import { chapterCounts, getLiveSchoolClasses } from "@/lib/school/db";
import { SCHOOL_GUEST_QUIZ_MIN } from "@/lib/school/scope";
import { SCHOOL_BOARDS, schoolBoardPath, schoolClassPath, type SchoolSurfaceClass } from "@/lib/school/surface";

export async function generateStaticParams() {
  return BOARDS.map((b) => ({ slug: b.slug }));
}

/** A board with a seeded class tree (CBSE / CISCE). */
function isSchoolBoard(slug: string): boolean {
  return SCHOOL_BOARDS.some((b) => b.slug === slug);
}

interface BoardTotals {
  classes: number;
  subjects: number;
  chapters: number;
  notes: number;
  practice: number;
}

/** Totals over the seeded classes of a board — computed, never typed. */
function boardTotals(classes: SchoolSurfaceClass[]): BoardTotals {
  return classes.map(classLine).reduce<BoardTotals>(
    (acc, x) => ({ classes: acc.classes + 1, subjects: acc.subjects + x.subjects, chapters: acc.chapters + x.chapters, notes: acc.notes + x.notes, practice: acc.practice + x.practice }),
    { classes: 0, subjects: 0, chapters: 0, notes: 0, practice: 0 },
  );
}

/** CISCE (26 Sep 2026, integrator): the classes whose subjects have their
 *  own syllabus PDFs on cisce.org (ICSE / ISC) vs the ones under a single
 *  stage curriculum document (Classes 1-8) — from the spine, never typed. */
function cisceTotals(live: SchoolSurfaceClass[], totals: BoardTotals) {
  return {
    classes: totals.classes,
    subjects: totals.subjects,
    classesWithSubjectPdfs: live.filter((c) => cisceSubjectsWithPdf(c.cls, c.subjects.map((s) => s.name)) > 0).length,
  };
}

function classLine(c: SchoolSurfaceClass) {
  const counts = c.subjects.reduce(
    (acc, s) => {
      const x = chapterCounts(s.chapters, SCHOOL_GUEST_QUIZ_MIN);
      return { subjects: acc.subjects + 1, chapters: acc.chapters + x.chapters, notes: acc.notes + x.notes, practice: acc.practice + x.practice };
    },
    { subjects: 0, chapters: 0, notes: 0, practice: 0 },
  );
  return counts;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = findBoard(slug);
  if (!b) return { title: "Board not found — Shishya", robots: SCHOOLING_ROBOTS };
  const st = b.state ? stateInfo(b.state) : null;
  const year = new Date().getUTCFullYear();
  const copy = boardLinkCopy(b);
  const live = isSchoolBoard(slug) ? await getLiveSchoolClasses(slug) : [];
  const totals = boardTotals(live);
  // 26 Sep 2026: the title names what the page has — the seeded class tree
  // where there is one, else only the links this board's page holds. The
  // notes / practice tail is the computed count (integrator: "with notes and
  // practice" over a tree where 5 of 1,146 chapters have them was a claim).
  const title =
    live.length > 0
      ? slug === "cbse"
        ? `CBSE — NCERT textbooks and chapters, Class ${live[0].cls} to ${live[live.length - 1].cls}${oursTitleBit(totals)} | Shishya`
        : `${b.shortName} — subjects and official CISCE documents, Class ${live[0].cls} to ${live[live.length - 1].cls} | Shishya`
      : `${b.shortName} — ${copy.title} | Shishya`;
  const description =
    live.length > 0
      ? slug === "cbse"
        ? `CBSE prescribes NCERT textbooks. ${totals.classes} classes on Shishya: ${totals.chapters} chapters listed with their official NCERT PDFs${totals.notes > 0 ? `, Shishya's own notes on ${totals.notes}` : ""}${totals.practice > 0 ? `, answer-checked practice on ${totals.practice}` : ""}. Plus CBSE's official syllabus and sample-paper pages.`
        : `${b.name}. ${BOARD_COPY.todayCisce(cisceTotals(live, totals))} Plus the council's specimen-paper pages.`
      : `${b.name}${st ? ` (${st.name})` : ""}. Class ${b.classes[0]}–${b.classes[b.classes.length - 1]}. Links to ${copy.phrase}.`;
  return {
    title,
    description,
    alternates: { canonical: `${SCHOOL_SITE}${schoolBoardPath(b.slug)}` },
    // The sitemap lists this page by the same rule (src/lib/school/landings.ts).
    robots: schoolRobots(isSchoolBoardIndexable(b, live.length)),
    keywords: [
      b.name,
      b.shortName,
      `${b.shortName} syllabus`,
      `${b.shortName} class 10`,
      `${b.shortName} class 12`,
      `${b.shortName} ${year}`,
      `${b.shortName} board exam`,
      ...(slug === "cbse" ? ["NCERT textbooks", "NCERT chapters"] : []),
      ...(st ? [`${st.name} board`, `${st.name} education board`] : []),
    ],
    openGraph: { title, description, url: `${SCHOOL_SITE}${schoolBoardPath(b.slug)}`, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default async function BoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = findBoard(slug);
  if (!b) notFound();
  const st = b.state ? stateInfo(b.state) : null;
  const live = isSchoolBoard(slug) ? await getLiveSchoolClasses(slug) : [];
  const liveByClass = new Map(live.map((c) => [c.cls, c]));
  const totals = boardTotals(live);

  const factMap = await getFactMap(`/schooling/${slug}`).catch(() => ({}) as Record<string, any>);
  // A Fact vouches for one URL; hide it when we now link a different one.
  const factFor = (key: string, url: string | undefined) => {
    const f = factMap[key];
    return f && url && f.claimValue === url ? f : null;
  };
  const websiteFact = factFor("official-website", b.websiteUrl);
  const syllabusFact = factFor("syllabus-url", b.syllabusUrl);
  const samplesFact = factFor("sample-paper-url", b.samplePaperUrl);
  const perClassSamples = Object.entries(b.samplePapersByClass ?? {}).filter((e): e is [string, string] => typeof e[1] === "string");

  const session = await auth().catch(() => null);
  const signedIn = Boolean(session?.user);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SCHOOL_SITE },
      { "@type": "ListItem", position: 2, name: "Schooling", item: `${SCHOOL_SITE}/schooling` },
      { "@type": "ListItem", position: 3, name: b.shortName, item: `${SCHOOL_SITE}${schoolBoardPath(b.slug)}` },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <SchoolCrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Schooling", href: "/schooling" }, { label: b.shortName }]} />
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{b.shortName}</h1>
        <p className="mt-1 text-sm text-ink-600">{b.name}</p>
        {st && (
          <p className="mt-1 text-xs text-ink-500">
            {st.name} · {st.nativeName}
          </p>
        )}

        <p className="mt-4 max-w-3xl text-sm text-ink-700">{b.blurb}</p>

        <SectionVerificationSummary status="ai" source={`${b.shortName} official website`} />

        {/* Official links */}
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-base font-semibold text-ink-900">Official resources</h2>
          <p className="mt-1 text-xs text-ink-500">
            Always check the board&apos;s own site for current syllabus and sample papers — these change cycle to cycle and Shishya intentionally
            doesn&apos;t cache them as static facts.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1">
              <OfficialLink href={b.websiteUrl} primary>
                Board website ↗
              </OfficialLink>
              <FactBadge fact={websiteFact} signedIn={signedIn} compact />
            </span>
            {b.syllabusUrl && (
              <span className="inline-flex items-center gap-1">
                <OfficialLink href={b.syllabusUrl}>Syllabus / Curriculum ↗</OfficialLink>
                <FactBadge fact={syllabusFact} signedIn={signedIn} compact />
              </span>
            )}
            {perClassSamples.map(([cls, url]) => (
              <OfficialLink key={cls} href={url}>
                Class {cls} sample papers ↗
              </OfficialLink>
            ))}
            {b.samplePaperUrl && perClassSamples.length === 0 && (
              <span className="inline-flex items-center gap-1">
                <OfficialLink href={b.samplePaperUrl}>Sample papers ↗</OfficialLink>
                <FactBadge fact={samplesFact} signedIn={signedIn} compact />
              </span>
            )}
          </div>
        </div>

        {/* Classes: seeded classes as cards with computed counts; the rest as chips. */}
        <h2 className="mt-8 text-base font-semibold text-ink-900">{BOARD_COPY.classesHeading}</h2>
        {live.length > 0 ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {b.classes.map((c) => {
              const lc = liveByClass.get(c);
              return (
                <li key={c}>
                  <Link
                    href={schoolClassPath(b.slug, c)}
                    className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <p className="text-sm font-semibold text-ink-900">Class {c} →</p>
                    <p className="mt-1 text-[11px] text-ink-600">{lc ? BOARD_COPY.classLine(classLine(lc)) : "Official links only"}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {b.classes.map((c) => (
              <Link
                key={c}
                href={schoolClassPath(b.slug, c)}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
              >
                Class {c} →
              </Link>
            ))}
          </div>
        )}

        {/* Class 11-12 streams (Indian boards only; IB / Cambridge have no
            Science / Commerce / Humanities streams). */}
        {b.type !== "international" && (b.classes.includes(11) || b.classes.includes(12)) && (
          <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5">
            <h2 className="text-base font-semibold text-ink-900">Class 11–12 streams</h2>
            <p className="mt-1 text-xs text-ink-500">
              The typical higher-secondary stream choices at this stage. Check {b.shortName}&apos;s own site for the exact subject lists.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {Object.entries(CLASS_11_12_STREAMS).map(([k, s]) => (
                <div key={k} className="rounded-md border border-ink-100 bg-ink-50/30 p-3">
                  <p className="text-xs font-semibold text-ink-800">{s.label}</p>
                  <p className="mt-1 text-[11px] text-ink-600">{s.subjects.slice(0, 6).join(" · ")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What is on Shishya for this board today — computed, never typed. */}
        <div className="mt-8 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">On Shishya today</p>
          <p className="mt-2">
            {live.length > 0
              ? slug === "cbse"
                ? BOARD_COPY.todayNcert(totals)
                : BOARD_COPY.todayCisce(cisceTotals(live, totals))
              : BOARD_COPY.otherBoardStatus(b.shortName)}
          </p>
        </div>

        {/* Cross-link to exams + scholarships */}
        <div className="mt-8 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">Beyond Class 12</h3>
          <p className="mt-2">
            Once you&apos;re past Class 12, our{" "}
            <Link href="/" className="text-saffron-700 underline">
              Entrance &amp; Government Exams
            </Link>{" "}
            section covers entrance and government exams such as JEE, NEET and CUET, with free mock tests. Scholarships for students are listed under{" "}
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
                  href={schoolBoardPath(other.slug)}
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

function FactBadge({ fact, signedIn, compact }: { fact: any | null | undefined; signedIn: boolean; compact?: boolean }) {
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
