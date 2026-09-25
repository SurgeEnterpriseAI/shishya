// /schooling/[board]/class-[n]/[subject] — per-subject page.
//
// Renders the subject's official NCERT books (with the Hindi / Urdu-medium
// editions NCERT lists), its official syllabus, cross-links to entrance
// exams, and the chapter list where one was read off the book.
//
// 25 Sep 2026 (school build, Step 0): noindex (SCHOOLING_ROBOTS). The page
// promised things that do not exist: "each chapter has ... a mastery quiz",
// "AI-generated concept notes are being authored", "Ask Shishya scoped to
// that chapter", "10-20 practice questions", "the source we'll ground our
// generated content against" (Shishya must not ground content in textbook
// text). Exam cross-links said "Start free mock + previous year papers" —
// IPMAT has no page on Shishya at all. All of that is gone.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { findBoard, SCHOOLING_ROBOTS } from "@/lib/schooling-data";
import {
  booksInMedium,
  findClassSyllabus,
  findSubject,
  mainBooks,
  ncertBookUrl,
  SCHOOL_SOURCES_CHECKED_ON,
  type NcertBook,
  type SchoolSubject,
} from "@/lib/schooling-subjects";

interface PageParams { slug: string; classSlug: string; subject: string }

// See sibling page.tsx for why we parse the class number from the slug
// instead of taking it as a separate dynamic segment.
function parseClassSlug(classSlug: string): number {
  if (!classSlug.startsWith("class-")) return NaN;
  return parseInt(classSlug.slice("class-".length), 10);
}

function describe(boardShortName: string, classNum: number, s: SchoolSubject): string {
  const books = mainBooks(s);
  if (books.length > 0) {
    return `Official NCERT textbooks for ${boardShortName} Class ${classNum} ${s.name}: ${books.map((b) => b.title).join(", ")}.`;
  }
  return `${boardShortName} Class ${classNum} ${s.name}: link to the official syllabus.`;
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { slug, classSlug, subject } = await params;
  const board = findBoard(slug);
  const classNum = parseClassSlug(classSlug);
  const s = findSubject(slug, classNum, subject);
  if (!board || !s) return { title: "Not found — Shishya", robots: SCHOOLING_ROBOTS };
  const title = `${board.shortName} Class ${classNum} ${s.name} — Official Textbooks and Syllabus | Shishya`;
  return {
    title,
    description: describe(board.shortName, classNum, s),
    alternates: { canonical: `https://shishya.in/schooling/${slug}/class-${classNum}/${subject}` },
    robots: SCHOOLING_ROBOTS,
    keywords: [
      `${board.shortName} Class ${classNum} ${s.name}`,
      `${s.name} class ${classNum} syllabus`,
      `${s.name} class ${classNum} chapters`,
      `${s.name} class ${classNum} NCERT`,
    ],
  };
}

