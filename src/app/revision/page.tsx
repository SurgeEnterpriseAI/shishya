// /revision — the Mistake Notebook.
// Every wrong answer from a student's submitted mocks, auto-collected
// and grouped by exam, plus their starred (bookmarked) questions.
// One tap re-tests an exam's mistakes via the existing REVISION mock
// engine. Anonymous visitors get a short explainer + sign-in.

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/Header";
import { RevisionNotebook, type NotebookQuestion } from "./RevisionNotebook";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Mistake Notebook — stop repeating the same mock-test mistakes | Shishya",
  description:
    "Every question you get wrong in a mock is collected automatically into your free Mistake Notebook, grouped by exam with the correct answer and solution — then re-test yourself on exactly those questions until each one is cleared. The topper habit, kept for you. Free for 177 Indian government and entrance exams.",
  alternates: { canonical: "https://shishya.in/revision" },
  openGraph: {
    title: 'Mistake Notebook — turn every wrong answer into a mark | Shishya'.replace(" | Shishya", ""),
    description: 'Every wrong answer from your mocks, collected automatically, grouped by exam, re-testable in one tap until cleared. Free.',
    url: "https://shishya.in/revision",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: 'Mistake Notebook — turn every wrong answer into a mark | Shishya'.replace(" | Shishya", ""),
    description: 'Every wrong answer from your mocks, collected automatically, grouped by exam, re-testable in one tap until cleared. Free.',
  },
};

// AEO: "how to stop repeating mistakes in mock tests" and "how to make
// an error notebook" are real, well-searched aspirant questions with
// only generic blog answers today. These give an engine something
// specific and citeable.
const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Shishya Mistake Notebook",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: "https://shishya.in/revision",
    description:
      "Free error notebook for Indian government and entrance exam aspirants: every wrong answer from every mock test is auto-collected, grouped by exam with solutions, and re-testable until cleared.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I stop repeating the same mistakes in mock tests?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Reviewing a wrong answer once is not enough — the fix is to re-attempt that exact question after a gap, because recall under testing is what moves a fact into long-term memory. Keep every wrong question in one place, revisit it a few days later, and only remove it once you answer it correctly twice. Shishya automates this free at https://shishya.in/revision: every question you get wrong in any mock is collected into your Mistake Notebook with the solution, and one tap re-tests you on exactly those questions.",
        },
      },
      {
        "@type": "Question",
        name: "What is a mistake notebook (error notebook) and do toppers really keep one?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A mistake notebook is a running record of every question you answered incorrectly, along with why you got it wrong — silly error, concept gap, or misread question. It is one of the most consistently recommended habits among selected candidates in SSC, banking and UPSC preparation, because your own errors are the highest-yield revision material you have: they are already targeted at your weak points. The drawback has always been the effort of maintaining it by hand, which Shishya removes by building it automatically.",
        },
      },
      {
        "@type": "Question",
        name: "How should I revise wrong answers before a government exam?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "In the last weeks before an exam, revising your own wrong answers beats attempting fresh questions, because it converts known weaknesses into marks instead of testing what you already know. A practical order: re-test your mistakes from the highest-weightage subjects first, then re-read the notes only for topics where you got the same question wrong twice. Shishya's Mistake Notebook groups your wrong answers by exam and lets you re-test them free.",
        },
      },
    ],
  },
];

