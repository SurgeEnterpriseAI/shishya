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
  title: "Mistake Notebook — re-test every question you got wrong | Shishya",
  description:
    "Shishya auto-collects every question you answer wrong across mock tests into a free Mistake Notebook. Review them, star questions to save, and re-test until they're cleared.",
};

export default async function RevisionPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="min-h-screen bg-paper-50">
        <Header />
        <section className="container-prose py-14 text-center">
          <p className="text-4xl" aria-hidden>
            🔁
          </p>
          <h1 className="mt-3 text-2xl font-bold text-ink-900">Your Mistake Notebook</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-600">
            Every question you get wrong in any mock is collected here automatically — grouped
            by exam, with the correct answer and solution. Re-test yourself on exactly those
            questions until every one is cleared. Toppers keep a mistake notebook; Shishya
            keeps it for you. Free, like everything here.
          </p>
          <Link
            href="/login?callbackUrl=%2Frevision"
            className="mt-6 inline-flex items-center rounded-lg bg-saffron-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
          >
            Sign in free to see yours →
          </Link>
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
