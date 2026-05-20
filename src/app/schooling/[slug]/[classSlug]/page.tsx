// /schooling/[board]/class-[n] — per-class landing page.
//
// Day 1 of the schooling depth build:
//   * Class 10 + Class 12 (CBSE + ICSE) get a real subject tile grid
//     backed by NCERT/CISCE syllabus data.
//   * Class 11 and Class 1-9 get an honest "subjects coming, here's
//     the official source" stub — per your spec rule "If content for
//     a section isn't built, the destination clearly states 'Coming
//     soon, here's what's planned.'"
//
// Per the Phase 0 audit decision, each (board, class) maps onto an
// Exam row with category=SCHOOL_BOARD later on — for now the route
// reads the hardcoded syllabus data and renders. Once AI-generated
// chapter notes ship, the same route surfaces them automatically.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { findBoard } from "@/lib/schooling-data";
import {
  findClassSyllabus,
  ncertClassUrl,
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
    return { title: "Not found — Shishya" };
  }
  const year = new Date().getUTCFullYear();
  const title = `${board.shortName} Class ${classNum} — Syllabus, Subjects, Free Practice ${year} | Shishya`;
  const description =
    `${board.shortName} Class ${classNum} students — every subject from the official ` +
    `syllabus in one place. Free practice, study help, chapter notes sourced from ` +
    `NCERT / board materials. No paywall.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/schooling/${slug}/class-${classNum}` },
    keywords: [
      `${board.shortName} Class ${classNum} syllabus`,
      `${board.shortName} Class ${classNum} subjects`,
      `${board.shortName} Class ${classNum} ${year}`,
      `Class ${classNum} mathematics`,
      `Class ${classNum} science`,
      `Class ${classNum} sample papers`,
      `${board.shortName} Class ${classNum} preparation`,
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
  const officialUrl = ncertClassUrl(slug, classNum);

  // Decide which "phase" copy to render based on what's populated.
  // Class 10 + 12 (CBSE / ICSE) have real subject grids; everything
  // else gets the honest stub.
  const hasRealSubjects = !!syllabus && syllabus.subjects.length > 0;

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
            officialUrl={officialUrl}
          />
        ) : (
          <ClassStub
            boardSlug={slug}
            classNum={classNum}
            boardShortName={board.shortName}
            officialUrl={officialUrl}
          />
        )}

        {/* Class 11 / 12 stream choice — surfaced even on stub pages
            because it's a decision a student makes WHILE in Class 10/11,
            not something they read about later. */}
        {(classNum === 10 || classNum === 11) && (
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
              <li><strong>Commerce:</strong> CA Foundation, IPMAT, BBA-CET. <Link href="/exams?category=MBA" className="text-saffron-700 underline">Browse commerce exams</Link></li>
              <li><strong>Humanities:</strong> CUET → liberal-arts UG, CLAT → law. <Link href="/exams?category=LAW" className="text-saffron-700 underline">Browse law / arts exams</Link></li>
            </ul>
          </div>
        )}

        {/* Board exam prep cross-link for Class 10 / 12 */}
        {(classNum === 10 || classNum === 12) && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
            <h3 className="text-base font-semibold text-ink-900">
              Class {classNum} board exam
            </h3>
            <p className="mt-2 text-xs text-ink-600">
              The {board.shortName} Class {classNum} board exam is held annually
              (typically February–March). Sample papers and previous-year
              question papers are released by the board ~2 months before.
              The official archive is:
            </p>
            {board.samplePaperUrl ? (
              <a
                href={board.samplePaperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
              >
                Official {board.shortName} sample papers ↗
              </a>
            ) : (
              <p className="mt-2 text-[11px] text-ink-500">
                Visit{" "}
                <a href={board.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
                  {board.shortName} official site
                </a>{" "}
                for the current cycle's papers.
              </p>
            )}
            <p className="mt-3 text-[11px] text-ink-500">
              A dedicated board-exam preparation hub (study planner, last 10 years'
              papers, blueprint, marking scheme) is on the roadmap.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function ClassWithSubjects({
  boardSlug,
  classNum,
  subjects,
  officialUrl,
}: {
  boardSlug: string;
  classNum: number;
  subjects: SchoolSubject[];
  officialUrl: string | null;
}) {
  return (
    <>
      <p className="mt-4 max-w-3xl text-sm text-ink-700">
        {subjects.length} subjects in the Class {classNum} syllabus. Click any
        subject to see the chapter list, official NCERT links, and (where
        ready) chapter-level concept summaries + practice quizzes.
      </p>
      {officialUrl && (
        <p className="mt-2 text-[11px] text-ink-500">
          Source:{" "}
          <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
            NCERT Class {classNum} chapter index ↗
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
              <p className="mt-1 text-xs text-ink-600 line-clamp-3">{s.blurb}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-500">
                {s.chapterCount ? `${s.chapterCount} chapters` : "Chapter list inside"}
                {s.feedsExams && s.feedsExams.length > 0 && (
                  <> · feeds {s.feedsExams.slice(0, 2).map((e) => e.replace(/_/g, " ")).join(", ")}</>
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Honest framing about what's actually built vs what's planned */}
      <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-xs text-ink-600">
        <p className="font-semibold text-ink-800">What's already on each subject page</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          <li>Chapter list with the official NCERT/board syllabus source</li>
          <li>Cross-links to relevant entrance exams (where applicable)</li>
        </ul>
        <p className="mt-3 font-semibold text-ink-800">What's still being built per chapter</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          <li>Concept summary (Overview / Key Concepts / Formulas / Worked Examples / Common Mistakes / Quick Reference)</li>
          <li>10-20 practice questions per chapter, drawn from official sources</li>
          <li>Mastery quiz with adaptive difficulty</li>
          <li>Ask Shishya scoped to the chapter for doubts</li>
          <li>Per-user progress tracking + weak-area diagnostic</li>
        </ul>
        <p className="mt-3 text-[11px] text-ink-500">
          Class 10 + Class 12 (CBSE + ICSE) are the first to get chapter-level
          content. Other classes follow per the published phase plan.
        </p>
      </div>
    </>
  );
}

function ClassStub({
  boardSlug,
  classNum,
  boardShortName,
  officialUrl,
}: {
  boardSlug: string;
  classNum: number;
  boardShortName: string;
  officialUrl: string | null;
}) {
  void boardSlug;
  return (
    <>
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/40 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
          Subject pages being built
        </p>
        <h2 className="mt-1 text-base font-semibold text-ink-900">
          Class {classNum} content is rolling out in phases
        </h2>
        <p className="mt-2 text-sm text-ink-700">
          Class 10 and Class 12 (CBSE + ICSE) are first — they cover the
          highest-stakes board exam years and feed directly into the
          entrance-exam section. Class {classNum} subject + chapter
          pages come in a subsequent phase.
        </p>
        <p className="mt-2 text-[11px] text-ink-600">
          For the {boardShortName} Class {classNum} syllabus today, visit
          the official source:
        </p>
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Official {boardShortName} syllabus ↗
          </a>
        )}
      </div>

      <h2 className="mt-10 text-base font-semibold text-ink-900">
        What's coming to this page
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        <li className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink-900">Subjects with chapter lists</p>
          <p className="mt-1 text-xs text-ink-600">
            Tile grid of all subjects for Class {classNum}, each leading to a
            chapter-by-chapter syllabus with official source links.
          </p>
        </li>
        <li className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink-900">Concept summaries per chapter</p>
          <p className="mt-1 text-xs text-ink-600">
            Notes prepared from official sources, NCERT-aligned: Overview · Key
            Concepts · Formulas · Worked Examples · Common Mistakes · Quick
            Reference.
          </p>
        </li>
        <li className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink-900">Practice + mastery quizzes</p>
          <p className="mt-1 text-xs text-ink-600">
            10-20 problems per chapter, adaptive difficulty, instant feedback.
          </p>
        </li>
        <li className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-sm font-semibold text-ink-900">Progress tracking</p>
          <p className="mt-1 text-xs text-ink-600">
            Chapter-level mastery state per student, weak-area diagnosis,
            recommended next steps.
          </p>
        </li>
      </ul>
    </>
  );
}
