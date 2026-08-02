// /admin/educator-leads — the founding-five pipeline.
//
// Statuses: NEW → CONTACTED → PILOT → CONVERTED (or CLOSED).
// Founding-five discipline is enforced visually: the header shows how
// many pilots are ACTIVE so the founder doesn't onboard #6 before at
// least two of the five are genuinely running. Raw SQL (client
// predates EducatorLead).

import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { isCurrentUserAdmin } from "@/lib/admin";
import { LeadActions } from "./LeadActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Educator leads — Admin", robots: { index: false } };

interface Row {
  id: string;
  name: string;
  organisation: string | null;
  phone: string;
  email: string | null;
  audience: string | null;
  examFocus: string | null;
  message: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: Date;
}

const ORDER = ["NEW", "PILOT", "CONTACTED", "CONVERTED", "CLOSED"];

export default async function EducatorLeadsAdminPage() {
  const { isAdmin } = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT id, name, organisation, phone, email, audience, "examFocus", message,
           status, "adminNotes", "createdAt"
    FROM "EducatorLead"
    ORDER BY "createdAt" DESC
    LIMIT 200
  `.catch(() => [] as Row[]);
  const sorted = [...rows].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const pilots = count("PILOT");

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <h1 className="text-xl font-bold text-ink-900">Educator leads</h1>
        <p className="mt-1 text-sm text-ink-600">
          {count("NEW")} new · {count("CONTACTED")} contacted · <strong>{pilots} in pilot</strong>{" "}
          · {count("CONVERTED")} converted
        </p>
        {pilots >= 5 && (
          <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            ⚖️ Founding-five discipline: 5 pilots are open — onboard the next only after at least
            two of these are genuinely active. Support quality during the pilot IS the product.
          </p>
        )}
        <div className="mt-5 space-y-4">
          {sorted.length === 0 && (
            <p className="rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-500">
              No leads yet — they arrive from the /educators form (and land in the admin inbox
              too).
            </p>
          )}
          {sorted.map((r) => (
            <div key={r.id} className="rounded-xl border border-ink-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    r.status === "NEW"
                      ? "bg-amber-100 text-amber-800"
                      : r.status === "PILOT"
                        ? "bg-indigo-100 text-indigo-800"
                        : r.status === "CONVERTED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-ink-100 text-ink-500"
                  }`}
                >
                  {r.status}
                </span>
                <span className="text-sm font-bold text-ink-900">{r.organisation || r.name}</span>
                {r.audience && <span className="text-xs font-semibold text-saffron-700">{r.audience}</span>}
                <span className="ml-auto text-[11px] text-ink-400">
                  {new Date(r.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {r.name} · 📞 {r.phone}
                {r.email ? ` · ✉️ ${r.email}` : ""}
                {r.examFocus ? ` · 🎯 ${r.examFocus}` : ""}
              </p>
              {r.message && <p className="mt-1 text-xs italic text-ink-600">&ldquo;{r.message}&rdquo;</p>}
              {r.adminNotes && (
                <p className="mt-1 whitespace-pre-line text-xs text-indigo-700">{r.adminNotes}</p>
              )}
              <LeadActions id={r.id} status={r.status} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
