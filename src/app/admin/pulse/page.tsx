// /admin/pulse — founder readback for PulseAsk micro-feedback.
//
// Three views, all from ONE grouped query each (Neon one-chain
// discipline): chip counts by surface (7d/30d), the free-text stream,
// and a negative-chip exam leaderboard (which exams' students say
// something is missing/wrong — the build-queue ranker).

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isCurrentUserAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// Chips that signal a gap (vs the "all good" chips) — used for the
// exam leaderboard only; keep in sync with PulseAsk mount copy.
const POSITIVE_CHIPS = new Set([
  "Felt real",
  "Spot on",
  "Nothing — it's enough",
  "All covered",
  "This sampler is enough",
  "सब कवर है",
  "అన్నీ ఉన్నాయి",
]);

export default async function AdminPulsePage() {
  if (!(await isCurrentUserAdmin())) redirect("/");

  const counts = await prisma
    .$queryRaw<{ surface: string; chip: string; c7: bigint; c30: bigint }[]>`
      SELECT surface, chip,
        COUNT(*) FILTER (WHERE "createdAt" >= NOW() - interval '7 days') c7,
        COUNT(*) c30
      FROM "PulseFeedback"
      WHERE "createdAt" >= NOW() - interval '30 days'
      GROUP BY surface, chip
      ORDER BY surface, c30 DESC`
    .catch(() => []);

  const texts = await prisma
    .$queryRaw<{ id: string; surface: string; text: string; examCode: string | null; createdAt: Date }[]>`
      SELECT id, surface, text, "examCode", "createdAt"
      FROM "PulseFeedback"
      WHERE text IS NOT NULL AND "createdAt" >= NOW() - interval '60 days'
      ORDER BY "createdAt" DESC LIMIT 100`
    .catch(() => []);

  const byExam = await prisma
    .$queryRaw<{ examCode: string; chip: string; c: bigint }[]>`
      SELECT "examCode", chip, COUNT(*) c
      FROM "PulseFeedback"
      WHERE "examCode" IS NOT NULL AND "createdAt" >= NOW() - interval '30 days'
      GROUP BY "examCode", chip
      ORDER BY c DESC LIMIT 60`
    .catch(() => []);

  const surfaces = [...new Set(counts.map((r) => r.surface))];
  const negByExam = new Map<string, { chip: string; c: number }[]>();
  for (const r of byExam) {
    if (POSITIVE_CHIPS.has(r.chip)) continue;
    const arr = negByExam.get(r.examCode) ?? [];
    arr.push({ chip: r.chip, c: Number(r.c) });
    negByExam.set(r.examCode, arr);
  }
  const leaderboard = [...negByExam.entries()]
    .map(([code, chips]) => ({ code, total: chips.reduce((a, b) => a + b.c, 0), chips }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header admin />
      <section className="container-prose py-8">
        <p className="text-xs text-ink-500">
          <Link href="/admin" className="hover:text-ink-800">← Admin</Link> · Pulse
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">What aspirants are telling us</h1>
        <p className="mt-1 text-sm text-ink-600">
          One-tap chips + one-line notes from the PulseAsk rows (results, coach, exam hub, tracker, PYQ).
        </p>

        <h2 className="mt-8 text-base font-semibold text-ink-800">Chip counts by surface (last 30 days · 7-day column)</h2>
        {counts.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
            No taps yet — the rows went live today.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {surfaces.map((s) => (
              <div key={s} className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-sm font-bold text-ink-900">{s}</p>
                <ul className="mt-2 space-y-1">
                  {counts.filter((r) => r.surface === s).map((r) => (
                    <li key={r.chip} className="flex items-baseline justify-between text-sm">
                      <span className={POSITIVE_CHIPS.has(r.chip) ? "text-emerald-700" : "text-ink-800"}>{r.chip}</span>
                      <span className="tabular-nums text-ink-600">{Number(r.c30)} <span className="text-xs text-ink-400">({Number(r.c7)} this wk)</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {leaderboard.length > 0 && (
          <>
            <h2 className="mt-8 text-base font-semibold text-ink-800">Exams with the most &quot;something&apos;s missing&quot; taps (30d)</h2>
            <ul className="mt-3 space-y-1.5">
              {leaderboard.map((e) => (
                <li key={e.code} className="rounded-md border border-ink-200 bg-white px-3 py-2 text-sm">
                  <span className="font-semibold text-ink-900">{e.code}</span>
                  <span className="ml-2 tabular-nums text-ink-600">{e.total}</span>
                  <span className="ml-3 text-xs text-ink-500">{e.chips.map((c) => `${c.chip} ×${c.c}`).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="mt-8 text-base font-semibold text-ink-800">In their own words (free text, 60d)</h2>
        {texts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">No free-text notes yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {texts.map((r) => (
              <li key={r.id} className="rounded-md border border-ink-200 bg-white p-3">
                <p className="text-sm text-ink-800">{r.text}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {r.surface}{r.examCode ? ` · ${r.examCode}` : ""} · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
