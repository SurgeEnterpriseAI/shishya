// /exams/:code/topics/:topicCode — study material for one topic.
// Server-rendered. Pulls notes (if generated) + a few practice questions
// for the topic. Falls back to a "Notes coming soon" empty state when
// notes haven't been generated yet.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ code: string; topicCode: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/exams`);
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

  const notes = (topic as any).notes as string | null;
  const notesAt = (topic as any).notesGeneratedAt as Date | null;

  return (
    <main className="min-h-screen bg-ink-50/40">
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

        {/* Notes block */}
        <article className="prose prose-sm sm:prose-base mt-8 max-w-none">
          {notes ? (
            <NotesRenderer markdown={notes} />
          ) : (
            <div className="not-prose rounded-md border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500">
              {t("topic.notes.empty")}
            </div>
          )}
        </article>

        {/* Practice CTAs */}
        {practiceQs.length > 0 && (
          <section className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-ink-900">{t("topic.practice.title")}</h2>
              <Link
                href={`/exams/${code}#mocks`}
                className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
              >
                {t("topic.practice.takeMock")} →
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {practiceQs.map((q, i) => (
                <li key={q.id} className="rounded-md border border-ink-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-500">
                    Q{i + 1} · {q.topic.name} · {q.difficulty}
                  </p>
                  <p className="mt-1 text-sm text-ink-800 line-clamp-3">{q.body}</p>
                </li>
              ))}
            </ul>
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
