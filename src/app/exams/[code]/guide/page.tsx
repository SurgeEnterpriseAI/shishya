// /exams/:code/guide — the "How to crack [exam]" long-tail landing.
// Captures the biggest self-study search intents in one authoritative
// page: "how to prepare for [exam] without coaching", "[exam] study
// plan", "is [exam] tough", "[exam] salary". Data: ExamGuide (one
// AI-curated markdown doc + parsed FAQ). PUBLIC + cached.
//
// Cache pilot (16 Sep 2026): this page and /tricks are the first exam pages
// to render statically (ISR; the effective window is 10 minutes, see
// generateStaticParams below). No cookies(), headers(), auth() or
// getT() anywhere in the render — the language comes from the URL, and the
// /hi and /te twins are src/app/(cache-pilot)/[lang]/exams/[code]/guide.
// Because the render is cached, a failed content read THROWS (never a
// cached 404), and the /syllabus link, the mock line and the daily-plan
// (coach) lines follow src/lib/exam-page-gates.ts like every other exam
// surface.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { NotesMarkdown } from "@/components/NotesMarkdown";
import { ShareExamButton } from "@/components/ShareExamButton";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { CoachEntry } from "@/components/CoachEntry";
import { tFor } from "@/lib/i18n-server";
import { pilotPageLocale } from "@/lib/cache-pilot-routes";
import { examPageGates } from "@/lib/exam-page-gates";
import { StateExamsLink } from "@/components/StateExamsLink";

export const revalidate = 3600;

// Safety net (16 Sep 2026, cache pilot). Because the route is ISR, a
// request-scoped call that slips into this render tree later (cookies(),
// headers(), auth(), getT()) would not quietly make the page dynamic again:
// in production Next throws "Page changed from static to dynamic at runtime"
// — HTTP 500 on every guide and tricks URL — while `next dev` and
// `next build` stay green (nothing is rendered at build time). With
// force-static those calls return empty values instead: the render is the
// anonymous English one, it stays cacheable, and no cookie- or
// session-dependent content can ever reach the cached HTML.
// tests/unit/cache-pilot-routes.test.ts is what flags such a call.
export const dynamic = "force-static";

// Cache pilot (16 Sep 2026): a dynamic route with no generateStaticParams is
// rendered on every request, so the revalidate above never took effect and
// each hit was a full render against Neon (Cache-Control: private,
// no-store). An empty list renders each code on its first visit and serves
// it from the ISR cache (one hour at most; the page-gates read in the render
// is cached for 10 minutes and Next takes the shortest window it sees, so
// the effective window is 10 minutes). The language comes from the URL
// (the /hi and /te twins are the [lang] routes in src/app/(cache-pilot)),
// never from the cookie or the session, so the cached HTML is the same for
// every visitor — see src/lib/cache-pilot-routes.ts.
export function generateStaticParams() {
  return [];
}

const YEAR = new Date().getFullYear();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code }),
    select: { code: true, shortName: true, name: true },
  });
  if (!exam) return { title: "Exam guide — Shishya" };
  const title = `How to Prepare for ${exam.shortName} ${YEAR} — Without Coaching | Study Plan, Difficulty, Salary | Shishya`;
  const description =
    `Complete free guide to cracking ${exam.shortName} (${exam.name}): how to prepare without coaching, a realistic study plan, ` +
    `honest difficulty for an average student, and salary & career growth. 100% free on Shishya.`;
  const url = `https://shishya.in/exams/${exam.code}/guide`;
  const image = `https://shishya.in/exams/${exam.code}/opengraph-image`;
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

export default async function GuidePage({ params }: { params: Promise<{ code: string; lang?: string }> }) {
  const { code, lang } = await params;
  // The body's language is the URL's: none for /exams/…, hi / te for the
  // twins. Anything else is not a twin prefix.
  const locale = pilotPageLocale(lang);
  if (!locale) notFound();
  const exam = await prisma.exam.findUnique({
    where: realExamKey({ code }),
    select: { id: true, code: true, shortName: true, name: true, active: true, state: true },
  });
  if (!exam || !exam.active) notFound();

  // Raw SQL keeps this independent of client typegen (same pattern as
  // cutoff/tricks) — ships before/without a client regen.
  // No catch on this read (16 Sep 2026, cache pilot): the render is cached,
  // so a swallowed DB error would become notFound() and the 404 would be
  // stored for the whole URL, replacing a good copy. A failed read throws
  // instead — Next keeps serving the last good page and never caches the
  // failure — and notFound() is only for a read that found no guide. That
  // 404 is stored like any render: see "What a stored copy means for a NEW
  // guide/tricks row" in src/lib/cache-pilot-routes.ts.
  // Gates (16 Sep 2026, src/lib/exam-page-gates.ts): the /syllabus button
  // and the mock line below appear only where that page / a question bank
  // exists; a failed gate read keeps both (GATES_OPEN), it never throws.
  // The daily-plan lines (CoachEntry and the closing sentence) follow the
  // syllabus gate too: the coach builds each day from the exam's topics
  // (src/lib/coach-plan.ts), and the 12 active exams with no Subject rows
  // have none — their plan would hold nothing but the Daily-5 slot.
  const [rows, gates] = await Promise.all([
    prisma.$queryRaw<{ content: string; faq: { q: string; a: string }[] | null }[]>`
      SELECT content, faq FROM "ExamGuide" WHERE "examId" = ${exam.id} LIMIT 1
    `,
    examPageGates(exam.code),
  ]);
  const guideMd = rows[0]?.content;
  if (!guideMd) notFound();
  const t = tFor(locale);
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
        <StateExamsLink state={exam.state} label={t("exam.state.more")} locale={locale} />

        <div className="mt-4">
          <ShareExamButton
            url={url}
            message={`How to crack ${exam.shortName} without coaching — free study plan, difficulty & salary guide on Shishya:`}
            surface="guide"
            exam={exam.code}
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

        {/* Reading strategy is the easy half; the coach turns it into
            the daily execution that actually crack exams. Only where the
            exam has topics to plan from (16 Sep 2026). */}
        {gates.syllabus && <CoachEntry examCode={exam.code} examShort={exam.shortName} variant="guide" />}

        <div className="mt-8 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5">
          <p className="text-base font-bold text-ink-900">Start your {exam.shortName} prep now — free</p>
          <p className="mt-1 text-sm text-ink-600">
            {gates.buildMock
              ? "Take a free mock, get your weak topics, and follow a daily plan. No coaching fees, in your language."
              : "No coaching fees."}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/exams/${exam.code}`} className="btn-primary !py-2 !px-4 text-sm">
              Start free preparation →
            </Link>
            {gates.syllabus && (
              <Link
                href={`/exams/${exam.code}/syllabus`}
                className="inline-flex items-center rounded-md border-2 border-saffron-500 bg-white px-4 py-2 text-sm font-bold text-saffron-700 hover:bg-saffron-50"
              >
                See the full syllabus →
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
