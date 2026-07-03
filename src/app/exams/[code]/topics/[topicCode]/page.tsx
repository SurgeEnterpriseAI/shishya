// /exams/:code/topics/:topicCode — study material for one topic.
//
// PUBLIC: indexable by search engines so queries like "Number System for
// RRB NTPC" or "Indian History for UPSC" land directly on rich study
// notes. Practice questions + Ask Shishya remain interactive — they
// route through /login if the visitor isn't authenticated.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { findTranslations } from "@/lib/db/questionTranslations";
import { ShareExamButton } from "@/components/ShareExamButton";
import { TopicQuizButton } from "./TopicQuizButton";

// Public SEO page; data barely changes (notes regen weekly via cron).
// Revalidate every 10 min so a content update propagates without
// rebuilding, while still letting the CDN/data-cache serve the bulk of
// requests instantly.
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string; topicCode: string }>;
}): Promise<Metadata> {
  const { code, topicCode } = await params;
  const [exam, topic] = await Promise.all([
    prisma.exam.findUnique({
      where: { code },
      select: { code: true, shortName: true, name: true },
    }),
    prisma.topic.findFirst({
      where: { code: topicCode, subject: { exam: { code } } },
      select: { name: true, description: true, code: true },
    }),
  ]);
  if (!exam || !topic) return { title: "Topic not found — Shishya" };
  const title = `${topic.name} for ${exam.shortName} — Notes, Practice & Study Help | Shishya`;
  const description =
    `Free ${topic.name} study notes for ${exam.shortName} preparation. ` +
    `Concepts, formulas, common mistakes, practice questions, and Ask Shishya ` +
    `when you need help on this topic. ${topic.description ?? ""}`.slice(0, 300);
  const url = `https://shishya.in/exams/${exam.code}/topics/${topic.code}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      `${topic.name} ${exam.shortName}`,
      `${topic.name} notes`,
      `${topic.name} formulas`,
      `${topic.name} practice questions`,
      `${exam.shortName} ${topic.name} preparation`,
      `${exam.shortName} ${topic.name} pyq`,
    ],
    openGraph: {
      title,
      description,
      url,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ code: string; topicCode: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { code, topicCode } = await params;
  const { t } = await getT();

  const exam = await prisma.exam.findUnique({ where: { code } });
  if (!exam) notFound();

  const topic = await prisma.topic.findFirst({
    where: { code: topicCode, subject: { examId: exam.id } },
    include: {
      subject: { select: { code: true, name: true } },
      parent: { select: { code: true, name: true } },
      children: { select: { code: true, name: true, description: true }, orderBy: { orderIdx: "asc" } },
    },
  });
  if (!topic) notFound();

  // A handful of practice questions on this topic + its sub-topics, so
  // students can try a question right after reading. Validated only.
  const childRows = await prisma.topic.findMany({
    where: { parentId: topic.id },
    select: { id: true },
  });
  const topicIdsForPractice = [topic.id, ...childRows.map((c) => c.id)];
  const practiceQs = await prisma.question.findMany({
    where: { validated: true, topicId: { in: topicIdsForPractice } },
    take: 5,
    orderBy: { id: "asc" },
    select: { id: true, body: true, difficulty: true, topic: { select: { name: true } } },
  });

  // Server-side translation lookup: if the visitor is on a non-English
  // locale AND we already have cached translations for these previews,
  // surface them. We never trigger a fresh Anthropic call here — that's
  // reserved for the actual mock-taking flow where the wait is acceptable.
  const { locale } = await getT();
  let translatedPreview = new Map<string, { body: string }>();
  if (locale !== "en" && practiceQs.length > 0) {
    const cached = await findTranslations(practiceQs.map((q) => q.id), locale);
    translatedPreview = new Map(
      [...cached.entries()].map(([qid, t]) => [qid, { body: t.body }]),
    );
  }

  const notes = (topic as any).notes as string | null;
  const notesAt = (topic as any).notesGeneratedAt as Date | null;
  const url = `https://shishya.in/exams/${exam.code}/topics/${topic.code}`;

  // Structured data — only when real notes exist, so a stub topic never
  // claims to be a published article. Article+LearningResource makes the
  // study notes eligible for Google rich results AND machine-parseable for
  // answer engines (ChatGPT / Perplexity) that cite Shishya. BreadcrumbList
  // gives crawlers the exam→topic hierarchy.
  const articleJsonLd = notes
    ? {
        "@context": "https://schema.org",
        "@type": ["Article", "LearningResource"],
        headline: `${topic.name} — Study Notes for ${exam.shortName}`,
        name: topic.name,
        description:
          topic.description ??
          `Free study notes on ${topic.name} for ${exam.shortName} preparation.`,
        url,
        inLanguage: "en-IN",
        isAccessibleForFree: true,
        learningResourceType: "Study notes",
        educationalLevel: "Competitive exam preparation",
        teaches: topic.name,
        about: [
          { "@type": "Thing", name: topic.name },
          { "@type": "Thing", name: exam.name },
        ],
        wordCount: notes.split(/\s+/).filter(Boolean).length,
        ...(notesAt
          ? { datePublished: notesAt.toISOString(), dateModified: notesAt.toISOString() }
          : {}),
        author: { "@type": "Organization", name: "Shishya", url: "https://shishya.in" },
        publisher: { "@type": "Organization", name: "Shishya", url: "https://shishya.in" },
        isPartOf: {
          "@type": "Course",
          name: `${exam.shortName} preparation`,
          url: `https://shishya.in/exams/${exam.code}`,
        },
      }
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Exams", item: "https://shishya.in/exams" },
      {
        "@type": "ListItem",
        position: 3,
        name: exam.shortName,
        item: `https://shishya.in/exams/${exam.code}`,
      },
      { "@type": "ListItem", position: 4, name: topic.name, item: url },
    ],
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        {/* Breadcrumb */}
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${code}`} className="hover:text-ink-800">{exam.shortName}</Link>
          {" · "}
          <Link href={`/exams/${code}#syllabus`} className="hover:text-ink-800">{topic.subject.name}</Link>
          {topic.parent && (
            <>
              {" · "}
              <Link href={`/exams/${code}/topics/${topic.parent.code}`} className="hover:text-ink-800">{topic.parent.name}</Link>
            </>
          )}
        </p>

        {/* Title + meta */}
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{topic.name}</h1>
        {topic.description && (
          <p className="mt-2 max-w-3xl text-sm text-ink-600 sm:text-base">{topic.description}</p>
        )}

        {/* Share — only when there are real notes worth forwarding to a
            study group. Skips the empty-state to avoid sharing a stub. */}
        {notes && (
          <div className="mt-4">
            <ShareExamButton
              url={`https://shishya.in/exams/${code}/topics/${topic.code}`}
              message={`${topic.name} (${exam.shortName}) — free study notes, formulas & practice on Shishya:`}
              surface="topic"
            />
          </div>
        )}

        {/* Sub-topic chips */}
        {topic.children.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {topic.children.map((c) => (
              <Link
                key={c.code}
                href={`/exams/${code}/topics/${c.code}`}
                className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400 hover:text-saffron-700"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Growth levers #1 + #2 — convert SEO note-readers into the mock
            loop before they bounce (~20s dwell). Signed-in readers get a real
            persisted TOPIC mock (one tap); signed-out readers get the
            anonymous taste quiz (no login) which converts on its results
            screen. Only shown when the topic actually has questions. */}
        {practiceQs.length >= 1 &&
          (userId ? (
            <TopicQuizButton
              examCode={code}
              topicCode={topic.code}
              topicName={topic.name}
              examShort={exam.shortName}
            />
          ) : (
            <div className="mt-5 rounded-lg border border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink-900">Test yourself on {topic.name}</p>
                  <p className="mt-0.5 text-xs text-ink-600">
                    5 real {exam.shortName} questions with instant answers — no signup, ~3 minutes.
                  </p>
                </div>
                <Link
                  href={`/exams/${code}/topics/${topic.code}/quiz`}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
                >
                  Take the 5-question quiz →
                </Link>
              </div>
            </div>
          ))}

        {/* ── Study material (primary content) ──────────────────────── */}
        {notes ? (
          <article className="prose prose-sm sm:prose-base mt-8 max-w-none">
            <NotesRenderer markdown={notes} />
          </article>
        ) : (
          <div className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-5 py-6">
            <p className="text-sm font-medium text-ink-800">{t("topic.notes.empty.headline")}</p>
            <p className="mt-1 text-sm text-ink-600">{t("topic.notes.empty.body")}</p>
            <Link
              href={`/chat?examCode=${code}&topicCode=${encodeURIComponent(topic.code)}&seed=${encodeURIComponent(`Teach me ${topic.name} for ${exam.shortName} — concepts, formulas, common mistakes, and a few examples.`)}`}
              className="btn-primary mt-4 !py-2 !px-4 text-xs sm:text-sm"
            >
              {t("topic.notes.empty.cta")}
            </Link>
          </div>
        )}

        {/* ── Ask Shishya for more (always shown — the closed loop) ── */}
        <section className="mt-10 rounded-md border border-saffron-200 bg-saffron-50/60 p-5">
          <h2 className="text-base font-semibold text-ink-900">{t("topic.shishya.title")}</h2>
          <p className="mt-1 text-sm text-ink-600">{t("topic.shishya.body")}</p>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([
              ["topic.shishya.prompt.deeper", `Go deeper on ${topic.name} for ${exam.shortName} — examples and edge cases I should know.`],
              ["topic.shishya.prompt.shortcuts", `Give me 3 fastest shortcuts to solve ${topic.name} questions in the exam.`],
              ["topic.shishya.prompt.mistakes", `What are the most common mistakes students make on ${topic.name}? How do I avoid them?`],
              ["topic.shishya.prompt.quiz",   `Quiz me on ${topic.name} — start with one easy question, then go harder based on how I answer.`],
            ] as const).map(([key, q]) => (
              <li key={key}>
                <Link
                  href={`/chat?examCode=${code}&topicCode=${encodeURIComponent(topic.code)}&seed=${encodeURIComponent(q)}`}
                  className="block rounded-md border border-ink-200 bg-white p-3 text-sm text-ink-800 hover:border-saffron-400 hover:bg-white"
                >
                  <span className="block font-medium">{t(key)}</span>
                  <span className="mt-1 block text-xs text-ink-500">{q}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/chat?examCode=${code}&topicCode=${encodeURIComponent(topic.code)}&seed=${encodeURIComponent(`I'm studying ${topic.name} for ${exam.shortName}. Be my tutor for this topic.`)}`}
            className="btn-primary mt-4 !py-2 !px-4 text-sm"
          >
            {t("topic.shishya.openChat")}
          </Link>
        </section>

        {/* ── Practice questions (secondary, collapsed-feel) ────────── */}
        {practiceQs.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-ink-700">{t("topic.practice.title")}</h2>
              <Link
                href={`/exams/${code}#mocks`}
                className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
              >
                {t("topic.practice.takeMock")} →
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {practiceQs.map((q, i) => {
                const body = translatedPreview.get(q.id)?.body ?? q.body;
                return (
                  <li key={q.id} className="rounded-md border border-ink-200 bg-white p-3">
                    <p className="text-xs uppercase tracking-wide text-ink-500">
                      Q{i + 1} · {q.topic.name} · {q.difficulty}
                    </p>
                    <p className="mt-1 text-sm text-ink-800 line-clamp-3">{body}</p>
                  </li>
                );
              })}
            </ul>
            {/* Stuck on a preview question? Send them straight to the tutor
                scoped to this topic — the highest-intent "explain this" moment.
                prefetch=false to avoid re-inflating CHAT_OPENED. */}
            <Link
              href={`/chat?examCode=${code}&topicCode=${encodeURIComponent(topic.code)}&seed=${encodeURIComponent(
                `Walk me through these ${topic.name} practice questions for ${exam.shortName} one at a time — let me try first, then explain where I go wrong.`,
              )}`}
              prefetch={false}
              className="mt-3 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
            >
              Ask Shishya to explain these →
            </Link>
          </section>
        )}

        {/* Footer meta */}
        {notes && notesAt && (
          <p className="mt-10 text-xs text-ink-400">
            {t("topic.notes.generatedOn")} {notesAt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        )}
      </section>
    </main>
  );
}

/**
 * Tiny markdown → HTML renderer. We intentionally avoid a full markdown
 * library to keep bundle size low — the notes follow a fixed structure
 * (## heading lines + - bullets + paragraphs), so a 30-line renderer is
 * enough. Upgrade to react-markdown if richer formatting is needed later.
 */
function NotesRenderer({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let buf: string[] = [];
  let inList = false;
  const flushPara = () => {
    if (buf.length === 0) return;
    out.push(<p key={`p-${out.length}`}>{buf.join(" ")}</p>);
    buf = [];
  };
  const flushList = () => {
    if (!inList) return;
    out.push(<ul key={`ul-${out.length}`} className="list-disc pl-5">{listBuf}</ul>);
    listBuf = [] as React.ReactNode[];
    inList = false;
  };
  let listBuf: React.ReactNode[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (line.startsWith("## ")) {
      flushPara(); flushList();
      out.push(<h2 key={`h2-${out.length}`}>{line.slice(3)}</h2>);
      continue;
    }
    if (line.startsWith("# ")) {
      flushPara(); flushList();
      out.push(<h1 key={`h1-${out.length}`}>{line.slice(2)}</h1>);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      inList = true;
      listBuf.push(<li key={`li-${listBuf.length}`}>{line.replace(/^[-*]\s+/, "")}</li>);
      continue;
    }
    flushList();
    buf.push(line);
  }
  flushPara(); flushList();
  return <>{out}</>;
}
