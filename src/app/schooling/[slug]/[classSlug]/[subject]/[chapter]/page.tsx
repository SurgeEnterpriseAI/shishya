// /schooling/[board]/class-[n]/[subject]/[chapter] — per-chapter page.
//
// 26 Sep 2026 (school go-live): a chapter page renders from the seeded rows —
// the Topic (printed title, NCERT book code + PDF number), its official PDF
// link (KnowledgeSource), Shishya's own notes (TopicTeachingNote) and its
// answer-checked practice questions (Question rows, validated) — through
// src/lib/school/surface.ts (the same cached read the sitemap and
// llms-full.txt use, so the page and the search surface never disagree on
// what a chapter has) and src/lib/school/db.ts. Everything shown is computed
// from those rows:
//   * notes + a checked guest quiz → both are shown; the page is indexable;
//   * one of them → that one; indexable;
//   * neither → title, book, the official NCERT link and one plain line that
//     Shishya's notes and practice are not ready yet; noindex (links
//     followed). tests/unit/school-pages.test.ts pins the rule
//     (isSchoolChapterIndexable, src/lib/school/scope.ts).
// The practice block is the exam pages' 5-question guest quiz shape, fed by
// getSchoolGuestQuiz (src/lib/anon-quiz.ts) — no account, no result saved to
// any account, one anonymous QUIZ_ATTEMPTED analytics beacon and the copy
// says so (26 Sep 2026 fixer: "nothing is saved" was untrue) — in a
// school-only player with no tutor, sign-in, challenge or teacher links
// (Anthropic minors policy; the parent-consent layer is not built).
// 26 Sep 2026 (student mode): on a Class 8-12 chapter only
// (isStudentModeClass, src/lib/school/student-classes.ts) the page also
// carries the student entry island (src/components/school/SchoolStudentEntry.tsx):
// sign-in for students 13 and above, "Practise this chapter" (an account
// set of up to 10 of the chapter's checked questions) and "Ask the AI tutor
// about this chapter". The page itself reads no session — it stays public
// and ISR-cached; the island asks after mount. A Class 1-7 page renders
// none of it.
// Old URLs (the 25 Sep hand-picked subject segments and chapter slugs that
// differ from the seeded title) 308 to today's address
// (src/lib/school/legacy-urls.ts, resolved against the LIVE chapter list —
// 26 Sep 2026 fixer: a kebab-of-old-title guess 404ed one of the 154); an
// old chapter with no live twin goes to its subject's chapter list, an old
// subject with none to its class page. A class the seed does not cover
// keeps its 25 Sep hardcoded, noindex form below.
//
// 25 Sep 2026 (school build, Step 0): the 5-question May-2026 "mastery"
// quizzes (src/lib/schooling-quizzes.ts) were switched off — none had an
// answer check. They are not read here any more: practice comes from
// Question rows that passed scripts/verify-question-bank.ts.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Header } from "@/components/Header";
import { NotesMarkdown } from "@/components/NotesMarkdown";
import { SchoolChapterQuiz } from "@/components/school/SchoolChapterQuiz";
import { SchoolStudentEntry } from "@/components/school/SchoolStudentEntry";
import { ChapterStatusPill, OfficialLink, SchoolCrumbs } from "@/components/school/SchoolBits";
import { findBoard, SCHOOLING_ROBOTS, schoolRobots, type Board } from "@/lib/schooling-data";
import {
  findClassSyllabus,
  findSubject,
  findChapter,
  ncertBookUrl,
  type ClassSyllabus,
  type SchoolChapter,
  type SchoolSubject,
} from "@/lib/schooling-subjects";
import { getSchoolGuestQuiz } from "@/lib/anon-quiz";
import { quizLabels } from "@/lib/challenge-copy";
import { tk } from "@/lib/i18n";
import { bookOfChapter, chapterLabel, ncertBooksForSubject, ncertChapterMeta } from "@/lib/school/books";
import { CHAPTER_COPY, CHAPTER_QUIZ_COPY, SCHOOL_SITE, chapterHasParts, subjectShortName } from "@/lib/school/copy";
import { getLiveSchoolChapter, getLiveSchoolClass, getSchoolChapterDetail, getSchoolOfficialLinks, type LiveSchoolChapter } from "@/lib/school/db";
import { legacyChapterSlug, legacySubjectSlug } from "@/lib/school/legacy-urls";
import { hasSchoolGuestQuiz } from "@/lib/school/scope";
import { isStudentModeClass } from "@/lib/school/student-classes";
import { parseSchoolClassSlug, schoolBoardPath, schoolChapterPath, schoolClassPath, schoolSubjectPath } from "@/lib/school/surface";

