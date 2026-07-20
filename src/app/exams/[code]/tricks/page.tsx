// /exams/:code/tricks — memory tricks & mnemonics landing (gap-fill #5).
// "[exam] tricks" / "[exam] short tricks" are evergreen high-volume
// queries, and this is the content aspirants screenshot and forward in
// Telegram/WhatsApp groups. Data: ExamTricks (one AI-curated markdown
// block per exam, "## Subject" sections + bullet tricks). PUBLIC + cached.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { NotesMarkdown } from "@/components/NotesMarkdown";
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
  if (!exam) return { title: "Exam tricks — Shishya" };
  const title = `${exam.shortName} Tricks & Mnemonics ${YEAR} — Short Tricks That Save Minutes | Shishya`;
  const description =
    `${exam.shortName} (${exam.name}) short tricks, mnemonics and memory hacks — subject-wise, ` +
    `exam-tested, free. Practice each trick immediately with a free mock.`;
  const url = `https://shishya.in/exams/${exam.code}/tricks`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${exam.shortName} tricks`,
      `${exam.shortName} short tricks`,
      `${exam.shortName} mnemonics`,
      `${exam.shortName} shortcuts`,
      `${exam.shortName} memory tricks`,
    ],
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TricksPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true },
  });
  if (!exam || !exam.active) notFound();

  // Raw SQL keeps this independent of client typegen (same reason as the
  // category-cutoff fetch): the page ships before/without a client regen.
  const rows = await prisma
    .$queryRaw<{ content: string }[]>`
      SELECT content FROM "ExamTricks" WHERE "examId" = ${exam.id} LIMIT 1
    `.catch(() => [] as { content: string }[]);
  const tricksMd = rows[0]?.content;
  if (!tricksMd) notFound();

  const url = `https://shishya.in/exams/${exam.code}/tricks`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${exam.shortName} Tricks & Mnemonics — subject-wise short tricks`,
    description: `Short tricks, mnemonics and memory hacks for ${exam.name}, organized by subject.`,
    url,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    about: [{ "@type": "Thing", name: exam.name }, { "@type": "Thing", name: `${exam.shortName} tricks` }],
    publisher: { "@type": "Organization", name: "Shishya", url: "https://shishya.in" },
    isPartOf: { "@type": "Course", name: `${exam.shortName} preparation`, url: `https://shishya.in/exams/${exam.code}` },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 3, name: "Tricks", item: url },
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
          · Tricks &amp; mnemonics
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          {exam.shortName} tricks &amp; mnemonics — save minutes on exam day
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          Subject-wise short tricks and memory hacks for {exam.name}. Each one is meant to be used
          in the exam hall — read it, then lock it in with a quick practice question.
        </p>

        <div className="mt-4">
          <ShareExamButton
            url={url}
            message={`${exam.shortName} short tricks & mnemonics — subject-wise memory hacks, free on Shishya:`}
            surface="exam"
          />
        </div>

        <article className="prose prose-sm sm:prose-base mt-6 max-w-none rounded-xl border border-ink-200 bg-white p-5 sm:p-7">
          <NotesMarkdown markdown={tricksMd} />
        </article>

        <p className="mt-3 text-xs text-ink-500">
          AI-curated from widely-used exam techniques — always sanity-check a trick on a practice
          question before relying on it in the hall.
        </p>

        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">Tricks stick when you USE them</p>
          <p className="mt-1 text-sm text-ink-600">
            Take a free {exam.shortName} mock right now — apply these tricks under the clock and
            see your speed jump. No signup needed to try a 5-question quiz.
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
