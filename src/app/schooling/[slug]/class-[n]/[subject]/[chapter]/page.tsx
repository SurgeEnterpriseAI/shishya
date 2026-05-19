// /schooling/[board]/class-[n]/[subject]/[chapter] — per-chapter page.
//
// Currently surfaces:
//   * Chapter overview + NCERT chapter reference
//   * Mastery quiz (5 MCQs with explanations) when one is authored
//   * Honest "concept notes being authored" stub when notes aren't ready
//   * Sibling chapters nav
//
// AI-generated concept notes are authored progressively; quiz lib in
// src/lib/schooling-quizzes.ts is the day-1 covered chapter set.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { findBoard } from "@/lib/schooling-data";
import {
  findClassSyllabus,
  findSubject,
  findChapter,
  allChapterPaths,
} from "@/lib/schooling-subjects";
import { findQuiz } from "@/lib/schooling-quizzes";
import { ChapterQuizPlayer } from "@/components/ChapterQuizPlayer";

interface PageParams { slug: string; n: string; subject: string; chapter: string }

export async function generateStaticParams() {
  return allChapterPaths().map((p) => ({
    slug: p.boardSlug,
    n: String(p.classNum),
    subject: p.subjectSlug,
    chapter: p.chapterSlug,
  }));
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { slug, n, subject, chapter } = await params;
  const classNum = parseInt(n, 10);
  const board = findBoard(slug);
  const s = findSubject(slug, classNum, subject);
  const ch = findChapter(slug, classNum, subject, chapter);
  if (!board || !s || !ch) return { title: "Not found — Shishya" };
  const year = new Date().getUTCFullYear();
  const title = `${ch.name} — ${board.shortName} Class ${classNum} ${s.name} Chapter ${ch.number} ${year} | Shishya`;
  return {
    title,
    description:
      `${ch.blurb ?? ""} Free NCERT chapter overview + mastery quiz for ${board.shortName} Class ${classNum} ${s.name} Chapter ${ch.number}: ${ch.name}.`.slice(
        0,
        280,
      ),
    alternates: { canonical: `https://shishya.in/schooling/${slug}/class-${classNum}/${subject}/${chapter}` },
    keywords: [
      `${board.shortName} Class ${classNum} ${s.name} ${ch.name}`,
      `${ch.name} Class ${classNum}`,
      `${s.name} ${ch.name} NCERT`,
      `${s.name} Class ${classNum} chapter ${ch.number}`,
      `${ch.name} mcq quiz`,
      `${ch.name} mastery quiz`,
    ],
    openGraph: {
      title,
      description: ch.blurb ?? `Chapter ${ch.number} of ${s.name}.`,
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
  const { slug, n, subject, chapter } = await params;
  const classNum = parseInt(n, 10);
  const board = findBoard(slug);
  const syllabus = findClassSyllabus(slug, classNum);
  const s = findSubject(slug, classNum, subject);
  const ch = findChapter(slug, classNum, subject, chapter);
  if (!board || !syllabus || !s || !ch) notFound();

  const quiz = findQuiz(slug, classNum, subject, chapter);
  const siblings = s.chapters ?? [];
  const idx = siblings.findIndex((c) => c.slug === ch.slug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

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
          {board.shortName} Class {classNum} {s.name}
        </p>

        {ch.blurb && (
          <p className="mt-4 max-w-3xl text-sm text-ink-700">{ch.blurb}</p>
        )}

        {/* Read on NCERT — primary source */}
        {(s.officialChapterIndex || ch.pdfUrl) && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Read the chapter
            </p>
            <p className="mt-1 text-sm text-ink-700">
              The authoritative chapter PDF is on NCERT's site. Open it side-by-side
              with the quiz below for the best learning loop.
            </p>
            <a
              href={ch.pdfUrl ?? s.officialChapterIndex}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
            >
              Open NCERT chapter ↗
            </a>
          </div>
        )}

        {/* Mastery quiz */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Mastery quiz</h2>
        {quiz ? (
          <>
            <p className="mt-2 text-xs text-ink-600">
              5 multiple-choice questions. Pick an option — instant feedback +
              one-line explanation. Answers don't leave your browser.
            </p>
            <ChapterQuizPlayer
              quizKey={quiz.key}
              questions={quiz.questions}
            />
          </>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-ink-300 bg-white p-6 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">Quiz being authored</p>
            <p className="mt-1 text-xs text-ink-600">
              We hand-author quizzes against the NCERT chapter so every
              question is grounded. Class 10 Math + Science and Class 12
              Physics/Chemistry/Math/Biology chapters are shipping first;
              this chapter is on the list.
            </p>
          </div>
        )}

        {/* Concept notes — currently a stub. Future: AI-generated notes
            scoped to this chapter. */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Concept notes</h2>
        <div className="mt-3 rounded-lg border border-dashed border-ink-300 bg-white p-6 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">Notes being generated</p>
          <p className="mt-1 text-xs text-ink-600">
            We're building chapter-scoped concept notes (Overview · Key
            Concepts · Formulas · Worked Examples · Common Mistakes · Quick
            Reference) using the same AI pipeline we use for exam topics.
            Each chapter's notes will be human-reviewed against the NCERT
            chapter before shipping.
          </p>
          <p className="mt-3 text-[11px] text-ink-500">
            For the chapter content itself, the NCERT chapter PDF (linked
            above) is the source of truth.
          </p>
        </div>

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
