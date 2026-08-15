// /mentor — the mentor's desk. Gate: an APPROVED MentorApplication
// matched to the signed-in account. Two lists: students they've taken
// (active sessions) and consented requests waiting for any mentor.
// Every student here explicitly opted to share their 360.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Mentor desk — Shishya",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function MentorDesk() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/mentor");

  const mentors = await prisma.$queryRaw<any[]>`
    SELECT id, name FROM "MentorApplication"
    WHERE status = 'APPROVED' AND ("userId" = ${session.user.id} OR (email IS NOT NULL AND email = ${session.user.email ?? null}))
    LIMIT 1`;
  const mentor = mentors[0];

  if (!mentor) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-xl font-bold text-ink-900">Mentor desk</h1>
        <p className="mt-3 text-sm text-ink-600">
          This screen is for verified Shishya mentors. If you have cleared a government exam and want to
          guide aspirants on that path, apply — every application is personally reviewed.
        </p>
        <Link href="/mentors" className="mt-4 inline-block rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600">
          Become a mentor →
        </Link>
      </main>
    );
  }

  const [mine, waiting] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT r.id, r.status, r."examCode", r.note, r."takenAt", u.name
      FROM "MentorSessionRequest" r JOIN "User" u ON u.id = r."userId"
      WHERE r."mentorId" = ${mentor.id} AND r.status = 'TAKEN'
      ORDER BY r."takenAt" DESC`,
    prisma.$queryRaw<any[]>`
      SELECT r.id, r."examCode", r.note, r."createdAt", u.name
      FROM "MentorSessionRequest" r JOIN "User" u ON u.id = r."userId"
      WHERE r.status = 'NEW' AND r.consent = TRUE
      ORDER BY r."createdAt" ASC`,
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-bold text-ink-900">Mentor desk</h1>
      <p className="mt-1 text-sm text-ink-600">Namaste {mentor.name}. Every student below chose to share their preparation report with you.</p>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-ink-500">Your active students ({mine.length})</h2>
      {mine.length === 0 && <p className="mt-2 text-sm text-ink-500">None yet — take a request below.</p>}
      <ul className="mt-2 space-y-2">
        {mine.map((r) => (
          <li key={r.id}>
            <Link href={`/mentor/${r.id}`} className="block rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 hover:border-emerald-400">
              <p className="text-sm font-semibold text-ink-900">{r.name} {r.examCode && <span className="font-normal text-ink-500">· {r.examCode}</span>}</p>
              {r.note && <p className="mt-1 truncate text-sm text-ink-600">“{r.note}”</p>}
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-ink-500">Waiting for a mentor ({waiting.length})</h2>
      {waiting.length === 0 && <p className="mt-2 text-sm text-ink-500">No open requests right now.</p>}
      <ul className="mt-2 space-y-2">
        {waiting.map((r) => (
          <li key={r.id}>
            <Link href={`/mentor/${r.id}`} className="block rounded-lg border border-ink-200 bg-white p-4 hover:border-saffron-400">
              <p className="text-sm font-semibold text-ink-900">{r.name} {r.examCode && <span className="font-normal text-ink-500">· {r.examCode}</span>}</p>
              {r.note && <p className="mt-1 truncate text-sm text-ink-600">“{r.note}”</p>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
