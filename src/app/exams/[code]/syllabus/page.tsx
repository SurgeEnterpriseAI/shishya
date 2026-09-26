// /exams/:code/syllabus — programmatic SEO landing for "[exam] syllabus" /
// "[exam] syllabus 2026 topics" queries (the other top-volume pattern we
// had no dedicated page for). Data: the Subject→Topic tree already in the
// DB, with subject weights and a link to every topic's study notes — which
// also makes this page a powerful internal-linking hub for the 3,700+
// notes pages. PUBLIC + cached.
//
// 16 Sep 2026: only topics WITH notes are links (hasUsableNotes), and the
// title, description, intro, JSON-LD and share text say "study notes" only
// when at least one topic here links to them — 127 of the 168 exams with a
// syllabus had no notes while the title promised "Free Study Notes" (MP_RAEO,
// KA_KSRP). "Topic-wise mock tests" only when the builder has a topic
// (src/lib/exam-page-gates.ts). The no-notes title says "with Weightage"
// only when a subject weightage is printed. Copy: src/lib/page-gates-copy.ts.

import { hasUsableNotes } from "@/lib/topic-notes";
import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { StateExamsLink } from "@/components/StateExamsLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { ShareExamButton } from "@/components/ShareExamButton";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { SyllabusProgress } from "./SyllabusProgress";
import { CoachEntry } from "@/components/CoachEntry";
import { examPageGates } from "@/lib/exam-page-gates";
import { syllabusPageCopy } from "@/lib/page-gates-copy";

export const revalidate = 3600;

