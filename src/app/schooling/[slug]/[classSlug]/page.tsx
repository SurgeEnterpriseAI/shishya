// /schooling/[board]/class-[n] — per-class landing page.
//
// Renders the subject tiles for the (board, class) slots that
// schooling-subjects.ts has (CBSE 6-12, ICSE / ISC 10-12) and an honest
// "coming soon, here's the official source" stub for every other class.
//
// Per the Phase 0 audit decision, each (board, class) maps onto an
// Exam row with category=SCHOOL_BOARD later on — for now the route
// reads the hardcoded syllabus data and renders.
//
// 25 Sep 2026 (school build, Step 0): noindex (SCHOOLING_ROBOTS). The
// "official source" link was textbook.php?fec1={n}-12, a code no NCERT book
// has; it now comes from officialClassSource(). Removed what wasn't true:
// "free practice, study help, chapter notes sourced from NCERT" (none
// exists), "Ask Shishya scoped to the chapter" (the tutor has no chapter
// scope), "10-20 practice questions drawn from official sources" (Shishya
// writes its own questions; it never copies textbook exercises), the
// "typically February–March, papers ~2 months before" exam claims, and the
// Class 10/12-first rollout note (CBSE 6-12 all have subject pages).

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { findBoard, boardExamPapersFor, SCHOOLING_ROBOTS, type Board } from "@/lib/schooling-data";
import {
  findClassSyllabus,
  mainBooks,
  officialClassSource,
  SCHOOL_SOURCES_CHECKED_ON,
  type SchoolSubject,
} from "@/lib/schooling-subjects";
import { stateInfo } from "@/lib/state-info";

