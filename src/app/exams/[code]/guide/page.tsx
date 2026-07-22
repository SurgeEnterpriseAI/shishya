// /exams/:code/guide — the "How to crack [exam]" long-tail landing.
// Captures the biggest self-study search intents in one authoritative
// page: "how to prepare for [exam] without coaching", "[exam] study
// plan", "is [exam] tough", "[exam] salary". Data: ExamGuide (one
// AI-curated markdown doc + parsed FAQ). PUBLIC + cached.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { NotesMarkdown } from "@/components/NotesMarkdown";
import { ShareExamButton } from "@/components/ShareExamButton";
import { TalkToTeacher } from "@/components/TalkToTeacher";

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
  if (!exam) return { title: "Exam guide — Shishya" };
  const title = `How to Prepare for ${exam.shortName} ${YEAR} — Without Coaching | Study Plan, Difficulty, Salary | Shishya`;
  const description =
    `Complete free guide to cracking ${exam.shortName} (${exam.name}): how to prepare without coaching, a realistic study plan, ` +
    `honest difficulty for an average student, and salary & career growth. 100% free on Shishya.`;
  const url = `https://shishya.in/exams/${exam.code}/guide`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `how to prepare for ${exam.shortName}`,
      `${exam.shortName} without coaching`,
      `${exam.shortName} study plan`,
      `is ${exam.shortName} tough`,
      `${exam.shortName} salary`,
      `${exam.shortName} preparation strategy`,
    ],
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true },
  });
  if (!exam || !exam.active) notFound();

  // Raw SQL keeps this independent of client typegen (same pattern as
  // cutoff/tricks) — ships before/without a client regen.
  const rows = await prisma
    .$queryRaw<{ content: string; faq: { q: string; a: string }[] | null }[]>`
      SELECT content, faq FROM "ExamGuide" WHERE "examId" = ${exam.id} LIMIT 1
    `.catch(() => [] as { content: string; faq: { q: string; a: string }[] | null }[]);
  const guideMd = rows[0]?.content;
  if (!guideMd) notFound();
  const faq = Array.isArray(rows[0]?.faq) ? rows[0]!.faq! : [];

  const url = `https://shishya.in/exams/${exam.code}/guide`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `How to prepare for ${exam.shortName} ${YEAR} — with or without coaching`,
    description: `A complete free preparation guide for ${exam.name}: strategy, study plan, difficulty and career.`,
    url,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    about: [{ "@type": "Thing", name: exam.name }, { "@type": "Thing", name: `${exam.shortName} preparation` }],
    publisher: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
    isPartOf: { "@type": "Course", name: `${exam.shortName} preparation`, url: `https://shishya.in/exams/${exam.code}` },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 3, name: "Guide", item: url },
    ],
  };
  const faqJsonLd =
    faq.length >= 3
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.slice(0, 10).map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${exam.code}`} className="hover:text-ink-800">
            {exam.shortName}
          </Link>{" "}
          · How to crack it
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          How to crack {exam.shortName} {YEAR} — with or without coaching
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          A complete, honest guide to preparing for {exam.name}: a real self-study path, a weekly
          study plan, how tough it actually is, and what the job pays. Everything you need is free
          on Shishya — no coaching fees.
        </p>

        <div className="mt-4">
          <ShareExamButton
            url={url}
            message={`How to crack ${exam.shortName} without coaching — free study plan, difficulty & salary guide on Shishya:`}
            surface="exam"
          />
        </div>

        {/* "Can I really do this without coaching?" is the doubt this page
            answers — offer a human at that exact moment. */}
        <p className="mt-3 text-sm text-ink-600">
          Want a real person to sanity-check your plan?{" "}
          <TalkToTeacher
            surface="exam"
            examCode={exam.code}
            variant="link"
            contextLabel={`${exam.shortName} — is my self-study plan realistic?`}
            linkLabel="Ask our subject expert — free"
          />
        </p>

        <article className="prose prose-sm sm:prose-base mt-6 max-w-none rounded-xl border border-ink-200 bg-white p-5 sm:p-7">
          <NotesMarkdown markdown={guideMd} />
        </article>

        <p className="mt-3 text-xs text-ink-500">
          AI-curated guidance — pay bands and cutoffs are indicative; always confirm with the
          latest official notification.
        </p>

        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">Start your {exam.shortName} prep now — free</p>
          <p className="mt-1 text-sm text-ink-600">
            Take a free mock, get your weak topics, and follow a daily plan. No coaching fees, in
            your language.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/exams/${exam.code}`} className="btn-primary !py-2 !px-4 text-sm">
              Start free preparation →
            </Link>
            <Link
              href={`/exams/${exam.code}/syllabus`}
              className="inline-flex items-center rounded-md border-2 border-saffron-500 bg-white px-4 py-2 text-sm font-bold text-saffron-700 hover:bg-saffron-50"
            >
              See the full syllabus →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
