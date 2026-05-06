// /admin/questions/:id — single question editor.
// Server Component fetches; client component does the edit/validate actions.

import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { QuestionEditor } from "./QuestionEditor";

export default async function AdminQuestionEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");
  const { id } = await params;

  const q = await prisma.question.findUnique({
    where: { id },
    include: {
      exam: { select: { code: true, shortName: true } },
      topic: { select: { code: true, name: true, subjectId: true } },
    },
  });
  if (!q) notFound();

  // Topics in the same exam, for moving the question.
  const topics = await prisma.topic.findMany({
    where: { subject: { examId: q.examId } },
    orderBy: [{ subject: { orderIdx: "asc" } }, { orderIdx: "asc" }],
    include: { subject: { select: { name: true, code: true } } },
  });

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <p className="text-xs text-ink-500">
          <a href="/admin" className="hover:text-ink-800">Admin</a> ·{" "}
          <a href="/admin/questions" className="hover:text-ink-800">Questions</a> ·{" "}
          {q.exam.shortName} · {q.topic.name}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-ink-900">Review question</h1>

        <QuestionEditor
          initial={{
            id: q.id,
            body: q.body,
            options: q.options as { key: string; text: string }[],
            answerKey: q.answerKey,
            solution: q.solution,
            difficulty: q.difficulty,
            topicCode: q.topic.code,
            tags: q.tags,
            source: q.source,
            validated: q.validated,
            validatedBy: q.validatedBy,
          }}
          topics={topics.map((t) => ({
            code: t.code,
            name: `${t.subject.name} → ${t.name}`,
          }))}
        />
      </section>
    </main>
  );
}
