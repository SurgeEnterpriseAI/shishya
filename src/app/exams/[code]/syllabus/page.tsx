// /exams/:code/syllabus — programmatic SEO landing for "[exam] syllabus" /
// "[exam] syllabus 2026 topics" queries (the other top-volume pattern we
// had no dedicated page for). Data: the Subject→Topic tree already in the
// DB, with subject weights and a link to every topic's study notes — which
// also makes this page a powerful internal-linking hub for the 3,700+
// notes pages. PUBLIC + cached.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { ShareExamButton } from "@/components/ShareExamButton";

export const revalidate = 3600;

const YEAR = new Date().getFullYear();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { code: true, shortName: true, name: true },
  });
  if (!exam) return { title: "Exam syllabus — Shishya" };
  const title = `${exam.shortName} Syllabus ${YEAR} — Complete Topic List with Free Study Notes | Shishya`;
  const description =
    `Complete ${exam.shortName} (${exam.name}) syllabus ${YEAR}: every subject and topic with weightage, ` +
    `free study notes, practice questions and mock tests for each topic. No coaching fees, in your language.`;
  const url = `https://shishya.in/exams/${exam.code}/syllabus`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${exam.shortName} syllabus ${YEAR}`,
      `${exam.shortName} syllabus topics`,
      `${exam.shortName} subject wise syllabus`,
      `${exam.shortName} syllabus with weightage`,
      `${exam.shortName} study notes`,
    ],
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SyllabusPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true },
  });
  if (!exam || !exam.active) notFound();

  const subjects = await prisma.subject.findMany({
    where: { examId: exam.id },
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
          teachingNote: { select: { id: true } },
          children: { orderBy: { orderIdx: "asc" }, select: { code: true, name: true } },
        },
      },
    },
  });
  if (subjects.length === 0) notFound();

  const topicCount = subjects.reduce(
    (a, s) => a + s.topics.reduce((b, t) => b + 1 + t.children.length, 0),
    0,
  );

  const url = `https://shishya.in/exams/${exam.code}/syllabus`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${exam.shortName} Syllabus ${YEAR} — Complete Topic List`,
    description: `Full ${exam.name} syllabus: ${subjects.length} subjects, ${topicCount} topics, each with free study notes and practice.`,
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
          The complete {exam.name} syllabus: {subjects.length} subjects, {topicCount} topics. Every
          topic links to free study notes, practice questions and topic-wise quizzes.
        </p>

        <div className="mt-4">
          <ShareExamButton
            url={url}
            message={`Complete ${exam.shortName} syllabus ${YEAR} — every topic with free study notes & practice (Shishya):`}
            surface="exam"
          />
        </div>

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
                <li key={t.code} className="rounded-md border border-ink-200 bg-white p-3">
                  {t.teachingNote ? (
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
