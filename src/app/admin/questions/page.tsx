// /admin/questions — list of questions with filters + click-to-review.
// Server Component for fast paint; filters are URL-driven.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";
import { BulkValidateButton } from "./BulkValidateButton";

interface SearchParams {
  examCode?: string;
  topicCode?: string;
  source?: string;
  validated?: string;
  q?: string;
  page?: string;
}

const PAGE_SIZE = 25;

export default async function AdminQuestionList({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");
  const sp = await searchParams;

  const where: any = {};
  if (sp.examCode) where.exam = { code: sp.examCode };
  if (sp.topicCode) where.topic = { code: sp.topicCode };
  if (sp.source) where.source = sp.source;
  if (sp.validated === "true") where.validated = true;
  if (sp.validated === "false") where.validated = false;
  if (sp.q) where.body = { contains: sp.q, mode: "insensitive" };

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const [items, total, exams, unvalidatedCount] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        exam: { select: { code: true, shortName: true } },
        topic: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.question.count({ where }),
    prisma.exam.findMany({ select: { code: true, shortName: true }, orderBy: { code: "asc" } }),
    // Count of unvalidated rows matching the same filter (for bulk-validate button)
    prisma.question.count({ where: { ...where, validated: false } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (overrides: Partial<SearchParams> = {}) => {
    const params = new URLSearchParams();
    const merged = { ...sp, ...overrides } as Record<string, string | undefined>;
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/admin/questions${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs text-ink-500">
              <Link href="/admin" className="hover:text-ink-800">Admin</Link> · Questions
            </p>
            <h1 className="text-xl font-semibold text-ink-900">
              {total.toLocaleString("en-IN")} questions
              {unvalidatedCount > 0 && (
                <span className="ml-2 text-sm font-normal text-amber-700">
                  ({unvalidatedCount.toLocaleString("en-IN")} pending)
                </span>
              )}
            </h1>
          </div>
          <BulkValidateButton
            filter={{
              examCode: sp.examCode,
              topicCode: sp.topicCode,
              source: sp.source,
              q: sp.q,
            }}
            unvalidatedCount={unvalidatedCount}
          />
        </div>

        {/* Filters */}
        <form className="mt-5 flex flex-wrap gap-2" method="get">
          <select
            name="examCode"
            defaultValue={sp.examCode ?? ""}
            className="rounded-md border border-ink-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">All exams</option>
            {exams.map((e) => (
              <option key={e.code} value={e.code}>{e.shortName}</option>
            ))}
          </select>
          <select
            name="validated"
            defaultValue={sp.validated ?? ""}
            className="rounded-md border border-ink-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Any status</option>
            <option value="false">Not validated</option>
            <option value="true">Validated</option>
          </select>
          <select
            name="source"
            defaultValue={sp.source ?? ""}
            className="rounded-md border border-ink-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Any source</option>
            <option value="AI_GENERATED">AI-generated (pending)</option>
            <option value="AI_VALIDATED">AI + SME-validated</option>
            <option value="SME">SME-authored</option>
            <option value="PYQ">Previous-year question</option>
          </select>
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search body…"
            className="flex-1 min-w-[160px] rounded-md border border-ink-300 bg-white px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded-md bg-ink-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-ink-700">
            Apply
          </button>
        </form>

        {/* Table */}
        <ul className="mt-6 divide-y divide-ink-200 overflow-hidden rounded-md border border-ink-200 bg-white">
          {items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-ink-500">
              No questions match these filters.
            </li>
          )}
          {items.map((q) => (
            <li key={q.id}>
              <Link
                href={`/admin/questions/${q.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-ink-50/50"
              >
                <StatusDot validated={q.validated} source={q.source} tags={q.tags} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-ink-800">{q.body}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {q.exam.shortName} · {q.topic.name} · {q.difficulty} · {q.source}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildHref({ page: String(page - 1) })} className="rounded-md border border-ink-300 px-3 py-1.5 hover:bg-ink-50">
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildHref({ page: String(page + 1) })} className="rounded-md border border-ink-300 px-3 py-1.5 hover:bg-ink-50">
                Next →
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusDot({
  validated,
  source,
  tags,
}: {
  validated: boolean;
  source: string;
  tags: string[];
}) {
  const isRejected = tags.includes("rejected");
  const colour = isRejected
    ? "bg-rose-500"
    : validated
    ? "bg-emerald-500"
    : source === "AI_GENERATED"
    ? "bg-amber-500"
    : "bg-ink-400";
  return <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${colour}`} />;
}
