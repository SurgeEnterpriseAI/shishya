// /admin/mentors — review mentor applications. Session-admin gated.
// Raw SQL: generated client predates MentorApplication.

import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";
import { MentorActions } from "./MentorActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mentor applications — Admin", robots: { index: false } };

interface Row {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  examCode: string;
  clearedYear: string | null;
  credential: string;
  languages: string | null;
  city: string | null;
  why: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: Date;
}

export default async function MentorsAdminPage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT id, name, phone, email, "examCode", "clearedYear", credential,
           languages, city, why, status, "adminNotes", "createdAt"
    FROM "MentorApplication"
    ORDER BY CASE status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END, "createdAt" DESC
    LIMIT 200
  `;
  const pending = rows.filter((r) => r.status === "PENDING").length;
  const approved = rows.filter((r) => r.status === "APPROVED").length;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <h1 className="text-xl font-bold text-ink-900">Mentor applications</h1>
        <p className="mt-1 text-sm text-ink-600">
          {pending} pending · {approved} approved · {rows.length} total (latest 200)
        </p>
        <div className="mt-5 space-y-4">
          {rows.length === 0 && (
            <p className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-500">
              No applications yet. Recruiting surfaces: /mentors page, dashboard card, live-test hall.
            </p>
          )}
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    r.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : r.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-ink-100 text-ink-500"
                  }`}
                >
                  {r.status}
                </span>
                <span className="text-sm font-bold text-ink-900">{r.name}</span>
                <span className="text-xs font-semibold text-saffron-700">{r.examCode}</span>
                {r.clearedYear && <span className="text-xs text-ink-500">cleared {r.clearedYear}</span>}
                <span className="ml-auto text-[11px] text-ink-400">
                  {new Date(r.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-800">{r.credential}</p>
              <p className="mt-1 text-xs text-ink-500">
                📞 {r.phone}
                {r.email ? ` · ✉️ ${r.email}` : ""}
                {r.city ? ` · 📍 ${r.city}` : ""}
                {r.languages ? ` · 🗣️ ${r.languages}` : ""}
              </p>
              {r.why && <p className="mt-1 text-xs italic text-ink-600">&ldquo;{r.why}&rdquo;</p>}
              {r.adminNotes && (
                <p className="mt-1 text-xs text-indigo-700">Notes: {r.adminNotes}</p>
              )}
              <MentorActions id={r.id} status={r.status} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
