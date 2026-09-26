// /schooling/[board]/class-[n]/[subject] — per-subject page.
//
// 26 Sep 2026 (school go-live): a subject page renders from the seeded rows
// (src/lib/school/surface.ts + db.ts): the official NCERT books NCERT's
// index lists for the subject (title, index link, the Hindi / Urdu and other
// editions NCERT records — from the committed spine, src/lib/school/books.ts),
// CBSE's own syllabus PDF where CBSE prescribes one of those books, and the
// chapter list — every chapter with its official PDF and a status computed
// from its rows: "Notes + practice", "Notes", "Practice" or "Official chapter
// only". CISCE subjects show the council's syllabus PDFs and say plainly
// that CISCE prescribes syllabuses, not one textbook, so there is no chapter
// list. Indexable: the page lists the official structure with its links.
// Old hand-picked subject segments ("hindi-a", "english-core") 308 to
// today's (src/lib/school/legacy-urls.ts; 26 Sep 2026 fixer: class-aware,
// ICSE and ISC code the same old segment differently), and an old subject
// with no live twin at all (cbse/class-10/computer-applications) 308s to
// its class page instead of 404ing. A class the seed does not cover keeps
// its 25 Sep hardcoded, noindex form below.
// 26 Sep 2026 (fixer): a CISCE subject page listed EVERY class-level
// KnowledgeSource row (the seed writes one per subject syllabus PDF, so
// Mathematics showed Cookery's syllabus as its own document, and its own
// twice). It now shows the subject's own syllabus PDFs plus the stage's
// regulations / curriculum document from the spine — what the class page
// shows — de-duplicated by URL.
//
// 25 Sep 2026 (school build, Step 0): the page promised a "mastery quiz",
// notes "being authored" and a tutor scoped to the chapter — none existed;
// all of that went. What a chapter has is now read, never promised.
//
// 26 Sep 2026 (every-education-search wave):
//   • H1 "CBSE Class 6 Mathematics" (board, class and subject — it was the
//     bare subject name), on the 25 Sep form too;
//   • title ≤ ~70 characters (fitTitle), board / class / subject always; the
//     tail says "notes and practice on N" only for chapters with both, and
//     "a free AI tutor" on a Class 8-12 NCERT subject with chapters (the
//     tutor is opened from its chapter pages); the description adds the
//     tutor clause there;
//   • alternates.types text/markdown → the subject's context.md (live
//     branch; the route 404s for a class that is not live);
//   • CollectionPage JSON-LD (educationalLevel "Class N", about the board)
//     whose chapter ItemList holds only the indexable chapter pages — a
//     noindex chapter is never offered to a crawler as the list's content;
//   • "Next steps" on Class 11-12 Physics / Chemistry / Mathematics /
//     Biology: the entrance exams that subject feeds (live hubs only),
//     entrance exams, colleges, scholarships, careers. The 25 Sep form's
//     "feeds exams" cards link only live exams.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Header } from "@/components/Header";
import { SHISHYA_ORG_REF } from "@/components/JsonLd";
import { ChapterStatusPill, OfficialLink, SchoolCrumbs } from "@/components/school/SchoolBits";
import { SchoolNextSteps } from "@/components/school/SchoolNextSteps";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { loadLiveExams } from "@/lib/live-exam-codes";
import { schoolNextSteps } from "@/lib/section-related";
import { examHubHref, fitTitle } from "@/lib/section-seo";
import { isStudentModeClass } from "@/lib/school/student-classes";
import { findBoard, SCHOOLING_ROBOTS, schoolRobots, type Board } from "@/lib/schooling-data";
import {
  booksInMedium,
  findClassSyllabus,
  findSubject,
  mainBooks,
  ncertBookUrl,
  SCHOOL_SOURCES_CHECKED_ON,
  type ClassSyllabus,
  type NcertBook,
  type SchoolSubject,
} from "@/lib/schooling-subjects";
import { bookLanguageName, cbseSyllabusLinksForBooks, chapterLabel, cisceClassDocuments, cisceSubjectLinks, ncertBooksForSubject, ncertChapterMeta, type SchoolBookRef } from "@/lib/school/books";
import { schoolClassIdentity } from "@/lib/school/context";
import { SCHOOL_SITE, SUBJECT_COPY, countsLine } from "@/lib/school/copy";
import { chapterCounts, getLiveSchoolClass, getLiveSchoolSubject, getSchoolOfficialLinks, type LiveSchoolSubject } from "@/lib/school/db";
import { legacySubjectSlug } from "@/lib/school/legacy-urls";
import { SCHOOL_GUEST_QUIZ_MIN, hasSchoolGuestQuiz } from "@/lib/school/scope";
import { isSchoolSubjectIndexable, parseSchoolClassSlug, schoolBoardPath, schoolChapterPath, schoolClassPath, schoolSubjectPath } from "@/lib/school/surface";

