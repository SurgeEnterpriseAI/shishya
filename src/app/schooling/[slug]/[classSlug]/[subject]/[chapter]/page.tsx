// /schooling/[board]/class-[n]/[subject]/[chapter] — per-chapter page.
//
// 25 Sep 2026 (school build, Step 0): a chapter page now says only what is
// true — the chapter's printed title and number, which official NCERT book
// it is in (with the link), and that Shishya's own notes and practice are
// coming soon. It is noindex (SCHOOLING_ROBOTS).
//
// What was removed and why:
//   * The 5-question "mastery quiz" (src/lib/schooling-quizzes.ts). None of
//     those questions has an answer check, and school content goes live
//     only after its answers are checked; SCHOOL_QUIZZES_ANSWER_CHECKED
//     gates it.
//   * "We hand-author quizzes against the NCERT chapter so every question
//     is grounded" — nothing records that, and Shishya must not ground its
//     content in textbook text.
//   * The "Notes being generated" stub: no notes exist and nothing is
//     generating them.
//   * The per-chapter blurbs, written from the pre-2023 books.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { findBoard, SCHOOLING_ROBOTS } from "@/lib/schooling-data";
import {
  findClassSyllabus,
  findSubject,
  findChapter,
  allChapterPaths,
  ncertBookUrl,
} from "@/lib/schooling-subjects";
import { findQuiz, SCHOOL_QUIZZES_ANSWER_CHECKED } from "@/lib/schooling-quizzes";
import { ChapterQuizPlayer } from "@/components/ChapterQuizPlayer";

interface PageParams { slug: string; classSlug: string; subject: string; chapter: string }

// See sibling page.tsx for why the class number is parsed from `class-N`
// instead of being a separate dynamic segment.
function parseClassSlug(classSlug: string): number {
  if (!classSlug.startsWith("class-")) return NaN;
  return parseInt(classSlug.slice("class-".length), 10);
}

export async function generateStaticParams() {
  return allChapterPaths().map((p) => ({
    slug: p.boardSlug,
    classSlug: `class-${p.classNum}`,
    subject: p.subjectSlug,
    chapter: p.chapterSlug,
  }));
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { slug, classSlug, subject, chapter } = await params;
  const classNum = parseClassSlug(classSlug);
  const board = findBoard(slug);
  const s = findSubject(slug, classNum, subject);
  const ch = findChapter(slug, classNum, subject, chapter);
  if (!board || !s || !ch) return { title: "Not found — Shishya", robots: SCHOOLING_ROBOTS };
  const title = `${ch.name} — ${board.shortName} Class ${classNum} ${s.name} Chapter ${ch.number} | Shishya`;
  const description =
    `Chapter ${ch.number} of NCERT ${ch.book.title} (${board.shortName} Class ${classNum} ${s.name}): ${ch.name}. Link to the official textbook on ncert.nic.in.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/schooling/${slug}/class-${classNum}/${subject}/${chapter}` },
    robots: SCHOOLING_ROBOTS,
    keywords: [
      `${board.shortName} Class ${classNum} ${s.name} ${ch.name}`,
      `${ch.name} Class ${classNum}`,
      `${s.name} ${ch.name} NCERT`,
      `${s.name} Class ${classNum} chapter ${ch.number}`,
    ],
    openGraph: {
      title,
      description,
      url: `https://shishya.in/schooling/${slug}/class-${classNum}/${subject}/${chapter}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
    },
  };
}

export default async function ChapterPage({
  params,
}: { params: Promise<PageParams> }) {
  const { slug, classSlug, subject, chapter } = await params;
  const classNum = parseClassSlug(classSlug);
  const board = findBoard(slug);
  const syllabus = findClassSyllabus(slug, classNum);
  const s = findSubject(slug, classNum, subject);
  const ch = findChapter(slug, classNum, subject, chapter);
  if (!board || !syllabus || !s || !ch) notFound();

  // Unchecked quizzes are never served (see the header).
  const quiz = SCHOOL_QUIZZES_ANSWER_CHECKED ? findQuiz(slug, classNum, subject, chapter) : undefined;
  const siblings = s.chapters ?? [];
  const idx = siblings.findIndex((c) => c.slug === ch.slug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const listedAs = ch.numberInBook !== ch.number;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Schooling", item: "https://shishya.in/schooling" },
      { "@type": "ListItem", position: 3, name: board.shortName, item: `https://shishya.in/schooling/${slug}` },
      { "@type": "ListItem", position: 4, name: `Class ${classNum}`, item: `https://shishya.in/schooling/${slug}/class-${classNum}` },
      { "@type": "ListItem", position: 5, name: s.name, item: `https://shishya.in/schooling/${slug}/class-${classNum}/${subject}` },
      { "@type": "ListItem", position: 6, name: ch.name, item: `https://shishya.in/schooling/${slug}/class-${classNum}/${subject}/${chapter}` },
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
          <Link href={`/schooling/${slug}/class-${classNum}/${subject}`} className="hover:text-ink-800">{s.name}</Link> ·{" "}
          Ch {ch.number}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{ch.name}</h1>
          <span className="rounded bg-saffron-100 px-2 py-0.5 text-xs font-medium text-saffron-800">
            Chapter {ch.number}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {board.shortName} Class {classNum} {s.name} · NCERT {ch.book.title}
          {ch.book.edition ? ` (${ch.book.edition})` : ""}
        </p>

        {/* The official book — primary source, linked, never copied. */}
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Read the chapter
          </p>
          <p className="mt-1 text-sm text-ink-700">
            This chapter is in NCERT&apos;s {ch.book.title}, free on ncert.nic.in
            {listedAs ? `, where that book lists it as Chapter ${ch.numberInBook}` : ""}.
          </p>
          <a
            href={ncertBookUrl(ch.book)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Open {ch.book.title} on NCERT ↗
          </a>
        </div>

        {quiz ? (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Practice</h2>
            <ChapterQuizPlayer quizKey={quiz.key} questions={quiz.questions} />
          </>
        ) : (
          <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-6 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">Coming soon</p>
            <p className="mt-1 text-xs text-ink-600">
              Notes and practice questions for this chapter, written by
              Shishya. Every question&apos;s answer is checked before it goes
              live. Until then, the NCERT book above is the source to study from.
            </p>
          </div>
        )}

        {/* Prev / Next navigation */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/schooling/${slug}/class-${classNum}/${subject}/${prev.slug}`}
              className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                ← Previous chapter
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{prev.name}</p>
              <p className="mt-0.5 text-xs text-ink-500">Chapter {prev.number}</p>
            </Link>
          ) : <div />}
          {next ? (
            <Link
              href={`/schooling/${slug}/class-${classNum}/${subject}/${next.slug}`}
              className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
            >
              <p className="text-right text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                Next chapter →
              </p>
              <p className="mt-1 text-right text-sm font-semibold text-ink-900">{next.name}</p>
              <p className="mt-0.5 text-right text-xs text-ink-500">Chapter {next.number}</p>
            </Link>
          ) : <div />}
        </div>

        {/* Back to subject */}
        <div className="mt-6">
          <Link
            href={`/schooling/${slug}/class-${classNum}/${subject}`}
            className="text-xs text-saffron-700 underline"
          >
            ← All chapters in {s.name}
          </Link>
        </div>
      </section>
    </main>
  );
}
