// /schooling — Schooling section landing.
//
// 26 Sep 2026 (school go-live): the page leads with the two curricula the
// seeded spine holds — CBSE (NCERT textbooks, Class 1-12: every chapter with
// its official PDF, Shishya's own notes and answer-checked practice where
// they exist) and CISCE (ICSE / ISC subjects with the council's syllabus
// PDFs) — with every count computed from the rows through
// src/lib/school/surface.ts (the same read the sitemap uses). Below that,
// the 20 boards with their official links, as before. Indexable.
//
// 25 Sep 2026 (school build, Step 0): the copy said only what was true —
// English-only, 20 boards, no Shishya practice or notes. That rule stands;
// what changed is what exists.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { BOARDS, schoolRobots, type BoardType } from "@/lib/schooling-data";
import { stateInfo } from "@/lib/state-info";
import { HUB_COPY, SCHOOL_SITE } from "@/lib/school/copy";
import { chapterCounts, getLiveSchoolClasses } from "@/lib/school/db";
import { SCHOOL_GUEST_QUIZ_MIN } from "@/lib/school/scope";
import { schoolBoardPath, schoolClassPath, type SchoolSurfaceClass } from "@/lib/school/surface";

// 10 minutes = SCHOOL_REVALIDATE (src/lib/school/scope.ts; Next needs the literal).
export const revalidate = 600;