// 10 minutes = SCHOOL_REVALIDATE (src/lib/school/scope.ts; Next needs the literal).
export const revalidate = 600;

interface PageParams { slug: string; classSlug: string; subject: string }

type Resolved =
  | { kind: "live"; board: Board; cls: number; live: LiveSchoolSubject }
  | { kind: "legacy"; board: Board; cls: number; syllabus: ClassSyllabus; s: SchoolSubject }
  | { kind: "redirect"; to: string }
  | null;

async function resolve(p: PageParams): Promise<Resolved> {
  const board = findBoard(p.slug);
  const cls = parseSchoolClassSlug(p.classSlug);
  if (!board || cls === null || !board.classes.includes(cls)) return null;
  const liveClass = await getLiveSchoolClass(p.slug, cls);
  if (liveClass) {
    const live = await getLiveSchoolSubject(p.slug, cls, p.subject);
    if (live) return { kind: "live", board, cls, live };
    const mapped = legacySubjectSlug(p.slug, cls, p.subject);
    if (mapped !== p.subject && liveClass.subjects.some((s) => s.slug === mapped)) {
      return { kind: "redirect", to: schoolSubjectPath(p.slug, cls, mapped) };
    }
    // An old (25 Sep) subject page with no live twin: its class page, not a 404.
    if (findSubject(p.slug, cls, p.subject)) return { kind: "redirect", to: schoolClassPath(p.slug, cls) };
    return null;
  }
  const syllabus = findClassSyllabus(p.slug, cls);
  const s = findSubject(p.slug, cls, p.subject);
  if (!syllabus || !s) return null;
  return { kind: "legacy", board, cls, syllabus, s };
}

function bookTitles(books: readonly SchoolBookRef[]): string {
  const t = books.map((b) => b.title);
  return t.length <= 1 ? t.join("") : `${t.slice(0, -1).join(", ")} and ${t[t.length - 1]}`;
}

/** "notes and practice on 5" (chapters with both), else "Shishya notes on
 *  N" / "practice on N"; "" when the subject has neither. */
