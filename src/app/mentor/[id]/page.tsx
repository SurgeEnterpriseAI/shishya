// /mentor/[id] — one student, everything a counsellor needs before the
// call: the full Student-360 (consent-verified), the student's own ask,
// the session room link, and the next-steps note that closes the loop.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { buildStudent360 } from "@/lib/student-360";
import { Student360View } from "@/components/Student360View";
import { TakeButton, DoneForm } from "@/components/MentorActions";

export const metadata: Metadata = { title: "Student — Mentor desk", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MentorStudent({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/mentor");
  const mentors = await prisma.$queryRaw<any[]>`
    SELECT id, name FROM "MentorApplication"
    WHERE status = 'APPROVED' AND ("userId" = ${session.user.id} OR (email IS NOT NULL AND email = ${session.user.email ?? null}))
    LIMIT 1`;
  const mentor = mentors[0];
  if (!mentor) redirect("/mentor");

  const { id } = await params;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT r.*, u.name AS student_name FROM "MentorSessionRequest" r
    JOIN "User" u ON u.id = r."userId"
    WHERE r.id = ${id} AND r.consent = TRUE LIMIT 1`;
  const r = rows[0];
  if (!r) notFound();
  // A TAKEN/DONE request is visible only to the mentor who holds it.
  if (r.status !== "NEW" && r.mentorId !== mentor.id) redirect("/mentor");

  const p = await buildStudent360(r.userId);
  if (!p) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/mentor" className="text-sm text-ink-500 hover:text-ink-700">← Mentor desk</Link>

      <div className="mt-4 rounded-xl border-2 border-saffron-300 bg-saffron-50 p-5">
        {r.note && <p className="text-sm text-ink-800"><span className="font-semibold">Their ask:</span> “{r.note}”</p>}
        {r.status === "NEW" && (
          <div className="mt-3"><TakeButton id={r.id} /></div>
        )}
        {r.status === "TAKEN" && (
          <div className="mt-2">
            <p className="text-sm text-ink-700">
              Session room (shared with the student by email):{" "}
              <a className="font-semibold text-saffron-700 underline" href={r.meetUrl} target="_blank" rel="noopener noreferrer">{r.meetUrl}</a>
            </p>
            <DoneForm id={r.id} />
          </div>
        )}
        {r.status === "DONE" && r.sessionNote && (
          <p className="mt-2 text-sm text-ink-700"><span className="font-semibold">Next steps sent:</span> {r.sessionNote}</p>
        )}
      </div>

      <div className="mt-6">
        <Student360View p={p} viewer="mentor" />
      </div>
    </main>
  );
}