// Public page; notes and practice land in batches. 10 minutes = SCHOOL_REVALIDATE
// (src/lib/school/scope.ts; Next needs the literal here).
export const revalidate = 600;

interface PageParams { slug: string; classSlug: string; subject: string; chapter: string }

type Resolved =
  | { kind: "live"; board: Board; cls: number; live: LiveSchoolChapter }
  | { kind: "legacy"; board: Board; cls: number; syllabus: ClassSyllabus; s: SchoolSubject; ch: SchoolChapter }
  | { kind: "redirect"; to: string }
  | null;

async function resolve(p: PageParams): Promise<Resolved> {
  const board = findBoard(p.slug);
  const cls = parseSchoolClassSlug(p.classSlug);
  if (!board || cls === null || !board.classes.includes(cls)) return null;
  const liveClass = await getLiveSchoolClass(p.slug, cls);
  if (liveClass) {
    const live = await getLiveSchoolChapter(p.slug, cls, p.subject, p.chapter);
    if (live) return { kind: "live", board, cls, live };
    // An old address (25 Sep): a hand-picked subject segment and / or a
    // chapter slug that differs from today's. Resolved against the live
    // chapter list of the mapped subject, never by guessing a slug.
    const subjectSlug = legacySubjectSlug(p.slug, cls, p.subject);
    const liveSubject = liveClass.subjects.find((s) => s.slug === subjectSlug);
    const old = findChapter(p.slug, cls, p.subject, p.chapter);
    if (liveSubject) {
      const chapterSlug = liveSubject.chapters.some((c) => c.slug === p.chapter)
        ? p.chapter
        : old
          ? legacyChapterSlug(old, liveSubject.chapters)
          : null;
      if (chapterSlug) return { kind: "redirect", to: schoolChapterPath(p.slug, cls, subjectSlug, chapterSlug) };
      // An old chapter with no live twin: its subject's chapter list, not a 404.
      if (old) return { kind: "redirect", to: schoolSubjectPath(p.slug, cls, subjectSlug) };
      return null;
    }
    // An old subject with no live twin at all: the class page.
    if (old || findSubject(p.slug, cls, p.subject)) return { kind: "redirect", to: schoolClassPath(p.slug, cls) };
    return null;
  }
  const syllabus = findClassSyllabus(p.slug, cls);
  const s = findSubject(p.slug, cls, p.subject);
  const ch = findChapter(p.slug, cls, p.subject, p.chapter);
  if (!syllabus || !s || !ch) return null;
  return { kind: "legacy", board, cls, syllabus, s, ch };
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const r = await resolve(await params);
  if (!r) return { title: "Not found — Shishya", robots: SCHOOLING_ROBOTS };
  if (r.kind === "redirect") return { title: "Moved — Shishya", robots: SCHOOLING_ROBOTS };
  if (r.kind === "legacy") {
    const { board, cls, s, ch } = r;
    const path = `/schooling/${board.slug}/class-${cls}/${s.slug}/${ch.slug}`;
    const title = `${ch.name} — ${board.shortName} Class ${cls} ${s.name} Chapter ${ch.number} | Shishya`;
    const description = `Chapter ${ch.number} of NCERT ${ch.book.title} (${board.shortName} Class ${cls} ${s.name}): ${ch.name}. Link to the official textbook on ncert.nic.in.`;
    return {
      title,
      description,
      alternates: { canonical: `${SCHOOL_SITE}${path}` },
      robots: SCHOOLING_ROBOTS,
      openGraph: { title, description, url: `${SCHOOL_SITE}${path}`, siteName: "Shishya", locale: "en_IN", type: "article" },
    };
  }
  const { board, cls, live } = r;
  const { chapter, subject } = live;
  const meta = ncertChapterMeta(cls, chapter.code);
  const quiz = hasSchoolGuestQuiz(chapter);
  const label = chapterLabel(meta);
  const bookTitle = meta?.bookTitle ?? chapter.bookCode;
  const path = schoolChapterPath(board.slug, cls, subject.slug, chapter.slug);
  const title = `Class ${cls} ${subjectShortName(subject.name)} ${label ? `${label}: ` : ""}${chapter.name} — ${chapterHasParts({ hasNotes: chapter.hasNotes, quiz })} | Shishya`;
  const has: string[] = [];
  if (chapter.hasNotes) has.push("Shishya's own study notes");
  if (quiz) has.push(`${chapter.validatedQuestions} answer-checked practice questions (5 at a time, no account needed)`);
  has.push("the official chapter PDF on ncert.nic.in");
  const description = `${board.shortName} Class ${cls} ${subject.name} — ${label ? `${label} of ` : ""}NCERT ${bookTitle}: ${chapter.name}. ${has.length > 1 ? `${has.slice(0, -1).join(", ")} and ${has[has.length - 1]}` : has[0]}.`;
  return {
    title,
    description,
    alternates: { canonical: `${SCHOOL_SITE}${path}` },
    robots: schoolRobots(chapter.indexable),
    keywords: [
      `${chapter.name} Class ${cls}`,
      `Class ${cls} ${subject.name} ${label}`.trim(),
      `${chapter.name} NCERT ${bookTitle}`,
      ...(chapter.hasNotes ? [`${chapter.name} notes`] : []),
      ...(quiz ? [`${chapter.name} practice questions`] : []),
    ],
    openGraph: { title, description, url: `${SCHOOL_SITE}${path}`, siteName: "Shishya", locale: "en_IN", type: "article" },
  };
}