function oursShortBit(chapters: ReadonlyArray<{ hasNotes: boolean; validatedQuestions: number }>): string {
  let both = 0;
  let notes = 0;
  let practice = 0;
  for (const ch of chapters) {
    const quiz = hasSchoolGuestQuiz(ch);
    if (ch.hasNotes && quiz) both++;
    if (ch.hasNotes) notes++;
    if (quiz) practice++;
  }
  if (both > 0) return `notes and practice on ${both}`;
  if (notes > 0) return `Shishya notes on ${notes}`;
  if (practice > 0) return `practice on ${practice}`;
  return "";
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const r = await resolve(await params);
  if (!r) return { title: "Not found — Shishya", robots: SCHOOLING_ROBOTS };
  if (r.kind === "redirect") return { title: "Moved — Shishya", robots: SCHOOLING_ROBOTS };
  if (r.kind === "legacy") {
    const { board, cls, s } = r;
    const books = mainBooks(s);
    const path = `/schooling/${board.slug}/class-${cls}/${s.slug}`;
    const title = `${board.shortName} Class ${cls} ${s.name} — Official Textbooks and Syllabus | Shishya`;
    const description =
      books.length > 0
        ? `Official NCERT textbooks for ${board.shortName} Class ${cls} ${s.name}: ${books.map((b) => b.title).join(", ")}.`
        : `${board.shortName} Class ${cls} ${s.name}: link to the official syllabus.`;
    return { title, description, alternates: { canonical: `${SCHOOL_SITE}${path}` }, robots: SCHOOLING_ROBOTS };
  }
  const { board, cls, live } = r;
  const { subject } = live;
  const isNcert = live.cls.curriculum === "NCERT";
  const books = isNcert ? ncertBooksForSubject(cls, subject.code) : [];
  const counts = chapterCounts(subject.chapters, SCHOOL_GUEST_QUIZ_MIN);
  const path = schoolSubjectPath(board.slug, cls, subject.slug);
  // 26 Sep 2026 (integrator): an NCERT subject with no book (Class 9 ICT,
  // forthcoming in NCERT's index) has nothing to list; a CISCE subject of
  // Classes 1-8 sits under the stage curriculum document and has no syllabus
  // PDF of its own. The title and description say which; the notes /
  // practice tail is the computed count.
  const noBook = isNcert && books.length === 0 && counts.chapters === 0;
  const subjectPdf = !isNcert && cisceSubjectLinks(cls, subject.name).length > 0;
  // The tutor is opened from a chapter page: Class 8-12 NCERT subjects with chapters.
  const tutor = isStudentModeClass(cls) && isNcert && counts.chapters > 0;
  const ours = oursShortBit(subject.chapters);
  const core = `${board.shortName} Class ${cls} ${subject.name}`;
  const bookBit = books.length ? `NCERT ${bookTitles(books)} chapters` : "NCERT chapters";
  const tails = isNcert
    ? noBook
      ? ["no NCERT textbook published yet", "no NCERT textbook yet"]
      : [
          ...(ours && tutor ? [`${bookBit}, ${ours} and a free AI tutor`, `NCERT chapters, ${ours} and a free AI tutor`] : []),
          ...(tutor ? [`${bookBit} and a free AI tutor`, "NCERT chapters and a free AI tutor", "free AI tutor"] : []),
          ...(ours ? [`${bookBit}, ${ours}`, `NCERT chapters, ${ours}`, `${ours} chapters`] : []),
          bookBit,
          "NCERT chapters",
        ]
    : [subjectPdf ? "official CISCE syllabus" : "official CISCE curriculum document", subjectPdf ? "CISCE syllabus" : "CISCE curriculum"];
  const title = fitTitle(core, tails, { keepTail: Boolean(ours) || tutor });
  const tutorLine = tutor
    ? ` Students 13 and above can ${counts.practice > 0 ? "practise chapters and " : ""}ask a free AI tutor about any chapter, in English or ${INDIAN_LANGUAGE_COUNT} Indian languages.`
    : "";
  const description = isNcert
    ? noBook
      ? SUBJECT_COPY.noBook(subject.name, cls)
      : `${board.shortName} Class ${cls} ${subject.name}: ${books.length ? `the official NCERT ${books.length === 1 ? "textbook" : "textbooks"} ${bookTitles(books)}` : "the official NCERT textbooks"}, ${countsLine(counts)}, every chapter linked to its official PDF on ncert.nic.in.${tutorLine}`
    : subjectPdf
      ? `${board.shortName} Class ${cls} ${subject.name}: CISCE's own syllabus PDF and regulations. CISCE prescribes a syllabus, not one textbook.`
      : `${board.shortName} Class ${cls} ${subject.name}: CISCE's curriculum document for this stage — the council publishes no per-subject syllabus PDF for this class. CISCE prescribes a syllabus, not one textbook.`;
  return {
    title,
    description,
    alternates: { canonical: `${SCHOOL_SITE}${path}`, types: { "text/markdown": `${SCHOOL_SITE}${path}/context.md` } },
    // The sitemap's own rule (src/lib/school/surface.ts isSchoolSubjectIndexable
    // with the spine identity): a subject the sitemap skips is noindex here too.
    robots: schoolRobots(isSchoolSubjectIndexable(subject, schoolClassIdentity(live.cls.curriculum, cls))),
    keywords: [
      `${board.shortName} Class ${cls} ${subject.name}`,
      `${subject.name} Class ${cls} chapters`,
      ...books.map((b) => `${b.title} NCERT Class ${cls}`),
      ...(counts.notes > 0 ? [`Class ${cls} ${subject.name} notes`] : []),
      ...(counts.practice > 0 ? [`Class ${cls} ${subject.name} practice questions`] : []),
      ...(tutor ? [`free AI tutor Class ${cls} ${subject.name}`] : []),
    ],
    openGraph: { title, description, url: `${SCHOOL_SITE}${path}`, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default async function SubjectPage({ params }: { params: Promise<PageParams> }) {
  const r = await resolve(await params);
  if (!r) notFound();
  if (r.kind === "redirect") permanentRedirect(r.to);
  if (r.kind === "legacy") return <LegacySubjectPage {...r} />;

  const { board, cls, live } = r;
  const { subject } = live;
  const examCode = live.cls.examCode;
  const isNcert = live.cls.curriculum === "NCERT";
  // The seeded official links (one NCERT PDF per chapter) are read for an
  // NCERT subject only; a CISCE subject's documents come from the spine.
  const links = isNcert ? await getSchoolOfficialLinks(examCode) : null;
  const books = isNcert ? ncertBooksForSubject(cls, subject.code) : [];
  const cbseLinks = isNcert ? cbseSyllabusLinksForBooks(cls, books.map((b) => b.code)) : [];
  const cisceLinks = isNcert ? [] : cisceSubjectLinks(cls, subject.name);
  // The stage's regulations / curriculum document (what the class page shows),
  // never the other subjects' syllabus PDFs; the subject's own PDFs are not repeated.
  const classDocs = isNcert ? [] : (cisceClassDocuments(cls)?.links ?? []).filter((l) => !cisceLinks.some((s) => s.url === l.url));
  const counts = chapterCounts(subject.chapters, SCHOOL_GUEST_QUIZ_MIN);
  const chapters = subject.chapters.map((ch) => {
    const meta = ncertChapterMeta(cls, ch.code);
    return { ...ch, meta, label: chapterLabel(meta), officialUrl: links?.byChapter[ch.code] ?? meta?.pdfUrl ?? null, quiz: hasSchoolGuestQuiz(ch) };
  });
  // Chapters grouped by book, in the order the subject lists its books.
  const byBook = new Map<string, typeof chapters>();
  for (const ch of chapters) byBook.set(ch.bookCode, [...(byBook.get(ch.bookCode) ?? []), ch]);
  const booksWithChapters = books.filter((b) => byBook.has(b.code));
  const chapterBookTitles = bookTitles(booksWithChapters.length ? booksWithChapters : books);

  const boardPath = schoolBoardPath(board.slug);
  const classPath = schoolClassPath(board.slug, cls);
  const path = schoolSubjectPath(board.slug, cls, subject.slug);
  const url = `${SCHOOL_SITE}${path}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SCHOOL_SITE },
      { "@type": "ListItem", position: 2, name: "Schooling", item: `${SCHOOL_SITE}/schooling` },
      { "@type": "ListItem", position: 3, name: board.shortName, item: `${SCHOOL_SITE}${boardPath}` },
      { "@type": "ListItem", position: 4, name: `Class ${cls}`, item: `${SCHOOL_SITE}${classPath}` },
      { "@type": "ListItem", position: 5, name: subject.name, item: url },
    ],
  };
  // 26 Sep 2026: the CollectionPage's chapter list holds only indexable
  // chapter pages (surface `indexable` = isSchoolChapterIndexable, the
  // sitemap's rule); the page itself still links every chapter.
  const indexableChapters = chapters.filter((ch) => ch.indexable);
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${board.shortName} Class ${cls} ${subject.name}`,
    url,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    educationalLevel: `Class ${cls}`,
    about: { "@type": "Organization", name: board.name, url: board.websiteUrl },
    isPartOf: { "@type": "WebSite", name: "Shishya", url: SCHOOL_SITE },
    publisher: SHISHYA_ORG_REF,
    ...(indexableChapters.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            name: `${board.shortName} Class ${cls} ${subject.name} chapters with Shishya notes or practice`,
            numberOfItems: indexableChapters.length,
            itemListElement: indexableChapters.map((ch, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: ch.name,
              url: `${SCHOOL_SITE}${schoolChapterPath(board.slug, cls, subject.slug, ch.slug)}`,
            })),
          },
        }
      : {}),
  };
  const nextSteps = schoolNextSteps(cls, subject.name);
  const liveExams = nextSteps.length > 0 ? await loadLiveExams() : new Map<string, string>();

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <SchoolCrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Schooling", href: "/schooling" },
            { label: board.shortName, href: boardPath },
            { label: `Class ${cls}`, href: classPath },
            { label: subject.name },
          ]}
        />
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          {board.shortName} Class {cls} {subject.name}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{board.name}</p>

        {/* Official books — link out; Shishya never hosts or copies them. */}
        {books.length > 0 && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{SUBJECT_COPY.booksHeading(books.length)}</p>
            <ul className="mt-2 space-y-3">
              {books.map((b) => {
                const hindi = b.editions.filter((e) => e.language === "hi");
                const urdu = b.editions.filter((e) => e.language === "ur");
                const others = b.editions.filter((e) => e.language !== "hi" && e.language !== "ur");
                return (
                  <li key={b.code} className="text-sm text-ink-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <OfficialLink href={b.bookUrl} primary>
                        {b.title} ↗
                      </OfficialLink>
                      {b.language !== "en" && <span className="text-[11px] text-ink-500">{bookLanguageName(b.language)} medium</span>}
                      <span className="text-[11px] text-ink-500">
                        {b.listedChapterCount} {b.listedChapterCount === 1 ? "chapter" : "chapters"} on NCERT&apos;s page
                      </span>
                    </div>
                    {(hindi.length > 0 || urdu.length > 0) && (
                      <p className="mt-1 text-xs text-ink-600">
                        {hindi.length > 0 && (
                          <>
                            Hindi medium:{" "}
                            {hindi.map((e, i) => (
                              <span key={e.code}>
                                {i > 0 && " · "}
                                <a href={e.bookUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
                                  {e.title} ↗
                                </a>
                              </span>
                            ))}
                          </>
                        )}
                        {hindi.length > 0 && urdu.length > 0 && " · "}
                        {urdu.length > 0 && (
                          <>
                            Urdu medium:{" "}
                            {urdu.map((e, i) => (
                              <span key={e.code}>
                                {i > 0 && " · "}
                                <a href={e.bookUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
                                  {e.title} ↗
                                </a>
                              </span>
                            ))}
                          </>
                        )}
                      </p>
                    )}
                    {others.length > 0 && (
                      <p className="mt-1 text-[11px] text-ink-500">
                        {SUBJECT_COPY.editionsLine(
                          others.map((e) => bookLanguageName(e.language)).join(", "),
                        )}{" "}
                        {others.map((e, i) => (
                          <span key={e.code}>
                            {i > 0 && " · "}
                            <a href={e.bookUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-800">
                              {bookLanguageName(e.language)}
                            </a>
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-ink-500">{SUBJECT_COPY.booksNote}</p>
          </div>
        )}

        {cbseLinks.length > 0 && (
          <div className="mt-4 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{SUBJECT_COPY.cbseSyllabusHeading}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {cbseLinks.map((l) => (
                <OfficialLink key={l.url} href={l.url}>
                  {l.title} ↗
                </OfficialLink>
              ))}
            </div>
          </div>
        )}

        {!isNcert && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{SUBJECT_COPY.cisceHeading}</p>
            <p className="mt-1 text-sm text-ink-700">{SUBJECT_COPY.cisceNote}</p>
            {cisceLinks.length === 0 && <p className="mt-1 text-sm text-ink-700">{SUBJECT_COPY.cisceNoSubjectPdf}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {cisceLinks.map((l) => (
                <OfficialLink key={l.url} href={l.url} primary>
                  {l.title} ↗
                </OfficialLink>
              ))}
              {classDocs.map((l) => (
                <OfficialLink key={l.url} href={l.url}>
                  {l.title} ↗
                </OfficialLink>
              ))}
            </div>
          </div>
        )}

        {isNcert && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">{SUBJECT_COPY.chaptersHeading}</h2>
            {chapters.length > 0 ? (
              <>
                <p className="mt-2 text-xs text-ink-600">{SUBJECT_COPY.chaptersIntro(counts, chapterBookTitles)}</p>
                {[...byBook.entries()].map(([bookCode, list]) => {
                  const book = books.find((b) => b.code === bookCode);
                  return (
                    <div key={bookCode} className="mt-4">
                      {byBook.size > 1 && <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{book?.title ?? bookCode}</p>}
                      <ol className="mt-2 grid gap-2 sm:grid-cols-2">
                        {list.map((ch) => (
                          <li key={ch.code}>
                            <Link
                              href={schoolChapterPath(board.slug, cls, subject.slug, ch.slug)}
                              className="flex h-full items-start gap-3 rounded-lg border border-ink-200 bg-white p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                            >
                              <span className="mt-0.5 inline-flex h-7 min-w-7 flex-shrink-0 items-center justify-center rounded-md bg-saffron-100 px-1 text-xs font-bold text-saffron-800 tabular-nums">
                                {ch.meta?.number ?? "·"}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-ink-900">{ch.name}</span>
                                <span className="mt-1 block">
                                  <ChapterStatusPill hasNotes={ch.hasNotes} quiz={ch.quiz} />
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-ink-300 bg-white p-5 text-sm text-ink-700">
                {books.length ? SUBJECT_COPY.noChapters(bookTitles(books)) : SUBJECT_COPY.noBook(subject.name, cls)}
              </p>
            )}
          </>
        )}

        {/* Sibling subjects in this class — quick jump */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">{SUBJECT_COPY.otherSubjects(cls)}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {live.cls.subjects
            .filter((sib) => sib.slug !== subject.slug)
            .map((sib) => (
              <li key={sib.slug}>
                <Link
                  href={schoolSubjectPath(board.slug, cls, sib.slug)}
                  className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  {sib.name}
                </Link>
              </li>
            ))}
        </ul>

        <SchoolNextSteps steps={nextSteps} live={liveExams} />
      </section>
    </main>
  );
}

function LegacyBookLink({ b }: { b: NcertBook }) {
  return (
    <a href={ncertBookUrl(b)} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
      {b.title} ↗
    </a>
  );
}

/** The 25 Sep form for a class the seed does not cover: official books and
 *  syllabus links from the hardcoded list, chapters where one was read. noindex. */
async function LegacySubjectPage({ board, cls, syllabus, s }: { board: Board; cls: number; syllabus: ClassSyllabus; s: SchoolSubject }) {
  const liveExams = s.feedsExams && s.feedsExams.length > 0 ? await loadLiveExams() : new Map<string, string>();
  const main = mainBooks(s);
  const hindi = booksInMedium(s, "hi");
  const urdu = booksInMedium(s, "ur");
  const chapters = s.chapters ?? [];
  const chapterBooks = main.filter((b) => b.chapters && b.chapters.length > 0);
  const syllabusLabel = s.syllabusLabel ?? (board.slug === "cbse" ? "CBSE syllabus 2026-27 (PDF)" : "Official syllabus");
  const base = `/schooling/${board.slug}/class-${cls}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SCHOOL_SITE },
      { "@type": "ListItem", position: 2, name: "Schooling", item: `${SCHOOL_SITE}/schooling` },
      { "@type": "ListItem", position: 3, name: board.shortName, item: `${SCHOOL_SITE}/schooling/${board.slug}` },
      { "@type": "ListItem", position: 4, name: `Class ${cls}`, item: `${SCHOOL_SITE}${base}` },
      { "@type": "ListItem", position: 5, name: s.name, item: `${SCHOOL_SITE}${base}/${s.slug}` },
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
            { label: `Class ${cls}`, href: base },
            { label: s.name },
          ]}
        />
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          {board.shortName} Class {cls} {s.name}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{board.name}</p>
        {s.blurb && <p className="mt-4 max-w-3xl text-sm text-ink-700">{s.blurb}</p>}
        {main.length > 0 && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{SUBJECT_COPY.booksHeading(main.length)}</p>
            <ul className="mt-2 space-y-2">
              {main.map((b) => (
                <li key={b.query} className="text-sm text-ink-800">
                  <OfficialLink href={ncertBookUrl(b)} primary>
                    {b.title} ↗
                  </OfficialLink>
                  {(b.edition || b.note) && <span className="ml-2 text-[11px] text-ink-500">{[b.edition, b.note].filter(Boolean).join(" · ")}</span>}
                </li>
              ))}
            </ul>
            {hindi.length > 0 && (
              <p className="mt-3 text-xs text-ink-600">
                Hindi medium:{" "}
                {hindi.map((b, i) => (
                  <span key={b.query}>
                    {i > 0 && " · "}
                    <LegacyBookLink b={b} />
                  </span>
                ))}
              </p>
            )}
            {urdu.length > 0 && (
              <p className="mt-1 text-xs text-ink-600">
                Urdu medium:{" "}
                {urdu.map((b, i) => (
                  <span key={b.query}>
                    {i > 0 && " · "}
                    <LegacyBookLink b={b} />
                  </span>
                ))}
              </p>
            )}
            <p className="mt-3 text-[11px] text-ink-500">
              Titles as NCERT&apos;s textbook index lists them, checked {SCHOOL_SOURCES_CHECKED_ON}. The books are free to read on ncert.nic.in.
            </p>
          </div>
        )}
        {s.syllabusUrl && (
          <div className="mt-4 rounded-lg border border-ink-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Official syllabus</p>
            <div className="mt-2">
              <OfficialLink href={s.syllabusUrl}>{syllabusLabel} ↗</OfficialLink>
            </div>
          </div>
        )}
        {s.feedsExams && s.feedsExams.length > 0 && (
          <div className="mt-6 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5">
            <h2 className="text-base font-semibold text-ink-900">Where this subject takes you next</h2>
            <p className="mt-1 text-xs text-ink-600">These entrance exams build on this subject:</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {s.feedsExams.map((examCode) => {
                // 26 Sep 2026: a card links only a live exam; any other code is a plain card.
                const href = examHubHref(examCode, liveExams);
                return (
                  <li key={examCode}>
                    {href ? (
                      <Link href={href} className="block rounded-md border border-saffron-200 bg-white p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/60">
                        <p className="text-sm font-semibold text-ink-900">{examCode.replace(/_/g, " ")}</p>
                        <p className="mt-0.5 text-xs text-saffron-700">Exam page with free mock tests →</p>
                      </Link>
                    ) : (
                      <div className="block rounded-md border border-dashed border-ink-200 bg-white p-3">
                        <p className="text-sm font-semibold text-ink-900">{examCode.replace(/_/g, " ")}</p>
                        <p className="mt-0.5 text-xs text-ink-500">No exam page on Shishya yet</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <h2 className="mt-10 text-base font-semibold text-ink-900">{SUBJECT_COPY.chaptersHeading}</h2>
        {chapters.length > 0 ? (
          <>
            <p className="mt-2 text-xs text-ink-600">
              {chapters.length} chapters, as printed on the contents page of {chapterBooks.map((b) => b.title).join(" and ")}. Each chapter page links to its book on
              ncert.nic.in. Shishya&apos;s notes and practice for these chapters are not ready yet.
            </p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {chapters.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`${base}/${s.slug}/${c.slug}`}
                    className="flex h-full items-start gap-3 rounded-lg border border-ink-200 bg-white p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-saffron-100 text-xs font-bold text-saffron-800 tabular-nums">
                      {c.number}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink-900">{c.name}</span>
                      {chapterBooks.length > 1 && <span className="mt-0.5 block text-[11px] text-ink-500">{c.book.title}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-ink-300 bg-white p-6">
            <p className="text-xs text-ink-600">
              Chapter pages for this subject are not built yet. {main.length > 0 ? "The official book above lists every chapter." : "The official syllabus above lists what the subject covers."}
            </p>
          </div>
        )}
        <h2 className="mt-10 text-base font-semibold text-ink-900">{SUBJECT_COPY.otherSubjects(cls)}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {syllabus.subjects
            .filter((sib) => sib.slug !== s.slug)
            .map((sib) => (
              <li key={sib.slug}>
                <Link href={`${base}/${sib.slug}`} className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30">
                  {sib.name}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
