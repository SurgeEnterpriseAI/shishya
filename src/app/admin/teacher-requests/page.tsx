// /admin/teacher-requests — the manual queue for the "Talk to a real teacher"
// pilot. Session-admin gated. Read-only list during the pilot: the team acts
// on each request over email/WhatsApp (they're also emailed on arrival). Status
// management can come in a later iteration once demand is proven.

import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teacher requests — Admin", robots: { index: false } };

const STATUSES = ["PENDING", "CONTACTED", "RESOLVED", "CLOSED"] as const;

export default async function TeacherRequestsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof STATUSES)[number])
    : "ALL";

  const [rows, counts] = await Promise.all([
    prisma.teacherRequest.findMany({
      where: status === "ALL" ? {} : { status: status as any },
      take: 200,
      orderBy: { createdAt: "desc" },
    }),
    prisma.teacherRequest.groupBy({ by: ["status"], _count: true }),
  ]);
  const countBy = (s: string) => counts.find((c) => (c.status as string) === s)?._count ?? 0;
  const total = counts.reduce((a, c) => a + (c._count as number), 0);

  const fmt = (d: Date) =>
    new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const statusTone: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    CONTACTED: "bg-blue-100 text-blue-800",
    RESOLVED: "bg-emerald-100 text-emerald-800",
    CLOSED: "bg-ink-100 text-ink-600",
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900">Teacher requests</h1>
        <p className="mt-1 text-sm text-ink-600">
          Students asking to talk to a real teacher. Reach out over email / WhatsApp — you&apos;re
          also emailed on each new one. <strong>{total}</strong> total.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {[
            { key: "ALL", label: `All (${total})` },
            ...STATUSES.map((s) => ({ key: s, label: `${s[0]}${s.slice(1).toLowerCase()} (${countBy(s)})` })),
          ].map((tab) => (
            <a
              key={tab.key}
              href={`/admin/teacher-requests?status=${tab.key}`}
              className={`rounded-md px-3 py-1.5 font-medium ${
                status === tab.key
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-5 py-8 text-center text-sm text-ink-500">
            No requests yet in this view.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-lg border border-ink-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${statusTone[r.status] ?? "bg-ink-100 text-ink-600"}`}
                  >
                    {r.status}
                  </span>
                  <span>{fmt(r.createdAt)}</span>
                  <span>· from {r.surface}</span>
                  {r.examCode && <span>· {r.examCode}</span>}
                  {r.topicCode && <span>· {r.topicCode}</span>}
                  {!r.userId && <span className="text-amber-700">· guest</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-900">{r.message}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                  <span className="font-medium">{r.contactName ?? "—"}</span>
                  {r.contactEmail && (
                    <a href={`mailto:${r.contactEmail}`} className="text-indigo-700 hover:underline">
                      {r.contactEmail}
                    </a>
                  )}
                  {r.contactPhone && (
                    <a
                      href={`https://wa.me/${r.contactPhone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline"
                    >
                      WhatsApp {r.contactPhone}
                    </a>
                  )}
                  {r.attemptId && (
                    <a href={`/attempts/${r.attemptId}/results`} className="text-ink-500 hover:underline">
                      view mock
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