const YEAR = new Date().getFullYear();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code }),
    select: { id: true, code: true, shortName: true, name: true },
  });
  if (!exam) return { title: "Exam syllabus — Shishya" };
  const [tree, gates] = await Promise.all([loadSyllabusTree(exam.id), examPageGates(exam.code)]);
  const { title, description, keywords } = syllabusPageCopy({
    examShort: exam.shortName,
    examName: exam.name,
    year: YEAR,
    ...syllabusCounts(tree),
    buildMock: gates.buildMock,
  });
  const url = `https://shishya.in/exams/${exam.code}/syllabus`;
  const image = `https://shishya.in/exams/${exam.code}/opengraph-image`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords,
    // Explicit og:image — a child segment's openGraph block replaces the
    // parent's, so /exams/[code]/opengraph-image was not inherited here.
    openGraph: {
      title,
      description,
      url,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
      images: [{ url: image, width: 1200, height: 630, alt: `${exam.shortName} — Shishya` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

// Subject → top-level topics (with notes content for the link rule) →
// sub-topic names. Shared by generateMetadata and the page.
function loadSyllabusTree(examId: string) {
  return prisma.subject.findMany({
    where: { examId },
    orderBy: { orderIdx: "asc" },
    select: {
      code: true,
      name: true,
      weight: true,
      topics: {
        where: { parentId: null },
        orderBy: { orderIdx: "asc" },
        select: {
          code: true,
          name: true,
          teachingNote: { select: { content: true } },
          children: { orderBy: { orderIdx: "asc" }, select: { code: true, name: true } },
        },
      },
    },
  });
}

function syllabusCounts(subjects: Awaited<ReturnType<typeof loadSyllabusTree>>) {
  return {
    subjects: subjects.length,
    topicCount: subjects.reduce((a, s) => a + s.topics.reduce((b, t) => b + 1 + t.children.length, 0), 0),
    linkedTopics: subjects.reduce((a, s) => a + s.topics.filter((t) => hasUsableNotes(t.teachingNote?.content)).length, 0),
    // The page prints "weightage ×N" only for weight > 1 (below).
    weightageShown: subjects.some((s) => s.weight > 1),
  };
}

export default async function SyllabusPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code }),
    select: { id: true, code: true, shortName: true, name: true, active: true, state: true },
  });
  if (!exam || !exam.active) notFound();

  const [subjects, gates] = await Promise.all([loadSyllabusTree(exam.id), examPageGates(exam.code)]);
  if (subjects.length === 0) notFound();
  const { t: tr, locale } = await getT();

  const counts = syllabusCounts(subjects);
  const topicCount = counts.topicCount;
  const copy = syllabusPageCopy({ examShort: exam.shortName, examName: exam.name, year: YEAR, ...counts, buildMock: gates.buildMock });

  const url = `https://shishya.in/exams/${exam.code}/syllabus`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${exam.shortName} Syllabus ${YEAR} — Complete Topic List`,
    description: copy.jsonLdDescription,
    url,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    about: [{ "@type": "Thing", name: exam.name }, { "@type": "Thing", name: `${exam.shortName} syllabus` }],
    publisher: { "@type": "Organization", name: "Shishya", url: "https://shishya.in" },
    isPartOf: { "@type": "Course", name: `${exam.shortName} preparation`, url: `https://shishya.in/exams/${exam.code}` },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 3, name: "Syllabus", item: url },
    ],
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${exam.code}`} className="hover:text-ink-800">
            {exam.shortName}
          </Link>{" "}
          · Syllabus
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          {exam.shortName} Syllabus {YEAR} — every subject &amp; topic
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          {copy.intro}
          {gates.buildMock && (
            <>
              {" "}
              <Link href={`/exams/${exam.code}/build-mock`} className="font-medium text-saffron-700 hover:underline">
                Practise by topic in a topic-wise mock →
              </Link>
            </>
          )}
        </p>
        <StateExamsLink state={exam.state} label={tr("exam.state.more")} locale={locale} />

        <div className="mt-4">
          <ShareExamButton
            url={url}
            message={copy.shareMessage}
            surface="syllabus"
            exam={exam.code}
          />
        </div>

        {/* Syllabus overwhelm ("where do I even start?") is a classic
            drop-off moment — offer the human option right here. */}
        <p className="mt-3 text-sm text-ink-600">
          Syllabus feels overwhelming?{" "}
          <TalkToTeacher
            surface="exam"
            examCode={exam.code}
            variant="link"
            contextLabel={`${exam.shortName} syllabus — where should I start?`}
            linkLabel="Ask our subject expert where to start — free"
          />
        </p>

        {/* Signed-in overlay: per-topic checkmarks + progress summary
            (progressive enhancement; ISR + SEO untouched). */}
        <SyllabusProgress examCode={exam.code} totalTopics={topicCount} />

        {/* Coach entry — peak intent: the student is looking at the
            whole syllabus and wondering how to get through it. */}
        <CoachEntry examCode={exam.code} examShort={exam.shortName} variant="syllabus" />

        {subjects.map((s) => (
          <section key={s.code} className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-ink-900">{s.name}</h2>
              {s.weight > 1 && (
                <span className="text-xs text-ink-500">weightage ×{s.weight}</span>
              )}
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {s.topics.map((t) => (
                <li key={t.code} data-syllabus-topic={t.code} className="rounded-md border border-ink-200 bg-white p-3">
                  {hasUsableNotes(t.teachingNote?.content) ? (
                    <Link
                      href={`/exams/${exam.code}/topics/${t.code}`}
                      className="text-sm font-medium text-ink-900 hover:text-saffron-700 hover:underline"
                    >
                      {t.name} →
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-ink-900">{t.name}</span>
                  )}
                  {t.children.length > 0 && (
                    <p className="mt-1 text-xs leading-relaxed text-ink-500">
                      {t.children.map((c) => c.name).join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="mt-10 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">
            Don&apos;t just read the syllabus — find out which topics YOU need
          </p>
          <p className="mt-1 text-sm text-ink-600">
            A free {exam.shortName} diagnostic mock maps your weak topics against this exact
            syllabus in ~10 minutes.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/exams/${exam.code}`} className="btn-primary !py-2 !px-4 text-sm">
              Start free preparation →
            </Link>
            <Link
              href={`/exams/${exam.code}/quiz`}
              className="inline-flex items-center rounded-md border-2 border-saffron-500 bg-white px-4 py-2 text-sm font-bold text-saffron-700 hover:bg-saffron-50"
            >
              5-question quiz — no signup →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