export default async function ChapterPage({ params }: { params: Promise<PageParams> }) {
  const r = await resolve(await params);
  if (!r) notFound();
  if (r.kind === "redirect") permanentRedirect(r.to);
  if (r.kind === "legacy") return <LegacyChapterPage {...r} />;

  const { board, cls, live } = r;
  const { chapter, subject, prev, next } = live;
  const examCode = live.cls.examCode;
  const [detail, links] = await Promise.all([getSchoolChapterDetail(examCode, chapter.code), getSchoolOfficialLinks(examCode)]);
  const books = ncertBooksForSubject(cls, subject.code);
  const book = bookOfChapter(books, chapter.code);
  const meta = ncertChapterMeta(cls, chapter.code);
  const bookTitle = meta?.bookTitle ?? book?.title ?? chapter.bookCode;
  const label = chapterLabel(meta);
  const notes = detail?.notes ?? null;
  const officialUrl = links.byChapter[chapter.code] ?? meta?.pdfUrl ?? notes?.officialUrl ?? null;
  const quizOffered = hasSchoolGuestQuiz(chapter);
  const quiz = quizOffered ? await getSchoolGuestQuiz({ examCode, topicCode: chapter.code }) : null;
  const labels = quizLabels((k) => tk(k, "en"));
  const pieces = detail?.pieces ?? [];

  const boardPath = schoolBoardPath(board.slug);
  const classPath = schoolClassPath(board.slug, cls);
  const subjectPath = schoolSubjectPath(board.slug, cls, subject.slug);
  const chapterPath = schoolChapterPath(board.slug, cls, subject.slug, chapter.slug);
  const url = `${SCHOOL_SITE}${chapterPath}`;
  const notesAt = detail?.notesAt ? new Date(detail.notesAt) : null;
  const notesDateText = notesAt ? notesAt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SCHOOL_SITE },
      { "@type": "ListItem", position: 2, name: "Schooling", item: `${SCHOOL_SITE}/schooling` },
      { "@type": "ListItem", position: 3, name: board.shortName, item: `${SCHOOL_SITE}${boardPath}` },
      { "@type": "ListItem", position: 4, name: `Class ${cls}`, item: `${SCHOOL_SITE}${classPath}` },
      { "@type": "ListItem", position: 5, name: subject.name, item: `${SCHOOL_SITE}${subjectPath}` },
      { "@type": "ListItem", position: 6, name: chapter.name, item: url },
    ],
  };
  // Only a chapter with Shishya's own notes is a published learning resource;
  // a bare chapter page never claims to be one.
  const notesJsonLd = notes
    ? {
        "@context": "https://schema.org",
        "@type": ["Article", "LearningResource"],
        headline: `${chapter.name} — Class ${cls} ${subject.name} study notes`,
        name: chapter.name,
        description: `Shishya's own study notes on ${chapter.name} (${board.shortName} Class ${cls} ${subject.name}, NCERT ${bookTitle}).`,
        url,
        inLanguage: "en-IN",
        isAccessibleForFree: true,
        learningResourceType: "Study notes",
        educationalLevel: `Class ${cls}`,
        teaches: chapter.name,
        about: [
          { "@type": "Thing", name: chapter.name },
          { "@type": "Thing", name: `NCERT ${bookTitle}` },
        ],
        wordCount: notes.wordCount,
        ...(notesAt ? { datePublished: notesAt.toISOString(), dateModified: notesAt.toISOString() } : {}),
        author: { "@type": "Organization", name: "Shishya", url: SCHOOL_SITE },
        publisher: { "@type": "Organization", name: "Shishya", url: SCHOOL_SITE },
        ...(officialUrl ? { citation: officialUrl } : {}),
      }
    : null;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {notesJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(notesJsonLd) }} />}
      <Header />
      <section className="container-prose py-10">
        <SchoolCrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Schooling", href: "/schooling" },
            { label: board.shortName, href: boardPath },
            { label: `Class ${cls}`, href: classPath },
            { label: subject.name, href: subjectPath },
            { label: label || chapter.name },
          ]}
        />
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{chapter.name}</h1>
          {label && <span className="rounded bg-saffron-100 px-2 py-0.5 text-xs font-medium text-saffron-800">{label}</span>}
          <ChapterStatusPill hasNotes={chapter.hasNotes} quiz={quizOffered} />
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {board.shortName} Class {cls} {subject.name} · NCERT {bookTitle}
        </p>

        {/* The official book — primary source, linked, never copied. */}
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{CHAPTER_COPY.officialHeading}</p>
          <p className="mt-1 text-sm text-ink-700">{CHAPTER_COPY.officialLine(bookTitle)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {officialUrl && (
              <OfficialLink href={officialUrl} primary>
                {CHAPTER_COPY.openPdf}
              </OfficialLink>
            )}
            {book && <OfficialLink href={book.bookUrl}>{CHAPTER_COPY.openBook(book.title)}</OfficialLink>}
          </div>
        </div>

        {/* 26 Sep 2026 (student mode): Class 8-12 only — sign-in for
            students 13 and above, account practice and the AI tutor entry.
            A Class 1-7 chapter renders nothing here. */}
        {isStudentModeClass(cls) && (
          <SchoolStudentEntry
            variant="chapter"
            cls={cls}
            examCode={examCode}
            pagePath={chapterPath}
            topicCode={chapter.code}
            chapterName={chapter.name}
            subjectName={subject.name}
            validatedQuestions={chapter.validatedQuestions}
          />
        )}

        {notes ? (
          <>
            <h2 id="notes" className="mt-10 text-base font-semibold text-ink-900">
              {CHAPTER_COPY.notesHeading}
            </h2>
            <article className="prose prose-sm sm:prose-base mt-3 max-w-none rounded-lg border border-ink-200 bg-white p-5 sm:p-6">
              <NotesMarkdown markdown={notes.markdown} />
            </article>
            <p className="mt-2 text-[11px] text-ink-500">{CHAPTER_COPY.notesFooter(notesDateText)}</p>
          </>
        ) : null}

        {quiz ? (
          <div className="mt-10">
            <SchoolChapterQuiz quiz={quiz} labels={labels} copy={CHAPTER_QUIZ_COPY} backToNotes={notes !== null} />
          </div>
        ) : !notes ? (
          <p className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-sm text-ink-700">{CHAPTER_COPY.notReady}</p>
        ) : null}

        {/* Pieces printed inside this chapter's PDF: poems after a prose
            lesson, the lessons of a Poorvi unit, numbered parts. Titles as
            printed; they share the chapter's PDF. */}
        {pieces.length > 0 && (
          <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{CHAPTER_COPY.piecesHeading}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-800">
              {pieces.map((p) => (
                <li key={p.code}>{p.name}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Prev / Next navigation */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link href={schoolChapterPath(board.slug, cls, subject.slug, prev.slug)} className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{CHAPTER_COPY.prev}</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{prev.name}</p>
              <p className="mt-0.5 text-xs text-ink-500">{chapterLabel(ncertChapterMeta(cls, prev.code))}</p>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link href={schoolChapterPath(board.slug, cls, subject.slug, next.slug)} className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400">
              <p className="text-right text-[10px] font-semibold uppercase tracking-wider text-ink-500">{CHAPTER_COPY.next}</p>
              <p className="mt-1 text-right text-sm font-semibold text-ink-900">{next.name}</p>
              <p className="mt-0.5 text-right text-xs text-ink-500">{chapterLabel(ncertChapterMeta(cls, next.code))}</p>
            </Link>
          ) : (
            <div />
          )}
        </div>

        <div className="mt-6">
          <Link href={subjectPath} className="text-xs text-saffron-700 underline">
            {CHAPTER_COPY.backToSubject(subject.name)}
          </Link>
        </div>
      </section>
    </main>
  );
}

/** The 25 Sep form for a class the seed does not cover: printed title and
 *  number, the official book link, one honest line. noindex. */
function LegacyChapterPage({ board, cls, s, ch }: { board: Board; cls: number; syllabus: ClassSyllabus; s: SchoolSubject; ch: SchoolChapter }) {
  const siblings = s.chapters ?? [];
  const idx = siblings.findIndex((c) => c.slug === ch.slug);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const listedAs = ch.numberInBook !== ch.number;
  const base = `/schooling/${board.slug}/class-${cls}/${s.slug}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SCHOOL_SITE },
      { "@type": "ListItem", position: 2, name: "Schooling", item: `${SCHOOL_SITE}/schooling` },
      { "@type": "ListItem", position: 3, name: board.shortName, item: `${SCHOOL_SITE}/schooling/${board.slug}` },
      { "@type": "ListItem", position: 4, name: `Class ${cls}`, item: `${SCHOOL_SITE}/schooling/${board.slug}/class-${cls}` },
      { "@type": "ListItem", position: 5, name: s.name, item: `${SCHOOL_SITE}${base}` },
      { "@type": "ListItem", position: 6, name: ch.name, item: `${SCHOOL_SITE}${base}/${ch.slug}` },
    ],
  };
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <SchoolCrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Schooling", href: "/schooling" },
            { label: board.shortName, href: `/schooling/${board.slug}` },
            { label: `Class ${cls}`, href: `/schooling/${board.slug}/class-${cls}` },
            { label: s.name, href: base },
            { label: `Ch ${ch.number}` },
          ]}
        />
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{ch.name}</h1>
          <span className="rounded bg-saffron-100 px-2 py-0.5 text-xs font-medium text-saffron-800">Chapter {ch.number}</span>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {board.shortName} Class {cls} {s.name} · NCERT {ch.book.title}
          {ch.book.edition ? ` (${ch.book.edition})` : ""}
        </p>
        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{CHAPTER_COPY.officialHeading}</p>
          <p className="mt-1 text-sm text-ink-700">
            This chapter is in NCERT&apos;s {ch.book.title}, free on ncert.nic.in
            {listedAs ? `, where that book lists it as Chapter ${ch.numberInBook}` : ""}.
          </p>
          <div className="mt-3">
            <OfficialLink href={ncertBookUrl(ch.book)} primary>
              Open {ch.book.title} on NCERT ↗
            </OfficialLink>
          </div>
        </div>
        <p className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-sm text-ink-700">{CHAPTER_COPY.notReady}</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link href={`${base}/${prev.slug}`} className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{CHAPTER_COPY.prev}</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{prev.name}</p>
              <p className="mt-0.5 text-xs text-ink-500">Chapter {prev.number}</p>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link href={`${base}/${next.slug}`} className="rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400">
              <p className="text-right text-[10px] font-semibold uppercase tracking-wider text-ink-500">{CHAPTER_COPY.next}</p>
              <p className="mt-1 text-right text-sm font-semibold text-ink-900">{next.name}</p>
              <p className="mt-0.5 text-right text-xs text-ink-500">Chapter {next.number}</p>
            </Link>
          ) : (
            <div />
          )}
        </div>
        <div className="mt-6">
          <Link href={base} className="text-xs text-saffron-700 underline">
            {CHAPTER_COPY.backToSubject(s.name)}
          </Link>
        </div>
      </section>
    </main>
  );
}