function totalsOf(classes: SchoolSurfaceClass[]) {
  return classes.reduce(
    (acc, c) => {
      for (const s of c.subjects) {
        const x = chapterCounts(s.chapters, SCHOOL_GUEST_QUIZ_MIN);
        acc.subjects++;
        acc.chapters += x.chapters;
        acc.notes += x.notes;
        acc.practice += x.practice;
      }
      acc.classes++;
      return acc;
    },
    { classes: 0, subjects: 0, chapters: 0, notes: 0, practice: 0 },
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const ncert = totalsOf(await getLiveSchoolClasses("cbse"));
  const title = "Schooling — CBSE / NCERT chapters, CISCE syllabuses, state board links | Shishya";
  const description =
    ncert.chapters > 0
      ? `CBSE (NCERT textbooks) Class 1-12: ${ncert.chapters} chapters listed with their official ncert.nic.in PDFs${ncert.notes > 0 ? `, Shishya's own notes on ${ncert.notes}` : ""}${ncert.practice > 0 ? `, answer-checked practice on ${ncert.practice}` : ""}. CISCE (ICSE / ISC) subjects with the council's own syllabus and curriculum documents. ${BOARDS.length} boards with their official websites, syllabus and sample-paper pages where we link them.`
      : `Indian school boards in one place — CBSE, ICSE, NIOS, IB, Cambridge and state boards. Each board's official website, plus its syllabus and sample-paper pages where we link them. No third-party reposts.`;
  return {
    title,
    description,
    alternates: { canonical: `${SCHOOL_SITE}/schooling` },
    robots: schoolRobots(true),
    keywords: [
      "NCERT chapters",
      "CBSE syllabus",
      "ICSE syllabus",
      "state board syllabus",
      "class 6 maths",
      "class 10 science",
      "class 12 physics",
      "NCERT notes",
      "class 10 sample papers",
      "class 12 sample papers",
      "board exam preparation",
    ],
    openGraph: {
      title: "Schooling on Shishya — NCERT chapters, board syllabuses, official links",
      description,
      url: `${SCHOOL_SITE}/schooling`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
  };
}

interface SP {
  type?: BoardType;
  state?: string;
  class?: string;
}

const TYPE_LABELS: Record<BoardType, string> = {
  "national-public": "National (Govt)",
  "national-private": "National (Private)",
  state: "State board",
  international: "International",
};

export default async function SchoolingLanding({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const type = sp.type;
  const state = sp.state?.toUpperCase();
  const klass = sp.class ? parseInt(sp.class, 10) : undefined;

  const [ncertClasses, cisceClasses] = await Promise.all([getLiveSchoolClasses("cbse"), getLiveSchoolClasses("icse-cisce")]);
  const ncert = totalsOf(ncertClasses);
  const cisce = totalsOf(cisceClasses);

  const filtered = BOARDS.filter((b) => {
    if (type && b.type !== type) return false;
    if (state && b.state && b.state !== state) return false;
    if (klass !== undefined && !b.classes.includes(klass)) return false;
    return true;
  });

  function chipHref(patch: Partial<SP>) {
    const next = new URLSearchParams();
    const merged: SP = { type, state, class: klass ? String(klass) : undefined, ...patch };
    if (merged.type) next.set("type", merged.type);
    if (merged.state) next.set("state", merged.state);
    if (merged.class) next.set("class", merged.class);
    const qs = next.toString();
    return qs ? `/schooling?${qs}` : "/schooling";
  }

  const typeCounts: Record<string, number> = {};
  for (const b of BOARDS) typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1;
  const statesWithStateBoard = Array.from(new Set(BOARDS.filter((b) => b.state).map((b) => b.state!)));

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Indian school boards on Shishya",
    numberOfItems: filtered.length,
    itemListElement: filtered.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SCHOOL_SITE}${schoolBoardPath(b.slug)}`,
      name: b.shortName,
    })),
  };
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Schooling on Shishya",
    description: HUB_COPY.lead(ncert),
    url: `${SCHOOL_SITE}/schooling`,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    isPartOf: { "@type": "WebSite", name: "Shishya", url: SCHOOL_SITE },
    publisher: { "@type": "EducationalOrganization", name: "Shishya", url: SCHOOL_SITE },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SCHOOL_SITE },
      { "@type": "ListItem", position: 2, name: "Schooling", item: `${SCHOOL_SITE}/schooling` },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">
            Home
          </Link>{" "}
          · Schooling
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{HUB_COPY.title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">{HUB_COPY.lead(ncert)}</p>

        {/* The two seeded curricula: class chips + computed counts. */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <CurriculumCard
            heading={HUB_COPY.ncertCard}
            href={schoolBoardPath("cbse")}
            line={ncertClasses.length > 0 ? HUB_COPY.ncertCardLine(ncert) : HUB_COPY.noneSeeded}
            boardSlug="cbse"
            classes={ncertClasses}
          />
          <CurriculumCard
            heading={HUB_COPY.cisceCard}
            href={schoolBoardPath("icse-cisce")}
            line={cisceClasses.length > 0 ? HUB_COPY.cisceCardLine(cisce.classes, cisce.subjects) : HUB_COPY.noneSeeded}
            boardSlug="icse-cisce"
            classes={cisceClasses}
          />
        </div>

        {/* Stream selection CTA — the most consequential Class 10 decision */}
        <div className="mt-6 rounded-lg border border-saffron-300 bg-saffron-50/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">Class 10 student? Read this first</p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">Stream Selection — Science vs Commerce vs Humanities</h2>
              <p className="mt-1 text-xs text-ink-700">
                The single most consequential decision in your school years. Honest guide to what each stream opens + closes, who should pick it, and
                the myths to ignore.
              </p>
            </div>
            <Link href="/schooling/streams" className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600">
              Stream selection guide →
            </Link>
          </div>
        </div>

        <h2 className="mt-10 text-base font-semibold text-ink-900">{HUB_COPY.boardsHeading}</h2>

        {/* Type filter */}
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By board type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ type: undefined })} className={chipClass(!type)}>
              All types
            </Link>
            {(Object.keys(TYPE_LABELS) as BoardType[]).map((t) => {
              const n = typeCounts[t] ?? 0;
              if (n === 0) return null;
              return (
                <Link key={t} href={chipHref({ type: type === t ? undefined : t })} className={chipClass(type === t)}>
                  {TYPE_LABELS[t]} <span className="ml-1 text-[10px] opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Class filter */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By class</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ class: undefined })} className={chipClass(!klass)}>
              All classes
            </Link>
            {[10, 12, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((c) => (
              <Link key={c} href={chipHref({ class: klass === c ? undefined : String(c) })} className={chipClass(klass === c)}>
                Class {c}
              </Link>
            ))}
          </div>
        </div>

        {/* State filter — state boards only */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By state (state-board coverage)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ state: undefined })} className={chipClass(!state)}>
              All India
            </Link>
            {statesWithStateBoard.map((c) => (
              <Link key={c} href={chipHref({ state: state === c ? undefined : c })} className={chipClass(state === c)} title={stateInfo(c)?.nativeName}>
                {stateInfo(c)?.name ?? c}
              </Link>
            ))}
          </div>
        </div>

        {/* Result list */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center">
            <p className="text-sm text-ink-700">
              No boards match these filters.{" "}
              <Link href="/schooling" className="text-saffron-700 underline">
                Clear all
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {filtered.map((b) => (
              <li key={b.slug}>
                <Link
                  href={schoolBoardPath(b.slug)}
                  className="block rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink-900">{b.shortName}</h3>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">{TYPE_LABELS[b.type]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">{b.name}</p>
                  {b.state && (
                    <p className="mt-1 text-[11px] text-ink-500">
                      {stateInfo(b.state)?.name ?? b.state} · Classes {b.classes[0]}–{b.classes[b.classes.length - 1]}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-ink-700 line-clamp-2">{b.blurb}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* What is on these pages today — computed, never typed. */}
        <div className="mt-12 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">{HUB_COPY.todayHeading}</h3>
          <p className="mt-2">{HUB_COPY.today(ncert)}</p>
          <p className="mt-2 text-[11px] text-ink-500">
            Past Class 12? See{" "}
            <Link href="/" className="text-saffron-700 underline">
              Entrance &amp; Government Exams
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}

function CurriculumCard({ heading, href, line, boardSlug, classes }: { heading: string; href: string; line: string; boardSlug: string; classes: SchoolSurfaceClass[] }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-5">
      <Link href={href} className="text-base font-semibold text-ink-900 hover:text-saffron-800">
        {heading} →
      </Link>
      <p className="mt-1 text-xs text-ink-600">{line}</p>
      {classes.length > 0 && (
        <>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{HUB_COPY.pickClass}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {classes.map((c) => (
              <Link
                key={c.examCode}
                href={schoolClassPath(boardSlug, c.cls)}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
              >
                Class {c.cls}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function chipClass(active: boolean): string {
  return active
    ? "inline-flex items-center rounded-full bg-saffron-500 px-3 py-1 text-xs font-medium text-white shadow-sm"
    : "inline-flex items-center rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30";
}