// Parse the "class-N" segment into a number. The folder used to be
// `class-[n]` which Next.js App Router accepts as a literal-match folder
// name but does NOT extract `n` as a param — so every class page 404'd.
// We use `[classSlug]` now and split the prefix here. URLs stay the same
// (/schooling/cbse/class-10) — only the routing wiring changed.
function parseClassSlug(classSlug: string): number {
  if (!classSlug.startsWith("class-")) return NaN;
  return parseInt(classSlug.slice("class-".length), 10);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; classSlug: string }>;
}): Promise<Metadata> {
  const { slug, classSlug } = await params;
  const board = findBoard(slug);
  const classNum = parseClassSlug(classSlug);
  if (!board || Number.isNaN(classNum) || !board.classes.includes(classNum)) {
    return { title: "Not found — Shishya", robots: SCHOOLING_ROBOTS };
  }
  const year = new Date().getUTCFullYear();
  const syllabus = findClassSyllabus(slug, classNum);
  // 26 Sep 2026: title / description name what the page has. They said
  // "Subjects and Official Textbooks" and "links to the board's own syllabus
  // pages" for every (board, class), including stubs that link only the
  // board's website.
  const title =
    slug === "cbse" && syllabus
      ? `${board.shortName} Class ${classNum} — Subjects and NCERT Textbooks | Shishya`
      : syllabus
        ? `${board.shortName} Class ${classNum} — Subjects and Official Syllabus Links | Shishya`
        : `${board.shortName} Class ${classNum} — Official Source | Shishya`;
  const withCbseSyllabus = syllabus?.subjects.some((s) => s.syllabusUrl) ?? false;
  const description =
    slug === "cbse" && syllabus
      ? `${board.shortName} Class ${classNum} subjects with links to the official NCERT textbooks${withCbseSyllabus ? " and the CBSE 2026-27 syllabus" : ""}.`
      : syllabus
        ? `${board.shortName} Class ${classNum} subjects, each linking to the board's official regulations and syllabuses.`
        : `${board.shortName} Class ${classNum}: subject pages are not built yet. Official source: ${classStubLink(board, classNum).label}.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/schooling/${slug}/class-${classNum}` },
    robots: SCHOOLING_ROBOTS,
    keywords: [
      `${board.shortName} Class ${classNum} syllabus`,
      `${board.shortName} Class ${classNum} subjects`,
      `${board.shortName} Class ${classNum} ${year}`,
      `Class ${classNum} mathematics`,
      `Class ${classNum} science`,
      `Class ${classNum} sample papers`,
    ],
    openGraph: {
      title,
      description,
      url: `https://shishya.in/schooling/${slug}/class-${classNum}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
  };
}

export default async function ClassPage({
  params,
}: {
  params: Promise<{ slug: string; classSlug: string }>;
}) {
  const { slug, classSlug } = await params;
  const board = findBoard(slug);
  const classNum = parseClassSlug(classSlug);
  if (!board || Number.isNaN(classNum) || !board.classes.includes(classNum)) {
    notFound();
  }
  const st = board.state ? stateInfo(board.state) : null;
  const syllabus = findClassSyllabus(slug, classNum);
  const source = officialClassSource(slug, classNum);
  const hasRealSubjects = !!syllabus && syllabus.subjects.length > 0;
  const examPapers = boardExamPapersFor(board, classNum);
  const showStreams = board.type !== "international" && (classNum === 10 || classNum === 11);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Schooling", item: "https://shishya.in/schooling" },
      { "@type": "ListItem", position: 3, name: board.shortName, item: `https://shishya.in/schooling/${slug}` },
      { "@type": "ListItem", position: 4, name: `Class ${classNum}`, item: `https://shishya.in/schooling/${slug}/class-${classNum}` },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/schooling" className="hover:text-ink-800">Schooling</Link> ·{" "}
          <Link href={`/schooling/${slug}`} className="hover:text-ink-800">{board.shortName}</Link> ·{" "}
          Class {classNum}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          {board.shortName} Class {classNum}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {board.name}
          {st && <> · {st.name}</>}
        </p>

        {hasRealSubjects ? (
          <ClassWithSubjects
            boardSlug={slug}
            classNum={classNum}
            subjects={syllabus!.subjects}
            source={source}
          />
        ) : (
          <ClassStub board={board} classNum={classNum} />
        )}

        {/* Class 11 / 12 stream choice — surfaced even on stub pages
            because it's a decision a student makes WHILE in Class 10/11,
            not something they read about later. 26 Sep 2026: Indian boards
            only; IB / Cambridge have no Science / Commerce / Humanities
            streams. */}
        {showStreams && (
          <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
            <h3 className="text-base font-semibold text-ink-900">Thinking about Class 11 streams?</h3>
            <p className="mt-2">
              The choice between <strong>Science</strong> (PCM / PCB / PCMB),
              <strong> Commerce</strong>, and <strong>Humanities</strong> shapes
              every entrance exam available to you. We don't pick for you, but
              we surface what each opens up:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink-700">
              <li><strong>Science (PCM):</strong> JEE Main → IITs / NITs / state engineering. <Link href="/exams/JEE_MAIN" className="text-saffron-700 underline">View JEE Main</Link></li>
              <li><strong>Science (PCB):</strong> NEET UG → medical / dental / AYUSH. <Link href="/exams/NEET_UG" className="text-saffron-700 underline">View NEET UG</Link></li>
              {/* 25 Sep 2026: was /exams?category=… — /exams 308s to / and drops the filter.
                  26 Sep 2026: the MBA filter lists only CAT (a post-graduation exam) and
                  none of the three named exams has a page, so they are plain labels. */}
              <li><strong>Commerce:</strong> CA Foundation, IPMAT, BBA-CET (no pages on Shishya for these yet).</li>
              <li><strong>Humanities:</strong> CUET → liberal-arts UG, CLAT → law. <Link href="/exams/browse?category=LAW" className="text-saffron-700 underline">Browse law / arts exams</Link></li>
            </ul>
          </div>
        )}

        {/* Board exam cross-link for Class 10 / 12. 26 Sep 2026: only
            where we hold the board's own question-paper link
            (boardExamPapersFor); it claimed every board, IB included,
            publishes sample papers on its own site. */}
        {examPapers && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
            <h3 className="text-base font-semibold text-ink-900">
              Class {classNum} board exam
            </h3>
            <p className="mt-2 text-xs text-ink-600">
              {board.shortName}&apos;s own question-paper page for this exam:
            </p>
            <a
              href={examPapers}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
            >
              Official {board.shortName} question papers ↗
            </a>
          </div>
        )}
      </section>
    </main>
  );
}

function subjectTileLine(s: SchoolSubject): string {
  const books = mainBooks(s);
  if (books.length > 0) return `NCERT: ${books.map((b) => b.title).join(" · ")}`;
  return s.blurb ?? s.syllabusLabel ?? "Official syllabus inside";
}

