// /schooling/[board]/class-[n]/[subject] — per-subject page.
//
// Day 1 of the chapter-content build:
//   * Renders subject blurb, NCERT chapter PDF link, and cross-links
//     to relevant entrance exams (e.g., Class 12 Physics → JEE Main).
//   * Chapter-level concept summaries / practice / quizzes are stubbed
//     as "Coming soon" tiles until the AI generation pipeline is run
//     against this subject's Topic rows.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { findBoard } from "@/lib/schooling-data";
import { findSubject, findClassSyllabus } from "@/lib/schooling-subjects";

interface PageParams { slug: string; n: string; subject: string }

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { slug, n, subject } = await params;
  const board = findBoard(slug);
  const classNum = parseInt(n, 10);
  const s = findSubject(slug, classNum, subject);
  if (!board || !s) return { title: "Not found — Shishya" };
  const year = new Date().getUTCFullYear();
  const title = `${board.shortName} Class ${classNum} ${s.name} — Syllabus & Free Practice | Shishya`;
  return {
    title,
    description: `${s.blurb} Free syllabus, NCERT chapter links, study help for Class ${classNum} ${s.name} (${board.shortName}, ${year}).`,
    alternates: { canonical: `https://shishya.in/schooling/${slug}/class-${classNum}/${subject}` },
    keywords: [
      `${board.shortName} Class ${classNum} ${s.name}`,
      `${s.name} class ${classNum} syllabus`,
      `${s.name} class ${classNum} chapters`,
      `${s.name} class ${classNum} NCERT`,
      `${s.name} class ${classNum} practice`,
    ],
  };
}

export default async function SubjectPage({
  params,
}: { params: Promise<PageParams> }) {
  const { slug, n, subject } = await params;
  const board = findBoard(slug);
  const classNum = parseInt(n, 10);
  const syllabus = findClassSyllabus(slug, classNum);
  const s = findSubject(slug, classNum, subject);
  if (!board || !syllabus || !s) notFound();

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

        <p className="mt-4 max-w-3xl text-sm text-ink-700">{s.blurb}</p>

        {/* Official source — the spec rule is "link out for things we can't
            verifiably keep current". Subject-level NCERT chapter index. */}
        {s.officialChapterIndex && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Official chapter index
            </p>
            <p className="mt-1 text-sm text-ink-700">
              The complete, authoritative chapter list for this subject is
              on the NCERT site. Use it as your primary source —
              Shishya links to it directly so you never read a stale copy.
            </p>
            <a
              href={s.officialChapterIndex}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
            >
              Open NCERT chapter index ↗
            </a>
            <p className="mt-2 text-[11px] text-ink-500">
              {s.chapterCount && s.chapterCount > 0 ? `${s.chapterCount} chapters` : "Chapter list"} ·
              {" "}{board.shortName} Class {classNum}
            </p>
          </div>
        )}

        {/* Cross-link to entrance exams this subject feeds into.
            Driven by the `feedsExams` field in schooling-subjects.ts. */}
        {s.feedsExams && s.feedsExams.length > 0 && (
          <div className="mt-6 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5">
            <h2 className="text-base font-semibold text-ink-900">
              Where this subject takes you next
            </h2>
            <p className="mt-1 text-xs text-ink-600">
              Strong fundamentals here feed directly into these entrance exams.
              Once you're approaching Class 12 finals, our exam section is the
              next stop:
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
                      Start free mock + previous year papers →
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chapter-level surface. If chapters were authored for this
            subject (Class 10 Math + Science, Class 12 Physics/Chem/Math/
            Biology), render a clickable tile grid. Otherwise fall back
            to the honest "being built" stub pointing students to the
            NCERT chapter index. */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Chapters</h2>
        {s.chapters && s.chapters.length > 0 ? (
          <>
            <p className="mt-2 text-xs text-ink-600">
              {s.chapters.length} chapters in the NCERT syllabus. Each
              chapter has its own page with the chapter overview, what
              to read (NCERT section refs), and a mastery quiz. AI-
              generated concept notes are being authored progressively.
            </p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {s.chapters.map((c) => (
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
                      {c.blurb && <span className="mt-0.5 block text-[11px] text-ink-600 line-clamp-2">{c.blurb}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-ink-300 bg-white p-6">
            <p className="text-sm font-semibold text-ink-900">
              Per-chapter learning pages — being built
            </p>
            <p className="mt-2 text-xs text-ink-600">
              Each chapter will get its own page with: concept summary
              (Overview · Key Concepts · Formulas · Worked Examples · Common
              Mistakes · Quick Reference), 10-20 practice questions, a mastery
              quiz with adaptive difficulty, and Ask Shishya scoped to that
              chapter. Until each chapter is fully built, we keep this honest
              instead of showing placeholder buttons that don't work.
            </p>
            <p className="mt-3 text-[11px] text-ink-500">
              For the chapter list and reference content right now, use the
              official NCERT link above. The NCERT textbook PDFs are free and
              authoritative — they're the source we'll ground our generated
              content against.
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