function BookLink({ b }: { b: NcertBook }) {
  return (
    <a
      href={ncertBookUrl(b)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-saffron-700 underline"
    >
      {b.title} ↗
    </a>
  );
}

export default async function SubjectPage({
  params,
}: { params: Promise<PageParams> }) {
  const { slug, classSlug, subject } = await params;
  const board = findBoard(slug);
  const classNum = parseClassSlug(classSlug);
  const syllabus = findClassSyllabus(slug, classNum);
  const s = findSubject(slug, classNum, subject);
  if (!board || !syllabus || !s) notFound();

  const main = mainBooks(s);
  const hindi = booksInMedium(s, "hi");
  const urdu = booksInMedium(s, "ur");
  const chapters = s.chapters ?? [];
  const chapterBooks = main.filter((b) => b.chapters && b.chapters.length > 0);
  const syllabusLabel = s.syllabusLabel ?? (slug === "cbse" ? "CBSE syllabus 2026-27 (PDF)" : "Official syllabus");

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Schooling", item: "https://shishya.in/schooling" },
      { "@type": "ListItem", position: 3, name: board.shortName, item: `https://shishya.in/schooling/${slug}` },
      { "@type": "ListItem", position: 4, name: `Class ${classNum}`, item: `https://shishya.in/schooling/${slug}/class-${classNum}` },
      { "@type": "ListItem", position: 5, name: s.name, item: `https://shishya.in/schooling/${slug}/class-${classNum}/${subject}` },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/schooling" className="hover:text-ink-800">Schooling</Link> ·{" "}
          <Link href={`/schooling/${slug}`} className="hover:text-ink-800">{board.shortName}</Link> ·{" "}
          <Link href={`/schooling/${slug}/class-${classNum}`} className="hover:text-ink-800">Class {classNum}</Link> ·{" "}
          {s.name}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">{s.name}</h1>
        <p className="mt-1 text-sm text-ink-500">
          {board.shortName} Class {classNum}
        </p>

        {s.blurb && <p className="mt-4 max-w-3xl text-sm text-ink-700">{s.blurb}</p>}

        {/* Official books — link out; Shishya never hosts or copies them. */}
        {main.length > 0 && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Official NCERT {main.length === 1 ? "textbook" : "textbooks"}
            </p>
            <ul className="mt-2 space-y-2">
              {main.map((b) => (
                <li key={b.query} className="text-sm text-ink-800">
                  <a
                    href={ncertBookUrl(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
                  >
                    {b.title} ↗
                  </a>
                  {(b.edition || b.note) && (
                    <span className="ml-2 text-[11px] text-ink-500">
                      {[b.edition, b.note].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {hindi.length > 0 && (
              <p className="mt-3 text-xs text-ink-600">
                Hindi medium:{" "}
                {hindi.map((b, i) => (
                  <span key={b.query}>{i > 0 && " · "}<BookLink b={b} /></span>
                ))}
              </p>
            )}
            {urdu.length > 0 && (
              <p className="mt-1 text-xs text-ink-600">
                Urdu medium:{" "}
                {urdu.map((b, i) => (
                  <span key={b.query}>{i > 0 && " · "}<BookLink b={b} /></span>
                ))}
              </p>
            )}
            <p className="mt-3 text-[11px] text-ink-500">
              Titles as NCERT&apos;s textbook index lists them, checked {SCHOOL_SOURCES_CHECKED_ON}.
              The books are free to read on ncert.nic.in.
            </p>
          </div>
        )}

        {s.syllabusUrl && (
          <div className="mt-4 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Official syllabus
            </p>
            <a
              href={s.syllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
            >
              {syllabusLabel} ↗
            </a>
          </div>
        )}

        {/* Cross-link to entrance exams this subject leads into.
            Driven by the `feedsExams` field in schooling-subjects.ts. */}
        {s.feedsExams && s.feedsExams.length > 0 && (
          <div className="mt-6 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5">
            <h2 className="text-base font-semibold text-ink-900">
              Where this subject takes you next
            </h2>
            <p className="mt-1 text-xs text-ink-600">
              These entrance exams build on this subject:
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {s.feedsExams.map((examCode) => (
                <li key={examCode}>
                  <Link
                    href={`/exams/${examCode}`}
                    className="block rounded-md border border-saffron-200 bg-white p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/60"
                  >
                    <p className="text-sm font-semibold text-ink-900">
                      {examCode.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-xs text-saffron-700">
                      Exam page with free mock tests →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="mt-10 text-base font-semibold text-ink-900">Chapters</h2>
        {chapters.length > 0 ? (
          <>
            <p className="mt-2 text-xs text-ink-600">
              {chapters.length} chapters, as printed on the contents page of{" "}
              {chapterBooks.map((b) => b.title).join(" and ")}.
              Each chapter page links to its book on ncert.nic.in. Shishya&apos;s
              own notes and practice for these chapters are coming soon.
            </p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {chapters.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/schooling/${slug}/class-${classNum}/${subject}/${c.slug}`}
                    className="flex h-full items-start gap-3 rounded-lg border border-ink-200 bg-white p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-saffron-100 text-xs font-bold text-saffron-800 tabular-nums">
                      {c.number}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink-900">{c.name}</span>
                      {chapterBooks.length > 1 && (
                        <span className="mt-0.5 block text-[11px] text-ink-500">{c.book.title}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-ink-300 bg-white p-6">
            <p className="text-sm font-semibold text-ink-900">Coming soon</p>
            <p className="mt-2 text-xs text-ink-600">
              Chapter pages for this subject are not built yet.{" "}
              {main.length > 0
                ? "The official book above lists every chapter."
                : "The official syllabus above lists what the subject covers."}
            </p>
          </div>
        )}

        {/* Sibling subjects in this class — quick jump */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Other subjects in Class {classNum}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {syllabus.subjects.filter((sib) => sib.slug !== s.slug).map((sib) => (
            <li key={sib.slug}>
              <Link
                href={`/schooling/${slug}/class-${classNum}/${sib.slug}`}
                className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                {sib.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