function ClassWithSubjects({
  boardSlug,
  classNum,
  subjects,
  source,
}: {
  boardSlug: string;
  classNum: number;
  subjects: SchoolSubject[];
  source: { url: string; label: string } | null;
}) {
  const isCbse = boardSlug === "cbse";
  const withChapters = subjects.filter((s) => (s.chapters?.length ?? 0) > 0);
  const withSyllabus = subjects.some((s) => s.syllabusUrl);
  return (
    <>
      <p className="mt-4 max-w-3xl text-sm text-ink-700">
        {subjects.length} subjects.{" "}
        {isCbse
          ? `Subjects link to their official NCERT textbooks, as NCERT's own index lists them (checked ${SCHOOL_SOURCES_CHECKED_ON}).`
          : "Each subject links to the board's official regulations and syllabuses."}
      </p>
      {source && (
        <p className="mt-2 text-[11px] text-ink-500">
          Source:{" "}
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
            {source.label} ↗
          </a>
        </p>
      )}

      <h2 className="mt-8 text-base font-semibold text-ink-900">
        Subjects
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/schooling/${boardSlug}/class-${classNum}/${s.slug}`}
              className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
            >
              <h3 className="text-sm font-semibold text-ink-900">{s.name}</h3>
              <p className="mt-1 text-xs text-ink-600 line-clamp-3">{subjectTileLine(s)}</p>
              {((s.chapters?.length ?? 0) > 0 || (s.feedsExams?.length ?? 0) > 0) && (
                <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-500">
                  {s.chapters && s.chapters.length > 0 ? `${s.chapters.length} chapters listed` : null}
                  {s.chapters && s.chapters.length > 0 && s.feedsExams && s.feedsExams.length > 0 ? " · " : null}
                  {s.feedsExams && s.feedsExams.length > 0 && (
                    <>leads to {s.feedsExams.slice(0, 2).map((e) => e.replace(/_/g, " ")).join(", ")}</>
                  )}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* What exists today vs what's coming — only true statements. */}
      <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-xs text-ink-600">
        <p className="font-semibold text-ink-800">On these pages today</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {isCbse ? (
            // 26 Sep 2026: "Urdu-medium editions where NCERT publishes them" was
            // untrue — NCERT's Class 11-12 commerce / humanities Urdu editions
            // are not linked. Say only what the subject pages show.
            <li>Links to the official NCERT books, with a Hindi- or Urdu-medium edition next to a book where we list one</li>
          ) : (
            <li>Links to the board&apos;s official regulations and syllabuses</li>
          )}
          {isCbse && withSyllabus && <li>The CBSE 2026-27 syllabus for each subject</li>}
          {withChapters.length > 0 && (
            <li>
              Chapter lists for {withChapters.map((s) => s.name).join(", ")}, read off each
              book&apos;s contents page
            </li>
          )}
        </ul>
        <p className="mt-3 font-semibold text-ink-800">Coming soon</p>
        <p className="mt-1">
          Chapter-wise notes and practice questions written by Shishya. Every
          question&apos;s answer is checked before it goes live.
        </p>
      </div>
    </>
  );
}

/** The one official link a stub (board, class) page points to. */
function classStubLink(board: Board, classNum: number): { url: string; label: string } {
  return (
    officialClassSource(board.slug, classNum) ?? {
      url: board.syllabusUrl ?? board.websiteUrl,
      label: board.syllabusUrl ? `Official ${board.shortName} syllabus` : `Official ${board.shortName} website`,
    }
  );
}

function ClassStub({
  board,
  classNum,
}: {
  board: Board;
  classNum: number;
}) {
  const link = classStubLink(board, classNum);
  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/40 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
        Coming soon
      </p>
      <h2 className="mt-1 text-base font-semibold text-ink-900">
        Class {classNum} subject pages are not built yet
      </h2>
      {/* 26 Sep 2026: was "the syllabus and books"; the link is often
          just the board's website. */}
      <p className="mt-2 text-sm text-ink-700">
        For {board.shortName} Class {classNum} today, use the official
        source:
      </p>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
      >
        {link.label} ↗
      </a>
    </div>
  );
}
