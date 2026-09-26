// /schooling/[board]/class-[n] — per-class landing page.
//
// 26 Sep 2026 (school go-live): a class the seed covers (NCERT_Cnn under
// /schooling/cbse, CISCE_Cnn under /schooling/icse-cisce) renders from the
// seeded rows (src/lib/school/surface.ts + db.ts): every subject with the
// official NCERT books NCERT's index lists for it (src/lib/school/books.ts),
// its chapter count and — computed from the rows, never typed — how many
// chapters have Shishya's notes and how many have checked practice. CISCE
// classes list their subjects with the council's own syllabus PDFs and say
// there is no chapter map. Indexable: the page lists the official structure
// with its links. Any other (board, class) keeps the 25 Sep hardcoded form
// below (subject tiles where schooling-subjects.ts has them, an honest
// official-source stub otherwise), noindex.
//
// Route note: the folder is `[classSlug]` and the class number is parsed
// from "class-N" (a `class-[n]` folder is a literal match in the App Router
// and never extracted `n`); URLs stay /schooling/cbse/class-10.
//
// 25 Sep 2026 (school build, Step 0): removed what wasn't true ("free
// practice, study help, chapter notes sourced from NCERT", a tutor scoped
// to the chapter, "10-20 practice questions drawn from official sources",
// exam-window claims) and the dead textbook.php?fec1= link.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { OfficialLink, SchoolCrumbs } from "@/components/school/SchoolBits";
import { SchoolStudentEntry } from "@/components/school/SchoolStudentEntry";
import { findBoard, boardExamPapersFor, SCHOOLING_ROBOTS, schoolRobots, type Board } from "@/lib/schooling-data";
import { findClassSyllabus, mainBooks, officialClassSource, SCHOOL_SOURCES_CHECKED_ON, type SchoolSubject } from "@/lib/schooling-subjects";
import { cisceClassDocuments, cisceSubjectLinks, cisceSubjectsWithPdf, ncertBooksForSubject } from "@/lib/school/books";
import { CLASS_COPY, SCHOOL_SITE, cisceDocsPhrase, countsLine, oursTitleBit } from "@/lib/school/copy";
import { chapterCounts, getLiveSchoolClass, getSchoolOfficialLinks } from "@/lib/school/db";
import { SCHOOL_GUEST_QUIZ_MIN } from "@/lib/school/scope";
import { isStudentModeClass } from "@/lib/school/student-classes";
import { parseSchoolClassSlug, schoolBoardPath, schoolClassPath, schoolSubjectPath, type SchoolSurfaceClass } from "@/lib/school/surface";
import { stateInfo } from "@/lib/state-info";

// 10 minutes = SCHOOL_REVALIDATE (src/lib/school/scope.ts; Next needs the literal).
export const revalidate = 600;

interface PageParams { slug: string; classSlug: string }

async function resolve(p: PageParams): Promise<{ board: Board; cls: number; live: SchoolSurfaceClass | undefined } | null> {
  const board = findBoard(p.slug);
  const cls = parseSchoolClassSlug(p.classSlug);
  if (!board || cls === null || !board.classes.includes(cls)) return null;
  return { board, cls, live: await getLiveSchoolClass(p.slug, cls) };
}