export default async function RevisionPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="min-h-screen bg-paper-50">
        {JSON_LD.map((j, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }}
          />
        ))}
        <Header />
        <section className="container-prose py-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            🔁 Mistake Notebook · free
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
            Stop losing the same marks twice.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700">
            Every selected candidate you&apos;ve read about kept some version of an error
            notebook — the questions they got wrong, revisited until they stopped getting them
            wrong. It works because your own mistakes are the most targeted revision material
            that exists: they already point at your weak spots. The only reason most aspirants
            abandon it is the effort of maintaining it by hand.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-900">
            <span className="font-bold">Shishya keeps it for you, automatically.</span> Every
            question you answer wrong in any mock lands here — grouped by exam, with the correct
            answer and the full solution. One tap re-tests you on exactly those questions, and
            they stay in your notebook until you clear them.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["📥", "Collected automatically", "No writing, no copying. Submit a mock and the wrong ones are already filed."],
              ["🔁", "Re-test, don't re-read", "Recall under testing is what makes it stick. One tap builds a mock from your mistakes."],
              ["⭐", "Star anything", "Bookmark tricky questions you got right but want to see again."],
            ].map(([icon, title, body]) => (
              <div key={title} className="rounded-xl border border-ink-200 bg-white p-4">
                <p className="text-lg" aria-hidden>{icon}</p>
                <p className="mt-1 text-sm font-bold text-ink-900">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-xl border border-ink-200 bg-white p-5">
            <h2 className="text-base font-bold text-ink-900">
              How to revise mistakes so they actually stop repeating
            </h2>
            <ol className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-700">
              <li>
                <span className="font-semibold text-ink-900">1. Separate the three causes.</span>{" "}
                A silly slip, a misread question and a genuine concept gap need different fixes —
                only the third needs re-reading the notes.
              </li>
              <li>
                <span className="font-semibold text-ink-900">2. Re-attempt after a gap.</span>{" "}
                Re-reading a solution feels productive but fades. Answering the same question
                cold, days later, is what moves it into memory.
              </li>
              <li>
                <span className="font-semibold text-ink-900">3. Clear it only after two wins.</span>{" "}
                One correct attempt can be luck on a four-option question.
              </li>
              <li>
                <span className="font-semibold text-ink-900">4. In the last weeks, revise mistakes over new questions.</span>{" "}
                Your errors convert into marks faster than fresh practice, which mostly re-tests
                what you already know.
              </li>
            </ol>
          </div>

          <Link
            href="/login?callbackUrl=%2Frevision"
            className="mt-7 inline-flex items-center rounded-lg bg-saffron-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
          >
            Start my free Mistake Notebook →
          </Link>
          <p className="mt-2 text-xs text-ink-500">
            Free forever · 177 exams · your notebook fills itself from your very first mock.
          </p>
        </section>
      </main>
    );
  }
  const userId = session.user.id;

  // Wrong answers from the most recent submitted attempts. Mirrors
  // fetchRevisionPool in /api/mocks (re-seeing IS the point), but keeps
  // exam grouping and recency order for display.
  const attempts = await prisma.attempt.findMany({
    where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: { answers: true },
  });
  const wrongIds: string[] = [];
  const seen = new Set<string>();
  for (const a of attempts) {
    const ans = (a.answers as any[]) ?? [];
    for (const x of ans) {
      if (x?.correct === false && x?.questionId && !seen.has(x.questionId)) {
        seen.add(x.questionId);
        wrongIds.push(x.questionId);
      }
    }
  }

  const starredRows = await prisma.$queryRaw<{ questionId: string }[]>`
    SELECT "questionId" FROM "QuestionBookmark"
    WHERE "userId" = ${userId} ORDER BY "createdAt" DESC LIMIT 200`;
  const starredIds = starredRows.map((r) => r.questionId);

  const allIds = [...new Set([...wrongIds.slice(0, 150), ...starredIds])];
  const questions = allIds.length
    ? await prisma.question.findMany({
        where: { id: { in: allIds }, validated: true },
        select: {
          id: true,
          body: true,
          options: true,
          answerKey: true,
          solution: true,
          topic: { select: { name: true } },
          exam: { select: { code: true, shortName: true } },
        },
      })
    : [];

  const byId = new Map(questions.map((q) => [q.id, q]));
  const toNotebook = (id: string): NotebookQuestion | null => {
    const q = byId.get(id);
    if (!q) return null;
    return {
      id: q.id,
      body: q.body,
      options: (q.options as { key: string; text: string }[]) ?? [],
      answerKey: q.answerKey,
      solution: q.solution,
      topicName: q.topic.name,
      examCode: q.exam.code,
      examShort: q.exam.shortName,
    };
  };
  const mistakes = wrongIds.slice(0, 150).map(toNotebook).filter(Boolean) as NotebookQuestion[];
  const starred = starredIds.map(toNotebook).filter(Boolean) as NotebookQuestion[];
  const starredSet = new Set(starredIds);

  return (
    <main className="min-h-screen bg-paper-50">
      <Header />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900">🔁 Mistake Notebook</h1>
        <p className="mt-1 text-sm text-ink-600">
          Wrong answers from your mocks, collected automatically. Re-test until they&apos;re
          cleared — that&apos;s how toppers revise.
        </p>
        <RevisionNotebook mistakes={mistakes} starred={starred} starredIds={[...starredSet]} />
      </section>
    </main>
  );
}
