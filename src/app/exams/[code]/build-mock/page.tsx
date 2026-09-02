// /exams/:code/build-mock — the custom mock builder (1 Sep 2026).
//
// Straight from mined demand (/admin/demand): students literally typed
// "create a mock test for me in which (maths - number system and ratio
// & proportion), Polity(...)" and "I want topic wise mock test like,
// today india polity" into the tutor. This page is that sentence as a
// form: pick topics → pick size → pick difficulty → attempt in the
// normal player (which already translates into Hindi + 12 more
// languages on demand).
//
// Deliberately NOT in the sitemap while the Google suppression
// recovery runs (no new mass URL families) — discovery is via the exam
// hub, results page and llms.txt.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { getExamTheme } from "@/lib/exam-theme";
import { BuilderForm } from "./BuilderForm";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({ where: { code }, select: { shortName: true, name: true } });
  if (!exam) return { title: "Build a mock — Shishya" };
  const title = `${exam.shortName} topic-wise mock test builder — pick your topics, free | Shishya`;
  const description = `Build your own ${exam.name} mock: choose exact topics (polity, number system, anything), size and difficulty. Instant scoring, solutions, Hindi + 12 languages. Free.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/exams/${code}/build-mock` },
    openGraph: { title, description, url: `https://shishya.in/exams/${code}/build-mock`, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default async function BuildMockPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ topics?: string }>;
}) {
  const [{ code }, sp, session] = await Promise.all([params, searchParams, auth().catch(() => null)]);
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true, category: true, durationMin: true, totalQuestions: true },
  });
  if (!exam || !exam.active) notFound();

  // Subjects → topics with validated-question counts. Topics under 3
  // questions are hidden — a 2-question "topic mock" reads as broken.
  const rows = await prisma.$queryRaw<
    { sname: string; sweight: number | null; tid: string; tcode: string; tname: string; n: bigint }[]
  >`
    SELECT s.name sname, s.weight sweight, t.id tid, t.code tcode, t.name tname, COUNT(q.id) n
    FROM "Subject" s
    JOIN "Topic" t ON t."subjectId" = s.id
    JOIN "Question" q ON q."topicId" = t.id AND q.validated = TRUE
    WHERE s."examId" = ${exam.id}
    GROUP BY 1, 2, 3, 4, 5
    HAVING COUNT(q.id) >= 3
    ORDER BY s.weight DESC NULLS LAST, s.name, COUNT(q.id) DESC`.catch(() => []);

  const theme = getExamTheme(exam.category);
  const subjects = new Map<string, { name: string; topics: { id: string; code: string; name: string; n: number }[] }>();
  for (const r of rows) {
    const s = subjects.get(r.sname) ?? { name: r.sname, topics: [] };
    s.topics.push({ id: r.tid, code: r.tcode, name: r.tname, n: Number(r.n) });
    subjects.set(r.sname, s);
  }
  // Preselect from ?topics=code1,code2 (results page passes the
  // student's weakest topic codes).
  const pre = (sp.topics ?? "").split(",").filter(Boolean);
  const preIds = rows.filter((r) => pre.includes(r.tcode)).map((r) => r.tid);

  // Structured data: a free educational web app scoped to this exam, plus
  // breadcrumbs. Topic names are listed so answer engines can match
  // "[exam] [topic] mock test" queries to this page.
  const pageUrl = `https://shishya.in/exams/${exam.code}/build-mock`;
  const topicNames = [...subjects.values()].flatMap((s) => s.topics.map((t) => t.name));
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${exam.shortName} topic-wise mock test builder`,
      url: pageUrl,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      inLanguage: ["en-IN", "hi-IN", "te-IN"],
      description: `Build a custom ${exam.name} mock from any of ${topicNames.length} syllabus topics — 10, 25 or 50 questions, mixed/easy/hard, timed to the real exam, scored with solutions.`,
      about: { "@type": "Course", name: exam.name, url: `https://shishya.in/exams/${exam.code}` },
      featureList: topicNames.slice(0, 40),
      publisher: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
        { "@type": "ListItem", position: 2, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
        { "@type": "ListItem", position: 3, name: "Build your own mock", item: pageUrl },
      ],
    },
  ];
  const jsonLdText = (d: object) =>
    JSON.stringify(d).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

  return (
    <main className={`min-h-screen ${theme.pageBg}`}>
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(d) }} />
      ))}
      <div className={`h-1.5 w-full ${theme.ribbon}`} aria-hidden />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${exam.code}`} className="hover:text-ink-800">{exam.shortName}</Link> · Build your own mock
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          Build your own {exam.shortName} mock
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          Pick exactly the topics you want — today polity, tomorrow number system — choose the size and
          difficulty, and attempt it like any mock: timed, scored, full solutions, weak-topic analysis.
          Questions can be read in Hindi and 12 other languages inside the test.
        </p>

        {subjects.size === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500">
            This exam&apos;s topic-tagged question bank is still being built — try the{" "}
            <Link href={`/exams/${exam.code}`} className="font-medium text-saffron-700 hover:underline">full mocks</Link>{" "}
            meanwhile.
          </p>
        ) : (
          <BuilderForm
            examCode={exam.code}
            subjects={[...subjects.values()]}
            preselected={preIds}
            signedIn={!!session?.user?.id}
          />
        )}
      </section>
    </main>
  );
}
