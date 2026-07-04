// /admin/teaching-notes — internal admin UI to review AI-generated topic
// teaching notes and mark each "validated" or "needs review" (Crack Path
// Task 1, Gemini-required admin interface). Session-admin gated; the
// client buttons consume POST /api/admin/topics/:id/notes-review.

import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";
import { NotesReviewClient } from "./NotesReviewClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teaching-note review — Admin", robots: { index: false } };

export default async function TeachingNotesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const sp = await searchParams;
  const status = sp.status === "validated" ? "validated" : sp.status === "all" ? "all" : "needs_review";
  // Filter on the TopicTeachingNote 1:1 relation. A note row always has
  // content, so `teachingNote: { isNot: null }` == "has notes".
  const where = {
    teachingNote:
      status === "needs_review"
        ? { validatedAt: null }
        : status === "validated"
          ? { validatedAt: { not: null } }
          : { isNot: null },
  } as const;

  const [topics, needsReview, validated] = await Promise.all([
    prisma.topic.findMany({
      where,
      take: 100,
      orderBy: [{ orderIdx: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        teachingNote: { select: { content: true, validatedAt: true } },
        subject: { select: { name: true, exam: { select: { shortName: true } } } },
      },
    }),
    prisma.topic.count({ where: { teachingNote: { validatedAt: null } } }),
    prisma.topic.count({ where: { teachingNote: { validatedAt: { not: null } } } }),
  ]);

  const items = topics.map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    subject: t.subject?.name ?? "",
    exam: t.subject?.exam?.shortName ?? "",
    preview: (t.teachingNote?.content ?? "").slice(0, 900),
    validated: Boolean(t.teachingNote?.validatedAt),
  }));

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900">Teaching-note review</h1>
        <p className="mt-1 text-sm text-ink-600">
          Review AI-generated topic notes. Mark each <strong>Validated</strong> or send back to{" "}
          <strong>Needs review</strong>.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {[
            { key: "needs_review", label: `Needs review (${needsReview})` },
            { key: "validated", label: `Validated (${validated})` },
            { key: "all", label: "All" },
          ].map((tab) => (
            <a
              key={tab.key}
              href={`/admin/teaching-notes?status=${tab.key}`}
              className={`rounded-md px-3 py-1.5 font-medium ${
                status === tab.key ? "bg-saffron-500 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>

        <NotesReviewClient items={items} />
      </section>
    </main>
  );
}