/** Per-subject counts and totals for a seeded class. */
function classTotals(live: SchoolSurfaceClass) {
  const subjects = live.subjects.map((s) => ({ s, counts: chapterCounts(s.chapters, SCHOOL_GUEST_QUIZ_MIN) }));
  const totals = subjects.reduce(
    (acc, x) => ({ subjects: acc.subjects + 1, chapters: acc.chapters + x.counts.chapters, notes: acc.notes + x.counts.notes, practice: acc.practice + x.counts.practice }),
    { subjects: 0, chapters: 0, notes: 0, practice: 0 },
  );
  return { subjects, totals };
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const r = await resolve(await params);
  if (!r) return { title: "Not found — Shishya", robots: SCHOOLING_ROBOTS };
  const { board, cls, live } = r;
  const path = schoolClassPath(board.slug, cls);
  if (live) {
    const { totals } = classTotals(live);
    const isNcert = live.curriculum === "NCERT";
    // 26 Sep 2026 (integrator): the notes / practice tail is the computed
    // count; a CISCE class says per-subject syllabus PDFs only where the
    // council publishes them (Classes 1-8 have one stage curriculum document).
    const cisce = { subjects: totals.subjects, withPdf: isNcert ? 0 : cisceSubjectsWithPdf(cls, live.subjects.map((s) => s.name)) };
    const title = isNcert
      ? `${board.shortName} Class ${cls} — subjects, NCERT textbooks and chapters${oursTitleBit(totals)} | Shishya`
      : `${board.shortName} Class ${cls} — subjects and ${cisce.withPdf > 0 ? "official CISCE syllabus PDFs" : "the official CISCE curriculum document"} | Shishya`;
    const description = isNcert
      ? `${board.shortName} Class ${cls}: ${totals.subjects} subjects with their official NCERT textbooks, ${countsLine(totals)}, every chapter linked to its official PDF on ncert.nic.in.`
      : `${board.shortName} Class ${cls}: ${totals.subjects} subjects, ${cisceDocsPhrase(cisce)}.`;
    return {
      title,
      description,
      alternates: { canonical: `${SCHOOL_SITE}${path}` },
      robots: schoolRobots(true),
      keywords: [
        `${board.shortName} Class ${cls} syllabus`,
        `${board.shortName} Class ${cls} subjects`,
        ...(isNcert ? [`NCERT Class ${cls} textbooks`, `Class ${cls} chapters`] : [`CISCE Class ${cls}`]),
        ...(totals.notes > 0 ? [`Class ${cls} notes`] : []),
        ...(totals.practice > 0 ? [`Class ${cls} practice questions`] : []),
      ],
      openGraph: { title, description, url: `${SCHOOL_SITE}${path}`, siteName: "Shishya", locale: "en_IN", type: "website" },
    };
  }
  // 25 Sep 2026 form: the title names only what the page has.
  const syllabus = findClassSyllabus(board.slug, cls);
  const title =
    board.slug === "cbse" && syllabus
      ? `${board.shortName} Class ${cls} — Subjects and NCERT Textbooks | Shishya`
      : syllabus
        ? `${board.shortName} Class ${cls} — Subjects and Official Syllabus Links | Shishya`
        : `${board.shortName} Class ${cls} — Official Source | Shishya`;
  const description =
    board.slug === "cbse" && syllabus
      ? `${board.shortName} Class ${cls} subjects with links to the official NCERT textbooks.`
      : syllabus
        ? `${board.shortName} Class ${cls} subjects, each linking to the board's official regulations and syllabuses.`
        : `${board.shortName} Class ${cls}: subject pages are not built yet. Official source: ${classStubLink(board, cls).label}.`;
  return {
    title,
    description,
    alternates: { canonical: `${SCHOOL_SITE}${path}` },
    robots: SCHOOLING_ROBOTS,
    openGraph: { title, description, url: `${SCHOOL_SITE}${path}`, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default async function ClassPage({ params }: { params: Promise<PageParams> }) {
  const r = await resolve(await params);
  if (!r) notFound();
  const { board, cls, live } = r;
  const classNum = cls;
  const st = board.state ? stateInfo(board.state) : null;
  const examPapers = boardExamPapersFor(board, classNum);
  const showStreams = board.type !== "international" && (classNum === 10 || classNum === 11);
  const path = schoolClassPath(board.slug, cls);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SCHOOL_SITE },
      { "@type": "ListItem", position: 2, name: "Schooling", item: `${SCHOOL_SITE}/schooling` },
      { "@type": "ListItem", position: 3, name: board.shortName, item: `${SCHOOL_SITE}${schoolBoardPath(board.slug)}` },
      { "@type": "ListItem", position: 4, name: `Class ${cls}`, item: `${SCHOOL_SITE}${path}` },
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
            { label: board.shortName, href: schoolBoardPath(board.slug) },
            { label: `Class ${cls}` },
          ]}
        />
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          {board.shortName} Class {cls}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {board.name}
          {st && <> · {st.name}</>}
        </p>

        {live ? <LiveClass board={board} cls={cls} live={live} /> : <LegacyClass board={board} cls={cls} />}

        {/* Class 11 / 12 stream choice — a decision a student makes WHILE in
            Class 10/11. 26 Sep 2026: Indian boards only; IB / Cambridge have
            no Science / Commerce / Humanities streams. */}
        {showStreams && (
          <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
            <h3 className="text-base font-semibold text-ink-900">Thinking about Class 11 streams?</h3>
            <p className="mt-2">
              The choice between <strong>Science</strong> (PCM / PCB / PCMB),
              <strong> Commerce</strong>, and <strong>Humanities</strong> shapes every entrance exam available to you. We don&apos;t pick for you, but we surface
              what each opens up:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-ink-700">
              <li>
                <strong>Science (PCM):</strong> JEE Main → IITs / NITs / state engineering.{" "}
                <Link href="/exams/JEE_MAIN" className="text-saffron-700 underline">
                  View JEE Main
                </Link>
              </li>
              <li>
                <strong>Science (PCB):</strong> NEET UG → medical / dental / AYUSH.{" "}
                <Link href="/exams/NEET_UG" className="text-saffron-700 underline">
                  View NEET UG
                </Link>
              </li>
              {/* 26 Sep 2026: none of the three named exams has a page, so they are plain labels. */}
              <li>
                <strong>Commerce:</strong> CA Foundation, IPMAT, BBA-CET (no pages on Shishya for these yet).
              </li>
              <li>
                <strong>Humanities:</strong> CUET → liberal-arts UG, CLAT → law.{" "}
                <Link href="/exams/browse?category=LAW" className="text-saffron-700 underline">
                  Browse law / arts exams
                </Link>
              </li>
            </ul>
            <Link href="/schooling/streams" className="mt-3 inline-block text-xs font-medium text-saffron-700 underline">
              Stream selection guide →
            </Link>
          </div>
        )}

        {/* Board exam cross-link for Class 10 / 12 — only where we hold the
            board's own question-paper link (boardExamPapersFor). */}
        {examPapers && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
            <h3 className="text-base font-semibold text-ink-900">Class {classNum} board exam</h3>
            <p className="mt-2 text-xs text-ink-600">{board.shortName}&apos;s own question-paper page for this exam:</p>
            <div className="mt-3">
              <OfficialLink href={examPapers} primary>
                Official {board.shortName} question papers ↗
              </OfficialLink>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function LiveClass({ board, cls, live }: { board: Board; cls: number; live: SchoolSurfaceClass }) {
  const isNcert = live.curriculum === "NCERT";
  const { subjects, totals } = classTotals(live);
  const source = officialClassSource(board.slug, cls);
  const cisceDocs = isNcert ? null : cisceClassDocuments(cls);
  return (
    <>
      <p className="mt-4 max-w-3xl text-sm text-ink-700">
        {isNcert
          ? CLASS_COPY.cbseIntro(cls)
          : CLASS_COPY.cisceIntro(cls, cisceDocs?.stage ?? "CISCE", { subjects: totals.subjects, withPdf: cisceSubjectsWithPdf(cls, live.subjects.map((s) => s.name)) })}
      </p>
      {source && (
        <p className="mt-2 text-[11px] text-ink-500">
          Source:{" "}
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
            {source.label} ↗
          </a>
        </p>
      )}
      {cisceDocs && cisceDocs.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {cisceDocs.links.map((l) => (
            <OfficialLink key={l.url} href={l.url} primary>
              {l.title} ↗
            </OfficialLink>
          ))}
        </div>
      )}

      {/* 26 Sep 2026 (student mode): Class 8-12 only — the sign-in line with
          the age line (students 13 and above); a signed-in account is told to
          open a chapter. A Class 1-7 page renders nothing here. */}
      {isStudentModeClass(cls) && <SchoolStudentEntry variant="class" cls={cls} examCode={live.examCode} pagePath={schoolClassPath(board.slug, cls)} />}

      <h2 className="mt-8 text-base font-semibold text-ink-900">{CLASS_COPY.subjectsHeading}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map(({ s, counts }) => {
          const books = isNcert ? ncertBooksForSubject(cls, s.code) : [];
          const docs = isNcert ? [] : cisceSubjectLinks(cls, s.name);
          const line = isNcert
            ? books.length > 0
              ? `NCERT: ${books.map((b) => b.title).join(" · ")}`
              : "NCERT lists no book for this subject in this class"
            : docs.length > 0
              ? `${docs.length === 1 ? CLASS_COPY.syllabusOnly : `${docs.length} official syllabus PDFs`}`
              : "See the council's document for this class above";
          const status = isNcert ? (counts.chapters > 0 ? countsLine(counts) : books.length > 0 ? CLASS_COPY.bookLinkOnly : "") : "";
          return (
            <li key={s.code}>
              <Link
                href={schoolSubjectPath(board.slug, cls, s.slug)}
                className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                <h3 className="text-sm font-semibold text-ink-900">{s.name}</h3>
                <p className="mt-1 text-xs text-ink-600 line-clamp-3">{line}</p>
                {status && <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-500">{status}</p>}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-xs text-ink-600">
        <p className="font-semibold text-ink-800">{CLASS_COPY.todayHeading}</p>
        <p className="mt-2">{isNcert ? CLASS_COPY.todayNcert(totals) : CLASS_COPY.todayCisce(totals.subjects, cisceDocs?.links.length ?? 0)}</p>
      </div>
    </>
  );
}

// ── 25 Sep 2026 form (a board / class the seed does not cover) ─────────

function subjectTileLine(s: SchoolSubject): string {
  const books = mainBooks(s);
  if (books.length > 0) return `NCERT: ${books.map((b) => b.title).join(" · ")}`;
  return s.blurb ?? s.syllabusLabel ?? "Official syllabus inside";
}

function LegacyClass({ board, cls }: { board: Board; cls: number }) {
  const syllabus = findClassSyllabus(board.slug, cls);
  const source = officialClassSource(board.slug, cls);
  if (!syllabus || syllabus.subjects.length === 0) return <ClassStub board={board} classNum={cls} />;
  const isCbse = board.slug === "cbse";
  const subjects = syllabus.subjects;
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
      <h2 className="mt-8 text-base font-semibold text-ink-900">{CLASS_COPY.subjectsHeading}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/schooling/${board.slug}/class-${cls}/${s.slug}`}
              className="block h-full rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
            >
              <h3 className="text-sm font-semibold text-ink-900">{s.name}</h3>
              <p className="mt-1 text-xs text-ink-600 line-clamp-3">{subjectTileLine(s)}</p>
              {(s.chapters?.length ?? 0) > 0 && (
                <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-500">{s.chapters!.length} chapters listed</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-xs text-ink-600">
        <p className="font-semibold text-ink-800">{CLASS_COPY.todayHeading}</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {isCbse ? (
            <li>Links to the official NCERT books, with a Hindi- or Urdu-medium edition next to a book where we list one</li>
          ) : (
            <li>Links to the board&apos;s official regulations and syllabuses</li>
          )}
          {isCbse && withSyllabus && <li>The CBSE 2026-27 syllabus for each subject</li>}
          {withChapters.length > 0 && (
            <li>
              Chapter lists for {withChapters.map((s) => s.name).join(", ")}, read off each book&apos;s contents page
            </li>
          )}
          <li>No Shishya notes or practice for this class yet</li>
        </ul>
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

function ClassStub({ board, classNum }: { board: Board; classNum: number }) {
  const link = classStubLink(board, classNum);
  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/40 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">Not on Shishya yet</p>
      <h2 className="mt-1 text-base font-semibold text-ink-900">Class {classNum} subject pages are not built yet</h2>
      <p className="mt-2 text-sm text-ink-700">For {board.shortName} Class {classNum} today, use the official source:</p>
      <div className="mt-3">
        <OfficialLink href={link.url} primary>
          {link.label} ↗
        </OfficialLink>
      </div>
    </div>
  );
}
