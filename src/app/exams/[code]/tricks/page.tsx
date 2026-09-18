// /exams/:code/tricks — memory tricks & mnemonics landing (gap-fill #5).
// "[exam] tricks" / "[exam] short tricks" are evergreen high-volume
// queries, and this is the content aspirants screenshot and forward in
// Telegram/WhatsApp groups. Data: ExamTricks (one AI-curated markdown
// block per exam, "## Subject" sections + bullet tricks). PUBLIC + cached.
//
// Cache pilot (16 Sep 2026): this page and /guide are the first exam pages
// to render statically (ISR; the effective window is 10 minutes, see
// generateStaticParams below). No cookies(), headers(), auth() or
// getT() anywhere in the render — the language comes from the URL, and the
// /hi and /te twins are src/app/(cache-pilot)/[lang]/exams/[code]/tricks.
// Because the render is cached, a failed content read THROWS (never a
// cached 404), and the mock / quiz lines follow src/lib/exam-page-gates.ts.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { NotesMarkdown } from "@/components/NotesMarkdown";
import { ShareExamButton } from "@/components/ShareExamButton";
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
    where: { code },
    select: { code: true, shortName: true, name: true },
  });
  if (!exam) return { title: "Exam tricks — Shishya" };
  const title = `${exam.shortName} Tricks & Mnemonics ${YEAR} — Short Tricks That Save Minutes | Shishya`;
  // The "free mock" sentence only where the exam has a question bank
  // (16 Sep 2026, src/lib/exam-page-gates.ts) — 12 active exams have none.
  const gates = await examPageGates(exam.code);
  const description =
    `${exam.shortName} (${exam.name}) short tricks, mnemonics and memory hacks — subject-wise, ` +
    `exam-tested, free.${gates.buildMock ? " Practice each trick immediately with a free mock." : ""}`;
  const url = `https://shishya.in/exams/${exam.code}/tricks`;
  const image = `https://shishya.in/exams/${exam.code}/opengraph-image`;
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

export default async function TricksPage({ params }: { params: Promise<{ code: string; lang?: string }> }) {
  const { code, lang } = await params;
  // The body's language is the URL's: none for /exams/…, hi / te for the
  // twins. Anything else is not a twin prefix.
  const locale = pilotPageLocale(lang);
  if (!locale) notFound();
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true, state: true },
  });
  if (!exam || !exam.active) notFound();

  // Raw SQL keeps this independent of client typegen (same reason as the
  // category-cutoff fetch): the page ships before/without a client regen.
  // No catch on this read (16 Sep 2026, cache pilot): the render is cached,
  // so a swallowed DB error would become notFound() and the 404 would be
  // stored for the whole URL, replacing a good copy. A failed read throws
  // instead — Next keeps serving the last good page and never caches the
  // failure — and notFound() is only for a read that found no tricks. That
  // 404 is stored like any render: see "What a stored copy means for a NEW
  // guide/tricks row" in src/lib/cache-pilot-routes.ts.
  // Gates (16 Sep 2026, src/lib/exam-page-gates.ts): the "free mock" line
  // and the quiz button appear only where the exam has a question bank; a
  // failed gate read keeps both (GATES_OPEN), it never throws.
  const [rows, gates] = await Promise.all([
    prisma.$queryRaw<{ content: string }[]>`
      SELECT content FROM "ExamTricks" WHERE "examId" = ${exam.id} LIMIT 1
    `,
    examPageGates(exam.code),
  ]);
  const tricksMd = rows[0]?.content;
  if (!tricksMd) notFound();
  const t = tFor(locale);

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
        <StateExamsLink state={exam.state} label={t("exam.state.more")} locale={locale} />

        <div className="mt-4">
          <ShareExamButton
            url={url}
            message={`${exam.shortName} short tricks & mnemonics — subject-wise memory hacks, free on Shishya:`}
            surface="tricks"
            exam={exam.code}
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
          {gates.buildMock && (
            <p className="mt-1 text-sm text-ink-600">
              Take a free {exam.shortName} mock right now — apply these tricks under the clock and
              see your speed jump. No signup needed to try a 5-question quiz.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/exams/${exam.code}`} className="btn-primary !py-2 !px-4 text-sm">
              Start free preparation →
            </Link>
            {gates.buildMock && (
              <Link
                href={`/exams/${exam.code}/quiz`}
                className="inline-flex items-center rounded-md border-2 border-saffron-500 bg-white px-4 py-2 text-sm font-bold text-saffron-700 hover:bg-saffron-50"
              >
                5-question quiz — no signup →
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
